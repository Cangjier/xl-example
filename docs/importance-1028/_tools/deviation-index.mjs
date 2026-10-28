// 生成 98-deviation-index.md：编号 → 涉及文件（取自 41 篇的逐文件标记）
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "docs", "importance-1028");
const docs = fs
  .readdirSync(dir)
  .filter((f) => /^\d\d-/.test(f) && f.endsWith(".md") && !/^(00|01|98|99)/.test(f))
  .sort();

const FILE_RE = /^###\s+((?:core|typescript|cjcli)[^\s（(]*)/gm;
const MEANING = {
  S1: "basic token 层缺失/越权（词法里做了语法层的事）",
  S2: "语法层三件套不成立（没有 possible/end，或 possible 不走 catalog guide）",
  S3: "shape 树与 TS AST 不同构（留壳类、层级不一致、区间哨兵当节点）",
  S4: "AST 不由 shape 产出（`ParseFromShape` 缺失，改由 builder/session 直建）",
  P1: "possible 触发时机/来源偏离（close 才触发、bracket create 不触发、自造触发点）",
  P2: "候选判定语义偏离（在 CatalogGuide 之外先判一遍/僵尸候选/永不让位）",
  P3: "build 去向偏离（该挂载却关闭、`return host` 不产出、`SignOut`/`TryToClose` 缺失）",
  P4: "bracket 晋升偏离（没有 HandleCloseDispatch、close 仍走原 possible/end）",
  C1: "每轮重扫（compute/build 内找形状或找 token，不看 cache）",
  C2: "能用增量却用全量（整段 raw 重建）",
  C3: "cache 语义偏离（state 未 reset、share 当 state、完全未用）",
  U1: "应消费未消费（build 时没把数据提取到字段；AST 阶段回读原文）",
  U2: "该回挂 parent 并 Reclose 却丢弃/跳过",
  U3: "未消费 token 不走 Reload Message",
  U4: "basic token 用后未丢弃（close 后 Data ≠ AST children）",
  B1: "越界未返回 Nothing（`ShapeStates` 无 Nothing，类型上不可表达）",
  B2: "compute/build 里 catch 掉异常",
  B3: "跳跃式处理（越过未消费的 basic token）",
  B4: "查看 tokenIndex 之后（含读未 token 化原文）",
  R1: "覆盖 ExitOrPre（R33 禁止；含用它结束自己）",
  R2: "覆盖 ComputePossibleShapes（R34 禁止）",
  X1: "设计外机制（转发器/扫描器/壳目录/direct session/开关位/计数器/注册表）",
  X2: "legacy/fallback 旁路（整段 raw 重建、整文件回退重解析）",
  X3: "tsx/JSX 形状存在（与「不支持 tsx」相悖）",
  D1: "散文（xl.md 围栏外的说明文字）",
  N: "不涉及",
};

const codeFiles = new Map();
for (const d of docs) {
  const text = fs.readFileSync(path.join(dir, d), "utf8");
  const blocks = text.split(FILE_RE).slice(1);
  for (let i = 0; i < blocks.length; i += 2) {
    const file = blocks[i];
    const body = blocks[i + 1] || "";
    if (!file) continue;
    const codes = [...new Set([...body.split(/\r?\n/).filter((l) => !/符合|不涉及|未出现|成立/.test(l)).join("\n").matchAll(/`\[([A-Z]\d+)\]`/g)].map((m) => m[1]))];
    for (const c of codes) {
      if (!codeFiles.has(c)) codeFiles.set(c, new Map());
      const m = codeFiles.get(c);
      m.set(file, (m.get(file) || 0) + 1);
    }
  }
}

const order = ["S1", "S2", "S3", "S4", "P1", "P2", "P3", "P4", "C1", "C2", "C3", "U1", "U2", "U3", "U4", "B1", "B2", "B3", "B4", "R1", "R2", "X1", "X2", "X3", "D1", "N"];
const lines = [];
lines.push("# 98 — 偏离编号索引（编号 → 涉及文件）");
lines.push("");
lines.push("由 35 篇区域文档的逐文件条目标记自动汇总（`node docs/importance-1028/_tools/deviation-index.mjs` 可重跑）。同一文件对同一编号只计一次；「条」是该编号在逐文件结论里提到的次数（粗略，仅作规模参考）。");
lines.push("");
lines.push("| 编号 | 含义 | 涉及文件数 |");
lines.push("| --- | --- | --- |");
for (const c of order) {
  const m = codeFiles.get(c);
  if (!m || m.size === 0) continue;
  lines.push(`| \`${c}\` | ${MEANING[c] || ""} | ${m.size} |`);
}
lines.push("");
for (const c of order) {
  const m = codeFiles.get(c);
  if (!m || m.size === 0) continue;
  lines.push(`## ${c} — ${MEANING[c] || ""}（${m.size} 个文件）`);
  lines.push("");
  const entries = [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [f, n] of entries) lines.push(`- \`${f}\`${n > 1 ? `（${n} 处）` : ""}`);
  lines.push("");
}
fs.writeFileSync(path.join(dir, "98-deviation-index.md"), lines.join("\n"));
console.log("wrote 98-deviation-index.md; codes:", [...codeFiles.keys()].length);
for (const c of order) if (codeFiles.get(c)) console.log(c, codeFiles.get(c).size);
