import { useAuth } from "../auth/useAuth";

export function TopBar({ title }: { title: string }) {
  const { logout } = useAuth();

  return (
    <header className="topbar">
      <p className="brand-name">{title}</p>
      <button type="button" onClick={() => void logout()}>
        Sign out
      </button>
    </header>
  );
}
