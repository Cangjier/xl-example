# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { AreaAnnotation } from "../../../core/syntax/basic-tokens/area-annotation.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { RegexToken } from "../../../core/syntax/basic-tokens/regex-token.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { WrapSymbol } from "../../../core/syntax/basic-tokens/wrap-symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ExpressionStatementShape } from "./expression-statement-shape.xl.md"
```

# namespace cangjie

# class ExpressionStatementScan

## field Start:int = -1

## field Checked:int = 0

## field Admitted:bool = false

## field Done:bool = false

## field DoneAt:int = -1

## field Rejected:bool = false

# class ExpressionStatementPossibleShape extends PossibleShape

```txt
a;
a + b * c;
f(a, b).c;
a ? b : c;
a = b, c = d;
```

## method CanStart:(unit:Token)=>bool

```ts
if (unit instanceof Bracket) {
  // 本批只放开 `[`（数组字面量）：builder 的 ParsePrimary `[` 分支已就绪（`f([1, 2])` 已绿）。
  // 目标（本批不放，各有依赖）：`<`（尖括号断言 / 泛型箭头，缺 ParseType）、
  // `async`（缺箭头产生式）、`import`（import.meta，缺 MetaProperty 分支）、
  // `{`（块 / 对象二义，需要先有块候选）。
  return (unit as Bracket).StartBracketChar === "("
    || (unit as Bracket).StartBracketChar === "[";
}
if (unit instanceof RegexToken) {
  return true;
}
if (unit instanceof String) {
  return true;
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "!"
    || text === "~"
    || text === "+"
    || text === "-"
    || text === "++"
    || text === "--";
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (text === "true" || text === "false" || text === "null" || text === "this") {
    return true;
  }
  if (text === "typeof" || text === "void" || text === "delete" || text === "new") {
    return true;
  }
  if ((unit as Common).CanStartNumber()) {
    return true;
  }
  return !ExpressionStatementPossibleShape.IsStatementWord(text);
}
return false;
```

## static method IsStatementWord:(text:string)=>bool

语句 / 声明开头的关键字：它们既不能起始一条表达式语句（`CanStart` 的排除表），
也收不住一条完整表达式（`CanEndExpression` 的排除表）——`export\n{ a };` 里那个 `export` 后面就不许断句。
两张表共用这一份，免得一处放开、一处漏掉。

```ts
return text === "import"
  || text === "export"
  || text === "declare"
  || text === "const"
  || text === "let"
  || text === "var"
  || text === "function"
  || text === "class"
  || text === "interface"
  || text === "enum"
  || text === "namespace"
  || text === "module"
  || text === "type"
  || text === "if"
  || text === "else"
  || text === "for"
  || text === "while"
  || text === "do"
  || text === "switch"
  || text === "case"
  || text === "default"
  || text === "try"
  || text === "catch"
  || text === "finally"
  || text === "throw"
  || text === "return"
  || text === "break"
  || text === "continue"
  || text === "debugger"
  || text === "with"
  || text === "extends"
  || text === "implements"
  || text === "abstract"
  || text === "public"
  || text === "private"
  || text === "protected"
  || text === "static"
  || text === "readonly"
  || text === "async"
  || text === "await"
  || text === "yield"
  || text === "using";
```

## static method HasLineBreak:(unit:Token)=>bool

这个 trivia 单元里有没有换行。空白块看 `Temp`；区域注释看 `Tmp`——**块注释里的换行同样是换行**
（`a /* \n */ ++b` 与 `a \n ++b` 一样断句）。行注释自己不包含换行（换行是它后面那个空白块）。

```ts
if (unit instanceof WrapSymbol) {
  const text = (unit as WrapSymbol).TempToString();
  return text.includes("\n") || text.includes("\r");
}
if (unit instanceof AreaAnnotation) {
  const text = (unit as AreaAnnotation).Tmp;
  return text.includes("\n") || text.includes("\r");
}
return false;
```

## static method CanEndExpression:(unit:Token)=>bool

这个代码单元能不能收住一条完整的表达式。ASI 只在**前面这句话已经能独立成立**时才断句：
`typeof` / `void` / `delete` / `new` 与二元关键字都还在等右操作数，`a +\nb` 里 `+` 后面换行也不能断。
后缀 `++` / `--` 可以收尾（`a++\nb` 断句），前缀形态的 `++` / `--` 交给 `b` 自己去起始。

```ts
if (unit instanceof Bracket) {
  const start = (unit as Bracket).StartBracketChar;
  return start === "(" || start === "[";
}
if (unit instanceof String || unit instanceof RegexToken) {
  return true;
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "++" || text === "--";
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  return !ExpressionStatementPossibleShape.IsStatementWord(text)
    && text !== "typeof"
    && text !== "void"
    && text !== "delete"
    && text !== "new"
    && text !== "in"
    && text !== "instanceof"
    && text !== "as"
    && text !== "satisfies"
    && text !== "keyof";
}
return false;
```

## static method IsContinuation:(unit:Token)=>bool

换行之后到来的这个代码单元能不能接在上一条表达式后面——**能接就不许断句**。
`(` / `[` 是调用与成员访问；反引号模板是标签模板（普通引号串不算，`a\n"s"` 要断成两条）；
标点按正向清单（只收二元 / 赋值 / 三元 / 成员 / 逗号 / 箭头，`++` / `--` / `;` / `!` / `~` 都不收）；
`in` / `instanceof` / `as` / `satisfies` 是关键字形态的延续符。

```ts
if (unit instanceof Bracket) {
  const start = (unit as Bracket).StartBracketChar;
  return start === "(" || start === "[";
}
if (unit instanceof String) {
  return (unit as String).StringChar === "`";
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "+"
    || text === "-"
    || text === "*"
    || text === "/"
    || text === "%"
    || text === "**"
    || text === "<"
    || text === ">"
    || text === "<="
    || text === ">="
    || text === "=="
    || text === "!="
    || text === "==="
    || text === "!=="
    || text === "&"
    || text === "|"
    || text === "^"
    || text === "&&"
    || text === "||"
    || text === "??"
    || text === "<<"
    || text === ">>"
    || text === ">>>"
    || text === "="
    || text === "+="
    || text === "-="
    || text === "*="
    || text === "/="
    || text === "%="
    || text === "**="
    || text === "&="
    || text === "|="
    || text === "^="
    || text === "&&="
    || text === "||="
    || text === "??="
    || text === "<<="
    || text === ">>="
    || text === ">>>="
    || text === "."
    || text === "?."
    || text === ","
    || text === "?"
    || text === ":"
    || text === "=>"
    || text === "...";
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  return text === "in" || text === "instanceof" || text === "as" || text === "satisfies";
}
return false;
```

## static method IsAsiBoundary:(units:Array<Token>, tokenIndex:int)=>bool

**ASI 判据**：`tokenIndex` 这个代码单元到得太晚——上一条表达式已经在换行处结束了。五条同时成立：

1. 当前单元是代码（trivia 与 EOF 哨兵都不算）；
2. 它前面还有代码单元 `prev`，且 `prev` 能收住一条完整表达式；
3. `prev` 与它之间至少有一个换行 trivia（注释里的换行也算）；
4. 当前单元接不上上一条表达式（不是延续符）；
5. **本条语句是表达式语句**：以语句 / 声明关键字开头的条目（`class` / `interface` / `enum` / `declare` / …）
   后面的换行不是 ASI 边界——`class C\n{}` 的 `{` 是类体，`C` 只是声明头的一部分，
   那里根本不存在「上一条表达式」。

它只回答「该断句」，不建形状：普通候选靠它 `Reject`，终结候选靠它 `Accept`，
两侧读的是同一个函数，所以不会一边断、一边不断。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const current = units[tokenIndex];
if (current.IsTriviaToken || current instanceof EndOfFileTokenShape) {
  return false;
}
// `;` 是语句自己的终结符（`Done` 那一条路），不是 ASI 边界：`a\n;` 仍是一条。
if (current instanceof Symbol && (current as Symbol).Is(";")) {
  return false;
}
let prev = tokenIndex - 1;
let lineBreak = false;
while (prev >= 0) {
  const unit = units[prev];
  if (!unit.IsTriviaToken) {
    break;
  }
  if (ExpressionStatementPossibleShape.HasLineBreak(unit)) {
    lineBreak = true;
  }
  prev--;
}
if (prev < 0 || !lineBreak) {
  return false;
}
if (!ExpressionStatementPossibleShape.CanEndExpression(units[prev])) {
  return false;
}
// 本条语句的起点：从 prev 往回跳过属于自己的 basic token（遇到建好的形状就停）。
let head = prev;
while (head > 0 && units[head - 1].IsBasicToken) {
  head--;
}
while (head < prev && units[head].IsTriviaToken) {
  head++;
}
if (units[head] instanceof Common
  && ExpressionStatementPossibleShape.IsStatementWord((units[head] as Common).TempToString())) {
  return false;
}
return !ExpressionStatementPossibleShape.IsContinuation(current);
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
let state = cache.GetState<ExpressionStatementScan>(name);
if (state === null) {
  state = new ExpressionStatementScan();
  state.Start = ItemUtil.ItemStart(units);
  state.Checked = state.Start;
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Start = ItemUtil.ItemStart(units);
  state.Checked = state.Start;
  state.Admitted = false;
  state.Done = false;
  state.DoneAt = -1;
  state.Rejected = false;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof EndOfFileTokenShape) {
    // 文件到头了：本条语句不可能再补 `;`。候选退出，把「建到边界为止」交给终结候选。
    state.Rejected = true;
    continue;
  }
  if (!state.Admitted) {
    state.Admitted = true;
    if (!this.CanStart(unit)) {
      state.Rejected = true;
    }
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
    state.Done = true;
    if (state.DoneAt < 0) {
      state.DoneAt = at;
    }
  }
}
// ASI：换行后到来的这个代码单元接不上前一条表达式，说明本条语句在换行处就结束了。
// 这里只「退出」——建那条语句是根终结候选的事（按边界 `FromUnits(..., false)` 收尾）。
if (!state.Done && ExpressionStatementPossibleShape.IsAsiBoundary(units, tokenIndex)) {
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

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const state = cache.GetState<ExpressionStatementScan>(this.constructor.name);
return state !== null && state.Done && !state.Rejected && state.DoneAt === tokenIndex;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<ExpressionStatementScan>(this.constructor.name);
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
const built = ExpressionStatementShape.FromUnits(host, start, tokenIndex, context);
host.Data.splice(start, tokenIndex - start + 1, built);
built.Parent = host;
return built;
```
