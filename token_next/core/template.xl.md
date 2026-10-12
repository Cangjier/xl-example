# dependencies
```xl
import { Token } from "./token.xl.md"
```

# namespace cangjie

`Template`：一次解析的**配置**——语言层在装配时把自己的表写进去，core 只读它。

# class Template

一份解析的**配置**：语言层在装配时把自己的表写进去。

它是**每次解析新建一份**的（设计 §1.1），所以「语言层覆盖默认值」天然成立：这一份解析拿到的就是这一门语言自己的表，
而且只影响这一次解析。

## field Language:Token | null = null

装配它的那一门语言；没装配时是 `null`（那时 core 只能做最保守的事：什么都不认）。

**这一格是 core 找到语言层的唯一入口**：core 的单元不许认识任何语言词，
凡是要「问一句这门语言怎么说」的地方，都从这里过去。

**类型为什么是 `Token` 而不是 `LanguageToken`**：`LanguageToken` 那一页随这一轮收页一起删了，
而它本来就是 `Token` 的子类——所以这一格退到基类上，指向没有变，
core 少认识一个类名。语言层落地时把它收窄回 `LanguageToken` 即可。

## field Tables:Map<string, Array<string>> = new Map<string, Array<string>>()

语言层写进来的表：**一张表一个名字**（词表、配对表、运算符集……），值是字符串数组。

它从前是一格具体的 `Lexicon` 类；**一个声明一页**之后表退回成数据——core 不需要认识「词法表有哪几个面」，
只需要一个能装下「名字 → 一串词」的地方。词法层落地时，这一格由那个语言层自己解释。

## constructor:(language:Token | null)=>void

以一门语言创建；没装配时传 `null`。

```ts
this.Language = language;
```
