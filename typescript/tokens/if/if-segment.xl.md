# dependencies
```xl
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { IfSet } from "./if-set.xl.md"
import { IfBody } from "./if-body.xl.md"
import { IfCondition } from "./if-condition.xl.md"
import { IfStatement } from "./if-statement.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`if` 结构里的一段：一个关键字（`if` / `else if` / `else`）、一个可选的条件、一个可选的语句体。它由 `IfSet` 在**读的时候逐段建出来** ✓（`IfSetBranch` 在 `(` 处认下 ✓、`IfSet.Begin` 建第一段 ✓、看到关上的 `else` 再起下一段 ✓）。

# class IfSegment extends UnitToken

`if` / `else if` / `else` 的一段。

它覆写了 `ToXmlString`——这一步直接决定 XML 产物，是本文件的核心。

## field key:string = ""

这一段的原始关键字：`if` / `else`（`else if` 记的是 `if`）。

## property Condition:IfCondition | null

条件子单元：子单元列表里**第一个** `IfCondition`。

### get

找不到 `IfCondition` 时给 `null`。

```ts
for (const item of this.Data) {
  if (item instanceof IfCondition) {
    return item;
  }
}
return null;
```

### set

只在非空时 `Add(value)`；给 `null` 是**无操作**，不会移除已有的条件。

```ts
if (value !== null) {
  this.Add(value);
}
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

**恒 `Undo`** ✓——本段没有「见到某个字符就收尾」这回事 ✗：
它什么时候完事，是看**自己 `Data` 里两格填满了没有** ✓（条件 ✓、体 ✓）。

```ts
return BranchStates.Undo;
```
## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理：**空实现** ✓（与 `Bracket.Default` 同款 ✓）。不写方法体，打印器产出空方法。

## method Process:(context:SyntaxContext, source:Source)=>void

**先把字符交给正在吃的那一级** ✓；它一关上就说明「条件吃完了」✓
⇒ 由本段请父单元（`IfSet` ✓）把**体**挂上来 ✓。

**为什么这里能知道该挂体了** ✓：看自己的 `Data` ✓——里面已经有一个 `IfCondition` ✓
（`else` 段没有条件，那第一格就是体 ✓，由父单元在建段时直接挂 ✗，不经过这里 ✓）。
**不需要 `Stage` 之类的字段** ✓：答案就在树里 ✓。

```ts
// **这一格进来之前我就空着吗** ✓——不是的话，说明刚才有单元在吃，
// 而这一格正是它的**收尾符**（条件在 `)` 上含地收尾 ✓）：那不属于本段要挂的体 ✗，
// 直接放行，等下一个字符再判 ✓。
const idle = this.MountedUnit === null;
super.Process(context, source);
if (idle === false) {
  return;
}
if (this.MountedUnit !== null) {
  return;
}
const hasBody = this.Data.some((item) => item instanceof IfBody || item instanceof IfStatement);
if (hasBody) {
  // **本段干完了 ⇒ 连着往上退** ✓（用户口径：`IfBody` / `IfStatement` 根据情况连续 quit ✓）：
  // 体已经在自己的收尾符上退过一次 ✓，控制权到本段手里 ✓ ⇒ 本段也退 ✓，
  // 于是下一个字符直接落到 `IfSet` ✓，由它按 `Data` 判尾巴 ✓。
  //
  // **退之前必须给自己签出终点** ✗：不签的话，后面只要有一个新单元在本段之后出生 ✓
  // （`else` 那个 Identifier 就是 ✓），`AddAndCloseLast` 就会顺手关本段 ✗
  // ⇒ `TryToClose` 因 `End` 为空当场抛 ✓（第 44 轮实测：抛在 `[Set] Navigate("e")` ✓）。
  // 终点取**本段最后一个子单元的终点** ✓——它就是这一段写到哪儿为止 ✓。
  const tail = this.Data[this.Data.length - 1];
  if (tail !== undefined && tail.SourceRange.End !== null && this.SourceRange.End === null) {
    this.SignOut(tail.SourceRange.End);
  }
  this.Quit();
  return;
}
// **空白不属于体** ✓：`if (a) {}` 里 `)` 与 `{` 之间那个空格要跨过去，
// 不然体会从空格开始签入 ✗、随后那个 `{` 就变成体**内部**的括号 ✗ ⇒ 它再也见不到配对的 `}` ✗。
if (source.Value === " " || source.Value === "\t" || source.Value === "\r" || source.Value === "\n") {
  return;
}
if (this.Data.length === 0) {
  return;
}
if (!(this.Data[0] instanceof IfCondition)) {
  return;
}
const parent = this.Parent;
if (parent !== null && parent.constructor.name === "IfSet") {
  (parent as IfSet).MountBodyOrStatement(context, source);
}
```

## method CreateCondition:()=>IfCondition

造一个条件子单元并挂到自己下面，返回它。

```ts
return this.Add(new IfCondition(this.Template));
```

## property Statement:IfStatement | null

语句体子单元：子单元列表里**第一个** `IfStatement`。

### get

找不到 `IfStatement` 时给 `null`。

```ts
for (const item of this.Data) {
  if (item instanceof IfStatement) {
    return item;
  }
}
return null;
```

### set

同 `Condition`：只在非空时 `Add(value)`。

```ts
if (value !== null) {
  this.Add(value);
}
```

## method CreateStatement:()=>IfStatement

造一个语句体子单元并挂到自己下面，返回它。

```ts
return this.Add(new IfStatement(this.Template));
```

## method ToXmlString:()=>string

产出 XML：`<IfSegment key="关键字">子单元的 XML</IfSegment>`。

标签名取 `this.constructor.name`，子单元逐个 `ToXmlString()` 后拼在一起，关键字作为 `key` 属性**原样**写进标签，不做转义。

**这一处直接决定 XML 产物**：属性名是 `key`（大写 K），属性值两侧是双引号，且子单元之间**没有任何分隔符**——与 `Bracket` 那种 `startBracket="…"` 的写法同款。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} key="${this.key}">${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `key`，外加两个可选段。

`key` 与 XML 的 `key` 属性同源，取的都是这个字段（`if` / `else`；`else if` 记的是 `if`）。

`condition` 与 `statement` 都**只在对应的 getter 不是 `null` 时才写**：`else` 段没有条件、
`else` 之后没有体时这两个属性给 `null`，此时不写这个键——与 XML 里「没有那个子单元」同一件事。

两段的值取 `ToList()`：条件与体各是**一批**子单元，而 `Condition` / `Statement` 正是按类型从 `Data`
里挑出来的那一个段节点；摊成扁平的 `children` 会把「哪一段是条件、哪一段是体」抹掉，
而这两段本来就是靠类型（而不是位置）认出来的。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("key", this.key);
if (this.Condition !== null) {
  result.set("condition", this.Condition.ToList());
}
if (this.Statement !== null) {
  result.set("statement", this.Statement.ToList());
}
return result;
```

## method Clone:()=>Token

克隆自身。

新建一个、**先把 `key` 复制过去**（漏了它克隆体就丢掉关键字）、`Sign(this)`、把子单元逐个克隆后 `AddRange`、最后 `TryToClose()`。

```ts
const result = new IfSegment(this.Template);
result.key = this.key;
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
