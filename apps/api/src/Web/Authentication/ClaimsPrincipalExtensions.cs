using System.Security.Claims;

using RunbookApi.Application;

namespace RunbookApi.Web.Authentication;

/// <summary>
/// The single place that knows which claim types a Cognito access token uses.
/// Both <see cref="CurrentUser"/> and the authorization policies read through here.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    public static string? GetSubject(this ClaimsPrincipal principal) =>
        principal.FirstClaimValue("sub", ClaimTypes.NameIdentifier);

    public static bool HasSubject(this ClaimsPrincipal principal) =>
        !string.IsNullOrWhiteSpace(principal.GetSubject());

    public static string? GetEmail(this ClaimsPrincipal principal) =>
        principal.FirstClaimValue("email", ClaimTypes.Email);

    public static string? GetDisplayName(this ClaimsPrincipal principal) =>
        principal.FirstClaimValue("name", "preferred_username", ClaimTypes.Name);

    /// <summary>Cognito emits <c>scope</c>; some IdPs emit <c>scp</c>. Both are space or comma separated.</summary>
    public static IReadOnlyList<string> GetScopes(this ClaimsPrincipal principal) =>
        ScopeParser.Parse(
            principal.FindAll("scope").Concat(principal.FindAll("scp")).Select(claim => claim.Value));

    public static bool HasScope(this ClaimsPrincipal principal, string scope) =>
        ScopeParser.HasScope(principal.GetScopes(), scope);

    private static string? FirstClaimValue(this ClaimsPrincipal principal, params string[] types)
    {
        foreach (var type in types)
        {
            var value = principal.FindFirst(type)?.Value;
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return null;
    }
}
