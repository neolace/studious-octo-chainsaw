using Microsoft.AspNetCore.Authorization;

using RunbookApi.Application;
using RunbookApi.Web.Authentication;

namespace RunbookApi.Web.Authorization;

public static class AuthorizationPolicies
{
    public const string Authenticated = "RequireAuthenticatedUser";
    public const string Read = "RequireReadScope";
    public const string Write = "RequireWriteScope";
    public const string Admin = "RequireAdminScope";

    public static IServiceCollection AddApiAuthorization(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            options.AddPolicy(Authenticated, policy =>
                policy.RequireAuthenticatedUser().RequireAssertion(ctx => ctx.User.HasSubject()));
            options.AddScopePolicy(Read, ApiScopes.Read);
            options.AddScopePolicy(Write, ApiScopes.Write);
            options.AddScopePolicy(Admin, ApiScopes.Admin);
        });

        return services;
    }

    private static void AddScopePolicy(this AuthorizationOptions options, string name, string scope)
    {
        options.AddPolicy(name, policy =>
            policy.RequireAuthenticatedUser()
                .RequireAssertion(ctx => ctx.User.HasSubject() && ctx.User.HasScope(scope)));
    }
}
