# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
import { Branch } from "../../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../../core/syntax/branch-condition-result.xl.md"
import { GuideToken } from "../../../../core/syntax/guide-token.xl.md"
import { ReloadMessage } from "../../../../core/syntax/messages/reload-message.xl.md"
import { Source } from "../../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { String } from "./string.xl.md"
```

# namespace cangjie

`Dawn/Text/Tokens/String`：字符串词法——引号向导、字符串单元与常量文本块，把 `"…"` / `'…'` / `@"…"` / `$"{…}"` / `"""…"""` 啃成 `<String …><ConstString>…</ConstString></String>`。

引号向导：只看**开引号**那一个字符。它先向前回看有没有 `$`（内插）或 `@`（逐字）前缀，把它们退回去并记在自己身上；再看紧跟着的第二、第三个引号，据此判定这是空串、普通串还是原始字符串，然后把自己**替换**成一个真正的 `String` 单元。

按 M33，展平出来的嵌套类 `StringGuide.Branch` 写在 `StringGuide` **之前**——`StringGuide` 的静态字段 `JumpIn` 在类定义时立即 `new StringGuideBranch()`，写反了会命中 ts 的暂时性死区（TDZ）。

# class StringGuideBranch extends Branch

原 C# 是嵌套类 `StringGuide.Branch`（M32 展平改名）。

它永远不进 `Data`、不进 XML，所以 ts 类名与 C# 的 `Type.Name` 不一致无害（M32）。但**成员名不能改**：`TSScriptEngine.InitialTemplate` 通过 `template.BranchTemplate.AddModifyItem(typeof(StringGuide.Branch), …)` 拿到这个分支实例，再调 `AddStringChar` 两次，分别传入反引号与单引号，给 ts 语言补上这两种字符串起点——那是模板层的就地修改器（`SequenceTemplate.ModifyItem`），所以 `AddStringChar` 这个名字必须一字不差。

## field StringChars:Array<string> = ['"']

本分支认哪些字符是**字符串起点**。原 C# 是 `public List<char> StringChars = ['\"'];`——初始只有双引号，反引号与单引号由 `TSScriptEngine.InitialTemplate` 在运行时补进来。

## method AddStringChar:(item:string)=>void

把一个字符加进起点集合；已经有了就不重复加。

原 C# 是 `public void AddStringChar(char item)`，用 `StringChars.Contains(item)` 判重、`StringChars.Add(item)` 添加。

```ts
if (!this.StringChars.includes(item)) {
  this.StringChars.push(item);
}
```

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

当前字符是不是字符串起点。

原 C# 直接 `return StringChars.Contains(source.Value);`——靠 `bool` 到 `BranchConditionResult` 的**隐式转换**；按 M19 用 `FromBool` 工厂，`Message` 保持 `0`。

```ts
return BranchConditionResult.FromBool(this.StringChars.includes(source.Value));
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

认下这个引号：新建一个 `StringGuide`，向前回看前缀，再把它挂到 `unit` 上。

回看循环照抄原实现：从当前字符往前一个位置起，只要还是 `$` 或 `@` 就记进 `undoSources` 继续往前走，遇到别的字符就停。随后**逆序处理**记下来的每个前缀：`@` 置 `IsSupportVerbatim`，`$` 置 `IsSupportInterpolation` 并把 `InterpolationCount` 加一；无论哪种都调 `unit.Undo(i)` 把那个字符从 `unit` 上退掉（引号前的前缀不属于任何单元）。

注意 C# 的 `last!.Value.Pre()` 里 `.Value` 是**可空结构体的 `.Value`**，取出来的是前一个 `Source` 本身、不是字符，所以 ts 侧写成 `last!.Pre()`；ts 的 `Source` 是可空引用，`last is { Value: '$' }` 这种模式匹配等价于 `last !== null && last.Value === "$"`。

```ts
const item = new StringGuide(unit.Owner, unit.Template, source.Value);
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
unit.AddToMounted(item).SignIn(source);
```

# class StringGuide extends GuideToken

复杂字符串的引号向导。

原 C# 侧是 `public class StringGuide : GuideToken<char>`。按 M31，`char` 在规范里写 `string`（单字符）。

原 C# 的类注释列出它要盖住的四种字符串：常规 `""`、无转义 `@"D:\1"`、内嵌表达式 `$"{a}"`、原始文本 `""" a """`。它自己**不持有字符**，只判断这是哪种串，然后把自己换成一个配置好的 `String`。

## static readonly field JumpIn:StringGuideBranch = new StringGuideBranch()

把 `StringGuideBranch` 注册进 `Root` 的通用跳转队列用的实例。

原 C# 是静态属性 `public static Branch JumpIn => new();`——这里的 `Branch` 指的是嵌套的那个 `Branch` 类。按「静态属性 `X => new T()` → 静态只读字段」的等价写法落成共享实例；调用点形态不变（`Root.GeneralQueue` 只把它塞进序列一次），所以每次新建与共享一份在行为上等价。

## field IsSupportInterpolation:bool = false

是否支持内插字符串——由前缀 `$` 的个数决定（每个 `$` 都让 `InterpolationCount` 加一）。

## field InterpolationCount:int = 0

内插前缀 `$` 的个数。它与内插串里 `{` 的数量一致，最终会写进 `String` 的 XML 标签。

## field IsSupportVerbatim:bool = false

是否支持逐字字符串——由前缀 `@` 决定。

## private field QuoteCount:int = 1

已经吃到了几个连续引号。`1` 是刚吃到开引号；`2` 说明可能是空串、也可能在往原始字符串走；`3` 以上基本确定是原始字符串。

## field StringChar:string = ""

本次识别的字符串用的引号字符（双引号、单引号或反引号）。

原 C# 是只读属性 `public char StringChar { get; }`，只在构造器里赋值一次；ts 侧按字段表达，构造器里写一次即可。

## constructor:(owner:IOwner, template:Template, stringChar:string)=>void

以负责人、模板与引号字符创建。

原 C# 只是转调基类构造器并记下 `stringChar`。

```ts
super(owner, template);
this.StringChar = stringChar;
```

## protected method Navigate:(context:SyntaxContext, source:Source)=>void

引到目标：按已经吃到的引号个数决定这是哪种字符串，然后把自己替换成对应的 `String`。

原 C# 是 `protected override void Navigate(SyntaxContext<char> context, in Source<char> source)`，三条分支：

1. `QuoteCount == 1`——当前字符又是引号就只把计数加到 `2`（可能是空串、全量串或 `@` 下的转义双引号）；否则说明是单引号串（`"x"`），就地换成一个 `IsSupportRaw = false`、`RawQuoteCount = 1` 的 `String`，并以**前一个位置**签入，最后插一条 `ReloadMessage` 让它把当前字符重新处理一遍。
2. `QuoteCount == 2`——当前字符又是引号时计数加到 `3`：若 `IsSupportVerbatim`，这就是逐字串里表达一个双引号的三引号，替换成 `String` 后用「前前一个位置」签入，并**插两条** `ReloadMessage`（分别重处理前一个位置与当前位置）；不逐字则什么都不做，继续往原始字符串走。当前字符不是引号时就是空串 `""`：替换成 `String` 后从前前一个位置签入、从前一个位置签出，把 `Parent!.MountedUnit` 清空，再插一条 `ReloadMessage`。
3. 其余（`QuoteCount >= 3`）——当前字符又是引号就继续加计数；否则确定为原始字符串，替换成 `IsSupportRaw = true`、`RawQuoteCount = QuoteCount` 的 `String`，以 `SourceRange.Start` 签入，再插一条 `ReloadMessage`。

C# 里 `new String(...) { … }` 是对象初始化器，ts 没有这个语法，所以每个分支先建实例再逐个赋属性，赋的值与顺序照抄。另有两处 C# 惯用写法要按语义改写：`source.Pre()!.Value`（可空结构体解包）在 ts 里是 `source.Pre()!`，`SourceRange.Start!.Value` 是 `this.SourceRange.Start!`。三参构造器 `new ReloadMessage<char>(Owner, this, source)` 按 M14(b) 走静态工厂 `ReloadMessage.WithoutProcessOwner`。

```ts
const value = source.Value;
if (this.QuoteCount === 1) {
  if (value === this.StringChar) {
    this.QuoteCount++;
  } else {
    const item = new String(this.Owner, this.Template, this.StringChar);
    item.IsSupportInterpolation = this.IsSupportInterpolation;
    item.IsSupportRaw = false;
    item.IsSupportVerbatim = this.IsSupportVerbatim;
    item.InterpolationCount = this.InterpolationCount;
    item.RawQuoteCount = 1;
    this.Replace(item).SignIn(source.Pre()!);
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this.Owner, this, source));
  }
} else if (this.QuoteCount === 2) {
  if (value === this.StringChar) {
    this.QuoteCount++;
    if (this.IsSupportVerbatim) {
      const item = new String(this.Owner, this.Template, this.StringChar);
      item.IsSupportInterpolation = this.IsSupportInterpolation;
      item.IsSupportRaw = false;
      item.IsSupportVerbatim = this.IsSupportVerbatim;
      item.InterpolationCount = this.InterpolationCount;
      item.RawQuoteCount = 1;
      this.Replace(item).SignIn(source.Pre()!.Pre()!);
      context.Messages.push(ReloadMessage.WithoutProcessOwner(this.Owner, this, source.Pre()!));
      context.Messages.push(ReloadMessage.WithoutProcessOwner(this.Owner, this, source));
    }
  } else {
    const item = new String(this.Owner, this.Template, this.StringChar);
    item.IsSupportInterpolation = this.IsSupportInterpolation;
    item.IsSupportRaw = false;
    item.IsSupportVerbatim = this.IsSupportVerbatim;
    item.InterpolationCount = this.InterpolationCount;
    item.RawQuoteCount = 1;
    this.Replace(item).SignIn(source.Pre()!.Pre()!).SignOut(source.Pre()!);
    this.Parent!.MountedUnit = null;
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this.Owner, this, source));
  }
} else {
  if (value === this.StringChar) {
    this.QuoteCount++;
  } else {
    const item = new String(this.Owner, this.Template, this.StringChar);
    item.IsSupportInterpolation = this.IsSupportInterpolation;
    item.IsSupportRaw = true;
    item.IsSupportVerbatim = this.IsSupportVerbatim;
    item.InterpolationCount = this.InterpolationCount;
    item.RawQuoteCount = this.QuoteCount;
    this.Replace(item).SignIn(this.SourceRange.Start!);
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this.Owner, this, source));
  }
}
```

## protected method Close:()=>void

关闭向导：只有在恰好吃到两个引号（`QuoteCount == 2`）时才收尾——那是源码末尾就断掉的 `""`，替换成一个空 `String` 并从自己的起止位置签入签出；其余情况交回基类。

原 C# 是 `protected override void Close()`，末尾调 `base.Close()`（把自己标记为已关闭）。

```ts
if (this.QuoteCount === 2) {
  const item = new String(this.Owner, this.Template, this.StringChar);
  item.IsSupportInterpolation = this.IsSupportInterpolation;
  item.IsSupportRaw = false;
  item.IsSupportVerbatim = this.IsSupportVerbatim;
  item.InterpolationCount = this.InterpolationCount;
  item.RawQuoteCount = 1;
  this.Replace(item).SignIn(this.SourceRange.Start!).SignOut(this.SourceRange.End!);
}
super.Close();
```

## method Clone:()=>Token

克隆自身——原 C# 直接 `throw new NotImplementedException();`，即**没有实现**。

原 C# 签名是 `public override Token<char> Clone()`。ts 侧保留同样的「调用即抛」，按项目的写法抛 `Error("NotImplementedException")`。

```ts
throw new Error("NotImplementedException");
```
