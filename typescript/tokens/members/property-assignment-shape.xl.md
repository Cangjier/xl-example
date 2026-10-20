# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class PropertyAssignmentShape extends ShapeToken

```txt
let o = { a: 1 };
```

## field NameToken:Token | null = null

## field Initializer:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromParts:(name:Token, value:Token, context:SyntaxContext)=>PropertyAssignmentShape

```ts
// TS 的 PropertyAssignment 只有两个子节点（名 / 值），冒号与逗号都不是节点；
// 区间从名字的起点到值的终点，Pos（含前导 trivia）由宿主按「前一个非 trivia 单元」算好再赋。
const shape = new PropertyAssignmentShape(name.Template);
shape.NameToken = name;
shape.Initializer = value;
shape.Add(name);
shape.Add(value);
shape.SignInToken(name);
shape.SignOutToken(value);
shape.TryToClose(context);
return shape;
```
