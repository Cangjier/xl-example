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

```ts
return StatementRouteUtil.IsDeclarationHost(host);
```
