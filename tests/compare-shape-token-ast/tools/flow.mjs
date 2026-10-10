import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ROOT = path.resolve(here, "..", "..", "..");
const dir = process.argv[2] ?? "method";
const only = process.argv[3] ?? "";
const at = path.join(ROOT, "tests", "compare-shape-token-ast", dir);

// ---- 出口 1：把 XML 解成树（标签 / range / 其它属性）----
//
// **必须处理收尾标签与自闭合**：第一版只认 `<tag …>` 与 `<tag … />`，
// 于是 `<X></X>` 那种「开了没关」会把后面的兄弟全挂到它下面，
// 而 `<X />` 自闭合又会被当成开标签继续吃子孙——两种错都会让这一栏**漏报**。
function parseXml(text) {
  const root = { tag: null, attrs: new Map(), kids: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/([A-Za-z_][A-Za-z0-9_]*)\s*>|<([A-Za-z_][A-Za-z0-9_]*)((?:\s+[A-Za-z_][A-Za-z0-9_]*="(?:[^"\\]|\\.)*")*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[5] !== undefined) {
      const t = m[5];
      if (t.trim() !== "") {
        const top = stack[stack.length - 1];
        top.text = (top.text ?? "") + t;
      }
      continue;
    }
    if (m[1] !== undefined) {
      stack.pop();
      continue;
    }
    if (m[2] === undefined) continue; // 注释 / PI
    const attrs = new Map();
    for (const a of m[3].matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"((?:[^"\\]|\\.)*)"/g)) attrs.set(a[1], a[2]);
    const node = { tag: m[2], attrs, kids: [], selfClosed: m[4] === "/" };
    stack[stack.length - 1].kids.push(node);
    if (m[4] !== "/") stack.push(node);
  }
  return root.kids;
}

// ---- 出口 3：AST JSON ----
function flattenAst(node, out, depth) {
  if (node === null || typeof node !== "object") return;
  if (typeof node.kind === "string") {
    out.push({ kind: node.kind, pos: node.pos ?? 0, end: node.end ?? 0, depth, node });
    depth += 1;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "kind" || key === "pos" || key === "end" || key === "text") continue;
    if (Array.isArray(value)) for (const v of value) flattenAst(v, out, depth);
    else if (value && typeof value === "object") flattenAst(value, out, depth);
  }
  return out;
}

const files = fs
  .readdirSync(at)
  .filter((f) => f.endsWith(".ts") && (!only || f.startsWith(only)))
  .sort();

for (const file of files) {
  const stem = path.basename(file, ".ts");
  const xmlPath = path.join(at, "xml", `${stem}.xml`);
  const astPath = path.join(at, "ast", `${stem}.json`);
  if (!fs.existsSync(xmlPath) || !fs.existsSync(astPath)) {
    console.log(`（缺落盘：${stem}——先跑 run.mjs --snapshot）`);
    continue;
  }
  const source = fs.readFileSync(path.join(at, file), "utf8").replace(/^\/\/\s*token:.*$/m, "").trim();
  const xml = parseXml(fs.readFileSync(xmlPath, "utf8"));
  const ast = flattenAst(JSON.parse(fs.readFileSync(astPath, "utf8")), [], 0);

  const key = (s, e) => `${s}-${e}`;
  const bySpan = new Map();
  for (const a of ast) {
    const k = key(a.pos, a.end);
    if (!bySpan.has(k)) bySpan.set(k, []);
    bySpan.get(k).push(a.kind);
  }

  console.log(`\n=== ${dir}/${stem}   源码 ${JSON.stringify(source)}`);
  const walk = (node, depth) => {
    const range = node.attrs.get("range");
    let mark = "";
    if (range) {
      const m = /^\[(-?\d+),(-?\d+)\]$/.exec(range);
      if (m) {
        const k = key(Number(m[1]), Number(m[2]) + 1);
        const hit = bySpan.get(k);
        mark = hit ? `→ ${hit.join("/")}` : "→ **没有对应的 AST 节点**";
        if (hit) bySpan.get(k).shift();
      }
    }
    const others = [...node.attrs].filter(([k]) => k !== "range").map(([k, v]) => `${k}="${v}"`);
    const scalar = node.text && node.text.trim() ? ` 文本=${JSON.stringify(node.text.trim().slice(0, 20))}` : "";
    console.log(
      `  ${"  ".repeat(depth)}<${node.tag}> ${range ?? "(无坐标)"}${others.length ? " " + others.join(" ") : ""}${scalar}  ${mark}`,
    );
    for (const kid of node.kids) walk(kid, depth + 1);
  };
  console.log("--- 产物节点（XML，带它变成了哪个 AST 节点）---");
  for (const n of xml) walk(n, 0);
  const left = [...bySpan.entries()].filter(([, v]) => v.length > 0);
  console.log("--- AST 有、产物那棵树里没有对上的（按区间）---");
  if (left.length === 0) console.log("  （无）");
  for (const [k, v] of left) console.log(`  [${k.replace("-", ",")}]  ${v.join("/")}`);
}
