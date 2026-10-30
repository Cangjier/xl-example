# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ComputePossibleShapesStates } from "../../../core/syntax/compute-possible-shapes-states.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TypeAliasParsed } from "./type-parser.xl.md"
import { TypeParser } from "./type-parser.xl.md"
import { TypeShape } from "./type-shape.xl.md"
import { ConditionalTypeShape } from "./type-node-shapes.xl.md"
import { TypeParameterShape } from "./type-node-shapes.xl.md"
import { TypeConditionalUtil } from "./type-conditional-chain.xl.md"
import { TypeParameterListShape } from "./type-parameter-list-shape.xl.md"
```

# namespace cangjie

# class TypeAliasDeclarationShape extends TypeShape

## method ComputePossibleShapes:(context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates

```ts
// 头部的 `<` 只能开一张类型参数表：名字后紧跟一个已闭合的 `<`，就是它的判定点。
// 在这一格先把表建出来，不等 `>`、`=`、`;` 或 EOF；表自己按 `>` 收口成 TypeParameter。
if (TypeParameterListShape.TryOpen(this, context)) {
  return ComputePossibleShapesStates.Built;
}
return super.ComputePossibleShapes(context, source);
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
// 两条路径：
// - 函数类型（`( … ) => …`）在 `=>` 处就已经增量长出 FunctionType 与参数，这里只做收口；
// - 其余类型体仍是“先攒原始单元、再一次性把类型文法长出来”的兜底实现。
if (this.HasBuiltType()) {
  // 已经增量长出来的条件类型：先把最后一段的原始单元补成类型，再统一收口。
  for (const item of this.Data) {
    if (item instanceof ConditionalTypeShape) {
      TypeConditionalUtil.Finalize(item, context);
    }
  }
  for (const item of this.Data) {
    if (!item.Closed) {
      item.TryToClose(context);
    }
  }
  this.Data = this.Data.filter((item) => !item.IsTriviaToken && !item.IsBasicToken);
  const last = this.Last();
  if (last !== null && last.SourceRange.End >= 0) {
    this.SourceRange.End = last.SourceRange.End;
  }
  this.Closed = true;
  return CloseStates.Nothing;
}
const parsed = TypeParser.ParseAlias(this.Data, this.Data.length, this.Template);
const type = parsed.Type!;
TypeAliasDeclarationShape.Apply(this, parsed, type.SourceRange.End);
this.Closed = true;
return CloseStates.Nothing;
```

## private method HasBuiltType:()=>bool

```ts
// 只有「类型体」已经长成形状才算走了增量路径：头部的 TypeParameter 也是 TypeShape，
// 把它算进来会让 `type A<T, U> = T` 这类只在头部成形的别名在收口时被当成已完工，
// 正文被 IsBasicToken 过滤掉。所以这里排除 TypeParameter。
for (const item of this.Data) {
  if (item instanceof TypeShape && !(item instanceof TypeParameterShape)) {
    return true;
  }
}
return false;
```

## static method Apply:(alias:TypeAliasDeclarationShape, parsed:TypeAliasParsed, end:int)=>void

```ts
const data:Array<Token> = [];
if (parsed.Name !== null) {
  data.push(parsed.Name);
}
for (const parameter of parsed.TypeParameters) {
  data.push(parameter);
}
if (parsed.Type !== null) {
  data.push(parsed.Type);
}
alias.Data = data;
for (const item of data) {
  item.Parent = alias;
}
alias.SourceRange.End = end;
```
