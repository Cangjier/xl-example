# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { RootRule, RootRuleTable } from "../items/root-rule-contract.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { NamedExportsShape } from "./named-exports-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ExpressionStatementPossibleShape } from "../statements/expression-statement-possible-shape.xl.md"
import { ClassDeclarationShape } from "./class-declaration-shape.xl.md"
import { EnumDeclarationShape } from "./enum-declaration-shape.xl.md"
import { ExportAssignmentShape } from "./export-assignment-shape.xl.md"
import { ExportDeclarationShape } from "./export-declaration-shape.xl.md"
import { FunctionDeclarationShape } from "./function-declaration-shape.xl.md"
import { InterfaceDeclarationShape } from "./interface-declaration-shape.xl.md"
import { TypeAliasDeclarationShape } from "./type-alias-declaration-shape.xl.md"
import { ConstKeywordShape } from "../keywords/const-keyword-shape.xl.md"
import { AsyncKeywordShape } from "../keywords/async-keyword-shape.xl.md"
import { AsteriskTokenShape } from "../punctuation/asterisk-token-shape.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { DefaultKeywordShape } from "../keywords/default-keyword-shape.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { StatementBuilder } from "../statements/statement-builder.xl.md"
import { StatementScanner } from "../statements/statement-scanner.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
```

# namespace cangjie

# class ExportDeclarationScan

## field Start:int = -1

## field At:int = -1

## field Head:int = -1

## field Second:int = -1

## field Stage:int = 0

## field Kind:int = 0

## field Done:bool = false

## field DoneAt:int = -1

## field Asi:bool = false

换行收口：`ComputeByIndex` 在等 `;` 的阶段（stage 22 / stage 25 的 `abstract` 边角，以及 stage 13 的
`export const|let|var` / `export declare …`）命中下一条语句起点时置 `true`；
`BuildByIndex` 据此建到边界之前、splice 不含边界单元（边界单元留在根里给下一条语句）。

## field LastBodyCode:int = -1

stage 13（变量声明 / 类型别名体）里上一个已吃进的**代码**单元下标：无分号收口用
`StatementScanner.EndsAtLineBreakBefore(units, index)` 判边界，所以边界只在「已经有一个体单元」之后才可能成立，
不会把 `export const` 之后的换行（那是声明头的一部分）当成语句边界。

# class ExportDeclarationRule extends RootRule

```txt
export { a };
export { a, b as c } from "m";
export * from "m";
export * as ns from "m";
export type { T };
export type * from "m";
export const x = 1;
export class C {}
export interface I {}
export enum E { A }
export default 1;
export default class D {}
export declare class C {}
export default function f() {}
export declare function f(): void;
```

`Stage` 0 = 首格 `export`；1 = 见 `type`；2 = 子句形（`{…}` / `*`，建 mounted shell）；3 = 退出。
声明前缀形（`export <decl>`）：10 `class`、11 `interface`、12 `enum`、13 `const/let/var`、14 等 `declare` 之后的声明词、
15 `declare function`（等 `;`）、20 等 `default` 之后的单元、21 `default class`、22 `default <表达式>`、23 `default function`。
到类体 / 枚举体 / 接口体那个 `{`、或 `;` 时置 `Done`/`DoneAt`，只有 `DoneAt === tokenIndex` 才建。声明形建完**不挂载** shell：
直接把根级声明形状（带 `ExportKeyword` / `DefaultKeyword` / `DeclareKeyword`）放回宿主。
`export default <表达式>` 的节点是 `ExportAssignment`（`isExportEquals=false`，不在比较字段里），这里直接建
`ExportAssignmentShape`，不碰 module-1 的 export-assignment 候选/文件。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<ExportDeclarationScan>(name);
if (state === null) {
  state = new ExportDeclarationScan();
  state.Start = ItemUtil.ItemStart(units);
  state.At = state.Start - 1;
  cache.SetState(name, state);
}
if (state.At > tokenIndex) {
  state.At = state.Start - 1;
  state.Head = -1;
  state.Second = -1;
  state.Stage = 0;
  state.Kind = 0;
  state.Done = false;
  state.DoneAt = -1;
  state.Asi = false;
  state.LastBodyCode = -1;
}
for (let index = state.At + 1; index <= tokenIndex; index++) {
  state.At = index;
  const unit = units[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof EndOfFileTokenShape) {
    // EOF: the statement never got its `;`. Yield to SourceFileEndPossibleShape, which builds the
    // trailing export variable statement / export default assignment from the leftover tokens.
    state.Stage = 3;
    continue;
  }
  if (state.Head < 0) {
    state.Head = index;
    state.Stage = unit instanceof Common && (unit as Common).Is("export") ? 0 : 3;
    continue;
  }
  if (state.Second < 0) {
    // 首格不是 `export` 的条目已经以 Stage = 3 退出：后面的单元不许再把 Stage 改写回合法档。
    // 以前这里没有这道闸，`import { b } from "m"`（在 ASI 边界之后剩下的一整条 import）会被
    // 第二个单元 `{` 误判成 `export { … }` 子句形，于是 import 与 export 两个候选同时 Accept，
    // 根终结候选在 EOF 上 Accept 时触发 CatalogGuide 的「终结候选与其它候选同时成立」。
    if (state.Stage === 3) {
      continue;
    }
    state.Second = index;
    if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
      state.Stage = 2;
    } else if (unit instanceof Symbol && (unit as Symbol).Is("*")) {
      state.Stage = 2;
    } else if (unit instanceof Common && (unit as Common).Is("type")) {
      state.Stage = 1;
    } else if (unit instanceof Symbol && (unit as Symbol).Is("@")) {
      // `export @dec class C {}`: decorators precede the class keyword.
      state.Stage = 34;
      state.Kind = 1;
    } else if (unit instanceof Common && (unit as Common).Is("class")) {
      state.Stage = 10;
      state.Kind = 1;
    } else if (unit instanceof Common && (unit as Common).Is("interface")) {
      state.Stage = 11;
      state.Kind = 2;
    } else if (unit instanceof Common && (unit as Common).Is("enum")) {
      state.Stage = 12;
      state.Kind = 3;
    } else if (unit instanceof Common && (unit as Common).Is("const")) {
      // `const enum` 需要看下一个单元，先挂起。
      state.Stage = 27;
      state.Kind = 0;
    } else if (unit instanceof Common && ((unit as Common).Is("let") || (unit as Common).Is("var"))) {
      state.Stage = 13;
      state.Kind = 4;
    } else if (unit instanceof Common && (unit as Common).Is("abstract")) {
      state.Stage = 24;
      state.Kind = 15;
    } else if (unit instanceof Common && (unit as Common).Is("function")) {
      // export function [*] name(… {…}: body-bearing export function (generator `*` handled in Stage 16).
      state.Stage = 16;
      state.Kind = 14;
    } else if (unit instanceof Common && (unit as Common).Is("async")) {
      // export async function [*] …: wait for `function`, then reuse the body-bearing stage.
      // The declaration start stays at the `async` unit (secondIndex), so FromUnits can build the modifier.
      state.Stage = 29;
      state.Kind = 14;
    } else if (unit instanceof Common && (unit as Common).Is("default")) {
      state.Stage = 20;
      state.Kind = 6;
    } else if (unit instanceof Common && (unit as Common).Is("declare")) {
      state.Stage = 14;
      state.Kind = 0;
    } else {
      state.Stage = 3;
    }
    continue;
  }
  if (state.Stage === 34) {
    // decorator prefix before the declaration keyword (only classes may carry decorators on an export).
    if (unit instanceof Common && (unit as Common).Is("class")) {
      state.Stage = state.Kind === 5 ? 21 : 10;
    }
    continue;
  }
  if (state.Stage === 1) {
    if ((unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") || (unit instanceof Symbol && (unit as Symbol).Is("*"))) {
      state.Stage = 2;
    } else {
      state.Stage = 3;
    }
    continue;
  }
  if (state.Stage === 14) {
    // export declare <decl>: dispatch union (chunk3: class/interface/enum/function; chunk4: const/let/var, type).
    if (unit instanceof Common) {
      const text = (unit as Common).TempToString();
      if (text === "class") {
        state.Stage = 10;
        state.Kind = 7;
        continue;
      }
      if (text === "interface") {
        state.Stage = 11;
        state.Kind = 8;
        continue;
      }
      if (text === "enum") {
        state.Stage = 12;
        state.Kind = 9;
        continue;
      }
      if (text === "function") {
        state.Stage = 15;
        state.Kind = 11;
        continue;
      }
      if (text === "async") {
        // export declare async function …;  —— wait for `function`, then the `;`-terminated stage.
        state.Stage = 33;
        state.Kind = 11;
        continue;
      }
      if (text === "let" || text === "var") {
        state.Stage = 13;
        state.Kind = 12;
        continue;
      }
      if (text === "const") {
        // export declare const …：等下一个单元区分 `const enum` 与 declare 变量。
        state.Stage = 26;
        state.Kind = 0;
        continue;
      }
      if (text === "abstract") {
        state.Stage = 24;
        state.Kind = 17;
        continue;
      }
      if (text === "type") {
        state.Stage = 13;
        state.Kind = 13;
        continue;
      }
    }
    state.Stage = 3;
    continue;
  }
  if (state.Stage === 28) {
    // export default interface …：名字与 heritage 先过去，等接口体 `{ }` 闭合时建。
    if (unit instanceof Common) {
      continue;
    }
    if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
      if (!(unit as Bracket).Closed) {
        continue;
      }
      state.Done = true;
      state.DoneAt = index;
      state.Stage = 4;
      continue;
    }
    state.Stage = 3;
    continue;
  }
  if (state.Stage === 24) {
    // export [declare] abstract class …（Kind 15 / 17 保留在分派处）。
    if (unit instanceof Common && (unit as Common).Is("abstract")) {
      continue;
    }
    if (unit instanceof Common && (unit as Common).Is("class")) {
      state.Stage = 10;
      continue;
    }
    state.Stage = 3;
    continue;
  }
  if (state.Stage === 25) {
    // export default abstract class …。
    if (unit instanceof Common && (unit as Common).Is("class")) {
      if (ExpressionStatementPossibleShape.HasLineBreakBefore(units, index)) {
        // TS 把换行前的 `abstract` 当作 default 表达式（Identifier），`class` 起下一条语句；
        // 同一行的 `export default abstract class C {}` 仍是 abstract class。
        state.Kind = 6;
        state.Stage = 4;
        state.Done = true;
        state.DoneAt = index;
        state.Asi = true;
        continue;
      }
      state.Stage = 21;
      state.Kind = 16;
      continue;
    }
    state.Stage = 3;
    continue;
  }
  if (state.Stage === 26) {
    // export declare const …：enum 走 const enum，其余按 declare 变量语句。
    if (unit instanceof Common && (unit as Common).Is("enum")) {
      state.Stage = 12;
      state.Kind = 19;
      continue;
    }
    state.Stage = 13;
    state.Kind = 12;
    continue;
  }
  if (state.Stage === 27) {
    // export const …：enum 走 const enum，其余按变量语句。
    if (unit instanceof Common && (unit as Common).Is("enum")) {
      state.Stage = 12;
      state.Kind = 18;
      continue;
    }
    state.Stage = 13;
    state.Kind = 4;
    continue;
  }
  if (state.Stage === 20) {
    if (unit instanceof Common && (unit as Common).Is("abstract")) {
      state.Stage = 25;
      state.Kind = 0;
    } else if (unit instanceof Common && (unit as Common).Is("class")) {
      state.Stage = 21;
      state.Kind = 5;
    } else if (unit instanceof Common && (unit as Common).Is("function")) {
      state.Stage = 23;
      state.Kind = 10;
    } else if (unit instanceof Common && (unit as Common).Is("async")) {
      // export default async function [*] …: wait for `function`, then the default-function stage.
      state.Stage = 32;
      state.Kind = 23;
    } else if (unit instanceof Symbol && (unit as Symbol).Is("@")) {
      // `export default @dec class C {}`
      state.Stage = 34;
      state.Kind = 5;
    } else if (unit instanceof Common && (unit as Common).Is("interface")) {
      // export default interface …：默认导出接口（interface 体在 Stage 28 收尾）。
      state.Stage = 28;
      state.Kind = 20;
    } else {
      state.Stage = 22;
      state.Kind = 6;
    }
    continue;
  }
  if (state.Stage === 23) {
    // `export default function [*] [名] (…) {…}`：名字 / `*` / 参数表先过去，等函数体那个 `{`。
    if (StatementScanner.IsDecoratedDeclarationStart(units, index)) {
      // 与 Stage 16 同一判据：换行后的 `@dec` 起下一条声明，本条是无体签名
      //（`export default function f(): void` ⏎ `@dec class C {}`），在这里 ASI 收口。
      state.Stage = 3;
      continue;
    }
    if (ExportDeclarationRule.IsNewDeclarationAfterLineBreak(units, index)) {
      // 换行后是下一条声明（`export default function (): void` ⏎ `interface I {}`）：本条是无体签名，
      // 在 ASI 处收口。不 Reject 的话会把下一条声明的 `{…}` 当函数体（Y13：吞 interface 体）。
      state.Stage = 3;
      continue;
    }
    if (unit instanceof Common) {
      continue;
    }
    if (unit instanceof Symbol && (unit as Symbol).Is("*")) {
      continue;
    }
    if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(") {
      continue;
    }
    if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
      if (!(unit as Bracket).Closed) {
        continue;
      }
      state.Done = true;
      state.DoneAt = index;
      state.Stage = 4;
      continue;
    }
    // Anything else in the header (return type `:` / generic type names / `<` `>`) is tolerated;
    // only the closed body `{ }` above settles Done. Rejecting here killed the whole
    // export-default-function candidate for `function* h(): Generator<number> {…}`.
    continue;
  }
  if (state.Stage === 29) {
    // after `export async`: must be `function`, then fall through to the body-bearing stage.
    if (unit instanceof Common && (unit as Common).Is("function")) {
      state.Stage = 16;
      continue;
    }
    state.Stage = 3;
    continue;
  }
  if (state.Stage === 32) {
    // after `export default async`: must be `function`, then the default-function stage.
    if (unit instanceof Common && (unit as Common).Is("function")) {
      state.Stage = 23;
      continue;
    }
    state.Stage = 3;
    continue;
  }
  if (state.Stage === 33) {
    // after `export declare async`: must be `function`, then wait for the terminating `;`.
    if (unit instanceof Common && (unit as Common).Is("function")) {
      state.Stage = 15;
      continue;
    }
    state.Stage = 3;
    continue;
  }
  if (state.Stage === 16) {
    // `export function [*] name(…): Ret {…}`：名字 / `*` / 参数表 / 返回类型都先过去，
    // 等函数体那个**已闭合**的 `{ }` 括号单元：Done 只落在它上面，BuildByIndex 一次建好整条声明
    // （这样函数体内的语句不会在根层被当成表达式语句，ASI 边界也不会插进来）。
    if (StatementScanner.IsDecoratedDeclarationStart(units, index)) {
      // 换行后的 `@dec` 是**下一条声明**的装饰器前缀：本条是**无体**签名（`export function f(): void`
      // ⏎ `@dec class C {}`），TS 侧在这里 ASI 收口。不 Reject 的话本候选会一直等到下一条声明的
      // `{…}` 当函数体，`FunctionDeclarationShape.FromUnits` 报「函数声明的返回类型没有读完」。
      state.Stage = 3;
      continue;
    }
    if (ExportDeclarationRule.IsNewDeclarationAfterLineBreak(units, index)) {
      // 同上，换行后是下一条声明（`export function f(): void` ⏎ `interface I {}`）：无体签名在 ASI 收口。
      state.Stage = 3;
      continue;
    }
    if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
      if (!(unit as Bracket).Closed) {
        continue;
      }
      state.Done = true;
      state.DoneAt = index;
      state.Stage = 4;
      continue;
    }
    continue;
  }
  if (state.Stage === 10 || state.Stage === 11 || state.Stage === 12 || state.Stage === 21) {
    if (unit instanceof Common) {
      // 声明名（`class C` / `enum E`）先过去，等类体 / 枚举体那个 `{`。
      continue;
    }
    if (unit instanceof Symbol) {
      // type parameters (`class C<T>`) / heritage type arguments (`extends D<E>`) 里的符号先过去。
      continue;
    }
    if (unit instanceof Bracket && (unit as Bracket).StartBracketChar !== "{") {
      // heritage call arguments (`extends mixin<T>(B)`) 里的 `(` / `[` 等括号先过去；`{` 仍是唯一类体终结点。
      continue;
    }
    if (!(unit instanceof Bracket) || (unit as Bracket).StartBracketChar !== "{") {
      state.Stage = 3;
      continue;
    }
    if (!(unit as Bracket).Closed) {
      continue;
    }
    // class / interface 的成员现在都能由各自的 Shape.BuildMembers 建出（export 的 BuildByIndex 走
    // ClassDeclarationShape.FromUnits / InterfaceDeclarationShape.FromUnits），所以接口体非空不再是退出理由。
    state.Done = true;
    state.DoneAt = index;
    state.Stage = 4;
    continue;
  }
  if (state.Stage === 13 || state.Stage === 15 || state.Stage === 22) {
    if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
      state.Done = true;
      if (state.DoneAt < 0) {
        state.DoneAt = index;
      }
      continue;
    }
    if (state.Stage === 13 && (state.Kind === 4 || state.Kind === 12)) {
      // `export const|let|var …` / `export declare …` 的无分号收口：与根变量语句读**同一个**
      // `StatementScanner.EndsAtLineBreak`（含调用位与类型实参收尾 `>` 两条判据）：
      // `export const x = a as T` ⏎ `(b)` 在 `(` 那一格收口，`(b)` 是下一条语句。
      if (state.LastBodyCode >= 0 && StatementScanner.EndsAtLineBreakBefore(units, index)) {
        state.Done = true;
        state.DoneAt = index;
        state.Asi = true;
        state.Stage = 4;
        continue;
      }
      state.LastBodyCode = index;
    }
    if (state.Stage === 22 && ExpressionStatementPossibleShape.IsStatementBoundaryAfterExpression(units, index)) {
      // 无分号收口：下一条语句的第一个代码单元到了——`export default <expr>` 在它前面的换行处结束。
      state.Done = true;
      state.DoneAt = index;
      state.Asi = true;
      state.Stage = 4;
    }
    continue;
  }
}
if (state.Stage === 3) {
  return ShapeStates.Reject;
}
if (state.Stage === 2) {
  return ShapeStates.Accept;
}
if (state.Done) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method BuildByIndex:(host:Token, tokenIndex:int, table:RootRuleTable, context:SyntaxContext)=>Token

```ts
const state = table.Cache.GetState<ExportDeclarationScan>(this.Slot());
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (start < 0 || start > tokenIndex) {
  return host;
}
const kind = state === null ? 0 : state.Kind;
if (kind === 0) {
  const consumed0:Array<Token> = host.Data.slice(start, tokenIndex + 1);
  const built0 = new ExportDeclarationShape(host.Template);
  for (const unit of consumed0) {
    built0.Add(unit);
  }
  for (let at = 0; at < built0.Data.length; at++) {
    const unit = built0.Data[at];
    if (!(unit instanceof Bracket) || (unit as Bracket).StartBracketChar !== "{" || !(unit as Bracket).Closed) {
      continue;
    }
    let previous = -1;
    for (let back = at - 1; back >= 0; back--) {
      if (!built0.Data[back].IsTriviaToken) {
        previous = back;
        break;
      }
    }
    if (previous >= 0) {
      const before = built0.Data[previous];
      if (before instanceof Common && ((before as Common).Is("with") || (before as Common).Is("assert"))) {
        continue;
      }
    }
    const named = NamedExportsShape.FromBracket(unit as Bracket, context);
    if (previous >= 0) {
      const previousEnd = built0.Data[previous].SourceRange.End;
      if (previousEnd >= 0) {
        named.Pos = previousEnd;
      }
    } else if (unit.SourceRange.Start >= 0) {
      named.Pos = unit.SourceRange.StartIndex;
    }
    built0.Data.splice(at, 1, named);
    named.Parent = built0;
  }
  const begin0 = consumed0[0].SourceRange.Start;
  if (begin0 >= 0) {
    built0.SignIn(begin0);
  }
  let previousCode0 = -1;
  for (let at = start - 1; at >= 0; at--) {
    if (!host.Data[at].IsTriviaToken) {
      previousCode0 = at;
      break;
    }
  }
  built0.Pos = begin0 >= 0 ? begin0 : -1;
  if (previousCode0 >= 0) {
    const previousUnit = host.Data[previousCode0];
    if (previousUnit.SourceRange.End >= 0) {
      built0.Pos = previousUnit.SourceRange.EndIndex;
    }
  }
  host.Data.splice(start, tokenIndex - start + 1, built0);
  built0.Parent = host;
  host.MountedUnit = built0;
  return built0;
}
// 声明前缀形：export <decl>。
let exportIndex = -1;
for (let at = start; at <= tokenIndex; at++) {
  if (!host.Data[at].IsTriviaToken) {
    exportIndex = at;
    break;
  }
}
let secondIndex = -1;
for (let at = exportIndex + 1; at <= tokenIndex; at++) {
  if (!host.Data[at].IsTriviaToken) {
    secondIndex = at;
    break;
  }
}
if (exportIndex < 0 || secondIndex < 0) {
  return host;
}
let pos = 0;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const end = host.Data[at].SourceRange.End;
    if (end >= 0) {
      pos = end;
    }
    break;
  }
}
const exportUnit = host.Data[exportIndex];
const exportModifier = ExportKeywordShape.FromBasicToken(exportUnit as Common, context);
exportModifier.Pos = pos;
if (exportModifier.SourceRange.End < 0 && exportUnit.SourceRange.End >= 0) {
  exportModifier.SignOut(exportUnit.SourceRange.EndIndex);
}
let declIndex = secondIndex;
if (kind === 5 || kind === 10 || kind === 16 || kind === 20) {
  // default class / default function：跳过 `default`，声明从声明词起。
  for (let at = secondIndex + 1; at <= tokenIndex; at++) {
    if (!host.Data[at].IsTriviaToken) {
      declIndex = at;
      break;
    }
  }
}
if (kind === 1 || kind === 2 || kind === 3 || kind === 7 || kind === 8 || kind === 9) {
  let built:ShapeToken;
  if (kind === 1 || kind === 7) {
    built = ClassDeclarationShape.FromUnits(host, declIndex, tokenIndex, context);
  } else if (kind === 2 || kind === 8) {
    built = InterfaceDeclarationShape.FromUnits(host, declIndex, tokenIndex, context);
  } else {
    built = EnumDeclarationShape.FromUnits(host, declIndex, tokenIndex, context);
  }
  built.Data.unshift(exportModifier);
  exportModifier.Parent = built;
  built.Pos = pos;
  host.Data.splice(start, tokenIndex - start + 1, built);
  built.Parent = host;
  return built;
}
if (kind === 4) {
  // Asi：tokenIndex 是下一条语句的第一个代码单元，不属于本条声明（End 已在 builder 里收到边界前）。
  const asi = state !== null && state.Asi;
  const endExclusive = asi ? tokenIndex : tokenIndex + 1;
  const consumed:Array<Token> = host.Data.slice(declIndex, endExclusive);
  let basePos = pos;
  if (exportUnit.SourceRange.End >= 0) {
    basePos = exportUnit.SourceRange.EndIndex;
  }
  const builder = new StatementBuilder(host.Template, context);
  builder.Load(consumed, basePos);
  const statement = builder.BuildStatement();
  if (builder.At !== builder.Units.length) {
    throw new Error("export 变量语句没有读完");
  }
  const built = statement as ShapeToken;
  built.Data.unshift(exportModifier);
  exportModifier.Parent = built;
  built.Pos = pos;
  host.Data.splice(start, endExclusive - start, built);
  built.Parent = host;
  return built;
}
if (kind === 12) {
  // export declare const/let/var …;  —— 变量语句前有 ExportKeyword + DeclareKeyword 两个修饰词。
  const declareUnit = host.Data[secondIndex];
  const declareModifier = DeclareKeywordShape.FromBasicToken(declareUnit as Common, context);
  declareModifier.Pos = exportUnit.SourceRange.End < 0 ? pos : exportUnit.SourceRange.EndIndex;
  if (declareModifier.SourceRange.End < 0 && declareUnit.SourceRange.End >= 0) {
    declareModifier.SignOut(declareUnit.SourceRange.EndIndex);
  }
  let keywordIndex = -1;
  for (let at = secondIndex + 1; at <= tokenIndex; at++) {
    if (!host.Data[at].IsTriviaToken) {
      keywordIndex = at;
      break;
    }
  }
  if (keywordIndex < 0) {
    return host;
  }
  const asi = state !== null && state.Asi;
  const endExclusive = asi ? tokenIndex : tokenIndex + 1;
  const consumed:Array<Token> = host.Data.slice(keywordIndex, endExclusive);
  let basePos = pos;
  if (declareUnit.SourceRange.End >= 0) {
    basePos = declareUnit.SourceRange.EndIndex;
  }
  const builder = new StatementBuilder(host.Template, context);
  builder.Load(consumed, basePos);
  const statement = builder.BuildStatement();
  if (builder.At !== builder.Units.length) {
    throw new Error("export declare 变量语句没有读完");
  }
  const built = statement as ShapeToken;
  built.Data.unshift(declareModifier);
  declareModifier.Parent = built;
  built.Data.unshift(exportModifier);
  exportModifier.Parent = built;
  built.Pos = pos;
  host.Data.splice(start, endExclusive - start, built);
  built.Parent = host;
  return built;
}
if (kind === 13) {
  // export declare type T = A;  —— TypeAliasDeclaration 自带名字/类型两个 child，前面补两个修饰词。
  const declareUnit = host.Data[secondIndex];
  const declareModifier = DeclareKeywordShape.FromBasicToken(declareUnit as Common, context);
  declareModifier.Pos = exportUnit.SourceRange.End < 0 ? pos : exportUnit.SourceRange.EndIndex;
  if (declareModifier.SourceRange.End < 0 && declareUnit.SourceRange.End >= 0) {
    declareModifier.SignOut(declareUnit.SourceRange.EndIndex);
  }
  let typeIndex = -1;
  for (let at = secondIndex + 1; at <= tokenIndex; at++) {
    if (!host.Data[at].IsTriviaToken) {
      typeIndex = at;
      break;
    }
  }
  if (typeIndex < 0) {
    return host;
  }
  const built = TypeAliasDeclarationShape.FromUnits(host, typeIndex, tokenIndex, context);
  built.Data.unshift(declareModifier);
  declareModifier.Parent = built;
  built.Data.unshift(exportModifier);
  exportModifier.Parent = built;
  built.Pos = pos;
  host.Data.splice(start, tokenIndex - start + 1, built);
  built.Parent = host;
  return built;
}
if (kind === 15 || kind === 17) {
  // export [declare] abstract class …：ClassDeclarationShape.FromUnits 认 abstract/declare 修饰词。
  const built = ClassDeclarationShape.FromUnits(host, declIndex, tokenIndex, context);
  built.Data.unshift(exportModifier);
  exportModifier.Parent = built;
  built.Pos = pos;
  host.Data.splice(start, tokenIndex - start + 1, built);
  built.Parent = host;
  return built;
}
if (kind === 16) {
  // export default abstract class …：ClassDeclarationShape 自带 abstract child，再补 Default/Export。
  const built = ClassDeclarationShape.FromUnitsAllowAnonymous(host, declIndex, tokenIndex, context);
  const defaultUnit = host.Data[secondIndex];
  const defaultModifier = new DefaultKeywordShape(host.Template);
  if (defaultUnit.SourceRange.Start >= 0) {
    defaultModifier.SignIn(defaultUnit.SourceRange.StartIndex);
  }
  if (defaultUnit.SourceRange.End >= 0) {
    defaultModifier.SignOut(defaultUnit.SourceRange.EndIndex);
  }
  defaultModifier.Pos = exportUnit.SourceRange.End < 0 ? pos : exportUnit.SourceRange.EndIndex;
  defaultModifier.TryToClose(context);
  built.Data.unshift(defaultModifier);
  defaultModifier.Parent = built;
  built.Data.unshift(exportModifier);
  exportModifier.Parent = built;
  built.Pos = pos;
  host.Data.splice(start, tokenIndex - start + 1, built);
  built.Parent = host;
  return built;
}
if (kind === 18 || kind === 19) {
  // export [declare] const enum …：EnumDeclarationShape 不认 const，手工补 ConstKeyword。
  let constIndex = secondIndex;
  if (kind === 19) {
    for (let at = secondIndex + 1; at <= tokenIndex; at++) {
      if (!host.Data[at].IsTriviaToken) {
        constIndex = at;
        break;
      }
    }
  }
  let enumIndex = -1;
  for (let at = constIndex + 1; at <= tokenIndex; at++) {
    if (!host.Data[at].IsTriviaToken) {
      enumIndex = at;
      break;
    }
  }
  if (enumIndex < 0) {
    return host;
  }
  const constToken = host.Data[constIndex];
  const built = EnumDeclarationShape.FromUnits(host, enumIndex, tokenIndex, context);
  const constModifier = new ConstKeywordShape(host.Template);
  if (constToken.SourceRange.Start >= 0) {
    constModifier.SignIn(constToken.SourceRange.StartIndex);
  }
  if (constToken.SourceRange.End >= 0) {
    constModifier.SignOut(constToken.SourceRange.EndIndex);
  }
  const constPrev = kind === 19 ? host.Data[secondIndex] : exportUnit;
  constModifier.Pos = constPrev.SourceRange.End < 0 ? pos : constPrev.SourceRange.EndIndex;
  constModifier.TryToClose(context);
  built.Data.unshift(constModifier);
  constModifier.Parent = built;
  if (kind === 19) {
    const declareUnit = host.Data[secondIndex];
    const declareModifier = DeclareKeywordShape.FromBasicToken(declareUnit as Common, context);
    declareModifier.Pos = exportUnit.SourceRange.End < 0 ? pos : exportUnit.SourceRange.EndIndex;
    if (declareModifier.SourceRange.End < 0 && declareUnit.SourceRange.End >= 0) {
      declareModifier.SignOut(declareUnit.SourceRange.EndIndex);
    }
    built.Data.unshift(declareModifier);
    declareModifier.Parent = built;
  }
  built.Data.unshift(exportModifier);
  exportModifier.Parent = built;
  built.Pos = pos;
  host.Data.splice(start, tokenIndex - start + 1, built);
  built.Parent = host;
  return built;
}
if (kind === 20) {
  // export default interface …：InterfaceDeclarationShape 自带名字/heritage，再补 Default/Export。
  const built = InterfaceDeclarationShape.FromUnits(host, declIndex, tokenIndex, context);
  const defaultUnit = host.Data[secondIndex];
  const defaultModifier = new DefaultKeywordShape(host.Template);
  if (defaultUnit.SourceRange.Start >= 0) {
    defaultModifier.SignIn(defaultUnit.SourceRange.StartIndex);
  }
  if (defaultUnit.SourceRange.End >= 0) {
    defaultModifier.SignOut(defaultUnit.SourceRange.EndIndex);
  }
  defaultModifier.Pos = exportUnit.SourceRange.End < 0 ? pos : exportUnit.SourceRange.EndIndex;
  defaultModifier.TryToClose(context);
  built.Data.unshift(defaultModifier);
  defaultModifier.Parent = built;
  built.Data.unshift(exportModifier);
  exportModifier.Parent = built;
  built.Pos = pos;
  host.Data.splice(start, tokenIndex - start + 1, built);
  built.Parent = host;
  return built;
}
if (kind === 5) {
  const built = ClassDeclarationShape.FromUnitsAllowAnonymous(host, declIndex, tokenIndex, context);
  const defaultUnit = host.Data[secondIndex];
  const defaultModifier = new DefaultKeywordShape(host.Template);
  if (defaultUnit.SourceRange.Start >= 0) {
    defaultModifier.SignIn(defaultUnit.SourceRange.StartIndex);
  }
  if (defaultUnit.SourceRange.End >= 0) {
    defaultModifier.SignOut(defaultUnit.SourceRange.EndIndex);
  }
  defaultModifier.Pos = exportUnit.SourceRange.End < 0 ? pos : exportUnit.SourceRange.EndIndex;
  defaultModifier.TryToClose(context);
  built.Data.unshift(defaultModifier);
  defaultModifier.Parent = built;
  built.Data.unshift(exportModifier);
  exportModifier.Parent = built;
  built.Pos = pos;
  host.Data.splice(start, tokenIndex - start + 1, built);
  built.Parent = host;
  return built;
}
if (kind === 10) {
  // export default function [名] (…) {…}：有名字走 FunctionDeclarationShape.FromUnits（它要求名字），
  // 匿名 default 手工建：children 只有 Block（TS：`ExportKeyword | DefaultKeyword | Block`）。
  const defaultUnit = host.Data[secondIndex];
  let functionIndex = -1;
  for (let at = secondIndex + 1; at <= tokenIndex; at++) {
    if (!host.Data[at].IsTriviaToken) {
      functionIndex = at;
      break;
    }
  }
  let firstAfter = -1;
  for (let at = functionIndex + 1; at <= tokenIndex; at++) {
    if (!host.Data[at].IsTriviaToken) {
      firstAfter = at;
      break;
    }
  }
  if (functionIndex < 0 || firstAfter < 0) {
    return host;
  }
  let built:ShapeToken;
  let nameCandidate = firstAfter;
  if (host.Data[nameCandidate] instanceof Symbol && (host.Data[nameCandidate] as Symbol).Is("*")) {
    // generator: `function * name` — the name follows the asterisk.
    let shifted = -1;
    for (let at = nameCandidate + 1; at <= tokenIndex; at++) {
      if (!host.Data[at].IsTriviaToken) {
        shifted = at;
        break;
      }
    }
    nameCandidate = shifted;
  }
  if (nameCandidate >= 0 && host.Data[nameCandidate] instanceof Common) {
    let bodyIndex = -1;
    for (let at = nameCandidate + 1; at <= tokenIndex; at++) {
      if (!host.Data[at].IsTriviaToken) {
        bodyIndex = at;
      }
    }
    built = FunctionDeclarationShape.FromUnits(host, functionIndex, bodyIndex, context);
  } else {
    let paramsIndex = firstAfter;
    let asteriskShape:Token | null = null;
    if (host.Data[paramsIndex] instanceof Symbol && (host.Data[paramsIndex] as Symbol).Is("*")) {
      // Anonymous generator `export default function* () {}`: TS projects the asterisk
      // (children: ExportKeyword, DefaultKeyword, AsteriskToken, Block), so build it.
      const asteriskUnit = host.Data[paramsIndex];
      const functionUnitForAsterisk = host.Data[functionIndex];
      const asteriskPos = functionUnitForAsterisk.SourceRange.End < 0 ? pos : functionUnitForAsterisk.SourceRange.EndIndex;
      const asterisk = new AsteriskTokenShape(host.Template);
      asterisk.SignInToken(asteriskUnit);
      asterisk.SignOutToken(asteriskUnit);
      asterisk.Pos = asteriskPos;
      asterisk.TryToClose(context);
      asteriskShape = asterisk;
      let shifted = -1;
      for (let at = paramsIndex + 1; at <= tokenIndex; at++) {
        if (!host.Data[at].IsTriviaToken) {
          shifted = at;
          break;
        }
      }
      paramsIndex = shifted;
    }
    if (paramsIndex < 0 || !(host.Data[paramsIndex] instanceof Bracket) || (host.Data[paramsIndex] as Bracket).StartBracketChar !== "(") {
      return host;
    }
    const paramsUnit = host.Data[paramsIndex] as Bracket;
    let bodyIndex = -1;
    for (let at = paramsIndex + 1; at <= tokenIndex; at++) {
      // Anonymous default function may carry a return type between `)` and the body.
      if (host.Data[at] instanceof Bracket && (host.Data[at] as Bracket).StartBracketChar === "{" && (host.Data[at] as Bracket).Closed) {
        bodyIndex = at;
        break;
      }
    }
    if (bodyIndex < 0) {
      return host;
    }
    const bodyUnit = host.Data[bodyIndex] as Bracket;
    const paramsEnd = paramsUnit.SourceRange.End;
    const bodyPos = paramsEnd < 0 ? pos : paramsEnd;
    const bodyBuilder = new StatementBuilder(host.Template, context);
    bodyBuilder.Load([bodyUnit], bodyPos);
    const body = bodyBuilder.BuildStatement();
    if (bodyBuilder.At !== bodyBuilder.Units.length) {
      throw new Error("export default function 的函数体没有读完");
    }
    const anonymous = new FunctionDeclarationShape(host.Template);
    anonymous.FunctionName = null;
    anonymous.Parameters = [];
    anonymous.ReturnType = null;
    anonymous.Body = body;
    anonymous.Add(body);
    if (asteriskShape !== null) {
      asteriskShape.Parent = anonymous;
      anonymous.Data.unshift(asteriskShape);
    }
    const functionUnit = host.Data[functionIndex];
    if (functionUnit.SourceRange.Start >= 0) {
      anonymous.SignIn(functionUnit.SourceRange.StartIndex);
    }
    if (bodyUnit.SourceRange.End >= 0) {
      anonymous.SignOut(bodyUnit.SourceRange.EndIndex);
    }
    anonymous.TryToClose(context);
    built = anonymous;
  }
  const defaultModifier = new DefaultKeywordShape(host.Template);
  if (defaultUnit.SourceRange.Start >= 0) {
    defaultModifier.SignIn(defaultUnit.SourceRange.StartIndex);
  }
  if (defaultUnit.SourceRange.End >= 0) {
    defaultModifier.SignOut(defaultUnit.SourceRange.EndIndex);
  }
  defaultModifier.Pos = exportUnit.SourceRange.End < 0 ? pos : exportUnit.SourceRange.EndIndex;
  defaultModifier.TryToClose(context);
  built.Data.unshift(defaultModifier);
  defaultModifier.Parent = built;
  built.Data.unshift(exportModifier);
  exportModifier.Parent = built;
  built.Pos = pos;
  host.Data.splice(start, tokenIndex - start + 1, built);
  built.Parent = host;
  return built;
}
if (kind === 23) {
  // export default async function [*] [name](…) {…}: the declaration starts at `async` (secondIndex),
  // so FunctionDeclarationShape.FromUnits builds the AsyncKeyword itself; Default/Export are prepended.
  const defaultUnit = host.Data[secondIndex];
  let asyncIndex = -1;
  for (let at = secondIndex + 1; at <= tokenIndex; at++) {
    if (!host.Data[at].IsTriviaToken) {
      asyncIndex = at;
      break;
    }
  }
  if (asyncIndex < 0) {
    return host;
  }
  const asyncUnit = host.Data[asyncIndex];
  let functionIndex = -1;
  for (let at = asyncIndex + 1; at <= tokenIndex; at++) {
    if (!host.Data[at].IsTriviaToken) {
      functionIndex = at;
      break;
    }
  }
  if (functionIndex < 0) {
    return host;
  }
  let firstAfter = -1;
  for (let at = functionIndex + 1; at <= tokenIndex; at++) {
    if (!host.Data[at].IsTriviaToken) {
      firstAfter = at;
      break;
    }
  }
  if (firstAfter < 0) {
    return host;
  }
  let built:ShapeToken;
  let nameCandidate = firstAfter;
  if (host.Data[nameCandidate] instanceof Symbol && (host.Data[nameCandidate] as Symbol).Is("*")) {
    // default async generator: `async function * name` — the name follows the asterisk.
    let shifted = -1;
    for (let at = nameCandidate + 1; at <= tokenIndex; at++) {
      if (!host.Data[at].IsTriviaToken) {
        shifted = at;
        break;
      }
    }
    nameCandidate = shifted;
  }
  if (nameCandidate >= 0 && host.Data[nameCandidate] instanceof Common) {
    let bodyIndex = tokenIndex;
    while (bodyIndex > nameCandidate && host.Data[bodyIndex].IsTriviaToken) {
      bodyIndex--;
    }
    built = FunctionDeclarationShape.FromUnits(host, asyncIndex, bodyIndex, context);
  } else {
    // anonymous default async function / async generator:
    // children = AsyncKeyword, [AsteriskToken,] Block (Export/Default unshifted below).
    let paramsIndex = firstAfter;
    let asteriskShape:Token | null = null;
    if (host.Data[paramsIndex] instanceof Symbol && (host.Data[paramsIndex] as Symbol).Is("*")) {
      const asteriskUnit = host.Data[paramsIndex];
      const functionUnitForAsterisk = host.Data[functionIndex];
      const asteriskPos = functionUnitForAsterisk.SourceRange.End < 0 ? pos : functionUnitForAsterisk.SourceRange.EndIndex;
      const asterisk = new AsteriskTokenShape(host.Template);
      asterisk.SignInToken(asteriskUnit);
      asterisk.SignOutToken(asteriskUnit);
      asterisk.Pos = asteriskPos;
      asterisk.TryToClose(context);
      asteriskShape = asterisk;
      let shifted = -1;
      for (let at = paramsIndex + 1; at <= tokenIndex; at++) {
        if (!host.Data[at].IsTriviaToken) {
          shifted = at;
          break;
        }
      }
      paramsIndex = shifted;
    }
    if (paramsIndex < 0 || !(host.Data[paramsIndex] instanceof Bracket) || (host.Data[paramsIndex] as Bracket).StartBracketChar !== "(") {
      return host;
    }
    const paramsUnit = host.Data[paramsIndex] as Bracket;
    let bodyIndex = -1;
    for (let at = paramsIndex + 1; at <= tokenIndex; at++) {
      if (!host.Data[at].IsTriviaToken) {
        bodyIndex = at;
        break;
      }
    }
    const bodyUnit = host.Data[bodyIndex];
    if (!(bodyUnit instanceof Bracket) || (bodyUnit as Bracket).StartBracketChar !== "{") {
      return host;
    }
    const asyncShape = new AsyncKeywordShape(host.Template);
    asyncShape.SignInToken(asyncUnit);
    asyncShape.SignOutToken(asyncUnit);
    asyncShape.Pos = defaultUnit.SourceRange.End < 0 ? pos : defaultUnit.SourceRange.EndIndex;
    asyncShape.TryToClose(context);
    const paramsEnd = (paramsUnit as Bracket).SourceRange.End;
    const bodyPos = paramsEnd < 0 ? pos : paramsEnd;
    const bodyBuilder = new StatementBuilder(host.Template, context);
    bodyBuilder.Load([bodyUnit], bodyPos);
    const body = bodyBuilder.BuildStatement();
    if (bodyBuilder.At !== bodyBuilder.Units.length) {
      throw new Error("export default async function 的函数体没有读完");
    }
    const anonymous = new FunctionDeclarationShape(host.Template);
    anonymous.FunctionName = null;
    anonymous.Parameters = [];
    anonymous.ReturnType = null;
    anonymous.Body = body;
    anonymous.Add(asyncShape);
    if (asteriskShape !== null) {
      asteriskShape.Parent = anonymous;
      anonymous.Data.push(asteriskShape);
    }
    anonymous.Add(body);
    anonymous.SignInToken(exportUnit);
    if (bodyUnit.SourceRange.End >= 0) {
      anonymous.SignOut(bodyUnit.SourceRange.EndIndex);
    }
    anonymous.TryToClose(context);
    built = anonymous;
  }
  const defaultModifier = new DefaultKeywordShape(host.Template);
  if (defaultUnit.SourceRange.Start >= 0) {
    defaultModifier.SignIn(defaultUnit.SourceRange.StartIndex);
  }
  if (defaultUnit.SourceRange.End >= 0) {
    defaultModifier.SignOut(defaultUnit.SourceRange.EndIndex);
  }
  defaultModifier.Pos = exportUnit.SourceRange.End < 0 ? pos : exportUnit.SourceRange.EndIndex;
  defaultModifier.TryToClose(context);
  built.Data.unshift(defaultModifier);
  defaultModifier.Parent = built;
  built.Data.unshift(exportModifier);
  exportModifier.Parent = built;
  built.Pos = pos;
  host.Data.splice(start, tokenIndex - start + 1, built);
  built.Parent = host;
  return built;
}
if (kind === 14) {
  // `export function [*] name(…) {…}`：声明从 `function`（secondIndex）起，体是闭合 `{ }`（tokenIndex）。
  // children 顺序与 TS 一致：ExportKeyword、[AsteriskToken]、Identifier、Parameter 们、[返回类型]、Block。
  let bodyIndex = tokenIndex;
  while (bodyIndex > secondIndex && host.Data[bodyIndex].IsTriviaToken) {
    bodyIndex--;
  }
  const built = FunctionDeclarationShape.FromUnits(host, secondIndex, bodyIndex, context);
  built.Data.unshift(exportModifier);
  exportModifier.Parent = built;
  built.Pos = pos;
  host.Data.splice(start, tokenIndex - start + 1, built);
  built.Parent = host;
  return built;
}
if (kind === 11) {
  // export declare function f(): void;  —— 无函数体，children: ExportKeyword | DeclareKeyword | Identifier | 返回类型。
  const declareUnit = host.Data[secondIndex];
  const declareModifier = DeclareKeywordShape.FromBasicToken(declareUnit as Common, context);
  declareModifier.Pos = exportUnit.SourceRange.End < 0 ? pos : exportUnit.SourceRange.EndIndex;
  if (declareModifier.SourceRange.End < 0 && declareUnit.SourceRange.End >= 0) {
    declareModifier.SignOut(declareUnit.SourceRange.EndIndex);
  }
  let functionIndex = -1;
  for (let at = secondIndex + 1; at <= tokenIndex; at++) {
    if (!host.Data[at].IsTriviaToken) {
      functionIndex = at;
      break;
    }
  }
  let asyncUnit:Token | null = null;
  if (functionIndex >= 0
    && host.Data[functionIndex] instanceof Common
    && (host.Data[functionIndex] as Common).Is("async")) {
    // export declare async function …: the async modifier sits between declare and function.
    asyncUnit = host.Data[functionIndex];
    let shifted = -1;
    for (let at = functionIndex + 1; at <= tokenIndex; at++) {
      if (!host.Data[at].IsTriviaToken) {
        shifted = at;
        break;
      }
    }
    functionIndex = shifted;
  }
  if (functionIndex < 0) {
    return host;
  }
  let nameIndex = -1;
  for (let at = functionIndex + 1; at <= tokenIndex; at++) {
    if (!host.Data[at].IsTriviaToken) {
      nameIndex = at;
      break;
    }
  }
  let paramsIndex = -1;
  for (let at = nameIndex + 1; at <= tokenIndex; at++) {
    if (!host.Data[at].IsTriviaToken) {
      paramsIndex = at;
      break;
    }
  }
  const functionUnit = host.Data[functionIndex];
  const nameUnit = host.Data[nameIndex];
  const paramsUnit = host.Data[paramsIndex];
  if (!(functionUnit instanceof Common) || !(functionUnit as Common).Is("function")) {
    return host;
  }
  if (!(nameUnit instanceof Common)) {
    return host;
  }
  if (!(paramsUnit instanceof Bracket) || (paramsUnit as Bracket).StartBracketChar !== "(") {
    return host;
  }
  let colonIndex = -1;
  for (let at = paramsIndex + 1; at < tokenIndex; at++) {
    const candidate = host.Data[at];
    if (candidate.IsTriviaToken) {
      continue;
    }
    if (candidate instanceof Symbol && (candidate as Symbol).Is(":")) {
      colonIndex = at;
    }
    break;
  }
  let returnType:Token | null = null;
  if (colonIndex >= 0) {
    const colon = host.Data[colonIndex];
    const typeUnits:Array<Token> = host.Data.slice(colonIndex + 1, tokenIndex);
    const typePos = colon.SourceRange.End < 0 ? 0 : colon.SourceRange.EndIndex;
    const typeBuilder = new TypeBuilder(host.Template, context);
    typeBuilder.Load(typeUnits, typePos);
    returnType = typeBuilder.ParseType();
    if (typeBuilder.At !== typeBuilder.Units.length) {
      throw new Error("export declare function 的返回类型没有读完");
    }
  }
  const name = IdentifierShape.FromBasicToken(nameUnit as Common, context);
  name.Pos = functionUnit.SourceRange.End < 0 ? pos : functionUnit.SourceRange.EndIndex;
  if (name.SourceRange.End < 0 && nameUnit.SourceRange.End >= 0) {
    name.SignOut(nameUnit.SourceRange.EndIndex);
  }
  const built = new FunctionDeclarationShape(host.Template);
  built.FunctionName = name;
  // 参数表复用 FunctionDeclarationShape.BuildParameters（与普通函数声明同一口径）：
  // children 顺序 = ExportKeyword、DeclareKeyword、[AsyncKeyword]、Identifier、Parameter 们、[返回类型]。
  built.Parameters = FunctionDeclarationShape.BuildParameters(host, paramsUnit as Bracket, context);
  built.ReturnType = returnType;
  built.Body = null;
  built.Add(exportModifier);
  built.Add(declareModifier);
  if (asyncUnit !== null) {
    const asyncShape = new AsyncKeywordShape(host.Template);
    asyncShape.SignInToken(asyncUnit);
    asyncShape.SignOutToken(asyncUnit);
    asyncShape.Pos = declareUnit.SourceRange.End < 0 ? pos : declareUnit.SourceRange.EndIndex;
    asyncShape.TryToClose(context);
    built.Add(asyncShape);
  }
  built.Add(name);
  for (const parameter of built.Parameters) {
    built.Add(parameter);
  }
  if (returnType !== null) {
    built.Add(returnType);
  }
  if (exportUnit.SourceRange.Start >= 0) {
    built.SignIn(exportUnit.SourceRange.StartIndex);
  }
  const lastUnit = host.Data[tokenIndex];
  if (lastUnit.SourceRange.End >= 0) {
    built.SignOut(lastUnit.SourceRange.EndIndex);
  }
  built.Pos = pos;
  built.TryToClose(context);
  host.Data.splice(start, tokenIndex - start + 1, built);
  built.Parent = host;
  return built;
}
// kind === 6：export default <表达式>;
const defaultUnit = host.Data[secondIndex];
const lastIndex = tokenIndex;
let basePos = pos;
if (defaultUnit.SourceRange.End >= 0) {
  basePos = defaultUnit.SourceRange.EndIndex;
}
const expressionUnits:Array<Token> = host.Data.slice(secondIndex + 1, tokenIndex);
const builder = new ExpressionBuilder(host.Template, context);
builder.Load(expressionUnits, basePos);
const expression = builder.ParseExpression();
if (builder.At !== builder.Units.length) {
  throw new Error("export default 的表达式没有读完");
}
const built = new ExportAssignmentShape(host.Template);
built.Add(expression);
if (exportUnit.SourceRange.Start >= 0) {
  built.SignIn(exportUnit.SourceRange.StartIndex);
}
const asi = state !== null && state.Asi;
if (asi) {
  // 换行收口：End 取边界之前最后一个代码单元；splice 不含边界单元（它留给下一条语句）。
  let tail = tokenIndex - 1;
  while (tail >= 0 && host.Data[tail].IsTriviaToken) {
    tail--;
  }
  if (tail >= 0) {
    const tailEnd = host.Data[tail].SourceRange.End;
    if (tailEnd >= 0) {
      built.SignOut(tailEnd);
    }
  }
  built.Pos = pos;
  built.TryToClose(context);
  host.Data.splice(start, tokenIndex - start, built);
  built.Parent = host;
  return built;
}
if (host.Data[lastIndex].SourceRange.End >= 0) {
  built.SignOut(host.Data[lastIndex].SourceRange.EndIndex);
}
built.Pos = pos;
built.TryToClose(context);
host.Data.splice(start, tokenIndex - start + 1, built);
built.Parent = host;
return built;
```

## private static method IsNewDeclarationAfterLineBreak:(units:Array<Token>, index:int)=>bool

`index` 这一格是不是**换行之后开始的下一条声明 / 语句**（声明词、变量词、`export` / `import` /
`declare` / `abstract` / `async`）。`export function f(): void` ⏎ `interface I {}` /
`export default function (): void` ⏎ `class C {}` 里，函数签名在换行处 ASI 收口（TS 的
`parseFunctionBlockOrSemicolon` 只看紧跟参数表 / 返回类型的那个 token，不是 `{` 就收在签名上），
下一条声明的 `{…}` 不属于本条。候选的 Stage 16 / 23 原来「有闭合 `{` 就收作函数体」，
会把下一条声明的体吞进来（Y13）。判据与 EOF 尾随分界同口径：真换行 + 声明/语句关键字。

```ts
if (index < 0 || index >= units.length) {
  return false;
}
const unit = units[index];
if (!(unit instanceof Common)) {
  return false;
}
if (!StatementScanner.HasLineBreakBefore(units, index)) {
  return false;
}
const text = (unit as Common).TempToString();
if (StatementScanner.IsDeclarationKeyword(text)) {
  return true;
}
return text === "const" || text === "let" || text === "var" || text === "using"
  || text === "export" || text === "import" || text === "declare"
  || text === "abstract" || text === "async";
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
const state = cache.GetState<ExportDeclarationScan>(this.Slot());
if (state === null) {
  return false;
}
if (state.Stage === 2) {
  return true;
}
return state.Done && state.DoneAt === tokenIndex;
```
