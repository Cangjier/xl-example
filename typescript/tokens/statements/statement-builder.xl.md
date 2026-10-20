# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { VariableDeclarationListShape } from "../declarations/variable-declaration-list-shape.xl.md"
import { VariableDeclarationShape } from "../declarations/variable-declaration-shape.xl.md"
import { BlockShape } from "./block-shape.xl.md"
import { BreakStatementShape } from "./break-statement-shape.xl.md"
import { ContinueStatementShape } from "./continue-statement-shape.xl.md"
import { DebuggerStatementShape } from "./debugger-statement-shape.xl.md"
import { DoStatementShape } from "./do-statement-shape.xl.md"
import { EmptyStatementShape } from "./empty-statement-shape.xl.md"
import { ExpressionStatementShape } from "./expression-statement-shape.xl.md"
import { ForInStatementShape } from "./for-in-statement-shape.xl.md"
import { ForOfStatementShape } from "./for-of-statement-shape.xl.md"
import { ForStatementShape } from "./for-statement-shape.xl.md"
import { IfStatementShape } from "./if-statement-shape.xl.md"
import { LabeledStatementShape } from "./labeled-statement-shape.xl.md"
import { ReturnStatementShape } from "./return-statement-shape.xl.md"
import { ThrowStatementShape } from "./throw-statement-shape.xl.md"
import { VariableStatementShape } from "./variable-statement-shape.xl.md"
import { WhileStatementShape } from "./while-statement-shape.xl.md"
```

# namespace cangjie

# class StatementBuilder

语句的**递归下降建树器**：输入一段已经到齐的代码单元（根级一条语句，或块 / 体里的一条语句），输出形状树。

它建的是「原子型」：一条语句到齐时一次建完，子语句在递归里各自建好；表达式片段交给 `ExpressionBuilder`。

## field Template:Template

## field Context:SyntaxContext

## field Units:Array<Token> = []

## field Positions:Array<int> = []

## field At:int = 0

## constructor:(template:Template, context:SyntaxContext)=>void

```ts
this.Template = template;
this.Context = context;
```

## method Load:(units:Array<Token>, basePos:int)=>void

把一段单元载进来：跳过 trivia，同时算每个代码单元的 `Pos`（含前导 trivia）——口径与 `ExpressionBuilder.Load` 相同。

```ts
this.Units = [];
this.Positions = [];
this.At = 0;
let pos = basePos;
for (const unit of units) {
  if (unit.IsTriviaToken) {
    continue;
  }
  this.Units.push(unit);
  this.Positions.push(pos);
  if (unit.SourceRange.End !== null) {
    pos = unit.SourceRange.End.Index + 1;
  }
}
```

## method Peek:(offset:int)=>Token | null

```ts
const index = this.At + offset;
if (index < 0 || index >= this.Units.length) {
  return null;
}
return this.Units[index];
```

## method TextOf:(unit:Token)=>string

```ts
if (unit instanceof Common) {
  return (unit as Common).TempToString();
}
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
return "";
```

## method IsText:(unit:Token, text:string)=>bool

```ts
return this.TextOf(unit) === text;
```

## method IsSymbol:(unit:Token, text:string)=>bool

```ts
return unit instanceof Symbol && (unit as Symbol).Is(text);
```

## method IsVariableKeyword:(unit:Token)=>bool

```ts
if (!(unit instanceof Common)) {
  return false;
}
const text = (unit as Common).TempToString();
return text === "let" || text === "const" || text === "var";
```

## method Finish:(shape:ShapeToken, first:int, last:int)=>ShapeToken

签入签出、给 `Pos`、关闭：一条语句的收尾全在这一个方法里。

```ts
const head = this.Units[first];
const tail = this.Units[last];
if (head.SourceRange.Start !== null) {
  shape.SignIn(head.SourceRange.Start);
}
if (tail.SourceRange.End !== null) {
  shape.SignOut(tail.SourceRange.End);
}
shape.Pos = this.Positions[first];
shape.TryToClose(this.Context);
return shape;
```

## method BuildExpressionRange:(first:int, last:int)=>Token

把一个表达式片段（单元下标闭区间）交给 `ExpressionBuilder`，要求整段读完。

```ts
if (last < first) {
  throw new Error("表达式片段为空");
}
const units:Array<Token> = [];
for (let at = first; at <= last; at++) {
  units.push(this.Units[at]);
}
const builder = new ExpressionBuilder(this.Template, this.Context);
builder.Load(units, this.Positions[first]);
const value = builder.ParseExpression();
if (builder.At !== builder.Units.length) {
  throw new Error("表达式没有读完");
}
return value;
```

## method ParseBracketExpression:(bracket:Bracket)=>Token

括号里的整个表达式（条件 / 循环头 / `do-while` 条件）。

```ts
const inner = new ExpressionBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
if (inner.Units.length === 0) {
  throw new Error("括号内没有表达式");
}
const value = inner.ParseExpression();
if (inner.At !== inner.Units.length) {
  throw new Error("括号内的表达式没有读完");
}
return value;
```

## method BuildStatement:()=>Token

一条语句的分派：块 / 空语句 / 关键字族 / 标签 / 表达式语句。

```ts
if (this.At >= this.Units.length) {
  throw new Error("语句意外结束");
}
const unit = this.Units[this.At];
if (unit instanceof Bracket) {
  if ((unit as Bracket).StartBracketChar === "{") {
    return this.BuildBlock();
  }
  return this.BuildExpressionStatement();
}
if (unit instanceof Symbol) {
  if ((unit as Symbol).Is(";")) {
    return this.BuildEmpty();
  }
  return this.BuildExpressionStatement();
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (text === "let" || text === "const" || text === "var") {
    return this.BuildVariableStatement();
  }
  if (text === "if") {
    return this.BuildIf();
  }
  if (text === "while") {
    return this.BuildWhile();
  }
  if (text === "do") {
    return this.BuildDo();
  }
  if (text === "for") {
    return this.BuildFor();
  }
  if (text === "return") {
    return this.BuildReturnOrThrow(false);
  }
  if (text === "throw") {
    return this.BuildReturnOrThrow(true);
  }
  if (text === "break") {
    return this.BuildBreakOrContinue(false);
  }
  if (text === "continue") {
    return this.BuildBreakOrContinue(true);
  }
  if (text === "debugger") {
    return this.BuildDebugger();
  }
  const next = this.Peek(1);
  if (next !== null && this.IsText(next, ":")) {
    return this.BuildLabeled();
  }
}
return this.BuildExpressionStatement();
```

## method BuildBlock:()=>Token

块：`{` … `}` 是一个括号单元，里面的语句在它的 `Data` 里递归建。

```ts
const first = this.At;
const bracket = this.Units[this.At] as Bracket;
this.At++;
const shape = new BlockShape(this.Template);
const inner = new StatementBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
while (inner.At < inner.Units.length) {
  shape.Add(inner.BuildStatement());
}
return this.Finish(shape, first, first);
```

## method BuildEmpty:()=>Token

```ts
const first = this.At;
this.At++;
const shape = new EmptyStatementShape(this.Template);
return this.Finish(shape, first, first);
```

## method BuildExpressionStatement:()=>Token

体里的表达式语句：从当前下标读到本层 `;`（或段末）。

```ts
const first = this.At;
let last = -1;
for (let at = first; at < this.Units.length; at++) {
  if (this.IsSymbol(this.Units[at], ";")) {
    last = at;
    break;
  }
}
let statementLast = this.Units.length - 1;
let expressionLast = this.Units.length - 1;
if (last >= 0) {
  statementLast = last;
  expressionLast = last - 1;
}
const expression = this.BuildExpressionRange(first, expressionLast);
const shape = new ExpressionStatementShape(this.Template);
shape.Add(expression);
this.At = statementLast + 1;
return this.Finish(shape, first, statementLast);
```

## method BuildVariableStatement:()=>Token

`let` / `const` / `var` 语句：声明列表从关键字到 `;` 之前，`;` 归语句。

```ts
const first = this.At;
this.At++;
let endExclusive = this.At;
while (endExclusive < this.Units.length && !this.IsSymbol(this.Units[endExclusive], ";")) {
  endExclusive++;
}
const list = this.BuildVariableDeclarationList(first, endExclusive);
const shape = new VariableStatementShape(this.Template);
shape.Add(list);
this.At = endExclusive;
if (this.At < this.Units.length && this.IsSymbol(this.Units[this.At], ";")) {
  this.At++;
}
return this.Finish(shape, first, this.At - 1);
```

## method BuildVariableDeclarationList:(keywordIndex:int, endExclusive:int)=>ShapeToken

声明列表：`let a = 1, b, c = f(x)`。每个声明 = 标识符 + 可选 `= 表达式`；`=` 之后到本层 `,` / 段末是初始化表达式。`Pos` 从关键字算起（与 TS 的 `VariableDeclarationList` 同口径）。

```ts
const keyword = this.Units[keywordIndex];
const list = new VariableDeclarationListShape(this.Template);
let at = keywordIndex + 1;
let lastUnit = keywordIndex;
while (at < endExclusive) {
  const nameIndex = at;
  const nameUnit = this.Units[nameIndex];
  if (!(nameUnit instanceof Common)) {
    throw new Error("变量声明缺少标识符");
  }
  const declaration = new VariableDeclarationShape(this.Template);
  const name = IdentifierShape.FromBasicToken(nameUnit as Common, this.Context);
  name.Pos = this.Positions[nameIndex];
  declaration.Add(name);
  at++;
  let declarationLast = nameIndex;
  if (at < endExclusive && this.IsSymbol(this.Units[at], "=")) {
    const initializerFirst = at + 1;
    let initializerEnd = initializerFirst;
    while (initializerEnd < endExclusive && !this.IsSymbol(this.Units[initializerEnd], ",")) {
      initializerEnd++;
    }
    if (initializerEnd <= initializerFirst) {
      throw new Error("变量声明缺少初始化表达式");
    }
    const initializer = this.BuildExpressionRange(initializerFirst, initializerEnd - 1);
    declaration.Add(initializer);
    declarationLast = initializerEnd - 1;
    at = initializerEnd;
  }
  this.Finish(declaration, nameIndex, declarationLast);
  list.Add(declaration);
  lastUnit = declarationLast;
  if (at < endExclusive && this.IsSymbol(this.Units[at], ",")) {
    at++;
  } else if (at < endExclusive) {
    throw new Error("变量声明里有无法识别的单元");
  }
}
const head = keyword.SourceRange.Start;
if (head !== null) {
  list.SignIn(head);
}
const tail = this.Units[lastUnit].SourceRange.End;
if (tail !== null) {
  list.SignOut(tail);
}
list.Pos = this.Positions[keywordIndex];
list.TryToClose(this.Context);
this.At = endExclusive;
return list;
```

## method BuildIf:()=>Token

```ts
const first = this.At;
this.At++;
const conditionBracket = this.Units[this.At];
if (!(conditionBracket instanceof Bracket) || (conditionBracket as Bracket).StartBracketChar !== "(") {
  throw new Error("if 缺少条件括号");
}
this.At++;
const condition = this.ParseBracketExpression(conditionBracket as Bracket);
const thenStatement = this.BuildStatement();
const shape = new IfStatementShape(this.Template);
shape.Add(condition);
shape.Add(thenStatement);
if (this.At < this.Units.length && this.IsText(this.Units[this.At], "else")) {
  this.At++;
  shape.Add(this.BuildStatement());
}
return this.Finish(shape, first, this.At - 1);
```

## method BuildWhile:()=>Token

```ts
const first = this.At;
this.At++;
const conditionBracket = this.Units[this.At];
if (!(conditionBracket instanceof Bracket) || (conditionBracket as Bracket).StartBracketChar !== "(") {
  throw new Error("while 缺少条件括号");
}
this.At++;
const condition = this.ParseBracketExpression(conditionBracket as Bracket);
const body = this.BuildStatement();
const shape = new WhileStatementShape(this.Template);
shape.Add(condition);
shape.Add(body);
return this.Finish(shape, first, this.At - 1);
```

## method BuildDo:()=>Token

```ts
const first = this.At;
this.At++;
const body = this.BuildStatement();
if (this.At >= this.Units.length || !this.IsText(this.Units[this.At], "while")) {
  throw new Error("do-while 缺少 while");
}
this.At++;
const conditionBracket = this.Units[this.At];
if (!(conditionBracket instanceof Bracket) || (conditionBracket as Bracket).StartBracketChar !== "(") {
  throw new Error("do-while 缺少条件括号");
}
this.At++;
const condition = this.ParseBracketExpression(conditionBracket as Bracket);
if (this.At < this.Units.length && this.IsSymbol(this.Units[this.At], ";")) {
  this.At++;
}
const shape = new DoStatementShape(this.Template);
shape.Add(body);
shape.Add(condition);
return this.Finish(shape, first, this.At - 1);
```

## method BuildFor:()=>Token

头部括号里按本层 `;` 的个数分派：0 个且出现 `in` / `of` → `for-in` / `for-of`；否则三子句 `for`。

```ts
const first = this.At;
this.At++;
const headerUnit = this.Units[this.At];
if (!(headerUnit instanceof Bracket) || (headerUnit as Bracket).StartBracketChar !== "(") {
  throw new Error("for 缺少头部括号");
}
this.At++;
const bracket = headerUnit as Bracket;
const inner = new StatementBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
let semicolonCount = 0;
let inOfAt = -1;
let inOfText = "";
for (let at = 0; at < inner.Units.length; at++) {
  const unit = inner.Units[at];
  if (inner.IsSymbol(unit, ";")) {
    semicolonCount++;
    continue;
  }
  if (inOfAt < 0 && unit instanceof Common) {
    const text = (unit as Common).TempToString();
    if (text === "in" || text === "of") {
      inOfAt = at;
      inOfText = text;
    }
  }
}
if (semicolonCount === 0 && inOfAt >= 0) {
  return this.BuildForInOrOf(first, inner, inOfAt, inOfText);
}
const shape = new ForStatementShape(this.Template);
inner.At = 0;
let initializer:Token | null = null;
if (inner.At < inner.Units.length && !inner.IsSymbol(inner.Units[inner.At], ";")) {
  let endExclusive = inner.At;
  while (endExclusive < inner.Units.length && !inner.IsSymbol(inner.Units[endExclusive], ";")) {
    endExclusive++;
  }
  if (this.IsVariableKeyword(inner.Units[inner.At])) {
    initializer = inner.BuildVariableDeclarationList(inner.At, endExclusive);
  } else {
    initializer = inner.BuildExpressionRange(inner.At, endExclusive - 1);
    inner.At = endExclusive;
  }
}
if (inner.At < inner.Units.length && inner.IsSymbol(inner.Units[inner.At], ";")) {
  inner.At++;
}
let condition:Token | null = null;
if (inner.At < inner.Units.length && !inner.IsSymbol(inner.Units[inner.At], ";")) {
  let endExclusive = inner.At;
  while (endExclusive < inner.Units.length && !inner.IsSymbol(inner.Units[endExclusive], ";")) {
    endExclusive++;
  }
  condition = inner.BuildExpressionRange(inner.At, endExclusive - 1);
  inner.At = endExclusive;
}
if (inner.At < inner.Units.length && inner.IsSymbol(inner.Units[inner.At], ";")) {
  inner.At++;
}
let incrementor:Token | null = null;
if (inner.At < inner.Units.length) {
  incrementor = inner.BuildExpressionRange(inner.At, inner.Units.length - 1);
  inner.At = inner.Units.length;
}
if (initializer !== null) {
  shape.Add(initializer);
}
if (condition !== null) {
  shape.Add(condition);
}
if (incrementor !== null) {
  shape.Add(incrementor);
}
shape.Add(this.BuildStatement());
return this.Finish(shape, first, this.At - 1);
```

## method BuildForInOrOf:(first:int, inner:StatementBuilder, keywordAt:int, keywordText:string)=>Token

```ts
let shape:ShapeToken;
if (keywordText === "in") {
  shape = new ForInStatementShape(this.Template);
} else {
  shape = new ForOfStatementShape(this.Template);
}
inner.At = 0;
let binding:Token;
if (inner.Units.length > 0 && inner.Units[0] instanceof Common && this.IsVariableKeyword(inner.Units[0])) {
  binding = inner.BuildVariableDeclarationList(0, keywordAt);
} else {
  binding = inner.BuildExpressionRange(0, keywordAt - 1);
  inner.At = keywordAt;
}
inner.At = keywordAt + 1;
const collection = inner.BuildExpressionRange(inner.At, inner.Units.length - 1);
inner.At = inner.Units.length;
shape.Add(binding);
shape.Add(collection);
shape.Add(this.BuildStatement());
return this.Finish(shape, first, this.At - 1);
```

## method BuildReturnOrThrow:(isThrow:bool)=>Token

```ts
const first = this.At;
this.At++;
let endExclusive = this.At;
while (endExclusive < this.Units.length && !this.IsSymbol(this.Units[endExclusive], ";")) {
  endExclusive++;
}
let expression:Token | null = null;
if (endExclusive > this.At) {
  expression = this.BuildExpressionRange(this.At, endExclusive - 1);
}
let shape:ShapeToken;
if (isThrow) {
  shape = new ThrowStatementShape(this.Template);
} else {
  shape = new ReturnStatementShape(this.Template);
}
if (expression !== null) {
  shape.Add(expression);
}
this.At = endExclusive;
if (this.At < this.Units.length && this.IsSymbol(this.Units[this.At], ";")) {
  this.At++;
}
return this.Finish(shape, first, this.At - 1);
```

## method BuildBreakOrContinue:(isContinue:bool)=>Token

```ts
const first = this.At;
this.At++;
let label:Token | null = null;
if (this.At < this.Units.length && !this.IsSymbol(this.Units[this.At], ";")) {
  const labelUnit = this.Units[this.At];
  if (!(labelUnit instanceof Common)) {
    throw new Error("break / continue 的标签不是标识符");
  }
  const name = IdentifierShape.FromBasicToken(labelUnit as Common, this.Context);
  name.Pos = this.Positions[this.At];
  label = name;
  this.At++;
}
let shape:ShapeToken;
if (isContinue) {
  shape = new ContinueStatementShape(this.Template);
} else {
  shape = new BreakStatementShape(this.Template);
}
if (label !== null) {
  shape.Add(label);
}
if (this.At < this.Units.length && this.IsSymbol(this.Units[this.At], ";")) {
  this.At++;
}
return this.Finish(shape, first, this.At - 1);
```

## method BuildDebugger:()=>Token

```ts
const first = this.At;
this.At++;
const shape = new DebuggerStatementShape(this.Template);
if (this.At < this.Units.length && this.IsSymbol(this.Units[this.At], ";")) {
  this.At++;
}
return this.Finish(shape, first, this.At - 1);
```

## method BuildLabeled:()=>Token

标签语句：`标识符 : 语句`。根级标签与表达式语句候选冲突（都从标识符起头），所以本族只在块 / 体里建它。

```ts
const first = this.At;
const labelUnit = this.Units[this.At];
if (!(labelUnit instanceof Common)) {
  throw new Error("标签不是标识符");
}
const name = IdentifierShape.FromBasicToken(labelUnit as Common, this.Context);
name.Pos = this.Positions[this.At];
this.At++;
if (this.At >= this.Units.length || !this.IsText(this.Units[this.At], ":")) {
  throw new Error("标签缺少冒号");
}
this.At++;
const statement = this.BuildStatement();
const shape = new LabeledStatementShape(this.Template);
shape.Add(name);
shape.Add(statement);
return this.Finish(shape, first, this.At - 1);
```
