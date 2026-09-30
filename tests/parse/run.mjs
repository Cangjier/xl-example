// 用例对解析器：跑全部用例，与已知缺口台账比对。
//
//   node tests/parse/run.mjs                 跑全部；有 NEW GAP / STALE 时退出码 1
//   node tests/parse/run.mjs declarations    只跑某个 area
//   node tests/parse/run.mjs --verbose       打印每条失败用例的产物
//   node tests/parse/run.mjs --json out.json 把完整结果（含 XML）写成 JSON
//   node tests/parse/run.mjs --adopt         把当前失败用例写进台账
//
// 台账（known-gaps.json）是一份「逐步清空的缺口清单」：
//   失败且不在台账 → NEW GAP（新缺口或回归）
//   成功且在台账   → STALE（缺口修好了，台账要删）
// 「能不能完整解析 TypeScript」等价于台账变成 {}。

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { listCases, tsProblems } from "./validate.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const LEDGER_PATH = path.join(here, "known-gaps.json");

const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "dawn", "text", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "dawn", "text", "text-context.js"));

/** 解析一段源码。返回 { xml } 或 { error }。 */
function parseSource(source, filePath) {
  const template = new Template();
  const document = new TextDocument(source);
  document.FilePath = filePath;
  const context = new TextContext(template);
  context.Process(document);
  return context.Root.ToString();
}

/** 把异常拆成「包装链 + 最内层原因」。裸 Error 与 SyntaxException 要能区分。 */
function errorChain(error) {
  const names = [];
  let cur = error;
  for (let i = 0; i < 12 && cur !== null && cur !== undefined; i++) {
    const name = cur.constructor ? cur.constructor.name : typeof cur;
    names.push(name);
    if (name !== "SyntaxException") break;
    cur = cur.InnerException;
  }
  let last = error;
  for (let i = 0; i < 12 && last !== null && last !== undefined; i++) {
    const name = last.constructor ? last.constructor.name : typeof last;
    if (name !== "SyntaxException") break;
    last = last.InnerException;
  }
  const raw = last && last.Message !== undefined ? last.Message : last && last.message !== undefined ? last.message : last;
  return {
    chain: names,
    wrapped: names[0] === "SyntaxException",
    rootName: names[names.length - 1],
    rootMessage: String(raw).split("\n")[0].trim(),
  };
}

/** 产物的不变量：XML 里不能出现没被转义的 `<`（标签名在本工程里都是大写开头的 PascalCase）。 */
function xmlProblem(xml) {
  for (let i = 0; i < xml.length; i++) {
    if (xml[i] !== "<") continue;
    const next = xml[i + 1];
    if (next === "/" || (next >= "A" && next <= "Z")) continue;
    return `XML 里出现没转义的 \`<\`：…${xml.slice(Math.max(0, i - 40), i + 40)}…`;
  }
  return null;
}

/** 判定一条用例：pass / gap。 */
function judge(c) {
  const invalidTs = tsProblems(c.source, c.name);
  if (c.directives.tsInvalid) {
    // 故意非法的输入：契约是「要么给出 SyntaxException，要么照常产出」，不允许泄漏裸 Error。
    let outcome;
    try {
      outcome = { xml: parseSource(c.source, c.file) };
    } catch (error) {
      outcome = { error: errorChain(error) };
    }
    if (outcome.error && !outcome.error.wrapped) {
      return { verdict: "gap", group: `throw-bare: ${outcome.error.rootMessage}`.slice(0, 80), detail: `非法输入抛了裸 ${outcome.error.rootName}`, outcome };
    }
    return { verdict: "pass", detail: outcome.error ? "非法输入 → SyntaxException" : "非法输入 → 照常产出", outcome };
  }
  if (invalidTs.length > 0) {
    return { verdict: "gap", group: "case-invalid", detail: "用例本身不是合法 TS：" + invalidTs[0], outcome: null };
  }

  let xml;
  try {
    xml = parseSource(c.source, c.file);
  } catch (error) {
    const info = errorChain(error);
    const prefix = info.wrapped ? "" : "裸 ";
    return {
      verdict: "gap",
      group: `throw: ${prefix}${info.rootName}: ${info.rootMessage}`.slice(0, 96),
      detail: `抛异常 ${info.chain.join(" > ")}`,
      outcome: { error: info },
    };
  }

  // `xl:expect Tag` 只查存在；`xl:expect Tag:2` 还查**个数**。
  // 个数是必需的：有一类 bug 是「本该两个节点只出一个」（例如类的静态字段初始化里有 `new`
  // 时吞掉后面那个成员），只查存在的话这种用例永远是绿的。
  const countOf = (tag) => (xml.match(new RegExp("<" + tag + "(?=[ />])", "g")) || []).length;
  const missing = [];
  for (const entry of c.directives.expect) {
    const separator = entry.indexOf(":");
    const tag = separator === -1 ? entry : entry.slice(0, separator);
    if (separator === -1) {
      if (!xml.includes("<" + tag)) missing.push(tag);
      continue;
    }
    const want = Number(entry.slice(separator + 1));
    const got = countOf(tag);
    if (got !== want) missing.push(`${tag}(要 ${want} 个，实得 ${got})`);
  }
  const present = c.directives.absent.filter((tag) => xml.includes("<" + tag));
  const malformed = xmlProblem(xml);
  if (missing.length === 0 && present.length === 0 && malformed === null) return { verdict: "pass", detail: "", outcome: { xml } };
  const parts = [];
  if (missing.length) parts.push(`缺 ${missing.join(",")}`);
  if (present.length) parts.push(`不该有 ${present.join(",")}`);
  if (malformed !== null) parts.push(malformed);
  return {
    verdict: "gap",
    group: (malformed !== null ? "malformed-xml" : missing.length ? `missing: ${missing[0]}` : `unexpected: ${present[0]}`).slice(0, 96),
    detail: parts.join("；"),
    outcome: { xml },
  };
}

function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes("--verbose");
  const adopt = args.includes("--adopt");
  const jsonAt = args.indexOf("--json");
  const jsonPath = jsonAt >= 0 ? args[jsonAt + 1] : null;
  const area = args.find((a) => !a.startsWith("--") && a !== jsonPath);

  const cases = listCases(area);
  const ledger = fs.existsSync(LEDGER_PATH) ? JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8")) : {};
  // `_` 开头的键是台账的元数据，不是用例条目：用来登记「用例的标签表压根表达不了」的缺口。
  const meta = Object.fromEntries(Object.entries(ledger).filter(([k]) => k.startsWith("_")));

  const results = [];
  for (const c of cases) {
    const judged = judge(c);
    const entry = ledger[c.id];
    let status;
    if (c.problems.length > 0) status = "BAD-CASE";
    else if (judged.verdict === "gap" && entry === undefined) status = "NEW GAP";
    else if (judged.verdict === "gap") status = "known";
    else if (entry !== undefined) status = "STALE";
    else status = "ok";
    results.push({
      id: c.id,
      area: c.area,
      note: c.directives.note || (c.title || "").replace(/^\/\/\s*xl:note\s*/, ""),
      expect: c.directives.expect,
      absent: c.directives.absent,
      tsInvalid: c.directives.tsInvalid,
      ledgerGroup: entry ? entry.group : null,
      status,
      verdict: judged.verdict,
      group: judged.group || null,
      detail: judged.detail,
      caseProblems: c.problems,
      error: judged.outcome && judged.outcome.error ? judged.outcome.error : null,
      xml: judged.outcome && judged.outcome.xml ? judged.outcome.xml : null,
    });
  }

  const fail = results.filter((r) => r.status === "NEW GAP" || r.status === "STALE" || r.status === "BAD-CASE");
  for (const r of results) {
    if (r.status === "ok" || r.status === "known") continue;
    console.log(`${r.status.padEnd(8)} ${r.id}${r.note ? "   — " + r.note : ""}`);
    if (r.caseProblems.length) for (const p of r.caseProblems) console.log(`         ${p}`);
    if (r.detail) console.log(`         ${r.detail}`);
    if (r.group) console.log(`         group: ${r.group}`);
    if (verbose && r.xml) console.log(`         xml: ${r.xml}`);
    if (verbose && r.error) console.log(`         error: ${r.error.chain.join(" > ")} :: ${r.error.rootMessage}`);
  }

  const byArea = {};
  for (const r of results) {
    byArea[r.area] = byArea[r.area] || { total: 0, ok: 0, known: 0, bad: 0 };
    byArea[r.area].total++;
    if (r.status === "ok") byArea[r.area].ok++;
    else if (r.status === "known") byArea[r.area].known++;
    else byArea[r.area].bad++;
  }
  console.log("");
  for (const [a, v] of Object.entries(byArea).sort()) {
    console.log(`${a.padEnd(13)} 用例 ${String(v.total).padStart(3)}  通过 ${String(v.ok).padStart(3)}  台账内缺口 ${String(v.known).padStart(3)}  新增/过期 ${v.bad}`);
  }

  const gapsByGroup = new Map();
  for (const r of results) {
    if (r.verdict !== "gap" && r.status !== "BAD-CASE") continue;
    const g = r.status === "BAD-CASE" ? "case-invalid" : r.group;
    if (!gapsByGroup.has(g)) gapsByGroup.set(g, []);
    gapsByGroup.get(g).push(r.id);
  }
  if (gapsByGroup.size > 0) {
    console.log(`\n缺口分组（共 ${gapsByGroup.size} 组，${[...gapsByGroup.values()].reduce((n, v) => n + v.length, 0)} 条用例）：`);
    for (const [g, ids] of [...gapsByGroup.entries()].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${String(ids.length).padStart(3)}  ${g}`);
    }
  }

  const notes = meta._notes || {};
  if (Object.keys(notes).length > 0) {
    console.log(`\n标签表表达不了的缺口（台账 _notes，${Object.keys(notes).length} 条）：`);
    for (const [k, v] of Object.entries(notes)) {
      console.log(`  ${k}：${typeof v === "string" ? v : v.reason}`);
    }
  }

  console.log(`\n合计 ${results.length} 条用例：通过 ${results.filter((r) => r.status === "ok").length}，台账内缺口 ${results.filter((r) => r.status === "known").length}，新增/过期 ${fail.length}`);
  const caseEntries = Object.keys(ledger).filter((k) => !k.startsWith("_")).length;
  const noteEntries = Object.keys(meta._notes || {}).length;
  console.log(`台账：在案用例 ${caseEntries} 条 + 标签表表达不了的缺口 ${noteEntries} 条（_notes）`);
  console.log(`「完整解析 TypeScript」= 在案用例归零；当前还差 ${caseEntries} 条`);

  if (jsonPath) {
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 1), "utf8");
    console.log(`完整结果 → ${jsonPath}`);
  }

  if (adopt) {
    // 只重写「本次跑到的用例」，没跑到的台账条目与 _ 元数据原样保留。
    const next = { ...meta };
    const ran = new Set(results.map((r) => r.id));
    for (const [id, entry] of Object.entries(ledger)) {
      if (id.startsWith("_") || ran.has(id)) continue;
      next[id] = entry;
    }
    for (const r of results) {
      if (r.verdict !== "gap" && r.status !== "BAD-CASE") continue;
      const g = r.status === "BAD-CASE" ? "case-invalid" : r.group;
      next[r.id] = { group: g, reason: r.detail || r.note || "" };
    }
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
    console.log(`\n已写入台账：${Object.keys(next).length} 条 → ${LEDGER_PATH}`);
    process.exitCode = 0;
    return;
  }

  process.exitCode = fail.length === 0 ? 0 : 1;
}

main();
