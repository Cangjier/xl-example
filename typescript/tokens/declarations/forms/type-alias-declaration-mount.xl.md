# dependencies
```xl
import { Common } from "../../../../core/syntax/basic-tokens/common.xl.md"
import { ShapeToken } from "../../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { ItemUtil } from "../../item-util.xl.md"
import { TypeAliasDeclarationShape } from "../type-alias-declaration-shape.xl.md"
import { StatementRouteUtil } from "../../statements/statement-route-util.xl.md"
```

# namespace cangjie

# class TypeAliasDeclarationMount

`type` 别名声明族的**尽早占位**入口（WP-B4a）。

```txt
type A = string   ← 语句壳建好那一格，在壳的 Data[0] 挂一个 TypeAliasDeclarationShape 占位（Pos = 壳的 Pos）
```

**为什么别名用占位、而接口直接挂壳**：

- `interface` 的正文是 `{ … }` 花括号：挂上真壳之后，`{` 创建时既有 `InterfaceDeclarationShape.OnBracketCreatedEvent`
  会给它挂上 `InterfaceDeclarationEndPossibleShape`，`}` 关闭那一格就地收口并替换成 legacy 子树——所以接口可以直接
  挂真壳（见 `interface-declaration-mount.xl.md`）。
- `type` 别名的结束点是「`;` / EOF / 换行 ASI」，既没有括号关闭那样的显式触发点，也**没有**现成的终结候选；
  自己在换行 trivia 上收口既可能误拆跨行续接（`type A = B` ⏎ `| C`），又会与 legacy 的 `SourceFileEndPossibleShape`
  重复建树。因此这里改用 B1 已验证的**占位节点**：形状类名 / `Pos` 与 legacy 最终节点相同、`IsTriviaToken = true`
  （`StatementBuilder` / 扫描器 / `ItemUtil` 全部跳过它），收口仍由 legacy 语句壳原路完成——壳被 legacy 子树替换时
  占位节点随之离开，**EOF 树 = legacy 树**，而账本看到的 `TypeAliasDeclarationShape` 首次出现提前到「语句壳建好」那一格。

门控与范围：

- 只在 `StatementRouteUtil.IsIncrementalShapesEnabled()` 为真时动作；false 时 `ShouldMount` 恒 false，
  调用方连占位都不挂 ⇒ legacy 逐字节不变。
- 只认**根层**（宿主 `Parent === null`）且**首代码单元就是 `type`**（`export type` / `declare type` 等前缀形
  仍走既有声明壳，交给 B3/B5）。

## static field MountCount:int = 0

增量路径实际占位过的 type alias 声明数（证据用；不进 AST、不影响判定）。

## static method ShouldMount:(host:Token, tokenIndex:int)=>bool

本格是否是「根层 `type` 别名声明」的建壳格（占位只在此时挂一次）。

```ts
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return false;
}
if (host.Parent !== null) {
  return false;
}
const start = ItemUtil.ItemStart(host.Data);
const headAt = ItemUtil.NextCode(host.Data, start);
if (headAt < 0 || headAt >= host.Data.length || headAt > tokenIndex) {
  return false;
}
const head = host.Data[headAt];
if (!(head instanceof Common)) {
  return false;
}
// route 已经把这个头判成声明族（`type` 与名字之间换行时 route 会交回 legacy，见
// `StatementRouteUtil.DeclinesDeclarationHead`），所以不需要再等名字那一格。
return (head as Common).Is("type");
```

## static method AttachPlaceholder:(shell:Token, context:SyntaxContext)=>void

在语句壳 `Data[0]` 插入 `TypeAliasDeclarationShape` 占位：`Pos` = 壳的 `Pos`（C1 同源），`src.Start` = 首个代码子单元起点，
`IsTriviaToken = true`（解析状态机零扰动）。**返回时壳与占位都不改别的状态**：收口仍走 legacy 语句壳。

```ts
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return;
}
const placeholder = new TypeAliasDeclarationShape(shell.Template);
placeholder.Pos = (shell as ShapeToken).Pos;
let firstStart = -1;
for (const item of shell.Data) {
  if (!item.IsTriviaToken) {
    firstStart = item.SourceRange.StartIndex;
    break;
  }
}
if (firstStart >= 0) {
  placeholder.SignIn(firstStart);
}
placeholder.IsTriviaToken = true;
shell.Data.splice(0, 0, placeholder);
placeholder.Parent = shell;
TypeAliasDeclarationMount.MountCount += 1;
```
