# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { ConstString } from "../../../../../core/syntax/basic-tokens/string/const-string.xl.md"
import { InterpolationString } from "../../../../../core/syntax/basic-tokens/string/interpolation-string.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { RegexToken } from "../../../../../core/syntax/basic-tokens/regex-token.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { String } from "../../../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
import { TemplateExpressionShape } from "../../template-expression-shape.xl.md"
import { TemplateSpanShape } from "../../template-span-shape.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { BigIntLiteralShape } from "../../../literals/big-int-literal-shape.xl.md"
import { NoSubstitutionTemplateLiteralShape } from "../../../literals/no-substitution-template-literal-shape.xl.md"
import { NumericLiteralShape } from "../../../literals/numeric-literal-shape.xl.md"
import { RegularExpressionLiteralShape } from "../../../literals/regular-expression-literal-shape.xl.md"
import { TemplateHeadShape } from "../../../literals/template-head-shape.xl.md"
import { TemplateMiddleShape } from "../../../literals/template-middle-shape.xl.md"
import { TemplateTailShape } from "../../../literals/template-tail-shape.xl.md"
import { FalseKeywordShape } from "../../../keywords/false-keyword-shape.xl.md"
import { NullKeywordShape } from "../../../keywords/null-keyword-shape.xl.md"
import { ThisKeywordShape } from "../../../keywords/this-keyword-shape.xl.md"
import { TrueKeywordShape } from "../../../keywords/true-keyword-shape.xl.md"
import { IdentifierShape } from "../../../names/identifier-shape.xl.md"
import { PrimaryAtomGuard } from "./primary-atom-guard.xl.md"
```

# namespace cangjie

# class TemplatePrimaryPossibleShape extends PossibleShape

WP-A1：声明初始化器位置的**模板字面量**（`` `t` `` / `` `${y}` `` / `` `a${b}c` `` / 嵌套模板）。

词法层把整段反引号串收成**一个** `String` basic 单元：`ConstString` 子块是字面段，`InterpolationString` 子块是
`${…}` 内插（它的 `Data` 里是内插表达式自己的 token）。所以本候选在串关闭的那一格，按 legacy
`ExpressionBuilder.ParseTemplateToken` 的同一套口径整棵建出来：

```text
`t`          → NoSubstitutionTemplateLiteralShape  text="t"
`${y}`       → TemplateExpressionShape
                 ├─ TemplateHeadShape  [8,11)       （`${，无 text）
                 └─ TemplateSpanShape  [11,14)      （pos=11 = 内插起点+1）
                    ├─ IdentifierShape y
                    └─ TemplateTailShape [12,14)    （pos=12 = 表达式终点）
```

legacy EOF 口径逐节点一致（`expr-probe` 实测，含嵌套模板）；`Pos` 全部按 legacy 的 `Positions` 口径：
模板根 `Pos` = 前一个非 trivia 单元 `EndIndex`（C1），内插内第一个原子 `Pos` = `interp.StartIndex + 1`，
后续原子 `Pos` = 前一个原子 `EndIndex`，尾段 / 中段 `Pos` = 内插表达式的 `EndIndex`。

**与带标签模板互斥**：前一个代码单元是形状（`tag`）时本候选 `Reject`，由
`TaggedTemplatePrimaryPossibleShape` 接管（否则同一格两个 `Accept` ⇒ 永远建不出来）。

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new TemplatePrimaryPossibleShape());
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

判据：当前格是已关闭的 `String`，且是**内插引号串**（TS 里 = 反引号模板）；前一个代码单元不是形状
（否则是带标签模板）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
const start = ItemUtil.ItemStartCached(units, cache);
if (tokenIndex < start) {
  return ShapeStates.Reject;
}
if (unit instanceof Symbol) {
  if ((unit as Symbol).Is("=")) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (!(unit instanceof String)) {
  return ShapeStates.Reject;
}
if (!(unit as String).IsSupportInterpolation) {
  return ShapeStates.Reject;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous >= 0 && !units[previous].IsBasicToken) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

只对「初始化器 = 单个模板字面量」放行（第二道闸门见 `PrimaryAtomGuard`）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken || !(unit instanceof String)) {
  return false;
}
if (!(unit as String).IsSupportInterpolation) {
  return false;
}
return PrimaryAtomGuard.IsLoneAtom(units, tokenIndex, context, false);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const token = host.Data[tokenIndex];
if (!(token instanceof String)) {
  throw new Error("增量变量形状未支持：expression 模板字面量");
}
if (!(token as String).IsSupportInterpolation) {
  throw new Error("增量变量形状未支持：expression 模板字面量（非内插串）");
}
const pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
const shape = TemplatePrimaryPossibleShape.BuildTemplateNode(token as String, pos, context);
token.Replace(shape);
return shape;
```

## static method BuildTemplateNode:(token:String, pos:int, context:SyntaxContext)=>Token

整段模板 → `NoSubstitutionTemplateLiteralShape` 或 `TemplateExpressionShape`（口径逐项照抄
`ExpressionBuilder.ParseTemplateToken`）。`TaggedTemplatePrimaryPossibleShape` 也调它。

```ts
const texts:Array<string> = [];
const interps:Array<InterpolationString> = [];
let current = "";
for (const part of token.Data) {
  if (part instanceof ConstString) {
    current += (part as ConstString).TempToString();
    continue;
  }
  if (part instanceof InterpolationString) {
    texts.push(current);
    current = "";
    interps.push(part as InterpolationString);
  }
}
texts.push(current);
if (interps.length === 0) {
  const literal = NoSubstitutionTemplateLiteralShape.FromBasicToken(token, context);
  literal.Pos = pos;
  return literal;
}
const expression = new TemplateExpressionShape(token.Template);
const head = new TemplateHeadShape(token.Template);
head.Text = texts[0];
if (token.SourceRange.StartIndex >= 0) {
  head.SignIn(token.SourceRange.StartIndex);
}
if (interps[0].SourceRange.StartIndex >= 0) {
  head.SignOut(interps[0].SourceRange.StartIndex + 1);
}
head.Pos = pos;
head.TryToClose(context);
expression.Add(head);
for (let index = 0; index < interps.length; index++) {
  const interp = interps[index];
  const value = TemplatePrimaryPossibleShape.BuildInterpolation(interp, context);
  let tailPos = 0;
  if (value.SourceRange.EndIndex >= 0) {
    tailPos = value.SourceRange.EndIndex;
  } else if (interp.SourceRange.EndIndex >= 0) {
    tailPos = interp.SourceRange.EndIndex - 1;
  }
  let tail:ShapeToken;
  if (index + 1 < interps.length) {
    const middle = new TemplateMiddleShape(token.Template);
    middle.Text = texts[index + 1];
    middle.Pos = tailPos;
    if (interp.SourceRange.EndIndex >= 0) {
      middle.SignIn(interp.SourceRange.EndIndex - 1);
    }
    const nextInterp = interps[index + 1];
    if (nextInterp.SourceRange.StartIndex >= 0) {
      middle.SignOut(nextInterp.SourceRange.StartIndex + 1);
    }
    middle.TryToClose(context);
    tail = middle;
  } else {
    const lastTail = new TemplateTailShape(token.Template);
    lastTail.Text = texts[index + 1];
    lastTail.Pos = tailPos;
    if (interp.SourceRange.EndIndex >= 0) {
      lastTail.SignIn(interp.SourceRange.EndIndex - 1);
    }
    if (token.SourceRange.EndIndex >= 0) {
      lastTail.SignOut(token.SourceRange.EndIndex);
    }
    lastTail.TryToClose(context);
    tail = lastTail;
  }
  const span = new TemplateSpanShape(token.Template);
  span.Add(value);
  span.Add(tail);
  if (interp.SourceRange.StartIndex >= 0) {
    span.SignIn(interp.SourceRange.StartIndex + 1);
    span.Pos = interp.SourceRange.StartIndex + 1;
  }
  if (tail.SourceRange.EndIndex >= 0) {
    span.SignOut(tail.SourceRange.EndIndex);
  }
  span.TryToClose(context);
  expression.Add(span);
}
if (token.SourceRange.StartIndex >= 0) {
  expression.SignIn(token.SourceRange.StartIndex);
}
if (token.SourceRange.EndIndex >= 0) {
  expression.SignOut(token.SourceRange.EndIndex);
}
expression.Pos = pos;
expression.TryToClose(context);
return expression;
```

## static method BuildInterpolation:(interp:InterpolationString, context:SyntaxContext)=>Token

`${…}` 里只支持**原子**（A1 的范围）：标识符 / 数字 / bigint / 布尔 / null / this / 正则 / 嵌套模板。
内插内的 `Pos` 口径：`base = interp.StartIndex + 1`，其后每个原子 = 前一个原子的 `EndIndex`。
遇到非原子形态按 C10 显式抛错（后续 A2/A3 会补运算符 / 成员等）。

```ts
let pos = 0;
if (interp.SourceRange.StartIndex >= 0) {
  pos = interp.SourceRange.StartIndex + 1;
}
let value:Token | null = null;
for (const unit of interp.Data) {
  if (unit.IsTriviaToken) {
    continue;
  }
  if (value !== null) {
    throw new Error("增量变量形状未支持：expression 插值里的表达式");
  }
  value = TemplatePrimaryPossibleShape.BuildAtom(unit, pos, context);
  if (unit.SourceRange.EndIndex >= 0) {
    pos = unit.SourceRange.EndIndex;
  }
}
if (value === null) {
  throw new Error("增量变量形状未支持：expression 插值里没有表达式");
}
return value;
```

## static method BuildAtom:(unit:Token, pos:int, context:SyntaxContext)=>Token

内插里可出现的原子：`String`（嵌套模板）/ `RegexToken` / `Common`（数字、bigint、布尔、null、this、标识符）。
不是这些就显式抛错（不在 A1 范围）。

```ts
if (unit instanceof String) {
  if (!(unit as String).IsSupportInterpolation) {
    throw new Error("增量变量形状未支持：expression 插值里的字符串");
  }
  return TemplatePrimaryPossibleShape.BuildTemplateNode(unit as String, pos, context);
}
if (unit instanceof RegexToken) {
  const regex = RegularExpressionLiteralShape.FromBasicToken(unit as RegexToken, context);
  regex.Pos = pos;
  return regex;
}
if (unit instanceof Common) {
  const common = unit as Common;
  if (common.IsBigInt()) {
    const bigInt = BigIntLiteralShape.FromBasicToken(common, context);
    bigInt.Pos = pos;
    return bigInt;
  }
  if (common.IsNumber()) {
    const numeric = NumericLiteralShape.FromBasicToken(common, context);
    numeric.Pos = pos;
    return numeric;
  }
  const text = common.TempToString();
  let keyword:ShapeToken | null = null;
  if (text === "true") {
    keyword = new TrueKeywordShape(common.Template);
  } else if (text === "false") {
    keyword = new FalseKeywordShape(common.Template);
  } else if (text === "null") {
    keyword = new NullKeywordShape(common.Template);
  } else if (text === "this") {
    keyword = new ThisKeywordShape(common.Template);
  }
  if (keyword !== null) {
    if (common.SourceRange.StartIndex >= 0) {
      keyword.SignIn(common.SourceRange.StartIndex);
    }
    if (common.SourceRange.EndIndex >= 0) {
      keyword.SignOut(common.SourceRange.EndIndex);
    }
    keyword.Pos = pos;
    keyword.TryToClose(context);
    return keyword;
  }
  const identifier = IdentifierShape.FromBasicToken(common, context);
  identifier.Pos = pos;
  return identifier;
}
throw new Error("增量变量形状未支持：expression 插值里的原子");
```
