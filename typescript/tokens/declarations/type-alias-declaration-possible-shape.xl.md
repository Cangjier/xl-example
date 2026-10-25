# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { RegexToken } from "../../../core/syntax/basic-tokens/regex-token.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { ExpressionStatementPossibleShape } from "../statements/expression-statement-possible-shape.xl.md"
import { TypeAliasDeclarationShape } from "./type-alias-declaration-shape.xl.md"
import { LineTerminator } from "../../run/line-terminator.xl.md"
import { StatementRoute } from "../statements/statement-route-util.xl.md"
import { StatementRouteUtil } from "../statements/statement-route-util.xl.md"
```

# namespace cangjie

# class TypeAliasDeclarationScan

## field Start:int = -1

## field Checked:int = 0

## field Stage:int = 0

## field Done:bool = false

## field DoneAt:int = -1

## field Rejected:bool = false

## field SeenEqual:bool = false

## field NameAt:int = -1

## field LastCode:int = -1

## field AsiEnd:bool = false

## field SawDecorator:bool = false

# class TypeAliasDeclarationPossibleShape extends PossibleShape

```txt
type T = number;
type T = A | B;
type T = A<B>;
declare type T = A;
export declare type T = A;
type T = A
["k"];
type X = number
export type { X }
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (StatementRouteUtil.ShouldYieldToDeclarationShell(units, tokenIndex)) {
  // Stage 4x：与壳的晚建守卫同一判据（route 命中 && 壳这一格不会建壳）才让位。
  // 只看 route 会让「上一条语句已收口」的格子（`}` ⏎ `export`）两边都退 → 文件级 fallback。
  return ShapeStates.Reject;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<TypeAliasDeclarationScan>(name);
if (state === null) {
  state = new TypeAliasDeclarationScan();
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
  state.SeenEqual = false;
  state.LastCode = -1;
  state.NameAt = -1;
  state.AsiEnd = false;
  state.SawDecorator = false;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (state.Rejected || state.Done) {
    continue;
  }
  if (unit instanceof EndOfFileTokenShape) {
    // 文件到头了：这条声明不可能再补 `;`。候选退出，把边界收尾交给终结候选。
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 0) {
    if (unit instanceof Common && (unit as Common).Is("declare")) {
      continue;
    }
    if (unit instanceof Common && (unit as Common).Is("export")) {
      state.Stage = 3;
      continue;
    }
    if (unit instanceof Common && (unit as Common).Is("type")) {
      state.Stage = 1;
      continue;
    }
    if (unit instanceof Symbol && (unit as Symbol).Is("@")) {
      state.Stage = 6;
      state.SawDecorator = true;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 6) {
    // 装饰器前缀（只读扫描）：等到 type / export / declare；其它声明族的关键字直接退出。
    if (unit instanceof Common) {
      const text = (unit as Common).TempToString();
      if (text === "type") {
        state.Stage = 1;
        continue;
      }
      if (text === "export") {
        state.Stage = 3;
        continue;
      }
      if (text === "declare") {
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
      if (!afterDot && (text === "class" || text === "interface" || text === "namespace"
        || text === "module" || text === "enum" || text === "function"
        || text === "const" || text === "let" || text === "var" || text === "global")) {
        state.Rejected = true;
        continue;
      }
      continue;
    }
    if (unit instanceof Bracket || unit instanceof Symbol || unit instanceof String) {
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 3) {
    if (state.SawDecorator && unit instanceof Common && (unit as Common).Is("declare")) {
      continue;
    }
    if (unit instanceof Common && (unit as Common).Is("type")) {
      state.Stage = 1;
      continue;
    }
    state.Rejected = true;
    continue;
  }
  if (state.Stage === 1) {
    // `type` 后面必须紧跟声明名（`Common` 标识符）；`type = 1` 里的 `=` / `;` / EOF
    // 都不是名字——那是赋值表达式语句，别名候选必须当场退出，把位置留给 ExpressionStatement。
    // `type { … }` / `type * …` 是 export 声明形态（`export type { T }`），也退出。
    if ((unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{")
      || (unit instanceof Symbol && (unit as Symbol).Is("*"))) {
      state.Rejected = true;
      continue;
    }
    if (!(unit instanceof Common)) {
      state.Rejected = true;
      continue;
    }
    // TS nextTokenIsIdentifierOnSameLine：名字必须与 `type` **同行**。有行终止符（LF/CR/LS/PS、
    // 行注释的换行、块注释里的换行都算）时 `type` 只是标识符——`type` ⏎ `T = 1` 是两条
    // ExpressionStatement，本候选必须当场退出，否则它会活到边界格与根终结候选同时 Accept
    //（CatalogGuide 抛「终结候选与其它候选同时成立」）。
    let typeAt = at - 1;
    while (typeAt >= 0 && units[typeAt].IsTriviaToken) {
      typeAt--;
    }
    if (typeAt >= 0 && TypeAliasDeclarationPossibleShape.HasLineBreakBetween(units, typeAt, at)) {
      state.Rejected = true;
      continue;
    }
    state.NameAt = at;
    state.Stage = 2;
    continue;
  }
  if (state.Stage === 2 && !state.SeenEqual && state.NameAt >= 0 && at > state.NameAt) {
    // 名字之后、等号之前的第一个代码单元只能是 `=` 或类型参数 `<`。
    // 别的（例如 `type\nT` 的 EOF、`type T` 后跟的下一条语句首词）说明它根本不是别名，
    // 候选当场退出，别再拖到 build 才抛「类型别名声明不完整」。
    const afterName = unit instanceof Symbol ? (unit as Symbol).TempToString() : "";
    if (afterName !== "=" && afterName !== "<") {
      state.Rejected = true;
      continue;
    }
    state.NameAt = -1;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
    state.Done = true;
    if (state.DoneAt < 0) {
      state.DoneAt = at;
    }
    state.LastCode = at;
    continue;
  }
  if (state.SeenEqual && state.LastCode >= 0
    && TypeAliasDeclarationPossibleShape.HasLineBreakBetween(units, state.LastCode, at)
    && TypeAliasDeclarationPossibleShape.CanEndTypeAt(units[state.LastCode])
    // 函数类型的类型参数表 `= <U>` 之后那个 `(` 是参数表，不是新语句。
    && !(unit instanceof Bracket && (unit as Bracket).StartBracketChar === "("
      && TypeAliasDeclarationPossibleShape.ClosesFunctionTypeParameters(units, state.LastCode))
    && TypeAliasDeclarationPossibleShape.IsAsiBoundary(units, state.LastCode, at)) {
    state.Done = true;
    state.AsiEnd = true;
    if (state.DoneAt < 0) {
      state.DoneAt = at;
    }
    state.LastCode = at;
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
    state.SeenEqual = true;
  }
  state.LastCode = at;
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

## static method HasLineBreakBetween:(units:Array<Token>, from:int, to:int)=>bool

```ts
const left = units[from].SourceRange;
const right = units[to].SourceRange;
if (left.EndIndex >= 0 && right.StartIndex >= 0) {
  return LineTerminator.HasBetween(left, right);
}
for (let at = from + 1; at < to; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken && LineTerminator.HasLineBreakUnit(unit)) {
    return true;
  }
}
return false;
```

## static method IsAsiBoundary:(units:Array<Token>, last:int, at:int)=>bool

```ts
const unit = units[at];
if (unit instanceof Bracket) {
  const startChar = (unit as Bracket).StartBracketChar;
  // `[` / `(` / `{` 都接不上一个已完成的类型：TS 的索引访问类型只在同一行吃 `[`，
  // `(` 是下一条表达式语句（泛型函数类型参数表例外），`{` 是下一条块语句 / 对象字面量。
  if (startChar === "[" || startChar === "{") {
    return true;
  }
  if (startChar !== "(") {
    return false;
  }
  // 泛型函数类型的参数表：`<T>` ⏎ `(a: T) => T` 的 `(` 不是新语句。
  return !TypeAliasDeclarationPossibleShape.IsTypeParameterListTail(units, last);
}
if (unit instanceof String || unit instanceof RegexToken) {
  // 字面量（含模板 / 正则）不能续接类型：`type T = A` ⏎ 字符串 / 模板 / 正则 都是下一条语句。
  return true;
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  // **Stage 5d-8c：`;` 是本条声明自己的终结符，不是 ASI 边界**。TS 的 `parseSemicolon` 不看换行，
  // 所以 `type T = A | B` ⏎ `;` 的 `;` 属于这条类型别名（类型末尾跟着一条行注释时同样如此）。
  // 少了这一条，`BuildTypeAliasDeclaration` 的扫描会把换行后的 `;` 当成下一条语句的开头：
  // 别名在 `B` 收尾，`;` 留在壳里没人消费 → `BuildFromShell` 抛「语句没有读完」→ 文件级 fallback。
  // 状态机那一侧（`ComputeByIndex`）在 ASI 判据之前就有 `;` 分支，所以这一格只影响建造器。
  if (text === ";") {
    return false;
  }
  // `<` 只有在同一行才能续接一个类型（TS 的 parseTypeArgumentsOfTypeReference 在
  // `scanner.hasPrecedingLineBreak()` 时根本不解析类型实参）。本判据只在调用方已经确认
  // 「`last` 与 `at` 之间有换行」时被调用，所以这里的 `<` 是下一条语句的起点：
  // `type T = A` ⏎ `<B>c;` = TypeAliasDeclaration + ExpressionStatement(TypeAssertion)。
  if (text === "<") {
    return true;
  }
  // 类型续接符：联合 / 交叉 / 类型实参收尾 / 成员名 / 条件类型 / 函数类型 / 声明列表 / 类型标注。
  return !(text === "|" || text === "&" || text === ">" || text === ">>"
    || text === ">>>" || text === "." || text === "?" || text === ":" || text === "=>"
    || text === "," || text === "=" );
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  // 类型位的前缀 / 中缀关键字：类型还能接着长。
  return !(text === "extends" || text === "infer" || text === "keyof" || text === "typeof"
    || text === "readonly" || text === "unique" || text === "is" || text === "asserts"
    || text === "import" || text === "new" || text === "in" || text === "out"
    || text === "abstract" || text === "as" || text === "satisfies");
}
return true;
```

## static method IsTypeParameterListTail:(units:Array<Token>, last:int)=>bool

```ts
const tail = units[last];
if (!(tail instanceof Symbol) || !((tail as Symbol).Is(">") || (tail as Symbol).Is(">>") || (tail as Symbol).Is(">>>"))) {
  return false;
}
let depth = 0;
let open = -1;
for (let at = last; at >= 0; at--) {
  const unit = units[at];
  if (unit.IsTriviaToken || !(unit instanceof Symbol)) {
    continue;
  }
  const text = (unit as Symbol).TempToString();
  if (text === ">") {
    depth++;
    continue;
  }
  if (text === ">>") {
    depth += 2;
    continue;
  }
  if (text === ">>>") {
    depth += 3;
    continue;
  }
  if (text === "<") {
    depth--;
    if (depth <= 0) {
      open = at;
      break;
    }
  }
}
if (open < 0) {
  return false;
}
for (let at = open - 1; at >= 0; at--) {
  if (units[at].IsTriviaToken) {
    continue;
  }
  return units[at] instanceof Symbol && (units[at] as Symbol).Is("=");
}
return false;
```

## static method CanEndTypeAt:(unit:Token)=>bool

```ts
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  // `-` 是负数字面量类型的前缀（`type T = -1`），还在等操作数。
  return !(text === "=" || text === "|" || text === "&" || text === "<"
    || text === "?" || text === ":" || text === "=>" || text === "." || text === ","
    // 前缀运算符还在等操作数（`type T = -` ⏎ `/*c*/1` 的 `-` 与数字是同一格类型）。
    || text === "-" || text === "+" || text === "!" || text === "~" || text === "*");
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  // 还等着操作数的**类型运算符词**收不住类型：`type T = keyof` ⏎ `A` 是同一个类型，
  // 不能在 `keyof` 之后当边界（`typeof` / `readonly` / `unique` / `infer` / `new` /
  // `import` / `asserts` / `is` / `extends` 同理）。完型字面量词（`void` / `null` /
  // `true` / `string` …）与普通标识符照旧算收得住。
  return !(text === "keyof" || text === "typeof" || text === "readonly"
    || text === "unique" || text === "infer" || text === "new" || text === "abstract"
    || text === "import" || text === "asserts" || text === "assert" || text === "is"
    || text === "extends" || text === "in" || text === "of"
    || text === "as" || text === "satisfies");
}
return true;
```

## static method ClosesFunctionTypeParameters:(units:Array<Token>, index:int)=>bool

```ts
if (index < 0 || index >= units.length || !(units[index] instanceof Symbol)) {
  return false;
}
const tail = (units[index] as Symbol).TempToString();
if (tail !== ">" && tail !== ">>" && tail !== ">>>") {
  return false;
}
let depth = 0;
for (let at = index; at >= 0; at--) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (!(unit instanceof Symbol)) {
    if (depth === 0) {
      return false;
    }
    continue;
  }
  const text = (unit as Symbol).TempToString();
  if (text === ">" || text === ">>" || text === ">>>") {
    depth++;
    continue;
  }
  if (text === "<") {
    depth--;
    if (depth === 0) {
      let before = at - 1;
      while (before >= 0 && units[before].IsTriviaToken) {
        before--;
      }
      return before >= 0 && units[before] instanceof Symbol
        && (units[before] as Symbol).Is("=");
    }
  }
}
return false;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const state = cache.GetState<TypeAliasDeclarationScan>(this.Slot());
return state !== null && state.Done && !state.Rejected && state.DoneAt === tokenIndex;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<TypeAliasDeclarationScan>(this.Slot());
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
let end = tokenIndex;
if (state !== null && state.AsiEnd) {
  end = tokenIndex - 1;
}
while (end >= start && host.Data[end].IsTriviaToken) {
  end--;
}
if (end < start) {
  return host;
}
const built = TypeAliasDeclarationShape.FromUnits(host, start, end, context);
host.Data.splice(start, end - start + 1, built);
built.Parent = host;
return built;
```
