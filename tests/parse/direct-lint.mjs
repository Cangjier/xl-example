// 第三个出口（`Token.PrintDirectAst`）的静态门（第 992 轮起，第 1013 轮只剩这一条判据）。
//
//   node tests/parse/direct-lint.mjs
//
// ## 为什么要有这一门
//
// `core/syntax/token.xl.md` 的 `PrintDirectAst` 写着一条**读代码就能判**的约定：
// 这一格的方法体里**不许回原文查**——`ctx.source` / `ctx.Text(` / `ctx.TextOf(` /
// `ctx.StringText(`，也不许把问题**转手**回去（原先禁的是 `this.PrintAst`；
// 第 1013 轮 `PrintAst` 整条删掉之后，第三个出口只剩这一格，转手在规范里已经无路可走）。
//
// **为什么这一条必须是门而不是自觉** ✗：回原文查**不会当场坏**——它只在
// 「注释里有个同名的词」「字符串里有个假括号」这种输入上给出**第二份近似**，
// 而那种输入正是这一整条线要消掉的东西（`synthName` 那 1324 处就是这么来的）。
// 一个只在坏输入上显形的约定，靠自觉守不住。
//
// ## 判据（两条）
//
//   ① 这一格的方法体里不出现那四个回原文查的出口；
//   ①' 也不出现**按字符串键查**：`.get("…")` / `.set("…")` / `.has("…")` 与
//      `ctx.Attr(视图, "键")`（逐键计数，例外表已归零，见 `STRING_KEY_ALLOWED`）；
//   ② 扫描本身不抛异常（页面读不出来就是红，不是跳过）。
//   另有一条只扫共享投影那一页的代码块（名字那一格，第 1008 轮，见 `NAME_KEY`）。
//   第 1014 轮又加一条**只扫散文**的：`PrintAst` 这个老名字只许出现在「明说它已经不存在」的行上
//   （词边界匹配，`PrintDirectAst` 不算；见 `STALE_NAME`）——它不改行为，所以前面几条都看不见它。
//
// **第 1013 轮删掉的判据**：原来还有一条「覆写了直出版的页面，同页必须还有 `PrintAst`」——
// 它是「同答」那条动态判据的**基线**（搬完之前不许先把老路删掉）。现在老路删了、
// 同答由 `cases:direct` 的「重投一致」接手，所以这一条连同它的读数一起撤掉。
//
// **章节头按整行认**（第 1012 轮修掉的一处自查错误）：`indexOf("## method PrintDirectAst…")`
// 会匹配到**代码块里**引用这句话的那一行，于是被扫的正文根本不是这一页的投影。
// 现在是 `^…$` 整行匹配（`HEAD_DIRECT_RE`）。
//
// **退出码**：上面任一条不为 0 就是 1。**「还没自己出的页面」不进退出码**：那是进度，
// 不是缺陷（读数照样印出来）。

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

/**
 * **章节头必须整行匹配**（第 1012 轮修掉的一个自查错误）。
 *
 * 原来这里（以及 `bodyOf` 的定位）用的是 `text.indexOf(HEAD)`——它会**匹配到代码块里**那一行：
 * `tuple-member.xl.md` 的一页 `PrintDirectAst` 正文里**引用**了 `## method PrintDirectAst:…`
 * 这句话（说明「这一格的返回约定」），于是 `indexOf` 从那一行起往后找第一块 ```ts，
 * 找到的是**下一个类的方法体**，而那一块里的 `ctx.Attr(typeNode, "questionAt")`
 * 就被记在**上一页的投影**名下（实测：真位置在**这一格之外**，扫描器报的行号 547 也在别处）。
 * 后果不是「多报一处」而是**判据对象错了**：被扫的那一段根本不是这一页的投影。
 * 所以章节头一律按**整行**认（`^` + `$`，`m` 标志），正文也从那一行之后找。
 */
const HEAD_DIRECT_RE = /^## method PrintDirectAst:\(ctx:any, v:any\)=>any$/gm;
/** 一页里所有章节头的起止（整行匹配，见上）。 */
function headsOf(text, re) {
  const out = [];
  for (const m of text.matchAll(re)) out.push({ at: m.index, length: m[0].length });
  return out;
}

/**
 * 回原文查的那四个出口。
 *
 * **为什么不把 `ctx.LeafKind` / `ctx.KeywordKind` / `ctx.TokenKind` 也算进来** ✗：
 * 它们是**纯分类器**（吃一个字符串、吐一个 kind），字符串从哪来才是问题——
 * 从 `this.Value` / `this.TempToString()` / `ctx.ValueOf(...)` 来就不是回原文查。
 * 把函数名一律禁掉会把「照文本分叶子名」这条本来就该在 token 上的判据一起禁掉。
 *
 * **第 1013 轮删掉的那一条**：原先是 `this.PrintAst(`（「不许把问题转手回去」），
 * 而 `PrintAst` 与它的派发分支已经整条删除——第三个出口只剩这一格，转手无路可走。
 */
const FORBIDDEN = [
  ["ctx.source", /ctx\.source\b/],
  ["ctx.Text(", /ctx\.Text\(/],
  ["ctx.TextOf(", /ctx\.TextOf\(/],
  ["ctx.StringText(", /ctx\.StringText\(/],
];

/**
 * **按字符串键查**（第 1005 轮）——判据的静态那一半。
 *
 * 它说的是「只用 token 自己的属性 / 子单元 / `Parent`」，而**字符串键进字典里取值**
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
 * （`.attrs.get("op")` → `.op`、`get("startBracket")` → `.startBracket`、`get("stringChar")` → `.stringChar`），
 * 最后两处 `name` 换成 `view()` 上那一格由 `tokenNameOf` 答的 `name`
 * ⇒ **220 / 220 全部收掉，例外表归零**。
 *
 * **为什么这门要逐键计数**：220 处里绝大多数**逐字节同答**，所以删掉一两处看不出来；
 * 而「少一处也要红」正是把「收掉了就去删那一行」变成机械动作，而不是靠人记得。
 */
const STRING_KEY = [
  ["按字符串键取值", /\.get\(\s*["']/],
  ["按字符串键置值", /\.set\(\s*["']/],
  ["按字符串键试键", /\.has\(\s*["']/],
  // **`ctx.Attr(视图, "键")` 也是按字符串键查**（第 1012 轮）：它内部就是 `view(node).attrs.get(key)`
  // ——判据要的是「只用 token 自己的属性」，而**属性名是编译期就知道的那个词**：
  // 视图上本来就挂着同名属性（`view()` 把 `attrs` 抄到视图自己身上，第 1005 轮），
  // 所以 `ctx.Attr(v, "questionAt")` 与 `v.questionAt` 逐字节同答，后者才是「读这一格自己的属性」。
  // 第一版在第 993 轮搬直出版时就留着这一格（那时判据只扫字典读法），实测还剩 23 处、
  // 分布在 10 页；这一轮全部换成属性读，并把这一条写进判据。
  // **只认字面量那一档**：`ctx.Attr(x, 某个变量)` 不是「按字符串键查」，不在这里判。
  ["按字符串键读属性（ctx.Attr）", /ctx\.Attr\(\s*[^,()]+,\s*["']/],
];
FORBIDDEN.push(...STRING_KEY);

/**
 * 例外：**一个都没有了**（第 1005 轮收完）——表留着，因为它是「按字符串键查」这本账的形状：
 * 键 -> 允许多少处。数字是量出来的，不是估的；**多一处红、少一处也红**。
 */
const STRING_KEY_ALLOWED = new Map([
  ["value", 0],
  ["name", 0],
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
let directSections = 0;
/** 这一格的方法体里**按字符串键查**的逐键计数（例外表按这个数判）。 */
const stringKeyHits = new Map();
const stringKeyAt = new Map();

for (const file of files.sort()) {
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file).replace(/\\/g, "/");
  for (const one of headsOf(text, HEAD_DIRECT_RE)) {
    const at = one.at;
    const body = bodyOf(text, at);
    directSections++;
    if (body === null) {
      violations.push({ file: rel, why: "第三出口没有可读的方法体（代码块缺失）" });
      continue;
    }
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
      violations.push({ file: `${rel}:${line}`, why: `第三出口的方法体里出现 ${label}` });
    }
    directPages.push({ file: rel, line });
  }
}

/**
 * **名字那一格：不许再按字符串键读**（第 1008 轮）。
 *
 * `typescript/print-ast-common.xl.md` 的**代码块**里不许再出现
 * `.attrs.get("name")` / `.attrs.get("fieldName")` / `.attrs.get("namespace")`——
 * 这三格是**各页 `NameField` 自己回答的同一格事实**（第 1006 轮，
 * `core/syntax/token.xl.md`），读法只有一个入口：`tokenNameOf`。
 *
 * **为什么这一条要单独扫、不并进上面那两条** ✗：上面那些判据只扫 `PrintDirectAst` 的
 * **方法体**，而第 1008 轮实测到——投影投一个类要经过 helper
 * （`projectDeclaration` / `memberNameOf` / `structuralProps`），
 * **按字符串键查字典正是在 helper 里活下来的**：静态门扫不到，动态那一门更看不见
 * （那两处三词名单逐字节同答；`view()` 那一格早就是 token 事实，helper 这一格还是字典键）。
 * 所以这一条把「名字那一格」的读法钉成一处。口径：只看**代码块**、注释不算（`codeOnly`），
 * 恰好 0 处才对。
 */
const NAME_KEY = /\.attrs\.get\(\s*["'](name|fieldName|namespace)["']\s*\)/g;
const SHARED_FILE = "typescript/print-ast-common.xl.md";
let nameKeyHits = 0;
{
  const shared = path.join(root, SHARED_FILE);
  if (fs.existsSync(shared)) {
    const text = fs.readFileSync(shared, "utf8");
    const code = [...text.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => codeOnly(m[1])).join("\n");
    for (const match of code.matchAll(NAME_KEY)) {
      nameKeyHits += 1;
      if (nameKeyHits <= 3) {
        violations.push({
          file: SHARED_FILE,
          why: `名字那一格按字符串键读：\`${match[0]}\`（只许走 tokenNameOf / 各页的 NameField）`,
        });
      }
    }
  }
}

/**
 * **`PrintAst` 这个老名字：只在「说它已经不存在」的地方许出现**（第 1014 轮）。
 *
 * 第 1013 轮删掉 `PrintAst` 时，全仓 200 处引用是**按名字整批改名**的，
 * 于是 `typescript/print-ast-common.xl.md` 里那句「先问 `PrintDirectAst`、再问 `PrintAst`」
 * 被改成了「先问 `PrintDirectAst`、再问 `PrintDirectAst`」——**同一页里两个名字一样**，
 * 读起来像同一问写了两遍，而它说的其实是那条**已经删掉的老路**。
 * 这一格正是**第三个出口的规格页**，错在这里的代价是「照着规格读代码，读出来的是幻觉」。
 *
 * **为什么必须是门而不是顺手改一次** ✗：这种错**不改行为**——`direct:lint` 的前几条扫的是
 * 代码块、`cases:direct` 量的是重投一致，两者都看不见散文里的名字。而它偏偏最容易复发：
 * 下一轮写「搬这一格之前老路是这么写的」时，手一滑就又把老名字当现状写进去了。
 * 所以口径是**词边界 + 允许名单**：`PrintDirectAst` 里的 `PrintAst` 前一个字符是 `t`
 * （词内），`\b` 不成立 ⇒ 不命中；真要提老名字，只有「同一行里同时出现
 * `PrintDirectAst`（说现在）与 `PrintAst`（说过去）、并且带一个「删 / 老 / 原先 / 原先 / 已经」
 * 这类过去时标记」才放行——也就是**它必须被明确写成过去的事**。
 */
const STALE_NAME_ALLOWED = [
  // 行号会漂，所以按**内容特征**放行：同一行里既有现在、又有过去时标记。
];
const STALE_NAME = /\bPrintAst\b/;
const PAST_MARK = /(老|旧|删|原先|原来|曾经|不再|已经)/;
let staleNameHits = 0;
{
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (!STALE_NAME.test(line)) continue;
      if (PAST_MARK.test(line)) continue;
      staleNameHits += 1;
      if (staleNameHits <= 5) {
        violations.push({
          file: `${rel}:${index + 1}`,
          why:
            "这里写着 `PrintAst` 却看不出它已经是过去的事——第 1013 轮起这一格只有 " +
            "`PrintDirectAst`（要提老名字就把「老 / 删 / 原先」一起写在同一行）",
        });
      }
    }
  }
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
      file: where || "(第三出口)",
      why: `按字符串键查 \`${key}\`：${got} 处，例外表只允许 ${allowed} 处（token 缺哪一格事实就补哪一格）`,
    });
  } else if (got < allowed) {
    violations.push({
      file: "(例外表)",
      why: `例外表里 \`${key}\` 写着允许 ${allowed} 处，实测只剩 ${got} 处 —— 收掉了就来删这一行`,
    });
  }
}

console.log(`direct:lint —— ${files.length} 页规范，第三出口（PrintDirectAst）${directSections} 段`);
console.log(`自己出这一格的页面 ${directPages.length} 页（同一个类里可能不止一段：一个类几种身份各答各的）`);
console.log(
  `按字符串键查：${stringKeyTotal} 处（例外 ${stringKeyLeft} 处：${[...STRING_KEY_ALLOWED.entries()]
    .map(([k, v]) => `${k} ${v}`)
    .join("、")}）`,
);
console.log(
  `名字那一格（${SHARED_FILE} 的代码块）：按字符串键读 ${nameKeyHits} 处（0 处才是对的，读法只走 tokenNameOf）`,
);
// **老名字的账**（第 1014 轮）：`PrintAst` 只在「明说它已经不存在」的行上出现，
// 而那三行全在同一个文件里 ⇒ 这条读数有两个用途：一是「改名的残留」当场可见，
// 二是「下一个人想提老名字」时知道要把它写成过去的事（见 STALE_NAME 的说明）。
console.log(
  `老名字 \`PrintAst\`（词边界，不含 PrintDirectAst）：${staleNameHits} 处没写成过去的事（0 处才是对的）`,
);
if (verbose) {
  for (const one of directPages) console.log(`  direct  ${one.file}:${one.line}`);
}

if (violations.length > 0) {
  console.log("");
  for (const one of violations.slice(0, 40)) console.log(`FAIL  ${one.file}  ${one.why}`);
  if (violations.length > 40) console.log(`（另有 ${violations.length - 40} 条）`);
  console.log(`\n第三出口的约定：只用 token 自己的属性 / 子单元 / Parent，不回原文查（见 core/syntax/token.xl.md）`);
  process.exit(1);
}
console.log(`第三出口的约定 0 条违反（不用 ctx.source / ctx.Text / ctx.TextOf / ctx.StringText）`);
process.exit(0);
