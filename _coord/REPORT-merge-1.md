# REPORT-merge-1：T1 + T2 合并到暂存分支 refactor/token-time-shapes

- 执行者：merge-1（T3）
- 执行时间：2026-10-26（Asia/Shanghai）
- 合并工作区：`C:\Users\Admin\Documents\GitHub\xl-example-set\merge-stage`
- 暂存分支：`refactor/token-time-shapes`
- 结论：**两个分支合并无冲突，构建通过，基线 PASS 6 / FAIL 8 / 14 步复现，两次 `npm run tts` stdout 逐字节一致。**

## 1. 合并前状态

canonical 仓库 `C:\Users\Admin\Documents\GitHub\xl-example`：

- 当前分支：`feature/all-possible`
- HEAD：`3a0623c31d5c9d7528394f1ba2c63a2b9b70eb06`
- 工作区：干净
- 处理：仅用 `git branch refactor/token-time-shapes feature/all-possible` 建分支（未 checkout、未改动其工作区）

暂存分支基线提交 = `3a0623c31d5c9d7528394f1ba2c63a2b9b70eb06`，与两个待合并分支的共同父提交一致。

## 2. 被合并分支（合并前 sha，均已核实）

| 任务 | 分支 | 仓库目录 | HEAD sha |
| --- | --- | --- | --- |
| T1 目标用例工具 + 构建配方 + 基线报告 | `tts-harness` | `C:\Users\Admin\Documents\GitHub\xl-example-set\tts-harness` | `fffb0b8dc9c77eb152e056fc5e70219eb543bb58` |
| T2 差距分析 + 分包方案报告 | `tts-plan` | `C:\Users\Admin\Documents\GitHub\xl-example-set\tts-plan` | `49fdb69522509f499433abe9974d01f3ca65a98c` |

合并前两个工作仓库均 `git status --porcelain` 为空。

T1 提交链：`8215eedb`（目标用例工具 + let-x fixture）→ `fffb0b8d`（T1 报告）
T2 提交链：`49fdb695`（T2 报告）

## 3. 合并操作与结果

在 merge-stage 克隆中执行（均按路径 fetch，不依赖远端名）：

1. `git fetch <tts-harness> tts-harness` → exit 0
   `git merge --no-ff FETCH_HEAD -m "merge(tts): T1 目标用例工具与基线"` → exit 0，生成 `9e587bea2ce0e57aed24ff4e8e05a6d3e13bbb50`
   变更：6 files, +1008 / -1（`_coord/REPORT-tts-harness.md`、`package.json`（新增 tts 脚本）、`tests/parse/token-time-shapes.mjs`、`tests/parse/token-time-shapes/{README.md,let-x.expected.txt,let-x.ts}`）
2. `git fetch <tts-plan> tts-plan` → exit 0
   `git merge --no-ff FETCH_HEAD -m "merge(tts): T2 差距分析与分包方案报告"` → exit 0，生成 `b0207ee125e54e39ce18181e5bd800345d56bbb5`
   变更：1 file, +401（`_coord/REPORT-tts-plan.md`）

**冲突：无。** 两个分支改动文件不重叠，两次合并均由 `ort` 策略直接完成，未进入冲突解决。

合并后 commit 图（HEAD = `b0207ee125e54e39ce18181e5bd800345d56bbb5`）：

```
*   b0207ee1 merge(tts): T2 差距分析与分包方案报告
|\
| * 49fdb695 docs(_coord): T2 现状架构侦察 + 15 步逐字符差距 + 分包方案
* |   9e587bea merge(tts): T1 目标用例工具与基线
|\ \
| |/
|/|
| * fffb0b8d docs(coord): T1 report - build recipe, target tool, 14-step baseline, doc caveats
| * 8215eedb test(parse): add token-time-shapes per-character shape-tree target tool with let-x fixture
|/
* 3a0623c3 docs: 添加关于从 basic tokens 到 shape 的参考文档链接
```

HEAD 父提交：`b0207ee1` ← (`9e587bea`, `49fdb695`)。

## 4. 构建读数

配方：不依赖机器上的 `xl` CLI（本机无），也不构建根级 `cjcli.xl.md`（其依赖的 `./dawn/*` 已删除，根级 build 必失败）。只构建 core + typescript。

### 4.1 xl_build（DSH 工具）

- 调用：`cwd=merge-stage`、`paths=["core","typescript"]`、`targets=["ts"]`，**未传 `out`**（默认 `dist`，传 `out:"build"` 会触发 TS18003）
- 结果：**560 written / 0 skipped / 0 planned / 0 errors / 3 warnings**
- 3 条 warning 均为既有 `E1107`（同一声明重复）：
  - `typescript/tokens/types/class-get-accessor-possible-shape.xl.md:16` GetAccessorPossibleShape
  - `typescript/tokens/types/class-index-signature-possible-shape.xl.md:16` IndexSignaturePossibleShape
  - `typescript/tokens/types/class-set-accessor-possible-shape.xl.md:16` SetAccessorPossibleShape
- 产物：`dist/ts/**`（560 个 .ts，与预期一致）

### 4.2 tsc

- 命令（workdir=merge-stage）：`node node_modules/typescript/bin/tsc -p .`
- 结果：**exit 0**，耗时 **4.7 s**（约 4–5 s，符合预期）
- 产物：`build/ts/**`，共 **560 个 .js**（`rootDir=dist`, `outDir=build`）

说明：`build/ts/cjcli.js` 不存在属预期——根级 `cjcli.xl.md` 未构建（依赖已删除的 `./dawn/*`），本任务只需要 core+typescript 产物。

### 4.3 gitignore 验证

`build`（.gitignore:3）与 `dist`（.gitignore:2）均被忽略；构建后 `git status --porcelain` 为空。

## 5. `npm run tts` 基线读数（必须复现 6/8/14）

脚本（由 T1 加入）：`node ./tests/parse/token-time-shapes.mjs ./tests/parse/token-time-shapes/let-x.ts --diff`

### 第 1 次

- exit code：**1**
- 合计：**PASS 6 / FAIL 8 / 14 步**
- 明细：char 0–4 PASS（"l","e","t"," ","x"），char 5–12 FAIL（" ","="," ","2","*","3","+","1"），EOF PASS
- FAIL 根因（与重构前正确基线一致）：`期望: └─ VariableStatementShape` / `实际: └─ StatementShape`（第 2 行起）

### 第 2 次

- exit code：**1**
- 合计：**PASS 6 / FAIL 8 / 14 步**

### 确定性（逐字节比对）

| 项 | 第 1 次 | 第 2 次 |
| --- | --- | --- |
| stdout SHA-256 | `0ADA44C60DA03068CC39B14F97981E873788AD51152FD71529B11241A13B983B` | `0ADA44C60DA03068CC39B14F97981E873788AD51152FD71529B11241A13B983B` |
| stdout 字节数 | 4040 | 4040 |
| stderr | 空 | 空 |

- 两次 stdout **逐字节一致**（`SequenceEqual` = True，hash 相同）→ 确定性通过。
- 补充：直接调用 `node ./tests/parse/token-time-shapes.mjs ... --diff` 跑两次，stdout 亦逐字节一致（SHA-256 `2B019200C5E15795B8DF9A96D6FD92AAB22C450349EAA0C9EB5D770EB62F127F`）。

## 6. 工作区状态

- 构建与两次 tts 运行之后：`git status --porcelain` **为空**（仅忽略的 dist/build 变化）。
- 未运行任何既有 gate（`npm run gates` 等禁用项）；未改任何源码、期望文件、`typescript/IMPORTANCE.md`、`core/syntax/basic-tokens/`。

## 7. 推送结果

（本次提交后推送，结果见 REPORT-merge-1-push 追加段）

## 8. 清理结果

（推送确认后执行，结果见追加段）

## 9. 异常与备注

- 无合并冲突，无构建错误，无 tts 读数偏差。
- 唯一非零退出码来自 `npm run tts` 自身的基线失败（exit 1），属预期。
- 报告本文件在 `_coord/` 下按任务写入，并随合并分支提交。
