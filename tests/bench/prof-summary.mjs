// 汇总 `*.cpuprofile`（node --cpu-prof 产物）：Top self 时间、模块聚合、GC 占比、调用者。
//
//   node tmp/prof-summary.mjs tmp/prof/*.cpuprofile [--top 30] [--json]
//
// 口径：self 时间用 `samples` + `timeDeltas`（采样间隔，µs）逐样本累加，比 hitCount×interval 更准；
// total 是全部 timeDelta 之和（含 GC / program / idle 伪节点）。inclusive 用 children 子树求和，
// 递归调用会重复计数，因此只作参考，排序一律用 self。
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("usage: node tmp/prof-summary.mjs <file.cpuprofile> [--top 30] [--json]");
  process.exit(2);
}
const ti = args.indexOf("--top");
const topN = ti >= 0 ? Number(args[ti + 1]) : 30;
const asJson = args.includes("--json");

const raw = JSON.parse(fs.readFileSync(file, "utf8"));
const byId = new Map(raw.nodes.map((n) => [n.id, n]));

// ---- self 时间 ----
const selfUs = new Map();
let totalUs = 0;
for (let i = 0; i < raw.samples.length; i++) {
  const dt = raw.timeDeltas[i] || 0;
  totalUs += dt;
  const id = raw.samples[i];
  selfUs.set(id, (selfUs.get(id) || 0) + dt);
}

const PSEUDO = new Set(["(garbage collector)", "(program)", "(idle)", "(root)", "(native)"]);
const short = (url) => (url ? url.replace(/\\/g, "/").split("/").slice(-2).join("/") : "(native)");

const bucketOf = (url) => {
  if (!url) return "pseudo/native";
  const f = url.replace(/\\/g, "/");
  if (f.startsWith("node:") || f.includes("/internal/")) return "node-internals";
  if (f.includes("/build/ts/core/syntax/basic-tokens/")) return "core/basic-tokens";
  if (f.includes("/build/ts/core/syntax/")) return "core/syntax";
  if (f.includes("/build/ts/core/")) return "core/other";
  if (f.includes("/build/ts/typescript/tokens/")) return "typescript/tokens";
  if (f.includes("/build/ts/typescript/ast/")) return "typescript/ast";
  if (f.includes("/build/ts/typescript/run/")) return "typescript/run";
  if (f.includes("/build/ts/typescript/")) return "typescript/other";
  if (f.includes("/tests/bench/") || f.includes("/tmp/")) return "bench-harness";
  if (f.includes("/node_modules/typescript/")) return "ts-library";
  return "other";
};

// ---- 伪节点占比 ----
const pseudoUs = new Map();
for (const [id, us] of selfUs) {
  const name = byId.get(id)?.callFrame?.functionName || "";
  if (PSEUDO.has(name)) pseudoUs.set(name, (pseudoUs.get(name) || 0) + us);
}
const gcUs = pseudoUs.get("(garbage collector)") || 0;
const pct = (us) => (totalUs === 0 ? 0 : (us / totalUs) * 100);
const ms = (us) => +(us / 1000).toFixed(1);

// ---- 按 (函数名, url:行) 聚合 self，并记录该聚合里 self 最大的具体节点（用于调用者）----
const agg = new Map();
for (const [id, us] of selfUs) {
  const node = byId.get(id);
  if (!node) continue;
  const cf = node.callFrame || {};
  const name = cf.functionName || "(anonymous)";
  if (PSEUDO.has(name)) continue;
  const url = cf.url || "";
  const line = (cf.lineNumber ?? -1) + 1;
  const key = `${name}\u0000${url}\u0000${line}`;
  const cur = agg.get(key) || { name, url, line, us: 0, nodes: [] };
  cur.us += us;
  cur.nodes.push({ id, us });
  agg.set(key, cur);
}

// ---- 调用者链（children -> parent）----
const parentOf = new Map();
for (const node of raw.nodes) for (const child of node.children || []) parentOf.set(child, node.id);
const chainOf = (id, depth = 2) => {
  const out = [];
  let cur = id;
  for (let i = 0; i < depth && parentOf.has(cur); i++) {
    const p = byId.get(parentOf.get(cur));
    if (!p) break;
    const cf = p.callFrame || {};
    out.push(`${cf.functionName || "(anonymous)"} ${short(cf.url)}:${(cf.lineNumber ?? -1) + 1}`);
    cur = parentOf.get(cur);
  }
  return out;
};

// ---- 模块聚合（self）----
const buckets = new Map();
for (const [id, us] of selfUs) {
  const node = byId.get(id);
  if (!node) continue;
  const cf = node.callFrame || {};
  const name = cf.functionName || "";
  const b = PSEUDO.has(name) ? `pseudo${name}` : bucketOf(cf.url);
  buckets.set(b, (buckets.get(b) || 0) + us);
}

// ---- inclusive（子树 self 之和，递归会重复计数，仅参考）----
const inclusiveUs = new Map();
const walk = (id) => {
  let total = selfUs.get(id) || 0;
  for (const c of byId.get(id)?.children || []) total += walk(c);
  inclusiveUs.set(id, total);
  return total;
};
for (const node of raw.nodes) if (!parentOf.has(node.id)) walk(node.id);

const rows = [...agg.values()].sort((a, b) => b.us - a.us).slice(0, topN);

if (!asJson) {
  console.log(`# ${path.basename(file)}`);
  console.log(`samples=${raw.samples.length}  total=${ms(totalUs)} ms  interval≈${raw.samples.length ? Math.round(totalUs / raw.samples.length) : 0} µs`);
  console.log(`GC self ${pct(gcUs).toFixed(1)}%  program ${pct(pseudoUs.get("(program)") || 0).toFixed(1)}%  idle ${pct(pseudoUs.get("(idle)") || 0).toFixed(1)}%`);

  console.log(`\n## 模块聚合（self time）`);
  for (const [b, us] of [...buckets].sort((a, c) => c[1] - a[1])) {
    console.log(`${pct(us).toFixed(1).padStart(6)}%  ${String(ms(us)).padStart(9)} ms  ${b}`);
  }

  console.log(`\n## Top ${rows.length} self time`);
  let rank = 0;
  for (const r of rows) {
    const best = r.nodes.slice().sort((a, b) => b.us - a.us)[0];
    const chain = chainOf(best.id);
    console.log(
      `${String(++rank).padStart(3)}. ${pct(r.us).toFixed(2).padStart(6)}%  ${String(ms(r.us)).padStart(8)} ms  ${r.name}  ${short(r.url)}:${r.line}`,
    );
    if (chain.length) console.log(`      ← ${chain.join("  ← ")}`);
  }
}

const out = {
  file: path.basename(file),
  samples: raw.samples.length,
  totalMs: ms(totalUs),
  gcPct: +pct(gcUs).toFixed(2),
  programPct: +pct(pseudoUs.get("(program)") || 0).toFixed(2),
  idlePct: +pct(pseudoUs.get("(idle)") || 0).toFixed(2),
  buckets: [...buckets]
    .sort((a, c) => c[1] - a[1])
    .map(([bucket, us]) => ({ bucket, ms: ms(us), pct: +pct(us).toFixed(2) })),
  top: rows.map((r) => {
    const best = r.nodes.slice().sort((a, b) => b.us - a.us)[0];
    return {
      name: r.name,
      file: r.url,
      line: r.line,
      ms: ms(r.us),
      pct: +pct(r.us).toFixed(2),
      callers: chainOf(best.id),
    };
  }),
};
if (asJson) console.log(JSON.stringify(out, null, 2));
