# dependencies
```xl
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { TypeAliasBodyPossibleShape } from "./type-alias-possible-shape.xl.md"
import { TypeAliasBodyKeywordPossibleShape } from "./type-alias-possible-shape.xl.md"
import { TypeAliasArraySuffixPossibleShape } from "./type-alias-possible-shape.xl.md"
import { TypeAliasOperatorMemberPossibleShape } from "./type-alias-possible-shape.xl.md"
import { TypeAliasChainPossibleShape } from "./type-conditional-chain.xl.md"
import { TypeAliasIndexPossibleShape } from "./type-alias-member-possible-shape.xl.md"
import { TypeAliasMemberPossibleShape } from "./type-alias-member-possible-shape.xl.md"
import { TypeFunctionArrowPossibleShape } from "./type-function-incremental.xl.md"
import { TypeParameterListOpenPossibleShape } from "./type-parameter-list-shape.xl.md"
import { UnaryFragments } from "./forms/unary-fragments.xl.md"
import { LiteralFragments } from "./forms/literal-fragments.xl.md"
import { FunctionFragments } from "./forms/function-fragments.xl.md"
import { MappedFragments } from "./forms/mapped-fragments.xl.md"
import { RecursiveFragments } from "./forms/recursive-fragments.xl.md"
```


# namespace cangjie

# class TypeCatalogFactory

## static method CreateBody:()=>Array<PossibleShape>

```ts
const shapes: Array<PossibleShape> = [
  new TypeParameterListOpenPossibleShape(),
  new TypeAliasBodyPossibleShape(),
  new TypeAliasBodyKeywordPossibleShape(),
  new TypeAliasArraySuffixPossibleShape(),
  new TypeAliasMemberPossibleShape(),
  new TypeAliasIndexPossibleShape(),
  new TypeAliasOperatorMemberPossibleShape(),
  new TypeFunctionArrowPossibleShape(),
  new TypeAliasChainPossibleShape(),
];
// [T-CAT:REGISTER] 预分配式注册区：5 个形态片段各占一行，T1–T5 只改自己那一个片段文件，本文件此后不再改动。
TypeCatalogFactory.AppendFragments(shapes);
return shapes;
```

## static method CreateNested:()=>Array<PossibleShape>

```ts
const shapes: Array<PossibleShape> = [];
// 嵌套类型上下文（类型实参、返回类型等）的基座为空：候选一律由 5 个片段的 AppendTo 贡献，
// 因此本方法同样不需要在 T0 之后修改。
TypeCatalogFactory.AppendFragments(shapes);
return shapes;
```

## static method AppendFragments:(shapes:Array<PossibleShape>)=>void

```ts
UnaryFragments.AppendTo(shapes);
LiteralFragments.AppendTo(shapes);
FunctionFragments.AppendTo(shapes);
MappedFragments.AppendTo(shapes);
RecursiveFragments.AppendTo(shapes);
```
