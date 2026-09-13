using System.Security.Claims;

using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

using RunbookApi.Application;
using RunbookApi.Web.Authorization;

namespace RunbookApi.Web.UnitTests;

/// <summary>Evaluates the registered policies end to end through <see cref="IAuthorizationService"/>.</summary>
public sealed class AuthorizationPolicyTests
{
    private static readonly IAuthorizationService Authorization = BuildAuthorizationService();

    [Fact]
    public async Task AuthenticatedPolicyRequiresSubject()
    {
        Assert.True(await Allowed(AuthorizationPolicies.Authenticated, new Claim("sub", "user-1")));
        Assert.False(await Allowed(AuthorizationPolicies.Authenticated, new Claim("email", "user@example.com")));
    }

    [Theory]
    [InlineData(AuthorizationPolicies.Read, ApiScopes.Read, true)]
    [InlineData(AuthorizationPolicies.Read, ApiScopes.Write, false)]
    [InlineData(AuthorizationPolicies.Write, ApiScopes.Write, true)]
    [InlineData(AuthorizationPolicies.Write, ApiScopes.Read, false)]
    [InlineData(AuthorizationPolicies.Admin, ApiScopes.Admin, true)]
    [InlineData(AuthorizationPolicies.Admin, ApiScopes.Write, false)]
    public async Task ScopePoliciesRequireTheirExactScope(string policy, string grantedScope, bool expected)
    {
        Assert.Equal(expected, await Allowed(policy, new Claim("sub", "user-1"), new Claim("scope", grantedScope)));
    }

    [Fact]
    public async Task AdminScopeDoesNotImplyRead()
    {
        var claims = new[] { new Claim("sub", "user-1"), new Claim("scope", ApiScopes.Admin) };

        Assert.False(await Allowed(AuthorizationPolicies.Read, claims));
        Assert.True(await Allowed(AuthorizationPolicies.Admin, claims));
    }

    [Fact]
    public async Task ScopePoliciesRejectPrincipalsWithoutSubject()
    {
        Assert.False(await Allowed(AuthorizationPolicies.Read, new Claim("scope", ApiScopes.Read)));
    }

    [Fact]
    public async Task ScopePoliciesAcceptScpClaimAndCommaSeparation()
    {
        Assert.True(await Allowed(
            AuthorizationPolicies.Write,
            new Claim("sub", "user-1"),
            new Claim("scp", $"{ApiScopes.Read},{ApiScopes.Write}")));
    }

    private static async Task<bool> Allowed(string policy, params Claim[] claims)
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "Test"));
        var result = await Authorization.AuthorizeAsync(user, resource: null, policy);
        return result.Succeeded;
    }

    private static IAuthorizationService BuildAuthorizationService()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddOptions();
        services.AddApiAuthorization();
        return services.BuildServiceProvider().GetRequiredService<IAuthorizationService>();
    }
}
