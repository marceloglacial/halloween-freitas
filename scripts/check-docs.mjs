import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { extname } from "node:path";

function gitFileList(args) {
  return execFileSync("git", args, { encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
}

const base = process.env.DOCS_BASE_SHA;
const head = process.env.DOCS_HEAD_SHA;
let changedFiles;

if (base && head && !/^0+$/.test(base)) {
  changedFiles = gitFileList(["diff", "--name-only", "-z", base, head]);
} else {
  changedFiles = [
    ...gitFileList(["diff", "--name-only", "-z", "HEAD"]),
    ...gitFileList(["ls-files", "--others", "--exclude-standard", "-z"]),
  ];

  if (base && /^0+$/.test(base)) {
    changedFiles.push(...gitFileList(["ls-files", "-z", "--", "*.md"]));
  }
}

const markdownFiles = [...new Set(changedFiles)].filter(
  (file) => extname(file).toLowerCase() === ".md" && existsSync(file),
);

if (markdownFiles.length > 0) {
  execFileSync("pnpm", ["exec", "prettier", "--check", ...markdownFiles], {
    stdio: "inherit",
  });
  console.log(`Formatted ${markdownFiles.length} changed Markdown files.`);
} else {
  console.log("No changed Markdown files to format.");
}

await import("./check-markdown-links.mjs");
