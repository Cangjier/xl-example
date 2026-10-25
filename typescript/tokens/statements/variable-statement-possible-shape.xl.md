# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { DirectBuildRouter } from "../direct/direct-build-router.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { StatementEndPossibleShape } from "./statement-end-possible-shape.xl.md"
import { StatementScanner } from "./statement-scanner.xl.md"
import { StatementShape } from "./statement-shape.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
```

# namespace cangjie

# class VariableStatementPossibleShape extends PossibleShape

## method HeadText:(units:Array<Token>, start:int)=>string

```ts
const headAt = ItemUtil.NextCode(units, start);
if (headAt >= units.length) {
  return "";
}
const head = units[headAt];
if (!(head instanceof Common)) {
  return "";
}
const text = (head as Common).TempToString();
if (text !== "let" && text !== "const" && text !== "var") {
  return "";
}
return text;
```

## method BindingAt:(units:Array<Token>, start:int)=>int

```ts
const headAt = ItemUtil.NextCode(units, start);
if (headAt >= units.length) {
  return units.length;
}
return ItemUtil.NextCode(units, headAt + 1);
```

## method IsConstEnumHead:(units:Array<Token>, start:int)=>bool

```ts
const headAt = ItemUtil.NextCode(units, start);
if (headAt >= units.length) {
  return false;
}
const head = units[headAt];
if (!(head instanceof Common) || (head as Common).TempToString() !== "const") {
  return false;
}
const headOwner = head.Parent;
if (!(headOwner instanceof Bracket) || (headOwner as Bracket).StartBracketChar !== "{") {
  return false;
}
const nextAt = ItemUtil.NextCode(units, headAt + 1);
if (nextAt >= units.length) {
  return false;
}
const next = units[nextAt];
return next instanceof Common && (next as Common).TempToString() === "enum"
  && StatementScanner.NoLineBreakBetween(head, next);
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (StatementRouteUtil.ShouldYieldToDeclarationShell(units, tokenIndex)) {
  // Stage 4x：与壳的晚建守卫同一判据（route 命中 && 壳这一格不会建壳）才让位。
  // 只看 route 会让「上一条语句已收口」的格子（`}` ⏎ `export`）两边都退 → 文件级 fallback。
  return ShapeStates.Reject;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
if (units[tokenIndex] instanceof EndOfFileTokenShape) {
  return ShapeStates.Reject;
}
// 只有 trivia、还没有任何代码单元时不能 Reject：CatalogGuide 会把 Reject 的候选从 Candidates 里永久删除。
// 文件以注释开头时首次判定就落在这一格，Reject 会让整条 let/const/var 声明无人接管（token-ast 28 个 crash 的根因）。
if (ItemUtil.NextCode(units, ItemUtil.ItemStartCached(units, cache)) >= units.length) {
  return ShapeStates.Uncertain;
}
const start = ItemUtil.ItemStartCached(units, cache);
if (start >= units.length) {
  return ShapeStates.Reject;
}
if (this.HeadText(units, start) === "") {
  return ShapeStates.Reject;
}
const bindingAt = this.BindingAt(units, start);
if (bindingAt >= units.length) {
  // 关键字刚关闭、绑定还没到：继续等下一格（此时 `ExpressionStatementPossibleShape` 也还活着）。
  return ShapeStates.Uncertain;
}
if (units[bindingAt] instanceof EndOfFileTokenShape) {
  return ShapeStates.Reject;
}
if (!StatementScanner.StartsBinding(units, bindingAt)) {
  // `let` 后面是 `=` / `(` / `:` 等：`let` 只是标识符，本条不是声明（让位给表达式语句候选）。
  // **Stage 5d-8a**：`const enum` 是唯一例外——它不是绑定，但确实是这一族要建的带体声明
  // （`StatementFamilyDispatch` 的 `const` 分支建 enum）。
  if (!this.IsConstEnumHead(units, start)) {
    return ShapeStates.Reject;
  }
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const start = ItemUtil.ItemStartCached(units, cache);
if (start >= units.length) {
  return false;
}
if (this.HeadText(units, start) === "") {
  return false;
}
const bindingAt = this.BindingAt(units, start);
return bindingAt <= tokenIndex && bindingAt < units.length
  && !(units[bindingAt] instanceof EndOfFileTokenShape)
  && (StatementScanner.StartsBinding(units, bindingAt) || this.IsConstEnumHead(units, start));
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const start = ItemUtil.ItemStart(host.Data);
if (start > tokenIndex) {
  throw new Error("变量声明语句候选没有可搬的单元");
}
// **Stage 5d-8a：`const enum` 的判型必须在搬单元之前读**——下面 `host.Data.splice` 之后宿主 `Data`
// 已经被搬空，`IsConstEnumHead` 只会看到空数组（实测：壳的终结候选退回默认族、每格问一次 `ScanRoot`，
// `root-retirement` 的「默认态 ScanRoot = 0」由 0 变 8）。
const constEnum = this.IsConstEnumHead(host.Data, start);
let pos = 0;
if (host instanceof Bracket && (host as Bracket).StartBracketChar === "{") {
  // 块体目录的宿主是块体 `{` 括号：块内**第一条**语句的 `pos` 是「`{` 之后第一个字符」（含前导 trivia），
  // 与 legacy `BuildBlock` 的 `base = bracket.StartIndex + 1` 同口径；后续语句仍取前一个兄弟的 `EndIndex`。
  // 括号自己的 `Data` 里没有前一个兄弟单元，按「前一个非 trivia 单元 EndIndex」找会退回 0，正好差一格（HANDOFF-s4b §6 D1）。
  let previous = -1;
  for (let at = start - 1; at >= 0; at--) {
    if (!host.Data[at].IsTriviaToken) {
      previous = at;
      break;
    }
  }
  if (previous < 0) {
    if (host.SourceRange.StartIndex >= 0) {
      pos = host.SourceRange.StartIndex + 1;
    }
  } else {
    const previousEnd = host.Data[previous].SourceRange.EndIndex;
    if (previousEnd >= 0) {
      pos = previousEnd;
    }
  }
} else {
  for (let at = start - 1; at >= 0; at--) {
    if (!host.Data[at].IsTriviaToken) {
      const previousEnd = host.Data[at].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        pos = previousEnd;
      }
      break;
    }
  }
}
const moved:Array<Token> = host.Data.slice(start, tokenIndex + 1);
host.Data.splice(start, moved.length);
const shell = new StatementShape(host.Template);
shell.Pos = pos;
for (const item of moved) {
  shell.Add(item);
}
const headStart = moved[0].SourceRange.Start;
if (headStart >= 0) {
  shell.SignIn(headStart);
}
const endShape = new StatementEndPossibleShape();
if (constEnum) {
  // **Stage 5d-8a：`const enum` 是带体声明，收口读声明族那一份**（`DeclarationFamilyBodyEndCode` 的
  // 体括号补充判据 + 表达式族原有的 `;` / ASI / 声明跟随边界 / EOF）。否则变量族的终结候选只认
  // `;` / ASI，`const enum E { A }` 会一直收不了口 → `DetachShell` → 整段 raw。
  endShape.StatementKind = StatementRoute.ShellDeclarationFamily;
}
shell.CatalogGuide = new CatalogGuide([], endShape);
host.Data.splice(start, 0, shell);
shell.Parent = host;
host.MountedUnit = shell;
// H3（CONTRACT §4.2）：壳挂好后立刻挂直建 session 并喂一次已有的 Data。`Ingest` 幂等，后续由 H1 增量喂；
// 未注册该 kind 时 Create 返回 null（本轮 plugins 空表），直建不接管，行为与基线逐字节不变。
shell.DirectSession = DirectBuildRouter.Create(StatementRoute.ShellVariable, shell, context);
if (shell.DirectSession !== null) {
  // R3-S（与 R3-CONTRACT §4.4 的 H1 同一条语义）：`--strict` 时 `Decline` 在 Ingest 期**先计数再抛**。
  // 这里是 R1 的「建壳即喂」eager 入口，是与 H1 并列的**第二个**喂入点：不接住，异常会经
  // `Bracket.TryToClose` 包成 SyntaxException 后穿出 `Parse`（R3-S-01 `let {a} = b` 实测，
  // 抛栈是 BuildByIndex → Ingest → IngestBinding → Decline，**没有** StatementShape.ComputePossibleShapes）。
  // 语义与 H2/H1 一致：已计数（Declined 为真）的 Decline 不重复计 Errors、不再上抛；
  // 非 Decline 的真错仍照旧上抛（本入口本轮不改诊断行为），因此 Strict=false 时本段是零影响。
  try {
    shell.DirectSession.Ingest(shell.Data, context);
  } catch (error) {
    if (!shell.DirectSession.Declined) {
      throw error;
    }
  }
}
return shell;
```
