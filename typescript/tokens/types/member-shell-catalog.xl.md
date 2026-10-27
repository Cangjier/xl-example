# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ComputePossibleShapesStates } from "../../../core/syntax/compute-possible-shapes-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BracketCatalogInstaller } from "../statements/bracket-catalog-installer.xl.md"
import { BracketRoleCatalog } from "../statements/bracket-role-resolver.xl.md"
import { BracketRoleResult } from "../statements/bracket-role-resolver.xl.md"
import { BracketRoleState } from "../statements/bracket-role-resolver.xl.md"
import { BracketRole } from "../statements/bracket-role-resolver.xl.md"
import { BlockPossibleShape } from "../statements/block-possible-shape.xl.md"
import { BlockShape } from "../statements/block-shape.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { ClassMemberPossibleUtil } from "./class-member-possible-util.xl.md"
import { ClassStaticBlockDeclarationShape } from "./class-static-block-declaration-shape.xl.md"
import { ConstructSignatureShape } from "./construct-signature-shape.xl.md"
import { ConstructorShape } from "./constructor-shape.xl.md"
import { EnumDeclarationShape } from "../declarations/enum-declaration-shape.xl.md"
import { EnumMemberShape } from "../members/enum-member-shape.xl.md"
import { GetAccessorShape } from "./get-accessor-shape.xl.md"
import { GetKeywordShape } from "../keywords/get-keyword-shape.xl.md"
import { IndexSignatureShape } from "./index-signature-shape.xl.md"
import { InterfaceDeclarationShape } from "../declarations/interface-declaration-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ConstructorKeywordShape } from "../keywords/constructor-keyword-shape.xl.md"
import { MemberBoundary, MemberHeadKind, MemberHeadPlan, MemberHeadScan } from "./member-boundary.xl.md"
import { MemberPossibleUtil } from "./property-signature-possible-shape.xl.md"
import { MethodDeclarationShape } from "./method-declaration-shape.xl.md"
import { MethodSignatureShape } from "./method-signature-shape.xl.md"
import { NewKeywordShape } from "../keywords/new-keyword-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { ParameterListPossibleShape } from "./parameter-list-possible-shape.xl.md"
import { PropertyDeclarationShape } from "./property-declaration-shape.xl.md"
import { PropertySignatureShape } from "./property-signature-shape.xl.md"
import { SetAccessorShape } from "./set-accessor-shape.xl.md"
import { SetKeywordShape } from "../keywords/set-keyword-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { TypeBuilder } from "./type-builder.xl.md"
import { WaitingEndPossible } from "../statements/waiting-end-possible.xl.md"
```

# namespace cangjie

# class MemberShellFamily

成员外壳族（B2）。与 `StatementRoute` 同款：纯 `int` 常量，**不新增枚举**。

## static field Class:int = 0

class 成员：属性 / 方法 / 构造器 / 访问器 / 索引签名 / 静态块（B2c 起，按 `MemberHeadKind` 选外壳类）。

## static field Interface:int = 1

interface 成员：属性签名 / 方法签名 / 构造签名 / 访问器 / 索引签名（B2c 起）。

## static field Enum:int = 2

enum 成员（`EnumMemberShape`）。成员名之后只可能是 `=` 初始化器或分隔符。

# class MemberShellEntry

一条「成员外壳」登记：外壳 + 族 + 起始 `Pos` + 宿主括号向导的缓存（收口时推进 `ItemStart` 用）。

## field Shell:Token | null = null

## field Family:int = 0

## field BasePos:int = 0

## field Cache:PossibleShapeCache | null = null

## field Modifiers:int = 0

**成员头的修饰词个数**（`MemberHeadScan.Plan` 的结果）：`>= 0` 时头部的每一格都知道自己是谁
（前 `Modifiers` 格是修饰词、第 `Modifiers` 格是名字、`=` 之后是初始字面量）；`-1` = 前瞻判不出，
本外壳**不做子 token 成形**（原样攒单元，交旧路径）。

## field Kind:int = -1

成员头的种类（`MemberHeadKind`）：决定外壳类、名字那一格成什么形状、`{` 是方法体还是静态块体。

## field BodyBracket:Token | null = null

方法体 / 静态块体括号的**原样**单元（B2c）：`OpenMemberBody` 把它换成 `BlockShape`，
这一格记下原物，`Restore` 时换回去，legacy builder 看到的仍是裸括号。

## field BodyBlock:BlockShape | null = null

方法体的中间壳（`BlockShape`）。体括号关闭时 `BlockShape` 把通知转给外壳，外壳据这一格认出
「体刚闭合 ⇒ 整条成员收口」。

## field Parts:Array<MemberShellHeadPart> = []

已经成形过的头部子 token（按出现顺序）：收口 / 拆壳前用 `RawData` 换回原样单元。

# class MemberShellHeadPart

**一个已成形的头部子 token**：形状 + 它替换掉的那批原样单元。

`Raw` 是**权威**：外壳的 `Data` 里放的是形状，收口前 `Restore` 把形状换回 `Raw`，
legacy builder 因此看到的单元与「从未成形过」逐字节相同。

## field Shape:Token | null = null

## field Raw:Array<Token> = []

# class MemberShellCatalog

**成员外壳目录（B2）：早建外壳 → 逐字攒成员 → 边界收口。**

为什么要有它：class / interface / enum 的成员候选**只在成员边界 Accept**（`ClassMemberPossibleUtil.Analyze`
的 `Complete` 要等 `;` / `,` / 下一行），所以 `class A { x: number }` 的属性要等到 `number` 之后才出现，
`class-field-modifiers` 里 `private static readonly x = 1` 更是一直到 `;` 之后才建。
B2 把「成员头已定」的那一格提前 Accept：先建一个**同类型的空外壳**（`PropertyDeclarationShape` /
`PropertySignatureShape` / `EnumMemberShape`），把已经到达的头部单元搬进外壳，外壳从此作为挂载单元
吃掉余下的字符；到边界时用**族自己的 legacy builder**（`BuildMembers`）从外壳攒下的原样单元重建正品，
再把外壳原地换掉。**最终 AST 仍由 legacy builder 产出**，本机制只改「什么时候出现形状」，不改判据。

边界与收口口径：

- 外壳自己带 `CatalogGuide([], MemberShellEndPossible)`：`;` / `,` / 成员边界那一格收口；
- 没有分隔符的最后一个成员（`class A { x: number }`）由 `FinalizeAll` 在声明体收口时收口；
- 收口失败（legacy builder 不认这段）⇒ **`Unwrap` 把原样单元放回去**，交旧路径逐字节兜底，绝不半建。

计数器（只读）：`CreatedCount` / `FinalizedCount` / `UnwrappedCount` / `PrunedCount`。

## static field Open:Array<MemberShellEntry> = []

按创建顺序。条目在收口 / 拆壳 / 剪枝时摘除。

## static field Enable:bool = true

总开关。关掉后 `Create` 直接返回宿主，三个族的候选退回「边界才建」的旧行为。

## static field CreatedCount:int = 0

## static field FinalizedCount:int = 0

外壳被换成正品的次数。

## static field UnwrappedCount:int = 0

收口失败、把原样单元放回去的次数。

## static field PrunedCount:int = 0

外壳已脱离父单元（`Quit` / `Undo` / 收口格已过）而登记的条目被摘掉的次数。

## static method IsEnabled:()=>bool

```ts
return MemberShellCatalog.Enable;
```

## static method Reset:()=>void

只给同一进程里两种模式交替的 harness / 单元测试用。

```ts
MemberShellCatalog.Open = [];
MemberShellCatalog.CreatedCount = 0;
MemberShellCatalog.FinalizedCount = 0;
MemberShellCatalog.UnwrappedCount = 0;
MemberShellCatalog.PrunedCount = 0;
```

## static method Report:()=>string

```ts
return "open=" + MemberShellCatalog.Open.length
  + " created=" + MemberShellCatalog.CreatedCount
  + " finalized=" + MemberShellCatalog.FinalizedCount
  + " unwrapped=" + MemberShellCatalog.UnwrappedCount
  + " pruned=" + MemberShellCatalog.PrunedCount;
```

## static method Find:(shell:Token)=>MemberShellEntry | null

```ts
for (const entry of MemberShellCatalog.Open) {
  if (entry.Shell === shell) {
    return entry;
  }
}
return null;
```

## static method IsOpen:(shell:Token)=>bool

```ts
return MemberShellCatalog.Find(shell) !== null;
```

## static method Drop:(shell:Token | null)=>void

```ts
if (shell === null) {
  return;
}
for (let at = 0; at < MemberShellCatalog.Open.length; at++) {
  if (MemberShellCatalog.Open[at].Shell === shell) {
    MemberShellCatalog.Open.splice(at, 1);
    return;
  }
}
```

## static method Prune:()=>void

**`Quit` / `Undo` 的等价物**：外壳已经不在父单元的 `Data` 里（被回退 / 卸载 / 收口格越过），
登记条目必须摘掉，否则会指向一个孤儿 token。只动登记表，不动任何 `Data`。

```ts
for (let at = MemberShellCatalog.Open.length - 1; at >= 0; at--) {
  const entry = MemberShellCatalog.Open[at];
  const shell = entry.Shell;
  if (shell === null || shell.Parent === null) {
    MemberShellCatalog.Open.splice(at, 1);
    MemberShellCatalog.PrunedCount += 1;
    continue;
  }
  if (shell.Parent.Data.indexOf(shell) < 0) {
    MemberShellCatalog.Open.splice(at, 1);
    MemberShellCatalog.PrunedCount += 1;
  }
}
```

## static method InstallBodyCatalog:(body:Bracket, shapes:Array<PossibleShape>, role:string, owner:Token, context:SyntaxContext)=>bool

**成员块目录的安装点（B0 安装器）**：`Known` 计划 + 永不 `Accept` 的终结候选
（`BracketCatalogInstaller.BuildGuide` 统一补 `WaitingEndPossible`）。

为什么必须走安装器：外壳建出来之后，块里不再有新单元，旧目录的候选会**全部 `Reject`**
（`CatalogGuide` 的「没有候选形状可以构成」抛错出口）；`WaitingEndPossible` 把这个出口变成
`Waiting`，raw 单元原样留着，收口侧照旧走 legacy。

```ts
const catalog = new BracketRoleCatalog(role, shapes, null);
const plan = BracketRoleResult.Known(catalog, null, role, owner, role);
const installed = BracketCatalogInstaller.Install(body, plan, context);
return installed === 0;
```

## static method NewShell:(family:int, kind:int, template:Template)=>ShapeToken

按族 + 中性种类选外壳类（B2c）：外壳与被 legacy builder 建出来的正品**同类型**，
所以「方法 / 构造器 / 访问器 / 索引 / 构造签名」各自在自己的格出现。

```ts
if (family === MemberShellFamily.Enum) {
  return new EnumMemberShape(template);
}
if (family === MemberShellFamily.Interface) {
  if (kind === MemberHeadKind.Method || kind === MemberHeadKind.Constructor) {
    return new MethodSignatureShape(template);
  }
  if (kind === MemberHeadKind.Construct) {
    return new ConstructSignatureShape(template);
  }
  if (kind === MemberHeadKind.Get) {
    return new GetAccessorShape(template);
  }
  if (kind === MemberHeadKind.Set) {
    return new SetAccessorShape(template);
  }
  if (kind === MemberHeadKind.Index) {
    return new IndexSignatureShape(template);
  }
  return new PropertySignatureShape(template);
}
if (kind === MemberHeadKind.Method) {
  return new MethodDeclarationShape(template);
}
if (kind === MemberHeadKind.Constructor) {
  return new ConstructorShape(template);
}
if (kind === MemberHeadKind.Get) {
  return new GetAccessorShape(template);
}
if (kind === MemberHeadKind.Set) {
  return new SetAccessorShape(template);
}
if (kind === MemberHeadKind.Index) {
  return new IndexSignatureShape(template);
}
if (kind === MemberHeadKind.StaticBlock) {
  return new ClassStaticBlockDeclarationShape(template);
}
return new PropertyDeclarationShape(template);
```

## static method Create:(host:Token, start:int, end:int, family:int, cache:PossibleShapeCache, context:SyntaxContext)=>Token

**早建外壳**：把 `host.Data[start..end]` 搬进一个同族 / 同种类的空外壳，外壳成为宿主括号的挂载单元。

`start` / `end` 是**宿主 `Data` 的下标**（含 trivia 的原始位置）：搬进去的是原样单元
（`BuildMembers` 需要 trivia 来判断换行 / ASI，所以一个都不许丢）。

种类由外壳第一格上的 `MemberHeadScan.Plan` 给出（B2c）：方法 / 构造器 / 访问器 / 索引 / 静态块
各自建对应类的空壳；判不出（`null`）⇒ 仍建属性壳，行为与 B2b 逐字节一致。

```ts
if (!MemberShellCatalog.Enable) {
  return host;
}
if (start < 0 || end < start || end >= host.Data.length) {
  return host;
}
MemberShellCatalog.Prune();
const consumed:Array<Token> = host.Data.slice(start, end + 1);
let firstCode:Token | null = null;
for (const unit of consumed) {
  if (!unit.IsTriviaToken) {
    firstCode = unit;
    break;
  }
}
const plan = firstCode === null ? null : MemberHeadScan.Plan(firstCode, family === MemberShellFamily.Interface);
let kind = plan === null ? MemberHeadKind.Property : plan.Kind;
if (family === MemberShellFamily.Class && kind === MemberHeadKind.Construct) {
  // class 侧没有构造签名：让回旧路径，不硬猜。
  kind = MemberHeadKind.Method;
}
if (family === MemberShellFamily.Enum) {
  kind = MemberHeadKind.Property;
}
const shell = MemberShellCatalog.NewShell(family, kind, host.Template);
let basePos = 0;
if (family === MemberShellFamily.Class) {
  basePos = ClassMemberPossibleUtil.BasePos(host, start);
} else if (family === MemberShellFamily.Interface) {
  basePos = MemberPossibleUtil.BasePos(host, start);
} else {
  basePos = MemberPossibleUtil.BasePos(host, start);
}
if (consumed.length > 0 && consumed[0].SourceRange.Start >= 0) {
  shell.SignIn(consumed[0].SourceRange.StartIndex);
}
for (const unit of consumed) {
  shell.Add(unit);
}
shell.Pos = basePos;
shell.Parent = host;
host.Data.splice(start, consumed.length, shell);
host.MountedUnit = shell;
const entry = new MemberShellEntry();
entry.Shell = shell;
entry.Family = family;
entry.BasePos = basePos;
entry.Cache = cache;
entry.Kind = kind;
entry.Modifiers = plan === null ? -1 : plan.Modifiers;
MemberShellCatalog.Open.push(entry);
MemberShellCatalog.CreatedCount += 1;
// [B2b] 头部已经到达的那批单元当场成形（`private` 在自己的闭合格就是 `PrivateKeywordShape`）。
MemberShellCatalog.WrapAll(entry, context);
return shell;
```

## static method FindPart:(entry:MemberShellEntry, unit:Token)=>MemberShellHeadPart | null

```ts
for (const part of entry.Parts) {
  if (part.Shape === unit) {
    return part;
  }
}
return null;
```

## static method RawData:(entry:MemberShellEntry)=>Array<Token>

**换回原样单元**：把外壳 `Data` 里已经成形的头部子 token 逐个替换成它替换掉的那批单元。

```ts
const out:Array<Token> = [];
const shell = entry.Shell;
if (shell === null) {
  return out;
}
for (const unit of shell.Data) {
  const part = MemberShellCatalog.FindPart(entry, unit);
  if (part === null) {
    out.push(unit);
    continue;
  }
  for (const raw of part.Raw) {
    out.push(raw);
  }
}
return out;
```

## static method Restore:(entry:MemberShellEntry)=>void

**收口 / 拆壳之前的一次还原**：外壳的 `Data` 换回原样单元，此后所有下标算术（边界、切点、还给父括号的
尾巴）都与 B2 的旧口径逐字节一致。

幂等：`Parts` 为空时什么都不做。

```ts
if (entry.Parts.length === 0) {
  return;
}
const shell = entry.Shell;
if (shell === null) {
  return;
}
const restored = MemberShellCatalog.RawData(entry);
for (const unit of restored) {
  unit.Parent = shell;
}
shell.Data = restored;
entry.Parts = [];
entry.BodyBlock = null;
```

## static method PreviousEnd:(entry:MemberShellEntry, at:int)=>int

头部第 `at` 格之前的「上一个非 trivia 单元的终点」，没有就退到 `BasePos`——与 legacy builder 的
`previousEnd` 同一口径（修饰词 / 名字的 `Pos` 靠它）。

```ts
const shell = entry.Shell;
if (shell === null) {
  return entry.BasePos;
}
let cursor = at - 1;
while (cursor >= 0 && shell.Data[cursor].IsTriviaToken) {
  cursor--;
}
if (cursor >= 0) {
  const end = shell.Data[cursor].SourceRange.EndIndex;
  if (end >= 0) {
    return end;
  }
}
return entry.BasePos;
```

## static method HeadKindAt:(entry:MemberShellEntry, at:int)=>int

头部第 `at` 格该是什么：`0` = 原样（类型注解 / `:` / `=` / `;` / `,` / 索引签名的 `[` …），
`1` = 修饰词（含 `get` / `set` / `static`），`2` = 成员名，`3` = `=` 之后的初始字面量，
`4` = 构造签名的 `new`，`5` = 构造器的 `constructor`。

`Modifiers` / `Kind` 是**前瞻**给的（`MemberHeadScan.Plan`）：前 `Modifiers` 格是修饰词，第 `Modifiers` 格
按种类是名字（标识符 / `constructor` / `new`）。索引签名的第一格是已闭合的 `[` 括号，不成形；
静态块没有名字。

```ts
if (entry.Modifiers < 0) {
  return 0;
}
const shell = entry.Shell;
if (shell === null) {
  return 0;
}
if (entry.Kind === MemberHeadKind.Index) {
  return 0;
}
let codeIndex = 0;
let sawEqual = false;
for (let cursor = 0; cursor < at; cursor++) {
  const item = shell.Data[cursor];
  if (item.IsTriviaToken) {
    continue;
  }
  codeIndex++;
  if (item instanceof Symbol && (item as Symbol).Is("=")) {
    sawEqual = true;
  }
}
if (codeIndex < entry.Modifiers) {
  return 1;
}
if (codeIndex === entry.Modifiers) {
  if (entry.Kind === MemberHeadKind.StaticBlock) {
    return 0;
  }
  if (entry.Kind === MemberHeadKind.Construct) {
    return 4;
  }
  if (entry.Kind === MemberHeadKind.Constructor) {
    return 5;
  }
  return 2;
}
if (!sawEqual) {
  return 0;
}
const unit = shell.Data[at];
if (unit instanceof Common && (unit as Common).IsNumber()) {
  return 3;
}
if (unit instanceof String) {
  return 3;
}
return 0;
```

## static method BuildKeyword:(template:Template, shape:ShapeToken, unit:Token, pos:int, context:SyntaxContext)=>Token

把一格的 `Common` 包成 **关键字形状**（`get` / `set` / `new` / `constructor`）：与 `BuildModifier`
同口径（签入签出 + `Pos` + `TryToClose`），收口时同样换回 `Raw`。

```ts
shape.SignInToken(unit);
shape.SignOutToken(unit);
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```

## static method BuildHeadShape:(entry:MemberShellEntry, kind:int, at:int, context:SyntaxContext)=>Token | null

按 `kind` 建头部子 token 的形状。这些形状都是**区间节点**（不挂子单元），与 legacy builder 里
`BuildModifier` / `IdentifierShape.FromBasicToken` 的口径一致；因此收口时把它们换回 `Raw` 就完全还原。

```ts
const shell = entry.Shell;
if (shell === null) {
  return null;
}
const unit = shell.Data[at];
const pos = MemberShellCatalog.PreviousEnd(entry, at);
const template = shell.Template;
if (kind === 1) {
  if (!(unit instanceof Common)) {
    return null;
  }
  const text = (unit as Common).TempToString();
  if (text === "get") {
    return MemberShellCatalog.BuildKeyword(template, new GetKeywordShape(template), unit, pos, context);
  }
  if (text === "set") {
    return MemberShellCatalog.BuildKeyword(template, new SetKeywordShape(template), unit, pos, context);
  }
  return ClassDeclarationShape.BuildModifier(template, text, unit, pos, context);
}
if (kind === 4) {
  if (!(unit instanceof Common)) {
    return null;
  }
  return MemberShellCatalog.BuildKeyword(template, new NewKeywordShape(template), unit, pos, context);
}
if (kind === 5) {
  if (!(unit instanceof Common)) {
    return null;
  }
  return MemberShellCatalog.BuildKeyword(template, new ConstructorKeywordShape(template), unit, pos, context);
}
if (unit instanceof Common) {
  const common = unit as Common;
  if (kind === 2 && !common.IsNumber()) {
    const identifier = IdentifierShape.FromBasicToken(common, context);
    identifier.Pos = pos;
    return identifier;
  }
  if (common.IsNumber()) {
    const numeric = NumericLiteralShape.FromBasicToken(common, context);
    numeric.Pos = pos;
    return numeric;
  }
  return null;
}
if (unit instanceof String) {
  const literal = StringLiteralShape.FromBasicToken(unit as String, context);
  literal.Pos = pos;
  return literal;
}
return null;
```

## static method WrapAt:(entry:MemberShellEntry, at:int, context:SyntaxContext)=>void

把外壳 `Data` 的第 `at` 格（刚闭合的那一格）按位置换成形状，并登记原样单元。已经是形状 / trivia 的格子
原样不动（幂等）。

```ts
const shell = entry.Shell;
if (shell === null) {
  return;
}
if (at < 0 || at >= shell.Data.length) {
  return;
}
const unit = shell.Data[at];
if (unit.IsTriviaToken) {
  return;
}
if (MemberShellCatalog.FindPart(entry, unit) !== null) {
  return;
}
const kind = MemberShellCatalog.HeadKindAt(entry, at);
if (kind === 0) {
  return;
}
const shape = MemberShellCatalog.BuildHeadShape(entry, kind, at, context);
if (shape === null) {
  return;
}
const part = new MemberShellHeadPart();
part.Shape = shape;
part.Raw.push(unit);
entry.Parts.push(part);
shape.Parent = shell;
shell.Data.splice(at, 1, shape);
```

## static method WrapAll:(entry:MemberShellEntry, context:SyntaxContext)=>void

把外壳当前 `Data` 里所有该成形的头部格子逐个成形（`splice` 是一换一，下标稳定）。

```ts
const shell = entry.Shell;
if (shell === null) {
  return;
}
for (let at = 0; at < shell.Data.length; at++) {
  MemberShellCatalog.WrapAt(entry, at, context);
}
```

## static method IsCallableKind:(kind:int)=>bool

这种成员后面要接参数表 `(`（方法 / 构造器 / 访问器 / 构造签名）。

```ts
return kind === MemberHeadKind.Method || kind === MemberHeadKind.Constructor
  || kind === MemberHeadKind.Get || kind === MemberHeadKind.Set
  || kind === MemberHeadKind.Construct;
```

## static method HasBodyKind:(kind:int)=>bool

这种成员有 `{` 体（方法 / 构造器 / 访问器 / 静态块）。

```ts
return kind === MemberHeadKind.Method || kind === MemberHeadKind.Constructor
  || kind === MemberHeadKind.Get || kind === MemberHeadKind.Set
  || kind === MemberHeadKind.StaticBlock;
```

## static method InstallParameterList:(shell:Token, bracket:Bracket, family:int, context:SyntaxContext)=>void

**[B2c] 成员参数表复用 B1 的 `ParameterListPossibleShape`**：只接 B1 认的「简单参数表」
（`[ '...' ] name [ ':' type ]`）；其余形态一个字节都不动，整段留给 legacy `BuildParameters`。
目录直接以 `ParameterList` 角色装到括号上（与函数声明的安装路径同一个 `BracketCatalogInstaller`）。

interface 侧再收窄一格：**多参数 / rest 参数**仍交给 legacy（B1 的 `PreviousParamPos` 对这些格
把 `SourceRange.Start` 签在 token 起点，与 legacy / TS 的 trivia 口径差一格；单参数没有这个差）。
class 侧不受此限（与 B1 的函数参数路径同一口径）。

```ts
if (family !== MemberShellFamily.Enum) {
  const text = ParameterListPossibleShape.TextBetween(bracket);
  // 多参数 / rest / 换行 / 两端空白：legacy / TS 的 `pos` 含前导 trivia，B1 的 `Start` 不含，
  // 这些格交给 legacy；`m(a: number)` 这种紧凑的单参数表没有这个差。
  if (text.indexOf(",") >= 0 || text.indexOf("...") >= 0
    || text.indexOf("\n") >= 0 || text.indexOf("\r") >= 0 || text !== text.trim()) {
    return;
  }
}
if (!ParameterListPossibleShape.InstallIfSimple(shell, bracket, context)) {
  return;
}
const catalog = new BracketRoleCatalog(BracketRole.ParameterList, ParameterListPossibleShape.Shapes(), null);
const plan = BracketRoleResult.Known(catalog, null, BracketRole.ParameterList, shell, BracketRole.ParameterList);
BracketCatalogInstaller.Install(bracket, plan, context);
```

## static method OpenMemberBody:(shell:Token, body:Bracket, context:SyntaxContext)=>void

**[B2c] 方法体 `{` 复用 B1b 的 `BlockShape`**：与 `FunctionDeclarationShape.OpenFunctionBody` 同一手法——
先给体括号挂块体语句目录，再把括号换进 `BlockShape` 壳；括号原物登记成 `Parts` 里的一项，
收口前 `Restore` 换回裸括号，legacy builder 看到的与从未成形过逐字节相同。

```ts
const entry = MemberShellCatalog.Find(shell);
if (entry === null) {
  return;
}
if (entry.BodyBlock !== null) {
  return;
}
if (body.CatalogGuide === null) {
  BlockPossibleShape.MountBodyCatalog(body);
}
const block = new BlockShape(shell.Template);
const at = shell.Data.indexOf(body);
let pos = 0;
if (at >= 0) {
  for (let back = at - 1; back >= 0; back--) {
    if (!shell.Data[back].IsTriviaToken) {
      const end = shell.Data[back].SourceRange.EndIndex;
      if (end >= 0) {
        pos = end;
      }
      break;
    }
  }
}
block.Add(body);
body.Parent = block;
if (body.SourceRange.Start >= 0) {
  block.SignIn(body.SourceRange.StartIndex);
}
block.Pos = pos;
if (at >= 0) {
  shell.Data.splice(at, 1, block);
  block.Parent = shell;
}
shell.MountedUnit = block;
block.MountedUnit = body;
const part = new MemberShellHeadPart();
part.Shape = block;
part.Raw.push(body);
entry.Parts.push(part);
entry.BodyBracket = body;
entry.BodyBlock = block;
```

## static method IsHeadParameterBracket:(shell:Token, bracket:Bracket)=>bool

**只有成员自己的参数表**才装 B1 目录：外壳吃掉整条成员，返回类型里的 `(`（`x is (string)`）、
参数默认值里的 `(`（`m(a = f(b))`）也会走到 `OnBracketCreated`，给它们装参数目录会把类型 / 表达式
当成 `ParameterShape` 收掉。

判据：这是外壳里的**第一个** `(`，而且它前面那个非 trivia 单元是名字（`Common`）/ 泛型关闭符 /
`?`（可选方法）。

```ts
let at = shell.Data.indexOf(bracket);
if (at < 0) {
  return false;
}
// 只认外壳里的**第一个** `(`：返回类型 / 参数默认值里的括号前面已经有参数表了。
for (let earlier = 0; earlier < at; earlier++) {
  const unit = shell.Data[earlier];
  if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(") {
    return false;
  }
}
let previous:Token | null = null;
for (let back = at - 1; back >= 0; back--) {
  const unit = shell.Data[back];
  if (unit.IsTriviaToken) {
    continue;
  }
  previous = unit;
  break;
}
if (previous === null) {
  return false;
}
if (previous instanceof Bracket) {
  return false;
}
if (previous instanceof Symbol) {
  const text = (previous as Symbol).TempToString();
  return text === ">" || text === ">>" || text === ">>>" || text === "?";
}
// 名字那一格在自己的闭合格已经换成 `IdentifierShape` / `ConstructorKeywordShape` 等形状，
// 所以这里接受「不是括号、不是符号」的任何头部单元（修饰词形状只可能出现在更前面）。
return true;
```

## static method OnBracketCreated:(shell:Token, bracket:Token, context:SyntaxContext)=>void

**[B2c] 成员外壳的子括号挂载点**（由各成员形状的 `OnBracketCreatedEvent` 转进来）：
`(` ⇒ B1 参数表目录；`{` ⇒ 方法体块壳。不是本外壳的括号（或不是方法体）一律不动。

```ts
const entry = MemberShellCatalog.Find(shell);
if (entry === null) {
  return;
}
if (!(bracket instanceof Bracket)) {
  return;
}
const unit = bracket as Bracket;
if (unit.StartBracketChar === "(") {
  if (MemberShellCatalog.IsCallableKind(entry.Kind)
    && MemberShellCatalog.IsHeadParameterBracket(shell, unit)) {
    MemberShellCatalog.InstallParameterList(shell, unit, entry.Family, context);
  }
  return;
}
if (unit.StartBracketChar !== "{") {
  return;
}
if (!MemberShellCatalog.HasBodyKind(entry.Kind)) {
  return;
}
if (!TypeBuilder.IsBodyBrace(shell.Data, shell.Data.length - 1)) {
  return;
}
MemberShellCatalog.OpenMemberBody(shell, unit, context);
```

## static method HeadCompute:(shell:Token, context:SyntaxContext)=>ComputePossibleShapesStates

**成员外壳的 basic token 关闭回调**（三个成员形状的 `ComputePossibleShapes` 都转到这里）。

两件事，顺序固定：

1. 刚闭合的那一格按位置成形（`WrapAt`）——`private` / `static` / `readonly` / `x` / `1` 于是各自在
   自己的闭合格出现；
2. 判成员边界（`FinalizeShell`）：**到了**就收口并返回 `Built`（当前字符重放，与 B2 的旧行为逐字一致），
   **没到**就返回 `Waiting`——通道让 basic token 的关闭继续走原来的路（不做 `Reload`，当前字符不被重放）。

```ts
const entry = MemberShellCatalog.Find(shell);
if (entry === null) {
  return ComputePossibleShapesStates.Nothing;
}
if (shell.Data.length > 0) {
  MemberShellCatalog.WrapAt(entry, shell.Data.length - 1, context);
}
// [B2c] 方法体刚闭合：`BlockShape` 把通知转到这里，整条成员就此收口。
const lastUnit = shell.Data.length > 0 ? shell.Data[shell.Data.length - 1] : null;
if (entry.BodyBlock !== null && lastUnit === entry.BodyBlock) {
  MemberShellCatalog.FinalizeShell(shell, context);
  if (MemberShellCatalog.IsOpen(shell)) {
    return ComputePossibleShapesStates.Waiting;
  }
  return ComputePossibleShapesStates.Built;
}
// [B2c] 参数表 `)` 闭合：B1 的收口钩子（最后一个参数没有后继 token 可等）。
if (lastUnit !== null && lastUnit instanceof Bracket
  && (lastUnit as Bracket).StartBracketChar === "(" && (lastUnit as Bracket).Closed
  && MemberShellCatalog.IsCallableKind(entry.Kind)) {
  ParameterListPossibleShape.Finalize(shell, context);
}
let code = 0;
for (const unit of shell.Data) {
  if (!unit.IsTriviaToken) {
    code++;
  }
}
if (code === 0) {
  return ComputePossibleShapesStates.Waiting;
}
MemberShellCatalog.FinalizeShell(shell, context);
if (MemberShellCatalog.IsOpen(shell)) {
  return ComputePossibleShapesStates.Waiting;
}
return ComputePossibleShapesStates.Built;
```

## static method BuildMember:(family:int, host:Token, data:Array<Token>, basePos:int, context:SyntaxContext)=>Token | null

**用族自己的 legacy builder 建正品**：临时括号视图 + 同样的 `pos` / `end` 断言（`BuildMemberFromCode`
的口径：产出的 `Pos` 必须等于 `basePos`，终点必须等于最后一个非 trivia 单元的 `End`）。

```ts
if (data.length === 0) {
  return null;
}
let tail = -1;
for (let at = data.length - 1; at >= 0; at--) {
  if (!data[at].IsTriviaToken) {
    tail = data[at].SourceRange.End;
    break;
  }
}
if (tail < 0) {
  return null;
}
const view = new Bracket(host.Template);
view.Data = data;
if (basePos > 0) {
  view.SignIn(basePos - 1);
}
let members:Array<Token> = [];
try {
  if (family === MemberShellFamily.Class) {
    members = ClassDeclarationShape.BuildMembers(host, view, context);
  } else if (family === MemberShellFamily.Interface) {
    members = InterfaceDeclarationShape.BuildMembers(host, view, context);
  } else {
    members = EnumDeclarationShape.BuildMembers(host, view, context);
  }
} catch (error) {
  return null;
}
if (members.length !== 1) {
  return null;
}
const built = members[0];
if (built.SourceRange.End !== tail) {
  return null;
}
if ((built as ShapeToken).Pos !== basePos) {
  return null;
}
return built;
```

## static method Unwrap:(host:Token, entry:MemberShellEntry)=>void

**收口失败 / 拆壳**：把外壳攒下的原样单元按顺序放回宿主，恢复「这些字符还没被消费」的旧状态。

```ts
const shell = entry.Shell;
MemberShellCatalog.Drop(shell);
if (shell === null) {
  return;
}
MemberShellCatalog.Restore(entry);
const at = host.Data.indexOf(shell);
if (at < 0) {
  // [B2c] 外壳已经不在父单元里：Parent 仍指回宿主（不是 null）——`UnitToken.Process` 的
  // 「Parent.MountedUnit 已经不是自己」守卫据此让本次窗口立即交回父单元，避免孤儿壳继续吞字符。
  shell.Parent = host;
  return;
}
const units:Array<Token> = shell.Data.slice(0);
host.Data.splice(at, 1);
for (let index = 0; index < units.length; index++) {
  units[index].Parent = host;
  host.Data.splice(at + index, 0, units[index]);
}
shell.Parent = host;
if (host.MountedUnit === shell) {
  host.MountedUnit = null;
}
MemberShellCatalog.UnwrappedCount += 1;
```

## static method Finalize:(host:Token, entry:MemberShellEntry, cutData:int, tailStart:int, context:SyntaxContext)=>Token

**收口一格**：用 `shell.Data[0..cutData]` 建正品，`shell.Data[tailStart..]` 原样还给宿主。

```ts
const shell = entry.Shell;
if (shell === null) {
  return host;
}
MemberShellCatalog.Restore(entry);
const data:Array<Token> = shell.Data.slice(0, cutData + 1);
const tail:Array<Token> = shell.Data.slice(tailStart);
const built = MemberShellCatalog.BuildMember(entry.Family, host, data, entry.BasePos, context);
if (built === null) {
  MemberShellCatalog.Unwrap(host, entry);
  return shell;
}
const at = host.Data.indexOf(shell);
if (at < 0) {
  MemberShellCatalog.Drop(shell);
  shell.Parent = host;
  return shell;
}
MemberShellCatalog.Drop(shell);
host.Data.splice(at, 1);
built.Parent = host;
host.Data.splice(at, 0, built);
for (let index = 0; index < tail.length; index++) {
  tail[index].Parent = host;
  host.Data.splice(at + 1 + index, 0, tail[index]);
}
if (host.MountedUnit === shell) {
  host.MountedUnit = null;
}
// [B2c] Parent 指回宿主（不是 null）：窗口里剩下的字符由宿主继续处理，孤儿壳不许再吞。
shell.Parent = host;
if (entry.Family === MemberShellFamily.Class) {
  if (entry.Cache !== null) {
    ClassMemberPossibleUtil.UpdateItemStartAfterBuild(entry.Cache, host, at);
  }
} else if (entry.Family === MemberShellFamily.Interface) {
  if (entry.Cache !== null) {
    MemberPossibleUtil.UpdateItemStartAfterBuild(entry.Cache, host, at);
  }
}
MemberShellCatalog.FinalizedCount += 1;
return built;
```

## static method OpenNextHead:(host:Token, unit:Token, family:int, cache:PossibleShapeCache | null, context:SyntaxContext)=>void

**[B2c] 边界收口后立刻把下一成员的壳建出来。**

没有分隔符的相邻成员（`f(x: number): void` ⏎ `f/* c */(x: string): void`）里，下一成员的
第一格是被**上一条外壳吞进来**的：它的闭合格已经过去，之后不会再触发目录。等到重放 `(` 时，
宿主括号的 `MountedUnit` 必须在**新外壳**上，否则 `(` 会被宿主直接收成兄弟（外壳漏进 AST，
`End = 0`）。所以这里用同一个 `Create` 先建壳、并把条目起点推过去。

**边界之后已经扫过的那段尾巴整体交给新外壳**（`Create(host, at, host.Data.length - 1)`）：
`FinalizeShell` 是在**触发收口的那一格已经进壳之后**才跑的，所以边界尾巴可能不止一格。
`static` ⏎ `readonly` ⏎ `a = 1`（TS：字段 `static readonly` + 字段 `a = 1`）里，`a` 那一格是
早建壳的终点、`=` 在收口时已经进壳，只抢边界那一格会把 `=` 留在宿主上 → 正品少了初始化器
（实测 legacy 侧抛「类成员之间缺少分隔符」）。边界尾巴全是下一成员已经扫过的头部单元，
一起搬进来才与「新外壳从边界开始吃字符」一致。

判不出（`Plan === null`）或 class 侧的构造签名 ⇒ 什么都不做，交旧路径。

```ts
if (!MemberShellCatalog.Enable) {
  return;
}
if (unit.IsTriviaToken) {
  return;
}
const at = host.Data.indexOf(unit);
if (at < 0) {
  return;
}
if (cache === null) {
  return;
}
if (unit instanceof Common && MemberHeadScan.IsModifierWord((unit as Common).TempToString())) {
  // 换行后的修饰词（`public static` ⏎ `readonly a = 1`）属于**上一条**成员的修饰词链，
  // 不是下一成员的头：这一格建壳会把同一条成员劈成两条。
  return;
}
const plan = MemberHeadScan.Plan(unit, family === MemberShellFamily.Interface);
if (plan === null) {
  return;
}
if (family === MemberShellFamily.Class && plan.Kind === MemberHeadKind.Construct) {
  return;
}
const shell = MemberShellCatalog.Create(host, at, host.Data.length - 1, family, cache, context);
if (shell === host) {
  return;
}
if (family === MemberShellFamily.Class) {
  if (cache !== null) {
    ClassMemberPossibleUtil.UpdateItemStartAfterBuild(cache, host, at);
  }
} else if (family === MemberShellFamily.Interface) {
  if (cache !== null) {
    MemberPossibleUtil.UpdateItemStartAfterBuild(cache, host, at);
  }
}
```

## static method FinalizeShell:(shell:Token, context:SyntaxContext)=>Token

外壳自己的终结候选调到这里：`host` 是外壳（`CatalogGuide` 的宿主），父单元才是成员块的括号。

三种收口位置：

1. 最后一个非 trivia 单元是 `;`（`Mode=0`）⇒ 连分号一起建（TS 的 `node.end` 含 `;`）；
2. 最后一个非 trivia 单元是 `,`（`Mode=1`）⇒ 逗号不进区间，留给父括号；
3. 找到成员边界 `boundary` ⇒ 建 `[0, boundary-1]`，边界之后的单元还给父括号。

```ts
const host = shell.Parent;
if (host === null) {
  MemberShellCatalog.Drop(shell);
  return shell;
}
const entry = MemberShellCatalog.Find(shell);
if (entry === null) {
  return shell;
}
// 判据只看**原样单元**（`RawData` 不动外壳）：这是「没到边界就什么都不做」的那条路，
// 头部已成形的那几格必须原样留在外壳里，不能被这次判定还原掉。
const raw:Array<Token> = MemberShellCatalog.RawData(entry);
const codeAt:Array<number> = [];
for (let at = 0; at < raw.length; at++) {
  if (!raw[at].IsTriviaToken) {
    codeAt.push(at);
  }
}
if (codeAt.length === 0) {
  MemberShellCatalog.Unwrap(host, entry);
  return shell;
}
const lastCode = codeAt[codeAt.length - 1];
const lastUnit = raw[lastCode];
// [B2c] 方法体 / 静态块体收口：体括号是最后一个代码单元时整条成员到此结束（尾随 `;` 留给父括号）。
if (entry.BodyBracket !== null) {
  let bodyAt = -1;
  for (let at = raw.length - 1; at >= 0; at--) {
    if (raw[at] === entry.BodyBracket) {
      bodyAt = at;
      break;
    }
  }
  if (bodyAt >= 0) {
    return MemberShellCatalog.Finalize(host, entry, bodyAt, bodyAt + 1, context);
  }
}
if (entry.Family === MemberShellFamily.Enum) {
  if (lastUnit instanceof Symbol && (lastUnit as Symbol).Is(",")) {
    if (codeAt.length < 2) {
      MemberShellCatalog.Unwrap(host, entry);
      return shell;
    }
    return MemberShellCatalog.Finalize(host, entry, codeAt[codeAt.length - 2], lastCode, context);
  }
} else if (lastUnit instanceof Symbol && (lastUnit as Symbol).Is(";")) {
  return MemberShellCatalog.Finalize(host, entry, lastCode, raw.length, context);
}
const code:Array<Token> = [];
for (const index of codeAt) {
  code.push(raw[index]);
}
const boundary = MemberBoundary.FindMemberBoundary(code, 0);
if (boundary > 0 && boundary < code.length) {
  const boundaryUnit = code[boundary];
  const built = MemberShellCatalog.Finalize(host, entry, codeAt[boundary - 1], codeAt[boundary], context);
  if (built !== shell && !MemberShellCatalog.IsOpen(shell)) {
    // [B2c] 下一成员的第一格被上一条外壳吞过：在这一格就把它的壳建出来（见 `OpenNextHead`）。
    // 只有**收口成功**才建：`Unwrap` 之后宿主 `Data` 是 raw 尾巴，再混一个壳会让
    // `CollectBodyMembers` 的尾段解析踩到形状单元。
    MemberShellCatalog.OpenNextHead(host, boundaryUnit, entry.Family, entry.Cache, context);
  }
  return built;
}
return shell;
```

## static method HandOffOnBodyClose:(shell:Token, value:string, context:SyntaxContext)=>bool

**成员块 `}` 的交接点**：外壳是成员块括号的挂载单元（`MountedUnit`），所以 `}` **不会**落到括号自己的
`ExitOrPre` 上（`UnitToken.Process` 有挂载单元就把整个字符交给它）。外壳必须在自己的 `ExitOrPre` 里
先收口、把 `MountedUnit` 还给括号，再返回 `Reload` —— 同一个 `}` 会由驱动层从根重放一次，这次落到括号
自己的 `ExitOrPre`，正常闭合。

`true` = 已交接（调用方必须返回 `BranchStates.Reload`，当前字符没被消费）。

```ts
const parent = shell.Parent;
if (parent === null || !(parent instanceof Bracket)) {
  return false;
}
if (value !== (parent as Bracket).EndBracketChar) {
  return false;
}
const entry = MemberShellCatalog.Find(shell);
if (entry === null) {
  return false;
}
MemberShellCatalog.Restore(entry);
const host = parent;
const codeAt:Array<number> = [];
for (let at = 0; at < shell.Data.length; at++) {
  if (!shell.Data[at].IsTriviaToken) {
    codeAt.push(at);
  }
}
if (codeAt.length === 0) {
  MemberShellCatalog.Unwrap(host, entry);
} else if (entry.Family === MemberShellFamily.Enum
  && shell.Data[codeAt[codeAt.length - 1]] instanceof Symbol
  && (shell.Data[codeAt[codeAt.length - 1]] as Symbol).Is(",")) {
  if (codeAt.length < 2) {
    MemberShellCatalog.Unwrap(host, entry);
  } else {
    MemberShellCatalog.Finalize(host, entry, codeAt[codeAt.length - 2], codeAt[codeAt.length - 1], context);
  }
} else {
  MemberShellCatalog.Finalize(host, entry, codeAt[codeAt.length - 1], shell.Data.length, context);
}
if (host.MountedUnit === shell) {
  host.MountedUnit = null;
}
return true;
```

## static method FinalizeAll:(host:Token, body:Bracket, context:SyntaxContext)=>void

**声明体收口前的一次总收口**：没有分隔符的最后一个成员（`class A { x: number }`）只能在这里收。

只处理 `body.Data` 的**直接子单元**里登记过的外壳，顺序按 `Data` 顺序（= 源码顺序）。

```ts
MemberShellCatalog.Prune();
for (let at = 0; at < body.Data.length; at++) {
  const unit = body.Data[at];
  if (MemberShellCatalog.Find(unit) === null) {
    continue;
  }
  MemberShellCatalog.FinalizeShell(unit, context);
}
```

## static method OpenCount:()=>int

```ts
return MemberShellCatalog.Open.length;
```
