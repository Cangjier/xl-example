# dependencies
```xl
import { Branch } from "../../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../../core/syntax/branch-condition-result.xl.md"
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
再签出到前一格、关自己、从父单元卸载——与 `IfStatement.ExitOrPre` 同一套
（含「入队要倒着来」那一条，见 `if-statement.xl.md`）。

**`EnumMemberCloseRule` 已经删除**（第 419 轮）：它做的事（按顶层逗号切成员表）
现在由「体开成员 + 成员自己收」在**读的时候**完成，不再等体关闭时扫一遍平列表。

# class EnumMemberBranch extends Branch

**成员表的进门**：它排在枚举体那条队列里，认的是「**这一格该起一个新成员**」。

**为什么做成分支、而不是体的 `Process` 覆盖**（用户口径，第 421 轮改）：形状判定本来就该住在
**队列里的分支**上 —— 分支只管「认形状 + 交棒」，体只管「有挂载就转过去」，
两边各一句，一个问题的答案只有一处。做成 `Process` 覆盖等于给同一个问题**第二份答案**。

**顺序就是正确性**（这一条是这次改动的全部理由）：

- 它插在 **`StringGuide.JumpIn` 之前** —— 成员的**名字可以是字符串**（`"k" = "v"`），
  排在字符串向导后面的话那一格先被字符串吃掉，成员就没了开头；
- 而注释那三条（`AreaAnnotation` / `LineAnnotation` / `PreprocessorDirectives` / `RegexToken`）
  **本来就排在更前面** —— 于是 `/** doc */` 的第二格由注释分支先认下，
  **再也不用在体里问那句 `IsUndo(pre)`** 了（`Process` 覆盖那一版正是靠它兜的，现在结构性消失）；
- `,` 与空白**不由它认**：`,` 落到队列后面的 `SymbolToken.AppendIn`（与 TS 的分工一致：
  逗号属于枚举声明那一级，留在成员外面）；空白由它**吞掉**（见 `Success`）。

## static readonly field JumpIn:EnumMemberBranch = new EnumMemberBranch()

唯一的实例，注册进**枚举体**的跳转队列时用（`ParsePipeline.CreateEnumMemberQueue`）。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

四道闸，全部只看**已经读到**的东西：

1. **宿主必须是枚举体**（按类名问，不 `import EnumBody` —— 那会绕成循环依赖，且静态字段初始化期有 TDZ）；
2. **没有成员正在吃**（有的话字符早被转走，轮不到队列；这一条是防御性的）；
3. **不是 `,` / `}` / `/`**：`,` 与 `}` 各有归宿，`/` 是注释的第一格
   （注释认第二格，所以第一格必须放它过去，见类注释）；
4. 剩下的都认 —— 包括空白（它要被吞掉，不能让 `LineWrap.AppendIn` 在体里造出软换行单元：
   改动前后枚举体下都没有软换行）。

```ts
const result = new BranchConditionResult();
result.Success = false;
if (unit.constructor.name !== "EnumBody") {
  return result;
}
if (source.Value === "," || source.Value === "}" || source.Value === "/") {
  return result;
}
result.Success = true;
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

**空白：吞掉、什么都不做**（枚举体下不放软换行单元，与改动前后的形状一致）。

**其余：开一个新成员并把这一格喂给它**（它就是成员的第一个单元）。

- **成员直接挂在体下**（`Data` 里与逗号、注释平级），**不套 `Statement`** ——
  实测（第 419 轮）带注释的枚举体里，注释会把成员表切成两个 `<Statement>`，
  而 TS 的 `EnumDeclaration.members` 是**一张平表**；
- **`ReloadOwner` 指成体**：成员收尾时要把 `,` / `}` 那一格**还回来**，
  还错了地方就会落进成员自己手里（`IfSet.MountStatement` 记过同一条坑）。

```ts
if (source.Value === " " || source.Value === "\t" || source.Value === "\r" || source.Value === "\n") {
  return;
}
const member = new EnumMember(unit.Template);
unit.Add(member);
member.SignIn(source);
member.ReloadOwner = unit;
unit.MountedUnit = member;
member.Process(context, source);
```

# class EnumMember extends UnitToken

一条枚举成员。类名必须与产物的标签名一致。

内容直接装在自己身上，**逗号留在外面**（它属于枚举声明那一级，与 TS 的分工一致）。

## method SegmentNames:()=>Map<string, Map<string, string>>

**本单元的段，投成目标语言形状时叫什么**：产物那边的分段名 → 目标语言的字段名。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `children` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

```ts
return new Map([["EnumMember", new Map([["children", "initializer"]])]]);
```

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
  if (eqIndex >= 0 && eqIndex + 1 < kids.length) {
    // **初始化式可能就是一对其中的括号**（第 681 轮，与形参默认值**同一个根**、
    // **同一次实测**）：`A = (1)` 那一格是 `Bracket`，`ctx.Project` 只认有映射的标签
    // ⇒ 未映射的 `Bracket` ⇒ 降级层报 `unimplemented: expression Bracket`
    //（**整份文件进不来**）。值位括号的映射走 `ctx.ParenthesizedOf`。
    const init = kids[eqIndex + 1];
    props.initializer =
      init.get("type") === "Bracket" && init.get("startBracket") === "("
        ? ctx.ParenthesizedOf(init)
        : ctx.Project(init);
  }
  return ctx.NodeHead("EnumMember", props, v);
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与上面的 `PrintAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

```ts
  // **第 993 轮**：`ctx.TextOf` → `ctx.ValueOf` —— 只读那一格**自己记的**值，
  // 不回原文兜底（见 `core/syntax/token.xl.md` 的 `PrintDirectAst`）。
  const kids = ctx.Kids(v);
  const eqIndex = kids.findIndex(
    (k: any) => k.Tag() === "SymbolToken" && ctx.ValueOf(k) === "=",
  );
  const nameNode = kids.find((k: any) => k.Tag() !== "SymbolToken") ?? null;
  const props: any = {};
  if (nameNode !== null) props.name = ctx.Project(nameNode);
  if (eqIndex >= 0 && eqIndex + 1 < kids.length) {
    // **初始化式可能就是一对其中的括号**（第 681 轮，与形参默认值**同一个根**、
    // **同一次实测**）：`A = (1)` 那一格是 `Bracket`，`ctx.Project` 只认有映射的标签
    // ⇒ 未映射的 `Bracket` ⇒ 降级层报 `unimplemented: expression Bracket`
    //（**整份文件进不来**）。值位括号的映射走 `ctx.ParenthesizedOf`。
    const init = kids[eqIndex + 1];
    props.initializer =
      init.Tag() === "Bracket" && init.startBracket === "("
        ? ctx.ParenthesizedOf(init)
        : ctx.Project(init);
  }
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
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## method Owns:(source:Source)=>bool

当前字符是不是本单元**配对的收尾符**。

**本单元一对括号都不配对**——成员的名字与初始化式里出现的括号各自有单元管，
到得了这一层的收尾符只有两种：顶层的 `,` 与体的 `}`。所以这里恒 `false`
（问「体的 `}` 归不归我」由体的 `Owns` 回答，本单元收尾时正是这么问的）。

```ts
return false;
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

**不含地退出**：见到顶层 `,` 或体的 `}` 就把它**还回去**，然后收自己。

- **`}` 那一支要先问祖先**：本单元的初始化式里可以有对象字面量 `{ … }`，
  但那个 `}` 由它自己的括号单元挂走 ⇒ **能到这一层的 `}` 必是体那一层的**
  （与 `IfBody` / `ClassBody` 的 `Owns` 同一个契约）。所以这里直接判 `}` 即可，
  不必再往上走一遍——多走一遍也不会有别的答案。
- **还回去的是「这一格」**（发的是**位置**不是单元）：上一级要重新词法化它——
  `,` 在体那一层由 `SymbolToken` 收成一个逗号单元、`}` 由体自己收尾。

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
