#!/usr/bin/env node
// 第 794 轮（二）：`stdlib/round719` 的 26 条探针是不是**已经被数值域覆盖**了？
// 先把 stdlib/math + stdlib/number 两个域的 stdout 汇成一份「已有断言池」，
// 再看每条探针的哪几行在池子里找不到——找不到的那几行才是**真的独有**。
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["tests/cases/stdlib/math", "tests/cases/stdlib/number"];
const probeDir = "tests/cases/stdlib/round719";

function outOf(file) {
  const r = spawnSync(process.execPath, [file], { encoding: "utf8" });
  return (r.stdout || "").split("\n").filter((l) => l !== "");
}

const pool = new Set();
let poolFiles = 0;
for (const root of roots) {
  for (const name of fs.readdirSync(root)) {
    if (!name.endsWith(".ts")) continue;
    poolFiles++;
    for (const line of outOf(path.join(root, name))) pool.add(line);
  }
}
console.log(`已有断言池：${poolFiles} 个文件、${pool.size} 个不同的值行`);

const poolLines = [...pool];
/** 把一行拆成「值记号」：`string:0|2|2` → ["0","2","2"]、`string:-Infinity|-Infinity` → ["-Infinity","-Infinity"]。
 *  拆之前先剥掉最前面的 `string:` / `number:` / `throw:` / `boolean:` 那一层类型前缀，
 *  否则 `string:0|2` 会把 `string:0` 当成一个记号，跟池子里的 `number:0` 对不上。 */
const tokenize = (line) => line
  .replace(/^(string|number|boolean|throw|undefined|null|object):/, "")
  .split(/[|\s]+/)
  .filter((t) => t !== "");
const poolTokens = poolLines.map(tokenize);
const hasToken = (t) => poolTokens.some((tokens) => tokens.includes(t));
/** 老行在池子里算不算有：逐字 / 子串 / 每个值记号都能在某一行的记号表里找到。 */
const covered = (line) => {
  if (pool.has(line)) return true;
  if (poolLines.some((p) => p.includes(line))) return true;
  const tokens = tokenize(line);
  if (tokens.length === 0) return true;
  return tokens.every(hasToken);
};
let owned = 0, orphan = 0;
const orphanRows = [];
for (const name of fs.readdirSync(probeDir).sort()) {
  if (!name.endsWith(".ts")) continue;
  const lines = outOf(path.join(probeDir, name));
  const missing = lines.filter((line) => !covered(line));
  if (missing.length === 0) { owned++; continue; }
  orphan++;
  orphanRows.push([name, missing]);
}
console.log(`\n26 条探针：被覆盖 ${owned} 条、有独有断言 ${orphan} 条`);
for (const [name, missing] of orphanRows) {
  console.log(`\n✗ ${name}`);
  for (const row of missing) console.log(`    ${row}`);
}
