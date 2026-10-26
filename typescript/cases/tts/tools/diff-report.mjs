#!/usr/bin/env node
// 回归差异闸门（WP-E0a）：比较两份 `tts/run.mjs --json` 报告，断言「只有 --allow 的 case 分类可以变化」。
//
// 用法：
//   node typescript/cases/tts/tools/diff-report.mjs <base.json> <new.json> [--allow id1,id2]
//
// 语义（_coord/PLAN-all-possible.md §4.0 的回归差异口径）：
// - 没有 --allow：两份报告必须**逐条相同**（每个 record 的全部字段）；
// - 有 --allow：被 allow 的 id 允许变化（分类、reason、earlierNodes… 都允许），
//   **其余 id 仍须逐条相同**；id 只在一侧出现也算变化（增删 case 不在允许范围；
//   确实要增删时把该 id 一起 allow）。
// - 违反 ⇒ 打印每条违规并 exit 1；通过 ⇒ 打印汇总并 exit 0；用法/读文件错 ⇒ exit 2。
//
// 输入只认 `typescript/cases/tts/run.mjs --json <path>` 产出的结构：{ records: [{ id, actual, pass, ... }] }。

import fs from "node:fs";
import path from "node:path";

const USAGE = `用法：node typescript/cases/tts/tools/diff-report.mjs <base.json> <new.json> [--allow id1,id2]

选项：
  --allow <ids>   允许分类变化的 case id，逗号分隔（可重复）
  -h, --help      显示本帮助
`;

function fail(message) {
  console.error(`[diff-report] ${message}`);
  process.exit(2);
}

function parseArgs(argv) {
  const options = { base: null, next: null, allow: new Set(), help: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "-h" || arg === "--help") options.help = true;
    else if (arg === "--allow") {
      const value = argv[++index] ?? fail("--allow 后面要跟逗号分隔的 id");
      for (const id of value.split(",")) {
        if (id.trim().length > 0) options.allow.add(id.trim());
      }
    } else if (arg.startsWith("--allow=")) {
      for (const id of arg.slice("--allow=".length).split(",")) {
        if (id.trim().length > 0) options.allow.add(id.trim());
      }
    } else if (arg.startsWith("-")) fail(`不认识的选项：${arg}`);
    else if (options.base === null) options.base = arg;
    else if (options.next === null) options.next = arg;
    else fail(`多余的参数：${arg}`);
  }
  if (options.help) return options;
  if (options.base === null || options.next === null) fail(`缺两个报告路径\n\n${USAGE}`);
  return options;
}

function readReport(filePath) {
  const absolute = path.resolve(filePath);
  if (!fs.existsSync(absolute)) fail(`报告不存在：${absolute}`);
  let document;
  try {
    document = JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch (exception) {
    fail(`报告不是合法 JSON：${absolute}（${exception instanceof Error ? exception.message : String(exception)}）`);
  }
  if (!Array.isArray(document.records)) {
    fail(`报告里没有 records 数组：${absolute}（要用 run.mjs --json 的产物）`);
  }
  const records = new Map();
  for (const record of document.records) {
    if (record === null || typeof record !== "object" || typeof record.id !== "string") {
      fail(`报告里有不合法的 record：${absolute}`);
    }
    records.set(record.id, record);
  }
  return { path: absolute, document, records };
}

// 规范化：对象键顺序不影响判等（报告是本地生成，但比较工具不该被键序绊倒）。
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map((item) => canonical(item)).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function actualOf(record) {
  if (record === undefined) return "<missing>";
  return typeof record.actual === "string" ? record.actual : "<none>";
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return;
  }
  const base = readReport(options.base);
  const next = readReport(options.next);

  const ids = new Set();
  for (const id of base.records.keys()) ids.add(id);
  for (const id of next.records.keys()) ids.add(id);

  const violations = [];
  const allowed = [];
  let identical = 0;
  for (const id of Array.from(ids).sort()) {
    const before = base.records.get(id);
    const after = next.records.get(id);
    const same = before !== undefined && after !== undefined && canonical(before) === canonical(after);
    if (same) {
      identical++;
      continue;
    }
    if (options.allow.has(id)) {
      allowed.push({ id, before: actualOf(before), after: actualOf(after), added: before === undefined, removed: after === undefined });
      continue;
    }
    violations.push({ id, before: actualOf(before), after: actualOf(after), added: before === undefined, removed: after === undefined });
  }

  console.log(`[diff-report] base=${base.path}`);
  console.log(`[diff-report] new =${next.path}`);
  console.log(
    `[diff-report] ${ids.size} 个 id：一致 ${identical} / 允许变化 ${allowed.length} / 不允许变化 ${violations.length}` +
      (options.allow.size > 0 ? `（allow：${Array.from(options.allow).sort().join(",")}）` : "（无 allow，要求逐条相同）"),
  );
  for (const item of allowed) {
    const how = item.added ? "新增" : item.removed ? "删除" : `${item.before} -> ${item.after}`;
    console.log(`  ALLOW  ${item.id}  ${how}`);
  }
  for (const item of violations) {
    const how = item.added ? "新增" : item.removed ? "删除" : `${item.before} -> ${item.after}`;
    console.log(`  FAIL   ${item.id}  ${how}（不在 --allow 里）`);
  }
  if (violations.length > 0) {
    console.log(`[diff-report] FAIL ${violations.length} 条不在允许范围的变化`);
    process.exitCode = 1;
    return;
  }
  console.log("[diff-report] PASS");
}

main();
