# dependencies
```xl
import { Common } from "../../../../core/syntax/basic-tokens/common.xl.md"
import { ShapeToken } from "../../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { ItemUtil } from "../../item-util.xl.md"
import { TypeAliasDeclarationShape } from "../type-alias-declaration-shape.xl.md"
import { BodyGuideUtil } from "../body-guide-util.xl.md"
import { StatementRouteUtil } from "../../statements/statement-route-util.xl.md"
```

# namespace cangjie

# class TypeAliasDeclarationMount

`type` 别名声明族的**早建真壳**入口（WP-B4c，替换 B4a 的 trivia 占位）。

```txt
type T = { a: number; b?: string }   ← `type` 关键字关闭格就挂真壳（legacy 类名 / 同 Pos），
                                        名字 / 类型字面量成员 / 联合成员随后各自在闭合格成形
```

与 B4a 占位的区别（这是本棒的目标 1）：

1. 占位节点 `IsTriviaToken = true`，账本只看得到「类名提前」；真壳是挂载单元，后续单元落进它自己的
   `Data`，`TypeAliasDeclarationShape.ComputePossibleShapes` 才能逐格建名字与类型节点。
2. 收口不再由语句壳 `StatementBuilder` 整段建树，而是 `;` / 换行 ASI / EOF 格调**同一份**
   `TypeAliasDeclarationShape.FromUnits`（legacy 建树函数）把已经建好的子节点消费掉——没有第二套建树路径。
3. 未接管的形态（`export type` / `declare type` / 非声明宿主）返回 `null`，逐字落回既有语句壳与 legacy。

门控与范围与 B4a 相同：只在 `StatementRouteUtil.IsIncrementalShapesEnabled()` 为真、且宿主是声明宿主
（`StatementRouteUtil.IsDeclarationHost`：根层或模块块）时动作；`export` / `declare` 前缀形仍走既有声明壳。

## static field MountCount:int = 0

增量路径实际早建过的 type alias 声明数（证据用；不进 AST、不影响判定）。

## static method TryBuild:(host:Token, tokenIndex:int, context:SyntaxContext)=>Token | null

```ts
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return null;
}
if (!StatementRouteUtil.IsDeclarationHost(host)) {
  return null;
}
const start = ItemUtil.ItemStart(host.Data);
const headAt = ItemUtil.NextCode(host.Data, start);
if (headAt < 0 || headAt >= host.Data.length || headAt > tokenIndex) {
  return null;
}
const head = host.Data[headAt];
if (!(head instanceof Common) || !(head as Common).Is("type")) {
  return null;
}
// 名字必须已经到达（`type` 单独一个词不构成声明；route 已经判成本族，这里只做防御）。
const nameAt = ItemUtil.NextCode(host.Data, headAt + 1);
if (nameAt < 0 || nameAt >= host.Data.length || nameAt > tokenIndex) {
  return null;
}
if (!(host.Data[nameAt] instanceof Common)) {
  return null;
}
const shell = new TypeAliasDeclarationShape(host.Template);
shell.Incremental = true;
BodyGuideUtil.MountShell(host, start, tokenIndex, shell, context);
TypeAliasDeclarationMount.MountCount += 1;
// 本格已经吃掉、不会再被单独问一次：补一次逐格驱动，让名字关闭格从下一格起接上。
shell.ComputePossibleShapes(context);
return shell;
```
