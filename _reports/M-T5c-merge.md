# M-T5c 合并报告 — types/ 的 ComputeByIndex 增加 source:PossibleSource

- 合并引理：`feature/all-possible-1027-t5c` @ `ccd7e8c3`（base `c1e64c03`）
- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`，`feature/all-possible-1027` @ `357fa91f`（合并前工作树干净）
- 合并提交：`3ddc2171e7de70ceab86e052a75edba2c5e98723`（`--no-ff`，提交信息 `merge(t5c): source param for types`）
- 合并基点 = base = `c1e64c03`；三方预检 0 重叠（我方 64 文件改动与该分支 17 文件无一交叉），实际合并 **0 冲突、未手工解冲突**

## 改动范围（17 文件，+88 / -16）
- `typescript/tokens/types/` 下 16 个 `*possible-shape.xl.md`：`ComputeByIndex` 签名追加第 4 个形参 `source:PossibleSource`，并补 `import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"`
- `_reports/T5c.md`（随分支带入）

含 3 对同名（`class-*` 与 `*-possible-shape` 各一声明）：`GetAccessorPossibleShape` / `IndexSignaturePossibleShape` / `SetAccessorPossibleShape`，构建报 `E1107` 警告 3 条，为既有同名基线，非本次引入。

## 构建与验收（合并后）
| 项目 | 命令 | 结果 |
| --- | --- | --- |
| XL 构建 | `xl_build` cwd=repo, targets=`ts` | **0 error / 3 warning**，**16 written** / 623 skipped（恰为这 16 个 .xl.md → dist/ts） |
| TypeScript | `npx tsc` | **exit 0** |
| 目标用例 | `node tmp/target-cases.mjs` | `cases=30 ok=29 moved=0 diff=0 error=0 fallback=1`，exit 0（即 **29/1/0/0**） |
| types/ 计数 | `Select-String typescript\tokens\types\*.xl.md -Pattern 'method ComputeByIndex.*source:PossibleSource'` | **16**（全部 16 个 `ComputeByIndex` 均带该形参）= 16/16 |

`fallback=1` 为 026-if-regex-test 的既有整条文件回退 legacy，回退后 AST 仍逐字一致（`LastFileFallback=1` 其中回退后 AST ok=1），与基线一致。

## 清理
- `node_modules` junction（→ 主仓库 `node_modules`）已用 `rmdir` 解链，确认主仓库 `node_modules/typescript` 完好，随后 `Remove-Item -Recurse -Force` 删除 `all-possible-1027-t5c` 克隆目录
- `git update-ref -d refs/merge/t5c` 已执行
- 未 push / 未建分支 / 未改源码（无冲突可解）
- 构建产物 `dist/`、`build/` 未跟踪，未入库

## 工作树
`git status --short` 为空。

## 备注
`xl` CLI 不在 PATH、亦非 devDependency（`npm run build` 中 `xl build` 报 not recognized），改用等价离线入口 `xl_build`（targets=`ts`）生成 `dist/ts`，再 `npx tsc`；两者与 `build` 脚本的 `xl build && tsc` 等价。
