# HANDOFF — impl-wp3-32（WP-3 第三十二波：#86 根因定位，源码零改动，AST 保持 6165）

STATUS: **NO-CHANGE / 无回退**。起点 6165/6167（结构 2 / 位置 1 / 字段 0、cj-fail 0），终点**逐项相同**。
本波**没有修改任何 `*.xl.md`**：#86 定位到「BOM 关闭触发 CloseBatch→Flush」这一层，**修复点落在 `core/syntax/batch/**`（本波禁止）**；
#81 按 wp3-30 的方向（KindOf 探针）已证伪，未做新的净负实验。

BRANCH: impl-wp3-32
BASE: impl-wp3-31 @ e4717f83
COMMIT: 本 HANDOFF 的文档提交（无源码提交）

## 0. 读数（本分支实测，2026-10-24）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| 起点复现 | xl_build 全量 + tsc + ast-json + diff | 6165/6167；结构 2 / 位置 1 / 字段 0；cj-fail 0 | 与 wp3-31 逐项相同 |
| 本波终值 | 同上 | **6165/6167**；结构 **2** / 位置 **1** / 字段 0；cj-fail 0 | 无变化、无回退 |
| real-dts | full 档内 | 226 解析成功 / 226 AST 一致 / 崩溃 0 | PASS |
| quick | `..\tools\gates.ps1 -Tier quick` | PASS 5.7s | PASS |
| standard | full 档内 | AST 全量 PASS、body-guide 全量 PASS、tests/gates 1/8（基线 KNOWN-RED） | PASS |
| full | `..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` | 41.3s；real-dts/parse-perf PASS；**3 项红**：buffer-equivalence、class-scaling --base、tests/gates(KNOWN-RED) | AST 硬门 PASS |
| buffer | 同上 | xml **PASS 4489 / FAIL 15 / ERROR 52**；digest **PASS 4385 / FAIL 119 / ERROR 52** | 与 wp3-31 **逐项相同** |
| xl_check | core+typescript | 本波未改 `*.xl.md`（`git status` 源码区干净），基线 0 error / 2414 warning 原样继承 | 未重跑（见 §4.3） |

剩余 2 条：**#86**（结构 1 + 位置 1）、**#81**（结构 1）。

## 1. #86 `const\uFEFFb8 = 3;` — 根因已定位到「BOM 关闭 → CloseBatch → Flush」

### 1.1 实测（临时给 `build/ts/**` 打点，未进提交；下一格 tsc 覆盖）

```
[ENTRY] Start=2 CodeAt=[2]
[ENTRY] Start=2 CodeAt=[2,4]
[ENTRY] Start=2 CodeAt=[2,4,6]
[ENTRY] Start=2 CodeAt=[2,4,6,7]
[CPATH] Start=2 at=3 builtEnd=13 shape=6
[TAIL]  start=0 at=1 data=0:Common:0-5 1:Bom:5-6T 2:ExpressionStatementShape:6-13
```

关键事实（三条，都与 wp3-31 §2.1 的猜测不同）：

1. **`const` 那条 item 从未进入 `Analyze`**：`[ENTRY]` 只出现 `Start=2`（即 `b8`），没有 `Start=0` 的任何一次。
   所以不是 C 路径收口、不是 `CodeAt[lastAt]` 反推失误——**C 路径压根没跑第一条**。
2. **第二条 item 是好的**：`Start=2`、`code=6-8|9-10|11-12|12-13`（`b8`/`=`/`3`/`;`），
   `builtEnd=13 shape=6`，item 区间 [2,8) 与形状右界一致，最终 `ExpressionStatement[6,13]` 正是它。
3. **BOM 是独立的 trivia token，且它在 Data 里**：`1:Bom:5-6T`（`T` = `IsTriviaToken`）。
   FinishBody 时的尾巴是 `[Common(const) 0-5][Bom 5-6][已建好的 ExpressionStatement 6-13]`，
   `BuildTrailingItems(host,0,1)` 只看到 `const`，`BuildTrailingDeclaration` 建不出，
   于是 `BuildStatementSegments` 把 `const` 建成 **空声明列表的 `VariableStatement[0,5]`** —— cj 观测到的形状正是这个。

### 1.2 机制（`core/syntax/batch/item-list.js`，只读复核）

- `Feed` 里 `State.Start` 只在 `Start<0` 且 token 非 trivia 时置位；trivia 分支（`i+1` 跳过）**不调用 `Analyze`**；
- 第一条 `const` 到达时 `ClassifyFirst()` 返回 `-1`（单格 `const` 无法分类）⇒ `Analyze` 从未被调用（与 §1.1 第 1 条吻合）；
- BOM 关闭时 `SourceFileBodyItemHost.CloseBatch` → `Engine.Flush`，此时 `CurrentRule<0`，
  `Flush` 走 `rawFallback`（`Reason="classify-failed"`）把 `[0,2)` 记成 raw，随后 State 重置，
  下一格 `b8` 才从 `Start=2` 重新开始。

**结论**：`const` 丢掉的直接原因是「BOM 的关闭事件被当作硬边界，触发了一次 Flush」，这条链在
`core/syntax/batch/item-list.js` 的 `CloseBatch`/`Flush` 与 `SourceFileShape` 的 batch 调度里，
**本波写范围禁止 `core/**`**，因此未修改。wp3-31 §2.1 建议的两条（C 路径 `End` 反推 / BOM 在 Code 映射补齐）
**都不能修这一条**：C 路径对第一条根本没执行，`Code` 是否包含 BOM 也改变不了「Flush 已把 `const` 记成 raw」。

### 1.3 给下一波（放开了 core 或 `typescript/tokens/**` 时可做）

- 方案 A（最贴机制）：`Flush` / `CloseBatch` 只在**真正的硬边界**（EOF、`}`、容器关闭）触发；
  BOM 这种 `IsTriviaToken` 的 UnitToken 关闭时不要 CloseBatch，只记 `Checked`/`HasLineBreak`。
- 方案 B（不改 core）：`BuildTrailingItems` 在「raw 段只有一个声明关键字 + trivia」且**下一个兄弟已是一条
  `ExpressionStatement`** 时，把它与兄弟整段重建成一条 `VariableStatement`（需要重扫，属侵入性改动，慎）。
- 对照组（wp3-31 已实测，本波未重复）：BOM 在标识符后 / `;` 后 / 文件头 三种都正常，缺口只在「紧跟关键字」。

## 2. #81 `import x from "m"` ⏎ `type T = A;` — 未动（证伪结论仍然成立）

wp3-30 §2.1 已实测：`KindOf` 的 `TextOf(code[probe]) !== "="` 对 `Symbol` 恒真（`TextOf` 只对 `Common` 返回文本），
`type T = A` 于是 KindOf=**9**（不是 8）；改成 `IsSymbolAt` 会净负 13 条 recovery（6162→6151）。
本波**没有**再动 `KindOf`。任务书给出的方向（KindOf=8 时在类型右界截断）需要先让 KindOf 返回 8，
而让 KindOf 返回 8 的唯一已知办法就是那个净负改动 ⇒ **必须先解决「TypeAliasDeclarationShape 吃续行」**，
否则这条无解。建议顺序：先让 `TypeAliasDeclarationShape.FromUnits` 在 `ParseType` 之后有剩余单元时**拒绝**
（返回 null / throw），并把这一条单独跑全量（预期 +1、需确认 13 条 recovery 不再回退），确认后再改 KindOf 探针。

## 3. 命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-32 -From impl-wp3-31 -Base impl-wp3-31
cd impl-wp3-32
# xl_build(cwd=..., paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
node .\typescript\cases\ast-json.mjs; node .\typescript\cases\ast-json-diff.mjs
git checkout -- typescript/cases
```

## 4. 踩过的坑（本波新增，值得记）

1. **`git checkout -- typescript/cases` 之后必须先重跑 `ast-json.mjs` 再跑 diff**：`*.ts-ast.json` 与
   `*.cj-ast.json` **两者都是 tracked 快照**（各 47 个文件）。checkout 会把两侧一起退回提交态，
   直接 diff 会读到 **wp3-30 的旧快照**（本波实测因此看到 6162/5/4 的假读数，虚惊一场）。
2. **在 `build/ts/**` 打点必须用 Node（`fs.readFileSync(p,"utf8")`）改文件**：用 PowerShell
   `Get-Content -Raw`（默认 ANSI）读写会把 UTF-8 中文注释读成乱码再写回，**直接把 JS 弄成语法错误**
   （`Unexpected token '{'`）。打点完记得 `tsc` 重新生成。
3. `Analyze` 开头的打点不能引用 `code`（TDZ，`const code` 在函数后面才声明）：`ReferenceError: Cannot access 'code' before initialization`
   会被包成 `SyntaxException` 抛到 Parse 外面，看起来像解析崩溃。
4. `dbg*.mjs` 里 `require` 不可用（ESM），改 `.cjs`。

## 5. 交接结论

本波**净 0**：AST 6165 保持、buffer/real-dts/quick/standard 与 wp3-31 逐项相同、无新增红。
#86 的根因已从「C 路径 End 口径」纠正为「BOM 关闭触发 CloseBatch→Flush（`const` 从未进 Analyze）」，
这是下一波最关键的一条：**在 core 之外无论怎么改都修不好 #86**。