# T5d — `source:PossibleSource` 第 4 形参：`typescript/tokens/statements/` 的 `*PossibleShape`（排除 T3 文件）

分支 `feature/all-possible-1027-t5d`，基线 `feature/all-possible-1027` @ `c1e64c03`。
只做机械签名迁移（`Compute` / `ComputeByIndex` 第 4 形参），**不改行为**。

## 1. 候选台账

`statements/` 下声明 `PossibleShape` 子类（`extends PossibleShape` 或 `extends ControlFlowStatementPossibleShape`）共 **12** 个文件，其中 **4** 个属 T3（见 §5），本族候选 **8**：

| # | 文件 | `ComputeByIndex` | 结果 |
|---|------|------------------|------|
| 1 | `case-clause-head-possible-shape.xl.md` | 1 处 | ✅ 已加 +import |
| 2 | `case-clause-statement-possible-shape.xl.md` | 1 处 | ✅ 已加 +import |
| 3 | `expression-statement-possible-shape.xl.md` | 1 处 | ✅ 已加 +import |
| 4 | `root-expression-statement-possible-shape.xl.md` | 1 处 | ✅ 已加（import 已有） |
| 5 | `statement-end-possible-shape.xl.md` | 1 处 | ✅ 已加 +import |
| 6 | `variable-statement-possible-shape.xl.md` | 1 处 | ✅ 已加 +import |
| 7 | `waiting-end-possible.xl.md` | 1 处 | ✅ 已加 +import（见 §4 说明） |
| 8 | `declaration-statement-possible-shape.xl.md` | 1 处 | ⛔ **阻塞**（见 §2） |

- **候选 8 / 已改 7 / 阻塞 1**；`## method Compute:` 覆写在 `statements/` 下数量为 **0**（只有 `core/syntax/possible-shape.xl.md` 有），故无 `Compute` 需要迁移。
- 本族 8 个文件的 `ComputeByIndex` 体内都**没有**对 `this.Compute` / `X.ComputeByIndex` 的调用（grep 复核），因此无需「转调透传」：形参只进签名、体不动。
- 每个文件只改 2 行：签名行 +（缺则补）`import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"`。共 7 文件 14 行（净 +7 / −7）。

## 2. 阻塞项（唯一一处，需 T3 先落地）

`DeclarationStatementPossibleShape extends ControlFlowStatementPossibleShape`，而基类 **`control-flow-statement-possible-shape.xl.md` 是 T3 占用文件**，在第 30 行仍是 3 形参。
派生类的覆写**不能多于**基类形参（TS2416：`Target signature provides too few arguments. Expected 4 or more, but got 3.`），所以本文件现在加第 4 形参会直接红掉 `tsc`：

```
dist/ts/typescript/tokens/statements/declaration-statement-possible-shape.ts(35,10):
error TS2416: Property 'ComputeByIndex' in type 'DeclarationStatementPossibleShape' is not
assignable to the same property in base type 'ControlFlowStatementPossibleShape'.
```

**已落地的处理**：本文件**保持原样**（3 形参），分支因此保持绿；T3 把基类改成 4 形参后，按下面这一处补丁补上即可（1 行签名 + 1 行 import，行为仍不变）：

```diff
--- a/typescript/tokens/statements/declaration-statement-possible-shape.xl.md
+++ b/typescript/tokens/statements/declaration-statement-possible-shape.xl.md
@@ -6,2 +6,3 @@
 import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
+import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
@@ -39,3 +40,3 @@
-## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates
+## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates
```

（`core/syntax/possible-shape.xl.md` 第 66 行本来就允许「不需要来源的候选保留少参」，所以即使 T3 落地后不补这一行也**不会**红；补它是为了「全族都收 source」的一致性。）

## 3. 验收证据

| 项 | 命令 | 结果 |
|---|------|------|
| xl build | `xl_build { paths:["core","typescript"], targets:["ts"] }` | **0 error**，3 warning（既有 `E1107` 重复类型：`class-get/index/set-accessor-possible-shape`，与本次无关） |
| 类型检查 | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| 目标用例 | `node tmp/target-cases.mjs` | `cases=30 ok=29 moved=0 diff=0 error=0 fallback=1`，`LastFileFallback=1`（回退后 AST 仍 ok=1），exit 0 |
| 本族 grep | `^## method ComputeByIndex` 含 `source:PossibleSource` | 非 T3 的 **7/7 已改文件**命中；第 8 个为 §2 阻塞项 |
| 编码 | 逐文件首字节 | 全部 **UTF-8 无 BOM**、LF |

未跑 gates（按任务要求）。

## 4. 两处判断说明

- **`waiting-end-possible.xl.md`**：文件名不含 `possible-shape`，但类就是 `# class WaitingEndPossible extends PossibleShape`、在 `statements/` 下、且不在 T3 排除表里，因此按「本族 = `PossibleShape` 子类」纳入并迁移。若按严格文件名通配（`*-possible-shape*`）则它不在 8 个之内，去掉它不影响其余结论。
- **`declaration-statement-possible-shape.xl.md`**：见 §2。它是本族唯一一个父类在 T3 手里的文件；已用类继承关系全仓库复核，`extends ControlFlowStatementPossibleShape` 仅此一处。

## 5. 排除的 T3 文件（13 个，一个字节未动）

`block-possible-shape.xl.md`、`statement-shape.xl.md`、`if-statement-shape.xl.md`、`control-head-possible-shape.xl.md`、`statement-shell-catalog.xl.md`、`statement-possible-shape.xl.md`、`control-flow-statement-possible-shape.xl.md`、`try-statement-shape.xl.md`、`while-statement-shape.xl.md`、`for-statement-shape.xl.md`、`switch-statement-shape.xl.md`、`do-statement-shape.xl.md`、`bracket-create-possible-hook.xl.md`

（其中 4 个是 `PossibleShape` 子类：`block-` / `control-flow-statement-` / `control-head-` / `statement-possible-shape`；它们仍为 3 形参，留给 T3。）

## 6. 未触碰的范围

`expressions/`、`declarations/`、`types/`、`bindings/`、`core/` 一字未改；`git diff --stat` 只有本节 §1 的 7 个文件。
