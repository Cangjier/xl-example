# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { WaitingEndPossible } from "./waiting-end-possible.xl.md"
```

# namespace cangjie

# class BracketRoleState

括号角色解析的三态（B0）。与 `StatementRoute` 同款：纯 `int` 常量，**不新增枚举**。

## static field None:int = 0

还没解析（`BracketRoleResolver.Resolve` 的返回值不会是它）。

## static field Known:int = 1

`Known`：角色**与它的宿主**都已经确定，可以当场装目录（或补终结候选）。

## static field Deferred:int = 2

`Deferred`：角色可以定，但**拥有它的壳还不存在**（或语句族还没判出来）。只登记，不装任何东西；
壳被建出来时由 `DeferredBracketCatalog.Bind(owner)` 唤醒并按升序 replay。

## static field Fallback:int = 3

`Fallback`：角色在语法上就不该在创建时定（返回类型里的对象字面量、对象字面量方法体），
或者**没有宿主规则 / 没有已注册目录**。显式计数、显式交给 legacy 收口，**不再静默走启发式**。

# class BracketRole

角色名（字符串常量）。用字符串而不是枚举，是为了让它同时当 `CatalogGuide` 目录缓存的键
（`族 + 角色`），并且**不影响任何既有 `switch` / 位掩码**。

角色清单与 `_reports/BRACKET-A1.md` §2.1 逐项对应；名字进计数器的 `ByRole` 那一维。

## static field Unknown:string = ""

## static field ParameterList:string = "ParameterList"

函数 / 方法的形参表（`function f(...)` / `m(...)`）。A1 矩阵 #1、#22 前半。

## static field FunctionBody:string = "FunctionBody"

函数体 / 方法体 / 构造器体的 `{`。A1 #2、#22 后半。

## static field TypeLiteral:string = "TypeLiteral"

**返回类型位置**的 `{`（`declare function f(): {a:A}`）。A1 #3，**只可能是 Fallback**：
`{` 创建时判不出来（`TypeBuilder.IsBodyBrace` 依赖 `previous` 还是 raw `Common`/`Symbol`，
名字一变 `IdentifierShape` 就失效），所以这里不许用文本硬猜。

## static field MemberList:string = "MemberList"

class / interface / enum 的成员块。A1 #4/#5/#6。

## static field DeclarationList:string = "DeclarationList"

namespace / module / class / interface / enum / type 的**声明体**（壳还没建时的延迟角色）。
A1 #7、#21 之外的声明体族。

## static field StatementBlock:string = "StatementBlock"

语句块体（`if` / `for` / `while` / `do` / `try` / 裸块 / 嵌套块 / 箭头体）。A1 #8、#11、#15、#19、#23。

## static field CaseBlock:string = "CaseBlock"

`switch` 的子句块（`{ case … }`）。A1 #9。

## static field ControlHead:string = "ControlHead"

控制流头 `(`（`if (` / `for (` / `while (` / `switch (` / `with (`）。A1 #14、#16、#17、#18、#20。
它的内容目录属表达式侧（A2），A1 WP-B3 明确：目录没就绪就只做 Deferred + 计数。

## static field ClauseList:string = "ClauseList"

`import` / `export` 的命名子句 `{`。A1 #25。

## static field Heritage:string = "Heritage"

`extends` / `implements` 子句。A1 #21 是**无括号**事件，本角色只占位、不参与解析。

## static field ImportExportClause:string = "ImportExportClause"

同 `ClauseList`，保留给 `ImportClauseShape` 宿主（A2 #14/#15 的括号在 clause 形状名下）。

## static field ObjectLiteralMethodBody:string = "ObjectLiteralMethodBody"

对象字面量里的方法体 `{`（`{ m() {} }`）。A1 #24，**只可能是 Fallback**。

## static field ObjectLiteral:string = "ObjectLiteral"

**对象字面量 `{`（B4 / A2 #7）。** 只在**表达式上下文**成立：初始化器的 `=` 之后、
复合字面量里的元素位（`[` / `(` / `{` 的 `Data` 里 `,` 之后）。块体、`case x:` 之后的块、
`=> {` 的块体、`class {` 的成员体都**不是**本角色（它们在被更早的宿主规则里判走；
判不出来的场合本类返回 `Fallback`，不硬猜）。

## static field ArrayLiteral:string = "ArrayLiteral"

**数组字面量 `[`（B4 / A2 #10）。** 判据同上（`= [` 或复合字面量里的元素位）。
下标 `a[0]` / 计算属性名 / 解构 `[a, b]` 仍返回 `Fallback("square-bracket-owned-by-expression-side")`。

## static field CallArgs:string = "CallArgs"

**调用实参 `(`（B4 / A2 #1）。** 前一个代码单元是可调用者（已建形状，或标识符 `Common`），
且不在 `new` 链上——`new` 的实参括号归 `NewPossibleShape`，这里必须让路（A2 #2）。

## static field ParenExpression:string = "ParenExpression"

**分组括号 `(`（B4 / A2 #3）。** 前一个代码单元是运算符形状（或 `?` / `:`）时的 `(...)`。

## static field ArrowParams:string = "ArrowParams"

**箭头形参 `(`（B4 / A2 #4 #5，Deferred）。** 初始化器起始格的 `(` 既可能是分组、也可能是箭头形参表，
只能等 `=>` 到达才确定 ⇒ 登记 `Deferred`、**不在 `(` 格硬猜**（A4b 的 `arrowparen` 前瞻 + B3b 的
`DeferredBracketCatalog` 是它的两条既有通道）。

**[B4f] 三处入口**：① `=` 之后（初始化器位）、② `async` 之后、③ `=>` 之后（嵌套箭头的内层形参表，
`x => (b) => b`）。三处都只登记、不建；`)=>` 成立时由 `ParseFunctionParameters` 那一拍定向 Bind 一次。

# class BracketRoleCatalog

一份「角色 → 候选目录」的登记条目。

**这是 B1 / B2 唯一的接线口**：它们各自 `new BracketRoleCatalog("ParameterList", [ new ParameterPossibleShape(), ... ], null)`
再 `BracketRoleResolver.RegisterCatalog(...)` 一行，之后 `Resolve` 对该角色返回 `Known`。
候选实例本身无状态（判定状态在 `CatalogGuide.PossibleShapesComputeCache` 里），所以目录只建一份、
所有括号共用——与 `BodyGuideUtil.CreateShapesCache` 同一条纪律。

`End` 刻意允许 `null`：终结候选由 `BracketCatalogInstaller` 统一补 `WaitingEndPossible`
（「Known/Deferred 一律配永不 Accept 的终结候选」是 `CatalogGuide` 不抛的前提，不允许各角色自带一个会 Accept 的）。

## field Role:string = ""

## field Shapes:Array<PossibleShape> = []

## field End:PossibleShape | null = null

## field FlushOnClose:bool = false

**宿主关闭时要不要补判最后一格**（B3 新增，默认 `false`）。`Known` 时装进
`CatalogGuide.FlushOnClose`（见 `bracket.xl.md` 的 `Close`）。

只有「宿主的闭括号会终结最后一个内容单元」的角色需要它——控制流头 `(` 就是这种：
`switch (a)` 的 `a` 是被 `)` 终结的。默认 `false` 保证既有目录（块体 / 函数体 / 参数表）逐字节不变。

## constructor:(role:string, shapes:Array<PossibleShape>, end:PossibleShape | null)=>void

```ts
this.Role = role;
this.Shapes = shapes;
this.End = end;
```

# class BracketRoleResult

`Resolve(host, bracket, context)` 的返回值：三态之一 + 它需要的全部数据。

与 `_reports/BRACKET-A1.md` §2.1 的 `RoleResolution` 一一对应：

```text
Known     → State = BracketRoleState.Known,    Shapes/End 可装, Owner = 拥有角色的壳
Deferred  → State = BracketRoleState.Deferred, Owner/OwnerKey = 将来会拥有它的壳, Reason = 为什么还不知道
Fallback  → State = BracketRoleState.Fallback, Reason = 为什么只能在收口定
```

**没有第四种返回值**（A2 §4.1 的硬要求）：调用方只按 `State` 分三路，不需要认识任何具体宿主。
`Reason` 一律是**可机械核对**的英文短句（计数与审计按它分组）。

## field State:int = 0

## field Role:string = ""

## field Owner:Token | null = null

角色归属的壳（不是括号）。`null` 表示「壳还不存在，只知道它的类名」。

## field OwnerKey:string = ""

将来会拥有这个角色的**壳的类名**（`DeferredBracketCatalog.Bind` 的匹配键）。
空串 = 通配（任何声明壳都可以认领，见 `Resolve` 的声明族分支）。

## field Shapes:Array<PossibleShape> = []

## field End:PossibleShape | null = null

## field Reason:string = ""

## field FlushOnClose:bool = false

角色目录声明「宿主关闭时补判最后一格」时从 `BracketRoleCatalog.FlushOnClose` 带过来；
`BracketCatalogInstaller.BuildGuide` 把它写到向导上（`CatalogGuide.FlushOnClose`）。

## static method Known:(catalog:BracketRoleCatalog | null, end:PossibleShape | null, role:string, owner:Token | null, ownerKey:string)=>BracketRoleResult

`Known`：角色与宿主都已确定。

`catalog` 可以为 `null`——那是「族自己已经装好目录了，本机制只做收尾」的情形
（`Resolve` 里 `bracket.CatalogGuide !== null` 那条短路）；这时 `Shapes` 为空、`End` 为 `null`，
`BracketCatalogInstaller.Install` 返回 `AlreadyInstalled`，**一个字节都不改**。

```ts
const result = new BracketRoleResult();
result.State = BracketRoleState.Known;
result.Role = role;
result.Owner = owner;
result.OwnerKey = ownerKey;
result.End = end;
if (catalog !== null) {
  result.Shapes = catalog.Shapes;
  result.FlushOnClose = catalog.FlushOnClose;
  if (result.End === null) {
    result.End = catalog.End;
  }
}
return result;
```

## static method Deferred:(role:string, reason:string, owner:Token | null, ownerKey:string)=>BracketRoleResult

```ts
const result = new BracketRoleResult();
result.State = BracketRoleState.Deferred;
result.Role = role;
result.Owner = owner;
result.OwnerKey = ownerKey;
result.Reason = reason;
return result;
```

## static method Fallback:(reason:string)=>BracketRoleResult

```ts
const result = new BracketRoleResult();
result.State = BracketRoleState.Fallback;
result.Reason = reason;
return result;
```

## method IsKnown:()=>bool

```ts
return this.State === BracketRoleState.Known;
```

## method IsDeferred:()=>bool

```ts
return this.State === BracketRoleState.Deferred;
```

## method IsFallback:()=>bool

```ts
return this.State === BracketRoleState.Fallback;
```

# class BracketRoleResolver

**括号角色的唯一判据点（B0）。**

`Resolve(host, bracket, context)` 只看三样东西——**宿主形状、括号字符、已确定的语句族**——
返回 `Known` / `Deferred` / `Fallback` 之一。这里**不许**出现任何文本启发式：

- 不用 `TypeBuilder.IsBodyBrace`（A1 §5 R6：`previous` 一旦变成 `IdentifierShape` 就失效）；
- 不读 `bracket.Data` 里的字符来决定角色（只看**前一个非 trivia 单元的形状**这种结构位）；
- 不写第二份关键字表（语句族一律问 `StatementRouteUtil.Decide`，与既有路由同源）。

判据顺序（与 A1 §2.1 一致，**只有这一处**）：

1. 括号字符 + 宿主类名 → 命中「宿主规则表」；
2. 规则里需要结构位的（函数体 vs 返回类型对象字面量），看宿主 `Data` 里括号**前一个非 trivia 单元**；
3. 角色能定、但拥有它的壳还不存在（声明族 / 语句族未判） ⇒ `Deferred`；
4. 角色只能在收口定（`TypeLiteral` / `ObjectLiteralMethodBody`） ⇒ `Fallback`；
5. 没有宿主规则 / 没有已注册目录 ⇒ `Fallback`（**显式**，不许静默）。

计数落在 `StatementRouteUtil.BracketRoleKnownCount` / `BracketRoleDeferredCount` /
`BracketRoleFallbackCount` 上，**只在本方法里自增一次**（每只括号一次，不重不漏）。

[B0] 开关 `StatementRouteUtil.EnableBracketRoleCatalog` 默认 `false`：只有 B4 的
`EnableExprBracketCatalog`（B4b 起默认 `true`，且要求增量模式）或 B3b 的控制流头开关会打开它；
开关关着时本类**一次都不会被调用**，既有解析产物逐字节不变。

## static field Catalogs:Array<BracketRoleCatalog> = []

已注册的角色目录。空 = 没有任何角色可以装（B0 的默认状态，此时 `Resolve` 只可能给 `Deferred` / `Fallback`）。

## static method RegisterCatalog:(catalog:BracketRoleCatalog)=>bool

注册一个角色目录（幂等：同角色重复注册时**后来的覆盖前面的**，并返回 `false`；
首次注册返回 `true`）。B1/B2 在各自文件的静态初始化（或模块装配点）里调一次。

```ts
if (catalog === null) {
  return false;
}
for (let at = 0; at < BracketRoleResolver.Catalogs.length; at++) {
  if (BracketRoleResolver.Catalogs[at].Role === catalog.Role) {
    BracketRoleResolver.Catalogs[at] = catalog;
    return false;
  }
}
BracketRoleResolver.Catalogs.push(catalog);
return true;
```

## static method FindCatalog:(role:string)=>BracketRoleCatalog | null

```ts
for (const catalog of BracketRoleResolver.Catalogs) {
  if (catalog.Role === role) {
    return catalog;
  }
}
return null;
```

## static method IsCatalogRegistered:(role:string)=>bool

```ts
return BracketRoleResolver.FindCatalog(role) !== null;
```

## static method ClearCatalogs:()=>void

清空注册表。只给「同一进程里两种模式交替」的 harness / 单元测试用；正常解析不调它。

```ts
BracketRoleResolver.Catalogs = [];
```

## static method PreviousCode:(host:Token, bracket:Bracket)=>Token | null

宿主 `Data` 里**这只括号之前**的第一个非 trivia 单元；没有就返回 `null`。

这是「结构位」的唯一读法：只看单元的形状，不看字符。`declare function f(): {a:A}` 的 `{` 前面是
`Symbol(":")`，而 `function f() { … }` 的 `{` 前面是**已闭合的 `(` 括号**——两者在形状上分得开。

```ts
const at = host.Data.indexOf(bracket);
const from = at < 0 ? host.Data.length - 1 : at - 1;
for (let index = from; index >= 0; index--) {
  if (!host.Data[index].IsTriviaToken) {
    return host.Data[index];
  }
}
return null;
```

## static method IsPlainIdentifierText:(text:string)=>bool

标识符字面形态（首字符字母 / `_` / `$`，其余字母数字 / `_` / `$`）。与
`ControlHeadPossibleShape.IsPlainIdentifier` 同一口径，但本文件不 import 表达式族（避开
`expression-builder` 那条回边：`expression-builder` 已经 import 了 `control-head-possible-shape`，
而后者 import 本文件——再反向 import 表达式族就成环）。

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

## static method IsOperatorBefore:(unit:Token | null)=>bool

前一个代码单元是不是「运算符位」：**运算符形状**（类名以 `TokenShape` 结尾，A2 的
`OperatorShapeMap` 产物同形）或 `Symbol("?")` / `Symbol(":")`。

判据与 `parenthesized-possible-shape.xl.md` 的 `IsOperatorBefore` **同一口径**，但按本文件的纪律
只比类名、不 import 表达式族（见 `IsPlainIdentifierText` 的成环说明）。语义变更必须两边同时改。

```ts
if (unit === null) {
  return false;
}
if (unit instanceof ShapeToken) {
  return unit.constructor.name.endsWith("TokenShape");
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "?" || text === ":";
}
return false;
```

## static method IsInitializerPosition:(previous:Token | null)=>bool

前一个代码单元是初始化器的 `=`（`let x = { … }` / `let x = [ … ]` / `let x = ( … )`）。
**这一格是 A4b / B3b 与 B4 的共同入口**：`{` / `[` 归 B4 的对象 / 数组目录，
`(` 归 `ArrowParams`（Deferred，等 `=>`），三者互不重叠。

```ts
if (previous === null || !(previous instanceof Symbol)) {
  return false;
}
return (previous as Symbol).Is("=");
```

## static method IsElementPosition:(host:Token, previous:Token | null)=>bool

复合字面量里的「下一个元素位」：宿主是**本机制已经判成表达式括号**的 `Bracket`，
且它的 `Data` 里这只括号之前没有代码单元（第一个元素）或是 `,` / `:`（下一个元素 / 对象值）。

只认本机制自己的括号（`ObjectLiteral` / `ArrayLiteral` / `CallArgs` / `ParenExpression`）——
语句壳、声明壳、块体括号一个都不认，因此 `case x: { }` 的块、`=> { }` 的块体不会被误判成对象字面量。

```ts
if (!(host instanceof Bracket)) {
  return false;
}
const hostShape = host as Bracket;
const hostRole = hostShape.Role;
if (hostRole !== BracketRole.ObjectLiteral && hostRole !== BracketRole.ArrayLiteral
  && hostRole !== BracketRole.CallArgs && hostRole !== BracketRole.ParenExpression) {
  return false;
}
if (previous === null || previous.IsTriviaToken) {
  return true;
}
if (!(previous instanceof Symbol)) {
  return false;
}
const text = (previous as Symbol).TempToString();
if (hostRole === BracketRole.ObjectLiteral) {
  // 对象字面量里 `:` 之后是值位（`{ a: { b: 1 } }`）。
  // [B4b] **返回类型位让路**：`{ m(): { a: number } { … } }` 的 `{` 前一个是 `:`、再前一个是
  // 已闭合的形参括号——它是类型字面量，归 `TypeBuilder.ParseReturnType`（B4 打开后
  // `expr-object-members` 的「不支持的对象类型成员」）。只能看结构位，不读文本。
  if (text === ":") {
    const at = host.Data.indexOf(previous);
    for (let index = at - 1; index >= 0; index--) {
      if (host.Data[index].IsTriviaToken) {
        continue;
      }
      if (host.Data[index] instanceof Bracket
        && (host.Data[index] as Bracket).StartBracketChar === "(") {
        return false;
      }
      break;
    }
  }
  return text === "," || text === ":";
}
return text === ",";
```

## static method IsReturnTypeColon:(host:Token, previous:Token | null)=>bool

前一个代码单元是 `:`、且**再前一个**是已闭合的 `(` 括号——这是方法 / 函数的**返回类型位**
（`{ m(): T { … } }` / `function f(): T`）。只比结构位，不读源码文本。

```ts
if (previous === null || !(previous instanceof Symbol)) {
  return false;
}
if ((previous as Symbol).TempToString() !== ":") {
  return false;
}
const at = host.Data.indexOf(previous);
for (let index = at - 1; index >= 0; index--) {
  if (host.Data[index].IsTriviaToken) {
    continue;
  }
  return host.Data[index] instanceof Bracket
    && (host.Data[index] as Bracket).StartBracketChar === "(";
}
return false;
```

## static method IsTypeAnnotationColon:(host:Token, previous:Token | null)=>bool

前一个代码单元是 `:`，且向前找不到三目的 `?`——这是**类型注解位**（`let x: (A | B)[]` /
`function f(): (A) => B`）。`?:` / `a ? b : c` 里有 `?`，返回 `false`。

```ts
if (previous === null || !(previous instanceof Symbol)) {
  return false;
}
if ((previous as Symbol).TempToString() !== ":") {
  return false;
}
const at = host.Data.indexOf(previous);
for (let index = at - 1; index >= 0; index--) {
  const unit = host.Data[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol) {
    const text = (unit as Symbol).TempToString();
    if (text === "?") {
      return false;
    }
    if (text === "," || text === ";" || text === "(" || text === "=>") {
      return true;
    }
    continue;
  }
  continue;
}
return true;
```

## static method IsExpressionHost:(host:Token)=>bool

**表达式括号只在这几类宿主上成立**（B4 实测的护栏，见 `_reports/B4.md` §3）：

- `VariableDeclarationShape`（`let x = …` 的初始化器位）；
- `StatementShape` / `SourceFileShape`（语句壳还没拆分的早期格）；
- **本机制自己的表达式括号**（`CallArgs` / `ArrayLiteral` / `ObjectLiteral` / `ParenExpression`
  里的下一层元素 / 实参 / 值）。

**其余宿主一律返回 `false`**，因为那些位置的括号内容归**别人**的收口入口读：

| 宿主 | 谁在读 | 打开会怎样（实测） |
|---|---|---|
| `ClassDeclarationShape` / `InterfaceDeclarationShape` / `MethodDeclarationShape` | 成员族 `BuildParameters` / `MemberShellCatalog` | `set x(v)` / `constructor(private a: number)` → `类成员参数不是标识符` |
| `TypeAliasDeclarationShape` | `TypeBuilder.ParseType` | `type A = { … }` / `type T = [a, b]` → `不支持的类型起点` |
| `FunctionDeclarationShape` | 参数表族（B1 已注册 `ParameterList`） | 不需要本目录 |
| 其余形状 | 各自的 legacy 入口 | 同上 |

```ts
const hostKey = host.constructor.name;
if (hostKey === "VariableDeclarationShape") {
  return true;
}
// 表达式容器宿主（`1 * (a + b)` 的 `BinaryExpressionShape`、三目的 `ConditionalExpressionShape`、
// 嵌套的 `ParenthesizedExpressionShape`、`ObjectLiteralExpressionShape` …）：括号内容仍是表达式。
if (hostKey.endsWith("ExpressionShape")) {
  return true;
}
if (hostKey === "StatementShape" || hostKey === "SourceFileShape") {
  // 语句壳还没拆分的早期格：只认**表达式 / 变量**两族。
  // 声明族（`type A = { … }` / `interface` / `class` …）的 `{` 归 `TypeBuilder` / 成员族，
  // 这里放行会让类型字面量里先垫出 `IdentifierShape`（实测：`不支持的类型起点`）。
  const route = StatementRouteUtil.Decide(host.Data, host.Data.length - 1);
  return route === StatementRoute.ShellVariable || route === StatementRoute.ShellPlainExpression;
}
if (!(host instanceof Bracket)) {
  return false;
}
const role = (host as Bracket).Role;
return role === BracketRole.ObjectLiteral || role === BracketRole.ArrayLiteral
  || role === BracketRole.CallArgs || role === BracketRole.ParenExpression;
```

## static method IsCallCallee:(host:Token, bracket:Bracket, previous:Token | null)=>bool

前一个代码单元能不能当被调用者（A2 #1 的 `CallPossibleShape.CanBeCallee` 同一判据）：

- **已建形状**且不是运算符形状（`IdentifierShape` / `MemberAccessExpressionShape` / `CallExpressionShape` / `ParenthesizedExpressionShape` …）；
- **标识符 `Common`**（`f(` 的 `f` 还没建形状）。

**两条让路**：`new` 链上的实参括号归 `NewPossibleShape`（A2 #2，判据只看结构位：
`new` 前一个代码单元）；对象字面量里**成员起始位**的 `m(` 是方法形参表（A2 #24 的
`ObjectLiteralMethodBody`），不是调用 ⇒ 一律不认。

```ts
if (previous === null || previous.IsTriviaToken) {
  return false;
}
// ① 对象字面量里的**成员起始位**（`{ m() {} }` / `{ get a() {} }` / `{ a, m() {} }`）：
//    那个 `(` 是方法 / 访问器的形参表，归成员族（`BuildParameters`），不是调用。
//    **这一条必须排在最前面**：`set a(v)` 的 `a` 已经被本目录建成 `IdentifierShape`，
//    走到下面的「已建形状 ⇒ 可调用者」分支就会误判（B4 实测：`类成员参数不是标识符`）。
if (host instanceof Bracket && (host as Bracket).Role === BracketRole.ObjectLiteral) {
  const at = host.Data.indexOf(previous);
  for (let index = at - 1; index >= 0; index--) {
    const unit = host.Data[index];
    if (unit.IsTriviaToken) {
      continue;
    }
    if (unit instanceof Symbol) {
      const mark = (unit as Symbol).TempToString();
      if (mark === "," || mark === ":") {
        return mark === ":";
      }
    }
    break;
  }
  return false;
}
// ② `function (` / `async (` / `new (` …：关键字后面的 `(` 是函数 / 箭头的形参表。
if (previous instanceof Common) {
  const keyword = (previous as Common).TempToString();
  if (StatementRouteUtil.IsLegacyKeyword(keyword) || keyword === "new") {
    return false;
  }
}
if (previous instanceof ShapeToken) {
  return !previous.constructor.name.endsWith("TokenShape");
}
if (!(previous instanceof Common)) {
  return false;
}
const text = (previous as Common).TempToString();
if (!BracketRoleResolver.IsPlainIdentifierText(text)) {
  return false;
}
const at = host.Data.indexOf(previous);
for (let index = at - 1; index >= 0; index--) {
  const unit = host.Data[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Common) {
    const before = unit as Common;
    // [B4b] `function inner(` / `class Foo(`：`inner` / `Foo` 是**函数 / 类的名字**，
    // 不是被调用者——那个 `(` 是形参表，归 `BuildParameters`。B4 打开后 `fn-expression.ts` /
    // `expr-func-expr-named.ts` 的「函数参数只支持标识符或绑定模式」就是这一格。
    if (before.Is("new") || before.Is("function") || before.Is("class")) {
      return false;
    }
  }
  break;
}
return true;
```

## static method IsAsyncArrowPrefix:(host:Token, previous:Token | null)=>bool

**[B4d]** 前一个代码单元是字面 `async`、且再前一个是初始化器的 `=`：`let f = async (…) => …` 的 `(`。

与 `IsInitializerPosition` 同一格语义，只是中间多了一个 `async` 关键字——`async` 本身不是可调用者
（`IsCallCallee` 对 `async` 已经让路），所以那条分支不会认领这只 `(`。

```ts
if (previous === null || !(previous instanceof Common)) {
  return false;
}
if (!(previous as Common).IsAny(["async"])) {
  return false;
}
const at = host.Data.indexOf(previous);
for (let index = at - 1; index >= 0; index--) {
  const unit = host.Data[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  return unit instanceof Symbol && (unit as Symbol).Is("=");
}
return false;
```

## static method IsArrowBodyPrefix:(host:Token, previous:Token | null)=>bool

**[B4f]** 前一个代码单元是 `=>`：箭头体起始格的 `(`——嵌套箭头的**内层形参表**
（`x => (b) => b` / `(a) => (b) => a + b` 的 `(b)`）。

判据只有一条结构位：`host.Data` 里紧邻本括号之前的非 trivia 单元是 `=>`。`=>` 有两种形态，
两种都认（都只比类名 / 符号文本，不 import 表达式族）：

- `Symbol("=>")`：声明还没收口（`let o = (a) => (b) => …` 的宿主是 `VariableDeclarationShape`）；
- `EqualsGreaterThanTokenShape`：单标识符箭头已经被增量建成了 `ArrowFunctionShape`，
  那一格的 `=>` 早就是形状（`x => (b) => b` 的内层 `(` 宿主是 `ArrowFunctionShape`）。

`=>` 之后紧跟的 `(` **只可能**是内层箭头的形参表或一个分组括号：

- 内层形参表：`)` 之后还有 `=>` ⇒ `Deferred` 条目在 `ParseFunctionParameters` 那一拍被 Bind（replay 一次）；
- 分组括号（`x => (a) + 1`）：`)=>` 不成立 ⇒ 条目永远留在 `Pending`、**一次都不 replay**，
  分组括号原路交 legacy 读 raw。

所以这条规则与初始化器位那条同形：**只登记、不建**，`=>` 到达才确定（A2 §3 #4/#5 的同一条纪律）。

```ts
if (previous === null) {
  return false;
}
if (host === null || host.Data.indexOf(previous) < 0) {
  return false;
}
if (previous instanceof Symbol) {
  return (previous as Symbol).Is("=>");
}
return previous instanceof ShapeToken
  && previous.constructor.name === "EqualsGreaterThanTokenShape";
```

## static method Classify:(host:Token, bracket:Bracket, context:SyntaxContext)=>BracketRoleResult

**宿主规则表**：括号字符 + 宿主类名 + 语句族，返回 `Known`（角色与宿主都有）/ `Deferred`（差宿主）
/ `Fallback`（这一步不该定）。

规则一律**按宿主类名**比对，不 import 具体形状类：这样 `bracket-role-resolver` 不会反向依赖
声明族 / 语句族的实现文件（与 `StatementRouteUtil.IsDeclarationHost` 用 `constructor.name`
是同一手法，避开循环依赖）。B1/B2 只加目录、不改本表。

```ts
const shape = bracket as Bracket;
const startChar = shape.StartBracketChar;
const hostKey = host.constructor.name;
// 1. `(`：形参表 / 控制流头。两者都能在**括号创建格**定（宿主是壳）。
if (startChar === "(") {
  if (hostKey === "FunctionDeclarationShape" || hostKey === "MethodDeclarationShape") {
    return BracketRoleResult.Known(null, null, BracketRole.ParameterList, host, hostKey);
  }
  if (hostKey === "StatementShape" || hostKey === "SourceFileShape") {
    const route = StatementRouteUtil.Decide(host.Data, host.Data.length - 1);
    if (route === StatementRoute.ShellStatementFamily) {
      // 控制流头（`if (` / `for (` / `while (` / `switch (` / `with (`）：A1 #14/#16/#17/#18/#20。
      // 括号**内容**是表达式，目录属表达式侧（A2）：没注册就只能是 Deferred —— 绝不在这里自建第二套。
      return BracketRoleResult.Known(null, null, BracketRole.ControlHead, host, hostKey);
    }
    return BracketRoleResult.Fallback("paren-not-a-control-head");
  }
  // [B4] 表达式侧的三种 `(`（A2 #1 call / #2 new / #3 分组 / #4 #5 箭头形参）。
  // 判据全部是**结构位**：只看宿主 `Data` 里这只括号前面的那一个非 trivia 单元。
  const parenPrevious = BracketRoleResolver.PreviousCode(host, shape);
  if (BracketRoleResolver.IsExpressionHost(host) && BracketRoleResolver.IsInitializerPosition(parenPrevious)) {
    // 初始化器起始格：可能是 `(1+2)` 的分组、也可能是 `(a: T) => …` 的箭头形参表。
    // 只有 `=>` 到达才确定 ⇒ 登记 Deferred，**不在 `(` 格硬猜**（A2 §3 #4/#5）。
    return BracketRoleResult.Deferred(BracketRole.ArrowParams, "arrow-paren-wait-for-arrow",
      null, "ArrowFunctionShape");
  }
  // [B4d] `async (…) => …`：`async` 之后的 `(` 同样是 Deferred ArrowParams
  // （`=>` 到达那一格由 `ArrowParamsCatalog` 一次 replay，见 `_reports/B4d.md`）。
  if (BracketRoleResolver.IsExpressionHost(host)
    && BracketRoleResolver.IsAsyncArrowPrefix(host, parenPrevious)) {
    return BracketRoleResult.Deferred(BracketRole.ArrowParams, "async-arrow-paren-wait-for-arrow",
      null, "ArrowFunctionShape");
  }
  // [B4f] **嵌套箭头的内层形参表**：`x => (b) => b` / `(a) => (b) => a + b` 的 `(b)`——前一个代码单元是 `=>`。
  // 之前这一格落到 `Fallback("no-host-rule:VariableDeclarationShape(")`（内层不 replay，B4d §6 R2）。
  // 与初始化器位同形：只登记 Deferred、不建；`)=>` 成立时由 `ParseFunctionParameters` 那一拍 Bind。
  // 箭头体若是分组括号（`x => (a) + 1`），永远等不到 Bind ⇒ 条目留在 Pending，**不会误 replay**。
  //
  // **宿主**只放两类，不放宽 `IsExpressionHost`（那会把 CallArgs 等目录引进箭头体 / 类型位）：
  // ① 表达式宿主（`let o = (a) => (b) => …` 的宿主是 `VariableDeclarationShape`）；
  // ② `ArrowFunctionShape` 自己（`x => (b) => b`：单标识符箭头已被增量建成箭头形状，内层 `(` 的宿主是它）。
  // 类型位（`type F = (a) => (b) => C`）的宿主是 `TypeAliasDeclarationShape` / 类型族，这里**一个都不认**。
  if (BracketRoleResolver.IsArrowBodyPrefix(host, parenPrevious)
    && (BracketRoleResolver.IsExpressionHost(host) || hostKey === "ArrowFunctionShape")) {
    return BracketRoleResult.Deferred(BracketRole.ArrowParams, "nested-arrow-paren-wait-for-arrow",
      null, "ArrowFunctionShape");
  }
  // [B4b] **复合字面量里的元素 / 值位 `(` 同样是 Deferred**（A2 §3 #4/#5 的第二处）：
  // `{ a: (x: number) => x }` 的 `(` 与分组括号在创建格长得一模一样，只有 `)=>` 能分开。
  // 猜成 `ParenExpression` 会把形参名 / 注解建成原子，`BuildParameters` 于是报
  // 「函数参数只支持标识符或绑定模式」（B4 打开后 `expr-arrow-in-object-value` /
  // `expr-paren-in-arguments`）。只登记、不建，把这一格留给 legacy / A4b 的 `arrowparen`。
  if (BracketRoleResolver.IsExpressionHost(host)
    && BracketRoleResolver.IsElementPosition(host, parenPrevious)) {
    return BracketRoleResult.Deferred(BracketRole.ArrowParams, "arrow-paren-wait-for-arrow",
      null, "ArrowFunctionShape");
  }
  if (BracketRoleResolver.IsExpressionHost(host)
    && BracketRoleResolver.IsCallCallee(host, shape, parenPrevious)) {
    return BracketRoleResult.Known(null, null, BracketRole.CallArgs, host, hostKey);
  }
  if (BracketRoleResolver.IsExpressionHost(host) && BracketRoleResolver.IsOperatorBefore(parenPrevious)) {
    // [B4b] **返回类型位让路**：`{ m(): (a: A) => B { … } }` 的 `(` 前一个是 `:`、再前一个是
    // 已闭合的形参括号——它是返回类型的一部分，归 `TypeBuilder`（B4 打开后
    // `expr-object-member-named-function-import` 的 `不支持的类型起点`）。
    if (BracketRoleResolver.IsReturnTypeColon(host, parenPrevious)) {
      return BracketRoleResult.Fallback("return-type-position");
    }
    // [B4b] **类型注解位让路**：`let x: (A | B)[] = …` / `declare const c: (A) => B` 的 `(` 前一个是
    // `:`，再前面是名字（不是三目的 `?`）——它是类型的一部分，归 `TypeBuilder`。猜成 `ParenExpression`
    // 会把类型名建成原子，`TypeBuilder` 报「不支持的类型起点」（`type-union-in-paren*.ts` /
    // `lib.dom.d.ts` 的增量解析因此退到 fallback）。三目 `a ? b : (c)` 有 `?`，不走这条。
    if (BracketRoleResolver.IsTypeAnnotationColon(host, parenPrevious)) {
      return BracketRoleResult.Fallback("type-annotation-position");
    }
    return BracketRoleResult.Known(null, null, BracketRole.ParenExpression, host, hostKey);
  }
  return BracketRoleResult.Fallback("no-host-rule:" + hostKey + startChar);
}
// 2. `[`：数组字面量归 B4；下标 / 计算名 / 元组仍归既有路径（A2 #10/#11/#12/#18）。
if (startChar === "[") {
  const bracketPrevious = BracketRoleResolver.PreviousCode(host, shape);
  if (BracketRoleResolver.IsExpressionHost(host) && bracketPrevious !== null
    && (BracketRoleResolver.IsInitializerPosition(bracketPrevious)
      || BracketRoleResolver.IsElementPosition(host, bracketPrevious))) {
    return BracketRoleResult.Known(null, null, BracketRole.ArrayLiteral, host, hostKey);
  }
  return BracketRoleResult.Fallback("square-bracket-owned-by-expression-side");
}
if (startChar !== "{") {
  return BracketRoleResult.Fallback("unknown-bracket-char:" + startChar);
}
// 3. `{` + 函数声明宿主：**函数体 vs 返回类型里的对象字面量**，只看前一个非 trivia 单元的形状。
if (hostKey === "FunctionDeclarationShape") {
  const previous = BracketRoleResolver.PreviousCode(host, shape);
  if (previous !== null && previous instanceof Bracket
    && (previous as Bracket).StartBracketChar === "(") {
    return BracketRoleResult.Known(null, null, BracketRole.FunctionBody, host, hostKey);
  }
  if (previous !== null && previous instanceof Symbol) {
    const previousText = (previous as Symbol).TempToString();
    if (previousText === ":" || previousText === "=>" || previousText === "|"
      || previousText === "&" || previousText === "<" || previousText === ",") {
      // A1 #3：`declare function f(): {a:A}` 的 `{` 是**类型字面量**，不是函数体。
      // 这一格判不出来（`IsBodyBrace` 的文本判据在名字已变形状后失效），所以显式 Fallback。
      return BracketRoleResult.Fallback("return-type-position:" + BracketRole.TypeLiteral);
    }
  }
  // 形参表还没出现（或已被收成形状）：位置不明 ⇒ 交 legacy，**不猜**（A1 §5 R6）。
  return BracketRoleResult.Fallback("function-body-position-undecided");
}
// 4. 声明族宿主：体与成员块都能定（宿主已在，属 A1 的 Known 面；成员块是否「壳未建」由 B2 的 Bind 决定）。
if (hostKey === "ModuleDeclarationShape") {
  return BracketRoleResult.Known(null, null, BracketRole.DeclarationList, host, hostKey);
}
if (hostKey === "ClassDeclarationShape" || hostKey === "InterfaceDeclarationShape"
  || hostKey === "EnumDeclarationShape") {
  return BracketRoleResult.Known(null, null, BracketRole.MemberList, host, hostKey);
}
if (hostKey === "MethodDeclarationShape") {
  return BracketRoleResult.Known(null, null, BracketRole.FunctionBody, host, hostKey);
}
if (hostKey === "ImportClauseShape" || hostKey === "ImportDeclarationShape"
  || hostKey === "ExportDeclarationShape") {
  return BracketRoleResult.Known(null, null, BracketRole.ImportExportClause, host, hostKey);
}
// 5. 对象字面量里的方法体（A1 #24）：只能在收口定 ⇒ 显式 Fallback，不再静默走启发式。
if (hostKey === "ObjectLiteralExpressionShape") {
  return BracketRoleResult.Fallback("object-literal-method-body");
}
// 5b. [B4] 表达式上下文里的**对象字面量** `{`（A2 #7）：`= {` 或复合字面量里的元素位。
// 语句 / 声明的块体、`case x:` 之后的块、`=> {` 的块体、`class {` 的成员体，全部在**前面的分支**里
// 已经判走（句法路由 / 宿主类名 / 括号宿主）；到这一格还没判走的 `{`，只可能是表达式位置。
// 判据仍然只看结构位，判不出来就保持后面的显式 Fallback——**不硬猜**（B4 任务书约束）。
{
  const literalPrevious = BracketRoleResolver.PreviousCode(host, shape);
  if (BracketRoleResolver.IsExpressionHost(host)
    && (BracketRoleResolver.IsInitializerPosition(literalPrevious)
      || BracketRoleResolver.IsElementPosition(host, literalPrevious))) {
    return BracketRoleResult.Known(null, null, BracketRole.ObjectLiteral, host, hostKey);
  }
}
// 6. 括号宿主：嵌套块 `{ { … } }`。外层块体目录已经把这个 `{` 收成块语句（A1 #8 的早判一格）。
if (host instanceof Bracket) {
  if ((host as Bracket).StartBracketChar === "{") {
    return BracketRoleResult.Known(null, null, BracketRole.StatementBlock, host, host.constructor.name);
  }
  return BracketRoleResult.Fallback("bracket-host-not-a-block");
}
// 7. 语句族宿主：**已确定的语句族**决定 `{` 的角色；族还没判出来就是 Deferred（等下一格）。
if (hostKey === "StatementShape" || hostKey === "SourceFileShape") {
  const route = StatementRouteUtil.Decide(host.Data, host.Data.length - 1);
  if (route === StatementRoute.ShellBlock) {
    return BracketRoleResult.Known(null, null, BracketRole.StatementBlock, host, hostKey);
  }
  if (route === StatementRoute.ShellStatementFamily) {
    // `if / for / while / do / try / with` 的体：宿主是控制流壳，体归它。
    return BracketRoleResult.Known(null, null, BracketRole.StatementBlock, host, hostKey);
  }
  if (route === StatementRoute.ShellCaseClauseHead) {
    return BracketRoleResult.Known(null, null, BracketRole.CaseBlock, host, hostKey);
  }
  if (route === StatementRoute.ShellDeclarationFamily) {
    // 声明体，但**拥有它的壳还没建**（A1 #4/#5/#6 的 D-b 型：壳在 `}` 或成员收口才建）。
    // 这正是 Deferred 的存在理由：现在装目录没有宿主可挂，等壳建出来时 Bind 再 replay。
    return BracketRoleResult.Deferred(BracketRole.DeclarationList,
      "declaration-shell-pending", null, "");
  }
  if (route === StatementRoute.None) {
    return BracketRoleResult.Deferred(BracketRole.StatementBlock,
      "statement-family-pending", null, hostKey);
  }
  // `ShellVariable` / `ShellPlainExpression`：`= {` 是对象字面量，属表达式侧（A4/A4b）。
  return BracketRoleResult.Fallback("expression-initializer-position");
}
return BracketRoleResult.Fallback("no-host-rule:" + hostKey + startChar);
```

## static method Resolve:(host:Token, bracket:Token, context:SyntaxContext)=>BracketRoleResult

**唯一入口**：解析 → 计数 → 给三态之一。`Known` 的目录在这里才被取出来（`catalog` 非空才带 `Shapes`/`End`）。

两条 `Known` 形态：

1. **族已装**（`bracket.CatalogGuide !== null`）：宿主族的 hook 已经在本括号上装了目录。
   这时返回 `Known` 且 `Shapes` 为空、`End` 为 `null`——调用方只会拿到 `AlreadyInstalled`，
   **一个字节都不改**。A1 的验收口径 `BracketRoleKnown == 既有 MountCount 之和` 就靠这一条对齐。
2. **目录已注册**：从注册表取 `BracketRoleCatalog`，`Shapes` 与 `End` 一起交给安装器。

角色决定了但**目录还没注册**（B0 的默认状态）⇒ `Fallback("catalog-not-registered:<Role>")`，显式计数。
B1/B2 注册之后同一格自动变成 `Known`，调用方不需要改。

```ts
if (host === null || bracket === null) {
  StatementRouteUtil.BracketRoleFallbackCount += 1;
  return BracketRoleResult.Fallback("bad-arguments");
}
if (!(bracket instanceof Bracket)) {
  StatementRouteUtil.BracketRoleFallbackCount += 1;
  return BracketRoleResult.Fallback("not-a-bracket");
}
const shape = bracket as Bracket;
const draft = BracketRoleResolver.Classify(host, shape, context);
if (draft.IsFallback()) {
  StatementRouteUtil.BracketRoleFallbackCount += 1;
  return draft;
}
if (draft.IsDeferred()) {
  StatementRouteUtil.BracketRoleDeferredCount += 1;
  return draft;
}
// Known：族已经装过目录（`Bracket.OnBracketCreatedEvent` 的族收尾已经跑完）⇒ 只做收尾，不换目录。
if (shape.CatalogGuide !== null) {
  StatementRouteUtil.BracketRoleKnownCount += 1;
  const installed = BracketRoleResult.Known(null, null, draft.Role, draft.Owner, draft.OwnerKey);
  installed.Reason = "family-installed";
  return installed;
}
const catalog = BracketRoleResolver.FindCatalog(draft.Role);
if (catalog === null) {
  StatementRouteUtil.BracketRoleFallbackCount += 1;
  return BracketRoleResult.Fallback("catalog-not-registered:" + draft.Role);
}
StatementRouteUtil.BracketRoleKnownCount += 1;
return BracketRoleResult.Known(catalog, null, draft.Role, draft.Owner, draft.OwnerKey);
```
