using RunbookApi.Application;
using RunbookApi.Web.Authorization;
using RunbookApi.Web.Contracts;

namespace RunbookApi.Web.Endpoints;

public static class AdminEndpoints
{
    public static IEndpointRouteBuilder MapAdminEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/v1/admin/stats", async (IRunbookStore store, CancellationToken cancellationToken) =>
            Results.Ok(new AdminStatsResponse(await store.CountAsync(cancellationToken))))
            .RequireAuthorization(AuthorizationPolicies.Admin)
            .WithName("AdminStats")
            .WithTags("Admin");

        return endpoints;
    }
}
