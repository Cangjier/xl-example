# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { WaitingEndPossible } from "./waiting-end-possible.xl.md"
```

# namespace cangjie

# class BracketRoleState

## static field None:int = 0

## static field Known:int = 1

## static field Deferred:int = 2

## static field Fallback:int = 3

# class BracketRole

## static field Unknown:string = ""

## static field ParameterList:string = "ParameterList"

## static field FunctionBody:string = "FunctionBody"

## static field TypeLiteral:string = "TypeLiteral"

## static field MemberList:string = "MemberList"

## static field DeclarationList:string = "DeclarationList"

## static field StatementBlock:string = "StatementBlock"

## static field CaseBlock:string = "CaseBlock"

## static field ControlHead:string = "ControlHead"

## static field ClauseList:string = "ClauseList"

## static field Heritage:string = "Heritage"

## static field ImportExportClause:string = "ImportExportClause"

## static field ObjectLiteralMethodBody:string = "ObjectLiteralMethodBody"

## static field ObjectLiteral:string = "ObjectLiteral"

## static field ArrayLiteral:string = "ArrayLiteral"

## static field CallArgs:string = "CallArgs"

## static field ParenExpression:string = "ParenExpression"

## static field ArrowParams:string = "ArrowParams"

## static field FunctionTypeParams:string = "FunctionTypeParams"

# class BracketRoleCatalog

## field Role:string = ""

## field Shapes:Array<PossibleShape> = []

## field End:PossibleShape | null = null

## field FlushOnClose:bool = false

## constructor:(role:string, shapes:Array<PossibleShape>, end:PossibleShape | null)=>void

```ts
this.Role = role;
this.Shapes = shapes;
this.End = end;
```

# class BracketRoleResult

```text
Known     → State = BracketRoleState.Known,    Shapes/End 可装, Owner = 拥有角色的壳
Deferred  → State = BracketRoleState.Deferred, Owner/OwnerKey = 将来会拥有它的壳, Reason = 为什么还不知道
Fallback  → State = BracketRoleState.Fallback, Reason = 为什么只能在收口定
```

## field State:int = 0

## field Role:string = ""

## field Owner:Token | null = null

## field OwnerKey:string = ""

## field Shapes:Array<PossibleShape> = []

## field End:PossibleShape | null = null

## field Reason:string = ""

## field FlushOnClose:bool = false

## static method Known:(catalog:BracketRoleCatalog | null, end:PossibleShape | null, role:string, owner:Token | null, ownerKey:string)=>BracketRoleResult

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

## static field Catalogs:Array<BracketRoleCatalog> = []

## static method RegisterCatalog:(catalog:BracketRoleCatalog)=>bool

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

```ts
BracketRoleResolver.Catalogs = [];
```

## static method PreviousCode:(host:Token, bracket:Bracket)=>Token | null

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

```ts
if (previous === null || !(previous instanceof Symbol)) {
  return false;
}
return (previous as Symbol).Is("=");
```

## static method IsElementPosition:(host:Token, previous:Token | null)=>bool

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

## static method IsHeadParameterBracket:(host:Token, bracket:Bracket)=>bool

```ts
if (bracket === null || !(bracket instanceof Bracket)) {
  return false;
}
const shape = bracket as Bracket;
if (shape.StartBracketChar !== "(") {
  return false;
}
const at = host.Data.indexOf(shape);
if (at < 0) {
  return false;
}
for (let index = 0; index < at; index++) {
  const unit = host.Data[index];
  if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(") {
    return false;
  }
}
return true;
```

## static method IsTypePredicateIs:(host:Token, previous:Token | null)=>bool

```ts
if (previous === null || !(previous instanceof Common)) {
  return false;
}
if ((previous as Common).TempToString() !== "is") {
  return false;
}
const at = host.Data.indexOf(previous);
if (at <= 0) {
  return false;
}
let nameAt = -1;
for (let index = at - 1; index >= 0; index--) {
  if (host.Data[index].IsTriviaToken) {
    continue;
  }
  nameAt = index;
  break;
}
if (nameAt < 0) {
  return false;
}
const nameUnit = host.Data[nameAt];
if (nameUnit instanceof Symbol || nameUnit instanceof Bracket) {
  return false;
}
if (nameUnit instanceof Common) {
  const text = (nameUnit as Common).TempToString();
  if (text === "return" || text === "typeof" || text === "new" || text === "void"
    || text === "delete" || text === "in" || text === "instanceof" || text === "case"
    || text === "await" || text === "yield") {
    return false;
  }
}
for (let index = nameAt - 1; index >= 0; index--) {
  const unit = host.Data[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol) {
    const text = (unit as Symbol).TempToString();
    if (text === ":") {
      return true;
    }
    if (text === "=" || text === ";" || text === "=>" || text === "," || text === "?"
      || text === "(" || text === ")") {
      return false;
    }
    continue;
  }
  continue;
}
return false;
```

## static method IsTernaryBranchMark:(previous:Token | null)=>bool

```ts
if (previous === null || !(previous instanceof Symbol)) {
  return false;
}
const text = (previous as Symbol).TempToString();
return text === "?" || text === ":";
```

## static method IsCallCallee:(host:Token, bracket:Bracket, previous:Token | null)=>bool

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

## static method SkipTextTrivia:(range:SourceRange, from:int, untilClose:bool)=>int

```ts
const document = range.Document;
if (document === null) {
  return from;
}
const count = document.GetCount();
const whole = SourceRange.Whole(document);
let at = from;
while (at < count) {
  const ch = whole.At(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\v"
    || ch === "\f" || ch === "\u2028" || ch === "\u2029") {
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = whole.At(at + 1);
    if (next === "/") {
      at += 2;
      while (at < count && whole.At(at) !== "\n") {
        at++;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count && !(whole.At(at) === "*" && whole.At(at + 1) === "/")) {
        at++;
      }
      at += 2;
      continue;
    }
  }
  if (untilClose && (ch === ";" || ch === "{" || ch === "}" || ch === ")")) {
    return at;
  }
  return at;
}
return at;
```

## static method ParenCloseOf:(bracket:Bracket)=>int

```ts
const range = bracket.SourceRange;
const document = range.Document;
if (document === null || range.StartIndex < 0) {
  return -1;
}
const count = document.GetCount();
const whole = SourceRange.Whole(document);
let depth = 0;
let at = range.StartIndex;
while (at < count) {
  const ch = whole.At(at);
  if (ch === "(") {
    depth++;
    at++;
    continue;
  }
  if (ch === ")") {
    depth--;
    at++;
    if (depth <= 0) {
      return at;
    }
    continue;
  }
  if (ch === ";") {
    return -1;
  }
  at++;
}
return -1;
```

## static method HasFunctionArrowAfterParen:(bracket:Bracket)=>bool

```ts
const after = BracketRoleResolver.ParenCloseOf(bracket);
if (after < 0) {
  return false;
}
const range = bracket.SourceRange;
const document = range.Document;
if (document === null) {
  return false;
}
const count = document.GetCount();
const whole = SourceRange.Whole(document);
const at = BracketRoleResolver.SkipTextTrivia(range, after, false);
if (at + 1 >= count) {
  return false;
}
return whole.At(at) === "=" && whole.At(at + 1) === ">";
```

## static method IsSimpleFunctionTypeParams:(bracket:Bracket)=>bool

```ts
const start = bracket.SourceRange.StartIndex;
const close = BracketRoleResolver.ParenCloseOf(bracket);
const range = bracket.SourceRange;
const document = range.Document;
if (document === null || start < 0 || close < 0) {
  return false;
}
const whole = SourceRange.Whole(document);
let text = "";
for (let at = start + 1; at < close - 1; at++) {
  text += whole.At(at);
}
if (text.indexOf("//") >= 0 || text.indexOf("/*") >= 0) {
  return false;
}
const trimmed = text.trim();
if (trimmed === "") {
  return true;
}
const parts = trimmed.split(",");
for (const part of parts) {
  if (!/^(?:\.\.\.)?\s*[A-Za-z_$][A-Za-z0-9_$]*\s*\??\s*(?::\s*[A-Za-z_$][A-Za-z0-9_$]*(?:\[\])*\s*)?$/.test(part)) {
    return false;
  }
}
return true;
```

## static method Classify:(host:Token, bracket:Bracket, context:SyntaxContext)=>BracketRoleResult

```ts
const shape = bracket as Bracket;
const startChar = shape.StartBracketChar;
const hostKey = host.constructor.name;
// 1. `(`：形参表 / 控制流头。两者都能在**括号创建格**定（宿主是壳）。
if (startChar === "(") {
  // [B4h] **类型位置上的函数类型参数表**：`type F = (x: number) => void`。
  // 只看两件结构位：① 宿主是类型别名壳（已经在 `=` 之后的类型槽，不可能是表达式 / 箭头括号）；
  // ② 配对 `)` 之后紧跟 `=>`（legacy `ParseType` 在 `(` 上的同一个判据）。
  // 命中 ⇒ `Known(FunctionTypeParams)`，由 `ParameterListPossibleShape` 的同一份候选装目录。
  // 不命中（`type A = (B)` / `(B)[]` / `(B) | C`）⇒ 继续往下走，最终仍是既有的 Fallback。
  if (hostKey === "TypeAliasDeclarationShape"
    && BracketRoleResolver.HasFunctionArrowAfterParen(shape)) {
    return BracketRoleResult.Known(null, null, BracketRole.FunctionTypeParams, host, hostKey);
  }
  if (hostKey === "FunctionDeclarationShape" || hostKey === "MethodDeclarationShape") {
    // 只有**自己的参数表**才是 `ParameterList`：返回类型里的 `(`（`function f(): (string)` /
    // `function f(): abstract new (a: number) => A`）也走到这一格。给它装参数表目录，
    // 类型里的 `is` / `string` / `new` 会被 `ParameterPossibleShape` 当形参名吃掉
    //（实测首跳 `函数声明的返回类型没有读完` / `不支持的类型起点` / `构造类型缺少 new`）。
    // 返回类型归 `TypeBuilder`，这里按「`host.Data` 里没有更早的 `(`」让路。
    if (BracketRoleResolver.IsHeadParameterBracket(host, shape)) {
      return BracketRoleResult.Known(null, null, BracketRole.ParameterList, host, hostKey);
    }
    return BracketRoleResult.Fallback("return-type-position:" + BracketRole.TypeLiteral);
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
  // [T11] **类型谓词的括号类型让路**：`x is (string)` / `(x: unknown): x is (A | B) => …` 的 `(`。
  // 前一个代码单元是 `is`、`is` 前面是名字单元、再往前是返回类型 / 类型注解的 `:` ⇒ 这只 `(`
  // 是谓词类型里的括号类型，归 `TypeBuilder`。猜成 `CallArgs` 会让括号里先垫出表达式原子，
  // `TypeBuilder.ParseParenthesizedType` 报「不支持的类型起点」（实测 `箭头函数缺少 =>`）。
  if (BracketRoleResolver.IsExpressionHost(host)
    && BracketRoleResolver.IsTypePredicateIs(host, parenPrevious)) {
    return BracketRoleResult.Fallback("type-predicate-position");
  }
  // [T11] **三目分支位的 `(`**（`flag ? (a: T) => … : …` 的中段 / 右段）：箭头分支的三目整条走
  // 「不建树 → 收口格 legacy 整条建」，这只括号必须保持 raw 才轮得到 `ExpressionBuilder.ParsePrimary`
  // 按 `)=>` 建箭头。给它装 `ParenExpression` 目录会把 `(a: T)` 建成括号表达式（`a: T` 不是表达式），
  // 再被收口格判成「初始化器有未并入的括号」。只认还没建形状的三目 `?` / `:` 符号：三目已经建出来时
  // 那一格是 `QuestionTokenShape` / `ColonTokenShape`，走不到这里（与本判据互不重叠）。
  if (BracketRoleResolver.IsExpressionHost(host)
    && BracketRoleResolver.IsTernaryBranchMark(parenPrevious)) {
    return BracketRoleResult.Deferred(BracketRole.ArrowParams, "ternary-branch-arrow-paren",
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
