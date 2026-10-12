# dependencies
```xl
import { LanguageShapeToken } from "./language-shape-token.xl.md"
import { Lexicon } from "./lexicon.xl.md"
import { Source } from "./source.xl.md"
import { Template } from "./template.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

catalog guide 与 shape token：与语言无关的那一半（`core`）。

**`LanguageToken` 是每门语言一份实现的那一层**（设计 §1 第 3 条）：

- 承载**词法表**（装配时写进模板）；
- 承载**语言词表**（关键字 / 修饰词 / 声明词）；
- 承载**身份判据的实现**（「这一格是不是关键字」「这一格是哪一类运算符」）；
- 它是**装配入口**。

core 的单元一个语言词都不认识：凡是需要「这门语言怎么说」的地方，都从这里过。
这一页因此是 core 里**唯一**允许提到语言概念的地方，而且它自己一格都不写死——
它的答案全部读表、或者由子类覆写。

# class ShapeDeclaration

**这一次挂载的声明**（设计 §3 的 C2：池的初始值由**挂它的那个 shape** 声明）。

## field Reader:Token | null = null

要挂上去的那一格形状 reader；`null` = 这个字符这里不开形状。

## field Adopt:bool = false

要不要把挂载方的**左邻**那一格交进去。

调用与下标要它：`f(` 的 `f`、`a[` 的 `a`——被构造者与被下标者都是**形状自己**的一部分，
不是父容器的一个兄弟。

## constructor:(reader:Token | null, adopt:bool)=>void

以 reader 与「要不要交左邻」创建。

```ts
this.Reader = reader;
this.Adopt = adopt;
```

# class LanguageToken

## method Assemble:()=>Template

**装配入口**：造一份空表、把这一门语言的表写进去、再连自己一起装进模板。

模板每次解析新建一份（§1.1），所以这一次装配只影响这一次解析。

```ts
const lexicon = new Lexicon();
this.FillLexicon(lexicon);
return new Template(lexicon, this);
```

## method FillLexicon:(lexicon:Lexicon)=>void

把这一门语言的词法表写进模板。**抽象成员**，由语言层实现。

```ts
throw new Error("abstract member: FillLexicon");
```

## method StartsUnit:(ch:string)=>bool

这个字符会不会**开一个新单元**——会的话，正在攒正文的词法单元不许把它吃进去
（`a"b"` 里的 `"`、`1(` 里的 `(`）。

**抽象成员**，由语言层按自己的表实现。

```ts
throw new Error("abstract member: StartsUnit");
```

## method ExtendsLexeme:(text:string, ch:string, cls:string)=>bool

**这一格还算不算我这一格的一部分**：默认给假。

core 的口径是「同类字符才继续」；跨类的写法（`0x1F` 里那个 `x`、`1_000` 里那个 `_`）
是**这门语言的数字字面量写法**，所以由语言层答——core 的表里只有「哪些字符算数字」这一格。

`text` 是已经攒下的正文、`ch` 是下一个字符、`cls` 是本单元已经定下的类。

```ts
return false;
```

## method CreateLexemeOf:(template:Template, parent:Token, source:Source)=>Token | null

`parent` 是**挂载方**：正则与除号都从 `/` 开头，算不算正则要看左邻那一格。

**带标记的词法单元**：注释与正则这两族的「什么时候算开头」要看左邻，所以它是语言判断。

基类给「没有」——core 的表里没有这一类；`lexeme.xl.md` 的 `CreateLexeme` 接在它后面兜底。

```ts
return null;
```

## method DeclareShape:(mounter:Token, source:Source)=>ShapeDeclaration | null

**声明池**（§3 的 C2）：`mounter` 要在这个字符上挂一个形状的话，池里有哪几种形状、
要不要交左邻。

**它必须由挂载方调用、由语言层回答**：池里那些名字是语言形状的名字，core 一个都不认识；
而「我的下面可能有哪些子形状」这件事，只有**手上拿着左邻那一格**的挂载方说得出来。

基类给「这里不开形状」。

```ts
return null;
```

## method CreateHole:(parent:Token, source:Source)=>Token | null

**插值洞**（§2.1 的唯一接点）：字符串那一格把洞挂上去、洞里的内容由子单元自己啃。

基类给「没有」。

```ts
return null;
```

## method BuildShape:(name:string, template:Template)=>LanguageShapeToken

按池里的名字造出那一格形状 token——**resolve** 那一步就是问它。

**抽象成员**，由语言层实现（名字表就在语言层手里）。

```ts
throw new Error("abstract member: BuildShape");
```

## method OperatorKindOf:(text:string)=>string

**身份判据**：这一串符号是哪一类运算符。

`assign` / `compare` / `compound` / `member` / `end` / `punctuation`，都不是给空串。
判据全部读表。

```ts
const lexicon = this.LexiconOf();
if (lexicon.AssignOperators.has(text)) return "assign";
if (lexicon.CompareOperators.has(text)) return "compare";
if (lexicon.CompoundAssignOperators.has(text)) return "compound";
if (lexicon.MemberOperators.has(text)) return "member";
if (lexicon.StatementEndOperators.has(text)) return "end";
if (lexicon.PunctuationOperators.has(text)) return "punctuation";
return "";
```

## method IsKeyword:(text:string)=>bool

**身份判据**：这一格正文是不是一个关键字。读词表。

```ts
return this.LexiconOf().Keywords.has(text);
```

## method IsModifier:(text:string)=>bool

**身份判据**：修饰词。

```ts
return this.LexiconOf().ModifierWords.has(text);
```

## method IsDeclarationWord:(text:string)=>bool

**身份判据**：声明词。

```ts
return this.LexiconOf().DeclarationWords.has(text);
```

## method LexiconOf:()=>Lexicon

这一门语言的词法表。

**语言层自己那一份**（装配时也写进模板）：装配之后两者是同一份内容，
但语言层的判据不该去问「当前这一份模板」——它答的是「这门语言是什么」，与哪一次解析无关。

```ts
throw new Error("abstract member: LexiconOf");
```

## method IsValueShape:(unit:Token)=>bool

**左邻这一格算不算一个值**：算的话，`(` 是调用、`[` 是下标（C2 里最常用的那一问）。

基类给假——「值」是语言形状的概念。

```ts
return false;
```
