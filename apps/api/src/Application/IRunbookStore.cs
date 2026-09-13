using RunbookApi.Domain;

namespace RunbookApi.Application;

public interface IRunbookStore
{
    Task<IReadOnlyList<Runbook>> ListAsync(CancellationToken cancellationToken);
    Task<Runbook?> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<Runbook> CreateAsync(string title, string content, string createdBy, CancellationToken cancellationToken);
    Task<Runbook?> UpdateAsync(Guid id, string title, string content, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
    Task<int> CountAsync(CancellationToken cancellationToken);
}
