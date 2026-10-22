# dependencies
```xl
import { BranchStates } from "../branch-states.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { ComputePossibleShapesStates } from "../compute-possible-shapes-states.xl.md"
import { IComputePossibleShapes } from "../i-compute-possible-shapes.xl.md"
import { ReloadMessage } from "../messages/reload-message.xl.md"
import { Source } from "../source.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Bom } from "./bom.xl.md"
import { Template } from "../templates/template.xl.md"
import { UnitToken } from "../unit-token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

Shebang basic token：`#!…` 只在**文件头的允许位置**进入——
- 没有 BOM 时：`source.Index === 0`；
- 有 BOM 时：`source.Index === Bom.SourceRange.End.Index + 1`（即 BOM 之后那一格）。

标记本身由 `Template.ShebangMarker` 配置（默认 `#!`）。吞到**行尾换行之前**（不含 `\n`），
`\n` 用 `ReloadMessage` 交回根单元处理。它是 trivia（`IsTriviaToken`）：不产生 AST 节点。

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

## protected method Default:(context:SyntaxContext, source:Source)=>void

跳转队列没接手时，把字符并进 `Tmp`。

```ts
this.Tmp += source.Value;
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

遇到行终止符（`Template.IsLineTerminator`：core 默认 `\n`，ts 模板为 `\n` / `\r` / U+2028 / U+2029）
或 EOF 哨兵就退出：签出到前一个字符、关闭自己并跑重组、从父单元卸载；
行终止符本身不是 shebang 的一部分，用 `ReloadMessage` 交回根单元（EOF 时不再插消息）。

```ts
if (!source.IsEOF && !this.Template.IsLineTerminator(source.Value)) {
  return BranchStates.Undo;
}
const previous = source.Pre();
if (previous !== null) {
  this.SignOut(previous);
}
this.TryToClose(context);
this.Quit();
if (!source.IsEOF) {
  context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
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

## static method Transit:(context:SyntaxContext, unit:Token, source:Source)=>BranchStates

判据三段：
1. 允许的起始下标：根 `Data` 第一格是 `Bom`（且已签出）时取 `Bom.SourceRange.End.Index + 1`，否则 `0`；
2. 当前字符是 `Template.ShebangMarker` 的第一个字符、下一格是第二个字符；
3. 认下后挂一个新的 `Shebang`，按当前字符签入，后续字符由本单元吞到行尾。

```ts
let startIndex = 0;
if (unit.Data.length > 0) {
  const first = unit.Data[0];
  if (first instanceof Bom && first.SourceRange.End !== null) {
    startIndex = first.SourceRange.End.Index + 1;
  }
}
if (source.Index !== startIndex) {
  return BranchStates.Undo;
}
const marker = unit.Template.ShebangMarker;
if (marker.length !== 2) {
  return BranchStates.Undo;
}
if (source.Value !== marker[0]) {
  return BranchStates.Undo;
}
const document = source.Document;
if (source.Index + 1 >= document.GetCount() || document.At(source.Index + 1).Value !== marker[1]) {
  return BranchStates.Undo;
}
const mounted = new Shebang(unit.Template);
unit.Add(mounted);
unit.MountedUnit = mounted;
mounted.SignIn(source);
return BranchStates.Done;
```
