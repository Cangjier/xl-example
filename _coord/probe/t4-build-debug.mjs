// T4 构建期诊断（只读）：打印 BuildMapped 的入参、BodyStart 结果与 splice 前后 Data。
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
const { MappedFragments } = require(P("typescript", "shapes", "types", "forms", "mapped-fragments.js"));
const { TypeBodyUtil } = require(P("typescript", "shapes", "types", "type-body-util.js"));
const { CatalogGuide } = require(P("core", "syntax", "catalog-guide.js"));
const { TypeAliasDeclarationShape } = require(P("typescript", "shapes", "types", "type-alias-declaration-shape.js"));

const original = MappedFragments.BuildMapped;
MappedFragments.BuildMapped = function patched(units, openIndex, closeIndex) {
  console.log(`[build-mapped] openIndex=${openIndex} closeIndex=${closeIndex} len=${units.length}`);
  units.forEach((t, i) => {
    let s = "";
    try { s = t.TempToString(); } catch { s = "?"; }
    console.log(`   [${i}] ${t.constructor.name} src=[${t.SourceRange.Start},${t.SourceRange.End}) ${JSON.stringify(s)} closed=${t.Closed}`);
  });
  const bodyIndex = TypeBodyUtil.BodyStart(units, closeIndex, new (require(P("core", "syntax", "possible-shape-cache.js")).PossibleShapeCache)());
  console.log(`[build-mapped] BodyStart(units, closeIndex=${closeIndex}) = ${bodyIndex}`);
  return original.call(this, units, openIndex, closeIndex);
};

const origCompute = CatalogGuide.prototype.ComputePossibleShapesByIndex;
CatalogGuide.prototype.ComputePossibleShapesByIndex = function patched2(index, context, source) {
  const host = index.Host;
  if (host instanceof TypeAliasDeclarationShape && index.Index >= (process.argv[3] ? Number(process.argv[3]) : 0)) {
    console.log(`[guide] idx=${index.Index} len=${host.Data.length}`);
  }
  return origCompute.call(this, index, context, source);
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
