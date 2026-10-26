# dependencies
```xl
import { Token } from "../../../core/syntax/token.xl.md"
import { StatementRouteUtil } from "../statements/statement-route-util.xl.md"
```

# namespace cangjie

# class DeclarationIncrementalRoute

```txt
class C {}
function f() {}
enum E { A }
namespace N {}
```

## static field Armed:bool = false

## static method Arm:()=>void

```ts
// [E-DECL:ROUTE] WP-B3：增量模式下把**根层 function / class / 装饰器声明**的语句壳路由关掉，让各声明族
// 自己的 legacy 形状候选（`ClassDeclarationPossibleShape` / `FunctionDeclarationPossibleShape` /
// `EnumDeclarationPossibleShape` / `ModuleDeclarationPossibleShape`）提前挂壳——这就是 PLAN §4.1 B3 的
// 「尽早挂壳（正确 legacy 类名 / Pos）」。壳建出来就是 legacy 类名（`ClassDeclarationShape@pos=0` 等），
// 账本按 `(类名,pos)` 立刻能在可见树上看到它；收口仍由各族自己的 `*EndPossibleShape` +
// `BodyGuideUtil.FinishShell` 完成，走的还是**同一批** legacy 建树函数，所以 EOF 树逐节点一致。
//
// 只动 `EnableRootDeclarationShell`（它只门控 Decide 里 function/class/abstract/async/@ 这几个根分支），
// **不动** `EnableDeclarationShell` / `EnableControlFlowShell`：后者会让 import/export 与变量声明的壳路由
// 一起漂移，legacy 模式就不再逐字节一致。`Armed` 只记录「是本类改的」，legacy 模式（或外部把这个开关
// 手动关掉时）按记录恢复，不覆盖别人的实验开关。
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  if (DeclarationIncrementalRoute.Armed) {
    StatementRouteUtil.EnableRootDeclarationShell = true;
    DeclarationIncrementalRoute.Armed = false;
  }
  return;
}
StatementRouteUtil.EnableRootDeclarationShell = false;
DeclarationIncrementalRoute.Armed = true;
```

## static method IsDeclarationHost:(host:Token | null)=>bool

**[S3:NAMESPACE-BODY] 宿主判据的转发点（`declaration-incremental-route` 这一层的唯一入口）。**

本类原来的「根层判据」是隐式的：`Arm()` 把 `EnableRootDeclarationShell` 关掉，于是 `Decide` 里
`function` / `class` / 装饰器声明的语句壳只对**根层**失效，各声明族的 legacy 候选在根目录里提前挂壳。
这一层没有 `host` 形参，所以判据无从参数化。WP-S3 要求「根层判据参数化为 `IsDeclarationHost(host)`」，
落地方式是：**判据本体只有一份，放在 `StatementRouteUtil.IsDeclarationHost`**，本类只做转发，
让声明族的调用点（`interface` / `type` 挂载入口、通用声明壳的导入导出让位）不必各自 import
`statement-route-util` 就能问同一个问题。

宿主为 `null`（没有宿主：`ItemStart` 还没到 / 括号还没建）时返回 `false`——与
`IsDeclarationHost` 逐字同源，不在这里另起一套 null 语义。

```ts
return StatementRouteUtil.IsDeclarationHost(host);
```
