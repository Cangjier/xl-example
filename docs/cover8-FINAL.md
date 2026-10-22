# cover8 FINAL — 终验报告（独立作者：basic-token；非 4 位作者、非合并者）

- 主仓 `C:\Users\Admin\Documents\GitHub\xl-example`，`feature/quick-parse` @ **`cfb06914`**（工作区干净）
- 基线 = cover7 终点 **`3fcd2e37`**；TS **6.0.3**；Node v24.21.0
- 独立验证环境：本人克隆 `xl-example-set/cover6-core-lineterm`，`git fetch` 后 `checkout --detach cfb06914`，
  `xl_build(force, core+typescript)` = **864 written / 0 error**，`tsc -p` = **0**；探针自写（不采信作者报告）。
- **结论：PASS**（4 组目标形态实测达标；全量门禁与报告一致；`core/**` 与 `typescript/IMPORTANCE.md` 零改动；
  唯一 crash 是作者文档已登记的 out-of-scope 遗留，不属本批范围，见 §7）。

## 1. 结构核查（全部实测）

| 项 | 实测 | 判定 |
|---|---|---|
| HEAD | `cfb0691461ea143f673c4c508cd2da003806fdc7`（`feature/quick-parse`） | ✅ |
| 合并链 | `git log --merges --oneline 3fcd2e37..HEAD` = **4 条**：`b2337f08` decortail → `6090faaa` asi → `73dbcdab` blockdecl → `cfb06914` exportasi | ✅ |
| 变更面 | `git diff --stat 3fcd2e37..HEAD` = **33 文件 / +16942 / −259** | ✅ |
| core 零改动 | `git diff 3fcd2e37..HEAD -- core typescript/IMPORTANCE.md` = **空** | ✅ |
| 工作区 | `git status --short` 空（验证克隆内仅未跟踪 `tmp/`） | ✅ |
| tmp 未提交 | `git ls-files \| grep '^tmp/'` = **空** | ✅ |
| 依赖 | `package.json` / `package-lock.json` / `pnpm-lock.yaml` diff = **空** | ✅ |
| 变更文件构成 | `typescript/**` 16 个 `.xl.md` + 4 个 case stem `.ts` + 8 份快照；`tests/cases/token/lexical/` 1 个新夹具；`docs/cover8-*.md` 4 篇 | ✅ 本轮全部 typescript 层；**core 零改动** |

## 2. 四组前后读数

| 组 | 分支（merge） | 目标 stem | 该 stem 用例（基线 → 最终） | 增量 | ast-json 全量 |
|---|---|---|---|---|---|
| A U+2028/U+2029 ASI | `6090faaa` asi | `end-compute` | 262 → **295** | **+33** | 5797 → 5929 |
| B 装饰器尾随声明 | `b2337f08` decortail | `end-build` | 174 → **194** | **+20** | 同上 |
| C 块内 import/export 与 `@dec` 声明头 | `73dbcdab` blockdecl | `missing-possible` | 91 → **135** | **+44** | 同上 |
| D export 家族调用位 ASI | `cfb06914` exportasi | `possible-compute` | 129 → **164** | **+35** | 同上 |
| **合计** | | | 656 → **788** | **+132** | **5797 → 5929** |

（5797 + 44 + 20 + 33 + 35 = **5929**，与全量 ast-json 完全吻合。）

## 3. 每组根因摘要与四问

### A U+2028 / U+2029 作 ASI 断句点（+33，`end-compute`）

- **根因**：cover6 已把 LS/PS 收进 ts trivia（`TypeScriptSymbolTemplate.IsWhiteSpace`），但 ASI / 语句边界判据
  仍按字符 `"\n"` 判断（`statement-scanner` / `expression-builder` / `expression-statement-possible-shape` 一族），
  于是 `return<LS>1`、`a<LS>b`、`type T = A<LS>z`、`import …` 等被当成「同一语句续接」。
- **修复**：新增共享助手页 `typescript/run/line-terminator.xl.md`（LineTerminator 集 = `\n`/`\r`/U+2028/U+2029，
  CRLF 整体算一个），各换行判据改问它；**不改 core**（cover6 的 `Template.LineTerminatorChars` 只在 ts 模板配置）。
- **四问**：① 正确何时 build：语句/表达式在该收口处（ASI 边界）判定「这条语句已结束」；② build 提什么：断句事实
  （此处是行终止符，不是语句内容）；③ 何时 close：遇到任一 LineTerminator（LF/CR/LS/PS）；④ close 提什么：
  语句 `end` 不含行终止符（trivia 丢弃），下一条语句从新行开始。

### B 装饰器尾随声明（+20，`end-build`）

- **根因**：无 body 的函数声明在收尾（Stage3/4）只把 statement word（`Common`）当 ASI 边界，
  换行后的 `@` 是 `Symbol` 看不到 → 把下一条装饰器声明吞进函数声明，或抛「不支持的表达式起点」。
- **修复**：`function-declaration-possible-shape.xl.md` 新增静态助手 `IsDecoratedDeclarationStart`（换行后的 `@`），
  Stage 3/4 与 statement word 同等 Reject；`statement-scanner.xl.md` 的 LeadingDeclarationKeyword 同口径。
- **四问**：① 正确何时 build：`declare function gf(): void` 这类无 body 声明在「换行 + `@`」处即 build；
  ② build 提什么：函数声明区间（**不含**换行后的装饰器声明）；③ 何时 close：下一行以 `@` 起始或遇到 statement word；
  ④ close 提什么：`end` 截止在行尾，后续 `@dec class C {}` 作为独立声明完整成树（区间正确）。

### C 块内 import/export、ExportAssignment、模板块 export、`@dec` 声明头（+44，`missing-possible`）

- **根因**：块层（`{ … }`）的候选没有 import/export 分派；`export =` / `export default` 在块内无候选；
  `@dec` 接 function/enum 在根级 Stage 0 遇 `@` 直接 Reject（根级零候选）。
- **修复**：`statement-scanner` / `statement-builder` 增加块层声明词分派；`function-declaration-possible-shape`
  Stage 8、`enum-declaration-possible-shape` Stage 6 支持根级 `@`；`function-declaration-shape.FromUnits`
  支持装饰器前缀 + `allowAnonymous`；`module-block-shape` / `export-declaration-*` / `type-alias-declaration-possible-shape` 补齐。
- **四问**：① 正确何时 build：块内遇到声明词/`@` 时按声明候选 build；② build 提什么：装饰器前缀 + 声明节点；
  ③ 何时 close：声明完整（body `}` / `;` / 模板块收尾）；④ close 提什么：节点区间含装饰器、块层不额外包一层语句。

### D export 家族调用位 ASI（+35，`possible-compute`）

- **根因**：`export default a as T` ⏎ `(b)` 这类「类型位 `as T` 之后换行接调用位」被当成续接成一条表达式语句；
  `export` 家族（default / `=` / `const…`）缺少「行终止符 + 下一行以 `(`/`[`/模板 起始即断句」的判据。
- **修复**：`statement-scanner.xl.md` **纯新增** `static EndsAtLineBreakBefore(units, current)`，export 家族的
  收尾改走它（`LastBodyCode >= 0 && EndsAtLineBreakBefore(...)` → `Done/DoneAt/Asi/Stage=4`）；
  `as T` 之后 `<b>c` 的比较续接仍走类型位既有判据（`type-builder` / `member-boundary` 调整），不误伤。
- **四问**：① 正确何时 build：export 语句在「行终止符 + 下一行调用起点」处收口；② build 提什么：export 语句 end；
  ③ 何时 close：`as T` 类型结束且下一个代码单元前有行终止符、下一行以调用起点开头；④ close 提什么：end 不含下一行，
  `(b)` 成为独立 ExpressionStatement。

## 4. 独立抽样（12 条，全部自写探针实测：TS `parseDiagnostics=0` + 三栏 0/0/0）

| # | 组 | 输入（`<LS>`=U+2028；⏎=LF） | TS diag | 结构差 | 位置差 | 字段差 |
|---|---|---|---|---|---|---|
| 1 | A | `function f(){ return<LS>1; }` | 0 | 0 | 0 | 0 |
| 2 | A | `function* g(){ yield<LS>(x); }` | 0 | 0 | 0 | 0 |
| 3 | A | `import a from "m"<LS>type T = A;` | 0 | 0 | 0 | 0 |
| 4 | B | `declare function gf(): void` ⏎ `@dec class C {}` | 0 | 0 | 0 | 0 |
| 5 | B | `function f(): void` ⏎ `@a @b class C {}` | 0 | 0 | 0 | 0 |
| 6 | B | ⏎ `@dec type T = A;` | 0 | 0 | 0 | 0 |
| 7 | C | `{ import x from "m"; }` | 0 | 0 | 0 | 0 |
| 8 | C | `declare module "m" { export { a } }` | 0 | 0 | 0 | 0 |
| 9 | C | `@dec` ⏎ `function f() {}` | 0 | 0 | 0 | 0 |
| 10 | D | `export default a as T` ⏎ `(b)` | 0 | 0 | 0 | 0 |
| 11 | D | `export = a as T` ⏎ `(b)` | 0 | 0 | 0 | 0 |
| 12 | D | `const x = a as T` ⏎ `<b>c`（比较续接，一条语句） | 0 | 0 | 0 | 0 |

**四组全量探针**（自写 `tmp/verify-cover8.mjs`，46 输入，全部先过 TS `parseDiagnostics=0`）：
A **16/16** 一致、B **9/10**（1 条 = §7 已登记遗留）、C **9/9**、D **7/8**（1 条为探针自造的 TS 非法形，按尺子规则剔除）。
合计 **41/43 绿，0 条未登记红**。

## 5. 门禁读数（独立克隆重建后实测，与 infra/作者报告一致）

| 门禁 | 读数 | 判定 |
|---|---|---|
| `xl_build(force, core+typescript)` | 864 written / 0 skipped / **0 error**（2464 warning：既有 W3102/W3103 + 3 条既有 E2004） | ✅ |
| `tsc -p tsconfig.json` / `tsc -p --noEmit` | exit **0** / exit **0** | ✅ |
| `node typescript/cases/ast-json.mjs` | **5929 / cj-ok 5929 / cj-fail 0**（47 构造） | ✅ |
| `node typescript/cases/ast-json-diff.mjs` | **5929/5929；结构 0 / 位置 0 / 字段 0** | ✅ |
| per-stem（5 stem 单测） | basic-token **196**、missing-possible **135**、end-build **194**、end-compute **295**、possible-compute **164**；合计 984/984 全一致（diff 0/0/0） | ✅ |
| `node typescript/cases/token-ast.mjs --quiet` | **total 1715 / ok 1705 / ts-invalid 10 / crash 0 / diff 0 / known-gap 0** | ✅ 不回归 |
| `node tests/parse/validate.mjs`（`npm run cases:check`） | **1719 条用例 / 0 条不合格** | ✅ |
| `node typescript/cases/real-dts-ast.mjs` | **226 文件 / 226 成功 / 崩溃 0 / AST 完全一致 226** | ✅ |
| `xl_check(typescript, targets=["ts"])` | **811 文件 / 0 error**（2460 warning，全部既有 W3102/W3103） | ✅ 无新增 error |

> `xl_check` 这里只扫 `typescript/`（811 文件）得 0 error；作者在 core+typescript（863 文件）同样是 0 error / 2464 warning，两处都无新增 error。

## 6. 改动文件清单（33 文件，仅 `typescript/**` + `tests/**` + `docs/**`，core 零改动）

**typescript 源（16）**：`run/line-terminator.xl.md`（新）、`run/typescript-template.xl.md`、
`tokens/statements/statement-builder.xl.md`、`tokens/statements/statement-scanner.xl.md`、
`tokens/statements/expression-statement-possible-shape.xl.md`、`tokens/expressions/expression-builder.xl.md`、
`tokens/declarations/function-declaration-possible-shape.xl.md`、`tokens/declarations/function-declaration-shape.xl.md`、
`tokens/declarations/enum-declaration-possible-shape.xl.md`、`tokens/declarations/export-declaration-possible-shape.xl.md`、
`tokens/declarations/export-declaration-end-possible-shape.xl.md`、`tokens/declarations/import-declaration-end-possible-shape.xl.md`、
`tokens/declarations/module-block-shape.xl.md`、`tokens/declarations/type-alias-declaration-possible-shape.xl.md`、
`tokens/types/member-boundary.xl.md`、`tokens/types/type-builder.xl.md`。

**用例（5）**：`typescript/cases/{missing-possible,end-build,end-compute,possible-compute}.ts`（各含 `cover8` 唯一标记段，
用例条数增量 **44 / 20 / 33 / 35**，与作者文档一致）+ `tests/cases/token/lexical/lex-line-terminator-asi.ts`（新夹具）。
**快照（8）**：上述 4 个 stem 的 `.cj-ast.json` / `.ts-ast.json` 重新生成。
**文档（4）**：`docs/cover8-{asi,blockdecl,decortail,exportasi}.md`。

## 7. 遗留（下一批）

1. **装饰器头 5 条**（作者 `cover8-decortail.md` §8 已登记，out-of-scope）：`declare function gf(): void` ⏎ `@dec` ⏎ `class C {}`
   （本终验探针 B10 实测 crash「不支持的表达式起点」，**已知遗留、非回归**）、`⏎ @dec interface I {}`、`⏎ @dec enum E { A }`、
   `⏎ @dec type T`、`⏎ @dec namespace N {}` —— 根因在 `source-file-end` 的装饰器分派面（只接 class），需另开任务。
2. **`{ @dec` ⏎ `const x = 1; }`**（装饰器贴 VariableStatement，TS AST 合法）——作者 `cover8-blockdecl.md` §7 登记未修。
3. `source-file-end` 装饰器分派面本身（按声明词分派到 interface / module / enum / type 的 `FromUnits`）。
4. `type-builder:515` 换行判据（作者文档登记）。
5. `import()` / `typeof` 同一行实参守卫。
6. cover5 其余遗留（mid-code BOM 之外的口径项等，见 `docs/cover5-FINAL.md` §4 未收口部分）。

## 8. 异常与口径说明

1. **B10 不是回归**：`declare function gf(): void` ⏎ `@dec` ⏎ `class C {}` 在 `cover8-decortail.md` §8 表里逐条登记
   （修后仍红的 5 条 out-of-scope 之一，根因 `source-file-end` 边界覆盖到下一行 `class`），本终验作为已知遗留记录，不计 FAIL。
2. **探针自造形被剔除**：`export default /= () => {}` ⏎ `(b)` 是我按任务清单字面拼的，TS 6.0.3 报
   `Unterminated regular expression literal`（diag≠0），按“只认 TS 合法输入”的尺子规则剔除；作者实际 D 组用例
   （`export default () => {}\n(b)` / `export default a as T\n(b)` / `export = () => {}\n(b)` 等）实测全绿。
3. **增量口径**：`git diff --numstat` 的行增量是 76/31/44/50（含段说明与排版），
   任务/作者报告的 **44/20/33/35 是“用例条数”增量**（91→135 / 174→194 / 262→295 / 129→164），两者不矛盾。
4. **验证位置**：所有会重写跟踪快照的脚本只在本人独立克隆（detached `cfb06914`）里跑；主仓只新增本 FINAL 文档并提交。
5. **回滚点**：基线 `3fcd2e37`；整体回滚 `git reset --hard 3fcd2e37`；单组回滚 = revert 对应 merge commit
   （`b2337f08` / `6090faaa` / `73dbcdab` / `cfb06914`）。
