export interface CurrentUser {
  subject: string;
  email: string | null;
  displayName: string | null;
  scopes: string[];
}

export interface Runbook {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertRunbook {
  title: string;
  content: string;
}
