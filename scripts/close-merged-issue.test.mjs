import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const closeScript = fileURLToPath(
  new URL("./close-merged-issue.mjs", import.meta.url),
);
let fixtureRoot;
let mainPath;
let issuePath;
let env;

function run(command, args, cwd, options = {}) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    ...options,
  }).trim();
}

function createFixture({ integrated = true, closeFails = false } = {}) {
  if (fixtureRoot) rmSync(fixtureRoot, { recursive: true, force: true });
  fixtureRoot = mkdtempSync(join(tmpdir(), "issue finalization "));
  mainPath = join(fixtureRoot, "main checkout");
  issuePath = join(fixtureRoot, "issue checkout");
  const binPath = join(fixtureRoot, "fake bin");
  const fakeGhPath = join(binPath, "gh");
  const statePath = join(fixtureRoot, "issue-state.json");
  const callsPath = join(fixtureRoot, "gh-calls.jsonl");
  mkdirSync(binPath);
  mkdirSync(mainPath);

  run("git", ["init", "--initial-branch=main"], mainPath);
  run("git", ["config", "user.name", "Issue Workflow Test"], mainPath);
  run(
    "git",
    ["config", "user.email", "issue-workflow@example.invalid"],
    mainPath,
  );
  writeFileSync(join(mainPath, "base.txt"), "base\n");
  run("git", ["add", "base.txt"], mainPath);
  run("git", ["commit", "-m", "base"], mainPath);
  run(
    "git",
    ["worktree", "add", "-b", "issue-92-test", issuePath, "main"],
    mainPath,
  );
  writeFileSync(join(issuePath, "approved.txt"), "approved\n");
  run("git", ["add", "approved.txt"], issuePath);
  run("git", ["commit", "-m", "issue work"], issuePath);
  if (integrated)
    run(
      "git",
      ["merge", "--no-ff", "issue-92-test", "-m", "merge issue"],
      mainPath,
    );

  writeFileSync(
    statePath,
    JSON.stringify({ number: 92, state: "OPEN", stateReason: null }),
  );
  writeFileSync(callsPath, "");
  writeFileSync(
    fakeGhPath,
    `#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const statePath = process.env.ISSUE_STATE_PATH;
appendFileSync(process.env.ISSUE_CALLS_PATH, JSON.stringify(args) + "\\n");
const state = JSON.parse(readFileSync(statePath, "utf8"));
if (args[0] === "issue" && args[1] === "view") {
  process.stdout.write(JSON.stringify(state));
} else if (args[0] === "issue" && args[1] === "close" && args[3] === "--reason" && args[4] === "completed") {
  if (process.env.ISSUE_CLOSE_FAIL === "1") process.exit(1);
  state.state = "CLOSED";
  state.stateReason = "COMPLETED";
  writeFileSync(statePath, JSON.stringify(state));
} else {
  process.exit(2);
}
`,
  );
  chmodSync(fakeGhPath, 0o755);
  env = {
    ...process.env,
    PATH: `${binPath}:${process.env.PATH}`,
    ISSUE_STATE_PATH: statePath,
    ISSUE_CALLS_PATH: callsPath,
    ...(closeFails ? { ISSUE_CLOSE_FAIL: "1" } : {}),
  };
  return { statePath, callsPath };
}

function invoke(issue = "92", branch = "issue-92-test", approved = true) {
  return spawnSync(
    process.execPath,
    [closeScript, issue, branch, ...(approved ? ["--approved"] : [])],
    {
      cwd: mainPath,
      env,
      encoding: "utf8",
    },
  );
}

function readCalls(path) {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

describe("close merged issue helper", () => {
  beforeEach(() => createFixture());

  afterEach(() => {
    if (fixtureRoot) rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it("closes and verifies only the issue tied to an integrated branch", () => {
    const state = JSON.parse(readFileSync(env.ISSUE_STATE_PATH, "utf8"));
    const result = invoke();

    expect(result.status).toBe(0);
    expect(JSON.parse(readFileSync(env.ISSUE_STATE_PATH, "utf8"))).toEqual({
      ...state,
      state: "CLOSED",
      stateReason: "COMPLETED",
    });
    expect(readCalls(env.ISSUE_CALLS_PATH)).toEqual([
      ["issue", "view", "92", "--json", "number,state,stateReason"],
      ["issue", "close", "92", "--reason", "completed"],
      ["issue", "view", "92", "--json", "number,state,stateReason"],
    ]);
  });

  it("requires the explicit approval flag before contacting GitHub", () => {
    const result = invoke("92", "issue-92-test", false);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--approved");
    expect(readCalls(env.ISSUE_CALLS_PATH)).toEqual([]);
  });

  it("leaves the issue open when its branch is not merged", () => {
    createFixture({ integrated: false });
    const result = invoke();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("not integrated into local main");
    expect(readCalls(env.ISSUE_CALLS_PATH)).toEqual([]);
    expect(JSON.parse(readFileSync(env.ISSUE_STATE_PATH, "utf8")).state).toBe(
      "OPEN",
    );
  });

  it("preserves an issue worktree containing untracked user work", () => {
    writeFileSync(join(issuePath, "review-notes.txt"), "keep this work\n");
    const result = invoke();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("contains changes");
    expect(readCalls(env.ISSUE_CALLS_PATH)).toEqual([]);
    expect(JSON.parse(readFileSync(env.ISSUE_STATE_PATH, "utf8")).state).toBe(
      "OPEN",
    );
  });

  it("does not close the issue when local main contains uncommitted work", () => {
    writeFileSync(join(mainPath, "main-notes.txt"), "preserve this work\n");
    const result = invoke();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("main worktree is not clean");
    expect(readCalls(env.ISSUE_CALLS_PATH)).toEqual([]);
    expect(JSON.parse(readFileSync(env.ISSUE_STATE_PATH, "utf8")).state).toBe(
      "OPEN",
    );
  });

  it("does not continue after GitHub rejects closure", () => {
    createFixture({ closeFails: true });
    const result = invoke();

    expect(result.status).toBe(1);
    expect(readCalls(env.ISSUE_CALLS_PATH)).toEqual([
      ["issue", "view", "92", "--json", "number,state,stateReason"],
      ["issue", "close", "92", "--reason", "completed"],
    ]);
    expect(JSON.parse(readFileSync(env.ISSUE_STATE_PATH, "utf8")).state).toBe(
      "OPEN",
    );
  });

  it("refuses a branch associated with another issue", () => {
    const result = invoke("93", "issue-92-test");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("not associated with issue #93");
    expect(readCalls(env.ISSUE_CALLS_PATH)).toEqual([]);
  });
});
