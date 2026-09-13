using RunbookApi.Application;
using RunbookApi.Domain;
using RunbookApi.Web.Authorization;
using RunbookApi.Web.Contracts;

namespace RunbookApi.Web.Endpoints;

public static class RunbookEndpoints
{
    public static IEndpointRouteBuilder MapRunbookEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/v1/runbooks").WithTags("Runbooks");

        group.MapGet("/", ListAsync)
            .RequireAuthorization(AuthorizationPolicies.Read);

        group.MapGet("/{id:guid}", GetAsync)
            .RequireAuthorization(AuthorizationPolicies.Read);

        group.MapPost("/", CreateAsync)
            .RequireAuthorization(AuthorizationPolicies.Write);

        group.MapPut("/{id:guid}", UpdateAsync)
            .RequireAuthorization(AuthorizationPolicies.Write);

        group.MapDelete("/{id:guid}", DeleteAsync)
            .RequireAuthorization(AuthorizationPolicies.Write);

        return endpoints;
    }

    private static async Task<IResult> ListAsync(IRunbookStore store, CancellationToken cancellationToken)
    {
        var items = await store.ListAsync(cancellationToken);
        return Results.Ok(items.Select(ToResponse).ToArray());
    }

    private static async Task<IResult> GetAsync(Guid id, IRunbookStore store, CancellationToken cancellationToken)
    {
        var item = await store.GetAsync(id, cancellationToken);
        return item is null ? Results.NotFound() : Results.Ok(ToResponse(item));
    }

    private static async Task<IResult> CreateAsync(
        UpsertRunbookRequest request,
        IRunbookStore store,
        ICurrentUser user,
        CancellationToken cancellationToken)
    {
        var error = Validate(request);
        if (error is not null)
        {
            return error;
        }

        var created = await store.CreateAsync(request.Title.Trim(), request.Content.Trim(), user.Subject, cancellationToken);
        return Results.Created($"/v1/runbooks/{created.Id}", ToResponse(created));
    }

    private static async Task<IResult> UpdateAsync(
        Guid id,
        UpsertRunbookRequest request,
        IRunbookStore store,
        CancellationToken cancellationToken)
    {
        var error = Validate(request);
        if (error is not null)
        {
            return error;
        }

        var updated = await store.UpdateAsync(id, request.Title.Trim(), request.Content.Trim(), cancellationToken);
        return updated is null ? Results.NotFound() : Results.Ok(ToResponse(updated));
    }

    private static async Task<IResult> DeleteAsync(Guid id, IRunbookStore store, CancellationToken cancellationToken)
    {
        var deleted = await store.DeleteAsync(id, cancellationToken);
        return deleted ? Results.NoContent() : Results.NotFound();
    }

    private static IResult? Validate(UpsertRunbookRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Content))
        {
            return Results.Problem(
                title: "Bad Request",
                detail: "Title and content are required.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (request.Title.Length > 200)
        {
            return Results.Problem(
                title: "Bad Request",
                detail: "Title must be 200 characters or fewer.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        return null;
    }

    private static RunbookResponse ToResponse(Runbook runbook) =>
        new(runbook.Id, runbook.Title, runbook.Content, runbook.CreatedBy, runbook.CreatedAt, runbook.UpdatedAt);
}
