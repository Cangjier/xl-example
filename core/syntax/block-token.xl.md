# dependencies
```xl
import { CommonUtil } from "../common-util.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
import { Template } from "./templates/template.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

块 token：把连续的同类字符吞进 `Temp`，最后整块吐成一个 XML 文本节点。标识符、数字、符号都是它——`<Common>abc</Common>` 就是这么来的。

块 token 自己**永远只吃当前这一个字符**：`Default`（或子类的覆写）把它并进 `Temp`，然后由调度层统一把 `context.Index` 推进一格。

# class BlockToken extends Token

块数据。

## field Temp:string = ""

本块累积的字符。直接就是一个字符串（追加用 `+=`），不再维护字符数组 + `join`。

## field HasBackslash:bool = false

本块的 `Temp` 里是否出现过 `\`。

只给 `Common` 的 `\u{…}` 判定做快速短路用：没有 `\` 的 token 不可能处于花括号转义里，
`UnicodeBraceEscapeDigits` / `UnicodeBraceEscapeValue` 可以直接返回 `-1`，不必每字符扫一遍 `Temp`。

单调置 `true`、`Undo` 不回滚：多记一次只会让那个 token 回落到原来的慢路径，不影响正确性。

## constructor:(template:Template)=>void

以模板创建。块 token 自己只多一个 `Temp`，构造器里没有额外动作。

```ts
super(template);
```

## method TempToString:()=>string

把累积的字符取成字符串。

`Temp` 本身就是字符串，直接返回即可，没有数组拼接成本。

```ts
return this.Temp;
```

## method AppendAndSignOut:(value:string, index:int)=>BlockToken

先签出到 `index + 1`（半开终点），再把 `value` 追加进 `Temp`，返回自身。

```ts
this.SignOut(index + 1);
this.Temp += value;
if (value.indexOf("\\") >= 0) {
  this.HasBackslash = true;
}
return this;
```

## method AppendValueAndSignOut:(value:string, index:int)=>BlockToken

同上，但追加的是显式给的值。

```ts
this.SignOut(index + 1);
this.Temp += value;
if (value.indexOf("\\") >= 0) {
  this.HasBackslash = true;
}
return this;
```

## method IsAppend:(buffer:SourceRange, index:int)=>bool

当前字符能不能并进本块。

抽象成员，由各 token 实现。

```ts
throw new Error("abstract member: IsAppend");
```

## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

处理窗口里 `index` 处的一个字符：有挂载单元就整个转给它，否则走 `Default`。

块 token 覆写了基类的调度：**不跑跳转队列**，只认挂载单元和自己。

子单元消费了就算有进展并记下 `LastIndex`；自己走 `Default` 之后若 `context.Index` 还没动，就统一补 `+1`（块 token 默认消费当前字符）。**无进展即阻塞返回**。

```ts
if (this.MountedUnit !== null) {
  this.MountedUnit.Process(context, buffer, index);
  if (context.Index > index) {
    this.LastIndex = index;
  }
  return;
}
this.Default(context, buffer, index);
if (context.Index === index) {
  context.Index = index + 1;
}
this.LastIndex = index;
```

## method Undo:(index:int)=>void

回退 `index` 位置之前刚消费的那个字符。

分两种情况：有子单元覆盖该位置就交给它；否则从 `Temp` 弹掉最后一个字符。弹完 `Temp` 空了、或者已经退到范围起点（`index <= StartIndex`），就把自己从父单元里摘掉；否则把开区间终点退到 `index`。

```ts
const undoUnit = this.WhichUnitRangeContains(index);
if (undoUnit !== null) {
  undoUnit.Undo(index);
  return;
}
this.Temp = this.Temp.substring(0, this.Temp.length - 1);
if (this.Temp.length === 0 || index <= this.SourceRange.Start) {
  this.Parent!.Data.splice(this.Parent!.Data.indexOf(this), 1);
} else {
  this.SignOut(index);
}
```

## method IsUndo:(index:int)=>bool

块 token 永远可以回退。

```ts
return true;
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

兜底直接抛错——块 token 必须靠挂载单元或自己的覆写来消费字符。

```ts
throw new Error("抽象成员未实现");
```

## method SignOut:(endIndex:int)=>void

签出。

签出覆写了基类：**只设终点，不递归子单元，也不检查是否已设过**。

块 token 可能只被「签出」而没有经过 `SignIn`（合成 token、纯追加场景），所以文档兜底在这里也要补一次：
范围没有文档时取 `SourceRange.CurrentDocument`。只在不覆盖已有值时补。

```ts
if (this.SourceRange.Document === null) {
  this.SourceRange.Document = SourceRange.CurrentDocument;
}
this.SourceRange.End = endIndex;
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，内容是本块累积的字符（先转义）。

标签名取 `this.constructor.name`，内容经 `CommonUtil.XmlDecode` 转义。

```ts
const name = this.constructor.name;
return `<${name}>${CommonUtil.XmlDecode(this.Temp)}</${name}>`;
```
