# dependencies
```xl
import { CommonUtil } from "../common-util.xl.md"
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
import { Template } from "./templates/template.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

块 token：把连续的同类字符吞进 `Temp`，最后整块吐成一个 XML 文本节点。标识符、数字、符号都是它——`<Identifier>abc</Identifier>` 就是这么来的。

# class BlockToken extends Token

块数据。

## field Temp:Array<string> = []

本块累积的字符。

## field TempCache:string | undefined = undefined

**`TempToString()` 上一次的答案**（第 1203 轮，用户口径 1.2「提升 parse 效率」）：
`undefined` ＝「这一格已经变了、下次要重拼」，字符串（**含空串**）＝「这份字符拼出来就是它」。

**为什么立这一格**：`node --cpu-prof` 量 `node_modules/typescript/lib/typescript.d.ts`
（588 KB）一份，`TempToString` 的 self time 是**解析期第一名**（10.6%，723 / 6823 个采样，
`tmp/r1203-prof2`）——而它每次调用都是一趟 `Temp.join("")`。
本块的 `Temp` **只在解析期长**（`AppendAndSignOut` / `AppendValueAndSignOut` 各追加一格字符），
可它被读的次数远多于写的次数：闭规则那一趟里每条规则、每一格都要问一次文本
（`OperatorText` / `Is` / `IsAny` / `IsOperator` / `IsValuePositionOperator` …），
而**关闭之后的块是不变的**——那一段里每一次 `join` 拼出来的都是同一份字符。

**「含空串」这一条是判据的一半**：空块的答案就是 `""`，若拿 `undefined` 兼作「空」，
空块每次都要重拼（实测注释与空块不少）；所以「是不是空」由**这一格自己**答（`!== undefined`），
`=== ""` 与 `!== undefined` 各管各的。

**失效只有一个入口**：`TempCache = undefined` 由 `TempChanged()` 这一格负责，
凡是写 `Temp` 的地方**都要先叫它**——本页的 `AppendAndSignOut` / `AppendValueAndSignOut` / `Undo`
三处，以及页外的两处（`const-string.xl.md` 的缩进裁剪、`compound-assignment-operator.xl.md`
的复合赋值切开）。**这是这一格唯一的风险面**：漏叫一处，读到的就是上一次的旧文本。
实测覆盖的办法是**语料对拍**（1640 份用例的产物 XML 与投影 JSON 逐字节比，见第 1203 轮的 A/B）。

## constructor:(template:Template)=>void

以模板创建。块 token 自己只多一个 `Temp`，构造器里没有额外动作。

```ts
super(template);
```

## method TempChanged:()=>void

**本块的字符变了**：把记住的那份答案作废。

写 `Temp` 的每一处都要叫它——理由与风险面写在 `TempCache` 那一格上。

```ts
this.TempCache = undefined;
```

## method TempToString:()=>string

把累积的字符拼成字符串。

**拼一次就记住**（第 1203 轮）：`TempCache` 已经有一份答案就直接还它，
否则拼一遍写回去再还。`TempCache` 一旦是字符串就是**确定的答案**
（含空串这一档，见那一格），所以这一格读起来与原来逐字符相同。

```ts
if (this.TempCache !== undefined) {
  return this.TempCache;
}
const text = this.Temp.join("");
this.TempCache = text;
return text;
```

## method AppendAndSignOut:(source:Source)=>BlockToken

先签出到 `source`，再把该字符追加进 `Temp`，返回自身。

**追加之前先作废记住的答案**（`TempChanged`）——这一格是 `Temp` 长得最多的地方。

```ts
this.SignOut(source);
this.Temp.push(source.Value);
this.TempChanged();
return this;
```

## method AppendValueAndSignOut:(value:string, source:Source)=>BlockToken

同上，但追加的是显式给的值而不是 `source.Value`。

两个参数的那个 `AppendAndSignOut` 重载在 ts 里叫 `AppendValueAndSignOut`。

```ts
this.SignOut(source);
this.Temp.push(value);
this.TempChanged();
return this;
```

## method IsAppend:(source:Source)=>bool

当前字符能不能并进本块。

抽象成员，由各 token 实现。

```ts
throw new Error("abstract member: IsAppend");
```

## method Process:(context:SyntaxContext, source:Source)=>void

处理一个字符：有挂载单元就转给它，否则走 `Default`。

块 token 覆写了基类的调度：**不跑跳转队列**，只认挂载单元和自己。

```ts
if (this.MountedUnit !== null) {
  this.MountedUnit.Process(context, source);
  return;
}
this.Default(context, source);
this.LastSource = source;
```

## method Undo:(source:Source)=>void

回退一个字符。

分两种情况：有子单元覆盖该位置就交给它；否则从 `Temp` 弹掉最后一个字符，并在「已经退到最前」或「`Temp` 空了」时把自己从父单元里摘掉，否则把终点退回前一个位置。

```ts
const undoUnit = this.WhichUnitRangeContains(source);
if (undoUnit !== null) {
  undoUnit.Undo(source);
  return;
}
this.Temp.splice(this.Temp.length - 1, 1);
this.TempChanged();
const previous = source.Pre();
if (previous === null) {
  this.Parent!.Data.splice(this.Parent!.Data.indexOf(this), 1);
} else if (this.Temp.length === 0) {
  this.Parent!.Data.splice(this.Parent!.Data.indexOf(this), 1);
} else {
  this.SignOut(previous);
}
```

## method IsUndo:(source:Source)=>bool

块 token 永远可以回退。

```ts
return true;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底直接抛错——块 token 必须靠挂载单元或自己的覆写来消费字符。

```ts
throw new Error("抽象成员未实现");
```

## method SignOut:(source:Source)=>void

签出。

签出覆写了基类：**只设终点，不递归子单元，也不检查是否已设过**。

```ts
this.SourceRange.End = source;
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，开标签上带 `range`，内容是本块累积的字符（先转义）。

标签名取 `this.constructor.name`，内容经 `CommonUtil.XmlDecode` 转义。

**`range` 也要印**（与基类同一口径、同一处取数，见 `Token.RangeOf`）：块是**叶子**，
它的坐标只在这里出现，`Identifier` / `String` / 注释这些单元全都走这一条。

```ts
const name = this.Tag;
return `<${name} range="${this.RangeOf()}">${CommonUtil.XmlDecode(this.TempToString())}</${name}>`;
```

## property value:string

`value` 这一格**由这一页自己声明**（第 1018 轮）：投影读的就是这一页自己的这一格。

**同一趟拼写走 `TempToString()`**（第 1203 轮）：这一格与 `ToXmlString` 原来各写一遍
`this.Temp.join("")`，而「本块的文本是什么」只有 `TempToString` 那一处答案
（它现在还带记忆）——三处各拼一遍就是三份拼法。

### get

```ts
return this.TempToString();
```

