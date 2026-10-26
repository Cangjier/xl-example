# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { StatementScanResult } from "./statement-scanner.xl.md"
import { StatementScanner } from "./statement-scanner.xl.md"
import { StatementBuilder } from "./statement-builder.xl.md"
```

# namespace cangjie

# class StatementScan

## field Start:int = -1

## field Checked:int = -1

## field Status:int = 0

## field End:int = -1

## field Code:Array<Token> = []

## field CodeAt:Array<int> = []

# class StatementPossibleShape extends PossibleShape

```txt
;
{ }
let x = 1;
if (a) b; else c;
while (a) b;
do b; while (a);
for (let i = 0; i < 3; i++) { b; }
for (x in o) b;
for (x of o) b;
return a;
break lbl;
throw e;
debugger;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
const itemStart = ItemUtil.ItemStartCached(units, cache);
// 显式分流（设计 §3.2，T1d）：本候选只做 `StatementRoute.Legacy` 家族。`ShellPlainExpression` 起点归
// `RootExpressionStatementPossibleShape`、`ShellVariable` 归 `VariableStatementPossibleShape`，这里主动
// `Reject`，不靠「谁先 Accept」——两边同时 Accept 会让 `CatalogGuide` 永远等不到唯一候选（AST 不变，但
// 语句永远建不出来）。`None` = 路由还没判出（只有 trivia / 首代码单元未到）：**不能** Reject，否则候选会被
// `CatalogGuide` 永久删除（token-ast 28 个 crash 的根因），继续走下面的状态机等下一格。
if (StatementRouteUtil.EnableShellExpressions) {
  const route = StatementRouteUtil.Decide(units, tokenIndex);
  if (route !== StatementRoute.Legacy && route !== StatementRoute.None) {
    return ShapeStates.Reject;
  }
  // [XL-B3c] incremental 模式：`const enum` 的路由落在 `Legacy`（`const` 不在绑定位），
  // 让位给 `EnumDeclarationPossibleShape` 提前挂壳；false 时本段不执行（legacy 逐字节不变）。
  if (StatementRouteUtil.IsIncrementalShapesEnabled() && route === StatementRoute.Legacy) {
    const b3cHeadAt = ItemUtil.NextCode(units, itemStart);
    if (b3cHeadAt >= 0 && b3cHeadAt < units.length && units[b3cHeadAt] instanceof Common
      && (units[b3cHeadAt] as Common).Is("const")) {
      const b3cNextAt = ItemUtil.NextCode(units, b3cHeadAt + 1);
      if (b3cNextAt < units.length && units[b3cNextAt] instanceof Common
        && (units[b3cNextAt] as Common).Is("enum")) {
        return ShapeStates.Reject;
      }
    }
  }
} else {
  // 熔断关闭：逐字保留 Wave1 原型 A 的内联分流（legacy 路径必须与 Wave1 完全等价，双路对拍才有意义）。
  if (itemStart < units.length) {
    const headAt = ItemUtil.NextCode(units, itemStart);
    if (headAt < units.length && units[headAt] instanceof Common) {
      const headText = (units[headAt] as Common).TempToString();
      if (headText === "let" || headText === "const" || headText === "var") {
        const bindingAt = ItemUtil.NextCode(units, headAt + 1);
        if (bindingAt < units.length && StatementScanner.StartsBinding(units, bindingAt)) {
          return ShapeStates.Reject;
        }
      }
    }
  }
}
let state = cache.GetState<StatementScan>(name);
if (state === null || state.Start !== itemStart) {
  state = new StatementScan();
  state.Start = itemStart;
  state.Checked = -1;
  cache.SetState(name, state);
}
if (state.Checked !== tokenIndex + 1) {
  // `Code` / `CodeAt` 放在状态里**只追加**：`Checked` 已经扫过的前缀不再重建，只 push 新单元。
  // 只有「换条目」（状态刚重建、数组本来就是空）或防御性的回退越界才清空重扫——
  // 那两种情况下状态里攒的前缀对不上当前下标。
  let from = state.Checked;
  if (from < state.Start) {
    from = state.Start;
  }
  if (from > tokenIndex + 1) {
    state.Code.length = 0;
    state.CodeAt.length = 0;
    from = state.Start;
  }
  for (let at = from; at <= tokenIndex; at++) {
    if (!units[at].IsTriviaToken) {
      state.Code.push(units[at]);
      state.CodeAt.push(at);
    }
  }
  const owner = units[tokenIndex].Parent;
  // 「本层到头」有两条证据：宿主已签出（旧判据），或**当前单元之后文档里已经没有内容**
  // （`NextChar` 跳过空白与注释后是空串）。后者让「文件最后一条无分号语句」在它的最后一个
  // 代码单元上就收口，而不是拖到 EOF 哨兵上——拖到 EOF 时终结候选会与它同时成立（§6 B 组）。
  // 有 `;` 的语句不受影响（走各自老路径）；变量语句走 `stopAtEof` 也不受影响。
  const unitEnd = units[tokenIndex].SourceRange.EndIndex;
  StatementScanner.AtEOF = (owner !== null && owner.SourceRange.EndIndex >= 0)
    || (unitEnd >= 0 && StatementScanner.NextChar(units[tokenIndex].SourceRange.Document, unitEnd) === "");
  const result:StatementScanResult = StatementScanner.ScanRoot(state.Code);
  state.Status = result.Status;
  if (result.Status === 1 && result.End >= 0 && result.End < state.CodeAt.length) {
    state.End = state.CodeAt[result.End];
  } else {
    state.End = -1;
  }
  state.Checked = tokenIndex + 1;
}
// **EOF 哨兵：本候选一律让位**（不看「已经建出过几条」，也不看 `Status`）。
// 这一格没有第二种结局：`SourceFileEndPossibleShape` 在 `EndOfFileTokenShape` 上**无条件**
// `Accept`（文件已经不能再长），所以只要本候选还活着，`CatalogGuide` 必然抛
// 「终结候选与其它候选同时成立」——EOF 处「其它候选还活着」不是偶发矛盾，而是**一定**。
// 而未收口的尾段本来就有归属：根终结候选那一支带 EOF 尾段兜底
// （`BuildTrailingDeclaration` 按换行处的声明词切段 / `BuildStatementSegments` 逐条建），
// 边界 token 也是它在这一格建出来的（C04–C06 的既有路径）。
// B2 值后 tag 模板 / B3 行首 `/` / B4 `as T!` / B5 嵌套裸块四个子族共 15 条崩溃都是这个形状：
// 用例以 `declare const …;` 开头，第一跳失败后走 legacy，`ItemStart` 一直是 0（一行都没建出来），
// 于是只认 `state.Start > 0` 的那条旧守卫根本轮不到，`Status === 1` 直接 Accept ⇒ EOF 折在这里。
if (units[tokenIndex] instanceof EndOfFileTokenShape) {
  return ShapeStates.Reject;
}
if (state.Status === 2) {
  return ShapeStates.Reject;
}
if (state.Status === 1) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
const state = cache.GetState<StatementScan>(this.Slot());
return state !== null && state.Status === 1 && state.End >= 0;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const state = catalog.PossibleShapesComputeCache.GetState<StatementScan>(this.Slot());
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
let end = state === null ? tokenIndex : state.End;
if (end < start) {
  end = tokenIndex;
}
if (end > tokenIndex) {
  end = tokenIndex;
}
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
const consumed:Array<Token> = host.Data.slice(start, end + 1);
const builder = new StatementBuilder(host.Template, context);
builder.Load(consumed, pos);
const built = builder.BuildStatement();
if (builder.At !== builder.Units.length) {
  throw new Error("语句没有读完");
}
host.Data.splice(start, end - start + 1, built);
built.Parent = host;
return built;
```
