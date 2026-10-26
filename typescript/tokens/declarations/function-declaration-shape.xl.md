# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { AsyncKeywordShape } from "../keywords/async-keyword-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { AsteriskTokenShape } from "../punctuation/asterisk-token-shape.xl.md"
import { ParameterShape } from "../types/parameter-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { StatementBuilder } from "../statements/statement-builder.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
import { MemberBoundary } from "../types/member-boundary.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { DecoratorShape } from "../types/decorator-shape.xl.md"
import { BlockPossibleShape } from "../statements/block-possible-shape.xl.md"
import { StatementRouteUtil } from "../statements/statement-route-util.xl.md"
import { BracketCatalogInstaller } from "../statements/bracket-catalog-installer.xl.md"
import { BracketRoleCatalogHook } from "../statements/bracket-role-catalog-hook.xl.md"
import { BracketRoleResolver } from "../statements/bracket-role-resolver.xl.md"
import { ComputePossibleShapesStates } from "../../../core/syntax/compute-possible-shapes-states.xl.md"
import { ParameterListPossibleShape } from "../types/parameter-list-possible-shape.xl.md"
```

# namespace cangjie

# class FunctionDeclarationShape extends ShapeToken

```txt
function f() {}
function f(a) {}
function f(a: A) {}
function f(a?: A) {}
function f(a: A, b: B): C { return a; }
function f(): void {}
declare function f(): void;
function f(a: A): B;
async function f() {}
async function f(a: A): B { await a; }
declare async function f(): void;
```

## field DeclareKeyword:Token | null = null

## field AsteriskToken:Token | null = null

## field FunctionName:Token | null = null

## field Parameters:Array<Token> = []

## field ReturnType:Token | null = null

## field Body:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## method OnBracketCreatedEvent:(bracket:Token, context:SyntaxContext)=>void

**[WP-S1] 根层 / 块内函数声明的体括号挂块体语句目录；[B1] 参数表 `(` 装逐字目录。**

`Bracket.Transit` 在挂好子括号之后通知宿主 `OnBracketCreatedEvent`。`UnitToken` 上有一个空实现，
所以这一段对每个单元都会走到。两条分支互不相干：

1. **`(`（B1 / A1 矩阵 #1，D-a 型）**：函数名先逐字建（`f` 在 `(` 格出现，不再等收口），
   再让 B0 的角色机制给参数表挂 `ParameterList` 目录。**只接简单参数表**
   （`[ '...' ] name [ ':' type ]`）；其余形态一个字节都不动，整段留给 `BuildParameters`。
2. **`{`（WP-S1）**：函数体挂块体语句目录，判据与收口同源
   （`TypeBuilder.IsBodyBrace`：返回类型里的对象字面量不是体）。

不挂体目录的后果是结构性的：`FunctionDeclarationPossibleShape` 在关键字格 `MountShell` 建的壳只有终结候选，
体内没有目录 ⇒ 体内每条语句都停在 raw 单元上，`switch` / `case` / `if` 全部拿不到壳（`control-flow`
的 `SwitchStatementShape` 0 次、`BlockBodyStatementCount` 0 就是它）。挂上之后体内语句与块体
**同一条**通道（`BuildBlock` 的 `HasBuiltBodyStatements` / `CollectBodyStatements`），
`FunctionDeclarationShape.FromUnits` → `StatementBuilder.BuildStatement` 照旧建树，不新增建树路径。

```ts
if (!(bracket instanceof Bracket)) {
  return;
}
const shape = bracket as Bracket;
if (shape.StartBracketChar === "(") {
  FunctionDeclarationShape.OpenParameterList(this, shape, context);
  return;
}
if (shape.StartBracketChar !== "{") {
  return;
}
if (!StatementRouteUtil.EnableShellExpressions || !StatementRouteUtil.EnableFunctionBodyCatalog) {
  return;
}
const body = bracket as Bracket;
if (body.CatalogGuide !== null) {
  return;
}
if (!StatementRouteUtil.EnableBlockBodyCatalog) {
  return;
}
if (!TypeBuilder.IsBodyBrace(this.Data, this.Data.length - 1)) {
  return;
}
// 完整块体目录：体内语句与控制流块体走**同一条**通道（语句壳 + `BuildBlock` 的收集路径）。
// 只挂控制流族候选**不行**：目录里没有变量 / 表达式候选时 `ItemUtil.ItemStart` 永远停在本体第一条
// raw 语句上，`Decide` 拿到的首词一直是 `let`，后面的 `switch` 拿不到格子（实测 `SwitchStatementShape`
// 首见从 69 退到 268、`SwitchCaseClauseMountCount` 归 0）。
BlockPossibleShape.MountBodyCatalog(body);
StatementRouteUtil.FunctionBodyShellCatalogCount += 1;
```

## static method PromoteName:(host:Token, bracket:Bracket, context:SyntaxContext)=>void

**[B1] 函数名逐字建**：`(` 创建时，宿主 `Data` 里紧挨在括号前面的那个 `Common` 就是函数名。

legacy 要等整条声明在 `}` 收口时才建 `IdentifierShape`（`FromUnits` 的 `nameUnit` 分支），
`f` 因此一直以 raw `Common` 待到第 31 格。这里提前建成形状，`Pos` 按 legacy 同一口径
（前一个非 trivia 单元的 `EndIndex`：`function f` 是 `function` 的终点 8）。

`FromUnits` 收口时见到 `IdentifierShape` 直接消费（见那里的 `[B1]` 分支），不再重建。

```ts
const at = host.Data.indexOf(bracket);
if (at <= 0) {
  return;
}
let nameAt = -1;
for (let back = at - 1; back >= 0; back--) {
  if (!host.Data[back].IsTriviaToken) {
    nameAt = back;
    break;
  }
}
if (nameAt < 0) {
  return;
}
const unit = host.Data[nameAt];
if (!(unit instanceof Common)) {
  return;
}
let pos = 0;
for (let back = nameAt - 1; back >= 0; back--) {
  if (!host.Data[back].IsTriviaToken) {
    const end = host.Data[back].SourceRange.End;
    if (end >= 0) {
      pos = host.Data[back].SourceRange.EndIndex;
    }
    break;
  }
}
const name = IdentifierShape.FromBasicToken(unit as Common, context);
name.Pos = pos;
host.Data.splice(nameAt, 1, name);
ParameterListPossibleShape.PromotedNameCount += 1;
```

## static method OpenParameterList:(host:Token, bracket:Bracket, context:SyntaxContext)=>void

**[B1] 参数表 `(`：装 `ParameterList` 角色目录。**

调用顺序是硬要求：

1. `ParameterListPossibleShape.InstallIfSimple` 先判「简单参数表」——判不进就整段交 legacy，
   **连名字都不提前建**（半建的名字 + legacy `FromUnits` 的 `Common` 分支会对不上）；
2. 名字提前建（`f` 在 `(` 格出现）；
3. 打开 B0 的总闸并装配 `BracketRoleHook`，注册 `ParameterList` 角色目录；
4. `BracketRoleResolver.Resolve` → `BracketCatalogInstaller.Install`。

第 3 步之后，同一文件里**其余括号**也会走一次角色解析：族已装目录的返回
`Known` + `AlreadyInstalled`（`SetEndPossible(null)`，一个字节都不改），没有目录的返回
`Fallback` / `Deferred`（只计数，不改 AST）——这正是任务书允许的「其它 site 继续走现状，
`BracketRoleFallbackCount` 可涨但不改 AST」。

```ts
if (!ParameterListPossibleShape.InstallIfSimple(host, bracket, context)) {
  return;
}
FunctionDeclarationShape.PromoteName(host, bracket, context);
StatementRouteUtil.EnableBracketRoleCatalog = true;
BracketRoleCatalogHook.EnsureInstalled();
ParameterListPossibleShape.EnsureRegistered();
const plan = BracketRoleResolver.Resolve(host, bracket, context);
if (plan.IsKnown()) {
  BracketCatalogInstaller.Install(bracket, plan, context);
}
```

## method ComputePossibleShapes:(context:SyntaxContext)=>ComputePossibleShapesStates

**[B1] 收口钩子**：`(` 括号闭合那一格会走 `Bracket.Close` 的「只问父单元」，
宿主（本声明）在这里拿到通知——参数表最后一个参数没有后继 token 可等，
只能靠这一格收口（`f(a: number)` 的类型、`f(a)` 的名字都在 `)` 那一格才 `Closed`）。

**先收参数壳，再问本声明自己的向导**：收口可能建出形状，而 `CatalogGuide` 复位之后
同一个向导才不会把同一格重算成 `Waiting`。`CatalogGuide === null` 时与基类逐字一致。

```ts
ParameterListPossibleShape.Finalize(this, context);
if (this.CatalogGuide !== null) {
  return this.CatalogGuide.ComputePossibleShapes(this, context);
}
return ComputePossibleShapesStates.Nothing;
```

## static method FromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext, ambient?:bool, allowAnonymous?:bool, fallbackPos?:int)=>FunctionDeclarationShape

```ts
const code:Array<Token> = [];
for (let at = start; at <= tokenIndex; at++) {
  if (!host.Data[at].IsTriviaToken) {
    code.push(host.Data[at]);
  }
}
// **R8：`fallbackPos` = 壳的 `basePos`（= 前一个 token 的 End，含前导 trivia）。**
// 下面两处「向前找上一个非 trivia 单元」在**壳的 `Data[0]` 本身是 trivia** 时找不到任何格
// （`{ @dec function f() {} }` 的块壳 `Data` 是 `[空白, @, dec, …, ]`，`start = 1`，扫到 −1 为止），
// 于是 `Pos` 落成 0：`@dec` 的 `Decorator` 左移到块外、`declare function f(): void\n@dec\nfunction g() {}`
// 的函数声明左移 26 格。口径与已修的 `declare function` 同源（修饰词前那一格 = 壳的 `BasePos`）。
// 做法只是把 `fallbackPos` 当成扫描的**初值**：扫到非 trivia 单元就照旧被它覆盖，
// 不传 `fallbackPos` 的调用点初值仍是 0 ⇒ 700+ 条既有形态逐字节不变。
const fallbackBase = fallbackPos ?? 0;
// **Stage 5d-8c：`export default function ()` 的恢复形**。匿名声明的代码单元只有
// `function` + 空参数表 `()` 两格（`()` 是一个括号单元），原来按「至少三格」判死 →
// 文件级 fallback。TS 对这种写法给的是「只有修饰词的 FunctionDeclaration」（没有名字 / 参数 / 体），
// 所以 `allowAnonymous` 的调用点把下界放宽到两格；其余位置仍要求三格（`function` + 名字 + 参数表）。
const minimumCode = (allowAnonymous ?? false) ? 2 : 3;
if (code.length < minimumCode) {
  throw new Error("函数声明不完整");
}
// 装饰器前缀（根 / 块里的 `@dec function f() {}`；TS 的 Decorator 是 FunctionDeclaration children
// 的第一项，排在 declare / async 之前——装饰器贴在声明头最外）。与 EnumDeclarationShape.FromUnits
// 的 decorator 扫描同口径。
let decoratorBase = fallbackBase;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const end = host.Data[at].SourceRange.End;
    if (end >= 0) {
      decoratorBase = end;
    }
    break;
  }
}
const decorators:Array<Token> = [];
let decoratorEnd = decoratorBase;
let decoratorCount = 0;
while (decoratorCount < code.length
  && code[decoratorCount] instanceof Symbol && (code[decoratorCount] as Symbol).Is("@")) {
  const atUnit = code[decoratorCount];
  const decoratorPos = decoratorEnd;
  const expressionBase = atUnit.SourceRange.End < 0 ? decoratorPos : atUnit.SourceRange.EndIndex;
  const builder = new ExpressionBuilder(host.Template, context);
  builder.Load(code.slice(decoratorCount + 1), expressionBase);
  if (builder.Units.length === 0) {
    throw new Error("decorator expression is empty");
  }
  const decoratorExpression = builder.ParseExpression();
  if (builder.At === 0) {
    throw new Error("decorator expression was not read");
  }
  const consumed = builder.At;
  for (let cursor = decoratorCount + 1; cursor < decoratorCount + 1 + consumed; cursor++) {
    const cursorEnd = code[cursor].SourceRange.End;
    if (cursorEnd >= 0) {
      decoratorEnd = cursorEnd;
    }
  }
  decoratorCount += 1 + consumed;
  decorators.push(DecoratorShape.FromParts(atUnit, decoratorExpression, decoratorPos, context));
}
let cursor = decoratorCount;
let declareUnit:Token | null = null;
let hasAsync = false;
const modifierUnits:Array<Token> = [];
while (cursor < code.length) {
  const unit = code[cursor];
  if (unit instanceof Common && (unit as Common).Is("declare") && declareUnit === null) {
    declareUnit = unit;
    modifierUnits.push(unit);
    cursor++;
    continue;
  }
  if (unit instanceof Common && (unit as Common).Is("async") && !hasAsync) {
    hasAsync = true;
    modifierUnits.push(unit);
    cursor++;
    continue;
  }
  break;
}
// 名字之后至少还要有参数表那一格；匿名恢复形（`export default function ()`）允许只有 `function` + `()`。
const minimumAfterModifiers = (allowAnonymous ?? false) ? 2 : 3;
if (code.length < cursor + minimumAfterModifiers) {
  throw new Error("函数声明不完整");
}
const keyword = code[cursor];
if (!(keyword instanceof Common) || !(keyword as Common).Is("function")) {
  throw new Error("函数声明缺少 function 关键字");
}
let asteriskUnit:Token | null = null;
let nameOffset = 1;
if (code[cursor + 1] instanceof Symbol && (code[cursor + 1] as Symbol).Is("*")) {
  asteriskUnit = code[cursor + 1];
  nameOffset = 2;
}
const nameUnit = code[cursor + nameOffset];
let paramIndex = cursor + nameOffset;
if (nameUnit instanceof Common || nameUnit instanceof IdentifierShape) {
  // [B1] `IdentifierShape`：名字已经在 `(` 格逐字建好（`OnBracketCreatedEvent` →
  // `PromoteName`），这里只认下它，绝不重建。
  paramIndex = cursor + nameOffset + 1;
} else if (!(allowAnonymous ?? false)) {
  throw new Error("函数声明的名字不是标识符");
}
let typeParameters:Array<Token> = [];
if (paramIndex < code.length && code[paramIndex] instanceof Symbol && (code[paramIndex] as Symbol).Is("<")) {
  // Generic function: "<...>" right after the name; TypeBuilder parses the list (same shape as
  // type alias parameters, including extends/default), and the list goes between Identifier and
  // Parameter[] in the AST children to match TS.
  const angleUnit = code[paramIndex] as Symbol;
  const angleBuilder = new TypeBuilder(host.Template, context);
  const angleStart = angleUnit.SourceRange.Start < 0 ? 0 : angleUnit.SourceRange.StartIndex;
  angleBuilder.Load(code.slice(paramIndex), angleStart);
  typeParameters = angleBuilder.ParseTypeParameterList();
  if (typeParameters.length === 0) {
    throw new Error("函数声明的泛型参数为空");
  }
  // `Load` 会把 `>>` / `>>>` 拆成多个只含 `>` 的虚拟单元，`angleBuilder.At` 是虚拟单元数，
  // 不能直接加到原始 code 下标上：按原 code 逐格还原「消费了几个原始单元」（`>>` 计 2、`>>>` 计 3）。
  let consumedUnits = 0;
  let mappedIndex = paramIndex;
  while (consumedUnits < angleBuilder.At && mappedIndex < code.length) {
    const mappedUnit = code[mappedIndex];
    let width = 1;
    if (mappedUnit instanceof Symbol) {
      const mappedText = (mappedUnit as Symbol).TempToString();
      if (mappedText.length > 1) {
        let allClose = true;
        for (let ci = 0; ci < mappedText.length; ci++) {
          if (mappedText[ci] !== ">") {
            allClose = false;
            break;
          }
        }
        if (allClose) {
          width = mappedText.length;
        }
      }
    }
    consumedUnits += width;
    mappedIndex++;
  }
  paramIndex = mappedIndex;
}
const paramUnit = code[paramIndex];
if (!(paramUnit instanceof Bracket) || (paramUnit as Bracket).StartBracketChar !== "(") {
  throw new Error("函数声明缺少参数表");
}
const last = code[code.length - 1];
const lastIsBrace = last instanceof Bracket && (last as Bracket).StartBracketChar === "{";
const lastIsSemicolon = last instanceof Symbol && (last as Symbol).Is(";");
// 末尾的 `{…}` 只有在「前一个单元能收住一个类型」时才是函数体；否则它是返回类型里的对象字面量
// （`declare function f(): { a: A }` 的最后一块就是类型，没有函数体）。
const bodyIsLast = lastIsBrace && TypeBuilder.IsBodyBrace(code, code.length - 1);
let tailIndex = bodyIsLast || lastIsSemicolon ? code.length - 1 : code.length;
let signOutUnit:Token = last;
let bodyUnit:Token | null = null;
if (bodyIsLast) {
  bodyUnit = last;
} else if (!lastIsBrace && !lastIsSemicolon) {
  // ambient 的无体、无分号函数（namespace 体里 `function f(): B` 换行接下一个成员）：
  // 调用方显式传 ambient=true 时才允许。
  // **Stage 5d-8c**：`export default function ()` 的恢复形同样没有体、没有分号、也没有返回类型，
  // TS 仍给一条 FunctionDeclaration（只有修饰词）。`allowAnonymous` 是从 `export default` 那一格
  // 传下来的（能走到这里的匿名函数只有这一种），所以这一格与 ambient 同等放行。
  if (!(ambient ?? false) && !(allowAnonymous ?? false)) {
    throw new Error("函数声明缺少函数体或分号");
  }
}
let returnType:Token | null = null;
const afterParams = paramIndex + 1;
if (afterParams < tailIndex) {
  const colon = code[afterParams];
  if (!(colon instanceof Symbol) || !(colon as Symbol).Is(":")) {
    throw new Error("函数声明的返回类型缺少冒号");
  }
  const typeUnits:Array<Token> = code.slice(afterParams + 1, tailIndex);
  if (typeUnits.length === 0) {
    throw new Error("函数声明的返回类型为空");
  }
  const typePos = colon.SourceRange.End < 0 ? 0 : colon.SourceRange.EndIndex;
  const typeBuilder = new TypeBuilder(host.Template, context);
  typeBuilder.Load(typeUnits, typePos);
  // 返回类型可以是类型谓词（`x is A` / `asserts x is A` / `asserts x`）：走 ParseReturnType 分流，
  // 其余类型仍由 ParseType 读（与函数类型位置同一套口子）。
  returnType = typeBuilder.ParseReturnType();
  if (typeBuilder.At !== typeBuilder.Units.length) {
    // ambient 函数无分号、下一行还有语句时，tokenIndex 可能把下一条语句也带进来：
    // 已收类型末单元与剩余段首之间有换行 → 返回类型到此为止（截 tailIndex）。
    const consumedLast = typeBuilder.Units[typeBuilder.At - 1];
    const leftoverFirst = typeBuilder.Units[typeBuilder.At];
    if ((declareUnit !== null || (ambient ?? false)) && consumedLast !== undefined
      && MemberBoundary.HasLineBreakBetween(consumedLast, leftoverFirst)) {
      tailIndex = afterParams + 1 + typeBuilder.At;
      signOutUnit = code[tailIndex - 1];
      // 返回类型在换行处被截断：`tokenIndex` 原先把后面的整段也带了进来，`bodyIsLast` 于是可能把
      // 下一条声明（如 `@dec class C {}`）的 `{…}` 误判成函数体。截断后必须重判 body：
      // 函数在 `signOutUnit` 收尾，不再持有任何 Block。
      bodyUnit = null;
    } else {
      throw new Error("函数声明的返回类型没有读完");
    }
  }
} else if (bodyUnit === null && declareUnit === null && (ambient ?? false) === false
  && (allowAnonymous ?? false) === false) {
  // A no-body declaration without "declare" needs a return type (overload signature) --
  // unless the caller says we are inside an ambient context (`declare module/namespace`, where the
  // declare is implicit and the return type may be omitted: `function f();`).
  // **Stage 5d-8c**：`export default function ()` 同样没有体也没有返回类型，TS 给的是只有修饰词的
  // FunctionDeclaration —— 与上一格同一个理由（`allowAnonymous` 放行）。
  throw new Error("function 声明没有函数体时必须带返回类型（或 declare）");
}
let pos = fallbackBase;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const end = host.Data[at].SourceRange.End;
    if (end >= 0) {
      pos = end;
    }
    break;
  }
}
const shape = new FunctionDeclarationShape(host.Template);
let modifierPos = decorators.length === 0 ? pos : decoratorEnd;
for (const decorator of decorators) {
  shape.Add(decorator);
}
for (const unit of modifierUnits) {
  if (unit instanceof Common && (unit as Common).Is("declare")) {
    const modifier = DeclareKeywordShape.FromBasicToken(unit as Common, context);
    modifier.Pos = modifierPos;
    if (shape.DeclareKeyword === null) {
      shape.DeclareKeyword = modifier;
    }
    shape.Add(modifier);
  } else {
    const modifier = new AsyncKeywordShape(host.Template);
    if (unit.SourceRange.Start >= 0) {
      modifier.SignIn(unit.SourceRange.StartIndex);
    }
    if (unit.SourceRange.End >= 0) {
      modifier.SignOut(unit.SourceRange.EndIndex);
    }
    modifier.Pos = modifierPos;
    modifier.TryToClose(context);
    shape.Add(modifier);
  }
  modifierPos = unit.SourceRange.End < 0 ? modifierPos : unit.SourceRange.EndIndex;
}
if (asteriskUnit !== null) {
  const asterisk = new AsteriskTokenShape(host.Template);
  asterisk.SignInToken(asteriskUnit);
  asterisk.SignOutToken(asteriskUnit);
  asterisk.Pos = keyword.SourceRange.End < 0 ? pos : keyword.SourceRange.EndIndex;
  asterisk.TryToClose(context);
  shape.AsteriskToken = asterisk;
  shape.Add(asterisk);
}
let name:Token | null = null;
if (nameUnit instanceof Common) {
  const builtName = IdentifierShape.FromBasicToken(nameUnit, context);
  if (asteriskUnit === null) {
    builtName.Pos = keyword.SourceRange.End < 0 ? pos : keyword.SourceRange.EndIndex;
  } else {
    builtName.Pos = asteriskUnit.SourceRange.End < 0 ? pos : asteriskUnit.SourceRange.EndIndex;
  }
  name = builtName;
} else if (nameUnit instanceof IdentifierShape) {
  // [B1] 已经逐字建好：`Pos` / 区间都是 `PromoteName` 按同一口径给的，原样收下。
  name = nameUnit;
}
// [B1] 参数目录已经建出 `ParameterShape` 时**直接消费**，不再让 `TypeBuilder` 把这段参数
// 重读一遍（那会在收口格一次补出整棵参数树，正是本 WP 要消灭的「成批补建」）。
// 只有没建 / 判不进简单形态（`CollectBuiltParameters` 返回 `null`）的旧路径才走 `BuildParameters`。
let parameters = ParameterListPossibleShape.CollectBuiltParameters(paramUnit as Bracket);
if (parameters === null) {
  parameters = FunctionDeclarationShape.BuildParameters(host, paramUnit as Bracket, context);
  ParameterListPossibleShape.LegacyFallbackCount += 1;
}
let body:Token | null = null;
if (bodyUnit !== null) {
  const bodyPos = FunctionDeclarationShape.PreviousEnd(code[tailIndex - 1]);
  const bodyBuilder = new StatementBuilder(host.Template, context);
  bodyBuilder.Load([bodyUnit], bodyPos);
  body = bodyBuilder.BuildStatement();
  if (bodyBuilder.At !== bodyBuilder.Units.length) {
    throw new Error("函数体没有读完");
  }
}
shape.FunctionName = name;
shape.Parameters = parameters;
shape.ReturnType = returnType;
shape.Body = body;
if (name !== null) {
  shape.Add(name);
}
for (const typeParameter of typeParameters) {
  shape.Add(typeParameter);
}
for (const parameter of parameters) {
  shape.Add(parameter);
}
if (returnType !== null) {
  shape.Add(returnType);
}
if (body !== null) {
  shape.Add(body);
}
if (decorators.length > 0) {
  shape.SignInToken(code[0]);
} else if (modifierUnits.length > 0) {
  shape.SignInToken(modifierUnits[0]);
} else {
  shape.SignInToken(keyword);
}
shape.SignOutToken(signOutUnit);
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```

## private static method PreviousEnd:(unit:Token | null)=>int

```ts
if (unit === null || unit.SourceRange.End < 0) {
  return 0;
}
return unit.SourceRange.EndIndex;
```

## static method TakeParameterInitializer:(host:Token, inner:TypeBuilder, parameter:ParameterShape, context:SyntaxContext)=>void

```ts
if (inner.At >= inner.Units.length || !inner.IsText(inner.Units[inner.At], "=")) {
  return;
}
const equalsUnit = inner.Units[inner.At];
let initPos = 0;
if (equalsUnit.SourceRange.End >= 0) {
  initPos = equalsUnit.SourceRange.EndIndex;
}
inner.At++;
const initStart = inner.At;
let initEnd = initStart;
while (initEnd < inner.Units.length && !inner.IsText(inner.Units[initEnd], ",")) {
  initEnd++;
}
const initUnits:Array<Token> = [];
for (let cursor = initStart; cursor < initEnd; cursor++) {
  initUnits.push(inner.Units[cursor]);
}
if (initUnits.length === 0) {
  return;
}
const initBuilder = new ExpressionBuilder(host.Template, context);
initBuilder.Load(initUnits, initPos);
const initializer = initBuilder.ParseAssign();
if (initBuilder.At !== initBuilder.Units.length) {
  throw new Error("参数默认值没有读完");
}
parameter.Add(initializer);
if (initEnd > initStart) {
  const initTail = inner.Units[initEnd - 1].SourceRange.End;
  if (initTail >= 0) {
    // 直接改字段：ParseParameter 已经 SpanNode 签过一次 End，再走 SignOutToken 会撞
    // SourceRangeEndIsSetted（core/exceptions/source-exception.xl.md:41）。
    parameter.SourceRange.End = initTail;
  }
}
inner.At = initEnd;
```

## static method BuildParameters:(host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>

```ts
const parameters:Array<Token> = [];
const inner = new TypeBuilder(host.Template, context);
let base = 0;
if (bracket.SourceRange.Start >= 0) {
  base = bracket.SourceRange.StartIndex + 1;
}
inner.Load(bracket.Data, base);
while (inner.At < inner.Units.length) {
  if (inner.IsText(inner.Units[inner.At], ",")) {
    inner.At++;
    continue;
  }
  // Parameter decorators: consume the `@...` prefix first (TS parser accepts them on plain function
  // parameters too), then dispatch as before. Children order: Decorator(s) before name/type.
  const groupStart = inner.At;
  const decorators:Array<Token> = inner.ParseDecorators();
  const nameIndex = inner.At;
  let typed = false;
  if (nameIndex + 1 < inner.Units.length) {
    const next = inner.TextOf(inner.Units[nameIndex + 1]);
    if (next === "?:") {
      typed = true;
    } else if (next === "?") {
      // `a?` 没有类型标注（`f(a?)` / `f(a?, b?)`）也必须是 ParameterShape：TS 的 Parameter
      // 是 name + QuestionToken、Type 缺失。旧口径只在 `?` 后紧跟 `:` 时才算类型化，于是 `a?`
      // 落进下面「裸标识符」分支，`?` 无人认领 → 下一次循环拿 `?` 当名字 → 「函数参数不是标识符」。
      // 正确做法：`?` 一律交 ParseParameter（它已支持 name + QuestionToken、无 Type）。
      typed = true;
    } else if (next === ":") {
      typed = true;
    }
  }
  // A rest parameter after decorators (`@dec ...x: A[]`) is routed to ParseParameter too (it owns `...`).
  const headIsRest = nameIndex < inner.Units.length && inner.TextOf(inner.Units[nameIndex]) === "...";
  // 解构模式形参（`{ a, b }` / `[c, d]`）与「有默认值」的形参（`a = 1`）也必须进 ParseParameter：
  // 前者由 ParseParameter 直接建 Object/ArrayBindingPattern，后者由下面补 Initializer。
  const headNameUnit = nameIndex < inner.Units.length ? inner.Units[nameIndex] : null;
  const headIsPattern = headNameUnit instanceof Bracket
    && ((headNameUnit as Bracket).StartBracketChar === "{" || (headNameUnit as Bracket).StartBracketChar === "[");
  const headIsDefault = nameIndex + 1 < inner.Units.length && inner.TextOf(inner.Units[nameIndex + 1]) === "=";
  if (typed || headIsRest || headIsPattern || headIsDefault) {
    const parameter = inner.ParseParameter() as ParameterShape;
    if (decorators.length > 0) {
      for (let i = decorators.length - 1; i >= 0; i--) {
        decorators[i].Parent = parameter;
        parameter.Data.unshift(decorators[i]);
      }
      const firstDecorator = decorators[0];
      if (firstDecorator.SourceRange.Start >= 0) {
        parameter.SourceRange.Start = firstDecorator.SourceRange.StartIndex;
      }
      parameter.Pos = (firstDecorator as ShapeToken).Pos;
    }
    FunctionDeclarationShape.TakeParameterInitializer(host, inner, parameter, context);
    if (headIsPattern && parameter.ParameterName !== null) {
      // 解构模式形参的 Pos 要含前导 trivia（`f(/*c*/ [c])` 的 `[` 从注释前算起）。
      // 有装饰器时 `groupStart` 停在第一个 `@`，前导 trivia 要接到**最后一个装饰器**之后
      // （`f(@a { x }: T)` 的 `{` pos = 装饰器 a 的 End+1），所以用名字下标 `nameIndex` 回看一格。
      let groupPos = 0;
      if (nameIndex > 0) {
        const previousUnit = inner.Units[nameIndex - 1];
        if (previousUnit.SourceRange.End >= 0) {
          groupPos = previousUnit.SourceRange.EndIndex;
        }
      } else if (bracket.SourceRange.Start >= 0) {
        groupPos = bracket.SourceRange.StartIndex + 1;
      }
      (parameter.ParameterName as ShapeToken).Pos = groupPos;
    }
    parameters.push(parameter);
    continue;
  }
  const nameUnit = inner.Units[nameIndex];
  if (!(nameUnit instanceof Common)) {
    throw new Error("函数参数不是标识符");
  }
  inner.At++;
  const parameter = new ParameterShape(host.Template);
  for (const decorator of decorators) {
    parameter.Add(decorator);
  }
  const name = IdentifierShape.FromBasicToken(nameUnit as Common, context);
  name.Pos = inner.Positions[nameIndex];
  parameter.ParameterName = name;
  parameter.Add(name);
  parameter.SignInToken(nameUnit);
  parameter.SignOutToken(nameUnit);
  parameter.Pos = inner.Positions[nameIndex];
  if (decorators.length > 0) {
    const firstDecorator = decorators[0];
    if (firstDecorator.SourceRange.Start >= 0) {
      parameter.SourceRange.Start = firstDecorator.SourceRange.StartIndex;
    }
    parameter.Pos = (firstDecorator as ShapeToken).Pos;
  }
  parameter.TryToClose(context);
  parameters.push(parameter);
}
return parameters;
```
