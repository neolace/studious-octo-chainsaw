namespace RunbookApi.Web.Contracts;

public sealed record RunbookResponse(
    Guid Id,
    string Title,
    string Content,
    string CreatedBy,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record UpsertRunbookRequest(string Title, string Content);

public sealed record AdminStatsResponse(int RunbookCount);
