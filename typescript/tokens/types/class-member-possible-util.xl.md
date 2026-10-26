# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { AngleJudge } from "./angle-judge.xl.md"
import { MemberBoundary, MemberBoundaryScan, MemberHeadKind, MemberHeadScan } from "./member-boundary.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
```

# namespace cangjie

# class ClassMemberPossibleScan

## field Start:int = -1

## field Checked:int = -1

## field Complete:bool = false

## field End:int = -1

## field Kinds:Array<int> = []

## field CodeAt:Array<int> = []

## field Code:Array<Token> = []

## field Angle:int = 0

## field BoundaryScan:MemberBoundaryScan = new MemberBoundaryScan()

## field BoundaryAnchor:int = -1

## field Early:bool = false

[B2] 本格是「成员头已定」的**早建**判定（见 `EarlyHeadKind`）：`Complete` 早于成员边界成立，
`*PossibleShape.BuildByIndex` 据此建**成员外壳**而不是直接建正品。

## field EarlyKind:int = -1

[B2c] 早建时的**中性种类**（`MemberHeadKind`）：属性 / 方法 / 构造器 / 访问器 / 索引 / 静态块。
`-1` = 不是早建格。各候选的 `BuildByIndex` 只在自己那一格建壳。

# class ClassMemberItemStartShared

## field Host:Array<Token> = []

## field Start:int = 0

## field Valid:bool = false

# class ClassMemberPossibleUtil

## static field CacheKey:any = PossibleShape.SlotOf(ClassMemberPossibleScan)

## static field ItemStartKey:any = PossibleShape.SlotOf(ClassMemberItemStartShared)

## static field PropertyKind:int = 1

## static field MethodKind:int = 2

## static field ConstructorKind:int = 3

## static field GetKind:int = 4

## static field SetKind:int = 5

## static field StaticBlockKind:int = 6

## static field SemicolonKind:int = 7

## static field IndexKind:int = 8

## static method AllKinds:()=>Array<int>

```ts
return [
  ClassMemberPossibleUtil.PropertyKind,
  ClassMemberPossibleUtil.MethodKind,
  ClassMemberPossibleUtil.ConstructorKind,
  ClassMemberPossibleUtil.GetKind,
  ClassMemberPossibleUtil.SetKind,
  ClassMemberPossibleUtil.StaticBlockKind,
  ClassMemberPossibleUtil.SemicolonKind,
  ClassMemberPossibleUtil.IndexKind,
];
```

## static method OnlyKind:(kind:int)=>Array<int>

```ts
return [kind];
```

## static method ImplementedKinds:()=>Array<int>

```ts
return [
  ClassMemberPossibleUtil.PropertyKind,
  ClassMemberPossibleUtil.MethodKind,
  ClassMemberPossibleUtil.ConstructorKind,
  ClassMemberPossibleUtil.GetKind,
  ClassMemberPossibleUtil.SetKind,
  ClassMemberPossibleUtil.StaticBlockKind,
  ClassMemberPossibleUtil.SemicolonKind,
  ClassMemberPossibleUtil.IndexKind,
];
```

## static method HasKind:(kinds:Array<int>, kind:int)=>bool

```ts
for (const item of kinds) {
  if (item === kind) {
    return true;
  }
}
return false;
```

## static method TextOf:(unit:Token)=>string

```ts
if (unit instanceof Common) {
  return (unit as Common).TempToString();
}
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
if (unit instanceof String) {
  return "string";
}
if (unit instanceof Bracket) {
  return "bracket";
}
return "";
```

## static method IsSeparator:(unit:Token)=>bool

```ts
if (!(unit instanceof Symbol)) {
  return false;
}
return (unit as Symbol).Is(";");
```

## static method IsCompletionBoundary:(ch:string)=>bool

```ts
return ch === "" || ch === "}" || ch === "]" || ch === ")" || ch === ">";
```

## static method NextChar:(last:SourceRange | null)=>string

```ts
if (last === null) {
  return "";
}
const document = last.Document;
if (document === null || last.EndIndex < 0) {
  return "";
}
const count = document.GetCount();
const whole = SourceRange.Whole(document);
let at = last.EndIndex;
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
  return ch;
}
return "";
```

## static method AngleDepth:(code:Array<Token>)=>int

```ts
let depth = 0;
for (const unit of code) {
  depth = AngleJudge.ScanDepth(unit, depth);
}
return depth;
```

## static method IsIndexSignatureBracket:(bracket:Bracket)=>bool

```ts
const inner:Array<Token> = [];
for (const item of bracket.Data) {
  if (!item.IsTriviaToken) {
    inner.push(item);
  }
}
if (inner.length >= 3 && inner[0] instanceof Common
  && ClassMemberPossibleUtil.TextOf(inner[1]) === ":") {
  return true;
}
return false;
```

## static method IsModifierWord:(unit:Token)=>bool

```ts
const text = ClassMemberPossibleUtil.TextOf(unit);
return text === "readonly" || text === "static" || text === "private" || text === "public"
  || text === "protected" || text === "abstract" || text === "declare" || text === "override"
  || text === "async" || text === "accessor" || text === "get" || text === "set";
```

## static method HasParameterList:(code:Array<Token>, last:int)=>bool

```ts
for (let cursor = 0; cursor <= last && cursor < code.length; cursor++) {
  if (code[cursor] instanceof Bracket && (code[cursor] as Bracket).StartBracketChar === "(") {
    return true;
  }
}
return false;
```

## static method DecoratorHeadAt:(code:Array<Token>)=>int

```ts
let at = 0;
while (at < code.length && ClassMemberPossibleUtil.TextOf(code[at]) === "@") {
  at++;
  if (at >= code.length) {
    return -1;
  }
  if (ClassMemberPossibleUtil.TextOf(code[at]) === "new") {
    at++;
    if (at >= code.length) {
      return -1;
    }
  }
  const first = code[at];
  if (first instanceof Common || first instanceof String) {
    at++;
  } else if (first instanceof Bracket
    && ((first as Bracket).StartBracketChar === "(" || (first as Bracket).StartBracketChar === "[")) {
    at++;
  } else {
    return -1;
  }
  while (at < code.length) {
    const unit = code[at];
    if (unit instanceof Bracket
      && ((unit as Bracket).StartBracketChar === "(" || (unit as Bracket).StartBracketChar === "[")) {
      at++;
      continue;
    }
    const text = ClassMemberPossibleUtil.TextOf(unit);
    if (text === "." || text === "?.") {
      at++;
      if (at >= code.length || !(code[at] instanceof Common || code[at] instanceof String)) {
        return -1;
      }
      at++;
      continue;
    }
    if (text === "!") {
      at++;
      continue;
    }
    if (text === "<") {
      let depth = 0;
      while (at < code.length) {
        const angleText = ClassMemberPossibleUtil.TextOf(code[at]);
        if (angleText === "<") {
          depth++;
        } else if (angleText === ">") {
          depth--;
        } else if (angleText === ">>") {
          depth -= 2;
        } else if (angleText === ">>>") {
          depth -= 3;
        }
        at++;
        if (depth <= 0) {
          break;
        }
      }
      if (depth > 0) {
        return -1;
      }
      continue;
    }
    break;
  }
}
return at;
```

## static method ClassifyHead:(code:Array<Token>)=>Array<int>

```ts
const ALL:Array<number> = ClassMemberPossibleUtil.AllKinds();
if (code.length === 0) {
  return ALL;
}
let at = 0;
if (ClassMemberPossibleUtil.TextOf(code[0]) === "@") {
  at = ClassMemberPossibleUtil.DecoratorHeadAt(code);
  if (at < 0 || at >= code.length) {
    return ALL;
  }
}
if (ClassMemberPossibleUtil.IsSeparator(code[at])) {
  return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.SemicolonKind);
}
let hasStatic = false;
let accessorKind = "";
while (at < code.length) {
  const unit = code[at];
  const text = ClassMemberPossibleUtil.TextOf(unit);
  if (text !== "readonly" && text !== "static" && text !== "private" && text !== "public"
    && text !== "protected" && text !== "abstract" && text !== "declare" && text !== "override"
    && text !== "async" && text !== "accessor" && text !== "get" && text !== "set") {
    break;
  }
  if (at + 1 >= code.length) {
    return ALL;
  }
  const nextUnit = code[at + 1];
  let isModifier = true;
  if (text === "static") {
    isModifier = ClassDeclarationShape.CanFollowModifier(nextUnit);
  } else if (text !== "get" && text !== "set") {
    isModifier = !MemberBoundary.HasLineBreakBetween(unit, nextUnit)
      && ClassDeclarationShape.CanFollowModifier(nextUnit);
  }
  if (!isModifier) {
    break;
  }
  if (text === "static") {
    hasStatic = true;
  }
  if (text === "get" || text === "set") {
    const accessorHasName = nextUnit instanceof Common
      || (nextUnit instanceof Bracket && (nextUnit as Bracket).StartBracketChar === "[")
      || (nextUnit instanceof Symbol && (nextUnit as Symbol).Is("#"));
    if (!accessorHasName) {
      break;
    }
    accessorKind = text;
    at++;
    continue;
  }
  at++;
}
if (at >= code.length) {
  return ALL;
}
const unit = code[at];
const unitText = ClassMemberPossibleUtil.TextOf(unit);
if (unitText === "*") {
  return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.MethodKind);
}
if (hasStatic && unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
  return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.StaticBlockKind);
}
let nameText = "";
let nameIsIdentifier = false;
let nextAt = at;
if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "[") {
  if (ClassMemberPossibleUtil.IsIndexSignatureBracket(unit as Bracket)) {
    return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.IndexKind);
  }
  nextAt = at + 1;
} else if (unit instanceof Symbol && (unit as Symbol).Is("#")) {
  if (at + 1 >= code.length) {
    return ALL;
  }
  nameText = "#" + ClassMemberPossibleUtil.TextOf(code[at + 1]);
  nextAt = at + 2;
} else if (unit instanceof String) {
  nextAt = at + 1;
} else if (unit instanceof Common) {
  nameText = (unit as Common).TempToString();
  nameIsIdentifier = true;
  nextAt = at + 1;
} else {
  return ALL;
}
let accessorKindOf = 0;
if (accessorKind === "get") {
  accessorKindOf = ClassMemberPossibleUtil.GetKind;
} else if (accessorKind === "set") {
  accessorKindOf = ClassMemberPossibleUtil.SetKind;
}
const methodLike = accessorKindOf !== 0
  ? ClassMemberPossibleUtil.OnlyKind(accessorKindOf)
  : ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.MethodKind);
if (nextAt >= code.length) {
  return ALL;
}
const markText = ClassMemberPossibleUtil.TextOf(code[nextAt]);
if (markText === "?" || markText === "?:") {
  const afterMark = nextAt + 1 < code.length ? code[nextAt + 1] : null;
  if (afterMark === null) {
    return ALL;
  }
  if (afterMark instanceof Bracket && (afterMark as Bracket).StartBracketChar === "(") {
    if (markText === "?") {
      return methodLike;
    }
    const afterParams = nextAt + 2 < code.length ? code[nextAt + 2] : null;
    let optionalMethodLike = false;
    if (afterParams !== null) {
      optionalMethodLike = ClassMemberPossibleUtil.TextOf(afterParams) === ":";
    } else {
      optionalMethodLike = ClassMemberPossibleUtil.NextChar((afterMark as Bracket).SourceRange) === ":";
    }
    if (optionalMethodLike) {
      return methodLike;
    }
    return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.PropertyKind);
  }
  if (ClassMemberPossibleUtil.TextOf(afterMark) === "<") {
    return methodLike;
  }
  return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.PropertyKind);
}
const following = code[nextAt];
if (following instanceof Bracket && (following as Bracket).StartBracketChar === "(") {
  if (accessorKindOf !== 0) {
    return ClassMemberPossibleUtil.OnlyKind(accessorKindOf);
  }
  if (nameIsIdentifier && nameText === "constructor") {
    return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.ConstructorKind);
  }
  return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.MethodKind);
}
const followingText = ClassMemberPossibleUtil.TextOf(following);
if (followingText === "<") {
  if (accessorKindOf !== 0) {
    return ClassMemberPossibleUtil.OnlyKind(accessorKindOf);
  }
  if (nameIsIdentifier && nameText === "constructor") {
    return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.ConstructorKind);
  }
  return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.MethodKind);
}
if (followingText === ":" || followingText === "!" || followingText === "="
  || followingText === ";" || followingText === ",") {
  return ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.PropertyKind);
}
return ALL;
```

## static method Extend:(state:ClassMemberPossibleScan, units:Array<Token>, tokenIndex:int)=>void

```ts
let from = state.Checked;
if (from < state.Start) {
  from = state.Start;
}
for (let at = from; at <= tokenIndex; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  state.Code.push(unit);
  state.CodeAt.push(at);
  state.Angle = AngleJudge.ScanDepth(unit, state.Angle);
}
```

## static method ScanBoundary:(state:ClassMemberPossibleScan, from:int)=>void

```ts
const code = state.Code;
if (from < state.BoundaryAnchor) {
  // 锚点后退（理论上不发生）：已判过的位置区间变了，整段重扫。
  state.BoundaryAnchor = from;
  state.BoundaryScan.Boundary = -1;
  state.BoundaryScan.Checked = from + 1;
}
if (from > state.BoundaryAnchor) {
  state.BoundaryAnchor = from;
}
if (state.BoundaryScan.Boundary > from) {
  return;
}
if (state.BoundaryScan.Boundary >= 0) {
  // 边界落在锚点之前/之内（装饰器前缀变长后把它包住了）：作废，继续往后找。
  state.BoundaryScan.Boundary = -1;
}
let at = state.BoundaryScan.Checked;
if (at <= from) {
  at = from + 1;
}
if (at < 1) {
  at = 1;
}
while (at < code.length) {
  if (MemberBoundary.HasLineBreakBetween(code[at - 1], code[at])
    && MemberBoundary.CanEndTypeUnit(code[at - 1])
    && !MemberBoundary.IsInitializerIndexContinuation(code, at)
    && MemberBoundary.LooksLikeMemberStart(code, at)) {
    state.BoundaryScan.Boundary = at;
    return;
  }
  at++;
}
state.BoundaryScan.Checked = code.length > 1 ? code.length - 1 : 1;
```

## static method ItemStartValid:(units:Array<Token>, shared:ClassMemberItemStartShared)=>bool

```ts
if (!shared.Valid) {
  return false;
}
if (shared.Host !== units) {
  return false;
}
if (shared.Start < 0 || shared.Start > units.length) {
  return false;
}
if (shared.Start > 0 && units[shared.Start - 1].IsBasicToken) {
  return false;
}
if (shared.Start < units.length) {
  const atStart = units[shared.Start];
  if (!atStart.IsTriviaToken) {
    return atStart.IsBasicToken;
  }
}
return true;
```

## static method ItemStartOf:(units:Array<Token>, cache:PossibleShapeCache)=>int

```ts
let shared = cache.GetShare<ClassMemberItemStartShared>(ClassMemberPossibleUtil.ItemStartKey);
if (shared !== null && ClassMemberPossibleUtil.ItemStartValid(units, shared)) {
  return shared.Start;
}
const start = ItemUtil.ItemStartCached(units, cache);
if (shared === null) {
  shared = new ClassMemberItemStartShared();
  shared.Host = units;
  shared.Start = start;
  shared.Valid = true;
  cache.SetShare(ClassMemberPossibleUtil.ItemStartKey, shared);
} else {
  shared.Host = units;
  shared.Start = start;
  shared.Valid = true;
}
return start;
```

## static method UpdateItemStartAfterBuild:(cache:PossibleShapeCache, host:Token, start:int)=>void

```ts
const shared = cache.GetShare<ClassMemberItemStartShared>(ClassMemberPossibleUtil.ItemStartKey);
if (shared !== null) {
  shared.Host = host.Data;
  shared.Start = start + 1;
  shared.Valid = true;
}
```

## static method HeadKindOf:(neutral:int)=>int

把 `MemberHeadKind` 的中性种类映射到本扫描自己的 kind 常量；`-1` = 这一类**不早建**（交旧路径）。

```ts
if (neutral === MemberHeadKind.Property) {
  return ClassMemberPossibleUtil.PropertyKind;
}
if (neutral === MemberHeadKind.Method) {
  return ClassMemberPossibleUtil.MethodKind;
}
if (neutral === MemberHeadKind.Constructor) {
  return ClassMemberPossibleUtil.ConstructorKind;
}
if (neutral === MemberHeadKind.Get) {
  return ClassMemberPossibleUtil.GetKind;
}
if (neutral === MemberHeadKind.Set) {
  return ClassMemberPossibleUtil.SetKind;
}
if (neutral === MemberHeadKind.Index) {
  return ClassMemberPossibleUtil.IndexKind;
}
if (neutral === MemberHeadKind.StaticBlock) {
  return ClassMemberPossibleUtil.StaticBlockKind;
}
return -1;
```

## static method EarlyHeadKind:(code:Array<Token>, head:Token)=>int

**成员头已定**的判据（B2b 扩展 / B2c 方法族）：返回 `MemberHeadKind` 的中性种类，`-1` = 不早建。

- **成员第一格**（`code.length === 1`）：`MemberHeadScan.Plan` 的 document 前瞻直接判种类。
  class 侧没有构造签名 ⇒ `Construct` 让回旧路径。
- **名字闭合格**（B2b 原判据）：只接受属性（`;` / `:` / `=` / `?` / `!` / `}` 只可能属于属性）。

```ts
if (code.length === 0 || code[code.length - 1] !== head) {
  return -1;
}
if (code.length === 1) {
  if (head instanceof Common) {
    if (!(head as Common).Closed) {
      return -1;
    }
  } else if (head instanceof Bracket) {
    if (!(head as Bracket).Closed) {
      return -1;
    }
  } else {
    return -1;
  }
  const plan = MemberHeadScan.Plan(head, false);
  if (plan === null) {
    return -1;
  }
  if (plan.Kind === MemberHeadKind.Construct) {
    return -1;
  }
  return plan.Kind;
}
if (!(head instanceof Common) || !head.Closed) {
  return -1;
}
// 名字必须是**修饰词之后的第一格**：`abstract f(): void` 的 `void` 也是「闭合格 + 下一字符是 `;`」，
// 但它前面还有名字 / 参数表 / 返回类型，早建会把整条方法吞成壳（实测 class-abstract 多出一个
// SemicolonClassElement）。所以跳过修饰词链后必须正好剩这一格。
let nameAt = 0;
while (nameAt < code.length - 1 && ClassMemberPossibleUtil.IsModifierWord(code[nameAt])) {
  nameAt++;
}
if (nameAt !== code.length - 1) {
  return -1;
}
const next = ClassMemberPossibleUtil.NextChar(head.SourceRange);
if (next !== ":" && next !== "=" && next !== "!" && next !== "?" && next !== ";" && next !== "}") {
  return -1;
}
const first = ClassMemberPossibleUtil.TextOf(code[0]);
if (first === "@") {
  return -1;
}
if ((first === "get" || first === "set") && code.length >= 2) {
  return -1;
}
return MemberHeadKind.Property;
```

## static method Analyze:(state:ClassMemberPossibleScan)=>void

```ts
const code = state.Code;
state.Complete = false;
state.End = -1;
state.Early = false;
state.EarlyKind = -1;
if (code.length === 0) {
  state.Kinds = ClassMemberPossibleUtil.AllKinds();
  return;
}
const decorated = ClassMemberPossibleUtil.TextOf(code[0]) === "@";
let boundaryStart = 0;
if (decorated) {
  boundaryStart = ClassMemberPossibleUtil.DecoratorHeadAt(code);
  if (boundaryStart < 0 || boundaryStart >= code.length) {
    state.Kinds = ClassMemberPossibleUtil.ClassifyHead(code);
    return;
  }
}
state.Kinds = ClassMemberPossibleUtil.ClassifyHead(code);
if (decorated && state.Kinds.length > 1) {
  return;
}
const last = code[code.length - 1];
if (last.SourceRange.EndIndex < 0) {
  return;
}
// 角深度与边界都由增量状态给出（`Extend` / `ScanBoundary` 维护）：
// 与 `ClassMemberPossibleUtil.AngleDepth(code)`、`MemberBoundary.FindMemberBoundary(code, boundaryStart)`
// 的全量重算逐 token 等价。装饰器成员的锚点是 `DecoratorHeadAt(code)`（不是 0），
// 锚点前进时增量状态不需要重扫（见 `ScanBoundary`）。
const angle = state.Angle;
ClassMemberPossibleUtil.ScanBoundary(state, boundaryStart);
const boundary = state.BoundaryScan.Boundary < 0 ? code.length : state.BoundaryScan.Boundary;
let complete = false;
let end = -1;
if (angle === 0) {
  if (boundary > boundaryStart && boundary < code.length) {
    const boundaryEnd = boundary - 1;
    if (!ClassMemberPossibleUtil.IsModifierWord(code[boundaryEnd])) {
      complete = true;
      end = boundaryEnd;
    }
  }
  if (!complete && ClassMemberPossibleUtil.IsSeparator(last)) {
    complete = true;
    end = code.length - 1;
  }
  if (!complete && ClassMemberPossibleUtil.IsCompletionBoundary(ClassMemberPossibleUtil.NextChar(last.SourceRange))) {
    complete = true;
    end = code.length - 1;
  }
  if (complete && end >= 0 && ClassMemberPossibleUtil.IsModifierWord(code[end])) {
    complete = false;
    end = -1;
  }
  // [B2 / B2c] 成员头已定 ⇒ 早建外壳（只放宽「什么时候 Accept」，不改正品由谁建）：
  // 第一格的前瞻判出属性 / 方法 / 构造器 / 访问器 / 索引 / 静态块时，种类当场钉死，
  // 目录里只剩那一个候选存活（其余候选的 `ComputeByIndex` 会因为 Kinds 不含自己的 kind 而 Reject）。
  if (!complete && angle === 0) {
    const earlyKind = ClassMemberPossibleUtil.EarlyHeadKind(code, code[code.length - 1]);
    if (earlyKind >= 0) {
      complete = true;
      end = code.length - 1;
      state.Early = true;
      state.EarlyKind = earlyKind;
      const mapped = ClassMemberPossibleUtil.HeadKindOf(earlyKind);
      if (mapped >= 0) {
        state.Kinds = ClassMemberPossibleUtil.OnlyKind(mapped);
      }
    }
  }
}
let kinds = state.Kinds;
if (complete && kinds.length > 1
  && ClassMemberPossibleUtil.HasKind(kinds, ClassMemberPossibleUtil.PropertyKind)) {
  if (ClassMemberPossibleUtil.HasKind(kinds, ClassMemberPossibleUtil.MethodKind)
    && ClassMemberPossibleUtil.HasParameterList(code, end)) {
    kinds = ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.MethodKind);
  } else {
    kinds = ClassMemberPossibleUtil.OnlyKind(ClassMemberPossibleUtil.PropertyKind);
  }
}
state.Kinds = kinds;
state.Complete = complete && end >= 0;
state.End = end;
```

## static method Scan:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ClassMemberPossibleScan

```ts
const start = ClassMemberPossibleUtil.ItemStartOf(units, cache);
let state = cache.GetState<ClassMemberPossibleScan>(ClassMemberPossibleUtil.CacheKey);
if (state === null || state.Start !== start || state.Checked > tokenIndex + 1) {
  state = new ClassMemberPossibleScan();
  state.Start = start;
  state.Kinds = ClassMemberPossibleUtil.AllKinds();
  cache.SetState(ClassMemberPossibleUtil.CacheKey, state);
}
if (state.Checked <= tokenIndex) {
  ClassMemberPossibleUtil.Extend(state, units, tokenIndex);
  ClassMemberPossibleUtil.Analyze(state);
  state.Checked = tokenIndex + 1;
}
return state;
```

## static method BasePos:(host:Token, start:int)=>int

```ts
if (start > 0) {
  for (let at = start - 1; at >= 0; at--) {
    if (!host.Data[at].IsTriviaToken) {
      const previousEnd = host.Data[at].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        return previousEnd;
      }
      break;
    }
  }
}
if (host.SourceRange.StartIndex < 0) {
  return 0;
}
return host.SourceRange.StartIndex + 1;
```
