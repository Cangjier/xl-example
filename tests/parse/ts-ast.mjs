// TS AST 对拍尺子：**直接拿 ts.createSourceFile 的 AST 当基准**。
//
//   node tests/parse/ts-ast.mjs              真实语料 + 用例语料
//   node tests/parse/ts-ast.mjs cases        只跑用例
//   node tests/parse/ts-ast.mjs real         只跑真实语料
//   node tests/parse/ts-ast.mjs --top 20
//   node tests/parse/ts-ast.mjs --samples 5  每类最多列 5 条样本
//
// 它问的是**一个问题**：「这份产物离『和 TypeScript 的 AST 一模一样』还差多少」。
// 与 `cases:diff` / `cases:align` 的区别在**比对面**：
//
//   cases:diff    比**个数**（源码里有几个这种构造 ↔ 产物里有几个对应标签）
//   cases:align   比**位置**（按源码区间对齐，双向反查标签占用 / 缺节点）
//   这一把        比**形状**：产物节点与 TS 语义节点逐个对（kind / start / end / 属性名）
//
// TS 侧的「语义节点」取 `ts.forEachChild` 那一层——不含修饰符、标点、参数括号，
// 这是「直接 diff」最自然的一层，也是各种 AST 查看器展示的那一层。
// 产物侧用 `Root.ToList()`（带真实坐标，见 `docs/ast-json.md`）：坐标是这一把尺子的地基，
// 没有坐标就只能靠文本猜位置，那种对齐一遇到壳节点就断。
//
// 当前状态（第 70 轮第一次跑）：**这一把是红的**，差距量化在下面的「缺口按 kind 聚合」里。
// 它红的不是解析出错，而是「产物的节点集合与 TS 不是同一套」——那正是要重构 token 层的部分。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { listCases } from "./validate.mjs";
import { parseXml } from "./structure.mjs";
import { projectRoot } from "./ts-shape.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const ts = require(path.join(root, "node_modules", "typescript"));
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));

const SK = ts.SyntaxKind;
const kindName = (kind) => (typeof kind === "string" ? kind : (SK[kind] ?? String(kind)));

/** 透明单元：投影时它们不是 TS 节点。 */
const MODIFIERS = new Set(["LineWrap", "AreaAnnotation", "LineAnnotation", "PreprocessorDirectives"]);

/**
 * 标签 / kind 的**归一名**：把两边都折算成同一个名字，再比。
 *
 * 为什么必须有这一层：本工程的标签本来就不是 TS 的 `SyntaxKind` 名，
 * 直接比字符串会把两类东西混在一起——
 *
 *   假阴性：`<Keyword>string</Keyword>` 与 TS 的 `StringKeyword` 区间一模一样，
 *           但名字不同，按字符串比就成了「缺节点」；
 *   假阳性：`<Keyword>const</Keyword>` 与 TS 的 `ConstKeyword` 都叫不到一块去，
 *           可它们本来就是同一个东西。
 *
 * 所以先各自归一，再比。**归一表是「两边的契约」**：它写错一处，这一把尺子立刻偏，
 * 所以表里每个条目都要能指到「谁跟谁是同一个东西」。
 *
 * TS 那一侧先过 `canonicalKind`：`ts.SyntaxKind[node.kind]` 会印出 `FirstStatement`
 * （其实是 `VariableStatement`）、`FirstLiteralToken`（`NumericLiteral`）这类**别名错名**，
 * 不换成真名就没法与产物侧对齐（详见 README 的「枚举别名」一节）。
 */
const TS_KIND_ALIASES = new Map([
  ["FirstStatement", "VariableStatement"],
  ["FirstLiteralToken", "NumericLiteral"],
  ["FirstCompoundAssignment", "PlusEqualsToken"],
  ["FirstBinaryOperator", "LessThanToken"],
  ["FirstNode", "QualifiedName"],
  ["FirstTypeNode", "TypePredicate"],
  ["LastTypeNode", "ImportType"],
  ["ThisType", "ThisKeyword"],
]);

/** 按文本判断一个叶子该归 TS 的哪一类——**这就是「叶子按值分名」**。 */
function leafKindOfText(text) {
  if (/^(0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(\d[\d_]*)?\.?\d[\d_]*([eE][+-]?\d+)?)n?$/.test(text)) return "NumericLiteral";
  if (/^["'`]/.test(text)) return "StringLiteral";
  if (text === "true" || text === "false") return "TrueKeyword";
  if (text === "null") return "NullKeyword";
  if (text === "undefined") return "UndefinedKeyword";
  return "Identifier";
}

/** 产物标签 → 归一后的名字。`null` 表示「这个标签在 TS 那边不该有独立节点」。 */
const PRODUCT_KIND = new Map([
  ["Root", "SourceFile"],
  ["Let", "VariableDeclaration"],
  ["ConstString", "StringLiteral"],
  ["Identifier", null], // 按文本再分（见 `productKindOf`）
  ["Keyword", null], // 按文本再分
  ["SymbolToken", null], // 标点：TS 那边多数不作为语义子节点
  ["LineWrap", null],
  ["AreaAnnotation", null],
  ["LineAnnotation", null],
  ["PreprocessorDirectives", null],
]);

/** 关键字文本 → TS 的 kind 名（只列会作为**语义子节点**出现的那些）。 */
const KEYWORD_KIND = new Map([
  ["string", "StringKeyword"],
  ["number", "NumberKeyword"],
  ["boolean", "BooleanKeyword"],
  ["void", "VoidKeyword"],
  ["any", "AnyKeyword"],
  ["unknown", "UnknownKeyword"],
  ["never", "NeverKeyword"],
  ["object", "ObjectKeyword"],
  ["symbol", "SymbolKeyword"],
  ["bigint", "BigIntKeyword"],
  ["undefined", "UndefinedKeyword"],
  ["null", "NullKeyword"],
  ["true", "TrueKeyword"],
  ["false", "FalseKeyword"],
  ["readonly", "ReadonlyKeyword"],
  ["typeof", "TypeOfKeyword"],
  ["keyof", "KeyOfKeyword"],
  ["unique", "UniqueKeyword"],
  ["infer", "InferKeyword"],
  ["extends", "ExtendsKeyword"],
  ["this", "ThisKeyword"],
  ["abstract", "AbstractKeyword"],
  ["declare", "DeclareKeyword"],
  ["export", "ExportKeyword"],
  ["import", "ImportKeyword"],
  ["new", "NewKeyword"],
  ["async", "AsyncKeyword"],
  ["await", "AwaitKeyword"],
  ["static", "StaticKeyword"],
  ["public", "PublicKeyword"],
  ["private", "PrivateKeyword"],
  ["protected", "ProtectedKeyword"],
  ["override", "OverrideKeyword"],
  ["get", "GetKeyword"],
  ["set", "SetKeyword"],
  ["default", "DefaultKeyword"],
  ["as", "AsKeyword"],
  ["satisfies", "SatisfiesKeyword"],
]);

/** 产物节点（标签 + 文本）→ 归一后的名字。 */
function productKindOf(type, text) {
  if (type === "Identifier") return leafKindOfText(text);
  if (type === "Keyword") return KEYWORD_KIND.get(text) ?? "Identifier";
  if (type === "SymbolToken") return null;
  if (PRODUCT_KIND.has(type)) return PRODUCT_KIND.get(type);
  return type;
}

/** TS 的 kind → 归一后的名字。 */
function tsKindOf(kindName) {
  return TS_KIND_ALIASES.get(kindName) ?? kindName;
}

/**
 * 产物侧：节点表 + 坐标完整性统计。
 *
 * **按实例去重**：同一棵产物树里，一个子单元可能被挂到**两个位置**（实测
 * `type-object-nested.ts` 的 `LineAnnotation` 同时出现在 `Statement.children` 的两格、
 * `Field` 也出现在 `TypeLiteralBody` 的两格）。那是不是 bug 另说，**计数上必须去重**：
 * 不去重的话同一个节点的坐标会被数两遍，百分比与缺口都会被撑大（实测能撑到 17 倍）。
 *
 * 坐标（`range`）是这一把尺子的**地基**：TS 的每个节点都带 `pos` / `end`，
 * 没有坐标就只能靠原文搜索猜位置（试过，一遇到壳节点就断）。所以这里顺带量两件事：
 *
 *   缺坐标   —— 节点上没有 `range`
 *   越界     —— 子节点的区间超出了父节点的区间
 *
 * 这两条不是「解析对不对」，而是「投影能不能落地」，所以与 kind/区间缺口并列报出来。
 */
function flattenProduct(exported, stats, source) {
  const out = [];
  const visited = new Set();
  const visit = (node, parentIndex, depth, parentRange) => {
    if (visited.has(node)) {
      stats.repeatVisits++;
      return;
    }
    visited.add(node);
    const index = out.length;
    const range = node.get("range");
    const start = range === undefined ? null : range[0];
    const end = range === undefined ? null : range[1] + 1;
    const type = node.get("type");
    const value = node.get("value");
    stats.total++;
    if (range === undefined) {
      stats.missingRange++;
      const key = `缺坐标: ${type}`;
      stats.missingByType.set(key, (stats.missingByType.get(key) || 0) + 1);
    } else if (parentRange !== null && (start < parentRange[0] || end > parentRange[1])) {
      stats.outOfRange++;
      const key = `越界: <${type}>`;
      stats.outOfRangeByType.set(key, (stats.outOfRangeByType.get(key) || 0) + 1);
    }
    // 归一用的文本：叶子用 `value`，容器用区间里的原文（关键字那种「文本在区间里」的情况）。
    let text = typeof value === "string" ? value : "";
    if (text === "" && start !== null && source !== undefined && type === "Keyword") {
      text = source.slice(start, end);
    }
    out.push({ index, parent: parentIndex, depth, type, kind: productKindOf(type, text), start, end });
    const nextRange = range === undefined ? parentRange : [start, end];
    for (const [key, val] of node.entries()) {
      if (key === "type" || key === "range" || key === "value") continue;
      // 段：值是一批节点，段元素本身不是节点
      if (SEGMENT_KEY_NAMES.has(key) && Array.isArray(val)) {
        for (const child of val) {
          if (child !== null && typeof child === "object" && child instanceof Map) visit(child, index, depth + 1, nextRange);
        }
      }
    }
    const children = node.get("children");
    if (Array.isArray(children)) {
      for (const child of children) {
        if (child !== null && typeof child === "object" && child instanceof Map) visit(child, index, depth + 1, nextRange);
      }
    }
  };
  for (const node of exported) visit(node, -1, 0, null);
  return out;
}

/**
 * 段名集合：与 `tests/parse/ast-json.mjs` 的 `SEGMENTS` 同源（那边是「XML 元素名 → 段名」，
 * 这里要的是段名本身）。两处必须一起改——**段名是投影规则的一部分**，不是实现细节。
 */
const SEGMENT_KEY_NAMES = new Set([
  "compare",
  "body",
  "initial",
  "next",
  "define",
  "enumable",
  "condition",
  "statement",
  "catches",
  "finally",
  "trueStatement",
  "falseStatement",
  "parameters",
  "returnType",
  "name",
  "arguments",
  "segments",
]);

/** TS 侧：语义节点（`forEachChild` 那一层）→ 同形扁平表，`kind` 已归一。 */
function flattenTs(sf) {
  const out = [];
  const visit = (node, parentIndex, depth) => {
    const index = out.length;
    const rawName = kindName(node.kind);
    out.push({
      index,
      parent: parentIndex,
      depth,
      kindNumber: node.kind,
      kindName: rawName,
      kind: tsKindOf(rawName),
      start: node.getStart(sf),
      end: node.end,
      pos: node.pos,
      fields: childFieldsOf(node),
    });
    ts.forEachChild(node, (child) => visit(child, index, depth + 1));
  };
  visit(sf, -1, 0);
  return out;
}

/**
 * 一个 TS 节点的**有子节点的字段名**（`statements` / `declarationList` / `left`…）。
 *
 * 这是「字段名对齐」的判据：`cases:tsast` 原来只比 kind 与区间，
 * 于是「把 `children` 改叫 `statements`」这类改动**一个数字都不会动**——
 * 而目标里明确要求「字段名」也对齐，所以这一层必须量出来。
 */
function childFieldsOf(node) {
  const fields = [];
  ts.forEachChild(node, (child, key) => {
    const name = key ?? Object.keys(node).find((k) => {
      const value = node[k];
      return value === child || (Array.isArray(value) && value.includes(child));
    });
    if (name !== undefined && !fields.includes(name)) fields.push(name);
  });
  return fields.sort();
}

/** 投影侧的字段名：从 `{ kind, pos, end, 字段… }` 里取「值里含节点」的那些键。 */
function projectedChildFields(node) {
  const fields = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === "kind" || key === "pos" || key === "end" || key === "text") continue;
    if (Array.isArray(value)) {
      if (value.some((x) => x !== null && typeof x === "object" && "kind" in x)) fields.push(key);
      continue;
    }
    if (value !== null && typeof value === "object" && "kind" in value) fields.push(key);
  }
  return fields.sort();
}

/**
 * 投影结果（`ts-shape.mjs` 的产物）→ 同一套扁平表。
 *
 * 一趟递归同时取出三样东西：kind、区间、**有子节点的字段名**。
 * 字段名必须在这一层取——`asXml` 那条路会把非属性键压掉，
 * 而「字段名对齐」正是目标的一部分（实测漏掉它时，把 `children` 改叫 `statements`
 * 这类改动一个数字都不会动）。
 */
function flattenProjected(ast) {
  const out = [];
  const childFields = (node) => {
    const fields = [];
    for (const [key, value] of Object.entries(node)) {
      if (key === "kind" || key === "pos" || key === "end" || key === "text") continue;
      if (Array.isArray(value)) {
        if (value.some((x) => x !== null && typeof x === "object" && "kind" in x)) fields.push(key);
        continue;
      }
      if (value !== null && typeof value === "object" && "kind" in value) fields.push(key);
    }
    return fields.sort();
  };
  const visit = (node, parentIndex, depth) => {
    if (node === null || typeof node !== "object" || !("kind" in node)) return;
    const index = out.length;
    out.push({
      index,
      parent: parentIndex,
      depth,
      kindNumber: ts.SyntaxKind[node.kind],
      kindName: node.kind,
      kind: tsKindOf(node.kind),
      start: node.pos ?? 0,
      end: node.end ?? node.pos ?? 0,
      fields: childFields(node),
    });
    for (const [key, value] of Object.entries(node)) {
      if (key === "kind" || key === "pos" || key === "end" || key === "text") continue;
      if (Array.isArray(value)) {
        for (const child of value) if (child && typeof child === "object" && "kind" in child) visit(child, index, depth + 1);
        continue;
      }
      if (value !== null && typeof value === "object" && "kind" in value) visit(value, index, depth + 1);
    }
  };
  visit(ast, -1, 0);
  return out;
}

/** 一行对比：产物节点与 TS 节点是否「同 kind 同区间」。 */
function compare(ours, theirs) {
  const kindOfOurs = ours.type;
  const kindOfTheirs = theirs.kindName;
  return {
    kindSame: kindOfOurs === kindOfTheirs,
    startSame: ours.start === theirs.start,
    endSame: ours.end === theirs.end,
  };
}

function walk(dir, out) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|mts|cts)$/.test(p)) out.push(p);
  }
  return out;
}

function corpus(mode) {
  const files = [];
  if (mode !== "cases") {
    files.push(...walk(path.join(root, "node_modules", "@types"), []));
    files.push(...walk(path.join(root, "node_modules", "typescript", "lib"), []));
    files.push(...walk(path.join(root, "node_modules", "undici-types"), []));
    files.push(...walk(path.join(root, "dist", "ts"), []));
    files.push(...walk(path.join(root, "samples"), []));
  }
  if (mode !== "real") {
    for (const c of listCases()) {
      if (c.directives.tsInvalid) continue;
      if (c.file.endsWith(".tsx")) continue;
      files.push(c.file);
    }
  }
  return [...new Set(files)];
}

function parseWith(source, file) {
  const document = new TextDocument(source);
  document.FilePath = file;
  const context = new TextContext(new Template());
  context.Process(document);
  return context.Root;
}

function main() {
  const args = process.argv.slice(2);
  const mode = args.find((a) => ["real", "cases", "all"].includes(a)) || "all";
  const top = args.includes("--top") ? Number(args[args.indexOf("--top") + 1]) : 20;
  const sampleLimit = args.includes("--samples") ? Number(args[args.indexOf("--samples") + 1]) : 3;

  const files = corpus(mode);
  const missing = new Map();      // TS 有、产物没有（按 TS kind 聚合）
  const extra = new Map();        // 产物有、TS 没有（按产物标签聚合）
  const drift = new Map();        // 同 kind 但区间不同
  const samples = new Map();
  const stats = {
    total: 0,
    repeatVisits: 0,
    missingRange: 0,
    outOfRange: 0,
    missingByType: new Map(),
    outOfRangeByType: new Map(),
  };
  let parsed = 0;
  let failed = 0;
  let alignedFiles = 0;
  let ourTotal = 0;
  let tsTotal = 0;
  let kindSameTotal = 0;
  let projectedTotal = 0;
  let projectedSame = 0;
  let projectedFieldsSame = 0;
  const projectedMissing = new Map();
  const fieldDiffs = new Map();
  const unmappedTags = new Map();

  for (const file of files) {
    let source = fs.readFileSync(file, "utf8");
    if (source.charCodeAt(0) === 0xfeff) source = source.substring(1);
    let rootNode;
    try {
      rootNode = parseWith(source, file);
    } catch {
      failed++;
      continue;
    }
    parsed++;
    const ours = flattenProduct(rootNode.ToList(), stats, source);
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const theirs = flattenTs(sf);
    ourTotal += ours.length;
    tsTotal += theirs.length;

    // 以「TS 的语义节点」为基准，逐个在产物侧找**同 kind（归一后）同区间**的节点：
    // 找不到 → 缺节点（这是要重构 token 层去补的）；找得到但区间不同 → 位置漂移。
    const ourByKind = new Map();
    for (const node of ours) {
      if (!ourByKind.has(node.kind)) ourByKind.set(node.kind, []);
      ourByKind.get(node.kind).push(node);
    }
    for (const their of theirs) {
      const candidates = ourByKind.get(their.kind) || [];
      const hit = candidates.find((o) => o.start === their.start && o.end === their.end);
      if (hit) {
        kindSameTotal++;
        continue;
      }
      const near = candidates.find((o) => Math.abs((o.start ?? -1) - their.start) <= 2);
      if (near) {
        const key = `DRIFT: ${their.kind}`;
        drift.set(key, (drift.get(key) || 0) + 1);
        if ((samples.get(key) || []).length < sampleLimit) {
          samples.set(key, (samples.get(key) || []).concat(`${path.relative(root, file)}:${their.start} 产物[${near.start},${near.end}) vs TS[${their.start},${their.end})`));
        }
        continue;
      }
      const key = their.kind;
      missing.set(key, (missing.get(key) || 0) + 1);
      if ((samples.get(key) || []).length < sampleLimit) {
        samples.set(key, (samples.get(key) || []).concat(`${path.relative(root, file)}:${their.start}  «${source.slice(their.start, their.start + 40).split("\n")[0]}»`));
      }
    }
    // 产物侧多出来的：按标签聚合（同区间但 TS 那边没有对应节点）。
    // 归一后为 `null` 的（标点、注释、软换行…）不计——它们在 TS 的语义子节点里本来就不出现。
    const tsKeys = new Set(theirs.map((t) => `${t.kind}@${t.start}-${t.end}`));
    for (const node of ours) {
      if (node.kind === null) continue;
      if (tsKeys.has(`${node.kind}@${node.start}-${node.end}`)) continue;
      const key = node.type;
      extra.set(key, (extra.get(key) || 0) + 1);
    }
    if (theirs.length === ours.length && theirs.every((t, i) => t.kind === ours[i]?.kind)) alignedFiles++;

    // ---- 投影后的对拍：把产物树投成 TS 形状，再与 `ts.createSourceFile` 比 ----
    const projected = projectRoot(rootNode.ToList(), source);
    for (const tag of projected.unmapped) unmappedTags.set(tag, (unmappedTags.get(tag) || 0) + 1);
    const proj = flattenProjected(projected.ast);
    projectedTotal += proj.length;
    // **字段名对拍**：kind 与区间都对上的那些节点，两边的「有子节点的字段名」也该一致。
    const projKeys = new Set(proj.map((p) => `${p.kind}@${p.start}-${p.end}`));
    const projFields = new Map();
    for (const p of proj) {
      projFields.set(`${p.kind}@${p.start}-${p.end}`, p.fields ?? []);
    }
    for (const their of theirs) {
      const key = `${their.kind}@${their.start}-${their.end}`;
      if (!projKeys.has(key)) {
        projectedMissing.set(their.kind, (projectedMissing.get(their.kind) || 0) + 1);
        continue;
      }
      projectedSame++;
      const oursFields = projFields.get(key) ?? [];
      const theirFields = their.fields ?? [];
      const same =
        oursFields.length === theirFields.length && oursFields.every((f, i) => f === theirFields[i]);
      if (same) {
        projectedFieldsSame++;
      } else {
        const diffKey = `${their.kind}: 产物[${oursFields.join(",")}] vs TS[${theirFields.join(",")}]`;
        fieldDiffs.set(diffKey, (fieldDiffs.get(diffKey) || 0) + 1);
      }
    }
  }

  console.log(
    `TS AST 对拍尺子：语料 ${files.length} 个文件，解析成功 ${parsed}，抛异常 ${failed}\n` +
      `                产物节点 ${ourTotal} 个，TS 语义节点 ${tsTotal} 个，` +
      `同 kind 同区间 ${kindSameTotal} 个（${((100 * kindSameTotal) / Math.max(1, tsTotal)).toFixed(1)}%），逐位置完全一致的文件 ${alignedFiles} 个\n`,
  );

  console.log("TS 有、产物没有（按 TS kind 聚合，前 " + top + " 类）：");
  for (const [k, n] of [...missing.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)) {
    console.log(`  ${String(n).padStart(7)}  ${k}`);
    for (const s of samples.get(k) || []) console.log(`             ${s}`);
  }

  console.log("\n同 kind 但区间漂移：");
  if (drift.size === 0) console.log("  （无）");
  for (const [k, n] of [...drift.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${String(n).padStart(7)}  ${k}`);
    for (const s of samples.get(k) || []) console.log(`             ${s}`);
  }

  console.log("\n产物有、TS 没有（按产物标签聚合，前 " + top + " 类）：");
  for (const [k, n] of [...extra.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)) {
    console.log(`  ${String(n).padStart(7)}  <${k}>`);
  }

  console.log("\n投影后的 AST 对拍（`ts-shape.mjs` 的成绩）：");
  console.log(
    `  投影节点 ${projectedTotal} 个，与 TS 同 kind 同区间 ${projectedSame} 个` +
      `（${((100 * projectedSame) / Math.max(1, tsTotal)).toFixed(1)}% of TS 节点）；` +
      `其中**字段名也一致**的 ${projectedFieldsSame} 个` +
      `（占已对齐的 ${((100 * projectedFieldsSame) / Math.max(1, projectedSame)).toFixed(1)}%）`,
  );
  console.log("  字段名不一致的（前 10，产物 vs TS）：");
  if (fieldDiffs.size === 0) console.log("    （无）");
  for (const [k, n] of [...fieldDiffs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`    ${String(n).padStart(6)}  ${k}`);
  }
  console.log("  投影还没覆盖的产物标签（原样透传，不猜）：");
  if (unmappedTags.size === 0) console.log("    （无）");
  for (const [k, n] of [...unmappedTags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`    ${String(n).padStart(6)}  <${k}>`);
  }
  console.log("  投影后仍缺的 TS kind（前 12）：");
  for (const [k, n] of [...projectedMissing.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`    ${String(n).padStart(6)}  ${k}`);
  }

  console.log("\n坐标完整性（投影成 TS 形状的地基）：");  console.log(
    `  节点 ${stats.total} 个（**按实例去重**；重复访问 ${stats.repeatVisits} 次——同一子单元被挂在两个位置），\n` +
      `  **缺 range** ${stats.missingRange} 个，**区间越界** ${stats.outOfRange} 个`,
  );
  for (const [k, n] of [...stats.missingByType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`    ${String(n).padStart(6)}  ${k}`);
  }
  for (const [k, n] of [...stats.outOfRangeByType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`    ${String(n).padStart(6)}  ${k}`);
  }

  process.exitCode = missing.size === 0 && drift.size === 0 ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
