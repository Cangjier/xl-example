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
