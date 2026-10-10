# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**类体里的空成员**：`class C { ; }` 里那个**单独一个 `;`** 在 TS 那边是一个成员节点
（`SemicolonClassElement`），不是「谁的分号」。

```
class C { ; x = 1; ; m() {} }
          ↑            ↑
          SemicolonClassElement
```

**它为什么漏着**：类体的成员位由**语句成形器**管，而 `;` 在成形器那里是**终结符**
（`SymbolTemplate.IsStatementSymbol`）——它给上一条成员收尾、自己不进任何节点；
**上一条成员都没有**时（`{ ;` 开头）它连收尾的对象都没有 ⇒ 只剩一个裸 `SymbolToken`，
投影侧于是多出一个 `SemicolonToken`、少一个 `SemicolonClassElement`。

**只认「宿主是 `ClassBody` 且这一格是裸 `;`」**：
- 字段 / 方法**自己吃掉**的那个分号（`x = 1;` 的 `;`）**不是**这个节点 ——
  它已经被收进成员里了（验收：`class C { x = 1; }` 里 `SemicolonClassElement` 一个都不该有）；
- 语句位上的 `;`（`;;;`）也**不是**——那里宿主不是 `ClassBody`。

规则排在**通用队列**，动作就是把那一格换成一个 `SemicolonClassElement`。

# class SemicolonMemberCloseRule extends CloseRule

它永远不进 `Data`、不进 XML。

## static readonly field Instance:SemicolonMemberCloseRule = new SemicolonMemberCloseRule()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个「类体里的空成员」。

两条：这一格是裸 `;`；它的父亲是 `ClassBody`。

**父亲判据不能省**：`;` 到处都是，只有类体成员位上那一档才是 TS 的成员节点。
父亲此刻一定已经认过（`Token.ApplyCloseRules` 收尾时会补 `null` 的那一格）。

```ts
const current = Get(units, index);
if (!(current instanceof SymbolToken) || current.Is(";") === false) {
  return false;
}
if (current.Parent === null) {
  return false;
}
return current.Parent.constructor.name === "ClassBody";
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把那一格换成一个 `SemicolonClassElement`（内容为空），**返回新的下标**。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("SemicolonMemberCloseRule.Process: current is null");
}
const result = new SemicolonClassElement(current.Template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
result.SignOut(current.SourceRange.End!);
result.TryToClose();
return ReplaceCountAt(units, index, 1, result);
```

# class SemicolonClassElement extends IndependentToken

类体里的空成员（一个单独的 `;`）。类名必须与产物的标签名一致。

**内容为空**（那个 `;` 自己不进去）：TS 那边 `SemicolonClassElement` 是一个**叶子节点**
（`forEachChild` 一个孩子都不给，`;` 只是它的区间）——把 `;` 装进来会多出一个 `SemicolonToken`。

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

```ts
  return ctx.NodeHead("SemicolonClassElement", {}, v);
```


## constructor:(template:Template)=>void

转调基类构造器。

**不挂队列**：内容为空，没有东西要收。

```ts
super(template);
```

## method ToXmlString:()=>string

自己出 XML：**没有子单元**，所以是一个自闭合标签，只带 `range`。

不覆写的话 `Token.ToXmlString` 会展开 `Data`（空的）⇒ 产物里出现一对空标签 ——
那对标签在 XML 上是合法的，但这一格的形状就是「光秃秃一个成员」，自闭合更贴近它。

**`range` 不能省**（第 987 轮）：它是个**叶子成员**，坐标只在它自己的开标签上出现；
省掉这一格，`cases:astjson` 会当场报「JSON 有 `range`、XML 开标签上没有」（实测 3 处）。

```ts
return "<" + this.constructor.name + " range=\"" + this.RangeOf() + "\" />";
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new SemicolonClassElement(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
