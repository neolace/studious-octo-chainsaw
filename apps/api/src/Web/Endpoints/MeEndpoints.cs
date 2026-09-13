using RunbookApi.Application;
using RunbookApi.Web.Authorization;
using RunbookApi.Web.Contracts;

namespace RunbookApi.Web.Endpoints;

public static class MeEndpoints
{
    public static IEndpointRouteBuilder MapMeEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/v1/me", (ICurrentUser user) =>
            Results.Ok(new MeResponse(user.Subject, user.Email, user.DisplayName, user.Scopes)))
            .RequireAuthorization(AuthorizationPolicies.Authenticated)
            .WithName("GetCurrentUser")
            .WithTags("Identity");

        return endpoints;
    }
}
