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
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { StatementEndPossibleShape } from "./statement-end-possible-shape.xl.md"
import { StatementScanner } from "./statement-scanner.xl.md"
import { StatementShape } from "./statement-shape.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
```

# namespace cangjie

# class VariableStatementPossibleShape extends PossibleShape

**变量声明语句起点候选**（可行性原型 A，需求 2：`let` / `const` / `var` 有自己的 possible，不再被
`StatementPossibleShape` 的整段扫描顺带吞掉）。

它只判**起点**：本条目的第一个代码单元是 `let` / `const` / `var`，且关键字之后的下一个代码单元能起绑定
（`StatementScanner.StartsBinding`，与 `ExpressionStatementPossibleShape` / `StatementScanner` 读同一个判据）。
满足时 `Accept`，`BuildByIndex` 建一个 `StatementShape` 壳、把已经攒下的 raw 单元搬进壳、`host.MountedUnit = 壳`；
语句怎么结束、怎么建树全部下放给壳自己的终结候选（`StatementEndPossibleShape`）。

与 legacy 候选的**互斥**（显式分流，不靠「谁先 Accept」）：
- `StatementPossibleShape` 在 `ComputeByIndex` 开头对「`let`/`const`/`var` + 下一格能起绑定」主动 `Reject`；
- `ExpressionStatementPossibleShape` 本来就在绑定格对这类起点 `Reject`（`DualStage` / `CanStart` 判据）；
  关键字格两边都 `Uncertain` 时目录继续等，绑定格一到本候选就是唯一存活者，随即建壳。

只覆盖根层：本候选只注册进 `SourceFileShape` 的根目录，块体里的语句仍由 `StatementBuilder` 原子递归建。

## method HeadText:(units:Array<Token>, start:int)=>string

本条目第一个代码单元的关键字文本；不是 `let` / `const` / `var` 时返回空串（判型只认它们）。

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

关键字之后第一个代码单元的下标；关键字之后没有代码单元就是 `units.length`。

```ts
const headAt = ItemUtil.NextCode(units, start);
if (headAt >= units.length) {
  return units.length;
}
return ItemUtil.NextCode(units, headAt + 1);
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (StatementRouteUtil.Decide(units, tokenIndex) === StatementRoute.ShellDeclarationFamily) {
  // Stage 4r：声明 / 导入导出族由 `DeclarationStatementPossibleShape` 建壳，本 legacy 候选让位。
  // 不 Reject 就会被 `CatalogGuide` 当成「还能长」，与专用候选同格成立而永远等不到唯一候选。
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
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

绑定已经到齐才建壳：关键字格只攒了关键字本身时不建（壳里还得能看见绑定）。

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
  && StatementScanner.StartsBinding(units, bindingAt);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

建壳并挂载：把本条目从 `start` 到 `tokenIndex` 的 raw 单元搬进 `StatementShape`，壳原位插回宿主 `Data`，
`Pos` 按「前一个非 trivia 单元 `EndIndex`」（与 legacy 建语句同一口径）。

```ts
const start = ItemUtil.ItemStart(host.Data);
if (start > tokenIndex) {
  throw new Error("变量声明语句候选没有可搬的单元");
}
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
shell.CatalogGuide = new CatalogGuide([], new StatementEndPossibleShape());
host.Data.splice(start, 0, shell);
shell.Parent = host;
host.MountedUnit = shell;
return shell;
```