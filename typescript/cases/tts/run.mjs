// 增量形状支持范围判定器（`typescript/cases/tts`）
//
// 背景：`let x = 2*3+1` 走的是「逐字符长出 shape」的增量路径；`a < b && c > d`
// 走的是旧路径（整条语句收口时原子建树，逐字符 dump 里只有 basic token）。
// 本工具把「支不支持增量形状」做成可复算的判据，并把所有**不支持**的形态沉淀成 cases。
//
// 用法：
//   node typescript/cases/tts/run.mjs                     # 跑全部 case，逐条对照目录标注
//   node typescript/cases/tts/run.mjs --quiet             # 只打汇总
//   node typescript/cases/tts/run.mjs --filter expressions
//   node typescript/cases/tts/run.mjs --show atomic/statements/if-simple
//   node typescript/cases/tts/run.mjs --json tmp/tts-report.json
//   node typescript/cases/tts/run.mjs --write-index       # 重写本目录 INDEX.md
//
// 目录标注 = 期望分类：cases/<class>/<area>/<name>.ts，class ∈ throw / atomic / partial / incremental。
//
// 判定口径（两份独立进程内解析，源码与开关都固定）：
//   1) legacy：`StatementRouteUtil.EnableIncrementalVariableShapes = false`
//   2) incremental：同一份源码、同一个开关置 true
//   两者都按「一次吃一个字符 + EOF 收尾」推进，每步取 `Root.ToAstLine(0)`。
//
// 分类：
//   throw       增量模式显式抛错（C10「增量变量形状未支持：…」），legacy 正常 —— 全有或全无的拒绝。
//   atomic      增量开关对整棵树的时序**没有任何影响**（每步 shape 树与 legacy 完全相同）；
//               标的形状要等整条语句/整个文件收口才一次性出现 —— 该形态完全不参与增量建造。
//   partial     开关改变了时序，但变早的只有变量声明的骨架
//               （VariableStatementShape / VariableDeclarationListShape / VariableDeclarationShape / 绑定 IdentifierShape）；
//               标的（初始化器 / 表达式 / 子语句）仍与 legacy 同时出现 —— 只有外层增量。
//   incremental 标的形状首次出现严格早于 legacy —— 真正增量（对照/正向 case）。
//
// 「shape 节点」= 类名不是 basic token（Common / Symbol / WrapSymbol / Bracket / String / …）的节点；
// basic token 是尚未被形状吃掉的中间态，既不算 AST 节点，也不参与「谁先出现」的比较。
// 比较 identity 用 (类名, src 起点)：形状成长时终点可能还是开区间，起点稳定。
//
// 为什么要和 legacy 对拍：只看「EOF 前有没有出现」分不清「增量建的」与「语句收口时一次建完」——
// 例如 `a < b && c > d\n` 的全部表达式形状都赶在 EOF 前一步出现，但它们是一次性原子建出来的。
// 开关对时序的影响是「增量建造真的发生了」的唯一可靠证据。
//
// 退出码：0 全部符合标注；1 有不符（新增支持 / 回归 / 结构异常）；2 环境错误（构建产物缺失等）。

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..");
const require = createRequire(import.meta.url);
const BUILD = path.join(root, "build", "ts");

const CLASSES = ["throw", "atomic", "partial", "incremental"];
const SUPPORT_LEVEL = { throw: -1, atomic: 0, partial: 1, incremental: 2 };
const CASES_DIR = path.join(here, "cases");
const INDEX_PATH = path.join(here, "INDEX.md");

function fail(message) {
  console.error(`[tts] ${message}`);
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
// 树解析：把 ToAstLine(0) 的输出读成节点序列（类名 / src 起点 / 深度 / 是否 basic）
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
// 不用 src 起点，是因为增量实现会把前导/尾随 trivia 吃进 src 区间（见 README「实现缺陷」），
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
  // 双开关联动：`EnableIncrementalShapes` 是全场景逐字符形状路径的一级开关（bootstrap 阶段还没有
  // 消费方，翻它零行为变化）；`EnableIncrementalVariableShapes` 是变量声明族的既有开关（判定对象）。
  // incremental 模式两者同时打开，legacy 模式同时关闭——只用一个开关会漏掉「新路径是否影响时序」。
  StatementRouteUtil.EnableIncrementalShapes = enabled;
  StatementRouteUtil.EnableIncrementalVariableShapes = enabled;
}

// ---------------------------------------------------------------------------
// 单 case 判定
// ---------------------------------------------------------------------------
function shapeLines(tree) {
  const lines = [];
  for (const line of tree.split("\n")) {
    const decorated = NODE_RE.exec(line);
    if (decorated !== null) {
      // 只比较「类名 + pos + 文本字段」：src 区间会被增量实现吃进前后 trivia，那是实现缺陷，
      // 不是形状结构差异（见 README「顺带发现的增量实现缺陷」）。
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

function describeMismatch(expected, actual) {
  if (actual === "invalid" || actual === "divergent") return `结构异常（${actual}）`;
  const delta = SUPPORT_LEVEL[actual] - SUPPORT_LEVEL[expected];
  if (delta > 0) return `NOW-SUPPORTED（${supportLabel(SUPPORT_LEVEL[expected])} → ${supportLabel(SUPPORT_LEVEL[actual])}，更新目录标注）`;
  if (delta < 0) return `REGRESSION（${supportLabel(SUPPORT_LEVEL[expected])} → ${supportLabel(SUPPORT_LEVEL[actual])}）`;
  return "分类变化（支持级别相同）";
}

function evidence(record) {
  const classification = record.actual;
  if (classification === "throw" || classification === "divergent" || classification === "invalid") {
    return record.reason ?? "";
  }
  if (classification === "atomic") return "增量开关对逐字符树没有任何影响";
  if (classification === "partial") return `只有 ${record.earlierShapeNodes} 个骨架节点提前`;
  return `提前的 shape 节点：${record.earlierNodes.slice(0, 6).join(", ")}`;
}

function writeIndex(records) {
  const groups = new Map();
  for (const record of records) {
    const area = record.area === "" ? "（无分区）" : record.area;
    const key = record.expected + "/" + area;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  const lines = [
    "# INDEX — 增量形状支持范围 cases",
    "",
    "> 由 `node typescript/cases/tts/run.mjs --write-index` 生成，**不要手改**。",
    "> 分类口径与目录约定见 [README.md](README.md)。",
    "",
    `共 **${records.length}** 条 case：` +
      CLASSES.map((cls) => `${cls} ${records.filter((record) => record.expected === cls).length}`).join(" / "),
    "",
  ];
  for (const cls of CLASSES) {
    const groupKeys = [...groups.keys()].filter((key) => key.startsWith(cls + "/")).sort();
    if (groupKeys.length === 0) continue;
    lines.push(`## ${cls}`, "");
    for (const key of groupKeys) {
      const area = key.slice(cls.length + 1);
      lines.push(`### ${area}`, "");
      lines.push("| case | 判定依据 | 备注 |");
      lines.push("| --- | --- | --- |");
      for (const record of groups.get(key).sort((a, b) => a.id.localeCompare(b.id))) {
        const note = [];
        if (record.residualBasicLines > 0) note.push(`残留 basic 行 +${record.residualBasicLines}`);
        if (record.rangeOnlyDifference) note.push("EOF 区间含前导/尾随 trivia");
        if (record.tsValid === false) note.push("TS 语法不合法");
        lines.push(`| \`${record.id}\` | ${evidence(record).replace(/\|/g, "\\|")} | ${note.join("；")} |`);
      }
      lines.push("");
    }
  }
  fs.writeFileSync(INDEX_PATH, lines.join("\n"), "utf8");
  return INDEX_PATH;
}

function printCase(record) {
  const mark = record.pass ? "PASS" : "FAIL";
  console.log(`${mark}  ${record.id}`);
  console.log(`      expected=${record.expected}  actual=${record.actual}  steps=${record.steps}`);
  if (record.reason !== null) console.log(`      reason: ${record.reason}`);
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
const USAGE = `用法：node typescript/cases/tts/run.mjs [选项]

选项：
  --quiet               只打汇总（失败明细仍会打印）
  --filter <子串>       只跑相对路径包含该子串的 case（可重复）
  --show <case>         只跑一条并打印判定依据（可写相对路径 / 去 .ts 的名字）
  --json <path>         把逐条结果写成 JSON
  --write-index         重写本目录 INDEX.md
  -h, --help            显示本帮助

目录约定：cases/<class>/<area>/<name>.ts
  class = throw（增量模式显式抛错）/ atomic（开关对时序无影响）/
          partial（只有变量声明骨架增量）/ incremental（真正增量，对照 case）
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
    const expected = id.split("/")[0];
    if (!CLASSES.includes(expected)) fail(`case 的期望分类目录不合法：${id}（第一层必须是 ${CLASSES.join(" / ")}）`);
    const areaParts = id.split("/").slice(1, -1);
    const source = fs.readFileSync(file, "utf8");
    const problems = typescriptProblems(source, path.basename(file));
    let result;
    try {
      result = classify(source, id);
    } catch (exception) {
      result = { classification: "invalid", reason: exception instanceof Error ? exception.stack ?? exception.message : String(exception), steps: 0, earlierShapeNodes: 0, nonSkeletonEarlier: 0, earlierNodes: [], residualBasicLines: 0, rangeOnlyDifference: false };
    }
    const expectedClassification = result.classification;
    const tsValid = problems === null ? null : problems.length === 0;
    const record = {
      id,
      area: areaParts.length === 0 ? "" : areaParts[0],
      expected,
      actual: expectedClassification,
      pass: expectedClassification === expected && tsValid !== false,
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
  if (options.show !== null && failures.length > 0) {
    const failure = failures[0];
    const diagnosis =
      failure.actual === failure.expected && failure.tsValid === false
        ? "TS 语法不合法"
        : describeMismatch(failure.expected, failure.actual);
    console.log(`\n判定：expected=${failure.expected} actual=${failure.actual} —— ${diagnosis}`);
    if (failure.tsProblems.length > 0) console.log(`      TS: ${failure.tsProblems.join(" | ")}`);
  }

  const counts = {};
  for (const cls of CLASSES) counts[cls] = 0;
  for (const record of records) counts[record.actual] = (counts[record.actual] ?? 0) + 1;
  const expectedCounts = {};
  for (const cls of CLASSES) expectedCounts[cls] = records.filter((record) => record.expected === cls).length;

  if (!options.quiet || failures.length > 0) {
    console.log("");
    console.log(
      `[tts] ${records.length} 条 case：` +
        CLASSES.map((cls) => `${cls} 期望 ${expectedCounts[cls]} / 实测 ${counts[cls]}`).join(" · "),
    );
    for (const failure of failures) {
      const diagnosis =
        failure.actual === failure.expected && failure.tsValid === false
          ? "TS 语法不合法"
          : describeMismatch(failure.expected, failure.actual);
      console.log(`FAIL  ${failure.id}  expected=${failure.expected} actual=${failure.actual} —— ${diagnosis}`);
      if (failure.reason !== null) console.log(`      reason: ${failure.reason}`);
      if (failure.tsProblems.length > 0) console.log(`      TS: ${failure.tsProblems.join(" | ")}`);
    }
    console.log(`[tts] PASS ${records.length - failures.length} / FAIL ${failures.length} / ${records.length}`);
  }

  if (options.json !== null) {
    const outPath = path.resolve(root, options.json);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          generatedBy: "typescript/cases/tts/run.mjs",
          classes: CLASSES,
          total: records.length,
          counts,
          expectedCounts,
          failures: failures.map((failure) => failure.id),
          records,
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    if (!options.quiet) console.log(`[tts] JSON 已写入 ${outPath}`);
  }

  if (options.writeIndex) {
    const indexPath = writeIndex(records);
    if (!options.quiet) console.log(`[tts] INDEX 已写入 ${indexPath}`);
  }

  process.exitCode = failures.length === 0 ? 0 : 1;
}

main();
