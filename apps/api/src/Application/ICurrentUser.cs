namespace RunbookApi.Application;

public interface ICurrentUser
{
    string Subject { get; }
    string? Email { get; }
    string? DisplayName { get; }
    IReadOnlyList<string> Scopes { get; }
}
