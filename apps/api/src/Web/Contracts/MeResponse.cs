namespace RunbookApi.Web.Contracts;

public sealed record MeResponse(
    string Subject,
    string? Email,
    string? DisplayName,
    IReadOnlyList<string> Scopes);
