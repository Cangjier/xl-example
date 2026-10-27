# dependencies
```xl
import { BranchStates } from "../branch-states.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { ComputePossibleShapesStates } from "../compute-possible-shapes-states.xl.md"
import { IComputePossibleShapes } from "../i-compute-possible-shapes.xl.md"
import { PossibleSource } from "../possible-source.xl.md"
import { SourceRange } from "../source-range.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "../templates/template.xl.md"
import { UnitToken } from "../unit-token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 AST 行。

区域注释 `/* … */`：从 `/*` 吃到 `*/`，正文攒进 `Tmp`。注释单元留在树里、会进 AST 行输出，那一行能看到 `AreaAnnotation  src=[…]  text="正文"`。

# class AreaAnnotation extends UnitToken

区域注释单元。

单元值类型是单字符的 `string`。

覆写了 `AstText`（返回 `Tmp`），注释正文因此落在 `text` 字段里；不另外覆写输出方法。

## field IsBasicToken:bool = true

basic 单元：由 `Template.BasicBranchQueue()` 收出来。

## field IsAnnotationToken:bool = true

注释单元：`/* */` 是 trivia。

## field IsTriviaToken:bool = true

trivia 单元：判形状时跳过。

## constructor:(template:Template)=>void

以模板创建，并把本类型的跳转队列取出来；本类不设重组队列。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
```

## field Tmp:string = ""

注释正文，两个 `*` 都不在内：开头的 `*` 由 `Success` 消费掉，结尾的 `*` 由 `ExitOrPre` 回退掉。

## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

覆写驱动循环：注释挂载之后本单元**只吃字符到 `*/`**，中间没有别的单元会插进来，所以不必逐字符走一遍
`UnitToken.Process` 的驱动帧（父单元 / 消息 / 挂载检查 + 读字符 + 下标簿记）。

窗口内一次 `GetRaw` 拿整段文本、一次原生 `indexOf("*/")` 找结束序列：

- 找到：`close` 处就是结尾 `*`，正文到它之前为止（逐字符路径里结尾 `*` 也是「先追加、再 `Undo` 删掉」，
  这里从构造上就不追加它）；签出到结尾 `/` 之后、关闭、跑重组、卸载，`context.Index = slash + 1`。
- 没找到：整窗剩余一次追加进 `Tmp`，`context.Index = buffer.End`，等下一个窗口接着吃。

结束序列跨窗口时（窗口以 `*` 收尾）：`Tmp` 的末尾正好是 `index - 1` 那一格，所以
`Tmp.endsWith("*")` 加上「当前字符是 `/`」就是精确判据；把末尾那个 `*` 从 `Tmp` 里删掉（与原 `Undo` 等价）后收口。

**为什么等价**：注释挂载期间没有第二个执行者——父单元的 `MountedUnit` 不会在窗口中间换人，
`context.Messages` 也不会在窗口中间被别的单元 push（本单元只在窗口末尾关闭）。
`Tmp` 的终值与逐字符追加一致，两个提前返回（父单元已卸载 / 有待重放消息）在窗口开头判一次即可。
**依赖**：本方法用 `Document.GetRaw`（`TextDocument` 已实现）做整窗切片。

```ts
const end = buffer.End;
if (index >= end) {
  return;
}
const parent = this.Parent;
if (parent !== null && parent.MountedUnit !== this) {
  return;
}
if (!context.Replaying && context.Messages.length > 0) {
  return;
}
const document = buffer.Document!;
// 跨窗口：上一个窗口以 `*` 收尾，当前字符是 `/` ⇒ 结束序列正好跨在窗口边界上。
if (index > 0 && this.Tmp.endsWith("*") && document.GetValue(index) === "/") {
  this.Tmp = this.Tmp.slice(0, this.Tmp.length - 1);
  this.SignOut(index + 1);
  this.TryToClose(context);
  this.Quit();
  context.Index = index + 1;
  this.LastIndex = index;
  return;
}
const raw = document.GetRaw(index, end);
const close = raw.indexOf("*/");
if (close >= 0) {
  // `close` 处是结尾 `*`：正文到它之前为止；结尾 `*` 本来就不进 `Tmp`。
  this.Tmp += raw.substring(0, close);
  const slash = index + close + 1;
  this.SignOut(slash + 1);
  this.TryToClose(context);
  this.Quit();
  context.Index = slash + 1;
  this.LastIndex = slash;
  return;
}
this.Tmp += raw;
context.Index = end;
this.LastIndex = end - 1;
```

## method Undo:(index:int)=>void

回退一个字符：覆盖 `index` 的子单元非空就转交给它，否则从 `Tmp` 末尾删掉一个字符。

```ts
const undoUnit = this.WhichUnitRangeContains(index);
if (undoUnit !== null) {
  undoUnit.Undo(index);
} else {
  this.Tmp = this.Tmp.slice(0, this.Tmp.length - 1);
}
```

## method IsUndo:(index:int)=>bool

能不能回退：范围已经签出（`SourceRange.End >= 0`）就不能；否则看覆盖 `index` 的子单元，没有子单元时返回 `true`。

```ts
if (this.SourceRange.End >= 0) {
  return false;
}
const undoUnit = this.WhichUnitRangeContains(index);
if (undoUnit !== null) {
  return undoUnit.IsUndo(index);
}
return true;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

关闭：只把自己标记为已关闭，然后**只问父单元**要不要重算候选——父单元没实现 `IComputePossibleShapes` 就不问，也不再往上找。

父单元是不是宿主由它自己的 `CatalogGuide` 说了算：为空就等于没挂向导，被问到也不做任何事。

重算的返回值原样带上去：建出了形状时，正在收尾的这个 token 要让当前字符重放。

```ts
this.Closed = true;
const parent = this.Parent;
if (parent !== null && "ComputePossibleShapes" in parent) {
  const state = (parent as unknown as IComputePossibleShapes).ComputePossibleShapes(context, PossibleSource.Close);
  if (state === ComputePossibleShapesStates.Built) {
    return CloseStates.Built;
  }
}
return CloseStates.Nothing;
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>void

跳转队列没接手时，把字符并进 `Tmp`。

`value` 是驱动层已经读好的当前字符（`buffer.ValueAt(index)`）：直接追加，不再复读。

```ts
this.Tmp += value;
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

遇到 `*/` 就退出：当前字符是 `/` 且前一个字符是 `*` 时，签出到当前字符之后、把那个 `*` 回退掉、关闭自己并跑重组、从父单元卸载，返回 `Done`；否则返回 `Undo`。

**先判当前字符**（`value !== "/"` 立刻 `Undo`），只有 `/` 才回看前一个字符——注释正文里绝大多数是既不是 `*` 也不是 `/` 的普通字符，走不到回看，省掉的是每个注释字符一次窗口读取 + 一次窗口回看。前一个字符可能落在上一个窗口（`*` 在窗口末尾、`/` 在下一个窗口开头），所以窗口内取不到时要经 `SourceRange.Whole(buffer.Document!)` 取。

```ts
if (value !== "/") {
  return BranchStates.Undo;
}
const preIndex = index - 1;
let pre: string | null = null;
if (preIndex >= 0) {
  pre = buffer.Has(preIndex) ? buffer.At(preIndex) : SourceRange.Whole(buffer.Document!).At(preIndex);
}
if (pre === "*") {
  this.SignOut(index + 1);
  this.Undo(preIndex);
  this.TryToClose(context);
  this.Quit();
  return BranchStates.Done;
}
return BranchStates.Undo;
```

## method AstText:()=>string

本节点的文本是注释正文 `Tmp`：`Token.AstLabel` 把它印成 `text="正文"`，`ToAstLine` 因此只需要一行 label。

```ts
return this.Tmp;
```

## static method Transit:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, value:string)=>BranchStates

判据：前一个字符是 `/`、它还能被回退（`unit.IsUndo`）、且当前字符是 `*`。

认下就回退已吃掉的那个 `/`（它归本单元所有），再挂一个新的 `AreaAnnotation` 并用同一个 `/` 签入；挂的时候若关闭上一个 token 建出了形状，返回 `Reload`。

前一个字符可能在上一个窗口，窗口内取不到时经 `SourceRange.Whole(buffer.Document!)` 取。

```ts
const preIndex = index - 1;
if (preIndex < 0) {
  return BranchStates.Undo;
}
const pre = buffer.Has(preIndex) ? buffer.At(preIndex) : SourceRange.Whole(buffer.Document!).At(preIndex);
if (pre !== "/" || !unit.IsUndo(preIndex) || value !== "*") {
  return BranchStates.Undo;
}
unit.Undo(preIndex);
const lastOfMounted = unit.Last();
if (lastOfMounted !== null && !lastOfMounted.Closed && lastOfMounted.TryToClose(context) === CloseStates.Built) {
  return BranchStates.Reload;
}
const mounted = new AreaAnnotation(unit.Template);
unit.Add(mounted);
unit.MountedUnit = mounted;
(unit.MountedUnit as AreaAnnotation)!.SignIn(preIndex);
return BranchStates.Done;
```
