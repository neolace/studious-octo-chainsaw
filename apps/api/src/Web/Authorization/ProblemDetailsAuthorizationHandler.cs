using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;

namespace RunbookApi.Web.Authorization;

public sealed class ProblemDetailsAuthorizationHandler : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler _defaultHandler = new();

    public async Task HandleAsync(
        RequestDelegate next,
        HttpContext context,
        AuthorizationPolicy policy,
        PolicyAuthorizationResult authorizeResult)
    {
        if (authorizeResult.Challenged)
        {
            await WriteAsync(context, StatusCodes.Status401Unauthorized, "Unauthorized", "Authentication is required.");
            return;
        }

        if (authorizeResult.Forbidden)
        {
            await WriteAsync(
                context,
                StatusCodes.Status403Forbidden,
                "Forbidden",
                "The authenticated user does not have the required permission.");
            return;
        }

        await _defaultHandler.HandleAsync(next, context, policy, authorizeResult);
    }

    // `type` is left unset so ASP.NET fills in the RFC 9110 section URI for the status code,
    // the same value every other Problem Details response from this API carries.
    private static async Task WriteAsync(HttpContext context, int status, string title, string detail)
    {
        await Results.Problem(
                title: title,
                statusCode: status,
                detail: detail,
                extensions: new Dictionary<string, object?> { ["traceId"] = context.TraceIdentifier })
            .ExecuteAsync(context);
    }
}
