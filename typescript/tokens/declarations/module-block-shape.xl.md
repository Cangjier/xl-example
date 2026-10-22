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
import { AbstractKeywordShape } from "../keywords/abstract-keyword-shape.xl.md"
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
import { StatementScanner } from "../statements/statement-scanner.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
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
  // `export default abstract class C {}` / `export default async function f() {}`：`default` 后面的
  // 声明词也可能是 `abstract` / `async`（TS 的 children 是 [ExportKeyword, DefaultKeyword,
  // AbstractKeyword/AsyncKeyword, …]），所以这两个也要认成「default 后跟声明」。
  if (afterText === "class" || afterText === "function" || afterText === "interface"
    || afterText === "enum" || afterText === "abstract" || afterText === "async") {
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
// `declare <decl>` / `abstract class` 成员（.d.ts 常态：模块/命名空间体里的 `declare class C {}` /
// `declare interface I {}` / `declare enum E {}` / `declare namespace N {}` / `declare module "m" {}` /
// `abstract class C {}`）：分派关键字取修饰词之后的声明词，但 Data 起点仍保留修饰词 ——
// 各声明形状的 FromUnits 都接受 declare / abstract 修饰词（TS 的 children 里修饰词也在最前）。
if (keyword === "declare" || keyword === "abstract") {
  let look = declStart + 1;
  while (look < inner.Units.length && inner.Units[look] instanceof Common) {
    const lookText = (inner.Units[look] as Common).TempToString();
    if (lookText === "abstract" || lookText === "async") {
      look++;
      continue;
    }
    break;
  }
  if (look < inner.Units.length && inner.Units[look] instanceof Common) {
    const lookText = (inner.Units[look] as Common).TempToString();
    if (lookText === "class" || lookText === "interface" || lookText === "enum"
      || lookText === "namespace" || lookText === "module" || lookText === "function") {
      keyword = lookText;
    }
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
  } else {
    // 块体里 `export as namespace X` 也可以无分号收口（ambient 模块体 / namespace 体常态：
    // `export as namespace X` 换行接下一个成员，或直接紧随 `}` / 体末）。TS 文法里名字只有一格，
    // 段末就是名字单元；NamespaceExportDeclarationShape.FromUnits 要求末尾是 `;`，这里补一个
    // 零宽合成 `;` 再走正常入口——与顶层 source-file-end-possible-shape 的 isExportAsNamespace 分支、
    // 以及本类 import= / type 别名的无分号路径同款；合成 `;` 建完立即从 bracket.Data 摘掉。
    const asNameInner = declStart + 2;
    if (asNameInner < inner.Units.length) {
      const asNameUnit = inner.Units[asNameInner];
      const asNameEnd = asNameUnit.SourceRange.End;
      if (asNameEnd !== null) {
        const asDataStart = bracket.Data.indexOf(inner.Units[first]);
        const asSemiAt = bracket.Data.indexOf(asNameUnit) + 1;
        const asSemi = new Symbol(bracket.Template);
        asSemi.SignIn(asNameEnd);
        asSemi.AppendValueAndSignOut(";", asNameEnd);
        bracket.Data.splice(asSemiAt, 0, asSemi);
        special = NamespaceExportDeclarationShape.FromUnits(bracket, asDataStart, asSemiAt, context);
        (special as ShapeToken).Pos = inner.Positions[first];
        bracket.Data.splice(asSemiAt, 1);
        skipModifier = true;
        specialEnd = asNameInner;
      }
    }
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
    // 块体里 import-equals 也可以无分号收口：`;` / 换行后下一个成员首词 / 块尾 三选一。
    let endInner = specialEnd;
    let syntheticSemi = false;
    if (endInner < 0) {
      for (let scan = declStart + 1; scan < inner.Units.length; scan++) {
        const scanned = inner.Units[scan];
        if (scan > declStart + 1 && scanned instanceof Common
          && ModuleBlockShape.IsMemberStartWord((scanned as Common).TempToString())
          && !StatementScanner.NoLineBreakBetween(inner.Units[scan - 1], scanned)) {
          endInner = scan - 1;
          break;
        }
      }
      if (endInner < 0) {
        endInner = inner.Units.length - 1;
      }
      syntheticSemi = true;
    }
    if (endInner > declStart) {
      // `export import x = …`：export 修饰词由 ImportEqualsDeclarationShape 自己投影（TS 的 children
      // 是 [ExportKeyword, Identifier, …]），所以起点要含 export、末尾不再由本层插修饰词。
      const startInner = modifier !== null ? first : declStart;
      const dataStart = bracket.Data.indexOf(inner.Units[startInner]);
      let dataEnd = bracket.Data.indexOf(inner.Units[endInner]);
      if (syntheticSemi) {
        const endSource = inner.Units[endInner].SourceRange.End;
        if (endSource !== null) {
          const semi = new Symbol(bracket.Template);
          semi.SignIn(endSource);
          semi.AppendValueAndSignOut(";", endSource);
          bracket.Data.splice(dataEnd + 1, 0, semi);
          dataEnd++;
        } else {
          syntheticSemi = false;
        }
      }
      special = ImportEqualsDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context);
      (special as ShapeToken).Pos = inner.Positions[startInner];
      if (modifier !== null) {
        // ExportKeyword 的 Pos：FromUnits 按 `bracket.Data` 里前一个单元推，块体首个成员会落到 0；
        // 这里用本层 Positions 重锚到 export 的起点（与 const enum / declare function 同款）。
        for (const child of special.Data) {
          if (child instanceof ExportKeywordShape) {
            (child as ShapeToken).Pos = inner.Positions[first];
            break;
          }
        }
      }
      if (syntheticSemi) {
        bracket.Data.splice(dataEnd, 1);
      }
      specialEnd = endInner;
      if (modifier !== null) {
        skipModifier = true;
      }
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
    } else {
      // 无分号的 import 声明（ambient 模块体常态：`import { B } from "b"` ⏎ 下一个成员）：
      // 段末取「换行后的下一个成员首词」或块尾，补一个零宽合成 `;` 交给 ImportDeclarationShape。
      let endInner = -1;
      for (let scan = declStart + 1; scan < inner.Units.length; scan++) {
        const scanned = inner.Units[scan];
        if (scan > declStart + 1 && scanned instanceof Common
          && ModuleBlockShape.IsMemberStartWord((scanned as Common).TempToString())
          && !StatementScanner.NoLineBreakBetween(inner.Units[scan - 1], scanned)) {
          endInner = scan - 1;
          break;
        }
      }
      if (endInner < 0) {
        endInner = inner.Units.length - 1;
      }
      const endSource = inner.Units[endInner].SourceRange.End;
      if (endInner > declStart && endSource !== null) {
        const dataStart = bracket.Data.indexOf(inner.Units[declStart]);
        const dataEnd = bracket.Data.indexOf(inner.Units[endInner]);
        const syntheticSemi = new Symbol(bracket.Template);
        syntheticSemi.SignIn(endSource);
        syntheticSemi.AppendValueAndSignOut(";", endSource);
        bracket.Data.splice(dataEnd + 1, 0, syntheticSemi);
        special = ImportDeclarationShape.FromUnits(bracket, dataStart, dataEnd + 1, context);
        bracket.Data.splice(dataEnd + 1, 1);
        (special as ShapeToken).Pos = inner.Positions[declStart];
        specialEnd = endInner;
      }
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
  // 无分号（ambient 模块体常态：`export { a }` ⏎ 下一个成员 / 体末）：段末取「换行后的下一个成员首词」
  // 或块尾，补一个零宽合成 `;` 再交给 ExportDeclarationShape。分段时同时看 `;` 与「换行后的成员首词」，
  // 不能在 `;` 上盲扫——`export { a }` ⏎ `let b = 1;` 的 `;` 属于下一个成员。
  let endInner = -1;
  let syntheticSemi = false;
  for (let scan = declStart + 1; scan < inner.Units.length; scan++) {
    if (inner.IsSymbol(inner.Units[scan], ";")) {
      endInner = scan;
      break;
    }
    const scanned = inner.Units[scan];
    if (scan > declStart && scanned instanceof Common
      && ModuleBlockShape.IsMemberStartWord((scanned as Common).TempToString())
      && !StatementScanner.NoLineBreakBetween(inner.Units[scan - 1], scanned)) {
      endInner = scan - 1;
      syntheticSemi = true;
      break;
    }
  }
  if (endInner < 0) {
    endInner = inner.Units.length - 1;
    syntheticSemi = true;
  }
  if (endInner >= declStart) {
    const dataStart = bracket.Data.indexOf(inner.Units[first]);
    let dataEnd = bracket.Data.indexOf(inner.Units[endInner]);
    if (syntheticSemi) {
      const endSource = inner.Units[endInner].SourceRange.End;
      if (endSource !== null) {
        const semi = new Symbol(bracket.Template);
        semi.SignIn(endSource);
        semi.AppendValueAndSignOut(";", endSource);
        bracket.Data.splice(dataEnd + 1, 0, semi);
        dataEnd++;
      } else {
        syntheticSemi = false;
      }
    }
    special = ExportDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context);
    (special as ShapeToken).Pos = inner.Positions[first];
    skipModifier = true;
    specialEnd = endInner;
    if (syntheticSemi) {
      bracket.Data.splice(dataEnd, 1);
    }
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
  if (specialEnd < 0) {
    // 无分号的 ambient 类型别名（`declare namespace N { export type T = A | B }`）：
    // 结束于换行后的下一个成员首词或体末尾；FromUnits 要求末尾是 `;`，这里补一个零宽合成 `;`。
    let endInner = -1;
    for (let scan = declStart + 2; scan < inner.Units.length; scan++) {
      const scanned = inner.Units[scan];
      if (scanned instanceof Common && ModuleBlockShape.IsMemberStartWord((scanned as Common).TempToString())
        && !StatementScanner.NoLineBreakBetween(inner.Units[scan - 1], scanned)) {
        endInner = scan - 1;
        break;
      }
    }
    if (endInner < 0) {
      endInner = inner.Units.length - 1;
    }
    const endUnit = inner.Units[endInner];
    const endSource = endUnit.SourceRange.End;
    if (endSource !== null) {
      const dataEnd = bracket.Data.indexOf(endUnit);
      const dataStart = bracket.Data.indexOf(unit as Token);
      const syntheticSemi = new Symbol(bracket.Template);
      syntheticSemi.SignIn(endSource);
      syntheticSemi.AppendValueAndSignOut(";", endSource);
      bracket.Data.splice(dataEnd + 1, 0, syntheticSemi);
      special = TypeAliasDeclarationShape.FromUnits(bracket, dataStart, dataEnd + 1, context);
      (special as ShapeToken).Pos = inner.Positions[declStart];
      bracket.Data.splice(dataEnd + 1, 1);
      specialEnd = endInner;
    }
  } else if (specialEnd > declStart) {
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
  // 块体里 export= / export default 也可以无分号收口（`export default y` ⏎ `}` / 下一个成员）：
  // 段末取「换行后的下一个成员首词」或块尾，补一个零宽合成 `;` 交给 ExportAssignmentShape。
  let endInner = specialEnd;
  let syntheticSemi = false;
  if (endInner < 0) {
    for (let scan = declStart + 1; scan < inner.Units.length; scan++) {
      const scanned = inner.Units[scan];
      if (scan > declStart + 1 && scanned instanceof Common
        && ModuleBlockShape.IsMemberStartWord((scanned as Common).TempToString())
        && !StatementScanner.NoLineBreakBetween(inner.Units[scan - 1], scanned)) {
        endInner = scan - 1;
        break;
      }
    }
    if (endInner < 0) {
      endInner = inner.Units.length - 1;
    }
    syntheticSemi = true;
  }
  if (endInner > declStart) {
    const dataStart = bracket.Data.indexOf(inner.Units[first]);
    let dataEnd = bracket.Data.indexOf(inner.Units[endInner]);
    if (syntheticSemi) {
      const endSource = inner.Units[endInner].SourceRange.End;
      if (endSource !== null) {
        const semi = new Symbol(bracket.Template);
        semi.SignIn(endSource);
        semi.AppendValueAndSignOut(";", endSource);
        bracket.Data.splice(dataEnd + 1, 0, semi);
        dataEnd++;
      } else {
        syntheticSemi = false;
      }
    }
    special = ExportAssignmentShape.FromUnits(bracket, dataStart, dataEnd, context);
    (special as ShapeToken).Pos = inner.Positions[first];
    skipModifier = true;
    specialEnd = endInner;
    if (syntheticSemi) {
      bracket.Data.splice(dataEnd, 1);
    }
  }
}
let bodyInner = -1;
let semiInner = -1;
let tailInner = -1;
if (special === null
  && (keyword === "class" || keyword === "interface" || keyword === "enum" || keyword === "function"
    || keyword === "namespace" || keyword === "module" || keyword === "global"
    || constEnumMember || declareFunctionMember)) {
  for (let scan = declStart + 1; scan < inner.Units.length; scan++) {
    const scanned = inner.Units[scan];
    // 只有「前一个单元能收住一个类型」的 `{` 才是声明体；类型里的对象字面量
    // （`function f(): {a: A}` / 泛型默认值 `= {}` / 类型实参）不是体。
    if (scanned instanceof Bracket && (scanned as Bracket).StartBracketChar === "{"
      && TypeBuilder.IsBodyBrace(inner.Units, scan)) {
      bodyInner = scan;
      break;
    }
    // 无体函数声明（ambient / 重载签名）：本层终结符是分号。
    if ((keyword === "function" || declareFunctionMember) && scanned instanceof Symbol && (scanned as Symbol).Is(";")) {
      semiInner = scan;
      break;
    }
    // 无分号的 ambient 函数（namespace 体常态：`function f(): B` 换行接下一个成员）：
    // 换行之后出现新成员的首词时，本函数签名收在前一个单元。
    if ((keyword === "function" || declareFunctionMember) && scan > declStart + 1
      && scanned instanceof Common && ModuleBlockShape.IsMemberStartWord((scanned as Common).TempToString())
      && !StatementScanner.NoLineBreakBetween(inner.Units[scan - 1], scanned)) {
      tailInner = scan - 1;
      break;
    }
  }
  if (tailInner < 0 && (keyword === "function" || declareFunctionMember)
    && bodyInner < 0 && semiInner < 0 && inner.Units.length > declStart + 1) {
    // 体里最后一条无分号 ambient 函数：收在最后一个代码单元。
    tailInner = inner.Units.length - 1;
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
    // TS 的静默恢复：`namespace N { class {} }` 的 parseDiagnostics=0，AST 是无名字 ClassDeclaration
    // （cover9 用户裁定追恢复 AST）；与语句建造器共用 ClassDeclarationShape.HasNoName 判据。
    member = ClassDeclarationShape.HasNoName(bracket.Data, dataStart, dataEnd)
      ? ClassDeclarationShape.FromUnitsAllowAnonymous(bracket, dataStart, dataEnd, context)
      : ClassDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context);
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
  } else if (keyword === "namespace" || keyword === "module" || keyword === "global") {
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
} else if ((keyword === "function" || declareFunctionMember) && tailInner > declStart) {
  const dataStart = bracket.Data.indexOf(unit as Token);
  const dataEnd = bracket.Data.indexOf(inner.Units[tailInner]);
  // 无分号也无体的 ambient 函数（namespace 体里换行分隔）：ambient=true 允许省略 `;` 与返回类型。
  const declared = FunctionDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context, true);
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
  inner.At = tailInner + 1;
  member = declared;
} else if ((keyword === "function" || declareFunctionMember) && semiInner > declStart) {
  const dataStart = bracket.Data.indexOf(unit as Token);
  const dataEnd = bracket.Data.indexOf(inner.Units[semiInner]);
  // 模块体 / namespace 体里的无体函数声明按 TS 是合法的（无需 declare、返回类型可省：
  // `namespace N { function f(); }` → FunctionDeclaration 无 declare 修饰），所以这里按 ambient 建；
  // ambient 只影响形状校验，不改变 children（declare 只有显式写了才会成为 DeclareKeyword 子节点）。
  const declared = FunctionDeclarationShape.FromUnits(bracket, dataStart, dataEnd, context, true);
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
  // ambient 变量声明无分号（namespace 体常态：`const Dispatcher: typeof import('./x').default`
  // 换行接下一个成员）：把成员范围截到下一个成员起点，末尾补零宽合成 `;` 再交给 StatementBuilder。
  let variableHead = keyword;
  if (variableHead === "declare" && declStart + 1 < inner.Units.length
    && inner.Units[declStart + 1] instanceof Common) {
    const declareNextText = (inner.Units[declStart + 1] as Common).TempToString();
    if (declareNextText === "const" || declareNextText === "let" || declareNextText === "var"
      || declareNextText === "using") {
      variableHead = declareNextText;
    }
  }
  const isVariableMember = variableHead === "const" || variableHead === "let"
    || variableHead === "var" || variableHead === "using";
  if (isVariableMember) {
    let endInner = -1;
    let hasSemi = false;
    for (let scan = declStart + 1; scan < inner.Units.length; scan++) {
      const scanned = inner.Units[scan];
      if (inner.IsSymbol(scanned, ";")) {
        endInner = scan;
        hasSemi = true;
        break;
      }
      if (scan > declStart + 1 && scanned instanceof Common
        && ModuleBlockShape.IsMemberStartWord((scanned as Common).TempToString())
        && !StatementScanner.NoLineBreakBetween(inner.Units[scan - 1], scanned)) {
        endInner = scan - 1;
        break;
      }
    }
    if (endInner < 0) {
      endInner = inner.Units.length - 1;
    }
    const variableUnits:Array<Token> = inner.Units.slice(declStart, endInner + 1);
    if (!hasSemi) {
      const variableLastEnd = inner.Units[endInner].SourceRange.End;
      if (variableLastEnd !== null) {
        const syntheticSemi = new Symbol(bracket.Template);
        syntheticSemi.SignIn(variableLastEnd);
        syntheticSemi.AppendValueAndSignOut(";", variableLastEnd);
        variableUnits.push(syntheticSemi);
      }
    }
    const variableBuilder = new StatementBuilder(bracket.Template, context);
    variableBuilder.Load(variableUnits, inner.Positions[declStart]);
    const variableStatement = variableBuilder.BuildStatement();
    if (variableBuilder.At !== variableBuilder.Units.length) {
      throw new Error("变量语句没有读完");
    }
    inner.At = endInner + 1;
    member = variableStatement;
  } else {
    member = inner.BuildStatement();
  }
}
// 成员首部的 declare / abstract 修饰词 Pos：各声明形状按 `bracket.Data` 里「前一个单元」推，
// 模块体里首个成员会落到 0；这里用本层 Positions 重锚（与 const enum / declare function 同款）。
let leadingModifierPos = inner.Positions[declStart];
for (const child of member.Data) {
  if (child instanceof DeclareKeywordShape || child instanceof AbstractKeywordShape) {
    (child as ShapeToken).Pos = leadingModifierPos;
    const childEnd = child.SourceRange.End;
    if (childEnd !== null) {
      leadingModifierPos = childEnd.Index + 1;
    }
    continue;
  }
  break;
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

## private static method IsMemberStartWord:(text:string)=>bool

模块体成员的首词集合：用于「无分号 ambient 函数在换行处收口」的判据。

```ts
return text === "export" || text === "declare" || text === "function" || text === "class"
  || text === "interface" || text === "enum" || text === "const" || text === "let"
  || text === "var" || text === "type" || text === "namespace" || text === "module"
  || text === "import" || text === "using" || text === "abstract";
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

