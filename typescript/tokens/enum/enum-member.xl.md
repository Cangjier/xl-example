# dependencies
```xl
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { ReloadMessage } from "../../../core/syntax/messages/reload-message.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**一条枚举成员**（`A` / `A = 1` / `"k" = "v"`）：`<EnumMember>` 一段，**吃字符**。

**它由体开、由自己收**（第 419 轮起）：成员以**名字**开头，没有「一个开括号」这样的入口
（那一刻还分不出字段与方法），所以边界由**体**认：`EnumBody` 在第一个实义字符上开一个成员，
成员的**结束由它自己判**——顶层的 `,`（枚举成员之间的分隔符）或者体的 `}`。

**判据只用到已经读到的东西**，不违反「不看未来」那条铁律；
而且与 `IfStatement` 判顶层逗号是**同一套口径**：嵌套里的 `,` 根本到不了这里
（`f(a, b)` 的那个逗号被更里层的括号挂走了）⇒ 本单元见到的 `,` 必定是自己这一层的
——**不数深度**。

收尾一律「**不含地退出**」：把那一格**还给上一级**（`ReloadMessage` 走 `ReloadOwner`，即那个体），
再签出到前一格、关自己、从父单元卸载 ✓——与 `IfStatement.ExitOrPre` 同一套
（含「入队要倒着来」那一条，见 `if-statement.xl.md`）。

**`EnumMemberReorganization` 已经删除**（第 419 轮）：它做的事（按顶层逗号切成员表）
现在由「体开成员 + 成员自己收」在**读的时候**完成，不再等体关闭时扫一遍平列表。

# class EnumMember extends UnitToken

一条枚举成员。类名必须与产物的标签名一致。

内容直接装在自己身上，**逗号留在外面**（它属于枚举声明那一级，与 TS 的分工一致）。

## method PrintAst:(ctx:any, v:any)=>any

`A` / `A = 1` → `EnumMember`（**从 `ts-ast.xl.md` 的 `projectEnumMember` 搬来**，第 182 轮）。

```ts
  const kids = ctx.Kids(v);
  const eqIndex = kids.findIndex(
    (k: any) => k.get("type") === "SymbolToken" && ctx.TextOf(k) === "=",
  );
  const nameNode = kids.find((k: any) => k.get("type") !== "SymbolToken") ?? null;
  const props: any = {};
  if (nameNode !== null) props.name = ctx.Project(nameNode);
  if (eqIndex >= 0 && eqIndex + 1 < kids.length) props.initializer = ctx.Project(kids[eqIndex + 1]);
  return ctx.NodeHead("EnumMember", props, v);
```

## constructor:(template:Template)=>void

两件事：挂**成员列表**的跳转队列（名字 / `=` / 初始化式里的括号都由它照常开）、
挂**通用队列**（初始化式是**表达式**）。

**初始化式那一趟不能省**：`All = -1` 的 `-1` 要收成 `UnaryOperator`、`A = f()` 要收成调用
（TS 那边它们是 `EnumMember` 的子节点）。不挂队列时那些算子会退回散单元
（实测：`All = -1` 在 `typescript.d.ts` 里 2 处、`= -2147483648` 1 处）。

```ts
super(template);
this.ProcessQueue = ParsePipeline.CreateMemberListQueue();
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Owns:(source:Source)=>bool

当前字符是不是本单元**配对的收尾符**。

**本单元一对括号都不配对** ✗——成员的名字与初始化式里出现的括号各自有单元管，
到得了这一层的收尾符只有两种：顶层的 `,` 与体的 `}`。所以这里恒 `false`
（问「体的 `}` 归不归我」由体的 `Owns` 回答，本单元收尾时正是这么问的）。

```ts
return false;
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

**不含地退出**：见到顶层 `,` 或体的 `}` 就把它**还回去**，然后收自己。

- **`}` 那一支要先问祖先** ✗：本单元的初始化式里可以有对象字面量 `{ … }`，
  但那个 `}` 由它自己的括号单元挂走 ⇒ **能到这一层的 `}` 必是体那一层的** ✓
  （与 `IfBody` / `ClassBody` 的 `Owns` 同一个契约 ✓）。所以这里直接判 `}` 即可，
  不必再往上走一遍——多走一遍也不会有别的答案 ✗。
- **还回去的是「这一格」** ✓（发的是**位置**不是单元）：上一级要重新词法化它 ✓——
  `,` 在体那一层由 `SymbolToken` 收成一个逗号单元 ✓、`}` 由体自己收尾 ✓。

```ts
if (source.Value === "," || source.Value === "}") {
  const owner = this.ReloadOwner ?? this.Parent;
  if (owner !== null) {
    context.Messages.push(new ReloadMessage(owner, this, source));
  }
  if (this.SourceRange.End === null) {
    const previous = source.Pre();
    if (previous !== null) {
      this.SignOut(previous);
    }
  }
  this.TryToClose();
  this.Quit();
  return BranchStates.Done;
}
return BranchStates.Undo;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理：**空实现**（字符全交给跳转队列与挂载的子单元）。

## method Clone:()=>Token

克隆自身。

```ts
const result = new EnumMember(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
