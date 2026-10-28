// 检查 docs/importance-1028 下 markdown 内部链接是否存在
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "docs", "importance-1028");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
const bad = [];
for (const f of files) {
  const text = fs.readFileSync(path.join(dir, f), "utf8");
  for (const m of text.matchAll(/\]\(([^)#]+\.md)(?:#[^)]*)?\)/g)) {
    const target = m[1];
    if (/^https?:/.test(target)) continue;
    const resolved = path.resolve(dir, target);
    if (!fs.existsSync(resolved)) bad.push(`${f} -> ${target}`);
  }
}
console.log("docs:", files.length, "| broken links:", bad.length);
for (const b of bad) console.log("  " + b);
