# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CommonUtil } from "../../../core/common-util.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { Bracket } from "../bracket.xl.md"
import { DeclarationModifierSpans, DeclarationModifiers, DeclarationStart, ReorganizeDeclarationDecorators } from "../declaration-common.xl.md"
import { Decorator } from "../decorator.xl.md"
import { Identifier } from "../identifier.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { NamespaceBody } from "./namespace-body.xl.md"
import { SkipNextTrivia, SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { ConstString } from "../string/const-string.xl.md"
import { String } from "../string/string.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

命名空间声明单元：把 `namespace` / 可选的 `export` `declare` / 名字（可带点号）/ `{...}` 合成为一个 `Namespace`。

**为什么要单独做一个 token**：`namespace` 与 `module` 都在关键字表里，没有这条规则时它们只是
`<Keyword>`，后面的 `{}` 是一个**没有规则队列**的裸括号（`../bracket.xl.md` 的 `Use`），
于是 `namespace N { interface I {} }` 里的 `interface` 永远不成形。要修的不是关键字，而是「给这个花括号挂上语句队列」。

四种形状都收：

| 写法 | 名字 |
| --- | --- |
| `namespace N { … }` | `N` |
| `namespace A.B.C { … }` | `A.B.C` |
| `module M { … }` | `M` |
| `export namespace N { … }` / `declare namespace N { … }` | `N`，修饰词进 `modifiers` |
| `declare global { … }` | `global` |

`declare module "x" { … }` **名字走字符串那一支**，而且**不按点号拆嵌套**：
字符串名字是模块路径的整体（`"./m"` / `"*.css"` / `"node:fs/promises"`），
`NamespaceCloseRule` 只产出**一个** `Namespace`；点号拆嵌套只对标识符形式的名字（`namespace A.B.C`）成立。

`NamespaceCloseRule` 写在 `Namespace` 之前。

# class NamespaceCloseRule extends CloseRule

它永远不进 `Data`、不进 XML，所以类名与产物的标签名不一致也无害。

## static readonly field Instance:NamespaceCloseRule = new NamespaceCloseRule()

唯一的实例，注册进通用规则队列时用。

## private method SkipDottedName:(units:Array<Token>, index:int)=>int

跳过 `Identifier` + 任意多个 `.` + `Identifier`（`A.B.C`）。返回名字之后的下标（跳过软换行）；`index` 处不是 `Identifier` 时返回 `-1`。

```ts
let nextIndex = index;
if (!(Get(units, nextIndex) instanceof Identifier)) {
  return -1;
}
nextIndex = SkipNextTrivia(units, nextIndex);
while (true) {
  const dot = Get(units, nextIndex);
  if (!(dot instanceof SymbolToken) || dot.Is(".") === false) {
    return nextIndex;
  }
  const nameIndex = SkipNextTrivia(units, nextIndex);
  if (!(Get(units, nameIndex) instanceof Identifier)) {
    return nextIndex;
  }
  nextIndex = SkipNextTrivia(units, nameIndex);
}
```

## private method DottedNameText:(units:Array<Token>, start:int, end:int)=>string

把 `[start, end)` 拼成名字文本：`Identifier` 取文本、点号补 `.`——`A.B.C` 记成 `A.B.C` 而不是 `A`。

```ts
let text = "";
let index = start;
while (index < end) {
  const item = Get(units, index);
  if (item instanceof Identifier) {
    text += item.TempToString();
  } else if (item instanceof SymbolToken && item.Is(".")) {
    text += ".";
  }
  index++;
}
return text;
```

## private method ScanBody:(units:Array<Token>, index:int)=>int

从 `index`（`namespace` / `module` / `global` 这个词）往后找那个 `{` 括号，返回它的下标；不匹配返回 `-1`。

`global` 形状没有名字，所以分两路：名字形状要先跨过 `Identifier`（可带点号），`global` 形状直接看括号。

```ts
let nextIndex = SkipNextTrivia(units, index);
const current = Get(units, index);
const isGlobal = current instanceof Identifier && current.Is("global");
if (isGlobal === false) {
  const nameUnit = Get(units, nextIndex);
  if (nameUnit instanceof String) {
    nextIndex = SkipNextTrivia(units, nextIndex);
  } else {
    nextIndex = this.SkipDottedName(units, nextIndex);
    if (nextIndex < 0) {
      return -1;
    }
  }
}
const bracket = Get(units, nextIndex);
if (!(bracket instanceof Bracket)) {
  return -1;
}
if (bracket.startBracket !== "{") {
  return -1;
}
return nextIndex;
```

**字符串名字那一支是给「环境模块」的**：`declare module "x" { … }` / `module "x" { … }` 里的名字是
**字符串字面量**，不是标识符，`SkipDottedName` 认不出来——不认这一支时整个环境模块没有节点，
体内所有声明跟着丢（实测 `@types` 里 115 处 `ModuleDeclarationString`，以及它连带的
`Field` / `Interface` / `TypeAssign` 三笔差额）。

## private method ShorthandEnd:(units:Array<Token>, index:int)=>int

**简写环境模块**（`declare module "mm";`——没有体的那一档）的终点下标；不是这个形状就返回 `-1`。

TS 的 `AmbientModuleDeclaration` 允许**只有名字、没有体**：`declare module "mm";` /
`module "mm";` / `declare module "mm"` 三档在 `ts.createSourceFile` 那边都是
`ModuleDeclaration` + `StringLiteral` 两个节点、**零语法错**（逐条量过；有体那一档照旧走
`ScanBody`）。带 `;` 时那个 `;` **归它自己**（`ModuleDeclaration[0,20)` 含 `;`），
不带 `;` 时终点就是名字那一格。

**只有字符串名字有简写**：标识符名字（`declare namespace N`）没有体在 TS 那边是语法错
（量到的是 `ModuleDeclaration` 带一个**空的 `ModuleBlock`** + 一条 `ExpressionStatement`），
所以这一格只认 `String` 名字。

**认的是「名字后面没有别的东西」**（或者只有一个 `;`）：这一格返回的是**声明的终点**——
没有 `;` 时就是名字那一格，有 `;` 时就是它。**下一行的 `{` 不算**（那一档归 `ScanBody`，
而 `ScanBody` 不跨软换行）：宁可留给今天那条路，也不在这里猜。

**为什么「列表到名字为止」也要认**（第 840 轮实测）：这条收尾规则**在每一格新单元到达时
各问一次**，而问「简写」的那一刻 `units` **正好停在名字上**（`[declare, module, "mm"]`，
那个 `;` 还没进来）。所以「后面没有了」就是简写的信号；而那个 `;` 到达时它已经成了
**另一格单元**（`Statement`），由**投影侧**按「没体的声明自己吃尾分号」补进区间
（`Namespace.PrintDirectAst` 的 `ctx.SemicolonEndOf`，与第 838 轮那条口径同一份）。

**`SkipNext*` 那一族每调一次都至少前进一格**（第 840 轮踩到的）：`SkipNextWrapSymbol(units,
SkipNextTrivia(units, nameIndex))` 会**多跨一格**（第一个已经落在名字后面了），
于是 `Get(units, …)` 越过那个 `;` 拿回 `null`、简写判成「终点在名字上」——形状对了、
可那个 `;` 被留成空语句。所以这里两次都从**同一格**出发各问一次。

```ts
const current = Get(units, index);
if (!(current instanceof Identifier)) {
  return -1;
}
const text = current.TempToString();
if (text !== "module" && text !== "namespace") {
  return -1;
}
const nameIndex = SkipNextTrivia(units, index);
const nameUnit = Get(units, nameIndex);
if (!(nameUnit instanceof String)) {
  return -1;
}
// 有体的一档不在这里（`ScanBody` 认得出那个 `{`）。
if (this.ScanBody(units, index) >= 0) {
  return -1;
}
const afterIndex = SkipNextTrivia(units, nameIndex);
const after = Get(units, afterIndex);
if (after === null) {
  return nameIndex;
}
if (after instanceof SymbolToken && after.Is(";")) {
  return afterIndex;
}
const wrappedIndex = SkipNextTrivia(units, SkipNextWrapSymbol(units, afterIndex));
const wrapped = Get(units, wrappedIndex);
if (wrapped instanceof SymbolToken && wrapped.Is(";")) {
  return wrappedIndex;
}
return -1;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个命名空间声明的起点。

三个入口条件：是 `namespace` / `module` 词、或者是 `global` 词；再看后面能不能凑出 `{` 括号。

`global` **只要后面跟着 `{` 就认**，不看前一个单元：全局增强有四种落点——顶层的 `declare global { … }`、
环境模块体内的 `global { … }`（`declare module "buffer" { … global { … } }`，前面可能是任意声明）、
`declare module "x" { global { … } }`、以及命名空间体内的 `global { … }`。
要求「前一个是 `declare`」会漏掉第一种之外的全部；而 `global` 后面跟花括号本来就不是合法表达式，
所以这个形状本身没有歧义——`let global = 1` 之类不会被误吞（后面不是 `{`）。

```ts
const current = Get(units, index);
if (!(current instanceof Identifier)) {
  return false;
}
const text = current.TempToString();
if (text !== "namespace" && text !== "module" && text !== "global") {
  return false;
}
// **两种形状**：带体那一档找得到那个 `{`（`ScanBody`）；**不带体的简写**
// （`declare module "mm";`）由 `ShorthandEnd` 认——两处问的是同一件事的两半，
// 少一半就整条落成一个 `ExpressionStatement`（实测 `mod-module-shorthand` 一族：
// `ModuleDeclaration` + `StringLiteral` 都缺）。
return this.ScanBody(units, index) >= 0 || this.ShorthandEnd(units, index) >= 0;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把一个命名空间声明折成一个 `Namespace`，**返回新的下标**。

修饰词与装饰器**一起**从声明头收进来（`DeclarationStart`）：`export` / `declare` 折进 `modifiers` 文本 +
`ModifierSpans` 两格，装饰器照旧进 `Data`（它带子树，字段表达不了）。

早先这里只往回收**一个**词（`export` 或 `declare`），第二个与装饰器都留在外面——
`export declare namespace` 靠投影层那条「前缀词并进声明」的近似补回来的，
而**装饰器一出现那条近似就认不出声明**（实测 `@dec namespace N {}` 一族：
`ModuleDeclaration` 缺 1 + 多出 1，`@dec export declare` 那几档还多丢一批节点）。

替换范围到命名空间体的 `}` 为止，**尾随软换行留在父单元里**：理由与 `Interface.Process` 相同——
那道换行就是语句边界，收进范围会让后面那条声明被并进同一个 `Statement`
（见 `../declaration-common.xl.md` 里「为什么这里不再有收尾口径」那一节）。

```ts
const namespaceInstance = new Namespace(template);
// **装饰器先在列表里收成单元**（与 `ClassBranch.Success` / `InterfaceBranch.Success` 同一件工具）：
// 这一刻它们还是散的 `@` / 名字 / 实参括号，而 `DeclarationStart` 往回走会停在实参括号上。
const keywordIndex = ReorganizeDeclarationDecorators(template, units, index);
const current = Get(units, keywordIndex);
if (!(current instanceof Identifier)) {
  throw new Error("namespace 语句不满足格式要求：namespace Name{...}");
}
// **头从第一个修饰词 / 装饰器起**：TS 那边 `@dec export namespace N {}` 的 `ModuleDeclaration`
// 从 `@` 起，`Decorator` 与 `ExportKeyword` 同在 `modifiers` 里。
const startIndex = DeclarationStart(units, keywordIndex);
namespaceInstance.modifiers = DeclarationModifiers(units, startIndex, keywordIndex).join(",");
// **修饰词各自的位置**（见 `ModifierSpans`）：它们不进 `Data`，位置要在这一趟记下来——
// 投影回原文 `indexOf("export", …)` 猜时，点号拆出来的里层是从自己那一段起找的，往前找不到。
namespaceInstance.ModifierSpans = DeclarationModifierSpans(units, startIndex, keywordIndex).join(",");
namespaceInstance.SignInToken(Get(units, startIndex)!);
// **装饰器照旧进 `Data`**：它是带子树的节点，字段表达不了那个表达式子树；
// 与 `Class` 的分工逐字相同——能被字段表达的不进、带子树的进。顺序在源码位置上。
for (let i = startIndex; i < keywordIndex; i++) {
  const item = Get(units, i);
  if (item instanceof Decorator) {
    namespaceInstance.AddAndCloseLast(item);
  }
}
const bracketIndex = this.ScanBody(units, keywordIndex);
// **简写环境模块没有体**（第 840 轮）：`declare module "mm";` 在 TS 那边是
// `ModuleDeclaration` + `StringLiteral`、`body` **缺着**，这里的终点就是那个 `;`
//（没有 `;` 时是名字那一格）。带体那一档照旧（`bracketIndex >= 0`）。
const shorthandEnd = bracketIndex < 0 ? this.ShorthandEnd(units, keywordIndex) : -1;
if (bracketIndex < 0 && shorthandEnd < 0) {
  throw new Error("namespace 语句不满足格式要求：namespace Name{...}");
}
// 名字是**字符串字面量**还是**标识符**，决定要不要按点号拆成嵌套的 `Namespace`。
// 环境模块 `declare module "./m" { … }` / `declare module "*.css" { … }` 的名字是一个整体，
// 点号是模块路径的一部分、不是命名空间的层级。不区分就会把 `"./m"` 拆成 `["", "/m"]`、
// 把 `"*.css"` 拆成 `["*", "css"]`，凭空多出一个同名内层命名空间
// （实测产物 `<Namespace namespace="./m"><Namespace namespace="/m">…`，
//  `gap-dashboard`（当时那把逐节点对账的尺子，已随测试集收窄删除）里那 4 个
//  `ModuleDeclaration 真多` 就是它）。
const isStringName = current.Is("global") === false && Get(units, SkipNextTrivia(units, keywordIndex)) instanceof String;
if (current.Is("global")) {
  namespaceInstance.namespace = "global";
  // **`global` 那个词就是名字那一格**（第 646 轮）：TS 那边 `declare global { … }` 的
  // `ModuleDeclaration.name` 是一个 `Identifier("global")`，区间正是这个词。
  if (current.SourceRange.Start !== null && current.SourceRange.End !== null) {
    namespaceInstance.NameAt = current.SourceRange.Start.Index;
    namespaceInstance.NameEnd = current.SourceRange.End.Index;
  }
} else {
  const nameStart = SkipNextTrivia(units, keywordIndex);
  const nameUnit = Get(units, nameStart);
  if (nameUnit instanceof String) {
    let text = "";
    for (const item of nameUnit.Data) {
      if (item instanceof ConstString) {
        text = item.TempToString();
        break;
      }
    }
    namespaceInstance.namespace = text;
  } else {
    const nameEnd = this.SkipDottedName(units, nameStart);
    namespaceInstance.namespace = this.DottedNameText(units, nameStart, nameEnd);
  }
}
const nameParts = namespaceInstance.namespace.split(".");
const nestedInners: Namespace[] = [];
let innermost: Namespace = namespaceInstance;
// **名字各段的起点**（第 156 轮）：点号拆出来的每一层，TS 那边的 `getStart()` 就是
// **它自己那一段**的位置（`namespace A.B { … }` 的里层是 `ModuleDeclaration[12,36)`，
// 不是外层的 `[0,36)`）。原来每层都抄外层的起止，于是里层区间与外层一模一样、对拍全错位。
// `SourceRange.Start` 是 **`Source` 对象**、不是下标（与 `inner.SourceRange.Start` 同一类型），
// 所以这里存的是它本身。
const nameStarts: Array<any> = [];
const nameEnds: Array<any> = [];
{
  let cursor = SkipNextTrivia(units, keywordIndex);
  for (;;) {
    const unit = Get(units, cursor);
    if (!(unit instanceof Identifier) || unit.SourceRange.Start === null) {
      break;
    }
    nameStarts.push(unit.SourceRange.Start);
    nameEnds.push(unit.SourceRange.End);
    const dotIndex = SkipNextTrivia(units, cursor);
    const dot = Get(units, dotIndex);
    if (!(dot instanceof SymbolToken) || dot.Is(".") === false) {
      break;
    }
    cursor = SkipNextTrivia(units, dotIndex);
  }
}
if (isStringName === false && nameParts.length > 1) {
  const outerStart = Get(units, startIndex)!.SourceRange.Start!;
  const outerEnd = Get(units, bracketIndex)!.SourceRange.End!;
  let parentNamespace: Namespace = namespaceInstance;
  for (let partIndex = 1; partIndex < nameParts.length; partIndex++) {
    const inner = new Namespace(template);
    inner.namespace = nameParts[partIndex];
    // **修饰词只属于最外层那一格**：TS 那边 `declare module a.b.c { … }` 只有外层
    // `ModuleDeclaration` 带 `modifiers`，里层两层一个都没有——照抄给里层会多出
    // 两个 `modifiers` 字段（实测 `declare module a.b.c`：字段名不符 2）。
    // 起止都要在 `AddAndCloseLast` 之前设好：那个方法会 `Close()`，
    // 而 `TryToClose` 要求范围完整（实测缺 End 时抛 `SourceRange.End is null`）。
    // 也不能改用 `SignOut` —— 它会递归签出「最后一个子单元」，同一层会被签两次
    // （实测抛 `SourceRange.End has been setted`）。所以这里直接写字段。
    const segmentStart = nameStarts[partIndex];
    inner.SourceRange.Start = segmentStart === undefined ? outerStart : segmentStart;
    inner.SourceRange.End = outerEnd;
    // **每一段名字自己那一格**（第 646 轮）：投影按 `nameRange` 直读文本区间，
    // 不再回原文 `indexOf(那一段)` 找（里层是从自己那一段起找的，往前找不到）。
    if (segmentStart !== undefined) {
      const segmentEnd = nameEnds[partIndex];
      if (segmentEnd !== undefined && segmentEnd !== null) {
        inner.NameAt = segmentStart.Index;
        inner.NameEnd = segmentEnd.Index;
      }
    }
    if (partIndex > 1) {
      parentNamespace.AddAndCloseLast(inner);
    }
    nestedInners.push(inner);
    innermost = inner;
    parentNamespace = inner;
  }
  // **只把链条的第一个加到最外层**：`nestedInners[1..]` 已经在上面互相挂好了。
  // 原来这里加的是 `innermost`，于是 `A.B.C` 变成最外层下面挂着 B 与 C 两个兄弟
  // （实测产物 `<Namespace Name="A.B.C"><Namespace Name="B"/><Namespace Name="C">…`）。
  namespaceInstance.AddAndCloseLast(nestedInners[0]);
  if (namespaceInstance.SourceRange.End === null) {
    namespaceInstance.SourceRange.End = outerEnd;
  }
}
// **名字那一格的整段区间当场记下**（用户口径：token 出字段、投影直读）：
// 那一段的起止就在 `nameStarts` / `nameEnds` 里，投影不再回原文 `indexOf` 找。
// 平坦名就是唯一那段；点号名的外层记**第一段**（TS 那边 `namespace A.B` 的外层名字只有 `A`，
// 里层各记自己那一段——见上面的创建循环）。投影的 `synthName` 直读 `nameRange`
//（`namespace a.b.c` 全名在原文里根本不连续，`indexOf` 只会给错答案）。
if (isStringName === false && nameStarts.length > 0) {
  const firstEnd = nameEnds[0];
  if (firstEnd !== undefined && firstEnd !== null) {
    namespaceInstance.NameAt = nameStarts[0].Index;
    namespaceInstance.NameEnd = firstEnd.Index;
  }
}
// **字符串模块名那一格的位置也当场记下**（第 641 轮）：`declare module "m" { … }` 的名字
// 是**含引号**的一个 `String` 单元，它就在手上——投影不必再去原文里找那对引号
//（原来那一路是「在体的 `{` 之前找第一个 `"` 或 `'`，再找它配对的另一个」——
//  遇到名字前面有注释 / 别的字符串时会挑错，那是**第二份位置答案**）。
if (isStringName) {
  const stringName = Get(units, SkipNextTrivia(units, keywordIndex));
  if (stringName !== null && stringName.SourceRange.Start !== null && stringName.SourceRange.End !== null) {
    namespaceInstance.NameAt = stringName.SourceRange.Start.Index;
    namespaceInstance.NameEnd = stringName.SourceRange.End.Index;
  }
}
if (bracketIndex >= 0) {
  const body = Get(units, bracketIndex);
  if (!(body instanceof Bracket)) {
    throw new Error("namespace 语句不满足格式要求：namespace Name{...}");
  }
  const namespaceBody = innermost.CreateBody();
  body.MoveDataTo(namespaceBody);
  namespaceBody.Sign(body);
  namespaceBody.TryToClose();
  if (innermost.SourceRange.End === null) {
    innermost.SignOutToken(namespaceBody);
  }
  if (innermost !== namespaceInstance && namespaceInstance.SourceRange.End === null) {
    namespaceInstance.SignOutToken(namespaceBody);
  }
} else {
  // **简写那一档自己签出到终点**（第 840 轮）：没有体就没有 `namespaceBody` 可以签，
  // 而 `TryToClose` 要求范围完整（少了这一句抛 `SourceRange.End is null`）。
  const lastUnit = Get(units, shorthandEnd);
  if (lastUnit !== null && namespaceInstance.SourceRange.End === null) {
    namespaceInstance.SignOutToken(lastUnit);
  }
}
const declarationEnd = bracketIndex >= 0 ? bracketIndex : shorthandEnd;
return ReplaceCountAt(units, startIndex, declarationEnd - startIndex + 1, namespaceInstance);
```

# class Namespace extends IndependentToken

命名空间声明。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

```ts
  const node = ctx.Node("ModuleDeclaration", ctx.Structural(v, "ModuleDeclaration"), v);
  // **没体的环境模块把那个 `;` 吃进来**（第 840 轮）：`declare module "mm";` 在 TS 那边
  // `ModuleDeclaration` 的区间**含** `;`（`AmbientModuleDeclaration` 收尾调 `parseSemicolon`），
  // 而收尾规则问「简写」的那一刻列表**只到名字**（那个 `;` 还没进来，见 `ShorthandEnd`）
  // ⇒ 声明自己的区间到名字为止。这里按「没体的声明自己吃尾分号」补一格——
  // 与第 838 轮那条口径**同一份实现**（`ctx.SemicolonEndOf` 会把那个下标记进
  // `consumedSemicolons`，紧跟的那一格于是不再投成 `EmptyStatement`）。
  // **带体的一档不吃**：`module M { };` 里那个 `;` 是**另一条** `EmptyStatement`
  // （`ModuleDeclaration` 在 `NO_TRAILING_SEMICOLON` 表里）。
  const hasBody = ctx.AllKids(v).some((k: any) => k.Tag() === "NamespaceBody");
  if (hasBody === false) {
    node.end = ctx.SemicolonEndOf(node.end);
  }
  return node;
```


## method BodyField:(parentKind:string)=>string | undefined

**我在父节点上叫哪个字段**（见 `core/syntax/token.xl.md` 的 `Token.BodyField`）：
**同一个 token 两种落法**，只有「父亲投成了什么」分得开——所以这是体字段里**唯一看参数**的一处。

| 父亲投成 | 我是什么 | 我叫什么 |
| --- | --- | --- |
| `ModuleDeclaration` | 点号命名空间的内层（`namespace A.B.C { }` 的第二、第三层） | `body`（目标语言的 `ModuleDeclaration.body` 就是里面那层） |
| `ModuleBlock` | 命名空间体里的一条声明（`namespace O { export namespace I { } }` 里那个内层） | 不是体 → 答 `undefined`，于是它落在 `statements` 里 |

**判据为什么住在这里**（第 991 轮从投影层的 `BODY_FIELDS` 搬来，口径是第 367 轮定的）：
两种情形在产物里长得一样（都是 `Namespace` 套 `Namespace`），区别只在父亲投成了什么。
一律收成 `body` 的后果（第 292 轮实测）：降级层 `ListOf(block, "statements")`
**一个语句都取不到** ⇒ 内层命名空间根本没建 ⇒ 脚本报
`cannot read properties of undefined`（**离现场很远**）。

```ts
if (parentKind === "ModuleDeclaration") {
  return "body";
}
return undefined;
```

## constructor:(template:Template)=>void

以模板创建，并把本类型的收尾规则挂上来（模板里没有专门给 `Namespace` 注册就用通用队列）。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## field namespace:string = ""

命名空间名。点号形式原样保留（`A.B.C`）。

## field modifiers:string = ""

`export` / `declare` 修饰词，没有就是空串。

## field ModifierSpans:string = ""

修饰词自己的区间，`"起:止"`（闭区间）；没有修饰词时空串。
来由与 `Class.ModifierSpans` 同一条：修饰词不进 `Data`，位置只有认下声明那一刻知道。

## field NameAt:int = -1

**名字那一格的起点**（闭区间）。三种名字都在这一格里：

- 字符串模块名——那个 `String` 单元（**含引号**）；
- `global`——`global` 那个词自己；
- 标识符名（含点号名的**第一段**）——那一段的 `Identifier`。

## field NameEnd:int = -1

与 `NameAt` 同进退的**终点**。投影按 `nameRange` 直读：开头是引号 ⇒ 取引号之间，
否则整格就是名字——不再回原文 `indexOf(名字)` 猜（点号名的全名在原文里根本不连续）。

## method NameField:()=>string | undefined

**这一格自己的名字**（第 1006 轮）：名字就在本页的 `namespace` 字段上，所以由这一页回答——
投影那一层过去拿一张「哪些页把名字叫什么」的字符串名单逐个试
（`owner["name"]` / `owner["fieldName"]` / `owner["namespace"]`），现在只问这一格
（见 `typescript/print-ast-common.xl.md` 的 `tokenNameOf`）。

基类那一格答 `undefined`＝「名字不在字段上」（见 `core/syntax/token.xl.md`）。

```ts
return this.namespace === "" ? undefined : this.namespace;
```

## method ToXmlString:()=>string

产出 XML：开标签上带 `namespace` / `modifiers` 与名字的三格位置、修饰词的位置，内容是子单元（主要是 `NamespaceBody`）的 XML。

属性值必须过 `CommonUtil.XmlDecode`——名字是源码里的原文，可能带 `<` 之类的字符；基类版本只拼子单元，
不覆写的话 `namespace` 根本进不了产物。

**第 987 轮五补齐四处**（`nameAt` / `nameEnd` / `nameRange` / `modifierSpans`）：
这几个键 `ToDictionary` 一直在写、投影也一直在读（`synthName` 按 `nameRange` 推文本区间），
而 XML 从前没印。条件**逐字照抄** JSON 那侧（`NameAt >= 0 && NameEnd >= NameAt`；
`modifierSpans` 只在非空时写）——同一件事在两处各写一个条件就是两份口径。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
let nameSpan = "";
if (this.NameAt >= 0 && this.NameEnd >= this.NameAt) {
  nameSpan = ` nameAt="${this.NameAt}" nameEnd="${this.NameEnd}" nameRange="${this.NameAt},${this.NameEnd}"`;
}
const spans = this.ModifierSpans === "" ? "" : ` modifierSpans="${CommonUtil.XmlDecode(this.ModifierSpans)}"`;
return `<${name} range="${this.RangeOf()}" namespace="${CommonUtil.XmlDecode(this.namespace)}" modifiers="${CommonUtil.XmlDecode(this.modifiers)}"${nameSpan}${spans}>${temp.join("")}</${name}>`;
```

## property modifierSpans:any

`ToDictionary` 的 `modifierSpans` 键**由这一页自己承担**（第 1018 轮）：值取这一页自己那一格事实。

### get

```ts
return this.ModifierSpans;
```

## property nameAt:any

`ToDictionary` 的 `nameAt` 键**由这一页自己承担**（第 1018 轮）：值取这一页自己那一格事实。

### get

```ts
return this.NameAt;
```

## property nameEnd:any

`ToDictionary` 的 `nameEnd` 键**由这一页自己承担**（第 1018 轮）：值取这一页自己那一格事实。

### get

```ts
return this.NameEnd;
```

## property nameRange:any

`ToDictionary` 的 `nameRange` 键**由这一页自己承担**（第 1018 轮）：值取这一页自己那一格事实。

### get

```ts
return this.NameAt + "," + this.NameEnd;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `namespace` / `modifiers` 两个字段，外加子单元。

键名与 `ToXmlString` 开标签上的两个属性同名，值取同一批字段。
XML 那边过一次 `CommonUtil.XmlDecode` 只是为了属性转义（名字里可能有 `<`），JSON 的字符串不需要这一层，
所以这里直接写字段本身。子单元非空时才写 `children`（空节点只留 `type`）。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.Tag());
result.set("namespace", this.namespace);
result.set("modifiers", this.modifiers);
// **修饰词的位置**（见 `ModifierSpans`）：投影直读，不再回原文 `indexOf` 猜。
if (this.ModifierSpans !== "") {
  result.set("modifierSpans", this.modifierSpans);
}
// **名字那一格的整段区间**：含引号的字符串名、`global` 那个词、标识符名（点号名的第一段）。
if (this.NameAt >= 0 && this.NameEnd >= this.NameAt) {
  result.set("nameAt", this.nameAt);
  result.set("nameEnd", this.nameEnd);
  // **整段区间也照 `bodyBraceRange` 那一格报一份**（第 645 轮）：投影里「声明名」那条共用路
  //（`synthName`）按**这一格**自己推断文本区间（引号名去掉首尾各一格），
  // 于是「模块名是什么形状」这件事**只剩一条路**说。
  result.set("nameRange", this.nameRange);
}
if (this.Data.length !== 0) {

  result.set("children", this.children);
}
return result;
```

## method CreateBody:()=>NamespaceBody

新建命名空间体并挂到自己名下，返回新单元。

```ts
return this.Add(new NamespaceBody(this.Template));
```

## method Clone:()=>Token

克隆自身。**注意 `Clone` 不复制** `namespace` / `modifiers` / `ModifierSpans`——克隆体三个字段都是初值，
与 `Interface.Clone` 的既有口径一致。

```ts
const result = new Namespace(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
