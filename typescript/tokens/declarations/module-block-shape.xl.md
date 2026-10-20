# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { StatementBuilder } from "../statements/statement-builder.xl.md"
```

# namespace cangjie

# class ModuleBlockShape extends ShapeToken

```txt
namespace N { let a = 1; }
```

模块体的 `{ … }`。它不在 `Data` 里留下 basic token：`{` 是**一个已经闭合的括号单元**，
里面的语句由 `StatementBuilder` 在括号单元的 `Data` 上逐条递归建出来，`{` / `}` 自己不进 AST 子节点
（`ModuleBlock` 的 children 只有语句）。

`Pos` 与 TS 同口径：`Pos = 前一个非 trivia 单元的 End.Index + 1`（含 `{` 前面的 trivia），
由调用方算好传进来；区间是括号单元自己的 `[{, }]`。

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBracket:(bracket:Bracket, pos:int, context:SyntaxContext)=>ModuleBlockShape

把闭合的 `{ … }` 括号单元转成 `ModuleBlock`：

1. 签入签出用括号单元自己的首尾（`ModuleBlock` 的区间就是 `{` … `}`）；
2. `Pos` 由调用方给（见上）；
3. 括号单元的 `Data` 交给 `StatementBuilder`，**逐条**建语句——每条语句到齐的位置由
   `StatementBuilder` 自己在括号层判（块里不再走根候选，所以 `lbl: b;` 这种标签语句在这里也能建）；
4. 语句单元 `Add` 成子节点后关闭自己。

```ts
const shape = new ModuleBlockShape(bracket.Template);
if (bracket.SourceRange.Start !== null) {
  shape.SignIn(bracket.SourceRange.Start);
}
if (bracket.SourceRange.End !== null) {
  shape.SignOut(bracket.SourceRange.End);
}
shape.Pos = pos;
const inner = new StatementBuilder(bracket.Template, context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
while (inner.At < inner.Units.length) {
  shape.Add(inner.BuildStatement());
}
shape.TryToClose(context);
return shape;
```
