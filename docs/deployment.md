# Deployment

## Infrastructure

One CDK stack per environment, `RunbookApi-<ENVIRONMENT_NAME>`. Everything below is created by `infra/` except the Entra app registration and the Secrets Manager secret, which are referenced by ID/ARN.

```mermaid
%%{init: {
  "theme": "base",
  "securityLevel": "strict",
  "themeVariables": {
    "background": "#0d1117",
    "mainBkg": "#161b22",
    "secondBkg": "#1c2128",
    "primaryColor": "#161b22",
    "primaryTextColor": "#f0f6fc",
    "primaryBorderColor": "#58a6ff",
    "secondaryColor": "#21262d",
    "secondaryTextColor": "#f0f6fc",
    "secondaryBorderColor": "#3fb950",
    "tertiaryColor": "#21262d",
    "tertiaryTextColor": "#f0f6fc",
    "tertiaryBorderColor": "#d29922",
    "lineColor": "#58a6ff",
    "textColor": "#f0f6fc",
    "clusterBkg": "#161b22",
    "clusterBorder": "#30363d",
    "edgeLabelBackground": "#0d1117",
    "fontFamily": "Inter, Arial, Helvetica, sans-serif"
  }
}}%%
flowchart LR
    subgraph GitHub["GitHub"]
        Actions["deploy.yml (workflow_dispatch)"]
    end
    subgraph EntraTenant["Microsoft Entra tenant"]
        AppReg["App registration<br/>redirect URI = EntraCallbackUrl"]
    end
    subgraph AWS["AWS account / region"]
        Role["IAM deploy role<br/>(GitHub OIDC trust)"]
        Secret["Secrets Manager<br/>ENTRA_CLIENT_SECRET_SECRET_ARN"]
        subgraph Stack["CloudFormation: RunbookApi-env"]
            subgraph CognitoGrp["Cognito"]
                Pool["User Pool"]
                Domain["Hosted UI domain"]
                Idp["OIDC IdP MicrosoftEntraID"]
                RS["Resource server runbook-api<br/>read / write / admin"]
                SpaClient["SPA client (no secret, code + PKCE)"]
            end
            subgraph ApiGrp["API"]
                HttpApi["HTTP API + CORS + throttling"]
                Authorizer["JWT authorizer<br/>issuer = user pool, audience = client"]
                AccessLogs["Access log group (30d)"]
            end
            subgraph Compute["Compute"]
                Fn["Lambda dotnet10 arm64<br/>ASPNETCORE_ENVIRONMENT=Production"]
                FnLogs["Function log group (30d)"]
            end
            subgraph Monitoring["Monitoring"]
                Alarms["CloudWatch alarms<br/>Lambda errors / throttles, API 5xx"]
                Topic["SNS AlarmTopic"]
            end
        end
        SPA["Static SPA host<br/>FRONTEND_URL"]
    end
    Actions -->|"assume via OIDC"| Role
    Role -->|"cdk deploy"| Stack
    Idp -->|"client secret read at deploy"| Secret
    Idp -->|"OIDC"| AppReg
    Pool --- Domain
    Pool --- Idp
    Pool --- RS
    Pool --- SpaClient
    HttpApi --> Authorizer
    Authorizer -->|"validated claims"| Fn
    HttpApi --> AccessLogs
    Fn --> FnLogs
    Fn --> Alarms
    HttpApi --> Alarms
    Alarms --> Topic
    SPA -->|"Bearer access token"| HttpApi
    SPA -->|"hosted UI"| Domain
```

Stack outputs: `ApiUrl`, `UserPoolId`, `UserPoolClientId`, `CognitoDomain`, `AwsRegion`, `EntraCallbackUrl`, `AlarmTopicArn`. No secret ever appears in outputs.

## Order

```mermaid
%%{init: {
  "theme": "base",
  "securityLevel": "strict",
  "themeVariables": {
    "background": "#0d1117",
    "mainBkg": "#161b22",
    "secondBkg": "#1c2128",
    "primaryColor": "#161b22",
    "primaryTextColor": "#f0f6fc",
    "primaryBorderColor": "#58a6ff",
    "secondaryColor": "#21262d",
    "secondaryTextColor": "#f0f6fc",
    "secondaryBorderColor": "#3fb950",
    "tertiaryColor": "#21262d",
    "tertiaryTextColor": "#f0f6fc",
    "tertiaryBorderColor": "#d29922",
    "lineColor": "#58a6ff",
    "textColor": "#f0f6fc",
    "clusterBkg": "#161b22",
    "clusterBorder": "#30363d",
    "edgeLabelBackground": "#0d1117",
    "fontFamily": "Inter, Arial, Helvetica, sans-serif"
  }
}}%%
flowchart TD
    A["Bootstrap CDK"] --> B["Deploy stack with Entra IDs + secret ARN"]
    B --> C["Read EntraCallbackUrl output"]
    C --> D["Set Entra redirect URI"]
    D --> E["Configure SPA from stack outputs"]
    E --> F["Subscribe on-call to AlarmTopicArn"]
    F --> G["Smoke: /health then authenticated /v1/me"]
```

1. `cdk bootstrap` in the target account/region.
2. Create the Entra app registration and store the client secret in Secrets Manager.
3. Export `ENVIRONMENT_NAME` (`dev`, `test`, or `prod` — anything else fails synth), `AWS_ACCOUNT_ID`, `AWS_REGION`, `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET_SECRET_ARN`, `COGNITO_DOMAIN_PREFIX`, and the frontend URLs. Outside localhost every frontend URL must be `https://`; in `prod` none may be localhost and the origin may not be `*`. Violations fail at synth, not after deploy.
4. Publish the API: `dotnet publish apps/api/src/Web/Web.csproj -c Release -r linux-arm64 --self-contained false -o apps/api/src/Web/bin/lambda`
5. `npm run cdk:synth` then `npm run cdk:diff` then `npm run cdk:deploy`.
6. Put `EntraCallbackUrl` on the Entra app.
7. Copy `ApiUrl`, `UserPoolId`, `UserPoolClientId`, `CognitoDomain` into the SPA `VITE_*` variables.
8. Build the SPA and host it at `FRONTEND_URL`. Set production callback/logout URLs on the Cognito client (redeploy if they changed).
9. Subscribe an on-call endpoint to `AlarmTopicArn`; nothing is subscribed by default.

GitHub Actions CI synthesizes; it does not deploy from pull requests. Deploy with GitHub OIDC into AWS, not long-lived access keys. `.github/workflows/deploy.yml` takes the environment as a fixed choice and passes the same configuration to `cdk diff` and `cdk deploy`.
