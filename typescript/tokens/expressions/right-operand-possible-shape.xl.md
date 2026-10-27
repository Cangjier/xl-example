# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { BinaryExpressionShape } from "./binary-expression-shape.xl.md"
import { BigIntLiteralShape } from "../literals/big-int-literal-shape.xl.md"
import { NumericLiteralPossibleShape } from "./numeric-literal-possible-shape.xl.md"
import { IncrementalItemPosition } from "./numeric-literal-possible-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ParenthesizedPossibleShape } from "./forms/primary/parenthesized-possible-shape.xl.md"
import { StringLiteralPrimaryPossibleShape } from "./forms/primary/string-literal-primary-possible-shape.xl.md"
import { TemplatePrimaryPossibleShape } from "./forms/primary/template-primary-possible-shape.xl.md"
import { KeywordLiteralPrimaryPossibleShape } from "./forms/primary/keyword-literal-primary-possible-shape.xl.md"
```

# namespace cangjie

# class RightOperandPossibleShape extends PossibleShape

**二元表达式右操作数**的数字字面量候选：`BinaryExpressionShape` 增量模式下的目录里只有它。

数字一族两种写法都在这一格：`NumericLiteralShape`（`1` / `0x1f` / `1_000`）与
`BigIntLiteralShape`（`10n` / `0b101n`）——判据都是 `Common.IsNumber()` / `Common.IsBigInt()`。

它与声明层的 `NumericLiteralPossibleShape` 判据相同、建形状相同，区别只有一条——
**建完之后右操作数就关闭了，所以当场替宿主（`BinaryExpressionShape`）封口并卸载自己**（C3）：

- 右边界由 `SealRightOperand` 用「刚建好的右操作数的终点」补齐（`2*3` → `src=[8,11)`）；
- 卸载由 `Quit` 完成，后续字符回到父层（`VariableDeclarationShape`），于是 `Symbol("+")` 落在父层。

不给 `BinaryExpressionShape` 加 core 钩子，也不改 `core/`：全部是 typescript 层的组合调用。

## static method IsIdentifierText:(text:string)=>bool

右操作数位允许的标识符文本：非空、不是关键字字面量（那些由 WP-A1/A4 的原子候选建各自的字面量形状）。
判据只排除**会产生另一种 legacy 节点**的文本，其余一律按标识符处理（`B` / `foo` / `$x` / `_y`）。

```ts
if (text.length === 0) {
  return false;
}
if (text === "true" || text === "false" || text === "null" || text === "undefined" || text === "this") {
  return false;
}
return true;
```

## static method Catalog:()=>Array<PossibleShape>

右操作数候选目录。`ExpressionCatalogFactory.CreateRightOperandCatalog()` 转调这里，
`BinaryExpressionPossibleShape` 建出 `BinaryExpressionShape` 时也用它挂目录——**只有这一份定义**。

**[D3b] 从「只有一项」扩成「原子 + 形态」**：`RightOperandPossibleShape` 仍只负责数字 / 标识符
（`a + 1` / `a / b`），后面再挂四条 `RightOperandFormPossibleShape`——括号 / 字符串 / 模板 / 关键字字面量。
它们是**同一个候选类、四个 `Kind`**，判据只有两条：前一个代码单元是**运算符形状**、当前格是那种形态。
`IsBuildable` 与封口在形态候选里统一处理（见该类的说明）。

为什么不是直接把 `ExpressionShapeCatalog.CreateRightOperand()` 挂上来（实测，必须写清楚）：
那份目录是 `CreatePrimary() + CreateOperators()`，里面同时有 `NumericLiteralPossibleShape`（与
`RightOperandPossibleShape` 在数字格上**双 Accept** ⇒ `CatalogGuide` 永远 `Waiting`）与
`CallPossibleShape`（在 `x + (y)` 的 `(` 格上与 `ParenthesizedPossibleShape` **双 Accept**）。
把整份目录挂上去实测：崩溃 121 → **131**、救回 0 条（`tmp/snap-full.json`）。所以这里只挂
「操作数态的形态」，不挂**续接态**的候选（`Call` / `MemberAccess` / `ElementAccess` …），
也不挂与既有候选同格重复的原子候选。

```ts
const shapes:Array<PossibleShape> = [];
shapes.push(new RightOperandPossibleShape());
shapes.push(RightOperandFormPossibleShape.Create("paren", new ParenthesizedPossibleShape()));
shapes.push(RightOperandFormPossibleShape.Create("string", new StringLiteralPrimaryPossibleShape()));
shapes.push(RightOperandFormPossibleShape.Create("template", new TemplatePrimaryPossibleShape()));
shapes.push(RightOperandFormPossibleShape.Create("keyword", new KeywordLiteralPrimaryPossibleShape()));
return shapes;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

与声明层数字字面量同判据：非 trivia 的 `Common` 且 `IsNumber()` / `IsBigInt()`。扫描下界同样走
`ItemUtil.ItemStartCached`（C8）。

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
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
if ((unit as Common).IsNumber() || (unit as Common).IsBigInt()) {
  return ShapeStates.Accept;
}
// WP-A2：右操作数是**标识符**时也在这里建（`a / b` 的 `b`、`a instanceof B` 的 `B`）。
// 关键字 / 字面量（`true`/`false`/`null`/`undefined`/`this`…）留给 WP-A1/A4 的原子候选，这里 Reject。
if (RightOperandPossibleShape.IsIdentifierText((unit as Common).TempToString())) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

当前格是 **trivia（空白 / 注释）时不建**。

`let x = 1 + /* c */ 2`：注释单元先于 `2` 流进二元宿主，`ComputeByIndex` 对 trivia 只能保持 `Uncertain`
（不能 `Reject`，E0b 实测约束 1：本条目内被拒就再也不回来）。`IsBuildable` 若是基类默认的 `true`，
目录就会在**注释那一格**建，`BuildByIndex` 拿到的单元不是 `Common` ⇒ 直接抛「expression 右操作数」
（`throw/lexical/comment-block-after-operator` 的成因）。注释格只等，`2` 到达那一格再建。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
return !units[tokenIndex].IsTriviaToken;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

建 `NumericLiteralShape` 原位换掉那个 `Common`，然后**同一判定内**封口 + 卸载宿主。

`host` 必须是 `BinaryExpressionShape`——这份目录只被它挂；不是就按 C10 显式抛错，
不静默产出错误的树。

```ts
// [D0] 定位要建的那一格：trivia（空白 / 注释）跳过走 `ItemUtil.NextCode`（与其它候选同一份工具，
// 不在这里另写扫描）。正常情况 codeIndex === tokenIndex；只有目录在注释格被问到才会前移。
let codeIndex = ItemUtil.NextCode(host.Data, tokenIndex);
if (codeIndex < 0 || codeIndex >= host.Data.length) {
  throw new Error("增量变量形状未支持：expression 右操作数");
}
// [D0] 运算符与右操作数之间的 trivia（`1 + /* c */ 2` 的注释）留在宿主里会变成增量树多出来的 basic 行
// （legacy 的 `BinaryExpressionShape` 不保留它们，`residualBasicLines` 会 +N）。建之前从宿主摘掉：
// 与 legacy 同树，且 `Pos` 仍取「前一个非 trivia 代码单元」的终点（C1）。
while (codeIndex > 0 && host.Data[codeIndex - 1].IsTriviaToken) {
  host.Data.splice(codeIndex - 1, 1);
  codeIndex -= 1;
}
const token = host.Data[codeIndex];
if (!(token instanceof Common)) {
  throw new Error("增量变量形状未支持：expression 右操作数");
}
let shape: Token;
if ((token as Common).IsBigInt()) {
  // BigInt 也是数字字面量（`a + 10n` / `0b1010 / 1_000 / 10n`）。少了这一格外形，
  // `10n` 会落到下面的标识符分支，产出 `IdentifierShape text="10n"`（TS 是 `BigIntLiteral`）。
  const bigint = BigIntLiteralShape.FromBasicToken(token as Common, context);
  bigint.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, codeIndex);
  (token as Common).Replace(bigint);
  shape = bigint;
} else if ((token as Common).IsNumber()) {
  shape = NumericLiteralPossibleShape.BuildLiteral(token as Common, host, codeIndex, context);
} else {
  // WP-A2：右操作数是标识符（`a / b` 的 `b`、`a instanceof B` 的 `B`）。
  if (!RightOperandPossibleShape.IsIdentifierText((token as Common).TempToString())) {
    throw new Error("增量变量形状未支持：expression 右操作数正文 " + token.TempToString());
  }
  const identifier = IdentifierShape.FromBasicToken(token as Common, context);
  identifier.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, codeIndex);
  (token as Common).Replace(identifier);
  shape = identifier;
}
if (!(host instanceof BinaryExpressionShape)) {
  throw new Error("增量变量形状未支持：expression 右操作数宿主不是二元表达式");
}
(host as BinaryExpressionShape).SealRightOperand(context);
return shape;
```

# class RightOperandFormPossibleShape extends PossibleShape

**[D3b] 右操作数位的形态候选**：`( … )` 括号 / 字符串字面量 / 模板字面量 / `true` `false` `null`。

它治的是**一格真崩溃**：右操作数目录原来只有 `RightOperandPossibleShape`（只认数字 / 标识符），
于是 `x + (y)` / `a + "x"` / `` a + `t` `` / `a + true` 在右操作数那一格上候选**全部阵亡**，
`CatalogGuide` 在 `EndPossible === null` 时抛出 `没有候选形状可以构成（宿主 BinaryExpressionShape）`
（实测 12 条，见 `_reports/D3b.md` 的分族表）。

判据只有**两条**，都不新写词法：

1. **前一个代码单元是运算符形状**（`RightOperandFormPossibleShape.IsOperatorLike`）——
   这一条同时是「本候选不抢初始化器起始格」的保证：初始化器起始格的前驱是 `=`（`Symbol`，不是形状），
   所以 `let x = (1)` / `let x = "a"` 仍原样走 A4b / A1，一个字节都不改；
2. **当前格是那种形态**（`Claims`）：`(` 括号 / 非内插 `String` / 内插 `String` / 三个关键字字面量。

**建树一律转调既有候选的 `BuildByIndex`**，不复制第二份节点构造：
`ParenthesizedPossibleShape`（legacy `ExpressionBuilder` 吃掉括号里的表达式）、
`StringLiteralPrimaryPossibleShape`、`TemplatePrimaryPossibleShape`、`KeywordLiteralPrimaryPossibleShape`。
本类只多做两件它们的 `ComputeByIndex` 不肯做的事：**认「前驱是运算符」这一格**（那几个候选的判据都是
「前驱是 `=`」），以及**建完替二元宿主封口 + 卸载**（C3，与 `RightOperandPossibleShape` 同一条机制）。

**为什么不复用它们的 `IsBuildable`**：那四条都带 `PrimaryAtomGuard.IsLoneAtom`（「初始化器 = 单个原子，
之后只剩收口」）。右操作数位后面通常还有东西（`a + "x" + "y"` 的第二个 `+`），`IsLoneAtom` 恒假
⇒ 目录永远 `Waiting`、二元永不封口（实测：整份目录挂上去救回 0 条）。所以这里自带
`IsBuildable`：trivia 不建，括号另要 `CanParseInside`（括号里的表达式必须能被 legacy 整段吃完）。

## field Kind:string = ""

形态标记：`"paren"` / `"string"` / `"template"` / `"keyword"`。

```ts
""
```

## field Inner:PossibleShape | null = null

真正建树的候选（转调它的 `BuildByIndex`）。`null` 时按 C10 显式抛错。

```ts
null
```

## static method Create:(kind:string, inner:PossibleShape)=>RightOperandFormPossibleShape

造一个形态候选：`Kind` 定判据，`Inner` 定建树。

```ts
const shape = new RightOperandFormPossibleShape();
shape.Kind = kind;
shape.Inner = inner;
return shape;
```

## static method IsOperatorLike:(unit:Token)=>bool

**唯一的「这是右操作数位」判据**：前一个代码单元是一个**运算符形状**。

`*TokenShape` 覆盖全部标点运算符（`+` / `-` / `*` / `/` / `%` / `<` / `>` / `&&` / `||` / `??` / `===` /
`**` / `:` / `?` …）；关键字运算符 `in` / `instanceof` 是 `KeywordShape` 结尾，单独两格。
不认 `Common`：右操作数位的前驱在这一刻**一定**已经建成形状（`BinaryExpressionShape` 是
「左操作数 + 运算符」两格建出来的），认 `Common` 只会把别的格误判成右操作数位。

```ts
if (!(unit instanceof ShapeToken)) {
  return false;
}
const name = unit.constructor.name;
if (name.endsWith("TokenShape")) {
  return true;
}
return name === "InKeywordShape" || name === "InstanceofKeywordShape";
```

## static method Claims:(unit:Token, kind:string)=>bool

当前格是不是这种形态（只看单元本身，不看前驱）。

```ts
if (kind === "paren") {
  if (!(unit instanceof Bracket)) {
    return false;
  }
  if (!(unit as Bracket).Closed) {
    return false;
  }
  return (unit as Bracket).StartBracketChar === "(";
}
if (kind === "string" || kind === "template") {
  if (!(unit instanceof String)) {
    return false;
  }
  const interpolation = (unit as String).IsSupportInterpolation;
  if (kind === "string") {
    return !interpolation;
  }
  return interpolation;
}
if (kind === "keyword") {
  if (!(unit instanceof Common)) {
    return false;
  }
  return (unit as Common).IsAny(["true", "false", "null"]);
}
return false;
```

## static method IsRelational:(unit:Token)=>bool

前驱是不是**关系运算符**（`<` / `>`）。模板那一条要看它，理由见 `AcceptsPrevious`。

```ts
const name = unit.constructor.name;
return name === "LessThanTokenShape" || name === "GreaterThanTokenShape";
```

## static method AcceptsPrevious:(kind:string, previous:Token)=>bool

「这种形态准不准在前驱 `previous` 之后建」——`IsOperatorLike` 之上的第二条**窄化**判据。

**`template` 不认 `<` / `>`**（实测）：`f<T>`t`` 这一族在 token 层被折成 `f < T > `（`declaration 符号 <`
是 D3a 那一族），前驱因此是 `GreaterThanTokenShape`；在这里建**裸模板**会把 TS 的
`TaggedTemplateExpression` 读成 `BinaryExpression((f < T) > `t`)`——崩溃消失但树是错的
（`gap-r977-inst-tagged.ts` 实测 `TaggedTemplateExpression -1 / BinaryExpression +2`）。
按 C10 宁可继续显式失败，也不静默产出错树：这一格等尖括号配对（类型面）修好之后前驱不再是 `>`，
本候选自然就接手了。其余形态不受影响（`a > "x"` / `a < (b)` 照建）。

```ts
if (kind === "template") {
  return !RightOperandFormPossibleShape.IsRelational(previous);
}
return true;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

越界 / trivia → `Uncertain`（被 `Reject` 的候选在本条目内不回来）；
扫描下界走 `ItemUtil.ItemStartCached`（C8）；
前驱不是运算符形状 → `Reject`；形态不命中 → `Reject`；其余 → `Accept`。

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
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return ShapeStates.Reject;
}
if (!RightOperandFormPossibleShape.IsOperatorLike(units[previous])) {
  return ShapeStates.Reject;
}
if (!RightOperandFormPossibleShape.AcceptsPrevious(this.Kind, units[previous])) {
  return ShapeStates.Reject;
}
if (!RightOperandFormPossibleShape.Claims(unit, this.Kind)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

trivia 格不建（与 `RightOperandPossibleShape` 同一个坑）。括号另要「括号里能整段吃完」：
`ParenthesizedPossibleShape.CanParseInside` 是既有的那一条判据，这里只调它。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (this.Kind !== "paren") {
  return true;
}
if (!(unit instanceof Bracket)) {
  return false;
}
return ParenthesizedPossibleShape.CanParseInside(unit as Bracket, context);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

1. 在宿主里定位要建的那一格（trivia 前移，与 `RightOperandPossibleShape.BuildByIndex` 同一口径）；
2. 运算符与右操作数之间的 trivia 从宿主摘掉（legacy 的 `BinaryExpressionShape` 不保留它们）；
3. 转调 `Inner.BuildByIndex` 建节点（**唯一**的节点构造处）；
4. 宿主是 `BinaryExpressionShape` 且还没封口 ⇒ `SealRightOperand`（括号那条自己会封，别封两次）。

```ts
if (this.Inner === null) {
  throw new Error("增量变量形状未支持：expression 右操作数形态缺内部候选");
}
let codeIndex = ItemUtil.NextCode(host.Data, tokenIndex);
if (codeIndex < 0 || codeIndex >= host.Data.length) {
  throw new Error("增量变量形状未支持：expression 右操作数");
}
while (codeIndex > 0 && host.Data[codeIndex - 1].IsTriviaToken) {
  host.Data.splice(codeIndex - 1, 1);
  codeIndex -= 1;
}
const built = this.Inner.BuildByIndex(host, codeIndex, catalog, context);
if (host instanceof BinaryExpressionShape) {
  const binary = host as BinaryExpressionShape;
  if (!binary.Closed) {
    binary.SealRightOperand(context);
  }
}
return built;
```
