// tests/cases/token/**/*.ts 的 AST 尺子。
//
// 与 typescript/cases/ast-json.mjs 是同一套口径（归一表、tsAst、cjAst、分组 / 配对
// 全部 import ./ast-compare.mjs），区别只在语料形态：
//   - ast-json.mjs 读 typescript/cases/astjson/*.ts，一行一个用例，按行切分；
//   - 这里是真实多行文件：一份文件 = 一个用例，不做 `\n` 转义解码，只去 BOM。
//
// 判定：
//   ts-invalid      TS 自己就解析失败（parseDiagnostics 非空）—— 尺子不测，只计数
//   crash           本仓 SourceFileRunner.Parse 抛异常 —— 报告完整 InnerException 链
//   diff            两侧 AST 有结构差 / 位置差 / 字段差
//   ok              完全一致
//   gap-now-passing 文件头标了 `// xl:known-gap` 且现在已对上
//
// 用法：
//   node typescript/cases/token-ast.mjs                          # 全量逐文件
//   node typescript/cases/token-ast.mjs --quiet                  # 只出汇总
//   node typescript/cases/token-ast.mjs --fail-only              # 只列失败（crash / diff）
//   node typescript/cases/token-ast.mjs statements/              # 按仓库相对路径子串过滤
//   node typescript/cases/token-ast.mjs "types/type-*"           # 按 glob 过滤
//   node typescript/cases/token-ast.mjs --json tmp/token-ast.json # 写基线 JSON
//
// 退出码：选中的集合里有 crash 或 diff → 1，否则 0（可当门禁用）。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  createAstCore,
  cjAst,
  flatten,
  groupByKind,
  fieldOf,
  TOKEN_FIELDS,
} from "./ast-compare.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
const ts = require(path.join(root, "node_modules", "typescript"));
const { SourceFileRunner } = require(path.join(root, "build/ts/typescript/run/source-file-runner.js"));
const { tsAst } = createAstCore(ts);

const CORPUS_ROOT = path.join(root, "tests", "cases", "token");
const MAX_CHAIN = 12;

const USAGE = `用法：node typescript/cases/token-ast.mjs [选项] [过滤...]

选项：
  --fail-only      只列失败（crash / diff），不列 ok / ts-invalid / gap-now-passing
  --quiet          只输出汇总
  --json <path>    把逐文件结果写成 JSON（schema 与 tmp/token-ast-baseline.json 一致）
  -h, --help       显示本帮助

过滤：对「仓库相对路径」做匹配；不含 * ? [ ] 时按子串，否则按 glob（可省前导目录）。
  例：statements/   stmt-while   types/type-   "tests/cases/token/**/stmt-while.ts"`;

function parseArgs(argv) {
  const args = { filters: [], json: null, failOnly: false, quiet: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--fail-only") args.failOnly = true;
    else if (arg === "--quiet") args.quiet = true;
    else if (arg === "--json") {
      args.json = argv[i + 1];
      if (!args.json) fail(`--json 后面要给一个路径`);
      i++;
    } else if (arg.startsWith("--json=")) args.json = arg.slice("--json=".length);
    else if (arg === "-h" || arg === "--help") args.help = true;
    else if (arg.startsWith("-")) fail(`不认识的选项：${arg}`);
    else args.filters.push(arg);
  }
  return args;
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

function toPosix(text) {
  return text.replace(/\\/g, "/");
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && full.endsWith(".ts")) out.push(full);
  }
  return out;
}

/** 语料全集，按仓库相对路径排序。 */
function listCorpus() {
  return walk(CORPUS_ROOT)
    .map((abs) => ({ abs, rel: toPosix(path.relative(root, abs)) }))
    .sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
}

function hasGlob(text) {
  return /[*?[\]]/.test(text);
}

/** 基本 glob：* 不跨目录、** 跨目录、? 单字符；忽略前导目录（"types/type-*" 也能命中）。 */
function globToRegExp(glob) {
  let out = "^(?:.*/)?";
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        out += ".*";
        i++;
      } else out += "[^/]*";
    } else if (ch === "?") out += "[^/]";
    else out += ch.replace(/[.+^${}()|\\]/g, "\\$&");
  }
  return new RegExp(out + "$");
}

/** 位置参数 → 文件子集。字符串按子串，含通配符按 glob。 */
function selectFiles(all, filters) {
  if (filters.length === 0) return all;
  const matchers = filters.map((filter) => {
    const norm = toPosix(filter);
    return hasGlob(norm) ? globToRegExp(norm) : norm;
  });
  return all.filter((file) =>
    matchers.some((matcher) =>
      typeof matcher === "string" ? file.rel.includes(matcher) : matcher.test(file.rel),
    ),
  );
}

/** 文件头连续的 `// xl:key value` 指令（known-gap / note / expect）—— 与 Lead 基线同一条规则。 */
function readDirectives(file) {
  const text = fs.readFileSync(file, "utf8").replace(/\r\n?/g, "\n");
  const directives = {};
  for (const line of text.split("\n")) {
    if (!line.startsWith("//")) break;
    const match = /^\/\/\s*xl:(\S+)\s*(.*)$/.exec(line);
    if (match) directives[match[1]] = match[2];
  }
  return directives;
}

/** 把一个文件量成一行结果。 */
function analyze(entry) {
  const directives = readDirectives(entry.abs);
  const row = {
    file: entry.rel,
    gap: directives["known-gap"] !== undefined,
    note: directives.note || "",
    expect: directives.expect || "",
  };

  let source = fs.readFileSync(entry.abs, "utf8");
  if (source.charCodeAt(0) === 0xfeff) source = source.slice(1);

  // TS 侧真值：语义层 AST。
  const sourceFile = ts.createSourceFile(
    entry.abs,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  if (sourceFile.parseDiagnostics.length > 0) return { ...row, result: "ts-invalid" };

  // 产物侧：本仓解析器。崩溃时把 InnerException 链整条留下。
  let ours;
  try {
    ours = SourceFileRunner.Parse(source, entry.abs).Data.map(cjAst);
  } catch (error) {
    const chain = [];
    let current = error;
    for (let depth = 0; depth < MAX_CHAIN && current; depth++) {
      const text = String(current.Message ?? current.message ?? current).split("\n")[0];
      chain.push(`${current.constructor?.name || "Error"}: ${text}`);
      current = current.InnerException || current.innerException;
    }
    const msg = (chain[chain.length - 1] || "unknown").replace(/^\w+: /, "");
    return { ...row, result: "crash", chain, msg };
  }

  // 三栏分开报：结构（kind 计数差）/ 位置（同 kind 同个数才按前序配对）/ 字段（区间对上才比）。
  const theirs = sourceFile.statements.map(tsAst);
  const theirKinds = groupByKind(flatten(theirs));
  const ourKinds = groupByKind(flatten(ours));

  const structural = [];
  for (const kind of new Set([...theirKinds.keys(), ...ourKinds.keys()])) {
    const delta = (ourKinds.get(kind)?.length || 0) - (theirKinds.get(kind)?.length || 0);
    if (delta !== 0) structural.push(`${kind}${delta > 0 ? "+" : ""}${delta}`);
  }

  const position = [];
  for (const [kind, theirList] of theirKinds) {
    const ourList = ourKinds.get(kind);
    if (!ourList || ourList.length !== theirList.length) continue;
    for (let i = 0; i < theirList.length; i++) {
      const t = theirList[i];
      const o = ourList[i];
      if (t.pos !== o.pos || t.end !== o.end) {
        position.push(`${kind} ts[${t.pos},${t.end}] cj[${o.pos},${o.end}]`);
      }
    }
  }

  const fields = [];
  for (const [kind, theirList] of theirKinds) {
    const ourList = ourKinds.get(kind);
    if (!ourList || ourList.length !== theirList.length) continue;
    for (let i = 0; i < theirList.length; i++) {
      const t = theirList[i];
      const o = ourList[i];
      if (t.pos !== o.pos || t.end !== o.end) continue;
      for (const name of TOKEN_FIELDS) {
        const theirValue = fieldOf(t, name);
        const ourValue = fieldOf(o, name);
        if (String(theirValue) !== String(ourValue)) {
          fields.push(`${kind}[${t.pos},${t.end}] ${name}: ts=${JSON.stringify(theirValue)} cj=${JSON.stringify(ourValue)}`);
        }
      }
    }
  }

  if (!structural.length && !position.length && !fields.length) {
    return { ...row, result: row.gap ? "gap-now-passing" : "ok" };
  }
  return { ...row, result: "diff", struct: structural, pos: position, fields };
}

const RESULT_ORDER = ["ok", "crash", "diff", "ts-invalid", "gap-now-passing"];
const LABEL = {
  ok: "OK",
  crash: "CRASH",
  diff: "DIFF",
  "ts-invalid": "TS-INVALID",
  "gap-now-passing": "GAP-PASS",
};

function summarize(rows) {
  const counts = { total: rows.length };
  for (const result of RESULT_ORDER) counts[result] = 0;
  const knownGap = {};
  const nonKnownGap = {};
  for (const row of rows) {
    counts[row.result]++;
    const bucket = row.gap ? knownGap : nonKnownGap;
    bucket[row.result] = (bucket[row.result] || 0) + 1;
  }
  return { counts, knownGap, nonKnownGap };
}

function formatBucket(bucket) {
  const entries = RESULT_ORDER.filter((result) => bucket[result]).map(
    (result) => `${result} ${bucket[result]}`,
  );
  return entries.length > 0 ? entries.join(", ") : "none";
}

function printRow(row) {
  const flag = row.gap ? "  [known-gap]" : "";
  console.log(`${LABEL[row.result].padEnd(10)} ${row.file}${flag}`);
  if (row.result === "crash") {
    for (const line of row.chain) console.log(`           ${line}`);
    console.log(`           root: ${row.msg}`);
  } else if (row.result === "diff") {
    if (row.struct.length > 0) console.log(`           struct: ${row.struct.join("  ")}`);
    for (const item of row.pos) console.log(`           pos:    ${item}`);
    for (const item of row.fields) console.log(`           field:  ${item}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }
  if (!fs.existsSync(CORPUS_ROOT)) fail(`语料目录不存在：${CORPUS_ROOT}`);

  const all = listCorpus();
  const selected = selectFiles(all, args.filters);
  if (selected.length === 0) {
    console.error(`没有任何文件匹配过滤器：${args.filters.join(", ")}`);
    console.error(`语料根 ${toPosix(path.relative(root, CORPUS_ROOT))} 共 ${all.length} 份 .ts`);
    process.exit(1);
  }

  if (!args.quiet) {
    console.log(`token AST ruler — ${toPosix(path.relative(root, CORPUS_ROOT))}/**/*.ts`);
    if (args.filters.length > 0) console.log(`filter: ${args.filters.join(", ")}`);
    console.log(`selected: ${selected.length}/${all.length} file(s)`);
    console.log("");
  }

  const rows = [];
  for (const entry of selected) {
    const row = analyze(entry);
    rows.push(row);
    if (args.quiet) continue;
    if (args.failOnly && row.result !== "crash" && row.result !== "diff") continue;
    printRow(row);
  }

  const { counts, knownGap, nonKnownGap } = summarize(rows);
  if (!args.quiet) console.log("");
  console.log(
    `summary: total=${counts.total} ok=${counts.ok} crash=${counts.crash} diff=${counts.diff} ` +
      `ts-invalid=${counts["ts-invalid"]} gap-now-passing=${counts["gap-now-passing"]}`,
  );
  const knownTotal = Object.values(knownGap).reduce((sum, value) => sum + value, 0);
  const nonKnownTotal = counts.total - knownTotal;
  console.log(`known-gap:     ${knownTotal} file(s) (${formatBucket(knownGap)})`);
  console.log(`non-known-gap: ${nonKnownTotal} file(s) (${formatBucket(nonKnownGap)})`);

  if (args.json) {
    const outPath = path.resolve(process.cwd(), args.json);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          corpus: "tests/cases/token",
          filters: args.filters,
          counts,
          gapSplit: { knownGap, nonKnownGap },
          rows,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(`report: ${outPath}`);
  }

  const failed = rows.filter((row) => row.result === "crash" || row.result === "diff");
  if (failed.length > 0) {
    console.log("");
    process.exitCode = 1;
  }
}

main();
