# dependencies
```xl
import { Branch } from "../branch.xl.md"
import { BranchConditionResult } from "../branch-condition-result.xl.md"
import { BranchStates } from "../branch-states.xl.md"
import { ReloadMessage } from "../messages/reload-message.xl.md"
import { Source } from "../source.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "../templates/template.xl.md"
import { UnitToken } from "../unit-token.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Common } from "./common.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

正则字面量 `/pattern/flags`：前一个 `/` 已经作为符号落在树上时，从第二个 `/` 开始把整段正则收成一个单元——正文进 `Temp`，结尾的 `m` / `g` / `i` / `s` / `u` / `y` 进 `Flags`。

# class RegexTokenBranch extends Branch

正则字面量的跳转规则：认出第二个 `/`，并把已经落树的那个 `/` 回退给 `RegexToken`。

它永远不进 `Data`、不进 XML。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

判据：前一个字符是 `/`、它还能被回退（`unit.IsUndo`）、且当前字符不是 `/`。成立后再看 `unit.Data` 的倒数第二个单元：单元数不超过 1 就成立；它是 `Common` 或 `Bracket` 时不成立；其余类型成立。

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

认下这段正则的开头：先把那个已经被吃掉的 `/` 回退掉（它归 `RegexToken` 所有，不属于前一个单元），然后挂一个新的 `RegexToken`，用同一个 `/` 签入，再把当前字符补进去。

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

没有覆写 `ToXmlString`，XML 由 `Token.ToXmlString` 产出（子单元串接）：正则单元没有子单元，落地是一个空标签。

## static readonly field JumpIn:RegexTokenBranch = new RegexTokenBranch()

把 `RegexTokenBranch` 注册进 `Root` 的通用跳转队列用的实例。

## constructor:(template:Template)=>void

以模板创建，并把本类型的跳转队列与重组队列都取出来（两者都取默认队列）；取运行时类型用 `this.constructor`。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor, null);
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭，并向上通知一次。

```ts
this.Closed = true;
this.NotifyClosed();
```

## field Temp:string = ""

正则正文，不含两端的斜杠。

## field IsReadyToExit:bool = false

是否已经见到结尾的 `/`（此后只可能再收标志字符）。

## field IsTranslate:bool = false

上一个字符是不是转义用的 `\`（正则里 `\/` 不该结束字面量）。

## field Flags:string = ""

结尾标志字符（`m` / `g` / `i` / `s` / `u` / `y`）逐个攒进来。

## method Append:(source:Source)=>void

把当前字符补进 `Temp`。

```ts
this.Temp += source.Value;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

跳转队列没接手时，把字符并进 `Temp`。

```ts
this.Temp += source.Value;
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

三个状态：转义中（`IsTranslate`）把 `\` 之后的字符原样收进 `Temp`、退出转义态，返回 `Done`；还没见到结尾的 `/` 时，当前字符是 `\` 就收进 `Temp` 并进入转义态、是 `/` 就把 `IsReadyToExit` 置真，两种都返回 `Done`，其余返回 `Undo`；已经见到结尾的 `/` 时，当前字符是 `m` / `g` / `i` / `s` / `u` / `y` 之一就收进 `Flags`，否则签出、关闭自己并跑重组、卸载，再插一条 `ReloadMessage` 让当前字符重新处理，两种情况都返回 `Done`。

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

克隆自身。顺序是 `Sign(this)` → 把 `Temp` 追加到自身 → 把 `Flags` 追加到自身 → `TryToClose()`。

```ts
const result = new RegexToken(this.Template);
result.Sign(this);
result.Temp += this.Temp;
result.Flags += this.Flags;
result.TryToClose();
return result;
```
