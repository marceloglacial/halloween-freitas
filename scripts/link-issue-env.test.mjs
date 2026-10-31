import { execFileSync, spawn, spawnSync } from "node:child_process";
import {
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const linkScript = fileURLToPath(
  new URL("./link-issue-env.mjs", import.meta.url),
);

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function runLinkScript(issuePath) {
  return spawnSync(process.execPath, [linkScript], {
    cwd: issuePath,
    encoding: "utf8",
  });
}

function commit(cwd, message) {
  git(
    ["add", "--", ".gitignore", "README.md", "package.json", "server.mjs"],
    cwd,
  );
  git(["commit", "-m", message], cwd);
}

async function startTestDevServer(issuePath) {
  const manifest = JSON.parse(
    readFileSync(join(issuePath, "package.json"), "utf8"),
  );
  const packageManager = manifest.packageManager?.split("@")[0];
  if (!packageManager || !manifest.scripts?.dev) {
    throw new Error(
      "The test worktree must declare its package manager and dev script.",
    );
  }

  const child = spawn(packageManager, ["run", "dev"], {
    cwd: issuePath,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });
  let output = "";
  let timeout;

  try {
    const url = await new Promise((resolve, reject) => {
      timeout = setTimeout(
        () => reject(new Error(`Dev server did not become ready: ${output}`)),
        15_000,
      );
      child.stdout.on("data", (chunk) => {
        output += chunk.toString();
        const match = output.match(/READY_URL=(http:\/\/\S+)/);
        if (match) resolve(match[1]);
      });
      child.stderr.on("data", (chunk) => {
        output += chunk.toString();
      });
      child.once("error", reject);
      child.once("exit", (code, signal) => {
        reject(
          new Error(
            `Dev server exited before readiness (${code ?? signal}): ${output}`,
          ),
        );
      });
    });

    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ready");
    return url;
  } finally {
    clearTimeout(timeout);
    if (child.pid !== undefined) {
      const exited = new Promise((resolve) => child.once("exit", resolve));
      const signalProcessGroup = (signal) => {
        try {
          if (process.platform === "win32") {
            child.kill(signal);
          } else {
            process.kill(-child.pid, signal);
          }
        } catch (error) {
          if (error.code !== "ESRCH") throw error;
        }
      };

      signalProcessGroup("SIGINT");
      if (child.exitCode === null && child.signalCode === null) {
        await Promise.race([
          exited,
          new Promise((resolve) => setTimeout(resolve, 1_000)),
        ]);
      }
      if (child.exitCode === null && child.signalCode === null) {
        signalProcessGroup("SIGKILL");
        await exited;
      }
    }
  }
}

describe("issue worktree environment linking", () => {
  it("links safely and idempotently, starts a review server, and rejects unsafe sources", async () => {
    const fixtureRoot = realpathSync(
      mkdtempSync(join(tmpdir(), "issue env flow ")),
    );
    const canonicalPath = join(fixtureRoot, "canonical checkout");
    const issuePath = join(fixtureRoot, "test issue worktree");
    const sourcePath = join(canonicalPath, ".env.local");
    const privateSourcePath = join(fixtureRoot, "development credentials");
    const targetPath = join(issuePath, ".env.local");
    const secretSentinel = "TEST_ONLY_SECRET_VALUE_MUST_NOT_BE_PRINTED";

    try {
      mkdirSync(canonicalPath);
      git(["init", "--initial-branch=main"], canonicalPath);
      git(["config", "user.name", "Issue workflow test"], canonicalPath);
      git(
        ["config", "user.email", "issue-workflow-test@example.invalid"],
        canonicalPath,
      );
      writeFileSync(join(canonicalPath, ".gitignore"), ".env*\n");
      writeFileSync(join(canonicalPath, "README.md"), "temporary fixture\n");
      writeFileSync(
        join(canonicalPath, "package.json"),
        JSON.stringify({
          packageManager: "pnpm@12.4.2",
          scripts: { dev: "node server.mjs" },
        }),
      );
      writeFileSync(
        join(canonicalPath, "server.mjs"),
        [
          'import { createServer } from "node:http";',
          'const server = createServer((_, response) => response.end("ready"));',
          'server.listen(0, "127.0.0.1", () => {',
          "  const { port } = server.address();",
          "  console.log(`READY_URL=http://127.0.0.1:${port}`);",
          "});",
          "",
        ].join("\n"),
      );
      commit(canonicalPath, "fixture: create canonical checkout");
      writeFileSync(privateSourcePath, `${secretSentinel}\n`);
      symlinkSync(privateSourcePath, sourcePath);
      git(
        ["worktree", "add", "-b", "issue-999-test", issuePath, "main"],
        canonicalPath,
      );

      const firstRun = runLinkScript(issuePath);
      expect(firstRun.status).toBe(0);
      expect(readlinkSync(targetPath)).toBe(sourcePath);
      expect(lstatSync(targetPath).isSymbolicLink()).toBe(true);
      expect(firstRun.stdout + firstRun.stderr).not.toContain(secretSentinel);
      expect(
        spawnSync("git", ["check-ignore", "--quiet", "--", ".env.local"], {
          cwd: issuePath,
        }).status,
      ).toBe(0);
      expect(
        spawnSync("git", ["ls-files", "--error-unmatch", "--", ".env.local"], {
          cwd: issuePath,
          stdio: "ignore",
        }).status,
      ).not.toBe(0);

      const reviewUrl = await startTestDevServer(issuePath);
      expect(reviewUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

      const secondRun = runLinkScript(issuePath);
      expect(secondRun.status).toBe(0);
      expect(readlinkSync(targetPath)).toBe(sourcePath);

      rmSync(targetPath);
      writeFileSync(targetPath, "preserve this conflicting file\n");
      const conflictRun = runLinkScript(issuePath);
      expect(conflictRun.status).not.toBe(0);
      expect(readFileSync(targetPath, "utf8")).toBe(
        "preserve this conflicting file\n",
      );

      rmSync(targetPath);
      symlinkSync(join(fixtureRoot, "other local file"), targetPath);
      const wrongLink = readlinkSync(targetPath);
      const conflictingLinkRun = runLinkScript(issuePath);
      expect(conflictingLinkRun.status).not.toBe(0);
      expect(readlinkSync(targetPath)).toBe(wrongLink);

      rmSync(targetPath);
      rmSync(sourcePath);
      const missingRun = runLinkScript(issuePath);
      expect(missingRun.status).not.toBe(0);
      expect(missingRun.stderr).toContain(
        "Required development file .env.local is missing",
      );
      expect(lstatSync(targetPath, { throwIfNoEntry: false })).toBeUndefined();

      writeFileSync(privateSourcePath, `${secretSentinel}\n`);
      symlinkSync(privateSourcePath, sourcePath);
      writeFileSync(join(canonicalPath, ".gitignore"), "");
      commit(canonicalPath, "fixture: remove env ignore rule");
      const unignoredRun = runLinkScript(issuePath);
      expect(unignoredRun.status).not.toBe(0);
      expect(unignoredRun.stderr).toContain("is not ignored by Git");
      expect(lstatSync(targetPath, { throwIfNoEntry: false })).toBeUndefined();

      writeFileSync(join(canonicalPath, ".gitignore"), ".env*\n");
      commit(canonicalPath, "fixture: restore env ignore rule");
      const trackedTargetPath = join(
        canonicalPath,
        "tracked environment target",
      );
      writeFileSync(trackedTargetPath, `${secretSentinel}\n`);
      git(["add", "--", "tracked environment target"], canonicalPath);
      git(["commit", "-m", "fixture: track env link target"], canonicalPath);
      rmSync(sourcePath);
      symlinkSync(trackedTargetPath, sourcePath);
      const trackedTargetRun = runLinkScript(issuePath);
      expect(trackedTargetRun.status).not.toBe(0);
      expect(trackedTargetRun.stderr).toContain(
        "resolved environment target is tracked by Git",
      );
      expect(lstatSync(targetPath, { throwIfNoEntry: false })).toBeUndefined();

      rmSync(sourcePath);
      symlinkSync(privateSourcePath, sourcePath);
      git(["add", "-f", "--", ".env.local"], canonicalPath);
      git(["commit", "-m", "fixture: track the local env file"], canonicalPath);
      const trackedRun = runLinkScript(issuePath);
      expect(trackedRun.status).not.toBe(0);
      expect(trackedRun.stderr).toContain("is tracked by Git");
      expect(lstatSync(targetPath, { throwIfNoEntry: false })).toBeUndefined();
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 60_000);
});
