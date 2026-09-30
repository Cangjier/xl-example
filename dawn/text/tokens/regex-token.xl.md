# dependencies
```xl
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

**本类不碰正则的编译**：它只负责把 `/…/flags` 这段文本攒下来，真正的编译发生在执行层的 `RegexStep`（`RegexPool` 缓存 + 选项映射），本层不涉及。ts 侧的等价物是原生 `RegExp`：`RegexStep` 里的忽略大小写 / 多行 / 单行三个选项对应 `new RegExp(value, flags)` 的 `i` / `m` / `s`；`g` / `u` / `y` 交给 `RegExp` 自己认。本文件只需要保证 `Temp` 与 `Flags` 逐字正确。

`RegexTokenBranch` 写在 `RegexToken` **之前**：后者的静态字段 `JumpIn` 在类定义时立即 `new RegexTokenBranch()`，写反了会命中 ts 的暂时性死区（TDZ）。

# class RegexTokenBranch extends Branch

它永远不进 `Data`、不进 XML。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

判据：前一个字符是 `/`、它还能被回退（`unit.IsUndo`）、且当前字符**不是** `/`——也就是「第二个斜杠」的位置。

那种情况下再看 `unit.Data` 的最后两个单元里的**倒数第二个**：单元数不超过 1 就直接成立；否则它是 `Common` 或 `Bracket` 时**不**成立（那两个抢走了解释权），其余类型成立。

`Token.Last(index)` 的语义是「倒数第 `index` 个子单元」，所以写成 `unit.Last(1)`。返回值不是 `bool` 而是 `BranchConditionResult`，所以展开成「建结果、赋 `Success`」两步。

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

`Condition` 已经确认过前一个字符是 `/`，所以这里直接写 `source.Pre()!`。

```ts
const preUnit = source.Pre()!;
unit.Undo(preUnit);
const regexToken = unit.AddToMounted(new RegexToken(unit.Template));
regexToken.SignIn(preUnit);
regexToken.Append(source);
```

# class RegexToken extends UnitToken

正则字面量单元。

单元值类型是单字符的 `string`。

它没有覆写 `ToXmlString`，所以 XML 由 `Token.ToXmlString` 产出（子单元串接）。正则单元没有子单元，落地就是个空标签——夹具 `24-regex.xml` 里 `let a = /ab+c/g` 的第三个单元正是 `<RegexToken></RegexToken>`（**不要**给它加 `ToXmlString` 覆写）。`Temp` / `Flags` 只暴露给执行层。

## static readonly field JumpIn:RegexTokenBranch = new RegexTokenBranch()

把 `RegexTokenBranch` 注册进 `Root` 的通用跳转队列用的实例。

## constructor:(template:Template)=>void

以模板创建，并把本类型的跳转队列与重组队列都取出来。

取运行时类型用 `this.constructor`。

注意 `ReorganizationTemplate` 取出来的是**默认队列**：本类没有嵌套的 `Reorganization`，把正则从单元列表里摘掉是执行层 `RegexStep.Parser` 干的事（本层不做）。

```ts
super(template);
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

`Temp` 写成 `string`：它只被本类读写，没有被别处当容器用，所以 `this.Temp += c`，换成字符串不失语义。

## field IsReadyToExit:bool = false

是否已经见到结尾的 `/`（此后只可能再收标志字符）。

## field IsTranslate:bool = false

上一个字符是不是转义用的 `\`（正则里 `\/` 不该结束字面量）。

## field Flags:string = ""

结尾标志字符（`m` / `g` / `i` / `s` / `u` / `y`）逐个攒进来；用 `string` 就好。

## method Append:(source:Source)=>void

把当前字符补进 `Temp`。

只有 `RegexTokenBranch.Success` 调它，所以落成普通公开方法。

```ts
this.Temp += source.Value;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

跳转队列没接手时，把字符并进 `Temp`。

```ts
this.Temp += source.Value;
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

本类的调度核心，三个状态：

1. **转义中**（`IsTranslate`）：把 `\` 之后的这个字符原样收进 `Temp`，退出转义态，返回 `Done`。
2. **还没见到结尾的 `/`**：当前字符是 `\` 就收进 `Temp` 并进入转义态，是 `/` 就把 `IsReadyToExit` 置真——两种都返回 `Done`；其余返回 `Undo`，让字符继续往下走。
3. **已经见到结尾的 `/`**：当前字符是 `m` / `g` / `i` / `s` / `u` / `y` 之一就收进 `Flags`；否则说明字面量结束——签出、关闭自己并跑重组、卸载，再插一条 `ReloadMessage` 让当前字符重新处理。两种情况都返回 `Done`。

标志字符的判定展开成一串 `||`；插消息走静态工厂 `ReloadMessage.WithoutProcessOwner`。

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
      context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
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

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Temp` 追加到自身 → 把 `Flags` 追加到自身 → `TryToClose()`。

```ts
const result = new RegexToken(this.Template);
result.Sign(this);
result.Temp += this.Temp;
result.Flags += this.Flags;
result.TryToClose();
return result;
```
