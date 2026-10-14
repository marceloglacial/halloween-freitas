import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function runGh(args) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function readIssue(issueNumber) {
  const result = JSON.parse(
    runGh(["issue", "view", issueNumber, "--json", "number,state,stateReason"]),
  );
  if (String(result.number) !== issueNumber) {
    throw new Error(
      `GitHub returned issue ${result.number} when issue ${issueNumber} was requested.`,
    );
  }
  return result;
}

function assertMainWorktree() {
  const root = realpathSync(git(["rev-parse", "--show-toplevel"]));
  if (git(["branch", "--show-current"]) !== "main") {
    throw new Error(
      "Run issue closure from the local main worktree after merge and validation.",
    );
  }

  const blocks = git(["worktree", "list", "--porcelain"]).split(/\n\n/);
  const mainBlock = blocks.find((block) =>
    block.includes("\nbranch refs/heads/main"),
  );
  if (
    !mainBlock ||
    realpathSync(mainBlock.match(/^worktree (.+)$/m)?.[1] ?? "") !== root
  ) {
    throw new Error(
      "The current checkout is not the registered local main worktree.",
    );
  }
  if (git(["status", "--porcelain", "--untracked-files=all"])) {
    throw new Error(
      "The local main worktree is not clean; issue closure stopped.",
    );
  }
}

function assertCleanIssueWorktree(issueBranch, issueNumber) {
  const matches = git(["worktree", "list", "--porcelain"])
    .split(/\n\n/)
    .filter((block) => block.includes(`\nbranch refs/heads/${issueBranch}`));
  if (matches.length !== 1) {
    throw new Error(
      `Expected one registered worktree for ${issueBranch}; issue #${issueNumber} remains open.`,
    );
  }
  const issuePath = matches[0].match(/^worktree (.+)$/m)?.[1];
  if (
    !issuePath ||
    git(["-C", issuePath, "status", "--porcelain", "--untracked-files=all"])
  ) {
    throw new Error(
      `Issue worktree ${issueBranch} contains changes; issue #${issueNumber} remains open.`,
    );
  }
}

function closeMergedIssue(issueNumber, issueBranch) {
  if (!/^\d+$/.test(issueNumber) || Number(issueNumber) < 1) {
    throw new Error("Provide a positive GitHub issue number.");
  }
  if (!issueBranch.startsWith(`issue-${issueNumber}-`)) {
    throw new Error(
      `Branch ${issueBranch} is not associated with issue #${issueNumber}.`,
    );
  }

  assertMainWorktree();
  if (
    git(["branch", "--list", "--format=%(refname:short)", issueBranch]) !==
    issueBranch
  ) {
    throw new Error(
      `The associated local branch ${issueBranch} does not exist.`,
    );
  }
  assertCleanIssueWorktree(issueBranch, issueNumber);
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", issueBranch, "main"], {
      stdio: "ignore",
    });
  } catch {
    throw new Error(
      `Issue branch ${issueBranch} is not integrated into local main; issue #${issueNumber} remains open.`,
    );
  }

  const current = readIssue(issueNumber);
  if (current.state === "CLOSED") {
    if (current.stateReason !== "COMPLETED") {
      throw new Error(
        `Issue #${issueNumber} is already closed with reason ${current.stateReason ?? "unknown"}.`,
      );
    }
    return;
  }
  if (current.state !== "OPEN") {
    throw new Error(
      `Issue #${issueNumber} has unexpected state ${current.state}.`,
    );
  }

  runGh(["issue", "close", issueNumber, "--reason", "completed"]);
  const closed = readIssue(issueNumber);
  if (closed.state !== "CLOSED" || closed.stateReason !== "COMPLETED") {
    throw new Error(
      `Could not verify issue #${issueNumber} closed with reason completed.`,
    );
  }
}

try {
  const [issueNumber, issueBranch, approvalFlag, ...extra] =
    process.argv.slice(2);
  if (
    !issueNumber ||
    !issueBranch ||
    approvalFlag !== "--approved" ||
    extra.length
  ) {
    throw new Error(
      "Usage: node scripts/close-merged-issue.mjs <issue-number> <issue-branch> --approved",
    );
  }
  closeMergedIssue(issueNumber, issueBranch);
  console.log(
    `Verified issue #${issueNumber} is closed as completed after its branch merge.`,
  );
} catch (error) {
  console.error(`Issue closure stopped: ${error.message}`);
  process.exitCode = 1;
}
