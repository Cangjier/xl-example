// T1 调试探针（只读）：打印 alias 宿主上每次 CatalogGuide 计算时的候选存活情况。
// 用法: node _coord/probe/t1-debug.mjs <file.ts>
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
const { Symbol } = require(P("core", "syntax", "basic-tokens", "symbol.js"));

const dump = (host) => host.Data.map((t) => {
  const n = t.constructor.name.replace(/Shape$/, "");
  let s = "";
  try { s = t.TempToString ? t.TempToString() : ""; } catch { s = "?"; }
  return `${n}(${JSON.stringify(s)}${t.Closed ? "" : ",open"})`;
}).join(" | ");

const original = CatalogGuide.prototype.ComputePossibleShapesByIndex;
CatalogGuide.prototype.ComputePossibleShapesByIndex = function patched(index, context, source) {
  const host = index.Host;
  const isAlias = host instanceof TypeAliasDeclarationShape;
  if (isAlias) {
    const name = (i) => this.PossibleShapes[i].constructor.name;
    const alive = [...this.Candidates].map(name).join(",");
    console.log(`[guide] idx=${index.Index} src=${source} alive=[${alive}]`);
    console.log(`        data: ${dump(host)}`);
  }
  const out = original.call(this, index, context, source);
  if (isAlias) {
    const name = (i) => this.PossibleShapes[i].constructor.name;
    console.log(`[guide] -> ${out} after=[${[...this.Candidates].map(name).join(",")}]`);
  }
  return out;
};

const symClose = Symbol.prototype.Close;
Symbol.prototype.Close = function patchedClose(context) {
  const out = symClose.call(this, context);
  const p = this.Parent;
  console.log(`[symbol-close] ${this.constructor.name} ${JSON.stringify(this.TempToString ? this.TempToString() : "")} parent=${p ? p.constructor.name : "null"} out=${out}`);
  return out;
};

const file = process.argv[2];
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
