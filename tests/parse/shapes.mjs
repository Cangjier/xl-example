// 形状覆盖尺子：**真实语料里出现过的每一种节点形状，用例语料里必须至少有一条**。
//
//   node tests/parse/shapes.mjs                 全部
//   node tests/parse/shapes.mjs --list          连已覆盖的签名也列出来
//   node tests/parse/shapes.mjs --top 40        未覆盖的最多列几条
//
// ## 为什么要这一把
//
// `cases:tsast` 量的是**形状对不对**（用例 + 真实语料逐节点对拍）。它绿不等于
// 用例**覆盖了**这些形状：真实语料来自 `node_modules`（会随依赖升级而变、也可能整份消失），
// 而用例是仓库里自己的回归网。今天对得上的形状，明天可能就没有任何一条用例再看守它。
//
// 判据：TS 语义节点（`forEachChild` 那一层）的**形状签名** = `kind + 有子节点的字段名`，
// 例如 `FunctionDeclaration|body,modifiers,name,parameters,type,typeParameters`。
// 字段名只列**真有子节点的**那些（`ts.forEachChild` 的语义），所以「有没有形参」「有没有返回类型」
// 这类差别直接体现在签名上——它们正是投影要分头处理的那些分支。
//
// 2026-10 的读数：外部语料 + `samples` 共 322 种签名 / 178 种 kind，用例侧 **0 种未覆盖**。
//
// 语料口径与 `ts-ast.mjs` 的 `real` 一致，只差 `dist/ts`：产物是自己写出来的，
// 把它算进「必须有用例」会让改一个 `.xl.md` 就莫名其妙红一道门。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { listCases } from "./validate.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const ts = require(path.join(root, "node_modules", "typescript"));
const SK = ts.SyntaxKind;
const kindName = (kind) => SK[kind] ?? String(kind);

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback) => {
  const at = args.indexOf(name);
  return at >= 0 && at + 1 < args.length ? args[at + 1] : fallback;
};

function walk(dir, out) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|mts|cts)$/.test(full)) out.push(full);
  }
  return out;
}

/** 外部真实语料（与 `ts-ast.mjs` 的 `real` 同源，不含 `dist/ts`）。 */
function externalCorpus() {
  const files = [
    ...walk(path.join(root, "node_modules", "@types"), []),
    ...walk(path.join(root, "node_modules", "typescript", "lib"), []),
    ...walk(path.join(root, "node_modules", "undici-types"), []),
    ...walk(path.join(root, "samples"), []),
  ];
  return [...new Set(files)];
}

/** 用例语料：`xl:ts-invalid` 与 `.tsx` 不算（TS 那边解析不出语义节点）。 */
function caseCorpus() {
  return listCases()
    .filter((one) => !one.directives.tsInvalid && !one.file.endsWith(".tsx"))
    .map((one) => one.file);
}

/** 一个节点的**有子节点的字段名**（`ts.forEachChild` 的那一层）。 */
function childFieldsOf(node) {
  const fields = [];
  ts.forEachChild(node, (child, key) => {
    const name = key ?? Object.keys(node).find((k) => {
      const value = node[k];
      return value === child || (Array.isArray(value) && value.includes(child));
    });
    if (name !== undefined && !fields.includes(name)) fields.push(name);
  });
  return fields.sort();
}

/** 收集 `路径 → Map<签名, 第一处样本>` 与 `Map<kind, 第一处样本>`。 */
function collect(files) {
  const shapes = new Map();
  const kinds = new Map();
  let failed = 0;
  for (const file of files) {
    let source = "";
    try {
      source = fs.readFileSync(file, "utf8");
    } catch {
      failed++;
      continue;
    }
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const visit = (node) => {
      const kind = kindName(node.kind);
      const shape = `${kind}|${childFieldsOf(node).join(",")}`;
      if (!shapes.has(shape)) shapes.set(shape, file);
      if (!kinds.has(kind)) kinds.set(kind, file);
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return { shapes, kinds, failed, count: files.length };
}

const rel = (file) => path.relative(root, file);
const external = collect(externalCorpus());
const cases = collect(caseCorpus());

const missingShapes = [...external.shapes.keys()].filter((shape) => !cases.shapes.has(shape)).sort();
const missingKinds = [...external.kinds.keys()].filter((kind) => !cases.kinds.has(kind)).sort();
const top = Number(value("--top", "40"));

console.log(
  `形状覆盖：外部语料 ${external.shapes.size} 种签名 / ${external.kinds.size} 种 kind，`
  + `用例 ${cases.shapes.size} 种签名 / ${cases.kinds.size} 种 kind`,
);
if (flag("--list")) {
  for (const shape of [...cases.shapes.keys()].sort()) console.log(`  ok        ${shape}`);
}
if (missingKinds.length > 0) {
  console.log(`\n外部语料有、用例里一个都没有的 kind（${missingKinds.length} 种）：`);
  for (const kind of missingKinds.slice(0, top)) console.log(`  ${kind.padEnd(34)} ${rel(external.kinds.get(kind))}`);
}
if (missingShapes.length > 0) {
  console.log(`\n外部语料有、用例里一个都没有的形状（${missingShapes.length} 种）：`);
  for (const shape of missingShapes.slice(0, top)) console.log(`  ${shape.padEnd(70)} ${rel(external.shapes.get(shape))}`);
}
console.log(
  `\n未覆盖：kind ${missingKinds.length} 种、形状签名 ${missingShapes.length} 种；`
  + `外部语料 ${external.count} 份、用例 ${cases.count} 份`,
);
process.exitCode = missingShapes.length === 0 && missingKinds.length === 0 && external.failed === 0 ? 0 : 1;
