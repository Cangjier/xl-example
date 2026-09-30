// 噪声尺子：产物里**空**的语句单元（`<Statement></Statement>`）与空块。
//
//   node tests/parse/noise.mjs            真实语料 + 用例语料
//   node tests/parse/noise.mjs cases      只跑用例
//   node tests/parse/noise.mjs --top 20
//
// 空 `Statement` 不携带任何信息，是「收尾口径把该留的换行收走了 / 该收的没被收掉」留下的噪声
// （见 `typescript/tokens/declaration-common.xl.md` 里「一个已经删掉的收尾口径」那一节）。
// 把它变成可回归的数字，才能安全地改写收尾口径：删掉 `DeclarationEnd` 之后这个数必须仍是 0。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { listCases } from "./validate.mjs";
import { parseXml, walkXml } from "./structure.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));

function parseWith(source, file) {
  const document = new TextDocument(source);
  document.FilePath = file;
  const context = new TextContext(new Template());
  context.Process(document);
  return context.Root.ToString();
}

function walkDir(dir, out) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p, out);
    else if (/\.(ts|mts|cts)$/.test(p)) out.push(p);
  }
  return out;
}

function corpus(mode) {
  const files = [];
  if (mode !== "cases") {
    files.push(...walkDir(path.join(root, "node_modules", "@types"), []));
    files.push(...walkDir(path.join(root, "node_modules", "typescript", "lib"), []));
    files.push(...walkDir(path.join(root, "node_modules", "undici-types"), []));
    files.push(...walkDir(path.join(root, "dist", "ts"), []));
    files.push(...walkDir(path.join(root, "samples"), []));
  }
  if (mode !== "real") {
    for (const c of listCases()) {
      if (c.directives.tsInvalid) continue;
      if (c.file.endsWith(".tsx")) continue;
      files.push(c.file);
    }
  }
  return [...new Set(files)];
}

/** 一个元素是不是「空的」：没有子元素、也没有文本。 */
function isEmpty(node) {
  if (node.selfClosing) return true;
  if (node.children.length > 0) return false;
  return node.text.trim() === "";
}

function main() {
  const args = process.argv.slice(2);
  const mode = args.find((a) => ["real", "cases", "all"].includes(a)) || "all";
  const top = args.includes("--top") ? Number(args[args.indexOf("--top") + 1]) : 20;

  const files = corpus(mode);
  const counts = new Map();
  const samples = new Map();
  let emptyStatements = 0;
  let parsed = 0;
  let failed = 0;

  for (const file of files) {
    let source = fs.readFileSync(file, "utf8");
    if (source.charCodeAt(0) === 0xfeff) source = source.substring(1);
    let xml;
    try {
      xml = parseWith(source, file);
      parsed++;
    } catch {
      failed++;
      continue;
    }
    const tree = parseXml(xml);
    for (const node of walkXml(tree)) {
      if (node.name === "#root") continue;
      if (!isEmpty(node)) continue;
      counts.set(node.name, (counts.get(node.name) || 0) + 1);
      if (node.name === "Statement") emptyStatements++;
      if (!samples.has(node.name)) samples.set(node.name, path.relative(root, file));
    }
  }

  console.log(
    `噪声尺子：语料 ${files.length} 个文件，解析成功 ${parsed}，抛异常 ${failed}\n` +
      `         空 <Statement> ${emptyStatements} 个\n`,
  );
  if (counts.size === 0) {
    console.log("产物里没有任何空元素。");
  } else {
    console.log("空元素分布：");
    for (const [k, v] of [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)) {
      console.log(`  ${String(v).padStart(5)}  <${k} />   例: ${samples.get(k)}`);
    }
  }
  process.exitCode = emptyStatements === 0 ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
