# dependencies
```xl
import { BranchTransiter } from "../branch-transiter.xl.md"
import { Bom } from "../basic-tokens/bom.xl.md"
import { Shebang } from "../basic-tokens/shebang.xl.md"
import { AreaAnnotation } from "../basic-tokens/area-annotation.xl.md"
import { Bracket } from "../basic-tokens/bracket.xl.md"
import { Common } from "../basic-tokens/common.xl.md"
import { LineAnnotation } from "../basic-tokens/line-annotation.xl.md"
import { RegexToken } from "../basic-tokens/regex-token.xl.md"
import { StringGuide } from "../basic-tokens/string/string-guide.xl.md"
import { Symbol } from "../basic-tokens/symbol.xl.md"
import { WrapSymbol } from "../basic-tokens/wrap-symbol.xl.md"
import { BasicDispatch } from "./basic-dispatch.xl.md"
import { KeywordTemplate } from "./keyword-template.xl.md"
import { MethodNameTemplate } from "./method-name-template.xl.md"
import { NumberTemplate } from "./number-template.xl.md"
import { RegexTemplate } from "./regex-template.xl.md"
import { Sequence } from "./sequence.xl.md"
import { SequenceTemplate } from "./sequence-template.xl.md"
import { StringTemplate } from "./string-template.xl.md"
import { SymbolTemplate } from "./symbol-template.xl.md"
```

# namespace cangjie

# type TemplateInitializer = (template:Template)=>void

# class Template

## field BranchTemplate:SequenceTemplate<BranchTransiter> = new SequenceTemplate<BranchTransiter>()

## field SymbolTemplate:SymbolTemplate = new SymbolTemplate()

## field StringTemplate:StringTemplate = new StringTemplate()

## field KeywordTemplate:KeywordTemplate = new KeywordTemplate()

## field MethodNameTemplate:MethodNameTemplate = new MethodNameTemplate()

## field RegexTemplate:RegexTemplate = new RegexTemplate()

## field BomChars:Array<string> = ["\uFEFF", "\uFFFE"]

## field ShebangMarker:string = "#!"

## field LineTerminatorChars:string = "\n"

## method IsLineTerminator:(item:string)=>bool

```ts
return item.length === 1 && this.LineTerminatorChars.indexOf(item) >= 0;
```

## field NumberTemplate:NumberTemplate = new NumberTemplate()

## field BasicClassTable:string = ""

## private static field BasicBranchQueueCache:Sequence<BranchTransiter> | null = null

## static method BasicBranchQueue:()=>Sequence<BranchTransiter>

```ts
if (Template.BasicBranchQueueCache === null) {
  Template.BasicBranchQueueCache = new Sequence<BranchTransiter>([
    BasicDispatch.Transit,
  ]);
}
return Template.BasicBranchQueueCache;
```

## method Initialize:(onInitialize:TemplateInitializer)=>Template

```ts
this.BasicClassTable = "";
onInitialize(this);
return this;
```
