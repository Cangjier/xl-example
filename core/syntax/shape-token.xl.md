# dependencies
```xl
import { BranchStates } from "./branch-states.xl.md"
import { CloseStates } from "./close-states.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Template } from "./templates/template.xl.md"
import { UnitToken } from "./unit-token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 AST 行。

形状单元：形状建出来的单元的公共基类——建成之后仍然吃字符，跳转队列就是 basic token 那一条。

# class ShapeToken extends UnitToken

## field Pos:int = -1

AST 的起始位置（**含前导 trivia**，与 TS 的 `pos` 一致）：建形状时按「前一个非 trivia 单元的
`SourceRange.EndIndex`」算出来（半开口径，等价旧的 `End.Index + 1`）；首个为 `0`，`-1` 表示还没算。

它独立于 `SourceRange`：后者是**代码**的半开区间 `[Start, End)`，前者是 AST 要的半开区间起点。

## constructor:(template:Template)=>void

以模板创建，并接上 basic token 的跳转队列。

```ts
super(template);
this.ProcessQueue = Template.BasicBranchQueue();
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>void

所有跳转都不接手时的兜底：**什么都不做**。

空白（空格 / `\t` / `\r` / `\n`）没有专门的单元，它们不产生 token、也不进入任何形状的 `Data`，就由此处吞掉；其余字符（例如标点之外的怪字符）同样静默放过。

「吞掉」由 `UnitToken.Process` 的统一 `+1` 完成：`Default` 不碰 `context.Index`，调度层把当前字符算作已消费。

这条与旧语言层的 `Root.Default` 一致：源码里的空白不是语法结构，判形状时不该看见它。

不写 ts 体，打印器产出空方法。

## method TryToClose:(context:SyntaxContext)=>CloseStates

关闭前**自检范围**：终点还没定就用「最后一个子单元的终点」补上，没有子单元就退到「自己处理过的最后一个下标 + 1」。

**为什么由形状自己补、而不是父级替它签出。** 终点是形状自己的事实：情况一里 `BuildByIndex` 已经 `SignOut`；情况二里 `ExitOrPre` 命中终结符时 `SignOut`；只有情况三（挂载着一直没命中终结符就走到文件末尾）才需要补。补不出来（一个字符都没吃过、也没有子单元）就**照原样抛**——那是真的推不出，不该被父级悄悄盖掉。

补完再交给基类的检查与 `Close`：`Close` 里做的「从 `Data` 提取字段」因此总能读到已定的范围。

```ts
if (this.SourceRange.End < 0) {
  const last = this.Last();
  if (last !== null && last.SourceRange.End >= 0) {
    this.SourceRange.End = last.SourceRange.End;
  } else if (this.LastIndex >= 0) {
    this.SourceRange.End = this.LastIndex + 1;
  }
}
return super.TryToClose(context);
```

## protected method Close:(context:SyntaxContext)=>CloseStates

默认关闭：只把自己标记为已关闭。

形状自己不建别的形状，所以恒返回 `CloseStates.Nothing`；需要「关闭时提取字段」的形状覆写这一条，做完再 `return CloseStates.Nothing`。

```ts
this.Closed = true;
return CloseStates.Nothing;
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

形状默认「退出」由终结候选（`Close`）决定，自己不在 `ExitOrPre` 里拦字符。

```ts
return BranchStates.Undo;
```

## method AstPos:()=>int | null

AST 起点：形状自己有 `Pos` 字段，直接交给 `Token.AstLabel` 打印。

`-1`（还没算出来）会印成 `pos=-`——`SourceFileShape` 就是这一档；已算出来的形状印数字，例如 `VariableStatementShape  pos=0`。

```ts
return this.Pos;
```

## method AstText:()=>string

形状的文本：有 `Text` 字段的形状（`NumericLiteralShape` / `StringLiteralShape` / `BigIntLiteralShape` / 模板串三段 …）取它，没有就是空串。

**为什么用字段探测而不是每个形状各写一条**：约七十个 `*TokenShape` 只声明 `Op`、不声明 `Text`，逐个覆写没有意义；`IdentifierShape` 用的是 `EscapedText`，它在自己那一层再覆写。

```ts
const text = (this as any).Text;
return typeof text === "string" ? text : "";
```

## method AstOperator:()=>string

运算符文本：声明了 `Op` 的形状（`AsteriskTokenShape` / `PlusTokenShape` 等）取它，没有就是空串。

```ts
const op = (this as any).Op;
return typeof op === "string" ? op : "";
```
