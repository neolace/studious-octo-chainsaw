/** Non-secret wiring only: pool, client, hosted-UI domain, API URL and redirects. */
export interface AppEnv {
  cognitoUserPoolId: string;
  cognitoClientId: string;
  cognitoDomain: string;
  apiUrl: string;
  redirectSignIn: string;
  redirectSignOut: string;
}

function required(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadEnv(): AppEnv {
  return {
    cognitoUserPoolId: required("VITE_COGNITO_USER_POOL_ID"),
    cognitoClientId: required("VITE_COGNITO_CLIENT_ID"),
    cognitoDomain: required("VITE_COGNITO_DOMAIN"),
    apiUrl: required("VITE_API_URL").replace(/\/$/, ""),
    redirectSignIn: required("VITE_COGNITO_REDIRECT_SIGN_IN"),
    redirectSignOut: required("VITE_COGNITO_REDIRECT_SIGN_OUT"),
  };
}

export const env = loadEnv();
