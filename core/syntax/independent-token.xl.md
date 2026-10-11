# dependencies
```xl
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
import { Template } from "./templates/template.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

独立单元：关闭之后就不再参与字符处理。它靠重组（`CloseRule`）被造出来，本身不消费字符。

# class IndependentToken extends Token

独立单元。

## field IsBindingPattern:bool = false

**我这一格能不能当「绑定模式」**（第 1074 轮）：解构声明左边的那个
`ArrayLiteral` / `ObjectLiteral`（`const [a, b] = xs` / `const { a } = o`）答 `true`，
其余独立单元照这一档答 `false`。

**为什么默认档落在这里**：投影层要在**投声明头**那一刻问一句「这一格是不是绑定模式」
（`print-ast-common.xl.md` 的 `projectHeadDeclare`：`for (const [a] of xs)` 那一档），
而答案就是**这一格的类名**——与 `Token.AstKind` / `Token.IsMemberTag` 同一条口径：
**默认值在基类、需要它的那一页各自显式声明**。写在独立单元这一层是因为今天答 `true`
的两个类都从它派生，而 `Bracket` 那半（`for (const [a] of xs)` 里还没被收成
`ArrayLiteral` 的那个方括号）读的是它自己的 `startBracket`，不吃这一格。

## constructor:(template:Template)=>void

以模板创建。独立单元没有自己的状态，构造器里只有转调。

```ts
super(template);
```

## method Process:(context:SyntaxContext, source:Source)=>void

处理一个字符。

独立单元不接收任何字符，所以这个覆写是**空的**：不写 ts 体，打印器产出空方法。

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理。

空实现，不写 ts 体。
