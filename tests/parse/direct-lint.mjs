// 第三个出口（`Token.PrintAst`）的静态门（第 992 轮起，第 1013 轮只剩这一条判据；
// **第 1143 轮按用户口径 1.1 改名**：`PrintDirectAst` → `PrintAst`，全仓 78 个文件 / 482 处）。
//
//   node tests/parse/direct-lint.mjs
//
// ## 为什么要有这一门
//
// `core/syntax/token.xl.md` 的 `PrintAst` 写着一条**读代码就能判**的约定：
// 这一格的方法体里**不许回原文查**——`ctx.source` / `ctx.Text(` / `ctx.TextOf(` /
// `ctx.StringText(`，也不许把问题**转手**回去（`this.PrintAst` 自己问自己）。
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
//   **第 1014 轮那条「只扫散文」的老名字判据在第 1143 轮撤掉了**：它守的是
//   「`PrintAst` 这个老名字只许出现在明说它已经不存在的行上」，而用户口径 1.1 把
//   `PrintDirectAst` 改名成 `PrintAst` 之后，这句话本身成了反的——`PrintAst` 就是现状的名字。
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
//   第 1153 轮再加一条**扫恒等拷贝**的：`String(<某一格>.DeclaredName)` = 0 处
//   （见 `NAME_COPY` 那一段）——`Token.DeclaredName` 声明就是 `string`，
//   投影再套一层 `String(…)` 是把编译期就知道的事在运行期又算一遍（用户口径 1.5 / 1.6）。
//
// **第 1013 轮删掉的判据**：原来还有一条「覆写了直出版的页面，同页必须还有另一条路」——
// 它是「同答」那条动态判据的**基线**（搬完之前不许先把老路删掉）。现在老路删了、
// 这一格只剩一处实现，所以这一条连同它的读数一起撤掉。
//
// **章节头按整行认**（第 1012 轮修掉的一处自查错误）：`indexOf("## method PrintAst…")`
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
 * `tuple-member.xl.md` 的一页 `PrintAst` 正文里**引用**了 `## method PrintAst:…`
 * 这句话（说明「这一格的返回约定」），于是 `indexOf` 从那一行起往后找第一块 ```ts，
 * 找到的是**下一个类的方法体**，而那一块里的 `ctx.Attr(typeNode, "questionAt")`
 * 就被记在**上一页的投影**名下（实测：真位置在**这一格之外**，扫描器报的行号 547 也在别处）。
 * 后果不是「多报一处」而是**判据对象错了**：被扫的那一段根本不是这一页的投影。
 * 所以章节头一律按**整行**认（`^` + `$`，`m` 标志），正文也从那一行之后找。
 */
const HEAD_DIRECT_RE = /^## method PrintAst:\(ctx:any, v:any\)=>any$/gm;
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
 * **第 1013 轮删掉的那一条**：原先是「不许把问题转手给另一条路」（`this.某名字(`），
 * 而那一条路已经整条删除——第三个出口只剩这一格，转手无路可走。
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
 * **为什么这一条要单独扫、不并进上面那两条** ✗：上面那些判据只扫 `PrintAst` 的
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
 * **`PrintAst` 这个老名字那一条判据在第 1143 轮整条撤掉了。**
 *
 * 它守的是一句**已经反过来**的话：第 1013 轮把老路删掉之后，`PrintAst` 是「过去的名字」，
 * 于是第 1014 轮立了一条只扫散文的判据——`PrintAst` 只许写在明说它不存在的那一行，
 * 免得「照着规格读代码，读出来的是幻觉」。
 *
 * **用户口径 1.1 把两个名字合并了**：`PrintDirectAst` 改名成 `PrintAst`，于是现名就是 `PrintAst`，
 * 全仓 78 个文件 / 482 处都是它。原来那条判据今天会把每一页都判红——它量的东西不存在了，
 * 所以连同它的读数一起删掉，不改成别的形状：改名之后的等价物是「改名本身一次改干净」，
 * 而那件事由**生成物的门**（`cases:direct` / `cases:tsast` / `gates`）当场看得见。
 */

/**
 * **用户口径 1.5：`## field` / `## property` 的声明里不许出现 `any`**（第 1144 轮）。
 *
 * 这一门量的本来是**代码块里的读法**（回不回原文查、按不按字符串键查、调不调方法），
 * 而「这一格自己声明成什么类型」一条都看不见：`## field FunctionFlags:any` 与
 * `## field FunctionFlags:FunctionFlagsShape | undefined` 在运行期**逐字节同答**，
 * `cases:direct` / `cases:tsast` 也一律绿——`any` 让「这一格能装什么」在读的一侧整个消失。
 *
 * **第 1144 轮实测**：全仓 182 页规范里类型带 `any` 的声明 **24 处**（正好 `any` 的 19 处，
 * 另有 `Map<string, any>` / `Map<any, …>` ×3 / `Array<any>` 这 5 处），全部换成了明确类型
 * （四个具名类型立在 `core/syntax/token.xl.md`：`SourceSpan` / `TypeMemberPlanShape` /
 * `FunctionFlagsShape` / `AstNameNode`——xl 的类型文法**不收内联对象类型**，
 * 实测报 `E1204: type annotation … is not well formed`，所以只能立名字）。
 * 今天这一条是 **0 处**，谁写回来就当场红。
 */
const DECL_RE = /^## (field|property) ([A-Za-z_]\w*):(.+)$/;
/** 名字 -> 第一次声明它的那一页（投影要读的每一格都该在这里）。 */
const declaredNames = new Map();
let anyTypedDecls = 0;
for (const file of files) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const m = DECL_RE.exec(lines[index]);
    if (m === null) continue;
    if (!declaredNames.has(m[2])) declaredNames.set(m[2], `${rel}:${index + 1}`);
    const type = m[3].split(" = ")[0];
    if (/\bany\b/.test(type)) {
      anyTypedDecls += 1;
      if (anyTypedDecls <= 5) {
        violations.push({
          file: `${rel}:${index + 1}`,
          why: `这一格的类型写作 \`any\`：\`${lines[index].trim()}\`（用户口径 1.5：字段 / 属性的声明必须明确类型）`,
        });
      }
    }
  }
}

/**
 * **用户口径 1.4：投影读到的每一格 PascalCase 属性，都必须在某一页显式声明过**（第 1144 轮）。
 *
 * 「投影需要的信息要在 token 子类构建完就齐全、在具体类里显式声明」这句话，
 * 在第 1041~1142 轮是一格一格收出来的（每一轮收完都有一条读数），但它**从来没有一条判据**：
 * 投影里再写一处 `next.SoleNameUnit` 而那一页没声明，运行期只是 `undefined`，
 * 而 `cases:direct` / `cases:tsast` 只有在那一格**恰好**影响产物时才看得见它。
 *
 * **判据的形状**：这一仓的约定是「token 自己声明的格子一律 PascalCase」、
 * 「局部变量与投出来的节点字段一律 camelCase」，所以投影代码块里每一个
 * `接收者.PascalCase` 都是在读**某一格 token 的属性**——它必须在规范树里有一格
 * `## field` / `## property` 声明过它（`declaredNames`，182 页全扫）。
 *
 * **三个例外，都是「不是这一格的数据」**（不是宽免，是同一条口径的另一面）：
 *   - `Translate.DecodeIdentifierEscapes`（命名空间上的函数）；
 *   - `SymbolToken.KindOfText`（类上的静态方法）；
 *   - `owner.PrintAst`（第三个出口的**分发**——问的是「这一格出哪个节点」，是行为）。
 *
 * **第 1144 轮实测**：投影读到 130 个 PascalCase 名字，除这三个例外**全部**有声明
 * ——所以这一条的起点是 0 处违反，它守的是「下一处新读法」。
 */
const PROJECTED_PROP = /([A-Za-z_$][\w$]*)\.([A-Z][A-Za-z0-9_]*)\b/g;
/** 接收者是它们就不是 token（投影自己的上下文对象）。 */
const PROJECTED_PROP_RECEIVERS_OK = new Set(["ctx", "context"]);
/**
 * **这些是方法 / 静态方法，不是某一格的数据**（不是宽免，是同一条口径的另一面）：
 *   - `Translate.DecodeIdentifierEscapes` / `SymbolToken.KindOfText` / `owner.PrintAst`（第 1144 轮）；
 *   - **第 1169 轮扩到全仓 `PrintAst` 方法体之后补的三个**：`this.TempToString`
 *     （`identifier.xl.md` 自己那一页上的实例方法）、`Identifier.LeafKindOfText` 与
 *     `Method.ArgumentGroups`（两页各自的**静态**方法，与 `KindOfText` 同形）。
 *     它们是**行为**（吃一段正文答一个 kind / 吃一段段答一组实参），不是「这一格装了什么」。
 */
const PROJECTED_PROP_OK = new Set([
  "DecodeIdentifierEscapes",
  "PrintAst",
  "KindOfText",
  "TempToString",
  "LeafKindOfText",
  "ArgumentGroups",
]);
let projectedPropNames = 0;
let undeclaredPropNames = 0;
/** **扫的是两处**（第 1169 轮）：共享页的代码块 **加上全仓每一段 `## method PrintAst` 的方法体**。 */
let projectedBodyCount = 0;
{
  const snippets = [];
  const shared = path.join(root, SHARED_FILE);
  if (fs.existsSync(shared)) {
    const text = fs.readFileSync(shared, "utf8");
    snippets.push({
      file: SHARED_FILE,
      code: [...text.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => codeOnly(m[1])).join("\n"),
    });
  }
  // **第 1169 轮为什么必须跟到 token 页上** ✗：这一条（用户口径 1.4）原来只扫共享页——
  // 而第 1100 ~ 1169 轮做的事情**正是把算式从共享页搬进各页的 `PrintAst`**。
  // 算式一搬走，这一条就再也看不见它读的那几格了：新读法若落在「搬过去的那一页」上，
  // 三道方法体判据（不回原文、不按字符串键、能力面）里只有前两条跟得过去，
  // 「每一格都显式声明过」这一条**天生覆盖不到**。所以这一轮的搬动与这一条扩边是同一件事。
  for (const file of files.sort()) {
    const text = fs.readFileSync(file, "utf8");
    for (const one of headsOf(text, HEAD_DIRECT_RE)) {
      const body = bodyOf(text, one.at);
      if (body === null) continue;
      projectedBodyCount += 1;
      snippets.push({ file: path.relative(root, file).replace(/\\/g, "/"), code: codeOnly(body) });
    }
  }
  const seen = new Map();
  for (const one of snippets) {
    for (const m of one.code.matchAll(PROJECTED_PROP)) {
      if (PROJECTED_PROP_RECEIVERS_OK.has(m[1])) continue;
      if (PROJECTED_PROP_OK.has(m[2])) continue;
      if (!seen.has(m[2])) seen.set(m[2], one.file);
    }
  }
  projectedPropNames = seen.size;
  for (const [name, file] of seen) {
    if (declaredNames.has(name)) continue;
    undeclaredPropNames += 1;
    if (undeclaredPropNames <= 5) {
      violations.push({
        file,
        why: `投影读的 \`${name}\` 在 182 页规范里没有任何 ## field / ## property 声明过（用户口径 1.4：要在具体类里显式声明）`,
      });
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
 *
 * **第 1069 轮再补一个出口名 `ValueOf`**：它读的是「这一格自己记的 `value`」
 * （`typeof one.value === "string" ? one.value : ""`），而 `value` 是**各页自己的一个字段**
 * ——收成 `core/syntax/token.xl.md` 的 `Token.TextValue`（基类 `## property` + `### get`）之后，
 * 16 页 58 处调用点全改成属性读，出口随之删掉。同上：出口删了就补进这张表。
 *
 * **第 1073 轮再补一个出口名 `Template`**：它是「字符串 / 模板串投成什么形状」那一段算式
 * 唯一的出口，而那一格的每一半事实都在**被投的那一页自己身上**（「我是不是模板」=
 * 构造时赋好的 `String.StringChar`、「我攒下哪些段」= 自己的 `ConstString` /
 * `InterpolationString` 子单元、「我的正文与坐标」= 自己的 `Text` / `start` / `end`）——
 * 所以 `projectString` 整格搬进了 `typescript/tokens/string/string.xl.md` 的
 * `String.PrintAst`（那一页仍然经 `ctx.Expression` / `ctx.TypeExpression` 递归投内插里的
 * 正文，所以搬走的是**算式所在的那一页**、不是能力），出口随之删掉。同上：出口删了就补进这张表。
 *
 * **第 1073 轮（同一轮第二处）再补一个出口名 `UnwrapNodes`**：它读的就是那一格自己的
 * `ProjectableKids`（第 1066 轮起实现只有 token 上那一处），全仓 5 处调用点全改成属性读；
 * 本页那个**一个真实读者都没有**的 `projectableKids` 也一并删掉。同上：出口删了就补进这张表。
 *
 * **第 1089 轮再补一个出口名 `IsIndexBracket`**：它第 1058 轮起实现就只有一行
 * （`(node) => node.IsIndexBracket`），当时留着是因为 `json/object-literal` 那一页在用它；
 * 第 1089 轮把那一处（唯一一个真实读者）改成读同名的属性读，于是这个出口**零真实读者**
 * ——出口删了就补进这张表，免得下一轮有人往 `ctx` 里补一行再把问句请回来。
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
  "ValueOf",
  "Template",
  "UnwrapNodes",
  "SpecifierNameOf",
  "IsIndexBracket",
  "NameOf",
  "TypeArguments",
  "Make",
  // **第 1167 轮再补两个出口名**：`AddModifiers` / `Decorators`——它们做的是「把被问的那一格
  // 记下的修饰词 / 装饰器拼成一串节点」，而**每一件输入都在那一格自己身上**，所以三处调用点
  // （`structuralProps` 与 `field.xl.md` / `type-assign.xl.md` 两页）改成读 `Token.ModifierNodes` /
  // `Token.Decorators` 两格属性，两个出口一并删掉。出口删了就补进这张表，
  // 免得下一轮有人往 `ctx` 里补一行再把「替它拼节点」请回来。
  "AddModifiers",
  "Decorators",
  // **第 1168 轮再补两个出口名**：`StartOf` / `EndOf`——它们的实现是**恒等调用**
  // （`(node) => node.start` / `node.end`，与第 1159 轮从本页删掉的同名两格 helper 逐字相同），
  // 全仓代码块 69 处调用点一并换成属性读。出口删了就补进这张表：下一轮谁想往 `ctx` 里
  // 再挂一个「替某一页读坐标」的转手，写回来这一门当场红。
  "StartOf",
  "EndOf",
  // **第 1169 轮再补一个出口名**：`HeadDeclare`——它做的是「**没有 `Let` 的声明段** →
  // `VariableDeclarationList`」那一整趟，而它要的每一件东西都在**那一段自己的单元**身上
  // （`IsNameNode` / `IsPatternKid` / `IsDeclareWord` / `NameNode` / `TextValue` / `start` / `end`），
  // 读者**只有 `foreach.xl.md` 一个** ⇒ 算式整段搬进那一页的 `PrintAst`（就地展开）、出口删掉。
  // 出口删了就补进这张表，免得下一轮有人往 `ctx` 里补一行再把这一趟请回来。
  "HeadDeclare",
  // **第 1173 轮再补一个出口名**：`StmtEndOf`——它转手的那一格 helper 第 1173 轮收成了一句
  // `return v.ProjectionEnd`（尾部坐标的判据全在被问的那一格上：token 是 `Token.ProjectionEnd`、
  // 合成语句视图是 `statementOfList` 那一格自己带的），出口因此删掉：本文件内部 14 处读者
  // 直接调那一格 helper，外部 5 页（`conditional-type` / `import` / `label` /
  // `lamda-parameter` / `switch`）各读各的 `v.ProjectionEnd`。出口删了就补进这张表。
  "StmtEndOf",
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
 *   - 方法名是 `PrintAst`——第三个出口的**分发**，问的是「这一格出哪个节点」，
 *     那是行为而不是这一格的数据（`core/syntax/token.xl.md` 的 `PrintAst`）。
 *
 * 口径与 `NAME_KEY` 那一条同款：只看 `SHARED_FILE` 的**代码块**、注释不算（`codeOnly`），
 * 恰好 0 处才对。
 */
const TOKEN_METHOD_CALL = /(?<![A-Za-z0-9_.$])([a-z][A-Za-z0-9_]*)\.([A-Z][A-Za-z0-9_]*)\s*\(/g;
/** 接收者是它就不是 token（投影自己的上下文对象）。 */
const TOKEN_METHOD_RECEIVERS_OK = new Set(["ctx"]);
/** 方法名是它就不是「取数据」而是行为。 */
const TOKEN_METHOD_NAMES_OK = new Set(["PrintAst"]);
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
    // **投影节点的坐标也收进同一条**（第 1109 轮）：`ctx.source[at.pos - 1]` / `ctx.source[at.end]`
    // 问的是「这一格自己那一格的正文」（名字头一格是不是引号），而那个问题有 token 自己的一格
    // 属性答（`Token.NameSpan` / `Token.NameTextSpan`）。**实测收干净之后全仓 0 处**，
    // 但这一条**没有写成判据**：同一写法里还有「相邻字符」的合法读法
    // （`ctx.source[built.end - 1] === ","` 那种「这一格末尾那一格字符是什么」），
    // 而正则分不出这两种意图——写成门会把它一起判红（第 1049 轮留着的正是这一族）。
    // 所以口径记在这里、判据留白：下一轮若要立门，得先给「相邻字符」找出可判的形态。
    //
    // **第 1149 轮把这一族又量了一遍**（同一份代码块、同样去掉注释行）：
    // `ctx.source[<某一格>.end - 1]` 还剩 **3 处 / 2 个写点**，两处读的**都不是 token**——
    // 一处是 `projectDeclaration` 里的 `built`（`mk(kind, props)` 造出来的**投影节点**，
    // 「对象字面量成员吃不吃尾随逗号」），另一处是 `ownsTrailingSemicolonOf` 的 `node`
    // （`out` 末尾那个**投影节点**，「上一条语句末尾那个字符是不是 `;`」）。两者手上都没有
    // token——他们的 `.end` 是投影出来的坐标，问的是**相邻那一格原文**。所以这一族今天
    // 剩下的都是合法读法，判据仍然留白；**被收掉的那一类是「token 自己答得出来的」**：
    // 第 1149 轮把 `projectEach` 里 `ctx.source[endOf(items[i]) - 1] === ";"` 连同那趟
    // 子单元循环收进了 `Token.TrailingSemicolonAt`（见 `core/syntax/token.xl.md`）。

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
 * **已知是 `string` 的那一格，不许再拷一遍**（第 1153 轮）。
 *
 * 用户口径 1.5 要求每一格都声明成明确类型，而 `core/syntax/token.xl.md` 的
 * `## property DeclaredName:string` **答的就是一个字符串**（没有名字时是空串：那一格的 `### get`
 * 两条路都判过 `typeof … === "string"` 才返回）。所以投影层那 15 处 `String(x.DeclaredName)`
 * 是一次**恒等映射**——换成属性读之后八道门读数一处没动（逐字节同答）。
 *
 * **为什么必须是门而不是自觉** ✗：它与属性读逐字节同答，`cases:direct` / `cases:tsast` /
 * `samples` / `coverage` 一条都看不见差别；能看见的只有口径本身——
 * 「这一格的类型在编译期就是 `string`」这句话不必在运行期再算一遍（用户口径 1.6）。
 * 口径与前面几条同款：只看 `SHARED_FILE` 的**代码块**、注释不算（`codeOnly`），恰好 0 处才对。
 */
const NAME_COPY = /\bString\(([^()]*\.DeclaredName)\)/g;
let nameCopyHits = 0;
{
  const shared = path.join(root, SHARED_FILE);
  if (fs.existsSync(shared)) {
    const text = fs.readFileSync(shared, "utf8");
    const code = [...text.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => codeOnly(m[1])).join("\n");
    for (const match of code.matchAll(NAME_COPY)) {
      nameCopyHits += 1;
      if (nameCopyHits <= 3) {
        violations.push({
          file: SHARED_FILE,
          why:
            `把已经声明成 string 的名字又拷了一遍：\`${match[0]}\`——` +
            "`Token.DeclaredName` 本身就是字符串（没有名字时是空串），投影只读属性",
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
 * 形状由 token 自己的 `PrintAst` / `AstKind()` / `SegmentNames` / `BodyField` 说。
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

/**
 * **「含 trivia 的完整子单元表」这一格不许回到 token 页上**（第 1161 轮，用户口径 1.6 / 1.7）。
 *
 * `Token.AllKids` 第 1141 轮立、**第 1161 轮整格删掉**：它那两个读者（`ProjectionStart` 找
 * 「起点正好是这个位置的那一格注释」、`TrailingSemicolonAt` 问「末尾那个 `;` 有没有被某一格
 * 盖住」）都只用得着**一格一格地看**，而那一格**每读一次就现造一张数组**——实测官方用例语料
 * 1640 份：被读 **11516** 次 = **11516** 次数组构造（`ProjectionStart` 9580 +
 * `TrailingSemicolonAt` 1936）。
 *
 * **为什么它必须是门**：删掉的东西**能被重新写回来**——谁想再要一张全表，在基类上写一格
 * `AllKids` 就绕开了这一门其余的判据（那几条看的是投影层，而这一格长在 token 上）。
 * 与 `REMOVED_LAYER` 同一条口径：「口径」这两个字只有这样才有一条判据看着。
 *
 * **只看非注释行**：那一页的注释里写着它的历史（`this.AllKids.find(…)` 原来长什么样、
 * 第 1148 轮量过什么），那是**记录**；代码行里出现才是「这一格又回来了」。
 */
const ALL_KIDS_REMOVED = /\bAllKids\b/;
let allKidsHits = 0;
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const code = [...text.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => m[1]).join("\n");
  if (code === "") continue;
  const live = code.split("\n").filter((line) => !line.trimStart().startsWith("//")).join("\n");
  const hits = (live.match(new RegExp(ALL_KIDS_REMOVED, "g")) ?? []).length;
  if (hits === 0) continue;
  allKidsHits += hits;
  violations.push({
    file: path.relative(root, file),
    why: `\`AllKids\` 又出现在代码行里（${hits} 处）——那一格第 1161 轮整格删掉了（读一次造一张数组）；要那一批子单元的读者就地扫各段与 \`children\`，历史写在那两格的注释里`,
  });
}

/**
 * **「替某一页读坐标」那两个出口不许回来**（第 1168 轮，用户口径 1.6 / 1.7）。
 *
 * `ctx.StartOf` / `ctx.EndOf` 第 181 轮挂上来的实现是**恒等调用**
 * （`(node) => node.start` / `node.end`）——它们与第 1159 轮从 `print-ast-common` 里删掉的
 * 同名两格 helper（全页 242 处调用点）**逐字相同**：一次不改变任何东西的函数调用。
 * 第 1159 轮只删了**本页自己那一份**（那 242 处换成属性读），而 `ctx` 上这两个出口
 * 还留给别的页用——第 1168 轮把全仓代码块里 **69 处**（`StartOf` 30 / `EndOf` 39）一并
 * 换成属性读，两个出口删掉。
 *
 * **为什么它必须是门**：出口删了，前面那几条方法体判据就永远绿（它们守的是「谁写了什么」，
 * 而这一层今天**拿不到**这个能力）——能重新把它请回来的只有「往 `ctx` 里补一行」，
 * 而那一行 `CTX_BANNED` 已经看着了。这一条看着的是**用法**：谁把 `x.start` 又写回成
 * `ctx.StartOf(x)`，当场红。口径与 `REMOVED_LAYER` / `ALL_KIDS_REMOVED` 同款：
 * 只看全仓 `*.xl.md` 的 **`ts` 代码块**、只数**非注释行**（散文与注释里写着它们的历史，
 * 那是记录）。
 */
const CTX_COORD_EXITS_REMOVED = /\bctx\.(?:StartOf|EndOf)\s*\(/;
let coordExitHits = 0;
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const code = [...text.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => m[1]).join("\n");
  if (code === "") continue;
  const live = code.split("\n").filter((line) => !line.trimStart().startsWith("//")).join("\n");
  const hits = (live.match(new RegExp(CTX_COORD_EXITS_REMOVED, "g")) ?? []).length;
  if (hits === 0) continue;
  coordExitHits += hits;
  violations.push({
    file: path.relative(root, file),
    why: `\`ctx.StartOf\` / \`ctx.EndOf\` 又出现在代码行里（${hits} 处）——这两个出口第 1168 轮删掉了（恒等调用）；取坐标读它自己的 \`x.start\` / \`x.end\``,
  });
}

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
 *
 * **第 1075 轮再补一格**：`IsChainBaseNode`（别名就是老问句写法 `IsChainBaseNode`）——
 * 「这一格能不能当一条链的基名」的两半（我是什么类、我这一格的正文是什么）都住在被问的那一页上，
 * 今天基类默认 `false`、八页常量答 `true`、`Identifier` / `Keyword` 在收完正文那一刻按正文赋。
 * 它与 `property-access.xl.md` 的 `IsChainBase`（解析期那一格）**不是同一份名单**，
 * 所以名字差一个 `Node`、两处各自守着自己那一问。
 *
 * **第 1077 轮再补一格**：`IsBareCall`（别名 `isBareCallMethod`）——「这一格是不是一次裸调用」
 * 的三半（我是什么类、我的名字空不空、我第一个实义子单元是什么）全在 `Method` 那一页上，
 * 今天基类给默认 `false`、`Method` 现算（`## property` + `### get`，读 `ProjectableKids`）。
 *
 * **第 1084 轮再补一格**：`IsCommentUnit`——`trailingTriviaStart` 问的「这一格是不是一条注释」
 * 过去写成两连比类名（`k.Tag === "LineAnnotation" || k.Tag === "AreaAnnotation"`），
 * 而**类名就是那两页自己的名字**；今天基类默认 `false`、那两页各自显式声明
 * `## field IsCommentUnit:bool = true`（构造时赋好的常量），投影只读属性。
 * 它与 `IsInvisible` **不是同一问**：后者答 `true` 的有四页（多出 `LineWrap` 与
 * `PreprocessorDirectives`），所以这里守的是新名字，而不是把 `IsInvisible` 也一并钉住
 * （那一格在投影层是**允许**读的：`Kids` / `ProjectableKids` 那一族就靠它）。
 *
 * **第 1088 轮再补一格**：`IsBinaryOperatorNode`——「这一格是不是一个二元 / 逻辑运算单元」
 * 过去是投影层十几处**两连比类名**（`Tag === "BinaryOperator" || Tag === "LogicalOperator"`），
 * 而那两个名字就是 `BinaryOperator` / `LogicalOperator` 两页自己的类名（两页的 `AstKind`
 * 都是 `BinaryExpression`）。今天基类默认 `false`、那两页各自显式声明 `## field … = true`，
 * 投影只读属性。**同一形状的「匿名比类名」还有一条**（`BINARY_CLASS_DISJUNCTION`，
 * 见下），这一条守的是「名字写回成问句」那一形态。
 *
 * **第 1089 轮再补两格**：`IsParenBracket` / `IsBraceBracket`——「这一格是不是那对圆 / 花括号」
 * 与第 1058 轮收掉的 `IsIndexBracket` 是同一句话的三个面，三格都在 `Bracket` 那一页的 `Use`
 * 里赋好。同一轮的**匿名连写**由 `BRACKET_STATE_CLASSIFY` 那一条守着（见下）。
 *
 * **第 1090 轮再补一格**：`IsNotNullSymbol`——「这一格是不是非空断言那个 `!`」过去是投影层
 * 11 处现场连写（`Tag === "SymbolToken" && TextValue === "!"`），今天由符号那一页读时现算
 * （`## property` + `### get`：基类答 `false`——与 `IsCommaSymbol` 同一形态、同一理由：
 * 不是每个符号都会走到 `Close()`）。同一轮的**匿名连写**由 `NOT_NULL_SYMBOL_CLASSIFY` 守着。
 *
 * **第 1103 轮再补两格**：`IsIndexFirstUnit` / `IsCallFirstUnit`——「这一格是不是**以**一次下标 /
 * 一次调用开头」过去是投影层的两格 helper（`print-ast-common.xl.md` 的 `isIndexFirstUnit` /
 * `isCallFirstUnit`，两格合起来 135 行），而它们问的**全是这一格自己的事**（读 `Tag` /
 * `IsIndexBracket` / `ProjectableKids`，再递归问头一格）。今天基类两格默认 `false`、
 * `ArrayLiteral` / `Bracket` / `NotNull` / `PropertyAccess` / `Method` 五页各自显式声明
 * 同一个属性（`## property` + `### get`），投影只读属性（`x?.IsIndexFirstUnit`）。
 * 这一条守的就是**名字写回成问句**那一形态：`isIndexFirstUnit(` / `isCallFirstUnit(` / `ctx.Is…`。
 *
 * **第 1106 轮再补一格**：`OperatorWordKind`——「这一格是词形运算符（`in` / `instanceof`）的话，
 * 它在 TS 那边叫什么」过去是投影层的一格 helper（`print-ast-common.xl.md` 的 `operatorTokenOf`：
 * 按 `op.TextValue` 认那两个词、再自己拼出 `"InKeyword"` / `"InstanceOfKeyword"`），
 * 而那两半**都在被问的那一页上**（正文只有那一页知道；那两个 kind 名本来就在 `Keyword` 的
 * `KEYWORD_KIND` 里）。今天基类一格默认空串、`Identifier` 在 `Close()`、`Keyword` 在
 * `SetValue` 里各自显式声明同一个属性并按自己的正文赋好，投影只读 `x.OperatorWordKind`。
 * 这一条守的是**老 helper 名写回投影层的方法体**（`operatorTokenOf(`）与出口形态
 * （`ctx.OperatorWordKind`）。
 *
 * **第 1107 轮再补两格**：`IsEqualsSymbol` / `IsArrowSymbol`——「这一格是不是那个等号 `=` /
 * 那个箭头 `=>`」过去是投影层 9 处**现场连写**（`k.IsSymbolToken && k.TextValue === "="` 6 处、
 * `=== "=>"` 3 处：`let` 的初值、绑定的默认值、导出语句的赋值、`functionTypeProps` 找箭头那一格
 * 与 `new <T>(x: T) => T` 那一支）。今天基类两格默认 `false`、`SymbolToken` 那一页
 * **显式声明同一个属性**（`## property` + `### get`，读时现算——读的是基类那格 `TextValue`，
 * 所以与搬走之前逐格同答：不是每个符号都会走到 `Close()`）。这一条守的是
 * **老问句写回投影层**（`isEqualsSymbol(` / `isArrowSymbol(`）与出口形态（`ctx.IsEqualsSymbol`）。
 *
 * **第 1108 轮再补三格**：`IsColonSymbol` / `IsDotDotDotSymbol` / `IsAsteriskSymbol`——
 * 「这一格是不是那个冒号 `:` / 那三个点 `...` / 那个星号 `*`」过去是投影层 6 处**现场连写**
 * （各 2 处：`projectBindingElement` 找冒号与 `dots`、`namedExportClause` 切 `with { … }`、
 * `yield*` 的 `asteriskToken`、`export * as ns`、展开实参 `f(...xs)`）。今天基类三格默认
 * `false`、`SymbolToken` 那一页**显式声明同一个属性**（`## property` + `### get`，读 `TextValue`）。
 * 这一条守的仍是老问句与出口形态（`isColonSymbol(` / `ctx.IsDotDotDotSymbol` …）。
 *
 * **第 1115 轮再补一格**：`IsBinaryOperatorUnit`——「这一格是不是**二元**那一页的单元」过去是
 * 投影层九处现场比类名（`X.Tag === "BinaryOperator"` / `X.Tag !== "BinaryOperator"`；其中两处
 * 先把标签取进局部变量 `kind` 再比：`chainTailInOperator` / `indexTailInOperator`），
 * 而那个名字**就是 `BinaryOperator` 那一页自己的类名**。今天基类默认 `false`、
 * 那一页显式声明 `## field IsBinaryOperatorUnit:bool = true`（构造时赋好），投影只读属性。
 * **它与 `IsBinaryOperatorNode` 不是同一问**：后者问「二元 / 逻辑运算节点」（两页都答
 * `true`），前者只认 `BinaryOperator` 那一页（剥壳与取尾链按那一页的 `Data` 布局读）。
 * 同一轮的**匿名连写**由 `SELF_TAG_CLASSIFY`（单比）与 `BINARY_CLASS_DISJUNCTION`
 * （两连比、含 `!==` / `&&` 那一形态）两条一并守着。
 */
/** **属性名 → 那一问的写法**：`IsDotSymbol` → `isDotSymbol`，`IsIndexBracket` → `isIndexBracket`。 */
const classifyPredicate = (name) => (name.startsWith("Is") ? "is" + name.slice(2) : name);
/** **别名**（与全名一样是「回投影层问一遍」）：第 1057 轮的缩写，以及后几轮那些格的老问句写法。 */
const CLASSIFY_ALIASES = {
  isDotSymbol: ["isDot"],
  isChainBaseNode: ["IsChainBaseNode"],
  OperatorRank: ["operatorRank"],
  OperatorWordKind: ["operatorTokenOf"],
  DeclarationListFlags: ["flagsOf"],
  HasChildren: ["labelIsFlat"],
  Segments: ["segmentKeysOf"],
  ModifierWords: ["declaredKeysOf"],
  ProjectableKids: ["projectableKids", "unwrapNodes"],
  isBareCall: ["isBareCallMethod"],
  isCallUnit: ["memberIsCall"],
};
/** 把一组问句名铺成一条或起来的分支（主名 + 缩写）。 */
const classifyAlternation = (predicates) =>
  predicates.flatMap((name) => [name, ...(CLASSIFY_ALIASES[name] ?? [])]).join("|");
const SELF_CLASSIFY_NAMES = [
  "IsDotSymbol",
  "IsTypeSeparator",
  "IsNameNode",
  "IsOperatorUnit",
  "OperatorWordKind",
  "IsPrefixOperatorUnit",
  "IsTypeParameterModifier",
  "OperatorRank",
  "DeclarationListFlags",
  "HasChildren",
  "Segments",
  "ModifierWords",
  "ProjectableKids",
  "IsChainBaseNode",
  "IsBareCall",
  "IsCommentUnit",
  "IsBinaryOperatorNode",
  "IsBinaryOperatorUnit",
  "IsExpressionWithTypeArguments",
  "IsTypeAssignUnit",
  "IsParenBracket",
  "IsBraceBracket",
  "IsNotNullSymbol",
  "IsEqualsSymbol",
  "IsArrowSymbol",
  "IsColonSymbol",
  "IsDotDotDotSymbol",
  "IsAsteriskSymbol",
  "IsPropertyAccess",
  "IsNotNull",
  "IsMethodNode",
  "IsGenericType",
  "IsSymbolToken",
  "IsNullConditionalOperator",
  "IsStringUnit",
  "IsStringLiteralUnit",
  "IsTemplateString",
  "IsBracketUnit",
  "IsArrayLiteralUnit",
  "IsTypeParameterUnit",
  "IsKeywordUnit",
  "IsIdentifierUnit",
  "IsLetUnit",
  "IsObjectLiteralUnit",
  "IsDecoratorUnit",
  "IsAsUnit",
  "IsSatisfiesUnit",
  "IsSpreadUnit",
  "IsValueOnlyUnit",
  "IsTypeUnit",
  "IsTypeSuffixUnit",
  "IsTypeDefine",
  "IsArrayType",
  "IsIndexedAccessType",
  "IsTypeOperator",
  "IsTypePredicate",
  "IsUnionType",
  "IsIntersectionType",
  "IsFunctionType",
  "IsImportType",
  "IsTypeQuery",
  "IsTypeWithTypeArguments",
  "IsParameterUnit",
  "IsLabelUnit",
  "IsExportUnit",
  "IsBindingElement",
  "IsMethodDeclaration",
  "IsUnaryOperator",
  "IsSwitchCaseUnit",
  "IsSwitchStatementUnit",
  "IsStatementShell",
  "IsIndexFirstUnit",
  "IsCallFirstUnit",
  "IsCallUnit",
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
            "`Token.OperatorWordKind` / `Token.IsPrefixOperatorUnit` / `Token.IsTypeParameterModifier` / " +
            "`Token.IsCommentUnit`），投影只读属性",
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
 * **「这一格是不是一个名字」也不许在投影层比类名**（第 1076 轮）。
 *
 * 第 1057 轮把 `isNameNode(node)` 收成了 `Token.IsNameNode`（`Identifier` / `Keyword` 两页
 * 各自在构造时答 `true`），第 1075 轮又把 `IsChainBaseNode` 收了回去——可**同一句话的另一种
 * 写法**一直留在投影层的代码块里：`k.Tag === "Identifier" || k.Tag === "Keyword"`。
 * 那正是「这一页自己的类名」被投影层又抄了一遍，而且抄了十几处：改一页的类名、或让一页新的
 * token 能当名字，都要回来改这里，两处一旦漂开只有坏输入才显形（与第 1005 轮那条
 * 「按字符串键查」同一个形状：判的是「那个名字写的是什么」，不是「这一格是什么」）。
 *
 * 第 1076 轮把这 12 处全部改成读 `k.IsNameNode`，所以这一条守的是**连写形态**：
 * `X.Tag === "Identifier" || X.Tag === "Keyword"`（两种次序都算）在 `SHARED_FILE` 的代码块里
 * 必须恰好 0 处。`Tag === "Keyword"` / `Tag === "Identifier"` **单独**出现**不算**——
 * 那些问的是「是不是**那一个**类」（`as` / `new` / `abstract` / `export` 那些格），不是「是不是
 * 一个名字」，判据不同、也不该混进这一条。
 *
 * 口径与上面几条逐字相同：只看 `SHARED_FILE` 的**代码块**、注释不算（`codeOnly`）。
 */
const NAME_CLASS_DISJUNCTION = [
  /(\w+(?:\[\w+\])?)\.Tag\s*===\s*"Identifier"\s*\|\|\s*\1\.Tag\s*===\s*"Keyword"/g,
  /(\w+(?:\[\w+\])?)\.Tag\s*===\s*"Keyword"\s*\|\|\s*\1\.Tag\s*===\s*"Identifier"/g,
  // **第 1096 轮补的否定形态**：`X.Tag !== "Identifier" && X.Tag !== "Keyword"` 问的是
  // 「这一格**不是**一个名字」——今天读 `!x.IsNameNode`（投影层那一处已改，这一形态也归 0）。
  /(\w+(?:\[\w+\])?)\.Tag\s*!==\s*"Identifier"\s*&&\s*\1\.Tag\s*!==\s*"Keyword"/g,
  /(\w+(?:\[\w+\])?)\.Tag\s*!==\s*"Keyword"\s*&&\s*\1\.Tag\s*!==\s*"Identifier"/g,
];
/** 投影层拿类名当「是不是一个名字」判的处数（0 处才是对的）。 */
let nameClassDisjunctionHits = 0;
{
  const shared = path.join(root, SHARED_FILE);
  if (fs.existsSync(shared)) {
    const text = fs.readFileSync(shared, "utf8");
    const code = [...text.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => codeOnly(m[1])).join("\n");
    for (const re of NAME_CLASS_DISJUNCTION) {
      for (const match of code.matchAll(re)) {
        nameClassDisjunctionHits += 1;
        if (nameClassDisjunctionHits <= 3) {
          violations.push({
            file: SHARED_FILE,
            why:
              `「这一格是不是一个名字」又比类名了：\`${match[0]}\`——那一格的事实住在被问的那一页` +
              "（`Token.IsNameNode`，`Identifier` / `Keyword` 各自在构造时答好），投影只读属性",
          });
        }
      }
    }
  }
}

/**
 * **同一句话在下一族的写法：`BinaryOperator` / `LogicalOperator` 的两连比类名**
 * （第 1088 轮）。
 *
 * 第 1076 轮收的是「这一格是不是一个名字」用类名写出来的样子
 * （`Tag === "Identifier" || Tag === "Keyword"`）；第 1088 轮收的是**同一形状的下一族**：
 * 投影里十几处问「这一格是不是一个二元 / 逻辑运算单元」，过去一律写作
 * `X.Tag === "BinaryOperator" || X.Tag === "LogicalOperator"`——**那两个名字就是那两页
 * 自己的类名**（两页的 `AstKind` 都是 `BinaryExpression`），所以它本来就该由那两页各自答
 * （`Token.IsBinaryOperatorNode`：基类默认 `false`、两页显式声明 `## field … = true`）。
 *
 * 为什么必须是门而不是自觉 ✗：与第 1076 轮那条逐字相同——这样写**逐字节同答**，
 * 方法体判据、能力面判据、`cases:tsast` / `cases:direct` 一条都看不见它；
 * 可改一页的类名、或让第三页也当二元运算节点，都要回来改这十几处，两处一旦漂开
 * 只有坏输入才显形。口径与前面几条同款：只看 `SHARED_FILE` 的**代码块**、注释不算
 * （`codeOnly`），恰好 0 处才对（两种次序都算，跨行写法也算）。
 *
 * **单比 `BinaryOperator` 的那几处第 1115 轮收干净了**：它们问的不是「是不是二元运算节点」，
 * 而是「这一格是不是 `BinaryOperator` 那一页的单元」——剥壳用的是 `headInner[length - 2]`，
 * 而逻辑单元的 `Data` 最后一格才是运算符（布局不同），所以那几处**读的是另一格**
 * （`Token.IsBinaryOperatorUnit`，只有 `BinaryOperator` 那一页答 `true`），不是并进这一格。
 * 同一轮把这一条**补全成四种形态**（原来只认 `===` + `||` 的两连比）：`!==` + `&&` 的否定式
 * （`X.Tag !== "BinaryOperator" && X.Tag !== "LogicalOperator"`，九处里的五处就是它）、
 * 以及**先取进局部变量再比**那一形态（`const kind = unit.Tag;` + `kind !== …`，第 1115 轮
 * 连局部变量一起收掉）——三条正则跟着长，本页恰好 0 处才对。
 */
const BINARY_CLASS_DISJUNCTION = [
  /([A-Za-z_$][\w$]*(?:\[\d+\])?)\.Tag\s*===\s*"BinaryOperator"\s*\|\|\s*\1\.Tag\s*===\s*"LogicalOperator"/g,
  /([A-Za-z_$][\w$]*(?:\[\d+\])?)\.Tag\s*===\s*"LogicalOperator"\s*\|\|\s*\1\.Tag\s*===\s*"BinaryOperator"/g,
  // **第 1115 轮补的否定形态**：`X.Tag !== "BinaryOperator" && X.Tag !== "LogicalOperator"`
  // 问的是「这一格**不是**一个二元 / 逻辑运算单元」——今天读 `X.IsBinaryOperatorNode !== true`。
  /([A-Za-z_$][\w$]*(?:\[\d+\])?)\.Tag\s*!==\s*"BinaryOperator"\s*&&\s*\1\.Tag\s*!==\s*"LogicalOperator"/g,
  /([A-Za-z_$][\w$]*(?:\[\d+\])?)\.Tag\s*!==\s*"LogicalOperator"\s*&&\s*\1\.Tag\s*!==\s*"BinaryOperator"/g,
  // **同一形态的「先取标签再比」**（第 1115 轮）：`const kind = unit.Tag;` 之后
  // `kind !== "BinaryOperator" && kind !== "LogicalOperator"`——局部变量那一格也一起收掉。
  /const\s+[A-Za-z_$][\w$]*\s*=\s*[A-Za-z_$][\w$]*\.Tag;?\s*\n[^\n]*!==\s*"BinaryOperator"\s*&&[^\n]*!==\s*"LogicalOperator"/g,
];
/** 投影层拿类名当「是不是一个二元 / 逻辑运算单元」判的处数（0 处才是对的）。 */
let binaryClassDisjunctionHits = 0;
{
  const shared = path.join(root, SHARED_FILE);
  if (fs.existsSync(shared)) {
    const text = fs.readFileSync(shared, "utf8");
    const code = [...text.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => codeOnly(m[1])).join("\n");
    for (const re of BINARY_CLASS_DISJUNCTION) {
      for (const match of code.matchAll(re)) {
        binaryClassDisjunctionHits += 1;
        if (binaryClassDisjunctionHits <= 3) {
          violations.push({
            file: SHARED_FILE,
            why:
              `「这一格是不是一个二元 / 逻辑运算单元」又在比类名了：\`${match[0]}\`——那一格的事实` +
              "住在被问的那一页（`Token.IsBinaryOperatorNode`，两页各自在构造时答好），投影只读属性",
          });
        }
      }
    }
  }
}

/**
 * **「这一格是哪一态括号」也不许在投影层现场连写**（第 1089 轮）。
 *
 * 第 1058 轮把 `isIndexBracket(node)` 收成了 `Bracket.IsIndexBracket`（构造时赋好的那一格），
 * 可**同一句话的另一种写法**一直留在投影层的代码块里：`X.Tag === "Bracket" &&
 * X.startBracket === "("`（以及 `{`）。第 1089 轮按同一把尺子把三态里的单态连写全部收掉
 * ——`IsParenBracket` / `IsBraceBracket` 新立（与 `IsIndexBracket` 同一页、同一趟 `Use`），
 * 24 处改读属性。这里守的是**连写形态**：`Tag === "Bracket"` 与 `startBracket === "(" / "{" / "["`
 * 连在一起（同一次序、同一接收者，`String(… ?? "")` 那种兜底写法也算）在代码块里必须恰好 0 处。
 *
 * **为什么不并进上一条** ✗：上一条（`SELF_CLASSIFY`）守的是**名字**——把问句重新写成一个
 * 函数名或一个 `ctx` 出口；这一条守的是**匿名连写**（一个名字都没有的现场算式）。
 * 两条管的形态不同，所以各有一条判据（与第 1076 轮那条 `NAME_CLASS_DISJUNCTION` 同一格局）。
 *
 * **两态写法第 1089 轮当时不算**：`(k.Tag === "Bracket" && (k.startBracket === "[" ||
 * k.startBracket === "{"))` 那三处问的是另一句话（值位那两种括号凑成的形状），那一轮逐字保留；
 * **第 1095 轮把它们也改成读同页已有的两格**（`(k.IsIndexBracket || k.IsBraceBracket)`）——
 * 同一格事实的两种写法收成一格，`Tag === "Bracket"` 那一半从此在投影层一处不剩。
 *
 * **第 1137 轮补了第三条：裸字段读**（`X.startBracket === "("` 那一形态）。上面两条正则都要求
 * 前面有 `X.Tag === "Bracket"` 那一半守卫，于是**没有那一半的写法**从这一门漏了过去——
 * 本页 `projectExpression` 末尾「对调用结果再调一次」那一支当时写的是
 * `kids[kids.length - 1].IsBracketUnit && kids[kids.length - 1].startBracket === "("`
 * （第 1095 / 1109 轮那 27 处的漏网一处，与第 1115 轮收掉的 `IsCommentUnit` 那一处同款）。
 * 那一处已改成读 `IsParenBracket`；这一条守的是「那一格事实只有被问的那一页那一格」
 * ——`startBracket` 是**存储**（`Bracket.Use` 里赋 `IsParenBracket` / `IsBraceBracket` /
 * `IsIndexBracket` 三格时读的就是它），投影层不该有第二个入口。
 */
const BRACKET_STATE_CLASSIFY = [
  /([A-Za-z_$][\w$]*(?:\[\d+\])?)\.Tag\s*===\s*"Bracket"\s*&&\s*\1\.startBracket\s*===\s*"[([{]"/g,
  /([A-Za-z_$][\w$]*(?:\[\d+\])?)\.Tag\s*===\s*"Bracket"\s*&&\s*String\(\s*\1\.startBracket\s*\?\?\s*""\s*\)\s*===\s*"[([{]"/g,
  /([A-Za-z_$][\w$]*(?:\s*\[[^\]]*\])?)\.startBracket\s*===\s*"[([{]"/g,
];
/** 投影层现场连写「这一格是哪一态括号」的处数（0 处才是对的）。 */
let bracketStateHits = 0;
{
  const shared = path.join(root, SHARED_FILE);
  if (fs.existsSync(shared)) {
    const text = fs.readFileSync(shared, "utf8");
    const code = [...text.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => codeOnly(m[1])).join("\n");
    for (const re of BRACKET_STATE_CLASSIFY) {
      for (const match of code.matchAll(re)) {
        bracketStateHits += 1;
        if (bracketStateHits <= 3) {
          violations.push({
            file: SHARED_FILE,
            why:
              `「这一格是哪一态括号」又现场连写了：\`${match[0]}\`——那一格的事实住在被问的那一页` +
              "（`Bracket.IsParenBracket` / `IsBraceBracket` / `IsIndexBracket`，`Use` 里赋好），投影只读属性",
          });
        }
      }
    }
  }
}

/**
 * **「这一格是不是非空断言那个 `!`」也不许在投影层现场连写**（第 1090 轮）。
 *
 * 投影层 11 处（9 处过滤器 + 2 处 `find`）要把 `NotNull` 单元里收尾那个 `!` 滤掉或找出来，
 * 判据过去一律是现场拼出来的 `X.Tag === "SymbolToken" && X.TextValue === "!"`——
 * 那是**同一格事实的第二处答案**（「我这一格的正文是什么」只有符号那一页知道），
 * 第 1090 轮收成 `SymbolToken.IsNotNullSymbol`（`## property` + `### get`，基类答 `false`），
 * 11 处改读属性。这里守的是**匿名连写**那一形态（同行与跨行都算、含被 `!(…)` 包起来的写法）。
 *
 * **泛型那一形态不算**：`const isSymbol = (k, text) => k.Tag === "SymbolToken" &&
 * k.TextValue === text` 问的是「正文是不是**参数给的那个**」，不是某一个具体符号——
 * 它没有一格事实的第二处答案，所以逐字保留。
 */
const NOT_NULL_SYMBOL_CLASSIFY =
  /([A-Za-z_$][\w$]*(?:\[\d+\])?)\.Tag\s*===\s*"SymbolToken"\s*&&\s*\1\.TextValue\s*===\s*"!"/g;
/** 投影层现场连写「是不是那个 `!`」的处数（0 处才是对的）。 */
let notNullSymbolHits = 0;
{
  const shared = path.join(root, SHARED_FILE);
  if (fs.existsSync(shared)) {
    const text = fs.readFileSync(shared, "utf8");
    const code = [...text.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => codeOnly(m[1])).join("\n");
    for (const match of code.matchAll(NOT_NULL_SYMBOL_CLASSIFY)) {
      notNullSymbolHits += 1;
      if (notNullSymbolHits <= 3) {
        violations.push({
          file: SHARED_FILE,
          why:
            `「这一格是不是非空断言那个 \`!\`」又现场连写了：\`${match[0]}\`——那一格的事实住在` +
            "被问的那一页（`SymbolToken.IsNotNullSymbol`，读时现算），投影只读属性",
        });
      }
    }
  }
}

/**
 * **「这一格是不是一条成员访问链 / 一次非空断言」也不许在投影层比类名**（第 1091 轮）。
 *
 * 第 1090 轮收的是「符号的正文是不是那个 `!`」（那一页读 `TextValue`）；这一条收的是**同一句
 * 判据的另一种收件人**：投影层折链、折调用与断言位那几族里，一共 **14 处**连写
 * `X.Tag === "PropertyAccess"`、**19 处**连写 `X.Tag === "NotNull"`——问的都是「**你这一格
 * 是什么类**」，而那两个名字**就是那两页自己的类名**（`tokens/property-access.xl.md` /
 * `tokens/not-null.xl.md`）。按第 1041 / 1042 / 1057 / 1062 / 1075 / 1088 轮那条判据：
 * 常量在构造时赋（两页各写一句 `## field IsPropertyAccess:bool = true` / `IsNotNull:bool = true`），
 * 投影只读属性（`unit.IsPropertyAccess` / `unit.IsNotNull`），33 处一起改完。
 *
 * **两问与既有那两格不是同一问**（名字都不共用，所以这里守的是新名字）：
 * `IsChainBaseNode` 答的是「手上这一格的**形状**够不够当一整条链的基名」（八页答 `true`，
 * 不认 `Bracket` / `NotNull` / `RegexToken`）；`IsNotNullSymbol` 答的是「**符号**的正文是不是
 * 那个 `!`」。这一条守的是「**你这一格是不是那一类单元**」——就是类名本身。
 *
 * 口径：只看 `SHARED_FILE` 的**代码块**、注释不算（`codeOnly`），恰好 0 处才对；
 * 两页的 `<Tag>` 只许以属性读的形态出现。
 *
 * **第 1092 轮把 `Method` 与 `GenericType` 也收进这一条**（同一句话、同一形态）：
 * 投影层折链、折调用、投类型那几族里 25 处连写 `X.Tag === "Method"`、23 处连读
 * `X.Tag === / !== "GenericType"`——两个名字同样是那两页自己的类名，所以在
 * `typescript/tokens/method.xl.md` / `typescript/tokens/generic-type.xl.md` 各立一格
 * （`IsMethodNode` / `IsGenericType`，构造时赋 `true`），48 处改属性读。
 * 这一条因此守四个 `<Tag>`：谁把它们写回成现场算式，这一门当场红。
 *
 * **第 1094 轮把字符串那一族也收进这一条**（用户口径 1.1~1.4：token 子类**构造完**信息就得齐；
 * 要读的那一格由**具体页显式声明**、构造时/`Close` 时赋好）：投影层 **16 处**现场写
 * `X.Tag === "String"` / `X.Tag === "ConstString"`（含 `X.stringChar === "`"` 的模板串连写与
 * `String || ConstString` 的两连比类名），而那两个名字**就是那两页自己的类名**——今天在
 * `tokens/string/string.xl.md` / `const-string.xl.md` 各立一格并**构造时赋好**
 * （`IsStringUnit` / `IsStringLiteralUnit` / `IsTemplateString`），16 处改属性读。
 * 这一条因此守六个 `<Tag>`。
 *
 * **第 1095 轮再把括号 / 数组字面量 / 类型参数三族收进这一条**（同一句话、同一形态）：
 * 投影层 **22 处**现场写 `X.Tag === "Bracket"` / `"ArrayLiteral"` / `"TypeParameter"`
 * （含 `Tag === "Bracket" && startBracket === "("` 与两态的
 * `Tag === "Bracket" && (startBracket === "[" || startBracket === "{")`），
 * 三个名字同样是那三页自己的类名，所以各立一格（`IsBracketUnit` / `IsArrayLiteralUnit` /
 * `IsTypeParameterUnit`，构造时赋 `true`），22 处改属性读——其中两态那三处改成读同页已有的
 * `IsIndexBracket` / `IsBraceBracket`（同一格事实的两种写法）。这一条因此守十一个 `<Tag>`。
 *
 * **第 1096 轮再收「名字 / 声明头」那一族**（同一句话、同一形态）：投影层 **26 处**现场写
 * `X.Tag === "Keyword"` / `"Identifier"` / `"Let"` / `"ObjectLiteral"` / `"Decorator"` /
 * `"As"` / `"Satisfies"` / `"Spread"`（再加 5 处 `!==` 的否定式），八个名字同样是那八页自己的
 * 类名，所以各立一格（`IsKeywordUnit` / `IsIdentifierUnit` / `IsLetUnit` /
 * `IsObjectLiteralUnit` / `IsDecoratorUnit` / `IsAsUnit` / `IsSatisfiesUnit` / `IsSpreadUnit`，
 * 构造时赋 `true`），31 处改属性读（否定式一律写成 `!x.IsXxxUnit`——对手上不是 token 的那几格
 * 与 `Tag !== "…"` 逐格同答）。这一条因此守十九个 `<Tag>`。
 *
 * 同一轮还改平了 `head.Tag !== "Identifier" && head.Tag !== "Keyword"` 那一处——它问的是
 * 「这一格**不是**一个名字」，所以读的是 `!head.IsNameNode`（第 1057 / 1076 轮那一族的否定式）；
 * `NAME_CLASS_DISJUNCTION` 因此也补上这一形态（见那一条）。
 *
 * **第 1097 轮再收「只可能做值」那一族**（同一句话、同一形态）：投影层 **11 处**现场写
 * `X.Tag === "Function"` / `"Class"` / `"Lamda"`（补 `FunctionExpression` / `ClassExpression`
 * 那两格、泛型箭头那两族、折链那一族「链头只可能做值」那一档），三个名字同样是那三页自己的
 * 类名，所以共立一格（`IsValueOnlyUnit`，三页各自显式声明、构造时赋 `true`），11 处改属性读
 * ——其中两处「是函数还是类」由 `v.AstKind` 分辨（`FunctionDeclaration` / `ClassDeclaration`），
 * 否定式写成 `!x.IsValueOnlyUnit`。这一条因此守二十二个 `<Tag>`。
 *
 * **第 1098 轮再收「类型位那一族」**（同一句话、同一形态）：投影层 **16 处**现场写
 * `X.Tag === "TypeDefine"` / `"ArrayType"` / `"IndexedAccessType"` / `"TypeOperator"` /
 * `"TypeQuery"` / `"TypePredicate"` / `"UnionType"` / `"IntersectionType"` / `"FunctionType"` /
 * `"ImportType"` / `"LiteralType"` / `"Parameter"`（`projectTypeExpression` 那一族里成片都是），
 * 十二个名字同样是那十二页自己的类名，所以**每一页都立一格** `IsTypeUnit`（十二页各自显式声明、
 * 构造时赋 `true`，16 处的**族那一问**读它），另外十页各立一格自己的名字
 * （`IsTypeDefine` / `IsArrayType` / `IsIndexedAccessType` / `IsFunctionType` / `IsParameterUnit` /
 * `IsTypeOperator` / `IsTypeQuery` / `IsTypePredicate` / `IsUnionType` / `IsIntersectionType`——
 * 那几处要在**一整串类型单元里挑出某一个**，读族那一问会把邻近的另一族成员一起收进来；
 * 第 1098 轮实测：`typeof a.b` 那一处读族那一问会让 `A.B[] & C` 缺 4 片对拍），
 * `ArrayType` / `IndexedAccessType` 两页另各答一格 `IsTypeSuffixUnit`
 * （「基名后面挂着的那种尾缀」——`IsStringLiteralUnit` 同格局：两页答同一问），
 * `TypeQuery` / `ImportType` 两页另各答一格 `IsTypeWithTypeArguments`（同格局）。
 * 这一条因此守三十七个 `<Tag>`。
 *
 * **第 1099 轮把剩下那九处收尾**（同一句话、同一形态）：投影层 **9 处**现场写
 * `X.Tag === "MethodDeclaration"` / `"UnaryOperator"` / `"BindingElement"` / `"Statement"` /
 * `"SwitchCase"` / `"SwitchStatement"` / `"Export"` / `"Label"`——八个名字同样是那八页自己的
 * 类名，所以各立一格（`IsMethodDeclaration` / `IsUnaryOperator` / `IsBindingElement` /
 * `IsStatementShell` / `IsSwitchCaseUnit` / `IsSwitchStatementUnit` / `IsExportUnit` /
 * `IsLabelUnit`，各页显式声明、构造时赋 `true`），9 处改属性读。这一条因此守四十五个 `<Tag>`。
 *
 * **第 1115 轮把名单外剩下的那一族也收干净了**：第 1099 轮如实记下的两族——
 * 「这一格是不是一条注释」（`k.Tag === "LineAnnotation" || k.Tag === "AreaAnnotation"`，
 * `astNode` 里跳前导注释那一支还剩一处，而 `IsCommentUnit` 第 1084 轮就立好了）与
 * 「这一格是不是**二元**那一页的单元」（单比 `BinaryOperator` 的九处，含先取局部变量 `kind`
 * 再比的两处）——本轮各归各页：注释那一处改读 `k.IsCommentUnit`（同一个属性，
 * `IsCommentUnit` 因此**一个现场写法都不剩**），二元那九处改读 `BinaryOperator` 那一页
 * 新立的 `IsBinaryOperatorUnit`。这一条因此把 `"BinaryOperator"` / `"LineAnnotation"` /
 * `"AreaAnnotation"` 三个 `<Tag>` 也收了进来——**名单只增不减**：谁把它们写回成现场算式，
 * 这一门当场红。
 */
const SELF_TAG_CLASSIFY = [
  /\.Tag\s*[!=]==?\s*"PropertyAccess"/g,
  /\.Tag\s*[!=]==?\s*"NotNull"/g,
  /\.Tag\s*[!=]==?\s*"Method"/g,
  /\.Tag\s*[!=]==?\s*"GenericType"/g,
  /\.Tag\s*[!=]==?\s*"SymbolToken"/g,
  /\.Tag\s*[!=]==?\s*"NullConditionalOperator"/g,
  /\.Tag\s*[!=]==?\s*"String"/g,
  /\.Tag\s*[!=]==?\s*"ConstString"/g,
  /\.Tag\s*[!=]==?\s*"Bracket"/g,
  /\.Tag\s*[!=]==?\s*"ArrayLiteral"/g,
  /\.Tag\s*[!=]==?\s*"TypeParameter"/g,
  /\.Tag\s*[!=]==?\s*"Keyword"/g,
  /\.Tag\s*[!=]==?\s*"Identifier"/g,
  /\.Tag\s*[!=]==?\s*"Let"/g,
  /\.Tag\s*[!=]==?\s*"ObjectLiteral"/g,
  /\.Tag\s*[!=]==?\s*"Decorator"/g,
  /\.Tag\s*[!=]==?\s*"As"/g,
  /\.Tag\s*[!=]==?\s*"Satisfies"/g,
  /\.Tag\s*[!=]==?\s*"Spread"/g,
  /\.Tag\s*[!=]==?\s*"Function"/g,
  /\.Tag\s*[!=]==?\s*"Class"/g,
  /\.Tag\s*[!=]==?\s*"Lamda"/g,
  /\.Tag\s*[!=]==?\s*"TypeDefine"/g,
  /\.Tag\s*[!=]==?\s*"ArrayType"/g,
  /\.Tag\s*[!=]==?\s*"IndexedAccessType"/g,
  /\.Tag\s*[!=]==?\s*"TypeOperator"/g,
  /\.Tag\s*[!=]==?\s*"TypeQuery"/g,
  /\.Tag\s*[!=]==?\s*"TypePredicate"/g,
  /\.Tag\s*[!=]==?\s*"UnionType"/g,
  /\.Tag\s*[!=]==?\s*"IntersectionType"/g,
  /\.Tag\s*[!=]==?\s*"FunctionType"/g,
  /\.Tag\s*[!=]==?\s*"ImportType"/g,
  /\.Tag\s*[!=]==?\s*"LiteralType"/g,
  /\.Tag\s*[!=]==?\s*"Parameter"/g,
  /\.Tag\s*[!=]==?\s*"MethodDeclaration"/g,
  /\.Tag\s*[!=]==?\s*"UnaryOperator"/g,
  /\.Tag\s*[!=]==?\s*"BindingElement"/g,
  /\.Tag\s*[!=]==?\s*"Statement"/g,
  /\.Tag\s*[!=]==?\s*"SwitchCase"/g,
  /\.Tag\s*[!=]==?\s*"SwitchStatement"/g,
  /\.Tag\s*[!=]==?\s*"Export"/g,
  /\.Tag\s*[!=]==?\s*"Label"/g,
  // **第 1115 轮补的三个 `<Tag>`**：「这一格是不是一条注释」（`IsCommentUnit`）与
  // 「这一格是不是 `BinaryOperator` 那一页的单元」（`IsBinaryOperatorUnit`）——
  // 两族过去都在这一条**名单之外**，本轮收进被问的那几页。
  /\.Tag\s*[!=]==?\s*"BinaryOperator"/g,
  /\.Tag\s*[!=]==?\s*"LineAnnotation"/g,
  /\.Tag\s*[!=]==?\s*"AreaAnnotation"/g,
  // **第 1116 轮补的两个 `<Tag>`**：「这一格是不是 `ExpressionWithTypeArguments` / `TypeAssign`
  // 那一页的单元」——两处过去都藏在**先取局部变量再比**那一形态里（见下面
  // `TAG_LOCAL_VAR_COMPARE`），本轮连那个形态一起收干净。
  /\.Tag\s*[!=]==?\s*"ExpressionWithTypeArguments"/g,
  /\.Tag\s*[!=]==?\s*"TypeAssign"/g,
];
/** 投影层拿类名当「是不是 `PropertyAccess` / `NotNull` 那一格」判的处数（0 处才是对的）。 */
let selfTagClassifyHits = 0;
{
  const shared = path.join(root, SHARED_FILE);
  if (fs.existsSync(shared)) {
    const text = fs.readFileSync(shared, "utf8");
    const code = [...text.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => codeOnly(m[1])).join("\n");
    for (const re of SELF_TAG_CLASSIFY) {
      for (const match of code.matchAll(re)) {
        selfTagClassifyHits += 1;
        if (selfTagClassifyHits <= 3) {
          violations.push({
            file: SHARED_FILE,
            why:
              `「这一格是不是 \`PropertyAccess\` / \`NotNull\` / \`Method\` / \`GenericType\` / \`SymbolToken\` / \`NullConditionalOperator\` / \`String\` / \`ConstString\` / \`Bracket\` / \`ArrayLiteral\` / \`TypeParameter\` / \`Keyword\` / \`Identifier\` / \`Let\` / \`ObjectLiteral\` / \`Decorator\` / \`As\` / \`Satisfies\` / \`Spread\` / \`Function\` / \`Class\` / \`Lamda\` / \`TypeDefine\` / \`ArrayType\` / \`IndexedAccessType\` / \`TypeOperator\` / \`TypeQuery\` / \`TypePredicate\` / \`UnionType\` / \`IntersectionType\` / \`FunctionType\` / \`ImportType\` / \`LiteralType\` / \`Parameter\` / \`MethodDeclaration\` / \`UnaryOperator\` / \`BindingElement\` / \`Statement\` / \`SwitchCase\` / \`SwitchStatement\` / \`Export\` / \`Label\` 那一类」又比类名了：\`${match[0]}\`——` +
              "那一格的事实住在被问的那一页（`Token.IsPropertyAccess` / `Token.IsNotNull` / `Token.IsMethodNode` / `Token.IsGenericType` / `Token.IsSymbolToken` / `Token.IsNullConditionalOperator` / `Token.IsStringUnit` / `Token.IsStringLiteralUnit` / `Token.IsBracketUnit` / `Token.IsArrayLiteralUnit` / `Token.IsTypeParameterUnit` / `Token.IsKeywordUnit` / `Token.IsIdentifierUnit` / `Token.IsLetUnit` / `Token.IsObjectLiteralUnit` / `Token.IsDecoratorUnit` / `Token.IsAsUnit` / `Token.IsSatisfiesUnit` / `Token.IsSpreadUnit` / `Token.IsValueOnlyUnit` / `Token.IsTypeUnit` / `Token.IsTypeSuffixUnit` / `Token.IsTypeDefine` / `Token.IsArrayType` / `Token.IsIndexedAccessType` / `Token.IsTypeOperator` / `Token.IsTypeQuery` / `Token.IsImportType` / `Token.IsTypePredicate` / `Token.IsUnionType` / `Token.IsIntersectionType` / `Token.IsFunctionType` / `Token.IsParameterUnit` / `Token.IsTypeWithTypeArguments` / `Token.IsMethodDeclaration` / `Token.IsUnaryOperator` / `Token.IsBindingElement` / `Token.IsStatementShell` / `Token.IsSwitchCaseUnit` / `Token.IsSwitchStatementUnit` / `Token.IsExportUnit` / `Token.IsLabelUnit`，构造时赋好），投影只读属性",
          });
        }
      }
    }
  }
}

/**
 * **同一句话的第三种写法：先把标签取进局部变量、再拿它比类名**（第 1116 轮）。
 *
 * `selfTagClassifyHits` 那一条抓的是**行内**形态（`X.Tag === "Label"`），
 * 而投影层还有一族写成这样：
 *
 *     const kind = one.Tag;
 *     if (kind === "Identifier" || kind === "PropertyAccess" || …) { … }
 *
 * ——正则看不见它（比的是局部变量，`Tag` 早就不在同一行里了），所以这一族一直躲着那几条门
 * （第 1116 轮逐个数出来是 **7 处 / 6 格局部变量**：`headType`（8 处比较）、`instHead`、
 * `headKind`、`tailKind`、`tagIsPostfixChain` 与 `IsChainTail` 里的 `kind`）。
 * 本轮把这 6 格连同它们比过的类名一起收进被问的那几页（新立
 * `Token.IsExpressionWithTypeArguments` / `Token.IsTypeAssignUnit`，其余读已有的属性），
 * 于是这一条今天恰好 0 处。
 *
 * **认法**：`const <名字> = <若干层属性/下标>.Tag;` 之后**同一批代码里**又出现
 * `<名字> === "…"` / `<名字> !== "…"`——`[\s\S]{0,240}?` 就是为了「先声明、隔几行再比」。
 * **不算的两种**：`const tag: any = node.Tag;`（带类型标注那一格要的是**字符串本身**，
 * 拿去当 `kind` 用，不拿来比类名）与 `ctx.unmapped.add(v.Tag)` / `mk(v.Tag, …)`
 * （原样透传，`Tag` 就是数据）。
 */
const TAG_LOCAL_VAR_COMPARE =
  /const\s+([A-Za-z_$][\w$]*)\s*=\s*[A-Za-z_$][\w$]*(?:\.\w+|\[\d+\])*\.Tag\s*;[\s\S]{0,240}?\b\1\s*[!=]==?\s*"/g;
/** 投影层「先取标签再比类名」的处数（0 处才是对的）。 */
let tagLocalVarHits = 0;
{
  const shared = path.join(root, SHARED_FILE);
  if (fs.existsSync(shared)) {
    const text = fs.readFileSync(shared, "utf8");
    const code = [...text.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => codeOnly(m[1])).join("\n");
    for (const match of code.matchAll(new RegExp(TAG_LOCAL_VAR_COMPARE, "g"))) {
      tagLocalVarHits += 1;
      if (tagLocalVarHits <= 3) {
        violations.push({
          file: SHARED_FILE,
          why:
            `「这一格是不是某一类」先把标签取进局部变量再比类名：\`${match[0].slice(0, 60)}\`——` +
            "那一格的事实住在被问的那一页（构造时赋好的那几格属性），投影只读属性",
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

console.log(`direct:lint —— ${files.length} 页规范，第三出口（PrintAst）${directSections} 段`);
console.log(`自己出这一格的页面 ${directPages.length} 页（同一个类里可能不止一段：一个类几种身份各答各的）`);
console.log(
  `按字符串键查：${stringKeyTotal} 处（例外 ${stringKeyLeft} 处：${[...STRING_KEY_ALLOWED.entries()]
    .map(([k, v]) => `${k} ${v}`)
    .join("、")}）`,
);
console.log(
  `名字那一格（${SHARED_FILE} 的代码块）：按字符串键读 ${nameKeyHits} 处（0 处才是对的，读法只走 tokenNameOf）`,
);
// **老名字那一条读数第 1143 轮撤掉了**（见上面 STALE_NAME 那一段的说明）：
// `PrintAst` 现在是这一格**唯一**的名字，不再是「过去的事」。
// **用户口径 1.5 的账**（第 1144 轮）：声明里的 `any` 是 0 处
// ——类型是「这一格能装什么」的声明，`any` 把这句话整个写没了，而它在运行期逐字节同答。
console.log(
  `## field / ## property 的类型里出现 any：${anyTypedDecls} 处（0 处才是对的：字段 / 属性的声明必须明确类型）`,
);
// **用户口径 1.4 的账**（第 1144 轮；**第 1169 轮扩到全仓 `PrintAst` 方法体**）：投影读到的
// 每一格 PascalCase 属性都要在某一页有声明——它守的是「下一处新读法」，起点已经是 0 处违反。
console.log(
  `投影读到的 PascalCase 属性 ${projectedPropNames} 个（扫 ${projectedBodyCount} 段 PrintAst 方法体 + ${SHARED_FILE} 的代码块；例外 6 个，都是方法：Translate.DecodeIdentifierEscapes / SymbolToken.KindOfText / owner.PrintAst / this.TempToString / Identifier.LeafKindOfText / Method.ArgumentGroups），其中没有声明的 ${undeclaredPropNames} 个（0 个才是对的：要在具体类里显式声明）`,
);
// **能力面的账**（第 1015 轮）：这一格的出口表就是它能做的事——出口少了，方法体判据守的东西
// 才是**结构上做不到**，而不是「大家记得别写」。
console.log(
  `ctx 出口 ${ctxExits} 个，其中回原文兜底 / 已无人用的 ${ctxBannedHits} 处（0 处才是对的：${CTX_BANNED.join(" / ")}）`,
);
// **「只读属性、不调方法」的账**（第 1046 轮）：投影读 token 的每一格都是属性，
// 这一条读数就是那句话的反面——多一处 `receiver.Method(` 就红。
console.log(
  `投影对 token 调方法（${SHARED_FILE} 的代码块）：${tokenMethodHits} 处（0 处才是对的，取数据只读属性；例外只有 ctx.* 与 PrintAst）`,
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
// **「已知是 string 的那一格」的账**（第 1153 轮）：`Token.DeclaredName` 声明就是 `string`
// ——投影再套一层 `String(…)` 是恒等映射，0 处才对（用户口径 1.5 / 1.6）。
console.log(
  `把声明成 string 的名字又拷一遍（${SHARED_FILE} 的代码块）：${nameCopyHits} 处（0 处才是对的，Token.DeclaredName 本身就是字符串）`,
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
// **同一句话的另一种写法**（第 1076 轮）：`Tag === "Identifier" || Tag === "Keyword"` 是
// 「我是不是一个名字」用类名写出来的样子——收成 `Token.IsNameNode` 之后这里恰好 0 处。
console.log(
  `「这一格是不是一个名字」又在投影层比类名（${SHARED_FILE} 的代码块）：${nameClassDisjunctionHits} 处（0 处才是对的，读 Token.IsNameNode）`,
);
// **同一形状的下一族**（第 1088 轮）：`Tag === "BinaryOperator" || Tag === "LogicalOperator"`
// 是「这一格是不是一个二元 / 逻辑运算单元」用类名写出来的样子——收成
// `Token.IsBinaryOperatorNode` 之后这里恰好 0 处（单比 `BinaryOperator` 的 5 处不算）。
console.log(
  `「这一格是不是一个二元 / 逻辑运算单元」又在投影层比类名（${SHARED_FILE} 的代码块）：${binaryClassDisjunctionHits} 处（0 处才是对的，读 Token.IsBinaryOperatorNode）`,
);
// **同一句话的匿名连写**（第 1089 轮）：`Tag === "Bracket" && X.startBracket === "("` 是
// 「这一格是哪一态括号」现场写出来的样子——收成三格属性（`IsParenBracket` / `IsBraceBracket` /
// `IsIndexBracket`）之后这里恰好 0 处（两态写法那三处不算）。
// **第 1137 轮加上第三条：连 `Tag` 那一半守卫都没有的裸字段读**（`X.startBracket === "("`）——
// 前两条都要求 `X.Tag === "Bracket"` 在前面，于是那种写法从这一门漏过去过（本页 27 处里漏了 1 处：
// `projectExpression` 末尾那一支的 `IsBracketUnit && …startBracket === "("`，已改读 `IsParenBracket`）。
console.log(
  `「这一格是哪一态括号」又在投影层现场连写（${SHARED_FILE} 的代码块）：${bracketStateHits} 处（0 处才是对的，读 Bracket.IsParenBracket / IsBraceBracket / IsIndexBracket）`,
);
// **同一形态的下一族**（第 1090 轮）：`Tag === "SymbolToken" && TextValue === "!"` 是
// 「这一格是不是非空断言那个 `!`」现场写出来的样子——收成 `SymbolToken.IsNotNullSymbol`
// 之后这里恰好 0 处（泛型的 `isSymbol(k, text)` 那一形态不算）。
console.log(
  `「这一格是不是非空断言那个 \`!\`」又在投影层现场连写（${SHARED_FILE} 的代码块）：${notNullSymbolHits} 处（0 处才是对的，读 SymbolToken.IsNotNullSymbol）`,
);
console.log(
  `「这一格是不是一条成员访问链 / 一次非空断言 / 一次方法调用 / 一段泛型括号段 / 一个符号块 / 一个空条件运算符单元 / 一个字符串单元 / 一段字符串字面量 / 一个括号单元 / 一个数组字面量单元 / 一个类型参数单元 / 一个关键字单元 / 一个标识符单元 / 一条 let 声明单元 / 一个对象字面量单元 / 一个装饰器单元 / 一个 as 单元 / 一个 satisfies 单元 / 一个展开单元 / 一个只可能做值的单元 / 一个类型位单元 / 一个类型尾缀单元 / 一格 TypeDefine / 一格 ArrayType / 一格 IndexedAccessType / 一格 TypeOperator / 一格 TypeQuery / 一格 ImportType / 一格 TypePredicate / 一格 UnionType / 一格 IntersectionType / 一格 FunctionType / 一格 Parameter / 一格 MethodDeclaration / 一格 UnaryOperator / 一格 BindingElement / 一格 Statement / 一格 SwitchCase / 一格 SwitchStatement / 一格 Export / 一格 Label」又在投影层比类名（${SHARED_FILE} 的代码块）：${selfTagClassifyHits} 处（0 处才是对的，读 Token.IsPropertyAccess / Token.IsNotNull / Token.IsMethodNode / Token.IsGenericType / Token.IsSymbolToken / Token.IsNullConditionalOperator / Token.IsStringUnit / Token.IsStringLiteralUnit / Token.IsBracketUnit / Token.IsArrayLiteralUnit / Token.IsTypeParameterUnit / Token.IsKeywordUnit / Token.IsIdentifierUnit / Token.IsLetUnit / Token.IsObjectLiteralUnit / Token.IsDecoratorUnit / Token.IsAsUnit / Token.IsSatisfiesUnit / Token.IsSpreadUnit / Token.IsValueOnlyUnit / Token.IsTypeUnit / Token.IsTypeSuffixUnit / Token.IsTypeDefine / Token.IsArrayType / Token.IsIndexedAccessType / Token.IsTypeOperator / Token.IsTypeQuery / Token.IsImportType / Token.IsTypePredicate / Token.IsUnionType / Token.IsIntersectionType / Token.IsFunctionType / Token.IsParameterUnit / Token.IsTypeWithTypeArguments / Token.IsMethodDeclaration / Token.IsUnaryOperator / Token.IsBindingElement / Token.IsStatementShell / Token.IsSwitchCaseUnit / Token.IsSwitchStatementUnit / Token.IsExportUnit / Token.IsLabelUnit）`,
);
// **同一句话的第三种写法**（第 1116 轮）：先把 `X.Tag` 取进局部变量、再拿它比类名——
// 那种写法让上面那几条按行匹配的正则全都看不见它（第 1116 轮收掉 7 处 / 6 格局部变量）。
console.log(
  `「这一格是不是某一类」先取标签进局部变量再比类名（${SHARED_FILE} 的代码块）：${tagLocalVarHits} 处（0 处才是对的，读被问那一页的属性）`,
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
// **「含 trivia 的完整子单元表」的账**（第 1161 轮）：`Token.AllKids` 那一格整格删掉之后，
// 「一张现拼的全表」不许再长回 token 页上——要它的读者就地扫各段与 `children`。
console.log(
  `「含 trivia 的完整子单元表」又长回 token 页上（AllKids）：${allKidsHits} 处（0 处才是对的，读者就地扫各段与 children）`,
);
// **「替某一页读坐标」那一族**（第 1168 轮）：`ctx.StartOf` / `ctx.EndOf` 是恒等调用，
// 出口删掉之后，全仓代码块里 `x.start` / `x.end` 不许再写回成它们。
console.log(
  `「替某一页读坐标」（ctx.StartOf / ctx.EndOf）：${coordExitHits} 处（0 处才是对的，取坐标读它自己的 x.start / x.end）`,
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
  `第三出口的约定 0 条违反（不回原文查、不按字符串键查、ctx 出口表里没有兜底出口、投影对 token 只读属性不调方法、这一格的正文自己答、按坐标切正文也走这一格自己、helper 的形参表就是它需要什么、这一格是不是某一类由被问的那一页答、这一格是不是一个名字由被问的那一页答、这一格是不是一个二元 / 逻辑运算单元由被问的那一页答、这一格是哪一态括号由被问的那一页答、这一格是不是那个感叹号由被问的那一页答、这一格是不是一条成员访问链由被问的那一页答、这一格是不是一次非空断言由被问的那一页答、这一格是不是一次方法调用由被问的那一页答、这一格是不是一段泛型括号段由被问的那一页答、这一格有哪些段由被问的那一页答、这一格哪些子单元进投影由被问的那一页答、含 trivia 的完整子单元表不回到 token 页上、成对符号的位置由 token 自己记、字符串的正文由 token 自己答、声明里没有 any、投影读的每一格都在某一页显式声明过、已知是 string 的名字不再拷一遍）`,
);
process.exit(0);
