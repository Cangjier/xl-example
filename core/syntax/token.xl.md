# dependencies
```xl
import { SourceException } from "../exceptions/source-exception.xl.md"
import { Branch } from "./branch.xl.md"
import { CloseRule } from "./close-rule.xl.md"
import { TokenFormer } from "./token-former.xl.md"
import { Source } from "./source.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Template } from "./templates/template.xl.md"
import { Sequence } from "./templates/sequence.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

`Token` 是整棵树的地基：它记录自己覆盖的源码范围、自己的子单元、以及处理每个字符时该跑哪些跳转与收尾规则。

# class Token

Token，语法树的地基。

`Default` / `Close` / `Process` / `Clone` 四个抽象成员写成抛错桩。

树有两个出口：**XML**（`ToXmlString`，给人读、给测试当夹具）与 **JSON**（`ToDictionary` / `ToList`，
给下游程序读）。两者同源——`ToDictionary` 就是「这个节点在 XML 里的标签名与属性，加上子单元」，
所以**属性名的唯一事实来源仍是 `ToXmlString`**：改了那处拼串，这里必须一起改，
否则同一棵树会在两个出口上说两套话。

JSON 的形状照抄上游 Cangjie 的 `Token.ToDictionary` / `Token.ToList`：

| 形状 | 什么时候 | 例 |
| --- | --- | --- |
| `{ type, children }` | 容器节点（子单元是「内容」） | `Root` / `Class` / `Bracket` |
| `{ type, <段名>: Array<..> }` | 有具名分段的节点（分段各是一个数组） | `For` 的 `initial` / `compare` / `next` / `body` |
| `{ type, value }` | 叶子节点（文本块） | `Identifier` / `SymbolToken` / `Keyword` |

**坐标补在 `ToList` 那一层**：`ToList` 给每个子节点补一个 `[起始下标, 结束下标]`，
所以带 `range` 的节点正好是「被某个 `ToList()` 收进来的那些」——根那一层，
以及各 token 用 `ToList()` 装的段数组里的节点；`ToDictionary` 自己不带坐标。与上游一致。

## field Template:Template

本单元使用的模板。

## field ProcessQueue:Sequence<Branch> | null = null

从当前单元跳到下一个单元的跳转队列。由各 token 在自己的构造器里从 `Template.BranchTemplate` 取。

## field CloseRuleQueue:Sequence<CloseRule> | null = null

本单元关闭之后 `ApplyCloseRules` 要跑的规则队列（第 562 轮从 `CloseRuleQueue` 改名）。

它从前是**全局重组那一趟**的输入，第 561 轮把那一趟删掉之后只剩 `ApplyCloseRules` 这一个读点
⇒ 名字里那个「重组」不再指向任何还活着的东西，所以改掉。

`null` = 这个类没有收尾规则 —— 收敛环对它就一条规则都不跑（`FormStatement` 那条钩子照旧跑）。

## field Parent:Token | null = null

父单元。

## field Data:Array<Token> = []

子单元。

## field MountedUnit:Token | null = null

当前挂载的子单元：非空时本单元把 `Process` 直接转给它。

## field SourceRange:SourceRange = new SourceRange()

本单元覆盖的源码范围。

## field LastSource:Source | null = null

上一次处理的字符位置。

## field Closed:bool = false

本单元是否已关闭；关闭后不再接收字符。

## constructor:(template:Template)=>void

以模板创建。

```ts
this.Template = template;
```

## method Last:(index?:int)=>Token | null

倒数第 `index` 个子单元；越界返回 `null`。

```ts
const position = this.Data.length - 1 - (index ?? 0);
if (position >= 0 && position < this.Data.length) {
  return this.Data[position];
}
return null;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

所有跳转都不接手时的兜底处理。

抽象方法。`Root.Default` 会在这里报「未知字符」。

```ts
throw new Error("abstract member: Default");
```

## protected method Close:()=>void

关闭本单元。

抽象方法；绝大多数实现只做 `Closed = true`。

```ts
throw new Error("abstract member: Close");
```

## method TryToClose:()=>void

尝试关闭：范围必须已签入签出，然后**先补解析期那一手**、再关闭。

约定：`SourceRange` 只能赋值一次；`Close` 之前它必须已赋值；新建单元时上一个单元必须已关闭。

**`ApplyCloseRules` 的位置**（第 487–488 轮）：夹在 `Close` 的**后面** ——
那几条规则在全局那一趟里跑的就是「每个单元关闭时、在它自己的 `Data` 上」，
放这里与当初**同一时机**；而解析期那些端口（`LetBranch` 那一族）跑在关闭**之前**，
所以它们照旧看得见升级前的形状（`Identifier` 形态的 `let` / `const`）。
**放进 `Close` 之前会当场踩到那一片**。

**这里曾经还有一句 `this.Reorganize()`**（第 561 轮删掉，按用户指示逐步移除 reorg）：
那是「全局重组那一趟」的**唯一入口** —— 单元关闭之后、在自己的子单元列表上把
相邻的若干单元合并成更高层的结构。它默认就关着（`DSH_XL_REORG=1` 才恢复，第 471 轮），
第 561 轮把入口本身与那两个环境开关一起摘掉 ⇒ 现在**没有第二条成形路径**：
产物就是 `ApplyCloseRules` 这一趟长出来的样子。

```ts
if (this.SourceRange.Start === null || this.SourceRange.End === null) {
  throw SourceException.SourceRangeContainsNull;
}
this.Close();
this.ApplyCloseRules();
```

## method ApplyCloseRules:()=>void

**关闭之后**的一次机会：把规则的收敛环在这一层上跑一遍（第 487–488 轮）。

**只转发给成形器**：`core` 这一层不认识 `Keyword` / `Function` / `TypeDefine` 那些
（见 `token-former.xl.md`）。

**第 561 轮起它就是唯一那一趟**：从前这里有一道 `DSH_XL_REORG === "1"` 的早退
（对照态里由全局重组那一趟跑同一批规则，两趟都跑会改掉彼此的输入 ——
实测不关的对照态从 855 / 1037 掉到 **401**）；全局那一趟随 `Reorganize` 一起删掉之后，
「对照态」这个档位不再存在，那道早退也就没有了对象（`FormStatement` 那条钩子照旧不关：
实测让它照跑反而更好，855 对 692，见 `typescript/tokens/statement.xl.md`）。

**收尾之后补一次 `Parent`**（第 623 轮）：规则用 `ReplaceCountAt` 把一段单元换成一个新节点，
而那是核心的 `splice`、**不设 `Parent`**（只有 `Add` / `AddRange` 才设）⇒ 换进来的节点
`Parent` 仍是 `null`。凡是从「当前单元的父亲」推容器的规则（`TupleMemberCloseRule.TupleOf`、
`type-bracket` 的 `IsTypeContainerUnit(current.Parent)` …）都会因此**判不出容器**。
实测：`type E = [infer U, ...string[]]` 的第一个实义单元是替换出来的 `InferType`（`Parent` 为 `null`）
⇒ 元组成员那一条的锚点找不到 ⇒ `...string[]` 只剩一个裸 `...`（缺 `RestType` / `ArrayType`）。

**只补 `null`**（不覆盖已有的值）：一个单元已经指着别的父亲，说明它**故意**挂在那儿
（挂载链 / 共享单元），这里不替它改主意。这条不变式的另一面是 `Add`：
`Data` 里的单元要么指 `this`、要么还没认过父亲 —— 后者只可能来自 `splice`。

```ts
Token.Former.ApplyCloseRules(this);
for (const item of this.Data) {
  if (item.Parent === null) {
    item.Parent = this;
  }
}
```

## method MoveDataTo:(target:Token)=>void

把所有子单元搬给 `target`，然后清空自己的。

```ts
for (const item of this.Data) {
  target.Add(item);
}
this.Data.length = 0;
```

## method Add:<Item extends Token>(item:Item)=>Item

加一个子单元，并把它的父设为自己。

```ts
item.Parent = this;
this.Data.push(item);
return item;
```

## method AddRange:<Item extends Token>(items:Array<Item>)=>Token

加一批子单元，返回自身。

它与单元素版参数个数相同，ts 无法靠重载区分，所以叫 `AddRange`。

```ts
for (const item of items) {
  item.Parent = this;
}
this.Data.push(...items);
return this;
```

## method AddAndCloseLast:<Item extends Token>(item:Item)=>Item

加一个子单元；如果最后一个子单元还没关闭，先关掉它。

```ts
const last = this.Last();
if (last !== null && !last.Closed) {
  last.TryToClose();
}
return this.Add(item);
```

## method AddToMounted:<Item extends Token>(item:Item)=>Item

加一个子单元并把它设为 `MountedUnit`。

```ts
this.MountedUnit = this.AddAndCloseLast(item);
return item;
```

## method Quit:()=>Token | null

从父单元卸载自己，返回父单元。

```ts
if (this.Parent !== null) {
  this.Parent.MountedUnit = null;
}
return this.Parent;
```

## method Owns:(source:Source)=>bool

当前字符是不是**本单元的收尾符**——也就是「这个字符归我，挂在我下面的子单元不许吃掉它」。

默认 `false`：绝大多数单元没有这样的字符（`Root` 永不结束、`Statement` 那一族由重组收尾）。

**为什么要有这一条**：一个单元一旦成了父单元的 `MountedUnit`，父单元就**再也看不到任何字符**了
（`UnitToken.Process` 第一句就是「有挂载单元就转给它」）。所以挂在别人下面的**解析期单元**
（`PendingUnit` / 各种向导）必须能问出「外层还有没有人在等这个字符」，否则外层的 `}` 会被它吞掉、
父括号永远等不到自己的结束符，整棵树**停在那里**——不抛错、也不出节点，是那种最难查的静默故障。

问法是**往上走一遍**（见 `IfGuide.OwnedByAncestor`），不在这一层做聚合。

```ts
return false;
```

## static field Former:TokenFormer = new TokenFormer()

**成形器**（第 486–488 轮）：`FormStatement` 与 `ApplyCloseRules` 的落地实现。

默认就是抽象那一份（调用即抛）——`ParsePipeline.Install` 会把 `TokenFormerImpl.Instance` 装进来。
「装配是调用方的责任」这句与模板那一套是同一条口径：解析不可能早于 `Install`
（`typescript/tokens/root.xl.md` 的构造器里那条契约检查管着）。

## method FormStatement:(terminator:Token)=>void

终结符（`;` / 软换行）**已经进 `Data` 之后**的一次机会：宿主可以据此把刚才那一段收成一条语句壳。

**它是空钩子，但转发给成形器**：`core` 这一层不认识 `typescript` 的语句类（见
`token-former.xl.md` 那一处说明），所以这里只问 `Token.Former`。
两个调用点在 `typescript/tokens/symbol-token.xl.md` 与 `line-wrap.xl.md` 的 appender 里，
**紧跟 append 之后** —— 那是唯一同时满足「轮得到」「终结符已在列」「切片口径正确」三条的位置
（第 481–486 轮逐条量出来的）。

```ts
Token.Former.FormStatement(this, terminator);
```

## method Process:(context:SyntaxContext, source:Source)=>void

处理一个字符。

```ts
throw new Error("abstract member: Process");
```

## method SignIn:(source:Source)=>Token

签入：把范围起点设为 `source`。起点只能设一次。

```ts
if (this.SourceRange.Start === null) {
  this.SourceRange.Start = source;
  return this;
}
throw SourceException.SourceRangeStartIsSetted;
```

## method SignInToken:(token:Token)=>Token

用另一个单元的起点签入。

```ts
if (token.SourceRange.Start === null) {
  throw SourceException.SourceRangeStartIsNull;
}
return this.SignIn(token.SourceRange.Start);
```

## method SignOut:(source:Source)=>void

签出：把范围终点设为 `source`，并让最后一个子单元递归签出。终点只能设一次。

```ts
if (this.SourceRange.End === null) {
  this.SourceRange.End = source;
  if (this.Data.length !== 0) {
    this.Data[this.Data.length - 1].TrySignOut(source);
  }
} else {
  throw SourceException.SourceRangeEndIsSetted;
}
```

## private method TrySignOut:(source:Source)=>void

递归签出：只在终点还没设过时往下传。

它与 `SignOut` 的差别是**不抛异常**——遇到已签出的子单元就停。

```ts
if (this.SourceRange.End === null) {
  this.SourceRange.End = source;
  if (this.Data.length !== 0) {
    this.Data[this.Data.length - 1].TrySignOut(source);
  }
}
```

## method SignOutToken:(token:Token)=>void

用另一个单元的终点签出。

```ts
if (token.SourceRange.End === null) {
  throw SourceException.SourceRangeEndIsNull;
}
this.SignOut(token.SourceRange.End);
```

## method Sign:(token:Token)=>void

用另一个单元同时签入与签出。

```ts
this.SignInToken(token);
this.SignOutToken(token);
```

## method Undo:(source:Source)=>void

回退：找到覆盖 `source` 的子单元，让它回退。

`WhichUnitRangeContains` 可能返回 `null`，所以要判空再转发。

```ts
const undoUnit = this.WhichUnitRangeContains(source);
if (undoUnit !== null) {
  undoUnit.Undo(source);
}
```

## method IsUndo:(source:Source)=>bool

能不能回退。

```ts
const undoUnit = this.WhichUnitRangeContains(source);
if (undoUnit !== null) {
  return undoUnit.IsUndo(source);
}
return false;
```

## method WhichUnitRangeContains:(source:Source)=>Token | null

从后往前找第一个覆盖了 `source` 的子单元。

```ts
for (let i = this.Data.length - 1; i >= 0; i--) {
  if (this.Data[i].SourceRange.IsInRange(source)) {
    return this.Data[i];
  }
}
return null;
```

## method Replace:<Item extends Token>(item:Item)=>Item

在父单元里用 `item` 顶替自己，位置不变。

原地替换靠两次 `splice`：先插在当前位置，再删掉原来的自己。

```ts
if (this.Parent === null) {
  throw new Error("没有父单元");
}
const index = this.Parent.Data.indexOf(this);
if (index === -1) {
  throw new Error("自身不在父单元的子单元里");
}
item.Parent = this.Parent;
if (this.Parent.MountedUnit === this) {
  this.Parent.MountedUnit = item;
}
this.Parent.Data.splice(index, 0, item);
this.Parent.Data.splice(index + 1, 1);
return item;
```

## method RemoveSelf:()=>void

从父单元里移除自己。

```ts
if (this.Parent === null) {
  throw new Error("没有父单元");
}
const index = this.Parent.Data.indexOf(this);
if (index === -1) {
  throw new Error("自身不在父单元的子单元里");
}
if (this.Parent.MountedUnit === this) {
  this.Parent.MountedUnit = null;
}
this.Parent.Data.splice(index, 1);
```

## method ToXmlString:()=>string

产出 XML：标签名是**运行时类型名**，开标签上带 `range`，内容是子单元的 XML 串接。

标签名取 `this.constructor.name`，所以类名就是它产出的 XML 标签名。

**开标签上的 `range="[起,止]"`**：口径与字典那一层的 `range` 键同一处
（`RangeOf` 那一段写着为什么必须同一个来源）。XML 从前没有坐标——坐标只活在
`ToList()` 那一层；第 987 轮起两个出口都印，为的是让 `cases:astjson` 那条
「XML 的每个属性在 JSON 里同名同值」有一条真在核的断言。

**第 1016 轮之后这一格没有任何门看着**：出口 2（`--ast-json`）与那门（`cases:astjson`）
一起删了，这一格**按用户口径留着**（XML 的读者要坐标），但它今天靠的是这条口径本身、
不是一条会红的判据——见 [docs/ast-json.md](../docs/ast-json.md) 第 5 节。

**覆写了本方法的 token 都要自己补上这一格**：属性是逐个 token 拼出来的，
没有一处能替它们统一加（`Bracket` / `Let` / `String` / `Import` … 二十多处各拼各的）。
按「类名 + `range` + 各自那几个属性」的顺序写，顺序不影响任何判据（按名取值）。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} range="${this.RangeOf()}">${temp.join("")}</${name}>`;
```

**标签名就是全部**：从前这里还有一个 `DSH_XL_TRACE=1` 的诊断档 ——
它把「这个单元是谁造的」打进标签（`xl:born="…"`），而那个口径的两端**都已经不在了**：
写点随第 561 轮删掉全局重组那一趟一起消失（`Token.CreatedByRule` 从此恒为空串），
读点也就只能打出一个**与标签名一模一样**的值 —— 一个什么都换不来的环境开关
⇒ 第 565 轮连同那两个字段一起摘掉（与本仓删 `DSH_XL_REORG` / `DSH_XL_NO_REORG` 同一条口径）。

## method ToString:()=>string

`Root.ToString()` 就是 XML 的入口。

```ts
return this.ToXmlString();
```

## property children:Array<Token>

**这一格的子单元**（第 1018 轮）：`Data` 里那一批，原样给出。

它是**属性**（`### get`）而不是方法：调用方读的是「这一格有什么」，不是「让它去做一件事」。
形态与覆写页必须一致（都是 `## property` + `### get`）——`Foreach` 那种「子单元里要跳过
定义 / 可枚举 / 体三段」的页在自己那一页覆写这一格时照抄同一形态。

**给出的就是单元自己**（不是它的什么中间形态）：投影直接吃 token，见
`typescript/print-ast-common.xl.md`。所以这一格没有第二层，也没有坐标要补——
坐标住在每个单元自己的 `start` / `end` 上。

### get

```ts
return this.Data;
```

## method ChildrenOf:(segment:Token | null | undefined)=>Array<Token>

**某一段的子单元**（第 1018 轮）：那一段还没挂上（`null` / `undefined`）时给**空列表**。

各页的段属性（`compare` / `body` / `parameters` …）都经这一格取值：读的是「这一格有什么」，
没有那一段就是**没有**，不是一个要点出来的错——投影那些读点本来就按空列表处理
（`kidsOf` 给的是空数组，与搬掉字典之前「字典里没有这个键」逐字节同答）。

```ts
if (segment === null || segment === undefined) {
  return [];
}
return segment.Data;
```

## property start:int

**这一格在原文里的起点**（AST 那一层的 `pos`）：就是 `RangeStart()`。

坐标只有一个来源（`SourceRange` 的两头），这一格只是把它接到投影读得懂的名字上——
「AST 缺什么，就让 token 承担责任」：投影不再自己去拼坐标。

### get

```ts
return this.RangeStart();
```

## property end:int

**这一格的终点，开区间**（AST 那一层的 `end`）：`RangeEnd() + 1`。

与 `start` 同一处来源、同一条口径；两头的兜底（还没签入 / 签反了）都写在 `RangeStart` / `RangeEnd` 里。

### get

```ts
return this.RangeEnd() + 1;
```

## method RangeStart:()=>int

本单元的起点：`SourceRange.Start` 的 `Index`；**还没签入**时写 `0`（`WithRange` 那一节的口径）。

```ts
return this.SourceRange.Start === null ? 0 : this.SourceRange.Start.Index;
```

## method RangeEnd:()=>int

本单元的终点：`SourceRange.End` 的 `Index`；**还没签出、或签反了**（`end < start`）时，
取**子单元终点的最大值**兜底 —— 理由见 `WithRangeOf` 那一节（`if (… else …)` 的 `IfSegment`
只有起点、终点从来没签过，直接用两头会给出 `[55,0]` 这种反序区间）。

```ts
const start = this.RangeStart();
let end = this.SourceRange.End === null ? 0 : this.SourceRange.End.Index;
if (end < start) {
  for (const item of this.Data) {
    const childEnd = item.RangeEnd();
    if (childEnd > end) {
      end = childEnd;
    }
  }
}
return end;
```

## method RangeOf:()=>string

本单元的区间，**印成属性值的样子**：`[起始, 结束]`（闭区间、方括号、逗号之间不留空）。

**坐标只有一个来源**：`SourceRange` 的两头 —— 起点走 `RangeStart`、终点走 `RangeEnd`
（终点缺失/反序时取子单元最大值兜底）。两个出口都用它：

- 第三出口的 `range` 键：`WithRangeOf` 的 `node.set("range", [this.RangeStart(), this.RangeEnd()])`；
- **第一出口（XML）开标签上的 `range="…"`**：就是本方法。

**为什么必须同一处**：两个出口各算一遍，`IfSegment` 那种只有起点的单元就会给出**不同的数**，
而 `cases:astjson` 那一门（第 884 ~ 1015 轮）正是逐属性核「XML 的每个属性在 JSON 里同名同值」。
**那一门今天不在了**（第 1016 轮随出口 2 一起删，见 `ToXmlString` 那一节）：
两个出口仍然共用这一处，但**不再有一条会红的判据替你看着它**。

```ts
return "[" + this.RangeStart() + "," + this.RangeEnd() + "]";
```

## method Tag:()=>string

**这一格是什么**（第 1005 轮）：答**自己的类名**。

它是「产物标签」这一格事实的**唯一出口**——三种读法说的都是「这一格叫什么」：
XML 的标签名、字典（[docs/ast-json.md](../docs/ast-json.md) 那份规格说它叫 AST JSON 出口）的 `type`、
TS 形状那一层的 kind 判据（`PrintDirectAst` 里那些 `=== "Identifier"` 这一类的比较）。
**第 1016 轮只删了命令行那一条路**（`--ast-json` 与它的尺子 `cases:astjson`）：
字典这一侧的三种读法仍然都在，规格文件也还在。

**为什么要有这一格**：直出版的判据是「只用 token 自己的东西，不回原文查、不按字符串查字典」，
而「这一格是不是 `SymbolToken`」过去写成 `k.get("type") === "SymbolToken"` ——
**字符串键进字典里取一个值**，正是那条判据要消掉的东西（全语料 173 处）。
类名本来就是 `this.constructor.name`，**不必经字典**：所有出口的 type 都是按它写的
（XML 取 `this.constructor.name`、字典取它当 `type`），所以三种读法说的是同一份事实。

**字典那一侧**（`print-ast-common.xl.md` 的 `annotate`）也答同一格、答同一个串，
因为 `.get("type")` 的接收者有时是**字典格**（`ctx.Kids` 回来的那些）而不是 token 本身——
两边必须同名同值，否则同一个问句会按接收者给出两个答案。

```ts
return this.constructor.name;
```

## method NameField:()=>string | undefined

**这一格自己的名字**（第 1006 轮）：名字住在**这一页自己的哪个字段**上，由这一页回答；
名字不在字段上（是子单元、或者根本没有名字）就答 `undefined`。

**为什么这一格必须存在**：投影要问「这一格叫什么」时，过去是拿一张**字符串名单**
在 token 上逐个试（`owner["name"]` / `owner["fieldName"]` / `owner["namespace"]`）——
那是**按字符串键查 token**，与直出版那条判据要消掉的东西同一族；
而且那张名单读起来像「所有 token 共有的三个字段」，实测**每一页只有一个**
（`name` 六页、`namespace` 三页、`fieldName` 两页、`name:TokenField<string>` 三页）。
名字是**这一页自己的事实**，所以由这一页答，投影只读一个入口。

**基类答 `undefined`**＝「我的名字不在字段上」：名字是**子单元**的那些页
（`MethodDeclaration` 的名字是一格 `Identifier`）不覆写这一格，
投影于是退回字典那个 `name` 键（那是**段**，不是字段）。

```ts
return undefined;
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与 `PrintDirectAst` 出**同一个答案**，但只许用**这个 token 自己**的东西——
属性、子单元（`Data` / 视图里的 `segments`）、以及 `Parent`。

**它与 `PrintDirectAst` 的分工**：`PrintDirectAst` 是「这一格出哪个节点」的**现状**，而那一层里混着
**回原文查**的路（`ctx.Text` / `ctx.TextOf` / `ctx.StringText` / `ctx.source`，以及跟在后面的
`indexOf` / `slice` 这类二次搜刮）。回原文查是**第二份近似**：同一个事实解析期已经知道过一次
（名字在哪里、括号配对到哪里、这个 `;` 属不属于上一条语句），投影再猜一次，
两份答案就会在「注释里有个同名的词」「字符串里有个假括号」这种输入上悄悄分叉。
直出版把这一格**重新按解析期已有的东西说一遍**；缺什么就**给 token 补上那个属性**
（与 `NameAt` / `NameRange` / `BodyBrace` 那几格同一条口径），而不是回原文猜。

**两条判据（都已经进 `npm run gates`）**：

1. **同答**：覆写了这一格的 token，投影**优先问它**；整个语料跑两遍（直出通道开 / 关）
   产物必须**逐字节相同**——那是 `cases:direct`。不一样就是这一格写错了，不是「另一种口径」；
2. **只用 token 自己的东西**：这一格的方法体里**不许**出现 `ctx.source` / `ctx.Text` /
   `ctx.TextOf` / `ctx.StringText`，也不许把问题**转手**回 `this.PrintDirectAst`——`direct:lint` 逐页扫。
   要问「某个子单元的值」时走 `ctx.ValueOf`（只读那一格自己记的值，**不回原文兜底**）。
   **也不许按字符串键查**：`.get("…")` / `.set("…")` / `.has("…")` 与 `ctx.Attr(视图, "键")`
   （第 1012 轮补上最后这一族，实测 23 处 / 10 页，全部换成属性读）。
   **为什么 `ctx.Attr` 也算**：它内部就是 `view(node).attrs.get(key)`——问的还是「字典里那个键存了什么」，
   而**属性名是编译期就知道的那个词**：视图上本来就挂着同名属性（`view()` 把 `attrs` 抄到视图自己身上），
   所以 `ctx.Attr(v, "questionAt")` 与 `v.questionAt` 逐字节同答，后者才是「读这一格自己的属性」。
   只认**字面量**那一档：`ctx.Attr(x, 某个变量)` 不是按字符串键查。

**基类答 `undefined`**＝「我没有直出版，照旧走 `PrintDirectAst` / 通用支」：与 `PrintDirectAst` 同一个约定，
所以这一格可以**逐页**搬——搬一页多一页直出，`projectRoot` 返回的 `direct` 记账量的就是这个数。

**第 1015 轮：`ctx` 上那三个「回原文」的出口整条删掉了**——判据②从「大家记得别写」
变成**结构上做不到**。老路（`PrintAst`）删掉之后，`typescript/print-ast-common.xl.md` 的
`const ctx = { … }` 里 `Text` / `TextOf` / `StringText` 三个出口就只剩注解里的名字
（全仓唯一一处真实调用是 `method.xl.md` 的 `ctx.TextOf(inner) === ","`，改成 `ctx.ValueOf`），
于是连同另外六个没人用的（`Value` / `Members` / `IsSymbol` / `IsDot` / `SkipSourceTrivia` /
`MatchingBrace`）一起删掉：**出口 82 → 73 个**。
**为什么删掉之后还要立一条判据**：出口没了，判据②那句「不许用 `ctx.Text(`」就永远绿
——它守的是一句已经无路可走的话；而 helper 那一层方法体判据**天生覆盖不到**
（第 1008 轮实测：按字符串键查正是在 helper 里活下来的）。
所以 `direct:lint` 加的是**能力面**那一条：`ctx` 的键表里不许再出现这九个名字，
谁想加一个方便的出口就得先把这一条说服。**这一条自己验过**：把 `Text` 挂回去 ⇒
`ctx 出口 74 个 / 1 处`、`exit=1`；还原 ⇒ 0 处、`exit=0`。
（`ctx.source` 是唯一留下的「原文那一格」——通用支与 helper 那一层还要用它，
所以它由判据②逐页扫方法体守着，而不是从出口表里删掉。）

**搬一页时要先问「这一页是几件事」**（第 1003 轮从 `Bracket` 那一页量出来的）：
`Bracket` 一个类装着三种括号、两种身份（`{` 是块节点、`(` / `[` 是分组包装），
而**落回清单只数「这一页答不答」**、不数「这一页答得对不对」——
所以「答一个形状」看上去能让那 43 次落回清零，实际上是把两种身份压成一种。

**同一个类里两种身份要各答各的**：包装那一档答 `ctx.Nothing` 之前，
先问「通用支那一趟会不会数到这一格」——**会数到就不能答 `Nothing`**
（`projectNode` 开头的 `ctx.count++` 在**问这一格之前**，`Nothing` 是「连问都不再问」，
于是那一格从 `count` 账上消失，`cases:direct` 的第三项当场差数）。
让回通用支（答 `undefined`）才是「摊平与记账都还是原来那一份」。

**搬这一格还要看别的门**：`direct:lint` 只判「这一格的方法体里有没有回原文查」，
它**看不见**「这一格把哪些场景弄坏了」——那是 `coverage` 那一栏（`blocked`）的账。
所以一页搬完要跑的是 `npm run gates` **整串**，不是只看 `cases:direct` 那两道。

**量出来的答案往往是「一种身份能直出、另一种不能」**（第 1004 轮从 `Bracket` 那一页量出来的
正面用法）：这一页的 43 次落回量下来是**两件**事——30 个 `{`（语句位的块）能逐句照搬通用支的
那一条裸块分支（判据 `startBracket` **只有这一格自己的属性**），13 个 `(` / `[` 不能
（通用支要给它们造形状，就必须先问**父节点的 kind**，而这一格手上只有子树与产物树的 `Parent`，
那不是投影意义上的父 kind）。于是**两半分开写**：能直出的照搬，不能的**明写让回**
（答 `undefined`，理由是「通用支那一趟会数到这一格」——答 `ctx.Nothing` 会让 `count` 少记），
并把「为什么不能」写在页面上。

**「一个类有几种身份」要靠量、不靠读**：`Bracket` 那一页第 1003 轮试了两次、
两次都是**按实测撤回**（一次红 `cases:direct` 22 份、一次把 `coverage` 的
`blocked` 从 29 顶到 133）——两次都错在「按读代码的印象把它当成一件事」。

**同页要留着 `PrintDirectAst`**（见下一条判据）：`Bracket` 原来**连 `PrintDirectAst` 都没有**
（形状一直由通用支给），所以搬它时要**两半一起写**——`PrintDirectAst` 把「这一页出什么」写下来
（同答从此有一条逐字节的基线），`PrintDirectAst` 再照着它去掉回原文查。
判据②要求的是**同页存在** `PrintDirectAst`，**不是**「它必须与直出版不同」：两条路逐句同一份
正是这一格想要的结果。

```ts
return undefined;
```

**这一格的读数该怎么看**（第 1009 轮量出来的账，免得下一轮按一个错的分母去找活）：

`cases:direct` 印的「直出版自己出的 N 个（P%）」里，**`count` 不是「产物里的节点数」**——
它是 `projectNode` **被问到的次数**，而其中一大块是**问完就被丢掉**的：

| 这一问的去向 | 用例语料（1640 份） | 意思 |
| --- | ---: | --- |
| 答一个节点（`ctx.direct++`） | 16570 | 直出版真的出了这一格 |
| 答 `ctx.Nothing` | 5291 | **这一格故意不出节点**，不是「还没有直出版」 |
| 答 `undefined` ⇒ 走通用支 | **13** | **真正「还没搬」的那一块** |
| 合计（`count`） | 21874 | `projectNode` 被问的次数 |

那 5291 次不是缺口，是**约定**：`projectExpression` 之类的调用点常常「先问一遍再自己摊平」
（最典型的是各种参数括号），问出来的节点根本不落进 AST。所以
**「75.8%」的分母里混着 24.2% 的问路**，而真正的缺口是 **13 / 21874 = 0.06%**。

**第 1015 轮：`IfSet` 那 13 次收掉了**（同一份探针的重量法：`tmp-r1015/giveway-all.mjs`，
把每个类**自己的** `PrintDirectAst` 各包一层，74 个类）——它让开的根因是**体是空块 `{}`** 时
少了两格事实（`BodyBrace` 记不到、`else` 那一支连 `BodyBraceAt` 都没记），
补上之后让开 13 → 0，`coverage` 4247 / 4422 → **4260 / 4422**、`cases:tsast` 转绿。

**剩下这 13 次是哪些、为什么答不了**：

- `Bracket` 13 次（`NewType` 11 / `NotNull` 2）：`(` / `[` 是**分组**，通用支给它们造的形状要问
  **父节点的 kind 与段名**，而这一格手上只有这一棵子树与 `Parent`（产物树的父亲，不是投影意义上的
  父 kind）。要收这一半，得先把「零宽包装」的返回约定或父 kind / 段名一起递给直出版——那是**另一轮的改动**。

**补一格 `WrapperField` 试过了、不动它**（第 1009 轮实测）：给 `Bracket` 补
「`(` / `[` 答 `null`（包装、内容并进父节点）、`{` 让开」这一格，`cases:direct` 逐字节同答、
`Bracket` 让回**仍是 13 次**——`NewType` / `NotNull` 里那两格根本没经过 `structuralProps`
的段循环（`wrapperTarget` 只在那里被问），所以这一格答什么都不改变它们的去向。
**这条记下来，是因为它长得像答案**：`WrapperField` 与 `PrintDirectAst` 都在回答
「这一格出什么」，但**被问的位置不同**——前者只在父节点的段循环里被问，后者才在
`projectNode` 的入口被问。

**「这一格该不该有直出版」看的是「谁被问到」**（第 1010 轮量出来的第三格事实）：
语料里见得到的 **117 个 token 类**里，**74 个被问到过**（也都覆写了这一格），
另外 **43 个一次都没被问到**——`IfSegment` / `NewType` / `ClassBody` / `SwitchCase` /
`ReturnType` / `GenericType` / `ForBody` / `WhileBody` / `TernaryOperatorCondition` …
它们的节点由**父单元直接摊平或丢弃**（`IfBody` 那一族被父节点的 `PrintDirectAst` 收进去；
问路的那些答完就不落进产物），**根本走不到这一问**，所以**不需要直出版**。

⇒ **数「还差几页」要按运行期被问到的类数，不能按源码上的页数数**：按页数数会数出
43 个不存在的工作量（第 1009 轮之前那张「待搬清单」的 0 是这么来的，
而这一轮给出了它为什么可以是 0）。

**这一趟的通用支一次都没有真的出过节点**（同一轮实测）：直出版这一趟的 `unmapped`
（＝通用支里「查不到 kind ⇒ 原样透传」那一支的产物）在 1640 份用例语料与 2051 份全语料上
**都是 0**——覆盖不到的格走的是 `PrintDirectAst` 覆写或「问完就丢」。所以
「这一格搬完了没有」这句话在直出版这一趟的准确说法是
**「被问到的那 74 个类里没有一个答不出」**。

## method SegmentNames:()=>Map<string, Map<string, string>>

**投成目标语言形状时，本单元的段叫什么**：`目标语言的节点名` → （`产物那边的分段名` → `目标语言的字段名`）。

前两个出口（`ToXmlString` / `ToDictionary`）说的是「这棵树长什么样」，这一格说的是
「**把这棵树投成另一个形状时，我这些段该叫什么**」——所以它与 `PrintDirectAst` 是同一件事的两半：
`PrintDirectAst` 说「这一格出哪个节点」，`SegmentNames` 说「这个节点的字段叫什么」。

**为什么住在 token 上而不是投影层的一张中央表里**：段名是**这个 token 自己的事实**。
`compare` 对 `While` 是 `expression`、对 `For` 是 `condition`——同一张表要按 kind 分几十档去记，
而每一档其实只对声明那个类的这一页有意义；住在 token 上之后，投影只**读**这一格
（`structuralProps` 拿它给字段名），不必再替每个 token 背一份「我的段该叫什么」。

**为什么是 `Map<节点名, Map<段名, 字段名>>` 而不是一张平表**：同一个 token 可能投成两个节点
（`Foreach` 是 `ForOfStatement` 或 `ForInStatement`、`MethodDeclaration` 可能是 `Constructor` /
`GetAccessor`…），而它们的字段名未必相同；按节点名分档既说得清，
也让「一个类两种形状」这种情形留在同一个文件里。

**查不到的名字原样照用**：产物那边本来就叫 `name` / `parameters` 的那些段与目标语言同形，
所以一张 `Map` 里只写**叫法不同**的那些（与 `TokenField` 同一条口径：只记事实，不记同义反复）。

**基类答空表**（`core` 与语言无关，不知道任何目标语言的字段名）：需要它的 token 在自己那一页
覆写这一格（`## property` + `### get`，例如 `typescript/tokens/while/while.xl.md` 的 `While`），
投影于是按「问这一格 → 空表就落到那张还没搬完的表」处理。

**这三条形态各试过一次，只有这一条能过 `tsc` 的 `strict`**（记下来免得再试）：
`## field` 会在派生类里报
`TS2611: defined as a property … but is overridden here as an accessor`；
`## property` + `### get` 在基类上生成「私有字段 + 访问器」那一对，而私有字段没有初值
（`TS2564: has no initializer`）；**`## method` + `### get` 才是可覆写的那一条**
（`get X()` 在结构上与 `X(): T` 相容）。

```ts
return new Map();
```

## method WrapperField:()=>string | null | undefined

**投成目标语言形状时，我这一层是不是「包装」**（第 990 轮）——是的话答「内容提到哪个字段」，
不是的话答 `undefined`；`null` 与 `undefined` 是两件事（见下）。

产物里这几层是分开的：类 / 接口 / 类型字面量都有各自的**体节点**（`ClassBody` /
`InterfaceBody` / `TypeLiteralBody`…），而目标语言的形状里，体**直接挂在声明上**
（`ClassDeclaration.members`）——那一层包装要**提上去**，包装自己不出节点。
要提的那一层**只有这个 token 自己知道**（`ClassBody` 对谁是体、该叫什么，是它的事实），
所以这一格跟着 token 走，而不是住在投影层的一张按标签查的中央表里。

**答什么**：

- `undefined` = **我不是包装**（照常出自己那一格）——基类就是这个答案；
- 一个**字段名** = 我是包装，内容提到这个字段（`ClassBody` → `"members"`、
  `ReturnType` → `"type"`）；
- `null` = 我是包装，但**内容并进父节点的 `children`**（`(` / `[` 这两对括号只是分组，
  目标语言那边没有对应节点）。

**为什么 `null` 与 `undefined` 必须分开**：两者都「不出自己那一格」，但一个是
「内容提上去（摊平）」、另一个是「照常出节点」。合成一个值就会让**分组括号变成节点**，
或者让**块被摊平**——后者是**静默错值**：块里的语句会被并到父节点语句表的末尾，
顺序与源码相反（`{ console.log("in") } console.log("out")` 会印成 `out / in`）。

**为什么 `Bracket` 三种括号答两种**：`(` / `[` 是分组（答 `null`）；
而**语句位那个 `{ … }` 不是包装**——目标语言那边它是一个块节点（答 `undefined`）。
判据取它自己的 `startBracket`（与产出 `ToDictionary` 时同一个来源）。

**为什么 `GenericType` 是动态的一条**：`<T, U>` 的括号段（装 `TypeParameter`）是包装，
要提到 `typeParameters`；而 `Array<T>` 里的类型实参段是**真的节点**（投成 `TypeReference`）
——不作这个区分就会把类型实参整个提掉（那种错误在尺子上表现为「凭空少一片节点」）。
所以它按**自己的子单元**答（见 `typescript/tokens/generic-type.xl.md`）。

```ts
return undefined;
```

## method BodyField:(parentKind:string)=>string | undefined

**投成目标语言形状时，我这一层是不是「体」**（第 991 轮）——是的话答「我在父节点上叫哪个字段」，
不是的话答 `undefined`。

产物里函数体 / 方法体 / 命名空间体 / lambda 体都是**独立的一层**（`FunctionBody` / `MethodBody` /
`NamespaceBody` / `LamdaBody`），而目标语言那边它们就是父声明的一个字段
（`FunctionDeclaration.body` / `MethodDeclaration.body` / `ModuleDeclaration.body` /
`ArrowFunction.body`）。

**它与 `WrapperField` 是两件事**（两者都在父节点的段循环里被问到，所以摆在一起说）：

- 包装（`ClassBody` / `ReturnType`…）**自己不出节点**，内容提上去；
- 体**自己是节点**（一个 `Block` / `ModuleBlock`），只是**字段换个名字**。

合成一条路会让其中之一静默错值：提掉了就凭空少一节（块里的语句并到父节点语句表末尾），
不收就又看不出「体」这一层该叫什么。

**为什么要带 `parentKind`**：`Namespace` 有两态——点号命名空间的内层（`namespace A.B.C { }`）
在目标语言那边是外层 `ModuleDeclaration` 的 `body`，而命名空间体里的内层命名空间
（`namespace O { namespace I { } }`）是 `ModuleBlock` 的 `statements` 里的一条语句。
同一个 token 两种落法，「我父亲投成了什么」是唯一分得开它的东西，所以那一格由调用方递进来
（其余体节点用不到这个参数）。

**基类答 `undefined`**（`core` 与语言无关，不知道任何目标语言的字段名）：需要它的 token 在自己那一页
覆写这一格（`## method`，与 `SegmentNames` / `WrapperField` 同一形态）。

```ts
return undefined;
```

## method Clone:()=>Token

克隆自身。

```ts
throw new Error("abstract member: Clone");
```
