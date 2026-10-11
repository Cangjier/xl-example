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
//   第 1015 轮再加一条**扫能力面**的：`print-ast-common` 的 `const ctx = { … }` 键表里不许出现
//   回原文兜底 / 已无人用的九个出口（见 `CTX_BANNED`）——①那是「谁写了什么」，这一条是
//   「这一格手上有什麼」；出口删了之后，①守的那句话才从「大家记得别写」变成**结构上做不到**。
//   第 1026 轮把 `FirstCodeAfter` / `MatchBrace` / `MatchingParen` 补进那张禁表（出口先删掉）。
//   第 1027 轮再加一条**扫名字**的：投影与 token 之间那一层的入口名
//   （`ToDictionary` / `ToList` / `WithRange` / `WithRangeOf` / `ToPlain` / `ToJsonString`）
//   不许再出现在规范页里（见 `REMOVED_LAYER`）——那句话（token → AST 直出）本来一条判据都没有。
//   第 1049 轮再加一条**扫「这一格自己的那一格字符」**的：`ctx.source[` 的下标不许是某一格
//   自己的 `start`（见 `TOKEN_SOURCE_SELF`）——那一格的正文由它自己答（`Token.Text`，或
//   `String.stringChar` 这类构造时就记好的字段）；扫描游标与别人的终点照旧。
//   第 1050 轮再加一条**扫形参表**的：`print-ast-common` 的 `# private method …` 小节里，
//   声明了 `ctx` 形参却在方法体里一处不用的 = 0 处（见 `SHARED_HEAD` 那一段）——
//   形参表就是这一格需要什么，不需要投影的上下文就不该挂着一个。
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
 * **纯分类器（吃一段文本、吐一个 kind）从第 1029 轮起一个都不在 `ctx` 上了**：
 * 它们过去是 `ctx.LeafKind` / `ctx.KeywordKind` / `ctx.TokenKind`——那三张「文本 → kind」的
 * 词汇表第 1028 / 1029 轮搬回了各自那一页（`Keyword.KeywordKind` /
 * `SymbolToken.KindOfText` / `Identifier.LeafKindOfText`）。所以这里不再需要为它们留例外：
 * **这一层今天根本拿不到「按文本定 kind」这个能力**，那句话从「大家记得别用」变成了
 * 结构上做不到（与 `Text` / `TextOf` / `StringText` 那三个出口同一手法）。
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

/**
 * **`ctx` 上不许再挂着「回原文兜底」的出口**（第 1015 轮；**第 1026 轮又补了三个**）。
 *
 * 上面那几条扫的是**方法体**（谁在这一格写了什么），而这一条扫的是**这一格拿到的东西**：
 * `typescript/print-ast-common.xl.md` 的 `const ctx = { … }` 里，出口的名字就是它的能力面。
 * 第 1015 轮把这九个出口从 `ctx` 上删掉了——三个回原文兜底的
 * （`Text` / `TextOf` / `StringText`：值为空时会去 `source.slice(...)`）、
 * 以及老路删掉之后再没人用过的六个（`Value` / `Members` / `IsSymbol` / `IsDot` /
 * `SkipSourceTrivia` / `MatchingBrace`）。
 *
 * **第 1026 轮再加三个**：那一轮量「`ctx` 上还剩几个出口一个消费者都没有」，
 * 读数 72 个里 **3 个**——`FirstCodeAfter` / `MatchBrace` / `MatchingParen`，
 * 三个都是**拿一段原文串去扫**的（跳过 trivia、按深度配花括号 / 圆括号）。
 * 出口删掉之后，它们下面的 `firstCodeAfter` / `matchBrace` / `matchingParenOf`
 * 实现也成了死代码，一并删掉（`matchingBrace` 留着：`braceSpanOf` 还在用）。
 *
 * **为什么删掉之后还要立一条判据** ✗：出口删了，上面那条「不许用 `ctx.Text(`」就**永远绿**了
 * ——它守的是一句已经无路可走的话。真正要守住的是**「这一层拿不到原文」这件事本身**：
 * 下一轮谁想加一个方便的出口，只要往 `ctx` 里补一行就能绕开所有方法体判据
 * （第 1008 轮实测过：helper 那一层的方法体判据天生覆盖不到）。
 * 所以这一条钉的是**能力面**：`ctx` 的键表里不许出现这些名字。
 *
 * **第 1062 轮再补两个**：`IsOperatorUnit` / `IsTypeParameterModifier`——那两问第 1062 轮
 * 收进了被问的那一页（`SymbolToken` / `Keyword` / `Identifier` 各自声明并赋好），
 * 投影那侧连同 `ctx` 上的出口一起删掉；出口删了就补进这张表，
 * 免得下一轮有人往 `ctx` 里补一行再把问句请回来。
 *
 * **第 1063 轮再补 `OperatorRank`**：那张「运算符 → 优先级」的中央词汇表搬回了
 * `symbol-token.xl.md`（`SymbolToken.OperatorRank` / `SymbolToken.RankOfText`），
 * `ctx.OperatorRank` 出口一并删掉。
 *
 * **第 1067 轮再补一个出口名 `AllKids`**：它是「含 trivia 的完整子单元表」唯一的出口，
 * 而 `ProjectableKids` 立起来之后，**投影层只剩 `trailingTriviaStart` 一处真的要看它**
 * （它找的正是注释）——那个出口随之删掉，三处调用点（`try` 两处、`if-set` 一处）改成
 * `ctx.Kids`（同一格读数的另一个名字，语义逐字相同）。出口删了就补进这张表，
 * 免得下一轮有人往 `ctx` 里补一行再把「我看得见 trivia」请回来。
 */
const CTX_BANNED = [
  "Text",
  "TextOf",
  "StringText",
  "Value",
  "Members",
  "IsSymbol",
  "IsDot",
  "SkipSourceTrivia",
  "MatchingBrace",
  "FirstCodeAfter",
  "MatchBrace",
  "MatchingParen",
  "IsOperatorUnit",
  "IsTypeParameterModifier",
  "OperatorRank",
  "AllKids",
];
/**
 * **投影对 token 只读属性、不调方法**（第 1046 轮）。
 *
 * 第 1041~1046 轮把「投影要问 token 的每一格」都搬成了**属性**：
 * 常量答案在构造时赋（`## field`）、派生答案在「那个事实被记下来的那一刻」赋，
 * 名字那一格是 `## property` + `### get`（读的仍是本页自己的字段）。
 * 于是 `typescript/print-ast-common.xl.md` 读 token 的方式只剩**属性名**：
 * `k.Tag` / `k.IsInvisible` / `x.BodyField` / `x.WrapperField` / `node.NameField` /
 * `cursor.FunctionFlags` / `parent.TypeMemberPlan` / `head.StatementKind` …
 *
 * **为什么这一条必须是门而不是自觉** ✗：上面那几条判据（不给回原文查、不按字符串键查、
 * 能力面里没有兜底出口）都**看不见**「换回方法」这件事——方法照样只用 token 自己的东西，
 * 逐字节也同答，所以 `cases:direct` / `cases:tsast` 一律绿。可它是这一族口径的**反面**：
 * 「答案在不在这一格自己身上、什么时候定下来」的结论就是**收成属性**，
 * 而一个现场计算的方法能在任何时候被重新写回来。所以口径钉成：**一次 `receiver.Method(` 都不许有**。
 *
 * **两处例外，都是「不是取数据」**：
 *   - 接收者是 `ctx`（那是投影自己的上下文对象，不是 token）；
 *   - 方法名是 `PrintDirectAst`——第三个出口的**分发**，问的是「这一格出哪个节点」，
 *     那是行为而不是这一格的数据（`core/syntax/token.xl.md` 的 `PrintDirectAst`）。
 *
 * 口径与 `NAME_KEY` 那一条同款：只看 `SHARED_FILE` 的**代码块**、注释不算（`codeOnly`），
 * 恰好 0 处才对。
 */
const TOKEN_METHOD_CALL = /(?<![A-Za-z0-9_.$])([a-z][A-Za-z0-9_]*)\.([A-Z][A-Za-z0-9_]*)\s*\(/g;
/** 接收者是它就不是 token（投影自己的上下文对象）。 */
const TOKEN_METHOD_RECEIVERS_OK = new Set(["ctx"]);
/** 方法名是它就不是「取数据」而是行为。 */
const TOKEN_METHOD_NAMES_OK = new Set(["PrintDirectAst"]);
/**
 * **这一格自己的那一格字符：不许再回原文读**（第 1049 轮）。
 *
 * 第 1048 轮给了 `Token.Text`（基类的一格 `## property`：本单元的正文，走它自己 `SourceRange`
 * 两头各自带着的那份 `Document`），第 1049 轮又把「这一格是不是模板」从
 * `ctx.source[startOf(x)] === "`"` 换成读 `String.StringChar`——那一格是**构造器里赋好的**
 * （`stringChar` 是它给投影的读法）。九处一处不剩。
 *
 * **这个正则只认「下标是某一格自己的起点」**：`ctx.source[at]`（扫描游标）、
 * `ctx.source[end - 1]`（别人的终点）都不命中——原文里本来就有一批必须看**相邻**字符的读法。
 */
const TOKEN_SOURCE_SELF = /ctx\.source\[\s*(?:startOf\(|[A-Za-z_$][\w$]*\s*\.\s*start\s*\])/g;
/**
 * **某一格的正文：不许按坐标从 `ctx.source` 切**（第 1053 轮）。
 *
 * 第 1048 轮给了 `Token.Text`（「这一格自己的原文」，走它自己 `SourceRange` 两头各自带着的
 * 那份 `Document`），第 1049 轮收掉了「按这一格自己的起点读一个字符」，第 1051 / 1052 轮
 * 收掉了名字与修饰词那两处「回原文猜位置」。**剩下的是「按坐标切一段正文」这一族**：
 * `ctx.source.slice(startOf(x), endOf(x))` —— 同一段正文有两个来源（投影手上那个字符串、
 * 以及这一格自己），而后者才是这一格的事实。
 *
 * **第 1053 轮实测只剩 5 处**（`print-ast-common` 代码块里 `ctx.source.slice` 共 11 处，
 * 其中 6 处是**扫描游标 / 成对括号区间**——`ctx.source.slice(lineStart, v.start)` 那种
 * 「看这一格前面那一行」的读法，**不在这一条里**，它们是相邻字符的读法，第 1049 轮就明确留着）。
 * 这一条只认**下标是坐标访问器**的两种形态：`startOf(x)` / `endOf(x)` / `x.end`。
 *
 * **为什么必须是门** ✗：它与 `x.Text` 逐字符同答（实测八道门读数一处没动），所以动态那几门
 * 看不见任何问题——而它是**同一份事实的第二处来源**：`Text` 一旦改了口径（比如 `Document`
 * 换成另一份），这两处就会各说各话。口径与前面几条同款：只看 `SHARED_FILE` 的代码块。
 */
const TOKEN_TEXT_VIA_SOURCE =
  /ctx\.source\s*(?:\.\s*slice\(\s*(?:startOf\(|endOf\(|[A-Za-z_$][\w$]*\s*\.\s*end\b)|\[\s*(?:startOf\(|endOf\())/g;
/** 投影对 token 调方法的处数（0 处才是对的）。 */
let tokenMethodHits = 0;
/** 按某一格自己的起点读 `ctx.source` 的处数（0 处才是对的）。 */
let sourceSelfHits = 0;
/** 按坐标从 `ctx.source` 切正文 / 读正文的处数（0 处才是对的，见 TOKEN_TEXT_VIA_SOURCE）。 */
let sourceTextHits = 0;
let ctxExits = 0;
let ctxBannedHits = 0;
{
  const shared = path.join(root, SHARED_FILE);
  if (fs.existsSync(shared)) {
    const text = fs.readFileSync(shared, "utf8");
    const blocks = [...text.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => m[1]);
    const code = blocks.map((one) => codeOnly(one)).join("\n");
    for (const match of code.matchAll(TOKEN_METHOD_CALL)) {
      if (TOKEN_METHOD_RECEIVERS_OK.has(match[1])) continue;
      if (TOKEN_METHOD_NAMES_OK.has(match[2])) continue;
      tokenMethodHits += 1;
      if (tokenMethodHits <= 3) {
        violations.push({
          file: SHARED_FILE,
          why:
            `投影对 token 调了方法：\`${match[1]}.${match[2]}(…)\`——取数据只读属性` +
            "（见 core/syntax/token.xl.md 的 Tag / NameField / WrapperField / BodyField / FunctionFlags）",
        });
      }
    }
    for (const match of code.matchAll(TOKEN_SOURCE_SELF)) {
      sourceSelfHits += 1;
      if (sourceSelfHits <= 3) {
        violations.push({
          file: SHARED_FILE,
          why:
            `按某一格自己的起点读 ctx.source：\`${match[0]}…\`——这一格的正文/首字符由它自己答` +
            "（Token.Text，或各页构造时记好的那一格，如 String.stringChar）",
        });
      }
    }
    for (const match of code.matchAll(TOKEN_TEXT_VIA_SOURCE)) {
      sourceTextHits += 1;
      if (sourceTextHits <= 3) {
        violations.push({
          file: SHARED_FILE,
          why:
            `按坐标从 ctx.source 取正文：\`${match[0]}…\`——这一段的正文由它自己答：` +
            "`x.Text`（第 1048 轮）、`x.Text.slice(…)`（区间是全文坐标，两头减 `x.start`）；" +
            "扫描游标与成对括号照旧",
        });
      }
    }
    const raw = blocks.join("\n");
    const start = raw.search(/^\s*const ctx = \{/m);
    const end = start < 0 ? -1 : raw.indexOf("\n  };", start);
    const body = start < 0 || end < 0 ? "" : raw.slice(start, end);
    for (const line of body.split("\n")) {
      const key = /^\s{4}([A-Za-z_][A-Za-z0-9_]*):/.exec(line);
      if (key !== null) {
        ctxExits += 1;
        if (CTX_BANNED.includes(key[1])) {
          ctxBannedHits += 1;
          violations.push({
            file: `${SHARED_FILE}（ctx 出口）`,
            why: `\`ctx.${key[1]}\` 又挂回来了——这一层的出口里不许有回原文兜底的那几个（第 1015 轮删过：${CTX_BANNED.join(" / ")}）`,
          });
        }
      }
    }
    if (ctxExits === 0) {
      violations.push({ file: SHARED_FILE, why: "找不到 `const ctx = { … }` 这一格（判据的对象没了）" });
    }
  }
}

/**
 * **helper 的形参表就是它需要什么**（第 1050 轮）。
 *
 * 第 1048 / 1049 轮把 `print-ast-common` 里「某一格自己的正文 / 首字符」都收成了 token 自己的
 * 那一格，于是四个 helper 的 `ctx` 形参**在方法体里一处都不再出现**（`textOfNode` /
 * `labeled` / `isBareCallMethod` / `computedNameUnit`）——这一轮连形参带全部调用点的实参
 * 一起删掉（`textOfNode` 111 处、其余各 1~3 处）。
 *
 * **为什么这一条必须是门而不是自觉** ✗：留一个用不到的 `ctx`，就是给**下一处回原文查**
 * 留了一个现成的入口——而上面那些判据（方法体扫 `ctx.source`、能力面、只读属性）一条都看不见
 * 「这个形参没人用」。形参表是这一格**需要什么**的声明：不需要投影的上下文，就不该挂着一个。
 *
 * 口径与前面几条同款：只看 `SHARED_FILE` 的 `# private method …` 小节，注释不算（`codeOnly`）。
 */
const SHARED_HEAD = /^# (?:private )?(const|method|property) ([A-Za-z_][A-Za-z0-9_]*)(?::(.*))?$/;
let deadCtxHits = 0;
{
  const shared = path.join(root, SHARED_FILE);
  if (fs.existsSync(shared)) {
    const lines = fs.readFileSync(shared, "utf8").split(/\r?\n/);
    const heads = [];
    lines.forEach((line, index) => {
      const m = SHARED_HEAD.exec(line);
      if (m !== null) heads.push({ kind: m[1], name: m[2], sig: m[3] ?? "", line: index });
    });
    for (let at = 0; at < heads.length; at++) {
      const one = heads[at];
      if (!/ctx\s*:/.test(one.sig)) continue;
      const end = at + 1 < heads.length ? heads[at + 1].line : lines.length;
      const body = lines.slice(one.line, end);
      const fence = body.findIndex((line) => line.startsWith("```ts"));
      if (fence < 0) continue;
      const close = body.findIndex((line, index) => index > fence && line.startsWith("```"));
      const code = codeOnly(body.slice(fence + 1, close < 0 ? body.length : close).join("\n"));
      if (/\bctx\b/.test(code)) continue;
      deadCtxHits += 1;
      if (deadCtxHits <= 3) {
        violations.push({
          file: `${SHARED_FILE}:${one.line + 1}`,
          why:
            `\`${one.name}\` 声明了 \`ctx\` 形参、方法体里一处都不用` +
            "——形参表就是这一格需要什么（不需要投影的上下文就别挂着它）",
        });
      }
    }
  }
}

/**
 * **中间那一层不许再回来**（第 1027 轮）。
 *
 * 第 1018~1024 轮把投影与 token 之间那一层（「字典 / 视图 + 逐 token 字段表」）整个删掉了：
 * 投影今天**直吃 token**——`projectNode(node)` 收到的那一格就是 token 自己，
 * 形状由 token 自己的 `PrintDirectAst` / `AstKind()` / `SegmentNames` / `BodyField` 说。
 * 那一层的入口名字（`ToDictionary` / `ToList` / `WithRange` / `WithRangeOf` / `ToPlain` /
 * `ToJsonString`）今天在**规范页里 0 处**——但删掉的东西**能被重新写回来**：
 * 谁想给投影加一条方便的通道，写一个 `ToDictionary` 就绕开了这一门所有的判据
 * （① 扫方法体、② 扫字符串键、③ 扫 `ctx` 能力面，三条都看不见一个**新函数名**）。
 *
 * **为什么它必须是门**：这是一个**口径**，不是一个 bug——
 * 「token → AST 直出，不许有中间形态」这句话没有别的判据在看（`cases:tsast` 只看最终形状，
 * 中间多一层照样能出对的形状，只是同一份事实又被声明了第二遍）。
 *
 * **只管规范页**的**代码块**（`core/` / `typescript/` / `runtime/` / `typescript-exec/`
 * 下的 `*.xl.md` 里 ```ts 围起来的那几段）：散文里提这些名字是**记录**
 * （「`ToPlain` 那一层第 1019 轮已随中间层一起删掉」这种句子必须写得出来），
 * 而代码块里出现就是**这一层又有一条路可走**——那才是要拦的东西。
 */
const REMOVED_LAYER = ["ToDictionary", "ToList", "WithRange", "WithRangeOf", "ToPlain", "ToJsonString"];
let removedLayerHits = 0;
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const code = [...text.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => m[1]).join("\n");
  if (code === "") continue;
  for (const name of REMOVED_LAYER) {
    const hits = (code.match(new RegExp(`\\b${name}\\b`, "g")) ?? []).length;
    if (hits === 0) continue;
    removedLayerHits += hits;
    violations.push({
      file: path.relative(root, file),
      why: `\`${name}\` 又出现了（${hits} 处）——投影只吃 token，中间那一层第 1018~1024 轮已经删干净；要写它的历史请写到 docs/ 或 README 里`,
    });
  }
}

/**
 * **「这一格是不是某一类」这一问不许回到投影层**（第 1057 轮；第 1058 轮补了下面 `IsIndexBracket`
 * 那一条，并把两处的拼法收成一组共用常量）。
 *
 * 第 1057 轮把最后三个现场判据收进了被问的那一页：`IsDotSymbol` / `IsTypeSeparator`
 * （`SymbolToken` 在 `Close()` 里按自己的正文赋）与 `IsNameNode`（`Identifier` / `Keyword`
 * 各自声明并答 `true`）。这三个名字今天**只许出现在属性读**上（`one.IsDotSymbol`）——
 * 谁把它们又写成一个函数（`isDot` / `isTypeSeparator` / `isNameNode`，或 `ctx.IsNameNode(…)`
 * 那种出口），就是「同一格事实的第二处声明」又长回来了。
 *
 * **为什么必须是门而不是自觉** ✗：这样写**逐字节同答**（判据只是「读哪一格」），
 * 上面那些判据一条都看不见它（方法体里不查原文、不按字符串键、能力面里也没有兜底出口），
 * 而 `cases:tsast` / `cases:direct` 更是照样全绿。可它是这一族口径的反面：
 * 那一格的答案属于**被问的那一页**，投影层重写一遍就又是两处会漂的地方。
 *
 * 口径：只看 `SHARED_FILE` 的**代码块**、注释不算（`codeOnly`），恰好 0 处才对。
 * **名字是拼出来的**：这一门自己的源码里不出现那三个老名字的连写。
 *
 * **第 1058 轮修的是这一门的正则本身**：老写法把**整个属性名首字母小写**当问句名
 * （`IsDotSymbol` → `isDotSymbol`），可问句名是「去掉 `Is`、首字母小写」（`isDotSymbol` 正是
 * 这个），于是 `\b(?:is|Is)` 那个前缀与它一撞就错位 —— 实测 `isDot(node)` / `isNameNode(k)`
 * 一次都不命中，这一条判据当时是**永远绿**的。今天问句名由 `classifyPredicate` 拼、
 * 判据挂在 `\s*\(`（调用形态）与 `ctx.` 出口名上，并把第 1057 轮注释里写下的缩写
 * （`isDot`）一起收进别名表。
 *
 * **第 1062 轮这条判据扩成「小判据」一族**（与第 1060 轮把配对那一门扩成一族同一手法）：
 * 同一句话的下三个现场判据 `isOperatorUnit` / `isPrefixOperatorUnit` /
 * `isTypeParameterModifier` 也收进了被问的那一页——三问的答案都只有**两半**：
 * 「我这一格是什么类」与「我这一格的正文是什么」，而**两半都住在那一页上**
 * （`SymbolToken` 按 `Temp`、`Keyword` 按 `Value`、`Identifier` 按 `Temp`），
 * 所以在 `Close()` / `SetValue` 那一刻赋成属性，投影只读。
 *
 * **第 1063 轮再补一格、并且是同一族的第二种形状**：`OperatorRank` 不是「是不是某一类」，
 * 而是「**这一格的值是什么**」——可它同样是「我这一格自己的正文」的函数
 * （键就是符号的正文，与 `Keyword.KeywordKind` / `SymbolToken.KindOfText` 同一条口径），
 * 所以它也只许是属性读：老写法 `operatorRank(text)`（连那张中央词汇表）第 1063 轮
 * 搬进了 `symbol-token.xl.md`（`SymbolToken.OperatorRank` 在 `Close()` 里赋、
 * `SymbolToken.RankOfText` 是按文本问的那一处）。**这一门因此也认「按文本查词」的问句形态**：
 * 主名 `OperatorRank`（属性名，`ctx.OperatorRank` 那种出口写法照认）加别名 `operatorRank`
 * （老问句的小写形态）。
 *
 * **第 1064 轮再补两格**：`DeclarationListFlags`（别名 `flagsOf`）与 `HasChildren`
 * （别名 `labelIsFlat`）——两问都是从**这一格自己的属性**读出来的（前者读 `Let.modifiers`、
 * 后者读基类 `children`），所以它们同样只许属性读。
 *
 * **第 1065 轮再补两格，而且是这一族里唯一的一份「名单」**：`Segments`（别名 `segmentKeysOf`）
 * 与 `ModifierWords`（别名 `declaredKeysOf`）——前几轮收的是**某一句判据**，
 * 这两格收的是**一份没人写下来过的名单**：「哪几段进投影」过去由 `declaredKeysOf` +
 * `segmentKeysOf` 那套**运行期反射**碰巧决定（小写开头 + 有 getter + 值是单元数组），
 * 「哪几个布尔属性是修饰词」则由「值为 `true`」碰巧决定。今天两者都是**被问的那一页显式声明
 * 并赋好的一格数据**（基类各有一处默认：`Segments` 按本页的 `SegmentNames` 排、
 * `ModifierWords` 是空数组），投影只读属性名——所以老写法（那两个 helper 名）一旦写回来，
 * 这一门当场红。
 *
 * **第 1066 轮再补两格**：`ProjectableKids`（别名 `projectableKids`，老名字还有
 * `unwrapNodes` 那一份）——「这一格下面哪些子单元进投影」过去是投影层的一个 helper
 * （收一遍段、再滤一遍 `IsInvisible`），今天由 token 自己答（那一格就是 `Segments` +
 * `children` + `IsInvisible` 三件事实的合成，三件都在 token 上）。这一门因此也认那三个老问句名：
 * 把它们写回投影层的方法体里，这一门当场红。
 */
/** **属性名 → 那一问的写法**：`IsDotSymbol` → `isDotSymbol`，`IsIndexBracket` → `isIndexBracket`。 */
const classifyPredicate = (name) => (name.startsWith("Is") ? "is" + name.slice(2) : name);
/** **别名**（与全名一样是「回投影层问一遍」）：第 1057 轮的缩写，以及后几轮那些格的老问句写法。 */
const CLASSIFY_ALIASES = {
  isDotSymbol: ["isDot"],
  OperatorRank: ["operatorRank"],
  DeclarationListFlags: ["flagsOf"],
  HasChildren: ["labelIsFlat"],
  Segments: ["segmentKeysOf"],
  ModifierWords: ["declaredKeysOf"],
  ProjectableKids: ["projectableKids", "unwrapNodes"],
};
/** 把一组问句名铺成一条或起来的分支（主名 + 缩写）。 */
const classifyAlternation = (predicates) =>
  predicates.flatMap((name) => [name, ...(CLASSIFY_ALIASES[name] ?? [])]).join("|");
const SELF_CLASSIFY_NAMES = [
  "IsDotSymbol",
  "IsTypeSeparator",
  "IsNameNode",
  "IsOperatorUnit",
  "IsPrefixOperatorUnit",
  "IsTypeParameterModifier",
  "OperatorRank",
  "DeclarationListFlags",
  "HasChildren",
  "Segments",
  "ModifierWords",
  "ProjectableKids",
];
const SELF_CLASSIFY = new RegExp(
  `(?<![\\w$.])(?:${classifyAlternation(SELF_CLASSIFY_NAMES.map(classifyPredicate))})\\s*\\(|\\bctx\\.(?:${SELF_CLASSIFY_NAMES.join("|")})\\b`,
);
/** 投影层把这一格又写回成问句的处数（0 处才是对的）。 */
let selfClassifyHits = 0;
{
  const shared = path.join(root, SHARED_FILE);
  if (fs.existsSync(shared)) {
    const text = fs.readFileSync(shared, "utf8");
    const code = [...text.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => codeOnly(m[1])).join("\n");
    for (const match of code.matchAll(new RegExp(SELF_CLASSIFY, "g"))) {
      selfClassifyHits += 1;
      if (selfClassifyHits <= 3) {
        violations.push({
          file: SHARED_FILE,
          why:
            `「这一格是不是某一类」又写回投影层了：\`${match[0]}\`——那一格的事实住在被问的那一页` +
            "（`Token.IsDotSymbol` / `Token.IsTypeSeparator` / `Token.IsNameNode` / `Token.IsOperatorUnit` / " +
            "`Token.IsPrefixOperatorUnit` / `Token.IsTypeParameterModifier`），投影只读属性",
        });
      }
    }
  }
}

/**
 * **「这一格是不是下标那对方括号」也不许回到投影层**（第 1058 轮）。
 *
 * 第 1057 轮那条判据只钉了三个名字（`IsDotSymbol` / `IsTypeSeparator` / `IsNameNode`），
 * 而同一族的**现场判据**还剩最后一个：`isIndexBracket(node)`——判据是
 * `node.Tag === "Bracket" && node.startBracket === "["`，也就是**先问「你是什么类」、
 * 再回被问的那一页读它自己的字段**。两半都住在 `Bracket` 那一页，所以第 1058 轮把它收成
 * `Bracket` 的 `IsIndexBracket`（构造时赋好），投影与 `ctx.IsIndexBracket` 都只读属性。
 *
 * **为什么不并进上一条** ✗：上一条的名单是**第 1057 轮那三个**，它的注释也钉在那三个名字上；
 * 而这一条要守的是**同一族的下一个**——名单分开写，下一轮收掉一格就删这一条，
 * 不会牵动上一条的额度与说明。两条共用 `classifyPredicate`（上面的拼法）。
 *
 * 口径：只看 `SHARED_FILE` 的**代码块**、注释不算（`codeOnly`），恰好 0 处才对。
 * **名字是拼出来的**：这一门自己的源码里不出现那个老名字的连写（问句形态）。
 */
const INDEX_BRACKET_NAMES = ["IsIndexBracket"];
const INDEX_BRACKET_CLASSIFY = new RegExp(
  `(?<![\\w$.])(?:${classifyAlternation(INDEX_BRACKET_NAMES.map(classifyPredicate))})\\s*\\(|\\bctx\\.(?:${INDEX_BRACKET_NAMES.join("|")})\\b`,
);
/** 投影层把这一格又写回成问句的处数（0 处才是对的）。 */
let indexBracketClassifyHits = 0;
{
  const shared = path.join(root, SHARED_FILE);
  if (fs.existsSync(shared)) {
    const text = fs.readFileSync(shared, "utf8");
    const code = [...text.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => codeOnly(m[1])).join("\n");
    for (const match of code.matchAll(new RegExp(INDEX_BRACKET_CLASSIFY, "g"))) {
      indexBracketClassifyHits += 1;
      if (indexBracketClassifyHits <= 3) {
        violations.push({
          file: SHARED_FILE,
          why:
            `「这一格是不是下标那对方括号」又写回投影层了：\`${match[0]}\`——那一格的事实住在被问的那一页` +
            "（`Bracket.IsIndexBracket`，构造时赋好），投影只读属性",
        });
      }
    }
  }
}

/**
 * **「回原文配对 / 找成对符号」那一套不许回来**（第 1059 轮立；第 1060 轮并进方括号那一族）。
 *
 * 第 1041~1058 轮一直在收同一件事：**某一页自己知道的事实，由那一页答**。第 1059 轮收的是
 * 「**体是不是一对花括号**」：四个循环体（`While` / `For` / `Foreach` / `DoWhile`）与
 * `IfSegment` 各自在**挂体那一刻**把整对区间记进自己那一格（`BodyBrace`），克隆体也照抄
 * ⇒ 投影只读 `v.bodyBraceRange`（`braceSpanOf`），**不必回原文找 `{` 再按深度配对扫一遍**。
 * 那套兜底（`blockOfBody` / `bodyBlockOf` 里的三支 + `matchingBrace` 这个 helper）第 1059 轮
 * 整段删掉，八道门读数一处没动——**也就是说它早就是死代码，只是一直没人量**。
 *
 * 第 1060 轮是**同一族的下一格**：「**下标那个 `[` 在哪**」。`IndexedAccessType` 是
 * `TypeBracketCloseRule.Process` 在手上那个方括号（`Bracket` / `ArrayLiteral`）上造出来的，
 * 所以位置是**造这一格那一刻的事实**（`IndexBracketAt`）；投影那一侧的
 * `indexBracketOf`（从终点往回找 `]` 再按深度配 `[`）与 `ctx.IndexBracketOf` 出口一并删掉。
 * 两条**同一句话**，所以合成一条判据、共用一份名单：**成对符号的位置由那一页自己记，
 * 投影不回原文数括号**。
 *
 * **为什么必须是门而不是自觉** ✗：回原文扫一遍**逐字节同答**（语料里块内的字符串 / 注释里的
 * 假括号都被配对扫描自己绕开了），所以方法体判据、能力面判据、`cases:tsast` 一条都看不见它。
 * 可它是**同一格事实的第二处答案**：那一格一旦改了口径（比如 token 记的区间口径变了），
 * 这两处就会各说各话，而假括号那种输入迟早会教它做人（见 `matchingBrace` 老注释里
 * 第 96 轮那次实测）。
 *
 * 口径与前面几条同款：只看 `SHARED_FILE` 的**代码块**、注释不算（`codeOnly`），恰好 0 处才对。
 * 认两种形态：**那一趟配对 / 查找本身**（`matchingBrace(` / `indexBracketOf(`，含 `ctx.` 出口写法）
 * 与**回原文找那个开符号**（`ctx.source.indexOf("{")` / `ctx.source.lastIndexOf("{")`）。
 */
const SOURCE_BRACE_SCAN =
  /(?<![\w$])(?:ctx\.)?(?:matchingBrace|MatchingBrace|indexBracketOf|IndexBracketOf)\s*\(|ctx\.source\s*\.\s*(?:lastIndexOf|indexOf)\s*\(\s*"\{"/g;
/** 投影层回原文配对 / 找成对符号的处数（0 处才是对的）。 */
let sourceBraceScanHits = 0;
{
  const shared = path.join(root, SHARED_FILE);
  if (fs.existsSync(shared)) {
    const text = fs.readFileSync(shared, "utf8");
    const code = [...text.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => codeOnly(m[1])).join("\n");
    for (const match of code.matchAll(new RegExp(SOURCE_BRACE_SCAN, "g"))) {
      sourceBraceScanHits += 1;
      if (sourceBraceScanHits <= 3) {
        violations.push({
          file: SHARED_FILE,
          why:
            `回原文配对 / 找成对符号又写回投影层了：\`${match[0]}\`——成对符号的位置是这一格` +
            "自己记下的那一格（体读 `bodyBraceRange`、下标读 `IndexBracketAt`），投影不回原文扫第二遍",
        });
      }
    }
  }
}

/**
 * **某一格的正文不许由投影从它的子单元里翻出来**（第 1061 轮）。
 *
 * 同一条规矩的又一格：`String` 的正文（引号里那段）过去是投影回**这一页的子单元**里找出来的
 * ——`stringText(v)` = `kidsOf(v, "children").find(k => k.Tag === "ConstString")` 再读那一格的
 * `value`。可这段正文就是这一页自己的子单元攒下来的（`ConstString` 是块单元，文本在 `Temp` 上），
 * 所以第 1061 轮把它收成 `String.StringText`（`ConstString.StringText` 就是它自己那段），
 * 投影只读属性、那个 helper 删掉。
 *
 * **量过再删**（`tmp/r1061` 的插桩，2051 份语料）：`stringText` 被调 19335 次、**每次都是 `String`**
 * （`ConstString` 0 次、别的标签 0 次），其中 554 次答空串（`""` / `''` / 空模板——那一档必须保住）。
 *
 * **为什么必须是门而不是自觉** ✗：这样写**逐字节同答**，所以方法体判据、能力面判据、
 * `cases:tsast` 一条都看不见它；可它是**同一格事实的第二处答案**——投影层再写一遍
 * 「哪一格装着正文」，那一页改了子单元形状它就会各说各话。
 *
 * 口径与前面几条同款：只看 `SHARED_FILE` 的**代码块**、注释不算（`codeOnly`），恰好 0 处才对。
 * 认两种形态：helper 的**调用**（`stringText(`）与 `ctx` 上那个出口（`ctx.StringText`）。
 */
const STRING_TEXT_NAMES = ["stringText"];
const STRING_TEXT_VIA_CHILD = new RegExp(
  `(?<![\\w$.])stringText\\s*\\(|\\bctx\\.(?:StringText)\\b`,
);
/** 投影回子单元里翻字符串正文的处数（0 处才是对的）。 */
let stringTextHits = 0;
{
  const shared = path.join(root, SHARED_FILE);
  if (fs.existsSync(shared)) {
    const text = fs.readFileSync(shared, "utf8");
    const code = [...text.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => codeOnly(m[1])).join("\n");
    for (const match of code.matchAll(new RegExp(STRING_TEXT_VIA_CHILD, "g"))) {
      stringTextHits += 1;
      if (stringTextHits <= 3) {
        violations.push({
          file: SHARED_FILE,
          why:
            `字符串的正文又由投影回子单元里翻了：\`${match[0]}\`——那一格由它自己答` +
            "（`String.StringText` / `ConstString.StringText`），投影只读属性",
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
// **能力面的账**（第 1015 轮）：这一格的出口表就是它能做的事——出口少了，方法体判据守的东西
// 才是**结构上做不到**，而不是「大家记得别写」。
console.log(
  `ctx 出口 ${ctxExits} 个，其中回原文兜底 / 已无人用的 ${ctxBannedHits} 处（0 处才是对的：${CTX_BANNED.join(" / ")}）`,
);
// **「只读属性、不调方法」的账**（第 1046 轮）：投影读 token 的每一格都是属性，
// 这一条读数就是那句话的反面——多一处 `receiver.Method(` 就红。
console.log(
  `投影对 token 调方法（${SHARED_FILE} 的代码块）：${tokenMethodHits} 处（0 处才是对的，取数据只读属性；例外只有 ctx.* 与 PrintDirectAst）`,
);
// **「这一格自己的那一格字符」的账**（第 1049 轮）：按某一格自己的起点去读 `ctx.source` 是 0 处
// ——这一格的正文由它自己答（`Token.Text` / 各页构造时记好的那一格），扫描游标与别人的终点照旧。
console.log(
  `按某一格自己的起点读 ctx.source（${SHARED_FILE} 的代码块）：${sourceSelfHits} 处（0 处才是对的，这一格的正文自己答：Token.Text / String.stringChar）`,
);
// **「按坐标切正文」的账**（第 1053 轮）：这一族的读法一律换成 `x.Text` / `x.Text.slice(…)`
// ——扫描游标与成对括号区间照旧，它们是相邻字符的读法（见 TOKEN_TEXT_VIA_SOURCE）。
console.log(
  `按坐标从 ctx.source 切正文（${SHARED_FILE} 的代码块）：${sourceTextHits} 处（0 处才是对的，这一段正文自己答：x.Text / x.Text.slice(…)）`,
);
// **用不到的形参表**（第 1050 轮）：helper 声明了 `ctx` 却在方法体里一处不用 = 0 处
// ——形参表就是这一格需要什么，不需要投影的上下文就不该挂着一个。
console.log(
  `helper 声明了 ctx 形参却一处不用（${SHARED_FILE}）：${deadCtxHits} 处（0 处才是对的，形参表就是它需要什么）`,
);
// **「这一格是不是某一类」的账**（第 1057 轮）：那一问的答案住在被问的那一页
// ——投影层再写一个 `isXxx(…)` / `ctx.IsXxx(…)` 就是同一格事实的第二处声明，0 处才对。
console.log(
  `「这一格是不是某一类」又在投影层写成问句（${SHARED_FILE} 的代码块）：${selfClassifyHits} 处（0 处才是对的，${SELF_CLASSIFY_NAMES.join(" / ")} 只许属性读）`,
);
// **同一族的最后一格**（第 1058 轮）：`IsIndexBracket` 也收成了被问那一页的属性，0 处才对。
console.log(
  `「这一格是不是下标那对方括号」又在投影层写成问句（${SHARED_FILE} 的代码块）：${indexBracketClassifyHits} 处（0 处才是对的，${INDEX_BRACKET_NAMES.join(" / ")} 只许属性读）`,
);
// **「回原文配对 / 找成对符号」的账**（第 1059 / 1060 轮）：体那对花括号与下标那个 `[` 都由
// 这一格自己记（`bodyBraceRange` / `IndexBracketAt`）——投影再回原文扫一遍就是同一格事实的
// 第二处答案，0 处才对（见 SOURCE_BRACE_SCAN）。
console.log(
  `回原文配对 / 找成对符号（${SHARED_FILE} 的代码块）：${sourceBraceScanHits} 处（0 处才是对的，体读 bodyBraceRange、下标读 IndexBracketAt）`,
);
// **「字符串的正文」的账**（第 1061 轮）：那段正文是 `String.StringText` / `ConstString.StringText`
// ——投影再写一个 `stringText(…)` / `ctx.StringText(…)` 就是同一格事实的第二处答案，0 处才对。
console.log(
  `字符串的正文又从子单元里翻（${SHARED_FILE} 的代码块）：${stringTextHits} 处（0 处才是对的，正文读 String.StringText / ConstString.StringText）`,
);
// **中间那一层的账**（第 1027 轮）：投影直吃 token，那一层的入口名一个都不许留在规范页里
// ——「token → AST 直出」这句话只有这样才有一条判据看着。
console.log(
  `中间那一层的入口名（${REMOVED_LAYER.join(" / ")}）：${removedLayerHits} 处（0 处才是对的，历史写在 docs/ 与 README 里）`,
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
console.log(
  `第三出口的约定 0 条违反（不回原文查、不按字符串键查、ctx 出口表里没有兜底出口、投影对 token 只读属性不调方法、这一格的正文自己答、按坐标切正文也走这一格自己、helper 的形参表就是它需要什么、这一格是不是某一类由被问的那一页答、这一格有哪些段由被问的那一页答、这一格哪些子单元进投影由被问的那一页答、成对符号的位置由 token 自己记、字符串的正文由 token 自己答）`,
);
process.exit(0);
