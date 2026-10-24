import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const build = path.resolve(get("--build", "build"));
const roots = get("--roots", "typescript/cases,tests/cases,samples").split(",");
const repeat = Number(get("--repeat", "3"));
const { SourceFileRunner } = require(path.join(build, "ts", "typescript", "run", "source-file-runner.js"));
function walk(dir, out) { if (!fs.existsSync(dir)) return; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, out); else if (e.name.endsWith(".ts")) out.push(p); } }
const files = []; for (const r of roots) walk(path.resolve(r), files);
const texts = files.map(f => [f, fs.readFileSync(f, "utf8")]);
const totals = []; let errors = 0;
for (let r = 0; r < repeat; r++) { const t0 = process.hrtime.bigint(); errors = 0; for (const [n, t] of texts) { try { SourceFileRunner.Parse(t, path.basename(n)); } catch { errors++; } } totals.push(Number(process.hrtime.bigint() - t0) / 1e6); }
const sorted = totals.slice().sort((a, b) => a - b);
console.log(JSON.stringify({ build, files: files.length, bytes: texts.reduce((s, [, t]) => s + Buffer.byteLength(t), 0), errors, totals: totals.map(v => Number(v.toFixed(1))), median: Number(sorted[Math.floor(repeat / 2)].toFixed(1)) }));
