// A/B：基线 build/ts 与实验 build/ts-exp（注释整段预扫描 + 驱动层跳读）。
// 只用于取证，不进入交付；跑法：node tests/bench/dts-ab.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

function load(tree) {
  const { SourceFileRunner } = require(path.join(root, tree, "typescript", "run", "source-file-runner.js"));
  return SourceFileRunner;
}

const base = load("build/ts");
const exp = load("build/ts-exp");

const files = ["lib.dom.d.ts", "lib.es5.d.ts", "lib.es2015.core.d.ts"];

function digest(node, acc) {
  acc.push(`${node.constructor.name}[${node.SourceRange.Start ? node.SourceRange.Start.Index : -1},${node.SourceRange.End ? node.SourceRange.End.Index : -1}]`);
  if (typeof node.Tmp === "string") acc.push(node.Tmp);
  for (const child of node.Data) digest(child, acc);
  return acc;
}

function run(runner, text, name) {
  const start = process.hrtime.bigint();
  const shape = runner.Parse(text, name);
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  return { ms, shape };
}

const median = (values) => {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const rows = [];
for (const name of files) {
  const text = fs.readFileSync(path.join(root, "node_modules", "typescript", "lib", name), "utf8");
  run(base, text, name);
  run(exp, text, name);
  const a = [], b = [];
  for (let i = 0; i < 3; i++) {
    a.push(run(base, text, name).ms);
    b.push(run(exp, text, name).ms);
  }
  const da = digest(run(base, text, name).shape, []).join("|");
  const db = digest(run(exp, text, name).shape, []).join("|");
  rows.push({
    file: name,
    chars: text.length,
    baseMs: +median(a).toFixed(1),
    expMs: +median(b).toFixed(1),
    deltaPct: +(((median(b) - median(a)) / median(a)) * 100).toFixed(1),
    sameDigest: da === db,
    digestLen: da.length,
  });
}
console.log(JSON.stringify(rows, null, 2));
