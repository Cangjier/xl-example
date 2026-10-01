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

**`as const` 是唯一的例外**（第 62 轮补）：`const` 在 `KeywordTemplate` 里是关键词，
可它在 `as const` 里是 TypeScript 的**字面量类型标记**，不该升级——升了之后
`x as const satisfies B` 的用例当场从通过变失败（`as` 节点挂类型队列，
关键词升级就在那一趟里跑，所以要在这儿挡住；判定用类名，避免绕出环）。

```ts
const unit = Get(units, index);
if (unit instanceof Identifier && unit.Parent !== null && unit.Parent.constructor.name === "As" && unit.Is("const")) {
  return false;
}
return unit instanceof Identifier && unit.Template.KeywordTemplate.IsKeyword(unit.TempToString());
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把这个 `Identifier` 换成一个 `Keyword`，**返回新的下标**。

要点：

- 新单元用的是**被替换单元自己的** `Template`（`commonUnit.Template`），不是 `Process` 的入参 `template`——不要「顺手」改成入参。
- 它的范围直接沿用那个 `Identifier` 的起止。
- **`Parent` 要自己抄**（第 66 轮补）：`ReplaceCountAt` 只做 `splice`，**不设 `Parent`**（`Token.Add` 才设），
  所以不抄的话这个 `Keyword` 的 `Parent` 永远是 `null`。别的规则大多只读自己的 `Data`，
  这条一直是隐性的；类型层那两条规则（`type-operator.xl.md` / `type-bracket.xl.md`）**要看父亲是哪一类容器**，
  于是当场暴露：`type A = keyof typeof h` 里外层 `keyof` 被问到时 `Parent` 是 `null`、
  `IsTypeContainerUnit` 给否，**两层只成了一层**（实测产物是 `<Keyword>keyof</Keyword><TypeQuery>…`）。
  抄的是被替换单元的 `Parent`，所以「还没挂上去（`Parent === null`）」这个信号原样保留——
  `unary-operator.xl.md` 的第 57 轮判据（`Parent === null` 的 `typeof` 不折一元运算）不受影响。
- 四个参数的 `ReplaceAt` 重载叫 `ReplaceCountAt`，返回的 `index` 就是新下标；被替换掉的 `Identifier` 交给 GC。
- `Get` 的结果直接断言成 `Identifier`。

```ts
const commonUnit = Get(units, index) as Identifier;
const keyword = new Keyword(commonUnit.Template);
keyword.Parent = commonUnit.Parent;
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
