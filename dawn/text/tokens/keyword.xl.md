# dependencies
```xl
import { IOwner } from "../../../owners/i-owner.xl.md"
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { Common } from "./common.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

关键字单元：把「在任意上下文都是关键字」的 `Common` 提升成一个 `Keyword`。原 C# 的类注释就点明了它的稀用——关键字一般要结合具体上下文才算数，只有全上下文成立的关键字才值得单独成 unit。

按 M33，展平的嵌套类 `KeywordReorganization` 写在 `Keyword` **之前**，与同目录其它 token 一致。

# class KeywordReorganization extends Reorganization

原 C# 是嵌套类 `Keyword.Reorganization`（M32 展平改名）。

`Previous` 认的是「内容被 `KeywordTemplate` 判定为关键字的 `Common`」。判定发生在字符块上，所以这一步只是**换个身份**：不产生新内容，只把普通字符块升级成关键字单元。

## static readonly field Instance:KeywordReorganization = new KeywordReorganization()

唯一的实例。原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`——这里的 `Reorganization` 指的是嵌套的那个类本身，按 M19 落成静态只读字段。

## method Previous:(owner:IOwner, template:Template, units:Array<Token>, index:int)=>bool

`index` 处的 `Common` 的内容是不是关键字。

原 C# 是一句 `unit is Common common && common.Template.KeywordTemplate.IsKeyword(common.TempToString())`；判定器取自那个 `Common` **自己的**模板，而不是 `Previous` 的入参 `template`。

```ts
const unit = Get(units, index);
return unit instanceof Common && unit.Template.KeywordTemplate.IsKeyword(unit.TempToString());
```

## method Process:(owner:IOwner, template:Template, units:Array<Token>, index:int)=>int

把这个 `Common` 换成一个 `Keyword`，**返回新的下标**。

原 C# 是 `void Process(…, ref int index)`，按 M15 改成返回值。要点：

- 新单元用的是**被替换单元自己的** `Owner` 与 `Template`（`commonUnit.Owner` / `commonUnit.Template`），不是 `Process` 的入参 `owner` / `template`——照抄，不要「顺手」改成入参。
- 它的范围直接沿用那个 `Common` 的起止。
- `units.ReplaceAt(index, 1, keyword)` 是 4 参重载，按 M14(c) 落在 `ReplaceCountAt` 上，返回的 `index` 就是新下标；被替换掉的 `Common` 随后 `Release()`。
- 原 C# 写 `(units.Get(index) as Common)!`：`as` 加空断言，ts 侧落成 `as Common`。

```ts
const commonUnit = Get(units, index) as Common;
const keyword = new Keyword(commonUnit.Owner, commonUnit.Template);
keyword.SignIn(commonUnit.SourceRange.Start!);
keyword.SignOut(commonUnit.SourceRange.End!);
keyword.Value = commonUnit.TempToString();
keyword.TryToClose();
commonUnit.Release();
return ReplaceCountAt(units, index, 1, keyword);
```

# class Keyword extends IndependentToken
关键字。

原 C# 侧是 `public class Keyword : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它覆写了 `ToXmlString`，且标签名是**写死的 `Keyword`**（不是 `GetType().Name`）——这一点与大多数 token 不同，照抄。

## constructor:(owner:IOwner, template:Template)=>void

原 C# 只是转调基类构造器。

```ts
super(owner, template);
```

## field Value:string = ""

关键字文本，从被替换的 `Common` 抄过来。

原 C# 是 `public string Value { get; set; } = string.Empty;`。

## method ToXmlString:()=>string

产出 XML：`<Keyword>值</Keyword>`。

原 C# 是 `$"<Keyword>{Value}</Keyword>"`——标签名是字面量，`Value` 直接拼进去，不做转义（连字符块那条路径不同）。

```ts
return `<Keyword>${this.Value}</Keyword>`;
```

## method ToDictionary:()=>Map<string, any>

转成字典：只记类型名与值，**没有** `children`。

原 C# 覆写了基类版本，返回 `{ ["type"] = GetType().Name, ["value"] = Value }`；`GetType().Name` 按 M17 写成 `this.constructor.name`。

```ts
const result = new Map<string, any>();
result.set("type", this.constructor.name);
result.set("value", this.Value);
return result;
```

## method Clone:()=>Token

克隆自身。

原 C# 的顺序是 `Sign(this)` → 抄 `Value` → `TryToClose()`。

```ts
const result = new Keyword(this.Owner, this.Template);
result.Sign(this);
result.Value = this.Value;
result.TryToClose();
return result;
```
