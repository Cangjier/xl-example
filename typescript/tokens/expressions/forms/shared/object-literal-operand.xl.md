# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ExpressionBuilder } from "../../expression-builder.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { ExpressionAtomRegistry } from "./expression-atom-registry.xl.md"
```

# namespace cangjie

WP-A（R19）的**值位对象字面量候选**：一元 / 二元 / 三目这些「操作数位」上收到一只
**已闭合的 `{ … }` 括号**时，把它建成 `ObjectLiteralExpressionShape` 的**唯一**实现。

治的是 R1236 只做了一半的那条判据。R1236 让 `IsStatementStart` 认了「`in` / `instanceof` /
`typeof` 后面跟的是**值**，不是块」（`{` 是对象字面量），但**值位形状那一半没补**：

```text
const v = a in { b: 1 };        // `}` 处 CatalogGuide: 没有候选形状可以构成（宿主 BinaryExpressionShape）
const v = a instanceof { b: 1 };
const v = typeof { b: 1 };      // 前缀一元：expression 前缀一元操作数
const v = a + { b: 1 };         // 与 `in` 同一条：右操作数目录不认 `{`
const v = a && { b: 1 };
const v = a ? { b: 1 } : c;     // 三目中段：ConditionalMemberPossibleShape 只认 Common
```

**这不是「三个关键字」的事**：`a + {…}` / `a && {…}` / `a ? {…} : c` 逐一实测同一条首跳，
所以判据写成**值位 `{` ⇒ `ObjectLiteralExpression`**，三个关键字只是其中几格。

**为什么不复用 `ParenthesizedPossibleShape`**：它那条形态在 `ComputeByIndex` 里认的是
「前驱是运算符形状」，建树则转调 `ExpressionBuilder` 吃掉括号里的表达式。对象字面量要做的是
**同一件事的另一个形态**（`{` 而不是 `(`），但它的 `BuildByIndex` 没有可转调的既有候选：
容器关闭格候选里那段 `builder.ParsePrimary()` 是**内联**在 `BuildByIndex` 里的，
且它的宿主闸只认 `VariableDeclarationShape`（`BinaryExpressionShape` / `ConditionalExpressionShape`
一律 `return`）。所以这里把那段「解析 + 顶替 + 登记」抽成**唯一一份** `BuildInto`，
供右操作数形态候选、三目成员候选、前缀一元候选三处转调。

# class ObjectLiteralOperandPossibleShape extends PossibleShape

## static method Claims:(unit:Token)=>bool

值位对象字面量的**形态判据**：已闭合的 `{` 括号。只看单元本身，不看前驱——
「这是值位」由**调用方的候选**回答（右操作数形态靠前驱是运算符形状，三目成员靠前驱是
`?` / `:`，前缀一元靠自己的运算符串），本类不写第二套位置词法。

```ts
if (unit === null) {
  return false;
}
if (!(unit instanceof Bracket)) {
  return false;
}
if (!(unit as Bracket).Closed) {
  return false;
}
return (unit as Bracket).StartBracketChar === "{";
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

trivia → `Uncertain`（被 `Reject` 的候选在本条目内不回来）；扫描下界走
`ItemUtil.ItemStartCached`（与同一目录里的其它候选同一口径）；命中 `Claims` → `Accept`，
其余 `Reject`。

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
if (!ObjectLiteralOperandPossibleShape.Claims(unit)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

trivia 格不建（与目录里其它候选同一个坑）。形态不对也不建（`ComputeByIndex` 已经 `Reject`，
这里再判一次是防御）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
return ObjectLiteralOperandPossibleShape.Claims(unit);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

定位要建的那一格（trivia 前移，与 `RightOperandPossibleShape.BuildByIndex` 同一口径），
然后转调 `BuildInto`——**节点构造只有那一份**。

```ts
const codeIndex = ItemUtil.NextCode(host.Data, tokenIndex);
if (codeIndex < 0 || codeIndex >= host.Data.length) {
  throw new Error("增量变量形状未支持：值位对象字面量");
}
return ObjectLiteralOperandPossibleShape.BuildInto(host, codeIndex, context);
```

## static method BasePos:(units:Array<Token>, bracket:Bracket, at:int)=>int

`ExpressionBuilder` 的起点（`Pos` 口径）：前一个代码单元的终点；没有前驱时退回括号自己
的起点。与 `ContainerShapeCatalog.BasePos` 取「前一个代码单元终点」同一条，只是不认得
「父单元」那些兜底分支——值位 `{` 前面一定有代码单元（运算符 / `?` / `:` / 前缀运算符）。

```ts
for (let index = at - 1; index >= 0; index--) {
  const unit = units[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit.SourceRange.EndIndex >= 0) {
    return unit.SourceRange.EndIndex;
  }
  if (unit.SourceRange.StartIndex >= 0) {
    return unit.SourceRange.StartIndex;
  }
  break;
}
if (bracket.SourceRange.StartIndex >= 0) {
  return bracket.SourceRange.StartIndex;
}
return 0;
```

## static method BuildInto:(host:Token, codeIndex:int, context:SyntaxContext)=>Token

把宿主 `Data[codeIndex]` 那只 `{ … }` 括号换成 `ObjectLiteralExpressionShape`：

1. 用 `ExpressionBuilder` 按**宿主自己的 `Data`** 装载（括号必须作为**一个单元**被装载，
   `ParsePrimary` 才会把它当对象字面量整块吃掉；只喂括号里的孩子会得到成员列表而不是字面量）；
2. `builder.At` 指向括号那一格，`ParsePrimary`；
3. 必须**恰好**吃掉这一格（`builder.At === index + 1`）——少读 / 多读一律显式抛错（C10：
   宁可让文件走 fallback，也不静默产出错树）；
4. 原位顶替（长度不变，调用方的下标集合继续有效）、登记成容器、`MountedUnit` 若是这只括号就一起换。

```ts
const units = host.Data;
if (codeIndex < 0 || codeIndex >= units.length) {
  throw new Error("增量变量形状未支持：值位对象字面量");
}
const unit = units[codeIndex];
if (!(unit instanceof Bracket)) {
  throw new Error("增量变量形状未支持：值位对象字面量不是括号");
}
const bracket = unit as Bracket;
if (!bracket.Closed) {
  throw new Error("增量变量形状未支持：值位对象字面量括号未闭合");
}
if (bracket.StartBracketChar !== "{") {
  throw new Error("增量变量形状未支持：值位对象字面量括号字符 " + bracket.StartBracketChar);
}
const builder = new ExpressionBuilder(host.Template, context);
builder.Load(units, ObjectLiteralOperandPossibleShape.BasePos(units, bracket, codeIndex));
const index = builder.Units.indexOf(bracket);
if (index < 0) {
  throw new Error("增量变量形状未支持：值位对象字面量不在宿主里");
}
builder.At = index;
const built = builder.ParsePrimary();
if (built === null || built === bracket || built.IsBasicToken) {
  throw new Error("增量变量形状未支持：值位对象字面量未建出形状");
}
if (builder.At !== index + 1) {
  throw new Error("增量变量形状未支持：值位对象字面量未读全");
}
built.Parent = host;
if (host.MountedUnit === bracket) {
  host.MountedUnit = built;
}
units.splice(codeIndex, 1, built);
ExpressionAtomRegistry.RegisterContainer(built);
return built;
```
