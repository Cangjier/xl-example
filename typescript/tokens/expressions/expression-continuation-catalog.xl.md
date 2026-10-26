# dependencies
```xl
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ExpressionShapeCatalog } from "./expression-shape-catalog.xl.md"
```

# namespace cangjie

WP-D0 的**初始化器续接目录**：声明终结候选（`variable-declaration-end-possible-shape`）在
「它不认识的 `Symbol` / `Bracket` 格上按 C10 显式抛错」之前，先问这里一句：

> `=` 之后的这一格，有没有**已经注册在表达式目录里的形态**认领它？

这是把「逐形态手写白名单」换成「候选自己声明」的唯一入口。之前每加一个形态，都要往
`variable-declaration-end-possible-shape.xl.md` 里塞一条 `if (text === "...")` 分支——37 条 throw 的根因结构
（`_reports/A1-expressions.md` §4.3）。现在 form WP 只在自己的候选文件里覆写
`PossibleShape.ContinuationClaim`，注册仍只有 `expression-shape-catalog` 的 `// [E-CAT:FRAGMENTS]` 一行。

**两条硬约束**

1. **只问「认不认领」，不碰淘汰状态**：本类只调候选的 `ContinuationClaim`，**禁止**调
   `ComputeByIndex`。`ComputeByIndex` 的 `Reject` 是永久的（`CatalogGuide.Candidates` 里被删掉就不再回来），
   在这个「旁路询问」里跑一遍会把活着的候选杀掉。
2. **`false` 就是「没认领」**：本类返回 `false` 时调用方**必须保留原来的显式 `throw`**（C10），
   不允许静默退回、不允许按「暂不支持但继续等」处理。认领 `true` 的语义是**继续等这一格**。

**为什么每次都要新建一份候选**：与 `ExpressionShapeCatalog.CreateDeclarationInitializer` 同口径（§7.4 / C8），
候选对象不进静态缓存、不跨调用复用。`PossibleShape` 本身不持有跨条目状态（判定状态在
`PossibleShapeCache` 的槽里），但目录可能同时挂给多个宿主，新实例是隔离口径最简单的做法。

# class ExpressionContinuationCatalog

## static method Claims:(units:Array<Token>, tokenIndex:int)=>bool

`=` 之后的 `units[tokenIndex]` 这一格，是否被**任何一个已注册候选**认领（`ContinuationClaim` 为真）。

- 遍历 `ExpressionShapeCatalog.CreateDeclarationInitializer()`（与声明层初始化器目录**同一份装配**：
  原子 + 运算符 + `// [E-CAT:FRAGMENTS]` 注册区的全部形态），任一候选认领即返回 `true`；
- 一个都没有 ⇒ `false`（调用方保留 C10 的显式抛错）；
- 越界 / `tokenIndex < 0` ⇒ `false`（没有格子可问）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const shapes:Array<PossibleShape> = ExpressionShapeCatalog.CreateDeclarationInitializer();
for (const shape of shapes) {
  if (shape.ContinuationClaim(units, tokenIndex)) {
    return true;
  }
}
return false;
```
