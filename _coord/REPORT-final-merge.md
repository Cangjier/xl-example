# 最终合并与全量复验报告

- 仓库：`C:\Users\Admin\Documents\GitHub\xl-example`（canonical）
- 分支：`feature/all-possible`
- 日期：2026-10-26
- 结论：**全部验收通过，合并已落盘，已清理。**

## 1. 结论摘要

| 项目 | 读数 | 判定 |
| --- | --- | --- |
| xl_build（force，core+typescript→ts） | 566 written / 0 error / 3 warning | 符合预期 |
| tsc -p . | exit 0，build/ts 566 个 .js | 符合预期 |
| `npm run tts`（legacy 基线） | PASS 6 / FAIL 8 / 14，exit 1 | 符合预期（legacy 基线，非失败） |
| `npm run tts:incremental` | **PASS 14 / FAIL 0 / 14**，exit 0 | 达标 |
| `npm run tts:corpus` | 1723 / 1723 文件，差异 0，exit 0 | 达标 |
| `npm run gates -- --jobs 11` | 4 PASS / 0 FAIL / 7 N/A，exit 0 | 达标 |

## 2. 分支与提交

| 名称 | SHA |
| --- | --- |
| canonical 合并前 HEAD（`feature/all-possible`） | `3a0623c31d5c9d7528394f1ba2c63a2b9b70eb06` |
| 暂存分支 `refactor/token-time-shapes`（初始） | `b9b47f21cfe02989809e0fd811512a1d08340d76` |
| **暂存分支最终 SHA**（两次收尾合并后） | `a1aaf9c76c675a5bb7072c84ce75c66523fb08c2` |
| **合并 commit**（`--no-ff`，合入 `feature/all-possible`） | `368291fa7bb438e25b9a00cde8406a1b8c65d3bf` |
| 本报告提交（docs） | 本文件所在提交，即最终 `feature/all-possible` HEAD |

合并 commit message：`merge(tts): basic tokens → shape 增量过程重构（目标用例 14/14，gates 全绿）`

> `3a0623c3` 是 `a1aaf9c7` 的祖先，因此使用 `--no-ff` 强制生成真正的合并提交，未产生快进。

## 3. 收尾交付的两次合并

在独立克隆 `C:\Users\Admin\Documents\GitHub\xl-example-set\merge-final` 中完成，**未触碰 canonical 工作区**：

| 步骤 | 来源 | 结果 SHA | 冲突 | 变更 |
| --- | --- | --- | --- | --- |
| checkout 暂存分支 | canonical `refactor/token-time-shapes` | `b9b47f21` | — | — |
| 合并 1 | `xl-example-set\tts-wp-e` 的 `tts-wp-e` @ `5ba766cd` | `59212547c7655465034de8a38d209b3b4ef495e8` | **无** | 5 文件：新增 `_coord/REPORT-tts-final.md`、`docs/token-time-shapes-incremental.md`；改 `_coord/CONTRACT-tts-incremental.md`、`package.json`（新增 `tts:incremental` / `tts:corpus`）、`tests/parse/token-time-shapes/README.md` |
| 合并 2 | `xl-example-set\gates-1` 的 `gates-tts` @ `35aef0c1` | `a1aaf9c76c675a5bb7072c84ce75c66523fb08c2` | **无** | 1 文件：新增 `_coord/REPORT-gates-tts.md` |

两次合并均无冲突（两份交付的改动文件集合不相交）。
推送：`git push <canonical> HEAD:refs/heads/refactor/token-time-shapes` → `b9b47f21..a1aaf9c7`，canonical 的 ref 与本地 HEAD 一致（校验通过）。

### 3.1 merge-final 快速验收（合并后、推送前）

| 项目 | 读数 | 判定 |
| --- | --- | --- |
| xl_build（force） | 566 written / 0 error / 3 warning | 符合 |
| tsc -p . | exit 0，566 个 .js | 符合 |
| `npm run tts` | 6 / 8 / 14，exit 1 | 符合（基线） |
| `npm run tts:incremental` | 14 / 0 / 14，exit 0 | 达标 |
| `npm run tts:corpus` | 1723 / 1723，差异 0，exit 0 | 达标 |
| `git status --porcelain` | 空 | 干净 |

## 4. canonical 全量复验（最终）

在 `feature/all-possible` @ `368291fa` 上，按配方 xl_build `force:true` 全量重生成：

| # | 项目 | 命令 | 读数 | 退出码 |
| --- | --- | --- | --- | --- |
| 1 | 构建生成 | xl_build（cwd=canonical, paths=[core,typescript], targets=[ts], force:true） | **566 written / 0 error / 3 warning(E1107 既有)** | — |
| 1b | 编译 | `node node_modules/typescript/bin/tsc -p .` | build/ts **566** 个 .js | **0** |
| 2 | legacy 基线 | `npm run tts` | **PASS 6 / FAIL 8 / 14**（char 11 `+` 亦为 FAIL） | **1**（基线，不是失败） |
| 3 | 增量目标 | `npm run tts:incremental` | **PASS 14 / FAIL 0 / 14**，char 11 标 `[annotation-only]` | **0** |
| 4 | 语料回归 | `npm run tts:corpus` | 当前 **1723** / 基线 **1723**（解析异常 7），一致 **1723**，差异 **0**（变化 0 / 缺失 0 / 新增 0） | **0** |
| 5 | 门禁 | `npm run gates -- --jobs 11` | **11 道门：4 通过 / 0 失败 / 7 不适用**，墙钟 8.2s | **0** |

3 个 E1107 warning 为既有告警（同名类型重复声明），非本次引入：

- `typescript/tokens/types/class-get-accessor-possible-shape.xl.md:16` — `GetAccessorPossibleShape` 与 `get-accessor-possible-shape.xl.md` 重复
- `typescript/tokens/types/class-index-signature-possible-shape.xl.md:16` — `IndexSignaturePossibleShape` 与 `index-signature-possible-shape.xl.md` 重复
- `typescript/tokens/types/class-set-accessor-possible-shape.xl.md:16` — `SetAccessorPossibleShape` 与 `set-accessor-possible-shape.xl.md` 重复

## 5. gates 门表（逐门判定）

| # | 门 | 判定 | 耗时 | 依据 |
| --- | --- | --- | --- | --- |
| 1 | `direct:lint` | **ok** | 0.5s | 第三出口约定 0 条违反（27 条检查全过） |
| 2 | `cases:check` | **ok** | 0.7s | 1720 条用例，0 条不合格 |
| 3 | `wide-ast` | **ok** | 8.0s | 宽尺子：全部解析成功、崩溃 0、AST 逐节点一致、地基 0 处 |
| 4 | `real-dts-ast` | **ok** | 3.5s | 真实 `.d.ts` 全量解析成功且 AST 逐节点一致 |
| 5 | `runtime:check` | N/A | — | `runtime/` 不在本仓库（诊断 §5） |
| 6 | `runtime:cli` | N/A | — | 运行时入口 `tsrun.xl.md` 不在本仓库（诊断 §5） |
| 7 | `cases:tsast` | N/A | — | `typescript/print-ast-common.xl.md` 不存在（全仓无匹配页） |
| 8 | `cases:direct` | N/A | — | 同上（TS 形状投影源页不在本仓库） |
| 9 | `samples` | N/A | — | `dawn/` 不存在（`cjcli.xl.md` 依赖 `./dawn/text/*.xl.md`，xl build 报 E1006） |
| 10 | `coverage` | N/A | — | `typescript/print-ast-common.xl.md` 不存在 |
| 11 | `cpp:check` | N/A | — | `dist/cpp` 不存在（`xl.json` 的 `build.target` 只有 `ts`） |

不适用（N/A）是「命令所依赖的源 / 产物在本仓库根本不存在」，按跳过计，不是放过真实失败；清单与 `tests/MIGRATION.md` 一致。

## 6. 清理

### 6.1 待清理对象与执行前基线

| 对象 | 类型 | Test-Path（删除前） |
| --- | --- | --- |
| `C:\Users\Admin\Documents\GitHub\xl-example-set\gates-1` | 交付克隆 | **True** |
| `C:\Users\Admin\Documents\GitHub\xl-example-set\tts-wp-e` | 交付克隆 | **True** |
| `C:\Users\Admin\Documents\GitHub\xl-example-set\merge-final` | 合并克隆 | **True** |
| `refactor/token-time-shapes` | canonical 本地分支 | 存在 @ `a1aaf9c7`（已合入 `feature/all-possible`） |

### 6.2 删除顺序与安全前提

1. 先确认推送成功：canonical 的 `refactor/token-time-shapes` = `a1aaf9c7` = merge-final HEAD。
2. 确认当前工作目录不在 `merge-final` 内（cwd=`C:\Users\Admin\Documents\GitHub\xl-example`）。
3. 依次删除三个文件夹，删除后逐个 `Test-Path` 复核。
4. `git -C <canonical> branch -d refactor/token-time-shapes`（已合并，`-d` 应成功；若被拒则改用 `-D` 前需说明）。
5. 终态：`Get-ChildItem C:\Users\Admin\Documents\GitHub\xl-example-set` 计数 0；`git branch --list` 无 `tts-*` / `refactor/token-time-shapes` 残留；canonical 仍在 `feature/all-possible` 且 `git status --porcelain` 为空。

### 6.3 执行结果

| 对象 | Test-Path 删除前 | Test-Path 删除后 | 结果 |
| --- | --- | --- | --- |
| `...\xl-example-set\gates-1` | True | **False** | 已删除 |
| `...\xl-example-set\tts-wp-e` | True | **False** | 已删除 |
| `...\xl-example-set\merge-final` | True | **False** | 已删除 |

- `Get-ChildItem C:\Users\Admin\Documents\GitHub\xl-example-set` 计数：**3 → 0**（目录为空）。
- 删除前已确认：推送成功（canonical 的 `refactor/token-time-shapes` = `a1aaf9c7` = merge-final HEAD）；当前工作目录为 canonical，**不在** `merge-final` 内；三个目标路径经 `GetFullPath` 断言等于预期值且位于 `xl-example-set\` 之下。
- 暂存分支：`git branch -d refactor/token-time-shapes` → `Deleted branch refactor/token-time-shapes (was a1aaf9c7).`（exit 0）。
- 残留检查：`git branch --list` 中**无** `tts-*`，**无** `refactor/token-time-shapes`。
- canonical 终态：分支 `feature/all-possible` 保持检出，`git status --porcelain` 为空，`dist/` 与 `build/ts/` 被 gitignore，不进入工作区脏文件。

## 7. 异常

- 无阻塞异常。
- 说明 1：本机无 `xl` CLI，且根级 `cjcli.xl.md` 依赖已删除的 `./dawn/*`，全仓 `xl build` 必失败；因此构建配方固定为「xl_build 工具 + core/typescript → ts」+ `tsc`，与既往验收口径一致。
- 说明 2：`npm run tts` 的 FAIL 8 是 legacy 模式下的既有基线（基本 token 阶段尚未产出 statement 形状），不是回归；达标口径是 `tts:incremental` 的 14/14。
- 说明 3：`tts:incremental` 中 char 11（`+`）为 `[annotation-only]`：仅文档内嵌注释不同，计 PASS，这是本次重构的既定预期。
- 说明 4（操作注意）：本仓库 `.git/info/exclude` 第 8 行含 `/_coord/`，该目录下**新**文件对 `git status` 不可见，`git add -A` 不会收录本报告。本报告与既往 11 份 `_coord/*.md` 一样以 `git add -f` 显式加入；已跟踪文件不受该 exclude 影响。

## 8. 复现命令

```powershell
$c = 'C:\Users\Admin\Documents\GitHub\xl-example'
# 1) 全量重生成（DSH xl_build 工具等价参数）
#    cwd=$c, paths=["core","typescript"], targets=["ts"], force:true  → 566 written / 0 error / 3 warning
# 2) 编译
Set-Location $c; node node_modules/typescript/bin/tsc -p .        # exit 0
# 3) 三项验收
npm run tts                 # PASS 6 / FAIL 8 / 14, exit 1（基线）
npm run tts:incremental     # PASS 14 / FAIL 0 / 14, exit 0
npm run tts:corpus          # 1723 / 0 差异, exit 0
# 4) 门禁
npm run gates -- --jobs 11  # 4 PASS / 0 FAIL / 7 N/A, exit 0
```
