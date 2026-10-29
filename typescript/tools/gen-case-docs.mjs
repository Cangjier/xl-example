// 生成 tts 用例的 .md（逐字符 token 树）+ .ast（ts-ast-line 输出）。
// 用法: node typescript/tools/gen-case-docs.mjs <case.ts> [...]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { parseToAstLine } from "./ts-ast-line.mjs";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const BUILD = path.join(ROOT, "build", "ts");

const { SyntaxContext } = require(path.join(BUILD, "core/syntax/syntax-context.js"));
const { SourceRange } = require(path.join(BUILD, "core/syntax/source-range.js"));
const { TextDocument } = require(path.join(BUILD, "typescript/run/text-document.js"));
const { TypescriptTemplate } = require(path.join(BUILD, "typescript/run/typescript-template.js"));
const { SourceFileShape } = require(path.join(BUILD, "typescript/shapes/files/source-file-shape.js"));

export function traceSteps(source, name) {
  const template = TypescriptTemplate.Create();
  const root = new SourceFileShape(template);
  const context = new SyntaxContext(root, 32);
  const document = new TextDocument(source, name);
  SourceRange.CurrentDocument = document;
  context.CurrentDocument = document;
  const count = document.GetCount();
  const steps = [];
  for (let index = 0; index < count; index++) {
    context.ProcessRange(root, new SourceRange(document, index, index + 1), index);
    steps.push({ label: `char ${index}`, quoted: JSON.stringify(source[index]), tree: root.ToAstLine(0) });
  }
  context.Index = count;
  context.Root.SignOut(count);
  context.ProcessRange(root, new SourceRange(document, count, count), count);
  steps.push({ label: "EOF", quoted: null, tree: root.ToAstLine(0) });
  return steps;
}

function displayChar(ch) {
  if (ch === "\n") {
    return "⏎";
  }
  return ch;
}

export function renderMarkdown(source, name) {
  const steps = traceSteps(source, name);
  const characters = Array.from(source);
  const indexRow = characters.map((_, index) => String(index)).join(" ");
  const charRow = characters.map((ch) => displayChar(ch)).join(" ");
  const lines = [];
  lines.push("# 预期 token 树（逐字）：`" + source.replace(/\r?\n$/, "").replace(/\n/g, "⏎") + "`");
  lines.push("");
  lines.push("```text");
  lines.push(indexRow);
  lines.push(charRow);
  lines.push("```");
  for (const step of steps) {
    lines.push("");
    const heading = step.quoted === null ? `## [${step.label}]` : `## [${step.label}] \`${step.quoted}\``;
    lines.push(heading);
    lines.push("");
    lines.push("```text");
    lines.push(step.tree);
    lines.push("```");
  }
  return lines.join("\n") + "\n";
}

const files = process.argv.slice(2);
if (files.length === 0) {
  process.stderr.write("用法: node typescript/tools/gen-case-docs.mjs <case.ts> [...]\n");
  process.exitCode = 2;
} else {
  for (const file of files) {
    const full = path.resolve(ROOT, file);
    const source = fs.readFileSync(full, "utf8");
    const md = renderMarkdown(source, path.basename(file));
    fs.writeFileSync(full.replace(/\.ts$/, ".md"), md, "utf8");
    fs.writeFileSync(full.replace(/\.ts$/, ".ast"), parseToAstLine(source, path.basename(file)) + "\n", "utf8");
    console.log("wrote " + path.relative(ROOT, full).replace(/\.ts$/, ".{md,ast}"));
  }
}
