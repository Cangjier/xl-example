# dependencies
```xl
import { LanguageShapeToken } from "../../core/language-shape-token.xl.md"
import { Template } from "../../core/template.xl.md"
```

# namespace cangjie

**字符串与插值洞**（设计 §2.1）。

字符串本身**不需要 catalog guide**：引号、转义、原始、插值、模板、多行全部是配置，
形态在开串那一刻就定死了——那一半住在 core 的 `StringToken` 里，这一页一个字都不重复。

这一页管的是**唯一的接点**：插值洞 `${ … }`。洞里是一段值，所以它走的是**形状**那一套；
它自己是一对定界符，池只有一格（洞里的内容是什么，由挂载方声明——C2）。

# class HoleShape extends LanguageShapeToken

插值洞那一族的入口（`${` … `}`）。

## constructor:(template:Template, pool:Array<string>)=>void

以模板与池创建。

```ts
super(template, pool);
```

# class HoleValueShape extends LanguageShapeToken

洞里那一格：一段值。

## constructor:(template:Template)=>void

形状这一档没有池。

```ts
super(template, []);
```

## method Attrs:()=>string

开标签上记下这一格的种类。

```ts
return "kind=\"hole\"";
```
