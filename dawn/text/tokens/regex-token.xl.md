# dependencies
```xl
import { IOwner } from "../../../owners/i-owner.xl.md"
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../core/syntax/branch-condition-result.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { ReloadMessage } from "../../../core/syntax/messages/reload-message.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Common } from "./common.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

正则字面量 `/pattern/flags`：前一个 `/` 已经作为符号落在树上时，从第二个 `/` 开始把整段正则收成一个单元——正文进 `Temp`，结尾的 `m` / `g` / `i` / `s` / `u` / `y` 进 `Flags`。

**本类不碰 `System.Text.RegularExpressions`**：它只负责把 `/…/flags` 这段文本攒下来，真正的编译发生在执行层 `Dawn/Steper/RegexStep.cs`（`RegexPool` 缓存 + `RegexOptions` 映射），按 §3.9 执行层不在移植范围内。ts 侧的等价物是原生 `RegExp`：`RegexStep` 里 `RegexOptions.IgnoreCase` / `Multiline` / `Singleline` 对应 `new RegExp(value, flags)` 的 `i` / `m` / `s`；`g` / `u` / `y` 在 C# 侧被显式忽略，而 ts 的 `RegExp` 认这三个标志——将来移植 `RegexStep` 时要决定是保留还是剥掉它们。本文件只需要保证 `Temp` 与 `Flags` 逐字正确。

按 M33，展平出来的嵌套类 `RegexToken.Branch` 写在 `RegexToken` **之前**——外层类的静态字段 `JumpIn` 在类定义时立即 `new RegexTokenBranch()`，写反了会命中 ts 的暂时性死区（TDZ）。

# class RegexTokenBranch extends Branch

原 C# 是嵌套类 `RegexToken.Branch`（M32 展平改名）。它永远不进 `Data`、不进 XML，所以 ts 类名与 C# 的 `Type.Name` 不一致无害。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

判据：前一个字符是 `/`、它还能被回退（`unit.IsUndo`）、且当前字符**不是** `/`——也就是「第二个斜杠」的位置。

那种情况下再看 `unit.Data` 的最后两个单元里的**倒数第二个**：单元数不超过 1 就直接成立；否则它是 `Common` 或 `Bracket` 时**不**成立（那两个抢走了解释权），其余类型成立。

原 C# 的 `unit.Data.Last(1)` 用的是 `IEnumableExtensions.Last<T>(self, int skipLastCount)`（即 `SkipLast(1).Last()`）；ts 侧 `Token.Last(index)` 的语义正是「倒数第 `index` 个子单元」，所以写成 `unit.Last(1)`。C# 里 `return true` / `return false` 靠 `bool` 到 `BranchConditionResult` 的隐式转换，ts 没有隐式转换，按同一批 token 的写法展开成「建结果、赋 `Success`」两步。

```ts
const preUnit = source.Pre();
if (preUnit === null || preUnit.Value !== "/" || !unit.IsUndo(preUnit) || source.Value === "/") {
  const result = new BranchConditionResult();
  result.Success = false;
  return result;
}
if (unit.Data.length <= 1) {
  const result = new BranchConditionResult();
  result.Success = true;
  return result;
}
const last = unit.Last(1);
const result = new BranchConditionResult();
if (last instanceof Common) {
  result.Success = false;
} else if (last instanceof Bracket) {
  result.Success = false;
} else {
  result.Success = true;
}
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

认下这段正则的**开头**：先把那个已经被吃掉的 `/` 回退掉（它归 `RegexToken` 所有，不属于前一个单元），然后挂一个新的 `RegexToken`，用同一个 `/` 签入，再把当前字符补进去。

原 C# 是 `var preUnit = source.Pre()!.Value; unit.Undo(preUnit); …`——按 §7.2，`source.Pre()!` 在 ts 里已经是 `Source`，后面那层 `.Value` 是可空结构体解包，去掉。

```ts
const preUnit = source.Pre()!;
unit.Undo(preUnit);
const regexToken = unit.AddToMounted(new RegexToken(unit.Owner, unit.Template));
regexToken.SignIn(preUnit);
regexToken.Append(source);
```

# class RegexToken extends UnitToken

正则字面量单元。

原 C# 侧是 `public class RegexToken : UnitToken<char>`。按 M31，C# 的 `char` 在规范里写 `string`（单字符）。

它没有覆写 `ToXmlString`，所以 XML 由 `Token.ToXmlString` 产出（子单元串接）。正则单元没有子单元，落地就是个空标签——夹具 `24-regex.xml` 里 `let a = /ab+c/g` 的第三个单元正是 `<RegexToken></RegexToken>`（**不要**给它加 `ToXmlString` 覆写）。`Temp` / `Flags` 只通过 `ToDictionary` 暴露给执行层。

## static readonly field JumpIn:RegexTokenBranch = new RegexTokenBranch()

把 `RegexTokenBranch` 注册进 `Root` 的通用跳转队列用的实例。

原 C# 是 `public static Branch JumpIn { get; } = new();`——这里的 `Branch` 指的是嵌套的那个 `Branch` 类，按 M19 落成静态只读字段。

## constructor:(owner:IOwner, template:Template)=>void

以负责人与模板创建，并把本类型的跳转队列与重组队列都取出来。

原 C# 是 `public RegexToken(IOwner owner, Template<char> template) : base(owner, template)`，体里两句 `ProcessQueue = template.BranchTemplate.Get(GetType(), null);` 与 `ReorganizationQueue = template.ReorganizationTemplate.Get(GetType(), null);`。`GetType()` 按 M17 写成 `this.constructor`。

注意 `ReorganizationTemplate` 取出来的是**默认队列**：本类没有嵌套的 `Reorganization`，把正则从单元列表里摘掉是执行层 `RegexStep.Parser` 干的事（不在本次移植范围）。

```ts
super(owner, template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor, null);
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## field Temp:string = ""

正则正文，**不含两端的斜杠**：`Success` 用开头那个 `/` 签入却只 `Append` 当前字符，结尾的 `/` 又只置 `IsReadyToExit`。所以 `let a = /ab+c/g` 攒出来的是 `ab+c`、`Flags` 是 `g`，执行层拼出的键 `/${RegexValue}/${Flags}` 正好是 `/ab+c/g`（见 `RegexStep.Set`）。

原 C# 是 `public StringBuilder Temp { get; } = new();`。按 §3.8 写成 `string`：`Temp.Append(c)` → `this.Temp += c`。它只被本类读写，没有被别处当容器用，换成字符串不失语义。

## field IsReadyToExit:bool = false

是否已经见到结尾的 `/`（此后只可能再收标志字符）。

原 C# 是 `public bool IsReadyToExit { get; set; } = false;`，按 M12 直接落成字段。

## field IsTranslate:bool = false

上一个字符是不是转义用的 `\`（正则里 `\/` 不该结束字面量）。

原 C# 是 `public bool IsTranslate { get; set; } = false;`。

## field Flags:string = ""

结尾标志字符（`m` / `g` / `i` / `s` / `u` / `y`）逐个攒进来。

原 C# 是 `public StringBuilder Flags { get; } = new();`，按 §3.8 写成 `string`。

## method Append:(source:Source)=>void

把当前字符补进 `Temp`。

原 C# 是 `internal void Append(in Source<char> source)`——`internal` 这层可见性 ts 里没有对应物，这里落成普通公开方法；只有 `RegexTokenBranch.Success` 调它。

```ts
this.Temp += source.Value;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

跳转队列没接手时，把字符并进 `Temp`。

原 C# 是 `protected override void Default(SyntaxContext<char> context, in Source<char> source)`。

```ts
this.Temp += source.Value;
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

本类的调度核心，三个状态：

1. **转义中**（`IsTranslate`）：把 `\` 之后的这个字符原样收进 `Temp`，退出转义态，返回 `Done`。
2. **还没见到结尾的 `/`**：当前字符是 `\` 就收进 `Temp` 并进入转义态，是 `/` 就把 `IsReadyToExit` 置真——两种都返回 `Done`；其余返回 `Undo`，让字符继续往下走。
3. **已经见到结尾的 `/`**：当前字符是 `m` / `g` / `i` / `s` / `u` / `y` 之一就收进 `Flags`；否则说明字面量结束——签出、关闭自己并跑重组、卸载，再插一条 `ReloadMessage` 让当前字符重新处理。两种情况都返回 `Done`。

原 C# 是 `source.Value is 'm' or 'g' or 'i' or 's' or 'u' or 'y'`（C# 的模式匹配），ts 里展开成一串 `||`。C# 的三参构造器 `new ReloadMessage<char>(Owner, this, source)` 按 M14(b) 走静态工厂 `ReloadMessage.WithoutProcessOwner`。

```ts
if (!this.IsTranslate) {
  if (this.IsReadyToExit) {
    if (
      source.Value === "m" ||
      source.Value === "g" ||
      source.Value === "i" ||
      source.Value === "s" ||
      source.Value === "u" ||
      source.Value === "y"
    ) {
      this.Flags += source.Value;
    } else {
      this.SignOut(source);
      this.TryToClose();
      this.Quit();
      context.Messages.push(ReloadMessage.WithoutProcessOwner(this.Owner, this, source));
    }
    return BranchStates.Done;
  }
  if (source.Value === "\\") {
    this.Temp += source.Value;
    this.IsTranslate = true;
    return BranchStates.Done;
  }
  if (source.Value === "/") {
    this.IsReadyToExit = true;
    return BranchStates.Done;
  }
  return BranchStates.Undo;
}
this.Temp += source.Value;
this.IsTranslate = false;
return BranchStates.Done;
```

## method ToDictionary:()=>Map<string, any>

转成字典：记类型名、正文与标志，**没有** `children`。

原 C# 覆写了基类版本，返回 `{ ["type"] = GetType().Name, ["value"] = Temp.ToString(), ["flags"] = Flags.ToString() }`；这个 `flags` 就是执行层 `RegexStep.Set` 要读的东西。

```ts
const result = new Map<string, any>();
result.set("type", this.constructor.name);
result.set("value", this.Temp);
result.set("flags", this.Flags);
return result;
```

## method Clone:()=>Token

克隆自身。

原 C# 的顺序是 `Sign(this)` → `Temp.Append(Temp)` → `Flags.Append(Flags)` → `TryToClose()`。

```ts
const result = new RegexToken(this.Owner, this.Template);
result.Sign(this);
result.Temp += this.Temp;
result.Flags += this.Flags;
result.TryToClose();
return result;
```
