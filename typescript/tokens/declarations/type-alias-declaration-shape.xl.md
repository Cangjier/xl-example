# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
```

# namespace cangjie

# class TypeAliasDeclarationShape extends ShapeToken

```txt
type T = number;
type T = A | B;
```

measurement 载体：`type T = <type>;`。TS 的 children **不含** `type` 关键字与 `=`、`;`
（实测 `type T = A;` → `TypeAliasDeclaration → [Identifier T, TypeReference A]`），所以 `Data` 只装两个形状：
名字 + 类型；关键字 / 等号 / 分号都是 basic token，建完就丢。

区间：从 `type` 的起点到 `;`；`Pos` = 前一个非 trivia 单元 `End.Index + 1`（没有就 `0`），与 TS 一致。
`type` 与名字之间的 trivia 体现在名字的 `Pos` 上（`type /* c */ T` 的名字 `Pos` 仍是 `type` 之后）。

字段不叫 `Name`：`cjAst` 会把 `Name` 读成 AST 的 `name`，而 TS 的 `TypeAliasDeclaration` 在尺子里只比 children。

## field AliasName:Token | null = null

## field AliasType:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext)=>TypeAliasDeclarationShape

从根单元 `host.Data[start..tokenIndex]` 建一条类型别名声明。`tokenIndex` 必须落在 `;` 上。

```ts
const code:Array<Token> = [];
for (let at = start; at <= tokenIndex; at++) {
  if (!host.Data[at].IsTriviaToken) {
    code.push(host.Data[at]);
  }
}
if (code.length < 5) {
  throw new Error("类型别名声明不完整");
}
const keyword = code[0];
const nameUnit = code[1];
const equal = code[2];
const last = code[code.length - 1];
if (!(keyword instanceof Common) || !(keyword as Common).Is("type")) {
  throw new Error("类型别名声明缺少 type 关键字");
}
if (!(nameUnit instanceof Common)) {
  throw new Error("类型别名声明的名字不是标识符");
}
if (!(equal instanceof Symbol) || !(equal as Symbol).Is("=")) {
  throw new Error("类型别名声明缺少等号");
}
if (!(last instanceof Symbol) || !(last as Symbol).Is(";")) {
  throw new Error("类型别名声明缺少分号");
}
let pos = 0;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const end = host.Data[at].SourceRange.End;
    if (end !== null) {
      pos = end.Index + 1;
    }
    break;
  }
}
let namePos = 0;
if (keyword.SourceRange.End !== null) {
  namePos = keyword.SourceRange.End.Index + 1;
}
const name = IdentifierShape.FromBasicToken(nameUnit, context);
name.Pos = namePos;
let typePos = 0;
if (equal.SourceRange.End !== null) {
  typePos = equal.SourceRange.End.Index + 1;
}
const typeUnits:Array<Token> = code.slice(3, code.length - 1);
const builder = new TypeBuilder(host.Template, context);
builder.Load(typeUnits, typePos);
const type = builder.ParseType();
if (builder.At !== builder.Units.length) {
  throw new Error("类型别名声明的类型没有读完");
}
const shape = new TypeAliasDeclarationShape(host.Template);
shape.AliasName = name;
shape.AliasType = type;
shape.Add(name);
shape.Add(type);
if (keyword.SourceRange.Start !== null) {
  shape.SignIn(keyword.SourceRange.Start);
}
if (last.SourceRange.End !== null) {
  shape.SignOut(last.SourceRange.End);
}
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```
