import * as lambda from "aws-cdk-lib/aws-lambda";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const apiProjectDir = path.join(repoRoot, "apps/api/src/Web");
export const apiPublishDir = path.join(apiProjectDir, "bin/lambda");
export const lambdaStubDir = path.join(repoRoot, "infra/test/lambda-stub");

export const dotnetRuntime = lambda.Runtime.DOTNET_10;

export function resolveApiCode(explicit?: lambda.Code): lambda.Code {
  if (explicit) {
    return explicit;
  }

  if (fs.existsSync(path.join(apiPublishDir, "Web.dll"))) {
    return lambda.Code.fromAsset(apiPublishDir);
  }

  return lambda.Code.fromAsset(apiProjectDir, {
    bundling: {
      image: dotnetRuntime.bundlingImage,
      local: {
        tryBundle(outputDir: string): boolean {
          const result = spawnSync(
            "dotnet",
            [
              "publish",
              apiProjectDir,
              "-c",
              "Release",
              "-r",
              "linux-arm64",
              "--self-contained",
              "false",
              "-o",
              outputDir,
            ],
            { stdio: "inherit", shell: true },
          );
          return result.status === 0;
        },
      },
      command: [
        "bash",
        "-c",
        "dotnet publish /asset-input -c Release -r linux-arm64 --self-contained false -o /asset-output",
      ],
    },
  });
}
