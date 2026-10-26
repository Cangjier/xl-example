// 已支持增量形状回归器（`typescript/cases/tts-impl`）
//
// 这个目录只收「已经支持」的形态：它们原本住在 `typescript/cases/tts` 的
// `cases/incremental/<area>/<name>.ts`，被判定为真正增量之后，随功能落地用 `git mv`
// 迁进来（迁出规则见 `typescript/cases/tts/README.md` 末节）。
//
// 因此这里不再有「按目录标注期望分类」这一层，判定口径只有一条：
//
//   **每条 case 在增量模式下都必须分类为 `incremental`，否则 FAIL。**
//
// `throw` / `atomic` / `partial` / `invalid` / `divergent` 出现在这里，只说明两件事之一：
// 增量支持退化了，或者这条 case 根本不该迁进来。两种都要 FAIL —— 这与 `tts` 的
// 「符合目录标注即 PASS」不同，是 `tts-impl` 存在的全部理由。
//
// 判定逻辑与 `typescript/cases/tts/run.mjs` 同源（复制后只改判定与输出，**不 import**
// 它的私有函数，避免两个工具互相耦合）：
//   1) legacy：`StatementRouteUtil.EnableIncrementalVariableShapes = false`
//   2) incremental：同一份源码、同一个开关置 true
// 两者都按「一次吃一个字符 + EOF 收尾」推进，每步取 `Root.ToAstLine(0)`。
//
// 分类（与 tts 完全一致）：
//   throw       增量模式显式抛错（C10「增量变量形状未支持：…」）—— 尚未支持。
//   atomic      增量开关对整棵树的时序没有任何影响 —— 该形态完全不参与增量建造。
//   partial     开关改变了时序，但变早的只有变量声明骨架（Variable*Shape / 绑定 IdentifierShape）
//               —— 只有外层增量。
//   incremental 标的形状首次出现严格早于 legacy —— 真正增量（**本目录唯一合格值**）。
//   invalid     两模式之一解析即抛错；divergent 两模式 EOF shape 树不同（结构异常）。
//
// 「shape 节点」= 类名不是 basic token（Common / Symbol / WrapSymbol / Bracket / String / …）的节点；
// 比较 identity 用 (类名, pos)：形状成长时终点可能还是开区间，pos 稳定。
//
// 用法：
//   node typescript/cases/tts-impl/run.mjs
//   node typescript/cases/tts-impl/run.mjs --quiet             # 只留一行 PASS/FAIL 汇总
//   node typescript/cases/tts-impl/run.mjs --filter expressions
//   node typescript/cases/tts-impl/run.mjs --show expressions/bin-add
//   node typescript/cases/tts-impl/run.mjs --json tmp/tts-impl-report.json
//   node typescript/cases/tts-impl/run.mjs --write-index       # 重写本目录 INDEX.md
//
// 退出码：0 全部 incremental；1 有 FAIL；2 环境错误（构建产物缺失等）。

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..");
const require = createRequire(import.meta.url);
const BUILD = path.join(root, "build", "ts");

const CLASSES = ["throw", "atomic", "partial", "incremental"];
const EXPECTED = "incremental";
const SUPPORT_LEVEL = { throw: -1, atomic: 0, partial: 1, incremental: 2 };
const CASES_DIR = path.join(here, "cases");
const INDEX_PATH = path.join(here, "INDEX.md");

function fail(message) {
  console.error(`[tts-impl] ${message}`);
  process.exit(2);
}

function loadBuildClass(relativePath, className) {
  const file = path.join(BUILD, relativePath);
  if (!fs.existsSync(file)) {
    fail(
      `构建产物缺失：${file}\n` +
        `先构建（本机没有 xl CLI，用 DSH 的 xl_build 工具）：\n` +
        `  1) xl_build { cwd: <repo>, paths: ["core","typescript"], targets: ["ts"] }\n` +
        `  2) node node_modules/typescript/bin/tsc -p .`,
    );
  }
  const value = require(file)[className];
  if (value === undefined) fail(`构建产物 ${file} 里没有导出 ${className}`);
  return value;
}

const { SyntaxContext } = { SyntaxContext: loadBuildClass("core/syntax/syntax-context.js", "SyntaxContext") };
const { SourceRange } = { SourceRange: loadBuildClass("core/syntax/source-range.js", "SourceRange") };
const { TextDocument } = { TextDocument: loadBuildClass("typescript/run/text-document.js", "TextDocument") };
const { TypescriptTemplate } = { TypescriptTemplate: loadBuildClass("typescript/run/typescript-template.js", "TypescriptTemplate") };
const { SourceFileShape } = { SourceFileShape: loadBuildClass("typescript/tokens/files/source-file-shape.js", "SourceFileShape") };
const routeModule = require(path.join(BUILD, "typescript/tokens/statements/statement-route-util.js"));
const StatementRouteUtil = routeModule.StatementRouteUtil ?? routeModule.default?.StatementRouteUtil;
if (StatementRouteUtil === undefined || StatementRouteUtil.EnableIncrementalVariableShapes === undefined) {
  fail("statement-route-util.js 里没有静态字段 EnableIncrementalVariableShapes（构建产物与当前源码不匹配）");
}

// ---------------------------------------------------------------------------
// 树解析：把 ToAstLine(0) 的输出读成节点序列（类名 / src 起点 / pos / 深度 / 是否 basic）
// ---------------------------------------------------------------------------
const BASIC = new Set([
  "AreaAnnotation", "Bom", "Bracket", "Common", "ConstString", "InterpolationExitGuide", "InterpolationGuide",
  "InterpolationString", "LineAnnotation", "RawQuoteExitGuide", "RegexToken", "Shebang", "String", "StringGuide",
  "Symbol", "Translate", "VerbatimQuoteGuide", "WrapSymbol", "EndOfFileTokenShape", "SourceFileShape",
]);
// 增量变量声明路径自己长出来的容器骨架；IdentifierShape 只有「绑定名」那一个算骨架（见 skeletonKeys）。
const SKELETON_CLASSES = new Set([
  "StatementShape", "VariableStatementShape", "VariableDeclarationListShape", "VariableDeclarationShape",
]);

const NODE_RE = /^((?:│  |   )*)(?:├─ |└─ )([A-Za-z_$][\w$]*)\b(.*)$/;
const ROOT_RE = /^([A-Za-z_$][\w$]*)\b(.*)$/;
const SRC_RE = /src=\[(-?\d+),(-?\d+|\.\.\.)\)/;
const POS_RE = /pos=(-?\d+|-)/;

function parsePos(text) {
  const matched = POS_RE.exec(text);
  if (matched === null || matched[1] === "-") return -1;
  return Number(matched[1]);
}

function parseTree(tree) {
  const nodes = [];
  const lines = tree.split("\n");
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const decorated = NODE_RE.exec(line);
    if (decorated !== null) {
      const src = SRC_RE.exec(decorated[3]);
      nodes.push({
        cls: decorated[2],
        start: src === null ? -1 : Number(src[1]),
        pos: parsePos(decorated[3]),
        depth: decorated[1].length / 3 + 1,
        basic: BASIC.has(decorated[2]),
      });
      continue;
    }
    if (index !== 0) continue;
    const plain = ROOT_RE.exec(line);
    if (plain === null) continue;
    const src = SRC_RE.exec(plain[2]);
    nodes.push({
      cls: plain[1],
      start: src === null ? -1 : Number(src[1]),
      pos: parsePos(plain[2]),
      depth: 0,
      basic: BASIC.has(plain[1]),
    });
  }
  return nodes;
}

// identity 用 (类名, pos)：pos 是 AST 起点（含前导 trivia），两种模式的同一节点 pos 一致；
// 不用 src 起点，是因为增量实现会把前导/尾随 trivia 吃进 src 区间（见 tts README「实现缺陷」），
// 那不是形状结构差异，不该把 case 判成 divergent。
function nodeKey(node) {
  return node.pos >= 0 ? node.cls + "@pos=" + node.pos : node.cls + "@src=" + node.start;
}

// 变量声明骨架的 identity：四个容器 + VariableDeclarationShape 的第一个 IdentifierShape 子节点（绑定名）。
function skeletonKeys(nodes) {
  const keys = new Set();
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    if (SKELETON_CLASSES.has(node.cls)) keys.add(nodeKey(node));
    if (node.cls !== "VariableDeclarationShape") continue;
    for (let child = index + 1; child < nodes.length; child++) {
      const candidate = nodes[child];
      if (candidate.depth <= node.depth) break;
      if (candidate.depth !== node.depth + 1) continue;
      if (candidate.cls === "IdentifierShape") {
        keys.add(nodeKey(candidate));
        break;
      }
    }
  }
  return keys;
}

function firstSeenMap(steps) {
  const map = new Map();
  for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
    for (const node of parseTree(steps[stepIndex].tree)) {
      const key = nodeKey(node);
      if (!map.has(key)) map.set(key, stepIndex);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// 解析器驱动
// ---------------------------------------------------------------------------
function errorText(exception) {
  const seen = new Set();
  let current = exception;
  let deepest = "";
  let incremental = "";
  while (current !== null && current !== undefined && !seen.has(current)) {
    seen.add(current);
    if (typeof current === "object") {
      const message = current.Message ?? current.message;
      if (message !== undefined && message !== null && String(message).length > 0) {
        deepest = String(message);
        if (deepest.includes("增量变量形状未支持")) incremental = deepest;
      }
      current = current.InnerException ?? null;
    } else {
      deepest = String(current);
      if (deepest.includes("增量变量形状未支持")) incremental = deepest;
      current = null;
    }
  }
  return incremental !== "" ? incremental : deepest;
}

function collectSteps(source, filePath) {
  const template = TypescriptTemplate.Create();
  const shape = new SourceFileShape(template);
  const context = new SyntaxContext(shape, 32);
  const document = new TextDocument(source, filePath);
  SourceRange.CurrentDocument = document;
  context.CurrentDocument = document;
  const count = document.GetCount();
  const steps = [];
  for (let index = 0; index < count; index++) {
    let error = null;
    try {
      context.ProcessRange(context.Root, new SourceRange(document, index, index + 1), index);
    } catch (exception) {
      error = errorText(exception);
    }
    steps.push({ kind: "char", index, char: source[index], tree: shape.ToAstLine(0), error });
    if (error !== null) return { count, steps, stopped: true, stage: "char", index };
  }
  let error = null;
  try {
    // 与 SyntaxContext.Process 的 EOF 尾巴同一顺序：游标压到 count → 根签出 → 空窗口交给根 → 抽消息。
    context.Index = count;
    context.Root.SignOut(count);
    context.Root.Process(context, new SourceRange(document, count, count), count);
    if (typeof context.DrainMessages === "function") context.DrainMessages();
  } catch (exception) {
    error = errorText(exception);
  }
  steps.push({ kind: "eof", index: count, char: null, tree: shape.ToAstLine(0), error });
  return { count, steps, stopped: error !== null, stage: error === null ? null : "eof", index: count };
}

function setIncremental(enabled) {
  StatementRouteUtil.EnableIncrementalVariableShapes = enabled;
}

// ---------------------------------------------------------------------------
// 单 case 判定（与 tts/run.mjs 同一套算法）
// ---------------------------------------------------------------------------
function shapeLines(tree) {
  const lines = [];
  for (const line of tree.split("\n")) {
    const decorated = NODE_RE.exec(line);
    if (decorated !== null) {
      // 只比较「类名 + pos + 文本字段」：src 区间会被增量实现吃进前后 trivia，那是实现缺陷，
      // 不是形状结构差异（见 tts README「顺带发现的增量实现缺陷」）。
      if (!BASIC.has(decorated[2])) lines.push(line.replace(/\s+src=\[[^\]]*\)/g, ""));
      continue;
    }
    const plain = ROOT_RE.exec(line);
    if (plain !== null && !BASIC.has(plain[1])) lines.push(line.replace(/\s+src=\[[^\]]*\)/g, ""));
  }
  return lines;
}

function classify(source, filePath) {
  setIncremental(false);
  const legacy = collectSteps(source, filePath);
  setIncremental(true);
  const incremental = collectSteps(source, filePath);
  setIncremental(false);

  const result = {
    classification: null,
    reason: null,
    steps: incremental.steps.length,
    earlierShapeNodes: 0,
    nonSkeletonEarlier: 0,
    earlierNodes: [],
    residualBasicLines: 0,
    rangeOnlyDifference: false,
  };

  if (incremental.stopped && !legacy.stopped) {
    result.classification = "throw";
    result.reason = errorText(incremental.steps[incremental.steps.length - 1].error);
    return result;
  }
  if (legacy.stopped) {
    result.classification = "invalid";
    result.reason = "legacy 解析即抛错：" + errorText(legacy.steps[legacy.steps.length - 1].error);
    return result;
  }
  if (incremental.stopped) {
    result.classification = "invalid";
    result.reason = "两种模式都抛错：" + errorText(incremental.steps[incremental.steps.length - 1].error);
    return result;
  }

  const legacyTree = legacy.steps[legacy.steps.length - 1].tree;
  const incrementalTree = incremental.steps[incremental.steps.length - 1].tree;
  const legacyShapes = shapeLines(legacyTree);
  const incrementalShapes = shapeLines(incrementalTree);
  const legacyBasic = legacyTree.split("\n").length - legacyShapes.length;
  const incrementalBasic = incrementalTree.split("\n").length - incrementalShapes.length;
  result.residualBasicLines = incrementalBasic - legacyBasic;

  if (legacyShapes.join("\n") !== incrementalShapes.join("\n")) {
    result.classification = "divergent";
    result.reason = "两种模式的 EOF shape 树不同（结构 / pos / 起点）";
    result.diff = [];
    for (let index = 0; index < Math.max(legacyShapes.length, incrementalShapes.length); index++) {
      if (legacyShapes[index] !== incrementalShapes[index]) {
        result.diff.push({ legacy: legacyShapes[index], incremental: incrementalShapes[index] });
      }
    }
    return result;
  }
  result.rangeOnlyDifference = legacyTree !== incrementalTree && result.residualBasicLines === 0;

  const legacyFirstSeen = firstSeenMap(legacy.steps);
  const incrementalFirstSeen = firstSeenMap(incremental.steps);
  const eofNodes = parseTree(incrementalTree);
  const skeleton = skeletonKeys(eofNodes);
  const finalKeys = new Set();
  for (const node of eofNodes) {
    if (node.basic) continue;
    if (node.pos < 0 && node.start < 0) continue;
    finalKeys.add(nodeKey(node));
  }
  for (const [key, stepIndex] of incrementalFirstSeen) {
    if (!finalKeys.has(key)) continue;
    if (!legacyFirstSeen.has(key)) continue;
    if (stepIndex >= legacyFirstSeen.get(key)) continue;
    result.earlierShapeNodes += 1;
    if (!skeleton.has(key)) {
      result.nonSkeletonEarlier += 1;
      result.earlierNodes.push(key);
    }
  }
  let finalAllSkeleton = true;
  for (const key of finalKeys) {
    if (!skeleton.has(key)) {
      finalAllSkeleton = false;
      break;
    }
  }
  if (finalAllSkeleton) {
    result.classification = result.earlierShapeNodes > 0 ? "incremental" : "atomic";
  } else if (result.earlierShapeNodes === 0) {
    result.classification = "atomic";
  } else if (result.nonSkeletonEarlier === 0) {
    result.classification = "partial";
  } else {
    result.classification = "incremental";
  }
  return result;
}

// ---------------------------------------------------------------------------
// 用例枚举 / TS 语法体检
// ---------------------------------------------------------------------------
function listCaseFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listCaseFiles(absolute));
    else if (entry.name.endsWith(".ts")) files.push(absolute);
  }
  return files;
}

function caseId(file) {
  return path.relative(CASES_DIR, file).split(path.sep).join("/");
}

function locateCase(id) {
  const normalized = id.split("/").join(path.sep);
  const candidates = [path.join(CASES_DIR, normalized), path.join(CASES_DIR, normalized + ".ts")];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

let tsModule = null;
let tsLoadTried = false;
function typescriptProblems(source, name) {
  if (!tsLoadTried) {
    tsLoadTried = true;
    try {
      tsModule = require(path.join(root, "node_modules", "typescript"));
    } catch {
      tsModule = null;
    }
  }
  if (tsModule === null) return null;
  const file = tsModule.createSourceFile(name, source, tsModule.ScriptTarget.Latest, false, tsModule.ScriptKind.TS);
  return (file.parseDiagnostics || []).map((diagnostic) =>
    tsModule.flattenDiagnosticMessageText(diagnostic.messageText, " ").split("\n")[0],
  );
}

// ---------------------------------------------------------------------------
// 输出
// ---------------------------------------------------------------------------
function supportLabel(level) {
  if (level < 0) return "显式拒绝";
  if (level === 0) return "完全非增量";
  if (level === 1) return "仅外层增量";
  return "增量支持";
}

// 判定依据：合格时说明增量在哪，不合格时说明它退化成了什么 —— FAIL 行必须带实际分类与 reason。
function evidence(record) {
  if (record.actual === EXPECTED) {
    if (record.earlierNodes.length === 0) return `仅有骨架提前（${record.earlierShapeNodes} 个节点）`;
    return `提前的 shape 节点：${record.earlierNodes.slice(0, 6).join(", ")}`;
  }
  if (record.actual === "throw" || record.actual === "divergent" || record.actual === "invalid") {
    return record.reason ?? `结构异常（${record.actual}）`;
  }
  if (record.actual === "atomic") return "增量开关对逐字符树没有任何影响";
  if (record.actual === "partial") return `只有 ${record.earlierShapeNodes} 个骨架节点提前`;
  return supportLabel(SUPPORT_LEVEL[record.actual] ?? -1);
}

function diagnosis(record) {
  if (record.tsValid === false) return `TS 语法不合法：${record.tsProblems.join(" | ")}`;
  if (record.actual === EXPECTED) return "已支持（标的 shape 首次出现严格早于 legacy）";
  switch (record.actual) {
    case "throw":
      return "增量模式显式抛错 —— 该形态尚未支持，不该在 tts-impl";
    case "atomic":
      return "增量开关对时序没有影响 —— 该形态完全非增量，不该在 tts-impl";
    case "partial":
      return "只有变量声明骨架增量 —— 仅外层增量，不该在 tts-impl";
    case "divergent":
      return "两种模式 EOF shape 树不同 —— 结构异常";
    default:
      return "解析即抛错 —— 结构异常";
  }
}

function writeIndex(records) {
  const groups = new Map();
  for (const record of records) {
    const area = record.area === "" ? "（无分区）" : record.area;
    if (!groups.has(area)) groups.set(area, []);
    groups.get(area).push(record);
  }
  const passed = records.filter((record) => record.pass).length;
  const lines = [
    "# INDEX — 已支持增量形状 cases（tts-impl）",
    "",
    "> 由 `node typescript/cases/tts-impl/run.mjs --write-index` 生成，**不要手改**。",
    "> 验收口径与迁移约定见 [README.md](README.md)。",
    "",
    `共 **${records.length}** 条 case：incremental **${passed}** / 非 incremental **${records.length - passed}**（非 incremental 即 FAIL）。`,
    "",
  ];
  for (const area of [...groups.keys()].sort()) {
    lines.push(`## ${area}`, "");
    lines.push("| case | 分类 | 判定依据 | 备注 |");
    lines.push("| --- | --- | --- | --- |");
    for (const record of groups.get(area).sort((a, b) => a.id.localeCompare(b.id))) {
      const note = [];
      if (record.residualBasicLines > 0) note.push(`残留 basic 行 +${record.residualBasicLines}`);
      if (record.rangeOnlyDifference) note.push("EOF 区间含前导/尾随 trivia");
      if (record.tsValid === false) note.push("TS 语法不合法");
      lines.push(
        `| \`${record.id}\` | ${record.actual} | ${evidence(record).replace(/\|/g, "\\|")} | ${note.join("；")} |`,
      );
    }
    lines.push("");
  }
  fs.writeFileSync(INDEX_PATH, lines.join("\n"), "utf8");
  return INDEX_PATH;
}

function printCase(record) {
  const mark = record.pass ? "PASS" : "FAIL";
  console.log(`${mark}  ${record.id}`);
  console.log(`      actual=${record.actual}  steps=${record.steps}`);
  if (!record.pass) console.log(`      reason: ${record.pass ? "" : diagnosis(record)}`);
  if (record.reason !== null && record.reason !== "") console.log(`      detail: ${record.reason}`);
  if (record.earlierNodes.length > 0) console.log(`      earlier: ${record.earlierNodes.slice(0, 10).join(", ")}`);
  if (record.residualBasicLines > 0) console.log(`      residual basic lines: +${record.residualBasicLines}`);
  if (record.diff !== undefined) {
    for (const line of record.diff.slice(0, 8)) {
      console.log(`      legacy: ${line.legacy}`);
      console.log(`      increm: ${line.incremental}`);
    }
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const USAGE = `用法：node typescript/cases/tts-impl/run.mjs [选项]

判定：目录里每一条 case 都必须在增量模式下分类为 incremental，否则 FAIL。
      throw / atomic / partial / invalid / divergent 一律 FAIL（不支持，或不该迁进来）。

选项：
  --quiet               只留一行 PASS/FAIL 汇总（有失败时仍打印失败明细）
  --filter <子串>       只跑相对路径包含该子串的 case（可重复）
  --show <case>         只跑一条并打印判定依据（可写相对路径 / 去 .ts 的名字）
  --json <path>         把逐条结果写成 JSON
  --write-index         重写本目录 INDEX.md
  -h, --help            显示本帮助

目录约定：cases/<area>/<name>.ts
  area 与 tts 的 cases/incremental/<area>/ 一致（declarations / expressions /
  lexical / statements / controls），迁移时只去掉 incremental 这一层。
`;

function parseArgs(argv) {
  const options = { quiet: false, filters: [], show: null, json: null, writeIndex: false, help: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--quiet") options.quiet = true;
    else if (arg === "--write-index") options.writeIndex = true;
    else if (arg === "-h" || arg === "--help") options.help = true;
    else if (arg === "--filter") {
      options.filters.push(argv[++index] ?? fail("--filter 后面要跟一个子串"));
    } else if (arg.startsWith("--filter=")) options.filters.push(arg.slice("--filter=".length));
    else if (arg === "--show") options.show = argv[++index] ?? fail("--show 后面要跟一个 case");
    else if (arg === "--json") options.json = argv[++index] ?? fail("--json 后面要跟一个路径");
    else if (arg.startsWith("--json=")) options.json = arg.slice("--json=".length);
    else if (arg.startsWith("-")) fail(`不认识的选项：${arg}`);
    else options.filters.push(arg);
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return;
  }

  let files = listCaseFiles(CASES_DIR);
  if (options.show !== null) {
    const located = locateCase(options.show);
    if (located === null) fail(`找不到 case：${options.show}`);
    files = [located];
  } else if (options.filters.length > 0) {
    files = files.filter((file) => options.filters.some((filter) => caseId(file).includes(filter)));
  }
  if (files.length === 0) fail(`没有找到 case（目录：${CASES_DIR}）`);

  const records = [];
  for (const file of files) {
    const id = caseId(file);
    const areaParts = id.split("/").slice(0, -1);
    const source = fs.readFileSync(file, "utf8");
    const problems = typescriptProblems(source, path.basename(file));
    let result;
    try {
      result = classify(source, id);
    } catch (exception) {
      result = { classification: "invalid", reason: exception instanceof Error ? exception.stack ?? exception.message : String(exception), steps: 0, earlierShapeNodes: 0, nonSkeletonEarlier: 0, earlierNodes: [], residualBasicLines: 0, rangeOnlyDifference: false };
    }
    const tsValid = problems === null ? null : problems.length === 0;
    const record = {
      id,
      area: areaParts.length === 0 ? "" : areaParts[0],
      actual: result.classification,
      pass: result.classification === EXPECTED && tsValid !== false,
      steps: result.steps,
      reason: result.reason ?? null,
      earlierNodes: result.earlierNodes ?? [],
      earlierShapeNodes: result.earlierShapeNodes ?? 0,
      nonSkeletonEarlier: result.nonSkeletonEarlier ?? 0,
      residualBasicLines: result.residualBasicLines ?? 0,
      rangeOnlyDifference: result.rangeOnlyDifference ?? false,
      tsValid,
      tsProblems: problems ?? [],
      diff: result.diff,
    };
    if (tsValid === false) record.reason = `TS 语法不合法：${problems.join(" | ")}`;
    records.push(record);
    if (!options.quiet) printCase(record);
  }

  const failures = records.filter((record) => !record.pass);
  const counts = {};
  for (const cls of CLASSES) counts[cls] = 0;
  for (const record of records) counts[record.actual] = (counts[record.actual] ?? 0) + 1;

  if (options.show !== null) {
    const record = records[0];
    console.log(`\n判定：actual=${record.actual} —— ${diagnosis(record)}`);
    if (record.tsProblems.length > 0) console.log(`      TS: ${record.tsProblems.join(" | ")}`);
  }

  if (!options.quiet || failures.length > 0) {
    console.log("");
    console.log(
      `[tts-impl] ${records.length} 条 case：` +
        CLASSES.map((cls) => `${cls} ${counts[cls]}`).join(" · ") +
        `（合格值只有 ${EXPECTED}）`,
    );
    for (const failure of failures) {
      console.log(`FAIL  ${failure.id}  actual=${failure.actual} —— ${diagnosis(failure)}`);
      if (failure.reason !== null && failure.reason !== "") console.log(`      reason: ${failure.reason}`);
      if (failure.residualBasicLines > 0) console.log(`      residual basic lines: +${failure.residualBasicLines}`);
      if (failure.tsProblems.length > 0) console.log(`      TS: ${failure.tsProblems.join(" | ")}`);
    }
  }
  console.log(`[tts-impl] PASS ${records.length - failures.length} / FAIL ${failures.length} / ${records.length}`);

  if (options.json !== null) {
    const outPath = path.resolve(root, options.json);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          generatedBy: "typescript/cases/tts-impl/run.mjs",
          expected: EXPECTED,
          classes: CLASSES,
          total: records.length,
          pass: records.length - failures.length,
          fail: failures.length,
          counts,
          failures: failures.map((failure) => failure.id),
          records,
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    if (!options.quiet) console.log(`[tts-impl] JSON 已写入 ${outPath}`);
  }

  if (options.writeIndex) {
    const indexPath = writeIndex(records);
    if (!options.quiet) console.log(`[tts-impl] INDEX 已写入 ${indexPath}`);
  }

  process.exitCode = failures.length === 0 ? 0 : 1;
}

main();
