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

**开标签上的 `range="[起,止]"`**：口径与第三种出口的 `range` 键同一处
（`RangeOf` 那一段写着为什么必须同一个来源）。XML 从前没有坐标——坐标只活在
`ToList()` 那一层；现在两个出口都印，`cases:astjson` 那条「XML 的每个属性在 JSON 里同名同值」
于是多了一条真的在核的断言。

**覆写了本方法的 token 都要自己补上这一格**：属性是逐个 token 拼出来的，
没有一处能替它们统一加（`Bracket` / `Let` / `String` / `Import` … 二十多处各拼各的）。
按「类名 + `range` + 各自那几个属性」的顺序写，这一门与 `cases:astjson` 都按名取值，顺序不影响判据。

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

## method ToDictionary:()=>Map<string, any>

产出这个节点的 JSON 对象形态：类型名 + 子单元。

基类的形状是 `{ type, children }`——`type` 取运行时类型名（与 XML 标签同一个来源），
`children` 是子单元的 `ToDictionary` 数组。子单元为空时**不写 `children`**（空节点的 JSON 只有 `type`，
与 XML 里 `<LineWrap />` 那种自闭合标签同一件事）。

各 token 覆写这个方法，把自己在 `ToXmlString` 里拼的那些属性搬成同名的键；
有具名分段（`For` 的四个段、`IfSegment` 的条件与体…）的节点覆写成按段名的数组，而不是 `children`。

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
return result;
```

## method WithRange:()=>Map<string, any>

产出 `ToDictionary()` 的结果，并给**这个节点与它下面所有节点**补上 `range`。

`range` 是闭区间的 `[起始下标, 结束下标]`（就是 `SourceRange` 的两头，`Source` 的 `Index`），
两头还没签入签出时写 `0`。

**为什么要有这一层**：`ToDictionary` 故意不带坐标（它是「形状」，与 XML 的标签/属性一一对应），
坐标只在 `ToList` 那一层补。可**要投影成 TypeScript 的 AST 就必须每个节点都有坐标**——
TS 的每个节点都带 `pos` / `end`，没有坐标就只能靠原文搜索猜位置，
而那种对齐一遇到壳节点（`VariableStatement`、`IfStatement` 这种）就断（实测过）。

**为什么不从 `Data` 重新拼一份**（试过、退回了）：`ToDictionary` 的每个 token 覆写里有一批
**不在 `Data` 里的键**——叶子的 `value`（`Identifier` / `SymbolToken` / `Keyword` / 注释…）、
`Import` 的 `imported` / `From`、`String` 的五个开关…从 `Data` 重拼等于把这些键全丢掉，
当时那把 AST JSON 尺子当场报出 1000 个文件「XML 有文本、JSON 是空串」。
所以这份实现**以 `ToDictionary()` 的结果为底**，只做两件事：补 `range`、把
`List<Map>` 形态的**子节点**递归地换成带坐标的那一份。

```ts
return this.WithRangeOf(this.ToDictionary(), this.Data);
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
而 `cases:astjson` 那一门正是逐属性核「XML 的每个属性在 JSON 里同名同值」。

```ts
return "[" + this.RangeStart() + "," + this.RangeEnd() + "]";
```

## method WithRangeOf:(node:Map<string, any>, list:Array<Token>)=>Map<string, any>

给一个**已经造好的字典**补坐标：本节点、以及它的子节点（递归）。

调用方给出的是「字典 + 与它对应的子单元列表」（`WithRange` 传 `this.Data`，
递归时传匹配到的那个子单元的 `Data`）。

**字典项与子单元按类型名配对，不按下标**——这是这里唯一容易写错的地方，记两笔：

- 「字典里的节点数」与「`Data` 的长度」**常常不等**。段数组有两种形态：
  摊平的（`While.body` 装的是 `<WhileBody>` 的**内容**，字典项比 `Data` 里的段元素多）与
  不摊平的（`Switch.segments` 装的就是 `<SwitchSegment>` 本身，数目相等）。
  按下标配对会在摊平那一侧**整段失配**（`items.length !== list.length` ⇒ 整段子节点一个坐标都拿不到，
  第 70 轮实测 255 个节点缺坐标，全是这一类）。
- 同一个字典项集合里可能有**同名的多个节点**（`Statement` 里两条 `Identifier`），
  所以配对要**边配边销**（`used` 数组）——不然同一个子单元会被配到两次、把坐标抄错。
- **光看类型名还不够**（第 546 轮）：段数组里的节点可能**与 `Data` 不在同一层**，
  这时 `Data` 里排在前面的那个同名单元会**顶替**段里的那一格。实测
  `for await (const v of xs)`：`Foreach.children` 里是 `await`（`Data[0]`），
  而 `ForeachDefine` 里是 `const`（**不是** `Foreach.Data` 的直接成员）——
  两者类型名都是 `Keyword` ⇒ `await` 那格抢在 `const` 前面配上了
  ⇒ `segments.define[0]` 拿到的坐标是 82–86 而**值是 const**（`TextOf` 于是答 `"await"`）。
  所以配对时**先要求区间也相同**，配不上再退回「只按类型名」 ——
  既有的那些段（`Data` 与段同一层）本来就区间相同，行为一个字节都不变。

配不上的字典项**原样留着**（它拿不到坐标，但不至于把别的节点也连累），
这是「宁可少补一个，也不要补错一个」的取舍：补错的坐标会让 `cases:tsast` 报出**假**分歧。

**终点缺失时从子节点兜底**：`else if` 的 `IfSegment` 只有起点、终点从来没签过
（第 70 轮实测 18 处「子节点区间越界」全是它），于是 `End` 兜底成 `0`、父区间是 `[55,0]`——
比所有子节点都小。这里用**子节点区间的最大值**补上终点：区间是给投影用的，
一个「起点在 55、终点在 -1」的父节点只会让每一棵子树都被判越界，
而它的真实末端就写在子节点里。这一条只在 `End` 为空**或反序**（`end < start`）时生效，
正常的区间一个字节都不动。

```ts
const span: string[] = this.RangeOf().slice(1, -1).split(",");
node.set("range", [Number(span[0]), Number(span[1])]);
const children = this.Data;
// **记下「这一格是哪个 token 出的」**：第三个出口（`PrintAst`）按 token 分派——
// 投影器拿到一个字典格时先问它的 token「你自己出不出形状」（覆写了就用它自己出的那一格）。
// 这一处配对本来就做完了（上面的 `taken[i] = token`），所以只是把它记下来，不多算一步。
//
// **记成普通属性、不是 Map 的条目**：`entries()` / `JSON.stringify` / `Token.ToPlain`
// 都看不见它，所以 XML 出口与 AST JSON 出口一个字节都不受影响。
(node as any).__token = this;
// 一个子单元在字典里的区间（`[起, 止]`），配「区间也相同」那一趟用。
// **走 `RangeStart` / `RangeEnd`**：与 XML 那一格同一个来源（见 `RangeOf`）。
const spanOf = (one: Token): Array<number> => {
  return [one.RangeStart(), one.RangeEnd()];
};
for (const [key, value] of node.entries()) {
  if (!Array.isArray(value)) {
    continue;
  }
  const items: Array<any> = value;
  if (items.length === 0) {
    continue;
  }
  const taken: Array<any> = [];
  const used: Array<any> = [];
  for (let i = 0; i < items.length; i++) {
    taken.push(null);
    used.push(false);
  }
  // **两趟配对**（第 546 轮）：第一趟要求「类型名 + 区间」都对上，
  // 第二趟只放宽「字典格还没有区间」的那一种（还没签入签出的格子只能这样配）。
  // **第二趟不要再放宽到「区间不同也能配」**：段数组里的节点与 `Data` 不在同一层时
  // （`ForeachDefine` 里的 `const` 对 `Foreach` 自己的 `await`），两个都是 `Keyword`、
  // 区间却不同 —— 只按类型名配就会**张冠李戴**，段里的那一格于是顶着 `await` 的坐标
  // （`st-for-await` / `stmt-for-await` / `fn-async-generator` 三份实测都是这样）。
  for (const token of children) {
    const tokenSpan = spanOf(token);
    for (let round = 0; round < 2; round++) {
      let hit = -1;
      for (let i = 0; i < items.length; i++) {
        if (used[i]) {
          continue;
        }
        const item = items[i];
        if (!(item instanceof Map) || item.get("type") !== token.constructor.name) {
          continue;
        }
        const span = item.get("range");
        const hasSpan = Array.isArray(span) && span.length >= 2;
        if (hasSpan && (span[0] !== tokenSpan[0] || span[1] !== tokenSpan[1])) {
          continue;
        }
        if (round === 0 && !hasSpan) {
          continue;
        }
        hit = i;
        break;
      }
      if (hit >= 0) {
        used[hit] = true;
        taken[hit] = token;
        break;
      }
    }
  }
  let matchedAny = false;
  const replaced: Array<any> = [];
  for (let i = 0; i < items.length; i++) {
    const token = taken[i];
    if (token === null) {
      replaced.push(items[i]);
    } else {
      replaced.push(token.WithRange());
      matchedAny = true;
    }
  }
  if (!matchedAny) {
    continue;
  }
  // 就地换掉那一串数组：`set` 一个**已有的键**不会改变键的插入顺序，
  // 所以 JSON 的键序照旧，只是值换成了带坐标的那一份。
  node.set(key, replaced);
}
return node;
```

## method ToList:()=>Array<any>

产出**子单元**的 JSON 数组，每个子单元补一个 `range`。

`range` 是 `[起始下标, 结束下标]`，取的是 `SourceRange` 的首尾字符下标；两头还没签入签出时写 `0`
（与上游同样的兜底）。

**递归**：子单元用 `WithRange` 取，而 `WithRange` 又递归处理它自己的子节点——所以
**每一个节点都带 `range`**（根那一层、各 token 用 `ToList()` 装的段数组、以及它们下面的所有子节点）。
这是「与 TypeScript 的 AST 直接对拍」的前提。

```ts
const result: Array<any> = [];
for (const item of this.Data) {
  result.push(item.WithRange());
}
return result;
```

## method ToJsonString:()=>string

把 `ToList()` 串成一个 JSON 字符串（紧凑单行）——`cjcli --ast-json` 打的就是它。

**为什么要先过 `ToPlain`**：`ToDictionary` 给的是 `Map`，而 `JSON.stringify` 对 `Map` 一律给 `{}`
（`Map` 的条目不在自有可枚举属性里）。这不是可以绕过的细节，是**会静默打出空对象**的坑，
所以转换是这一步的必做项，而不是可选的优化。

`ToList` 的元素补过 `range`，所以**带坐标的节点就是「被 `ToList` 收进来的那些」**——
根那一层与各 token 的段数组；`ToDictionary` 自己不带坐标。与上游一致。

```ts
return JSON.stringify(Token.ToPlain(this.ToList()));
```

## method PrintAst:(ctx:any, v:any)=>any

**第三个出口**：这个节点按**目标语言的形状**输出自己（本工程的目标是 `ts.createSourceFile`
同形的 AST，见 `typescript/print-ast-common.xl.md`）。

前两个出口（`ToXmlString` / `ToDictionary`）说的是「这棵树长什么样」；这一个说的是
「把这棵树投成**另一个形状**时，**我**该长成什么」。

**基类不出形状**（`core/` 与语言无关，只有 `Token` 这一层模型）：默认返回 `undefined`，
意思就是「我不自己出，交给语言层的通用支」——通用支做的事是**换名 + 提层 + 字段名**
（三张表，见 `typescript/print-ast-common.xl.md` 的 `KIND_BY_TAG` / `WRAPPER_FIELDS` / `FIELD_BY_KIND`）。

**覆写它就是「这个 token 自己出这一格」**：与 `ToXmlString` / `ToDictionary` 完全同一种组织方式
（基类给默认行为、各 token 覆写自己那一格），区别只在于这一个出口的目标形状是**语言层**定的。

两个参数：

- `ctx`：语言层创建的投影上下文。它带着原文与记账（`source` / `unmapped` / `count`），
  也带着**出口助手**（`Node` / `Each` / `Members` / `Project` / `Text` / `TextOf` /
  `LeafKind` / `KeywordKind` / `TokenKind` / `StringText`）——所以覆写里**不需要 import 任何东西**；
- `v`：**这个节点自己的视图**——标量属性进 `attrs`、数组进 `segments`、坐标在 `start` / `end`。
  它与另外两个出口**同源**：底层就是 `ToDictionary()` + `WithRange()` 的那一份
  （`WithRangeOf` 在补坐标时把「这一格是哪个 token」记在字典格上，投影器据此分派）。

**出的是「这一格」（对象），不是文本**：整棵树的文本由出口那一步统一串一次
（`typescript/print-ast-common.xl.md` 的 `ToJsonText`）——与 `ToXmlString` 的差别只是「拼对象」对「拼串」，
而 XML 那边拼串是因为它的目标形状本来就是文本。

```ts
return undefined;
```

## method SegmentNames:()=>Map<string, Map<string, string>>

**投成目标语言形状时，本单元的段叫什么**：`目标语言的节点名` → （`产物那边的分段名` → `目标语言的字段名`）。

前两个出口（`ToXmlString` / `ToDictionary`）说的是「这棵树长什么样」，这一格说的是
「**把这棵树投成另一个形状时，我这些段该叫什么**」——所以它与 `PrintAst` 是同一件事的两半：
`PrintAst` 说「这一格出哪个节点」，`SegmentNames` 说「这个节点的字段叫什么」。

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

## static method ToPlain:(value:any)=>any

把一个值转成能喂给 `JSON.stringify` 的形态：`Map` → 普通对象，数组 → 逐元素转，其余原样。

深拷贝而不是原地改：`ToDictionary` 的产物原则上可以再被调用方读（例如测试同时要比对 Map 与 JSON），
就地转成对象会把这些调用方手里的类型改掉。

```ts
if (Array.isArray(value)) {
  const items: Array<any> = [];
  for (const item of value) {
    items.push(Token.ToPlain(item));
  }
  return items;
}
if (value instanceof Map) {
  const result: Map<string, any> = new Map();
  for (const entry of value.entries()) {
    result.set(String(entry[0]), Token.ToPlain(entry[1]));
  }
  return Object.fromEntries(result);
}
return value;
```

## method Clone:()=>Token

克隆自身。

```ts
throw new Error("abstract member: Clone");
```
