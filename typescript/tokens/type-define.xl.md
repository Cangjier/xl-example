# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { IsMemberBoundary } from "./declaration-common.xl.md"
import { IsSwitchLabelColon, IsAnnotationUnit, IsTriviaUnit, MatchingQuestionIndex } from "../text-common-util.xl.md"
import { Statement } from "./statement.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
import { Get, ReplaceCountAt, SearchFront } from "../../core/extensions/list-extension.xl.md"
import { JsonObjectCloseRule } from "./json/object-literal.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

类型标注：把 `name: Type` 里的 `: Type` 那一段收成一个 `TypeDefine` 单元。它只在「类型位置」成立——三元表达式的 `?`、以及 Json 对象里的键值对都要排除。

`TypeDefineCloseRule` 写在 `TypeDefine` **之前**，与同目录其它 token 一致。

# class TypeDefineCloseRule extends CloseRule

`Previous` 认的是「内容是 `:` 或 `?:` 的 `SymbolToken`，且**它前面没有** `?`，且它的父单元不是 Json 对象」。最后那条排除很关键：Json 对象里的 `{a: 1}` 也是冒号，但不是类型标注。

`Process` 从冒号**之后**开始收集，直到 `;` / `,` / 赋值符号为止，整段装进 `TypeDefine`。

## static readonly field Instance:TypeDefineCloseRule = new TypeDefineCloseRule()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个类型标注的开头。

判定是一句合取：`index` 处是 `Is(":")` 或 `Is("?:")` 的 `SymbolToken`，并且往前**没有**问号（`SearchFront` 给 `-1`）。命中后再排除父单元是 Json 对象的情况。

判定要调 `JsonObjectCloseRule.Instance.IsObject(...)`（`json-object.xl.md` 里那个方法落成了实例方法）。

```ts
const current = Get(units, index);
if (!(current instanceof SymbolToken)) {
  return false;
}
if (!(current.Is(":") || current.Is("?:"))) {
  return false;
}
if (this.HasTernaryQuestion(units, index)) {
  return false;
}
if (current.Parent !== null && JsonObjectCloseRule.Instance.IsObject(current.Parent)) {
  return false;
}
// **解构绑定里的 `:` 是重命名，不是类型标注**（第 66 轮第八批）：`const { b: c } = x` 的
// `b: c` 在 TS 那边是 `BindingElement` 上的 `propertyName` + `name` 两个字段。
// 少了这一条，产物会把它读成 `<BindingElement><TypeDefine>b: c</TypeDefine></BindingElement>`
// （实测那批 `LiteralType in TypeDefine` 的误包就是从这儿冒出来的）。
if (current.Parent !== null && current.Parent.constructor.name === "BindingElement") {
  return false;
}
// **`case` / `default` 那个标签冒号不是类型标注**（第 553 轮）：`case 1: { … }` 里冒号后面
// 本该是一个 `Block`，可这一趟会把整对花括号收成 `TypeLiteral` ⇒ 段的体整段丢
// （实测 `st-switch-block-case.ts`：`SwitchSegment > SwitchCase > [Identifier(1), TypeDefine > TypeLiteral > …]`，
// `Block` / `VariableStatement` / `BreakStatement` 一个都没有）。
// 判据在 `text-common-util.xl.md` 的 `IsSwitchLabelColon`——`type-literal.xl.md` 的
// `IsTypePosition` 与 `label.xl.md` 的 `Previous` 问的是**同一句**（三处都要挡）。
if (IsSwitchLabelColon(units, index)) {
  return false;
}
return true;
```

## method HasTernaryQuestion:(units:Array<Token>, index:int)=>bool

`index`（一个 `:`）往回扫，撞上的那个 `?` 是不是**三元表达式的**——是的话这个冒号不是类型标注。

原来是 `SearchFront(units, index, item => item.Is("?"))`，也就是「**往前找到过任何** `?`」。
它在两种形状上给错答案，第 855 轮一起收：

- **可选标记 + 注释**：`interface I { refs?/* c */: readonly (A | B)[] }` 里那个 `?` 是**属性上的
  可选标记**，它后面紧接的实义单元就是冒号本身。老的写法照样把 `?` 找出来 ⇒ 判成三元 ⇒
  整段类型标注不收（`TypeOperator` / `ArrayType` / `ParenthesizedType` / `UnionType` 四层一起丢）。
  合成 `?:` 的形状（`refs?: T`）走不到这里，那一支照旧。
- **上一个语句里的 `?`**：`const a = b ? c : d;` 换行 `let x: T` 里，第二个 `:` 往回扫会
  跨过换行、跨过第一个语句的冒号，一路捡到那个三元 `?`（实测 `stmt-ternary-statement-boundary`
  那一族：`TernaryOperator` 整个不成形、类型标注还多出来）。

**判据收窄成「往回扫，撞上边界就停；遇到 `?` 再看它左边有没有条件」**：

- `a ? b : c` / `a ? b/*c*/ : c`：先撞上 `b`（一个操作数），再撞上 `?`，而 `?` 左边有 `a` ⇒ **三元**；
- `refs?/* c */:`：往回第一格就是 `?`，可它左边**只有名字 `refs`**，再往左没有操作数
  （`?` 就在这一格的头部）⇒ **可选标记**，不是三元；
- 上一句的三元：中间隔着一个 `:` 或 `;` ⇒ 停在那里 ⇒ 判假。

**遇到 `:` 那一步要看配对**（第 857 轮）。原来见 `:` 一律 `return false`（「上一个冒号就是
上一条标注的终点」），在**左嵌套三元**里就错了：

    const x = a ? b ? c : d : e;

内层那个 `: ` 收完之后，尾巴 `d : e` 那一段往回扫先撞上 `d`（操作数）、再撞上**内层那个 `:`**
——老写法在这里停，答「不是三元」，于是 `d : e` 被收成一个 `TypeDefine`；
而**外层三元的冒号正是这一格**，它从此被关在 `TypeDefine` 里、外层再也配不上它
⇒ 产物是 `<BinaryOperator>a ? b` + `<TernaryOperator>b ? c : d : e>`
（实测 `ConditionalExpression` 缺 3 漂 1 多 2）。判据是「这个 `:` 配对的 `?` 在**我自己左边**吗」：

- 是（左嵌套里内层那个 `:`）⇒ 它属于**外层**那个三元，跨过去继续往回扫；
- 否（兄弟三元 `a ? b : c ? d : e` 里第一个 `:`——它的配对 `?` 就在它右边）⇒ 照旧停。

配对与三元规则问的是**同一句**（`MatchingQuestionIndex`，落成 `text-common-util` 的模块级函数），
不在这里另写一份。

注释跳过（`IsAnnotationUnit`：行注释 / 区域注释 / 预处理指令），**软换行也跳过**
（`a ?` 换行 `b : c` 是合法的三元排版）。

```ts
let operand = false;
for (let i = index - 1; i >= 0; i--) {
  const item = Get(units, i);
  if (item === null) {
    return false;
  }
  if (IsAnnotationUnit(item) || item instanceof LineWrap) {
    continue;
  }
  const name = item.constructor.name;
  if (name === "Keyword") {
    operand = true;
    continue;
  }
  if (item instanceof SymbolToken) {
    const text = item.TempToString();
    if (text === "?") {
      return operand;
    }
    if (text === ":") {
      // **配对的 `?` 在我左边 ⇒ 这个 `:` 是外层三元的冒号**（第 857 轮）：
      // 跨过去继续往回扫，别在这里停下（停下就把外层的冒号关进 `TypeDefine` 里了）。
      const matched = MatchingQuestionIndex(units, i);
      if (matched !== -1 && matched < i) {
        continue;
      }
      return false;
    }
    if (text === ";" || text === "," || text === "=>") {
      return false;
    }
    if (text === ")" || text === "]" || text === "}") {
      operand = true;
      continue;
    }
    if (text === "(" || text === "[" || text === "{") {
      return false;
    }
    // 其余符号（`.` / `!` / `+` …）都算「左边还有一个操作数」的那一串。
    operand = true;
    continue;
  }
  operand = true;
}
return false;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把冒号之后那一段收成一个 `TypeDefine`，**返回新的下标**。

要点：

- 从 `index + 1` 往后扫，遇到内容为 `;` / `,` 的 `SymbolToken`，或者 `template.SymbolTemplate.IsAssignmentSymbol(...)` 认下的赋值符号，就停在它**前一位**（`endIndex = i - 1`）并跳出。
- **遇到成员边界（换行 + 下一行像新成员）也停**（`IsMemberBoundary`，见下）。
- **遇到语句边界也停**（`Statement.IsLineBreakBoundary`）：换行后面已经是下一条语句时，
  当前这条声明的类型到头了。少了这一条，`let a!: number` 换行 `class C { … }` 里的整个类
  会被收进 `TypeDefine`（实测 `tests/cases/token/declarations/vars-definite.ts`）。
  合法折行不受影响：`A |` 换行 `B`（`|` 要右操作数）与 `A` 换行 `| B`（`|` 能续接）都不是语句边界。
- 一路没遇到终止符就把 `endIndex` 取成 `units.length - 1`。
- 收集期间每个单元都要非空，取不到就抛错。
- 新单元用**当前单元**（`index` 处那个）作为 `Parent` 的来源：先 `new` 再赋值。
- 收集到的一批单元用 `AddRange` 整批加入；终点取**最后一个收集项**的 `End`。
  **但尾部 trivia 不参与算终点**（第 902 轮，片段普查当场逮到的）：
  `catch (e: unknown/*c*/)` 里那条注释是**尾部 trivia**——它被收进来是对的
  （产物 XML 里它在 `<TypeDefine>` 里），可**区间**带上它就不对了：
  投影出来的 `VariableDeclaration` 右界会多出注释那一段
  （实测 TS[14,24) vs 产物[14,29)，漂 1 + 多 1）。
  与 `Statement.FirstMeaningful` 是同一件事、方向相反：**那个跳前导、这里跳尾部**。
  只跳**尾部**那几格：中间夹注释的类型标注（`A /*c*/ | B`）一个字都不动。
- **收集为空时什么都不做、返回原下标**：冒号后面直接就是终止符（`units[index + 1]` 是 `;` / `,` / 赋值符号）
  会走到这里。少了这一步，`items[items.length - 1]` 取的是 `items[-1]` → `undefined`，
  下一句读 `.SourceRange` 就抛**裸 `TypeError`**（实测：返回类型被 `import` / `abstract` 截断时
  `ReturnType` 里只剩一个冒号，就是这个形状）。空 `TypeDefine` 不携带信息，不如不动。
- 批量替换用四参数的 `ReplaceCountAt`（三个参数的版本才叫 `ReplaceAt`），返回的 `index` 就是新下标。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const items: Token[] = [];
let endIndex = -1;
for (let i = index + 1; i < units.length; i++) {
  const item = Get(units, i);
  if (item === null) {
    throw new Error("item 为空");
  }
  if (item instanceof SymbolToken && (item.Is(";") || item.Is(",") || template.SymbolTemplate.IsAssignmentSymbol(item.TempToString()))) {
    endIndex = i - 1;
    break;
  }
  if (item instanceof LineWrap && (IsMemberBoundary(units, i) || Statement.IsLineBreakBoundary(units, i))) {
    endIndex = i - 1;
    break;
  }
  items.push(item);
}
if (endIndex === -1) {
  endIndex = units.length - 1;
}
if (items.length === 0) {
  return index;
}
const result = new TypeDefine(template);
result.Parent = current.Parent;
// **「冒号那一格是 `?:`」这件事只有这里记得住**（第 996 轮）：`?` 与 `:` 被词法并成
// **一格** `SymbolToken("?:")`，它是 `Process` 的 `current`（`index` 处那一格），
// 而收集进 `Data` 的是 `index + 1` 之后的单元 —— 于是那个 `?` 既不在 `Data` 里、
// 也不是任何叶子，只活在 `SignIn(current…)` 给出的**区间起点**上。
// 消费它的那一层（`Field` / `Parameter` 的可选标记）要的就是「这个 `?` 在哪」这一格：
// 记下来之后，直出版不必再回原文读那个字符。
result.QuestionAt =
  current instanceof SymbolToken && current.Is("?:") ? current.SourceRange.Start!.Index : -1;
result.AddRange(items);
// **终点跳过尾部 trivia**（第 902 轮，第 934 轮补齐软换行那一档）：`IsTriviaUnit` 是
// 「注释 + 软换行」那一格。第 902 轮只跳了 `IsAnnotationUnit`（**不含软换行**，理由写的是
// 「软换行落在类型段里是排版、不是尾部注释」）——那句话对**中间**成立，对**尾部**不成立：
// 行注释会把它后面那个换行一起吃进来（TS 的 trailing trivia），于是
// `type T = [a: string//c` 换行 `, b?: number];` 的 `TypeDefine` 收集到
// `[string, LineAnnotation, LineWrap]`、按 `IsAnnotationUnit` 跳完尾部**还剩那个换行**
// ⇒ `SignOut` 落在换行末尾、区间比类型多一格 ⇒ 装它的 `NamedTupleMember` / `Parameter`
// 跟着多一格（实测 TS[10,18) vs 产物[10,22)）。口径与第 920 轮 `SignatureTailEnd` 那一句
// 一致（那里借 `SkipPreviousTrivia` 一步问完）：**区间的右端取最后一个实义单元**。
let tail = items.length - 1;
while (tail > 0 && IsTriviaUnit(items[tail])) {
  tail = tail - 1;
}
result.SignIn(current.SourceRange.Start!);
result.SignOut(items[tail].SourceRange.End!);
result.TryToClose();
return ReplaceCountAt(units, index, endIndex - index + 1, result);
```

# class TypeDefine extends IndependentToken
一段类型标注（`name: Type` 里的 `: Type`）。

单元值类型是单字符的 `string`。

它**没有**覆写 `ToXmlString`，所以 XML 由基类产出：`<TypeDefine>段内子单元的 XML 串接</TypeDefine>`（标签名即运行时类名）。

## field QuestionAt:int = -1

这个类型标注前面那个 `?` 的**位置**；不是可选标注时是 `-1`。

`a?: T` 的 `?` 与 `:` 被词法并成**一格** `SymbolToken("?:")`，它在 `TypeDefineCloseRule.Process`
里就是 `current`、**不进 `Data`**（收集的是它**之后**的单元），所以这个 `?` 在 token 树上
没有任何叶子承载它——只活在 `TypeDefine` 自己的区间起点上（`SignIn(current…)`）。
要判「有没有那个 `?`」而**不回原文读那个字符**，就得把位置记在这一格上。

消费它的有 `field.xl.md` / `lamda/lamda-parameter.xl.md` 的 `PrintDirectAst`：
它们从自己的 `Data` 里取出那个 `TypeDefine`，读这一格（见 `core/syntax/token.xl.md` 的 `PrintDirectAst`）。

## method ToDictionary:()=>Map<string, any>

类型名 + 子单元，**外加 `questionAt` 这一格**（第 998 轮；`>= 0` 时才写）。

为什么它进字典而**不进 XML**：XML 那一侧的名字与形态**一个字都不动**
（`<TypeDefine range="…">…</TypeDefine>`，见基类那一份），而这一格要**跨节点**被读——
消费它的是 `Field` / `Parameter` / `MappedType` 的直出版，它们手上只有**子单元的视图**
（`ctx.Kids` 给的那一份），不是 `TypeDefine` 的实例，所以「值记在字段上」这一条
必须经字典（和 `While` 的 `emptyBodyAt` / `headerCloseAt` 那几格同一个入口：
`v.attrs.get(…)` / `ctx.Attr(…)`）。

基类那一份（`type` + `children`）逐句照抄，只多末尾那一格——「空子单元不写 `children`」
这条口径因此原样保留。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
if (this.Data.length !== 0) {
  const children: Array<any> = [];
  for (const item of this.Data) {
    children.push(item.ToDictionary());
  }
  result.set("children", children);
}
if (this.QuestionAt >= 0) {
  result.set("questionAt", this.QuestionAt);
}
return result;
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

```ts
  // **第 993 轮**：`ctx.TextOf` → `ctx.ValueOf` —— 只读那一格**自己记的**值，
  // 不回原文兜底（见 `core/syntax/token.xl.md` 的 `PrintDirectAst`）。
  const kids = ctx.Kids(v);
  const colon = kids.find((k: any) => k.Tag() === "SymbolToken" && ctx.ValueOf(k) === ":");
  const afterColon = colon === undefined ? kids : kids.slice(kids.indexOf(colon) + 1);
  const projected = ctx.TypeExpression(afterColon);
  if (projected === undefined) {
    ctx.unmapped.add("TypeDefine(空)");
    return ctx.Node("TypeReference", {}, v);
  }
  return projected;
```


## constructor:(template:Template)=>void

转调基类构造器，**并且把自己的规则队列装上**。

本单元是收尾规则建出来的，它的内容（`:` 之后的类型文本）**没有**再被外层扫过一遍：
外层那一趟里 `KeywordCloseRule` 排在**最后**（这是必须的，结构规则要先看到 `Identifier`），
而 `TypeDefine` 在它之前就把类型文本收走了——类型位的关键词于是永远停在 `Identifier` 上
（`function f(): void {}` 的 `void`、`let x: readonly string[]` 的 `readonly` 都这样）。
给本单元挂上**类型队列**（只有 `KeywordCloseRule` 一条，见
`../../parse-pipeline.xl.md` 的 `InitialKeywordCloseRuleQueue`）之后，它关闭时会再跑一趟，
`KeywordCloseRule` 这一趟就能看见里面的词。

用类型队列而不是通用队列：通用队列里的 `TernaryOperatorCloseRule` 会把**条件类型**
`T extends U ? A : B` 收成表达式三元——类型位的 `? :` 不是三元表达式。

```ts
super(template);
ParsePipeline.InitialKeywordCloseRuleQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new TypeDefine(this.Template);
result.Sign(this);
// **`QuestionAt` 也要抄**（第 996 轮）：它不在 `Data` 里、`Sign(this)` 抄不到它，
// 漏了这一格克隆体就丢掉「这个标注是不是可选的」（与 `While` / `Try` 那几个位置字段同一条）。
result.QuestionAt = this.QuestionAt;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
