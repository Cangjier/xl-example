# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { IdentifierShape } from "../../../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../../../literals/numeric-literal-shape.xl.md"
import { PropertyAssignmentShape } from "../../../members/property-assignment-shape.xl.md"
import { ShorthandPropertyAssignmentShape } from "../../../members/shorthand-property-assignment-shape.xl.md"
import { SpreadAssignmentShape } from "../../../members/spread-assignment-shape.xl.md"
import { ShapePosition } from "../../../positions/shape-position.xl.md"
import { BracketRole } from "../../../statements/bracket-role-resolver.xl.md"
import { BracketRoleCatalog } from "../../../statements/bracket-role-resolver.xl.md"
import { BracketRoleResolver } from "../../../statements/bracket-role-resolver.xl.md"
import { StatementRouteUtil } from "../../../statements/statement-route-util.xl.md"
import { ExpressionAtomRegistry } from "./expression-atom-registry.xl.md"
```

# namespace cangjie

B4 的**表达式括号内容目录**：对象字面量 `{` / 数组字面量 `[` / 调用实参 `(` / 分组括号 `(`。

它接的是 B0 的三件套（`_reports/B0a.md`）：角色由 `BracketRoleResolver.Resolve` 在**括号创建格**判定，
`BracketCatalogInstaller` 把本文件唯一的候选装到**括号自己**的 `CatalogGuide` 上，终结候选是永不 `Accept` 的
`WaitingEndPossible`。于是括号里的每个 basic token 关闭时都会被问一格，命中的就地建出形状。

**为什么只建「原子 + 成员」、不建括号本身**（与 A2 §4.4 的「半截形状」顾虑逐条对应）：

| 括号里的格 | 建什么 | 判据 | 谁消费 |
|---|---|---|---|
| 标识符 `a` | `IdentifierShape` | `Common` 且非数字、非保留字 | `ParsePrimary`（值位）/ `ParseName`（对象属性名位） |
| 数字 `1` | `NumericLiteralShape` | `Common.IsNumber()` 且非 BigInt | `ParsePrimary` |
| `a: 1` | `PropertyAssignmentShape`（名 + 值两个已建原子） | 值格回看一格是 `Symbol(":")`、再回看是已建原子 | `ParseObjectLiteral` 的成员循环 |
| `a`（短写） | `ShorthandPropertyAssignmentShape` | 名字格之后的下一个代码单元是 `,` 或没有了 | 同上 |
| `...a` | `SpreadAssignmentShape` | 名字格前回看一格是 `Symbol("...")` | 同上 |
| 符号 `:` `,` `(` `)` | **不建**（保持 raw `Symbol`） | 符号位归 legacy 的表达式解析 | — |

括号**本身**（`ObjectLiteralExpressionShape` / `ArrayLiteralExpressionShape` / `CallExpressionShape` /
`ParenthesizedExpressionShape`）仍然由既有收口路径建：`Bracket.Close` 只问父单元、不问自己的目录，
而「宿主关闭后把括号换成容器形状」这一步的所有权在 A4b 的 `CompositeInitializerJudge`
（`variable-declaration-end-possible-shape` 的收口格）与 call / P4 的收口候选上——B4 不改它们
（任务书：不碰 `variable-declaration-*`）。本目录建出的子形状被它们**消费**，不重复建。

**互斥性（A2 §7 R1）**：本候选的 `ComputeByIndex` 永远 `Uncertain`（既不 `Accept` 也不 `Reject`），
建不建只看 `IsBuildable`。于是 `Candidates.size === 1` 恒成立，`CatalogGuide` 的两条抛错出口都不可达。

**`Reject` 永久、replay 一次**（B0 规则）：本候选不 `Reject`，也不 replay——目录在**创建格**装上，
创建时 `Data` 为空，字符逐个到达即可；`Deferred` 只用于箭头形参（见 `BracketRole.ArrowParams`）。

# class ExpressionBracketScan

一只表达式括号的扫描状态（`Host` 是括号的 `Data` 数组对象，与 `ControlHeadScan` 同一手法：
按数组对象登记，括号被丢弃时随之一并失效）。

## field Host:Array<Token> | null = null

## field Kind:string = ""

括号的角色（`BracketRole.ObjectLiteral` / `ArrayLiteral` / `CallArgs` / `ParenExpression`）。

## field Enabled:bool = false

这只括号是否归本目录。`false` 时一格都不建，括号内容**逐字节保持 raw**，交 legacy 收口。

## field Atoms:int = 0

本括号已经逐字建出的原子个数（只用于计数报告）。

# class ExpressionBracketPossibleShape extends PossibleShape

**表达式括号内容目录的唯一候选（B4）。**

## static field States:Array<ExpressionBracketScan> = []

按括号 `Data` 数组对象登记的状态。

## static field CatalogRegistered:bool = false

## static field CreatePossibleShapesCache:Array<PossibleShape> | null = null

## static field RoleKinds:Array<string> = ["ObjectLiteral", "ArrayLiteral", "CallArgs", "ParenExpression"]

本候选认的角色（`BracketRole` 的字符串常量，与目录注册一一对应）。

## static field Reserved:Array<string> = ["new", "delete", "typeof", "void", "this", "super", "null", "true", "false", "function", "class", "async", "await", "yield", "in", "of", "instanceof", "import", "export", "let", "const", "var", "using", "static", "get", "set", "type", "declare", "abstract", "extends", "implements", "as", "satisfies", "keyof", "is", "infer", "asserts", "unique", "readonly", "namespace", "module", "enum", "interface", "return", "throw", "if", "else", "for", "while", "do", "switch", "case", "default", "try", "catch", "finally", "with", "break", "continue", "debugger"]

`Common` 里**不能**被当成普通标识符的词：这些位置 legacy 会建专用形状（`NewExpressionShape` /
`ThisKeywordShape` / 声明壳 …），一旦提前建成 `IdentifierShape`，收口格就再也回不去了。

## static method Shapes:()=>Array<PossibleShape>

目录里**唯一**的候选（进程内只建一份，与 `ControlHeadPossibleShape.Shapes` 同一纪律）。

```ts
if (ExpressionBracketPossibleShape.CreatePossibleShapesCache === null) {
  ExpressionBracketPossibleShape.CreatePossibleShapesCache = [new ExpressionBracketPossibleShape()];
}
return ExpressionBracketPossibleShape.CreatePossibleShapesCache;
```

## static method EnsureRegistered:()=>void

把四个角色目录注册进 `BracketRoleResolver`，幂等（只注册一次），并打开 `FlushOnClose`
（`{a}` / `f(a)` 的最后一个原子是被括号的闭括号终结的，逐格判定那一拍不会发生）。

```ts
if (ExpressionBracketPossibleShape.CatalogRegistered) {
  return;
}
ExpressionBracketPossibleShape.CatalogRegistered = true;
const roles:Array<string> = [BracketRole.ObjectLiteral, BracketRole.ArrayLiteral,
  BracketRole.CallArgs, BracketRole.ParenExpression];
for (const role of roles) {
  const catalog = new BracketRoleCatalog(role, ExpressionBracketPossibleShape.Shapes(), null);
  catalog.FlushOnClose = true;
  BracketRoleResolver.RegisterCatalog(catalog);
}
```

## static method Reset:()=>void

清空扫描状态（`SourceFileShape` 构造器每文件一次；与 `ExpressionAtomRegistry.Reset` 并排调用）。

```ts
ExpressionBracketPossibleShape.States = [];
```

## static method FindState:(units:Array<Token>)=>ExpressionBracketScan | null

```ts
for (const state of ExpressionBracketPossibleShape.States) {
  if (state.Host === units) {
    return state;
  }
}
return null;
```

## static method Decide:(bracket:Token)=>ExpressionBracketScan

这只括号归不归本目录（**唯一**的 site 判据）：`Kind` 取角色的字符串名，`Enabled` 只认四个表达式角色。
角色由 `BracketRoleResolver` 已经写进 `Bracket.Role`（B0 的纯标量字段），这里**不重新判一次**。

```ts
const units = bracket.Data;
const known = ExpressionBracketPossibleShape.FindState(units);
if (known !== null) {
  return known;
}
const state = new ExpressionBracketScan();
state.Host = units;
state.Kind = (bracket as Bracket).Role;
state.Enabled = ExpressionBracketPossibleShape.RoleKinds.indexOf(state.Kind) >= 0;
ExpressionBracketPossibleShape.States.push(state);
if (state.Enabled) {
  StatementRouteUtil.ExprBracketGuideCount += 1;
}
return state;
```

## static method IsPlainIdentifier:(text:string)=>bool

标识符字面形态：首字符字母 / `_` / `$`，其余为字母数字 / `_` / `$`。

```ts
if (text.length === 0) {
  return false;
}
const first = text.charAt(0);
if (!((first >= "a" && first <= "z") || (first >= "A" && first <= "Z")
  || first === "_" || first === "$")) {
  return false;
}
for (let at = 1; at < text.length; at++) {
  const ch = text.charAt(at);
  if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9")
    || ch === "_" || ch === "$") {
    continue;
  }
  return false;
}
return true;
```

## static method AtomKind:(unit:Token)=>string

这一格能建出什么：`"identifier"` / `"number"` / `""`（不建）。
符号位、trivia、字符串 / 正则 / 模板一律 `""`——它们归 legacy 或 A2 的原子面。

```ts
if (unit === null || unit.IsTriviaToken) {
  return "";
}
if (!(unit instanceof Common)) {
  return "";
}
const common = unit as Common;
if (common.IsNumber()) {
  if (common.IsBigInt()) {
    return "";
  }
  return "number";
}
const text = common.TempToString();
if (StatementRouteUtil.IsLegacyKeyword(text)) {
  return "";
}
if (ExpressionBracketPossibleShape.Reserved.indexOf(text) >= 0) {
  return "";
}
if (!ExpressionBracketPossibleShape.IsPlainIdentifier(text)) {
  return "";
}
return "identifier";
```

## static method PreviousCode:(units:Array<Token>, tokenIndex:int)=>int

`tokenIndex` **之前**第一个非 trivia 单元的下标；没有返回 `-1`。

```ts
for (let index = tokenIndex - 1; index >= 0; index--) {
  if (!units[index].IsTriviaToken) {
    return index;
  }
}
return -1;
```

## static method NextCode:(units:Array<Token>, tokenIndex:int)=>int

`tokenIndex` **之后**第一个非 trivia 单元的下标；没有返回 `-1`。

```ts
for (let index = tokenIndex + 1; index < units.length; index++) {
  if (!units[index].IsTriviaToken) {
    return index;
  }
}
return -1;
```

## static method SymbolText:(unit:Token)=>string

`unit` 是 `Symbol` 时返回它的文本，否则空串。

```ts
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
return "";
```

## static method IsArrowParameterBracket:(bracket:Bracket)=>bool

`bracket` 是不是箭头形参表：`)=>`（或 `): T =>`）就是。判据只看建树那一刻**父单元 `Data` 里**
紧跟本括号的代码单元——与 A4b `arrowparen` 的前瞻同一条（跨步稳定，不读源码文本）。

```ts
const parent = bracket.Parent;
if (parent === null) {
  return false;
}
const at = parent.Data.indexOf(bracket);
if (at < 0) {
  return false;
}
let nextIndex = -1;
for (let index = at + 1; index < parent.Data.length; index++) {
  if (!parent.Data[index].IsTriviaToken) {
    nextIndex = index;
    break;
  }
}
if (nextIndex < 0) {
  return false;
}
if (ExpressionBracketPossibleShape.SymbolText(parent.Data[nextIndex]) === "=>") {
  return true;
}
if (ExpressionBracketPossibleShape.SymbolText(parent.Data[nextIndex]) !== ":") {
  return false;
}
// 返回类型标注：从 `:` 起扫到 `=>`；遇到 `,` / `;` / 括号就没有箭头（`(a) ? b : c` 不会到这里，
// 因为这里的前瞻只在 `)` 之后是 `:` 时才继续）。
for (let index = nextIndex + 1; index < parent.Data.length; index++) {
  const unit = parent.Data[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  const mark = ExpressionBracketPossibleShape.SymbolText(unit);
  if (mark === "=>") {
    return true;
  }
  if (mark === "," || mark === ";" || mark === ")" || mark === "}" || mark === "(") {
    return false;
  }
  if (unit instanceof Bracket) {
    return false;
  }
}
return false;
```

## static method PosAt:(bracket:Bracket, units:Array<Token>, tokenIndex:int)=>int

`Pos` 口径**与 `ExpressionBuilder.Load` 逐位相同**，而这份口径就是 `ShapePosition.PosAt`（R3）：
「`tokenIndex` 之前最近的 code 单元的 `End`；一格都没有就是**开启符 End**（`bracket.Start + 1`）」。
两者对同一个 `index` 必然同答案——旧实现从 `StartIndex + 1` 往后逐格走、遇到非 trivia 就记一次
`End`，走到 `tokenIndex` 停下，命中的就是同一个「上一个 code 单元」。

[R3:POS] 收敛后本方法**只剩兼容壳**：括号里第一格的名字 `Pos` 是 `{`+1（`{ a: 1 }` 的 `a` 是 10，
不是 11），这条正是 `ShapePosition.HostStart` 对 `Bracket` 的规则；留着这个签名是因为四个调用点
（对象成员封口 / 短写 / 展开）都拿着 `bracket`，读起来比 `ShapePosition.PosAt(bracket, …)` 更窄。

```ts
return ShapePosition.PosAt(bracket, units, tokenIndex);
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

永远 `Uncertain`：本候选既不 `Accept`（不触发建树）也不 `Reject`（不参与候选淘汰）。
于是 `Candidates.size === 1` 恒成立，`CatalogGuide` 的两条抛错出口都不可达。

```ts
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

这一格能不能现在建：只有「这一格是标识符 / 数字」才 `true`。
`host` 不在形参里，所以这里**不看** site 状态——`Decide` 的 `Enabled` 在 `BuildByIndex` 里把关，两边不重复。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
// 成员名位不建：`base.b` / `base.c?.d.length` 的 `b` / `d` 是成员名，不是独立原子。
// 提前建成 `IdentifierShape` 会让 legacy 的成员链（`MemberChainJudge` / `ParseMemberChain`）
// 读不到那个 `Common`（B4 实测：`expression-zoo.ts` 报「不支持的类型起点」）。
const previousIndex = ExpressionBracketPossibleShape.PreviousCode(units, tokenIndex);
if (previousIndex >= 0) {
  const mark = ExpressionBracketPossibleShape.SymbolText(units[previousIndex]);
  if (mark === "." || mark === "?.") {
    return false;
  }
  // 类型位不建：`[2, 3] as number[]` 的 `number` 在 `as` 后面，是**类型名**。
  // 建成 `IdentifierShape` 会让 `TypeBuilder` 读不到那个 `Common`（B4 实测：
  // `expression-zoo.ts` 报「不支持的类型起点」）。`satisfies` 同理。
  const beforeName = units[previousIndex];
  if (beforeName instanceof Common) {
    const beforeText = (beforeName as Common).TempToString();
    if (beforeText === "as" || beforeText === "satisfies") {
      return false;
    }
    // 访问器 / 方法名位不建：`{ get a() {} }` / `{ set a(v) {} }` / `{ async m() {} }` 的名字
    // 必须保持 `Common`——`ParseObjectLiteral` 的 `looksLikeMemberName` 判据是
    // `afterFirst instanceof Common`，提前建成 `IdentifierShape` 会让 `get a()` 退化成
    // 短写 + 方法两项（B4 实测：`getter.ts` / `setter.ts` 的 `GetAccessor-1`）。
    if (beforeText === "get" || beforeText === "set" || beforeText === "async") {
      return false;
    }
    // [B4b] 函数 / 类表达式的**名字位**不建：`{ named: function inner() { … } }` 的 `inner`
    // 是函数名，`ParseFunctionExpression` 要读那个 `Common`（提前建成 `IdentifierShape` 会报
    // 「函数表达式缺少参数括号」）。`class Foo` 同理。
    if (beforeText === "function" || beforeText === "class") {
      return false;
    }
  }
  // [B4b] **返回类型位**不建：对象字面量的方法签名 `{ m(): number { … } }` 里，`number` 的
  // 前一个是 `:`、再前一个是**已闭合的形参括号**。它归 `TypeBuilder.ParseReturnType`，
  // 提前建成 `IdentifierShape` 会让类型解析器报「不支持的类型起点」（B4 打开后的 5 条崩溃）。
  if (units[previousIndex] instanceof Bracket
    && (units[previousIndex] as Bracket).StartBracketChar === "(") {
    return false;
  }
  if (ExpressionBracketPossibleShape.SymbolText(units[previousIndex]) === ":") {
    const beforeColon = ExpressionBracketPossibleShape.PreviousCode(units, previousIndex);
    if (beforeColon >= 0 && units[beforeColon] instanceof Bracket
      && (units[beforeColon] as Bracket).StartBracketChar === "(") {
      return false;
    }
  }
}
// [B4b] **尖括号里不建**：`f<number>(1)` 的类型实参、`Promise<number>` 的类型参数都是类型位，
// 它们归 `TypeBuilder` / `ParseAngleStart`。判据只看括号自己 `Data` 里的 `<` / `>` 配对
//（`f<number>` 的 `number` 前一格是 `<`；深浅按计数，未闭合就一律不建——宁可少建，不可建错）。
let angleDepth = 0;
for (let at = 0; at < tokenIndex; at++) {
  if (units[at].IsTriviaToken) {
    continue;
  }
  const angleMark = ExpressionBracketPossibleShape.SymbolText(units[at]);
  if (angleMark === "<") {
    angleDepth += 1;
  } else if (angleMark === ">" && angleDepth > 0) {
    angleDepth -= 1;
  }
}
if (angleDepth > 0) {
  return false;
}
const atomKind = ExpressionBracketPossibleShape.AtomKind(units[tokenIndex]);
if (atomKind !== "identifier") {
  return atomKind !== "";
}
// [B4b] **尖括号的左操作数不建**：`f<number>` / `f<T>(1)` 的 `f` 一旦变成 `IdentifierShape`，
// `AngleJudge.PredecessorAllows`（它只认 `Common` / `Bracket` / `String`）就判不出类型实参，
// `<` 落进 `ParseBinary` 被吃成比较链（B4 打开后 `decl-instantiation-followers` 的「表达式意外结束」）。
// 建这一格时 `<` 还没进 `Data`，所以只看**紧接在单元原文之后的下一个非空白字符**：
// 是 `<` 就让路（比较链与类型实参都交 legacy，宁可少建不可建错）。
const range = units[tokenIndex].SourceRange;
if (range.Document !== null && range.End >= 0) {
  let ahead = range.End;
  const count = range.Document.GetCount();
  while (ahead < count) {
    const ch = range.Document.GetValue(ahead);
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      ahead++;
      continue;
    }
    break;
  }
  if (ahead < count && range.Document.GetValue(ahead) === "<") {
    return false;
  }
}
return true;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

把 `host.Data[tokenIndex]` 那一个 basic 单元**原地**换成原子（`Replace`，位置不变），再按角色做成员收口：

- **对象字面量**：值格回看 `Symbol(":")` + 已建的名字原子 ⇒ 拼 `PropertyAssignmentShape`；
  名字格之后下一个代码单元是 `,` / 没有 ⇒ 拼 `ShorthandPropertyAssignmentShape`；
  名字格前回看 `Symbol("...")` ⇒ 拼 `SpreadAssignmentShape`。
- **数组 / 调用实参 / 分组**：只建原子（元素与实参由收口候选逐段读）。

不建的情况（`Decide.Enabled === false` 或 `AtomKind === ""`）**什么都不改**，返回原单元。

```ts
const token = host.Data[tokenIndex];
if (token === undefined) {
  return token;
}
const state = ExpressionBracketPossibleShape.Decide(host);
if (!state.Enabled) {
  return token;
}
const bracket = host as Bracket;
// [B4b] **箭头形参表不建**：`{ a: (x: number) => x }` / `f((v: T) => v)` 的 `(` 在值位被本目录
// 认成「分组括号」（`:` / `,` 之后），但 `)` 后面紧跟 `=>` 时它是**形参表**：里面的名字与注解
// 必须保持 raw 交给 `BuildParameters`（B4 打开后 `expr-arrow-in-object-value` /
// `expr-paren-in-arguments` 的「函数参数只支持标识符或绑定模式」就是这一格）。
// 判据是**文档前瞻**（A2 §3 / A4b 的 `arrowparen` 同一条）：`)=>` 或 `): … =>`。
if (ExpressionBracketPossibleShape.IsArrowParameterBracket(bracket)) {
  return token;
}
const common = token as Common;
let built:ShapeToken;
if (ExpressionBracketPossibleShape.AtomKind(token) === "number") {
  built = NumericLiteralShape.FromBasicToken(common, context);
} else {
  built = IdentifierShape.FromBasicToken(common, context);
}
// 先给**上一个**成员收口（`{ a, b }` 的 `a` 在这一格才有「后面是 `,`」这个事实）。
if (state.Kind === BracketRole.ObjectLiteral) {
  ExpressionBracketPossibleShape.SealPendingShorthand(bracket, tokenIndex, context);
}
// [B4b] 封口可能把本格**之前**的单元摘掉（`{ a: 1, b: 2 }` 的 `:` 与 `1`），
// 因此下标必须按身份重算，不能沿用进入本方法时的 `tokenIndex`（否则 `Pos` 漂移，
// 严重时 `PreviousCode` 读到 `undefined` 直接抛 TypeError）。
const slot = bracket.Data.indexOf(token);
const posIndex = slot >= 0 ? slot : tokenIndex;
built.Pos = ExpressionBracketPossibleShape.PosAt(bracket, host.Data, posIndex);
ExpressionAtomRegistry.Register(built);
state.Atoms += 1;
StatementRouteUtil.ExprBracketAtomCount += 1;
common.Replace(built);
if (state.Kind === BracketRole.ObjectLiteral) {
  ExpressionBracketPossibleShape.SealMember(bracket, built, bracket.Data.indexOf(built), context);
}
return built;
```

## static method SealMember:(bracket:Bracket, atom:ShapeToken, tokenIndex:int, context:SyntaxContext)=>void

对象字面量里「这一格建出的原子」属于哪种成员，就地收口成一个成员形状：

| 形态 | 判据 | 结果 |
|---|---|---|
| `...a` | 前一个代码单元是 `Symbol("...")` | `SpreadAssignmentShape`（区间从 `...` 起，`...` 不进 `Data`） |
| `a: 1` 的值 | 前一个是 `Symbol(":")` 且再前一个是本目录建的原子 | `PropertyAssignmentShape`（名字 + 值） |
| `a`（短写） | 后面没有代码单元，或下一个是 `,` | `ShorthandPropertyAssignmentShape` |
| `a:` 的名字 / `[k]:` 的键 | 其余 | 先保持原子，由值格或 legacy 收口 |

**为什么在「值格」而不是「逗号格」收口**：`IsBuildable` 只在原子格为真（`,` 格不建），
所以成员只能在自己最后一个原子到达时成型；`{ a }` 的短写没有值格，就由名字格当场判「后面没有值」。

**槽位替换走 `ReplaceSlot` / `RemoveUnit`，不走 `Token.Replace`**：`FromParts` 已经把名字 / 值的
`Parent` 改成了新成员（`shape.Add(name)`），此后 `name.Replace(member)` 会在**成员自己的 `Data`** 里找
自身、把成员插进成员里（B4 第一版实测：`{ a: 1 }` 的 `a` 留在括号里、`:` 与 `1` 消失）。
槽位必须按**括号的 `Data` 下标**换，换完再把 `:` 与值这两格从括号里摘掉——它们已经是成员的子节点。

```ts
const units = bracket.Data;
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return;
}
const previousIndex = ExpressionBracketPossibleShape.PreviousCode(units, tokenIndex);
const previous = previousIndex < 0 ? null : units[previousIndex];
// 1. `...a`
if (previous !== null && ExpressionBracketPossibleShape.SymbolText(previous) === "...") {
  const spread = SpreadAssignmentShape.FromExpression(previous, atom, context);
  spread.Pos = ExpressionBracketPossibleShape.PosAt(bracket, units, previousIndex);
  ExpressionAtomRegistry.RegisterMember(spread);
  ExpressionBracketPossibleShape.ReplaceSlot(bracket, previousIndex, spread);
  ExpressionBracketPossibleShape.RemoveUnit(bracket, atom);
  StatementRouteUtil.ExprBracketMemberCount += 1;
  return;
}
// 2. `a: 1` 的值格：**不在这里封成员**（[B4b]）。值格到达时，值后面的 `as` / `=>` /
//    `? …` 还没进 `Data`，无法判断这个值是否已经完整；提前封会把剩下的一半留给下一个成员的
//    名字位（`{ v: 1 as number | null }` / `{ b: z => z }` / `{ start: range ? … }` 三条崩溃）。
//    成员改由 `SealPendingShorthand` 在**下一个原子到达**时回看封口——那时 `,` 已经在 `Data` 里。
return;
```

## static method SealPendingShorthand:(bracket:Bracket, tokenIndex:int, context:SyntaxContext)=>void

`{ a, b }` 的 `a` 只有到了 `b` 那一格才有「后面是 `,`」这个事实可用：回看
`tokenIndex` 前的两个代码单元，若是 `,` + 一个已建、未封的原子，就把它封成短写。
**行尾的最后一个短写不封**（`{ a }` 的 `}` 不在 `Data` 里，判据不可达）：它保持原子，
legacy 的 `ParseObjectLiteral` 会用 `FromParts(name, null)` 建出同一个
`ShorthandPropertyAssignmentShape`——树正确，只是那一格不是本目录建的（`_reports/B4.md` §4 记账）。

```ts
const units = bracket.Data;
const commaIndex = ExpressionBracketPossibleShape.PreviousCode(units, tokenIndex);
if (commaIndex < 0 || ExpressionBracketPossibleShape.SymbolText(units[commaIndex]) !== ",") {
  return;
}
const nameIndex = ExpressionBracketPossibleShape.PreviousCode(units, commaIndex);
if (nameIndex < 0) {
  return;
}
const beforeName = ExpressionBracketPossibleShape.PreviousCode(units, nameIndex);
// [B4b] 候选前一格是 `:` ⇒ 这是**上一个成员的完整值**（`{ a: 1, b: 2 }` 的 `1`）：`a` / `1`
// 都已经是本目录的原子，就地封成 `PropertyAssignmentShape`。封口放在**下一个原子到达**这一拍，
// 是因为值格到达时 `,` 还没进 `Data`，判不出值是否已经完整（见 `SealMember` 第 2 条）。
if (beforeName >= 0 && ExpressionBracketPossibleShape.SymbolText(units[beforeName]) === ":") {
  const ownerIndex = ExpressionBracketPossibleShape.PreviousCode(units, beforeName);
  const ownerUnit = ownerIndex < 0 ? null : units[ownerIndex];
  const colonUnit = units[beforeName];
  const valueUnit = units[nameIndex];
  if (ownerUnit !== null && ownerUnit instanceof ShapeToken && ExpressionAtomRegistry.Has(ownerUnit)
    && valueUnit instanceof ShapeToken && ExpressionAtomRegistry.Has(valueUnit)) {
    const property = PropertyAssignmentShape.FromParts(ownerUnit as ShapeToken,
      valueUnit as ShapeToken, context);
    property.Pos = ExpressionBracketPossibleShape.PosAt(bracket, units, ownerIndex);
    ExpressionAtomRegistry.RegisterMember(property);
    ExpressionBracketPossibleShape.ReplaceSlot(bracket, ownerIndex, property);
    ExpressionBracketPossibleShape.RemoveUnit(bracket, colonUnit);
    ExpressionBracketPossibleShape.RemoveUnit(bracket, valueUnit);
    StatementRouteUtil.ExprBracketMemberCount += 1;
  }
  return;
}
// 短写：候选必须是**成员起点**（名字前一个代码单元只能是 `,` 或没有，`{ a, b }` 的 `a`）。
// 否则会把**值**封成短写：`{ a: () => 1, b: 2 }` 的 `1`（前一格是 `=>`）在 `b` 到达时被
// 当成短写名字，箭头体于是从数据里消失（B4 打开后 `expr-array-of-arrows` /
// `expr-index-content-in-object` 的崩溃）。`0` 的 `:`、`1` 的 `=>` 都在这一条被挡下。
if (beforeName >= 0 && ExpressionBracketPossibleShape.SymbolText(units[beforeName]) !== ",") {
  return;
}
const nameUnit = units[nameIndex];
if (!(nameUnit instanceof ShapeToken) || !ExpressionAtomRegistry.Has(nameUnit)) {
  return;
}
const shorthand = ShorthandPropertyAssignmentShape.FromParts(nameUnit as ShapeToken, null, context);
shorthand.Pos = ExpressionBracketPossibleShape.PosAt(bracket, units, nameIndex);
ExpressionAtomRegistry.RegisterMember(shorthand);
ExpressionBracketPossibleShape.ReplaceSlot(bracket, nameIndex, shorthand);
StatementRouteUtil.ExprBracketMemberCount += 1;
```

## static method ReplaceSlot:(bracket:Bracket, at:int, member:ShapeToken)=>void

把括号 `Data` 里第 `at` 格换成 `member`（**下标换位**，不是 `Token.Replace`——理由见上）。
区间与 `Pos` 由 `FromParts` / `FromExpression` 从子节点算好，这里不重算。

```ts
if (at < 0 || at >= bracket.Data.length) {
  return;
}
bracket.Data.splice(at, 1, member);
member.Parent = bracket;
```

## static method RemoveUnit:(bracket:Bracket, unit:Token | null)=>void

把 `unit` 从括号 `Data` 里摘掉（它已经是成员形状的子节点，不能再留在括号的槽位里）。

```ts
if (unit === null) {
  return;
}
const at = bracket.Data.indexOf(unit);
if (at < 0) {
  return;
}
bracket.Data.splice(at, 1);
```
