// 全仓形状类零引用统计（符号级）
import fs from "node:fs";
import path from "node:path";

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
const files = walk(process.cwd()).map((f) => ({ rel: path.relative(process.cwd(), f).replace(/\\/g, "/"), text: fs.readFileSync(f, "utf8") }));
const all = files.map((x) => x.text).join("\n");

let classes = 0;
let shapeClasses = 0;
const zero = [];
for (const { rel, text } of files) {
  const cls = text.match(/^#\s+class\s+([A-Za-z0-9_]+)([^\n]*)$/m);
  if (!cls) continue;
  classes++;
  if (!/extends\s+ShapeToken/.test(cls[2]) && !/extends\s+PossibleShape/.test(cls[2]) && !/Shape$/.test(cls[1])) continue;
  shapeClasses++;
  const name = cls[1];
  const re = new RegExp("\\b" + name + "\\b", "g");
  const total = (all.match(re) || []).length;
  const self = (text.match(re) || []).length;
  if (total - self === 0) zero.push(rel);
}
console.log("first-class 文件数:", classes, "形状类文件:", shapeClasses, "符号级零引用:", zero.length);
fs.writeFileSync("tmp/zero-shapes-all.txt", zero.join("\n"));
