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
```

# namespace cangjie

# class MemberShellFamily

## static field Class:int = 0

## static field Interface:int = 1

## static field Enum:int = 2

# class MemberShellEntry

## field Shell:Token | null = null

## field Family:int = 0

## field BasePos:int = 0

## field Cache:PossibleShapeCache | null = null

## field Modifiers:int = 0

## field Kind:int = -1

## field BodyBracket:Token | null = null

## field BodyBlock:BlockShape | null = null

## field Parts:Array<MemberShellHeadPart> = []

# class MemberShellHeadPart

## field Shape:Token | null = null

## field Raw:Array<Token> = []

# class MemberShellCatalog

## static field Open:Array<MemberShellEntry> = []

## static field Enable:bool = true

## static field CreatedCount:int = 0

## static field FinalizedCount:int = 0

## static field UnwrappedCount:int = 0

## static field PrunedCount:int = 0

## static method IsEnabled:()=>bool

```ts
return MemberShellCatalog.Enable;
```

## static method Reset:()=>void

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

## static method NewShell:(family:int, kind:int, template:Template)=>ShapeToken

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

```ts
shape.SignInToken(unit);
shape.SignOutToken(unit);
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```

## static method BuildHeadShape:(entry:MemberShellEntry, kind:int, at:int, context:SyntaxContext)=>Token | null

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

```ts
return kind === MemberHeadKind.Method || kind === MemberHeadKind.Constructor
  || kind === MemberHeadKind.Get || kind === MemberHeadKind.Set
  || kind === MemberHeadKind.Construct;
```

## static method HasBodyKind:(kind:int)=>bool

```ts
return kind === MemberHeadKind.Method || kind === MemberHeadKind.Constructor
  || kind === MemberHeadKind.Get || kind === MemberHeadKind.Set
  || kind === MemberHeadKind.StaticBlock;
```

## static method HeadCompute:(shell:Token, context:SyntaxContext)=>ComputePossibleShapesStates

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
