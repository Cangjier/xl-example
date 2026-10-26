# REPORT merge-3 — WP-B / WP-C 合并、构建、验收与清理

- 日期: 2026-10-26
- 暂存分支: `refactor/token-time-shapes`
- 合并起点: `58f80f23`（merge-2 后的 staging）
- 合并工作区: `C:\Users\Admin\Documents\GitHub\xl-example-set\merge-stage`
- canonical: `C:\Users\Admin\Documents\GitHub\xl-example`（全程仅在 `feature/all-possible` @ `3a0623c3`，未 checkout、未改动工作区；只做 `git push` 与 `rev-parse`）

## 1. 合并

| 来源 | 分支 | 源 tip | 合并方式 | 合并提交 |
| --- | --- | --- | --- | --- |
| xl-example-set/tts-wp-b | tts-wp-b | `18d66eaf` | `git merge --no-ff` → `merge(tts): WP-B 变量声明三层增量` | `70a756e6` |
| xl-example-set/tts-wp-c | tts-wp-c | `1082fb20` | `git merge --no-ff` → `merge(tts): WP-C 表达式增量与二元封口` | `bf1b450d` |

合并后 HEAD（报告提交前）: `bf1b450d401bfd91d90ec6b482ebd84ca4744106`

验证 C 已含 B: `git -C tts-wp-c merge-base --is-ancestor 18d66eaf HEAD` → exit 0。

提交图（git log --graph --oneline -18）:

`
*   bf1b450d merge(tts): WP-C 表达式增量与二元封口
|\
| * 1082fb20 fix(tts): EOF 收尾前关闭已建表达式尾单元（14/14）
| * 5112523a feat(tts): 表达式增量 + 二元运算与封口（char 9-12）
| *   5ff0ab33 chore(tts): 引入 WP-B 三层
| |\
| * \   27c2ee4c chore(tts): 引入 WP-A 契约与开关
| |\ \
* | \ \   70a756e6 merge(tts): WP-B 变量声明三层增量
|\ \ \ \
| | |_|/
| |/| |
| * | | 18d66eaf feat(tts): 变量声明三层增量（char 5-8）
| * | |   952261ed chore(tts): 引入 WP-A 契约与开关
| |\ \ \
| | |/ /
| |/| /
| | |/
* | | 58f80f23 docs(coord): merge-2 report - 追加推送验证与交付摘要
* | | 1829f36b docs(coord): merge-2 report - WP-A 合并、构建与 tts 读数
* | |   8fcdf654 merge(tts): WP-A 契约/开关/Identifier 工厂/工具扩展
|\ \ \
| |/ /
|/| /
| |/
| * d35736b5 feat(tts): C 契约 + 增量开关 + Identifier 工厂 + 目标工具扩展
|/
* 5ced7ace docs(coord): merge-1 report - push and cleanup results
`

内容核对: `git diff --stat 1082fb20 HEAD` 只多出 `_coord/REPORT-merge-2.md`（+205 行，staging 早已含、C 分支未含），其余完全一致 → 合并后内容 = C 的 14/14 成果 + merge-1/2 报告，无内容丢失。

## 2. 冲突

**无冲突。** 两次 `--no-ff` 合并均由 `ort` 策略自动完成（WP-B: 6 文件 +418/-4；WP-C: 9 文件 +673/-7）。

## 3. 构建

- `xl_build`（cwd=merge-stage, paths=["core","typescript"], targets=["ts"], 不传 out）:
  **12 written / 554 skipped / 0 error / 3 warning**，合计 566 个产物；3 条 warning 均为既有 `E1107` 重复类型声明（class-get-accessor / class-index-signature / class-set-accessor possible-shape）。
- `node node_modules/typescript/bin/tsc -p .`: **exit 0**（约 4.1s）。

## 4. 验收

| # | 命令 | 结果 |
| --- | --- | --- |
| a | `npm run tts`（legacy） | **PASS 6 / FAIL 8 / 14，exit 1**（与预期一致；FAIL 为 char 5-12 的 legacy 基线差距） |
| b | `node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --incremental` | **PASS 14 / FAIL 0 / 14，exit 0**；char 11 标注 `[annotation-only]`（允许） |
| c | 与 b 相同命令再跑一次，逐字节比对 | **两次 stdout 完全一致**；SHA-256 均为 `8ACCEF0F1814F0812792D7BEA6C3EAFA8068E515E875D4A2595BC19A3FCB6166`；长度均 715 字节；stderr 均 0 字节；第二次 exit 0 |
| d | `node tests/parse/token-time-shapes.mjs --legacy-corpus tests/cases/token` | **1723 / 1723 一致，差异 0（变化 0 / 缺失 0 / 新增 0）**，exit 0，耗时 1.23s |
| e | `git status --porcelain` | **干净**（dist/build 被忽略，无输出） |

补充: 未运行任何既有 gate（`npm run gates` / `tests/gates/**` 全部禁用），按要求留给后续成员统一跑。

## 5. 推送

- `git push C:\Users\Admin\Documents\GitHub\xl-example HEAD:refs/heads/refactor/token-time-shapes`（本地路径远程，fast-forward）。
- 第一次推送（合并提交 `bf1b450d401bfd91d90ec6b482ebd84ca4744106`）后 canonical `refactor/token-time-shapes` = `bf1b450d401bfd91d90ec6b482ebd84ca4744106`，与本地 HEAD 一致 ✅。
- 本报告作为独立 docs 提交再次 fast-forward 推送；推送后 staging 最终 sha 见交付回复。

## 6. 清理

先 Test-Path 精确核对，再逐个删除已合并的分支文件夹：

C:\Users\Admin\Documents\GitHub\xl-example-set\tts-wp-a : Test-Path(pre)=True
C:\Users\Admin\Documents\GitHub\xl-example-set\tts-wp-b : Test-Path(pre)=True
C:\Users\Admin\Documents\GitHub\xl-example-set\tts-wp-c : Test-Path(pre)=True

删除后复核:

C:\Users\Admin\Documents\GitHub\xl-example-set\tts-wp-a : Test-Path(post)=False
C:\Users\Admin\Documents\GitHub\xl-example-set\tts-wp-b : Test-Path(post)=False
C:\Users\Admin\Documents\GitHub\xl-example-set\tts-wp-c : Test-Path(post)=False

合并工作区 `merge-stage` 在最后一次推送验证通过后删除（顺序原因：报告提交与推送仍需它若删除则无法推送），删除与空目录复核结果记录于交付回复。清理后 `xl-example-set` 下为空目录，canonical 仍为 `feature/all-possible` @ `3a0623c3` 且工作区干净。
