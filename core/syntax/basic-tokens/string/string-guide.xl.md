# dependencies
```xl
import { Branch } from "../../branch.xl.md"
import { BranchStates } from "../../branch-states.xl.md"
import { CloseStates } from "../../close-states.xl.md"
import { GuideToken } from "../../guide-token.xl.md"
import { ReloadMessage } from "../../messages/reload-message.xl.md"
import { Source } from "../../source.xl.md"
import { SyntaxContext } from "../../syntax-context.xl.md"
import { Token } from "../../token.xl.md"
import { Template } from "../../templates/template.xl.md"
import { String } from "./string.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

字符串词法——引号向导、字符串单元与常量文本块，把 `"…"` / `'…'` / `@"…"` / `$"{…}"` / `"""…"""` 啃成 `<String …><ConstString>…</ConstString></String>`。

引号向导：只看**开引号**那一个字符。它先向前回看有没有 `$`（内插）或 `@`（逐字）前缀，把它们退回去并记在自己身上；再看紧跟着的第二、第三个引号，据此判定这是空串、普通串还是原始字符串，然后把自己**替换**成一个真正的 `String` 单元。

# class StringGuideBranch extends Branch

它永远不进 `Data`、不进 XML。模板层拿到这个分支实例后调 `AddStringChar` 两次，分别传入反引号与单引号，补上这两种字符串起点。

## field StringChars:Array<string> = ['"']

本分支认哪些字符是字符串起点。初始只有双引号，反引号与单引号由模板层在运行时补进来。

## method AddStringChar:(item:string)=>void

把一个字符加进起点集合；已经有了就不重复加。

```ts
if (!this.StringChars.includes(item)) {
  this.StringChars.push(item);
}
```

## method Transit:(context:SyntaxContext, unit:Token, source:Source)=>BranchStates

当前字符是字符串起点就认下：新建一个 `StringGuide`，向前回看前缀，再把它挂到 `unit` 上；挂的时候若关闭上一个 token 建出了形状，返回 `Reload`。

回看循环：从当前字符往前一个位置起，只要还是 `$` 或 `@` 就记进 `undoSources` 继续往前走，遇到别的字符就停。随后逆序处理记下来的每个前缀：`@` 置 `IsSupportVerbatim`，`$` 置 `IsSupportInterpolation` 并把 `InterpolationCount` 加一；无论哪种都调 `unit.Undo(i)` 把那个字符从 `unit` 上退掉。

```ts
if (!this.StringChars.includes(source.Value)) {
  return BranchStates.Undo;
}
const item = new StringGuide(unit.Template, source.Value);
const undoSources: Source[] = [];
let last: Source | null = source;
while (true) {
  last = last!.Pre();
  if (last !== null && (last.Value === "$" || last.Value === "@")) {
    undoSources.push(last);
  } else {
    break;
  }
}
for (const i of undoSources) {
  if (i.Value === "@") {
    item.IsSupportVerbatim = true;
  } else if (i.Value === "$") {
    item.IsSupportInterpolation = true;
    item.InterpolationCount++;
  }
  unit.Undo(i);
}
if (unit.AddToMounted(item) === CloseStates.Built) {
  return BranchStates.Reload;
}
(unit.MountedUnit as StringGuide)!.SignIn(source);
return BranchStates.Done;
```

# class StringGuide extends GuideToken

复杂字符串的引号向导。

它要盖住四种字符串：常规 `""`、无转义 `@"D:\1"`、内嵌表达式 `$"{a}"`、原始文本 `""" a """`。它自己**不持有字符**，只判断这是哪种串，然后把自己换成一个配置好的 `String`。

## static readonly field JumpIn:StringGuideBranch = new StringGuideBranch()

把 `StringGuideBranch` 注册进 `Root` 的通用跳转队列用的实例。

## field IsSupportInterpolation:bool = false

是否支持内插字符串——由前缀 `$` 的个数决定（每个 `$` 都让 `InterpolationCount` 加一）。

## field InterpolationCount:int = 0

内插前缀 `$` 的个数。它与内插串里 `{` 的数量一致，最终会写进 `String` 的 XML 标签。

## field IsSupportVerbatim:bool = false

是否支持逐字字符串——由前缀 `@` 决定。

## private field QuoteCount:int = 1

已经吃到了几个连续引号。`1` 是刚吃到开引号；`2` 说明可能是空串、也可能在往原始字符串走；`3` 以上基本确定是原始字符串。

## field StringChar:string = ""

本次识别的字符串用的引号字符（双引号、单引号或反引号），只在构造器里赋值一次。

## constructor:(template:Template, stringChar:string)=>void

以模板与引号字符创建。

构造器只是转调基类并记下 `stringChar`。

```ts
super(template);
this.StringChar = stringChar;
```

## protected method Navigate:(context:SyntaxContext, source:Source)=>void

引到目标：按已经吃到的引号个数决定这是哪种字符串，然后把自己替换成对应的 `String`。三条分支：

1. `QuoteCount == 1`——当前字符又是引号就只把计数加到 `2`（可能是空串、全量串或 `@` 下的转义双引号）；否则说明是单引号串（`"x"`），就地换成一个 `IsSupportRaw = false`、`RawQuoteCount = 1` 的 `String`，并以**前一个位置**签入，最后插一条 `ReloadMessage` 让它把当前字符重新处理一遍。
2. `QuoteCount == 2`——当前字符又是引号时计数加到 `3`：若 `IsSupportVerbatim`，这就是逐字串里表达一个双引号的三引号，替换成 `String` 后用「前前一个位置」签入，并**插两条** `ReloadMessage`（分别重处理前一个位置与当前位置）；不逐字则什么都不做，继续往原始字符串走。当前字符不是引号时就是空串 `""`：替换成 `String` 后从前前一个位置签入、从前一个位置签出，把 `Parent!.MountedUnit` 清空，再插一条 `ReloadMessage`。
3. 其余（`QuoteCount >= 3`）——当前字符又是引号就继续加计数；否则确定为原始字符串，替换成 `IsSupportRaw = true`、`RawQuoteCount = QuoteCount` 的 `String`，以 `SourceRange.Start` 签入，再插一条 `ReloadMessage`。

```ts
const value = source.Value;
if (this.QuoteCount === 1) {
  if (value === this.StringChar) {
    this.QuoteCount++;
  } else {
    const item = new String(this.Template, this.StringChar);
    item.IsSupportInterpolation = this.IsSupportInterpolation;
    item.IsSupportRaw = false;
    item.IsSupportVerbatim = this.IsSupportVerbatim;
    item.InterpolationCount = this.InterpolationCount;
    item.RawQuoteCount = 1;
    this.Replace(item).SignIn(source.Pre()!);
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
  }
} else if (this.QuoteCount === 2) {
  if (value === this.StringChar) {
    this.QuoteCount++;
    if (this.IsSupportVerbatim) {
      const item = new String(this.Template, this.StringChar);
      item.IsSupportInterpolation = this.IsSupportInterpolation;
      item.IsSupportRaw = false;
      item.IsSupportVerbatim = this.IsSupportVerbatim;
      item.InterpolationCount = this.InterpolationCount;
      item.RawQuoteCount = 1;
      this.Replace(item).SignIn(source.Pre()!.Pre()!);
      context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source.Pre()!));
      context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
    }
  } else {
    const item = new String(this.Template, this.StringChar);
    item.IsSupportInterpolation = this.IsSupportInterpolation;
    item.IsSupportRaw = false;
    item.IsSupportVerbatim = this.IsSupportVerbatim;
    item.InterpolationCount = this.InterpolationCount;
    item.RawQuoteCount = 1;
    this.Replace(item).SignIn(source.Pre()!.Pre()!).SignOut(source.Pre()!);
    this.Parent!.MountedUnit = null;
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
  }
} else {
  if (value === this.StringChar) {
    this.QuoteCount++;
  } else {
    const item = new String(this.Template, this.StringChar);
    item.IsSupportInterpolation = this.IsSupportInterpolation;
    item.IsSupportRaw = true;
    item.IsSupportVerbatim = this.IsSupportVerbatim;
    item.InterpolationCount = this.InterpolationCount;
    item.RawQuoteCount = this.QuoteCount;
    this.Replace(item).SignIn(this.SourceRange.Start!);
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
  }
}
```

## protected method Close:()=>CloseStates

关闭向导：只有在恰好吃到两个引号（`QuoteCount == 2`）时才收尾——那是源码末尾就断掉的 `""`，替换成一个空 `String` 并从自己的起止位置签入签出；其余情况交回基类（把自己标记为已关闭）。

返回值也交回基类：向导不参与形状建造，恒为 `Nothing`。

```ts
if (this.QuoteCount === 2) {
  const item = new String(this.Template, this.StringChar);
  item.IsSupportInterpolation = this.IsSupportInterpolation;
  item.IsSupportRaw = false;
  item.IsSupportVerbatim = this.IsSupportVerbatim;
  item.InterpolationCount = this.InterpolationCount;
  item.RawQuoteCount = 1;
  this.Replace(item).SignIn(this.SourceRange.Start!).SignOut(this.SourceRange.End!);
}
return super.Close();
```

## method Clone:()=>Token

克隆自身——**没有实现**，调用即抛 `Error("抽象成员未实现")`。

```ts
throw new Error("抽象成员未实现");
```
