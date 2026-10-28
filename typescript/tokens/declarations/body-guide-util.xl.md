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

# type BodyShapesFactory = ()=>Array<PossibleShape>

# type BodyMembersFallback = (host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>

# class BodyGuideUtil

```txt
// 一个族的完整接线（以 interface 为例，行号见设计文档 §9）：
// 1) 体括号的创建格：BodyGuideUtil.MountBodyGuide(接口体括号, CreateBodyPossibleShapes())
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

```ts
const guide = new CatalogGuide(shapes);
bracket.CatalogGuide = guide;
return guide;
```

## static method MountShell:(host:Token, start:int, tokenIndex:int, shell:Token, context:SyntaxContext)=>Token

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
  // [W2:UNMOUNT] 壳被 `built` 换掉 ⇒ 壳已死。死壳上如果还挂着 `MountedUnit`（函数体 / 类体 /
  // 模块体的 `BlockShape` / `ModuleBlockShape`），那只子单元此刻正跑在自己的逐字符循环里，
  // 每格只问一句「我还是不是我父单元的 `MountedUnit`」（`UnitToken.Process`）——死壳还指着它，
  // 它就继续吃下一行的字符；而它已经 `Closed`，`ExitOrPre` 返回 `Nothing`、`Default` 是空实现，
  // 于是那些字符**被吞掉且不产生任何单元**。
  //
  // 实测（`function f() { }` ⏎ `const w = 1;`）：块体的 `Process` 从 `}` 之后的第 16 字符一路吃到
  // 第 22 字符，`const` 五个字符消失，根层 `Data` 里只剩 `w = 1;`；`VariableStatementPossibleShape`
  // 在那一格看到的 `units[2]` 是 `w` 而不是 `const`，只能 `Uncertain`，
  // `RootExpressionStatementPossibleShape` 随即建壳 ⇒ 变量语句壳「让位」给表达式语句壳。
  // **首因在这只悬空指针，不在壳族选择**。
  //
  // 只在 `at >= 0`（壳确实被换掉）时清：`at < 0` 说明壳不是这里的直接子单元、它可能还活着。
  shell.MountedUnit = null;
}
built.Parent = parent;
if (parent.MountedUnit === shell) {
  parent.MountedUnit = null;
}
```

## static method CreateShapesCache:(cacheRef:Array<PossibleShape> | null, factory:BodyShapesFactory)=>Array<PossibleShape>

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
