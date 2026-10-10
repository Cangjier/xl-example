// 第三个出口（`Token.PrintDirectAst`）的专属尺子（第 992 轮起，第 1013 / 1017 轮改口径）。
//
//   node tests/parse/direct-ast.mjs            # 全语料（用例 + samples）
//   node tests/parse/direct-ast.mjs --all      # 再加上 node_modules / dist/ts（搬页时跑一遍）
//   node tests/parse/direct-ast.mjs --limit 50 # 只跑前 50 份（调这一格的时候用）
//
// ## 为什么要有这一把
//
// `core/syntax/token.xl.md` 给第三个出口只留了一条路（第 1013 轮）：
// **`PrintDirectAst` 就是这一格的唯一写法**，`PrintAst` 与它那条派发分支已经删掉。
// 于是这一门量的是这一趟本身**成不成立**：全语料投一遍**不许抛异常**，
// 并且一份**固定样本**必须逐格投出形状（见下面判据②）。
//
// **第 1013 轮之前**这一门比的是「直出版与 `PrintAst` 同答」（直出通道开 / 关两遍对拍）；
// 那一对拍在两份写法**逐字节同答**这件事上跑了三千多份语料、一次没红过——
// 正因为同答是既成事实，用户口径才要求**删掉冗余的那一份**。
//
// ## 判据（两项）
//
//   ① **不抛异常**：解析或投影抛了就是红（`corpus("cases")` 已经滤掉 `tsInvalid` / `known-gap`）；
//   ② **固定样本的形状逐格点名**（第 1014 轮加）：`const a = b(c);` 这一句必须投出
//      `SourceFile` / `VariableStatement` / `VariableDeclarationList` / `VariableDeclaration` /
//      `Identifier` / `CallExpression` 六格，且每个节点都带 `pos` / `end`。
//      **为什么这一项才是那一项**：① 是**消极**的判据——一头什么都不出的投影也满足它。
//      这一项是**绝对**的：无论语料怎么变，这一份固定的输入必须出这六格。
//      **它不替代 `cases:tsast`**（那才是逐节点对 TS 原生 AST 比的尺子）：它钉的是
//      「这一趟有没有出形状」这一条地板，报错时能指名道姓说缺哪一格。
//
// **第 1017 轮撤掉的「重投一致」**：它在第 1013 轮随上面那条对拍一起进来，写的是
// 「同一份输入投两遍必须逐字节相同，记账也要相同」。撤它的理由是**它不可能失败**：
// 两遍都在同一个进程里、问的都是同一份 `Root.ToList()`，中间没有任何随机源，
// 确定性代码两遍必然逐字节相同。这一门自己的注释早就写着「一头恒返回 `undefined`
// 的投影也满足它」——**能按住那种投影的只有固定样本那一项**。留着它只会让下一个人以为
// 「同一份输入不许投出两个答案」这件事有判据看着。
//
// **退出码**：两项全 0 才是 0。**「token 自己出的比例」不进退出码**——它是
// 「这一格自己出不出」的读数（`direct / count`），不是缺陷；读数照样印出来，README 的台账抄它。
//
// ## 第 1009 / 1010 轮量出来的两件事（分母与「通用支」）
//
// **第一件：比例的分母是「问到的次数」，不是「产物里的节点数」**：`projectNode` 里那一问有三种去向——
// 答一个节点（`ctx.direct++`）、答 `ctx.Nothing`（**故意不出节点**）、答 `undefined`（走通用支）。
// 用例语料 1640 份实测 **16557 / 5291 / 26，合计 21874**（就是印出来的 `count`）。
// 那 5291 次是 `projectExpression` 这类调用点「先问一遍再自己摊平」问出来的，**不是缺口**；
// 真正的缺口是 26 次（**0.12%**）：`IfSet` 13（字段没记过时**写下来的让开**）、
// `Bracket` 13（`(` / `[` 是分组，要先把父 kind / 段名递进来才谈得上自己出）。
// ⇒ **拿这个百分比当判据会逼人去写没有出口的写法**（第 1009 轮）。
//
// **第二件：通用支**在这一趟**一次都没有真的出过节点**：这一项在实测里是 **0**（`--all` 2051 份也是 0）——
// 覆盖不到的那些格，走的都是这一格自己的覆写或「问完就丢」，没有一格透传。
// 同一轮数出来：运行期见到的 **117 个 token 类里 74 个覆写了 `PrintDirectAst`**，
// 另外 **43 个一次都没被问到过**（`IfSegment` / `NewType` / `ClassBody` / `SwitchCase` …）——
// 它们的节点由父单元直接摊平或丢弃，所以**不需要**自己出。
// ⇒ 判断「还差什么」，看的是**被问到的那 74 个类里谁答不出**，不是数源码上有几页。
//
// ## 语料口径
//
// **用例 + `samples`** 是这一门的默认口径（`--all` 会再加上 `node_modules` / `dist/ts`），
// 理由是墙钟：全语料（`node_modules` + `dist/ts`）单进程要 ~37s，而这一门量的是
// 「这一格自己出不出形状」——形状种子一一对应，用例那一份就够。
//（这条口径当年借的是 `cases:shapes` 的结论「用例侧是外部语料形状签名的**超集**」；
// 那一门与 `cases:tags` 一起在第 1017 轮删了，所以那句结论今天**没有门再复核**，
// 它只是一条当时量过的读数。）
// **搬页那一轮要额外跑一次 `--all`**：真实语料里的排法比用例杂（这一轮就是靠它兜住的）。
// `corpus("cases")` 是**同一个函数**（`ts-ast.mjs` 导出），`tsInvalid` / `.tsx` / `known-gap`
// 的跳过条件只有那一处。

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { corpus } from "./ts-ast.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));
const { projectRoot } = require(path.join(root, "build", "ts", "typescript", "print-ast-common.js"));

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback) => {
  const at = args.indexOf(name);
  return at >= 0 && at + 1 < args.length ? args[at + 1] : fallback;
};
const TOP = Math.max(1, Number(value("--top", "8")));
const LIMIT = Number(value("--limit", "0")) || 0;

const files = flag("--all") ? corpus() : corpus("cases");
const run = LIMIT > 0 ? files.slice(0, LIMIT) : files;

let nodes = 0;
let direct = 0;
let parsed = 0;
const errors = [];

for (const file of run) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  let source;
  try {
    source = fs.readFileSync(file, "utf8");
  } catch (error) {
    errors.push({ file: rel, why: `读不到：${error.message}` });
    continue;
  }
  try {
    const context = new TextContext(new Template());
    context.Process(new TextDocument(source));
    parsed++;
    // **一趟**（第 1017 轮起）：第三个出口只剩 `PrintDirectAst` 一条路，
    // 这里量的是这一趟**能不能投出来**——出多少节点、由 token 自己出了多少个；
    // 形状对不对由下面那条**固定样本**点名（重投一致那一项第 1017 轮撤了，理由见文件头）。
    const projected = projectRoot(context.Root.ToList(), source);
    nodes += projected.count;
    direct += projected.direct;
  } catch (error) {
    errors.push({ file: rel, why: String(error && error.message ? error.message : error) });
  }
}

const share = nodes === 0 ? 0 : (direct / nodes) * 100;

/**
 * **这一趟真的出了形状吗**（第 1014 轮加的第三项）。
 *
 * **为什么「重投一致」不够** ✗：那是「同一份输入投两遍、逐字节相同」——一头**恒返回
 * `undefined`** 的投影也满足它（两遍都空、逐字节相同）。真正会把这一条按住的是
 * `cases:tsast`（逐个节点对 TS 原生 AST 比），可它的**报错方式**是「缺 N / 漂 N」那种
 * 事后统计：等它响的时候，已经分不清是哪一格坏的。
 *
 * 所以这里钉一个**最小、固定、不看语料**的输入，逐格点名断言：`const a = b(c);` 这一句
 * 必须投出 `VariableStatement > VariableDeclarationList > VariableDeclaration > Identifier(a)`
 * 与 `CallExpression(callee=Identifier(b), arguments=[Identifier(c)])`。
 * 这七格各自来自一个具体 token 页（`Let` / `Statement` / `Identifier` / `Method`），
 * 任何一格答不出都会在这里**点名**，而不是等到 `cases:tsast` 报一个总数。
 */
const SPECIMEN = "const a = b(c);";
const REQUIRED_KINDS = [
  "SourceFile",
  "VariableStatement",
  "VariableDeclarationList",
  "VariableDeclaration",
  "Identifier",
  "CallExpression",
];
const shapeProblems = [];
{
  try {
    const context = new TextContext(new Template());
    context.Process(new TextDocument(SPECIMEN));
    const projected = projectRoot(context.Root.ToList(), SPECIMEN);
    // **坐标键也要点名**：`pos` / `end` 是三个出口共用的那一对（第三个出口**不用** `range`，
    // 那是产物树自己的闭区间键）——缺一个就说明造节点那一层被绕过去了
    // （`ctx.Node` / `ctx.NodeHead` 都写全了它们）。
    const walk = (node, out) => {
      if (node === null || typeof node !== "object") return out;
      if (Array.isArray(node)) {
        for (const item of node) walk(item, out);
        return out;
      }
      if (typeof node.kind === "string" && !("pos" in node)) out.push(`缺 pos：${node.kind}`);
      if (typeof node.kind === "string" && !("end" in node)) out.push(`缺 end：${node.kind}`);
      for (const key of Object.keys(node)) {
        if (key === "kind" || key === "pos" || key === "end") continue;
        walk(node[key], out);
      }
      return out;
    };
    const problems = walk(projected.ast, []);
    const seen = new Set();
    const collect = (node) => {
      if (node === null || typeof node !== "object") return;
      if (Array.isArray(node)) {
        for (const item of node) collect(item);
        return;
      }
      if (typeof node.kind === "string") seen.add(node.kind);
      for (const key of Object.keys(node)) {
        if (key === "kind" || key === "pos" || key === "end") continue;
        collect(node[key]);
      }
    };
    collect(projected.ast);
    for (const kind of REQUIRED_KINDS) {
      if (!seen.has(kind)) problems.push(`这一格没投出来：${kind}`);
    }
    if (projected.count <= 0) problems.push(`一个节点都没问过（count=${projected.count}）`);
    shapeProblems.push(...problems);
  } catch (error) {
    shapeProblems.push(`固定样本抛异常：${String(error && error.message ? error.message : error)}`);
  }
}
if (shapeProblems.length > 0) {
  console.log(
    `\nFAIL  固定样本 \`${SPECIMEN}\` 的形状不对（${shapeProblems.length} 条，第 1014 轮加的这一项）：`,
  );
  for (const one of shapeProblems.slice(0, 10)) console.log(`      ${one}`);
}

console.log(
  `cases:direct —— 语料 ${run.length} 份（解析 ${parsed}）、投影 ${nodes} 个节点，` +
    `其中 token 自己出的 ${direct} 个（${share.toFixed(1)}%）`,
);
console.log(`抛异常 ${errors.length} 处（全语料投一遍：解析或投影抛了就是红）`);
console.log(
  `自己出的比例的分母是「问到的次数」，里面混着答 \`ctx.Nothing\`（故意不出节点）的那些——` +
    `所以它**不进退出码**；进退出码的是抛异常与固定样本。`,
);

if (flag("--verbose") || errors.length > 0) {
  for (const one of errors.slice(0, TOP)) console.log(`FAIL  ${one.file}  ${one.why}`);
  if (errors.length > TOP) console.log(`（另有 ${errors.length - TOP} 处异常）`);
}

if (errors.length > 0 || shapeProblems.length > 0) process.exit(1);
console.log(`第三个出口只有一条路，全语料不抛异常（${run.length} 份）；固定样本的形状逐格点名通过`);
process.exit(0);
