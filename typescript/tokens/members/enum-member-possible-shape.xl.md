# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { EnumDeclarationShape } from "../declarations/enum-declaration-shape.xl.md"
import { EnumMemberShape } from "./enum-member-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class EnumMemberPossibleScan

## field Start:int = -1

## field Checked:int = -1

## field Complete:bool = false

## field End:int = -1

## field NameAt:int = -1

## field CodeAt:Array<int> = []

# class EnumMemberPossibleUtil

## static field CacheKey:any = PossibleShape.SlotOf(EnumMemberPossibleScan)

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
return (unit as Symbol).Is(",");
```

## static method IsNameToken:(unit:Token)=>bool

```ts
if (unit instanceof Common || unit instanceof String) {
  return true;
}
return unit instanceof Bracket && (unit as Bracket).StartBracketChar === "[";
```

## static method NextChar:(last:SourceRange | null)=>string

```ts
if (last === null || last.EndIndex < 0 || last.Document === null) {
  return "";
}
const document = last.Document;
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

## static method IsCompletionBoundary:(ch:string)=>bool

```ts
return ch === "" || ch === "}";
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

## static method Analyze:(code:Array<Token>, state:EnumMemberPossibleScan)=>void

```ts
state.Complete = false;
state.End = -1;
state.NameAt = -1;
let nameAt = 0;
while (nameAt < code.length && EnumMemberPossibleUtil.IsSeparator(code[nameAt])) {
  nameAt++;
}
if (nameAt >= code.length) {
  return;
}
if (!EnumMemberPossibleUtil.IsNameToken(code[nameAt])) {
  // 不认识的头（恢复形）：不建，整段原样留给收口时的 raw 兜底。
  return;
}
state.NameAt = nameAt;
for (let at = nameAt + 1; at < code.length; at++) {
  if (EnumMemberPossibleUtil.IsSeparator(code[at])) {
    state.Complete = true;
    state.End = at - 1;
    return;
  }
}
const last = code[code.length - 1];
if (EnumMemberPossibleUtil.IsCompletionBoundary(EnumMemberPossibleUtil.NextChar(last.SourceRange))) {
  state.Complete = true;
  state.End = code.length - 1;
}
```

## static method Scan:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>EnumMemberPossibleScan

```ts
const start = ItemUtil.ItemStartCached(units, cache);
let state = cache.GetState<EnumMemberPossibleScan>(EnumMemberPossibleUtil.CacheKey);
if (state === null || state.Start !== start || state.Checked > tokenIndex + 1) {
  state = new EnumMemberPossibleScan();
  state.Start = start;
  state.Checked = -1;
  state.Complete = false;
  state.End = -1;
  state.NameAt = -1;
  state.CodeAt = [];
  cache.SetState(EnumMemberPossibleUtil.CacheKey, state);
}
if (state.Checked <= tokenIndex) {
  const code:Array<Token> = [];
  const codeAt:Array<number> = [];
  for (let at = start; at <= tokenIndex; at++) {
    if (!units[at].IsTriviaToken) {
      code.push(units[at]);
      codeAt.push(at);
    }
  }
  state.CodeAt = codeAt;
  EnumMemberPossibleUtil.Analyze(code, state);
  state.Checked = tokenIndex + 1;
}
return state;
```

# class EnumMemberPossibleShape extends PossibleShape

```txt
enum E { A }
enum E { A, B }
enum E { A = 1, B = 2 }
enum E { [k] = 1 }
enum E { "a" = 1 }
enum E { 1 = 1 }
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const state = EnumMemberPossibleUtil.Scan(units, tokenIndex, cache);
if (state.Complete && state.End >= 0) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const state = cache.GetState<EnumMemberPossibleScan>(EnumMemberPossibleUtil.CacheKey);
if (state === null) {
  return false;
}
return state.Complete && state.End >= 0 && state.NameAt >= 0;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<EnumMemberPossibleScan>(EnumMemberPossibleUtil.CacheKey);
if (state === null || state.End < 0 || state.NameAt < 0
  || state.End >= state.CodeAt.length || state.NameAt >= state.CodeAt.length) {
  return host;
}
const start = state.CodeAt[state.NameAt];
const end = state.CodeAt[state.End];
if (start < 0 || end < start) {
  return host;
}
const group:Array<Token> = [];
for (let at = start; at <= end; at++) {
  if (!host.Data[at].IsTriviaToken) {
    group.push(host.Data[at]);
  }
}
const basePos = EnumMemberPossibleUtil.BasePos(host, start);
let built:Token | null = null;
try {
  built = EnumDeclarationShape.BuildMember(host, group, basePos, context);
} catch {
  // 成员没被完整解析（恢复形）：不建、不 splice，raw 留给 CollectBodyMembers 兜底。
  built = null;
}
if (built === null) {
  return host;
}
if (!(built instanceof EnumMemberShape)) {
  throw new Error("EnumMemberPossibleShape.BuildByIndex: 产出不是 EnumMemberShape");
}
host.Data.splice(start, end - start + 1, built);
built.Parent = host;
return built;
```
