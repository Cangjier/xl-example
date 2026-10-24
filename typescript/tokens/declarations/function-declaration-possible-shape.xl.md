# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ExpressionStatementShape } from "../statements/expression-statement-shape.xl.md"
import { StatementBuilder } from "../statements/statement-builder.xl.md"
import { ExpressionStatementPossibleShape } from "../statements/expression-statement-possible-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { FunctionDeclarationShape } from "./function-declaration-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
import { AngleJudge } from "../types/angle-judge.xl.md"
import { LineTerminator } from "../../run/line-terminator.xl.md"
import { StatementScanner } from "../statements/statement-scanner.xl.md"
import { StatementRoute } from "../statements/statement-route-util.xl.md"
import { StatementRouteUtil } from "../statements/statement-route-util.xl.md"
```

# namespace cangjie

# class FunctionDeclarationScan

判定状态。`Stage`：0 = 等 `declare` / `function`，6 = 见过 `declare` 等 `function`，1 = 等名字，
2 = 等参数表 `(`，3 = 参数表之后（等 `:` / 函数体 `{` / 无体 `;`），4 = 返回类型里（等函数体 `{` / `;`），
5 = 已经完整；`DoneAt` 记收尾那一格（函数体 `Bracket` 或 `;`）。

`SplitDeclare`：`declare` 与 `function` 之间换行时 TS 会按 ASI 拆成「ExpressionStatement(declare) + FunctionDeclaration」，
这时 `FunctionAt` 记 `function` 那一格的绝对下标，`BuildByIndex` 一次建两条。

## field Start:int = -1

## field Checked:int = 0

## field Stage:int = 0

## field Done:bool = false

## field DoneAt:int = -1

## field Rejected:bool = false

## field HasDeclare:bool = false

## field HasAsync:bool = false

## field SplitDeclare:bool = false

## field FunctionAt:int = -1

## field Angle:int = 0

## field SplitAt:int = -1

# class FunctionDeclarationPossibleShape extends PossibleShape

```txt
function f() {}
function f(a: A): B { return a; }
function f(a: A): B;
declare function f(): void;
```

根候选：条目可以从 `declare` 起（同一行紧跟 `function` 才算修饰符），名字、参数表 `(…)` 之后可以跟 `: 类型`，
最后一块是函数体 `{…}` 的 `Bracket` 或（无函数体声明）顶层 `;`。函数体内容由 `StatementBuilder` 建。
无体的 `;` 要求「有 `declare`」或「有返回类型」，所以根级的 `function f();` 会被拒绝。
`function*` 生成器的 `*` 在 Stage 1 被接受（仍等名字）；`async function` 与 `declare async function` 已支持（`AsyncKeyword` 子节点、按书写顺序），
`declare` / `async` 与 `function` 之间换行时按 TS 的 ASI 拆成「ExpressionStatement(修饰词) + FunctionDeclaration」；
泛型函数不在本批范围：`<` 会让扫描在对应 Stage 直接 `Reject`。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (StatementRouteUtil.Decide(units, tokenIndex) === StatementRoute.ShellDeclarationFamily) {
  // Stage 4r：声明 / 导入导出族由 `DeclarationStatementPossibleShape` 建壳，本 legacy 候选让位。
  // 不 Reject 就会被 `CatalogGuide` 当成「还能长」，与专用候选同格成立而永远等不到唯一候选。
  return ShapeStates.Reject;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<FunctionDeclarationScan>(name);
if (state === null) {
  state = new FunctionDeclarationScan();
  state.Start = ItemUtil.ItemStartCached(units, cache);
  state.Checked = state.Start;
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Start = ItemUtil.ItemStartCached(units, cache);
  state.Checked = state.Start;
  state.Stage = 0;
  state.Done = false;
  state.DoneAt = -1;
  state.Rejected = false;
  state.HasDeclare = false;
  state.HasAsync = false;
  state.SplitDeclare = false;
  state.FunctionAt = -1;
  state.Angle = 0;
  state.SplitAt = -1;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof EndOfFileTokenShape) {
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 0) {
    if (unit instanceof Common && (unit as Common).Is("declare")) {
      state.HasDeclare = true;
      state.Stage = 6;
      continue;
    }
    if (unit instanceof Common && (unit as Common).Is("async")) {
      state.HasAsync = true;
      state.Stage = 6;
      continue;
    }
    if (unit instanceof Common && (unit as Common).Is("function")) {
      state.Stage = 1;
      continue;
    }
    if (unit instanceof Symbol && (unit as Symbol).Is("@")) {
      // 装饰器前缀（`@dec function f() {}`）：TS 的 Decorator 是 FunctionDeclaration children 的第一项。
      state.Stage = 8;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 6) {
    if (unit instanceof Common && (unit as Common).Is("async") && !state.HasAsync) {
      // "declare async function ...": modifiers are emitted in written order.
      state.HasAsync = true;
      continue;
    }
    if (unit instanceof Common && (unit as Common).Is("function")) {
      if (FunctionDeclarationPossibleShape.NoNewlineBefore(units, at)) {
        state.Stage = 1;
        continue;
      }
      // ASI split: the modifier is its own ExpressionStatement, "function ..." starts a declaration.
      state.SplitDeclare = true;
      state.FunctionAt = at;
      state.Stage = 1;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 8) {
    // 装饰器前缀（只读扫描）：@dec / @ns.dec / @dec(…)；装饰器之后可以接 declare / async 修饰词，
    // 最后必须是 function。看到其它声明族的关键字就退出（避免与 class / interface / enum 候选共存）。
    if (unit instanceof Common) {
      const text = (unit as Common).TempToString();
      if (text === "function") {
        state.Stage = 1;
        continue;
      }
      if (text === "declare") {
        state.HasDeclare = true;
        continue;
      }
      if (text === "async") {
        state.HasAsync = true;
        continue;
      }
      let previous = at - 1;
      while (previous >= 0 && units[previous].IsTriviaToken) {
        previous--;
      }
      let afterDot = false;
      if (previous >= 0 && units[previous] instanceof Symbol) {
        const previousText = (units[previous] as Symbol).TempToString();
        afterDot = previousText === "." || previousText === "?.";
      }
      if (!afterDot && (text === "class" || text === "interface" || text === "type"
        || text === "enum" || text === "namespace" || text === "module"
        || text === "const" || text === "let" || text === "var" || text === "global")) {
        state.Rejected = true;
        continue;
      }
      continue;
    }
    if (unit instanceof Symbol || unit instanceof Bracket || unit instanceof String) {
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 1) {
    if (unit instanceof Symbol && (unit as Symbol).Is("*")) {
      // 生成器：`function*` 的星号不改变「还在等名字」的状态。
      continue;
    }
    if (unit instanceof Common) {
      state.Stage = 2;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 2) {
    if (unit instanceof Symbol && (unit as Symbol).Is("<")) {
      // Generic function: type parameter list between name and "(".
      state.Angle = 1;
      state.Stage = 7;
      continue;
    }
    if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(") {
      state.Stage = 3;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 7) {
    // Inside "<...>": 宽松数角一律交 AngleJudge.Shift（`>>` 一次关两层）。
    if (unit instanceof Symbol) {
      state.Angle = AngleJudge.Shift(unit, state.Angle);
      if (state.Angle <= 0) {
        state.Stage = 2;
      }
      continue;
    }
    // Type parameter names / "extends" / "=" / default / constraint types are all content here.
    continue;
  }
  if (state.Stage === 3) {
    // ASI: a statement word after a line break ends this declaration here (e.g. "declare function f(): void\nclass C {}").
    if (FunctionDeclarationPossibleShape.IsDecoratedDeclarationStart(units, at)) {
      // 换行后的 `@dec` 是**下一条声明**（装饰器属于它），本条无体函数到此结束。
      state.Rejected = true;
      continue;
    }
    if (unit instanceof Common
      && FunctionDeclarationPossibleShape.LineBreakBefore(units, at)
      && ExpressionStatementPossibleShape.IsStatementWord((unit as Common).TempToString())) {
      state.Rejected = true;
      continue;
    }
    if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
      state.Stage = 5;
      state.Done = true;
      state.DoneAt = at;
      continue;
    }
    if (unit instanceof Symbol && (unit as Symbol).Is(":")) {
      state.Stage = 4;
      continue;
    }
    if (unit instanceof Symbol && (unit as Symbol).Is(";") && state.HasDeclare) {
      state.Stage = 5;
      state.Done = true;
      state.DoneAt = at;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 4) {
    // ASI: a statement word after a line break ends the no-body declaration, even inside the return type.
    if (FunctionDeclarationPossibleShape.IsDecoratedDeclarationStart(units, at)) {
      // 返回类型之后换行、下一行以 `@` 开头：装饰器属于下一条声明，本函数在换行处截断（不再把
      // 下一条声明的 `{…}` 当成函数体）。与 `class` 等 statement word 同一条 ASI 边界，只是 `@` 是 Symbol。
      state.Rejected = true;
      continue;
    }
    if (unit instanceof Common
      && FunctionDeclarationPossibleShape.LineBreakBefore(units, at)
      && ExpressionStatementPossibleShape.IsStatementWord((unit as Common).TempToString())) {
      state.Rejected = true;
      continue;
    }
    if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
      // 返回类型里的对象字面量（`function f(): {a: A}`）不是函数体：只有前一个单元能收住一个类型时
      // 才是体（`function f(): B {}`）。否则继续留在 Stage 4，等 `;` / EOF / ASI 收口。
      if (TypeBuilder.IsBodyBrace(units, at)) {
        state.Stage = 5;
        state.Done = true;
        state.DoneAt = at;
      }
      continue;
    }
    if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
      state.Stage = 5;
      state.Done = true;
      state.DoneAt = at;
      continue;
    }
    // 返回类型之后换行、下一行以标识符开始的新语句（`declare function f<T>(): T` ⏎ `f<string>;`）：
    // TS 的 ASI 在这里把声明截断，剩下的单元是一条独立的 ExpressionStatement。
    // 这里只记截断点，等 `;` / EOF 收口时由 BuildByIndex 一次建两条（shape 不能返回兄弟节点）。
    const nextText = unit instanceof Common ? (unit as Common).TempToString() : "";
    const typeContinuation = nextText === "is" || nextText === "asserts" || nextText === "extends"
      || nextText === "keyof" || nextText === "infer" || nextText === "readonly"
      || nextText === "unique" || nextText === "typeof" || nextText === "in"
      || nextText === "out" || nextText === "as" || nextText === "satisfies"
      || nextText === "import";
    if (unit instanceof Common
      && !typeContinuation
      && FunctionDeclarationPossibleShape.LineBreakBefore(units, at)
      && !ExpressionStatementPossibleShape.IsStatementWord((unit as Common).TempToString())) {
      let previous = at - 1;
      while (previous >= 0 && units[previous].IsTriviaToken) {
        previous--;
      }
      let canEndType = false;
      if (previous >= 0) {
        const previousUnit = units[previous];
        if (previousUnit instanceof Common) {
          canEndType = true;
        } else if (previousUnit instanceof Bracket) {
          const bracketChar = (previousUnit as Bracket).StartBracketChar;
          canEndType = bracketChar === "(" || bracketChar === "[";
        } else if (previousUnit instanceof Symbol) {
          canEndType = (previousUnit as Symbol).Is(">");
        }
      }
      if (canEndType && state.SplitAt < 0) {
        state.SplitAt = at;
      }
      continue;
    }
    // Anything inside a return type (names / keywords / operators / brackets) is just type content.
    continue;
  }
  state.Rejected = true;
}
state.Checked = tokenIndex + 1;
if (state.Rejected) {
  return ShapeStates.Reject;
}
if (state.Done) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## static method NoNewlineBefore:(units:Array<Token>, at:int)=>bool

`at` 是 `function` 那一格；看前一个非 trivia 单元（`declare`）与它之间有没有换行。
TS 用换行触发 ASI，把 `declare` 拆成独立的 ExpressionStatement，所以这里必须区分。
行终止符口径统一交给 `LineTerminator`（LF / CR / U+2028 / U+2029，cover8-A）。

```ts
return !LineTerminator.HasBefore(units, at);
```

## static method LineBreakBefore:(units:Array<Token>, at:int)=>bool

`at` 是 statement word 那一格；看前一个非 trivia 单元与它之间有没有换行（空白块与块注释里的换行都算）。
ASI 用：`declare function f(): void\nclass C {}` 在 `class` 处结束前一条声明。
行终止符口径统一交给 `LineTerminator`（LF / CR / U+2028 / U+2029，cover8-A）。

```ts
return LineTerminator.HasBefore(units, at);
```

## static method IsDecoratedDeclarationStart:(units:Array<Token>, at:int)=>bool

`at` 这一格是不是「换行之后开始一条**带装饰器**的新声明」：`unit = @` 且与上一个非 trivia 单元之间有换行。
装饰器在 TS 词法里是 Symbol `@`（不是 `Common`），所以 `IsStatementWord` 那条 ASI 判据看不到它；
`declare function f(): void` ⏎ `@dec class C {}` 会在 `@` 处被继续当成返回类型内容，最终把下一条声明的
`{…}` 收成函数体。这里把「换行后的 `@`」与 statement word 同等对待：

- Stage 3（参数表之后、返回类型冒号之前）与 Stage 4（返回类型里）遇到它都 `Reject`，本条无体函数
  在换行处收口，装饰器声明留给下一条（EOF/ASI 收口侧）。
- 同一行内的 `@` 不是边界（`function f(): @dec` 这种形态 TS 本身非法），所以只认带换行的。

判据只有一份：`StatementScanner.IsDecoratedDeclarationStart`（与 `source-file-end` 的装饰器声明头
分派、`statement-builder.ScanDecoratedHead` 同口径，见 cover9 A 组）。

```ts
return StatementScanner.IsDecoratedDeclarationStart(units, at);
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const state = cache.GetState<FunctionDeclarationScan>(this.Slot());
return state !== null && state.Done && !state.Rejected && state.DoneAt === tokenIndex;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<FunctionDeclarationScan>(this.Slot());
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (start > tokenIndex) {
  return host;
}
if (state !== null && state.SplitDeclare && state.FunctionAt > start) {
  let declareAt = start;
  while (declareAt < host.Data.length && host.Data[declareAt].IsTriviaToken) {
    declareAt++;
  }
  const declareUnit = host.Data[declareAt];
  if (!(declareUnit instanceof Common)) {
    throw new Error("declare function: missing declare keyword");
  }
  // 文件首语句的 Pos 要含前导 trivia（TS 口径：第一条语句 pos=0）；没有前一代码单元时就是 0，
  // 不能退回到修饰词自己的起点（`// c` ⏎ `async` ⏎ `function` 的 pos 必须是 0 而不是 5）。
  let expressionPos = 0;
  for (let at = start - 1; at >= 0; at--) {
    if (!host.Data[at].IsTriviaToken) {
      const end = host.Data[at].SourceRange.EndIndex;
      if (end !== null) {
        expressionPos = end;
      }
      break;
    }
  }
  const expression = new ExpressionStatementShape(host.Template);
  const identifier = IdentifierShape.FromBasicToken(declareUnit as Common, context);
  identifier.Pos = expressionPos;
  expression.Expression = identifier;
  expression.Add(identifier);
  if (declareUnit.SourceRange.StartIndex >= 0) {
    expression.SignIn(declareUnit.SourceRange.Start);
  }
  if (declareUnit.SourceRange.EndIndex >= 0) {
    expression.SignOut(declareUnit.SourceRange.End);
  }
  expression.Pos = expressionPos;
  expression.TryToClose(context);
  const declaration = FunctionDeclarationShape.FromUnits(host, state.FunctionAt, tokenIndex, context);
  declaration.Pos = declareUnit.SourceRange.EndIndex < 0 ? 0 : declareUnit.SourceRange.EndIndex;
  host.Data.splice(start, tokenIndex - start + 1, expression, declaration);
  expression.Parent = host;
  declaration.Parent = host;
  return declaration;
}
const splitAt = state === null ? -1 : state.SplitAt;
if (state !== null && splitAt > start && splitAt <= tokenIndex) {
  // 被 ASI 截断：声明建到截断点前一个代码单元，剩余单元作为兄弟语句建出。
  let declarationEnd = splitAt - 1;
  while (declarationEnd >= start && host.Data[declarationEnd].IsTriviaToken) {
    declarationEnd--;
  }
  const declaration = FunctionDeclarationShape.FromUnits(host, start, declarationEnd, context, true);
  // 截断点之后的尾巴不一定是表达式语句：`declare function gf(): void` ⏎ `global {}` 的尾巴是
  // ModuleDeclaration 的 global 关键字形（TS 同款：ModuleDeclaration > Identifier + ModuleBlock）。
  // 交给 `StatementBuilder` 的语句分派建；其它形态仍按表达式语句建（不扩大改动面）。
  const trailingHead = host.Data[splitAt];
  let trailing:Token;
  if (trailingHead instanceof Common && (trailingHead as Common).Is("global")) {
    let trailingPos = 0;
    for (let at = splitAt - 1; at >= 0; at--) {
      if (!host.Data[at].IsTriviaToken) {
        const previousEnd = host.Data[at].SourceRange.EndIndex;
        if (previousEnd >= 0) {
          trailingPos = previousEnd;
        }
        break;
      }
    }
    const trailingBuilder = new StatementBuilder(host.Template, context);
    trailingBuilder.Load(host.Data.slice(splitAt, tokenIndex + 1), trailingPos);
    trailing = trailingBuilder.BuildStatement();
  } else {
    trailing = ExpressionStatementShape.FromUnits(host, splitAt, tokenIndex, context, true);
  }
  host.Data.splice(start, tokenIndex - start + 1, declaration, trailing);
  declaration.Parent = host;
  trailing.Parent = host;
  return declaration;
}
const built = FunctionDeclarationShape.FromUnits(host, start, tokenIndex, context);
host.Data.splice(start, tokenIndex - start + 1, built);
built.Parent = host;
return built;
```
