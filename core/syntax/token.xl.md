# dependencies
```xl
import { SourceException } from "../exceptions/source-exception.xl.md"
import { Branch } from "./branch.xl.md"
import { Reorganization } from "./reorganization.xl.md"
import { Source } from "./source.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Template } from "./templates/template.xl.md"
import { Sequence } from "./templates/sequence.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

`Token` 是整棵树的地基：它记录自己覆盖的源码范围、自己的子单元、以及处理每个字符时该跑哪些跳转与重组。

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

## field ReorganizationQueue:Sequence<Reorganization> | null = null

本单元关闭时要跑的重组队列。

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

尝试关闭：范围必须已签入签出，然后关闭并跑一遍重组。

约定：`SourceRange` 只能赋值一次；`Close` 之前它必须已赋值；新建单元时上一个单元必须已关闭。

```ts
if (this.SourceRange.Start === null || this.SourceRange.End === null) {
  throw SourceException.SourceRangeContainsNull;
}
this.Close();
this.Reorganize();
```

## method Reorganize:()=>void

跑一遍重组队列：对每个重组规则、对每个下标，先问 `Previous`，命中就 `Process`。

`Process` 用返回值推进下标，所以这里写 `i = item.Process(..., i)`——重组会把多个子单元换成一个，下标必须跟着走。

**为什么不做「重复扫到没有改动为止」**（试过、退回了）：重复扫确实能让「`Process` 的推进跳过了同规则该处理的形状」
那一类收敛得更彻底（嵌套三元的第二层就是这种），但它是**对所有规则生效**的——包含那些
「每次都报告改动」的规则时，一趟套一趟会把内存吃光。实测：改成重复扫之后
`node tests/parse/run.mjs`（883 条用例，同一进程）直接 `FATAL ERROR: heap out of memory`，
而单条用例都正常。

**改成「固定两趟」是可以的**（实测）：两趟与「扫到无改动」的区别是**有上界**，
不会因为某条规则每次都报告改动而发散。这一趟额外的扫描解决的是
「靠左的 `:` 先被问到、于是把假值段让给内层，而内层成形时外侧已经扫过去了」这类**让位**形状
（`a ? b : c ? d : e` 的右结合嵌套就是它）。两趟之后外侧那一趟才看得到已经收成单个单元的
内层三元，`?` 从列表里消失，外层自然成立。
再多的趟数**没有必要**：右结合嵌套的层数对应「一个 `:` 让位一次」，
而每一趟都会把当前最内层收掉，实测两趟覆盖到三层嵌套即真实语料里出现的全部形状。

```ts
if (this.ReorganizationQueue === null) {
  return;
}
for (const item of this.ReorganizationQueue.Data) {
  for (let i = 0; i < this.Data.length; i++) {
    if (item.Previous(this.Template, this.Data, i)) {
      i = item.Process(this.Template, this.Data, i);
    }
  }
}
// 第二趟：只为了让「上一趟让位出去、外侧已经扫过去」的形状有机会成形。
for (const item of this.ReorganizationQueue.Data) {
  for (let i = 0; i < this.Data.length; i++) {
    if (item.Previous(this.Template, this.Data, i)) {
      i = item.Process(this.Template, this.Data, i);
    }
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

产出 XML：标签名是**运行时类型名**，内容是子单元的 XML 串接。

标签名取 `this.constructor.name`，所以类名就是它产出的 XML 标签名。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name}>${temp.join("")}</${name}>`;
```

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
`cases:astjson` 当场报出 1000 个文件「XML 有文本、JSON 是空串」。
所以这份实现**以 `ToDictionary()` 的结果为底**，只做两件事：补 `range`、把
`List<Map>` 形态的**子节点**递归地换成带坐标的那一份。

```ts
return this.WithRangeOf(this.ToDictionary(), this.Data);
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

配不上的字典项**原样留着**（它拿不到坐标，但不至于把别的节点也连累），
这是「宁可少补一个，也不要补错一个」的取舍：补错的坐标会让 `cases:tsast` 报出**假**分歧。

**终点缺失时从子节点兜底**：`else if` 的 `IfSegment` 只有起点、终点从来没签过
（第 70 轮实测 18 处「子节点区间越界」全是它），于是 `End` 兜底成 `0`、父区间是 `[55,0]`——
比所有子节点都小。这里用**子节点区间的最大值**补上终点：区间是给投影用的，
一个「起点在 55、终点在 -1」的父节点只会让每一棵子树都被判越界，
而它的真实末端就写在子节点里。这一条只在 `End` 为空**或反序**（`end < start`）时生效，
正常的区间一个字节都不动。

```ts
const start = this.SourceRange.Start === null ? 0 : this.SourceRange.Start.Index;
let end = this.SourceRange.End === null ? 0 : this.SourceRange.End.Index;
const children = this.Data;
const childSpans: Array<any> = [];
for (const item of children) {
  const childStart = item.SourceRange.Start === null ? 0 : item.SourceRange.Start.Index;
  const childEnd = item.SourceRange.End === null ? 0 : item.SourceRange.End.Index;
  childSpans.push([childStart, childEnd]);
}
if (end < start) {
  for (const span of childSpans) {
    if (span[1] > end) {
      end = span[1];
    }
  }
}
node.set("range", [start, end]);
// **记下「这一格是哪个 token 出的」**：第三个出口（`PrintAst`）按 token 分派——
// 投影器拿到一个字典格时先问它的 token「你自己出不出形状」（覆写了就用它自己出的那一格）。
// 这一处配对本来就做完了（上面的 `taken[i] = token`），所以只是把它记下来，不多算一步。
//
// **记成普通属性、不是 Map 的条目**：`entries()` / `JSON.stringify` / `Token.ToPlain`
// 都看不见它，所以 XML 出口、AST JSON 出口与 `cases:astjson` 那把尺子一个字节都不受影响。
(node as any).__token = this;
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
  // 按**子单元的顺序**配对，配上的记在 `items` 里它自己那一格上——这样输出顺序
  // 与 `ToDictionary` 造的完全一致，`cases:astjson` 的逐节点比对才不会因为换序而红。
  for (const token of children) {
    for (let i = 0; i < items.length; i++) {
      if (used[i]) {
        continue;
      }
      const item = items[i];
      if (!(item instanceof Map) || item.get("type") !== token.constructor.name) {
        continue;
      }
      used[i] = true;
      taken[i] = token;
      break;
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
同形的 AST，见 `typescript/ts-ast.xl.md`）。

前两个出口（`ToXmlString` / `ToDictionary`）说的是「这棵树长什么样」；这一个说的是
「把这棵树投成**另一个形状**时，**我**该长成什么」。

**基类不出形状**（`core/` 与语言无关，只有 `Token` 这一层模型）：默认返回 `undefined`，
意思就是「我不自己出，交给语言层的通用支」——通用支做的事是**换名 + 提层 + 字段名**
（三张表，见 `typescript/ts-ast.xl.md` 的 `KIND_BY_TAG` / `WRAPPER_FIELDS` / `FIELD_BY_KIND`）。

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
（`typescript/ts-ast.xl.md` 的 `ToJsonText`）——与 `ToXmlString` 的差别只是「拼对象」对「拼串」，
而 XML 那边拼串是因为它的目标形状本来就是文本。

```ts
return undefined;
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
