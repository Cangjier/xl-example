# dependencies
```xl
import { Common } from "../../../../core/syntax/basic-tokens/common.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { ItemUtil } from "../../item-util.xl.md"
import { InterfaceDeclarationShape } from "../interface-declaration-shape.xl.md"
import { StatementRouteUtil } from "../../statements/statement-route-util.xl.md"
```

# namespace cangjie

# class InterfaceDeclarationMount

`interface` 声明族的**尽早挂壳**入口（WP-B4a，沿用 B5 `ImportExportDeclarationMount` 的最小机制）。

```txt
interface I { a: number }   ← 在名字那一格挂 InterfaceDeclarationShape（legacy 最终类名 / 同 Pos）
```

做法与效果：

1. `DeclarationStatementPossibleShape.BuildByIndex` 在**语句壳路径**上调用本入口；命中时把「声明头（`interface`
   关键字）」这一格起的代码单元搬进 `InterfaceDeclarationShape`，形状挂成宿主的挂载单元，后续单元
   （名字 / 类型参数 / heritage / 接口体）继续落进它的 `Data`。
2. 接口体 `{` 作为子单元创建时，既有 `InterfaceDeclarationShape.OnBracketCreatedEvent` 会给形状挂上
   `CatalogGuide([], new InterfaceDeclarationEndPossibleShape())`；`}` 关闭时既有终结候选按
   `InterfaceDeclarationShape.BuildFromCode(shell, code, shell.Pos, context)` 建出 legacy 子树并把壳替换掉。
   **所以本文件只管「早挂」，收口完全交给既有实现**，不复制任何建树代码。
3. 账本判据：`InterfaceDeclarationShape`（`(类名,pos)`）的首次出现从「语句收口」提前到「声明头」，
   EOF 树仍是 legacy 子树（同一个 `BuildFromCode`、同一个 `Pos`），因此判 `incremental`。

门控与范围：

- 只在 `StatementRouteUtil.IsIncrementalShapesEnabled()` 为真时动作；false 时 `TryBuild` 一步不走、返回 `null`，
  调用方逐字落回 `super.BuildByIndex` ⇒ legacy 逐字节不变。
- 只认**声明宿主**（`StatementRouteUtil.IsDeclarationHost`：根层 `Parent === null`，或模块块的 `{`…`}`），
  且**首代码单元就是 `interface`**（`export` / `declare` / 装饰器前缀形仍走既有声明壳，交给 B3/B5）；
  普通块体 / 函数体里的同名形态不接管（那里由块体目录的通用声明壳负责）。
- 未支持形态不静默吞掉：返回 `null` 即交回既有声明壳（它自己会按 C10 显式 throw 或建树）。

## static field MountCount:int = 0

增量路径实际接管过的 interface 声明数（证据用；不进 AST、不影响判定）。

## static method TryBuild:(host:Token, tokenIndex:int, context:SyntaxContext)=>Token | null

```ts
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return null;
}
// [S3:NAMESPACE-BODY] 宿主判据参数化：根层与**模块块**都是声明宿主（唯一判据在
// `StatementRouteUtil.IsDeclarationHost`）。本 WP 之前这里是 `host.Parent !== null` ——
// 那一句就是「namespace 体内的 interface 永远不建壳」的全部原因。
if (!StatementRouteUtil.IsDeclarationHost(host)) {
  return null;
}
const start = ItemUtil.ItemStart(host.Data);
const headAt = ItemUtil.NextCode(host.Data, start);
if (headAt < 0 || headAt >= host.Data.length || headAt > tokenIndex) {
  return null;
}
const head = host.Data[headAt];
if (!(head instanceof Common)) {
  return null;
}
if (!(head as Common).Is("interface")) {
  return null;
}
// 名字必须已经到达（`interface` 单独一个词不构成声明；route 已经判成本族，这里只做防御）。
const nameAt = ItemUtil.NextCode(host.Data, headAt + 1);
if (nameAt < 0 || nameAt >= host.Data.length || nameAt > tokenIndex) {
  return null;
}
if (!(host.Data[nameAt] instanceof Common)) {
  return null;
}
const shape = new InterfaceDeclarationShape(host.Template);
return InterfaceDeclarationMount.Mount(host, shape, start, tokenIndex, context);
```

## private static method Mount:(host:Token, shape:InterfaceDeclarationShape, start:int, tokenIndex:int, context:SyntaxContext)=>InterfaceDeclarationShape

搬前缀（`start..tokenIndex`，即声明头到当前格）进形状、原位替换、把形状设成宿主的挂载单元，并补一次目录计算。

**为什么这里不需要 B5 的「卸下后半段再重放」**：B5 在**第二个**代码单元才判出形态，那一格之后已经吃过的
字符要还回去；本入口的 `tokenIndex` 就是当前刚关闭的单元，`start..tokenIndex` 全是「已经到齐、且都属于
本声明头」的单元，没有残留。

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
const consumed:Array<Token> = host.Data.slice(start, tokenIndex + 1);
host.Data.splice(start, consumed.length);
for (const item of consumed) {
  shape.Add(item);
}
const begin = consumed[0].SourceRange.Start;
if (begin >= 0) {
  shape.SignIn(begin);
}
// C1 口径：Pos = 前一个非 trivia 单元的 EndIndex（根层首条语句为 0）。
shape.Pos = pos;
host.Data.splice(start, 0, shape);
shape.Parent = host;
host.MountedUnit = shape;
InterfaceDeclarationMount.MountCount += 1;
// 本格已经吃掉、不会再被单独问一次：补一次目录计算，让接口体 / heritage 从这一格起建。
shape.ComputePossibleShapes(context);
return shape;
```
