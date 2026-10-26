# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { IdentifierShape } from "../../../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../../../literals/numeric-literal-shape.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
import { OperatorShapeMap } from "../../operator-shape-map.xl.md"
import { OperatorTable } from "../../operator-table.xl.md"
```

# namespace cangjie

WP-P3a：声明初始化器位置的**前缀一元**（`-` `+` `!` `~` `typeof` `void`）的**一条候选**。

`delete` 与 `++` / `--` 不在本文件范围（P3b 的 `update-expression-possible-shape`）。

**legacy EOF 口径（`tmp/dump-tree.mjs` 实测，逐字照抄）**

```text
let x = -y
VariableDeclarationShape  pos=3  src=[4,10)
├─ IdentifierShape  pos=3  src=[4,5)  text="x"
└─ PrefixUnaryExpressionShape  pos=7  src=[8,10)
   └─ IdentifierShape  pos=9  src=[9,10)  text="y"

let x = !!y                      let x = typeof y
PrefixUnaryExpressionShape       TypeOfExpressionShape
  pos=7  src=[8,11)                pos=7  src=[8,16)
  └─ PrefixUnaryExpressionShape    └─ IdentifierShape  pos=14  src=[15,16)
     pos=9  src=[9,11)
     └─ IdentifierShape pos=10  src=[10,11)
```

三条硬口径：① 前缀节点**只有操作数一个子节点**——运算符符号本身不进 `Data`，也没有 `op=` 字段
（`OperatorShapeMap` 对前缀位返回的就是表达式节点，二元位才是运算符形状）；
② `Pos` = 前一个非 trivia 单元的 `EndIndex`（`=` 的终点 7；`!!y` 的内层 9）；`src` 从**最外层运算符起点**
（8）到**操作数终点**（10 / 11）；③ 类名：`- + ! ~` → `PrefixUnaryExpressionShape`，
`typeof` → `TypeOfExpressionShape`，`void` → `VoidExpressionShape`。

**为什么在「操作数那一格」一次性建完整条链，而不是在运算符那一格建骨架（实测，两条结构性阻塞）**

1. **运算符格上共享目录里永不唯一**：`-` / `+` 格上 `BinaryExpressionPossibleShape` 也 `Accept`
   （它只看「左操作数还不是形状就 Accept」，不看有没有左操作数）；`typeof` / `void` 格上
   `IdentifierPrimaryPossibleShape` 也 `Accept`（这两个关键字不在它的排除表里）。
   `CatalogGuide` 只在 `Candidates.size === 1` 时建形状 ⇒ 在运算符格建骨架必然 `Waiting`。
2. **在 `Symbol.Close` 的调用栈里就地建骨架会崩**：`Symbol.Close` 只在目录返回 `Built` 时才让字符重放；
   骨架挂上去以后目录还是 `Waiting`，同一窗口里后面的 `Common.Transit` 会拿「刚挂上、右边界还没签出」
   的骨架去 `TryToClose` ⇒ `SourceRange is not set`（实测 `unary-minus` 打到这里）。
   而在**操作数那格**建的是**完整**形状（边界已定），目录返回 `Built`，字符按既有机制重放，没有半成品。

于是：`- + ! ~` 格本身只 `Uncertain`（活着，压住 `BinaryExpressionPossibleShape` 的误建），
到**操作数第一个代码单元**上 `Accept` 并一次建完（`!!y` / `- -y` 的整条运算符串自右向左逐层包起来）。

**两条本 WP 修不了的阻塞（照实报告，不迁、不造假）**

- `!`：A6 的 `DeclarationCellGuard` 对 `;` `,` `!` `}` **整格 `Reject`**（服务 `let x!: T`），
  `let x = !y` 的 `!` 格上 `Candidates` 归零且不会复活 ⇒ `unary-not` / `unary-chain-not` /
  `let-init-bang` 三条达不到 `incremental`。本条**不认领 `!`**：认领只会把 `throw` 变成 `partial`，
  既不是支持、又把账本从「显式拒绝」改坏。后缀 `!`（`let x = y!`）归 P1 的 `non-null-possible-shape`。
- `typeof` / `void`：A1 的 `IdentifierPrimaryPossibleShape` 在两个格上一直活着（`typeof` 不在它的
  排除表里），共享目录永远 `Waiting`；`ContinuationClaim` 只对 `Symbol` / `Bracket` 格被问，
  `Common` 关键字拿不到任何钩子 ⇒ `unary-typeof` / `unary-void` 仍是 `partial`。
  按 A1 §7 P3 的验收口径这是**未完成**，不是「不 throw 就算过」。

# class PrefixUnaryPossibleShape extends PossibleShape

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

注册区入口（`expression-shape-catalog.xl.md` 的 `// [E-CAT:FRAGMENTS]` 之后追加一行）。只追加自己这一个新实例。

```ts
shapes.push(new PrefixUnaryPossibleShape());
```

## static method IsPrefixText:(text:string)=>bool

WP-P3a 认识的前缀运算符文本（判据**只读** `OperatorTable.IsPrefixOperator`，不另抄一份运算符表），
只排除 P3b 的三种（`delete` 的删除表达式、`++` / `--` 的 update）。

```ts
if (!OperatorTable.IsPrefixOperator(text)) {
  return false;
}
if (text === "delete" || text === "++" || text === "--") {
  return false;
}
return true;
```

## static method IsHandledText:(text:string)=>bool

**本候选真能建完**的前缀文本：`-` `+` `~`。`!` 不在这里——它在 `DeclarationCellGuard` 的格上被整格拒掉
（类头第二条阻塞），认领会把 `throw` 变成半截的 `partial`；`typeof` / `void` 是 `Common` 关键字，
共享目录里有 `IdentifierPrimaryPossibleShape` 并活（第一条阻塞）。

```ts
return PrefixUnaryPossibleShape.IsPrefixText(text) && text !== "!" && text !== "typeof" && text !== "void";
```

## static method TextOf:(unit:Token)=>string

`Symbol`（`-` `+` `!` `~`）与 `Common` 关键字（`typeof` / `void`）都能给文本；其余给空串。

```ts
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
if (unit instanceof Common) {
  return (unit as Common).TempToString();
}
return "";
```

## static method OperatorRunStart:(units:Array<Token>, before:int)=>int

从 `before` 往前（含 `before`、跳过 trivia）收集**连续的前缀运算符**，返回这一串里最靠前的下标；
不是「紧跟 `=` 的运算符串」就返回 `-1`。

判据同时回答「初始化器还没有左操作数」：串头的前一个代码单元必须是 `Symbol("=")`。
串里出现本候选不处理的前缀文本（`!` / `typeof` / `void`）同样返回 `-1`——半条链建不完整，
留给兜底显式 throw（C10），不静默产错树。

```ts
let at = before;
let start = -1;
while (at >= 0) {
  if (units[at].IsTriviaToken) {
    at -= 1;
    continue;
  }
  const text = PrefixUnaryPossibleShape.TextOf(units[at]);
  if (!PrefixUnaryPossibleShape.IsPrefixText(text)) {
    break;
  }
  if (!PrefixUnaryPossibleShape.IsHandledText(text)) {
    return -1;
  }
  start = at;
  at -= 1;
}
if (start < 0) {
  return -1;
}
const head = ItemUtil.PreviousCode(units, at);
if (head < 0) {
  return -1;
}
const unit = units[head];
if (!(unit instanceof Symbol)) {
  return -1;
}
if (!(unit as Symbol).Is("=")) {
  return -1;
}
return start;
```

## static method IsPrefixPosition:(units:Array<Token>, tokenIndex:int)=>bool

这一格是「初始化器起始位的前缀运算符格」：当前单元是本候选处理的运算符，且它属于一条紧跟 `=` 的运算符串。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (!PrefixUnaryPossibleShape.IsHandledText(PrefixUnaryPossibleShape.TextOf(unit))) {
  return false;
}
return PrefixUnaryPossibleShape.OperatorRunStart(units, tokenIndex) >= 0;
```

## static method IsOperandPosition:(units:Array<Token>, tokenIndex:int)=>bool

这一格是「那条运算符串的操作数」：当前单元**不是**前缀运算符，且它前面的代码单元构成一条紧跟 `=` 的
运算符串（至少要有一个运算符）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (PrefixUnaryPossibleShape.IsPrefixText(PrefixUnaryPossibleShape.TextOf(unit))) {
  return false;
}
return PrefixUnaryPossibleShape.OperatorRunStart(units, tokenIndex - 1) >= 0;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

- 越界 / trivia ⇒ `Uncertain`（`Reject` 是永久的：`=` 与它后面的空白处拒掉就到不了前缀位）；
- 扫描下界走 `ItemUtil.ItemStartCached`（C8）；
- `=` ⇒ `Uncertain`（初始化器还没开始）；
- **前缀位** ⇒ `Uncertain`（活着，压住 `BinaryExpressionPossibleShape` 在这一格的误建：只剩它一个时
  目录会去建一个缺左操作数的二元表达式，`expression 左操作数不是形状`）；
- **操作数位** ⇒ `Accept`（这里一次建完整条链，见 `BuildByIndex`）；
- 其余（已经长好的形状、`;` 之前的关系符 …）⇒ `Reject`。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
const start = ItemUtil.ItemStartCached(units, cache);
if (tokenIndex < start) {
  return ShapeStates.Reject;
}
if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
  return ShapeStates.Uncertain;
}
if (PrefixUnaryPossibleShape.IsPrefixPosition(units, tokenIndex)) {
  return ShapeStates.Uncertain;
}
if (PrefixUnaryPossibleShape.IsOperandPosition(units, tokenIndex)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

只在**操作数位**上建；运算符格只等（见类头第 2 条：在 `Symbol.Close` 的栈里建骨架会让同一窗口的
`Common.Transit` 拿半成品去 `TryToClose`，崩 `SourceRange is not set`）。

```ts
return PrefixUnaryPossibleShape.IsOperandPosition(units, tokenIndex);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

在操作数那一格**一次建完整条前缀链**（C10：每一步先校验再动手）：

1. 定操作数那一格（`ItemUtil.NextCode`，目录在 trivia 格被问到也不会错位）；
2. 往前取这条运算符串（`OperatorRunStart`），校验每一个运算符都是本候选处理的文本；
3. **操作数先就地物化**：数字 → `NumericLiteralShape`、标识符 → `IdentifierShape`，
   `Pos` 按 C1 取**这一层运算符的 `EndIndex`**（`-y` 的 `y` → 9；`!!y` 的 `y` → 10）；
4. **自右向左逐层包**：每层 `OperatorShapeMap.Create(..., PositionPrefix, ...)` 建前缀表达式节点
   （类名即账本 identity），`Pos` = 该运算符前一个非 trivia 单元的 `EndIndex`，`src` = `[运算符起点, 操作数终点)`，
   把内层作为唯一子节点 `Add` 进去；
5. 把「运算符单元 + 操作数单元」从宿主里摘掉，最外层节点插回**第一个运算符那一格**。

```ts
const operandIndex = ItemUtil.NextCode(host.Data, tokenIndex);
if (operandIndex < 0 || operandIndex >= host.Data.length) {
  throw new Error("增量变量形状未支持：expression 前缀一元操作数");
}
const firstOperator = PrefixUnaryPossibleShape.OperatorRunStart(host.Data, operandIndex - 1);
if (firstOperator < 0) {
  throw new Error("增量变量形状未支持：expression 前缀一元运算符串");
}
const operatorIndexes:Array<number> = [];
for (let at = firstOperator; at < operandIndex; at++) {
  if (host.Data[at].IsTriviaToken) {
    continue;
  }
  const text = PrefixUnaryPossibleShape.TextOf(host.Data[at]);
  if (!PrefixUnaryPossibleShape.IsHandledText(text)) {
    throw new Error("增量变量形状未支持：expression 前缀运算符 " + text);
  }
  operatorIndexes.push(at);
}
if (operatorIndexes.length === 0) {
  throw new Error("增量变量形状未支持：expression 前缀一元运算符串为空");
}
const lastOperator = operatorIndexes[operatorIndexes.length - 1];
const operandUnit = host.Data[operandIndex];
const operatorEnd = host.Data[lastOperator].SourceRange.End;
if (operatorEnd < 0) {
  throw new Error("增量变量形状未支持：expression 前缀一元运算符未签出");
}
let operandEnd = operatorEnd;
let inner:Token;
if (operandUnit instanceof Common) {
  const common = operandUnit as Common;
  if (common.IsNumber()) {
    const literal = NumericLiteralShape.FromBasicToken(common, context);
    literal.Pos = operatorEnd;
    common.Replace(literal);
    inner = literal;
  } else {
    const text = common.TempToString();
    if (text === "true" || text === "false" || text === "null" || text === "this"
      || text === "in" || text === "instanceof") {
      throw new Error("增量变量形状未支持：expression 前缀一元操作数关键字 " + text);
    }
    const identifier = IdentifierShape.FromBasicToken(common, context);
    identifier.Pos = operatorEnd;
    common.Replace(identifier);
    inner = identifier;
  }
  if (inner.SourceRange.End >= 0) {
    operandEnd = inner.SourceRange.End;
  }
} else {
  throw new Error("增量变量形状未支持：expression 前缀一元操作数");
}
for (let at = operatorIndexes.length - 1; at >= 0; at--) {
  const index = operatorIndexes[at];
  const operatorUnit = host.Data[index];
  const text = PrefixUnaryPossibleShape.TextOf(operatorUnit);
  const start = operatorUnit.SourceRange.Start;
  if (start < 0) {
    throw new Error("增量变量形状未支持：expression 前缀一元运算符未签入");
  }
  const pos = IncrementalItemPosition.AfterPreviousCode(host.Data, index);
  const created = OperatorShapeMap.Create(text, OperatorShapeMap.PositionPrefix, host.Template, -1, -1, null);
  if (!(created instanceof ShapeToken)) {
    throw new Error("增量变量形状未支持：expression 前缀一元节点不是形状");
  }
  const node = created as ShapeToken;
  node.Pos = pos;
  node.SignIn(start);
  node.SignOut(operandEnd);
  node.Add(inner);
  inner = node;
}
const removed = new Set<number>();
for (const index of operatorIndexes) {
  removed.add(index);
}
removed.add(operandIndex);
const kept:Array<Token> = [];
for (let at = 0; at < host.Data.length; at++) {
  if (at === firstOperator) {
    kept.push(inner);
    continue;
  }
  if (removed.has(at)) {
    continue;
  }
  kept.push(host.Data[at]);
}
host.Data.length = 0;
for (const item of kept) {
  item.Parent = host;
  host.Data.push(item);
}
return inner;
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

初始化器前缀位的**认领**（D0 的 `ExpressionContinuationCatalog` 在 `VariableDeclarationEndPossibleShape`
的兜底 throw 之前问这一句）：

- 这一格是本候选处理的前缀运算符（`IsPrefixPosition`）⇒ `true`，语义是「继续等」——
  真正的形状在**操作数那一格**由 `BuildByIndex` 一次建完（`-` / `+` 格上目录里有
  `BinaryExpressionPossibleShape` 并活，运算符格上建不了，见类头第 1 条）；
- 其余（含 `!` / `typeof` / `void`：这两类本 WP 建不出来）⇒ `false`，兜底 throw / 既有 `partial` 按原样保留。

```ts
return PrefixUnaryPossibleShape.IsPrefixPosition(units, tokenIndex);
```
