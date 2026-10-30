# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TypeAliasParsed } from "./type-parser.xl.md"
import { TypeParser } from "./type-parser.xl.md"
import { TypeShape } from "./type-shape.xl.md"
```

# namespace cangjie

# class TypeAliasDeclarationShape extends TypeShape

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
// 两条路径：
// - 函数类型（`( … ) => …`）在 `=>` 处就已经增量长出 FunctionType 与参数，这里只做收口；
// - 其余类型体仍是“先攒原始单元、再一次性把类型文法长出来”的兜底实现。
if (this.HasBuiltType()) {
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
for (const item of this.Data) {
  if (item instanceof TypeShape) {
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
