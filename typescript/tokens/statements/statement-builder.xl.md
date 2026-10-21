# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { FunctionDeclarationShape } from "../declarations/function-declaration-shape.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { AwaitKeywordShape } from "../keywords/await-keyword-shape.xl.md"
import { ExclamationTokenShape } from "../punctuation/exclamation-token-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
import { StatementScanner } from "./statement-scanner.xl.md"
import { ArrayBindingPatternShape } from "../bindings/array-binding-pattern-shape.xl.md"
import { BindingElementShape } from "../bindings/binding-element-shape.xl.md"
import { ObjectBindingPatternShape } from "../bindings/object-binding-pattern-shape.xl.md"
import { CaseClauseShape } from "../members/case-clause-shape.xl.md"
import { CatchClauseShape } from "../members/catch-clause-shape.xl.md"
import { DefaultClauseShape } from "../members/default-clause-shape.xl.md"
import { CaseBlockShape } from "../declarations/case-block-shape.xl.md"
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
import { SwitchStatementShape } from "./switch-statement-shape.xl.md"
import { ThrowStatementShape } from "./throw-statement-shape.xl.md"
import { TryStatementShape } from "./try-statement-shape.xl.md"
import { VariableStatementShape } from "./variable-statement-shape.xl.md"
import { WhileStatementShape } from "./while-statement-shape.xl.md"
import { WithStatementShape } from "./with-statement-shape.xl.md"
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
return text === "let" || text === "const" || text === "var" || text === "using";
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
  // Nested function declarations: "function" or "async function" at statement position.
  // The declaration itself is built by FunctionDeclarationShape.FromUnits (no duplicate ownership).
  if (text === "function") {
    return this.BuildFunctionDeclaration();
  }
  if (text === "class") {
    // Block-level class declaration: TS keeps a ClassDeclaration as a direct block member,
    // so it must not fall through to ExpressionStatement(ClassExpression).
    return this.BuildClassDeclaration();
  }
  if (text === "async") {
    const afterAsync = this.Peek(1);
    if (afterAsync !== null && this.IsText(afterAsync, "function")) {
      return this.BuildFunctionDeclaration();
    }
  }
  if (text === "declare") {
    // Ambient variable statement (`declare const x: number;`): TS keeps a DeclareKeyword CHILD node
    // (ast-json compares it), so build the normal variable statement after skipping the keyword,
    // prepend the modifier shape, and rewind the statement Pos to the declare keyword.
    const afterDeclare = this.Peek(1);
    if (afterDeclare !== null && this.IsVariableKeyword(afterDeclare)
      && StatementScanner.NoLineBreakBetween(unit, afterDeclare)) {
      const declarePos = this.Positions[this.At];
      const declareIndex = this.At;
      this.At++;
      const ambient = this.BuildVariableStatement();
      (ambient as ShapeToken).Pos = declarePos;
      const modifier = DeclareKeywordShape.FromBasicToken(unit as Common, this.Context);
      modifier.Pos = this.Positions[declareIndex];
      ambient.Data.splice(0, 0, modifier);
      modifier.Parent = ambient;
      return ambient;
    }
  }
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
  if (text === "switch") {
    return this.BuildSwitch();
  }
  if (text === "try") {
    return this.BuildTry();
  }
  if (text === "with") {
    return this.BuildWith();
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
  if (text === "using") {
    return this.BuildVariableStatement();
  }
  if (text === "await") {
    const afterAwait = this.Peek(1);
    if (afterAwait !== null && this.IsText(afterAwait, "using")) {
      return this.BuildVariableStatement();
    }
  }
  const next = this.Peek(1);
  if (next !== null && this.IsText(next, ":")) {
    return this.BuildLabeled();
  }
}
return this.BuildExpressionStatement();
```

## method BuildFunctionDeclaration:()=>Token

Nested `function` / `async function` declaration inside a body. Delegates to
`FunctionDeclarationShape.FromUnits` with a host-like adapter over this builder's code units
(FromUnits only reads `host.Data` / `host.Template`), then fixes the shape `Pos` to this
builder's `Positions[first]` (the first statement of a block has a base offset that the
adapter cannot know). End of the declaration is the body `{...}` bracket or the `;` of an
overload signature.

```ts
const first = this.At;
let cursor = this.At;
if (this.IsText(this.Units[cursor], "async")) {
  cursor++;
}
if (cursor >= this.Units.length || !this.IsText(this.Units[cursor], "function")) {
  throw new Error("函数声明缺少 function 关键字");
}
cursor++;
if (cursor < this.Units.length && this.IsSymbol(this.Units[cursor], "*")) {
  cursor++;
}
cursor++;
if (cursor >= this.Units.length
  || !(this.Units[cursor] instanceof Bracket)
  || (this.Units[cursor] as Bracket).StartBracketChar !== "(") {
  throw new Error("函数声明缺少参数表");
}
cursor++;
let end = -1;
while (cursor < this.Units.length) {
  const unit = this.Units[cursor];
  if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
    end = cursor;
    break;
  }
  if (this.IsSymbol(unit, ";")) {
    end = cursor;
    break;
  }
  cursor++;
}
if (end < 0) {
  throw new Error("函数声明缺少函数体或分号");
}
const hostLike:any = { Data: this.Units, Template: this.Template };
const shape = FunctionDeclarationShape.FromUnits(hostLike, first, end, this.Context);
shape.Pos = this.Positions[first];
// FromUnits cannot know this builder's base offset, so the FIRST modifier (async / declare)
// would get Pos 0. Repair it from this builder's Positions (later modifiers are chained off it).
if (this.IsText(this.Units[first], "async") || this.IsText(this.Units[first], "declare")) {
  if (shape.Data.length > 0) {
    const head = shape.Data[0] as ShapeToken;
    head.Pos = this.Positions[first];
  }
}
this.At = end + 1;
return shape;
```

## method BuildClassDeclaration:()=>Token

Nested `class` declaration inside a body. Delegates to `ClassDeclarationShape.FromUnits` through the
same host-like adapter as `BuildFunctionDeclaration` (FromUnits only reads `host.Data` /
`host.Template`); the declaration end is the class body `{...}` bracket.

```ts
const first = this.At;
let cursor = this.At;
if (!this.IsText(this.Units[cursor], "class")) {
  throw new Error("类声明缺少 class 关键字");
}
cursor++;
cursor++;
let end = -1;
while (cursor < this.Units.length) {
  const unit = this.Units[cursor];
  if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
    end = cursor;
    break;
  }
  cursor++;
}
if (end < 0) {
  throw new Error("类声明缺少类体");
}
const hostLike:any = { Data: this.Units, Template: this.Template };
const shape = ClassDeclarationShape.FromUnits(hostLike, first, end, this.Context);
shape.Pos = this.Positions[first];
this.At = end + 1;
return shape;
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
let asiEnd = -1;
for (let at = first; at < this.Units.length; at++) {
  if (this.IsSymbol(this.Units[at], ";")) {
    last = at;
    break;
  }
  if (at > first && StatementBuilder.EndsAtLineBreak(this.Units[at - 1], this.Units[at])) {
    asiEnd = at - 1;
    break;
  }
}
let statementLast = this.Units.length - 1;
let expressionLast = this.Units.length - 1;
if (last >= 0) {
  statementLast = last;
  expressionLast = last - 1;
} else if (asiEnd >= 0) {
  statementLast = asiEnd;
  expressionLast = asiEnd;
}
const expression = this.BuildExpressionRange(first, expressionLast);
const shape = new ExpressionStatementShape(this.Template);
shape.Add(expression);
this.At = statementLast + 1;
return this.Finish(shape, first, statementLast);
```

## static method EndsExpression:(unit:Token)=>bool

标识符 / 括号 / 字面量 / 后缀自增自减可以收尾一个表达式；`as` / `typeof` 这类前缀词不算。

```ts
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (text === "as" || text === "satisfies" || text === "instanceof" || text === "in" || text === "of"
    || text === "extends" || text === "is" || text === "keyof" || text === "typeof" || text === "new"
    || text === "await" || text === "delete" || text === "void" || text === "yield"
    || text === "unique" || text === "readonly" || text === "asserts" || text === "infer") {
    return false;
  }
  return true;
}
if (unit instanceof Bracket) {
  return true;
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "++" || text === "--";
}
return true;
```

## static method ContinuesAcrossLine:(unit:Token)=>bool

下一行的这个单元能不能接着上一行继续同一个表达式 / 类型；接不上就说明换行处是 ASI 边界。

```ts
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "." || text === "?." || text === "<" || text === ">" || text === ">>" || text === ">>>"
    || text === "|" || text === "&" || text === "?" || text === "?:" || text === ":" || text === "=>"
    || text === "=" || text === "+" || text === "-" || text === "*" || text === "/" || text === "%"
    || text === "**" || text === "&&" || text === "||" || text === "??" || text === "!" || text === "++"
    || text === "--" || text === "," || text === "~";
}
if (unit instanceof Bracket) {
  const start = (unit as Bracket).StartBracketChar;
  // `{` 可能是函数 / 类表达式的体到了下一行（`function (a): number\n{ return a }`），不构成 ASI。
  return start === "(" || start === "[" || start === "{";
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  return text === "as" || text === "satisfies" || text === "instanceof" || text === "in" || text === "of"
    || text === "extends" || text === "is" || text === "keyof" || text === "typeof";
}
return true;
```

## static method EndsAtLineBreak:(previous:Token, next:Token)=>bool

`previous` 能收尾、`next` 接不上、两者之间有换行 —— 三者都成立就是 ASI 边界。

```ts
if (StatementScanner.NoLineBreakBetween(previous, next)) {
  return false;
}
if (!StatementBuilder.EndsExpression(previous)) {
  return false;
}
return !StatementBuilder.ContinuesAcrossLine(next);
```

## static method IsTypeArgumentStart:(units:Array<Token>, index:int, limit:int)=>bool

`units[index]` 是 `<`、前面是可接类型实参的实体、后面有配对的 `>` 时，才算类型实参段的开头。
只做符号层配对：`a < b` 这种没有配对 `>` 的比较不会被算进去。

```ts
if (index <= 0 || index >= limit) {
  return false;
}
const head = units[index];
if (!(head instanceof Symbol) || !(head as Symbol).Is("<")) {
  return false;
}
const previous = units[index - 1];
if (!(previous instanceof Common) && !(previous instanceof Bracket)) {
  return false;
}
let depth = 0;
for (let at = index; at < limit; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = (unit as Symbol).TempToString();
  if (text === "<") {
    depth++;
  } else if (text === ">") {
    depth--;
  } else if (text === ">>") {
    depth -= 2;
  } else if (text === ">>>") {
    depth -= 3;
  }
  if (depth <= 0) {
    if (at <= index) {
      return false;
    }
    // 配对的 `>` 之后必须接得上「类型实参段之后的东西」：调用括号 / `??` 这类算子 / 段末，
    // 否则更像比较运算（`x < y … z > w`），不算类型实参。
    const after = at + 1;
    if (after >= limit) {
      return true;
    }
    const follower = units[after];
    if (follower instanceof Bracket && (follower as Bracket).StartBracketChar === "(") {
      return true;
    }
    if (follower instanceof Symbol) {
      const followerText = (follower as Symbol).TempToString();
      return followerText === "??" || followerText === "||" || followerText === "&&"
        || followerText === "?" || followerText === "?:" || followerText === ":"
        || followerText === ";" || followerText === "." || followerText === "?.";
    }
    return false;
  }
}
return false;
```

## method BuildVariableStatement:()=>Token

变量语句：`let` / `const` / `var` / `using` / `await using`。声明列表从关键字到 `;` 之前；`await` 与 `using` 都不进 AST
（TS 只把它们记成 List 的 flags），`await using` 的 List 仍从 `await` 起算 `Pos`（listStart 传语句首）。

```ts
const first = this.At;
const firstText = this.TextOf(this.Units[first]);
let keywordIndex = first;
if (firstText === "await") {
  keywordIndex = first + 1;
  this.At = keywordIndex + 1;
} else {
  this.At = first + 1;
}
let endExclusive = this.At;
while (endExclusive < this.Units.length && !this.IsSymbol(this.Units[endExclusive], ";")) {
  endExclusive++;
}
const list = this.BuildVariableDeclarationList(keywordIndex, endExclusive, first);
const shape = new VariableStatementShape(this.Template);
shape.Add(list);
this.At = endExclusive;
if (this.At < this.Units.length && this.IsSymbol(this.Units[this.At], ";")) {
  this.At++;
}
return this.Finish(shape, first, this.At - 1);
```
## method BuildVariableDeclarationList:(keywordIndex:int, endExclusive:int, listStart?:int)=>ShapeToken

声明列表：`let a = 1, b, c = f(x)`。每个声明 = 标识符 + 可选 `= 表达式`；`=` 之后到本层 `,` / 段末是初始化表达式。`Pos` 从关键字算起（与 TS 的 `VariableDeclarationList` 同口径）。

```ts
const keyword = this.Units[keywordIndex];
const listHeadIndex = listStart ?? keywordIndex;
const list = new VariableDeclarationListShape(this.Template);
let at = keywordIndex + 1;
let lastUnit = keywordIndex;
while (at < endExclusive) {
  const nameIndex = at;
  const nameUnit = this.Units[nameIndex];
  const declaration = new VariableDeclarationShape(this.Template);
  let name:Token;
  if (nameUnit instanceof Bracket) {
    const bracket = nameUnit as Bracket;
    if (bracket.StartBracketChar === "[") {
      name = this.NormalizeBindingPattern(ArrayBindingPatternShape.FromBracket(bracket, this.Context), bracket);
    } else if (bracket.StartBracketChar === "{") {
      name = this.NormalizeBindingPattern(ObjectBindingPatternShape.FromBracket(bracket, this.Context), bracket);
    } else {
      throw new Error("变量声明缺少标识符");
    }
    (name as ShapeToken).Pos = this.Positions[nameIndex];
  } else if (nameUnit instanceof Common) {
    const identifier = IdentifierShape.FromBasicToken(nameUnit as Common, this.Context);
    identifier.Pos = this.Positions[nameIndex];
    name = identifier;
  } else {
    throw new Error("变量声明缺少标识符");
  }
  declaration.Add(name);
  at++;
  let declarationLast = nameIndex;
  // 确定赋值断言 `let x!: T`：`!` 是 VariableDeclaration 的 ExclamationToken 子节点，
  // 位置在名字与类型之间；TS 的 token pos 就是 `!` 本身（不含前导 trivia）。
  if (at < endExclusive && this.IsSymbol(this.Units[at], "!")) {
    const bangUnit = this.Units[at];
    const bang = new ExclamationTokenShape(this.Template);
    bang.SignInToken(bangUnit);
    bang.SignOutToken(bangUnit);
    if (bangUnit.SourceRange.Start !== null) {
      bang.Pos = bangUnit.SourceRange.Start.Index;
    }
    bang.TryToClose(this.Context);
    declaration.Add(bang);
    declarationLast = at;
    at++;
  }
  if (at < endExclusive && this.IsSymbol(this.Units[at], ":")) {
    const typeFirst = at + 1;
    let typeEnd = typeFirst;
    let typeDepth = 0;
    while (typeEnd < endExclusive) {
      const typeUnit = this.Units[typeEnd];
      if (typeDepth === 0) {
        if (this.IsSymbol(typeUnit, "=") || this.IsSymbol(typeUnit, ",")) {
          break;
        }
      }
      if (typeUnit instanceof Symbol) {
        const typeText = (typeUnit as Symbol).TempToString();
        if (typeText === "<") {
          typeDepth++;
        } else if (typeText === ">") {
          if (typeDepth > 0) {
            typeDepth--;
          }
        } else if (typeText === ">>") {
          typeDepth = typeDepth >= 2 ? typeDepth - 2 : 0;
        } else if (typeText === ">>>") {
          typeDepth = typeDepth >= 3 ? typeDepth - 3 : 0;
        }
      }
      typeEnd++;
    }    if (typeEnd <= typeFirst) {
      throw new Error("类型注解为空");
    }
    const typeUnits:Array<Token> = [];
    for (let cursor = typeFirst; cursor < typeEnd; cursor++) {
      typeUnits.push(this.Units[cursor]);
    }
    const typeBuilder = new TypeBuilder(this.Template, this.Context);
    typeBuilder.Load(typeUnits, this.Positions[typeFirst]);
    const typeNode = typeBuilder.ParseType();
    if (typeBuilder.At !== typeBuilder.Units.length) {
      throw new Error("类型注解没有读完");
    }
    declaration.Add(typeNode);
    declarationLast = typeEnd - 1;
    at = typeEnd;
  }
  if (at < endExclusive && this.IsSymbol(this.Units[at], "=")) {
    const initializerFirst = at + 1;
    let initializerEnd = initializerFirst;
    // Generic class expression initializer (`const C = class<T, U> {};`): the type-parameter list
    // contains top-level `,` units, so skip to the class body `{…}` bracket first and only then
    // look for the declaration separator.
    if (initializerFirst < endExclusive && this.IsText(this.Units[initializerFirst], "class")) {
      let bodyAt = initializerFirst + 1;
      while (bodyAt < endExclusive
        && !(this.Units[bodyAt] instanceof Bracket
          && (this.Units[bodyAt] as Bracket).StartBracketChar === "{")) {
        bodyAt++;
      }
      if (bodyAt < endExclusive) {
        initializerEnd = bodyAt + 1;
      }
    }
    let angleDepth = 0;
    while (initializerEnd < endExclusive) {
      const initializerUnit = this.Units[initializerEnd];
      if (angleDepth === 0) {
        if (this.IsSymbol(initializerUnit, ",")) {
          break;
        }
      }
      if (initializerUnit instanceof Symbol) {
        const symbolText = (initializerUnit as Symbol).TempToString();
        if (symbolText === "<" && (initializerEnd === initializerFirst || StatementBuilder.IsTypeArgumentStart(this.Units, initializerEnd, endExclusive))) {
          angleDepth++;
        } else if (symbolText === ">") {
          if (angleDepth > 0) {
            angleDepth--;
          }
        } else if (symbolText === ">>") {
          angleDepth = angleDepth >= 2 ? angleDepth - 2 : 0;
        } else if (symbolText === ">>>") {
          angleDepth = angleDepth >= 3 ? angleDepth - 3 : 0;
        }
      }
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
const head = this.Units[listHeadIndex].SourceRange.Start;
if (head !== null) {
  list.SignIn(head);
}
const tail = this.Units[lastUnit].SourceRange.End;
if (tail !== null) {
  list.SignOut(tail);
}
list.Pos = this.Positions[listHeadIndex];
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
let awaitUnit:Token | null = null;
let awaitPos = -1;
if (this.At < this.Units.length && this.IsText(this.Units[this.At], "await")) {
  awaitUnit = this.Units[this.At];
  awaitPos = this.Positions[this.At];
  this.At++;
}
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
  return this.BuildForInOrOf(first, inner, inOfAt, inOfText, awaitUnit, awaitPos);
}
if (awaitUnit !== null) {
  throw new Error("for await 只能是 for-of");
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

## method BuildForInOrOf:(first:int, inner:StatementBuilder, keywordAt:int, keywordText:string, awaitUnit:Token | null, awaitPos:int)=>Token

```ts
let shape:ShapeToken;
if (keywordText === "in") {
  shape = new ForInStatementShape(this.Template);
} else {
  shape = new ForOfStatementShape(this.Template);
}
inner.At = 0;
let binding:Token;
let declKeywordIndex = -1;
let declListStart = 0;
if (inner.Units.length > 0 && inner.Units[0] instanceof Common && this.IsVariableKeyword(inner.Units[0])) {
  declKeywordIndex = 0;
  declListStart = 0;
} else if (inner.Units.length > 1 && this.IsText(inner.Units[0], "await") && this.IsText(inner.Units[1], "using")) {
  declKeywordIndex = 1;
  declListStart = 0;
}
if (declKeywordIndex >= 0) {
  binding = inner.BuildVariableDeclarationList(declKeywordIndex, keywordAt, declListStart);
} else {
  binding = inner.BuildExpressionRange(0, keywordAt - 1);
  inner.At = keywordAt;
}
inner.At = keywordAt + 1;
const collection = inner.BuildExpressionRange(inner.At, inner.Units.length - 1);
inner.At = inner.Units.length;
if (awaitUnit !== null) {
  const keywordShape = new AwaitKeywordShape(this.Template);
  if (awaitUnit.SourceRange.Start !== null) {
    keywordShape.SignIn(awaitUnit.SourceRange.Start);
  }
  if (awaitUnit.SourceRange.End !== null) {
    keywordShape.SignOut(awaitUnit.SourceRange.End);
  }
  keywordShape.Pos = awaitPos;
  keywordShape.TryToClose(this.Context);
  shape.Add(keywordShape);
}
shape.Add(binding);
shape.Add(collection);
shape.Add(this.BuildStatement());
return this.Finish(shape, first, this.At - 1);
```

## method BuildReturnOrThrow:(isThrow:bool)=>Token

```ts
const first = this.At;
this.At++;
const keyword = this.Units[first];
// `return` / `throw` are restricted productions: a line break right after the keyword ends the
// statement (ASI), so the following token starts a NEW statement (`return\na;` = return; a;).
// ReturnStatement has no expression child; TS reconstructs `throw` with a zero-width Identifier child
// (`ThrowStatement [0,5] -> Identifier [5,5] text=""`) — synthesized below when there is no expression.
const split = !isThrow
  && this.At < this.Units.length
  && StatementBuilder.HasLineBreakAfter(keyword.SourceRange.End);
if (split) {
  const shape = new ReturnStatementShape(this.Template);
  return this.Finish(shape, first, first);
}
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
if (isThrow && expression === null) {
  // TS 的恢复形：零宽 Identifier，pos == end == 关键字末尾之后（`throw` 之后那一格）。
  const keywordEnd = keyword.SourceRange.End;
  if (keywordEnd !== null) {
    const zero = new IdentifierShape(this.Template);
    zero.EscapedText = "";
    const zeroSource = keywordEnd.Document.At(keywordEnd.Index);
    zero.SourceRange.Start = zeroSource;
    zero.SourceRange.End = zeroSource;
    zero.Pos = keywordEnd.Index + 1;
    zero.TryToClose(this.Context);
    shape.Add(zero);
  }
}
this.At = endExclusive;
if (this.At < this.Units.length && this.IsSymbol(this.Units[this.At], ";")) {
  this.At++;
}
return this.Finish(shape, first, this.At - 1);
```

## private static method HasLineBreakAfter:(last:Source | null)=>bool

关键字后面（跳过空格与注释）是否先出现换行。注释里的换行也算：ASI 把注释中的 LineTerminator 视作换行。

```ts
if (last === null) {
  return false;
}
const document = last.Document;
const count = document.GetCount();
let at = last.Index + 1;
while (at < count) {
  const ch = document.At(at).Value;
  if (ch === "\n" || ch === "\r") {
    return true;
  }
  if (ch === " " || ch === "\t") {
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = document.At(at + 1).Value;
    if (next === "/") {
      at += 2;
      while (at < count && document.At(at).Value !== "\n") {
        at++;
      }
      return at < count;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count && !(document.At(at).Value === "*" && document.At(at + 1).Value === "/")) {
        if (document.At(at).Value === "\n" || document.At(at).Value === "\r") {
          return true;
        }
        at++;
      }
      at += 2;
      continue;
    }
  }
  return false;
}
return false;
```

## method BuildBreakOrContinue:(isContinue:bool)=>Token

```ts
const first = this.At;
this.At++;
const keyword = this.Units[first];
// Newline after `break` / `continue` = no label (ASI): `break\nlbl` = break; lbl; and the
// BreakStatement End is the next token's Pos (keyword end + 1).
const split = this.At < this.Units.length
  && StatementBuilder.HasLineBreakAfter(keyword.SourceRange.End);
if (split) {
  let shape:ShapeToken;
  if (isContinue) {
    shape = new ContinueStatementShape(this.Template);
  } else {
    shape = new BreakStatementShape(this.Template);
  }
  // `break` / `continue` 换行后紧跟 `;`：那个 `;` 是**本语句自己的终结符**（TS 的
  // `canParseSemicolon`：`while (a) break\n;` 的 BreakStatement 与 WhileStatement 都含它），
  // 不能留给外层当孤儿单元，否则外层壳报「语句没有读完」且右端借不到这一格。
  if (this.At < this.Units.length && this.IsSymbol(this.Units[this.At], ";")) {
    this.At++;
  }
  return this.Finish(shape, first, this.At - 1);
}
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

## method IsKeywordUnit:(unit:Token, text:string)=>bool

```ts
return unit instanceof Common && (unit as Common).Is(text);
```

## method IsClauseKeyword:(unit:Token)=>bool

```ts
return this.IsKeywordUnit(unit, "case") || this.IsKeywordUnit(unit, "default");
```

## method NormalizeBindingPattern:(pattern:ShapeToken, bracket:Bracket)=>Token

`ArrayBindingPatternShape.FromBracket` / `ObjectBindingPatternShape.FromBracket` 把元素建出来时，
元素的 `Data` 只留了名字 token（`:` / `,` 这类分隔符被 FromTokens 吃掉了），而 AST 投影要的是 `Identifier` 且
`Pos` 要按「前一个代码单元 `End+1`」算。这里按括号里的原始单元重新走一遍：按逗号分组，组内逐个 token 补
`IdentifierShape` 的 `Pos`（分隔符也参与推进 `pos`），再把元素孩子换成标识符。

```ts
let elements:Array<Token> = [];
if (pattern instanceof ArrayBindingPatternShape) {
  elements = (pattern as ArrayBindingPatternShape).Elements;
} else if (pattern instanceof ObjectBindingPatternShape) {
  elements = (pattern as ObjectBindingPatternShape).Elements;
}
const groups:Array<Array<Token>> = [];
let group:Array<Token> = [];
for (const item of bracket.Data) {
  if (item.IsTriviaToken) {
    continue;
  }
  if (item instanceof Symbol && (item as Symbol).Is(",")) {
    groups.push(group);
    group = [];
    continue;
  }
  group.push(item);
}
groups.push(group);
let elementIndex = 0;
for (const tokens of groups) {
  if (tokens.length === 0) {
    continue;
  }
  if (elementIndex >= elements.length) {
    break;
  }
  const element = elements[elementIndex];
  elementIndex++;
  if (!(element instanceof BindingElementShape)) {
    continue;
  }
  const binding = element as BindingElementShape;
  binding.Data = [];
  let pos = binding.Pos;
  for (const token of tokens) {
    if (token instanceof Common) {
      const identifier = IdentifierShape.FromBasicToken(token as Common, this.Context);
      identifier.Pos = pos;
      binding.Add(identifier);
    }
    if (token.SourceRange.End !== null) {
      pos = token.SourceRange.End.Index + 1;
    }
  }
}
return pattern;
```

## method BuildSwitch:()=>Token

```ts
const first = this.At;
this.At++;
const headerUnit = this.Units[this.At];
if (!(headerUnit instanceof Bracket) || (headerUnit as Bracket).StartBracketChar !== "(") {
  throw new Error("switch 缺少头部括号");
}
this.At++;
const condition = this.ParseBracketExpression(headerUnit as Bracket);
const blockIndex = this.At;
const blockUnit = this.Units[blockIndex];
if (!(blockUnit instanceof Bracket) || (blockUnit as Bracket).StartBracketChar !== "{") {
  throw new Error("switch 缺少 case 块");
}
this.At++;
const shape = new SwitchStatementShape(this.Template);
shape.Add(condition);
shape.Add(this.BuildCaseBlock(blockUnit as Bracket, blockIndex));
return this.Finish(shape, first, blockIndex);
```

## method BuildCaseBlock:(bracket:Bracket, bracketIndex:int)=>Token

```ts
const caseBlock = new CaseBlockShape(this.Template);
const inner = new StatementBuilder(this.Template, this.Context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
while (inner.At < inner.Units.length) {
  const unit = inner.Units[inner.At];
  if (inner.IsKeywordUnit(unit, "case")) {
    const clauseFirst = inner.At;
    inner.At++;
    let colonAt = inner.At;
    // The ":" that closes a case label is the first one at ternary depth 0:
    // "case a ? b : c:" -- '?' raises depth, the matching ':' lowers it again.
    // Brackets/commas/operators are atomic units here, so nothing else can hide a ":".
    let ternaryDepth = 0;
    while (colonAt < inner.Units.length) {
      const candidate = inner.Units[colonAt];
      if (inner.IsSymbol(candidate, "?")) {
        ternaryDepth++;
        colonAt++;
        continue;
      }
      if (inner.IsSymbol(candidate, ":")) {
        if (ternaryDepth > 0) {
          ternaryDepth--;
          colonAt++;
          continue;
        }
        break;
      }
      colonAt++;
    }
    if (colonAt >= inner.Units.length) {
      throw new Error("case 缺少冒号");
    }
    if (colonAt <= inner.At) {
      throw new Error("case 缺少表达式");
    }
    const value = inner.BuildExpressionRange(inner.At, colonAt - 1);
    inner.At = colonAt + 1;
    const clause = new CaseClauseShape(this.Template);
    clause.Add(value);
    while (inner.At < inner.Units.length && !inner.IsClauseKeyword(inner.Units[inner.At])) {
      clause.Add(inner.BuildStatement());
    }
    inner.Finish(clause, clauseFirst, inner.At - 1);
    caseBlock.Add(clause);
    continue;
  }
  if (inner.IsKeywordUnit(unit, "default")) {
    const clauseFirst = inner.At;
    inner.At++;
    if (inner.At >= inner.Units.length || !inner.IsSymbol(inner.Units[inner.At], ":")) {
      throw new Error("default 缺少冒号");
    }
    inner.At++;
    const clause = new DefaultClauseShape(this.Template);
    while (inner.At < inner.Units.length && !inner.IsClauseKeyword(inner.Units[inner.At])) {
      clause.Add(inner.BuildStatement());
    }
    inner.Finish(clause, clauseFirst, inner.At - 1);
    caseBlock.Add(clause);
    continue;
  }
  throw new Error("switch 块里出现了 case / default 之外的单元");
}
if (bracket.SourceRange.Start !== null) {
  caseBlock.SignIn(bracket.SourceRange.Start);
}
if (bracket.SourceRange.End !== null) {
  caseBlock.SignOut(bracket.SourceRange.End);
}
caseBlock.Pos = this.Positions[bracketIndex];
caseBlock.TryToClose(this.Context);
return caseBlock;
```

## method BuildTry:()=>Token

```ts
const first = this.At;
this.At++;
const tryBlock = this.BuildStatement();
if (!(tryBlock instanceof BlockShape)) {
  throw new Error("try 后面不是块");
}
const shape = new TryStatementShape(this.Template);
shape.Add(tryBlock);
if (this.At < this.Units.length && this.IsText(this.Units[this.At], "catch")) {
  shape.Add(this.BuildCatchClause());
}
if (this.At < this.Units.length && this.IsText(this.Units[this.At], "finally")) {
  this.At++;
  const finallyBlock = this.BuildStatement();
  if (!(finallyBlock instanceof BlockShape)) {
    throw new Error("finally 后面不是块");
  }
  shape.Add(finallyBlock);
}
return this.Finish(shape, first, this.At - 1);
```

## method BuildCatchClause:()=>Token

```ts
const first = this.At;
this.At++;
const clause = new CatchClauseShape(this.Template);
if (this.At < this.Units.length && this.Units[this.At] instanceof Bracket && (this.Units[this.At] as Bracket).StartBracketChar === "(") {
  const bracket = this.Units[this.At] as Bracket;
  this.At++;
  const inner = new StatementBuilder(this.Template, this.Context);
  let base = 0;
  if (bracket.SourceRange.Start !== null) {
    base = bracket.SourceRange.Start.Index + 1;
  }
  inner.Load(bracket.Data, base);
  if (inner.Units.length === 0) {
    throw new Error("catch 绑定为空");
  }
  let binding:Token;
  const head = inner.Units[0];
  if (head instanceof Bracket && (head as Bracket).StartBracketChar === "[") {
    binding = inner.NormalizeBindingPattern(ArrayBindingPatternShape.FromBracket(head as Bracket, this.Context), head as Bracket);
    (binding as ShapeToken).Pos = inner.Positions[0];
    inner.At = 1;
  } else if (head instanceof Bracket && (head as Bracket).StartBracketChar === "{") {
    binding = inner.NormalizeBindingPattern(ObjectBindingPatternShape.FromBracket(head as Bracket, this.Context), head as Bracket);
    (binding as ShapeToken).Pos = inner.Positions[0];
    inner.At = 1;
  } else if (head instanceof Common) {
    const identifier = IdentifierShape.FromBasicToken(head as Common, this.Context);
    identifier.Pos = inner.Positions[0];
    binding = identifier;
    inner.At = 1;
  } else {
    throw new Error("catch 绑定不是标识符");
  }
  let bindingType:Token | null = null;
  if (inner.At < inner.Units.length && inner.IsText(inner.Units[inner.At], ":")) {
    const colon = inner.Units[inner.At];
    const typeFirst = inner.At + 1;
    let typePos = 0;
    if (colon.SourceRange.End !== null) {
      typePos = colon.SourceRange.End.Index + 1;
    }
    const typeUnits:Array<Token> = [];
    for (let cursor = typeFirst; cursor < inner.Units.length; cursor++) {
      typeUnits.push(inner.Units[cursor]);
    }
    const typeBuilder = new TypeBuilder(inner.Template, inner.Context);
    typeBuilder.Load(typeUnits, typePos);
    bindingType = typeBuilder.ParseType();
    if (typeBuilder.At !== typeBuilder.Units.length) {
      throw new Error("catch 绑定的类型没有读完");
    }
    inner.At = inner.Units.length;
  }
  if (inner.At !== inner.Units.length) {
    throw new Error("catch 绑定没有读完");
  }
  const declaration = new VariableDeclarationShape(this.Template);
  declaration.Add(binding);
  if (bindingType !== null) {
    declaration.Add(bindingType);
  }
  if (binding.SourceRange.Start !== null) {
    declaration.SignIn(binding.SourceRange.Start);
  }
  let declarationEnd = binding.SourceRange.End;
  if (bindingType !== null && bindingType.SourceRange.End !== null) {
    declarationEnd = bindingType.SourceRange.End;
  }
  if (declarationEnd !== null) {
    declaration.SignOut(declarationEnd);
  }
  declaration.Pos = (binding as ShapeToken).Pos;
  declaration.TryToClose(this.Context);
  clause.Add(declaration);
}
const block = this.BuildStatement();
if (!(block instanceof BlockShape)) {
  throw new Error("catch 后面不是块");
}
clause.Add(block);
return this.Finish(clause, first, this.At - 1);
```

## method BuildWith:()=>Token

```ts
const first = this.At;
this.At++;
const conditionBracket = this.Units[this.At];
if (!(conditionBracket instanceof Bracket) || (conditionBracket as Bracket).StartBracketChar !== "(") {
  throw new Error("with 缺少头部括号");
}
this.At++;
const condition = this.ParseBracketExpression(conditionBracket as Bracket);
const body = this.BuildStatement();
const shape = new WithStatementShape(this.Template);
shape.Add(condition);
shape.Add(body);
return this.Finish(shape, first, this.At - 1);
```

