// 形状树的「实际创建位置」：用 build/ts 逐字符推进，记录每个节点第一次出现在树里的那一格。
//
// case-infer.mjs（对照 .infer）和 cases-viewer（case.ast 页标注）共用这一份，
// 免得两边对「节点身份」和「TS 区间别名」各写一套。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const BUILD = path.join(ROOT, "build", "ts");
const BUILD_ENTRY = path.join(BUILD, "typescript", "shapes", "files", "source-file-shape.js");

// TS 的 SyntaxKind 里有些名字是区间别名（FirstLiteralToken 之类），ts-ast-line 打出来的是别名，
// 形状侧用的是区间首项的名字。和 run.mjs 的对拍表保持一致。
export const TS_KIND_ALIASES = new Map([
  ["FirstStatement", "VariableStatement"],
  ["FirstLiteralToken", "NumericLiteral"],
  ["FirstNode", "QualifiedName"],
  ["FirstTypeNode", "TypePredicate"],
  ["LastTypeNode", "ImportType"],
  ["FirstContextualKeyword", "AbstractKeyword"],
  ["LastStatement", "DebuggerStatement"],
  ["FirstTemplateToken", "NoSubstitutionTemplateLiteral"],
  ["LastTemplateToken", "TemplateTail"],
  ["FirstPunctuation", "OpenBraceToken"],
  ["FirstAssignment", "EqualsToken"],
  ["FirstCompoundAssignment", "PlusEqualsToken"],
  ["LastAssignment", "CaretEqualsToken"],
  ["LastCompoundAssignment", "CaretEqualsToken"],
  ["LastPunctuation", "CaretEqualsToken"],
  ["FirstBinaryOperator", "LessThanToken"],
  ["AssertClause", "ImportAttributes"],
  ["AssertEntry", "ImportAttribute"],
]);

export const canonicalKind = (kind) => TS_KIND_ALIASES.get(kind) ?? kind;

export function parserAvailable() {
  return fs.existsSync(BUILD_ENTRY);
}

function loadParser() {
  if (!parserAvailable()) {
    throw new Error(`缺少 ${path.relative(ROOT, BUILD)}：先跑 npm run build`);
  }
  const { SyntaxContext } = require(path.join(BUILD, "core/syntax/syntax-context.js"));
  const { SourceRange } = require(path.join(BUILD, "core/syntax/source-range.js"));
  const { TextDocument } = require(path.join(BUILD, "typescript/run/text-document.js"));
  const { TypescriptTemplate } = require(path.join(BUILD, "typescript/run/typescript-template.js"));
  const { SourceFileShape } = require(path.join(BUILD, "typescript/shapes/files/source-file-shape.js"));
  return { SyntaxContext, SourceRange, TextDocument, TypescriptTemplate, SourceFileShape };
}

const kindOf = (node) => node.constructor.name.replace(/Shape$/, "");

function collect(node, depth, isLast, out) {
  const range = node.SourceRange ?? {};
  const kind = kindOf(node);
  const pos = node.Pos ?? -1;
  const start = range.Start ?? -1;
  out.push({
    // 只按 kind + pos + src 起点做身份：End 会随形状生长变化，不能进身份。
    // 根节点的 Pos 在形状侧是 -1、在 TS 侧是 0，统一按 0 记。
    key: kind === "SourceFile" ? "SourceFile|0|0" : `${kind}|${pos}|${start}`,
    kind,
    pos,
    start,
    end: range.End ?? -1,
    text: node.Text !== undefined ? node.Text : (node.Temp !== undefined ? node.Temp : ""),
    // ShapeToken.CreatedAt：possible / end 的 build 建出这颗形状的那一格；-1 = 还没写 create 入口。
    createdAt: typeof node.CreatedAt === "number" ? node.CreatedAt : -1,
    isLast,
    depth,
  });
  const children = node.Data ?? [];
  for (let i = 0; i < children.length; i++) {
    collect(children[i], depth + 1, i === children.length - 1, out);
  }
  return out;
}

/** 返回 { map, created, final }；key = kind|pos|src 起点，与 .ast / .infer 行用同一套。
 *  map 是「首次出现在树里」的那一格；created 是 ShapeToken.CreatedAt（建出形状的那一格，
 *  没有就记 null）；final 是最终树。 */
export function traceActual(source, name) {
  const parser = loadParser();
  const template = parser.TypescriptTemplate.Create();
  const root = new parser.SourceFileShape(template);
  const context = new parser.SyntaxContext(root, 32);
  const document = new parser.TextDocument(source, name);
  parser.SourceRange.CurrentDocument = document;
  context.CurrentDocument = document;
  const total = document.GetCount();
  const map = new Map();
  for (let index = 0; index < total; index++) {
    context.ProcessRange(root, new parser.SourceRange(document, index, index + 1), index);
    for (const rec of collect(root, 0, true, [])) {
      if (!map.has(rec.key)) {
        map.set(rec.key, index);
      }
    }
  }
  context.Index = total;
  root.SignOut(total);
  context.ProcessRange(root, new parser.SourceRange(document, total, total), total);
  const final = collect(root, 0, true, []);
  const created = new Map();
  for (const rec of final) {
    created.set(rec.key, rec.createdAt >= 0 ? rec.createdAt : null);
  }
  return { map, created, final };
}
