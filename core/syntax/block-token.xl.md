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

## constructor:(template:Template)=>void

以模板创建。块 token 自己只多一个 `Temp`，构造器里没有额外动作。

```ts
super(template);
```

## method TempToString:()=>string

把累积的字符拼成字符串。

拼接直接用数组自带的 `join`。

```ts
return this.Temp.join("");
```

## method AppendAndSignOut:(source:Source)=>BlockToken

先签出到 `source`，再把该字符追加进 `Temp`，返回自身。

```ts
this.SignOut(source);
this.Temp.push(source.Value);
return this;
```

## method AppendValueAndSignOut:(value:string, source:Source)=>BlockToken

同上，但追加的是显式给的值而不是 `source.Value`。

两个参数的那个 `AppendAndSignOut` 重载在 ts 里叫 `AppendValueAndSignOut`。

```ts
this.SignOut(source);
this.Temp.push(value);
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

产出 XML：标签名是运行时类型名，内容是本块累积的字符（先转义）。

标签名取 `this.constructor.name`，内容经 `CommonUtil.XmlDecode` 转义。

```ts
const name = this.constructor.name;
return `<${name}>${CommonUtil.XmlDecode(this.Temp.join(""))}</${name}>`;
```
