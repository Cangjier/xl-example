# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class ExpressionWithTypeArgumentsShape extends ShapeToken

```txt
class C extends D {}
class C extends D<E> {}
class C extends D<E, F> {}
class C implements I<J>, K {}
```

继承 / implements 列表里的一项。TS 的 children 顺序：`expression`（`Identifier`，限定名时是 `PropertyAccessExpression`，
本批只做 Identifier）+ 每个泛型实参（`TypeReference` 等**类型**节点，不是表达式）。
`extends` / `implements` 关键字不进 Data（它们属于 HeritageClause 的 token，TS 侧也不投影成子节点）。

区间：从名字起点到最后一个泛型实参终点（没有实参就到名字终点）；`Pos` = 名字前一个单元（`extends` / `implements` / `,`）
的 `EndIndex`（半开终点，等价旧口径的 `End.Index + 1`），与 TS 的 `ExpressionWithTypeArguments.pos` 同口径（含前导 trivia）。

字段不叫 `Name` / `Expression` 会被 `cjAst` 读成 AST 字段：`Expression` 不在投影表里，安全。

## field Expression:Token | null = null

## field TypeArguments:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromParts:(name:Token, typeArguments:Array<Token>, endToken:Token | null, pos:int, context:SyntaxContext)=>ExpressionWithTypeArgumentsShape

```ts
// `endToken` 是这一项的终点单元：有泛型实参时是 `>`（闭括号之后的那个位置才是 TS 的 end），
// 没有实参时就是名字本身。typeArguments 只决定 Data，不决定区间。
const shape = new ExpressionWithTypeArgumentsShape(name.Template);
shape.Expression = name;
shape.TypeArguments = typeArguments;
shape.Add(name);
for (const argument of typeArguments) {
  shape.Add(argument);
}
shape.SignInToken(name);
if (endToken !== null) {
  shape.SignOutToken(endToken);
} else if (typeArguments.length === 0) {
  shape.SignOutToken(name);
} else {
  shape.SignOutToken(typeArguments[typeArguments.length - 1]);
}
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```
