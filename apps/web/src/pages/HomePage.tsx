import { Link } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import { TopBar } from "../components/TopBar";
import { useCurrentUser } from "../queries/useCurrentUser";

export function HomePage() {
  const { user } = useAuth();
  const me = useCurrentUser();

  return (
    <main className="page">
      <TopBar title="Runbook Portal" />
      <h1>Welcome</h1>
      <p>
        Signed in as {me.data?.displayName ?? me.data?.email ?? user?.username ?? "your account"}.
      </p>
      {me.isError ? (
        <p role="alert" className="error">
          Could not load your profile.
        </p>
      ) : null}
      <p>
        <Link to="/runbooks">View runbooks</Link>
      </p>
    </main>
  );
}
