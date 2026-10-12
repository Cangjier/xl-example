# dependencies
```xl
import { LanguageShapeToken } from "../../core/language-shape-token.xl.md"
import { Template } from "../../core/template.xl.md"
import { Token } from "../../core/token.xl.md"
import { Source } from "../../core/source.xl.md"
import { SyntaxContext } from "../../core/context.xl.md"
```

# namespace cangjie

**花括号那一族**：`{` … `}`。两格：值位是对象字面量，语句位是块。

这一族**没有自己的向导**（用的是基类那个「什么都不排除」的）：花括号在括号**里面**
没有判别事件——定它的是**挂载方声明的那一格**（§3 的 C2），而池从挂载那一刻起就只有一格，
所以它在第一格关上（或者构造结束时）就被 resolve 出来。

放在这里的是一句实话：**不是每一族都需要排除器**；需要的是「括号里面判不出来」的那几族。

# class BraceShape extends LanguageShapeToken

花括号那一族的入口。

## constructor:(template:Template, pool:Array<string>)=>void

以模板与池创建。

```ts
super(template, pool);
```

# class ObjectLiteralShape extends LanguageShapeToken

对象字面量那一格（值位的 `{ … }`）。

## constructor:(template:Template)=>void

形状这一档没有池。

```ts
super(template, []);
```

## method Attrs:()=>string

开标签上记下这一格的种类。

```ts
return "kind=\"object-literal\"";
```

# class BlockShape extends LanguageShapeToken

块那一格（语句位的 `{ … }`）。

## constructor:(template:Template)=>void

形状这一档没有池。

```ts
super(template, []);
```

## method Attrs:()=>string

开标签上记下这一格的种类。

```ts
return "kind=\"block\"";
```
