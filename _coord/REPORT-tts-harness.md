# REPORT-tts-harness（T1：构建链 + 逐字符 shape 树目标用例 + 基线）

- 分支：`tts-harness`（从 `feature/all-possible` @ `3a0623c3` 建）
- 克隆：`C:\Users\Admin\Documents\GitHub\xl-example-set\tts-harness`（主仓库只读，未改动）
- 代码提交：`8215eedb`（baseline 父提交 `3a0623c3`）；本报告为随后的文档提交
- 环境：Windows PowerShell 5.1 + node `v24.21.0` + tsc `6.0.3`（`node_modules` 从主仓库复制）
- 状态：**三件事全部完成**（构建成功、工具可运行、基线读数齐全）。无 HANDOFF。

---

## 1. 构建配方（可复现）

本机**没有 `xl` CLI**，用 DSH 的 `xl_build` 工具替代；`cjcli.xl.md` 依赖已删除的 `./dawn/text/*`，
根级全量 build 会 E1006，且 `build/ts/cjcli.js` 本来就不存在（README 第 139 行起有说明），因此
**构建只覆盖 core + typescript**。

```powershell
$dir = "C:\Users\Admin\Documents\GitHub\xl-example-set\tts-harness"
cd $dir

# 第 0 步（一次性）：克隆 + 分支 + 复制 node_modules
#   git clone C:\Users\Admin\Documents\GitHub\xl-example $dir
#   cd $dir; git checkout -b tts-harness
#   Copy-Item -Recurse -Force C:\Users\Admin\Documents\GitHub\xl-example\node_modules "$dir\node_modules"

# 第 1 步：生成 TS 源（xl_build 工具调用，不是 CLI）
#   xl_build { cwd: "$dir", paths: ["core","typescript"], targets: ["ts"] }
#   实测：560 written, 0 skipped, 0 planned, 0 error(s), 3 warning(s)
#   3 条 warning 都是 E1107「类型重复声明」：
#     typescript/tokens/types/class-get-accessor-possible-shape.xl.md  (GetAccessorPossibleShape)
#     typescript/tokens/types/class-index-signature-possible-shape.xl.md (IndexSignaturePossibleShape)
#     typescript/tokens/types/class-set-accessor-possible-shape.xl.md   (SetAccessorPossibleShape)
#   产物：dist/ts/**/*.ts 共 560 个（dist 在 .gitignore）

# 第 2 步：编译
node node_modules/typescript/bin/tsc -p .
#   实测：exit 0，耗时 4.2 s，无任何 tsc 报错；产物 build/ts/**/*.js 共 560 个

# 第 3 步：验产物
#   build/ts/core/syntax/syntax-context.js                                  ✓
#   build/ts/core/syntax/source-range.js                                   ✓
#   build/ts/typescript/run/text-document.js                               ✓
#   build/ts/typescript/run/typescript-template.js                         ✓
#   build/ts/typescript/tokens/files/source-file-shape.js                  ✓
#   build/ts/typescript/tokens/expressions/binary-expression-shape.js      ✓
```

- 两步都幂等：xl_build 按源文件重算、tsc 全量重编；`git status` 在构建后仍然干净（`dist`/`build` 均被忽略）。
- **注意**：`xl_build` 的默认 out 是 `dist`，ts 目标落 `dist/ts/`；仓库根 `tsconfig.json` 的
  `rootDir: dist` / `outDir: build` 把 `dist/ts/**` 编成 `build/ts/**`，两者拼起来才是完整链。
- 未做、也不要做的：把 `cjcli.xl.md` 纳入构建；运行 `npm run gates` / `tests/gates/run.mjs`。

---

## 2. 目标用例工具

文件：`tests/parse/token-time-shapes.mjs`（新）
夹具：`tests/parse/token-time-shapes/let-x.ts` = `let x = 2*3+1`，**13 字节、无尾随换行**
稳定期望：`tests/parse/token-time-shapes/let-x.expected.txt`（从文档 `text` 围栏块**逐节原文抽取**，未做任何修正）
脚本：`package.json` 新增 `"tts": "node ./tests/parse/token-time-shapes.mjs ./tests/parse/token-time-shapes/let-x.ts --diff"`
说明：`tests/parse/token-time-shapes/README.md`

### 用法

```powershell
node tests/parse/token-time-shapes.mjs <file.ts>                    # 打印整棵逐字符树
node tests/parse/token-time-shapes.mjs <file.ts> --diff             # 与稳定期望文件逐节比对
node tests/parse/token-time-shapes.mjs <file.ts> --diff --from-doc  # 直接与 docs 文档比对
node tests/parse/token-time-shapes.mjs <file.ts> --diff --json      # JSON（树 + 比对结果）
node tests/parse/token-time-shapes.mjs --sync-expected              # 从文档重新抽取稳定期望文件
npm run tts                                                         # 基线命令（= 上面第 2 条）
```

退出码：0 全一致 / 1 有差异 / 2 工具或环境错误。单次 `--diff` 实测 **0.45 s**，两次运行输出逐字节相同（确定性已实测）。

### 驱动口径（严格按任务书 + 核实过的 API）

1. `TypescriptTemplate.Create()` → `new SourceFileShape(template)` → `new SyntaxContext(shape, 32)` → `new TextDocument(source, name)`；
2. `for i in [0, count)`：`context.ProcessRange(context.Root, new SourceRange(document, i, i+1), i)`，然后 dump；
3. 循环结束后模拟 `SyntaxContext.Process` 的 EOF 收尾（`core/syntax/syntax-context.xl.md` `method Process`）：
   `context.Index = count` → `context.Root.SignOut(count)` →
   `context.Root.Process(context, new SourceRange(document, count, count), count)` → `context.DrainMessages()`，再 dump 最后一步。
4. 任何一步抛异常 → 该步记 ERROR、停止推进（不会假装后面的步骤通过）。

### dump 字段来源（全部来自运行时对象真实字段，已实测）

| 输出字段 | 来源 | 说明 |
| --- | --- | --- |
| 类名 `<ClassName>` | `node.constructor.name` | 运行时类名即期望里的名字 |
| `pos=<n>` | `node.Pos` | **只有 shape 有**（数字，`-1` → 打印 `pos=-`）；basic token 上 `Pos` 是 `undefined`，因此**整段省略 `pos=`**（与文档 char0–4 的 basic 单元一致；这一条由 char0–4 全 PASS 反证） |
| `src=[a,b)` | `node.SourceRange.Start/.End` | `End < 0` → `未封`；`Start < 0` 未设时按原值打印（当前用例未出现） |
| `text="..."` | basic token：`TempToString()`（内部字段 `Temp`，`Common`/`WrapSymbol`/`Symbol` 共有）；`IdentifierShape`：`EscapedText`；`NumericLiteralShape`：`Text` | 取不到的字段不打印 |
| `op="..."` | 类名以 `TokenShape` 结尾且无 text 的运算符形状（`AsteriskTokenShape`/`PlusTokenShape`…）：`SourceRange` 覆盖的原文切片（`document.GetRaw(start,end)`；`End<0` 时取不到 → 省略） | 文档口径「由 src 切片」 |

其他：子节点只走 `node.Data`（文档开头「只有一个 Data，没有 Raw」）；缩进按 `├─`/`└─` + `│  `/`   ` 生成；
比对是**逐行全等**，`--diff` 输出每步 PASS/FAIL、首个差异（块内行号 + 期望/实际两行）与差异行数。

### 期望文件的生成与漂移

`--sync-expected` 从 `docs/expected-token-time-shapes.md` 抽取 14 节（char 0–12 + EOF）写入稳定文件，
并立刻用同一解析器读回自检（实测 OK）。`--diff --from-doc` 与 `--diff` 当前读数完全一致（6/8/14），
说明稳定文件与文档没有漂移。**后续分包不要为了让 diff 变绿而改 `let-x.expected.txt`**；
若认为文档错了，改文档 + 重跑 `--sync-expected`，并在报告里说明。

---

## 3. 基线读数（`tts-harness` @ `8215eedb`，即 `feature/all-possible` 现状）

`npm run tts` → **PASS 6 / FAIL 8 / 共 14 步**（exit code 1）。

> 步数更正：任务书写「15 步（14 char + EOF）」，但 `let x = 2*3+1` 是 **13** 个字符，
> 文档只有 char 0–12 共 13 节 + EOF 共 **14 节**，且文档 EOF 节 `src=[0,13)` 自证长度 13。
> 基线按实际 **14 步** 统计。

| 步 | 字符 | 结果 | 差异行数 | 首个差异（期望 → 实际） |
| --- | --- | --- | --- | --- |
| char 0 | `"l"` | PASS | – | – |
| char 1 | `"e"` | PASS | – | – |
| char 2 | `"t"` | PASS | – | – |
| char 3 | `" "` | PASS | – | – |
| char 4 | `"x"` | PASS | – | – |
| char 5 | `" "` | FAIL | 5 | 第 2 行：`└─ VariableStatementShape  pos=0  src=[0,未封)` → `└─ StatementShape  pos=0  src=[0,未封)` |
| char 6 | `"="` | FAIL | 6 | 第 2 行：同上（层类型不对，且后续行结构不同） |
| char 7 | `" "` | FAIL | 7 | 第 2 行：同上 |
| char 8 | `"2"` | FAIL | 8 | 第 2 行：同上 |
| char 9 | `"*"` | FAIL | 9 | 第 2 行：同上 |
| char 10 | `"3"` | FAIL | 11 | 第 2 行：同上 |
| char 11 | `"+"` | FAIL | 12 | 第 2 行：同上 |
| char 12 | `"1"` | FAIL | 14 | 第 2 行：同上 |
| EOF | – | **PASS** | – | – |

### 现状与期望的差距摘要（供分包）

- **char 0–4 已完全一致**：`let` 逐个字符收进 `Common`、空格进 `WrapSymbol`、`x` 进 `Common`，根下平铺，与文档一致。
- **char 5–12 全部失败，且首个差异都在第 2 行**：现状在 `x` 收口时建的是通用壳 `StatementShape`，
  之后每一步都把 basic token（`Common`/`WrapSymbol`/`Symbol`）**平铺**挂在 `StatementShape.Data` 下，
  **不做**文档要求的「原位替换 / 移入子形状」：
  - 缺 `VariableStatementShape → VariableDeclarationListShape → VariableDeclarationShape` 三层；
  - 缺 `IdentifierShape`、`NumericLiteralShape`；
  - 缺 `BinaryExpressionShape(*)` / `BinaryExpressionShape(+)` 的增量建树与封口（`src=[8,11)`）；
  - 缺 `AsteriskTokenShape` / `PlusTokenShape` 的运算符形状与 `op` 字段。
- **EOF 已完全 PASS（12 行树与文档逐字节一致）**：收尾时现状能产出文档要的最终树
  （`VariableStatementShape → … → BinaryExpressionShape(+)`，区间 `[0,13)`、`[8,11)`、`[8,13)` 全对）。
  也就是说**最终形态的建造能力已经在，缺的是「逐字符增量地长成它」**；分包验收应以 char 5–12 的中间态为主，
  同时把 EOF 作为不许回归的守门步（现在就是绿的，不能被改红）。

### 逐字符实际树（char 5 / 12 / EOF，直接从工具输出摘录）

```text
## char 5
SourceFileShape  pos=-  src=[0,未封)
└─ StatementShape  pos=0  src=[0,未封)
   ├─ Common  src=[0,3)  text="let"
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ Common  src=[4,5)  text="x"
   └─ WrapSymbol  src=[5,6)  text=" "

## char 12
SourceFileShape  pos=-  src=[0,未封)
└─ StatementShape  pos=0  src=[0,未封)
   ├─ Common  src=[0,3)  text="let"
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ Common  src=[4,5)  text="x"
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ Symbol  src=[6,7)  text="="
   ├─ WrapSymbol  src=[7,8)  text=" "
   ├─ Common  src=[8,9)  text="2"
   ├─ Symbol  src=[9,10)  text="*"
   ├─ Common  src=[10,11)  text="3"
   ├─ Symbol  src=[11,12)  text="+"
   └─ Common  src=[12,13)  text="1"

## EOF（与文档完全一致）
SourceFileShape  pos=-  src=[0,13)
└─ VariableStatementShape  pos=0  src=[0,13)
   └─ VariableDeclarationListShape  pos=0  src=[0,13)
      └─ VariableDeclarationShape  pos=3  src=[4,13)
         ├─ IdentifierShape  pos=3  src=[4,5)  text="x"
         └─ BinaryExpressionShape  pos=7  src=[8,13)
            ├─ BinaryExpressionShape  pos=7  src=[8,11)
            │  ├─ NumericLiteralShape  pos=7  src=[8,9)  text="2"
            │  ├─ AsteriskTokenShape  pos=9  src=[9,10)  op="*"
            │  └─ NumericLiteralShape  pos=10  src=[10,11)  text="3"
            ├─ PlusTokenShape  pos=11  src=[11,12)  op="+"
            └─ NumericLiteralShape  pos=12  src=[12,13)  text="1"
```

---

## 4. 文档可疑点（不改期望，只记录）

1. **步数口径**：任务书写 15 步（14 char + EOF），实际是 13 字符 + EOF = **14 步**；
   文档自己的 EOF `src=[0,13)` 和字符标尺（0–12）都证明长度 13。建议后续统一按 14 步统计。
2. **char 11 期望块里混入行尾注释**：`docs/expected-token-time-shapes.md` 第 151 行
   `├─ BinaryExpressionShape  pos=7  src=[8,11)   ← 3 关闭即封口` —— 这行注释在 ```text 围栏块**内部**，
   严格逐行比对时它必然造成差异（它不是 shape 字段）。工具**不裁剪期望**，只在「去掉注释后完全一致」时额外标注
   `仅差文档行尾内嵌注释`；当前 char 11 结构本来就差，所以这条暂未单独触发。建议文档把这句注释移到围栏外。
3. **`pos` 的含义依赖歧义**：文档定义 `pos`=AST 起点（含前导 trivia），如 `IdentifierShape pos=3 src=[4,5)`。
   EOF 现状与文档一致，说明实现口径相同；但 `SourceFileShape` 的 `Pos` 恒为 `-1`（文档记 `pos=-`），
   属于「根不设 pos」的约定，不是缺陷，记录以免分包误当 bug。
4. **文档声明「样本不一定完全正确」**：本工具刻意只报告差异；若分包发现某节期望与「合理增量语义」冲突，
   应先与 Lead 确认改文档，而不是改稳定期望文件。
5. 文档没有给 `WrapSymbol` / `Symbol` / `Common` 的 `pos`，与实现一致（basic token 无 `Pos`）；已按运行时事实处理。

---

## 5. 已知边界 / 限制

- 工具只覆盖 `Root.Data` 的 shape 树；不 dump `Parent` / `MountedUnit` / `CatalogGuide` 等内部字段（文档没要求）。
- `op` 依赖 `src` 切片；若某步运算符形状 `End < 0`（未封），`op` 会省略——当前用例未出现。
- `text` 的探测顺序是 `TempToString()`（仅 `IsBasicToken === true`）→ `EscapedText` → `Text`；
  将来新增带文本的 shape 若用别的字段名，需要在这里补一行（工具会漏 text 而不是崩）。
- 遇到抛异常的步骤会停止推进并报 ERROR，不会伪造后续步骤。
- 步进窗口固定 1 字符（`ProcessRange` 每次 `[i, i+1)`），这是「逐字符」的硬口径；`BufferSize` 传 32 不影响（窗口由调用方给）。
- 未运行任何既有 gate（`tests/gates/run.mjs` / `npm run gates` 等），本阶段禁用。

---

## 6. 交付物清单

| 文件 | 状态 |
| --- | --- |
| `tests/parse/token-time-shapes.mjs` | 新增（工具，531 行） |
| `tests/parse/token-time-shapes/let-x.ts` | 新增（13 字节夹具） |
| `tests/parse/token-time-shapes/let-x.expected.txt` | 新增（文档抽取件，14 节，166 行） |
| `tests/parse/token-time-shapes/README.md` | 新增（用法/格式/注意） |
| `package.json` | 修改：新增 `"tts"` 脚本 |
| `_coord/REPORT-tts-harness.md` | 本报告 |

约束遵守：未改 `typescript/IMPORTANCE.md`；未改 `core/syntax/basic-tokens/` 下任何文件；
未修 `cjcli.xl.md`；未运行任何既有 gate；未 push 到任何远端。

## 7. HANDOFF

无（T1 完成）。给后续分包的交接要点：

- 每个独立克隆都要先按 §1 跑一遍 `xl_build` + `tsc`，否则工具会以退出码 2 报「构建产物缺失」。
- 验收命令：`npm run tts`（或 `node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff`）；
  期望仍为 **char 0–4 PASS、char 5–12 FAIL（中间态）、EOF PASS**，分包完成后目标应为 **14/14 PASS**（除 char 11 的文档内嵌注释外）。
- 若 char 11 只剩注释差异，工具会标注「仅差文档行尾内嵌注释」并仍计 FAIL——这是文档问题，**不要**为此改稳定期望文件。
- 构建产物不进 git；不要提交 `dist/` / `build/`。
