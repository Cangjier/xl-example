# dependencies
```xl
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
import { EnumMember } from "./enum-member.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`enum` 的枚举体段：**自己吃掉 `{ … }`**，最终产出 `<EnumBody>…</EnumBody>`。

**它与 `Bracket` / `IfBody` / `ClassBody` 同款**：

- **开头由创建它的那一方消费**（`{` 那一刻由 `EnumBranch` 消费并 `SignIn`）⇒ `{` 不是子单元；
- **结尾由它自己认**（`ExitOrPre` 比 `}`）⇒ `}` 也不是子单元；
- **嵌套靠挂载链**：体里再出现 `{` 时由通用队列另挂一个 `Bracket`，期间本单元根本没被调用
  ⇒ 见到的 `}` 必定是自己那一层的——**不数深度**。

成员列表的跳转队列挂在本单元上（见构造器）：这一步原先在 `EnumReorganization` 里靠
「括号的内容整体搬过来」凑出来，现在 `{` 由本单元自己吃，队列就跟着本单元走。

# class EnumBody extends UnitToken

枚举体。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<EnumBody>` 里是各条语句的 XML。

## constructor:(template:Template)=>void

只挂**成员列表**的跳转队列（`ParsePipeline.CreateMemberListQueue`，即通用队列去掉
`IfSetBranch.JumpIn`）：枚举成员位上不该认 `if` 语句，而注释这类 trivia 仍由它照常收。

**不再挂语句重组队列**（第 419 轮）：成员由本单元**读的时候**一个一个开出来
（见 `Process`），体关闭时 `Data` 里已经是成形的东西——再挂一条语句队列等于让
「成员什么时候成形」有**两个答案**。

```ts
super(template);
this.ProcessQueue = ParsePipeline.CreateMemberListQueue();
```

## method Process:(context:SyntaxContext, source:Source)=>void

**本单元是成员表的支配者**（第 419 轮起）：成员以名字开头，没有「一个开括号」那样的入口，
所以边界在这里认。

四支，全部只看**当前这一格**与**已经读到**的东西：

1. **有成员在吃** ⇒ 转给它（`MountedUnit` 的常规调度）；
2. **`}`** ⇒ 收尾（签出、关自己、连 `Enum` 一起退）；
3. **`,`** ⇒ 交给跳转队列收成一个逗号单元——**它属于枚举声明这一级**，
   留在成员外面（与 TS 的分工一致）；
4. **`/`** ⇒ 交给跳转队列（成员与逗号都在时，体这一层见到的 `/` 只可能是**注释**的开头），
   注释单元照旧进树、留在原位（用户口径：注释保留、不消除）；
5. 其余空白 ⇒ 丢掉（软换行不进产物，与改动前的形状一致）；
6. 剩下的 ⇒ **开一个新成员**。

**为什么空白丢掉、注释留下**：注释是**节点**（`LineAnnotation` / `AreaAnnotation`），
空白不是；改动前的产物里枚举体下也没有软换行单元。

```ts
if (this.MountedUnit !== null) {
  this.MountedUnit.Process(context, source);
  this.LastSource = source;
  return;
}
if (source.Value === "}") {
  this.SignOut(source);
  this.TryToClose();
  this.Quit();
  this.QuitOuter(source);
  return;
}
if (source.Value === "," || source.Value === "/") {
  super.Process(context, source);
  return;
}
// **注释认的是第二格** ✗（第 419 轮实测踩到）：`AreaAnnotationBranch` / `LineAnnotationBranch`
// 判的都是「前一个字符是 `/`、它还能被回退、当前这一格是 `*` 或 `/`」——
// 前一格那个 `/` 先由跳转队列照常收成一个 `SymbolToken` ✓，
// 紧接着的这一格必须**再交给队列** ✓，否则会被当成**成员的开头** ✗
//（实测：`/** doc */` 被读成 `<SymbolToken>/</SymbolToken>` + 一个以 `**` 开头的成员 ✗）。
if (source.Value === "*") {
  const pre = source.Pre();
  if (pre !== null && pre.Value === "/" && this.IsUndo(pre)) {
    super.Process(context, source);
    return;
  }
}
if (source.Value === " " || source.Value === "\t" || source.Value === "\r" || source.Value === "\n") {
  this.LastSource = source;
  return;
}
this.StartMember(context, source);
```

## private method StartMember:(context:SyntaxContext, source:Source)=>void

开一个新成员，并把这个字符喂给它（它就是成员的第一个单元）。

**成员直接挂在本单元下**（`Data` 里与逗号平级），**不再套一层 `Statement`**——
那是语句层的产物：实测（第 419 轮）带注释的枚举体里，注释会把成员表**切成两个
`<Statement>`**，而 TS 的 `EnumDeclaration.members` 是**一张平表**。

**`ReloadOwner` 指成本单元**：成员收尾时要把 `,` / `}` 那一格**还回来**，
还错了地方就会落进成员自己手里（`IfSet.MountStatement` 记过同一条坑）。

```ts
const member = new EnumMember(this.Template);
this.Add(member);
member.SignIn(source);
member.ReloadOwner = this;
this.MountedUnit = member;
member.Process(context, source);
```

## method Owns:(source:Source)=>bool

当前字符是不是本单元**配对的 `}`**。

判据与 `ExitOrPre` 那一句**一字不差**——写成两份只是为了不必让子单元去调 `ExitOrPre`
（那是「处理」不是「询问」）。它是给**挂在本单元下面的解析期单元**用的：
本单元一旦有了挂载单元，自己就再也看不到字符了。

```ts
return source.Value === "}";
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

遇到配对的 `}` 就退出：签出到该字符、尝试关闭（关自己并跑那一趟语句重组）、从父单元卸载自己。

**与 `Bracket.ExitOrPre` 一字不差**（那边比的是 `endBracket`，这里写死 `}`）。

```ts
if (source.Value === "}") {
  this.SignOut(source);
  this.TryToClose();
  this.Quit();
  this.QuitOuter(source);
  return BranchStates.Done;
}
return BranchStates.Undo;
```

## private method QuitOuter:(source:Source)=>void

体收尾时把 **`Enum` 也收掉**（连续 quit），于是下一个字符直接落到宿主手里。

**先签出再关闭**：`Enum` 的终点就是那个 `}`（`SignOut` 会递归签出最后一个子单元，
而 `EnumBody` 自己已经签过了，递归在那里停）。

**终点由调用方传进来**：`UnitToken.Process` 是「先问 `ExitOrPre`、再记 `LastSource`」，
所以 `ExitOrPre` 里读到的 `LastSource` 还是**上一个**字符。

```ts
const outer = this.Parent;
if (outer === null || outer.constructor.name !== "Enum") {
  return;
}
if (outer.SourceRange.End === null) {
  outer.SignOut(source);
}
outer.TryToClose();
outer.Quit();
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理：**空实现**（字符全交给挂载的子单元）。

## method Clone:()=>Token

克隆自身。

顺序与 `ForBody.Clone` 一致。

```ts
const result = new EnumBody(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
