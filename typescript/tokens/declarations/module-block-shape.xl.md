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
import { ConstKeywordShape } from "../keywords/const-keyword-shape.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { FunctionDeclarationShape } from "./function-declaration-shape.xl.md"
import { ImportEqualsDeclarationShape } from "./import-equals-declaration-shape.xl.md"
import { ImportDeclarationShape } from "./import-declaration-shape.xl.md"
import { ExportDeclarationShape } from "./export-declaration-shape.xl.md"
import { ModuleDeclarationShape } from "./module-declaration-shape.xl.md"
import { NamespaceExportDeclarationShape } from "./namespace-export-declaration-shape.xl.md"
import { InterfaceDeclarationShape } from "./interface-declaration-shape.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { DefaultKeywordShape } from "../keywords/default-keyword-shape.xl.md"
import { ExportAssignmentShape } from "./export-assignment-shape.xl.md"
import { TypeAliasDeclarationShape } from "./type-alias-declaration-shape.xl.md"
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

建模块体里的一个成员并 Add 进模块体。分派顺序：

1. 先看有没有 export 修饰（只吞一个），有就提出 ExportKeywordShape（Pos 取修饰词的 Pos）；
2. export as namespace（export as namespace X;）：TS 的 NamespaceExportDeclaration children 里没有 ExportKeyword，
   所以这个成员由本类直接调 NamespaceExportDeclarationShape.FromUnits（起始格含 export），修饰词不再插回；
3. import-equals（import x = require("n"); / export import x = require("n");）：调 ImportEqualsDeclarationShape.FromUnits，
   有 export 时仍按普通修饰词插回成员 Data 最前（TS 的 children 是 [ExportKeyword, Identifier, ExternalModuleReference]）；
   import x from "n" 形仍暂缓（ImportDeclaration 没有 FromUnits，需要 import 侧改动）；
4. 声明族（class / interface / enum / function / namespace / module）：从当前格往后扫第一个 { 括号单元当体，
   按关键字把 Data 下标交给对应形状的 FromUnits；namespace / module 交 ModuleDeclarationShape.FromUnits
   （它要 code / positions 两个数组，直接用本层非 trivia 单元与 Positions 切片）；Pos 用本层 Positions 覆盖，At 推到体之后；
5. 其余交 StatementBuilder.BuildStatement；
6. 有修饰词（且不是 namespace-export）时把它插到成员 Data 最前、Parent 指回去，并把成员 Pos 改回修饰词起点。

暂缓（原因见 docs）：function f(); 这类无体无返回类型的 ambient 函数、import x from "n" 成员。

```ts
const first = inner.At;
let modifier:Token | null = null;
let skipModifier = false;
const headUnit = first < inner.Units.length ? inner.Units[first] : null;
if (headUnit !== null && headUnit instanceof Common && (headUnit as Common).Is("export")) {
  modifier = ExportKeywordShape.FromBasicToken(headUnit as Common, context);
  (modifier as ShapeToken).Pos = inner.Positions[first];
  inner.At++;
}
let declStart = inner.At;
let unit = declStart < inner.Units.length ? inner.Units[declStart] : null;
let keyword = "";
if (unit !== null && unit instanceof Common) {
  keyword = (unit as Common).TempToString();
}
// `export default …` members: when `default` precedes a declaration keyword it is a second modifier
// (TS children: [ExportKeyword, DefaultKeyword, …]); when it precedes an expression the member is an
// ExportAssignment (children: just the expression). `export = <expr>` is an ExportAssignment too.
let defaultModifier:Token | null = null;
if (keyword === "default" && modifier !== null) {
  const afterDefault = declStart + 1 < inner.Units.length ? inner.Units[declStart + 1] : null;
  const afterText = afterDefault !== null && afterDefault instanceof Common ? (afterDefault as Common).TempToString() : "";
  if (afterText === "class" || afterText === "function" || afterText === "interface" || afterText === "enum") {
    const defaultUnit = unit as Common;
    defaultModifier = new DefaultKeywordShape(bracket.Template);
    if (defaultUnit.SourceRange.Start !== null) {
      (defaultModifier as ShapeToken).SignIn(defaultUnit.SourceRange.Start);
    }
    if (defaultUnit.SourceRange.End !== null) {
      (defaultModifier as ShapeToken).SignOut(defaultUnit.SourceRange.End);
    }
    (defaultModifier as ShapeToken).Pos = inner.Positions[declStart];
    defaultModifier.TryToClose(context);
    inner.At++;
    declStart = inner.At;
    unit = declStart < inner.Units.length ? inner.Units[declStart] : null;
    keyword = unit !== null && unit instanceof Common ? (unit as Common).TempToString() : "";
  }
}
// `const enum` / `declare const enum` member heads (enum shapes already accept the modifiers):
// detect them here so the member is routed to EnumDeclarationShape.FromUnits instead of
// StatementBuilder (statements never see the `const` + `enum` combination).
let constEnumMember = false;
if (keyword === "const") {
  const nextUnit = declStart + 1 < inner.Units.length ? inner.Units[declStart + 1] : null;
  constEnumMember = nextUnit !== null && nextUnit instanceof Common && (nextUnit as Common).Is("enum");
} else if (keyword === "declare") {
  const secondUnit = declStart + 1 < inner.Units.length ? inner.Units[declStart + 1] : null;
  const thirdUnit = declStart + 2 < inner.Units.length ? inner.Units[declStart + 2] : null;
  constEnumMember = secondUnit !== null && secondUnit instanceof Common && (secondUnit as Common).Is("const")
    && thirdUnit !== null && thirdUnit instanceof Common && (thirdUnit as Common).Is("enum");
}
// `[export] declare function f(...): R;` 成员头：FunctionDeclarationShape.FromUnits 接受 declare 修饰词，
// 但它的无体形态要求 ambience；这里识别出来走 semiInner 分支（FunctionDeclarationShape 自己的 declare 路径）。
let declareFunctionMember = false;
if (keyword === "declare") {
  const afterDeclare = declStart + 1 < inner.Units.length ? inner.Units[declStart + 1] : null;
  declareFunctionMember = afterDeclare !== null && afterDeclare instanceof Common && (afterDeclare as Common).Is("function");
}
let special:Token | null = null;
let specialEnd = -1;
if (keyword === "as") {
  // export as namespace X;  —— NamespaceExportDeclaration 的 children 没有 ExportKeyword
  for (let scan = declStart + 1; scan < inner.Units.length; scan++) {
    if (inner.IsSymbol(inner.Units[scan], ";")) {
      specialEnd = scan;
      break;
    }
  }
  if (specialEnd > declStart) {
    const dataStart = bracket.Data.indexOf(inner.Units[first]);
    const dataEnd = bracket.Data.indexOf(inner.Units[specialEnd]);
    special = NamespaceExportDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context);
    (special as ShapeToken).Pos = inner.Positions[first];
    skipModifier = true;
  }
} else if (keyword === "import") {
  let equalsAt = -1;
  for (let scan = declStart + 1; scan < inner.Units.length; scan++) {
    const scanned = inner.Units[scan];
    if (inner.IsSymbol(scanned, ";")) {
      break;
    }
    if (inner.IsSymbol(scanned, "=")) {
      equalsAt = scan;
      break;
    }
  }
  if (equalsAt > declStart) {
    for (let scan = declStart + 1; scan < inner.Units.length; scan++) {
      if (inner.IsSymbol(inner.Units[scan], ";")) {
        specialEnd = scan;
        break;
      }
    }
    if (specialEnd > declStart) {
      const dataStart = bracket.Data.indexOf(inner.Units[declStart]);
      const dataEnd = bracket.Data.indexOf(inner.Units[specialEnd]);
      special = ImportEqualsDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context);
      (special as ShapeToken).Pos = inner.Positions[declStart];
    }
  } else {
    // import x from "n"; / import {a} from "n"; / import * as ns from "n"; / import "n"; / import type {T} from "n";
    for (let scan = declStart + 1; scan < inner.Units.length; scan++) {
      if (inner.IsSymbol(inner.Units[scan], ";")) {
        specialEnd = scan;
        break;
      }
    }
    if (specialEnd > declStart) {
      const dataStart = bracket.Data.indexOf(inner.Units[declStart]);
      const dataEnd = bracket.Data.indexOf(inner.Units[specialEnd]);
      special = ImportDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context);
      (special as ShapeToken).Pos = inner.Positions[declStart];
    }
  }
} else if (modifier !== null && headUnit instanceof Common && (headUnit as Common).Is("export")
  && (unit instanceof Symbol && (unit as Symbol).Is("*")
    || unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{"
    || unit instanceof Common && (unit as Common).Is("type")
      && declStart + 1 < inner.Units.length
      && (inner.IsSymbol(inner.Units[declStart + 1], "*")
        || (inner.Units[declStart + 1] instanceof Bracket && (inner.Units[declStart + 1] as Bracket).StartBracketChar === "{")))) {
  // export * from "n"; / export { a }; / export * as ns from "n"; / export { a } from "n"; / export type * ...
  for (let scan = declStart + 1; scan < inner.Units.length; scan++) {
    if (inner.IsSymbol(inner.Units[scan], ";")) {
      specialEnd = scan;
      break;
    }
  }
  if (specialEnd > declStart) {
    const dataStart = bracket.Data.indexOf(inner.Units[first]);
    const dataEnd = bracket.Data.indexOf(inner.Units[specialEnd]);
    special = ExportDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context);
    (special as ShapeToken).Pos = inner.Positions[first];
    skipModifier = true;
  }
} else if (keyword === "type" || (keyword === "declare" && declStart + 1 < inner.Units.length
  && inner.Units[declStart + 1] instanceof Common && (inner.Units[declStart + 1] as Common).Is("type"))) {
  // 模块体内的类型别名：TypeAliasDeclarationShape.FromUnits 已接受 `[export] [declare] type` 前缀；
  // `export` 修饰词仍由本类在成员建好后插回 Data 最前（所以这里从 export 之后的 type 起始格开始）。
  for (let scan = declStart + 1; scan < inner.Units.length; scan++) {
    if (inner.IsSymbol(inner.Units[scan], ";")) {
      specialEnd = scan;
      break;
    }
  }
  if (specialEnd > declStart) {
    const dataStart = bracket.Data.indexOf(unit as Token);
    const dataEnd = bracket.Data.indexOf(inner.Units[specialEnd]);
    special = TypeAliasDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context);
    (special as ShapeToken).Pos = inner.Positions[declStart];
  }
} else if (modifier !== null && (keyword === "default" || (unit instanceof Symbol && (unit as Symbol).Is("=")))) {
  // `export = <expr>;` / `export default <expr>;` —— TS 的 ExportAssignment children 只有表达式，
  // export / default / `=` / `;` 都不投影，所以修饰词也不再插回 Data（skipModifier）。
  for (let scan = declStart + 1; scan < inner.Units.length; scan++) {
    if (inner.IsSymbol(inner.Units[scan], ";")) {
      specialEnd = scan;
      break;
    }
  }
  if (specialEnd > declStart) {
    const dataStart = bracket.Data.indexOf(inner.Units[first]);
    const dataEnd = bracket.Data.indexOf(inner.Units[specialEnd]);
    special = ExportAssignmentShape.FromUnits(bracket, dataStart, dataEnd, context);
    (special as ShapeToken).Pos = inner.Positions[first];
    skipModifier = true;
  }
}
let bodyInner = -1;
let semiInner = -1;
if (special === null
  && (keyword === "class" || keyword === "interface" || keyword === "enum" || keyword === "function"
    || keyword === "namespace" || keyword === "module" || constEnumMember || declareFunctionMember)) {
  for (let scan = declStart + 1; scan < inner.Units.length; scan++) {
    const scanned = inner.Units[scan];
    if (scanned instanceof Bracket && (scanned as Bracket).StartBracketChar === "{") {
      bodyInner = scan;
      break;
    }
    // 无体函数声明（ambient / 重载签名）：本层终结符是分号。
    if ((keyword === "function" || declareFunctionMember) && scanned instanceof Symbol && (scanned as Symbol).Is(";")) {
      semiInner = scan;
      break;
    }
  }
}
let member:Token;
if (special !== null) {
  member = special;
  inner.At = specialEnd + 1;
} else if (bodyInner > declStart) {
  const dataStart = bracket.Data.indexOf(unit as Token);
  const dataEnd = bracket.Data.indexOf(inner.Units[bodyInner]);
  if (keyword === "class") {
    member = ClassDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context);
  } else if (keyword === "interface") {
    member = InterfaceDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context);
  } else if (keyword === "enum" || constEnumMember) {
    member = EnumDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context);
    if (constEnumMember) {
      // EnumDeclarationShape computes modifier Pos from the PREVIOUS unit inside the bracket Data;
      // for the first member of a module body that scan finds nothing and falls back to 0, which is
      // wrong for `const` / `declare` (TS pos = previous non-trivia unit end + 1 in file全局口径).
      // Re-anchor the leading modifier children from this layer's Positions.
      let modifierPos = inner.Positions[declStart];
      for (const child of member.Data) {
        if (child instanceof ConstKeywordShape || child instanceof DeclareKeywordShape) {
          (child as ShapeToken).Pos = modifierPos;
          if (child.SourceRange.End !== null) {
            modifierPos = child.SourceRange.End.Index + 1;
          }
          continue;
        }
        break;
      }
    }
  } else if (keyword === "namespace" || keyword === "module") {
    member = ModuleDeclarationShape.FromUnits(
      inner.Units.slice(declStart, bodyInner + 1),
      inner.Positions.slice(declStart, bodyInner + 1),
      context,
    );
  } else {
    member = FunctionDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context);
  }
  (member as ShapeToken).Pos = inner.Positions[declStart];
  inner.At = bodyInner + 1;
} else if ((keyword === "function" || declareFunctionMember) && semiInner > declStart) {
  const dataStart = bracket.Data.indexOf(unit as Token);
  const dataEnd = bracket.Data.indexOf(inner.Units[semiInner]);
  const declared = FunctionDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context, ModuleBlockShape.InAmbientDeclaration(bracket));
  // 同 const enum：FunctionDeclarationShape 按「括号 Data 里前一个单元」推 modifier Pos，
  // 模块体首个成员会落到 0；这里用本层 Positions 把开头的 DeclareKeyword 重锚到 declare 起点。
  let declarePos = inner.Positions[declStart];
  for (const child of declared.Data) {
    if (child instanceof DeclareKeywordShape) {
      (child as ShapeToken).Pos = declarePos;
      if (child.SourceRange.End !== null) {
        declarePos = child.SourceRange.End.Index + 1;
      }
      continue;
    }
    break;
  }
  declared.Pos = inner.Positions[declStart];
  inner.At = semiInner + 1;
  member = declared;
} else {
  member = inner.BuildStatement();
}
if (modifier !== null && !skipModifier) {
  member.Data.splice(0, 0, modifier);
  modifier.Parent = member;
  if (defaultModifier !== null) {
    member.Data.splice(1, 0, defaultModifier);
    defaultModifier.Parent = member;
  }
  (member as ShapeToken).Pos = inner.Positions[first];
}
block.Add(member);
```

## private static method InAmbientDeclaration:(bracket:Bracket)=>bool

`bracket` 是模块体括号单元；看它所在宿主 `Data` 里、它之前的代码单元：第一个代码单元是 `declare`
（或 `export declare`）⇒ 这是一条 ambient 声明（`declare module "m"` / `declare namespace N`），
体内的无体函数可以省返回类型（`function f();`）。`bracket.Parent` 为空或找不到下标时按非 ambient 处理。

```ts
const parent = bracket.Parent;
if (parent === null) {
  return false;
}
const index = parent.Data.indexOf(bracket);
if (index < 0) {
  return false;
}
const texts:Array<string> = [];
for (let at = 0; at < index; at++) {
  const unit = parent.Data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  texts.push(unit instanceof Common ? (unit as Common).TempToString() : "");
  if (texts.length >= 2) {
    break;
  }
}
if (texts.length === 0) {
  return false;
}
if (texts[0] === "declare") {
  return true;
}
return texts[0] === "export" && texts.length > 1 && texts[1] === "declare";
```

