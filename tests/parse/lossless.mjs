// 无损性检查：产物里有没有把源码的内容吃掉。
//
//   node tests/parse/lossless.mjs            跑真实语料 + 用例语料；有丢失退出码 1
//   node tests/parse/lossless.mjs real       只跑真实语料（node_modules / dist / samples）
//   node tests/parse/lossless.mjs cases      只跑 tests/parse/cases
//   node tests/parse/lossless.mjs --top 20   每组最多列 20 个样本
//   node tests/parse/lossless.mjs --json out.json
//
// 判据与 `matrix.mjs` / `differential.mjs` 互补：
//   differential 比「构造个数」，matrix 比「上下文里的构造」，
//   本文件比「**内容**」——源码里每一个标识符与字面量的值，是否还出现在产物里。
// 它不需要任何标签映射，所以能发现「没有对应标签、压根没人想到要查」的丢失。
//
// 两侧都先过一遍 `Decode`：产物对转义有自己的写法（`\x07` 写成 `\a`、
// 逐字串里把 `\` 写成 `\\`、`"` 串里把 `'` 写成 `\'`），那是**输出格式**而不是内容差异。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { listCases } from "./validate.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const ts = require(path.join(root, "node_modules", "typescript"));
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));

const ESCAPES = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\u000b", a: "\u0007", "0": "\0" };

/** 还原 XML 实体转义（`&lt;` / `&gt;` / `&amp;`）。`&amp;` 必须最后换，否则会二次解码。 */
export function UnescapeXml(text) {
  return text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

/** 把一段文本里的转义写法还原成实际字符；标签与普通文本原样保留。 */
export function Decode(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "\\") {
      out += text[i];
      continue;
    }
    const c = text[i + 1];
    if (c === undefined) {
      out += "\\";
      break;
    }
    if (c === "x") {
      out += String.fromCharCode(parseInt(text.substr(i + 2, 2), 16));
      i += 3;
      continue;
    }
    if (c === "u") {
      if (text[i + 2] === "{") {
        const close = text.indexOf("}", i + 3);
        out += String.fromCodePoint(parseInt(text.slice(i + 3, close), 16));
        i = close;
        continue;
      }
      out += String.fromCharCode(parseInt(text.substr(i + 2, 4), 16));
      i += 5;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(ESCAPES, c)) {
      out += ESCAPES[c];
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function walk(dir, out) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|mts|cts)$/.test(p)) out.push(p);
  }
  return out;
}

function corpus(mode) {
  const files = [];
  if (mode !== "cases") {
    files.push(...walk(path.join(root, "node_modules", "@types"), []));
    files.push(...walk(path.join(root, "node_modules", "typescript", "lib"), []));
    files.push(...walk(path.join(root, "node_modules", "undici-types"), []));
    files.push(...walk(path.join(root, "dist", "ts"), []));
    files.push(...walk(path.join(root, "samples"), []));
  }
  if (mode !== "real") {
    // `xl:ts-invalid` 的用例是**故意写的非 TypeScript**（测的是「非法输入不许泄漏裸异常」），
    // 拿 TypeScript 的 AST 去对账没有意义，所以跳过。
    // `.tsx` 也不在范围内：JSX 是另一套语法，本工程明确不支持（见 README 的已知缺口）。
    for (const c of listCases()) {
      if (c.directives.tsInvalid) continue;
      if (c.file.endsWith(".tsx")) continue;
      files.push(c.file);
    }
  }
  return [...new Set(files)];
}

function main() {
  const args = process.argv.slice(2);
  const mode = args.find((a) => ["real", "cases", "all"].includes(a)) || "all";
  const top = args.includes("--top") ? Number(args[args.indexOf("--top") + 1]) : 40;
  const jsonAt = args.indexOf("--json");
  const jsonPath = jsonAt >= 0 ? args[jsonAt + 1] : null;

  const files = corpus(mode);
  const problems = [];
  const groups = new Map();
  let parsed = 0;
  let failed = 0;

  for (const file of files) {
    let source = fs.readFileSync(file, "utf8");
    if (source.charCodeAt(0) === 0xfeff) source = source.substring(1);
    let xml;
    try {
      const template = new Template();
      const document = new TextDocument(source);
      document.FilePath = file;
      const context = new TextContext(template);
      context.Process(document);
      xml = context.Root.ToString();
    } catch (e) {
      failed++;
      problems.push({ file: path.relative(root, file), kind: "THROW", token: String(e && e.message).split("\n")[0] });
      groups.set("THROW", (groups.get("THROW") || 0) + 1);
      continue;
    }
    parsed++;
    const rawXml = UnescapeXml(xml);
    const flat = Decode(rawXml);

    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const missing = [];
    const hasRegexToken = xml.includes("<RegexToken");
    (function visit(node) {
      let candidates = null;
      let kindName = null;
      if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) {
        // 结构词在产物里可能是**标签名**而不是文本（`new` → `<New>`），两种形态都算「在」。
        const capitalized = node.text.length > 0 ? node.text[0].toUpperCase() + node.text.slice(1) : node.text;
        candidates = [node.text, "<" + capitalized];
        // `#if` / `#endif`：`#` 是本项目预处理指令的标记，正文进 `<PreprocessorDirectives>`。
        if (node.text.startsWith("#")) candidates.push(node.text.slice(1));
        kindName = "Identifier";
      } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        const raw = node.getText(sf);
        const inner = raw.length >= 2 ? raw.slice(1, -1) : raw;
        candidates = [node.text, raw, inner];
        kindName = "String";
      } else if (ts.isNumericLiteral(node) || ts.isBigIntLiteral(node)) {
        candidates = [node.getText(sf), node.text];
        kindName = "Number";
      } else if (node.kind === ts.SyntaxKind.RegularExpressionLiteral) {
        // 正则正文与标志存在 `RegexToken.Temp` / `.Flags` 上，**刻意不渲染进 XML**
        // （见 `typescript/tokens/regex-token.xl.md`：产物里就是 `<RegexToken></RegexToken>`）。
        // 所以这里只断言「它成了一个 RegexToken」，正文由用例与执行层负责。
        candidates = hasRegexToken ? [node.getText(sf), ""] : [node.getText(sf)];
        kindName = "Regex";
      }
      if (candidates) {
        // 候选与产物都可能是「转义写法」或「实际字符」，两种都试：
        //   `flat` 是还原后的产物文本，`rawXml` 是只去了 XML 实体的产物文本。
        // 逐字串（`@"…"` / `@'…'`）走的是后一种：产物把每个 `\` 写成 `\\`，不做转义解码。
        const found = candidates.some((c) => {
          if (c.length === 0) return true;
          const doubled = c.replace(/\\/g, "\\\\");
          return flat.includes(c) || flat.includes(Decode(c)) || rawXml.includes(c) || rawXml.includes(doubled);
        });
        if (!found) {
          missing.push({ kind: kindName, text: candidates[0].slice(0, 60), pos: node.getStart(sf) });
        }
      }
      ts.forEachChild(node, visit);
    })(sf);

    if (missing.length) {
      const lineOf = (p) => source.slice(0, p).split("\n").length;
      for (const m of missing.slice(0, 8)) {
        problems.push({ file: path.relative(root, file), kind: m.kind, token: m.text, line: lineOf(m.pos) });
      }
      const key = [...new Set(missing.map((m) => `${m.kind}:${m.text}`))].slice(0, 4).join(" | ");
      groups.set(key, (groups.get(key) || 0) + 1);
    }
  }

  const lostFiles = new Set(problems.filter((p) => p.kind !== "THROW").map((p) => p.file));
  console.log(
    `无损性：语料 ${files.length} 个文件，解析成功 ${parsed}，抛异常 ${failed}，有内容丢失 ${lostFiles.size} 个文件\n`,
  );
  if (groups.size === 0) {
    console.log("没有内容丢失。");
  } else {
    console.log("按「丢失的形状」聚合：");
    for (const [key, count] of [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)) {
      console.log(`  ${String(count).padStart(5)}  ${key}`);
    }
    console.log("\n样本：");
    for (const p of problems.slice(0, 60)) console.log(`  ${p.file}:${p.line ?? ""}  [${p.kind}] ${JSON.stringify(p.token)}`);
  }

  if (jsonPath) {
    fs.writeFileSync(jsonPath, JSON.stringify({ problems, groups: Object.fromEntries(groups) }, null, 1), "utf8");
    console.log(`\n完整结果 → ${jsonPath}`);
  }
  process.exitCode = problems.length === 0 ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
