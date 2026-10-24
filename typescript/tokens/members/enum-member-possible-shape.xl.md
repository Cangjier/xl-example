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

枚举体里「当前条目」的判定状态。`Start` 是条目在宿主 `Data` 里的起点（`ItemUtil.ItemStart`），`Checked` 是已经扫到的
`tokenIndex + 1`；`NameAt` / `End` 是代码单元下标（`CodeAt` 的下标，不是宿主下标）：`NameAt` 是名字单元（跳过前导逗号之后），
`End` 是成员最后一个代码单元；`Complete` 表示成员边界已经确定。

## field Start:int = -1

## field Checked:int = -1

## field Complete:bool = false

## field End:int = -1

## field NameAt:int = -1

## field CodeAt:Array<int> = []

# class EnumMemberPossibleUtil

枚举体成员候选的公共判据（本族只有一个候选，仍单独成类：`ComputeByIndex` / `IsBuildable` / `BuildByIndex` 共用一份扫描结论）。

枚举成员的语法是封闭的：`名字 [= 初始化器]`，名字可以是 Identifier / StringLiteral / NumericLiteral / 计算名 `[...]`，
成员之间只有**顶层逗号**（初始化器里的逗号都在括号 / 字符串 / 模板里，是单个 Unit，不会出现在本层）。
所以边界判据只有两条（与 `EnumDeclarationShape.BuildMembers` 的顶层逗号切分同口径）：

1. 条目里出现顶层 `,`：成员在逗号前一个代码单元收住（逗号**不**进成员区间——`BuildMembers` 也是这样切的）；
2. 否则最后一个代码单元之后的下一个字符是容器收口字符 `}` / EOF：本层不会再有代码单元，最后一条成员立刻收口。

**不**把「换行后的下一成员起点」当边界：`EnumDeclarationShape.BuildMembers` 只按逗号切分，`enum E { A B }` 这种
缺逗号的恢复形在整段路径里会抛「枚举成员缺少等号」。候选如果提前按换行切开，会把这个（既有的）恢复行为改成两条成员，
AST 就不再与重构前一致——所以这类条目**不建**，留给收口时的 raw 兜底按原口径恢复。

## static field CacheKey:any = PossibleShape.SlotOf(EnumMemberPossibleScan)

枚举体成员候选的缓存槽：`ComputeByIndex` / `IsBuildable` / `BuildByIndex` 共用这一份扫描结论，槽号由这一组共同的标识类 `EnumMemberPossibleScan` 发出来。

## static method TextOf:(unit:Token)=>string

代码单元文本；字符串 / 括号只给占位串（判型只关心「是不是名字 / 是不是分隔符」）。

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

顶层分隔符：只有 `,`（枚举成员不用 `;` 分隔；`;` 出现就是恢复形，留给 raw 兜底）。

```ts
if (!(unit instanceof Symbol)) {
  return false;
}
return (unit as Symbol).Is(",");
```

## static method IsNameToken:(unit:Token)=>bool

能不能当枚举成员名：标识符（含关键字形态的 Common）/ 字符串字面量 / 计算名 `[...]`。

```ts
if (unit instanceof Common || unit instanceof String) {
  return true;
}
return unit instanceof Bracket && (unit as Bracket).StartBracketChar === "[";
```

## static method NextChar:(last:SourceRange | null)=>string

`last` 之后（`last.EndIndex` 起）的下一个字符，跳过空白与 `//` / `/* */` 注释；越界返回空串。

枚举体最后一个成员的收口判据要用它回答「最后一个代码单元后面是不是 `}` / EOF」——那个字符可能还没被 token 化。

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

容器收口字符。枚举体只有 `}` / EOF 两种（`;` / `,` 是显式分隔符，不在这里）。

```ts
return ch === "" || ch === "}";
```

## static method BasePos:(host:Token, start:int)=>int

成员形状的 `Pos` 口径，与 `EnumDeclarationShape.BuildMembers` 里手算的 `memberPos` 完全相同：
条目第一个代码单元前面最近一个非 trivia 单元的 `EndIndex`；前面什么都没有时用宿主起点 + 1
（`BuildMembers` 的初始 `memberPos = bracket.SourceRange.StartIndex + 1`）。

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

把「当前条目」的结论写进 `state`。空条目 / 纯 trivia / 纯分隔符一律「还不完整」（`CatalogGuide` 没有终结候选，
候选不能 `Reject` 干净，否则目录会抛「没有候选形状」）。

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

取（必要时重算）当前条目的判定状态。条目起点变化 / 缓存越过当前下标 / 目录复位后残留，就地重建。

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

枚举体里的成员候选。判定只读 `EnumMemberPossibleUtil.Scan` 的结论：边界已确定就 `Accept`，否则 `Uncertain`
（永远不 `Reject`——本族只有一个候选，`Reject` 会让 body 目录「没有候选形状」抛错）。

`BuildByIndex` 用 `EnumDeclarationShape.BuildMember` 这**同一个建造器**（不复制建造逻辑）：先按判定区间切出成员自己的
代码单元组，调建造器；建造器读不完（`enum E { A B }` / `enum E { A = 1 B = 2 }` 这类）就**不建、不 `splice`**，
raw 代码原样留给收口时的 `CollectBodyMembers` → `BuildMembers` 按重构前口径恢复（`MemberParsedWhole` 式兜底）。
整段读完后才断言产出必须是 `EnumMemberShape`，不对直接抛错。

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

收住了才建：顶层逗号 / 容器收口，两条证据在 `Analyze` 里已经算好。

```ts
const state = cache.GetState<EnumMemberPossibleScan>(EnumMemberPossibleUtil.CacheKey);
if (state === null) {
  return false;
}
return state.Complete && state.End >= 0 && state.NameAt >= 0;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

消费 `CodeAt[NameAt] .. CodeAt[End]`（**不含**成员后的逗号与 trivia），用 `EnumDeclarationShape.BuildMember` 建成员，
原地顶替进宿主 `Data`。

读不完 / 结构不对（建造器抛错）时**不顶替**，raw 代码原样留给收口时的 `BuildMembers`；只有整段读完才断言产出类型。

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
