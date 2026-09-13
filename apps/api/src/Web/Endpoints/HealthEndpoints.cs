namespace RunbookApi.Web.Endpoints;

public static class HealthEndpoints
{
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/health", () => Results.Ok(new { status = "ok" }))
            .AllowAnonymous()
            .WithName("Health")
            .WithTags("Health");

        return endpoints;
    }
}
