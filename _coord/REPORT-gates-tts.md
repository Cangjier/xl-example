# REPORT gates-tts — 重构后首次统一 gates 全量测试（G1）

- 日期: 2026-10-26
- 角色: 验收成员（G1，只报告，不修代码）
- 被验收分支: `refactor/token-time-shapes` @ `b9b47f21cfe02989809e0fd811512a1d08340d76`
  （含 T1/T2/WP-A/WP-B/WP-C 全部重构）
- 工作分支: `gates-tts`（从 `refactor/token-time-shapes` 建，本报告是它唯一的新增提交）
- 验收克隆: `C:\Users\Admin\Documents\GitHub\xl-example-set\gates-1`
- canonical: `C:\Users\Admin\Documents\GitHub\xl-example`（只作为克隆源；全程未 checkout、未改动、未在其中构建）
- 结论一句话: **11 道门 4 通过 / 0 失败 / 7 不适用，exit 0；无 FAIL，因此无需基线对比，无回归信号。**

## 1. 环境

| 项 | 值 |
| --- | --- |
| OS | Windows（PowerShell 5.1 / pwsh 执行） |
| node | v24.21.0 |
| typescript | 6.0.3（来自 canonical 的 `node_modules`，`Copy-Item` 复制） |
| CPU | 16 核（gates 自报「11 路，16 核」） |
| 克隆方式 | `git clone C:\...\xl-example gates-1`，再 `git fetch <canonical> refactor/token-time-shapes` 后 `git checkout -b gates-tts` |
| 说明 | canonical 里该分支只存在于本地 `refs/heads/refactor/token-time-shapes`（无 `origin/refactor/token-time-shapes` 远程跟踪引用），所以用 `git fetch <路径> <分支>` 取得后建分支；HEAD 已核对为 `b9b47f21` |

```
$ git rev-parse HEAD
b9b47f21cfe02989809e0fd811512a1d08340d76
$ git status --porcelain        # 构建后、写报告前
（空）
```

## 2. 构建

### 2.1 xl_build（DSH 工具）

调用：`cwd=<克隆>`、`paths=["core","typescript"]`、`targets=["ts"]`、**不传 out**（走仓库 `xl.json` 的 `build.out = "dist"`）。

```
xl build — 566 written, 0 skipped, 0 planned, 0 error(s), 3 warning(s)
```

3 条 warning 全部是既有 E1107（同名类型在多页声明），与预期一致：

```
typescript/tokens/types/class-get-accessor-possible-shape.xl.md:16: warning[E1107]: type "GetAccessorPossibleShape" is also declared in typescript/tokens/types/get-accessor-possible-shape.xl.md
typescript/tokens/types/class-index-signature-possible-shape.xl.md:16: warning[E1107]: type "IndexSignaturePossibleShape" is also declared in typescript/tokens/types/index-signature-possible-shape.xl.md
typescript/tokens/types/class-set-accessor-possible-shape.xl.md:16: warning[E1107]: type "SetAccessorPossibleShape" is also declared in typescript/tokens/types/set-accessor-possible-shape.xl.md
```

落盘：`dist/ts/**` 566 个 `.ts`（另有 `dist/ts/.xl/cache.json` 一个缓存文件，故 `dist` 下共 567 个文件）。

### 2.2 tsc

```
$ node node_modules/typescript/bin/tsc -p .
tsc exit: 0
build/** 文件数: 566
```

**构建读数与预期完全一致：566 产物 / 0 error / 3 个既有 E1107 warning，tsc exit 0。**
（`dist` 与 `build` 均在 `.gitignore` 中，构建不污染工作区；`git status --porcelain` 为空。）

## 3. 目标用例卫生检查（重构后，作为对照）

| 命令 | 模式 | 读数 | exit | 判断 |
| --- | --- | --- | --- | --- |
| `npm run tts`（= `node ./tests/parse/token-time-shapes.mjs ./tests/parse/token-time-shapes/let-x.ts --diff`） | legacy（`EnableIncrementalVariableShapes = false`） | **PASS 6 / FAIL 8 / 14 步** | 1 | 与 legacy 基线预期一致，不是失败 |
| `node tests/parse/token-time-shapes.mjs ./tests/parse/token-time-shapes/let-x.ts --diff --incremental` | incremental（`= true`） | **PASS 14 / FAIL 0 / 14 步**（其中 1 步仅差文档内嵌注释，计 PASS） | 0 | 与预期一致 |

legacy 红的位置与原因就是「增量未开启」，首个差异稳定出现在 char 5：

```
[FAIL] char 5  " "
       首个差异：第 2 行
         期望: └─ VariableStatementShape  pos=0  src=[0,未封)
         实际: └─ StatementShape  pos=0  src=[0,未封)
```

incremental 的唯一 `[annotation-only]` 出现在 char 11 `"+"`（仅模板注释不同，按既有口径计 PASS）。
两条读数与任务给出的期望**逐项一致**，说明重构后的目标产物没有走样。

## 4. 统一 gates（重构后首次全量跑）

`npm run gates` 走通了默认路径：`tests/gates/run.mjs` 内部用 `child_process.spawn ... stdio: ["ignore","pipe","pipe"]`
抓子进程输出，**本机未出现 EPERM / pipe 受限**，因此不需要降级为「逐门直接 node 跑」。
为留证据，默认与 `--verbose` 各跑一次，两次判定完全相同。

```
$ npm run gates -- --jobs 11
11 道门并行跑（11 路，16 核）：runtime:check · runtime:cli · cases:tsast · cases:direct ·
direct:lint · samples · cases:check · wide-ast · real-dts-ast · coverage · cpp:check
...
11 道门：4 道通过、0 道失败、7 道不适用（NOT-APPLICABLE，按跳过计）；墙钟 8.2s
gates exit: 0
```

### 4.1 门表（name / 判定 / 读数摘要）

| # | 门 | 判定 | 耗时 | 读数摘要 |
| --- | --- | --- | --- | --- |
| 1 | `runtime:check` | **N/A** | — | `runtime 不存在（执行引擎的源目录 runtime/ 不在本仓库（诊断 §5））` |
| 2 | `runtime:cli` | **N/A** | — | `tsrun.xl.md 不存在（运行时入口 tsrun.xl.md 不在本仓库（诊断 §5））` |
| 3 | `cases:tsast` | **N/A** | — | `typescript/print-ast-common.xl.md 不存在（TS 形状投影的源页不在本仓库）` |
| 4 | `cases:direct` | **N/A** | — | 同上（`typescript/print-ast-common.xl.md` 不存在） |
| 5 | `direct:lint` | **PASS** | 0.4s | `第三出口的约定 0 条违反（不回原文查、不按字符串键查、ctx 出口表里没有兜底出口、投影对 token 只读属性不调方法、这一格的正文自己答、按坐标切正文也走这一格自己、helper 的形参表就是它需要什么、这一格是不是某一类 / 一个名字 / 一个二元或逻辑运算单元 / 哪一态括号 / 那个感叹号 / 一条成员访问链 / 一次非空断言 / 一次方法调用 / 一段泛型括号段 / 有哪些段 / 哪些子单元进投影 全由被问的那一页答、含 trivia 的完整子单元表不回到 token 页上、成对符号的位置由 token 自己记、字符串正文由 token 自己答、声明里没有 any、投影读的每一格都在某一页显式声明过、已知是 string 的名字不再拷一遍）`；逐项计数均为 **0 处** |
| 6 | `samples` | **N/A** | — | `dawn 不存在（cjcli.xl.md 依赖 ./dawn/text/*.xl.md，本仓库没有 dawn/（全仓 xl build 报 E1006））` |
| 7 | `cases:check` | **PASS** | 0.7s | `1720 条用例，0 条不合格` |
| 8 | `wide-ast` | **PASS** | 8.0s | `语料 2511 个文件（node_modules .d.ts=226、dist/ts .ts=566、samples .ts=3、tests/cases/token .ts=1716）；跳过 TS 非法 11；解析成功 2500、崩溃 0；AST 完全一致 2500、有差异 0；四方向：缺/多出来 0 条、区间漂移 0 条、字段名 0 条；地基：缺 range 0 处、区间越界 0 处、未映射 0 处` |
| 9 | `real-dts-ast` | **PASS** | 3.9s | `real-dts: 文件 226（跳过 TS 非法 0）：解析成功 226、崩溃 0；AST 完全一致 226、有差异 0` |
| 10 | `coverage` | **N/A** | — | `typescript/print-ast-common.xl.md 不存在（同 #3/#4）` |
| 11 | `cpp:check` | **N/A** | — | `dist/cpp 不存在（要 xl_emit 生成 C++ 产物（xl.json 的 build.target 只有 ts））` |

汇总：**11 道门 = 4 PASS + 0 FAIL + 7 NOT-APPLICABLE**，`exit 0`，墙钟 8.2s（`--verbose` 复跑 8.4s，判定相同）。
7 道 N/A 的判据都是「该命令依赖的源 / 产物在本仓库根本不存在」，逐条 `Test-Path` 复核均为 False：
`runtime/`、`tsrun.xl.md`、`typescript/print-ast-common.xl.md`、`dawn/`、`dist/cpp` 全部不存在 —— 与
`tests/gates/run.mjs` 的 `notApplicable` 条件、README 第 208 行附近的「4 道适用门全绿，7 道结构上不适用」一致。

### 4.2 与预期的对照

| 预期（任务书 / README） | 实测 | 一致？ |
| --- | --- | --- |
| 11 道门 | 11 道门 | ✅ |
| 4 道适用门全绿 | `direct:lint` / `cases:check` / `wide-ast` / `real-dts-ast` 全 `ok` | ✅ |
| 7 道结构上不适用（N/A，按跳过计） | 7 道 N/A，且每道理由都打印 | ✅ |
| exit 0 | exit 0 | ✅ |
| `wide-ast` 2505 件量级、差异 0 | 语料 2511 件（跳过 TS 非法 11 → 解析 2500），差异 0 | ✅（数量口径随语料增长，判定不变） |

## 5. FAIL 与基线对比

**本次没有任何 FAIL 门**，因此按任务书 §5 的条件分支，**不需要**建基线克隆
`gates-base`、也不需要逐门对比 canonical `feature/all-possible @ 3a0623c3`。
没有「既有失败」也没有「本次重构引入的回归」需要归因。

## 6. 结论

1. **适用门全绿**：4 道适用门（`direct:lint`、`cases:check`、`wide-ast`、`real-dts-ast`）全部通过；11 道门总判定
   `4 PASS / 0 FAIL / 7 N/A`，exit 0。
2. **无回归信号**：0 道 FAIL，故无基线对比项；构建读数（566 / 0 error / 3 E1107）与目标用例读数
   （legacy 6/8/14、incremental 14/0/14）都与既有预期逐项吻合。
3. **不需要 Lead 派修复成员**：没有要修的门、没有要复现的症状。唯一的既有噪声是 3 条 E1107
   warning（重构前就存在、且是 warning 不是 error），不属于本次验收的判据。
4. **未改动被测内容**：全程只读源码与 gates 脚本；`typescript/IMPORTANCE.md`、`core/syntax/basic-tokens/`
   未触碰；工作区唯一新增是本报告。`git status --porcelain` 干净（报告提交后）。

## 7. 复现命令

```powershell
# 0. 克隆与分支（canonical 上该分支只有本地 ref）
New-Item -ItemType Directory -Force C:\Users\Admin\Documents\GitHub\xl-example-set | Out-Null
git clone C:\Users\Admin\Documents\GitHub\xl-example C:\Users\Admin\Documents\GitHub\xl-example-set\gates-1
cd C:\Users\Admin\Documents\GitHub\xl-example-set\gates-1
git fetch C:\Users\Admin\Documents\GitHub\xl-example refactor/token-time-shapes
git checkout -b gates-tts FETCH_HEAD
git rev-parse HEAD                              # 期望 b9b47f21
Copy-Item -Recurse -Force C:\Users\Admin\Documents\GitHub\xl-example\node_modules .\node_modules

# 1. 构建（两步）
#    1a. xl_build 工具：cwd=<克隆>、paths=["core","typescript"]、targets=["ts"]、不传 out
#        期望：566 written, 0 error(s), 3 warning(s)（E1107 ×3）
node node_modules/typescript/bin/tsc -p .       # 期望 exit 0

# 2. 目标用例（两条对照）
npm run tts                                     # legacy：PASS 6 / FAIL 8 / 14，exit 1（基线，非失败）
node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --incremental
                                                # incremental：PASS 14 / FAIL 0，exit 0

# 3. 统一 gates
npm run gates -- --jobs 11                      # 期望 4 PASS / 0 FAIL / 7 N/A，exit 0，墙钟 ~8s
npm run gates -- --jobs 11 --verbose            # 需要逐门尾部证据时
```
