using System.Net;
using System.Net.Http.Json;

using RunbookApi.Application;
using RunbookApi.Web.Contracts;

namespace RunbookApi.Web.IntegrationTests;

public sealed class ApiEndpointTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public ApiEndpointTests(ApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task HealthIsAnonymous()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/health");
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        Assert.Equal("ok", body?["status"]);
        Assert.DoesNotContain("cognito", await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task MeRequiresAuthentication()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/v1/me");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        Assert.Equal("Unauthorized", problem?["title"]?.ToString());
        Assert.StartsWith("https://tools.ietf.org/html/rfc9110", problem?["type"]?.ToString());
        Assert.False(string.IsNullOrWhiteSpace(problem?["traceId"]?.ToString()));
    }

    [Fact]
    public async Task CorrelationIdIsEchoedOrAssigned()
    {
        var client = _factory.CreateClient();

        var assigned = await client.GetAsync("/health");
        Assert.True(assigned.Headers.TryGetValues("X-Correlation-ID", out var generated));
        Assert.False(string.IsNullOrWhiteSpace(generated.Single()));

        client.DefaultRequestHeaders.Add("X-Correlation-ID", "corr-123");
        var echoed = await client.GetAsync("/health");
        Assert.Equal("corr-123", echoed.Headers.GetValues("X-Correlation-ID").Single());
    }

    [Fact]
    public async Task InvalidTokenIsUnauthorized()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", "Bearer invalid");
        var response = await client.GetAsync("/v1/me");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task MeReturnsSanitizedIdentity()
    {
        var client = Authenticated(ApiScopes.Read);
        var response = await client.GetAsync("/v1/me");
        response.EnsureSuccessStatusCode();
        var me = await response.Content.ReadFromJsonAsync<MeResponse>();
        Assert.NotNull(me);
        Assert.Equal("user-1", me.Subject);
        Assert.Equal("user@example.com", me.Email);
        Assert.Equal("Ada", me.DisplayName);
        Assert.Contains(ApiScopes.Read, me.Scopes);
        var raw = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("Bearer", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("refresh", raw, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task MissingSubjectIsForbidden()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", "Bearer email=user@example.com;scope=runbook-api/read");
        var response = await client.GetAsync("/v1/me");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ReadWithoutScopeIsForbidden()
    {
        var client = Authenticated();
        var response = await client.GetAsync("/v1/runbooks");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task WriteScopeCanCreateAndReadScopeCanList()
    {
        var writer = Authenticated(ApiScopes.Write);
        var created = await writer.PostAsJsonAsync("/v1/runbooks", new UpsertRunbookRequest("On-call", "Page the owner"));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var runbook = await created.Content.ReadFromJsonAsync<RunbookResponse>();
        Assert.NotNull(runbook);

        var reader = Authenticated(ApiScopes.Read);
        var listed = await reader.GetAsync("/v1/runbooks");
        listed.EnsureSuccessStatusCode();
        var items = await listed.Content.ReadFromJsonAsync<RunbookResponse[]>();
        Assert.Contains(items ?? [], item => item.Id == runbook.Id);
    }

    [Fact]
    public async Task AdminWithoutScopeIsForbidden()
    {
        var client = Authenticated(ApiScopes.Read);
        var response = await client.GetAsync("/v1/admin/stats");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AdminWithScopeSucceeds()
    {
        var client = Authenticated(ApiScopes.Admin);
        var response = await client.GetAsync("/v1/admin/stats");
        response.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task MalformedBodyIsBadRequest()
    {
        var client = Authenticated(ApiScopes.Write);
        var response = await client.PostAsJsonAsync("/v1/runbooks", new UpsertRunbookRequest("", ""));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private HttpClient Authenticated(params string[] scopes)
    {
        var client = _factory.CreateClient();
        var scope = string.Join(' ', scopes);
        client.DefaultRequestHeaders.TryAddWithoutValidation(
            "Authorization",
            $"Bearer sub=user-1;email=user@example.com;name=Ada;scope={scope}");
        return client;
    }
}
