# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
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
  const name = builder.ParseName();
  let typeArguments:Array<Token> = [];
  const mark = builder.Peek(0);
  if (mark !== null && builder.IsText(mark, "<")) {
    typeArguments = builder.ParseTypeArguments();
  }
  // ParseTypeArguments 之后 At 已经越过 `>`，那一格才是这一项的终点（TS 的 end = `>` 之后）。
  const endToken:Token | null = typeArguments.length === 0 ? name : builder.Units[builder.At - 1];
  const expression = ExpressionWithTypeArgumentsShape.FromParts(name, typeArguments, endToken, builder.Positions[nameIndex], context);
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
