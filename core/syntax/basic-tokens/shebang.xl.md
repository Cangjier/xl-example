# dependencies
```xl
import { BranchStates } from "../branch-states.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { ComputePossibleShapesStates } from "../compute-possible-shapes-states.xl.md"
import { IComputePossibleShapes } from "../i-compute-possible-shapes.xl.md"
import { SourceRange } from "../source-range.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Bom } from "./bom.xl.md"
import { Template } from "../templates/template.xl.md"
import { UnitToken } from "../unit-token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

Shebang basic token：`#!…` 只在**文件头的允许位置**进入——
- 没有 BOM 时：`index === 0`；
- 有 BOM 时：`index === Bom.SourceRange.EndIndex`（即 BOM 之后那一格）。

标记本身由 `Template.ShebangMarker` 配置（默认 `#!`）。吞到**行尾换行之前**（不含 `\n`），
`\n` 用 `Reload` 交回根单元处理。它是 trivia（`IsTriviaToken`）：不产生 AST 节点。

# class Shebang extends UnitToken

Shebang 单元。

单元值类型是单字符的 `string`。

## field IsBasicToken:bool = true

basic 单元：由 `Template.BasicBranchQueue()` 收出来。

## field IsTriviaToken:bool = true

trivia 单元：判形状时跳过，不进 AST。

## constructor:(template:Template)=>void

以模板创建，并把本类型的跳转队列取出来；本类不设重组队列。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
```

## field Tmp:string = ""

Shebang 行的正文（`#!` 及其后的字符，不含行尾换行）。

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>void

跳转队列没接手时，把字符并进 `Tmp`。

`value` 是驱动层已经读好的当前字符（`buffer.ValueAt(index)`）：直接追加，不再复读。

```ts
this.Tmp += value;
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

遇到行终止符（`Template.IsLineTerminator`：core 默认 `\n`，ts 模板为 `\n` / `\r` / U+2028 / U+2029）
或 EOF 空窗口就退出：签出到当前字符之前、关闭自己并跑重组、从父单元卸载；
行终止符本身不是 shebang 的一部分，返回 `Reload` 让它**不归本单元消费**、由驱动层原地重放给根单元（EOF 时返回 `Done`）。

`value` 是驱动层已经读好的当前字符（`buffer.ValueAt(index)`）：直接判定，不再复读。

```ts
if (!buffer.IsEof() && !this.Template.IsLineTerminator(value)) {
  return BranchStates.Undo;
}
if (index > 0) {
  this.SignOut(index);
}
this.TryToClose(context);
this.Quit();
if (!buffer.IsEof()) {
  return BranchStates.Reload;
}
return BranchStates.Done;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

关闭：只把自己标记为已关闭，然后**只问父单元**要不要重算候选。

```ts
this.Closed = true;
const parent = this.Parent;
if (parent !== null && "ComputePossibleShapes" in parent) {
  const state = (parent as unknown as IComputePossibleShapes).ComputePossibleShapes(context);
  if (state === ComputePossibleShapesStates.Built) {
    return CloseStates.Built;
  }
}
return CloseStates.Nothing;
```

## static method Transit:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, value:string)=>BranchStates

判据三段：
1. 允许的起始下标：根 `Data` 第一格是 `Bom`（且已签出）时取 `Bom.SourceRange.EndIndex`，否则 `0`；
2. 当前字符是 `Template.ShebangMarker` 的第一个字符、下一格是第二个字符（下一格可能跨窗口，经 `SourceRange.Whole(buffer.Document!)` 取）；
3. 认下后挂一个新的 `Shebang`，按当前字符签入，后续字符由本单元吞到行尾。

```ts
let startIndex = 0;
if (unit.Data.length > 0) {
  const first = unit.Data[0];
  if (first instanceof Bom && first.SourceRange.End >= 0) {
    startIndex = first.SourceRange.EndIndex;
  }
}
if (index !== startIndex) {
  return BranchStates.Undo;
}
const marker = unit.Template.ShebangMarker;
if (marker.length !== 2) {
  return BranchStates.Undo;
}
if (value !== marker[0]) {
  return BranchStates.Undo;
}
const whole = SourceRange.Whole(buffer.Document!);
if (index + 1 >= whole.EndIndex || whole.At(index + 1) !== marker[1]) {
  return BranchStates.Undo;
}
const mounted = new Shebang(unit.Template);
unit.Add(mounted);
unit.MountedUnit = mounted;
mounted.SignIn(index);
return BranchStates.Done;
```
