// 交叉统计：开关位、指标计数器、纯壳 shape、possible/end 的分布
import fs from "node:fs";
import path from "node:path";

const recs = JSON.parse(fs.readFileSync("tmp/importance-facts.json", "utf8"));

function walk(d, o = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) {
      if (/^(node_modules|dist|build|tmp|tests|samples|\.git|\.xl)$/.test(e.name)) continue;
      walk(f, o);
    } else if (e.name.endsWith(".xl.md")) o.push(f);
  }
  return o;
}
const files = walk(process.cwd());
const text = new Map(files.map((f) => [path.relative(process.cwd(), f).replace(/\\/g, "/"), fs.readFileSync(f, "utf8")]));

// 1. Enable* 开关：## field EnableX 定义
const enableDefs = [];
for (const [f, t] of text) {
  for (const m of t.matchAll(/^##\s+(?:static\s+)?field\s+(Enable[A-Za-z0-9_]+)/gm)) enableDefs.push({ file: f, field: m[1] });
}
console.log("Enable* 字段定义:", enableDefs.length, "分布在", new Set(enableDefs.map((x) => x.file)).size, "个文件");
const byField = {};
for (const e of enableDefs) byField[e.field] = (byField[e.field] || 0) + 1;
console.log(Object.entries(byField).map(([k, v]) => `${k}${v > 1 ? "×" + v : ""}`).join(" "));

// 2. 指标类 / 计数器
const metrics = [];
for (const [f, t] of text) {
  for (const m of t.matchAll(/^#\s+class\s+([A-Za-z0-9_]*Metric[A-Za-z0-9_]*|[A-Za-z0-9_]*Count[A-Za-z0-9_]*)/gm)) metrics.push(`${f}:${m[1]}`);
}
console.log("\n指标/计数类:", metrics.length);
for (const m of metrics) console.log("  " + m);

// 3. 纯壳 shape：ShapeToken 子类且没有方法体（只有 constructor）
const shells = recs.filter((r) => {
  const shapeClasses = r.classes.filter((c) => c.isShape);
  if (shapeClasses.length === 0) return false;
  return r.codeLines <= 3;
});
console.log("\n代码行<=3 的 shape 文件:", shells.length);

// 4. possible / end 文件分布
const possibles = recs.filter((r) => r.classes.some((c) => c.name.endsWith("PossibleShape")));
const ends = recs.filter((r) => r.classes.some((c) => c.name.endsWith("EndPossibleShape")));
console.log("含 *PossibleShape 类的文件:", possibles.length, " 其中 *EndPossibleShape:", ends.length);

// 5. 类名 extends ShapeToken 的总数
let shapeClassCount = 0;
for (const r of recs) for (const c of r.classes) if (c.isShape) shapeClassCount++;
console.log("shape 类总数:", shapeClassCount);
const noMethodShapes = [];
for (const r of recs) {
  for (const c of r.classes) {
    if (!c.isShape) continue;
    const bodies = c.methods.filter((m) => m.name !== "constructor" && m.hasBody);
    if (bodies.length === 0) noMethodShapes.push(`${r.file}:${c.name}`);
  }
}
console.log("无方法体（除构造函数）的 shape 类:", noMethodShapes.length);
