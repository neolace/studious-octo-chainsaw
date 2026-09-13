using System.Text.Json;

using Amazon.Lambda.AspNetCoreServer.Hosting;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;

using RunbookApi.Application;
using RunbookApi.Infrastructure;
using RunbookApi.Web.Authentication;
using RunbookApi.Web.Authorization;
using RunbookApi.Web.Configuration;
using RunbookApi.Web.Endpoints;
using RunbookApi.Web.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAWSLambdaHosting(LambdaEventSource.HttpApi);

builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole();

var cognito = builder.Configuration.GetSection(CognitoOptions.SectionName).Get<CognitoOptions>() ?? new CognitoOptions();
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173"];
if (allowedOrigins.Any(origin => origin == "*"))
{
    throw new InvalidOperationException("Wildcard CORS origins are not allowed.");
}

builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
    };
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IRunbookStore, InMemoryRunbookStore>();
builder.Services.AddScoped<ICurrentUser>(sp =>
{
    var httpContext = sp.GetRequiredService<IHttpContextAccessor>().HttpContext
        ?? throw new InvalidOperationException("No active HTTP context.");
    return new CurrentUser(httpContext.User);
});

builder.Services.AddSingleton<IAuthorizationMiddlewareResultHandler, ProblemDetailsAuthorizationHandler>();
builder.Services.AddApiAuthorization();
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build());

var runningInLambda = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("AWS_LAMBDA_FUNCTION_NAME"));
if (builder.Environment.IsProduction() && !runningInLambda && !cognito.IsConfigured)
{
    throw new InvalidOperationException("Cognito configuration is required in Production.");
}

if (runningInLambda)
{
    builder.Services.AddAuthentication(LambdaAuthorizerHandler.SchemeName)
        .AddScheme<AuthenticationSchemeOptions, LambdaAuthorizerHandler>(LambdaAuthorizerHandler.SchemeName, _ => { });
}
else if (!builder.Environment.IsEnvironment("Testing") && cognito.IsConfigured)
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.Authority = cognito.Authority;
            options.MapInboundClaims = false;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = cognito.Authority,
                ValidateAudience = false,
                ValidateLifetime = true,
                NameClaimType = "username",
                RoleClaimType = "cognito:groups"
            };
            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = context =>
                {
                    var clientId = context.Principal?.FindFirst("client_id")?.Value
                        ?? context.Principal?.FindFirst("aud")?.Value;
                    if (!string.Equals(clientId, cognito.ClientId, StringComparison.Ordinal))
                    {
                        context.Fail("Invalid token audience.");
                    }

                    return Task.CompletedTask;
                }
            };
        });
}
else
{
    builder.Services.AddAuthentication();
}

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .WithHeaders("Authorization", "Content-Type", RequestLoggingMiddleware.CorrelationHeaderName)
            .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS");
    });
});

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});

builder.Services.AddOpenApi();

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseMiddleware<RequestLoggingMiddleware>();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Local-only OpenAPI document. Falls under the fallback policy, so it needs a bearer token
// like every route except /health. Lambda always runs as Production and never maps it.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapHealthEndpoints();
app.MapMeEndpoints();
app.MapRunbookEndpoints();
app.MapAdminEndpoints();

app.Run();

public partial class Program;
