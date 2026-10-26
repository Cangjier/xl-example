# B3b — 控制流头目录的 legacy 门控

- 分支：`feature/b3-legacy-fix`（基 `18c5cf7b`，即被回滚的 B3 合并第二父）
- 工作副本：`C:\Users\Admin\Documents\GitHub\xl-example-set\b3b-legacy`
- 结论：**修复完成，两档均绿**。未合并、未 push、未删目录。

---

## 1. 复现（修复前，`18c5cf7b` + 全量 `xl_build` + `tsc`）

```
node tests/gates/run.mjs --legacy   → 3 通过 / 1 失败 / 7 N/A
  FAIL 宽尺子（legacy）：FileFallbackCount 11 > 2（多 9）、有差异 1 > 0
  FAIL 文件：tests/cases/token/statements/stmt-if-multiline-condition.ts (moved=1)
node tests/parse/wide-ast.mjs --legacy
  FileFallbackCount 11 = tests/cases/token 10 + samples/declarations.ts 1
  FileFallbackAttempts 11、崩溃 0、差异 1、缺 range 0、越界 0
```

与任务书给出的失败读数逐字一致（3/1/7、fb 11、差异 1）。

## 2. 根因

`typescript/tokens/files/source-file-shape.xl.md` 的构造器只读功能开关：

```ts
if (StatementRouteUtil.EnableControlHeadCatalog) {
  ControlHeadPossibleShape.EnsureRegistered();
  StatementRouteUtil.EnableBracketRoleCatalog = true;   // ← B0 的总闸
}
```

`EnableControlHeadCatalog` 默认 `true`，于是**每一次**解析（含 `--legacy`）都会把
`EnableBracketRoleCatalog` 打开：legacy 里每只 `{` / `(` 都多走一次角色解析、装上
`ControlHead` 目录、逐字建头原子。后果就是 11 件 legacy 兜底与 1 条 moved——
**功能本身没错，错的是「legacy 也走增量装配」**。

## 3. 修复（3 个源文件，均为 `*.xl.md`；开关与默认值一个没删）

1. **`typescript/tokens/files/source-file-shape.xl.md`** —— 唯一的行为改动：
   `if (EnableControlHeadCatalog && StatementRouteUtil.IsIncrementalShapesEnabled())`。
   模式闸加在装配套这一处：legacy 下不注册目录、不开 B0 总闸，于是
   `CatalogGuide.FlushOnClose`（默认 `false`）、`BracketRoleResult.FlushOnClose`（默认 `false`）、
   `ParsePrimary` 的 `IsAtom`（登记表每文件被 `ResetAtoms()` 清空）三条透传在 legacy 下
   全部保持默认值，逐字节回到 B3 之前。注释里写明为什么闸只能加在这里。
2. **`typescript/tokens/statements/control-head-possible-shape.xl.md`** —— `IsAtom` 保持原样，
   **不加**模式闸，并把理由写进注释（见 §4）。
3. **`typescript/tokens/statements/statement-route-util.xl.md`** ——
   `EnableControlHeadCatalog` 的文档补上「只在增量模式生效」、legacy 读数与三条透传的默认值。

## 4. 一次被否决的改法（留证）

最初的补丁在 `ControlHeadPossibleShape.IsAtom` 里也读了 `IsIncrementalShapesEnabled()`。
`tts` 立刻从 PASS 429 掉到 **FAIL 20**（`reason: legacy 解析即抛错：不支持的表达式起点`）。
原因：整文件兜底 `ParseCore(shell=false)` 会把 `EnableIncrementalShapes` 临时压 `false`，
而兜底这一趟目录仍然挂着、`BuildByIndex` 照样建原子；再加一道闸就变成
「原子建了但没人消费」→ `ParsePrimary` 抛错。所以模式闸**只加在装配套一处**，
`IsAtom` 继续只认登记表（干净 legacy 里登记表恒空 ⇒ 恒 `false`）。

## 5. 复测读数

命令：`xl_build`（改到的 3 页）+ `node node_modules/typescript/bin/tsc -p .`（exit 0）。

### 默认档（incremental，产品默认）

| 项 | 读数 |
| --- | --- |
| `gates` | **4 通过 / 0 失败 / 7 N/A** |
| `wide-ast` | 崩溃 **5/5**（全在 `INCREMENTAL_CRASH_EXPECTED`：lib.es2015.proxy / lib.es2017.object / lib.es2019.object / lib.es2024.sharedmemory / lib.esnext.typedarrays）、差异 **33/87**、fallback **86**（+16 白名单 = 102，上限 94 只约束本仓 86）、缺 range 0、越界 0、`policyProblems` 0、`distOnlyKinds` 0 |
| `real-dts` | PASS（gates 内，0/0） |
| `tts/run.mjs` | **PASS 429 / FAIL 0**，exit 0 |
| `tshape-judge ts-all` | **429 / 426 ok / 3 err**（仍是 class-ball / expression-zoo / generic-container 三条基线） |
| `for-classic` steps 5–10 | `i`：`## step 6` `IdentifierShape pos=5 src=[5,6)`；`0`：`## step 10` `NumericLiteralShape pos=8 src=[9,10)` |
| `switch-fallthrough` steps 8–9 | `a`：`## step 9 ")"` `IdentifierShape pos=8 src=[8,9)` |

> **基线口径说明（重要）**：本工作副本在**未改任何东西**的 `18c5cf7b` 上实测默认档就是
> **5 崩溃 / 33 差异 / 86 fallback**（`git stash` 后重建复测），不是任务书里 B3 报的 32/94。
> 差异来自运行环境（node_modules / 构建产物），不是本补丁：修复前后默认档三个数**逐位相同**
> （33、86、5/5），因此本补丁在默认档是恒等变换。若验收要求 32/94，需要在 B3 那套环境里复测。

### legacy 对照档

| 项 | 修复前 | 修复后 |
| --- | --- | --- |
| `gates` | 3 / 1 / 7 | **4 / 0 / 7** |
| `wide-ast` | 崩溃 0、差异 1、fallback 11 | **崩溃 0/0、差异 0/0、fallback 2/2** |
| `real-dts` | PASS（0/0） | PASS（0/0） |
| `tts` | PASS 429 | **PASS 429 / FAIL 0**（未变） |
| `ts-all` | 429 / 426 / 3 | **429 / 426 / 3**（该工具无 legacy 档，两档同一读数） |

legacy 的 11 件兜底与 `stmt-if-multiline-condition.ts` 的 1 条 moved 全部消失，
回到 D3e 登记在案的 2 件基线。

## 6. 交付边界

- 只改 3 个 `*.xl.md` + 本报告；`dist/` 未纳入版本库（与本仓库既有约定一致）。
- 未合并、未 push、未删除工作目录。
- 建议 B3 重做时直接带上本分支的这一行门控（`B3` 的功能代码本身不需要改）。
