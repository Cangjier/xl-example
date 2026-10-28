# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { IdentifierShape } from "../../../names/identifier-shape.xl.md"
import { ColonTokenShape } from "../../../punctuation/colon-token-shape.xl.md"
import { QuestionTokenShape } from "../../../punctuation/question-token-shape.xl.md"
import { ConditionalExpressionShape } from "../../conditional-expression-shape.xl.md"
import { IncrementalItemPosition, NumericLiteralPossibleShape } from "../../numeric-literal-possible-shape.xl.md"
import { CompositeInitializerJudge } from "../primary/composite-initializer-judge.xl.md"
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { ObjectLiteralOperandPossibleShape } from "../shared/object-literal-operand.xl.md"
```

# namespace cangjie

# class ConditionalPossibleShape extends PossibleShape

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new ConditionalPossibleShape());
```

## static method RawAfter:(unit:Token, length:int)=>string

```ts
const range = unit.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return "";
}
let text = "";
const count = document.GetCount();
let at = range.EndIndex;
while (at < count && text.length < length) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
    at += 1;
    continue;
  }
  text += ch;
  at += 1;
}
return text;
```

## static method IsQuestionSymbol:(unit:Token)=>bool

```ts
if (!(unit instanceof Symbol)) {
  return false;
}
if (!(unit as Symbol).Is("?")) {
  return false;
}
const pair = ConditionalPossibleShape.RawAfter(unit, 2);
if (pair.length >= 2) {
  const second = pair[1];
  if (second === "." || second === "?") {
    return false;
  }
}
return true;
```

## static method IsHeadUnit:(unit:Token)=>bool

```ts
if (unit instanceof ShapeToken) {
  return true;
}
if (!(unit instanceof Common)) {
  return false;
}
const text = (unit as Common).TempToString();
if (text === "function" || text === "class" || text === "async" || text === "new"
  || text === "typeof" || text === "void" || text === "delete" || text === "await" || text === "yield"
  || text === "true" || text === "false" || text === "null" || text === "this"
  || text === "in" || text === "instanceof") {
  return false;
}
return true;
```

## static method Family:(units:Array<Token>)=>bool

```ts
const equalAt = CompositeInitializerJudge.EqualIndex(units);
if (equalAt < 0) {
  return false;
}
const headAt = ItemUtil.NextCode(units, equalAt + 1);
if (headAt >= units.length) {
  return false;
}
const head = units[headAt];
if (!ConditionalPossibleShape.IsHeadUnit(head)) {
  return false;
}
const pair = ConditionalPossibleShape.RawAfter(head, 2);
if (pair.length === 0 || pair[0] !== "?") {
  return false;
}
if (pair.length >= 2 && (pair[1] === "." || pair[1] === "?")) {
  return false;
}
return true;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
  return ShapeStates.Uncertain;
}
const start = ItemUtil.ItemStartCached(units, cache);
if (tokenIndex < start) {
  return ShapeStates.Reject;
}
if (!ConditionalPossibleShape.Family(units)) {
  return ShapeStates.Reject;
}
if (!ConditionalPossibleShape.IsQuestionSymbol(unit)) {
  return ShapeStates.Uncertain;
}
return ShapeStates.Accept;
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (!ConditionalPossibleShape.Family(units)) {
  return false;
}
// [T11] 箭头分支的三目走「不建树 → 收口格 legacy 整条建」：分支里的 `=>` 与三目自己的 `:`
// 因此落在声明层，必须由本候选认领（否则声明终结候选按 C10 抛 `declaration 符号 =>` / `符号 :`）。
// 只认 `=>` / `:` 两个符号；三目真的被建出来时这两格根本到不了声明层（形状已挂载）。
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  if (text === "=>" || text === ":") {
    return true;
  }
}
return ConditionalPossibleShape.IsQuestionSymbol(unit);
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return true;
}
return !ConditionalPossibleShape.HasLegacyBranch(units);
```

## static method QuestionIndex:(units:Array<Token>)=>int

```ts
let at = -1;
for (let index = 0; index < units.length; index++) {
  const unit = units[index];
  if (unit instanceof QuestionTokenShape) {
    at = index;
    continue;
  }
  if (ConditionalPossibleShape.IsQuestionSymbol(unit)) {
    at = index;
  }
}
return at;
```

## static method HasArrowBranch:(units:Array<Token>)=>bool

```ts
const questionAt = ConditionalPossibleShape.QuestionIndex(units);
if (questionAt < 0) {
  return false;
}
for (let index = questionAt + 1; index < units.length; index++) {
  const unit = units[index];
  if (unit instanceof Symbol && (unit as Symbol).Is("=>")) {
    return true;
  }
}
return ConditionalPossibleShape.ArrowFollowsQuestion(units[questionAt]);
```

## static method HasLegacyBranch:(units:Array<Token>)=>bool

```ts
if (ConditionalPossibleShape.HasArrowBranch(units)) {
  return true;
}
const questionAt = ConditionalPossibleShape.QuestionIndex(units);
if (questionAt < 0) {
  return false;
}
return ConditionalPossibleShape.UnbuildableBranchHead(units[questionAt]);
```

## static method IsBuildableHeadChar:(ch:string)=>bool

```ts
if (ch === "{") {
  return true;
}
if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) {
  return true;
}
if (ch >= "0" && ch <= "9") {
  return true;
}
return ch === "_" || ch === "$";
```

## static method UnbuildableBranchHead:(question:Token)=>bool

```ts
const range = question.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return false;
}
const count = document.GetCount();
let at = range.EndIndex;
let depth = 0;
let nested = 0;
let headSeen = false;
let guard = 0;
const skipSpace = ():void => {
  while (at < count) {
    const ch = document.GetValue(at);
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
      at += 1;
      continue;
    }
    return;
  }
};
while (at < count) {
  guard += 1;
  if (guard > 8192) {
    return false;
  }
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
    at += 1;
    continue;
  }
  if (!headSeen) {
    headSeen = true;
    if (ch === "\"" || ch === "'" || ch === "`") {
      return true;
    }
    if (ch === "(") {
      return ConditionalPossibleShape.ParenArrowAt(question, at);
    }
    if (ConditionalPossibleShape.IsBuildableHeadChar(ch)
      && ConditionalPossibleShape.WordArrowAt(question, at)) {
      return true;
    }
  } else if (ch === "\"" || ch === "'" || ch === "`") {
    const quote = ch;
    at += 1;
    while (at < count && document.GetValue(at) !== quote) {
      if (document.GetValue(at) === "\\") {
        at += 1;
      }
      at += 1;
    }
    at += 1;
    continue;
  }
  if (ch === "(" || ch === "[" || ch === "{") {
    depth += 1;
    at += 1;
    continue;
  }
  if (ch === ")" || ch === "]" || ch === "}") {
    if (depth === 0) {
      return false;
    }
    depth -= 1;
    at += 1;
    continue;
  }
  if (depth === 0 && (ch === ";" || ch === ",")) {
    return false;
  }
  if (depth === 0 && ch === "?") {
    if (at + 1 < count) {
      const next = document.GetValue(at + 1);
      if (next !== "." && next !== "?") {
        nested += 1;
      }
    }
    at += 1;
    continue;
  }
  if (depth === 0 && ch === ":") {
    if (nested > 0) {
      nested -= 1;
      at += 1;
      continue;
    }
    at += 1;
    skipSpace();
    if (at >= count) {
      return false;
    }
    const head = document.GetValue(at);
    if (head === "\"" || head === "'" || head === "`") {
      return true;
    }
    if (head === "(") {
      return ConditionalPossibleShape.ParenArrowAt(question, at);
    }
    if (ConditionalPossibleShape.IsBuildableHeadChar(head)
      && ConditionalPossibleShape.WordArrowAt(question, at)) {
      return true;
    }
    return false;
  }
  at += 1;
}
return false;
```

## static method WordArrowAt:(question:Token, from:int)=>bool

```ts
const range = question.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || from < 0) {
  return false;
}
const count = document.GetCount();
let scan = from;
if (scan >= count) {
  return false;
}
const first = document.GetValue(scan);
const firstIsLetter = (first >= "a" && first <= "z") || (first >= "A" && first <= "Z");
if (!firstIsLetter && first !== "_" && first !== "$") {
  return false;
}
while (scan < count) {
  const ch = document.GetValue(scan);
  const isWord = (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")
    || (ch >= "0" && ch <= "9") || ch === "_" || ch === "$";
  if (!isWord) {
    break;
  }
  scan += 1;
}
while (scan < count) {
  const ch = document.GetValue(scan);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
    scan += 1;
    continue;
  }
  break;
}
if (scan + 1 >= count) {
  return false;
}
return document.GetValue(scan) === "=" && document.GetValue(scan + 1) === ">";
```

## static method ArrowFollowsQuestion:(question:Token)=>bool

```ts
const range = question.SourceRange;
if (range.EndIndex < 0) {
  return false;
}
return ConditionalPossibleShape.ParenArrowAt(question, range.EndIndex);
```

## static method ParenArrowAt:(question:Token, from:int)=>bool

```ts
const range = question.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || from < 0) {
  return false;
}
const count = document.GetCount();
let at = from;
const skipSpace = ():void => {
  while (at < count) {
    const ch = document.GetValue(at);
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
      at += 1;
      continue;
    }
    return;
  }
};
skipSpace();
if (at >= count || document.GetValue(at) !== "(") {
  return false;
}
let depth = 0;
let closed = false;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === "(") {
    depth += 1;
    at += 1;
    continue;
  }
  if (ch === ")") {
    depth -= 1;
    at += 1;
    if (depth === 0) {
      closed = true;
      break;
    }
    continue;
  }
  if (ch === "\"" || ch === "'" || ch === "`") {
    const quote = ch;
    at += 1;
    while (at < count && document.GetValue(at) !== quote) {
      if (document.GetValue(at) === "\\") {
        at += 1;
      }
      at += 1;
    }
    at += 1;
    continue;
  }
  at += 1;
}
if (!closed) {
  return false;
}
skipSpace();
if (at + 1 >= count) {
  return false;
}
return document.GetValue(at) === "=" && document.GetValue(at + 1) === ">";
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const data = host.Data;
const questionAt = ItemUtil.NextCode(data, tokenIndex);
if (questionAt < 0 || questionAt >= data.length) {
  throw new Error("增量变量形状未支持：expression 条件表达式缺问号");
}
const question = data[questionAt];
if (!ConditionalPossibleShape.IsQuestionSymbol(question)) {
  throw new Error("增量变量形状未支持：expression 条件表达式问号");
}
const leftAt = ItemUtil.PreviousCode(data, questionAt - 1);
if (leftAt < 0) {
  throw new Error("增量变量形状未支持：expression 条件表达式缺左操作数");
}
const leftUnit = data[leftAt];
let leftShape: ShapeToken;
if (leftUnit instanceof ShapeToken) {
  leftShape = leftUnit as ShapeToken;
} else if (leftUnit instanceof Common) {
  leftShape = ConditionalPossibleShape.BuildOperand(leftUnit as Common, host, leftAt, context);
} else {
  throw new Error("增量变量形状未支持：expression 条件表达式左操作数");
}
if (!leftShape.Closed) {
  leftShape.TryToClose(context);
}
const questionShape = new QuestionTokenShape(host.Template);
if (question.SourceRange.Start >= 0) {
  questionShape.SignIn(question.SourceRange.Start);
}
if (question.SourceRange.End >= 0) {
  questionShape.SignOut(question.SourceRange.End);
}
questionShape.Pos = IncrementalItemPosition.AfterPreviousCode(data, questionAt);
(question as Symbol).Replace(questionShape);
const conditional = new ConditionalExpressionShape(host.Template);
if (leftShape.SourceRange.Start >= 0) {
  conditional.SignIn(leftShape.SourceRange.Start);
}
conditional.Pos = leftShape.Pos;
conditional.Add(leftShape);
conditional.Add(questionShape);
data.splice(questionAt, 1);
data.splice(leftAt, 1);
data.splice(leftAt, 0, conditional);
conditional.Parent = host;
host.MountedUnit = conditional;
conditional.CatalogGuide = new CatalogGuide([new ConditionalMemberPossibleShape()], null);
return conditional;
```

## static method BuildOperand:(token:Common, host:Token, tokenIndex:int, context:SyntaxContext)=>ShapeToken

```ts
if (token.IsNumber()) {
  return NumericLiteralPossibleShape.BuildLiteral(token, host, tokenIndex, context);
}
const identifier = IdentifierShape.FromBasicToken(token, context);
identifier.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
token.Replace(identifier);
return identifier;
```

# class ConditionalMemberPossibleShape extends PossibleShape

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return ShapeStates.Reject;
}
const before = units[previous];
if (before instanceof QuestionTokenShape) {
  // 中段操作数（[R19:OBJECT] 值位 `{ … }` 也是操作数：`a ? { b: 1 } : c`）
  if (unit instanceof Common || ObjectLiteralOperandPossibleShape.Claims(unit)) {
    return ShapeStates.Accept;
  }
  return ShapeStates.Reject;
}
if (ConditionalMemberPossibleShape.IsColonSymbol(unit)) {
  // 中段操作数之后是 `:`
  if (before instanceof ShapeToken && !(before instanceof QuestionTokenShape)) {
    return ShapeStates.Accept;
  }
  return ShapeStates.Reject;
}
if (before instanceof ColonTokenShape) {
  // 右段操作数（[R19:OBJECT] 同上）
  if (unit instanceof Common || ObjectLiteralOperandPossibleShape.Claims(unit)) {
    return ShapeStates.Accept;
  }
  return ShapeStates.Reject;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
return !units[tokenIndex].IsTriviaToken;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
if (!(host instanceof ConditionalExpressionShape)) {
  throw new Error("增量变量形状未支持：expression 条件表达式成员宿主不是条件表达式");
}
const conditional = host as ConditionalExpressionShape;
const data = conditional.Data;
if (tokenIndex < 0 || tokenIndex >= data.length) {
  throw new Error("增量变量形状未支持：expression 条件表达式成员");
}
// trivia（空白 / 注释）不属 legacy 的 `ConditionalExpressionShape.Data`（它的子单元就是
// 「条件 ? 中段 : 右段」五个代码单元），留在形状里会变成增量树多出来的 basic 行。建之前从形状里摘掉：
// 与 `RightOperandPossibleShape` 对运算符后 trivia 的处理同一口径。
const current = data[tokenIndex];
for (let scan = data.length - 1; scan >= 0; scan--) {
  if (data[scan].IsTriviaToken) {
    data.splice(scan, 1);
  }
}
const at = data.indexOf(current);
if (at < 0) {
  throw new Error("增量变量形状未支持：expression 条件表达式成员");
}
const unit = data[at];
const previous = ItemUtil.PreviousCode(data, at - 1);
if (previous < 0) {
  throw new Error("增量变量形状未支持：expression 条件表达式成员缺前驱");
}
const before = data[previous];
if (before instanceof QuestionTokenShape) {
  if (unit instanceof Bracket && ObjectLiteralOperandPossibleShape.Claims(unit)) {
    return ObjectLiteralOperandPossibleShape.BuildInto(conditional, at, context);
  }
  return ConditionalPossibleShape.BuildOperand(unit as Common, conditional, at, context);
}
if (ConditionalMemberPossibleShape.IsColonSymbol(unit)) {
  return ConditionalMemberPossibleShape.BuildColon(unit as Symbol, conditional, at, context);
}
if (before instanceof ColonTokenShape) {
  let shape: Token;
  if (unit instanceof Bracket && ObjectLiteralOperandPossibleShape.Claims(unit)) {
    shape = ObjectLiteralOperandPossibleShape.BuildInto(conditional, at, context);
  } else {
    shape = ConditionalPossibleShape.BuildOperand(unit as Common, conditional, at, context);
  }
  conditional.TryToClose(context);
  if (conditional.Parent !== null && conditional.Parent.MountedUnit === conditional) {
    conditional.Quit();
  }
  return shape;
}
throw new Error("增量变量形状未支持：expression 条件表达式成员");
```

## static method IsColonSymbol:(unit:Token)=>bool

```ts
if (!(unit instanceof Symbol)) {
  return false;
}
return (unit as Symbol).Is(":");
```

## static method BuildColon:(token:Symbol, host:Token, tokenIndex:int, context:SyntaxContext)=>Token

```ts
const shape = new ColonTokenShape(host.Template);
if (token.SourceRange.Start >= 0) {
  shape.SignIn(token.SourceRange.Start);
}
if (token.SourceRange.End >= 0) {
  shape.SignOut(token.SourceRange.End);
}
shape.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
token.Replace(shape);
shape.TryToClose(context);
return shape;
```
