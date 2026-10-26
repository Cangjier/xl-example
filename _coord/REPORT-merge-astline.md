# REPORT merge-astline — ToAstLine 重构合入、全量验收与清理

- 日期: 2026-10-26
- 暂存分支: `refactor/astline`（由 canonical `feature/all-possible` @ `633d22ed` 建）
- 合并工作区: `C:\Users\Admin\Documents\GitHub\xl-example-set\merge-astline`
- canonical: `C:\Users\Admin\Documents\GitHub\xl-example`（全程仅在 `feature/all-possible` @ `633d22edbe8acb06d18b7c7ad108b36ac7cb27ff`，未 checkout、未改工作区；只做 `git branch` / `git push` / `rev-parse`）

## 1. 合并

| 来源 | 分支 | 源 tip | 合并方式 | 合并提交 |
| --- | --- | --- | --- | --- |
| xl-example-set/astline-fix | astline-sites | `1d1fdc3a` | `git merge --no-ff FETCH_HEAD` → `merge(astline): ToAstLine(indent) 取代 ToXmlString` | `5fcf0398` |

- 合并后 HEAD（报告提交前）: `5fcf0398d2b2cc6f8f4ce2f99db5347369800c82`
- 合并提交双亲: `633d22ed`（staging 基点）+ `1d1fdc3a`（astline-sites tip）✅
- 合并规模: 59 files changed, 2938 insertions(+), 2220 deletions(-)
- 该分支已内含 `84b2cf15`（W1 渲染器）、`325dbaa0`（AstOperator src 兜底）、`15e3f1ec`（W2 调用点/工具）、`28c72439`+`1d1fdc3a`（语料基线最终版）、`_coord/REPORT-astline-{core,fix,sites}.md` 与 `CONTRACT-astline.md`；**未单独合 `astline-core`**。

## 2. 冲突

**无冲突。** `ort` 策略自动完成，`git diff --name-only --diff-filter=U` 为空；`git status --porcelain` 空。

## 3. 构建

- `xl_build`（cwd=merge-astline, paths=["core","typescript"], targets=["ts"], 不传 out）:
  **566 written / 0 skipped / 0 planned / 0 error / 3 warning**（warning 均为既有 `E1107` 重复类型声明：`class-get-accessor-possible-shape`、`class-index-signature-possible-shape`、`class-set-accessor-possible-shape`）。
- `node node_modules/typescript/bin/tsc -p .`: **exit 0**，无输出。
- 生成物核对: `dist/ts/core/syntax/token.ts:196` 与 `build/ts/core/syntax/token.js:171` 均为 `ToAstLine(indent)`，无 `ToXmlString`。

## 4. 验收（五项全过）

| # | 命令 | 结果 |
| --- | --- | --- |
| a | `npm run tts`（legacy） | **PASS 6 / FAIL 8 / 14**，exit 1，`[PASS] EOF`；FAIL 为 char 5–12 的既有 legacy 基线差距，与预期一致 |
| b | `npm run tts:incremental` | **PASS 14 / FAIL 0 / 14**，exit 0；char 11 `+` 标注 `[annotation-only]`（允许，计 PASS） |
| b2 | 同命令再跑一次，逐字节比对 | **两次 stdout 完全一致**；SHA-256 均为 `185764124364E1788DB3B8DAC6A1D3079993BA25EBA137ACD2CF43C8D7732CE2`；长度均 1634 字节；stderr 均 0 字节；两次 exit 0 |
| c | `npm run tts:corpus` | **1723 / 1723 一致，差异 0（变化 0 / 缺失 0 / 新增 0）**，解析异常 7，exit 0，耗时 1.48s |
| d | `rg -n "ToXmlString" --glob '*.xl.md' --glob '*.mjs'`（排除 dist/build/node_modules） | **0 命中**（rg exit 1 = 无匹配）；反向 sanity: `ToAstLine` 在 7 个 `.xl.md` 中命中 |
| e | `git status --porcelain` | **干净**（0 行；dist/build 被忽略） |

说明: 机器 PATH 上无 `rg`，改用 DSH 自带 ripgrep（`...\DeepSeek Harness\resources\app.asar.unpacked\dsh\node_modules\@vscode\ripgrep-win32-x64\bin\rg.exe`），flags 与要求完全一致（`-n`、两个 include glob、三个 `!dist/** !build/** !node_modules/**` 排除）。未运行任何既有 gate（`npm run gates` 未执行），按要求留给下一位验收成员。

## 5. 推送

- `git push C:\Users\Admin\Documents\GitHub\xl-example HEAD:refs/heads/refactor/astline`（本地路径远程，新建分支）。
- canonical 侧验证: `git -C <canonical> rev-parse refactor/astline` 与本地 HEAD 一致。验证输出见交付回复。

## 6. 清理

先 Test-Path 精确核对，再逐个删除：

```
C:\Users\Admin\Documents\GitHub\xl-example-set\astline-core   : Test-Path(pre)=True
C:\Users\Admin\Documents\GitHub\xl-example-set\astline-sites  : Test-Path(pre)=True
C:\Users\Admin\Documents\GitHub\xl-example-set\astline-fix    : Test-Path(pre)=True
C:\Users\Admin\Documents\GitHub\xl-example-set\merge-astline  : Test-Path(pre)=True
```

`merge-astline` 必须在最后一次 push 验证通过后、且 shell 已离开该目录时才删除（顺序原因：报告提交与推送仍需它）。四项删除后的复核与 `xl-example-set` 空目录、canonical 无 `astline-*` 分支的结果记录于交付回复。

## 7. 异常

1. 机器 PATH 无 `rg`（见 §4 说明），用 DSH 内置 ripgrep 等价替代，命中数 0。
2. `xl_build` 的 3 条 warning 为既有基线（非本次合并引入）。
3. 无其它异常；无冲突、无验收失败。
