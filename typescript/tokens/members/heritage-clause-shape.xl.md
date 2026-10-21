# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { ExpressionWithTypeArgumentsShape } from "../expressions/expression-with-type-arguments-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
```

# namespace cangjie

# class HeritageClauseShape extends ShapeToken

```txt
class C extends B {}
class C implements I, J {}
interface I extends J<K> {}
```

继承子句。TS 的 HeritageClause children **只有** `ExpressionWithTypeArguments`（`extends` / `implements`
关键字不投影成子节点），所以 Data 里只装这些项；关键字只参与本形状的区间与 `Pos`。

区间：从关键字起点到最后一个类型表达式的终点；`Pos` = 关键字前一个非 trivia 单元（类名 / 接口名 / 上一个子句）`End.Index + 1`。

## field ClauseKind:string = ""

## field Types:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromParts:(keyword:Token, kind:string, types:Array<Token>, pos:int, context:SyntaxContext)=>HeritageClauseShape

```ts
const shape = new HeritageClauseShape(keyword.Template);
shape.ClauseKind = kind;
shape.Types = types;
for (const item of types) {
  shape.Add(item);
}
shape.SignInToken(keyword);
if (types.length === 0) {
  shape.SignOutToken(keyword);
} else {
  shape.SignOutToken(types[types.length - 1]);
}
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```

## static method BuildClauses:(host:Token, units:Array<Token>, basePos:int, context:SyntaxContext)=>Array<Token>

把 `extends` / `implements` 之后到类体 / 接口体之前的单元解析成子句数组。
`units` 里只放非 trivia 单元（调用方过滤），`basePos` = 它们的父单元（类名 / 接口名）终点 + 1。
逐个类型表达式建 `ExpressionWithTypeArgumentsShape`：名字用 `TypeBuilder.ParseName()`（Identifier），
后面跟 `<` 时用 `TypeBuilder.ParseTypeArguments()` 取泛型实参（实参自己的 `Pos` 由 builder 的 Positions 给出）。

```ts
const clauses:Array<Token> = [];
const builder = new TypeBuilder(host.Template, context);
builder.Load(units, basePos);
let keyword:Token | null = null;
let kind = "";
let clausePos = 0;
let currentTypes:Array<Token> = [];
while (builder.At < builder.Units.length) {
  const unit = builder.Units[builder.At];
  const text = builder.TextOf(unit);
  if (text === ",") {
    builder.At++;
    continue;
  }
  if (text === "extends" || text === "implements") {
    if (keyword !== null) {
      clauses.push(HeritageClauseShape.FromParts(keyword, kind, currentTypes, clausePos, context));
    }
    keyword = unit;
    kind = text;
    clausePos = builder.Positions[builder.At];
    currentTypes = [];
    builder.At++;
    continue;
  }
  const nameIndex = builder.At;
  const headUnit = builder.Units[nameIndex];
  // 类型字面量当实体名（`interface I extends { a: 1 } { }`，r1237）：这一格是**类型位**，
  // 交给 TypeBuilder 的 TypeLiteral；不能走 ExpressionBuilder（那会得到 ObjectLiteral 表达式）。
  // `extends { a: 1 }` 里那个 `{…}` 是**表达式位**：TS 的 AST 是
  // ExpressionWithTypeArguments.expression = ObjectLiteralExpression（不是 TypeLiteral）。
  // 所以这里不特殊处理，落到下面的 ExpressionBuilder 分支即可。
  const secondUnit:Token | null = nameIndex + 1 < builder.Units.length ? builder.Units[nameIndex + 1] : null;
  // Expression carrier cases: `(expr)`, `name.member` (property access), `name(...)` (call).
  // They are parsed with ExpressionBuilder; the plain name + optional `<type args>` form keeps TypeBuilder.
  const headText = builder.TextOf(headUnit);
  let startsWithAccess = headText === "null";
  // 实体名那一格是模板串（`` `a${X}b` `` / `` tag`t` ``）时整段交给 ExpressionBuilder：
  // 名字后紧跟的 String 基本 token 属于 tagged template 的模板部分，不是「下一个类型项」。
  if (!(headUnit instanceof Common) && !(headUnit instanceof Symbol) && !(headUnit instanceof Bracket)) {
    startsWithAccess = true;
  }
  if (secondUnit !== null) {
    if (builder.IsText(secondUnit, ".") || builder.IsText(secondUnit, "?.")) {
      startsWithAccess = true;
    }
    if (secondUnit instanceof Bracket && (secondUnit as Bracket).StartBracketChar === "(") {
      startsWithAccess = true;
    }
    if (!(secondUnit instanceof Common) && !(secondUnit instanceof Symbol) && !(secondUnit instanceof Bracket)) {
      // `tag`t``：名字后面紧跟模板串 → tagged template。
      startsWithAccess = true;
    }
  }
  let expression:Token;
  let genericCall = false;
  let genericCursor = nameIndex + 1;
  while (genericCursor < builder.Units.length) {
    const genericProbe = builder.Units[genericCursor];
    if (genericProbe instanceof Symbol && (genericProbe as Symbol).Is("<")) {
      break;
    }
    genericCursor++;
  }
  if (genericCursor < builder.Units.length) {
    let depth = 0;
    let cursor = genericCursor;
    let closing = -1;
    while (cursor < builder.Units.length) {
      const scanUnit = builder.Units[cursor];
      if (scanUnit instanceof Symbol) {
        if ((scanUnit as Symbol).Is("<")) {
          depth++;
        }
        if ((scanUnit as Symbol).Is(">")) {
          depth--;
          if (depth === 0) {
            closing = cursor;
            break;
          }
        }
      }
      cursor++;
    }
    if (closing >= 0 && closing + 1 < builder.Units.length) {
      const afterClose = builder.Units[closing + 1];
      if (afterClose instanceof Bracket && (afterClose as Bracket).StartBracketChar === "(") {
        genericCall = true;
      }
    }
  }
  if (headUnit instanceof Bracket || startsWithAccess || genericCall) {
    // Expression limit: stop before `<` so `A.B<C>` parses `A.B` as the expression and `<C>` as type arguments
    // (ExpressionBuilder would otherwise try generic-call type arguments on the `<` and fail without `(`).
    let expressionLimit = genericCall ? builder.Units.length : nameIndex;
    while (!genericCall && expressionLimit < builder.Units.length) {
      const probe = builder.Units[expressionLimit];
      if (probe instanceof Symbol && ((probe as Symbol).Is("<") || (probe as Symbol).Is(","))) {
        // `,` 是继承列表的分隔符（`extends A.B, C`），不能当成逗号表达式一起吃掉。
        break;
      }
      expressionLimit++;
    }
    const expressionBuilder = new ExpressionBuilder(host.Template, context);
    expressionBuilder.Load(builder.Units.slice(nameIndex, expressionLimit), builder.Positions[nameIndex]);
    const parsed = expressionBuilder.ParseExpression();
    if (expressionBuilder.At === 0) {
      throw new Error("heritage expression was not read");
    }
    const consumed = expressionBuilder.At;
    const endIndex = nameIndex + consumed - 1;
    builder.At = nameIndex + consumed;
    let expressionTypeArguments:Array<Token> = [];
    const expressionMark = builder.Peek(0);
    if (expressionMark !== null && builder.IsText(expressionMark, "<")) {
      expressionTypeArguments = builder.ParseTypeArguments();
    }
    // `A.B<C>` / `(expr)<T>`: type arguments follow the expression, end is `>` when present.
    const expressionEndUnit:Token = expressionTypeArguments.length === 0
      ? builder.Units[endIndex]
      : builder.Units[builder.At - 1];
    expression = ExpressionWithTypeArgumentsShape.FromParts(parsed, expressionTypeArguments, expressionEndUnit, builder.Positions[nameIndex], context);
  } else {
    const name = builder.ParseName();
    let typeArguments:Array<Token> = [];
    const mark = builder.Peek(0);
    if (mark !== null && builder.IsText(mark, "<")) {
      typeArguments = builder.ParseTypeArguments();
    }
    // ParseTypeArguments 之后 At 已经越过 `>`，那一格才是这一项的终点（TS 的 end = `>` 之后）。
    const endToken:Token | null = typeArguments.length === 0 ? name : builder.Units[builder.At - 1];
    expression = ExpressionWithTypeArgumentsShape.FromParts(name, typeArguments, endToken, builder.Positions[nameIndex], context);
  }
  if (keyword === null) {
    // 没有 `extends` / `implements` 关键字却来了一个类型：调用方把边界传错了，直接报出来。
    throw new Error("继承子句缺少 extends / implements 关键字");
  }
  currentTypes.push(expression);
}
if (keyword !== null) {
  clauses.push(HeritageClauseShape.FromParts(keyword, kind, currentTypes, clausePos, context));
}
return clauses;
```
