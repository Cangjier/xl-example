# xl-example — 当前现状

> 本文件只回答三件事：**现在是什么、现在怎么构建、现在读数多少**。
> `*.xl.md` 是唯一事实来源；本文是它在 TypeScript 前端这一侧的现状说明，不记录过程、不复述变更。
>
> 环境：Node **v24.21.0**、TypeScript **6.0.3**（`node_modules/typescript/bin/tsc`）。

---

## 1. 项目是什么

- `*.xl.md` 是**唯一事实来源**：同一份规范可生成多个目标语言，`ts` 由 xl 打印器直出（离线、确定性、字节稳定）。
- 本仓是「用 xl 写的 TypeScript 风格语言前端」，一条流水线走到底：
  **字符流 → basic token → shape / possible 树 → TS 兼容 AST**。
- 两套可观测产物，互为门禁：
  - **TS 兼容 AST**：与 `ts.createSourceFile` 逐节点三栏对拍（kind / pos / end / text / name / children），
    语料是 `typescript/cases/*.ts`（47 个构造）与真实 `.d.ts`（226 份）。
  - **XML token 树**：`Token.ToXmlString()`，标签名取 `this.constructor.name`；
    同一份源码两次解析必须逐字节相同，形状树里不得出现壳类（`StatementShape` / `PossibleShape` / `CatalogGuide`）。
- 构建链路：`*.xl.md --xl build--> dist/ts/**/*.ts --tsc--> build/ts/**/*.js`。
  `dist/`、`build/` 均被 `.gitignore` 忽略，是纯生成物，不入库。

## 2. 当前仓库与分支形态

- 仓库只有两个前端目录：`core/`（语言无关层）与 `typescript/`（TS 语法层）。`dawn/` 不存在。
- 根入口 `cjcli.xl.md` 的 `# dependencies` 里仍有两条指向 `./dawn/text/*.xl.md` 的 dead import
  （`cjcli.xl.md:5-6`），因此**根级 `xl build` 不可用**：构建在依赖解析阶段中止，不写任何产物。
  连带结果：`dist/ts/cjcli.ts`、`build/ts/cjcli.js` 不存在，`bin/cjcli.js` 与 `samples/check.mjs` 跑不起来。
  这是仓库形态问题，与解析器能力无关。
- **唯一可复跑口径**是定向构建 `core` + `typescript`（见 §3、§7）——所有门禁读数都在这个口径下取得。
- 分支形态（以 `git branch -vv` / `git log` 为准）：主工作分支 `feature/possible-statement`；`main` 分支存在，
  保持基线未改动；当前工作分支 `feature/possible-statement-final-doc-fix` 未 push 到 origin。
  远端 `origin` 指向主仓库本地路径（非网络远端）。工作树干净。
- 权威尺子是 `typescript/cases/{ast-json,ast-json-diff,token-ast,real-dts-ast}.mjs`、
  `tests/statement-possible/*.mjs` 与 `tests/parse/validate.mjs`；`tests/parse/*` 其余脚本不是本分支的口径依据。

### 2.1 目录地图

| 路径 | 内容 |
| --- | --- |
| `core/` | `exceptions/`、`extensions/`、`syntax/{basic-tokens,messages,templates}/`，以及 `table-guide`/`catalog-guide`/`possible-shape(-cache)`/`shape-*`/`token`/`unit-token`/`source-range` 等语言无关规范 |
| `typescript/tokens/` | TS 语法层，按家族分目录：`aliases bindings declarations expressions files jsdoc jsx keywords literals members names punctuation statements synthetic trivia types`（`*.xl.md`，禁止散文） |
| `typescript/ast/` | AST 节点规范（节点工厂，纯数据） |
| `typescript/run/` | `source-file-runner`（入口）、`text-document`、语言模板（`typescript-template`、`typescript-symbol-template`、`line-terminator` 等） |
| `typescript/cases/` | 47 个语料构造 + 全部尺子（`.mjs`） |
| `tests/statement-possible/` | 语句 possible 的行为仪器、退场指标探针、终态矩阵 |
| `tests/parse/` | 语料文件体检（`validate.mjs`） |
| `docs/` | 本文件 + 两份 C++ 规范（见 §8） |

## 3. 构建链与注意

1. **xl 不在 PATH**。构造用 `xl_build` 工具：`cwd=<仓库根>`、`paths=["core","typescript"]`、`targets=["ts"]`、
   `out="dist"`（`xl.json` 里 `build.target=ts`、`build.out=dist`、`build.cacheDir=.xl`）。
2. 构建成功判据只有一条：**0 error**。warning（W3102/W3103 文档类）是既有噪音，不阻断。
3. 紧接着 `node node_modules/typescript/bin/tsc -p tsconfig.json`，**exit 0** 且无输出。
4. `*.xl.md` 必须是 **UTF-8 无 BOM + LF**，否则 `xl_build` 报 E0005。
   Windows PowerShell 5.1 的 `Set-Content -Encoding utf8` 会写 BOM+CRLF，不要用它编辑规范。
5. 删除 `.xl.md` 之后的收尾：`xl_orphans {out:"dist", prune:true}` 清 `dist` 孤儿，
   `build/ts` 下对应 `.js` 需手工删（`tsc` 不会清理 `outDir` 里源已消失的产物）。
6. 构建是增量的（`.xl` 缓存按源指纹判定）：同一份源重复构建为 `0 written / N skipped`，读数不因此改变。

## 4. 固定门禁读数

以下为当前实测（定向构建 `core` + `typescript` 后逐条复跑）。13 道门全绿，无 known 豁免。

| # | 门禁 | 命令 | 当前读数 |
| --- | --- | --- | --- |
| 1 | 语料 AST 生成 | `node typescript/cases/ast-json.mjs` | **6171 / 6171**，cj-fail 0，47 个构造 |
| 2 | 语料 AST 对拍 | `node typescript/cases/ast-json-diff.mjs` | **6171 / 6171** 完全一致；结构差 **0** / 位置差 **0** / 字段差 **0** |
| 3 | token 语料尺子 | `node typescript/cases/token-ast.mjs --quiet` | total=1716，**ok 1706**，crash 0，**diff 0**，ts-invalid 10，gap-now-passing 0 |
| 4 | 真实 `.d.ts` | `node typescript/cases/real-dts-ast.mjs` | **226 / 226**，崩溃 0，AST 完全一致 226、差异 0 |
| 5 | 语句 possible 全组 | `node tests/statement-possible/harness.mjs --all` | **102 pass / 0 fail**，known 0，uncovered 0，互斥冲突 0，file-fallback 0 |
| 6 | 双路互斥 | `node tests/statement-possible/harness.mjs --double-accept` | **120 / 0**，冲突 0 |
| 7 | 声明语句接管 | `node tests/statement-possible/declaration-statement-takeover.mjs` | **33 / 33**，knownGap 0，takeover 27 |
| 8 | 语料文件体检 | `node tests/parse/validate.mjs` | **1720 条用例 / 0 条不合格**（exit 0） |
| 9 | 终态矩阵 | `node tests/statement-possible/final-matrix.mjs` | **38 / 38**（shapeAst 38/38、xmlEqLegacy 38/38、astEqTS 38/38；knownGap 1 属既有口径） |
| 10 | 操作符 AST | `node tests/statement-possible/op-ast-proof.mjs` | **94 / 94** |
| 11 | 操作符存活 | `node tests/statement-possible/op-proof.mjs` | **40 / 40** |
| 12 | AST kind 名 | `node tests/statement-possible/ast-kind-names.mjs` | **PASS**：live 5/5、self-test 4/4、fixtures 47、运算符节点 262、fail 0 |
| 13 | legacy 退场指标 | `node tests/statement-possible/legacy-retirement.mjs --json` | **PASS**，`differences: []` |

### 4.1 退场指标（同一语料：1763 文件 / 6300 用例 / 10 个 ts-invalid）

| 指标 | 当前值 | 口径 |
| --- | --- | --- |
| `LegacyStatementDispatchCount` | **0** | 语句壳收口**不再**走 `StatementBuilder.BuildStatement()` 整段 raw 分派 |
| `ScanRootCallCount` | **46** | 全部发生在文件级 fallback 的重解析里；默认解析路径为 **0** |
| `RawTailBuildCount` | **4** | 块体里逐条 raw 尾巴仍由 `Load` + `BuildStatement()` 建树 |
| `ShapeAstDeclinedCount` / `TotalDeclined` | **2 / 2** | 表达式语句本该由形状树建 AST、实际回退 legacy 建树 |
| `FileFallbackCount` | **4** | 整条文件按 legacy 候选目录重解析一次（见 §6） |

## 5. 架构摘要

### 5.1 语句 possible（四件套）

| 角色 | 位置 | 职责 |
| --- | --- | --- |
| 壳 | `typescript/tokens/statements/statement-shape.xl.md` | `StatementShape.BuildFromShell`：壳闭合后决定「形状树建 AST / 族分派建树 / raw 兜底」 |
| 分族 | `statement-route-util.xl.md` | `StatementRouteUtil.Decide`：**全函数**分流，返回 `StatementRoute` 族码（11 个）；`ClassOf` 给单元分类码（10 个） |
| 判界 | `statement-boundary-util.xl.md` | `;` / ASI / 带体声明收口的**唯一实现点**，全目录只读这一份判断 |
| 建树分派 | `statement-family-dispatch.xl.md` | 收口时按壳 `Kind` 与首代码单元直接调 `StatementBuilder` 的 family 方法（`BuildBlock` / `BuildVariableStatement` / `BuildIf` / `BuildFunctionDeclaration` …） |

两条硬约束写在分族全函数里：任何下标都返回一个族码、不抛错；**只有 trivia 时返回 `None` 且禁止 `Reject`**
（`CatalogGuide` 会永久删除 `Reject` 过的候选，首格误 Reject 会让整条语句没人接管）。

候选按族互斥，靠 `Accept` / `Reject` 而非先后：同一格多个候选同时 Accept 时 `CatalogGuide` 直接抛错，
`harness --double-accept` 就是盯这件事的仪器。

### 5.2 表达式：由形状树建 AST

- `statement-shape-ast.xl.md` 的 `StatementShapeAst` 把表达式形状树折成 TS 兼容 AST，入口是
  `BuildExpressionStatementFromShapes(shell.OperatorBody)`；折不出来时走 `Decline(reason)` 并记 `TotalDeclined`，
  由壳退回 legacy 建树（这就是 §4.1 的 `ShapeAstDeclinedCount`）。
- 二元 / 前缀 / 后缀 / 逗号 / 条件的优先级与结合性只有一张表（`OperatorTable.Precedence`），
  形状层按表插入中间节点，不在别处出现第二份优先级数字。

### 5.3 默认开关（全为开启态）

`EnableShellExpressions`、`EnableFileFallback`、`EnableDeclarationShell`、`EnableRootDeclarationShell`、
`EnableBlockDeclarationShell`、`EnableBlockBodyCatalog`、`EnableArrowBodyCatalog`、`EnableObjectMethodBodyCatalog`、
`EnableControlFlowShell`、`EnableControlFlowLabel`、`EnableControlFlowEmpty`、`EnableLabelBodyCatalog`、
`EnableAwaitStatement`、`EnableYieldStatement`、`EnableSwitchCaseClause`、`EnableBlockClassShell`。

- **声明 / 导入导出族**：`interface` / `enum` / `type` / `namespace` / `module` / `declare` / `import` / `export` / `using`
  由语句壳接管；根层 `function` / `class` / 装饰器声明各有独立族码。
- **块体**：块内语句仍由 `BuildBlock` 原子递归建树；`EnableBlockBodyCatalog` 决定块体目录是否挂载，
  挂上去只改「谁先建壳」，不改节点与 Pos。
- **文件级 fallback**：`SourceFileRunner.Parse` 在新路径抛异常时把**整条文件**按 `EnableShellExpressions = false`
  的候选目录重解析一次（`EnableFileFallback`）；这是兜底，不是常规路径，`harness --all` 实测 file-fallback 为 0。
- **legacy 根候选**：只在 fallback / 关闭态注册（`source-file-shape.xl.md` 里两套根目录），默认解析不挂。
- `StatementBuilder` 仍是唯一的 AST 工厂：possible 层直接调它的 family 方法，不再经过整段 raw 分派。

## 6. 覆盖与残余

### 6.1 已达到的能力（默认解析，全门为证）

1. **语句体 shell**：根层与块体的语句都由语句壳驱动，收口后按族建树（`LegacyStatementDispatchCount = 0`）。
2. **声明 possible**：`let` / `const` / `var` 及声明、导入导出族由 possible 候选判界建壳，声明与表达式共用同一套边界规则。
3. **操作符 possible + 优先级插入**：表达式由形状树建 AST，`OperatorTable` 单表决定插入与结合性
   （`op-ast-proof 94/94`、`op-proof 40/40`）。
4. **legacy 扫描 / 分派退场**：默认路径不再整段 raw 分派；`ScanRoot` 只剩 fallback 态与非默认开关态在调。

### 6.2 残余（每项都有数、有归因）

| 残余 | 数量 | 归因 / 边界 |
| --- | --- | --- |
| 文件级 fallback | **4** | 同一类：函数 / 构造签名的**返回类型字面量**（`type T = (a: A) => { b: B }`），`=>` 后那个 `{` 在语句层被当成块语句先建掉，类型别名建造器拿到坏切片。4 例：`tests/cases/token/types/gap-r1244-ctor-signature-generic-return-type.ts`、`tests/cases/token/types/type-fn-return-typeliteral.ts`、`typescript/cases/dts-types.ts:L68`、`typescript/cases/types.ts:L430` |
| 块体 raw 尾巴 | **4** | 块内语句的整段 raw 递归与 raw 段收集仍由 `StatementBuilder.BuildStatement()` 建树 |
| 形状树拒绝 | **2** | 表达式语句的形状树折不出 AST，`StatementShapeAst.Decline` 记一次并退回 legacy 建树 |
| `ScanRoot` 调用 | **46** | 全在文件级 fallback 的重解析里；默认解析 0 |

口径边界（不是缺陷）：

- **TS 非法恢复形不在范围**：语料里 10 个 `ts-invalid` 文件（`using` 一类 TS 有语法诊断的写法）只跑互斥仪器，
  不参与 AST 对拍。
- `final-matrix` 的 `knownGap=1` 是既有口径登记项，不当作失败。
- `xl_build` 的 warning 数是文档类噪音（W3102 成员缺描述 / W3103 命名空间缺描述），判据只看 error。

## 7. 复跑命令

```powershell
# 0) cwd = 仓库根；先构建，再类型检查（不传 paths 的根级构建不可用，见 §2）
#    xl_build(cwd="<仓库根>", paths=["core","typescript"], targets=["ts"], out="dist")   → 0 error
node node_modules/typescript/bin/tsc -p tsconfig.json                                   # exit 0

# 1) 语料 AST
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs

# 2) token 语料与真实 .d.ts
node typescript/cases/token-ast.mjs --quiet
node typescript/cases/real-dts-ast.mjs

# 3) 语句 possible 行为仪器
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept
node tests/statement-possible/declaration-statement-takeover.mjs
node tests/statement-possible/final-matrix.mjs

# 4) 操作符与 kind 名
node tests/statement-possible/op-ast-proof.mjs
node tests/statement-possible/op-proof.mjs
node tests/statement-possible/ast-kind-names.mjs

# 5) 语料体检与退场指标
node tests/parse/validate.mjs
node tests/statement-possible/legacy-retirement.mjs --json

# 6) 归因探针（可选：看清 file fallback 到底卡在哪一格）
node tests/statement-possible/file-fallback-attribution.mjs --json
```

判据：构建 0 error、`tsc` exit 0、上述 13 道门读数与 §4 逐位一致。
门禁跑完后 `git status typescript/cases` 应为空（AST 尺子不留脏改动）。

## 8. `docs/` 构成

`docs/` 只有三个文件，无子目录：

| 文件 | 内容 |
| --- | --- |
| [`Final.md`](Final.md) | 本文件：当前现状（形态、构建、门禁读数、架构、残余、复跑） |
| [`xl-to-cpp.md`](xl-to-cpp.md) | C++ 目标的生成契约：类型映射、部件划分、编译陷阱 |
| [`cpp-design-notes.md`](cpp-design-notes.md) | C++ 目标上「只能这么写」的结构性取舍 |

`README.md` 只链向这三个文件；仓库根不再有其他过程性文档。
