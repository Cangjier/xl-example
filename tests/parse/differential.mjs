// 差分找缺口：用 TypeScript 自带的 AST 当基准，逐文件比对「源码里有几个这种构造」与
// 「产物里有几个对应节点」，并对没产出节点的构造自动归因。
//
//   node tests/parse/differential.mjs                 默认语料（真实 .d.ts + 本项目产物 + 用例）
//   node tests/parse/differential.mjs cases            只用 tests/parse/cases
//   node tests/parse/differential.mjs real             只用 node_modules / dist / samples
//   node tests/parse/differential.mjs --json out.json
//   node tests/parse/differential.mjs --top 20         每类最多列 20 个样本
//
// 它不依赖手写期望值，所以能找出「没人想到要写用例」的缺口；代价是只覆盖有明确标签映射的构造。

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { listCases } from "./validate.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const ts = require(path.join(root, "node_modules", "typescript"));
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));

// TypeScript 构造 → 它「本该」产出的节点标签。null 表示当前标签表里根本没有对应节点。
const MAP = {
  InterfaceDeclaration: "Interface",
  ClassDeclaration: "Class",
  ClassExpression: "Class",
  FunctionDeclaration: "Function",
  EnumDeclaration: "Enum",
  VariableDeclaration: "Let",
  ImportDeclaration: "Import",
  MethodDeclaration: "MethodDeclaration",
  PropertyDeclaration: "Field",
  GetAccessor: "MethodDeclaration",
  SetAccessor: "MethodDeclaration",
  MethodSignature: "MethodDeclaration",
  PropertySignature: "Field",
  // 索引签名第 66 轮起有自己的 `<IndexSignature>` 标签（`index-signature.xl.md`）。
  // 这里原来写的是 `"Field"`，于是 120 处索引签名被算成「Field 没产出节点」——
  // 全语料的 Field 一行因此报出 **+119 的假差额**（第 68 轮实测：TS 侧 20363 个成员/索引签名
  // = 产物 `<Field>` 20244 + `<IndexSignature>` 120 − 1 处多收）。差分表里的正项是判据，
  // 所以这条映射必须跟着标签表走。
  IndexSignatureDeclaration: "IndexSignature",
  TypeAliasDeclaration: "TypeAssign",
  ModuleDeclaration: "Namespace",
  ModuleDeclarationString: "Namespace",
  ExportDeclaration: "Export",
  ExportAssignment: "Export",
  NonNullExpression: "NotNull",
  BinaryExpression: "BinaryOperator",
  PrefixUnaryExpression: "UnaryOperator",
  PostfixUnaryExpression: "UnaryOperator",
  SpreadElement: "Spread",
  SpreadAssignment: "Spread",
  CallSignatureDeclaration: "Signature",
  ConstructSignatureDeclaration: "Signature",
};

const KIND_OF = [
  [ts.isInterfaceDeclaration, "InterfaceDeclaration"],
  [ts.isClassDeclaration, "ClassDeclaration"],
  [ts.isClassExpression, "ClassExpression"],
  [ts.isFunctionDeclaration, "FunctionDeclaration"],
  [ts.isEnumDeclaration, "EnumDeclaration"],
  [ts.isVariableDeclaration, "VariableDeclaration"],
  [ts.isImportDeclaration, "ImportDeclaration"],
  [ts.isMethodDeclaration, "MethodDeclaration"],
  [ts.isPropertyDeclaration, "PropertyDeclaration"],
  [ts.isGetAccessor, "GetAccessor"],
  [ts.isSetAccessor, "SetAccessor"],
  [ts.isMethodSignature, "MethodSignature"],
  [ts.isPropertySignature, "PropertySignature"],
  [ts.isIndexSignatureDeclaration, "IndexSignatureDeclaration"],
  [ts.isTypeAliasDeclaration, "TypeAliasDeclaration"],
  [ts.isModuleDeclaration, "ModuleDeclaration"],
  [ts.isExportDeclaration, "ExportDeclaration"],
  [ts.isExportAssignment, "ExportAssignment"],
  [ts.isCallSignatureDeclaration, "CallSignatureDeclaration"],
  [ts.isConstructSignatureDeclaration, "ConstructSignatureDeclaration"],
  [ts.isNonNullExpression, "NonNullExpression"],
  [
    (n) =>
      ts.isBinaryExpression(n) &&
      // 这些运算符**另有归属**，不算在 BinaryOperator 的账上（否则差额是假的）：
      //   `&&` / `||` → LogicalOperator；`=` 与 `+=` 这类 → 赋值（本工程不做赋值节点）
      [
        ts.SyntaxKind.AmpersandAmpersandToken,
        ts.SyntaxKind.BarBarToken,
        ts.SyntaxKind.EqualsToken,
        ts.SyntaxKind.PlusEqualsToken,
        ts.SyntaxKind.MinusEqualsToken,
        ts.SyntaxKind.AsteriskEqualsToken,
        ts.SyntaxKind.SlashEqualsToken,
        ts.SyntaxKind.PercentEqualsToken,
        ts.SyntaxKind.AsteriskAsteriskEqualsToken,
        ts.SyntaxKind.LessThanLessThanEqualsToken,
        ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
        ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
        ts.SyntaxKind.AmpersandEqualsToken,
        ts.SyntaxKind.BarEqualsToken,
        ts.SyntaxKind.CaretEqualsToken,
        // `<` / `>` **刻意不收**：它们与泛型实参同形（`A<B>` 与 `a < b`），
        // `GenericTypeBranch` 在词法阶段就要靠它们配对，语法层再动会互相打坏。
        // 把它们留在账上会报出一个永远修不掉的假差额，所以从源码侧也剔掉。
        ts.SyntaxKind.LessThanToken,
        ts.SyntaxKind.GreaterThanToken,
      ].includes(n.operatorToken.kind) === false,
    "BinaryExpression",
  ],
  [ts.isPrefixUnaryExpression, "PrefixUnaryExpression"],
  [ts.isPostfixUnaryExpression, "PostfixUnaryExpression"],
  [ts.isSpreadElement, "SpreadElement"],
  [ts.isSpreadAssignment, "SpreadAssignment"],
];

function kindOf(node) {
  for (const [test, name] of KIND_OF) {
    if (name === "ModuleDeclaration" && ts.isModuleDeclaration(node)) {
      // 字符串名字的 `declare module "x" {}` 体走 ObjectLiteral 那条路，没有 Namespace 节点；
      // 标识符名字的 namespace / module 与 declare global 才应该有。
      return node.name.kind === ts.SyntaxKind.StringLiteral ? "ModuleDeclarationString" : "ModuleDeclaration";
    }
    if (test(node)) return name;
  }
  return null;
}

function countTag(xml, tag) {
  return (xml.match(new RegExp("<" + tag + "(?=[ />])", "g")) || []).length;
}

function walk(dir, out) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mts|cts)$/.test(p) && !p.endsWith(".d.ts.map")) out.push(p);
  }
  return out;
}

function corpusFiles(mode) {
  const files = [];
  if (mode !== "cases") {
    files.push(...walk(path.join(root, "node_modules", "@types"), []));
    files.push(...walk(path.join(root, "node_modules", "typescript", "lib"), []));
    files.push(...walk(path.join(root, "node_modules", "undici-types"), []));
    files.push(...walk(path.join(root, "dist", "ts"), []));
    files.push(...walk(path.join(root, "samples"), []));
  }
  if (mode !== "real") {
    for (const c of listCases()) files.push(c.file);
  }
  return [...new Set(files)];
}

/**
 * 自动归因：这个声明「本该产出节点却没产出」是卡在哪一层。
 *
 * 返回「最近的容器 + 外层遮蔽」：
 *   `interface 体` / `类体` / `类型字面量体` / `对象字面量` —— 成员类构造落在哪种容器里；
 *   外层若先经过 namespace / declare global 体，会追加「（外层 … 体内）」，
 *   因为那一层的声明根本不成形，成员是被它连累的，不是成员规则自己的问题。
 */
function contextOf(node, parents) {
  let p = parents.get(node);
  let shadow = "";
  while (p) {
    if (ts.isInterfaceDeclaration(p)) return "interface 体" + shadow;
    if (ts.isTypeLiteralNode(p)) return "类型字面量体" + shadow;
    if (ts.isClassDeclaration(p) || ts.isClassExpression(p)) return "类体" + shadow;
    if (ts.isObjectLiteralExpression(p)) return "对象字面量" + shadow;
    if (ts.isModuleDeclaration(p)) {
      if (p.name.kind === ts.SyntaxKind.StringLiteral) {
        if (shadow === "") shadow = "（外层 declare module 体内）";
      } else {
        shadow = "（外层 namespace / declare global 体内）";
      }
    }
    p = parents.get(p);
  }
  return (shadow ? "namespace / declare global 体内" : "顶层或其它位置");
}

function main() {
  const args = process.argv.slice(2);
  const mode = args.find((a) => ["real", "cases", "all"].includes(a)) || "all";
  const topIndex = args.indexOf("--top");
  const top = topIndex >= 0 ? Number(args[topIndex + 1]) : 5;
  const jsonIndex = args.indexOf("--json");
  const jsonPath = jsonIndex >= 0 ? args[jsonIndex + 1] : null;

  const files = corpusFiles(mode);
  const totals = {};      // kind -> { src }
  const nodeTotals = {};  // tag  -> 产物节点数（每个文件只数一次，避免共享标签被重复计入）
  const allTags = [...new Set(Object.values(MAP).filter((t) => t !== null))];
  const mismatches = [];  // { kind, tag, file, line, ctx, text }
  const noTag = {};       // kind -> count
  let parseFailures = 0;

  for (const file of files) {
    let source = fs.readFileSync(file, "utf8");
    if (source.charCodeAt(0) === 0xfeff) source = source.substring(1);
    let xml;
    try {
      const template = new Template();
      const document = new TextDocument(source);
      document.FilePath = file;
      const context = new TextContext(template);
      context.Process(document);
      xml = context.Root.ToString();
    } catch {
      parseFailures++;
      continue;
    }
    const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
    const parents = new Map();
    (function link(node) {
      ts.forEachChild(node, (child) => { parents.set(child, node); link(child); });
    })(sf);

    // 产物侧统计：每个文件把每个标签只数一次
    for (const tag of allTags) nodeTotals[tag] = (nodeTotals[tag] || 0) + countTag(xml, tag);

    // 源码侧统计
    const srcCounts = {};
    const perFile = [];   // 本文件里每个「有标签映射」的可数构造，最后按差额取用
    (function visit(node) {
      const k = kindOf(node);
      if (k) {
        // 多声明符的 var 语句只算一次：只有「列表里唯一一个声明符」才与一个 Let 节点对应
        // catch 子句的绑定也是 VariableDeclaration，但它对应 CatchDefine，不算进来
        let countable = true;
        if (k === "VariableDeclaration") {
          const list = parents.get(node);
          if (!list || !ts.isVariableDeclarationList(list) || list.declarations.length !== 1) countable = false;
        }
        // 负数 / 正数字面量**类型**（`-1 | 0 | 1`）：TypeScript 的 AST 把它记成
        // 字面量类型里的 PrefixUnaryExpression，而本工程按类型收（进 TypeDefine / TypeAssign）。
        // 这不是缺节点，属于两边口径不同，所以从源码侧剔掉。
        if (k === "PrefixUnaryExpression") {
          const holder = parents.get(node);
          if (holder && ts.isLiteralTypeNode(holder)) countable = false;
        }
        if (countable) {
          srcCounts[k] = (srcCounts[k] || 0) + 1;
          if (MAP[k] === null) {
            noTag[k] = (noTag[k] || 0) + 1;
          } else {
            perFile.push({
              kind: k, tag: MAP[k], file: path.relative(root, file),
              line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
              ctx: contextOf(node, parents),
              text: node.getText(sf).split("\n")[0].slice(0, 100),
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    })(sf);

    for (const [k, n] of Object.entries(srcCounts)) {
      totals[k] = totals[k] || { src: 0 };
      totals[k].src += n;
    }

    // 只有「本文件里该标签的源码构造数 > 产物节点数」才算这些构造没成节点。
    // 多个 TS 构造共享一个标签时（如 Field 同时来自属性签名与方法签名），
    // 按 kind 轮流取样本——否则样本会全落在文档顺序靠前的那个 kind 上，把「方法签名没成节点」
    // 误报成「属性签名没成节点」。
    const fileTagSrc = {};
    for (const [k, n] of Object.entries(srcCounts)) {
      if (MAP[k] !== null) fileTagSrc[MAP[k]] = (fileTagSrc[MAP[k]] || 0) + n;
    }
    for (const [tag, srcN] of Object.entries(fileTagSrc)) {
      const deficit = srcN - countTag(xml, tag);
      if (deficit <= 0) continue;
      const byKind = new Map();
      for (const item of perFile) {
        if (item.tag !== tag) continue;
        if (!byKind.has(item.kind)) byKind.set(item.kind, []);
        byKind.get(item.kind).push(item);
      }
      const queues = [...byKind.values()];
      let taken = 0;
      let progress = true;
      while (taken < deficit && progress) {
        progress = false;
        for (const queue of queues) {
          if (queue.length === 0 || taken >= deficit) continue;
          if (mismatches.length < 20000) mismatches.push(queue.shift());
          taken++;
          progress = true;
        }
      }
    }
  }

  // 报告：按「标签」聚合（多个 TS 构造共享一个标签，必须合起来才能比）
  console.log(`语料 ${files.length} 个文件（解析失败 ${parseFailures} 个），按「源码构造数 → 产物节点数」比对：\n`);
  const tagSrc = {};   // tag -> { total, kinds: { kind: n } }
  for (const [k, v] of Object.entries(totals)) {
    const tag = MAP[k];
    if (tag === null) continue;
    tagSrc[tag] = tagSrc[tag] || { total: 0, kinds: {} };
    tagSrc[tag].total += v.src;
    tagSrc[tag].kinds[k] = (tagSrc[tag].kinds[k] || 0) + v.src;
  }
  const tagNode = nodeTotals;
  console.log("标签".padEnd(20) + "源码构造".padStart(10) + "产物节点".padStart(10) + "差额".padStart(8) + "   构造明细");
  const tagRows = Object.entries(tagSrc).sort((a, b) => (b[1].total - (tagNode[b[0]] || 0)) - (a[1].total - (tagNode[a[0]] || 0)));
  for (const [tag, v] of tagRows) {
    const node = tagNode[tag] || 0;
    const detail = Object.entries(v.kinds).map(([k, n]) => `${k}=${n}`).join(" ");
    console.log(tag.padEnd(18) + String(v.total).padStart(10) + String(node).padStart(10) + String(v.total - node).padStart(8) + "   " + detail);
  }

  const noTagRows = Object.entries(noTag).sort((a, b) => b[1] - a[1]);
  if (noTagRows.length) {
    console.log("\n标签表里根本没有对应节点的构造（结构性缺口）：");
    for (const [k, n] of noTagRows) console.log(`  ${String(n).padStart(6)}  ${k}`);
  }

  // 归因：把 mismatch 按 (kind, ctx) 聚合，并给样本
  const byKind = {};
  for (const m of mismatches) {
    const key = m.kind + " @ " + m.ctx;
    byKind[key] = byKind[key] || { kind: m.kind, ctx: m.ctx, count: 0, samples: [] };
    byKind[key].count++;
    if (byKind[key].samples.length < top) byKind[key].samples.push(`${m.file}:${m.line}  ${m.text}`);
  }
  const interesting = Object.values(byKind).sort((a, b) => b.count - a.count);
  console.log("\n未产出节点的构造（按上下文归因，样本各取前 " + top + " 条）：");
  for (const g of interesting) {
    console.log(`\n[${g.kind}] ${g.ctx}  （${g.count} 处）`);
    for (const s of g.samples) console.log("    " + s);
  }

  if (jsonPath) {
    fs.writeFileSync(jsonPath, JSON.stringify({ totals, noTag, mismatches, parseFailures, files: files.length }, null, 1), "utf8");
    console.log(`\n完整结果 → ${jsonPath}`);
  }
}

main();
