using System.Security.Claims;

using RunbookApi.Application;

namespace RunbookApi.Web.Authentication;

public sealed class CurrentUser : ICurrentUser
{
    public CurrentUser(ClaimsPrincipal principal)
    {
        ArgumentNullException.ThrowIfNull(principal);

        Subject = principal.GetSubject() ?? string.Empty;
        Email = principal.GetEmail();
        DisplayName = principal.GetDisplayName();
        Scopes = principal.GetScopes();
    }

    public string Subject { get; }
    public string? Email { get; }
    public string? DisplayName { get; }
    public IReadOnlyList<string> Scopes { get; }
}
