# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
import { DecoratorShape } from "../types/decorator-shape.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { LineTerminator } from "../../run/line-terminator.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ComputePossibleShapesStates } from "../../../core/syntax/compute-possible-shapes-states.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { TypeLiteralShape } from "../types/type-literal-shape.xl.md"
import { UnionTypeShape } from "../types/union-type-shape.xl.md"
import { FunctionTypeShape } from "../types/function-type-shape.xl.md"
import { ParameterListPossibleShape } from "../types/parameter-list-possible-shape.xl.md"
import { BracketRoleResolver } from "../statements/bracket-role-resolver.xl.md"
import { MemberShellCatalog } from "../types/member-shell-catalog.xl.md"
import { BodyGuideUtil } from "./body-guide-util.xl.md"
import { InterfaceDeclarationShape } from "./interface-declaration-shape.xl.md"
import { TypeAliasLiteralStartPossibleShape } from "./type-alias-literal-start-possible-shape.xl.md"
```

# namespace cangjie

# class TypeAliasDeclarationShape extends ShapeToken

```txt
type T = number;
type T<U> = U;
type T<U extends A = B, V = C> = [U, V];
```

## field AliasName:Token | null = null

## field AliasParameters:Array<Token> = []

## field AliasType:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## field BodyBracket:Bracket | null = null

`[B4c]` 类型字面量的 `{` 括号（早建时记这里）。

## field Literal:TypeLiteralShape | null = null

`[B4c]` 在 `{` 创建格建出的 `TypeLiteralShape` 外壳。

## field UnionShape:UnionTypeShape | null = null

`[B4c]` 在第一个 `|` 闭合格建出的 `UnionTypeShape`（后续成员逐个追加）。

## field FunctionType:FunctionTypeShape | null = null

`[B4h]` 在类型位置的 `(` **创建格**建出的 `FunctionTypeShape` 外壳（只有 `= (` 这一格会建）。

## field ParamsBracket:Bracket | null = null

`[B4h]` 这只函数类型的参数表括号。参数由 B1 的 `ParameterPossibleShape` 在括号自己的 `Data` 里逐字建，
`=>` 闭合格由本类把它们搬进 `FunctionType` 并摘掉括号。

## field ArrowConsumed:bool = false

`[B4h]` `=>` 已经从 `Data` 里吃掉（参数已搬进 `FunctionType`，返回类型还没建）。

## field ArrowEnd:int = 0

`[B4h]` `=>` 的 `EndIndex`：返回类型那个 builder 的 `Pos` 基底，与 legacy
`ParseFunctionType` 里 `Positions[返回类型首单元]` 同源。

## field NameBuilt:bool = false

`[B4c]` 名字已在名字关闭格建成 `IdentifierShape`。

## field HasParams:bool = false

[B4c] 名字后面是类型参数表（`type T<U> = …`）：类型字面量的早建让位给 legacy。

## field SeenEqual:bool = false

`[B4c]` `=` 已经出现（类型位开始）。

## field TypeBasePos:int = 0

`[B4c]` 类型位的 `Pos` 基底（`=` 的 `EndIndex`），与 legacy `typePos` 同源。

## field PendingBasePos:int = 0

`[B4c]` 联合里下一个成员的 `Pos` 基底（上一个 `|` 的 `EndIndex`）。

## field MemberCatalogInstalled:bool = false

`[B4c]` 类型字面量的成员目录已经挂上（没挂 = 映射类型 / 空体 / 早建放弃）。

## field Finished:bool = false

`[B4c]` 已经换成 legacy 建出的正品（死壳，不再吃字符）。

## field Incremental:bool = false

`[B4c]` 本实例是**早建挂载壳**（`TypeAliasDeclarationMount.TryBuild` 置真）。
legacy `FromUnits` 建出来的正品保持 `false`，逐格驱动 / 收口逻辑一律不碰它。

## static field IncrementalBuiltCount:int = 0

`[B4c]` 增量路径实际早建过的别名数（证据用）。

## method OnBracketCreatedEvent:(bracket:Token, context:SyntaxContext)=>void

`[B4c]` 类型字面量 `{`：**在创建格**建 `TypeLiteralShape` 外壳（`Pos` = 类型位基底），
插在括号前面；成员目录延迟到第一个成员出现时再挂（见 `PrepareLiteralMembers`），
这样映射类型 `{ [K in keyof T]: … }` 不会被成员目录误判。

```ts
if (!this.Incremental || this.Finished || !this.SeenEqual) {
  return;
}
if (!(bracket instanceof Bracket)) {
  return;
}
if ((bracket as Bracket).StartBracketChar === "(") {
  // [B4h] 类型位置的 `(`：函数类型参数表。角色 / 目录由 B0 的机制装（见 `MountFunctionType`
  // 与 `BracketRoleResolver.Classify` 的 `FunctionTypeParams` 分支），这里只负责「建壳」与
  // 「把参数表状态挂上」两件族内的事。
  this.MountFunctionType(bracket as Bracket, context);
  return;
}
if ((bracket as Bracket).StartBracketChar !== "{") {
  return;
}
if (this.Literal !== null || this.UnionShape !== null || this.BodyBracket !== null) {
  return;
}
if (this.HasParams || TypeAliasDeclarationShape.PeekMappedHead(bracket as Bracket)) {
  // 映射类型（含修饰词）与「`[` 开头的索引签名」都整段留在 raw：早建的 TypeLiteral
  // 不适合它们的成员目录。别名壳仍然早建，类型节点在该类型的收口格由 legacy 一次建出。
  return;
}
const at = this.Data.indexOf(bracket);
if (at < 0) {
  return;
}
let previous = -1;
for (let index = at - 1; index >= 0; index--) {
  if (!this.Data[index].IsTriviaToken) {
    previous = index;
    break;
  }
}
if (previous < 0) {
  return;
}
const before = this.Data[previous];
if (!(before instanceof Symbol) || !(before as Symbol).Is("=")) {
  return;
}
const literal = new TypeLiteralShape(this.Template);
literal.Pos = this.TypeBasePos;
if (bracket.SourceRange.Start >= 0) {
  literal.SignIn(bracket.SourceRange.StartIndex);
}
this.Data.splice(at, 0, literal);
literal.Parent = this;
this.Literal = literal;
this.BodyBracket = bracket as Bracket;
this.MemberCatalogInstalled = false;
// 成员目录的**门**：先挂一个只判「映射 or 字面量」的候选；字面量在第一个成员出现时换成
// interface 成员目录（B2c），映射类型则让门 Reject、整段留给 legacy 的 `ParseMappedType`。
TypeAliasLiteralStartPossibleShape.Install(bracket as Bracket);
```

## method ComputePossibleShapes:(context:SyntaxContext)=>ComputePossibleShapesStates

`[B4c]` 别名壳的逐格驱动（外壳是挂载单元，basic token 关闭时只问父单元）。

顺序固定：名字 → 联合 → 类型字面量收口 → 终结。名字关格建 `IdentifierShape`；
`|` 格建 `UnionTypeShape`；类型字面量 `}` 格只收成员、不建新形状；`;` / ASI / EOF 交给
`TypeAliasDeclarationShape.FromUnits`（legacy 同一份建树函数）换成正品。

```ts
if (!this.Incremental || this.Finished) {
  return ComputePossibleShapesStates.Nothing;
}
this.NoteEqualStep();
if (!this.NameBuilt) {
  if (this.BuildAliasName(context)) {
    return ComputePossibleShapesStates.Built;
  }
} else {
  if (this.BuildUnionStep(context)) {
    return ComputePossibleShapesStates.Built;
  }
  if (this.BodyBracket !== null && this.Literal !== null) {
    if (this.CloseTypeLiteral(context)) {
      return ComputePossibleShapesStates.Built;
    }
  }
  // [B4h] 函数类型：`)` 格收口最后一个参数壳；`=>` 格把参数搬进外壳、吃掉 `=>`；
  // 返回类型在自己的词完成格建出（`TryBuildFunctionStep` 内部按结构位分支）。
  if (this.TryFinalizeFunctionParams(context)) {
    return ComputePossibleShapesStates.Built;
  }
  if (this.TryBuildFunctionStep(context)) {
    return ComputePossibleShapesStates.Built;
  }
}
const end = this.ComputeEndIndex(false);
if (end >= 0) {
  this.FinishAt(end, context);
  return ComputePossibleShapesStates.Built;
}
return super.ComputePossibleShapes(context);
```

## method TryToClose:(context:SyntaxContext)=>CloseStates

`[B4c]` EOF / 父单元收口：还有完整类型就地换成正品，不让半截壳留在树里。

```ts
if (this.Incremental && !this.Finished) {
  // [B4h] EOF / 父单元收口：函数类型还没建返回类型就先把 `=>` 之后的整段建成返回类型，
  // 否则半截壳（`FunctionType` 还没有 ReturnType）会被当成完整类型交给 `FromUnits`。
  this.FlushFunctionReturn(context);
  const end = this.ComputeEndIndex(true);
  if (end >= 0) {
    this.FinishAt(end, context);
    return CloseStates.Nothing;
  }
}
return super.TryToClose(context);
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

`[B4c]` 父括号的闭括号：先把别名收口、卸下自己，再把同一个字符还回去（返回 `Reload`），
这样 `{ type T = A }` 的 `}` 不会被吃进别名（`StatementShape` 的成员体收口是同一手法）。

```ts
const parent = this.Parent;
if (this.Incremental && !this.Finished && parent !== null && parent instanceof Bracket
  && value === (parent as Bracket).EndBracketChar) {
  // [B4h] 父括号关闭前同样要先补函数类型的返回类型（`{ type T = (a: A) => B }` 的 `}`）。
  this.FlushFunctionReturn(context);
  const end = this.ComputeEndIndex(true);
  if (end >= 0) {
    this.FinishAt(end, context);
    return BranchStates.Reload;
  }
}
return BranchStates.Undo;
```

## method NoteEqualStep:()=>bool

`[B4c]` 记住 `=` 的位置（类型位基底）。名字先出现在 `<` 格时，`=` 这一格仍要记。

`[B4h]` **只有顶层的 `=` 才是别名的等号**：类型参数默认值里的 `=`（`type F<T = A> = (x: T) => B`）
在 `<` 与 `>` 之间，记成基底会把 `FunctionTypeShape.Pos` 拉到 57 个字符之前
（实测 `typescript.d.ts` 的 `type Visitor<TIn …, TOut … = …> = (node) => …`）。
判据用 `Data` 里已经出现的 `<` / `>` 符号的**配对深度**，不读文本。

```ts
const data = this.Data;
let last = data.length - 1;
while (last >= 0 && data[last].IsTriviaToken) {
  last--;
}
if (last < 0 || this.SeenEqual) {
  return false;
}
const unit = data[last];
if (!(unit instanceof Symbol) || !(unit as Symbol).Is("=")) {
  return false;
}
// `<>` 深度：`=` 只在深度 0 时才是别名等号。`=>` / `>=` 这类符号不参与深度（它们的文本不是单个 `>`）。
let depth = 0;
for (let at = 0; at < last; at++) {
  const probe = data[at];
  if (!(probe instanceof Symbol)) {
    continue;
  }
  const text = (probe as Symbol).TempToString();
  if (text === "<") {
    depth++;
    continue;
  }
  if (text === ">") {
    depth--;
    continue;
  }
  if (text === ">>") {
    depth -= 2;
    continue;
  }
  if (text === ">>>") {
    depth -= 3;
  }
}
if (depth > 0) {
  return false;
}
this.SeenEqual = true;
if (unit.SourceRange.End >= 0) {
  this.TypeBasePos = unit.SourceRange.EndIndex;
}
return true;
```

## method BuildAliasName:(context:SyntaxContext)=>bool

`[B4c]` 名字关闭格建 `IdentifierShape`：`type` 关格后名字的原始 `Common` 已经在壳里，
`=` / `<` 闭合的那一格就是名字的关闭格。

```ts
const data = this.Data;
let last = data.length - 1;
while (last >= 0 && data[last].IsTriviaToken) {
  last--;
}
if (last < 0) {
  return false;
}
const trigger = data[last];
if (!(trigger instanceof Symbol)) {
  return false;
}
const triggerText = (trigger as Symbol).TempToString();
if (triggerText !== "=" && triggerText !== "<") {
  return false;
}
let keywordAt = -1;
for (let at = 0; at < data.length; at++) {
  const unit = data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is("@")) {
    continue;
  }
  if (unit instanceof Common) {
    const text = (unit as Common).TempToString();
    if (text === "export" || text === "declare") {
      continue;
    }
    if (text === "type") {
      keywordAt = at;
    }
  }
  break;
}
if (keywordAt < 0) {
  return false;
}
let nameAt = -1;
for (let at = keywordAt + 1; at < data.length; at++) {
  const unit = data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof IdentifierShape) {
    this.NameBuilt = true;
    this.AliasName = unit as IdentifierShape;
    return false;
  }
  if (unit instanceof Common) {
    nameAt = at;
  }
  break;
}
if (nameAt < 0) {
  return false;
}
const name = IdentifierShape.FromBasicToken(data[nameAt] as Common, context);
if (data[keywordAt].SourceRange.End >= 0) {
  name.Pos = data[keywordAt].SourceRange.EndIndex;
} else {
  name.Pos = 0;
}
name.Parent = this;
data.splice(nameAt, 1, name);
this.AliasName = name;
this.NameBuilt = true;
if (triggerText === "<") {
  this.HasParams = true;
}
if (triggerText === "=") {
  this.SeenEqual = true;
  if (trigger.SourceRange.End >= 0) {
    this.TypeBasePos = trigger.SourceRange.EndIndex;
  }
}
return true;
```

## method BuildUnionStep:(context:SyntaxContext)=>bool

`[B4c]` 联合类型：**本棒不早建**。实测（wide-ast）在行注释尾 / 条件类型 / 函数类型边界上会出现
区间差；AST 一致优先，整段交 legacy 的 `ParseUnionType`。壳 / 名字 / 类型字面量三处早建保留。

```ts
return false;
```

## method FlushUnion:(context:SyntaxContext, endIndex:int)=>int

`[B4c]` 收口前把联合里最后一段 raw 成员建成形状（`B` 的关闭格就是终结格）。

```ts
if (this.UnionShape === null) {
  return endIndex;
}
const data = this.Data;
const unionAt = data.indexOf(this.UnionShape);
if (unionAt < 0) {
  return endIndex;
}
const rawUnits:Array<Token> = [];
const rawAt:Array<number> = [];
for (let at = unionAt + 1; at <= endIndex; at++) {
  const current = data[at];
  if (current.IsTriviaToken) {
    continue;
  }
  if (current instanceof Symbol && ((current as Symbol).Is(";") || (current as Symbol).Is(","))) {
    continue;
  }
  rawUnits.push(current);
  rawAt.push(at);
}
if (rawUnits.length === 0) {
  return endIndex;
}
const builder = new TypeBuilder(this.Template, context);
builder.Load(rawUnits, this.PendingBasePos);
const atom = builder.ParseType();
if (builder.At !== builder.Units.length) {
  throw new Error("类型别名联合成员没有读完");
}
this.UnionShape.Types.push(atom);
this.UnionShape.Add(atom);
if (atom.SourceRange.End >= 0) {
  this.UnionShape.SourceRange.End = atom.SourceRange.EndIndex;
}
data.splice(rawAt[0], rawAt[rawAt.length - 1] - rawAt[0] + 1);
const unionIndex = this.Data.indexOf(this.UnionShape);
// 尾巴上的 `;` 属于这条别名（TS 的 `node.end` 含分号）：把它留在收口切片里。
for (let at = this.Data.length - 1; at > unionIndex; at--) {
  const unit = this.Data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
    return at;
  }
  break;
}
return unionIndex;
```

## method CloseTypeLiteral:(context:SyntaxContext)=>bool

`[B4c]` 类型字面量 `}` 格：只把已建成员收进外壳（**不建新形状**）；`}` 后面若还有续接
（`[]` / `|` / `&` / 条件类型）、或者成员目录根本没挂（映射类型），就放弃早建，
把闭合括号留给 legacy 一次解析。

```ts
const body = this.BodyBracket;
const literal = this.Literal;
if (body === null || literal === null) {
  return false;
}
let last = this.Data.length - 1;
while (last >= 0 && this.Data[last].IsTriviaToken) {
  last--;
}
if (last < 0 || this.Data[last] !== body || !body.Closed) {
  return false;
}
const next = TypeAliasDeclarationShape.NextCodeText(body.SourceRange);
if (TypeAliasDeclarationShape.IsSameLineContinuation(next)) {
  TypeAliasDeclarationShape.AbandonLiteral(this);
  return false;
}
if (!this.MemberCatalogInstalled) {
  let hasCode = false;
  for (const unit of body.Data) {
    if (!unit.IsTriviaToken) {
      hasCode = true;
      break;
    }
  }
  if (hasCode) {
    // 映射类型 `{ [K in keyof T]: … }`：整段交 legacy 的 `ParseMappedType`。
    TypeAliasDeclarationShape.AbandonLiteral(this);
    return false;
  }
}
MemberShellCatalog.FinalizeAll(this, body, context);
const members = BodyGuideUtil.CollectBodyMembers(this, body, context,
  TypeAliasDeclarationShape.BuildTypeMembers);
for (const member of members) {
  literal.Add(member);
}
literal.Members = members;
if (body.SourceRange.Start >= 0 && literal.SourceRange.Start < 0) {
  literal.SignIn(body.SourceRange.StartIndex);
}
if (body.SourceRange.End >= 0) {
  literal.SignOut(body.SourceRange.EndIndex);
}
literal.TryToClose(context);
const at = this.Data.indexOf(body);
if (at >= 0) {
  this.Data.splice(at, 1);
}
this.BodyBracket = null;
this.AliasType = literal;
return true;
```

## static method BuildTypeMembers:(host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>

类型字面量成员的后备解析（raw 尾巴）：与 interface 的 `BuildMembers` 同一口径。

```ts
const members:Array<Token> = [];
const builder = new TypeBuilder(host.Template, context);
let base = 0;
if (bracket.SourceRange.Start >= 0) {
  base = bracket.SourceRange.StartIndex + 1;
}
builder.Load(bracket.Data, base);
while (builder.At < builder.Units.length) {
  const unit = builder.Units[builder.At];
  if (unit.IsTriviaToken) {
    builder.At++;
    continue;
  }
  if (builder.IsText(unit, ";") || builder.IsText(unit, ",")) {
    builder.At++;
    continue;
  }
  members.push(builder.ParseTypeMember());
}
return members;
```

## static method AbandonLiteral:(shell:TypeAliasDeclarationShape)=>void

放弃早建：把 `TypeLiteralShape` 外壳从 `Data` 摘掉，闭合的 `{` 括号留在原位交给 legacy。

```ts
if (shell.Literal === null) {
  return;
}
const at = shell.Data.indexOf(shell.Literal);
if (at >= 0) {
  shell.Data.splice(at, 1);
}
shell.Literal = null;
shell.AliasType = null;
```

## method MountFunctionType:(bracket:Bracket, context:SyntaxContext)=>void

`[B4h]` 类型位置的 `(` 创建格。四步，全部只读结构位：

1. 配对 `)` 之后必须是 `=>`（`BracketRoleResolver.HasFunctionArrowAfterParen`，与 legacy
   `ParseType` 在 `(` 上的判据同源）。不是 ⇒ 什么都不做（`type A = (B)` / `(B)[]` / `(B) | C`）。
2. 把 `FunctionTypeParams` 目录注册进 `BracketRoleResolver`（本方法先于 `BracketRoleHook`，
   注册后同一格 `Resolve` 才会是 `Known`）。
3. `ParameterListPossibleShape.InstallForFunctionType`：只有**简单参数表**才挂状态（`?` 的开关在状态上）。
4. `before` 恰是 `=`（本别名的类型槽起点）且状态挂上时，才建 `FunctionTypeShape` 外壳并插在括号前。
   `>`（泛型函数类型头 `<T>(x: T) => T`）与返回类型里的 `(` 只挂状态、不建壳：它们的
   `FunctionTypeShape` 仍由 legacy `ParseType` 建，参数表里的 `ParameterShape` 由
   `ParseParameterList` 的「已建参数」分支直接消费。

```ts
if (this.FunctionType !== null || this.Literal !== null || this.UnionShape !== null
  || this.BodyBracket !== null) {
  return;
}
if (!BracketRoleResolver.HasFunctionArrowAfterParen(bracket)) {
  return;
}
ParameterListPossibleShape.EnsureRegisteredForFunctionType();
const installed = ParameterListPossibleShape.InstallForFunctionType(bracket);
const at = this.Data.indexOf(bracket);
if (at < 0) {
  return;
}
let previous = -1;
for (let index = at - 1; index >= 0; index--) {
  if (!this.Data[index].IsTriviaToken) {
    previous = index;
    break;
  }
}
if (previous < 0) {
  return;
}
const before = this.Data[previous];
if (!(before instanceof Symbol) || !(before as Symbol).Is("=")) {
  return;
}
if (!installed) {
  // 复杂参数表：不建壳、不建参数，收口格整段交 legacy `ParseFunctionType`。
  return;
}
const shape = new FunctionTypeShape(this.Template);
// `Pos` 取**紧邻这只括号的那个 `=`** 的 `EndIndex`（legacy `ParseFunctionType` 的 `Positions[start]`），
// 而不是缓存的 `TypeBasePos`：类型参数默认值里的 `=` 不算（`NoteEqualStep` 的深度判据同一条口径）。
shape.Pos = before.SourceRange.End >= 0 ? before.SourceRange.EndIndex : this.TypeBasePos;
if (bracket.SourceRange.Start >= 0) {
  shape.SignIn(bracket.SourceRange.StartIndex);
}
this.Data.splice(at, 0, shape);
shape.Parent = this;
this.FunctionType = shape;
this.ParamsBracket = bracket;
this.ArrowConsumed = false;
```

## method TryFinalizeFunctionParams:(context:SyntaxContext)=>bool

`[B4h]` `)` 闭合格：`Data` 末尾就是那只已闭合的 `(`，且括号里登记过参数状态 ⇒
把还没收口的参数壳补完（最后一个参数的 `)` 是 Terminator，不补就永远差一步）。

**不要求它是本别名建的壳**：泛型函数类型头 `<T>(x: T) => T` 与返回类型里的函数类型都不建壳，
但它们的参数表状态一样要在这里收口，否则 legacy `ParseParameterList` 会看到「半截参数 + 残留 raw」。

```ts
const data = this.Data;
let last = data.length - 1;
while (last >= 0 && data[last].IsTriviaToken) {
  last--;
}
if (last < 0) {
  return false;
}
const unit = data[last];
if (!(unit instanceof Bracket) || (unit as Bracket).StartBracketChar !== "("
  || !(unit as Bracket).Closed) {
  return false;
}
const state = ParameterListPossibleShape.FindState((unit as Bracket).Data);
if (state === null || state.FinalizeDone) {
  // `)` 关格之后这只括号还会是 `Data` 的末尾（注释 / `=>` 到达之前）：再收一次会为空壳
  // 另建一只 `ParameterShape`（实测 `gap-r676-func-type-comment-before-arrow.ts` 的整文件 fallback）。
  return false;
}
const before = ParameterListPossibleShape.FinalizeCount;
ParameterListPossibleShape.Finalize(this, context);
return ParameterListPossibleShape.FinalizeCount !== before;
```

## method TryBuildFunctionStep:(context:SyntaxContext)=>bool

`[B4h]` 函数类型的两格：`=>` 闭合格（搬参数、吃 `=>`）与返回类型的完成格（建 `ReturnType`）。

```ts
const shape = this.FunctionType;
if (shape === null) {
  return false;
}
if (!this.ArrowConsumed) {
  return this.ConsumeFunctionArrow(context);
}
if (shape.ReturnType === null) {
  return this.TryBuildFunctionReturn(context);
}
return false;
```

## method ConsumeFunctionArrow:(context:SyntaxContext)=>bool

`[B4h]` `=>` 闭合格：把括号里已经建好的 `ParameterShape` 搬进 `FunctionTypeShape`，把括号与 `=>`
从 `Data` 里摘掉，记下 `=>` 的 `EndIndex`（返回类型的 `Pos` 基底）。

参数**不再重新解析**：`CollectBuiltParameters` 收下的就是 B1 在括号 `Data` 里逐字建出的那些形状
（`ParameterShape` 的 `Pos` / 区间 / 子节点与 legacy `ParseParameter` 同口径）。
空参数表 `()` 没有可收的参数（`CollectBuiltParameters` 对零参数返回 `null`），只要括号里没有残留代码单元就算完整。

```ts
const bracket = this.ParamsBracket;
const shape = this.FunctionType;
if (bracket === null || shape === null || !bracket.Closed) {
  return false;
}
const data = this.Data;
let last = data.length - 1;
while (last >= 0 && data[last].IsTriviaToken) {
  last--;
}
if (last < 0) {
  return false;
}
const arrow = data[last];
if (!(arrow instanceof Symbol) || !(arrow as Symbol).Is("=>")) {
  return false;
}
let parameters:Array<Token> = [];
if (ParameterListPossibleShape.FindState(bracket.Data) !== null) {
  const collected = ParameterListPossibleShape.CollectBuiltParameters(bracket);
  if (collected !== null) {
    parameters = collected;
  } else {
    for (const unit of bracket.Data) {
      if (!unit.IsTriviaToken) {
        throw new Error("函数类型参数没有读完");
      }
    }
  }
} else {
  for (const unit of bracket.Data) {
    if (!unit.IsTriviaToken) {
      throw new Error("函数类型参数没有读完");
    }
  }
}
shape.Parameters = parameters;
for (const parameter of parameters) {
  shape.Add(parameter);
}
if (arrow.SourceRange.End >= 0) {
  this.ArrowEnd = arrow.SourceRange.EndIndex;
}
const bracketAt = data.indexOf(bracket);
if (bracketAt >= 0) {
  data.splice(bracketAt, 1);
}
const arrowAt = data.indexOf(arrow);
if (arrowAt >= 0) {
  data.splice(arrowAt, 1);
}
this.ParamsBracket = null;
this.ArrowConsumed = true;
return true;
```

## method TryBuildFunctionReturn:(context:SyntaxContext)=>bool

`[B4h]` 返回类型的完成格：`=>` 之后到当前最后一个代码单元整段用 **legacy** `TypeBuilder.ParseReturnType`
建出（所以 `a is string` 是 `TypePredicateShape`，`void` 是 `VoidKeywordShape`）。

只在「下一个代码词能收一条类型」时动手（`IsFunctionReturnTerminator`）：`;` / `)` / `}` / `]` / `,`、
EOF、或换行后的非续接词。`|` / `&` / `[` / `?` / `.` / `extends` 等续接符一律等下一格。

```ts
const shape = this.FunctionType;
if (shape === null || shape.ReturnType !== null) {
  return false;
}
const data = this.Data;
const shapeAt = data.indexOf(shape);
if (shapeAt < 0) {
  return false;
}
let end = data.length - 1;
while (end > shapeAt && data[end].IsTriviaToken) {
  end--;
}
if (end <= shapeAt) {
  return false;
}
const lastUnit = data[end];
if (!lastUnit.Closed) {
  return false;
}
// [B4h] `<…>` 还没配平 ⇒ 这一格只是**类型实参内部**的一格（`Record<K, V>` 的 `K` 后面是 `,`、
// `V` 后面是 `>`）。这里按已经到达的 `<` / `>` 符号数深度，深度 > 0 一律继续等：
// 提前收会把 `Record<K` 交给 `ParseTypeArguments`，报「泛型实参缺少 >」。
let angle = 0;
for (let at = shapeAt + 1; at <= end; at++) {
  const unit = data[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = (unit as Symbol).TempToString();
  if (text === "<") {
    angle++;
    continue;
  }
  if (text === ">") {
    angle--;
    continue;
  }
  if (text === ">>") {
    angle -= 2;
    continue;
  }
  if (text === ">>>") {
    angle -= 3;
  }
}
if (angle > 0) {
  return false;
}
if (!TypeAliasDeclarationShape.IsFunctionReturnTerminator(lastUnit)) {
  return false;
}
return this.BuildFunctionReturn(shapeAt, end, context);
```

## method BuildFunctionReturn:(shapeAt:int, end:int, context:SyntaxContext)=>bool

`[B4h]` 把 `Data[shapeAt+1 .. end]` 建成 `FunctionTypeShape.ReturnType`。`Pos` 基底 = `=>` 的 `EndIndex`
（legacy `ParseFunctionType` 里 `Positions[返回类型首单元]` 同源）。

```ts
const shape = this.FunctionType;
if (shape === null || shape.ReturnType !== null || end <= shapeAt) {
  return false;
}
const data = this.Data;
const units:Array<Token> = [];
for (let at = shapeAt + 1; at <= end; at++) {
  const unit = data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  units.push(unit);
}
if (units.length === 0) {
  return false;
}
const builder = new TypeBuilder(this.Template, context);
builder.Load(units, this.ArrowEnd);
const type = builder.ParseReturnType();
if (builder.At !== builder.Units.length) {
  throw new Error("函数类型的返回类型没有读完");
}
shape.ReturnType = type;
shape.Add(type);
if (type.SourceRange.End >= 0) {
  shape.SourceRange.End = type.SourceRange.End;
}
shape.TryToClose(context);
data.splice(shapeAt + 1, end - shapeAt);
return true;
```

## method FlushFunctionReturn:(context:SyntaxContext)=>void

`[B4h]` EOF / 父括号收口前的兜底：返回类型还没建就把 `=>` 之后的整段建成它。
`TryToClose` / `ExitOrPre` 在 `ComputeEndIndex` **之前**调用（`ComputeEndIndex` 会拒绝「返回类型未建」的格）。

```ts
const shape = this.FunctionType;
if (shape === null || shape.ReturnType !== null) {
  return;
}
const shapeAt = this.Data.indexOf(shape);
if (shapeAt < 0) {
  return;
}
let end = this.Data.length - 1;
while (end > shapeAt && this.Data[end].IsTriviaToken) {
  end--;
}
this.BuildFunctionReturn(shapeAt, end, context);
```

## method FlushFunctionReturnAt:(context:SyntaxContext, endIndex:int)=>int

`[B4h]` `FinishAt` 内的兜底（与 `FlushUnion` 同一位置、同一职责）：返回类型没建就建到 `endIndex`
（跳过末尾的 `;` / `,` / trivia），并把 `endIndex` 换算成**摘掉已建单元之后**的位置。

```ts
const shape = this.FunctionType;
if (shape === null || shape.ReturnType !== null) {
  return endIndex;
}
const shapeAt = this.Data.indexOf(shape);
if (shapeAt < 0) {
  return endIndex;
}
let end = endIndex;
while (end > shapeAt) {
  const unit = this.Data[end];
  if (unit.IsTriviaToken
    || (unit instanceof Symbol && ((unit as Symbol).Is(";") || (unit as Symbol).Is(",")))) {
    end--;
    continue;
  }
  break;
}
if (!this.BuildFunctionReturn(shapeAt, end, context)) {
  return endIndex;
}
const removed = end - shapeAt;
if (removed > 0 && endIndex > end) {
  return endIndex - removed;
}
return endIndex;
```

## static method IsFunctionReturnTerminator:(unit:Token)=>bool

`[B4h]` 返回类型在 `unit` 之后是否已经**完整**：下一个代码字符是 `;` `)` `}` `]` `,`、文件尾，
或隔了行终止符之后是**非续接词**。

**为什么需要行终止符这一档**：`(a) => a is string` 里 `a` 之后的 `is` 是同一行的续接词（谓词），
不能因为「后面是标识符」就提前收；反过来 `void` ⏎ `type G…` 的 `type` 隔了换行，就是下一条语句。

```ts
const range = unit.SourceRange;
const document = range.Document;
if (document === null || range.EndIndex < 0) {
  return false;
}
const count = document.GetCount();
const whole = SourceRange.Whole(document);
let at = range.EndIndex;
let lineBreak = false;
while (at < count) {
  const ch = whole.At(at);
  if (ch === " " || ch === "\t" || ch === "\v" || ch === "\f"
    || ch === "\u2028" || ch === "\u2029") {
    at++;
    continue;
  }
  if (ch === "\r" || ch === "\n") {
    lineBreak = true;
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
      lineBreak = true;
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count && !(whole.At(at) === "*" && whole.At(at + 1) === "/")) {
        if (whole.At(at) === "\n" || whole.At(at) === "\r") {
          lineBreak = true;
        }
        at++;
      }
      at += 2;
      continue;
    }
  }
  break;
}
if (at >= count) {
  return true;
}
const first = whole.At(at);
if (first === ";" || first === ")" || first === "}" || first === "]" || first === ",") {
  return true;
}
if (!lineBreak) {
  return false;
}
let word = first;
let cursor = at + 1;
while (cursor < count) {
  const ch = whole.At(cursor);
  const code = ch.charCodeAt(0);
  if ((code >= 97 && code <= 122) || (code >= 65 && code <= 90)
    || (code >= 48 && code <= 57) || ch === "_" || ch === "$") {
    word += ch;
    cursor++;
    continue;
  }
  break;
}
return !TypeAliasDeclarationShape.IsNewLineContinuation(word);
```

## method ComputeEndIndex:(atEof:bool)=>int

`[B4c]` 别名的结束格：`;` / 换行 ASI / EOF（父括号闭括号由 `ExitOrPre` 走同一条 `atEof` 口径）。
判定只比结构位与文档下一个代码词，不另写一份类型文法。

```ts
// [B4h] 函数类型还没建返回类型 ⇒ 这一格**不是**结束格：`=>` 之后的内容还没读完。
// 这一条同时挡住 `(` 关格 / `=>` 关格两处可能被 `CanEndType(非 basic)` 误判为「类型已完」的收口。
if (this.FunctionType !== null && this.FunctionType.ReturnType === null) {
  return -1;
}
const data = this.Data;
const count = data.length;
let last = -1;
for (let at = count - 1; at >= 0; at--) {
  const unit = data[at];
  if (unit.IsTriviaToken || unit instanceof EndOfFileTokenShape) {
    continue;
  }
  last = at;
  break;
}
if (last < 0) {
  return -1;
}
const unit = data[last];
if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
  return last;
}
// [B4c2] 结束格候选要过两条：这一格自己能收类型（`CanEndAtType`），且不是泛型函数类型头
// `<T>` 那个还没等到参数表的配对 `>`。`Array<T>` 的 `>` 不受影响。
if (!TypeAliasDeclarationShape.CanEndAtType(data, last)) {
  return -1;
}
if (atEof) {
  return TypeAliasDeclarationShape.CanEndType(unit) ? last : -1;
}
if (this.BodyBracket !== null && unit === this.BodyBracket && this.BodyBracket.Closed) {
  const next = TypeAliasDeclarationShape.NextCodeText(unit.SourceRange);
  if (next !== ";" && !TypeAliasDeclarationShape.IsSameLineContinuation(next)) {
    return last;
  }
  return -1;
}
if (last < count - 1) {
  let trigger = -1;
  for (let at = count - 1; at > last; at--) {
    if (data[at].IsTriviaToken) {
      trigger = at;
      break;
    }
  }
  if (trigger >= 0) {
    const trivia = data[trigger];
    if (LineTerminator.HasLineBreakUnit(trivia) && TypeAliasDeclarationShape.CanEndType(unit)) {
      const next = TypeAliasDeclarationShape.NextCodeText(trivia.SourceRange);
      if (!TypeAliasDeclarationShape.IsNewLineContinuation(next)) {
        return last;
      }
    }
  }
}
// 下一行第一个**代码**单元（下一条语句首词关闭时）：它与前一个代码单元之间隔着行终止符，
// 且它不能续接类型 ⇒ 上一条别名收在前一个代码单元上，首词本身作为尾巴还回父单元。
const leading = data[count - 1];
if (!(leading instanceof EndOfFileTokenShape) && !leading.IsTriviaToken) {
  let previous = -1;
  for (let at = count - 2; at >= 0; at--) {
    const probe = data[at];
    if (probe.IsTriviaToken || probe instanceof EndOfFileTokenShape) {
      continue;
    }
    previous = at;
    break;
  }
  if (previous >= 0 && TypeAliasDeclarationShape.CanEndAtType(data, previous)
    && TypeAliasDeclarationShape.HasLineBreakBetween(data[previous], leading)) {
    const text = TypeAliasDeclarationShape.UnitText(leading);
    if (!TypeAliasDeclarationShape.IsNewLineContinuation(text)) {
      return previous;
    }
  }
}
return -1;
```

## static method PeekMappedHead:(bracket:Bracket)=>bool

```ts
const range = bracket.SourceRange;
const document = range.Document;
if (document === null || range.StartIndex < 0) {
  return false;
}
const count = document.GetCount();
const whole = SourceRange.Whole(document);
function skipSpace(from:number):number {
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
    break;
  }
  return at;
}
let at = skipSpace(range.StartIndex + 1);
while (at < count) {
  const ch = whole.At(at);
  if (ch === "+" || ch === "-") {
    at = skipSpace(at + 1);
    continue;
  }
  let word = "";
  let cursor = at;
  while (cursor < count) {
    const code = whole.At(cursor);
    const value = code.charCodeAt(0);
    if ((value >= 97 && value <= 122) || (value >= 65 && value <= 90)
      || (value >= 48 && value <= 57) || code === "_" || code === "$") {
      word += code;
      cursor++;
      continue;
    }
    break;
  }
  if (word === "readonly") {
    at = skipSpace(cursor);
    continue;
  }
  break;
}
return at < count && whole.At(at) === "[";
```
## static method HasLineBreakBetween:(left:Token, right:Token)=>bool

```ts
const leftRange = left.SourceRange;
const rightRange = right.SourceRange;
if (leftRange.EndIndex < 0 || rightRange.StartIndex < 0) {
  return false;
}
return LineTerminator.HasBetween(leftRange, rightRange);
```

## static method UnitText:(unit:Token)=>string

```ts
if (unit instanceof Common) {
  return (unit as Common).TempToString();
}
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
return "";
```

## method FinishAt:(endIndex:int, context:SyntaxContext)=>Token

`[B4c]` 收口：先把联合尾巴建成形状，再交给**同一份** legacy `FromUnits` 换成正品；
尾随 trivia 丢掉，非 trivia 尾巴（异常摆放）还回父单元。

```ts
endIndex = this.FlushUnion(context, endIndex);
// [B4h] 函数类型的返回类型兜底：逐词判据没赶上的极端摆放（EOF / 父括号 / 注释尾）在这里一次补齐，
// 之后 `FromUnits` 看到的仍是「单个已建类型节点」，不新增第二条建树路径。
endIndex = this.FlushFunctionReturnAt(context, endIndex);
// [B4h] 参数表状态不随别名壳的生命周期结束而泄漏：收口后把 `Data` 里残留括号的扫描状态清掉。
for (const unit of this.Data) {
  if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(") {
    ParameterListPossibleShape.DropState((unit as Bracket).Data);
  }
}
const tail = this.Data.splice(endIndex + 1);
// 只在这一次收口里允许 `ParseTypeLiteral` 消费早建成员（保留给「字面量后还有续接」的放弃路径）；
// 其它任何建树（interface 成员 / legacy / 别的族）都不看这个标志。
TypeBuilder.ConsumeBuiltMembers = true;
let built:Token;
try {
  built = TypeAliasDeclarationShape.FromUnits(this, 0, endIndex, context, this.Pos);
} finally {
  TypeBuilder.ConsumeBuiltMembers = false;
}
const parent = this.Parent;
if (parent !== null) {
  const at = parent.Data.indexOf(this);
  if (at >= 0) {
    parent.Data.splice(at, 1, built);
    let insert = at + 1;
    for (const unit of tail) {
      if (unit.IsTriviaToken) {
        continue;
      }
      unit.Parent = parent;
      parent.Data.splice(insert, 0, unit);
      insert++;
    }
  }
  built.Parent = parent;
  for (const unit of tail) {
    unit.Parent = parent;
  }
  if (parent.MountedUnit === this) {
    parent.MountedUnit = null;
  }
  // 换了正品之后，尾巴里那个「下一条语句的首词」已经关闭，不会再有自己的关闭格：
  // 在这里补一次父单元的目录计算，让下一条语句在**同一格**建壳（与 legacy 壳的建壳格一致）。
  let movedCode = false;
  for (const unit of tail) {
    if (!unit.IsTriviaToken) {
      movedCode = true;
      break;
    }
  }
  if (movedCode && "ComputePossibleShapesByIndex" in parent) {
    (parent as any).ComputePossibleShapesByIndex(parent.Data.length - 1, context);
  }
}
this.MountedUnit = null;
this.Closed = true;
this.Finished = true;
TypeAliasDeclarationShape.IncrementalBuiltCount += 1;
return built;
```

## static method PreviousEnd:(data:Array<Token>, at:int)=>int

```ts
for (let index = at - 1; index >= 0; index--) {
  if (!data[index].IsTriviaToken) {
    if (data[index].SourceRange.End >= 0) {
      return data[index].SourceRange.EndIndex;
    }
    return 0;
  }
}
return 0;
```

## static method CanEndAtType:(data:Token[], index:int)=>bool

`[B4c2]` **结束格候选**的统一口径：这一格本身能收类型（`CanEndType`），且不是泛型函数类型头
`<T>` 那个还没等到参数表的配对 `>`（`IsGenericHeadClose`）。收口分支（`last` 与「下一行首词」的
`previous`）都只问这一句，避免同一个候选在两处各判一套。

```ts
if (index < 0 || index >= data.length) {
  return false;
}
if (TypeAliasDeclarationShape.IsGenericHeadClose(data, index)) {
  return false;
}
return TypeAliasDeclarationShape.CanEndType(data[index]);
```

## static method IsGenericHeadClose:(data:Token[], last:int)=>bool

`[B4c2]` `last` 是不是**泛型函数类型头**的配对 `>`：与它配对的那个 `<` 前面没有类型代码
（前面是 `=` / 槽首）。`Array<T>` / `Map<K, V>` 的 `<` 前面有标识符，不在此列 ⇒ 那些 `>` 照旧
可以收口（`type A = Array<T>` ⏎ `const x = 1` 的分句不变）。

```ts
const unit = data[last];
if (!(unit instanceof Symbol) || !(unit as Symbol).Is(">")) {
  return false;
}
let depth = 0;
let openAt = -1;
for (let at = last; at >= 0; at--) {
  const probe = data[at];
  if (probe.IsTriviaToken) {
    continue;
  }
  if (!(probe instanceof Symbol)) {
    continue;
  }
  const text = (probe as Symbol).TempToString();
  if (text === ">") {
    depth++;
    continue;
  }
  if (text === "<") {
    depth--;
    if (depth === 0) {
      openAt = at;
      break;
    }
  }
}
if (openAt < 0) {
  return false;
}
for (let at = openAt - 1; at >= 0; at--) {
  const probe = data[at];
  if (probe.IsTriviaToken) {
    continue;
  }
  return probe instanceof Symbol && (probe as Symbol).Is("=");
}
return true;
```

## static method CanEndType:(unit:Token)=>bool

```ts
if (!unit.IsBasicToken) {
  return true;
}
if (unit instanceof Bracket) {
  return (unit as Bracket).Closed;
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  // [B4c2] `-` / `+` 是映射类型修饰词与数字字面量的符号前缀，它们自己收不了一条类型
  // （`type U = -⏎//c⏎2` 曾因此把别名收在 `-` 上、类型槽只剩一个 `-`）。
  return !(text === "=" || text === "|" || text === "&" || text === "<"
    || text === "," || text === ":" || text === "?" || text === "=>" || text === "."
    || text === "-" || text === "+");
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  return !(text === "keyof" || text === "typeof" || text === "readonly"
    || text === "unique" || text === "infer" || text === "new" || text === "abstract"
    || text === "import" || text === "asserts" || text === "is" || text === "extends"
    || text === "in" || text === "out" || text === "as" || text === "satisfies");
}
return true;
```

## static method IsSameLineContinuation:(text:string)=>bool

`}` / 成员类型之后**同一行**还能续接类型的词：联合、交叉、数组/索引、条件、类型实参等。

```ts
if (text === "") {
  return false;
}
if (text === "extends") {
  return true;
}
const ch = text[0];
return "|&>.?:=,<-+!~*[({".indexOf(ch) >= 0;
```

## static method IsNewLineContinuation:(text:string)=>bool

换行处仍属于同一类型的词：类型运算符与续接符；`;` 也留着（分号属于这条别名）。
`[` / `(` / `{` 换行后是新语句（TS 的索引访问只在同一行吃 `[`）。

```ts
if (text === "") {
  return false;
}
if (text === ";") {
  return true;
}
if (text === "extends") {
  return true;
}
const ch = text[0];
return "|&>.?:=,<-+!~*".indexOf(ch) >= 0;
```

## static method NextCodeText:(range:SourceRange)=>string

从 `range` 之后取下一个代码词的文本（跳过空白与注释；标点只取一个字符，标识符取整词）。
只用于 ASI / 续接判据，不建任何单元。

```ts
const document = range.Document;
if (document === null || range.EndIndex < 0) {
  return "";
}
const count = document.GetCount();
const whole = SourceRange.Whole(document);
let at = range.EndIndex;
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
  break;
}
if (at >= count) {
  return "";
}
const first = whole.At(at);
let word = first;
const firstCode = first.charCodeAt(0);
const identifier = (firstCode >= 97 && firstCode <= 122)
  || (firstCode >= 65 && firstCode <= 90) || first === "_" || first === "$";
if (identifier) {
  at++;
  while (at < count) {
    const ch = whole.At(at);
    const code = ch.charCodeAt(0);
    if ((code >= 97 && code <= 122) || (code >= 65 && code <= 90)
      || (code >= 48 && code <= 57) || ch === "_" || ch === "$") {
      word += ch;
      at++;
      continue;
    }
    break;
  }
}
return word;
```

## static method FindTypeParameterClose:(code:Array<Token>, start:int)=>int

```ts
let depth = 0;
for (let at = start; at < code.length; at++) {
  const unit = code[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = (unit as Symbol).TempToString();
  if (text === "<") {
    depth++;
    continue;
  }
  let closeCount = 0;
  if (text === ">") {
    closeCount = 1;
  } else if (text === ">>") {
    closeCount = 2;
  } else if (text === ">>>") {
    closeCount = 3;
  }
  if (closeCount > 0) {
    depth -= closeCount;
    if (depth <= 0) {
      return at;
    }
  }
}
return -1;
```

## static method IsTypeAliasHead:(code:Array<Token>, headText:string)=>bool

```ts
let typeIndex = -1;
if (headText === "type") {
  typeIndex = 0;
} else if (headText === "export" && code.length >= 2
  && code[1] instanceof Common && (code[1] as Common).Is("type")) {
  typeIndex = 1;
} else if (headText === "declare" && code.length >= 2
  && code[1] instanceof Common && (code[1] as Common).Is("type")) {
  typeIndex = 1;
} else if (headText === "export" && code.length >= 3
  && code[1] instanceof Common && (code[1] as Common).Is("declare")
  && code[2] instanceof Common && (code[2] as Common).Is("type")) {
  typeIndex = 2;
}
if (typeIndex < 0 || code.length <= typeIndex + 2) {
  return false;
}
if (!(code[typeIndex + 1] instanceof Common)) {
  return false;
}
// TS nextTokenIsIdentifierOnSameLine：`type` 与名字之间有行终止符 ⇒ 这不是别名声明。
// `type` ⏎ `T = 1` 是两条 ExpressionStatement（`type` 是标识符）；块注释里的换行同样算。
if (LineTerminator.HasBetween(code[typeIndex].SourceRange, code[typeIndex + 1].SourceRange)) {
  return false;
}
const next = code[typeIndex + 2];
if (!(next instanceof Symbol)) {
  return false;
}
const nextText = (next as Symbol).TempToString();
return nextText === "=" || nextText === "<";
```

## static method FromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext, basePos?:int)=>TypeAliasDeclarationShape

```ts
const code:Array<Token> = [];
for (let at = start; at <= tokenIndex; at++) {
  const unit = host.Data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  // 同一源区间出现多个单元 = 重放副本（`>>` 被拆分后宿主 `Data` 变长，reload 把同一个字符
  // 又压了一次；实测 `class C<T, U extends X<T>> {}` 后的 `;` 会以相同 [start..end] 出现两遍）。
  // 只保留第一份，否则第二个 `;` 会落进类型单元切片，TypeBuilder 读不完。
  const previous = code.length > 0 ? code[code.length - 1] : null;
  const unitStart = unit.SourceRange.Start;
  const unitEnd = unit.SourceRange.End;
  if (previous !== null && unitStart >= 0 && unitEnd >= 0) {
    const previousStart = previous.SourceRange.Start;
    const previousEnd = previous.SourceRange.End;
    if (previousStart >= 0 && previousEnd >= 0
      && previousStart === unitStart && previousEnd === unitEnd) {
      continue;
    }
  }
  code.push(unit);
}
if (code.length < 4) {
  throw new Error("类型别名声明不完整");
}
let pos = 0;
if (basePos !== undefined && basePos !== null && basePos >= 0) {
  pos = basePos;
} else {
  for (let at = start - 1; at >= 0; at--) {
    if (!host.Data[at].IsTriviaToken) {
      const end = host.Data[at].SourceRange.End;
      if (end >= 0) {
        pos = end;
      }
      break;
    }
  }
}
let decoratorBase = 0;
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
  let decoratorExpression:Token;
  {
    const builder = new ExpressionBuilder(host.Template, context);
    builder.Load(code.slice(decoratorCount + 1), expressionBase);
    if (builder.Units.length === 0) {
      throw new Error("decorator expression is empty");
    }
    decoratorExpression = builder.ParseExpression();
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
  }
  decorators.push(DecoratorShape.FromParts(atUnit, decoratorExpression, decoratorPos, context));
}
let cursor = decoratorCount;
let exportUnit:Token | null = null;
if (cursor < code.length && code[cursor] instanceof Common && (code[cursor] as Common).Is("export")) {
  exportUnit = code[cursor];
  cursor++;
}
let declareUnit:Token | null = null;
if (cursor < code.length && code[cursor] instanceof Common && (code[cursor] as Common).Is("declare")) {
  declareUnit = code[cursor];
  cursor++;
}
if (code.length < cursor + 4) {
  throw new Error("类型别名声明不完整");
}
const keyword = code[cursor];
const nameUnit = code[cursor + 1];
const third = code[cursor + 2];
if (!(keyword instanceof Common) || !(keyword as Common).Is("type")) {
  throw new Error("类型别名声明缺少 type 关键字");
}
// [B4c] 名字可以在名字关闭格就建成 IdentifierShape（早建路径），两种形态都接受。
if (!(nameUnit instanceof Common) && !(nameUnit instanceof IdentifierShape)) {
  throw new Error("类型别名声明的名字不是标识符");
}
if (!(third instanceof Symbol)) {
  throw new Error("类型别名声明缺少等号或类型参数");
}
let equalIndex = cursor + 2;
let paramsUnits:Array<Token> = [];
if ((third as Symbol).Is("<")) {
  const closeIndex = TypeAliasDeclarationShape.FindTypeParameterClose(code, cursor + 2);
  if (closeIndex < 0) {
    throw new Error("类型参数表缺少 >");
  }
  paramsUnits = code.slice(cursor + 2, closeIndex + 1);
  equalIndex = closeIndex + 1;
}
const equal = code[equalIndex];
const last = code[code.length - 1];
if (!(equal instanceof Symbol) || !(equal as Symbol).Is("=")) {
  throw new Error("类型别名声明缺少等号");
}
if (!(last instanceof Symbol) || !(last as Symbol).Is(";")) {
  // 无分号收口（ASI）：tokenIndex 就是类型末单元，末单元不是 `;` 是合法的。
  if (code.length <= equalIndex + 1) {
    throw new Error("类型别名声明的类型为空");
  }
} else if (code.length <= equalIndex + 1) {
  throw new Error("类型别名声明的类型为空");
}
let namePos = 0;
if (keyword.SourceRange.End >= 0) {
  namePos = keyword.SourceRange.EndIndex;
}
let name:Token;
if (nameUnit instanceof IdentifierShape) {
  name = nameUnit as IdentifierShape;
} else {
  name = IdentifierShape.FromBasicToken(nameUnit as Common, context);
  (name as IdentifierShape).Pos = namePos;
}
let typePos = 0;
if (equal.SourceRange.End >= 0) {
  typePos = equal.SourceRange.EndIndex;
}
let typeTail = code.length;
if (last instanceof Symbol && (last as Symbol).Is(";")) {
  typeTail = code.length - 1;
}
const typeUnits:Array<Token> = code.slice(equalIndex + 1, typeTail);
let type:Token;
if (typeUnits.length === 1 && !typeUnits[0].IsBasicToken) {
  // [B4c] 早建的类型节点（TypeLiteral / Union / 类型引用）整段就是这一个形状：直接消费。
  type = typeUnits[0];
} else {
  const builder = new TypeBuilder(host.Template, context);
  builder.Load(typeUnits, typePos);
  type = builder.ParseType();
  if (builder.At !== builder.Units.length) {
    throw new Error("类型别名声明的类型没有读完");
  }
}
let parameters:Array<Token> = [];
if (paramsUnits.length > 0) {
  const paramsBuilder = new TypeBuilder(host.Template, context);
  let paramsPos = 0;
  if (nameUnit.SourceRange.End >= 0) {
    paramsPos = nameUnit.SourceRange.EndIndex;
  }
  paramsBuilder.Load(paramsUnits, paramsPos);
  parameters = paramsBuilder.ParseTypeParameterList();
  if (paramsBuilder.At !== paramsBuilder.Units.length) {
    throw new Error("类型别名声明的类型参数没有读完");
  }
}
const shape = new TypeAliasDeclarationShape(host.Template);
shape.AliasName = name;
shape.AliasParameters = parameters;
shape.AliasType = type;
for (const decorator of decorators) {
  shape.Add(decorator);
}
if (exportUnit !== null) {
  const modifier = ExportKeywordShape.FromBasicToken(exportUnit as Common, context);
  modifier.Pos = pos;
  shape.Add(modifier);
}
if (declareUnit !== null) {
  const modifier = DeclareKeywordShape.FromBasicToken(declareUnit as Common, context);
  // TS 的 pos：export 之后的 declare 取 export 末尾 + 1（`export declare type` 的 declare 是 [6,14)）。
  if (exportUnit === null) {
    modifier.Pos = pos;
  } else {
    const exportEnd = exportUnit.SourceRange.End;
    modifier.Pos = exportEnd < 0 ? pos : exportEnd;
  }
  shape.Add(modifier);
}
if (decoratorCount > 0) {
  let modifierPos = decoratorEnd;
  for (const child of shape.Data) {
    if (child instanceof ExportKeywordShape || child instanceof DeclareKeywordShape) {
      (child as ShapeToken).Pos = modifierPos;
      if (child.SourceRange.End >= 0) {
        modifierPos = child.SourceRange.EndIndex;
      }
    }
  }
}
shape.Add(name);
for (const parameter of parameters) {
  shape.Add(parameter);
}
shape.Add(type);
if (decoratorCount > 0) {
  if (code[0].SourceRange.Start >= 0) {
    shape.SignIn(code[0].SourceRange.StartIndex);
  }
} else if (exportUnit !== null) {
  if (exportUnit.SourceRange.Start >= 0) {
    shape.SignIn(exportUnit.SourceRange.StartIndex);
  }
} else if (declareUnit !== null) {
  if (declareUnit.SourceRange.Start >= 0) {
    shape.SignIn(declareUnit.SourceRange.StartIndex);
  }
} else if (keyword.SourceRange.Start >= 0) {
  shape.SignIn(keyword.SourceRange.StartIndex);
}
if (last.SourceRange.End >= 0) {
  shape.SignOut(last.SourceRange.EndIndex);
}
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```
