# dependencies
```xl
import { LanguageShapeToken } from "../../core/language-shape-token.xl.md"
import { Source } from "../../core/source.xl.md"
import { SyntaxContext } from "../../core/context.xl.md"
import { Template } from "../../core/template.xl.md"
import { Token } from "../../core/token.xl.md"
```

# namespace cangjie

**方括号那一族**：`[` … `]`。两格：左邻是一个值就是下标，不是值就是数组字面量。

与花括号那一族同一条口径：**没有自己的向导**——定它的是挂载方声明的那一格（C2）。

# class BracketShape extends LanguageShapeToken

方括号那一族的入口。

## constructor:(template:Template, pool:Array<string>)=>void

以模板与池创建。

```ts
super(template, pool);
```

# class ArrayLiteralShape extends LanguageShapeToken

数组字面量那一格（值位的 `[ … ]`）。

## constructor:(template:Template)=>void

形状这一档没有池。

```ts
super(template, []);
```

## method Attrs:()=>string

开标签上记下这一格的种类。

```ts
return "kind=\"array-literal\"";
```

# class IndexShape extends LanguageShapeToken

下标那一格：第一个子单元是**被下标者**（挂载方交进来的左邻），其余是下标表达式。

## constructor:(template:Template)=>void

形状这一档没有池。

```ts
super(template, []);
```

## method Attrs:()=>string

开标签上记下这一格的种类。

```ts
return "kind=\"index\"";
```
