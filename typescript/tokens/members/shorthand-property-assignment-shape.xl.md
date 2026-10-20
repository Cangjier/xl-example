# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class ShorthandPropertyAssignmentShape extends ShapeToken

```txt
let o = { a };
let o = { a = 1 };
```

## field NameToken:Token | null = null

## field Initializer:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromParts:(name:Token, initializer:Token | null, context:SyntaxContext)=>ShorthandPropertyAssignmentShape

```ts
// `{ a }` 只有名字一个子节点；`{ a = 1 }` 是 shorthand 的默认值写法，TS 把它记在
// objectAssignmentInitializer 上、仍是 ShorthandPropertyAssignment 的第二个子节点（不是 PropertyAssignment）。
// 区间从名字起点到初始化器终点（没有初始化器就只到名字终点）。
const shape = new ShorthandPropertyAssignmentShape(name.Template);
shape.NameToken = name;
shape.Initializer = initializer;
shape.Add(name);
shape.SignInToken(name);
if (initializer === null) {
  shape.SignOutToken(name);
} else {
  shape.Add(initializer);
  shape.SignOutToken(initializer);
}
shape.TryToClose(context);
return shape;
```
