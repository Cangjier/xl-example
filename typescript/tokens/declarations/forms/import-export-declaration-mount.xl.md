# dependencies
```xl
import { Common } from "../../../../core/syntax/basic-tokens/common.xl.md"
import { Bracket } from "../../../../core/syntax/basic-tokens/bracket.xl.md"
import { Symbol } from "../../../../core/syntax/basic-tokens/symbol.xl.md"
import { ShapeToken } from "../../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { ItemUtil } from "../../item-util.xl.md"
import { ImportDeclarationShape } from "../import-declaration-shape.xl.md"
import { ExportDeclarationShape } from "../export-declaration-shape.xl.md"
import { ReloadMessage } from "../../../../core/syntax/messages/reload-message.xl.md"
import { StatementRouteUtil } from "../../statements/statement-route-util.xl.md"
```

# namespace cangjie

# class ImportExportDeclarationMount

import / export 声明族的**尽早挂壳**入口（WP-B5，Phase B 试点）。

判据与门控：

- 只在 `StatementRouteUtil.IsIncrementalShapesEnabled()` 为真时动作；false 时 `TryBuild` 一步不走、返回 `null`，
  调用方（`DeclarationStatementPossibleShape.BuildByIndex`）逐字落到原 `super.BuildByIndex` ⇒ legacy 逐字节不变。
- 只认**根层**（宿主 `Parent === null`）的 `import` / `export` 声明族；块体里的同名形态仍走原声明壳路径。
- 只接管本 WP 声明的形态（`import` 声明全族、`export { … }` / `export * …` 导出声明族）；其余形态
  （`export class` / `export default function` / `export declare const` 等声明前缀形）返回 `null`，
  留给既有声明壳（那是 B3/B4 的目标，不在本 WP 写域）。

做法：把首代码单元到当前格搬进族形状（`ImportDeclarationShape` / `ExportDeclarationShape`），形状自己的
`CatalogGuide`（`ImportClausePossibleShape` / `NamedImportsPossibleShape` / … / `ImportDeclarationEndPossibleShape`）
从这一格起逐单元建子形状，收口仍由既有 end-possible 负责。EOF 树与 legacy 逐节点一致（节点类名 / 层级 / Pos）。

```txt
import a from "m";     ← 第 2 个代码单元处挂 ImportDeclarationShape
export { a } from "m"  ← 第 2 个代码单元处挂 ExportDeclarationShape
```

## static field MountCount:int = 0

增量路径实际接管过的声明数（证据用；不进 AST、不影响任何判定）。

## static method TryBuild:(host:Token, tokenIndex:int, context:SyntaxContext)=>Token | null

```ts
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return null;
}
if (host.Parent !== null) {
  return null;
}
const start = ItemUtil.ItemStart(host.Data);
const headAt = ItemUtil.NextCode(host.Data, start);
if (headAt >= host.Data.length || headAt > tokenIndex) {
  return null;
}
const head = host.Data[headAt];
if (!(head instanceof Common)) {
  return null;
}
const headText = (head as Common).TempToString();
if (headText !== "import" && headText !== "export") {
  return null;
}
const secondAt = ItemUtil.NextCode(host.Data, headAt + 1);
if (secondAt >= host.Data.length || secondAt > tokenIndex) {
  // 第二个代码单元还没到：本族判不出形态，等下一格（不建壳、不 throw）。
  return null;
}
const second = host.Data[secondAt];
if (headText === "import") {
  // `import(` / `import.meta` 是表达式语句（路由不会走到本族），这里只是防御。
  if (second instanceof Bracket && (second as Bracket).StartBracketChar === "(") {
    return null;
  }
  if (second instanceof Symbol && (second as Symbol).Is(".")) {
    return null;
  }
  // `import x = …` 是 import-equals（legacy 路由），不走本入口。
  if (second instanceof Symbol && (second as Symbol).Is("=")) {
    return null;
  }
  const shape = new ImportDeclarationShape(host.Template);
  return ImportExportDeclarationMount.Mount(host, shape, start, secondAt, tokenIndex, context);
}
// export：`export = …` / `export as namespace …` 是两条恢复形（legacy 路由），不走本入口。
if (second instanceof Symbol && (second as Symbol).Is("=")) {
  return null;
}
if (second instanceof Common && (second as Common).Is("as")) {
  return null;
}
if (second instanceof Symbol && (second as Symbol).Is("*")) {
  const shape = new ExportDeclarationShape(host.Template);
  return ImportExportDeclarationMount.Mount(host, shape, start, secondAt, tokenIndex, context);
}
if (second instanceof Bracket && (second as Bracket).StartBracketChar === "{") {
  const shape = new ExportDeclarationShape(host.Template);
  return ImportExportDeclarationMount.Mount(host, shape, start, secondAt, tokenIndex, context);
}
// `export class` / `export default` / `export declare` / `export const` …：声明前缀形，留给既有声明壳。
return null;
```

## private static method Mount:(host:Token, shape:ShapeToken, start:int, secondAt:int, tokenIndex:int, context:SyntaxContext)=>ShapeToken

```ts
let pos = 0;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const previousEnd = host.Data[at].SourceRange.EndIndex;
    if (previousEnd >= 0) {
      pos = previousEnd;
    }
    break;
  }
}
// 只搬「能安全灌进目录」的前缀（首代码单元到第二个代码单元）：族形状的目录要在**第二格**判一次，
// 之后的单元（`from` / `"m"` / `;` …）已经在字符流里被吃过、不会再被逐格喂给形状，
// 所以把它们**卸下来、按字符区间重放**回父单元——父单元的挂载单元已经是本形状，重放会重新落进来。
// 不这么做就会把 `from` 一起塞进目录的第一次判定（`tail = from` ⇒ `ImportClausePossibleShape` 只能
// `Uncertain`，随后 `"m"` 一到它被永久 `Reject`，子句再也建不出来）。
const lastPrefix = secondAt > tokenIndex ? tokenIndex : secondAt;
const consumed:Array<Token> = host.Data.slice(start, lastPrefix + 1);
host.Data.splice(start, consumed.length);
let replayStart = -1;
let replayEnd = -1;
if (lastPrefix < tokenIndex) {
  const leftover:Array<Token> = host.Data.slice(start, start + (tokenIndex - lastPrefix));
  for (const item of leftover) {
    // 只重放**代码**区间：重放是按字符下标走的，从空白开头重放会让父单元先处理一段空白
    // （空白收尾会 `TryToClose` 父单元的最后一个子单元，把还没开始吃的形状当场关掉）。
    if (item.IsTriviaToken) {
      continue;
    }
    if (replayStart < 0 && item.SourceRange.Start >= 0) {
      replayStart = item.SourceRange.StartIndex;
    }
    if (item.SourceRange.End >= 0) {
      replayEnd = item.SourceRange.EndIndex;
    }
  }
  host.Data.splice(start, leftover.length);
  // 被卸下来的单元不进树，但**要把它们的 `Parent` 改到本形状**：触发本格的往往是「闭合括号」那一拍，
  // 它紧接着会 `Quit()`（`Token.Quit` 无条件把 `Parent.MountedUnit` 置 null）。残留的 Parent 还指着根时，
  // 这一下会把刚挂上的形状从根上摘掉，随后的重放又落回根 —— 形状再也吃不到后面的单元。
  for (const item of leftover) {
    item.Parent = shape;
  }
}
for (const item of consumed) {
  shape.Add(item);
}
const begin = consumed[0].SourceRange.Start;
if (begin >= 0) {
  shape.SignIn(begin);
}
// C1 口径：Pos = 前一个非 trivia 单元的 EndIndex（首个为 0）。
shape.Pos = pos;
host.Data.splice(start, 0, shape);
shape.Parent = host;
host.MountedUnit = shape;
ImportExportDeclarationMount.MountCount += 1;
// 已经搬进形状的单元不会再被单独问一次：补一次目录计算，让 clause / named imports 等子形状从这一格起建。
shape.ComputePossibleShapes(context);
if (replayStart >= 0 && replayEnd > replayStart) {
  context.Messages.push(ReloadMessage.FromRange(host, replayStart, replayEnd));
}
return shape;
```
