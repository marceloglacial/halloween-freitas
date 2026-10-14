import { execFileSync, spawnSync } from "node:child_process";
import {
  lstatSync,
  readlinkSync,
  realpathSync,
  statSync,
  symlinkSync,
} from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

// Keep this allowlist in sync with the development-only files documented in
// docs/operations.md. Never discover and link arbitrary dotfiles.
const LOCAL_ENV_FILES = [".env.local"];

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function runGit(args, cwd) {
  return spawnSync("git", args, { cwd, stdio: "ignore" });
}

function assertUntrackedAndIgnored(canonicalPath, relativePath, displayName) {
  const tracked = runGit(
    ["ls-files", "--error-unmatch", "--", relativePath],
    canonicalPath,
  );
  if (tracked.status === 0) {
    throw new Error(
      `The canonical ${displayName} is tracked by Git; remove it from version control before linking local credentials.`,
    );
  }
  if (tracked.status !== 1) {
    throw new Error(`Git could not verify whether ${displayName} is tracked.`);
  }

  const ignored = runGit(
    ["check-ignore", "--quiet", "--", relativePath],
    canonicalPath,
  );
  if (ignored.status !== 0) {
    throw new Error(
      `The canonical ${displayName} is not ignored by Git; update .gitignore before linking local credentials.`,
    );
  }
}

function resolvePhysicalPath(path) {
  return realpathSync(resolve(path));
}

function getWorktreePaths(issueWorktreePath) {
  const output = git(["worktree", "list", "--porcelain"], issueWorktreePath);
  const blocks = output.split(/\r?\n\r?\n/);
  const firstWorktreeLine = blocks[0]
    ?.split(/\r?\n/)
    .find((line) => line.startsWith("worktree "));

  if (!firstWorktreeLine) {
    throw new Error("Git did not report a canonical project worktree.");
  }

  const canonicalPath = resolvePhysicalPath(
    firstWorktreeLine.slice("worktree ".length),
  );
  const issuePath = resolvePhysicalPath(
    git(["rev-parse", "--show-toplevel"], issueWorktreePath),
  );

  if (canonicalPath === issuePath) {
    throw new Error("Run this command from a dedicated issue worktree.");
  }

  return { canonicalPath, issuePath };
}

function assertSafeSource(canonicalPath, fileName) {
  const sourcePath = resolve(canonicalPath, fileName);
  let sourceInfo;

  try {
    sourceInfo = lstatSync(sourcePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        `Required development file ${fileName} is missing from the canonical checkout. Configure it with development-only credentials, then rerun this command.`,
      );
    }
    throw error;
  }

  let resolvedSourcePath;
  try {
    resolvedSourcePath = realpathSync(sourcePath);
  } catch {
    resolvedSourcePath = null;
  }

  let sourceIsFile = false;
  try {
    sourceIsFile = sourceInfo.isFile() || statSync(sourcePath).isFile();
  } catch {
    sourceIsFile = false;
  }

  if (!sourceIsFile || !resolvedSourcePath) {
    throw new Error(
      `The canonical ${fileName} must resolve to a regular file; no link was created.`,
    );
  }

  assertUntrackedAndIgnored(canonicalPath, fileName, fileName);

  const resolvedSourceRelativePath = relative(canonicalPath, resolvedSourcePath);
  const sourceIsInsideCanonical =
    resolvedSourceRelativePath !== "" &&
    resolvedSourceRelativePath !== ".." &&
    !resolvedSourceRelativePath.startsWith(`..${sep}`) &&
    !isAbsolute(resolvedSourceRelativePath);
  if (sourceIsInsideCanonical && resolvedSourceRelativePath !== fileName) {
    assertUntrackedAndIgnored(
      canonicalPath,
      resolvedSourceRelativePath,
      "resolved environment target",
    );
  }

  return sourcePath;
}

function inspectTarget(targetPath, sourcePath, fileName) {
  let targetInfo;
  try {
    targetInfo = lstatSync(targetPath);
  } catch (error) {
    if (error.code === "ENOENT") return "missing";
    throw error;
  }

  if (targetInfo.isSymbolicLink()) {
    let resolvesToSource = false;
    try {
      resolvesToSource =
        readlinkSync(targetPath) === sourcePath && statSync(targetPath).isFile();
    } catch {
      // A dangling or unreadable link is a conflict and must be preserved.
    }

    if (resolvesToSource) return "linked";
  }

  throw new Error(
    `The issue worktree already contains a conflicting ${fileName}; it was left unchanged. Resolve it manually and rerun this command.`,
  );
}

function linkIssueEnvironment(cwd = process.cwd()) {
  const { canonicalPath, issuePath } = getWorktreePaths(cwd);
  const files = LOCAL_ENV_FILES.map((fileName) => {
    const sourcePath = assertSafeSource(canonicalPath, fileName);
    const targetPath = resolve(issuePath, fileName);
    return {
      fileName,
      sourcePath,
      targetPath,
      state: inspectTarget(targetPath, sourcePath, fileName),
    };
  });

  for (const file of files) {
    if (file.state === "missing") {
      symlinkSync(file.sourcePath, file.targetPath);
      if (
        readlinkSync(file.targetPath) !== file.sourcePath ||
        !statSync(file.targetPath).isFile()
      ) {
        throw new Error(`Could not verify the ${file.fileName} worktree link.`);
      }
      console.log(`Linked ${file.fileName}.`);
    } else {
      console.log(`Verified existing ${file.fileName} link.`);
    }
  }
}

try {
  linkIssueEnvironment();
} catch (error) {
  console.error(`Issue worktree environment setup failed: ${error.message}`);
  process.exitCode = 1;
}
