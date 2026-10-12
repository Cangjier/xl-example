# dependencies
```xl
import { LanguageCatalogGuideToken } from "../../core/language-catalog-guide-token.xl.md"
import { LanguageShapeToken } from "../../core/language-shape-token.xl.md"
import { MountLexeme } from "../../core/lexeme.xl.md"
import { Source } from "../../core/source.xl.md"
import { SyntaxContext } from "../../core/context.xl.md"
import { Template } from "../../core/template.xl.md"
import { Token } from "../../core/token.xl.md"
```

# namespace cangjie

**「值」那一族**：一段正文——名字或者数字。

它**没有括号那一对**：reader 一挂上去就把向导挂在自己身上，字符直接进向导。

池里的两格由**第一段关上的正文**收成一格：正文的头一个字符是不是数字，一次就把它定死
（设计 §1.1 的「数字表」就是那一问的判据）。

# class ValueGuide extends LanguageCatalogGuideToken

## constructor:(template:Template, pool:Array<string>)=>void

以模板与挂载方声明的池创建。

```ts
super(template, pool);
```

## method MountContent:(context:SyntaxContext, source:Source)=>bool

**内容只走词法那一半**（`MountLexeme`）：值的内容是一段正文，不是一个形状——
去问 `DeclareShape` 就会在同一个字符上再开一个「值」reader。

```ts
return MountLexeme(this, context, source);
```

## method Converge:(closed:Token, source:Source)=>Array<string>

**排除器**：数字表说头一个字符是数字 ⇒ 数字；否则 ⇒ 名字。

不是我这一格的事（比如空白掉了、或者关掉的是别的单元）就**一点都不动**（C4 / C5）。

```ts
if (closed.Tag !== "CommonToken") return this.Pool;
const text = closed.Text;
if (text === "") return this.Pool;
if (this.Template.Lexicon.IsDigit(text.charAt(0))) return ["NumberShape"];
return ["NameShape"];
```

# class ValueShape extends LanguageShapeToken

「值」那一族的入口：池里可能是名字，也可能是数字。

## constructor:(template:Template, pool:Array<string>)=>void

以模板与池创建。

```ts
super(template, pool);
```

## method CreateGuide:(template:Template, pool:Array<string>)=>LanguageCatalogGuideToken

这一族用哪个向导（排除器）。

```ts
return new ValueGuide(template, pool);
```

# class NameShape extends LanguageShapeToken

名字那一格（池收敛出来的一格）。

## constructor:(template:Template)=>void

形状这一档没有池。

```ts
super(template, []);
```

## method Attrs:()=>string

开标签上记下这一格的种类。

```ts
return "kind=\"name\"";
```

# class NumberShape extends LanguageShapeToken

数字那一格。

## constructor:(template:Template)=>void

形状这一档没有池。

```ts
super(template, []);
```

## method Attrs:()=>string

开标签上记下这一格的种类。

```ts
return "kind=\"number\"";
```
