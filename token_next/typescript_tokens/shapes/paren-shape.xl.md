# dependencies
```xl
import { LanguageCatalogGuideToken } from "../../core/language-catalog-guide-token.xl.md"
import { LanguageShapeToken } from "../../core/language-shape-token.xl.md"
import { Source } from "../../core/source.xl.md"
import { SyntaxContext } from "../../core/context.xl.md"
import { Template } from "../../core/template.xl.md"
import { Token } from "../../core/token.xl.md"
```

# namespace cangjie

**圆括号那一族**：`(` … `)`。三种身份，池由挂载方声明：

- **`CallShape`**：左邻是一个值（`f(`）——池一开始就只有它，没有歧义；
- **`GroupShape`** / **`ArrowParamsShape`**：左邻不是值（`(` 起头）——这两格**在括号里面判不出来**：
  判它的是括号**后面**那一格（`=>` 还是别的）。

所以这一族的 reader 在括号关上之后**多留一格**：等那一格关上，把它交给向导当判别事件
（§5 第二种失败那句「缺一条判别事件」在这里就是「等下一格」）。输入正好断在括号后面时，
判别事件永远不来——那时如实报「构造结束仍 > 1」，不替它挑一个。

# class ParenGuide extends LanguageCatalogGuideToken

## constructor:(template:Template, pool:Array<string>)=>void

以模板与挂载方声明的池创建。

```ts
super(template, pool);
```

## method Converge:(closed:Token, source:Source)=>Array<string>

**排除器**：括号后面那一格是 `=>` ⇒ 箭头形参表，别的 ⇒ 分组。

两句话只朝一个方向排除，所以**永远不会把池收成 0**：来了 `=>` 就去掉分组，
来了别的就去掉箭头——哪一趟都只剩一格。

```ts
if (closed.Tag !== "SymbolToken") return this.Pool;
if (closed.Text === "=>") return this.Exclude("GroupShape");
return this.Exclude("ArrowParamsShape");
```

# class ParenShape extends LanguageShapeToken

圆括号那一族的入口：它自己只管那一对括号，内容归向导。

## constructor:(template:Template, pool:Array<string>)=>void

以模板与池创建。

```ts
super(template, pool);
```

## method CreateGuide:(template:Template, pool:Array<string>)=>LanguageCatalogGuideToken

这一族用哪个向导（排除器）。

```ts
return new ParenGuide(template, pool);
```

# class GroupShape extends LanguageShapeToken

分组那一格：括号里是一个表达式。

## constructor:(template:Template)=>void

形状这一档没有池。

```ts
super(template, []);
```

## method Attrs:()=>string

开标签上记下这一格的种类。

```ts
return "kind=\"group\"";
```

# class CallShape extends LanguageShapeToken

调用那一格：第一个子单元是**被调用者**（挂载方交进来的左邻），其余是实参。

## constructor:(template:Template)=>void

形状这一档没有池。

```ts
super(template, []);
```

## method Attrs:()=>string

开标签上记下这一格的种类。

```ts
return "kind=\"call\"";
```

# class ArrowParamsShape extends LanguageShapeToken

箭头函数的形参表那一格：`(a, b) => …` 的前半截。

## constructor:(template:Template)=>void

形状这一档没有池。

```ts
super(template, []);
```

## method Attrs:()=>string

开标签上记下这一格的种类。

```ts
return "kind=\"arrow-params\"";
```
