# dependencies
```xl
import { LanguageToken } from "./language-token.xl.md"
import { Lexicon } from "./lexicon.xl.md"
```

# namespace cangjie

catalog guide 与 shape token：与语言无关的那一半（`core`）。

模板：**每次解析新建一份**（设计 §1.1），语言层在装配时把自己的表写进去。

所以「语言层覆盖默认值」天然成立——`Lexicon` 那几格的空默认值只在**没人装配**时存在，
一旦装过就是这一门语言自己的表，而且**只影响这一次解析**。

# class Template

## field Lexicon:Lexicon = new Lexicon()

这一份解析的词法表。

## field Language:LanguageToken | null = null

装配它的那一门语言；没装配时是 `null`（那时 core 只能做最保守的事：什么都不认）。

**这一格是 core 找到语言层的唯一入口**：core 的单元不许认识任何语言词，
凡是要「问一句这门语言怎么说」的地方，都从这里过去。

## constructor:(lexicon:Lexicon, language:LanguageToken | null)=>void

以一份表与一门语言创建。

```ts
this.Lexicon = lexicon;
this.Language = language;
```
