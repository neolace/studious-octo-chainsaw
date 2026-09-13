namespace RunbookApi.Domain;

public sealed record Runbook(
    Guid Id,
    string Title,
    string Content,
    string CreatedBy,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
