import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".vercel",
  "coverage",
  "node_modules",
]);
const markdownFiles = [];

function collectMarkdown(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        collectMarkdown(resolve(directory, entry.name));
      }
    } else if (entry.isFile() && extname(entry.name) === ".md") {
      markdownFiles.push(resolve(directory, entry.name));
    }
  }
}

collectMarkdown(root);

const linkPattern =
  /!?\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\)/g;
const failures = [];

for (const file of markdownFiles) {
  const source = readFileSync(file, "utf8");

  for (const match of source.matchAll(linkPattern)) {
    const target = match[1] ?? match[2];

    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) {
      continue;
    }

    const pathPart = target.split(/[?#]/, 1)[0];
    if (!pathPart) {
      continue;
    }

    let decodedPath;
    try {
      decodedPath = decodeURIComponent(pathPart);
    } catch {
      failures.push(`${file}: invalid URL encoding in ${target}`);
      continue;
    }

    const resolvedPath = decodedPath.startsWith("/")
      ? resolve(root, decodedPath.slice(1))
      : resolve(dirname(file), decodedPath);

    if (!existsSync(resolvedPath)) {
      failures.push(`${file}: missing local link target ${target}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Checked local links in ${markdownFiles.length} Markdown files.`);
}
