// 精确的散文检测：围栏外、非标题、非 enum case、非 import 的非空行 = 散文
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

const out = [];
for (const f of walk(process.cwd())) {
  const lines = fs.readFileSync(f, "utf8").split("\n");
  let inFence = false;
  const prose = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const t = line.trim();
    if (t.length === 0) continue;
    if (t.startsWith("#")) continue;
    if (t.startsWith("- ")) continue;
    if (/^(import|export)\b/.test(t)) continue;
    prose.push(`${i + 1}: ${t}`);
  }
  if (prose.length) out.push({ file: path.relative(process.cwd(), f).replace(/\\/g, "/"), n: prose.length, sample: prose.slice(0, 8) });
}

console.log("files with prose:", out.length, "total lines:", out.reduce((a, b) => a + b.n, 0));
for (const r of out) {
  console.log("---", r.file, r.n);
  for (const l of r.sample) console.log("    ", l.slice(0, 160));
}
fs.writeFileSync(path.join(process.cwd(), "tmp", "prose.json"), JSON.stringify(out, null, 1));
