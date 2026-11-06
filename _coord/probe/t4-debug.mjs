// T4 调试探针（只读）：逐字符打印 alias 宿主的 token 结构与候选存活。
// 用法: node _coord/probe/t4-debug.mjs <file.ts> [--stop N]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const BUILD = path.join(ROOT, "build", "ts");
const P = (...seg) => path.join(BUILD, ...seg);

const { SyntaxContext } = require(P("core", "syntax", "syntax-context.js"));
const { SourceRange } = require(P("core", "syntax", "source-range.js"));
const { TextDocument } = require(P("typescript", "run", "text-document.js"));
const { TypescriptTemplate } = require(P("typescript", "run", "typescript-template.js"));
const { SourceFileShape } = require(P("typescript", "shapes", "files", "source-file-shape.js"));
const { CatalogGuide } = require(P("core", "syntax", "catalog-guide.js"));
const { TypeAliasDeclarationShape } = require(P("typescript", "shapes", "types", "type-alias-declaration-shape.js"));

const argv = process.argv.slice(2);
const file = argv[0];
const stopAt = argv.includes("--stop") ? Number(argv[argv.indexOf("--stop") + 1]) : -1;

const dumpUnit = (t, depth) => {
  const name = t.constructor.name;
  const extra = [];
  if (t.Closed !== undefined) extra.push(t.Closed ? "closed" : "open");
  if (t.Text !== undefined) extra.push(`Text=${JSON.stringify(t.Text)}`);
  if (t.IsSupportInterpolation !== undefined) extra.push(`interp=${t.IsSupportInterpolation}`);
  if (t.Keyword !== undefined) extra.push(`kw=${JSON.stringify(t.Keyword)}`);
  let s = "";
  try { s = t.TempToString ? t.TempToString() : ""; } catch { s = "?"; }
  const pad = " ".repeat(depth * 2);
  const lines = [`${pad}${name} src=[${t.SourceRange?.Start},${t.SourceRange?.End}) ${JSON.stringify(s)} ${extra.join(" ")}`];
  for (const child of t.Data ?? []) lines.push(dumpUnit(child, depth + 1));
  return lines.join("\n");
};

const dump = (host) => host.Data.map((t, i) => dumpUnit(t, 0).split("\n").map((l, j) => (j === 0 ? `  [${i}] ${l.trim()}` : "     " + l)).join("\n")).join("\n");

const original = CatalogGuide.prototype.ComputePossibleShapesByIndex;
CatalogGuide.prototype.ComputePossibleShapesByIndex = function patched(index, context, source) {
  const host = index.Host;
  const isAlias = host instanceof TypeAliasDeclarationShape;
  if (isAlias && (stopAt < 0 || index.Index <= stopAt)) {
    const name = (i) => this.PossibleShapes[i].constructor.name.replace(/PossibleShape$/, "");
    console.log(`[guide] idx=${index.Index} alive=[${[...this.Candidates].map(name).join(",")}]`);
    if (argv.includes("--dump")) console.log(dump(host));
  }
  const out = original.call(this, index, context, source);
  if (isAlias && (stopAt < 0 || index.Index <= stopAt)) {
    const name = (i) => this.PossibleShapes[i].constructor.name.replace(/PossibleShape$/, "");
    console.log(`[guide] -> ${out} after=[${[...this.Candidates].map(name).join(",")}]`);
  }
  return out;
};

const source = fs.readFileSync(file, "utf8");
const template = TypescriptTemplate.Create();
const root = new SourceFileShape(template);
const context = new SyntaxContext(root, 32);
const document = new TextDocument(source, path.basename(file));
SourceRange.CurrentDocument = document;
context.CurrentDocument = document;
const count = document.GetCount();
for (let index = 0; index < count; index++) {
  context.ProcessRange(root, new SourceRange(document, index, index + 1), index);
}
context.Index = count;
root.SignOut(count);
context.ProcessRange(root, new SourceRange(document, count, count), count);
console.log(root.ToAstLine(0));
