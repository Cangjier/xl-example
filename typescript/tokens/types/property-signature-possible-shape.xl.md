# dependencies
```xl
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { AngleJudge } from "./angle-judge.xl.md"
import { MemberBoundary, MemberBoundaryScan, MemberHeadKind, MemberHeadScan } from "./member-boundary.xl.md"
import { MemberShellCatalog } from "./member-shell-catalog.xl.md"
import { MemberShellFamily } from "./member-shell-catalog.xl.md"
import { PropertySignatureShape } from "./property-signature-shape.xl.md"
import { TypeBuilder } from "./type-builder.xl.md"
```

# namespace cangjie

# class MemberPossibleScan

## field Start:int = -1

## field Checked:int = -1

## field Complete:bool = false

## field End:int = -1

## field Kinds:int = 0

## field HeadKinds:int = 0

## field HeadSettled:bool = false

## field CodeAt:Array<int> = []

## field Code:Array<Token> = []

## field Angle:int = 0

## field BoundaryScan:MemberBoundaryScan = new MemberBoundaryScan()

## field Early:bool = false

## field EarlyKind:int = -1

# class MemberItemStartShared

## field Host:Array<Token> = []

## field Start:int = 0

## field Valid:bool = false

# class MemberScanShared

## field Host:Array<Token> = []

## field Start:int = -1

## field Valid:bool = false

## field Scan:MemberPossibleScan = new MemberPossibleScan()

# class MemberPossibleUtil

## static field CacheKey:any = PossibleShape.SlotOf(MemberPossibleScan)

## static field ItemStartKey:any = PossibleShape.SlotOf(MemberItemStartShared)

## static field ScanSharedKey:any = PossibleShape.SlotOf(MemberScanShared)

## static field PropertyKind:int = 1

## static field MethodKind:int = 2

## static field IndexKind:int = 4

## static field CallKind:int = 8

## static field ConstructKind:int = 16

## static field GetKind:int = 32

## static field SetKind:int = 64

## static field PendingBit:int = 128

## static method Pending:(kinds:int)=>int

```ts
return kinds | MemberPossibleUtil.PendingBit;
```

## static method IsPending:(raw:int)=>bool

```ts
return (raw & MemberPossibleUtil.PendingBit) !== 0;
```

## static method WithoutPending:(raw:int)=>int

```ts
return raw & ~MemberPossibleUtil.PendingBit;
```

## private static field TextCacheUnit:Token | null = null

## private static field TextCacheValue:string = ""

## static method AllKinds:()=>int

```ts
return MemberPossibleUtil.PropertyKind
  | MemberPossibleUtil.MethodKind
  | MemberPossibleUtil.IndexKind
  | MemberPossibleUtil.CallKind
  | MemberPossibleUtil.ConstructKind
  | MemberPossibleUtil.GetKind
  | MemberPossibleUtil.SetKind;
```

## static method OnlyKind:(kind:int)=>int

```ts
return kind;
```

## static method HasKind:(kinds:int, kind:int)=>bool

```ts
return (kinds & kind) !== 0;
```

## static method TextOf:(unit:Token)=>string

```ts
if (unit === MemberPossibleUtil.TextCacheUnit) {
  return MemberPossibleUtil.TextCacheValue;
}
let value = "";
if (unit instanceof Common) {
  value = (unit as Common).TempToString();
} else if (unit instanceof Symbol) {
  value = (unit as Symbol).TempToString();
} else if (unit instanceof String) {
  value = "string";
} else if (unit instanceof Bracket) {
  value = "bracket";
}
MemberPossibleUtil.TextCacheUnit = unit;
MemberPossibleUtil.TextCacheValue = value;
return value;
```

## static method IsSeparator:(unit:Token)=>bool

```ts
if (!(unit instanceof Symbol)) {
  return false;
}
return (unit as Symbol).Is(";") || (unit as Symbol).Is(",");
```

## static method HasParameterList:(code:Array<Token>, last:int)=>bool

```ts
for (let cursor = 0; cursor <= last && cursor < code.length; cursor++) {
  const unit = code[cursor];
  if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(") {
    return true;
  }
}
return false;
```

## static method IsNameToken:(unit:Token)=>bool

```ts
if (unit instanceof Common || unit instanceof String) {
  return true;
}
return unit instanceof Bracket && (unit as Bracket).StartBracketChar === "[";
```

## static method IsIndexBracket:(bracket:Bracket)=>bool

```ts
const inner:Array<Token> = [];
for (const item of bracket.Data) {
  if (!item.IsTriviaToken) {
    inner.push(item);
  }
}
if (inner.length === 0) {
  return true;
}
if (inner.length >= 2 && MemberPossibleUtil.TextOf(inner[1]) === ":") {
  return true;
}
return false;
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

## static method IsCompletionBoundary:(ch:string)=>bool

```ts
return ch === "" || ch === "}" || ch === "]" || ch === ")" || ch === ">";
```

## static method HeadKindOf:(neutral:int)=>int

```ts
if (neutral === MemberHeadKind.Property) {
  return MemberPossibleUtil.PropertyKind;
}
if (neutral === MemberHeadKind.Method) {
  return MemberPossibleUtil.MethodKind;
}
if (neutral === MemberHeadKind.Constructor) {
  return MemberPossibleUtil.MethodKind;
}
if (neutral === MemberHeadKind.Construct) {
  return MemberPossibleUtil.ConstructKind;
}
if (neutral === MemberHeadKind.Get) {
  return MemberPossibleUtil.GetKind;
}
if (neutral === MemberHeadKind.Set) {
  return MemberPossibleUtil.SetKind;
}
if (neutral === MemberHeadKind.Index) {
  return MemberPossibleUtil.IndexKind;
}
return -1;
```

## static method EarlyHeadKind:(code:Array<Token>, head:Token)=>int

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
  const plan = MemberHeadScan.Plan(head, true);
  if (plan === null) {
    return -1;
  }
  return plan.Kind;
}
if (head instanceof Symbol && (head as Symbol).Is(":") && head.Closed) {
  // [B2] `name :` 已唯一确定属性签名（方法签名在 `(`、调用签名在头部括号）。
  return MemberHeadKind.Property;
}
if (!(head instanceof Common) || !head.Closed) {
  return -1;
}
const next = MemberPossibleUtil.NextChar(head.SourceRange);
if (next === ":" || next === ";" || next === "}" || next === "," || next === "=") {
  return MemberHeadKind.Property;
}
return -1;
```

## static method ClassifyHead:(code:Array<Token>)=>int

```ts
const ALL = MemberPossibleUtil.AllKinds();
if (code.length === 0) {
  return MemberPossibleUtil.Pending(ALL);
}
let at = 0;
while (at < code.length) {
  const unit = code[at];
  const text = MemberPossibleUtil.TextOf(unit);
  if (text === "readonly") {
    if (at + 1 >= code.length) {
      return MemberPossibleUtil.Pending(ALL);
    }
    const following = code[at + 1];
    if (MemberPossibleUtil.IsNameToken(following)
      && !MemberBoundary.HasLineBreakBetween(unit, following)) {
      at++;
      continue;
    }
    break;
  }
  if (text === "abstract") {
    if (at + 1 >= code.length) {
      return MemberPossibleUtil.Pending(ALL);
    }
    if (MemberPossibleUtil.TextOf(code[at + 1]) === "new") {
      at++;
      continue;
    }
    break;
  }
  break;
}
if (at >= code.length) {
  return MemberPossibleUtil.Pending(ALL);
}
const unit = code[at];
if (unit instanceof Bracket) {
  const bracket = unit as Bracket;
  if (bracket.Is("(", ")")) {
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.CallKind);
  }
  if (bracket.Is("[", "]")) {
    if (MemberPossibleUtil.IsIndexBracket(bracket)) {
      return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.IndexKind);
    }
    let cursor = at + 1;
    if (cursor < code.length) {
      const markText = MemberPossibleUtil.TextOf(code[cursor]);
      if (markText === "?" || markText === "?:") {
        cursor++;
      }
    }
    if (cursor >= code.length) {
      return MemberPossibleUtil.Pending(MemberPossibleUtil.PropertyKind | MemberPossibleUtil.MethodKind);
    }
    const after = code[cursor];
    if (after instanceof Bracket && (after as Bracket).Is("(", ")")) {
      return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
    }
    if (MemberPossibleUtil.TextOf(after) === "<") {
      return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
    }
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.PropertyKind);
  }
  return 0;
}
const text = MemberPossibleUtil.TextOf(unit);
if (text === "<") {
  return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.CallKind);
}
if (text === "new") {
  if (at + 1 >= code.length) {
    return MemberPossibleUtil.Pending(MemberPossibleUtil.PropertyKind | MemberPossibleUtil.ConstructKind);
  }
  const following = code[at + 1];
  if (following instanceof Bracket && (following as Bracket).Is("(", ")")) {
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.ConstructKind);
  }
  if (MemberPossibleUtil.TextOf(following) === "<") {
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.ConstructKind);
  }
  return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.PropertyKind);
}
if (text === "get" || text === "set") {
  const accessorKind = text === "get" ? MemberPossibleUtil.GetKind : MemberPossibleUtil.SetKind;
  if (at + 1 >= code.length) {
    return MemberPossibleUtil.Pending(ALL);
  }
  const nameUnit = code[at + 1];
  const nameText = MemberPossibleUtil.TextOf(nameUnit);
  if (nameUnit instanceof Bracket && (nameUnit as Bracket).Is("(", ")")) {
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
  }
  if (nameText === ":" || nameText === ";" || nameText === ",") {
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.PropertyKind);
  }
  if (nameText === "?" || nameText === "?:") {
    // `get?` / `set?`：`?` 紧跟在访问器关键字后面，访问器这一类已经不成立
    //（访问器的形态是「get 名字 (`」），`get` / `set` 只能是成员名，
    // 所以这里按「名字 + 可选标记」的同一套判据往下看：
    // `get?(this: This): Value` 是 MethodSignature（名字 get），`get?: A` 是 PropertySignature。
    let cursor = at + 2;
    if (cursor >= code.length) {
      return MemberPossibleUtil.Pending(MemberPossibleUtil.PropertyKind | MemberPossibleUtil.MethodKind);
    }
    const afterMark = code[cursor];
    if (afterMark instanceof Bracket && (afterMark as Bracket).Is("(", ")")) {
      let methodLike = false;
      if (cursor + 1 < code.length) {
        methodLike = MemberPossibleUtil.TextOf(code[cursor + 1]) === ":";
      } else {
        methodLike = MemberPossibleUtil.NextChar((afterMark as Bracket).SourceRange) === ":";
      }
      if (methodLike) {
        return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
      }
      return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.PropertyKind);
    }
    if (MemberPossibleUtil.TextOf(afterMark) === "<") {
      return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
    }
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.PropertyKind);
  }
  if (!MemberPossibleUtil.IsNameToken(nameUnit)) {
    return MemberPossibleUtil.PropertyKind | MemberPossibleUtil.MethodKind;
  }
  if (at + 2 >= code.length) {
    return MemberPossibleUtil.Pending(
      MemberPossibleUtil.PropertyKind | MemberPossibleUtil.MethodKind | accessorKind);
  }
  const bracketUnit = code[at + 2];
  if (bracketUnit instanceof Bracket && (bracketUnit as Bracket).Is("(", ")")) {
    return MemberPossibleUtil.OnlyKind(accessorKind);
  }
  return MemberPossibleUtil.PropertyKind | MemberPossibleUtil.MethodKind;
}
if (unit instanceof Common || unit instanceof String) {
  let cursor = at + 1;
  if (cursor >= code.length) {
    return MemberPossibleUtil.Pending(MemberPossibleUtil.PropertyKind | MemberPossibleUtil.MethodKind);
  }
  const markText = MemberPossibleUtil.TextOf(code[cursor]);
  if (markText === "?" || markText === "?:") {
    cursor++;
    if (cursor >= code.length) {
      return MemberPossibleUtil.Pending(MemberPossibleUtil.PropertyKind | MemberPossibleUtil.MethodKind);
    }
    const after = code[cursor];
    if (after instanceof Bracket && (after as Bracket).Is("(", ")")) {
      let methodLike = false;
      if (cursor + 1 < code.length) {
        methodLike = MemberPossibleUtil.TextOf(code[cursor + 1]) === ":";
      } else {
        methodLike = MemberPossibleUtil.NextChar((after as Bracket).SourceRange) === ":";
      }
      if (methodLike) {
        return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
      }
      return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.PropertyKind);
    }
    if (MemberPossibleUtil.TextOf(after) === "<") {
      return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
    }
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.PropertyKind);
  }
  if (code[cursor] instanceof Bracket && (code[cursor] as Bracket).Is("(", ")")) {
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
  }
  if (MemberPossibleUtil.TextOf(code[cursor]) === "<") {
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
  }
  if (MemberPossibleUtil.TextOf(code[cursor]) === ":") {
    return MemberPossibleUtil.OnlyKind(MemberPossibleUtil.PropertyKind);
  }
  return MemberPossibleUtil.PropertyKind | MemberPossibleUtil.MethodKind;
}
return 0;
```

## static method Analyze:(state:MemberPossibleScan)=>void

```ts
const code = state.Code;
state.Complete = false;
state.End = -1;
state.Early = false;
state.EarlyKind = -1;
if (code.length === 0) {
  state.Kinds = MemberPossibleUtil.AllKinds();
  return;
}
if (MemberPossibleUtil.IsSeparator(code[0])) {
  // 纯分隔符条目：没有成员可以建，留给容器收口时的兜底解析。
  state.Kinds = MemberPossibleUtil.AllKinds();
  return;
}
// head 结论按成员缓存，判据是**语义终局**而不是长度阈值：`ClassifyHead` 只在
// 「decisive 单元与它需要的后续单元都到齐」时返回不带 `PendingBit` 的结果，那时结论
// 无论 `Code` 再追加什么都不变，才允许写进 `HeadKinds` / `HeadSettled`；返回带标记
// 就表示还缺后续单元（例如前导修饰词链还没走完、名字后面还没看到 `?` / `(` / `<` / `:`），
// 本次用算出来的值继续判定，但**不缓存**，下一次重新分类。
let head = state.HeadKinds;
if (!state.HeadSettled) {
  const raw = MemberPossibleUtil.ClassifyHead(code);
  head = MemberPossibleUtil.WithoutPending(raw);
  if (!MemberPossibleUtil.IsPending(raw)) {
    state.HeadKinds = head;
    state.HeadSettled = true;
  }
}
if (head === 0) {
  state.Kinds = 0;
  return;
}
const last = code[code.length - 1];
// 边界与角深度都由增量状态给出（`ScanBoundary` / `Extend` 维护）：
// 与 `MemberBoundary.FindTypeMemberBoundary(code, 0)`、`MemberPossibleUtil.AngleDepth(code)` 的全量重算逐 token 等价。
const boundary = state.BoundaryScan.Boundary < 0 ? code.length : state.BoundaryScan.Boundary;
// 成员自身 <...> 里的 `>` / `,` 不是本层收口证据：深度 > 0 时三条证据全部不生效。
const angle = state.Angle;
let complete = false;
let end = -1;
if (angle === 0) {
  if (boundary < code.length) {
    complete = true;
    end = boundary - 1;
  } else if (MemberPossibleUtil.IsSeparator(last)) {
    complete = true;
    end = code.length - 1;
  } else if (MemberPossibleUtil.IsCompletionBoundary(MemberPossibleUtil.NextChar(last.SourceRange))) {
    complete = true;
    end = code.length - 1;
  }
  // [B2 / B2c] 成员头已定 ⇒ 早建外壳：第一格的前瞻判出属性 / 方法签名 / 构造签名 / 访问器 /
  // 索引时，种类当场钉死（其余候选因为 Kinds 不含自己的 kind 而 Reject）；更晚的格子仍只接受
  // 属性判据（`name :` / 名字闭合格 + 下一字符是属性符号）。
  if (!complete && angle === 0) {
    const earlyKind = MemberPossibleUtil.EarlyHeadKind(code, code[code.length - 1]);
    if (earlyKind >= 0) {
      const mapped = MemberPossibleUtil.HeadKindOf(earlyKind);
      if (mapped >= 0) {
        complete = true;
        end = code.length - 1;
        state.Early = true;
        state.EarlyKind = earlyKind;
        head = mapped;
      }
    }
  }
}
let kinds = head;
// 「多于一类」等价于「至少两个二进制位」：`kinds & (kinds - 1)` 非 0。
if (complete && (kinds & (kinds - 1)) !== 0
  && MemberPossibleUtil.HasKind(kinds, MemberPossibleUtil.PropertyKind)) {
  if (MemberPossibleUtil.HasKind(kinds, MemberPossibleUtil.MethodKind)
    && MemberPossibleUtil.HasParameterList(code, end)) {
    kinds = MemberPossibleUtil.OnlyKind(MemberPossibleUtil.MethodKind);
  } else {
    kinds = MemberPossibleUtil.OnlyKind(MemberPossibleUtil.PropertyKind);
  }
}
state.Kinds = kinds;
state.Complete = complete && end >= 0;
state.End = end;
```

## static method Extend:(state:MemberPossibleScan, units:Array<Token>, tokenIndex:int)=>void

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

## static method ScanBoundary:(state:MemberPossibleScan)=>void

```ts
MemberBoundary.ScanTypeMemberBoundary(state.Code, state.BoundaryScan);
```

## static method ItemStartValid:(units:Array<Token>, shared:MemberItemStartShared)=>bool

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
let shared = cache.GetShare<MemberItemStartShared>(MemberPossibleUtil.ItemStartKey);
if (shared !== null && MemberPossibleUtil.ItemStartValid(units, shared)) {
  return shared.Start;
}
const start = ItemUtil.ItemStartCached(units, cache);
if (shared === null) {
  shared = new MemberItemStartShared();
  shared.Host = units;
  shared.Start = start;
  shared.Valid = true;
  cache.SetShare(MemberPossibleUtil.ItemStartKey, shared);
} else {
  shared.Host = units;
  shared.Start = start;
  shared.Valid = true;
}
return start;
```

## static method UpdateItemStartAfterBuild:(cache:PossibleShapeCache, host:Token, start:int)=>void

```ts
const shared = cache.GetShare<MemberItemStartShared>(MemberPossibleUtil.ItemStartKey);
if (shared !== null) {
  shared.Host = host.Data;
  shared.Start = start + 1;
  shared.Valid = true;
}
```

## static method ReuseScan:(units:Array<Token>, start:int, cache:PossibleShapeCache)=>MemberPossibleScan

```ts
let shared = cache.GetShare<MemberScanShared>(MemberPossibleUtil.ScanSharedKey);
if (shared === null) {
  shared = new MemberScanShared();
  cache.SetShare(MemberPossibleUtil.ScanSharedKey, shared);
}
const state = shared.Scan;
state.Start = start;
state.Checked = -1;
state.Complete = false;
state.End = -1;
state.Kinds = MemberPossibleUtil.AllKinds();
state.HeadKinds = 0;
state.HeadSettled = false;
state.Code.length = 0;
state.CodeAt.length = 0;
state.Angle = 0;
state.Early = false;
state.EarlyKind = -1;
state.BoundaryScan.Boundary = -1;
state.BoundaryScan.Checked = 1;
shared.Host = units;
shared.Start = start;
shared.Valid = true;
return state;
```

## static method Scan:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>MemberPossibleScan

```ts
let state = cache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null || state.Checked > tokenIndex + 1) {
  const start = MemberPossibleUtil.ItemStartOf(units, cache);
  state = MemberPossibleUtil.ReuseScan(units, start, cache);
  cache.SetState(MemberPossibleUtil.CacheKey, state);
}
if (state.Checked <= tokenIndex) {
  MemberPossibleUtil.Extend(state, units, tokenIndex);
  MemberPossibleUtil.ScanBoundary(state);
  MemberPossibleUtil.Analyze(state);
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

## static method MemberParsedWhole:(builder:TypeBuilder, consumedLength:int)=>bool

```ts
if (builder.At !== builder.Units.length) {
  return false;
}
if (builder.OriginalConsumed() !== consumedLength) {
  return false;
}
return true;
```

# class PropertySignaturePossibleShape extends PossibleShape

```txt
interface I { a: number; }
interface I { a?: A; }
interface I { readonly b: B; }
interface I { [expr]: A; }
interface I { "abort": Event }
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const state = MemberPossibleUtil.Scan(units, tokenIndex, cache);
if (!MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.PropertyKind)) {
  return ShapeStates.Reject;
}
if (state.Complete) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const state = cache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null) {
  return false;
}
return state.Complete && state.End >= 0
  && MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.PropertyKind);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null || state.End < 0 || state.End >= state.CodeAt.length) {
  throw new Error("PropertySignaturePossibleShape.BuildByIndex: 判定状态缺失");
}
const start = state.Start;
const end = state.CodeAt[state.End];
if (start < 0 || end < start) {
  return host;
}
// [B2] `name :` 已唯一确定属性签名：先建**外壳**，余下单元由外壳吃掉，边界处交给 legacy builder 建正品。
if (state.Early) {
  const shell = MemberShellCatalog.Create(host, start, end, MemberShellFamily.Interface, catalog.PossibleShapesComputeCache, context);
  if (shell !== host) {
    MemberPossibleUtil.UpdateItemStartAfterBuild(catalog.PossibleShapesComputeCache, host, start);
  }
  return shell;
}
const basePos = MemberPossibleUtil.BasePos(host, start);
const builder = new TypeBuilder(host.Template, context);
const consumedLength = builder.LoadFrom(host.Data, start, end + 1, basePos);
const built = builder.ParseTypeMember();
if (!MemberPossibleUtil.MemberParsedWhole(builder, consumedLength)) {
  return host;
}
if (!(built instanceof PropertySignatureShape)) {
  throw new Error("PropertySignaturePossibleShape.BuildByIndex: 产出不是 PropertySignatureShape");
}
host.Data.splice(start, consumedLength, built);
// Share 由 Build 阶段更新：条目起点前进一格（被建的形状正好坐在 start 上）。
MemberPossibleUtil.UpdateItemStartAfterBuild(catalog.PossibleShapesComputeCache, host, start);
built.Parent = host;
return built;
```
