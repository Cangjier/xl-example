# dependencies
```xl
import { BranchStates } from "../branch-states.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { SourceRange } from "../source-range.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "./template.xl.md"
import { AreaAnnotation } from "../basic-tokens/area-annotation.xl.md"
import { Bom } from "../basic-tokens/bom.xl.md"
import { Bracket } from "../basic-tokens/bracket.xl.md"
import { Common } from "../basic-tokens/common.xl.md"
import { LineAnnotation } from "../basic-tokens/line-annotation.xl.md"
import { RegexToken } from "../basic-tokens/regex-token.xl.md"
import { Shebang } from "../basic-tokens/shebang.xl.md"
import { StringGuide } from "../basic-tokens/string/string-guide.xl.md"
import { Symbol } from "../basic-tokens/symbol.xl.md"
import { WrapSymbol } from "../basic-tokens/wrap-symbol.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

basic token 的分派层：`Template.BasicBranchQueue()` 里那**一条**跳转函数。

**为什么是「一条」。** 十个 basic `Transit` 原本是队列里的十项，`UnitToken.Process` 在每个位置上逐条问过去；
一个字符平均要问 3.37 条才有人接手（profile：`docs/perf-profile-buffer.md`），每条都要重新读一次「当前字符」以外的东西
（尤其 `AreaAnnotation` / `LineAnnotation` / `RegexToken` 都会各自回看一次 `index - 1`，`SourceRange.Has` + `At` 是热路径最贵的一项）。
本类把「先问谁」这件**纯判定**搬到一处：先用最便宜的判据把十项里不可能接手的那几项筛掉，能用原判据证明「必然 `Undo` 且没有副作用」的才跳过，
其余原样转交给对应 `Transit`。判据与副作用仍只有那一份实现——这里从不复制它们的收尾/新开逻辑。

**跳过的合法性只有一条标准：跳过与不跳过必须可观测等价。** 一个 `Transit` 只有同时满足
① 它的接手判据被这里的筛法完整覆盖（筛过去 ⇒ 它一定 `Undo`）、② 它的 `Undo` 路径不写树，才允许跳过。
只满足①不满足②的（`WrapSymbol` / `Symbol` 会顺手收掉上一个未关闭的块），筛法要把那条副作用路径放进来；
两者都看不透的（`Common` 兜底要判转义标识符），一律保留原调用。

**转交时仍然遵守队列语义：`Undo` 要继续往下问。** 被转交的 `Transit` 仍可能返回 `Undo`（`Shebang` 的位置判据、
`RegexToken` 的起点判据、`Bracket` 的 `\u{…}` 让位、`Symbol` 的指数符号 / 转义让位、`WrapSymbol` 的空块收尾），
所以每一段都是「拿返回值 → 不是 `Undo` 就返回 → 是 `Undo` 就落到下一段」，与原来队列里继续问下一条完全一致。

**ASCII 分类表（性能层）。** run-batching 之后 `Transit` 的调用次数从 1,628,920 降到 470,903（8 份 d.ts），
但它每次仍要把 ①–⑦ 的判据按序问一遍，而这些判据对**同一个字符**每次都给出同一个答案、并且只依赖模板配置。
所以第一次调用时为该模板懒建一张 128 项 ASCII 位表（`Template.BasicClassTable`，见 `BuildClassTable`），
每次只 `charCodeAt(0)` + 查表一次；非 ASCII（`code >= 128`）整条回退 `Fallback` 的原 ①–⑧ 链——
BOM 默认就是非 ASCII、ts 的空白表也含 NBSP/U+0085 等，这两类不能靠 ASCII 表判。
表只决定「先问谁 / 谁能跳过」，**不改判定顺序**：③「前一个字符是 `/`」仍对每个字符跑，④⑤⑥⑦ 的相对次序与 ⑥/⑦ 的收尾副作用都原样保留。

# class BasicDispatch

basic token 的融合分派。

`Transit` 的签名与 `BranchTransiter` 一字不差，所以它可以直接放进 `Sequence<BranchTransiter>`；
队列里只有它一项，`UnitToken.Process` 的调度（`Reload` 压消息 / `Done` 统一 `+1` / 都不接手走 `Default`）完全不用改。

它不持有状态、不缓存模板：`unit.Template` 每次现取——模板是每个上下文一份的配置，缓存到静态字段上会让
「同一个类先后服务两个模板」的用法读到别人的配置。唯一的缓存是**挂在模板实例上**的分类表。

## private static field BitBom:int = 1

分类位：① 当前字符在 `Template.BomChars` 里。

## private static field BitMarker:int = 2

分类位：② 当前字符是 `Template.ShebangMarker` 的首字符。

## private static field BitQuote:int = 4

分类位：④ 当前字符在 `StringTemplate.Quotes` 里。

## private static field BitOpen:int = 8

分类位：⑤ 当前字符是 `(` / `{` / `[` 之一。

## private static field BitWs:int = 16

分类位：⑥ `SymbolTemplate.IsWhiteSpace` 为真。

## private static field BitSym:int = 32

分类位：⑦ `SymbolTemplate.IsSymbol` 为真。

## private static field BitPlain:int = 64

分类位：⑧ 标识符 / 数字 / 下划线的正文（`IsPlainCode`）。

## private static field BitClasses:int = 60

④⑤⑥⑦ 四位的并（4 | 8 | 16 | 32）：为 0 时说明这些段对当前字符全部不接手，
只剩 ⑥/⑦ 的「收掉上一个未闭合块」副作用要走。

## static method Transit:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, value:string)=>BranchStates

按原队列顺序分派：BOM → Shebang → 区域注释 / 行注释 / 正则 → 字符串 → 括号 → 空白 → 符号 → 通用字符。

各段的筛法都写在注释里，逐条给出「为什么筛掉它以后行为不变」的依据。规律是：
**只看 `value` 就能判死的先判死**（BOM / 标记首字符 / 三个开括号），**必须回看 `index - 1` 的三条共用一次回看**
（它们的前提都是「前一个字符是 `/` 且可回退」），**要写树的照旧交给原实现**。

**ASCII 走分类表**：`charCodeAt(0)` 取 `template.BasicClassTable` 的对应位（`BuildClassTable` 懒建）；
`code >= 128` 整个转给 `Fallback`（原 ①–⑧ 全链）。
`BitClasses` 为 0 的字符（plain 与其它无分类 ASCII）只剩 ⑥/⑦ 的收尾副作用，读完 `last` 后按位走 ⑧ 或 `Common.Transit`。
其余字符按表位走 ④ → ⑤ → ⑥ → ⑦ → ⑧，顺序与原队列完全一致。

⑧ 兜底前对 Common 的**正文字符**再做一次整段收：ASCII 字母 / 数字 / 下划线一旦落到兜底，就说明它不是符号、空白、引号、
括号、BOM、标记或注释/正则前缀，整段只有一个去处（`Common`），所以可以一次扫到段尾、一次追加，
省掉逐字符的驱动帧与分派。**这一段必须放在 ③ 之后**：`/` 后面可能是注释/正则，那三条只能由 ③ 判，
批量扫描只看 `value`，替代不了 ③；`\` 转义态与 `.` / 指数符号也一律回 `Common.Transit` 原路径。

```ts
const template = unit.Template;
const code = value.charCodeAt(0);
if (code >= 128) {
  return BasicDispatch.Fallback(context, unit, buffer, index, value);
}
let table = template.BasicClassTable;
if (table === "") {
  table = BasicDispatch.BuildClassTable(template);
}
const bits = table.charCodeAt(code);
// ① Bom：表的 BOM 位就是它的判据——不看位置、不看树，认下即 Done。
if ((bits & BasicDispatch.BitBom) !== 0) {
  return Bom.Transit(context, unit, buffer, index, value);
}
// ② Shebang：标记首字符对不上时它必然 Undo（它其余判据——起始下标、标记长度、下一格——只会让结论更不成立），
//    而它的 Undo 路径只读不写。首字符对上时原样交给它自己判位置；它仍可能 Undo（例如 '#' 不在文件头），不能直接 return。
if ((bits & BasicDispatch.BitMarker) !== 0) {
  const shebang = Shebang.Transit(context, unit, buffer, index, value);
  if (shebang !== BranchStates.Undo) {
    return shebang;
  }
}
// ③ 区域注释 / 行注释 / 正则三条的前提完全一样：前一个字符是 '/'、它还能被回退（unit.IsUndo）。
//    这一条与字符分类无关，**每个位置都照旧回看一次**（语义雷区，不能跳）：`/` 后面可能是注释或正则，
//    只有这里能判；批量扫描只看 value，替代不了它。
//    不满足时三条的 Undo 路径都只读不写（判据全在 return Undo 之前读完），所以这里回看一次、问一次 IsUndo，
//    替掉原来三条各回看一次（每次 Has + At）的三倍开销。
//    窗口内取前一个字符走 ValueAt（无校验）：preIndex >= buffer.Start 已判，preIndex = index - 1 < index < buffer.End 由窗口条件自证。
//    三条之间的先后与原队列一致：'*' → 区域注释，'/' → 行注释（'//' 永远是行注释），其余 → 正则（正则明确排除 '//'）。
const preIndex = index - 1;
if (preIndex >= 0) {
  const pre = preIndex >= buffer.Start ? buffer.ValueAt(preIndex) : SourceRange.Whole(buffer.Document!).At(preIndex);
  if (pre === "/" && unit.IsUndo(preIndex)) {
    if (value === "*") {
      return AreaAnnotation.Transit(context, unit, buffer, index, value);
    }
    if (value === "/") {
      return LineAnnotation.Transit(context, unit, buffer, index, value);
    }
    const regex = RegexToken.Transit(context, unit, buffer, index, value);
    if (regex !== BranchStates.Undo) {
      return regex;
    }
  }
}
// ④⑤⑥⑦ 的位全为 0：这些段对当前字符都只会 Undo，但 ⑥/⑦ 的 Undo 路径前面还有「收掉上一个未闭合块」的副作用
//    （TryToClose 在 CloseStates.Nothing 时也置 Closed，可能建出形状返回 Reload），必须原样补上。
if ((bits & BasicDispatch.BitClasses) === 0) {
  let last = unit.Last();
  if (last instanceof WrapSymbol && !last.Closed) {
    const wrap = WrapSymbol.Transit(context, unit, buffer, index, value);
    if (wrap !== BranchStates.Undo) {
      return wrap;
    }
    // 它可能已经把那个空白块关掉了，下面的 Symbol / Common 判定要重新取 last。
    last = unit.Last();
  }
  if (last instanceof Symbol && !last.Closed) {
    const symbol = Symbol.Transit(context, unit, buffer, index, value);
    if (symbol !== BranchStates.Undo) {
      return symbol;
    }
  }
  if ((bits & BasicDispatch.BitPlain) !== 0) {
    const batched = BasicDispatch.BatchPlain(context, unit, buffer, index, last);
    if (batched !== null) {
      return batched;
    }
  }
  return Common.Transit(context, unit, buffer, index, value);
}
// ④ StringGuide：QUOTE 位就是它的判据——Quotes 不含当前字符时它必然 Undo 且只读，可以跳过。
//    认下之后它才会回看前缀、可能关掉上一个单元，那些都交给它自己。
if ((bits & BasicDispatch.BitQuote) !== 0) {
  return StringGuide.Transit(context, unit, buffer, index, value);
}
// ⑤ Bracket：OPEN 位；'{' 在 `\u{…}` 转义进行中时要让位（Undo 给 Common），所以认下也不能直接 return——它可能 Undo，继续往下。
if ((bits & BasicDispatch.BitOpen) !== 0) {
  const bracket = Bracket.Transit(context, unit, buffer, index, value);
  if (bracket !== BranchStates.Undo) {
    return bracket;
  }
}
// ⑥ WrapSymbol：WS 位 → 空白一定归它（Blank 块只在空白上接手）。
if ((bits & BasicDispatch.BitWs) !== 0) {
  return WrapSymbol.Transit(context, unit, buffer, index, value);
}
let last = unit.Last();
if (last instanceof WrapSymbol && !last.Closed) {
  const wrap = WrapSymbol.Transit(context, unit, buffer, index, value);
  if (wrap !== BranchStates.Undo) {
    return wrap;
  }
  // 它可能已经把那个空白块关掉了（TryToClose 在 CloseStates.Nothing 时也置 Closed），下面的 Symbol 判定要重新取 last。
  last = unit.Last();
}
// ⑦ Symbol：SYM 位为真归它；非符号字符时它仍要做一件事——把上一个未关闭的符号块收尾
//    （那条 TryToClose 在 «非符号且 last 是未关闭 Symbol» 时也会发生，且可能建出形状返回 Reload）。
//    两个条件都不成立时，它整条路径只读多个纯判据后 Undo（无副作用），可以跳过。
if ((bits & BasicDispatch.BitSym) !== 0 || (last instanceof Symbol && !last.Closed)) {
  const symbol = Symbol.Transit(context, unit, buffer, index, value);
  if (symbol !== BranchStates.Undo) {
    return symbol;
  }
}
// ⑧ 兜底 Common：凡是上面没人认下的字符都归它（标识符 / 数字 / 布尔）。
//    plain 字符先走整段收（BatchPlain）；它没接手时（转义态等）仍回 Common.Transit 原路径。
if ((bits & BasicDispatch.BitPlain) !== 0) {
  const batched = BasicDispatch.BatchPlain(context, unit, buffer, index, last);
  if (batched !== null) {
    return batched;
  }
}
return Common.Transit(context, unit, buffer, index, value);
```

## private static method Fallback:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, value:string)=>BranchStates

非 ASCII（`code >= 128`）的原始 ①–⑧ 全链：ASCII 分类表只覆盖 0–127，BOM 默认就是非 ASCII、
ts 的空白表也含 NBSP / U+0085 等，所以这一类整条走原实现，行为逐字节不变。

```ts
const template = unit.Template;
// ① Bom：唯一判据就是「当前字符在 BomChars 里」——不看位置、不看树，认下即 Done。
//    筛法就是它的判据本身，所以这里可以直接返回，不存在「筛过去但仍要 Undo」的分支。
if (template.BomChars.includes(value)) {
  return Bom.Transit(context, unit, buffer, index, value);
}
// ② Shebang：标记首字符对不上时它必然 Undo（它其余判据——起始下标、标记长度、下一格——只会让结论更不成立），
//    而它的 Undo 路径只读不写。先比这一个字符，还省掉了它每次都要取的 unit.Data[0]。
//    首字符对上时原样交给它自己判位置；它仍可能 Undo（例如 '#' 不在文件头），所以这里不能直接 return。
const marker = template.ShebangMarker;
if (value === marker[0]) {
  const shebang = Shebang.Transit(context, unit, buffer, index, value);
  if (shebang !== BranchStates.Undo) {
    return shebang;
  }
}
// ③ 区域注释 / 行注释 / 正则三条的前提完全一样：前一个字符是 '/'、它还能被回退（unit.IsUndo）。
//    不满足时三条的 Undo 路径都只读不写（AreaAnnotation / LineAnnotation / RegexToken 的判据全在 return Undo 之前读完），
//    所以这里回看一次、问一次 IsUndo，替掉原来三条各回看一次（每次 Has + At）的三倍开销。
//    窗口内取前一个字符走 ValueAt（无校验）：preIndex >= buffer.Start 已判，preIndex = index - 1 < index < buffer.End 由窗口条件自证。
//    三条之间的先后与原队列一致：'*' → 区域注释，'/' → 行注释（'//' 永远是行注释），其余 → 正则（正则明确排除 '//'）。
//    前两种一旦前提成立就一定认下（判据已被筛法覆盖），直接返回；正则还要过它的「起点判据」，可能 Undo，继续往下。
const preIndex = index - 1;
if (preIndex >= 0) {
  const pre = preIndex >= buffer.Start ? buffer.ValueAt(preIndex) : SourceRange.Whole(buffer.Document!).At(preIndex);
  if (pre === "/" && unit.IsUndo(preIndex)) {
    if (value === "*") {
      return AreaAnnotation.Transit(context, unit, buffer, index, value);
    }
    if (value === "/") {
      return LineAnnotation.Transit(context, unit, buffer, index, value);
    }
    const regex = RegexToken.Transit(context, unit, buffer, index, value);
    if (regex !== BranchStates.Undo) {
      return regex;
    }
  }
}
// ④ StringGuide：Quotes 不含当前字符时它必然 Undo，且 Undo 路径只读（判据就是那一次 includes）。
//    认下之后它才会回看前缀、可能关掉上一个单元，那些都交给它自己。
if (template.StringTemplate.Quotes.includes(value)) {
  return StringGuide.Transit(context, unit, buffer, index, value);
}
// ⑤ Bracket：只认 '(' / '{' / '[' 三个字符，其余字符它只读一个 value 就 Undo。
//    '{' 在 `\u{…}` 转义进行中时要让位（Undo 给 Common），所以认下也不能直接 return——它可能 Undo，继续往下。
if (value === "(" || value === "{" || value === "[") {
  const bracket = Bracket.Transit(context, unit, buffer, index, value);
  if (bracket !== BranchStates.Undo) {
    return bracket;
  }
}
// ⑥ WrapSymbol：空白一定归它（Blank 块只在空白上接手；非空白它只做一件事——把上一个未关闭的空白块收尾）。
//    非空白时那条收尾只可能发生在「上一个单元正是未关闭的 WrapSymbol」，其余情况它的整条路径只读、Undo 无副作用。
const symbolTemplate = template.SymbolTemplate;
if (symbolTemplate.IsWhiteSpace(value)) {
  return WrapSymbol.Transit(context, unit, buffer, index, value);
}
let last = unit.Last();
if (last instanceof WrapSymbol && !last.Closed) {
  const wrap = WrapSymbol.Transit(context, unit, buffer, index, value);
  if (wrap !== BranchStates.Undo) {
    return wrap;
  }
  // 它可能已经把那个空白块关掉了（TryToClose 在 CloseStates.Nothing 时也置 Closed），下面的 Symbol 判定要重新取 last。
  last = unit.Last();
}
// ⑦ Symbol：符号字符归它；非符号字符时它仍要做一件事——把上一个未关闭的符号块收尾
//    （那条 TryToClose 在 «!IsSymbol(value) 且 last 是未关闭 Symbol» 时也会发生，且可能建出形状返回 Reload）。
//    两个条件都不成立时，它整条路径只读多个纯判据后 Undo（无副作用），可以跳过。
//    IsSymbol 为真的字符（含 '+' / '-' / '\\' / '.' / '}'）一律交给它：指数符号、转义让位、小数点归数字这些
//    都发生在「是符号却仍要 Undo」的分支里，跳过会把字符错发给 Common。
if (symbolTemplate.IsSymbol(value) || (last instanceof Symbol && !last.Closed)) {
  const symbol = Symbol.Transit(context, unit, buffer, index, value);
  if (symbol !== BranchStates.Undo) {
    return symbol;
  }
}
// ⑧ 兜底 Common：凡是上面没人认下的字符都归它（标识符 / 数字 / 布尔）。
//    它自己还会判一次「符号或空白 + 是否是转义标识符起点」，那一步不能在这里复制，原样调用。
return Common.Transit(context, unit, buffer, index, value);
```

## private static method BatchPlain:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, last:Token | null)=>BranchStates | null

⑧ 兜底里「plain 字符整段收」的原实现（run-batching 的 E6）：从 `index` 扫到窗口尾，
一次 `AppendAndSignOut` 整段。返回 `null` 表示没接手（例如上一个单元是未闭合的 `Symbol` / 转义态），
由调用方落回 `Common.Transit` 原路径。

```ts
const document = buffer.Document!;
const raw = document.GetRaw(index, buffer.End);
let offset = 1;
while (offset < raw.length) {
  const next = raw.charCodeAt(offset);
  if (!((next >= 48 && next <= 57) || (next >= 65 && next <= 90) || (next >= 97 && next <= 122) || next === 95)) {
    break;
  }
  offset++;
}
const at = index + offset;
const runText = raw.substring(0, offset);
// 续接：上一个单元是未闭合的 Common 且没有进入 `\` 转义态 → 整段并进去。
if (last instanceof Common && !last.Closed && !last.HasBackslash) {
  last.AppendAndSignOut(runText, at - 1);
  context.Index = at;
  return BranchStates.Done;
}
// 起新块：上一个单元不是未闭合的 Symbol（`.` 归数字 / 指数符号在 Common.Transit 里特殊处理），
// 也不是未闭合的 Common（转义态由 Common.Transit 判）；先按原逻辑收尾，再把整段一次收进新块。
if (at > index + 1 && !(last instanceof Symbol) && !(last instanceof Common && !last.Closed)) {
  if (last !== null && !last.Closed && last.TryToClose(context) === CloseStates.Built) {
    return BranchStates.Reload;
  }
  unit.Add(new Common(unit.Template));
  (unit.Last() as Common)!.AppendAndSignOut(runText, at - 1).SignIn(index);
  context.Index = at;
  return BranchStates.Done;
}
return null;
```

## private static method BuildClassTable:(template:Template)=>string

为模板懒建 128 项 ASCII 分类表（位定义见上面的 `Bit*` 字段），写进 `template.BasicClassTable` 并返回。

每一位都是**用模板自己的谓词**问出来的：`BomChars.includes`、`ShebangMarker` 首字符、`StringTemplate.Quotes.includes`、
三个开括号、`SymbolTemplate.IsWhiteSpace`、`SymbolTemplate.IsSymbol`、`IsPlainCode`——没有一处写死 ASCII 假设，
所以模板把 `"x"` 配进 `BomChars` / `Quotes`，或 `AllowedSymbol.push("a")`，或 ts 覆写 `IsWhiteSpace`，表都照着变。

**代价**：每份模板一次 128 次 `String.fromCharCode` + 每字符一次模板谓词调用（数十 µs）；8 份 d.ts 8 个模板 ≈ 0.1–0.3 ms/轮。

**契约**：建表之后模板分类必须冻结（见 `Template.BasicClassTable` 的说明）；`Template.Initialize` 会清表重建。

```ts
const symbolTemplate = template.SymbolTemplate;
const quotes = template.StringTemplate.Quotes;
const boms = template.BomChars;
const marker = template.ShebangMarker;
const markerFirst = marker.length > 0 ? marker[0] : "";
let text = "";
for (let code = 0; code < 128; code++) {
  const ch = String.fromCharCode(code);
  let bits = 0;
  if (boms.includes(ch)) {
    bits |= BasicDispatch.BitBom;
  }
  if (ch === markerFirst) {
    bits |= BasicDispatch.BitMarker;
  }
  if (quotes.includes(ch)) {
    bits |= BasicDispatch.BitQuote;
  }
  if (ch === "(" || ch === "{" || ch === "[") {
    bits |= BasicDispatch.BitOpen;
  }
  if (symbolTemplate.IsWhiteSpace(ch)) {
    bits |= BasicDispatch.BitWs;
  }
  if (symbolTemplate.IsSymbol(ch)) {
    bits |= BasicDispatch.BitSym;
  }
  if (BasicDispatch.IsPlainCode(code)) {
    bits |= BasicDispatch.BitPlain;
  }
  text += String.fromCharCode(bits);
}
template.BasicClassTable = text;
return template.BasicClassTable;
```

## private static method IsPlainCode:(code:int)=>bool

ASCII 码点是不是 Common 的正文字符：数字 / 大写字母 / 小写字母 / 下划线。
分类表用它打 `BitPlain`，`BatchPlain` 用它扫段尾——两处必须同一口径。

```ts
return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 95;
```
