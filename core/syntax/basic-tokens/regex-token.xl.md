# dependencies
```xl
import { BranchStates } from "../branch-states.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { ComputePossibleShapesStates } from "../compute-possible-shapes-states.xl.md"
import { IComputePossibleShapes } from "../i-compute-possible-shapes.xl.md"
import { ReloadMessage } from "../messages/reload-message.xl.md"
import { Source } from "../source.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "../templates/template.xl.md"
import { UnitToken } from "../unit-token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

正则字面量 `/pattern/flags`：前一个 `/` 已经作为符号落在树上时，从第二个 `/` 开始把整段正则收成一个单元——正文进 `Temp`，结尾 `/` 之后的 flags 进 `Flags`。

**为什么必须由 basic token 整体收走**：字符层的包夹与分号先于形状层发生。`/;/` 里的 `;` 会先把语句切断、`/(/` / `/[a-z]/` 里的括号会先进 `Bracket` 配对、`/[/]/` 更是连正文边界都错；等形状层在 `;` 处把单元交给 `ExpressionBuilder` 时 token 流已经被切错，重扫也拼不回来。

**「这个 `/` 该不该起正则」不在这里判**：那是语法层的决定（`if (x) /a/` 与 `({}) / b` 的 `/` 前一个 token 都是 `)`，但一个是正则、一个是除号）。本类只做两件事：用一个统一的 `Consume` 状态机收字符（转义 / 字符类 / 结尾 `/` / flags），以及在 `Transit` 里做**词法层能看到的近似判据**，并留一个语法层可以否决的接口（`SyntaxContext.RegexStartAfter` 位置登记）。

# class RegexToken extends UnitToken

正则字面量单元。

单元值类型是单字符的 `string`。

没有覆写 `ToXmlString`，XML 由 `Token.ToXmlString` 产出（子单元串接）：正则单元没有子单元，落地是一个空标签。数据出口是 `ToText`。

## field IsBasicToken:bool = true

basic 单元：由 `Template.BasicBranchQueue()` 收出来。

## constructor:(template:Template)=>void

以模板创建，并把本类型的跳转队列取出来（取默认队列）；取运行时类型用 `this.constructor`。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, null);
```

## protected method Close:(context:SyntaxContext)=>CloseStates

关闭：只把自己标记为已关闭，然后**只问父单元**要不要重算候选——父单元没实现 `IComputePossibleShapes` 就不问，也不再往上找。

父单元是不是宿主由它自己的 `CatalogGuide` 说了算：为空就等于没挂向导，被问到也不做任何事。

重算的返回值原样带上去：建出了形状时，正在收尾的这个 token 要让当前字符重放。

```ts
this.Closed = true;
const parent = this.Parent;
if (parent !== null && "ComputePossibleShapes" in parent) {
  const state = (parent as unknown as IComputePossibleShapes).ComputePossibleShapes(context);
  if (state === ComputePossibleShapesStates.Built) {
    return CloseStates.Built;
  }
}
return CloseStates.Nothing;
```

## field Temp:string = ""

正则正文，不含两端的斜杠。

## field IsReadyToExit:bool = false

是否已经见到结尾的 `/`（此后只可能再收 flags）。

## field IsTranslate:bool = false

上一个字符是不是转义用的 `\`（正则里 `\/` 不该结束字面量）。

## field InClass:bool = false

是否在字符类 `[...]` 内：类里的 `/` 不结束字面量，`]` 退出字符类。

## field Flags:string = ""

结尾 `/` 之后的 flags 字符逐个攒进来；哪些字符算 flag 由 `Template.RegexTemplate.IsFlag` 决定。

## method ToText:()=>string

把整段字面量拼回原始文本：`/` + 正文 + `/` + flags，口径同 ts 的 `RegularExpressionLiteral.text`。

形状在 build 那一刻取走这个串（basic token 的数据必须在 build 时提取到 shape 字段，token 用完即丢）。

```ts
return "/" + this.Temp + "/" + this.Flags;
```

## method Consume:(context:SyntaxContext, source:Source)=>BranchStates

**收一个正文字符的唯一入口**：`Transit` 收第一个字符、`ExitOrPre` 收后续字符，都走这里，免得某一条路径漏设转义态。

七个分支的优先级固定：

1. 转义态（`IsTranslate`）：原样收，退出转义态；
2. 已见结尾 `/`（`IsReadyToExit`）：是 flag 就收进 `Flags`；否则**签出到前一个字符**、关闭自己并跑重组、从父单元卸载，再插一条 `ReloadMessage` 让当前字符重新处理；
3. `\`：收进正文并进入转义态；
4. 字符类内：`]` 退出字符类，字符照常进正文（`]` 本身也保留）；
5. `[`：进入字符类，字符进正文；
6. `/`：置「已见结尾」；
7. 其余：进正文。

**`SignOut(source.Pre())` 不是 `SignOut(source)`**：关闭发生在「结尾 `/` 之后的下一个字符」上，范围终点必须是上一个字符。`Pre()` 为 `null` 不可能（此时至少已有开头那个 `/`），但仍然判空。

**关闭时的 `ReloadMessage` 用 `this.Parent` 当处理者**，不是根：正则可能挂在 `Bracket` 里（`f(/a/)`、`a[/b/]`），当前字符必须交回那个括号，否则括号的收尾会被根单元抢走。

EOF 时不会走到这里：`/a/` 落在文件末尾，由 `SourceFileShape` 的收尾 `SignOut` 递归签出，`Consume` 不假设一定会看到「下一个字符」。

```ts
const value = source.Value;
if (this.IsTranslate) {
  this.Temp += value;
  this.IsTranslate = false;
  return BranchStates.Done;
}
if (this.IsReadyToExit) {
  if (this.Template.RegexTemplate.IsFlag(value)) {
    this.Flags += value;
    return BranchStates.Done;
  }
  const previous = source.Pre();
  if (previous !== null) {
    this.SignOut(previous);
  }
  this.TryToClose(context);
  this.Quit();
  context.Messages.push(new ReloadMessage(this.Parent, this, source));
  return BranchStates.Done;
}
if (value === "\\") {
  this.Temp += value;
  this.IsTranslate = true;
  return BranchStates.Done;
}
if (this.InClass) {
  if (value === "]") {
    this.InClass = false;
  }
  this.Temp += value;
  return BranchStates.Done;
}
if (value === "[") {
  this.InClass = true;
  this.Temp += value;
  return BranchStates.Done;
}
if (value === "/") {
  this.IsReadyToExit = true;
  return BranchStates.Done;
}
this.Temp += value;
return BranchStates.Done;
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

后续字符全部交给 `Consume`：正则被挂载之后，本单元的 `Process` 走 `ExitOrPre`，状态机只有这一个入口。

```ts
return this.Consume(context, source);
```

## static method Transit:(context:SyntaxContext, unit:Token, source:Source)=>BranchStates

判据分三段。

**第一段（不变）**：前一个字符是 `/`、它还能被回退（`unit.IsUndo`）、且当前字符不是 `/`（`//` 永远是行注释）。

**第二段（起点判据）**：从 `Data` 里那个 `/` 往前找，跳过 trivia（`WrapSymbol` / `AreaAnnotation` / `LineAnnotation`），得到 `lastCode`（可能为 `null`）与再往前一个代码单元 `previousCode`。先查 `SyntaxContext.RegexStartAfter`：`lastCode` 的 `End.Index` 在登记里就是语法层点名过的位置，直接成立；否则问 `Template.RegexTemplate.CanStart(lastCode, previousCode)`。不成立就 `Undo`，把 `/` 留给符号层。

**第三段（认下）**：先把那个已经被吃成 `Symbol` 的 `/` 回退掉（它归 `RegexToken` 所有，不属于前一个单元），然后挂一个新的 `RegexToken`，用同一个 `/` 签入，再把当前字符交给 `Consume`。

```ts
const preUnit = source.Pre();
if (preUnit === null || preUnit.Value !== "/" || !unit.IsUndo(preUnit) || source.Value === "/") {
  return BranchStates.Undo;
}
const data = unit.Data;
let at = data.length - 1;
while (at >= 0 && data[at].IsTriviaToken) {
  at--;
}
let lastCode: Token | null = null;
let previousCode: Token | null = null;
if (at >= 0) {
  at--;
  while (at >= 0 && data[at].IsTriviaToken) {
    at--;
  }
  if (at >= 0) {
    lastCode = data[at];
  }
  at--;
  while (at >= 0 && data[at].IsTriviaToken) {
    at--;
  }
  if (at >= 0) {
    previousCode = data[at];
  }
}
let forced = false;
if (lastCode !== null && lastCode.SourceRange.End !== null) {
  forced = context.RegexStartAfter.has(lastCode.SourceRange.End.Index);
}
if (!forced && !unit.Template.RegexTemplate.CanStartAt(data, data.length)) {
  return BranchStates.Undo;
}
unit.Undo(preUnit);
const lastOfMounted = unit.Last();
if (lastOfMounted !== null && !lastOfMounted.Closed && lastOfMounted.TryToClose(context) === CloseStates.Built) {
  return BranchStates.Reload;
}
const mounted = new RegexToken(unit.Template);
unit.Add(mounted);
unit.MountedUnit = mounted;
const regexToken = unit.MountedUnit as RegexToken;
regexToken.SignIn(preUnit);
regexToken.Consume(context, source);
return BranchStates.Done;
```
