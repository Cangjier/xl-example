# dependencies
```xl
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
```

# namespace cangjie

表达式候选目录的**唯一装配点**：`VariableDeclarationShape` 在增量模式下要给「初始值」挂一份
`CatalogGuide`，那份目录里的候选从哪来只由这里回答。

# class ExpressionCatalogFactory

表达式候选目录工厂。

**契约（WP-A 建立，WP-C 填充；两边都别在别处另建一份）**

- `VariableDeclarationShape.BuildByIndex`（WP-B）在 `EnableIncrementalVariableShapes` 为真时，
  用 `new CatalogGuide(ExpressionCatalogFactory.Create(), endPossible)` 挂初始值目录，其中
  `endPossible` 是 `VariableDeclarationShape` 自己的终结候选（`;` / ASI / EOF / 逗号边界由它收口）。
- **每次调用都返回新实例**：候选对象不进任何静态缓存、不复用。`PossibleShape` 本身不持有跨条目状态
  （判定状态全部读写 `PossibleShapeCache`，见 `possible-shape.xl.md`），但目录可能被同时挂给多个宿主，
  新实例是最省心的隔离口径；WP-C 不要在这里加 `...Cache` 静态字段。
- **每个候选必须遵守 IMPORTANCE §3.4**：`ComputeByIndex` 里用
  `ItemUtil.ItemStartCached(units, cache)` 取扫描下界（`ItemStartCached` 会经 `PossibleShapeCache` 的
  逐条目槽位记忆，`Reset` 时自动作废）；跨条目的数据只能放 `cache.GetShare` / `SetShare`。
- **候选只做判定与建形状**：`ComputeByIndex` / `IsBuildable` / `BuildByIndex` 三个入口，与目录里
  其它候选同口；建出来的子形状自己 `SignIn` / `SignOut`，父形状只负责收口与建树。
- WP-A 阶段本方法返回空目录（`[]`）：此时增量模式只能解析到「还没有初始值」的形态，
  遇到需要表达式候选的后续单元会由 WP-B 的显式抛错接住（CONTRACT C10）。WP-C 按目标用例
  （`tests/parse/token-time-shapes.mjs` 的 char 8 起）逐个补候选。

## static method Create:()=>Array<PossibleShape>

新建一份表达式候选目录。

```ts
// WP-C 在这里返回候选（每次调用都是新实例，见上方契约）。WP-A 阶段是空目录：
// 还没有任何形状接这个工厂，所以空数组不改变任何模式下的解析结果。
const shapes:Array<PossibleShape> = [];
return shapes;
```
