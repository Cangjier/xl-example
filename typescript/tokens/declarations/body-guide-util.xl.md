# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { AngleJudge } from "../types/angle-judge.xl.md"
```

# namespace cangjie

带 body 的声明（interface / enum / class / module …）「壳化」时共用的通用管线。

它只做四件与具体声明族无关的事：**认 body 括号**、**把壳挂到宿主上**、**收口时取成员**、**收口时用完整形状顶替壳**；外加两份薄工具（`Pos` 口径、目录缓存）。

本文件**不 import 任何具体声明形状**：壳、成员候选、raw 兜底的 `BuildMembers` 都由调用方以参数传入，这样 interface / enum / class 各自 import 本文件时不会形成 require 环。

# type BodyShapesFactory = ()=>Array<PossibleShape>

按需建一份成员候选目录的工厂；只在缓存为空时调用一次（参数表里不直接写函数类型，与 `Document.CountGetter` 同款）。

# type BodyMembersFallback = (host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>

某一声明族的 raw 兜底：把一段**还未增量建出**的括号内容逐成员建出来。语义必须是「该族一次性构建路径用的同一个 `BuildMembers`」——这样增量建出的成员与 raw 兜底建出的成员两条路径的 AST 逐节点一致。

# class BodyGuideUtil

`OnBracketCreatedEvent` 推广（设计文档 `docs/body-shape-generalization-design.md` §2 的「壳化七件套」）的共享工具。

```txt
// 一个族的完整接线（以 interface 为例，行号见设计文档 §9）：
// 1) 壳 OnBracketCreatedEvent：BodyGuideUtil.IsBodyBracket(壳, 新括号, ["extends", "implements", ","])
//    为真 ⇒ BodyGuideUtil.MountBodyGuide(接口体括号, CreateBodyPossibleShapes())
//    同时壳自己装终结候选 new CatalogGuide([], new XxxEndPossibleShape())
// 2) 声明关键字格提前 Accept，BuildByIndex 里：
//    const shell = new XxxShape(host.Template);
//    BodyGuideUtil.MountShell(host, state.Start, tokenIndex, shell, context);
// 3) 终结候选 BuildByIndex 里：
//    const shell = host as XxxShape;
//    const built = XxxShape.BuildFromCode(shell, code, shell.Pos, context);
//    BodyGuideUtil.FinishShell(shell.Parent, shell, built);
// 4) 收口取成员：XxxShape.BuildFromCode 里
//    const members = BodyGuideUtil.CollectBodyMembers(host, bodyBracket, context, XxxShape.BuildMembers);
// 5) 目录缓存：static CreateBodyPossibleShapes()
//    XxxShape.CreateBodyPossibleShapesCache = BodyGuideUtil.CreateShapesCache(
//      XxxShape.CreateBodyPossibleShapesCache, () => [ ...本族成员候选... ]);
```

## static method BasePos:(host:Token, start:int)=>int

条目 / 壳的 `Pos` 口径：`start` 之前最近一个非 trivia 单元的 `EndIndex`；前面没有非 trivia 单元时返回 `0`。

与 `InterfaceDeclarationRule.BuildByIndex` 的 `Pos` 循环、`InterfaceDeclarationShape.FromUnits` 的 `pos` 循环、`MemberPossibleUtil.BasePos` 同一口径（只差「前面什么都没有」时是否回退到宿主起点，这里按壳的口径返回 `0`）。

```ts
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const previousEnd = host.Data[at].SourceRange.EndIndex;
    if (previousEnd >= 0) {
      return previousEnd;
    }
    break;
  }
}
return 0;
```

## static method IsBodyBracket:(shell:Token, bracket:Bracket, blocked:Array<string>)=>bool

在壳的 `Data` 里判定「这个刚创建的新括号**肯定是我的 body**」。由 `InterfaceDeclarationShape.IsDefinitelyBodyBracket` 泛化而来，判据逐字不变：

- 不是 `{`：不是 body（类型参数 / heritage / 参数表里的 `(` `[`）；
- 尖括号深度不为 `0`：是类型实参里的类型字面量，不是 body（`>>` / `>>>` 按 2 / 3 层拆，见 `AngleJudge.ScanDepth`）；
- 前一个代码单元的文本 ∈ `blocked`：`{` 处在「后面还能接类型」的位置，是 heritage 里的类型字面量，不是 body。

`blocked` 就是设计文档 §2 第 2 条说的「每族的 blocked 单词表」：interface / class 是 `["extends", "implements", ","]`，enum / module 可以为空（但**不能省判据**，只给空表）。

「壳自己是否已经认定过 body」的判断留在调用方（`this.BodyBracket !== null` 就忽略事件）——本方法不读壳的字段，只读壳的 `Data` 与传入的括号。

```ts
if (bracket.StartBracketChar !== "{") {
  return false;
}
let depth = 0;
let previous:Token | null = null;
for (const unit of shell.Data) {
  if (unit === bracket) {
    continue;
  }
  if (unit.IsTriviaToken) {
    continue;
  }
  depth = AngleJudge.ScanDepth(unit, depth);
  previous = unit;
}
if (depth !== 0 || previous === null) {
  return false;
}
let text = "";
if (previous instanceof Common) {
  text = (previous as Common).TempToString();
} else if (previous instanceof Symbol) {
  text = (previous as Symbol).TempToString();
}
for (const word of blocked) {
  if (text === word) {
    return false;
  }
}
return true;
```

## static method MountBodyGuide:(bracket:Bracket, shapes:Array<PossibleShape>)=>CatalogGuide

给 body 括号挂上**成员候选目录**：`bracket.CatalogGuide = new CatalogGuide(shapes)`，返回该向导（便于测试断言）。

目录只建一份、所有 body 括号共用（`shapes` 由各族的 `CreateBodyPossibleShapes` 静态缓存提供）；判定状态在 `CatalogGuide` 自己的 `PossibleShapesComputeCache` 里，**不能跨 body 共享**。

注意：本方法只挂「普通候选」目录，**不要**把壳的终结候选挂到这里——壳的终结候选是 `new CatalogGuide([], new XxxEndPossibleShape())`，装到**壳自己**的 `CatalogGuide` 上（见 `FinishShell` 的调用方）。

```ts
const guide = new CatalogGuide(shapes);
bracket.CatalogGuide = guide;
return guide;
```

## static method MountShell:(host:Token, start:int, tokenIndex:int, shell:Token, context:SyntaxContext)=>Token

把 `host.Data[start .. tokenIndex]` 已经攒下的单元原样搬进 `shell`、按 `BasePos` 定壳的 `Pos`、在宿主 `Data` 里原地顶替成壳，并让宿主把后续字符交给壳（`host.MountedUnit = shell`）。

由 `InterfaceDeclarationRule.BuildByIndex` 泛化而来，**顺序逐字一致**：先 `Add` 全部单元并 `SignIn` 首单元，再算 `Pos`（此时宿主 `Data` 尚未 splice），最后 splice / 认父 / 挂载。

`shell` 必须是**刚建出的空壳**（`new XxxShape(host.Template)`，`SourceRange.Start` 与 `Pos` 都还没定）；`Pos` 字段在 `ShapeToken` 上，所以内部按 `ShapeToken` 访问。`start` 越界（`< 0` 或 `> tokenIndex`）时不动宿主、原样返回壳，调用方应当在此之前返回宿主。

```ts
if (start < 0 || start > tokenIndex) {
  return shell;
}
const consumed:Array<Token> = host.Data.slice(start, tokenIndex + 1);
for (const unit of consumed) {
  shell.Add(unit);
}
const begin = consumed[0].SourceRange.StartIndex;
if (begin >= 0) {
  shell.SignIn(begin);
}
const shape = shell as ShapeToken;
shape.Pos = BodyGuideUtil.BasePos(host, start);
host.Data.splice(start, consumed.length, shell);
shell.Parent = host;
host.MountedUnit = shell;
return shell;
```

## static method CollectBodyMembers:(host:Token, bracket:Bracket, context:SyntaxContext, rawFallback:BodyMembersFallback)=>Array<Token>

收口时取 body 成员。由 `InterfaceDeclarationShape.CollectBodyMembers` **原样泛化**，只是把两处 `InterfaceDeclarationShape.BuildMembers` 换成参数 `rawFallback`；两条路径必须产出同一棵 AST：

- 括号 `Data` 里**没有已建好的成员形状**（导出 / 模块体 / 语句位置的一次性构建，或整段都没增量建出）：整段还是 raw basic token，原样交给 `rawFallback`，与重构前逐字一致；
- 已经由 body 的 `CatalogGuide` 增量建出成员形状：按序收集非 basic 单元（成员形状），跳过 trivia 与残留的 `;` / `,`；若后面还留着一截没有增量建出的 raw 代码（最后一条成员在容器收口时才确定、`BuildByIndex` 判不完整回落、或本族还没有对应候选），把**这一截 raw** 包成一个临时括号视图交给 `rawFallback` 逐成员建，再拼接到已建成员之后。

临时括号视图：`Data` 只含 raw 尾巴，`SourceRange.Start` 对齐到尾巴前一个非 trivia 单元的 `End`，所以 `rawFallback` 里 `bracket.SourceRange.StartIndex + 1` 得到的 base 与 interface 收口里手写循环算出的 `base` 完全相同；它不参与字符流、不签出、不关闭，只当一次调用参数。

`rawFallback` 的语义必须是「该族一次性构建用的 `BuildMembers`」：`BuildMembers(host, bracket, context)` 逐成员建 `bracket.Data`。这样增量路径与 raw 路径都由同一个建造器产出成员，区间 / `Pos` 口径不变。

```ts
let hasBuiltMember = false;
let hasRawCode = false;
for (const unit of bracket.Data) {
  if (unit.IsTriviaToken) {
    continue;
  }
  if (!unit.IsBasicToken) {
    hasBuiltMember = true;
    continue;
  }
  if (unit instanceof Symbol && ((unit as Symbol).Is(";") || (unit as Symbol).Is(","))) {
    continue;
  }
  hasRawCode = true;
}
if (!hasBuiltMember) {
  return rawFallback(host, bracket, context);
}
const members:Array<Token> = [];
let at = 0;
while (at < bracket.Data.length) {
  const unit = bracket.Data[at];
  if (unit.IsTriviaToken) {
    at++;
    continue;
  }
  if (unit.IsBasicToken) {
    if (unit instanceof Symbol && ((unit as Symbol).Is(";") || (unit as Symbol).Is(","))) {
      at++;
      continue;
    }
    break;
  }
  members.push(unit);
  at++;
}
if (at >= bracket.Data.length) {
  return members;
}
const tail = new Bracket(host.Template);
tail.Data = bracket.Data.slice(at);
let baseSource = bracket.SourceRange.Start;
let fromPrevious = false;
for (let previous = at - 1; previous >= 0; previous--) {
  if (!bracket.Data[previous].IsTriviaToken) {
    baseSource = bracket.Data[previous].SourceRange.End;
    fromPrevious = true;
    break;
  }
}
// 临时视图的 `Start` 要满足 `Start + 1` = 尾巴前一个非 trivia 单元的 `EndIndex`（= 首成员的 Pos），
// 所以「有前一个单元」时要比它再退一格；没有前一个单元时 `Start` 就是宿主括号的 `{`，直接用。
if (baseSource !== null) {
  tail.SignIn(fromPrevious ? baseSource - 1 : baseSource);
}
const tailMembers = rawFallback(host, tail, context);
for (const member of tailMembers) {
  members.push(member);
}
return members;
```

## static method FinishShell:(host:Token, shell:Token, built:Token)=>void

把壳收口成完整形状：在 `host.Data` 里用 `built` 原地顶替 `shell`、`built.Parent = host`，并在 `host.MountedUnit === shell` 时清空挂载。

由 `InterfaceDeclarationEndPossibleShape.BuildByIndex` 泛化而来。`host` 是**壳所在的父单元**（调用方传 `shell.Parent`）；为容错，若调用方传进来的就是壳本身（`host === shell`），内部改取 `shell.Parent`。父单元为空（壳没挂上）时什么都不做。

收口**必须用 splice 顶替**而不是 `Token.Replace`，所以 `MountedUnit` 要手动清：否则后续字符会被送进已经被顶替掉的旧壳。壳的 `Pos` 在建壳时已算好，`built.Pos` 由 `BuildFromCode` 沿用 `shell.Pos`，这里不重算。

```ts
let parent:Token | null = host;
if (parent === shell) {
  parent = shell.Parent;
}
if (parent === null) {
  return;
}
const at = parent.Data.indexOf(shell);
if (at >= 0) {
  parent.Data.splice(at, 1, built);
}
built.Parent = parent;
if (parent.MountedUnit === shell) {
  parent.MountedUnit = null;
}
```

## static method CreateShapesCache:(cacheRef:Array<PossibleShape> | null, factory:BodyShapesFactory)=>Array<PossibleShape>

各族的「成员目录只建一份」缓存。`cacheRef` 为空就调一次 `factory()`；非空直接返回。调用方把静态字段原样传进来并接回返回值——`XxxShape.CreateBodyPossibleShapesCache` 是 private static 字段时，在类的 `static CreateBodyPossibleShapes()` 里：

```ts
// XxxShape.CreateBodyPossibleShapesCache = BodyGuideUtil.CreateShapesCache(
//   XxxShape.CreateBodyPossibleShapesCache,
//   () => [ new MemberPossibleShape(), ... ]);
// return XxxShape.CreateBodyPossibleShapesCache;
//
// 目录只建一份、所有 body 括号共用；候选实例本身无状态（判定状态在 CatalogGuide 的缓存里），共用安全。
if (cacheRef !== null) {
  return cacheRef;
}
return factory();
```
