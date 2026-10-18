# dependencies
```xl
import { CloseStates } from "./close-states.xl.md"
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Template } from "./templates/template.xl.md"
import { UnitToken } from "./unit-token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

形状单元：形状建出来的单元的公共基类——建成之后仍然吃字符，跳转队列就是 basic token 那一条。

# class ShapeToken extends UnitToken

## field Pos:int = -1

AST 的起始位置（**含前导 trivia**，与 TS 的 `pos` 一致）：建形状时按「前一个非 trivia 单元的
`End.Index + 1`」算出来；`-1` 表示还没算。

它独立于 `SourceRange`：后者是**代码**的闭区间，前者是 AST 要的半开区间起点。

## constructor:(template:Template)=>void

以模板创建，并接上 basic token 的跳转队列。

```ts
super(template);
this.ProcessQueue = Template.BasicBranchQueue();
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

所有跳转都不接手时的兜底：**什么都不做**。

空白（空格 / `\t` / `\r` / `\n`）没有专门的单元，它们不产生 token、也不进入任何形状的 `Data`，就由此处吞掉；其余字符（例如标点之外的怪字符）同样静默放过。

这条与旧语言层的 `Root.Default` 一致：源码里的空白不是语法结构，判形状时不该看见它。

不写 ts 体，打印器产出空方法。

## method TryToClose:()=>CloseStates

关闭前**自检范围**：终点还没定就用「最后一个子单元的终点」补上，没有子单元就退到「自己处理过的最后一个位置」。

**为什么由形状自己补、而不是父级替它签出。** 终点是形状自己的事实：情况一里 `BuildByIndex` 已经 `SignOut`；情况二里 `ExitOrPre` 命中终结符时 `SignOut`；只有情况三（挂载着一直没命中终结符就走到文件末尾）才需要补。补不出来（一个字符都没吃过、也没有子单元）就**照原样抛**——那是真的推不出，不该被父级悄悄盖掉。

补完再交给基类的检查与 `Close`：`Close` 里做的「从 `Data` 提取字段」因此总能读到已定的范围。

```ts
if (this.SourceRange.End === null) {
  const last = this.Last();
  const tail = last !== null && last.SourceRange.End !== null ? last.SourceRange.End : this.LastSource;
  if (tail !== null) {
    this.SourceRange.End = tail;
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

