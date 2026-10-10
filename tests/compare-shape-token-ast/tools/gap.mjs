// 全量 gap 报告：117 格一次跑完，按「真差额」排序。
//
//   node tests/compare-shape-token-ast/tools/gap.mjs                 # 打表
//   node tests/compare-shape-token-ast/tools/gap.mjs --json tmp/gap.json
//
// 归一秒一份：`../shape-kinds.mjs`（本门唯一的一份）。从前这里与 run.mjs 各有一份，**漂过**
// ——缺 `PropertyAccess → PropertyAccessExpression` 那几条，把 5 处「换名」误报成「真缺」。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { KIND_BY_TAG, KEYWORD_KIND, TOKEN_KIND, TS_KIND_ALIASES, productKindOf, tsKindOf } from "../shape-kinds.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const HARNESS = path.resolve(here, "..");
const ROOT = path.resolve(here, "..", "..", "..");
const require = createRequire(import.meta.url);
const ts = require(path.join(ROOT, "node_modules", "typescript"));
const { Template } = require(path.join(ROOT, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(ROOT, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(ROOT, "build", "ts", "typescript", "text-context.js"));

const jsonAt = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : "";

/** 出口 1（XML）→ 产物树。 */
function parseProductXml(text) {
  const root = { tag: null, attrs: new Map(), kids: [], text: "" };
  const stack = [root];
  const re =
    /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/([A-Za-z_][A-Za-z0-9_]*)\s*>|<([A-Za-z_][A-Za-z0-9_]*)((?:\s+[A-Za-z_][A-Za-z0-9_]*="(?:[^"\\]|\\.)*")*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[5] !== undefined) {
      stack[stack.length - 1].text += m[5];
      continue;
    }
    if (m[1] !== undefined) {
      stack.pop();
      continue;
    }
    if (m[2] === undefined) continue;
    const attrs = new Map();
    for (const a of m[3].matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"((?:[^"\\]|\\.)*)"/g)) attrs.set(a[1], a[2]);
    const node = { tag: m[2], attrs, kids: [], text: "" };
    stack[stack.length - 1].kids.push(node);
    if (m[4] !== "/") stack.push(node);
  }
  return root.kids;
}

const rangeOf = (attrs) => {
  const m = /^\[(-?\d+),(-?\d+)\]$/.exec(attrs.get("range") ?? "");
  return m ? [Number(m[1]), Number(m[2])] : [null, null];
};

const SHELLS = new Set([
  "Root", "SourceFile", "EndOfFileToken", "Statement", "ExpressionStatement", "Block", "ModuleBlock",
  "SyntaxList", "ClassBody", "InterfaceBody", "TypeLiteralBody", "FunctionBody", "MethodBody",
  "LambdaBody", "NamespaceBody", "ForBody", "ForeachBody", "WhileBody", "TryBody", "CatchBody", "FinallyBody",
]);
const isTokenKind = (k) => /Token$/.test(k) || /Keyword$/.test(k);
// **判「真括号」要看 `startBracket`**，而树节点上没有 `attrs` —— 所以这一格由 `tree()` 带下来
//（第一版在这里读 `n.attrs.get(...)`，45 条用例当场抛「reading 'get'」）。
const isShell = (n) => SHELLS.has(n.kind) || (n.tag === "Bracket" && (n.startBracket ?? "") === "");

const tree = (node) => {
  const [s, e] = rangeOf(node.attrs);
  return {
    kind: productKindOf(node.tag, node.text),
    tag: node.tag,
    start: s,
    end: e,
    startBracket: node.attrs.get("startBracket"),
    kids: node.kids.map(tree),
  };
};
const core = (node) => {
  const out = [];
  for (const k of node.kids) {
    if (isTokenKind(k.kind)) continue;
    if (isShell(k)) {
      out.push(...core(k));
      continue;
    }
    out.push(k);
  }
  return out;
};
const coreTree = (n) => ({ kind: n.kind, start: n.start, end: n.end, kids: core(n).map(coreTree) });
const shape = (n) => (n.kids.length === 0 ? n.kind : `${n.kind}(${n.kids.map(shape).join(",")})`);

function tsTree(node, sf) {
  const kids = [];
  ts.forEachChild(node, (child, key) => {
    let field = key;
    if (field === undefined) {
      field = Object.keys(node).find((k) => node[k] === child || (Array.isArray(node[k]) && node[k].includes(child)));
    }
    kids.push({ field: field ?? "?", ...tsTree(child, sf) });
  });
  return { kind: tsKindOf(ts.SyntaxKind[node.kind]), start: node.getStart(sf), end: node.end, kids };
}

function parse(source, file) {
  const document = new TextDocument(source);
  document.FilePath = file;
  const context = new TextContext(new Template());
  context.Process(document);
  return context.Root;
}

const dirs = fs
  .readdirSync(HARNESS, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== "tools")
  .map((e) => e.name)
  .sort();

const rows = [];
for (const dir of dirs) {
  const at = path.join(HARNESS, dir);
  for (const f of fs.readdirSync(at).filter((x) => x.endsWith(".ts")).sort()) {
    const raw = fs.readFileSync(path.join(at, f), "utf8").replace(/^\uFEFF/, "");
    const token = (raw.match(/^\/\/\s*token:\s*(\w+)/m) ?? [])[1] ?? "";
    const source = raw.replace(/^\/\/\s*token:.*$/m, "").trim();
    const row = { dir, token, file: f.replace(/\.ts$/, ""), source };
    try {
      const rootToken = parse(source, f);
      // **直接解析紧凑 XML**（出口 1 的原样）：解析器两种都能吃，不必先过 `FormatXml`
      //（第一版在这里多调了一层格式化，45 条用例当场抛「reading 'get'」）。
      const xml = parseProductXml(rootToken.ToXmlString());
      const ourWrap = { kind: "ROOT", start: 0, end: source.length, kids: xml.map(tree) };
      const sf = ts.createSourceFile(f, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      const tsWrap = { kind: "ROOT", start: 0, end: source.length, kids: [tsTree(sf, sf)] };
      const oc = coreTree(ourWrap);
      const tc = coreTree(tsWrap);
      row.coreSame = shape(oc) === shape(tc);
      const slots = new Set();
      const collect = (n) => {
        for (const k of n.kids) {
          slots.add(`${k.kind}@${k.start}-${k.end}`);
          collect(k);
        }
      };
      collect(oc);
      const missing = new Map();
      const startOnly = new Map();
      const walkTs = (n) => {
        for (const k of n.kids) {
          if (!slots.has(`${k.kind}@${k.start}-${k.end}`)) {
            const sameKind = [...slots].some((s) => s.startsWith(`${k.kind}@`));
            const bucket = sameKind ? startOnly : missing;
            bucket.set(k.kind, (bucket.get(k.kind) ?? 0) + 1);
          }
          walkTs(k);
        }
      };
      walkTs(tc);
      const tsSlots = new Set();
      const collectTs = (n) => {
        for (const k of n.kids) {
          tsSlots.add(`${k.kind}@${k.start}-${k.end}`);
          collectTs(k);
        }
      };
      collectTs(tc);
      const extra = new Map();
      const walkOurs = (n) => {
        for (const k of n.kids) {
          if (!tsSlots.has(`${k.kind}@${k.start}-${k.end}`)) extra.set(k.kind, (extra.get(k.kind) ?? 0) + 1);
          walkOurs(k);
        }
      };
      walkOurs(oc);
      row.missing = [...missing.entries()].sort((a, b) => b[1] - a[1]);
      row.startOnly = [...startOnly.entries()].sort((a, b) => b[1] - a[1]);
      row.extra = [...extra.entries()].sort((a, b) => b[1] - a[1]);
      row.missingTotal = row.missing.reduce((n, [, c]) => n + c, 0);
      row.startOnlyTotal = row.startOnly.reduce((n, [, c]) => n + c, 0);
      row.extraTotal = row.extra.reduce((n, [, c]) => n + c, 0);
    } catch (error) {
      row.crash = String(error && error.message ? error.message : error).split("\n")[0];
      if (process.env.PA_DEBUG) console.error(`\n[${dir}/${f}] ${row.crash}\n${error && error.stack}`, row.source);
    }
    rows.push(row);
  }
}

// ---- 「真缺」那一栏的分类：换名 / 包装 / 标点 / 真缺 ----
const SHELL_KINDS = new Set([
  "SourceFile", "EndOfFileToken", "ExpressionStatement", "Block", "ModuleBlock", "ClassBody",
  "CaseBlock", "SyntaxList", "VariableStatement", "VariableDeclarationList", "ImportClause",
  "NamedImports", "NamedExports", "ImportSpecifier", "ExportSpecifier", "CaseClause", "DefaultClause",
  "CatchClause", "TemplateSpan", "PropertyAssignment", "VariableDeclaration", "Parameter",
]);
const tagByKind = new Map([...KIND_BY_TAG].map(([tag, kind]) => [kind, tag]));
const keywordByKind = new Map([...KEYWORD_KIND].map(([text, kind]) => [kind, text]));
const bucketOf = (kind) => {
  if (tagByKind.has(kind)) return "换名";
  if (keywordByKind.has(kind)) return "换名";
  if (SHELL_KINDS.has(kind)) return "包装";
  if (/Token$/.test(kind)) return "标点";
  return "真缺";
};

const agg = new Map();
for (const r of rows) {
  if (!agg.has(r.dir)) agg.set(r.dir, { dir: r.dir, token: r.token, cases: 0, same: 0, missing: 0, startOnly: 0, extra: 0, real: new Map() });
  const a = agg.get(r.dir);
  a.cases++;
  if (r.coreSame) a.same++;
  a.missing += r.missingTotal ?? 0;
  a.startOnly += r.startOnlyTotal ?? 0;
  a.extra += r.extraTotal ?? 0;
  for (const [k, c] of r.missing ?? []) {
    if (bucketOf(k) !== "真缺") continue;
    a.real.set(k, (a.real.get(k) ?? 0) + c);
  }
}
const list = [...agg.values()];
const realTotal = list.reduce((n, a) => n + [...a.real.values()].reduce((x, y) => x + y, 0), 0);
const ranked = list.filter((a) => a.real.size > 0).sort((a, b) => {
  const ra = [...a.real.values()].reduce((x, y) => x + y, 0);
  const rb = [...b.real.values()].reduce((x, y) => x + y, 0);
  return rb - ra;
});

console.log(`=== 全量 gap：${rows.length} 条用例 / ${list.length} 格`);
console.log(`内核同形 ${list.reduce((n, a) => n + a.same, 0)}/${rows.length}；「真缺」共 ${realTotal} 处，落在 ${ranked.length} 格\n`);
console.log("  「真缺」排序（既不是换名、也不是包装/标点）");
console.log("  格".padEnd(30) + "处数   真缺的 kind（前 5）");
for (const a of ranked) {
  const kinds = [...a.real.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, c]) => `${k}×${c}`).join(" ");
  console.log(`  ${a.dir.padEnd(28)} ${String([...a.real.values()].reduce((x, y) => x + y, 0)).padStart(4)}   ${kinds}`);
}
const byKind = new Map();
for (const a of ranked) for (const [k, n] of a.real) byKind.set(k, (byKind.get(k) ?? 0) + n);
console.log(`\n=== 「真缺」的 kind 汇总（全仓）===`);
for (const [k, n] of [...byKind.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`);
const crash = rows.filter((r) => r.crash);
console.log(`\n坏掉的：${crash.length}`);
if (jsonAt) {
  fs.writeFileSync(
    path.resolve(ROOT, jsonAt),
    JSON.stringify({ rows, agg: list.map((a) => ({ ...a, real: [...a.real] })) }, null, 1),
    "utf8",
  );
  console.log(`原始读数写入 ${jsonAt}`);
}
