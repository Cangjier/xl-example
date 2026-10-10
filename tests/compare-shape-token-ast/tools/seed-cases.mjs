import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ROOT = path.resolve(here, "..", "..", "..");
const WRITE = process.argv.includes("--write");
const maxPerTag = Number(process.argv[process.argv.indexOf("--max") + 1]) || 2;

const { TAGS } = await import(pathToFileURL(path.join(ROOT, "tests", "parse", "validate.mjs")).href);
const { corpus } = await import(pathToFileURL(path.join(ROOT, "tests", "parse", "ts-ast.mjs")).href);
const { Template } = require(path.join(ROOT, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(ROOT, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(ROOT, "build", "ts", "typescript", "text-context.js"));

const dirOf = (tag) =>
  tag
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

/**
 * 一个源文件产出的标签集合。
 *
 * **必须走产物 token 对象，不能走 `ToList()` 的字典**：`ForBody` / `TryBody` / `NewType`
 * 这一批是**被投影提层掉的包装节点**（`WRAPPER_FIELDS` 那张表说的就是它们），
 * 它们在字典里根本不出现，但在**成形期的树上**是实打实的标签——而本门量的正是成形期那一棵树。
 * 第一版走字典，于是 23 个标签「一个种子都找不到」。
 */
function tagsOf(source, file) {
  const document = new TextDocument(source);
  document.FilePath = file;
  const context = new TextContext(new Template());
  context.Process(document);
  const found = new Set();
  const walk = (token) => {
    const name = token && token.constructor ? token.constructor.name : "";
    if (name) found.add(name);
    for (const item of token.Data ?? []) walk(item);
  };
  walk(context.Root);
  return found;
}

const files = corpus("all");
console.log(`语料 ${files.length} 份，开始逐个解析（只取标签集合）…`);
const byTag = new Map();
let done = 0;
for (const file of files) {
  done++;
  if (done % 250 === 0) process.stderr.write(`  ${done}/${files.length}\n`);
  let source;
  let size;
  try {
    source = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    size = source.length;
  } catch {
    continue;
  }
  let tags;
  try {
    tags = tagsOf(source, file);
  } catch {
    continue; // 解析抛异常的语料不进种子池
  }
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  for (const tag of tags) {
    if (!TAGS.has(tag)) continue; // 只收权威名单里的
    if (!byTag.has(tag)) byTag.set(tag, []);
    byTag.get(tag).push({ rel, size });
  }
}

let missing = [];
let planned = 0;
const plan = new Map();
for (const tag of [...TAGS].sort()) {
  const cands = (byTag.get(tag) ?? []).sort((a, b) => a.size - b.size);
  // **先要用例语料**（仓库自己的回归网），用例里没有才退到 node_modules
  const cases = cands.filter((c) => c.rel.startsWith("tests/cases/"));
  const picked = (cases.length ? cases : cands).slice(0, maxPerTag);
  if (picked.length === 0) {
    missing.push(tag);
    continue;
  }
  plan.set(tag, picked);
  planned += picked.length;
}

console.log(`\n有种子可用的标签 ${plan.size} / ${TAGS.size}；一个都没有的：${missing.length ? missing.join(" ") : "（无）"}`);
console.log(`打算写 ${planned} 个用例文件（每标签最多 ${maxPerTag} 个）。\n`);
for (const [tag, picked] of [...plan].slice(0, 40)) {
  console.log(`  ${tag.padEnd(30)} ← ${picked.map((p) => `${p.rel}(${p.size}B)`).join("  ")}`);
}
if (plan.size > 40) console.log(`  …（其余 ${plan.size - 40} 个标签略）`);

if (!WRITE) {
  console.log("\n（试运行。加 --write 才真的建目录与用例文件）");
} else {
  let dirs = 0;
  let written = 0;
  for (const [tag, picked] of plan) {
    const dir = path.join(here, dirOf(tag));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      dirs++;
    }
    const used = new Set(fs.readdirSync(dir).filter((f) => f.endsWith(".ts")).map((f) => f));
    picked.forEach((pick, i) => {
      const stem = String(i + 1).padStart(2, "0") + "-" + path.basename(pick.rel).replace(/\.tsx?$/, "");
      const name = `${stem}.ts`;
      if (used.has(name)) return;
      const body = fs.readFileSync(path.join(ROOT, pick.rel), "utf8").replace(/^\uFEFF/, "");
      fs.writeFileSync(path.join(dir, name), `// token: ${tag}\n` + body, "utf8");
      written++;
    });
  }
  console.log(`\n建了 ${dirs} 个新目录、写了 ${written} 个用例文件。`);
  console.log("接着跑：node tests/compare-shape-token-ast/run.mjs --snapshot");
}
