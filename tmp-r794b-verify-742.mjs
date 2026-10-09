#!/usr/bin/env node
// 第 794 轮（二）的机械核对：`runtime/round742` 的 34 条原子探针被并进 8 条之后，
// 每一条探针的 stdout 必须**整块、按顺序**出现在它要去的那条保留条的 stdout 里。
// 这是「合并没丢断言」的唯一证据——人眼看合并会漏（第 794 轮第一段就漏了 4 条）。
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const dir = "tests/cases/runtime/round742";
const oldDir = "tmp-r794b-old";

// 探针 → 被并进的保留条（顺序就是它在保留条正文里的先后）
const map = {
  "001-switch-match-semantics": ["p742a-a05", "p742a-a06", "p742a-a04", "p742c-c03", "p742c-c04", "p742a-a10", "p742a-a14", "p742c-c07", "p742c-c10"],
  "002-switch-default-position": ["p742c-c01", "p742a-a07", "p742a-a02", "p742c-c02"],
  "003-switch-fallthrough": ["p742a-a01", "p742a-a11", "p742c-c09"],
  "004-switch-blocks-and-scope": ["p742a-a03", "p742c-c08", "p742a-a13", "p742c-c05", "p742c-c06", "p742a-a12", "p742a-a08"],
  "005-switch-return-and-throw": ["p742a-a09"],
  "006-loops-and-labels": ["p742c-c12", "p742c-c19", "p742c-c20", "p742c-c21", "p742c-c15"],
  "007-statement-boundaries": ["p742c-c13", "p742c-c14"],
  "008-try-finally-control-flow": ["p742c-c16", "p742c-c17", "p742c-c18"],
};

function outOf(file) {
  const r = spawnSync(process.execPath, [file], { encoding: "utf8" });
  return (r.stdout || "").split("\n").filter((l) => l !== "");
}

let checked = 0, bad = 0;
for (const [anchor, probes] of Object.entries(map)) {
  const merged = outOf(path.join(dir, anchor + ".ts"));
  const probeLines = probes.map((n) => ({ n, lines: outOf(path.join(oldDir, n + ".ts")) }));
  const want = probeLines.flatMap((p) => p.lines);
  // 整块顺序比对：合并后的 stdout 应当**恰好**是各探针 stdout 的顺次相接
  // （每条探针自己就打印完整的一行/几行，外面那层 try 只在它自己抛的时候才补一行）。
  const same = merged.length === want.length && merged.every((line, i) => line === want[i]);
  checked++;
  if (same) { console.log(`✓ ${anchor}：${probes.length} 条探针 × ${want.length} 行，逐行相同`); continue; }
  bad++;
  console.log(`✗ ${anchor}：合并件 ${merged.length} 行 vs 「${probes.length} 条探针之和」${want.length} 行`);
  const n = Math.max(merged.length, want.length);
  for (let i = 0; i < n; i++) if (merged[i] !== want[i]) console.log(`    第 ${i + 1} 行：合并 «${merged[i]}» vs 之和 «${want[i]}»`);
}
console.log(`\n核验 ${checked} 条保留条；不一致 ${bad} 条`);
process.exit(bad === 0 ? 0 : 1);
