import { TopBar } from "../components/TopBar";
import { useRunbooks } from "../queries/useRunbooks";

export function RunbooksPage() {
  const runbooks = useRunbooks();

  return (
    <main className="page">
      <TopBar title="Runbooks" />
      {runbooks.isLoading ? <p role="status">Loading runbooks…</p> : null}
      {runbooks.isError ? (
        <p role="alert" className="error">
          You do not have access to runbooks, or the API request failed.
        </p>
      ) : null}
      <ul className="runbook-list">
        {(runbooks.data ?? []).map((runbook) => (
          <li key={runbook.id}>
            <strong>{runbook.title}</strong>
            <p>{runbook.content}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
