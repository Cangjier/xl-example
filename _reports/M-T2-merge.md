# M-T2 · 合并 T2 双触发接线

## 1. 结论

| 项 | 读数 |
|---|---|
| 合并前 HEAD | `234edc7c`（工作树干净） |
| 合入 commit | `e8e3baa1`（`feature/all-possible-1027-trigger`，base = `234edc7c`） |
| 合并后 HEAD | **`7dbba777`** `merge(t2): required PossibleSource + bracket-create trigger` |
| 策略 | `git merge --no-ff` + `ort`，**0 冲突**（未手工干预） |
| 规模 | 48 files changed, 485 insertions(+), 110 deletions(-) |
| 三点 diff 预检 | `git merge-base` = `234edc7c` ✅，48 文件，无越界提交 |

## 2. 验证（未跑 gates）

### 2.1 构建

| 项 | 读数 |
|---|---|
| `xl_build(cwd=<main>, paths=["core","typescript"], targets=["ts"])` | **638 written / 0 skipped / 0 error / 3 warning** |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |

3 条 warning 均为既有 E1107 同名类（`GetAccessorPossibleShape` / `IndexSignaturePossibleShape` / `SetAccessorPossibleShape`），与 T2 报告一致，非本次引入。

### 2.2 30 条 target（`node tmp/target-cases.mjs`）

| 开关 | cases | ok | fallback | diff | error | pin-miss |
|---|---|---|---|---|---|---|
| 关（默认） | 30 | **29** | **1**（`026-if-regex-test`） | **0** | **0** | 0 |
| 开 | 30 | **29** | **1**（`026`） | **0** | **0** | 0 |

- T2 分支未带 `tmp/target-on.mjs`（该探针只在 T2 工作副本里，未入库），本回合用等价预加载实现开关打开：`node -r <preload>.cjs tmp/target-cases.mjs`，preload 在解析前置 `StatementRouteUtil.EnableBracketCreatePossible = true`，走的是同一份 `build/ts` 模块实例。验证后已删除该临时文件（`tmp/` 在 `.gitignore` 内）。
- 开关生效性单独取证（`if (a) { const o = { a: 1 } }`，开）：`flag=true hookInstalled=true bridge=3 self=3 parent=0` —— 钩子确实装上、新触发确实在跑，非「开关没打开所以看起来一样」。
- `026` 是唯一 fallback，ts 内允许，按 T2 结论留 T3 修。

### 2.3 契约检查（core / 生成物）

| 检查 | 结果 |
|---|---|
| `grep "cache\.Source"`（整个 `core/`） | **0 命中** ✅（`PossibleShapeCache.Source` 已删除） |
| `PossibleShape.ComputeByIndex` 签名 | `ComputeByIndex(units: Token[], tokenIndex: number, cache: PossibleShapeCache, source: PossibleSource): ShapeStates` ✅ 必填尾参、无默认值 |
| `PossibleShape.Compute` 签名 | `Compute(units: Token[], cache: PossibleShapeCache, source: PossibleSource)`，转给 `ComputeByIndex(units, units.length - 1, cache, source)` ✅ |

### 2.4 5 个 smoke（`tshape-judge ts` → `ts.json`）

| case | source | exit | status | sha256[0:16] |
|---|---|---|---|---|
| smoke-if | `if (a) {}` | 0 | ok | `BB07DA2201FC5087` |
| smoke-add | `const a = x + y` | 0 | ok | `BB07DA2201FC5087` |
| smoke-call | `f(a)` | 0 | ok | `BB07DA2201FC5087` |
| smoke-class | `class A {}` | 0 | ok | `BB07DA2201FC5087` |
| smoke-obj | `const o = { a: 1 }` | 0 | ok | `BB07DA2201FC5087` |

5/5 `status: ok`，SHA 前 16 位全部等于 T1 基线 `BB07DA2201FC5087`（不含 BOM 的 71 字节 `{"status":"ok","structural":[],"moved":[],"fields":[]}`）。临时产物目录 `tmp/t2smoke` 已删除。

## 3. 清理

- `xl-example-set/all-possible-1027-trigger`：先解 `node_modules` **junction**（`cmd /c rmdir`，目标确认为主仓 `xl-example\node_modules`，未跟随删除），再整目录删除；主仓 `node_modules/typescript/package.json` 仍存在 ✅。
- `git update-ref -d refs/merge/t2` ✅（`show-ref --verify` exit 128 = 不存在）。
- `git status --porcelain` 为空 ✅。
- 未 push、未改源码、未建新分支。

## 4. 与 T2 预期的差异

| 项 | 预期 | 实测 |
|---|---|---|
| `xl_build` | 0 error | 0 error ✅ |
| `tsc` | 0 | 0 ✅ |
| 30 target 关/开 | 29/1/0/0 | 29/1/0/0 ✅ |
| 5 smoke SHA16 | `BB07DA2201FC5087` | 同 ✅ |

无偏差。
