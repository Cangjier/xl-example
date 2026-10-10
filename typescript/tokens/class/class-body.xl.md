# dependencies
```xl
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../../parse-pipeline.xl.md"
import { Identifier } from "../identifier.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`class` 的类体段：**自己吃掉 `{ … }`**，最终产出 `<ClassBody>…</ClassBody>`。

**它与 `Bracket` 同款**（用户口径：与 `ifbody` / `bracket` 一条路）：

- **开头由创建它的那一方消费**（`{` 那一刻由 `ClassBranch` 消费并 `SignIn`，
  与 `BracketBranch.Success` 对 `Bracket` 的做法**一模一样**）⇒ `{` 不是子单元；
- **结尾由它自己认**（`ExitOrPre` 比 `}`）⇒ `}` 也不是子单元；
- **嵌套靠挂载链**：体里再出现 `{` 时，由通用队列另挂一个 `Bracket`，期间本单元**根本没被调用**
  ⇒ 见到的 `}` 必定是自己那一层的——**不数深度**。

成员列表的跳转队列挂在本单元上（见构造器）：这一步原先在 `BracketBranch.Success` 里做
（那个 `{` 是括号、体不在树里），现在 `{` 由本单元自己吃，队列就跟着本单元走。

# class ClassBody extends UnitToken

类体。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<ClassBody>` 里是各条成员语句的 XML。

## method WrapperField:()=>string | null | undefined

**投成目标语言形状时，我这一层是不是「包装」**：是的话答「内容提到哪个字段」，不是的话答 `undefined`（见 `core/syntax/token.xl.md` 那一节——`null` 与 `undefined` 是两件事）。

类的成员表在目标语言那边**直接挂在类声明上**（`ClassDeclaration.members`），
而产物里它是单独一层（`Class` 的 `Data` 里那个 `ClassBody`）——所以它是包装：
**内容提上去、自己不出节点**。

```ts
return "members";
```

## constructor:(template:Template)=>void

创建后立刻做两件事：挂**成员列表**的跳转队列、挂**语句**规则队列。

- **成员列表队列**（`ParsePipeline.CreateMemberListQueue`，即通用队列**去掉 `IfSetBranch.JumpIn`**）：
  成员位上的 `if(a) { }` 是一个**名叫 `if` 的成员**——与 `if` 语句形状一模一样，
  分它们的只有上下文，而这件事由**队列本身**保证（`if` 那一侧一个闸都不用加）。
- **收尾规则队列**：`{ }` 括号没有规则队列（见 `../bracket.xl.md` 的 `Use`），
  所以类体在括号关闭时是散着的 `Identifier` / `SymbolToken` / `LineWrap`；
  把语句队列挂在这一段上，成员（方法声明、字段、静态块）才有成形的时机。

```ts
super(template);
this.ProcessQueue = ParsePipeline.CreateMemberListQueue();
ParsePipeline.InitialCloseRuleQueue(this);
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

遇到配对的 `}` 就退出。

**两条出口**：

- 体里出现 `let` ⇒ **非法类体**（见 `EjectMembers`）；
- 否则 ⇒ 关自己（跑成员那一趟重组）⇒ 再连续 quit 把 `Class` 也收掉。

`let` 那一支**必须在 `TryToClose` 之前判**：那趟重组会把 `let value: T` 折成 `Let` / `Statement`，
而摊回宿主的是**生单元**——摊回去之后由宿主那一趟照常成句。

```ts
if (source.Value !== "}") {
  return BranchStates.Undo;
}
this.SignOut(source);
if (this.ContainsLet()) {
  this.EjectMembers();
  return BranchStates.Done;
}
this.TryToClose();
this.Quit();
this.QuitOuter(source);
return BranchStates.Done;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理：**空实现**（与 `Bracket.Default` 同款）。字符全交给挂载的子单元。

## private method ContainsLet:()=>bool

体里有没有 `let` 单元（还是生词、或者已经成形的 `Let` 都算）。

**只扫自己这一层**：绝不递归进 `Bracket`——那会把**方法体里的** `let` 也算进来，
于是一个正常的类（方法体里有 `let x = 1`）会被判成「非法类体」，类在 `{` 处就被截断
（老写法实测过这一条：症状是 `dist/ts` 自己 99 个 `ClassDeclaration` 全漂）。

```ts
const list: Array<any> = this.Data;
for (const item of list) {
  if (item === null || item === undefined) {
    continue;
  }
  if (item.constructor.name === "Let") {
    return true;
  }
  if (item instanceof Identifier && item.Is("let")) {
    return true;
  }
}
return false;
```

## private method EjectMembers:()=>void

**非法类体的出口**：类只到 `{` 为止，体内容**摊回宿主**里 `Class` 的后面。

`class Foo<T> { let value: T }` 是非法的 TypeScript，`ts.createSourceFile` 在这里走的是**错误恢复**：
`ClassDeclaration` 到那个 `{` 就结束，后面的内容被当成**顶层语句**重新解析。
本工程按同一条口径落：类只盖到 `{`，体内容回到宿主那一层照常成句。

三件事，缺一不可：

1. 把体内容整批摘下来（`Data` 清空）、把自己从 `Class` 里摘掉（它不是 XML 节点）；
2. `Class` 的终点**直接写成 `{`**——`SignOut` 只能签一次（再签抛 `SourceRange.End has been setted`），
   而这里要的不是那个 `}`；
3. `Class` 关掉（跑头部那一趟重组）、摘掉它自己在宿主里的挂载，
   再把内容按原序插在宿主里 `Class` **之后**。

插进去的是**生单元**：宿主那一趟重组会把它们照常收成语句。

```ts
const cls = this.Parent;
if (cls === null || cls.constructor.name !== "Class") {
  return;
}
const host = cls.Parent;
const members = this.Data.slice();
this.Data.length = 0;
this.RemoveSelf();
if (cls.SourceRange.End === null && this.SourceRange.Start !== null) {
  cls.SourceRange.End = this.SourceRange.Start;
}
cls.TryToClose();
if (host !== null) {
  const at = host.Data.indexOf(cls);
  if (at >= 0) {
    host.Data.splice(at + 1, 0, ...members);
    for (const item of members) {
      item.Parent = host;
    }
  }
}
cls.Quit();
```

## private method QuitOuter:(source:Source)=>void

体收尾时把 **`Class` 也收掉**（连续 quit），于是下一个字符直接落到宿主手里。

**先签出再关闭**：`Class` 的终点就是那个 `}`
（`SignOut` 会递归签出最后一个子单元，而 `ClassBody` 自己已经签过了，递归在那里停）。

```ts
const outer = this.Parent;
if (outer === null || outer.constructor.name !== "Class") {
  return;
}
if (outer.SourceRange.End === null) {
  outer.SignOut(source);
}
outer.TryToClose();
outer.Quit();
```

## method Clone:()=>Token

克隆自身。

顺序与 `ForBody.Clone` 一致。

```ts
const result = new ClassBody(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
