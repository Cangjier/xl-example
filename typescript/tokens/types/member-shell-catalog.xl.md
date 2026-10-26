# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BracketCatalogInstaller } from "../statements/bracket-catalog-installer.xl.md"
import { BracketRoleCatalog } from "../statements/bracket-role-resolver.xl.md"
import { BracketRoleResult } from "../statements/bracket-role-resolver.xl.md"
import { BracketRoleState } from "../statements/bracket-role-resolver.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { ClassMemberPossibleUtil } from "./class-member-possible-util.xl.md"
import { EnumDeclarationShape } from "../declarations/enum-declaration-shape.xl.md"
import { EnumMemberShape } from "../members/enum-member-shape.xl.md"
import { InterfaceDeclarationShape } from "../declarations/interface-declaration-shape.xl.md"
import { MemberBoundary } from "./member-boundary.xl.md"
import { MemberPossibleUtil } from "./property-signature-possible-shape.xl.md"
import { PropertyDeclarationShape } from "./property-declaration-shape.xl.md"
import { PropertySignatureShape } from "./property-signature-shape.xl.md"
import { WaitingEndPossible } from "../statements/waiting-end-possible.xl.md"
```

# namespace cangjie

# class MemberShellFamily

成员外壳族（B2）。与 `StatementRoute` 同款：纯 `int` 常量，**不新增枚举**。

## static field Class:int = 0

class 属性成员（`PropertyDeclarationShape`）。方法 / 构造器 / 访问器 / 索引签名**暂不参与**：
它们的头部在名字那一格无法与属性区分（`m()` 的 `(` 还没出现），交回旧路径。

## static field Interface:int = 1

interface 属性签名（`PropertySignatureShape`）。`name :` 已经唯一确定签名种类，所以比 class 更早。

## static field Enum:int = 2

enum 成员（`EnumMemberShape`）。成员名之后只可能是 `=` 初始化器或分隔符。

# class MemberShellEntry

一条「成员外壳」登记：外壳 + 族 + 起始 `Pos` + 宿主括号向导的缓存（收口时推进 `ItemStart` 用）。

## field Shell:Token | null = null

## field Family:int = 0

## field BasePos:int = 0

## field Cache:PossibleShapeCache | null = null

# class MemberShellEndPossible extends PossibleShape

**成员外壳的终结候选**：外壳自己攒下的单元走到「成员边界」时收口，把外壳换成正品。

三种收口证据（与旧 `ClassMemberPossibleUtil` / `MemberBoundary` 同一套判据，不另写一套）：

1. `;`：class / interface 的属性成员到此结束（TS 的 `node.end` **包含**这个分号）；
2. `,`：enum 成员的结束（TS 的 `EnumMember.end` **不包含**这个逗号，所以它要还给父括号）；
3. 成员边界：换行 + 上一格能结束类型 + 下一格像成员开头（`MemberBoundary.FindMemberBoundary`），
   边界之后的单元属于**下一个成员**，收口时原样还给父括号。

`Mode`：`0` = class / interface（`;` 收口且进区间），`1` = enum（`,` 收口且不进区间）。

## field Mode:int = 0

## constructor:(mode:int)=>void

```ts
super();
this.Mode = mode;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
const code:Array<Token> = [];
for (const unit of units) {
  if (!unit.IsTriviaToken) {
    code.push(unit);
  }
}
if (code.length === 0) {
  return ShapeStates.Uncertain;
}
const last = code[code.length - 1];
if (this.Mode === 0) {
  if (last instanceof Symbol && (last as Symbol).Is(";")) {
    return ShapeStates.Accept;
  }
} else {
  if (last instanceof Symbol && (last as Symbol).Is(",")) {
    return ShapeStates.Accept;
  }
}
const boundary = MemberBoundary.FindMemberBoundary(code, 0);
if (boundary >= 0 && boundary < code.length) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return true;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
return MemberShellCatalog.FinalizeShell(host, context);
```

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

## static method Create:(host:Token, start:int, end:int, family:int, cache:PossibleShapeCache, context:SyntaxContext)=>Token

**早建外壳**：把 `host.Data[start..end]` 搬进一个同族的空外壳，外壳成为宿主括号的挂载单元。

`start` / `end` 是**宿主 `Data` 的下标**（含 trivia 的原始位置）：搬进去的是原样单元
（`BuildMembers` 需要 trivia 来判断换行 / ASI，所以一个都不许丢）。

```ts
if (!MemberShellCatalog.Enable) {
  return host;
}
if (start < 0 || end < start || end >= host.Data.length) {
  return host;
}
MemberShellCatalog.Prune();
let shell:ShapeToken;
if (family === MemberShellFamily.Class) {
  shell = new PropertyDeclarationShape(host.Template);
} else if (family === MemberShellFamily.Interface) {
  shell = new PropertySignatureShape(host.Template);
} else {
  shell = new EnumMemberShape(host.Template);
}
const consumed:Array<Token> = host.Data.slice(start, end + 1);
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
const mode = family === MemberShellFamily.Enum ? 1 : 0;
shell.CatalogGuide = new CatalogGuide([], new MemberShellEndPossible(mode));
const entry = new MemberShellEntry();
entry.Shell = shell;
entry.Family = family;
entry.BasePos = basePos;
entry.Cache = cache;
MemberShellCatalog.Open.push(entry);
MemberShellCatalog.CreatedCount += 1;
return shell;
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
const at = host.Data.indexOf(shell);
if (at < 0) {
  shell.Parent = null;
  return;
}
const units:Array<Token> = shell.Data.slice(0);
host.Data.splice(at, 1);
for (let index = 0; index < units.length; index++) {
  units[index].Parent = host;
  host.Data.splice(at + index, 0, units[index]);
}
shell.Parent = null;
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
  shell.Parent = null;
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
shell.Parent = null;
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
const codeAt:Array<number> = [];
for (let at = 0; at < shell.Data.length; at++) {
  if (!shell.Data[at].IsTriviaToken) {
    codeAt.push(at);
  }
}
if (codeAt.length === 0) {
  MemberShellCatalog.Unwrap(host, entry);
  return shell;
}
const lastCode = codeAt[codeAt.length - 1];
const lastUnit = shell.Data[lastCode];
if (entry.Family === MemberShellFamily.Enum) {
  if (lastUnit instanceof Symbol && (lastUnit as Symbol).Is(",")) {
    if (codeAt.length < 2) {
      MemberShellCatalog.Unwrap(host, entry);
      return shell;
    }
    return MemberShellCatalog.Finalize(host, entry, codeAt[codeAt.length - 2], lastCode, context);
  }
} else if (lastUnit instanceof Symbol && (lastUnit as Symbol).Is(";")) {
  return MemberShellCatalog.Finalize(host, entry, lastCode, shell.Data.length, context);
}
const code:Array<Token> = [];
for (const index of codeAt) {
  code.push(shell.Data[index]);
}
const boundary = MemberBoundary.FindMemberBoundary(code, 0);
if (boundary > 0 && boundary < code.length) {
  return MemberShellCatalog.Finalize(host, entry, codeAt[boundary - 1], codeAt[boundary], context);
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
