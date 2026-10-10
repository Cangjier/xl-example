// 第三个出口的**直出版**（`Token.PrintDirectAst`）的静态门（第 992 轮）。
//
//   node tests/parse/direct-lint.mjs
//
// ## 为什么要有这一门
//
// `core/syntax/token.xl.md` 的 `PrintDirectAst` 写着两条约定，其中一条**读代码就能判**：
// 这一格的方法体里**不许回原文查**——`ctx.source` / `ctx.Text(` / `ctx.TextOf(` /
// `ctx.StringText(`，也不许把问题**转手**回 `this.PrintAst`（那等于没写直出版）。
// 另一条（「与 `PrintAst` 同答」）是动态的，由 `cases:direct` 逐字节对拍，不在这里。
//
// **为什么这一条必须是门而不是自觉** ✗：回原文查**不会当场坏**——它只在
// 「注释里有个同名的词」「字符串里有个假括号」这种输入上给出**第二份近似**，
// 而那种输入正是这一整条线要消掉的东西（`synthName` 那 1324 处就是这么来的）。
// 一个只在坏输入上显形的约定，靠自觉守不住。
//
// ## 判据（三条）
//
//   ① 直出版的方法体里不出现那四个回原文查的出口，也不出现 `PrintAst` 转手；
//   ② 覆写了直出版的页面，**同页必须还有 `PrintAst`**——它是直出版还在被对拍的那条基线
//      （搬完之前不许先把老路删掉：删了就没人能证明「同答」）；
//   ③ 扫描本身不抛异常（页面读不出来就是红，不是跳过）。
//
// **退出码**：三条里任一条不为 0 就是 1。**未搬的页面不进退出码**：那是进度，不是缺陷
//（读数照样印出来，「还剩多少页」是这一轮最该看见的数）。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");

/** 规范树：`core/` 与语言层那一棵（`runtime/` / `typescript-exec/` 不是投影，扫到也无害）。 */
const ROOTS = ["core", "typescript", "runtime", "typescript-exec"];
/** 产物 / 依赖 / 一次性探针目录不扫（`tmp*` 里全是历史副本，它们的相对路径本来就是坏的）。 */
const SKIP = new Set(["node_modules", "dist", "build", ".git", ".xl", "samples", "bin"]);

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith("tmp")) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (name.endsWith(".xl.md")) out.push(full);
  }
  return out;
}

const files = [];
for (const name of ROOTS) {
  const dir = path.join(root, name);
  if (fs.existsSync(dir)) walk(dir, files);
}

const HEAD_AST = "## method PrintAst:(ctx:any, v:any)=>any";
const HEAD_DIRECT = "## method PrintDirectAst:(ctx:any, v:any)=>any";

/**
 * 回原文查的那四个出口 + 一次转手。
 *
 * **为什么不把 `ctx.LeafKind` / `ctx.KeywordKind` / `ctx.TokenKind` 也算进来** ✗：
 * 它们是**纯分类器**（吃一个字符串、吐一个 kind），字符串从哪来才是问题——
 * 从 `this.Value` / `this.TempToString()` / `ctx.ValueOf(...)` 来就不是回原文查。
 * 把函数名一律禁掉会把「照文本分叶子名」这条本来就该在 token 上的判据一起禁掉。
 */
const FORBIDDEN = [
  ["ctx.source", /ctx\.source\b/],
  ["ctx.Text(", /ctx\.Text\(/],
  ["ctx.TextOf(", /ctx\.TextOf\(/],
  ["ctx.StringText(", /ctx\.StringText\(/],
  ["this.PrintAst(", /this\.PrintAst\s*\(/],
];

/**
 * **按字符串键查**（第 1005 轮）——判据②的静态那一半。
 *
 * 判据②说的是「只用 token 自己的属性 / 子单元 / `Parent`」，而**字符串键进字典里取值**
 * 正是它要消掉的那条路：`k.get("type") === "SymbolToken"` 这样的问句，
 * 判据的是「字典里那个键存了什么」，而不是「这一格是什么」——
 * 于是同一个问句会在**两个出口各答一遍**，而两处一旦漂移，只有坏输入才显形。
 *
 * **为什么它必须进这一门** ✗：全语料这一类读法**实测 220 处**（第 1005 轮量出来的：
 * `type` 188、`startBracket` 11、`name` 2、`stringChar` 1，其余 12 个键各一到四处）——
 * 它们逐字节同答，所以动态那一门（`cases:direct`）看不见任何问题；
 * 而「谁也别再写回来」只能靠这条静态判据守着。第 1005 轮把 `type` 那一族（188 处）
 * 换成了 `Tag()`（token 自己的类名，见 `core/syntax/token.xl.md` 的 `Tag` 与
 * `typescript/print-ast-common.xl.md` 的 `annotate`），把**标量属性**换成了同名属性读
 * （`.attrs.get("op")` → `.op`、`get("startBracket")` → `.startBracket`、`get("stringChar")` → `.stringChar`）
 * ⇒ **218 / 220 换掉了，只剩 `name` 那 2 处**。
 *
 * **为什么剩下那 2 处进例外表而不是硬改**：它们问的不是「字典里那个键存了什么」，
 * 而是「这一格的名字是哪一格」——声明的名字落在**子单元或别的属性**上
 * （`name` / `fieldName` / `namespace` 三选一，见 `memberNameOf`；叶子的文本同理，
 * 要么在 `value` 上、要么由区间回原文取，见 `textOfNode` 的第二条路）。
 * 那不是同一个问句换一个入口，是**缺一格 token 事实**（第 1005 轮试过按属性硬接：
 * 全语料 823 份红，`TypeAliasDeclaration.name` 整格丢）⇒ 它是下一轮的改动。
 * 例外表**逐键计数**：多一处就红，所以它是「只剩下这些」的账，不是「这一类都放过」。
 */
const STRING_KEY = [
  ["按字符串键取值", /\.get\(\s*["']/],
  ["按字符串键置值", /\.set\(\s*["']/],
  ["按字符串键试键", /\.has\(\s*["']/],
];
FORBIDDEN.push(...STRING_KEY);

/**
 * 例外：**这一格自己的名字**（同上）——`键 -> 允许多少处`。
 * 数字是量出来的（第 1005 轮），不是估的；**少一处也要红**（收掉了就来删这一行）。
 *
 * 只剩 `name` 这一族：第 1005 轮试过把它也挂成属性（`annotate`），
 * **全语料 823 份红**——`TypeAliasDeclaration` 那两处的 `name` 键压根不在字典里，
 * 取到的是 `undefined`，整个 `name` 字段静默丢掉。所以它缺的是**一格 token 事实**
 * （名字落在子单元或 `fieldName` / `namespace` 上），不是换一个读法。
 */
const STRING_KEY_ALLOWED = new Map([
  ["value", 0],
  ["name", 2],
  ["stringChar", 0],
]);


/** 一段 `## method X` 的方法体：从它后面第一个 ts 代码块到收尾围栏。 */
function bodyOf(text, at) {
  const fence = text.indexOf("```ts", at);
  if (fence < 0) return null;
  const close = text.indexOf("```", fence + 5);
  if (close < 0) return null;
  return text.slice(fence + 5, close);
}

/**
 * 判据只看**代码**：注释里提到 `ctx.Text(v)` 是**允许的**，而且往往是这一页最该留的话
 * （「原来这里是回原文切的，现在读 `this.Temp`」）——把注释一起判掉就会逼着人删掉那条理由。
 * 这一份足够应付方法体：先剥 `/* … *\/`，再逐行丢掉 `//` 之后的部分。
 */
function codeOnly(body) {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => {
      const at = line.indexOf("//");
      return at < 0 ? line : line.slice(0, at);
    })
    .join("\n");
}

const violations = [];
const directPages = [];
const unconverted = [];
let directSections = 0;
let astSections = 0;
/** 直出版里**按字符串键查**的逐键计数（例外表按这个数判）。 */
const stringKeyHits = new Map();
const stringKeyAt = new Map();

for (const file of files.sort()) {
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file).replace(/\\/g, "/");
  for (const [head, isDirect] of [[HEAD_AST, false], [HEAD_DIRECT, true]]) {
    let from = 0;
    for (;;) {
      const at = text.indexOf(head, from);
      if (at < 0) break;
      from = at + head.length;
      const body = bodyOf(text, at);
      if (isDirect) directSections++;
      else astSections++;
      if (body === null) {
        if (isDirect) violations.push({ file: rel, why: "直出版没有可读的方法体（代码块缺失）" });
        continue;
      }
      if (!isDirect) continue;
      const line = text.slice(0, at).split("\n").length;
      const code = codeOnly(body);
      for (const [label, re] of FORBIDDEN) {
        if (!re.test(code)) continue;
        if (STRING_KEY.some(([, one]) => one === re)) {
          // 按字符串键查：**逐键计数**，例外表里额度用完了才红（见 STRING_KEY_ALLOWED）。
          for (const m of code.matchAll(/\.(?:get|set|has)\(\s*["']([^"']+)["']/g)) {
            const key = m[1];
            stringKeyHits.set(key, (stringKeyHits.get(key) || 0) + 1);
            const where = `${rel}:${line}`;
            const seen = stringKeyAt.get(key) ?? [];
            if (seen.length < 3) seen.push(where);
            stringKeyAt.set(key, seen);
          }
          continue;
        }
        violations.push({ file: `${rel}:${line}`, why: `直出版的方法体里出现 ${label}` });
      }
      directPages.push({ file: rel, line });
    }
  }
  // ② 直出版必须留着 `PrintAst` 那条基线。
  if (text.includes(HEAD_DIRECT) && !text.includes(HEAD_AST)) {
    violations.push({ file: rel, why: "只有直出版、没有 PrintAst —— 同答判据失去了基线" });
  }
  if (text.includes(HEAD_AST) && !text.includes(HEAD_DIRECT)) unconverted.push(rel);
}

// **按字符串键查的账**（第 1005 轮）：逐键比额度——多了红（有人写回来了），
// 少了也红（收掉了就来把例外表那一行删掉）。
const stringKeys = [...new Set([...STRING_KEY_ALLOWED.keys(), ...stringKeyHits.keys()])].sort();
let stringKeyTotal = 0;
let stringKeyLeft = 0;
for (const key of stringKeys) {
  const got = stringKeyHits.get(key) ?? 0;
  const allowed = STRING_KEY_ALLOWED.get(key) ?? 0;
  stringKeyTotal += got;
  stringKeyLeft += Math.min(got, allowed);
  if (got > allowed) {
    const where = (stringKeyAt.get(key) ?? []).join(" / ");
    violations.push({
      file: where || "(直出版)",
      why: `按字符串键查 \`${key}\`：${got} 处，例外表只允许 ${allowed} 处（token 缺哪一格事实就补哪一格）`,
    });
  } else if (got < allowed) {
    violations.push({
      file: "(例外表)",
      why: `例外表里 \`${key}\` 写着允许 ${allowed} 处，实测只剩 ${got} 处 —— 收掉了就来删这一行`,
    });
  }
}

console.log(`direct:lint —— ${files.length} 页规范，直出版 ${directSections} 段、PrintAst ${astSections} 段`);
console.log(`直出版覆盖 ${directPages.length} 页；还没直出的页面 ${unconverted.length} 页`);
console.log(
  `按字符串键查：${stringKeyTotal} 处（例外 ${stringKeyLeft} 处：${[...STRING_KEY_ALLOWED.entries()]
    .map(([k, v]) => `${k} ${v}`)
    .join("、")}）`,
);
if (verbose) {
  for (const one of directPages) console.log(`  direct  ${one.file}:${one.line}`);
  for (const one of unconverted) console.log(`  待搬    ${one}`);
}

if (violations.length > 0) {
  console.log("");
  for (const one of violations.slice(0, 40)) console.log(`FAIL  ${one.file}  ${one.why}`);
  if (violations.length > 40) console.log(`（另有 ${violations.length - 40} 条）`);
  console.log(`\n直出版的约定：只用 token 自己的属性 / 子单元 / Parent，不回原文查（见 core/syntax/token.xl.md）`);
  process.exit(1);
}
console.log(`直出版的约定 0 条违反（不用 ctx.source / ctx.Text / ctx.TextOf / ctx.StringText，不转手 PrintAst）`);
process.exit(0);
