# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Identifier } from "../identifier.xl.md"
import { Keyword } from "../keyword.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { SwitchCompare } from "./switch-compare.xl.md"
import { SwitchSegment } from "./switch-segment.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`switch` 语句：把 `switch (判别) { case …: … default: … }` 整段收成一个 `Switch`，
里面依次是判别段与若干 `SwitchSegment`。

**分段在括号的 `Data` 上做，不靠重组。** `{ }` 括号没有规则队列（见 `../bracket.xl.md` 的 `Use`），
所以 `switch` 体里的 `case` / `default` 到这一段重组跑起来时**还是散着的** `Identifier` ——
正好可以从头扫一遍切段。这也是为什么 `switch` 不需要像 `if` 那样在 `Root` 的队列里兜圈子：
它一次就把所有段都切完。

段与段的边界规则：`case` / `default` 这两个 `Identifier` 各自起一段，
段的终点是下一个 `case` / `default` 或列表末尾；段内第一个 `:` 符号之前是匹配表达式（`default` 没有），
之后是语句体。段内找不到 `:` 时整段都当语句体（形状不完整时不硬拆）。

`SwitchCloseRule` 写在 `Switch` **之前**。

# class SwitchCloseRule extends CloseRule

## static readonly field Instance:SwitchCloseRule = new SwitchCloseRule()

唯一的实例，注册进通用规则队列时用。

## private static method WordOf:(item:Token | null)=>string

取一个「词」单元的文本：`Identifier` 用 `TempToString()`，`Keyword` 用它的 `Value`，其余给空串。

与 `statement.xl.md` 的 `Statement.WordOf` 同一口径（第 552 轮补）：`KeywordCloseRule`
会把 `case` / `default` 从 `Identifier` **升级成 `Keyword`**，而两条分支没有继承关系，
所以「找一个词」必须两种都认 —— 实测体括号里那五格**全都是 `Keyword`**，
按 `Identifier` 找**一格都找不到**（这就是本条规则一直没能分段的原因）。

```ts
if (item instanceof Identifier) {
  return item.TempToString();
}
if (item instanceof Keyword) {
  return item.Value;
}
return "";
```

## private static method SegmentWordOf:(unit:Token)=>string

一个**顶层单元**是不是段头（`case` / `default`）：是就给那个词，不是给空串。

两种形态都要认（第 552 轮实测，见 `docs/member-layer-plan.md`）：

- **裸词**：`reorg` 开着（`DSH_XL_REORG=1`）时体括号里还是散着的 `Identifier` / `Keyword`；
- **`Statement` 壳**：默认（`reorg` 关）时**语句层已经把每一行收成一个 `<Statement>`**，
  `case` / `default` 在**壳里**（实测 `Statement > [Keyword(case), Identifier(1), SymbolToken(:)]`）。

壳按**类名**判定 —— `statement.xl.md` 反过来 import 本文件，这里不能 `instanceof Statement`
（`statement.xl.md` 的 `IsStatementHead` 为同一条环用了同样的写法）。
只看**第一个实义单元**：注释 / 软换行那一族跳过，其余第一格不是这两个词就整格不算段头
（不然 `f(case)` 这种壳会被当成段头）。

```ts
let head: Token | null = unit;
if (unit.constructor.name === "Statement" && Array.isArray(unit.Data)) {
  head = null;
  for (const item of unit.Data) {
    const name = item.constructor.name;
    if (name === "LineWrap" || name === "AreaAnnotation" || name === "LineAnnotation") {
      continue;
    }
    head = item;
    break;
  }
}
const word = SwitchCloseRule.WordOf(head);
return word === "case" || word === "default" ? word : "";
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个 `switch` 语句的开头：内容是 `switch` 的 `Identifier`，
后面（跨过软换行）是一个 `(` 开的括号，再后面（跨过软换行）是一个 `{` 开的括号。

`switch` 在 `../parse-pipeline.xl.md` 的 `BanedMethodNames` 里，所以 `switch (x)` 不会被 `Method` 先吃掉。

```ts
const current = Get(units, index);
if (!(current instanceof Identifier) || !current.Is("switch")) {
  return false;
}
const compareIndex = SkipNextWrapSymbol(units, index);
const compare = Get(units, compareIndex);
if (!(compare instanceof Bracket) || compare.startBracket !== "(") {
  return false;
}
const bodyIndex = SkipNextWrapSymbol(units, compareIndex);
const body = Get(units, bodyIndex);
return body instanceof Bracket && body.startBracket === "{";
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把整个 `switch` 收成一个 `Switch`，**返回新的下标**。

要点：

- 判别括号的内容整段搬给 `SwitchCompare`，括号本身不再留在树里。
- `switch` 体的内容**逐个单元**分配：`case` / `default` 之前的匹配表达式给 `SwitchCase`，
  冒号之后的单元给 `SwitchStatement`。这里不能像 `Try` 那样整体 `MoveDataTo`——
  一个括号的内容要分给多个段，每个单元只能有一个父单元。
- **段头那一格可能是 `Statement` 壳**（第 552 轮）：默认（`reorg` 关）下语句层已经先跑过，
  体括号里是五条 `<Statement>`，`case` / `default` 在壳里。于是找 `:` 要在**壳的内容**里找，
  壳里冒号之后那些（`case 1: f()` 写在一行）+ 壳后面那些平级单元都算这一段的体。
- 每一段、每一个子段都各自 `SignIn` / `SignOut` / `TryToClose()`：`SwitchCase` 与 `SwitchStatement`
  有自己的队列（前者通用、后者语句），关闭时才会跑。
- 范围终点取 `switch` 体的终点（含 `}`）。**尾随软换行不进范围**——
  它留在父单元里充当语句边界（见 `../declaration-common.xl.md` 里「为什么这里不再有收尾口径」那一节）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const compareIndex = SkipNextWrapSymbol(units, index);
const compareBracket = Get(units, compareIndex) as Bracket;
const bodyIndex = SkipNextWrapSymbol(units, compareIndex);
const body = Get(units, bodyIndex) as Bracket;
const endIndex = bodyIndex;
const result = new Switch(template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
const compare = result.CreateCompare();
compareBracket.MoveDataTo(compare);
compare.Sign(compareBracket);
compare.TryToClose();
const data = body.Data.slice();
const markers: number[] = [];
for (let i = 0; i < data.length; i++) {
  if (SwitchCloseRule.SegmentWordOf(data[i]) !== "") {
    markers.push(i);
  }
}
for (let m = 0; m < markers.length; m++) {
  const from = markers[m];
  const to = m + 1 < markers.length ? markers[m + 1] : data.length;
  const key = SwitchCloseRule.SegmentWordOf(data[from]);
  const segment = result.CreateSegment();
  segment.key = key;
  const head = data[from];
  const inner = head.constructor.name === "Statement" && Array.isArray(head.Data) ? head.Data : null;
  const list: Array<Token> = inner !== null ? inner : data;
  const begin = inner !== null ? 0 : from;
  const limit = inner !== null ? inner.length : to;
  let colonIndex = limit;
  for (let i = begin + 1; i < limit; i++) {
    const item = list[i];
    if (item instanceof SymbolToken && item.Is(":")) {
      colonIndex = i;
      break;
    }
  }
  if (key === "case" && colonIndex > begin + 1) {
    const caseUnit = segment.CreateCase();
    for (let i = begin + 1; i < colonIndex; i++) {
      caseUnit.Add(list[i]);
    }
    caseUnit.SignIn(list[begin + 1].SourceRange.Start!);
    caseUnit.SignOut(list[colonIndex - 1].SourceRange.End!);
    caseUnit.TryToClose();
  }
  const inlineUnits: Array<Token> = [];
  const followingUnits: Array<Token> = [];
  if (inner !== null) {
    for (let i = colonIndex + 1; i < limit; i++) {
      inlineUnits.push(list[i]);
    }
    for (let i = from + 1; i < to; i++) {
      followingUnits.push(data[i]);
    }
  } else {
    for (let i = colonIndex + 1; i < to; i++) {
      followingUnits.push(data[i]);
    }
  }
  if (inlineUnits.length > 0 || followingUnits.length > 0) {
    const firstBody = inlineUnits.length > 0 ? inlineUnits[0] : followingUnits[0];
    const lastBody = followingUnits.length > 0 ? followingUnits[followingUnits.length - 1] : inlineUnits[inlineUnits.length - 1];
    const statement = segment.CreateStatement();
    statement.SignIn(firstBody.SourceRange.Start!);
    statement.SignOut(lastBody.SourceRange.End!);
    // **`;` 那一档要重新问一次宿主** ✓（第 553 轮 ✓）：`case 2: s += "b"; break;` 里
    // 标签与体住在**同一个 `Statement` 壳**里 ✓ ⇒ 那个 `;` 是**壳自己**的终结符 ✓，
    // 拆出来的这一截搬进 `SwitchStatement` 时**没有任何人再问一次** ✗ ⇒ 里面还是散单元 ✗
    // ⇒ 投影逐个投出来 ✓（`statements` 里是 `Identifier` / `EqualsToken` / `BinaryExpression` ✗，
    // 降级层报的是 `unimplemented: statement Identifier` ✓）。
    // 动作与 `symbol-token.xl.md` 的 appender **一字不差** ✓（`FormFrom` 自己会判终不终结符 ✓）。
    for (const item of inlineUnits) {
      statement.Add(item);
      if (item instanceof SymbolToken) {
        statement.FormStatement(item);
      }
    }
    // **后面那些平级单元已经是壳**（`break;` ✓）⇒ 不能与上面那一截一起交给关闭前那一趟 ✗：
    // `FormTail` 一看到**末尾已经是语句单元**就收工 ✓，前面那截散单元于是永远收不成壳 ✗
    //（实测 `case 2: s += "b"; break;` 的 `statements` 就是「散单元 + `BreakStatement`」✓）。
    // 所以先把**只有散单元**的这一截单独问一次（`ApplyCloseRules` 就是 `TryToClose` 中间那一手 ✓，
    // 末尾是散单元 ⇒ `FormTail` 认账 ✓），按原序补上后面的壳之后再正常关闭 ✓
    //（`TryToClose` 里那一趟再问一次是无害的：末尾已经是壳 ⇒ 它照旧收工 ✓）。
    if (inlineUnits.length > 0 && followingUnits.length > 0) {
      statement.ApplyCloseRules();
    }
    for (const item of followingUnits) {
      statement.Add(item);
    }
    statement.TryToClose();
  }
  segment.SignIn(data[from].SourceRange.Start!);
  segment.SignOut(data[to - 1].SourceRange.End!);
  segment.TryToClose();
}
result.TryToClose();
return ReplaceCountAt(units, index, endIndex - index + 1, result);
```

# class Switch extends IndependentToken

`switch` 语句单元。

它没有覆写 `ToXmlString`，XML 由 `Token` 产出：`<Switch>` 里依次是 `SwitchCompare` 与各段的 XML。

## method PrintAst:(ctx:any, v:any)=>any

`switch (v) { … }` → `SwitchStatement`（`expression` + `caseBlock`；
**从 `ts-ast.xl.md` 的 `projectSwitch` 搬来**，第 189 轮）。

TS 在这两层之间还有一个 **`CaseBlock`**（就是那对花括号），产物那边没有这一层
（`Switch` 只有 `compare` 与 `segments` 两个段）——所以这里**合成**它：
区间从第一个 `{` 起、到 `switch` 自己的终点（那个 `}` 正好是最后一个字符）。

```ts
  const kids = ctx.Kids(v);
  const cond = ctx.KidsOf(v, "compare");
  const segments = ctx.KidsOf(v, "segments");
  const brace = ctx.source.indexOf("{", v.start);
  const props: any = {};
  if (cond.length > 0) props.expression = ctx.Expression(cond);
  props.caseBlock = {
    kind: "CaseBlock",
    clauses: segments.map((seg: any) => ctx.SwitchClause(seg)),
    pos: brace >= 0 ? brace : v.start,
    end: ctx.StmtEndOf(v),
  };
  return ctx.NodeHead("SwitchStatement", props, v);
```

## method CreateCompare:()=>SwitchCompare

新建判别段并挂到自己名下，返回新单元。

```ts
return this.Add(new SwitchCompare(this.Template));
```

## property Compare:SwitchCompare

判别段：子单元列表里**第一个** `SwitchCompare`。

### get

```ts
for (const item of this.Data) {
  if (item instanceof SwitchCompare) {
    return item;
  }
}
throw new Error("找不到匹配的子单元");
```

## method CreateSegment:()=>SwitchSegment

新建一段并挂到自己名下，返回新单元。

```ts
return this.Add(new SwitchSegment(this.Template));
```

## property Segments:Array<SwitchSegment>

全部段，保持它们在 `Data` 里的原始顺序。

与 `Try.Catches` 同一种取法（按类型收窄，子单元是引用而不是克隆）。

### get

```ts
const result: SwitchSegment[] = [];
for (const item of this.Data) {
  if (item instanceof SwitchSegment) {
    result.push(item);
  }
}
return result;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `compare` 段与 `segments` 段列表。

`compare` 是判别段（`switch (…)` 括号里那截），取 `ToList()`——它是一批子单元的容器。

`segments` 是各 `SwitchSegment`：它们与 `Try.Catches` 一样是**按类型从 `Data` 里筛出来的一组引用**，
不是某**一个**容器节点，所以没有现成的 `ToList()` 可调，只能逐个 `item.ToDictionary()`。
次序就是 `Data` 里的原顺序（`case` / `default` 的源顺序），JSON 侧不重排——
段的先后正是 `switch` 语义的一部分。两个键一律写出，与 XML 里 `<Switch>` 下
必然是「判别段 + 若干段」的形状对齐。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("compare", this.Compare.ToList());
const segments: Array<any> = [];
for (const item of this.Segments) {
  segments.push(item.ToDictionary());
}
result.set("segments", segments);
return result;
```

## method Clone:()=>Token

克隆自身。

顺序与 `Try.Clone` 一致。

```ts
const result = new Switch(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
