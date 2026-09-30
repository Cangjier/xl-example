# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { Identifier } from "./identifier.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

关键字单元：把「在任意上下文都是关键字」的 `Identifier` 提升成一个 `Keyword`。它用得很少——关键字一般要结合具体上下文才算数，只有全上下文成立的关键字才值得单独成 unit。

`KeywordReorganization` 写在 `Keyword` **之前**，与同目录其它 token 一致。

# class KeywordReorganization extends Reorganization

`Previous` 认的是「内容被 `KeywordTemplate` 判定为关键字的 `Identifier`」。判定发生在字符块上，所以这一步只是**换个身份**：不产生新内容，只把普通字符块升级成关键字单元。

## static readonly field Instance:KeywordReorganization = new KeywordReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处的 `Identifier` 的内容是不是关键字。

判定器取自那个 `Identifier` **自己的**模板，而不是 `Previous` 的入参 `template`。

```ts
const unit = Get(units, index);
return unit instanceof Identifier && unit.Template.KeywordTemplate.IsKeyword(unit.TempToString());
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把这个 `Identifier` 换成一个 `Keyword`，**返回新的下标**。

要点：

- 新单元用的是**被替换单元自己的** `Template`（`commonUnit.Template`），不是 `Process` 的入参 `template`——不要「顺手」改成入参。
- 它的范围直接沿用那个 `Identifier` 的起止。
- 四个参数的 `ReplaceAt` 重载叫 `ReplaceCountAt`，返回的 `index` 就是新下标；被替换掉的 `Identifier` 交给 GC。
- `Get` 的结果直接断言成 `Identifier`。

```ts
const commonUnit = Get(units, index) as Identifier;
const keyword = new Keyword(commonUnit.Template);
keyword.SignIn(commonUnit.SourceRange.Start!);
keyword.SignOut(commonUnit.SourceRange.End!);
keyword.Value = commonUnit.TempToString();
keyword.TryToClose();
return ReplaceCountAt(units, index, 1, keyword);
```

# class Keyword extends IndependentToken
关键字。

单元值类型是单字符的 `string`。

它覆写了 `ToXmlString`，且标签名是**写死的 `Keyword`**（不是运行时类名）——这一点与大多数 token 不同。

## constructor:(template:Template)=>void

转调基类构造器。

```ts
super(template);
```

## field Value:string = ""

关键字文本，从被替换的 `Identifier` 抄过来。

## method ToXmlString:()=>string

产出 XML：`<Keyword>值</Keyword>`。

标签名是字面量，`Value` 直接拼进去，不做转义（连字符块那条路径不同）。

```ts
return `<Keyword>${this.Value}</Keyword>`;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 抄 `Value` → `TryToClose()`。

```ts
const result = new Keyword(this.Template);
result.Sign(this);
result.Value = this.Value;
result.TryToClose();
return result;
```
