# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class ImportTypeShape extends ShapeToken

```txt
type T = import("m").A;
type T = import("m").A<B>;
```

`import("m").A`：children 顺序与 TS 一致 = 模块字符串（`LiteralType → StringLiteral`）、限定名、可选泛型实参；
children 顺序 = 模块字符串、可选 attributes（`with` / `assert` 的 ImportAttributes 节点，TS 反查名 AssertClause）、限定名、可选泛型实参。
`import` / `(` / `)` / `.` / `with` / `assert` 都不进 AST。实测 `import("m").A` 是 `ImportType[8,22) → [LiteralType[16,19), Identifier[21,22)]`。

TS 侧反查名是别名 `LastTypeNode`，harness 两个文件里加了 `["LastTypeNode","ImportType"]`。

## field Argument:Token | null = null

## field AssertClause:Token | null = null

## field Qualifier:Token | null = null

## field TypeArguments:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```
