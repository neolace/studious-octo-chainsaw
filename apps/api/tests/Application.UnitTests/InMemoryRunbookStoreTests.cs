using RunbookApi.Infrastructure;

namespace RunbookApi.Application.UnitTests;

public sealed class InMemoryRunbookStoreTests
{
    [Fact]
    public async Task CreatesGetsUpdatesAndDeletes()
    {
        var store = new InMemoryRunbookStore();

        var created = await store.CreateAsync("Title", "Body", "user-1", CancellationToken.None);
        var fetched = await store.GetAsync(created.Id, CancellationToken.None);
        Assert.Equal(created, fetched);

        var updated = await store.UpdateAsync(created.Id, "New", "Updated", CancellationToken.None);
        Assert.NotNull(updated);
        Assert.Equal("New", updated.Title);

        Assert.Equal(1, await store.CountAsync(CancellationToken.None));
        Assert.True(await store.DeleteAsync(created.Id, CancellationToken.None));
        Assert.Null(await store.GetAsync(created.Id, CancellationToken.None));
        Assert.Equal(0, await store.CountAsync(CancellationToken.None));
    }

    [Fact]
    public async Task UpdateAndDeleteMissingReturnEmpty()
    {
        var store = new InMemoryRunbookStore();
        var id = Guid.NewGuid();

        Assert.Null(await store.UpdateAsync(id, "x", "y", CancellationToken.None));
        Assert.False(await store.DeleteAsync(id, CancellationToken.None));
    }
}
