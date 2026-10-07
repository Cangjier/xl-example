// token 层**机制**的判据：`PendingSources`（位置缓冲）与 `PendingUnit`（暂存单元 + 外部终止委托）。
//
//   node tests/parse/mechanism.mjs
//
// **它为什么与别的尺子不重合** ✗：`cases:tsast` 量的是「这棵树投出来的形状对不对」✓，
// 覆盖度量的是「这份 .ts 跑起来对不对」✓——两者都是**产品行为**的读数 ✓。
// 而这两个机制**暂时还没有产品用户** ✗（第一个用户是接下来那个 `IfGuide` ✓），
// 所以它们的三条契约只能在这里当场问 ✓：
//
//   1. `PendingSources.GiveBackTo` **保持原始次序**（往队首插就得倒着插 ✓）——
//      写错了不报错，只会把一段源码的顺序倒过来 ✓，属于本仓最忌讳的静默错值 ✓；
//   2. `PendingUnit` 的 `EndInclusive` / `EndExclusive` 两档**收尾位置不同** ✓
//      （`;` 算进体里 ✓、`else` 不算 ✓），而两者都要留下一个**两头都签过的范围** ✗
//      （`TryToClose` 只认这个 ✓）；
//   3. `EndExclusive` 那一个字符**只被重新处理一次** ✓——插一条 `ReloadMessage` 却不
//      先把父单元的 `MountedUnit` 清掉，它就会被同一个暂存单元再接走一遍 ✓ ⇒ 原地打转 ✓。
//
// **全称只用库 API** ✓（`build/ts/**/*.js` ✓），不起子进程 ✓——所以它快到可以每步都跑 ✓。
//
// **它暂时没有进 `npm run gates` 的名单** ✗：那六道门里每一道开头都有一段
// 「规范 → dist → build 这条链没断」的硬检查 ✓（见 `tests/runtime/check.mjs` 开头 ✓），
// 这一段要原样搬过来才不算「在量上一版的产物」✓；那件事与「先把机制立起来」分开做 ✓，
// 免得一段抄来的守卫成了第二处会漂的答案 ✗。在那之前，**手动跑**它 ✓。
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const require = createRequire(import.meta.url);
const load = (rel) => require(path.join(root, "build", "ts", rel));

const { Template } = load("core/syntax/templates/template.js");
const { TextDocument } = load("typescript/text-document.js");
const { TextContext } = load("typescript/text-context.js");
const { PendingSources } = load("core/syntax/pending-sources.js");
const { PendingStates } = load("core/syntax/pending-states.js");
const { PendingUnit } = load("core/syntax/pending-unit.js");

let passed = 0;
let failed = 0;

function ok(condition, what) {
  if (condition) {
    passed += 1;
    console.log(`  ok    ${what}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${what}`);
  }
}

function eq(actual, expected, what) {
  const same = actual === expected;
  if (!same) {
    console.log(`        期望 ${JSON.stringify(expected)}、实测 ${JSON.stringify(actual)}`);
  }
  ok(same, what);
}

/** 一份文档 + 一个已经装配好的上下文（`TextContext` 构造器里会 `ParsePipeline.Install`）。 */
function scene(source) {
  const document = new TextDocument(source);
  const context = new TextContext(new Template());
  return { document, context, root: context.Root };
}

/**
 * 逐字符喂给根单元。
 *
 * **走 `ProcessSingle` 而不是 `context.Process(document)`** ✓：后者最后会给根签出、关根 ✓，
 * 而这一份要的是「喂到第 k 个字符为止」那种中途状态 ✓。
 */
function feed(context, document, count) {
  for (let i = 0; i < count; i++) {
    context.ProcessSingle(document.At(i));
  }
}

console.log("PendingSources —— 位置缓冲");

{
  const { document, context, root } = scene("abcdef");

  // 1. `Append` / `First` / `Last` / `Count`
  const pending = new PendingSources();
  eq(pending.Count, 0, "空缓冲的 Count 是 0");
  eq(pending.First, null, "空缓冲的 First 是 null");
  pending.Append(document.At(3));
  pending.Append(document.At(1));
  pending.Append(document.At(4));
  eq(pending.Count, 3, "攒三个之后 Count 是 3");
  eq(pending.First.Index, 3, "First 是**第一个**攒进来的位置（不是最后一个）");
  eq(pending.Last.Index, 4, "Last 是最后一个攒进来的位置");
  eq(pending.Data.map((s) => s.Index).join(","), "3,1,4", "Data 按攒进来的次序给");

  // 2. `GiveBackTo`：**倒着插队首**才排得回原序
  pending.GiveBackTo(context, root);
  eq(
    context.SourceQueue.map((entry) => entry.Source.Index).join(","),
    "3,1,4",
    "GiveBackTo 之后队首三格按**原序**排好（倒着插）",
  );
  eq(context.SourceQueue[0].ProcessOwner, root, "交还回来的处理者是调用方给的那一个");
  eq(pending.Count, 0, "GiveBackTo 自己清空");

  // 3. `CommitTo`
  const seen = [];
  const recorder = { Process: (_context, source) => seen.push(source.Index) };
  const second = new PendingSources();
  second.Append(document.At(5));
  second.Append(document.At(2));
  second.CommitTo(context, recorder);
  eq(seen.join(","), "5,2", "CommitTo 按原序喂给目标单元");
  eq(second.Count, 0, "CommitTo 自己清空");
}

console.log("PendingUnit —— 暂存单元");

// **终止判据归单元自己**（第 398 轮改口径）：基类不再接受「外部终止委托」，
// 所以判据也照**真实用法**写成子类——这一版与产品代码同一个形状。
class SemicolonUnit extends PendingUnit {
  constructor(template, state) {
    super(template);
    this.state = state;
  }

  IsEnd(_context, source) {
    return source.Value === ";" ? this.state : PendingStates.Continue;
  }
}

class ForeverUnit extends PendingUnit {
  IsEnd(_context, _source) {
    return PendingStates.Continue;
  }
}

{
  // `EndInclusive`：`;` **算进**体里
  const { document, context, root } = scene("abc;zzz");
  const pending = new SemicolonUnit(root.Template, PendingStates.EndInclusive);
  root.AddToMounted(pending);
  feed(context, document, 4);
  eq(pending.Closed, true, "EndInclusive：暂存单元已经关闭");
  eq(root.MountedUnit, null, "EndInclusive：父单元的 MountedUnit 被清掉了（Quit）");
  eq(pending.SourceRange.Start.Index, 0, "EndInclusive：起点是第一个字符");
  eq(pending.SourceRange.End.Index, 3, "EndInclusive：终点是那个 `;`（含地）");
  eq(pending.Data.length, 1, "EndInclusive：攒下来的子单元只有那个标识符");
  eq(pending.Data[0].constructor.name, "Identifier", "EndInclusive：子单元是 Identifier");
  eq(pending.Data[0].TempToString(), "abc", "EndInclusive：标识符的文本是 abc");
  // `;` 被当成终点吃掉了，没有再变成子单元
  eq(
    pending.Data.some((item) => item.constructor.name === "SymbolToken"),
    false,
    "EndInclusive：`;` 没有被造成子单元（它就是终点）",
  );
}

{
  // `EndExclusive`：`;` **不算**体的一部分，要交回去重新处理一次
  const { document, context, root } = scene("abc;zzz");
  const pending = new SemicolonUnit(root.Template, PendingStates.EndExclusive);
  root.AddToMounted(pending);
  feed(context, document, 4);
  eq(pending.Closed, true, "EndExclusive：暂存单元已经关闭");
  eq(root.MountedUnit, null, "EndExclusive：父单元的 MountedUnit 被清掉了（Quit）");
  eq(pending.SourceRange.Start.Index, 0, "EndExclusive：起点是第一个字符");
  eq(pending.SourceRange.End.Index, 2, "EndExclusive：终点是 `;` **前一个**字符");
  eq(pending.Data.length, 1, "EndExclusive：暂存单元里只有 abc");
  // **只被重新处理一次**：交回去的那个 `;` 落到根单元手里，正好变成一个 SymbolToken
  const symbols = root.Data.filter((item) => item.constructor.name === "SymbolToken");
  eq(symbols.length, 1, "EndExclusive：`;` 正好被重新处理了一次（没有自激）");
  eq(symbols[0].TempToString(), ";", "EndExclusive：交回去的正是那个 `;`");
  eq(pending.Parent, root, "EndExclusive：暂存单元仍然挂在父单元的 Data 里（摘除是调用方的事）");
}

{
  // `ReloadOwner`：交回的对象**可以不是父单元**——因为字符经 `MountedUnit` 送来、
  // 而 `Parent` 是树上那一格，两者可以不是同一个（第 398 轮新增的口径）。
  const { document, context, root } = scene("abc;zzz");
  const seen = [];
  const sink = {
    Process(_ctx, source) {
      seen.push(source.Value);
    },
  };
  const pending = new SemicolonUnit(root.Template, PendingStates.EndExclusive);
  pending.ReloadOwner = sink;
  root.AddToMounted(pending);
  feed(context, document, 4);
  eq(pending.Closed, true, "ReloadOwner：暂存单元已经关闭");
  eq(seen.join(""), ";", "ReloadOwner：交回的那个字符落到了指定的 owner 手里");
  eq(
    root.Data.some((item) => item.constructor.name === "SymbolToken"),
    false,
    "ReloadOwner：父单元没有再接一次（没有被处理两遍）",
  );
}

{
  // 空体 + `EndExclusive`：**一个字符都没吃过时不许不含地结束**
  const { document, context, root } = scene(";zzz");
  const pending = new SemicolonUnit(root.Template, PendingStates.EndExclusive);
  root.AddToMounted(pending);
  feed(context, document, 1);
  eq(pending.Closed, true, "空体：暂存单元已经关闭（没有抛 SourceRangeContainsNull）");
  eq(pending.SourceRange.Start.Index, 0, "空体：起点是那个 `;`");
  eq(pending.SourceRange.End.Index, 0, "空体：终点也退成那个 `;`（退回含地那一档）");
  eq(pending.Data.length, 0, "空体：一个子单元都没有");
}

{
  // 判定恒 `Continue`：一个字符都不吃地挂着
  const { document, context, root } = scene("abc");
  const pending = new ForeverUnit(root.Template);
  root.AddToMounted(pending);
  feed(context, document, 3);
  eq(pending.Closed, false, "恒 Continue：暂存单元一直没关");
  eq(root.MountedUnit, pending, "恒 Continue：父单元的 MountedUnit 还是它");
  eq(pending.SourceRange.Start.Index, 0, "恒 Continue：起点已经在第一个字符上钉住了");
}

{
  // **基类的 `IsEnd` 是抽象钩子**：直接问它就抛，
  // 不会悄悄「恒 Continue」——那会让一个忘了覆写的子类永远不收尾（静默错值）。
  // 这里**直接问**、不走 `feed`：`SyntaxContext.ProcessSingle` 会把异常收成消息（那是它的职责），
  // 而这条判据要问的正是「基类到底有没有兜底」。
  const { document, context, root } = scene("abc");
  const bare = new PendingUnit(root.Template);
  let raised = "";
  try {
    bare.IsEnd(context, document.At(0));
  } catch (error) {
    raised = error && error.message ? error.message : String(error);
  }
  eq(
    raised.includes("abstract member: IsEnd"),
    true,
    "基类 IsEnd 是抽象钩子：忘了覆写会当场抛，不会静默不收尾",
  );
}

console.log("");
console.log(`机制判据：${passed} 条通过、${failed} 条失败`);
process.exit(failed === 0 ? 0 : 1);
