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

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

BOM basic token：认领配置里的 BOM 字符（默认 `U+FEFF` / `U+FFFE`，见 `Template.BomChars`）——**任意位置都认**（用户裁定②：对齐 TS，U+FEFF 属 ECMAScript Whitespace；旧判据「`source.Index === 0` 或前面只有 trivia」已取消）。
它是 trivia（`IsTriviaToken`）：不产生 AST 节点，吞掉那一个字符后立刻关闭；后续字符照常交给根单元。

TS 的 BOM 是文件头 trivia；它的位置口径按**原文**（BOM 也算一个字符，后续 token 的 index 不前移）。

# class Bom extends UnitToken

BOM 单元。

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

已吞掉的字符（单字符 BOM）。

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>void

跳转队列没接手时，把字符并进 `Tmp`。

`value` 是驱动层已经读好的当前字符（`buffer.ValueAt(index)`）：直接追加，不再复读。

```ts
this.Tmp += value;
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

BOM 单元不再接受任何字符（单字符、签出即关闭），一律让路。

```ts
return BranchStates.Undo;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

关闭：只把自己标记为已关闭，然后**只问父单元**要不要重算候选。

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

## static method CanStart:(unit:Token, value:string)=>bool

能不能以这个字符起一个 `Bom`：`value` 在 `unit.Template.BomChars` 里即可——**任意位置都认**（用户裁定②：对齐 TS，
U+FEFF 属 ECMAScript Whitespace；BOM 是 trivia，不构成代码 token 的边界）。

历史：旧判据是「`source.Index === 0` 或 `unit.Data` 里已有的单元**全是 trivia**（尚无代码 token）」，
mid-code BOM 不认；用户裁定②（§5 item 4 方案②「放宽 Bom 起始判据」）取消了该位置限制，
`const a = 1;\uFEFFconst b = 2;` 这类 mid-code BOM 现在也按 trivia 跳过。

```ts
if (!unit.Template.BomChars.includes(value)) {
  return false;
}
return true;
```

## static method Transit:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, value:string)=>BranchStates

判据见 `CanStart`：当前字符在 `unit.Template.BomChars` 里即可（**任意位置**，用户裁定②）。

认下就先按 trivia 的边界口径**收尾上一个未关闭的单元**（与 `WrapSymbol` / `Symbol` 的 `Transit` 同一套）：

- 收尾建出了形状（`CloseStates.Built`）⇒ 当前这一格属于**新宿主**，不能把 `Bom` 挂进正在关闭的旧宿主。
  返回 `BranchStates.Reload`，让驱动层重放这一格；重放时 `Bom` 会落到新宿主（通常是根）下。
- 否则才挂一个新的 `Bom`，立刻按同一个字符签入、签出并关闭；它是 trivia，之后所有字符回到根单元。

**为什么必须先收尾**：BOM 夹在两个 token 中间时，它前面的那个单元（往往是收尾符号 `;`）
正等着「下一个字符」来触发关闭。若不先问它，`Bom` 就会被塞进那个还开着的形状的 `Data` 末尾，
把它推到「最后一个子单元」的位置上——候选判定看到的最后一个单元成了 BOM，
那个 `;` 的收尾就再也不会发生：语句边界停在 BOM 之前，后面的代码整段并进上一条语句的壳。
BOM 本身是 trivia，不该改变任何 token 的边界；它只该在边界**已经定下来之后**被跳过。

```ts
if (!Bom.CanStart(unit, value)) {
  return BranchStates.Undo;
}
const last = unit.Last();
if (last !== null && !last.Closed && last.TryToClose(context) === CloseStates.Built) {
  return BranchStates.Reload;
}
const mounted = new Bom(unit.Template);
unit.Add(mounted);
mounted.SignIn(index);
mounted.SignOut(index + 1);
mounted.TryToClose(context);
return BranchStates.Done;
```
