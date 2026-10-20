# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { ClassDeclarationShape } from "./class-declaration-shape.xl.md"
import { EnumDeclarationShape } from "./enum-declaration-shape.xl.md"
import { FunctionDeclarationShape } from "./function-declaration-shape.xl.md"
import { InterfaceDeclarationShape } from "./interface-declaration-shape.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { StatementBuilder } from "../statements/statement-builder.xl.md"
```

# namespace cangjie

# class ModuleBlockShape extends ShapeToken

```txt
namespace N { let a = 1; }
declare module "m" { export let x: number; }
namespace N { class C {} function f() {} }
```

模块体的 `{ … }`。它不在 `Data` 里留下 basic token：`{` 是**一个已经闭合的括号单元**，
里面的语句 / 声明由 `StatementBuilder` 与各声明形状的 `FromUnits` 在括号单元的 `Data` 上逐条递归建出来，
`{` / `}` 自己不进 AST 子节点（`ModuleBlock` 的 children 只有语句 / 声明）。

`Pos` 与 TS 同口径：`Pos = 前一个非 trivia 单元的 End.Index + 1`（含 `{` 前面的 trivia），
由调用方算好传进来；区间是括号单元自己的 `[{, }]`。

模块体里的成员有三类（chunk 2 + chunk 3）：

- 普通语句：交 `StatementBuilder.BuildStatement`（typed 变量 `let x: number;` 由 statements chunk 2 负责）；
- 带体声明：`class` / `interface` / `enum` / `function`——它们的体也是一个闭合的 `Bracket` 单元，
  所以先在本层扫出**第一个 `{` 括号单元**（参数表的 `(` 括号不算），再把 `Data` 下标交给各形状的
  `FromUnits(bracket, dataStart, dataEnd, context)`；返回后用本层 `Positions` 覆盖 `Pos`
  （`FromUnits` 只看 `host.Data` 前一个单元，索引从 0 起时会算成 0）；
- 带 `export` 修饰的成员：修饰词由本类提出、放进成员 `Data` 最前（TS 的 children 顺序是
  `[ExportKeyword, …成员自己的 children]`），成员 `Pos` 回到修饰词起点。

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
2. 声明族（`class` / `interface` / `enum` / `function`）：从当前格往后扫第一个 `{` 括号单元当体，
   按关键字把 `Data` 下标交给对应形状的 `FromUnits`；`Pos` 用本层 `Positions` 覆盖，`At` 推到体之后；
3. 其余交 `StatementBuilder.BuildStatement`；
4. 有修饰词时把它插到成员 `Data` 最前、`Parent` 指回去，并把成员 `Pos` 改回修饰词起点。

暂缓：`function f(): void;`（无体函数）在这里扫不到 `{` 括号，会落到 `BuildStatement`，
需要 declarations 侧的「声明 end 候选」才能收——本 chunk 不收这类成员。

```ts
const first = inner.At;
let modifier:Token | null = null;
const headUnit = first < inner.Units.length ? inner.Units[first] : null;
if (headUnit !== null && headUnit instanceof Common && (headUnit as Common).Is("export")) {
  modifier = ExportKeywordShape.FromBasicToken(headUnit as Common, context);
  (modifier as ShapeToken).Pos = inner.Positions[first];
  inner.At++;
}
const declStart = inner.At;
const unit = declStart < inner.Units.length ? inner.Units[declStart] : null;
let keyword = "";
if (unit !== null && unit instanceof Common) {
  keyword = (unit as Common).TempToString();
}
let bodyInner = -1;
let semiInner = -1;
if (keyword === "class" || keyword === "interface" || keyword === "enum" || keyword === "function") {
  for (let scan = declStart + 1; scan < inner.Units.length; scan++) {
    const scanned = inner.Units[scan];
    if (scanned instanceof Bracket && (scanned as Bracket).StartBracketChar === "{") {
      bodyInner = scan;
      break;
    }
    // 无体函数声明（ambient / 重载签名）：本层终结符是 `;`，`FunctionDeclarationShape.FromUnits` 认它以 `;` 收尾。
    if (keyword === "function" && scanned instanceof Symbol && (scanned as Symbol).Is(";")) {
      semiInner = scan;
      break;
    }
  }
}
let member:Token;
if (bodyInner > declStart) {
  const dataStart = bracket.Data.indexOf(unit as Token);
  const dataEnd = bracket.Data.indexOf(inner.Units[bodyInner]);
  if (keyword === "class") {
    member = ClassDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context);
  } else if (keyword === "interface") {
    member = InterfaceDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context);
  } else if (keyword === "enum") {
    member = EnumDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context);
  } else {
    member = FunctionDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context);
  }
  (member as ShapeToken).Pos = inner.Positions[declStart];
  inner.At = bodyInner + 1;
} else if (keyword === "function" && semiInner > declStart) {
  const dataStart = bracket.Data.indexOf(unit as Token);
  const dataEnd = bracket.Data.indexOf(inner.Units[semiInner]);
  const declared = FunctionDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context);
  declared.Pos = inner.Positions[declStart];
  inner.At = semiInner + 1;
  member = declared;
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
