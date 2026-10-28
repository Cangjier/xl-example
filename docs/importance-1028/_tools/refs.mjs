// 为每个 punctuation / keywords 形状类列出「外部引用点」（文件名 + 行号）
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
const files = walk(process.cwd()).map((f) => ({ rel: path.relative(process.cwd(), f).replace(/\\/g, "/"), lines: fs.readFileSync(f, "utf8").split("\n") }));

const target = process.argv[2] || "punctuation";
const out = [];
for (const { rel, lines } of files) {
  if (!rel.includes("/" + target + "/")) continue;
  const text = lines.join("\n");
  const cls = text.match(/^#\s+class\s+([A-Za-z0-9_]+)/m);
  if (!cls) continue;
  const name = cls[1];
  const hits = [];
  for (const other of files) {
    if (other.rel === rel) continue;
    other.lines.forEach((l, i) => {
      if (new RegExp("\\b" + name + "\\b").test(l)) hits.push(`${other.rel}:${i + 1}`);
    });
  }
  out.push(`${rel}  ${name}  refs=${hits.length}${hits.length ? "  " + hits.slice(0, 6).join(" ") : ""}`);
}
console.log(out.join("\n"));
console.log("total:", out.length, "unused:", out.filter((x) => x.includes("refs=0")).length);
