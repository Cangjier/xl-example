// TS AST 对拍尺子：**直接拿 ts.createSourceFile 的 AST 当基准**。
//
//   node tests/parse/ts-ast.mjs              真实语料 + 用例语料
//   node tests/parse/ts-ast.mjs cases        只跑用例
//   node tests/parse/ts-ast.mjs real         只跑真实语料
//   node tests/parse/ts-ast.mjs --top 20
//   node tests/parse/ts-ast.mjs --samples 5  每类最多列 5 条样本
//   node tests/parse/ts-ast.mjs --file <路径> [--list]        逐文件的四个方向
//   node tests/parse/ts-ast.mjs --snippets <文件.mjs|.json>   一个进程里把 N 条小片段逐条对拍
//                                             （普查缺口的第一站：`{ id, src }` 的数组，
//                                               TS 自己非法的片段跳过不算缺口）
//   node tests/parse/ts-ast.mjs --per-file                    只列不为零的文件
//   node tests/parse/ts-ast.mjs --cli         **发布路径**：真的开 `cjcli <文件> --ts-ast` 进程，
//                                             拿它 stdout 的 JSON 与 `ts.createSourceFile` 对拍
//                                             （按需跑：每一份语料一个 node 进程）
//
// 它问的是**一个问题**：「这份产物离『和 TypeScript 的 AST 一模一样』还差多少」。
//
// TS 侧的「语义节点」取 `ts.forEachChild` 那一层——不含修饰符、标点、参数括号，
// 这是「直接 diff」最自然的一层，也是各种 AST 查看器展示的那一层。
// 产物侧用 `Root.ToList()`（带真实坐标，见 `docs/ast-json.md`）：坐标是这一把尺子的地基，
// 没有坐标就只能靠文本猜位置，那种对齐一遇到壳节点就断。
//
// 当前状态（第 645 轮实测）：
//   **语料 1506 份，逐文件完全一致 1506 / 1506；四方向全 0**，
//   未映射 0 类 / 0 处、缺 range 0、区间越界 0（trivia 越界单列一行，见 `flattenProduct`）。
//   退出码按这**七条**算，任何一条不为零就是红的。
//
// 输出分四段，**「缺」与「漂移」是两件事**（第 34 轮分开报）：
//   缺     这一类在投影树里**根本没有**（要补映射）
//   漂移   同一类节点位置差一点（改区间就完事）——混在一起时漂移会把缺失挤下榜首
// 两段都带样本，样本按 `--samples` 限制条数。
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { listCases } from "./validate.mjs";
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
 * 不换成真名就没法与产物侧对齐（详见 docs/typescript-parsing-gaps.md 里「枚举别名」那几轮）。
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
  // 第 34 轮补的一批：`ts.SyntaxKind` 里**同一个枚举值印出的是别名**，
  // 漏一条就在缺口表里凭空多出一类（实测 `FirstAssignment` 796 处全是 `=`，
  // 而 `=` 在产物侧一直是 `EqualsToken`——那是**尺子的假缺口**，不是投影的）。
  ["FirstAssignment", "EqualsToken"],
  ["LastAssignment", "CaretEqualsToken"],
  ["LastCompoundAssignment", "CaretEqualsToken"],
  ["LastPunctuation", "CaretEqualsToken"],
  ["LastBinaryOperator", "CaretEqualsToken"],
  ["FirstPunctuation", "OpenBraceToken"],
  ["FirstTemplateToken", "NoSubstitutionTemplateLiteral"],
  ["LastLiteralToken", "NoSubstitutionTemplateLiteral"],
  ["LastTemplateToken", "TemplateTail"],
  ["FirstFutureReservedWord", "ImplementsKeyword"],
  ["FirstContextualKeyword", "AbstractKeyword"],
  ["LastContextualKeyword", "DeferKeyword"],
  ["LastStatement", "DebuggerStatement"],
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
  // `in` / `instanceof` / `asserts` 也是 `Keyword` 单元，也出现在 TS 的语义子节点里。
  ["in", "InKeyword"],
  ["instanceof", "InstanceOfKeyword"],
  ["asserts", "AssertsKeyword"],
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
      // **trivia 不参与这一条**（第 199 轮）：注释与软换行是**被扫进来的**，各 token 明确写着
      // 「留在段的 `Data` 里、不参与签入签出」（`ternary-operator.xl.md` 第 125 / 127 轮）——
      // 所以它们落在父区间之外是**约定的形态**，不是坐标错。
      // 剔掉它这一栏才有牙：真正会进投影的节点一旦越界，仍然是红的。
      if (MODIFIERS.has(type)) {
        stats.triviaOutOfRange++;
      } else {
        stats.outOfRange++;
        const key = `越界: <${type}>`;
        stats.outOfRangeByType.set(key, (stats.outOfRangeByType.get(key) || 0) + 1);
      }
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

// **命令行参数在模块级也留一份** ✓（第 321 轮 ✓）：`collectFiles()` 要用 `--shard` ✓，
// 而 `main()` 里那个 `args` 是它自己的局部量 ✗（第一版直接在 `collectFiles` 里用 `args` ✓，
// 运行期报 `args is not defined` ✓）。
const ARGS = process.argv.slice(2);

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
      // **已知缺口不进七项判据**（第 670 轮，见 `knownGapCheck`）：它们照样被对拍，
      // 但差额走另一条账 —— 否则门永远是红的，红里分不出「新坏了」与「本来就还没做」。
      if (c.directives.knownGap !== "") continue;
      files.push(c.file);
    }
  }
  const unique = [...new Set(files)];
  // **分片**（第 321 轮 ✓，用户口径：「其他门能不能类似优化」✓）。
  //
  // **为什么这一门需要另一条路** ✗：它**不起子进程** ✓——整份语料是**同一个进程**里
  // 一份一份解析 + 投影 + 对拍的 ✓（分片之前实测 47.7s ✓，是当时六道门里最慢的那一道 ✗）。
  // **花在哪** ✓（量过 ✓）：`typescript/lib` 110 份 **4.3 MB** ✓、
  // `@types` 72 份 **2.5 MB** ✓、`dist/ts` 178 份 **2.1 MB** ✓——
  // 而**用例**那一批只有 **189 KB** ✓（占量的零头 ✓）。所以瓶颈是那几份**大 `.d.ts`** ✓。
  //
  // **分片的判据按「字节」而不是「份数」** ✗：大文件一份顶几百份小文件 ✓——
  // 按份数分会出现「一个分片全是大文件」✓（那一趟就是全程的墙钟 ✗）。
  // 做法：按大小降序**轮转**分配 ✓（经典的 LPT 近似 ✓）。
  //
  // **正确性为什么不受影响** ✓：这一门的退出码是「缺 / 漂移 / 多出来 / 字段名 /
  // 未映射 / 缺 range / 越界 **七项全为 0**」✓——**每一片各自算这七项** ✓，
  // 「每片都 0」⟺「整体都 0」✓ ✓（不需要把计数合起来 ✓，那正是分片最容易出错的地方 ✓）。
  // **用模块级的 `ARGS`** ✗（`main()` 里那个 `args` 在 `collectFiles` 里看不见 ✓——
  // 第一版就是那么写的 ✓，运行期当场报 `args is not defined` ✓）。
  const shard = ARGS.includes("--shard") ? String(ARGS[ARGS.indexOf("--shard") + 1] || "") : "";
  if (shard !== "") {
    const parts = shard.split("/");
    const index = Number(parts[0]);
    const count = Number(parts[1]);
    if (!Number.isFinite(index) || !Number.isFinite(count) || count < 1 || index < 0 || index >= count) {
      throw new Error(`--shard 要写成 i/n（i 从 0 起、n ≥ 1），收到 "${shard}"`);
    }
    const sized = unique.map((file) => {
      let size = 0;
      try {
        size = fs.statSync(file).size;
      } catch {
        size = 0;
      }
      return { file, size };
    });
    sized.sort((a, b) => b.size - a.size);
    // **真正的 LPT（largest-first，放进当前最轻的那一片）**。
    //
    // 原先是 `at % count` 的**轮转**，注释里写着「经典的 LPT 近似」——它不是：
    // 轮转把第 1 大给片 0、第 2 大给片 1 …… 第 16 大给片 15，可**第 17 大又回到片 0**
    // （片 0 本来就是最重的那一片）。实测（16 片、1447 份）：
    // **片 0 单独跑就要 19.6s**，而片 1 只要 7.7s ⇒ 墙钟被片 0 钉死（28.9s）。
    // 贪心 LPT 每件都放进当前最轻的一片，代价是 n×count 次比较（1447×16 ≈ 2.3 万次，可忽略）。
    const bins = Array.from({ length: count }, () => ({ load: 0, files: [] }));
    for (const item of sized) {
      let least = 0;
      for (let at = 1; at < count; at++) {
        if (bins[at].load < bins[least].load) least = at;
      }
      bins[least].files.push(item.file);
      bins[least].load += item.size;
    }
    const kept = bins[index].files.slice();
    console.log(
      `（分片 ${index}/${count}：${kept.length} / ${sized.length} 份文件，${(bins[index].load / 1048576).toFixed(2)} MB）`,
    );
    return kept;
  }
  return unique;
}

function parseWith(source, file) {
  const document = new TextDocument(source);
  document.FilePath = file;
  const context = new TextContext(new Template());
  context.Process(document);
  return context.Root;
}

/**
 * 逐文件差分（`--file <路径>`）：把四个方向（缺 / 漂移 / 多出来 / 字段名）
 * 按**节点**列出来，每条带源码原文。总表只能告诉你「哪一类最多」，
 * 定位「这个文件为什么不过」要用这一把。
 *
 *   node tests/parse/ts-ast.mjs --file tests/parse/cases/statements/st-for-multi.ts
 *   node tests/parse/ts-ast.mjs --file <路径> --list      # 连对上的节点也列出来
 *   node tests/parse/ts-ast.mjs --file <路径> --limit 50  # 每个方向最多列几条
 */
function compareSource(source, file, options) {
  const { list, limit } = options;
  const stats = {
    total: 0,
    repeatVisits: 0,
    missingRange: 0,
    outOfRange: 0,
    triviaOutOfRange: 0,
    missingByType: new Map(),
    outOfRangeByType: new Map(),
  };
  const rootNode = parseWith(source, file);
  const ours = flattenProduct(rootNode.ToList(), stats, source);
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const theirs = flattenTs(sf);
  const projected = projectRoot(rootNode.ToList(), source);
  const proj = flattenProjected(projected.ast);

  const snippet = (start, end) =>
    JSON.stringify(source.slice(start, Math.min(end === undefined ? start + 40 : end, start + 60)).split("\n")[0]);
  const rel = path.relative(root, file);
  const projByKind = new Map();
  const projFields = new Map();
  for (const p of proj) {
    if (!projByKind.has(p.kind)) projByKind.set(p.kind, []);
    projByKind.get(p.kind).push(p);
    projFields.set(`${p.kind}@${p.start}-${p.end}`, p.fields ?? []);
  }
  const projKeys = new Set(proj.map((p) => `${p.kind}@${p.start}-${p.end}`));

  const lines = [];
  let missing = 0;
  let drift = 0;
  let extra = 0;
  let fieldDiff = 0;
  for (const their of theirs) {
    const key = `${their.kind}@${their.start}-${their.end}`;
    if (!projKeys.has(key)) {
      const near = (projByKind.get(their.kind) || []).find((p) => Math.abs((p.start ?? -1) - their.start) <= 2);
      if (near) {
        drift++;
        if (lines.filter((l) => l.startsWith("DRIFT")).length < limit)
          lines.push(`DRIFT  ${their.kind}  TS[${their.start},${their.end}) vs 产物[${near.start},${near.end})  ${snippet(their.start, their.end)}`);
      } else {
        missing++;
        if (lines.filter((l) => l.startsWith("MISS ")).length < limit)
          lines.push(`MISS   ${their.kind}  TS[${their.start},${their.end})  ${snippet(their.start, their.end)}`);
      }
      continue;
    }
    const oursFields = projFields.get(key) ?? [];
    const theirFields = their.fields ?? [];
    const same = oursFields.length === theirFields.length && oursFields.every((f, i) => f === theirFields[i]);
    if (!same) {
      fieldDiff++;
      if (lines.filter((l) => l.startsWith("FIELD")).length < limit)
        lines.push(`FIELD  ${their.kind}  [${their.start},${their.end})  产物[${oursFields.join(",")}] vs TS[${theirFields.join(",")}]  ${snippet(their.start, their.end)}`);
    } else if (list) {
      lines.push(`OK     ${their.kind}  TS[${their.start},${their.end})  ${snippet(their.start, their.end)}`);
    }
  }
  const theirKeys = new Set(theirs.map((t) => `${t.kind}@${t.start}-${t.end}`));
  for (const p of proj) {
    if (theirKeys.has(`${p.kind}@${p.start}-${p.end}`)) continue;
    extra++;
    if (lines.filter((l) => l.startsWith("EXTRA")).length < limit)
      lines.push(`EXTRA  ${p.kind}  [${p.start},${p.end})  ${snippet(p.start, p.end)}`);
  }
  // 未对上的产物原标签（定位「投影把谁投歪了」用）
  const ourByKind = new Map();
  for (const node of ours) {
    if (!ourByKind.has(node.type)) ourByKind.set(node.type, []);
    ourByKind.get(node.type).push(node);
  }
  return {
    rel,
    tsNodes: theirs.length,
    projNodes: proj.length,
    missing,
    drift,
    extra,
    fieldDiff,
    unmapped: projected.unmapped,
    lines,
    ourByKind,
    missingRange: stats.missingRange,
    outOfRange: stats.outOfRange,
  };
}

/**
 * `--file <路径>` 那一把的**打印面**：把 `compareSource` 的读数铺成四个方向。
 * 对拍本体在 `compareSource` 里 —— 片段探针与它共用同一条口径，不另起一份。
 */
function diffOneFile(file, options) {
  let source = fs.readFileSync(file, "utf8");
  if (source.charCodeAt(0) === 0xfeff) source = source.substring(1);
  const r = compareSource(source, file, options);
  console.log(`${r.rel}`);
  console.log(
    `  TS 节点 ${r.tsNodes}，投影节点 ${r.projNodes}；缺 ${r.missing}　漂移 ${r.drift}　多出来 ${r.extra}　字段名 ${r.fieldDiff}` +
      `${r.unmapped.length ? `；未映射标签 ${[...new Set(r.unmapped)].join(",")}` : ""}`,
  );
  for (const line of r.lines) console.log("  " + line);
  if (!r.lines.length) console.log("  （完全一致）");
}

/**
 * **已知缺口那一趟**（第 670 轮）：语料里带 `// xl:known-gap <根因>` 的那些用例，
 * 逐条对拍一次，**要求它真的还对不上**。
 *
 * 为什么要有这一趟：缺口原来只活在 `tmp/` 的探针池里、语料是干净的 ⇒ `npm run gates` 全绿，
 * 而「还差多少」与「昨天差多少」都得回去翻 `tmp/`（那是**一次普查的现场**，不是门）。
 * 现在缺口清单长在语料里（用例自己写着根因），这一趟就是它的判据：
 *
 * - **还对不上** ⇒ `KNOWN`，差额**不算进那七项**（门因此可以是绿的）；
 * - **已经对上了** ⇒ `收掉了`，**红**：该去把那行 `xl:known-gap` 删掉 ——
 *   缺口清单不许只增不减（与 `tests/coverage` 的台账同一条规矩：登记过的照样每次真跑，
 *   `NEWLY-PASSING` 提示删行）。
 *
 * 每一条都打印自己的四方向计数，所以「哪一族收了多少」在这一趟里一眼看得见。
 */
function knownGapCheck() {
  const cases = listCases().filter(
    (c) => c.directives.knownGap !== "" && !c.directives.tsInvalid && !c.file.endsWith(".tsx"),
  );
  if (cases.length === 0) {
    console.log("=== 已知缺口（`xl:known-gap`）===");
    console.log("  （语料里一条都没有——缺口清单是空的）");
    return true;
  }
  console.log(`=== 已知缺口（\`xl:known-gap\`）${cases.length} 条 ===`);
  let closed = 0;
  for (const c of cases) {
    let source = fs.readFileSync(c.file, "utf8");
    if (source.charCodeAt(0) === 0xfeff) source = source.substring(1);
    let row;
    try {
      row = compareSource(source, c.file, { list: false, limit: 0 });
    } catch (error) {
      closed++;
      console.log(`  CRASH  ${c.id}  ${String(error && error.Message ? error.Message : error).split("\n")[0]}`);
      continue;
    }
    if (row.missing + row.drift + row.extra + row.fieldDiff > 0) {
      console.log(
        `  KNOWN  ${c.id}  缺 ${row.missing}　漂 ${row.drift}　多 ${row.extra}　字段 ${row.fieldDiff}  ${c.directives.knownGap}`,
      );
    } else {
      closed++;
      console.log(`  收掉了  ${c.id}  —— 这条缺口已经对上，去删掉那行 \`// xl:known-gap\``);
    }
  }
  console.log("");
  console.log(`已知缺口：${cases.length - closed} 条还开着、${closed} 条已经收掉（收掉的要来删指令）`);
  return closed === 0;
}

/**
 * **片段探针**（`--snippets <文件.mjs|.json>`）：**一个进程**里把 N 条小片段逐条与 TS 对拍。
 *
 * 为什么单开一条路：`--file` 一份文件一个进程，量「一个构造 × 一种排版」这种一两行的小片段时，
 * 进程启动就是全部成本（几百条要按小时算）；小片段探针只解一次码、起一个进程——
 * 「搜缺口先写小片段探针」那条纪律（见 `docs/typescript-parsing-gaps.md`）要的就是这个速度。
 *
 * 片段文件导出 `{ id, src }` 的数组（`.mjs` 默认导出 `snippets`，或 `.json` 直接是数组）。
 * **TS 自己就报语法错的片段直接跳过**（无效 TS 不构成缺口），其余逐条报四个方向 + 未映射。
 */
async function snippetProbe(file, options) {
  const { limit, verbose } = options;
  const mod = file.endsWith(".json")
    ? { default: JSON.parse(fs.readFileSync(file, "utf8")) }
    : await import(pathToFileURL(file).href);
  const snippets = Array.isArray(mod) ? mod : (mod.default ?? mod.snippets);
  if (!Array.isArray(snippets)) throw new Error(`片段文件要导出 { id, src } 的数组：${file}`);
  let checked = 0;
  let bad = 0;
  let skipped = 0;
  for (const [index, item] of snippets.entries()) {
    const id = item.id ?? `snippet-${index + 1}`;
    const source = String(item.src ?? "");
    const sf = ts.createSourceFile(`${id}.ts`, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    if (sf.parseDiagnostics.length > 0) {
      skipped++;
      if (verbose) console.log(`SKIP   ${id}（TS 自己报 ${sf.parseDiagnostics.length} 条语法错）`);
      continue;
    }
    checked++;
    let r;
    try {
      r = compareSource(source, `${id}.ts`, { list: false, limit });
    } catch (error) {
      // **解析自己抛异常**也是缺口的一种（比「形状不对」更硬）：探针不能因此整条停摆，
      // 否则第一条崩掉的片段会把后面几百条的读数一起吞掉。
      bad++;
      console.log(`CRASH  ${id}  ${String(error && error.Message ? error.Message : error).split("\n")[0]}`);
      continue;
    }
    const unmapped = [...new Set(r.unmapped)];
    if (r.missing || r.drift || r.extra || r.fieldDiff || unmapped.length) {
      bad++;
      console.log(
        `FAIL   ${id}  缺 ${r.missing}　漂移 ${r.drift}　多 ${r.extra}　字段 ${r.fieldDiff}` +
          `${unmapped.length ? `　未映射 ${unmapped.join(",")}` : ""}`,
      );
      for (const line of r.lines) console.log("    " + line);
    } else if (verbose) {
      console.log(`ok     ${id}`);
    }
  }
  console.log(`片段探针：${checked} 条合法片段，${bad} 条对不上，${skipped} 条 TS 自己就非法`);
  process.exitCode = bad ? 1 : 0;
}

/**
 * **端到端那把尺子**（第 199 轮）：`node tests/parse/ts-ast.mjs --cli`
 *
 * 上面那把量的是**库路径**（`projectRoot` 直接被尺子 require 进来）。用户澄清过的验收口径
 * 是「由 `cjcli` 与 `ts.createSourceFile` 比较」——这两条路中间还隔着
 * **参数解析、读文件与 BOM、`CjcliParseTsAst`、`ToJsonText`（Map → 普通对象）、标准输出**。
 * 库路径绿不等于发布路径绿，所以这一把**真的去开进程**：
 *
 *   node build/ts/cjcli.js <文件> --ts-ast  →  stdout 的 JSON  →  与 TS 的 AST 四方向对拍
 *
 * 代价是每个文件一个 node 进程（全语料约两分钟），所以它是**按需跑的**，不进默认路径；
 * 口径与默认那把完全一致（kind / 区间 / 字段名，四方向 + 未映射）。
 */
function cliParity(mode, top, sampleLimit) {
  const { spawnSync } = require("node:child_process");
  const cli = path.join(root, "build", "ts", "cjcli.js");
  const files = corpus(mode);
  const missing = new Map();
  const drift = new Map();
  const extra = new Map();
  const fieldDiffs = new Map();
  const samples = new Map();
  let exactFiles = 0;
  let parsed = 0;
  let failed = 0;
  let unmappedFiles = 0;
  let nodesTotal = 0;

  for (const file of files) {
    let source = fs.readFileSync(file, "utf8");
    if (source.charCodeAt(0) === 0xfeff) source = source.substring(1);
    const run = spawnSync(process.execPath, [cli, file, "--ts-ast"], { encoding: "utf8", maxBuffer: 1 << 28 });
    if (run.status !== 0) {
      failed++;
      continue;
    }
    if ((run.stderr || "").includes("投影未覆盖的标签")) unmappedFiles++;
    let ast;
    try {
      ast = JSON.parse(run.stdout);
    } catch {
      failed++;
      continue;
    }
    parsed++;
    const proj = flattenProjected(ast);
    nodesTotal += proj.length;
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const theirs = flattenTs(sf);
    const projKeys = new Set(proj.map((p) => `${p.kind}@${p.start}-${p.end}`));
    const projByKind = new Map();
    const projFields = new Map();
    for (const p of proj) {
      if (!projByKind.has(p.kind)) projByKind.set(p.kind, []);
      projByKind.get(p.kind).push(p);
      projFields.set(`${p.kind}@${p.start}-${p.end}`, p.fields ?? []);
    }
    let fileBad = 0;
    for (const their of theirs) {
      const key = `${their.kind}@${their.start}-${their.end}`;
      if (!projKeys.has(key)) {
        const near = (projByKind.get(their.kind) || []).find((p) => Math.abs((p.start ?? -1) - their.start) <= 2);
        const bucket = near ? drift : missing;
        const label = near ? `DRIFT: ${their.kind}` : their.kind;
        bucket.set(label, (bucket.get(label) || 0) + 1);
        fileBad++;
        if ((samples.get(label) || []).length < sampleLimit) {
          samples.set(
            label,
            (samples.get(label) || []).concat(
              near
                ? `${path.relative(root, file)}:${their.start} CLI[${near.start},${near.end}) vs TS[${their.start},${their.end})`
                : `${path.relative(root, file)}:${their.start}  «${source.slice(their.start, their.start + 40).split("\n")[0]}»`,
            ),
          );
        }
        continue;
      }
      const ours = projFields.get(key) ?? [];
      const theirFields = their.fields ?? [];
      if (ours.length !== theirFields.length || !ours.every((f, i) => f === theirFields[i])) {
        const label = `FIELD ${their.kind}`;
        fieldDiffs.set(label, (fieldDiffs.get(label) || 0) + 1);
        fileBad++;
      }
    }
    const theirKeys = new Set(theirs.map((t) => `${t.kind}@${t.start}-${t.end}`));
    for (const p of proj) {
      if (theirKeys.has(`${p.kind}@${p.start}-${p.end}`)) continue;
      extra.set(p.kind, (extra.get(p.kind) || 0) + 1);
      fileBad++;
    }
    if (fileBad === 0) exactFiles++;
  }

  const missingTotal = [...missing.values()].reduce((a, b) => a + b, 0);
  const driftTotal = [...drift.values()].reduce((a, b) => a + b, 0);
  const extraTotal = [...extra.values()].reduce((a, b) => a + b, 0);
  const fieldTotal = [...fieldDiffs.values()].reduce((a, b) => a + b, 0);
  console.log("=== 发布路径（cjcli --ts-ast 的 stdout）对 ts.createSourceFile ===");
  console.log(`  语料 ${files.length} 个文件，起了 ${files.length} 个 cjcli 进程：解析成功 ${parsed}，失败 ${failed}，投影节点 ${nodesTotal} 个`);
  console.log(`  **完全一致的文件 ${exactFiles} / ${files.length} 个**`);
  console.log(
    `  缺节点 ${missingTotal}（${missing.size} 类）　区间漂移 ${driftTotal}（${drift.size} 类）　` +
      `多出来的节点 ${extraTotal}（${extra.size} 类）　字段名不符 ${fieldTotal}`,
  );
  console.log(`  cjcli 报了未映射标签的文件 ${unmappedFiles} 个`);
  for (const [k, n] of [...missing.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)) {
    console.log(`  ${String(n).padStart(7)}  ${k}`);
    for (const s of samples.get(k) || []) console.log(`             ${s}`);
  }
  for (const [k, n] of [...drift.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)) {
    console.log(`  ${String(n).padStart(7)}  ${k}`);
    for (const s of samples.get(k) || []) console.log(`             ${s}`);
  }
  for (const [k, n] of [...extra.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)) {
    console.log(`  ${String(n).padStart(7)}  <${k}>`);
  }
  for (const [k, n] of [...fieldDiffs.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)) {
    console.log(`  ${String(n).padStart(7)}  ${k}`);
  }
  process.exitCode =
    failed === 0 &&
    missing.size === 0 &&
    drift.size === 0 &&
    extra.size === 0 &&
    fieldDiffs.size === 0 &&
    unmappedFiles === 0
      ? 0
      : 1;
}

/**
 * **batch：不管怎么运行都要几秒**（用户口径）。
 *
 * 这一门原先**自己不起子进程**（第 321 轮的口径：「它本来就是同一进程内一份一份」），
 * 扇出交给 `tests/gates/run.mjs` —— 于是**直接跑它**就是 60 秒量级。
 * 现在反过来：**默认就是 batch**。父进程按**字节**切成 n 组（判据在 `corpus` 里，
 * 是 LPT 轮转 —— 大文件一份顶几百份小文件，按份数分会把大文件堆到一片里），
 * 每组一个子进程，父进程只汇总退出码与输出。
 *
 * **下界不是核数，是最大的那一份语料**：实测 `typescript/lib/lib.dom.d.ts`（2.3 MB）
 * 单份就要 8.07s，而分片切不开一个文件 ⇒ 墙钟下界就是它。
 *
 * **每一片各自算那七项**（`每片都 0` ⟺ `整体都 0`），所以父进程不需要把计数合起来
 * ——那正是分片最容易出错的地方。
 *
 * `--jobs 1` 退回单进程（要一份**合并**的逐文件账时用它）；
 * `--shard i/n` 是子进程那一侧，父进程见到它就**不再扇出**（否则无限套娃）。
 */
function runBatch(mode, jobs, passthrough) {
  const self = fileURLToPath(import.meta.url);
  const started = Date.now();
  console.log(`batch：${jobs} 片并行（${os.cpus().length} 核；--jobs 1 可退回单进程）`);
  const runs = [];
  for (let index = 0; index < jobs; index++) {
    runs.push(
      new Promise((resolve) => {
        const startedAt = Date.now();
        const child = spawn(
          process.execPath,
          [self, mode, ...passthrough, "--shard", `${index}/${jobs}`, "--jobs", "1"],
          { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
        );
        let out = "";
        let err = "";
        child.stdout.on("data", (chunk) => (out += chunk));
        child.stderr.on("data", (chunk) => (err += chunk));
        child.on("close", (code) => resolve({ index, code, out, err, ms: Date.now() - startedAt }));
      }),
    );
  }
  Promise.all(runs).then((all) => {
    let failed = 0;
    for (const one of all) {
      if (one.code !== 0) failed++;
      console.log(`--- 片 ${one.index + 1}/${jobs}（${(one.ms / 1000).toFixed(1)}s）`);
      for (const line of (one.out + one.err).split(/\r?\n/)) {
        if (line.trim() === "") continue;
        console.log(`    ${line}`);
      }
    }
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log("");
    console.log(`${jobs} 片：${jobs - failed} 片通过、${failed} 片失败；墙钟 ${seconds}s`);
    // **已知缺口那一趟在父进程里跑一次**（子进程都带 `--shard`，`main()` 里那一趟会自己让开）：
    // 它是语料级的账，跟着分片跑会在每片里各印一遍、还会把「收掉了」重复报 N 次。
    console.log("");
    const gapsOk = knownGapCheck();
    process.exitCode = failed === 0 && gapsOk ? 0 : 1;
  });
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args.find((a) => ["real", "cases", "all"].includes(a)) || "all";
  const top = args.includes("--top") ? Number(args[args.indexOf("--top") + 1]) : 20;
  const sampleLimit = args.includes("--samples") ? Number(args[args.indexOf("--samples") + 1]) : 3;

  // **片段探针**（一条构造一两行，见 `snippetProbe`）：普查缺口的第一站，先于语料那几把。
  if (args.includes("--snippets")) {
    await snippetProbe(path.resolve(root, args[args.indexOf("--snippets") + 1]), {
      limit: args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : 6,
      verbose: args.includes("--verbose"),
    });
    return;
  }

  // **发布路径那一把**（第 199 轮）：真的开 `cjcli` 进程，见上面 `cliParity`。
  if (args.includes("--cli")) {
    cliParity(mode, top, sampleLimit);
    return;
  }

  if (args.includes("--file")) {
    diffOneFile(path.resolve(root, args[args.indexOf("--file") + 1]), {
      list: args.includes("--list"),
      limit: args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : 40,
    });
    return;
  }

  // **batch（默认）**：切组、开子进程、汇总退出码。`--jobs 1` 退回单进程。
  //
  // **组数按逻辑处理器数量**（`os.cpus().length`，不 hard code）：机器几核就切几组。
  //
  // **小语料不扇出**：`cases` 只有 189 KB（1037 份），而起 16 个进程的固定开销比省下的还多
  //（实测 2.2s → 3.1s）。判据按**字节**而不是份数——大文件一份顶几百份小文件。
  const jobsArg = args.includes("--jobs") ? Number(args[args.indexOf("--jobs") + 1]) : 0;
  const jobs = Number.isFinite(jobsArg) && jobsArg > 0 ? jobsArg : Math.max(1, os.cpus().length);
  const listed = corpus(mode);
  if (args.includes("--shard") === false && jobs > 1) {
    let bytes = 0;
    for (const file of listed) {
      try {
        bytes += fs.statSync(file).size;
      } catch {
        bytes = bytes;
      }
    }
    if (bytes >= 2 * 1048576) {
      const passthrough = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === "--jobs") {
          i++;
          continue;
        }
        if (["real", "cases", "all"].includes(args[i])) continue;
        passthrough.push(args[i]);
      }
      runBatch(mode, jobs, passthrough);
      return;
    }
  }

  const files = listed;
  const missing = new Map();      // TS 有、产物没有（按 TS kind 聚合）
  const extra = new Map();        // 产物有、TS 没有（按产物标签聚合）
  const drift = new Map();        // 同 kind 但区间不同
  const samples = new Map();
  const stats = {
    total: 0,
    repeatVisits: 0,
    missingRange: 0,
    outOfRange: 0,
    triviaOutOfRange: 0,
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
  const projectedDrift = new Map();
  const projSamples = new Map();
  const fieldDiffs = new Map();
  const unmappedTags = new Map();
  // **「完全一致」的第三个方向**（第 84 轮补）：产物**多出来**的节点。
  // TS 的语义节点集合是**闭的**——少一个不是完全一致，多一个也不是。
  // 这一栏与「缺 / 漂移 / 字段名」并列；四个方向都为零的文件才叫「逐文件完全一致」。
  // （`alignedFiles` 那个旧判据只看 kind 序列，太松，留着当粗指标。）
  const projectedExtra = new Map();
  const projectedExtraSamples = new Map();
  let exactFiles = 0;
  const perFile = args.includes("--per-file");
  const perFileRows = [];
  // **`--time`：把逐文件那四步的累计时间打出来**。
  // 这一门「几秒预算」的瓶颈一直在**一份最重的语料**上（`lib.dom.d.ts`：2.3 MB / 11 万个 TS 节点），
  // 而它慢在哪一步不能靠猜 —— `--file` 那条路（6.1s）与主循环（25.8s）差着三步，
  // 有这四个数就一眼看得出该动哪一处。
  const wantTime = args.includes("--time");
  const phase = { read: 0, parse: 0, product: 0, tsParse: 0, tsWalk: 0, match: 0, project: 0 };

  for (const file of files) {
    const clock = () => Date.now();
    let at = clock();
    let source = fs.readFileSync(file, "utf8");
    if (source.charCodeAt(0) === 0xfeff) source = source.substring(1);
    phase.read += clock() - at;
    at = clock();
    let rootNode;
    try {
      rootNode = parseWith(source, file);
    } catch {
      failed++;
      continue;
    }
    phase.parse += clock() - at;
    parsed++;
    at = clock();
    const ours = flattenProduct(rootNode.ToList(), stats, source);
    phase.product += clock() - at;
    at = clock();
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    phase.tsParse += clock() - at;
    at = clock();
    const theirs = flattenTs(sf);
    phase.tsWalk += clock() - at;
    at = clock();
    ourTotal += ours.length;
    tsTotal += theirs.length;

    // 以「TS 的语义节点」为基准，逐个在产物侧找**同 kind（归一后）同区间**的节点：
    // 找不到 → 缺节点（这是要重构 token 层去补的）；找得到但区间不同 → 位置漂移。
    //
    // **同 kind 同区间那一支要走哈希**：原来每个 TS 节点都在同 kind 的数组里 `find` 一遍 ——
    // 那是 O(n²)，而 `lib.dom.d.ts` 一份就有十几万个 `Identifier`。实测同一份语料：
    // `--file`（不走这一步）6.1s，而尺子的主循环要 **25.8s** —— 差的就是这 20 秒。
    // 哈希之后命中是 O(1)（`kindSameTotal` 28 万 ≫ 缺 884 + 漂移 244，命中是绝对多数的路径），
    // 只有真缺席的节点才回退到那一趟线性扫描（全语料不到 1200 次）。
    //
    // **重复键只留第一个**：与原来 `find` 的语义一致（返回数组里第一个命中的）。
    //
    // **漂移那一支也要哈希**：命中失败时原来会在同 kind 的**整张表**上再线性扫一遍 ——
    // 一份 `lib.dom.d.ts` 有 12 万个 `Identifier`，粗指标那一趟命中率只有 45%，
    // 于是六万个节点各扫一遍十几万条 ⇒ 这一趟实测 **4858ms**，是本片最大的一头。
    // 换成「按起点索引 + 只看 ±2 这五个起点」之后是 O(1)。
    // 取哪个节点：原来取**同 kind 数组里第一个落进窗口的**，这里取**起点最近的** ——
    // 两者只影响 DRIFT 样本里印出来的那一对区间，**不影响计数**（仍是「漂移」而不是「缺」）。
    const ourByKind = new Map();
    const ourExact = new Map();
    const ourByStart = new Map();
    for (const node of ours) {
      if (!ourByKind.has(node.kind)) ourByKind.set(node.kind, []);
      ourByKind.get(node.kind).push(node);
      const key = `${node.kind}@${node.start}-${node.end}`;
      if (!ourExact.has(key)) ourExact.set(key, node);
      const startKey = `${node.kind}@${node.start}`;
      if (!ourByStart.has(startKey)) ourByStart.set(startKey, node);
    }
    for (const their of theirs) {
      if (ourExact.has(`${their.kind}@${their.start}-${their.end}`)) {
        kindSameTotal++;
        continue;
      }
      let near;
      for (let span = 0; span <= 2 && near === undefined; span++) {
        const probes = span === 0 ? [their.start] : [their.start - span, their.start + span];
        for (const probe of probes) {
          const found = ourByStart.get(`${their.kind}@${probe}`);
          if (found !== undefined) {
            near = found;
            break;
          }
        }
      }
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
    phase.match += clock() - at;

    // ---- 投影后的对拍：把产物树投成 TS 形状，再与 `ts.createSourceFile` 比 ----
    at = clock();
    const projected = projectRoot(rootNode.ToList(), source);
    for (const tag of projected.unmapped) unmappedTags.set(tag, (unmappedTags.get(tag) || 0) + 1);
    const proj = flattenProjected(projected.ast);
    phase.project += clock() - at;
    projectedTotal += proj.length;
    // **字段名对拍**：kind 与区间都对上的那些节点，两边的「有子节点的字段名」也该一致。
    const projKeys = new Set(proj.map((p) => `${p.kind}@${p.start}-${p.end}`));
    const projFields = new Map();
    const projByKind = new Map();
    for (const p of proj) {
      projFields.set(`${p.kind}@${p.start}-${p.end}`, p.fields ?? []);
      if (!projByKind.has(p.kind)) projByKind.set(p.kind, []);
      projByKind.get(p.kind).push(p);
    }
    // **逐文件的四个方向**（第 84 轮）：缺 / 漂移 / 多出来 / 字段名，全零才算完全一致。
    let fileMissing = 0;
    let fileDrift = 0;
    let fileExtra = 0;
    let fileFieldDiff = 0;
    for (const their of theirs) {
      const key = `${their.kind}@${their.start}-${their.end}`;
      if (!projKeys.has(key)) {
        // **投影后的漂移与缺失要分开**：前者是「同一类节点位置差一点」（改区间就完事），
        // 后者是「这一类根本没投出来」（要补映射）。混在一起看时，漂移会把缺失挤下榜首。
        const near = (projByKind.get(their.kind) || []).find((p) => Math.abs((p.start ?? -1) - their.start) <= 2);
        if (near) {
          fileDrift++;
          const dkey = `DRIFT: ${their.kind}`;
          projectedDrift.set(dkey, (projectedDrift.get(dkey) || 0) + 1);
          if ((projSamples.get(dkey) || []).length < sampleLimit) {
            projSamples.set(
              dkey,
              (projSamples.get(dkey) || []).concat(
                `${path.relative(root, file)}:${their.start} 产物[${near.start},${near.end}) vs TS[${their.start},${their.end})  «${source.slice(their.start, their.start + 30).split("\n")[0]}»`,
              ),
            );
          }
          continue;
        }
        fileMissing++;
        projectedMissing.set(their.kind, (projectedMissing.get(their.kind) || 0) + 1);
        if ((projSamples.get(their.kind) || []).length < sampleLimit) {
          projSamples.set(
            their.kind,
            (projSamples.get(their.kind) || []).concat(
              `${path.relative(root, file)}:${their.start}  «${source.slice(their.start, their.start + 40).split("\n")[0]}»`,
            ),
          );
        }
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
        fileFieldDiff++;
        const diffKey = `${their.kind}: 产物[${oursFields.join(",")}] vs TS[${theirFields.join(",")}]`;
        fieldDiffs.set(diffKey, (fieldDiffs.get(diffKey) || 0) + 1);
      }
    }
    // **产物多出来的**（第 84 轮）：投影节点里在 TS 那边找不到同 kind 同区间的那些。
    // TS 的语义节点集合是**闭的**——多一个节点就不是「完全一致」。
    const theirKeys = new Set(theirs.map((t) => `${t.kind}@${t.start}-${t.end}`));
    for (const p of proj) {
      if (theirKeys.has(`${p.kind}@${p.start}-${p.end}`)) continue;
      fileExtra++;
      projectedExtra.set(p.kind, (projectedExtra.get(p.kind) || 0) + 1);
      if ((projectedExtraSamples.get(p.kind) || []).length < sampleLimit) {
        projectedExtraSamples.set(
          p.kind,
          (projectedExtraSamples.get(p.kind) || []).concat(
            `${path.relative(root, file)}:${p.start}  «${source.slice(p.start, p.start + 30).split("\n")[0]}»`,
          ),
        );
      }
    }
    if (fileMissing === 0 && fileDrift === 0 && fileExtra === 0 && fileFieldDiff === 0) {
      exactFiles++;
    } else if (perFile) {
      perFileRows.push({
        file: path.relative(root, file),
        missing: fileMissing,
        drift: fileDrift,
        extra: fileExtra,
        fields: fileFieldDiff,
      });
    }
  }

  if (wantTime) {
    console.log("=== 各步累计（ms，本片）===");
    for (const [name, ms] of Object.entries(phase).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(ms).padStart(8)}  ${name}`);
    }
    console.log("");
  }

  if (perFile) {
    perFileRows.sort((a, b) => b.missing + b.drift + b.extra + b.fields - (a.missing + a.drift + a.extra + a.fields));
    console.log(`=== 逐文件差额（${perFileRows.length} 个文件不为零，按总额降序）===`);
    for (const row of perFileRows) {
      console.log(
        `  ${String(row.missing).padStart(6)} ${String(row.drift).padStart(5)} ${String(row.extra).padStart(5)} ${String(row.fields).padStart(5)}  ${row.file}`,
      );
    }
    console.log("");
  }

  console.log(
    `TS AST 对拍尺子：语料 ${files.length} 个文件，解析成功 ${parsed}，抛异常 ${failed}\n` +
      `                产物节点 ${ourTotal} 个，TS 语义节点 ${tsTotal} 个，` +
      `同 kind 同区间 ${kindSameTotal} 个（${((100 * kindSameTotal) / Math.max(1, tsTotal)).toFixed(1)}%），逐位置完全一致的文件 ${alignedFiles} 个\n`,
  );

  // **「和 TS 的 AST 完全一致」的那一行**（第 84 轮）：四个方向都为 0 才算。
  const extraTotal = [...projectedExtra.values()].reduce((a, b) => a + b, 0);
  const missingTotal = [...projectedMissing.values()].reduce((a, b) => a + b, 0);
  const driftTotal = [...projectedDrift.values()].reduce((a, b) => a + b, 0);
  const fieldDiffTotal = [...fieldDiffs.values()].reduce((a, b) => a + b, 0);
  console.log("=== 与 ts.createSourceFile 完全一致？（四个方向都为 0 才是）===");
  console.log(`  **完全一致的文件 ${exactFiles} / ${files.length} 个**`);
  console.log(
    `  缺节点 ${missingTotal}（${projectedMissing.size} 类）　` +
      `区间漂移 ${driftTotal}（${projectedDrift.size} 类）　` +
      `多出来的节点 ${extraTotal}（${projectedExtra.size} 类）　` +
      `字段名不符 ${fieldDiffTotal}`,
  );
  // **判据之外的三个「地基」栏**（第 199 轮提到这里，与四方向并列判绿）：
  //   · 未映射 —— 通用支**真正透传进产物**的标签（`projectRoot` 已经滤掉「只是问一下」的那些访问）；
  //   · 缺坐标 —— 节点上没有 `range`；
  //   · 越界   —— 会进投影的节点落在父亲区间之外（trivia 不算，见 `flattenProduct` 那一处）。
  const unmappedTotal = [...unmappedTags.values()].reduce((a, b) => a + b, 0);
  console.log(
    `  未映射（透传进产物的标签）${unmappedTags.size} 类 / ${unmappedTotal} 处　` +
      `缺 range ${stats.missingRange} 个　区间越界 ${stats.outOfRange} 个`,
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
    for (const s of projSamples.get(k) || []) console.log(`               ${s}`);
  }
  // **多出来的**：TS 那边没有的节点（第 84 轮补的第三个方向）。
  console.log("  投影后**多出来**的节点（TS 那边没有；前 12）：");
  if (projectedExtra.size === 0) console.log("    （无）");
  for (const [k, n] of [...projectedExtra.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`    ${String(n).padStart(6)}  ${k}`);
    for (const s of projectedExtraSamples.get(k) || []) console.log(`               ${s}`);
  }
  console.log("  投影后同 kind 但区间漂移（前 10）：");
  if (projectedDrift.size === 0) console.log("    （无）");
  for (const [k, n] of [...projectedDrift.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`    ${String(n).padStart(6)}  ${k}`);
    for (const s of projSamples.get(k) || []) console.log(`               ${s}`);
  }

  console.log("\n坐标完整性（投影成 TS 形状的地基）：");  console.log(
    `  节点 ${stats.total} 个（**按实例去重**；重复访问 ${stats.repeatVisits} 次——同一子单元被挂在两个位置），\n` +
      `  **缺 range** ${stats.missingRange} 个，**区间越界** ${stats.outOfRange} 个` +
      `（另有 trivia 越界 ${stats.triviaOutOfRange} 个——注释 / 软换行是**被扫进来的**，` +
      `不参与签入签出，是约定的形态，见 `+ "`ternary-operator.xl.md`" + ` 第 125 / 127 轮）`,
  );
  for (const [k, n] of [...stats.missingByType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`    ${String(n).padStart(6)}  ${k}`);
  }
  for (const [k, n] of [...stats.outOfRangeByType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`    ${String(n).padStart(6)}  ${k}`);
  }

  // **退出码按「完全一致」算**（第 84 轮）：缺 / 漂移 / 多出来 / 字段名，四个方向都为 0 才绿。
  // 原来只看「缺 + 漂移」两个方向，所以「产物多出一堆 TS 没有的节点」时它照样是绿的——
  // 而 `完全一致` 这个预期下，多一个节点与少一个节点同样不合格。
  //
  // 第 199 轮把**地基**的三栏也并进退出码：未映射（透传进产物的标签）、缺 range、区间越界。
  // 它们原来是「打印出来给人读」的，于是「完全一致」这句话带着三个未验证的星号；
  // 用户的要求是「PrintAst 必须和 TS 的 AST 完全一致」，那就一条都不许留白。
  // **已知缺口那一趟**（第 670 轮）：只在**非分片**这一趟里跑（分片时由父进程跑一次，
  // 见 `runBatch`）——它是语料级的账，不是每片各自算的那七项。
  const gapsOk = ARGS.includes("--shard") ? true : knownGapCheck();
  if (ARGS.includes("--shard") === false) {
    console.log("");
  }

  process.exitCode =
    projectedMissing.size === 0 &&
    projectedDrift.size === 0 &&
    projectedExtra.size === 0 &&
    fieldDiffs.size === 0 &&
    unmappedTags.size === 0 &&
    stats.missingRange === 0 &&
    stats.outOfRange === 0 &&
    gapsOk
      ? 0
      : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  await main();
}
