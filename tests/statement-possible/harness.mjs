// 语句 possible 测试仪器（T1c，设计 §7）。
//
//   node tests/statement-possible/harness.mjs                       # 默认只跑 stage1 组
//   node tests/statement-possible/harness.mjs --all                 # 全部分组（未实现阶段自动 skip 并打印原因）
//   node tests/statement-possible/harness.mjs --group=asi,trivia     # 指定分组
//   node tests/statement-possible/harness.mjs --only=let,1*2+3       # 按用例名/源码/分组过滤
//   node tests/statement-possible/harness.mjs --file=cases.json      # 用例文件（对象分组或字符串数组）
//   node tests/statement-possible/harness.mjs --double-accept        # 只跑互斥仪器
//   node tests/statement-possible/harness.mjs --lint                 # ASI 单源 / 优先级单表探测
//   node tests/statement-possible/harness.mjs --verbose
//
// 三件套：
//   1. AST 逐节点对拍：SourceFileRunner.Parse + ast-compare.cjAst vs ts.createSourceFile + tsAst
//      （kind / pos / end / text / name / isTypeOnly / children），口径与 tests/member-possible 一致。
//   2. 形状对拍：ToXmlString() 逐字节。三条子判据：
//      a) 同一源码两次 Parse 的 XML 必须逐字节相同（确定性）；
//      b) 形状树里不得出现壳/向导节点（设计 I1：StatementShape 不进 AST）；
//      c) 若 StatementRouteUtil 已存在，把 EnableShellExpressions 置 false 再跑一次，
//         壳路径与 legacy 路径的 XML 必须逐字节相同（T1d 起成为真正的对拍门）。
//      若 tests/statement-possible/golden/<group>/<case>.xml 存在，还与它逐字节比。
//   3. 互斥仪器：运行期 monkeypatch CatalogGuide.ComputePossibleShapesByIndex（不改源码），
//      在每次判定时包住每个候选与 EndPossible 的 ComputeByIndex，逐格记录 Accept 集合：
//        * 「EndPossible + 任一普通候选同格 Accept」→ FAIL，打印宿主/下标/源码位置；
//        * 「0 存活候选且无终结候选」→ 记录（对应原型 A 的 28 个 crash 根因）。
//
// 退出码：失败用例 / 互斥冲突 / 0 存活候选 / lint 失败 → 1，否则 0。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createAstCore, cjAst, flatten, kindOf } from "../../typescript/cases/ast-compare.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const buildRoot = path.join(root, "build/ts");
const require = createRequire(import.meta.url);
const ts = require(path.join(root, "node_modules", "typescript"));
const { tsAst } = createAstCore(ts);

const GROUP_ORDER = ["dev", "stage1", "asi", "trivia", "route", "satisfies", "operators", "stage4", "stage5"];

/** 组能力 → 未满足时的 skip 原因。 */
const NEED_REASONS = {
  "root:RootExpressionStatementPossibleShape": "根目录未注册 RootExpressionStatementPossibleShape（Stage 1 T1d 未合并）",
  "root:IfStatementPossibleShape": "根目录未注册 IfStatementPossibleShape（Stage 4 未实现）",
  "module:statement-route-util": "build/ts 没有 typescript/tokens/statements/statement-route-util.js（Stage 1 T1d 未合并）",
  "shell-body-candidates": "语句壳 CatalogGuide 的体候选为空（Stage 5 未实现）",
};

// ---------------------------------------------------------------------------
// 参数
function parseArgs(argv) {
  const args = {
    all: argv.includes("--all"),
    doubleAccept: argv.includes("--double-accept"),
    lint: argv.includes("--lint"),
    verbose: argv.includes("--verbose"),
    groups: null,
    only: null,
    file: null,
  };
  const take = (name) => {
    const hit = argv.find((item) => item.startsWith(`--${name}=`));
    return hit === undefined ? null : hit.slice(name.length + 3).split(",").map((s) => s.trim()).filter(Boolean);
  };
  args.groups = take("group");
  args.only = take("only");
  args.file = take("file");
  return args;
}

// ---------------------------------------------------------------------------
// 生成物加载
function load(relative) {
  return require(path.join(buildRoot, relative));
}

function parseCj(source) {
  const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
  return SourceFileRunner.Parse(source, "case.ts");
}

function xmlOf(shape) {
  if (shape === null || shape === undefined || typeof shape.ToXmlString !== "function") {
    return null;
  }
  return shape.ToXmlString();
}

function describeError(error) {
  let message = "";
  for (let node = error; node; node = node.InnerException || node.innerException) {
    const text = node.Message || node.message;
    if (text) message = String(text);
  }
  return message.split("\n")[0] || "unknown error";
}

// ---------------------------------------------------------------------------
// 能力探测
let rootCandidateCache = null;
function rootCandidateNames() {
  if (rootCandidateCache !== null) return rootCandidateCache;
  try {
    const { SourceFileShape } = load("typescript/tokens/files/source-file-shape.js");
    rootCandidateCache = SourceFileShape.CreatePossibleShapes().map((shape) => shape.constructor.name);
  } catch {
    rootCandidateCache = [];
  }
  return rootCandidateCache;
}

function hasModule(relative) {
  try {
    load(relative);
    return true;
  } catch {
    return false;
  }
}

function probeShellBodyCandidates() {
  let found = false;
  try {
    const { CatalogGuide } = load("core/syntax/catalog-guide.js");
    const { StatementShape } = load("typescript/tokens/statements/statement-shape.js");
    const original = CatalogGuide.prototype.ComputePossibleShapesByIndex;
    CatalogGuide.prototype.ComputePossibleShapesByIndex = function (host, tokenIndex, context) {
      if (host instanceof StatementShape && this.PossibleShapes.length > 0) found = true;
      return original.call(this, host, tokenIndex, context);
    };
    try {
      parseCj("let a = 1, b = 2;");
    } finally {
      CatalogGuide.prototype.ComputePossibleShapesByIndex = original;
    }
  } catch {
    return false;
  }
  return found;
}

const capabilityCache = new Map();
function capability(need) {
  if (capabilityCache.has(need)) return capabilityCache.get(need);
  let value = false;
  if (need.startsWith("root:")) value = rootCandidateNames().includes(need.slice("root:".length));
  else if (need.startsWith("module:")) value = hasModule(`typescript/tokens/statements/${need.slice("module:".length)}.js`);
  else if (need === "shell-body-candidates") value = probeShellBodyCandidates();
  capabilityCache.set(need, value);
  return value;
}

function routeUtil() {
  try {
    return load("typescript/tokens/statements/statement-route-util.js").StatementRouteUtil;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 互斥仪器
const SHAPE_ACCEPT = 1;
const SHAPE_REJECT = 0;

function createInstrument() {
  const { CatalogGuide } = load("core/syntax/catalog-guide.js");
  const original = CatalogGuide.prototype.ComputePossibleShapesByIndex;
  const state = {
    paused: false,
    currentSource: "",
    cells: 0,
    candidateCalls: 0,
    endCalls: 0,
    acceptCells: 0,
    waitingNoCandidate: 0,
    conflicts: [],
    noCandidate: [],
    parsed: 0,
    installed: false,
  };

  function describe(host, tokenIndex) {
    const range = host.SourceRange || {};
    const start = typeof range.StartIndex === "number" ? range.StartIndex : -1;
    const end = typeof range.EndIndex === "number" ? range.EndIndex : -1;
    const token = host.Data ? host.Data[tokenIndex] : undefined;
    const tokenRange = token && token.SourceRange ? token.SourceRange : {};
    const tokenStart = typeof tokenRange.StartIndex === "number" ? tokenRange.StartIndex : -1;
    const tokenEnd = typeof tokenRange.EndIndex === "number" ? tokenRange.EndIndex : -1;
    let text = "";
    if (tokenStart >= 0 && tokenEnd >= tokenStart && tokenEnd <= state.currentSource.length) {
      text = state.currentSource.slice(tokenStart, tokenEnd);
    }
    return `${host.constructor.name}[${start},${end}) token#${tokenIndex}[${tokenStart},${tokenEnd}) ${JSON.stringify(text)}`;
  }

  const instrumented = function (host, tokenIndex, context) {
    if (state.paused) {
      return original.call(this, host, tokenIndex, context);
    }
    state.cells++;
    const records = [];
    const restores = [];
    const possibleShapes = this.PossibleShapes || [];
    for (const shape of possibleShapes) {
      const target = shape.ComputeByIndex;
      if (typeof target !== "function") continue;
      const wrapper = function (...callArgs) {
        const result = target.apply(shape, callArgs);
        state.candidateCalls++;
        if (!state.paused) records.push({ name: shape.constructor.name, result });
        return result;
      };
      try {
        shape.ComputeByIndex = wrapper;
        restores.push(() => { delete shape.ComputeByIndex; });
      } catch {
        // 冻结对象：放弃这一格的记录，判定本身不受影响。
      }
    }
    const endPossible = this.EndPossible;
    let endRecord = null;
    if (endPossible && typeof endPossible.ComputeByIndex === "function") {
      const target = endPossible.ComputeByIndex;
      const wrapper = function (...callArgs) {
        const result = target.apply(endPossible, callArgs);
        state.endCalls++;
        if (!state.paused) endRecord = { name: endPossible.constructor.name, result };
        return result;
      };
      try {
        endPossible.ComputeByIndex = wrapper;
        restores.push(() => { delete endPossible.ComputeByIndex; });
      } catch {
        // 同上。
      }
    }
    let error = null;
    try {
      return original.call(this, host, tokenIndex, context);
    } catch (thrown) {
      error = thrown;
      throw thrown;
    } finally {
      for (const restore of restores) restore();
      if (!state.paused) {
        const accepts = records.filter((record) => record.result === SHAPE_ACCEPT);
        const survivors = records.filter((record) => record.result !== SHAPE_REJECT);
        const endAccept = endRecord !== null && endRecord.result === SHAPE_ACCEPT;
        if (endAccept && accepts.length > 0) {
          state.conflicts.push({
            where: describe(host, tokenIndex),
            accepts: accepts.map((record) => record.name),
            end: endRecord.name,
            via: "same-cell",
          });
        } else if (error !== null) {
          const message = String(error.Message || error.message || "");
          if (message.includes("终结候选与其它候选同时成立")) {
            state.conflicts.push({
              where: describe(host, tokenIndex),
              accepts: accepts.map((record) => record.name),
              end: endRecord === null ? "?" : endRecord.name,
              via: "core-throw",
            });
          }
        }
        if (survivors.length === 0 && !endAccept && endPossible === null) {
          state.noCandidate.push({ where: describe(host, tokenIndex), asked: records.length });
        } else if (survivors.length === 0 && !endAccept) {
          state.waitingNoCandidate++;
        }
        if (accepts.length > 0) state.acceptCells++;
      }
    }
  };

  return {
    state,
    install() {
      if (state.installed) return;
      CatalogGuide.prototype.ComputePossibleShapesByIndex = instrumented;
      state.installed = true;
    },
    uninstall() {
      if (!state.installed) return;
      CatalogGuide.prototype.ComputePossibleShapesByIndex = original;
      state.installed = false;
    },
    resetCounters() {
      state.cells = 0;
      state.candidateCalls = 0;
      state.endCalls = 0;
      state.acceptCells = 0;
      state.waitingNoCandidate = 0;
    },
  };
}

// ---------------------------------------------------------------------------
// AST 对拍（与 tests/member-possible 同口径）
function firstDifference(tsNodes, cjNodes) {
  const tsFlat = flatten(tsNodes);
  const cjFlat = flatten(cjNodes);
  const count = Math.min(tsFlat.length, cjFlat.length);
  for (let index = 0; index < count; index++) {
    const left = tsFlat[index];
    const right = cjFlat[index];
    const leftKind = kindOf(left.kind);
    const rightKind = kindOf(right.kind);
    if (leftKind !== rightKind) {
      return `#${index} kind: TS=${leftKind} CJ=${rightKind}`;
    }
    if (left.pos !== right.pos || left.end !== right.end) {
      return `#${index} ${leftKind} range: TS=[${left.pos},${left.end}) CJ=[${right.pos},${right.end})`;
    }
    for (const field of ["text", "name", "isTypeOnly"]) {
      if (JSON.stringify(left[field]) !== JSON.stringify(right[field])) {
        return `#${index} ${leftKind} ${field}: TS=${JSON.stringify(left[field])} CJ=${JSON.stringify(right[field])}`;
      }
    }
  }
  if (tsFlat.length !== cjFlat.length) {
    return `节点数：TS=${tsFlat.length} CJ=${cjFlat.length}`;
  }
  return null;
}

function firstXmlDifference(left, right) {
  const count = Math.min(left.length, right.length);
  for (let index = 0; index < count; index++) {
    if (left[index] !== right[index]) {
      const from = Math.max(0, index - 60);
      return `第 ${index} 个字符起不同：\n      左: ...${left.slice(from, index + 120)}\n      右: ...${right.slice(from, index + 120)}`;
    }
  }
  if (left.length !== right.length) {
    return `长度不同：左 ${left.length} / 右 ${right.length}`;
  }
  return null;
}

// 用例
function runCase(groupName, caseDef, instrument) {
  // 开发期专用 cases：forceShell=true 时把受测路径钉死在新壳路径上（与全局开关默认值无关），
  // 跑完恢复原值，避免污染同进程后续用例。
  const route = routeUtil();
  const previous = route === null ? null : route.EnableShellExpressions;
  if (route !== null && caseDef.forceShell === true) {
    route.EnableShellExpressions = true;
  }
  try {
    return runCaseBody(groupName, caseDef, instrument);
  } finally {
    if (route !== null && caseDef.forceShell === true) {
      route.EnableShellExpressions = previous;
    }
  }
}

function runCaseBody(groupName, caseDef, instrument) {
  const source = caseDef.source;
  const problems = [];
  const notes = [];
  const file = ts.createSourceFile("case.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const diagnostics = (file.parseDiagnostics || []).length;
  const allowDiagnostics = caseDef.allowTsDiagnostics === true;

  const beforeCalls = instrument.state.candidateCalls;
  instrument.state.currentSource = source;
  let rootShape = null;
  try {
    rootShape = parseCj(source);
  } catch (error) {
    instrument.state.currentSource = "";
    if (diagnostics > 0) {
      return { status: "skip", reason: `CJ 解析抛错且 TS 有 ${diagnostics} 个语法诊断（不合法输入，不作判据）` };
    }
    if (caseDef.uncovered !== undefined) {
      const verdict = classifyUncovered(caseDef, { ok: false, err: describeError(error) }, instrument);
      if (verdict.ok) {
        return { status: "uncovered", reason: verdict.reason, evidence: verdict.evidence, problems: [`CJ 解析抛错：${describeError(error)}`], notes, caseCalls: 0 };
      }
      return { status: "fail", problems: [`CJ 解析抛错：${describeError(error)}`, verdict.problem], notes };
    }
    return { status: "fail", problems: [`CJ 解析抛错：${describeError(error)}`], notes };
  }
  instrument.state.parsed++;
  const caseCalls = instrument.state.candidateCalls - beforeCalls;
  const xml = xmlOf(rootShape);
  if (xml === null) {
    notes.push("SourceFileShape 没有 ToXmlString()，形状对拍跳过");
  } else {
    for (const tag of ["StatementShape", "PossibleShape", "CatalogGuide"]) {
      if (xml.includes(`<${tag}>`)) problems.push(`形状树泄漏节点 <${tag}>（设计 I1：壳不进 AST）`);
    }
  }

  if (diagnostics > 0 && !allowDiagnostics) {
    return {
      status: "skip",
      reason: `TS 语法诊断 ${diagnostics} 个（恢复路径不进 AST 对拍；互斥仪器已跑）`,
      notes: notes.concat(`candidateCalls=${caseCalls}`),
      caseCalls,
    };
  }

  const tsNodes = file.statements.map(tsAst);
  const cjNodes = rootShape.Data.map(cjAst);
  const astDiff = firstDifference(tsNodes, cjNodes);
  if (astDiff !== null && caseDef.knownBaselineFail === true) {
    // 已知基线缺陷：显式列出来，既不算 PASS 也不算 FAIL。它在基线 e335f1fb 上就存在，
    // 由 token-ast 语料常驻跟踪；这里保留用例是为了让 Stage 之间能看见它是变好还是变坏。
    return {
      status: "known",
      problems: [`AST 差异（已知基线缺陷）：${astDiff}`],
      notes,
      caseCalls,
    };
  }
  if (astDiff !== null) problems.push(`AST 差异：${astDiff}`);

  if (xml !== null) {
    // a) 确定性：同一源码两次 Parse 的 XML 必须逐字节相同。
    instrument.state.paused = true;
    let xmlAgain = null;
    try {
      xmlAgain = xmlOf(parseCj(source));
    } catch (error) {
      problems.push(`第二次 Parse 抛错：${describeError(error)}`);
    } finally {
      instrument.state.paused = false;
    }
    if (xmlAgain !== null) {
      const diff = firstXmlDifference(xml, xmlAgain);
      if (diff !== null) problems.push(`XML 非确定：${diff}`);
    }
    // b) 壳路径 vs legacy 路径（StatementRouteUtil 存在时）。
    const route = routeUtil();
    if (route !== null && typeof route.EnableShellExpressions === "boolean" && caseDef.skipLegacyCompare !== true) {
      const previous = route.EnableShellExpressions;
      instrument.state.paused = true;
      let legacyXml = null;
      try {
        route.EnableShellExpressions = false;
        legacyXml = xmlOf(parseCj(source));
      } catch (error) {
        problems.push(`legacy 路径 Parse 抛错：${describeError(error)}`);
      } finally {
        route.EnableShellExpressions = previous;
        instrument.state.paused = false;
      }
      if (legacyXml !== null) {
        const diff = firstXmlDifference(xml, legacyXml);
        if (diff !== null) problems.push(`壳路径与 legacy 路径 XML 不同：${diff}`);
        else notes.push("壳路径 XML == legacy 路径 XML");
      }
    } else {
      notes.push("StatementRouteUtil 不存在：壳/legacy 双路对拍暂缺（T1d 起生效）");
    }
    // c) 基线 golden（存在才比；由集成 owner 在 T1d/Stage 3 落盘）。
    const goldenPath = path.join(here, "golden", groupName, `${caseDef.name}.xml`);
    if (fs.existsSync(goldenPath)) {
      const golden = fs.readFileSync(goldenPath, "utf8");
      const diff = firstXmlDifference(golden, xml);
      if (diff !== null) problems.push(`与 golden 不同：${diff}`);
    }
  }

  if (problems.length > 0) {
    if (caseDef.uncovered !== undefined) {
      const shellOutcome = xml === null ? { ok: false, err: "无 XML" } : { ok: true, xml };
      const verdict = classifyUncovered(caseDef, shellOutcome, instrument);
      if (verdict.ok) {
        return { status: "uncovered", reason: verdict.reason, evidence: verdict.evidence, problems, notes, caseCalls };
      }
      problems.push(verdict.problem);
    }
    return { status: "fail", problems, notes, caseCalls };
  }
  return { status: "pass", notes, caseCalls };
}

// ---------------------------------------------------------------------------
// 「本 Stage 不覆盖」标注（uncovered={reason}）：不是允许失败，必须带证据。
// 只有同时满足才算 uncovered，否则照样 FAIL：
//   1) reason 非空；
//   2) 开关 true 的结局（抛错文本 / XML）能与开关 false（legacy = 基线）对拍；
//   3) 结论为「与基线一致」：抛同一异常文本，或 XML 逐字节相同。
// legacy 成功而 true 抛错、或 XML 不同 → 新路径引入差异，不许标 uncovered。
function legacyOutcome(source, instrument) {
  const route = routeUtil();
  if (route === null) {
    return { ok: false, err: "StatementRouteUtil 不存在（无法取 fallback 基线）" };
  }
  const previous = route.EnableShellExpressions;
  instrument.state.paused = true;
  try {
    route.EnableShellExpressions = false;
    return { ok: true, xml: xmlOf(parseCj(source)) };
  } catch (error) {
    return { ok: false, err: describeError(error) };
  } finally {
    route.EnableShellExpressions = previous;
    instrument.state.paused = false;
  }
}

function classifyUncovered(caseDef, shell, instrument) {
  const reason = caseDef.uncovered === undefined ? "" : (caseDef.uncovered.reason || "");
  if (typeof reason !== "string" || reason.trim() === "") {
    return { ok: false, problem: "uncovered 标注必须有非空 reason" };
  }
  const legacy = legacyOutcome(caseDef.source, instrument);
  if (!shell.ok) {
    if (!legacy.ok) {
      if (legacy.err !== shell.err) {
        return { ok: false, problem: `uncovered 证据不足：true 抛「${shell.err}」，legacy 抛「${legacy.err}」` };
      }
      return { ok: true, reason, evidence: `true 与 legacy 抛同一异常「${shell.err}」→ 与基线逐字一致` };
    }
    return { ok: false, problem: `uncovered 不成立：true 抛「${shell.err}」而 legacy 解析成功（回归）` };
  }
  if (!legacy.ok) {
    return { ok: false, problem: `uncovered 不成立：true 解析成功而 legacy 抛「${legacy.err}」` };
  }
  const diff = firstXmlDifference(shell.xml, legacy.xml);
  if (diff !== null) {
    return { ok: false, problem: `uncovered 不成立：true/legacy XML 不同（${diff}）` };
  }
  return { ok: true, reason, evidence: "true XML == legacy XML（逐字节）→ 与基线一致" };
}

// ---------------------------------------------------------------------------
// 用例加载
function loadCaseFile(args) {
  const file = args.file === null ? path.join(here, "cases.json") : path.resolve(root, args.file[0]);
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  if (Array.isArray(parsed)) {
    return { file, groups: { file: { description: "字符串数组（--file 兼容）", needs: [], cases: parsed.map((source, index) => ({ name: `file-${index}`, source })) } } };
  }
  return { file, groups: parsed.groups || {} };
}

function selectGroups(args, caseData) {
  const requested = args.all ? GROUP_ORDER : args.groups !== null ? args.groups : ["stage1"];
  const groups = [];
  for (const name of requested) {
    const group = caseData.groups[name];
    if (group === undefined) {
      groups.push({ name, group: null, missing: true });
    } else {
      groups.push({ name, group, missing: false });
    }
  }
  return groups;
}

function filterCases(group, args) {
  if (args.only === null) return group.cases;
  const needles = args.only.map((item) => item.toLowerCase());
  return group.cases.filter((caseDef) => {
    const hay = [caseDef.name, caseDef.source, group.description || "", ...(group.needs || [])].join(" ").toLowerCase();
    return needles.some((needle) => hay.includes(needle));
  });
}

// ---------------------------------------------------------------------------
// lint
function walkJs(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, out);
    else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

/** 从 `{` 起做括号匹配，跳过字符串 / 模板 / 注释。 */
function braceBody(text, openIndex) {
  let depth = 0;
  let inString = null;
  let inLineComment = false;
  let inBlockComment = false;
  for (let index = openIndex; index < text.length; index++) {
    const ch = text[index];
    const next = text[index + 1];
    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        index++;
      }
      continue;
    }
    if (inString !== null) {
      if (ch === "\\") {
        index++;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLineComment = true;
      index++;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      index++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(openIndex + 1, index);
    }
  }
  return null;
}

const relativeOf = (file) => path.relative(buildRoot, file).split(path.sep).join("/");

/**
 * T1a 合并后的 ASI 实现点白名单。
 * 基线校准为 2 点：expression-statement + type-alias-declaration。
 * T1a 之后判据本体收敛到 StatementBoundaryUtil，expression-statement 只剩单行委托，
 * 不再算实现点；type-alias-declaration 保留类型层自己的实现（设计 §2.2 允许），
 * 因此合并后的实现点 = statement-boundary-util + type-alias-declaration。
 */
const ASI_IMPL_UTIL = "typescript/tokens/statements/statement-boundary-util.js";

/** 允许与 StatementBoundaryUtil 并存的类型层实现点（仅此项，语句层不得再有第二份）。 */
const ASI_IMPL_TYPE_LAYER = new Set([
  "typescript/tokens/declarations/type-alias-declaration-possible-shape.js",
]);

const ASI_IMPL_ALLOWED = new Set([
  ASI_IMPL_UTIL,
  ...ASI_IMPL_TYPE_LAYER,
]);

/** 设计 §4.3：除 operator-table.* 外不允许出现优先级数字表。基线的已知噪声单独列明。 */
const PRECEDENCE_KNOWN_BASELINE = [
  {
    file: "typescript/tokens/expressions/expression-builder.js",
    match: "const precedence = 11",
    reason: "`as` 的固定优先级 11；设计 §4.3 要求 Stage 3 迁入 OperatorTable.AsPrecedence",
  },
];

function runLint(verbose) {
  const files = walkJs(buildRoot);
  const impls = [];
  const delegates = [];
  const precedenceDefs = [];
  const precedenceNumbers = [];
  const problems = [];
  const notes = [];

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const rel = relativeOf(file);
    if (text.includes("IsAsiBoundary")) {
      const pattern = /(?:^|[\s;{}])((?:static\s+)?)IsAsiBoundary\s*\(([^)]*)\)\s*\{/g;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const open = text.indexOf("{", match.index);
        const body = braceBody(text, open);
        if (body === null) continue;
        const line = text.slice(0, match.index).split("\n").length;
        const compact = body
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/[^\n]*/g, "")
          .trim();
        const isDelegate = /^return\s+[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\s*\.\s*IsAsiBoundary\s*\(/.test(compact);
        const entry = { file: rel, line, params: match[2].trim(), size: compact.length };
        if (isDelegate) delegates.push(entry);
        else impls.push(entry);
      }
    }
    if (/(?:^|[\s;{}])static\s+Precedence\s*\([^)]*\)\s*\{/.test(text)) {
      precedenceDefs.push(rel);
    }
    const numberPattern = /\b(?:const|let|var)\s+precedence\s*=\s*(?:1[0-5]|[1-9])\b/g;
    let numberMatch;
    while ((numberMatch = numberPattern.exec(text)) !== null) {
      const line = text.slice(0, numberMatch.index).split("\n").length;
      precedenceNumbers.push({ file: rel, line, text: numberMatch[0] });
    }
  }

  console.log("[lint] ASI 判据定义点");
  for (const impl of impls) console.log(`  impl      ${impl.file}:${impl.line} (${impl.params}) body=${impl.size}B`);
  for (const delegate of delegates) console.log(`  delegate  ${delegate.file}:${delegate.line} (${delegate.params})`);
  if (impls.length === 0) problems.push("找不到 IsAsiBoundary 的实现（设计 §2.2 要求判据本体唯一）");
  for (const impl of impls) {
    if (!ASI_IMPL_ALLOWED.has(impl.file)) problems.push(`IsAsiBoundary 出现第二份实现：${impl.file}:${impl.line}（设计 R1）`);
  }
  const utilImpl = impls.some((impl) => impl.file === ASI_IMPL_UTIL);
  if (utilImpl) {
    for (const impl of impls) {
      if (impl.file !== ASI_IMPL_UTIL && !ASI_IMPL_TYPE_LAYER.has(impl.file)) {
        problems.push(`StatementBoundaryUtil 已存在但 ${impl.file}:${impl.line} 仍是函数体，应改为单行委托`);
      }
    }
  }
  for (const delegate of delegates) {
    if (delegate.size > 400) problems.push(`委托体过大（${delegate.size}B），疑似第二份实现：${delegate.file}:${delegate.line}`);
  }

  console.log("[lint] 优先级来源");
  for (const def of precedenceDefs) console.log(`  Precedence 定义 ${def}`);
  const foreignDefs = precedenceDefs.filter((rel) => !rel.endsWith("operator-table.js"));
  if (foreignDefs.length > 0) problems.push(`Precedence 定义出现在 operator-table 之外：${foreignDefs.join(", ")}（设计 §4.3）`);
  if (!precedenceDefs.some((rel) => rel.endsWith("operator-table.js"))) problems.push("operator-table.js 里找不到 Precedence 定义");

  const known = [];
  for (const entry of precedenceNumbers) {
    const allow = PRECEDENCE_KNOWN_BASELINE.find((item) => item.file === entry.file && item.match === entry.text);
    if (allow === undefined) {
      problems.push(`operator-table 之外的优先级数字：${entry.file}:${entry.line} ${entry.text}（设计 §4.3 禁止第二份表）`);
    } else {
      known.push(entry);
      console.log(`  KNOWN     ${entry.file}:${entry.line} ${entry.text} —— ${allow.reason}`);
    }
  }
  if (known.length === 0 && precedenceNumbers.length === 0) notes.push("无优先级数字字面量（全部经 OperatorTable）");

  const table = fs.readFileSync(path.join(buildRoot, "typescript/tokens/expressions/operator-table.js"), "utf8");
  const numericReturns = (table.match(/return\s+(?:1[0-5]|[4-9])\s*;/g) || []).length;
  console.log(`[lint] OperatorTable 数字优先级条目=${numericReturns}`);
  if (numericReturns < 10) problems.push(`operator-table.js 的优先级数字条目只有 ${numericReturns} 条，疑似表被搬走`);

  if (verbose) {
    for (const note of notes) console.log(`[lint] note: ${note}`);
  }
  if (problems.length > 0) {
    for (const problem of problems) console.log(`[lint] FAIL ${problem}`);
    console.log(`[lint] 结果：FAIL（${problems.length} 项）`);
    return false;
  }
  console.log("[lint] 结果：PASS（ASI 实现唯一 / 优先级数字表只在 operator-table）");
  return true;
}

// ---------------------------------------------------------------------------
// 运行
function reportConflicts(instrument) {
  const { conflicts, noCandidate, cells, candidateCalls, endCalls, acceptCells, waitingNoCandidate } = instrument.state;
  console.log(
    `[statement-possible] 互斥仪器: cells=${cells} candidateCalls=${candidateCalls} endCalls=${endCalls} ` +
      `acceptCells=${acceptCells} waitingNoCandidate=${waitingNoCandidate}`,
  );
  if (noCandidate.length > 0) {
    console.log(`[statement-possible] 0 存活候选且无终结候选（crash 根因）: ${noCandidate.length} 格`);
    for (const item of noCandidate.slice(0, 10)) console.log(`  NO-CANDIDATE ${item.where} asked=${item.asked}`);
  }
  if (conflicts.length === 0) {
    console.log("[statement-possible] double-accept 冲突: 0");
    return 0;
  }
  console.log(`[statement-possible] double-accept 冲突: ${conflicts.length}`);
  for (const conflict of conflicts.slice(0, 20)) {
    console.log(`  CONFLICT ${conflict.where}`);
    console.log(`    accepts=[${conflict.accepts.join(",")}] end=${conflict.end} via=${conflict.via}`);
  }
  return conflicts.length;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(buildRoot)) {
    console.error(`[statement-possible] build/ts 不存在：先跑 xl build（core+typescript → ts）再 tsc。`);
    console.error(`[statement-possible] 期望目录：${buildRoot}`);
    process.exitCode = 1;
    return;
  }
  if (args.lint) {
    process.exitCode = runLint(args.verbose) ? 0 : 1;
    return;
  }

  const caseData = loadCaseFile(args);
  const instrument = createInstrument();
  instrument.install();
  try {
    if (args.doubleAccept) {
      let cases = 0;
      let failed = 0;
      for (const name of GROUP_ORDER) {
        const group = caseData.groups[name];
        if (group === undefined) continue;
        for (const caseDef of filterCases(group, args)) {
          cases++;
          instrument.state.currentSource = caseDef.source;
          instrument.state.conflicts = [];
          instrument.state.noCandidate = [];
          try {
            parseCj(caseDef.source);
          } catch (error) {
            const file = ts.createSourceFile("case.ts", caseDef.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
            if ((file.parseDiagnostics || []).length > 0) continue;
            failed++;
            console.log(`FAIL  ${name}/${caseDef.name} 解析抛错：${describeError(error)}`);
            continue;
          }
          if (instrument.state.conflicts.length > 0 || instrument.state.noCandidate.length > 0) failed++;
          if (args.verbose) console.log(`CASE  ${name}/${caseDef.name} conflicts=${instrument.state.conflicts.length} noCandidate=${instrument.state.noCandidate.length}`);
        }
      }
      const conflicts = reportConflicts(instrument);
      console.log(`[statement-possible] double-accept: cases=${cases} failed=${failed}`);
      process.exitCode = conflicts > 0 || instrument.state.noCandidate.length > 0 || failed > 0 ? 1 : 0;
      return;
    }

    const groups = selectGroups(args, caseData);
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let totalKnown = 0;
    let totalUncovered = 0;
    let groupsRun = 0;
    let groupsSkipped = 0;
    const failures = [];

    for (const entry of groups) {
      if (entry.missing) {
        console.log(`SKIP  group ${entry.name} —— cases.json 里没有这个分组`);
        groupsSkipped++;
        continue;
      }
      const { name, group } = entry;
      const unmet = (group.needs || []).filter((need) => !capability(need));
      if (unmet.length > 0) {
        groupsSkipped++;
        console.log(`SKIP  group ${name} —— ${unmet.map((need) => NEED_REASONS[need] || `缺少能力 ${need}`).join("；")}`);
        continue;
      }
      const cases = filterCases(group, args);
      if (cases.length === 0) {
        console.log(`SKIP  group ${name} —— --only 没有匹配到用例`);
        groupsSkipped++;
        continue;
      }
      groupsRun++;
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      let uncovered = 0;
      for (const caseDef of cases) {
        const result = runCase(name, caseDef, instrument);
        if (result.status === "pass") {
          passed++;
          if (args.verbose) console.log(`PASS  ${name}/${caseDef.name} calls=${result.caseCalls}`);
        } else if (result.status === "skip") {
          skipped++;
          console.log(`SKIP  ${name}/${caseDef.name} —— ${result.reason}`);
                } else if (result.status === "uncovered") {
          uncovered++;
          totalUncovered++;
          console.log(`UNCOVERED ${name}/${caseDef.name}  ${JSON.stringify(caseDef.source)}`);
          console.log(`      理由: ${result.reason}`);
          console.log(`      证据: ${result.evidence}`);
        } else if (result.status === "known") {
          totalKnown++;
          console.log(`KNOWN ${name}/${caseDef.name}  ${JSON.stringify(caseDef.source)}`);
          for (const problem of result.problems) console.log(`      ${problem}`);
        } else {
          failed++;
          console.log(`FAIL  ${name}/${caseDef.name}  ${JSON.stringify(caseDef.source)}`);
          for (const problem of result.problems) console.log(`      ${problem}`);
          failures.push({ group: name, name: caseDef.name, problems: result.problems });
        }
      }
      totalPassed += passed;
      totalFailed += failed;
      totalSkipped += skipped;
      totalUncovered += uncovered;
      console.log(`[group] ${name}: pass=${passed} fail=${failed} skip=${skipped} uncovered=${uncovered}`);
    }

    const conflicts = reportConflicts(instrument);
    console.log(
      `[statement-possible] groups run=${groupsRun} skipped=${groupsSkipped} | cases pass=${totalPassed} fail=${totalFailed} skip=${totalSkipped} known=${totalKnown} uncovered=${totalUncovered}`,
    );
    if (failures.length > 0) {
      console.log("[statement-possible] 失败用例：");
      for (const failure of failures) console.log(`  ${failure.group}/${failure.name}: ${failure.problems.join(" | ")}`);
    }
    process.exitCode = totalFailed > 0 || conflicts > 0 || instrument.state.noCandidate.length > 0 ? 1 : 0;
  } finally {
    instrument.uninstall();
  }
}

main();
