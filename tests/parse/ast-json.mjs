// 出口 2（**AST JSON**，`cjcli --ast-json`）的**专属尺子** —— 第 884 轮补上。
//
//   node tests/parse/ast-json.mjs
//
// ## 为什么要有这一把
//
// [docs/ast-json.md](../docs/ast-json.md) 第 5 节原来写着「**这个出口今天没有专属的尺子**」，
// 第 6 节第 4 条于是要求「改完**自己拿两个出口对一眼**」——一条**靠人眼**的判据。
// 而这条出口的唯一事实来源是**同一个文件里的两处拼串**（`ToXmlString` 与 `ToDictionary`），
// 规格自己就警告过「改了那处拼串，这里必须一起改」：**一处漂了没有任何东西会响**。
// 另外两个出口都有尺子（XML 侧的标签由 `cases:tags` 核，TS 形状由 `cases:tsast` / `samples` 核），
// 只有它没有。这一门就是那句话的判据化。
//
// ## 判据（六项全 0 才退出码 0）
//
//   ① **标签名 === `type`**：`ToXmlString` 的标签与 `ToDictionary` 的 `type` 同源
//      （都是 `this.constructor.name`），漂了就说明有一个出口在说别的树。
//   ② **XML 的每个属性都在 JSON 里同名同值**：这是「两个出口说同一棵树」那句断言的本体。
//      XML 属性值过 `CommonUtil.XmlDecode`（会转义 `&` / `<` / `>` 与反斜杠一族），
//      所以比之前先按同一张表**反过来解一遍**，不然 `op="&lt;="` 这种会假红。
//   ③ **每个节点都有合法的 `range`**：规格第 2 节说 `range` 每个节点都有（闭区间、整数、
//      `0 ≤ 起 ≤ 止 ≤ 源码长度`）。trivia（注释 / 软换行）的越界**单记一栏、不进退出码**——
//      那是约定的形态，与 `cases:tsast` 的同一栏同口径。
//   ④ **JSON 多出来的键必须在规格里登记过**：JSON 比 XML 多几个键是**允许**的（第 4 节
//      那张例外表，全是投影要直读的坐标），但「多出来的键」必须写在 `docs/ast-json.md`
//      第 2–4 节里。**键名表只有规格那一份**：这一门读的就是那份 markdown，
//      所以「加了一格坐标却忘了写规格」会当场红——补上这一门之前，那已经漂了 5 格。
//   ⑤ **命令行 === 库 API**：`cjcli <文件> --ast-json` 的 stdout 必须逐字节等于
//      `Root.ToJsonString()`（抽查若干份）。`samples` 那一门对 TS 形状出口做的是同一件事。
//   ⑥ **不抛异常**。
//
// ## 语料口径
//
// **用例 + `samples`**，不吃 `node_modules` / `dist/ts`：
//
// - **用例语料就够**：`cases:shapes` 已经证明了「外部语料里出现过的形状签名 **0 种未覆盖**」——
//   用例侧是外部语料那 260 种签名的**超集**（444 种）。这一门量的是「同一个节点两个出口对不对」，
//   与形状种类一一对应，所以用例那一份是最强的网。
// - **速度**：整份外部语料单进程解析要 ~37s（`typescript/lib` 那 4.3 MB 占大头），
//   用例 + `samples` 只要 ~2s。这一门没有理由为同一句话多花 35s 墙钟。
// - 语料清单**不在这里重写一份**：`corpus("cases")` 是从 `ts-ast.mjs` 导出的**同一个函数**
//   （`tsInvalid` / `.tsx` / `known-gap` 的跳过条件只有那一处）。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { corpus } from "./ts-ast.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback) => {
  const at = args.indexOf(name);
  return at >= 0 && at + 1 < args.length ? args[at + 1] : fallback;
};
const TOP = Math.max(1, Number(value("--top", "12")));

/** 规格第 2–4 节里登记过的键（`docs/ast-json.md` 是键名表的**唯一**一份）。 */
function registeredKeys() {
  const doc = fs.readFileSync(path.join(root, "docs", "ast-json.md"), "utf8");
  const from = doc.indexOf("\n## 2.");
  const to = doc.indexOf("\n## 5.");
  if (from < 0 || to < 0 || to <= from) {
    throw new Error("docs/ast-json.md 的第 2 / 5 节找不到——登记表的口径变了，这一门的取键方式要跟着改");
  }
  const slice = doc.slice(from, to);
  const keys = new Set(["type", "children", "range"]); // 基类形状：`type` / `children` / `range`
  // 形状里出现的每个 `` `标识符` `` 都算登记过（**下界**判据：只要求「规格里提过这个名字」）。
  for (const m of slice.matchAll(/`([A-Za-z_][A-Za-z0-9_]*)`/g)) keys.add(m[1]);
  return keys;
}

const REGISTERED = registeredKeys();

/** `CommonUtil.XmlDecode` 的逆：先认 `&entity;`，再认反斜杠转义。 */
const ENTITIES = { "&lt;": "<", "&gt;": ">", "&amp;": "&" };
const ESCAPES = {
  r: "\r",
  n: "\n",
  t: "\t",
  a: "\x07",
  b: "\b",
  f: "\f",
  "\\": "\\",
  "'": "'",
  '"': '"',
  v: "\v",
};
function unescapeXml(value) {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "&") {
      const semi = value.indexOf(";", i);
      const entity = semi > 0 ? value.slice(i, semi + 1) : "";
      if (ENTITIES[entity] !== undefined) {
        out += ENTITIES[entity];
        i = semi;
        continue;
      }
    }
    if (ch === "\\" && i + 1 < value.length && ESCAPES[value[i + 1]] !== undefined) {
      out += ESCAPES[value[i + 1]];
      i += 1;
      continue;
    }
    out += ch;
  }
  return out;
}

/** 开标签上的属性。属性值一律过 `XmlDecode`，所以这里能安全地按第一个 `>` 切。 */
function attributesOf(openTag) {
  const attrs = new Map();
  const re = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(openTag)) !== null) attrs.set(m[1], unescapeXml(m[2]));
  return attrs;
}

const num = (v) => (typeof v === "boolean" ? (v ? "true" : "false") : String(v ?? ""));

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

const stats = {
  files: 0,
  nodes: 0,
  tagName: [],
  attrMissing: [],
  attrValue: [],
  missingRange: [],
  badRange: [],
  triviaRange: 0,
  extraKeys: new Set(),
  unregistered: new Map(),
  unregisteredTotal: 0,
  crashes: [],
};

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function checkToken(node, file, where, source) {
  stats.nodes += 1;
  let xml;
  let dict;
  try {
    xml = node.ToXmlString();
  } catch (e) {
    stats.crashes.push(`${file} ${where} ToXmlString：${e.message}`);
    return;
  }
  try {
    dict = node.WithRange();
  } catch (e) {
    stats.crashes.push(`${file} ${where} WithRange：${e.message}`);
    return;
  }
  const openTag = xml.slice(0, xml.indexOf(">") + 1);
  const tagName = /^<([A-Za-z_][A-Za-z0-9_]*)/.exec(openTag)?.[1] ?? "?";
  // ① 标签名 === type
  if (tagName !== dict.get("type")) {
    stats.tagName.push(`${file} ${where} 标签 <${tagName}> vs type ${JSON.stringify(dict.get("type"))}`);
  }
  // ② XML 的属性都在 JSON 里同名同值
  const attrs = attributesOf(openTag);
  for (const [key, value] of attrs) {
    if (!dict.has(key)) {
      stats.attrMissing.push(`${file} ${where} <${tagName}> 属性 ${key}="${value}" 在 JSON 里没有`);
      continue;
    }
    if (num(dict.get(key)) !== value) {
      stats.attrValue.push(`${file} ${where} <${tagName}> ${key}：XML="${value}" JSON="${num(dict.get(key))}"`);
    }
  }
  // ③ range
  const range = dict.get("range");
  if (!Array.isArray(range) || range.length !== 2) {
    stats.missingRange.push(`${file} ${where} <${tagName}>`);
  } else if (!Number.isInteger(range[0]) || !Number.isInteger(range[1])) {
    stats.badRange.push(`${file} ${where} <${tagName}> 不是整数 ${JSON.stringify(range)}`);
  } else if (range[0] < 0 || range[1] < range[0] || range[1] > source.length) {
    // trivia（注释 / 软换行）是**被扫进来的**，不参与签入签出——与 `cases:tsast` 同一栏同口径。
    if (tagName === "LineWrap" || tagName === "AreaAnnotation" || tagName === "LineAnnotation") {
      stats.triviaRange += 1;
    } else {
      stats.badRange.push(`${file} ${where} <${tagName}> 越界 ${JSON.stringify(range)}（源码 ${source.length} 字符）`);
    }
  }
  // ④ 多出来的键必须在规格里登记过
  for (const key of dict.keys()) {
    if (key === "type" || key === "children" || key === "range") continue;
    if (attrs.has(key)) continue;
    stats.extraKeys.add(key);
    if (!REGISTERED.has(key)) {
      stats.unregisteredTotal += 1;
      const list = stats.unregistered.get(key) ?? [];
      if (list.length < 3) list.push(`${file} ${where} <${tagName}>`);
      stats.unregistered.set(key, list);
    }
  }
  // 子单元：`WithRange` 已经递归给它们补过坐标，这里**只走一趟树**做上面那四项。
  for (let i = 0; i < node.Data.length; i++) checkToken(node.Data[i], file, `${where}.${i}`, source);
}

function parseWith(source, file) {
  const document = new TextDocument(source);
  document.FilePath = file;
  const context = new TextContext(new Template());
  context.Process(document);
  return context.Root;
}

const files = [...corpus("cases"), ...walk(path.join(root, "samples"), [])];
const unique = [...new Set(files)];

for (const file of unique) {
  const source = fs.readFileSync(file, "utf8");
  let rootUnit;
  try {
    rootUnit = parseWith(source, file);
  } catch (e) {
    stats.crashes.push(`${relative(file)} 解析抛异常：${e.message}`);
    continue;
  }
  stats.files += 1;
  const rel = relative(file);
  for (let i = 0; i < rootUnit.Data.length; i++) checkToken(rootUnit.Data[i], rel, String(i), source);
}

// ⑤ 命令行 === 库 API（抽查：三个样本 + 用例语料首 / 中 / 末各一份）。
const cliSample = [
  ...["hello.ts", "declarations.ts", "generic.ts"].map((n) => path.join(root, "samples", n)),
  ...(unique.length > 0
    ? [0, Math.floor(unique.length / 2), unique.length - 1].map((i) => unique[i]).filter((f) => f && !f.startsWith(path.join(root, "samples")))
    : []),
];
const cliDiffs = [];
for (const file of cliSample) {
  const source = fs.readFileSync(file, "utf8");
  let library;
  try {
    library = parseWith(source, file).ToJsonString();
  } catch (e) {
    stats.crashes.push(`${relative(file)} 库 API 抛异常：${e.message}`);
    continue;
  }
  const proc = spawnSync(process.execPath, [path.join(root, "build", "ts", "cjcli.js"), file, "--ast-json"], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (proc.status !== 0) {
    cliDiffs.push(`${relative(file)} 退出码 ${proc.status}`);
    continue;
  }
  if (proc.stdout.trim() !== library.trim()) {
    cliDiffs.push(`${relative(file)}（stdout ${proc.stdout.trim().length} 字符 vs 库 ${library.trim().length} 字符）`);
  }
}

const unregisteredCount = stats.unregisteredTotal;
const failures = {
  "① 标签名 !== type": stats.tagName,
  "② XML 属性在 JSON 里没有": stats.attrMissing,
  "② XML 属性与 JSON 值不一致": stats.attrValue,
  "③ 缺 range": stats.missingRange,
  "③ range 越界": stats.badRange,
  "④ 未在规格里登记的键": unregisteredCount,
  "⑤ 命令行 !== 库 API": cliDiffs,
  "⑥ 抛异常": stats.crashes,
};
const bad = Object.values(failures).reduce((sum, v) => sum + (Array.isArray(v) ? v.length : v), 0);

console.log(
  `AST JSON 出口（\`cjcli --ast-json\`）：${stats.files} 份、${stats.nodes} 个节点；` +
    `JSON 比 XML 多出来的键 ${stats.extraKeys.size} 种（规格第 2–4 节登记了 ${REGISTERED.size} 个名字）`,
);
console.log(`  ① 标签名 !== \`type\`：${stats.tagName.length}`);
console.log(`  ② XML 属性在 JSON 里没有：${stats.attrMissing.length}；值不一致：${stats.attrValue.length}`);
console.log(`  ③ 缺 range：${stats.missingRange.length}；越界：${stats.badRange.length}（trivia 越界 ${stats.triviaRange}——约定的形态，不进退出码）`);
console.log(`  ④ 未在 \`docs/ast-json.md\` 第 2–4 节登记的键：${stats.unregistered.size} 种 / ${unregisteredCount} 处`);
if (flag("--list") || stats.unregistered.size > 0) {
  for (const [key, list] of [...stats.unregistered].sort((a, b) => b[1].length - a[1].length).slice(0, TOP)) {
    console.log(`      ${key}  ← ${list[0]}${list.length > 1 ? ` 等 ${list.length} 处` : ""}`);
  }
}
console.log(`  ⑤ 命令行 !== 库 API：${cliDiffs.length} / 抽查 ${cliSample.length} 份`);
console.log(`  ⑥ 抛异常：${stats.crashes.length}`);
for (const [title, list] of Object.entries(failures)) {
  if (!Array.isArray(list) || list.length === 0) continue;
  console.log(`  --- ${title}（前 ${TOP}）---`);
  for (const line of list.slice(0, TOP)) console.log(`      ${line}`);
}

console.log("");
if (bad === 0) {
  console.log(
    `出口 2 与出口 1 说的同一棵树：${stats.files} 份、${stats.nodes} 个节点，` +
      `标签 / 属性 / 坐标 / 键名登记 / 命令行 / 抛异常六项**全 0**`,
  );
} else {
  console.log(`出口 2 与出口 1 **不是**同一棵树：${bad} 处不一致（上表）`);
}
process.exitCode = bad === 0 ? 0 : 1;
