# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { DeferredBracketCatalog } from "../statements/deferred-bracket-catalog.xl.md"
import { ArrowParamsCatalog } from "./forms/primary/arrow-params-catalog.xl.md"
```

# namespace cangjie

# class ArrowFunctionShape extends ShapeToken

```txt
let f = () => 1;
```

## constructor:(template:Template)=>void

```ts
super(template);
```

## method TryToClose:(context:SyntaxContext)=>CloseStates

[R7] 增量路径的箭头在 EOF 收口时可能还挂着**没关过的子形状**（嵌套箭头的内层、体表达式根由父层
`builtShape.TryToClose` 一次性关掉，父层只关自己、不递归）。这里先按**由内向外**关闭还没关闭的子形状
（只关形状，basic 单元保持原样——它们的 `Close` 会去问父目录，不该在收口时被触发），再摘掉尾随 trivia
（`ShapeToken.TryToClose` 用最后一个子单元的终点补右边界，尾随空白的终点不是箭头的终点）。

legacy 路径在这里逐字不变：`FromUnits` 建出的箭头子单元都已关闭，循环是空转，`Closed == true` 时整段跳过。

```ts
if (!this.Closed) {
  for (let at = this.Data.length - 1; at >= 0; at--) {
    const unit = this.Data[at];
    if (!unit.Closed && !unit.IsBasicToken) {
      unit.TryToClose(context);
    }
  }
  while (this.Data.length > 0 && this.Data[this.Data.length - 1].IsTriviaToken) {
    this.Data.splice(this.Data.length - 1, 1);
  }
}
const state = super.TryToClose(context);
// EOF 收口时驱动层先按文件长度 `SignOut` 整棵树，箭头因此可能被签出到尾随空白之后
// （`const f = a => a + 1\n` 的 21 而不是 20）。`Data` 现在只有代码子单元，收回最后一个代码子单元的终点。
this.TrimEndToLastCode();
return state;
```

## static method BindParameterBracket:(bracket:Token, context:SyntaxContext)=>bool

**[B4d] 箭头形参 `(` 的 Deferred replay 入口：`=>` 确定的那一格调 `DeferredBracketCatalog.Bind`。**

调用点是 `ArrowPossibleShape.BuildByIndex` 的「前一个代码单元是箭头形参括号」分支
（那一格 `=>` 已经是一个 `Symbol("=>")` 单元，形参表的归属不再存疑，A2 §3 #5 的判定事件）。

**为什么是 `static`（为什么没有 `this`）**：`=>` 到达这一格，持有形参表的 `ArrowFunctionShape`
**还不存在**——带括号的箭头整条由 legacy `ExpressionBuilder.ParseArrowFromBracket` 在收口格建出
（B4b §5.2 第 3 条：`BuildParameters` 与建树是同一拍）。本方法因此只做「把 `(` 里攒下的 raw
单元 replay 成 `ParameterShape`」，**不建箭头、不改父单元 `Data`**；箭头形状仍是 legacy 建的，
它读到的 `bracket.Data` 里已是 `ParameterShape`（`expression-builder` 的 `ParseFunctionParameters`
新增了一条「已是 `ParameterShape` 就直接收下」的分支）。

**一次**：`DeferredBracketCatalog.Bind` 内部按 R1（`bracket.ReplayCount > 0` 即返回 0）保证
同一条括号最多 replay 一次；重复的 `=>`（`(a) => (b) => c` 的内层是另一条括号，各有各的条目）
不会重复消费同一条括号。

返回 `true` = 这一次真的建出了形参。

```ts
if (bracket === null) {
  return false;
}
return ArrowParamsCatalog.BindArrowParen(bracket, context);
```

## static method Report:()=>string

[B4d] 只读读数：本类一侧的计数镜像（`ArrowParamsCatalog` 与 `DeferredBracketCatalog`）。

```ts
return ArrowParamsCatalog.Report() + " | " + DeferredBracketCatalog.Report();
```
