using RunbookApi.Application;

namespace RunbookApi.Application.UnitTests;

public sealed class ScopeParserTests
{
    [Fact]
    public void SplitsAndDeduplicatesScopes()
    {
        var scopes = ScopeParser.Parse(["openid runbook-api/read", "runbook-api/read,runbook-api/write"]);

        Assert.Equal(["openid", ApiScopes.Read, ApiScopes.Write], scopes);
    }

    [Fact]
    public void HasScopeIsOrdinal()
    {
        var scopes = new[] { ApiScopes.Read };
        Assert.True(ScopeParser.HasScope(scopes, ApiScopes.Read));
        Assert.False(ScopeParser.HasScope(scopes, "RUNBOOK-API/READ"));
        Assert.False(ScopeParser.HasScope(scopes, ApiScopes.Admin));
    }
}
