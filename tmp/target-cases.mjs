// T4 目标用例探针：双触发源 possible（Close / BracketCreate）的逐条基线。
//
//   node tmp/target-cases.mjs                 # 表格 + 汇总（report-only，退出码 0）
//   node tmp/target-cases.mjs --strict        # 有 error / diff 即退出码 1
//   node tmp/target-cases.mjs --only=if,switch # 按文件名过滤
//   node tmp/target-cases.mjs --json          # 机器可读
//
// 对每条 case 做三件事：
//   1. 逐字对拍：SourceFileRunner.Parse 的 CJ AST vs ts.createSourceFile 的 TS AST
//      （口径与 tests/statement-possible/harness.mjs 一致：ast-compare 的 flatten/kindOf）；
//   2. 确定性：同一源码 Parse 两次，ToAstLine(0) 必须逐字节相同；
//   3. 文件级回退取证：每次 Parse 之后立刻读 StatementRouteUtil.LastFileFallback，
//      标出「整条文件靠 legacy 才通过」的 case（LastFileFallback）。
//
// status 取值：ok / moved / diff / error / fallback
//   - error     Parse 抛异常（首跳 = 异常首行）
//   - diff      kind 序列 / 节点数 / text·name·isTypeOnly 不同
//   - moved     kind 序列相同但 pos/end 不同（结构同、位置挪）
//   - ok        逐字相同
//   - fallback  Parse 之后 LastFileFallback 为真（整条文件回退 legacy）——
//               match 列仍给 ok/moved/diff，说明回退后是否仍对得上
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createAstCore, cjAst, flatten, kindOf } from "../typescript/cases/ast-compare.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const buildRoot = path.join(root, "build", "ts");
const caseDir = path.join(root, "tests", "cases", "all-possible-1027");
const require = createRequire(import.meta.url);
const ts = require(path.join(root, "node_modules", "typescript"));
const { tsAst } = createAstCore(ts);

const args = process.argv.slice(2);
const flags = {
  strict: args.includes("--strict"),
  json: args.includes("--json"),
  verbose: args.includes("--verbose"),
  only: (() => {
    const hit = args.find((item) => item.startsWith("--only="));
    return hit === undefined ? null : hit.slice("--only=".length).split(",").map((s) => s.trim()).filter(Boolean);
  })(),
};

function load(relative) {
  return require(path.join(buildRoot, relative));
}

function fatal(message) {
  console.error(`TARGET-CASES: ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(path.join(buildRoot, "typescript/run/source-file-runner.js"))) {
  fatal(
    `build/ts 不存在（期望 ${path.relative(root, buildRoot)}）。先跑 ` +
      `xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"]) 再 node node_modules/typescript/bin/tsc -p .`,
  );
  process.exit(1);
}
if (!fs.existsSync(caseDir)) {
  fatal(`用例目录不存在：${path.relative(root, caseDir)}（先跑 node tmp/gen-cases.mjs）`);
  process.exit(1);
}

const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
let route = null;
try {
  route = load("typescript/tokens/statements/statement-route-util.js").StatementRouteUtil;
} catch {
  route = null;
}

/** 用例文件头指令 → { note, expect }；正文口径与 tests/cases/case-file.mjs 的 caseBody 一致。 */
function readCase(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split("\n").map((line) => (line.endsWith("\r") ? line.slice(0, -1) : line));
  const directive = (key) => {
    const hit = lines.find((line) => new RegExp(`^//\\s*xl:${key}\\s`).test(line));
    return hit === undefined ? null : hit.replace(new RegExp(`^//\\s*xl:${key}\\s*`), "").trim();
  };
  const body = lines
    .filter((line) => !/^\/\/\s*xl:/.test(line))
    .join("\n")
    .replace(/^\s*\n/, "")
    .replace(/\s+$/, "");
  return {
    name: path.basename(filePath, ".ts"),
    file: path.basename(filePath),
    note: directive("note") ?? "",
    expect: directive("expect") ?? null,
    source: body,
  };
}

/** 逐字对拍 → { match: ok|moved|diff, detail, tsCount, cjCount } */
function compare(tsNodes, cjNodes) {
  const left = flatten(tsNodes);
  const right = flatten(cjNodes);
  const count = Math.min(left.length, right.length);
  let kindDiff = null;
  let fieldDiff = null;
  let rangeDiff = null;
  for (let index = 0; index < count; index++) {
    const lk = kindOf(left[index].kind);
    const rk = kindOf(right[index].kind);
    if (lk !== rk) {
      kindDiff = `#${index} kind: TS=${lk} CJ=${rk}`;
      break;
    }
    if (left[index].pos !== right[index].pos || left[index].end !== right[index].end) {
      if (rangeDiff === null) {
        rangeDiff = `#${index} ${lk} range: TS=[${left[index].pos},${left[index].end}) CJ=[${right[index].pos},${right[index].end})`;
      }
    }
    for (const field of ["text", "name", "isTypeOnly"]) {
      if (JSON.stringify(left[index][field]) !== JSON.stringify(right[index][field]) && fieldDiff === null) {
        fieldDiff = `#${index} ${lk} ${field}: TS=${JSON.stringify(left[index][field])} CJ=${JSON.stringify(right[index][field])}`;
      }
    }
  }
  const counts = { tsCount: left.length, cjCount: right.length };
  if (kindDiff !== null) return { match: "diff", detail: kindDiff, ...counts };
  if (left.length !== right.length) {
    return { match: "diff", detail: `节点数：TS=${left.length} CJ=${right.length}`, ...counts };
  }
  if (fieldDiff !== null) return { match: "diff", detail: fieldDiff, ...counts };
  if (rangeDiff !== null) return { match: "moved", detail: rangeDiff, ...counts };
  return { match: "ok", detail: "", ...counts };
}

function describeError(error) {
  let message = "";
  for (let node = error; node; node = node.InnerException || node.innerException || node.cause) {
    const text = node.Message || node.message;
    if (text) message = String(text);
  }
  return (message.split("\n")[0] || "unknown error").slice(0, 160);
}

function astLineOf(shape) {
  if (shape === null || shape === undefined || typeof shape.ToAstLine !== "function") return null;
  return shape.ToAstLine(0);
}

/** LastFileFallback 的含义是「shell 路径抛异常 → 整条文件回退 legacy」。Parse 把异常吞了，
 *  这里直接调 ParseCore(shell=true) 把它复现出来，作为这条 case 的**首跳**原因。 */
function probeFirstHop(source) {
  if (typeof SourceFileRunner.ParseCore !== "function") return "（ParseCore 未导出，首跳不可见）";
  try {
    SourceFileRunner.ParseCore(source, "case.ts", true);
    return "（ParseCore 单独调用未抛：回退只发生在完整入口）";
  } catch (error) {
    return describeError(error);
  }
}

function resetFallback() {
  if (route === null) return;
  if (typeof route.FileFallbackCount === "number") route.FileFallbackCount = 0;
  if (typeof route.LastFileFallback === "boolean") route.LastFileFallback = false;
}

function runCase(entry) {
  const source = entry.source;
  const base = {
    name: entry.name,
    file: entry.file,
    note: entry.note,
    expect: entry.expect,
    source,
    status: "ok",
    match: "ok",
    detail: "",
    fallback: false,
    fallbackCount: 0,
    deterministic: null,
    tsCount: 0,
    cjCount: 0,
    parseMs: 0,
  };
  const file = ts.createSourceFile("case.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const tsDiagnostics = (file.parseDiagnostics || []).length;

  resetFallback();
  const started = process.hrtime.bigint();
  let shape = null;
  try {
    shape = SourceFileRunner.Parse(source, "case.ts");
  } catch (error) {
    return {
      ...base,
      status: "error",
      match: "error",
      detail: describeError(error),
      parseMs: Number(process.hrtime.bigint() - started) / 1e6,
      tsDiagnostics,
    };
  }
  const parseMs = Number(process.hrtime.bigint() - started) / 1e6;
  const fallback = route !== null && route.LastFileFallback === true;
  const fallbackCount = route !== null && typeof route.FileFallbackCount === "number" ? route.FileFallbackCount : 0;

  let verdict;
  try {
    verdict = compare(file.statements.map(tsAst), (shape.Data || []).map(cjAst));
  } catch (error) {
    return {
      ...base,
      status: "error",
      match: "error",
      detail: `AST 比对抛错：${describeError(error)}`,
      fallback,
      fallbackCount,
      parseMs,
      tsDiagnostics,
    };
  }

  // 确定性：同一源码再 Parse 一次，XML 逐字节相同。
  let deterministic = null;
  const first = astLineOf(shape);
  if (first !== null) {
    try {
      const again = astLineOf(SourceFileRunner.Parse(source, "case.ts"));
      deterministic = again === first;
      if (!deterministic) {
        let at = 0;
        const limit = Math.min(first.length, again === null ? 0 : again.length);
        while (at < limit && first[at] === again[at]) at++;
        verdict = {
          ...verdict,
          match: "diff",
          detail: `${verdict.detail ? `${verdict.detail}；` : ""}XML 非确定 @${at}`,
        };
      }
    } catch (error) {
      deterministic = false;
      verdict = { ...verdict, match: "diff", detail: `第二次 Parse 抛错：${describeError(error)}` };
    }
  }

  const firstHop = fallback ? probeFirstHop(source) : null;
  const detail =
    verdict.match === "ok"
      ? fallback
        ? `整条文件回退 legacy，AST 仍逐字一致；首跳：${firstHop}`
        : ""
      : verdict.detail;

  return {
    ...base,
    ...verdict,
    detail,
    firstHop,
    status: fallback ? "fallback" : verdict.match,
    fallback,
    fallbackCount,
    deterministic,
    parseMs,
    tsDiagnostics,
    expectOk: entry.expect === null ? null : entry.expect === (fallback ? "fallback" : verdict.match),
  };
}

const all = fs
  .readdirSync(caseDir)
  .filter((name) => name.endsWith(".ts"))
  .sort()
  .map((name) => readCase(path.join(caseDir, name)));
const selected =
  flags.only === null
    ? all
    : all.filter((entry) => flags.only.some((needle) => entry.name.includes(needle) || entry.source.includes(needle)));

if (selected.length === 0) {
  fatal("没有选中任何 case");
  process.exit(1);
}

const results = selected.map(runCase);

const counts = { ok: 0, moved: 0, diff: 0, error: 0, fallback: 0 };
for (const result of results) counts[result.status] = (counts[result.status] || 0) + 1;
const fallbackTotal = results.filter((result) => result.fallback).length;
const fbOk = results.filter((result) => result.fallback && result.match === "ok").length;
const pinMismatch = results.filter((result) => result.expectOk === false).length;

if (flags.json) {
  process.stdout.write(
    `${JSON.stringify(
      {
        schema: "xl-example/target-cases/all-possible-1027@1",
        repo: root,
        buildRoot: path.relative(root, buildRoot),
        caseDir: path.relative(root, caseDir).split(path.sep).join("/"),
        flags: {
          enableShellExpressions: route === null ? null : route.EnableShellExpressions,
          enableBracketRoleCatalog: route === null ? null : route.EnableBracketRoleCatalog,
          enableFileFallback: route === null ? null : route.EnableFileFallback,
          enableControlFlowShell: route === null ? null : route.EnableControlFlowShell,
        },
        counts,
        fallbackTotal,
        fallbackButAstOk: fbOk,
        cases: results.map((result) => ({
          name: result.name,
          status: result.status,
          match: result.match,
          fallback: result.fallback,
          deterministic: result.deterministic,
          expect: result.expect,
          expectOk: result.expectOk,
          detail: result.detail,
          firstHop: result.firstHop,
          source: result.source,
          note: result.note,
        })),
      },
      null,
      2,
    )}\n`,
  );
  process.exitCode = 0;
} else {
  const columns = [
    ["file", (r) => r.name],
    ["status", (r) => r.status],
    ["match", (r) => r.match],
    ["fb", (r) => (r.fallback ? "YES" : "-")],
    ["pin", (r) => (r.expectOk === null ? "-" : r.expectOk ? "hit" : "MISS")],
    ["detail", (r) => r.detail || (r.fallback ? "整条文件回退 legacy，AST 仍逐字一致" : "逐字一致")],
  ];
  const widths = columns.map(([title, pick]) =>
    Math.max(title.length, ...results.map((result) => String(pick(result)).length)),
  );
  const line = (cells) => cells.map((cell, index) => String(cell).padEnd(widths[index])).join(" | ");

  console.log(`REPO:      ${root}`);
  console.log(`BUILD:     ${path.relative(root, buildRoot).split(path.sep).join("/")}`);
  console.log(`CASES-DIR: ${path.relative(root, caseDir).split(path.sep).join("/")}`);
  console.log(
    `FLAGS:     shell=${route === null ? "?" : route.EnableShellExpressions} ` +
      `bracketRoleCatalog=${route === null ? "?" : route.EnableBracketRoleCatalog} ` +
      `fileFallback=${route === null ? "?" : route.EnableFileFallback} ` +
      `controlFlowShell=${route === null ? "?" : route.EnableControlFlowShell}`,
  );
  console.log(`SELECTED:  ${results.length}/${all.length}`);
  console.log("");
  console.log(line(columns.map(([title]) => title)));
  console.log(line(widths.map((width) => "-".repeat(width))));
  for (const result of results) console.log(line(columns.map(([, pick]) => pick(result))));
  console.log("");
  console.log(
    `SUMMARY: cases=${results.length} ok=${counts.ok} moved=${counts.moved} diff=${counts.diff} ` +
      `error=${counts.error} fallback=${counts.fallback} | LastFileFallback=${fallbackTotal}` +
      (fallbackTotal > 0 ? `（其中回退后 AST 仍 ok=${fbOk}）` : "") +
      ` | pin-miss=${pinMismatch}`,
  );
  const failing = results.filter((result) => result.status === "error" || result.status === "diff");
  if (failing.length > 0) {
    console.log("");
    console.log("FAILING:");
    for (const result of failing) console.log(`  ${result.name}: ${result.status} — ${result.detail}`);
  }
  const moved = results.filter((result) => result.match === "moved" && !result.fallback);
  if (moved.length > 0) {
    console.log("");
    console.log("MOVED:");
    for (const result of moved) console.log(`  ${result.name}: ${result.detail}`);
  }
  if (flags.verbose) {
    console.log("");
    for (const result of results) {
      console.log(`SOURCE ${result.name} ${JSON.stringify(result.source)}`);
      console.log(`  note=${result.note} ms=${result.parseMs.toFixed(2)} tsNodes=${result.tsCount} cjNodes=${result.cjCount}`);
    }
  }
  process.exitCode = flags.strict && failing.length > 0 ? 1 : 0;
}
