# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { TypeParser } from "./type-parser.xl.md"
import { TypeShape } from "./type-shape.xl.md"
```

# namespace cangjie

# class TypeParameterListShape extends TypeShape

## static method TryOpen:(host:Token, context:SyntaxContext)=>bool

```ts
// 声明头部的 `<` 只能是类型参数表：`type A<`、`class A<` 里它后面不可能接出别的东西。
// 所以「名字 + 一个已闭合的 `<`」就是这张表的判定点，不需要等 `>`、`=`、`;` 或 EOF。
// 判定与建表都放在这里，任何声明宿主（type 别名、class、interface……）只要在自己的
// ComputePossibleShapes 里调一次，就能在同一格把表建出来，而不是各写一份。
if (host.MountedUnit !== null) {
  return false;
}
const units = host.Data;
const code:Array<number> = [];
for (let at = 0; at < units.length; at++) {
  if (!units[at].IsTriviaToken) {
    code.push(at);
  }
  if (code.length > 2) {
    return false;
  }
}
if (code.length !== 2) {
  return false;
}
if (!(units[code[0]] instanceof IdentifierShape)) {
  return false;
}
const open = units[code[1]];
if (!(open instanceof Symbol) || !open.Closed || !open.Is("<")) {
  return false;
}
const list = new TypeParameterListShape(host.Template);
list.Pos = ItemUtil.PositionOf(units, code[1]);
list.SignIn(open.SourceRange.Start);
const moved:Array<Token> = units.splice(code[1]);
for (const item of moved) {
  list.Add(item);
}
host.Add(list);
host.MountedUnit = list;
list.CatalogGuide = new CatalogGuide([], new TypeParameterListEndPossibleShape());
return true;
```

## method Finalize:(context:SyntaxContext)=>void

```ts
// 表以配平的 `>` 收口：把这一段原样交给类型文法，得到 TypeParameter 列表，然后把自己换成它们。
// 之后的 close 看到的就是已经成形的 TypeParameter，不会再从 `<` 重解析一遍。
if (this.Closed) {
  return;
}
const parsed:Array<Token> = TypeParser.ParseTypeParameterList(this.Data, this.Data.length, this.Template);
const parent = this.Parent;
if (parent !== null) {
  const index = parent.Data.indexOf(this);
  if (index >= 0) {
    parent.Data.splice(index, 1, ...parsed);
  }
  for (const item of parsed) {
    item.Parent = parent;
  }
  parent.MountedUnit = null;
}
this.Data = [];
this.Closed = true;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
this.Finalize(context);
return CloseStates.Nothing;
```

# class TypeParameterListEndPossibleShape extends PossibleShape

## method ComputeByIndex:(host:Token, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
const units = host.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is(">")) {
  return ShapeStates.Reject;
}
// 嵌套的 `<…>`（`T extends Array<Array<T>>`）要在自己的 `>` 上等着，只有最外层配平的那个 `>` 才收口。
if (!TypeParser.IsBalanced(units, units.length)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !unit.Closed || !unit.Is(">")) {
  return false;
}
return TypeParser.IsBalanced(units, units.length);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const unit = host.Data[tokenIndex];
(host as TypeParameterListShape).Finalize(context);
return this.StampCreated(unit, context);
```
