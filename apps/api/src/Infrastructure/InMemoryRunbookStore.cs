using System.Collections.Concurrent;

using RunbookApi.Application;
using RunbookApi.Domain;

namespace RunbookApi.Infrastructure;

public sealed class InMemoryRunbookStore : IRunbookStore
{
    private readonly ConcurrentDictionary<Guid, Runbook> _items = new();
    private readonly TimeProvider _clock;

    public InMemoryRunbookStore(TimeProvider? clock = null)
    {
        _clock = clock ?? TimeProvider.System;
    }

    public Task<IReadOnlyList<Runbook>> ListAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        IReadOnlyList<Runbook> items = _items.Values
            .OrderByDescending(item => item.UpdatedAt)
            .ToArray();
        return Task.FromResult(items);
    }

    public Task<Runbook?> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        _items.TryGetValue(id, out var item);
        return Task.FromResult(item);
    }

    public Task<Runbook> CreateAsync(string title, string content, string createdBy, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var now = _clock.GetUtcNow();
        var runbook = new Runbook(Guid.NewGuid(), title, content, createdBy, now, now);
        _items[runbook.Id] = runbook;
        return Task.FromResult(runbook);
    }

    public Task<Runbook?> UpdateAsync(Guid id, string title, string content, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!_items.TryGetValue(id, out var existing))
        {
            return Task.FromResult<Runbook?>(null);
        }

        var updated = existing with
        {
            Title = title,
            Content = content,
            UpdatedAt = _clock.GetUtcNow()
        };
        _items[id] = updated;
        return Task.FromResult<Runbook?>(updated);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(_items.TryRemove(id, out _));
    }

    public Task<int> CountAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(_items.Count);
    }
}
