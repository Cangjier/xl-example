# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { InterfaceDeclarationShape } from "./interface-declaration-shape.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { StatementBuilder } from "../statements/statement-builder.xl.md"
```

# namespace cangjie

# class ModuleBlockShape extends ShapeToken

```txt
namespace N { let a = 1; }
declare module "m" { export let x: number; }
```

模块体的 `{ … }`。它不在 `Data` 里留下 basic token：`{` 是**一个已经闭合的括号单元**，
里面的语句由 `StatementBuilder` 在括号单元的 `Data` 上逐条递归建出来，`{` / `}` 自己不进 AST 子节点
（`ModuleBlock` 的 children 只有语句 / 声明）。

`Pos` 与 TS 同口径：`Pos = 前一个非 trivia 单元的 End.Index + 1`（含 `{` 前面的 trivia），
由调用方算好传进来；区间是括号单元自己的 `[{, }]`。

模块体里的成员有三类（chunk 2）：

- 普通语句：交 `StatementBuilder.BuildStatement`（typed 变量 `let x: number;` 由 statements chunk 2 负责）；
- 带 `export` 修饰的语句：修饰词由本类提出、放进语句 `Data` 最前（`VariableStatement` 的 TS children 是
  `[ExportKeyword, VariableDeclarationList]`），语句 `Pos` 回到修饰词起点；
- 接口声明：`interface I {}` 及其 `export interface` 形态，交 `InterfaceDeclarationShape.FromUnits`
  （只认空体；成员未实现），`Pos` 用本层的位置表覆盖（`FromUnits` 只看 `host.Data` 前一个单元，索引从 0 起时会算成 0）。

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBracket:(bracket:Bracket, pos:int, context:SyntaxContext)=>ModuleBlockShape

把闭合的 `{ … }` 括号单元转成 `ModuleBlock`：

1. 签入签出用括号单元自己的首尾（`ModuleBlock` 的区间就是 `{` … `}`）；
2. `Pos` 由调用方给（见上）；
3. 括号单元的 `Data` 交给 `StatementBuilder`，**逐个成员**建（`BuildMember`）；
4. 成员 `Add` 成子节点后关闭自己。

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
  ModuleBlockShape.BuildMember(inner, bracket, shape, context);
}
shape.TryToClose(context);
return shape;
```

## static method BuildMember:(inner:StatementBuilder, bracket:Bracket, block:ModuleBlockShape, context:SyntaxContext)=>void

建模块体里的一个成员并 `Add` 进模块体。分派顺序：

1. 先看有没有 `export` 修饰（只吞一个），有就提出 `ExportKeywordShape`（`Pos` 取修饰词的 `Pos`）；
2. `interface` + 名字 + `{}`（空体）→ `InterfaceDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context)`，
   再用本层 `Positions` 覆盖 `Pos`；
3. 其余交 `StatementBuilder.BuildStatement`；
4. 有修饰词时把它插到成员 `Data` 最前、`Parent` 指回去，并把成员 `Pos` 改回修饰词起点。

```ts
const first = inner.At;
let modifier:Token | null = null;
const headUnit = first < inner.Units.length ? inner.Units[first] : null;
if (headUnit !== null && headUnit instanceof Common && (headUnit as Common).Is("export")) {
  modifier = ExportKeywordShape.FromBasicToken(headUnit as Common, context);
  (modifier as ShapeToken).Pos = inner.Positions[first];
  inner.At++;
}
let member:Token;
const unit = inner.At < inner.Units.length ? inner.Units[inner.At] : null;
const isInterface = unit !== null
  && unit instanceof Common
  && (unit as Common).Is("interface")
  && inner.At + 2 < inner.Units.length
  && inner.Units[inner.At + 1] instanceof Common
  && inner.Units[inner.At + 2] instanceof Bracket
  && (inner.Units[inner.At + 2] as Bracket).StartBracketChar === "{";
if (isInterface) {
  const dataStart = bracket.Data.indexOf(unit);
  const dataEnd = bracket.Data.indexOf(inner.Units[inner.At + 2]);
  member = InterfaceDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context);
  (member as ShapeToken).Pos = inner.Positions[inner.At];
  inner.At += 3;
} else {
  member = inner.BuildStatement();
}
if (modifier !== null) {
  member.Data.splice(0, 0, modifier);
  modifier.Parent = member;
  (member as ShapeToken).Pos = inner.Positions[first];
}
block.Add(member);
```
