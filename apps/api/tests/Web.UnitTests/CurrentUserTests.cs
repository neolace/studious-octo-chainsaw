using System.Security.Claims;

using RunbookApi.Application;
using RunbookApi.Web.Authentication;

namespace RunbookApi.Web.UnitTests;

public sealed class CurrentUserTests
{
    [Fact]
    public void ParsesCognitoAccessTokenClaims()
    {
        var user = new CurrentUser(Principal(
            new Claim("sub", "user-1"),
            new Claim("email", "user@example.com"),
            new Claim("name", "Ada Lovelace"),
            new Claim("scope", "openid email runbook-api/read runbook-api/write")));

        Assert.Equal("user-1", user.Subject);
        Assert.Equal("user@example.com", user.Email);
        Assert.Equal("Ada Lovelace", user.DisplayName);
        Assert.Contains(ApiScopes.Read, user.Scopes);
        Assert.Contains(ApiScopes.Write, user.Scopes);
        Assert.DoesNotContain(ApiScopes.Admin, user.Scopes);
    }

    [Fact]
    public void ParsesSpaceAndCommaSeparatedScopes()
    {
        var user = new CurrentUser(Principal(
            new Claim("sub", "user-1"),
            new Claim("scp", "runbook-api/read,runbook-api/admin")));

        Assert.Equal([ApiScopes.Read, ApiScopes.Admin], user.Scopes);
    }

    [Fact]
    public void MissingSubjectIsEmpty()
    {
        var user = new CurrentUser(Principal(new Claim("email", "user@example.com")));

        Assert.Equal(string.Empty, user.Subject);
    }

    [Fact]
    public void MissingEmailAndNameAreNull()
    {
        var user = new CurrentUser(Principal(new Claim("sub", "user-1")));

        Assert.Null(user.Email);
        Assert.Null(user.DisplayName);
        Assert.Empty(user.Scopes);
    }

    [Fact]
    public void FallsBackToStandardClaimTypes()
    {
        var user = new CurrentUser(Principal(
            new Claim(ClaimTypes.NameIdentifier, "user-2"),
            new Claim(ClaimTypes.Email, "user2@example.com"),
            new Claim(ClaimTypes.Name, "Grace Hopper")));

        Assert.Equal("user-2", user.Subject);
        Assert.Equal("user2@example.com", user.Email);
        Assert.Equal("Grace Hopper", user.DisplayName);
    }

    private static ClaimsPrincipal Principal(params Claim[] claims)
    {
        return new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "Test"));
    }
}
