// 汇总 41 篇区域文档：逐文件结论 + 编号→文件索引（对格式差异鲁棒）
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "docs", "importance-1028");
const docs = fs
  .readdirSync(dir)
  .filter((f) => /^\d\d-/.test(f) && f.endsWith(".md") && !/^(00|01|98|99)/.test(f))
  .sort();

const FILE_RE = /^###\s+((?:core|typescript|cjcli)[^\s（(]*)/gm;
const codeOf = (s) => [...new Set([...s.matchAll(/`\[([A-Z]\d+)\]`/g)].map((m) => m[1]))];

let totalFiles = 0;
let devFiles = 0;
let devEntries = 0;
const codeFiles = new Map();
const codeEntries = new Map();
const perDoc = [];

for (const d of docs) {
  const text = fs.readFileSync(path.join(dir, d), "utf8");
  const blocks = text.split(FILE_RE).slice(1);
  // split 后 [头, file1, body1, file2, body2...]
  let nFiles = 0;
  let nDev = 0;
  let nEntries = 0;
  const docCodes = new Map();
  for (let i = 0; i < blocks.length; i += 2) {
    const file = blocks[i];
    const body = blocks[i + 1] || "";
    if (!file) continue;
    nFiles++;
    const verdict = body.match(/结论：\**\s*(符合|偏离)[（(]\s*(\d+)\s*条/);
    if (verdict) {
      if (verdict[1] === "偏离") {
        nDev++;
        nEntries += Number(verdict[2]);
      }
    } else if (/结论：\**\s*偏离/.test(body)) {
      nDev++;
      nEntries += 1;
    }
    for (const c of codeOf(body.split(/\r?\n/).filter((l) => !/符合|不涉及|未出现|成立/.test(l)).join("\n"))) {
      if (!codeFiles.has(c)) codeFiles.set(c, new Set());
      codeFiles.get(c).add(file);
      docCodes.set(c, (docCodes.get(c) || 0) + 1);
    }
  }
  // 表格型文档（81/82/83 等）没有逐文件「结论」行：用「本批统计」里的偏离条数
  const statLine = text.match(/按编号计数[^\n]*?[（(]?合计?\s*(\d+)\s*条/);
  if (nEntries === 0 && statLine) nEntries = Number(statLine[1]);
  for (const [c, n] of docCodes) codeEntries.set(c, (codeEntries.get(c) || 0) + n);
  totalFiles += nFiles;
  devFiles += nDev;
  devEntries += nEntries;
  perDoc.push({ doc: d, files: nFiles, devFiles: nDev, entries: nEntries });
}

console.log("docs:", docs.length, "| 逐文件小节总数:", totalFiles, "| 有偏离:", devFiles, "| 偏离条目:", devEntries);
console.log("\n## per doc");
for (const p of perDoc) console.log(`${p.doc}\t${p.files}\t${p.devFiles}\t${p.entries}`);
console.log("\n## 编号 → 文件数（同一文件多次出现只算一次）");
const rows = [...codeFiles.entries()].sort((a, b) => b[1].size - a[1].size);
for (const [c, set] of rows) console.log(`${c}\t${set.size}`);
fs.writeFileSync(
  path.join(process.cwd(), "tmp", "summary-counts.json"),
  JSON.stringify({ perDoc, codeFiles: Object.fromEntries(rows.map(([c, s]) => [c, [...s]])), totalFiles, devFiles, devEntries }, null, 1),
);
