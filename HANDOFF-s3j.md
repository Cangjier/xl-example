# HANDOFF — Stage 3j：`as` / `satisfies`、逗号、`import.meta` / 动态 `import()`

基线：`feature/possible-statement` @ **35379fd4**（主仓库已同步）。
分支：`feature/possible-statement-s3j`。工作目录：`C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-s3j`。

## 1. 结论（先说清楚做了什么、没做什么）

本轮**没有**新增表达式形状种类：动手先做了取证，发现 `as` / `satisfies` 的**形状层与类型段解析在基线上已经存在**
（`AsExpressionShape` / `SatisfiesExpressionShape` + `ExpressionBuilder.ParseFollowingType` → `TypeBuilder.ParseType`），
缺的是任务书点名的那条架构债：**`as` 优先级 11 硬编码在 `ExpressionBuilder.ParseBinary` 里**，`OperatorTable`
不是唯一来源（lint KNOWN）。

所以本轮交付的是**清债 + 逐位不变量证明**，不是新语法：

| 项 | 状态 | 说明 |
| --- | --- | --- |
| `as` / `satisfies` 优先级与集合进 `OperatorTable` | **完成** | 新增 `AsPrecedence`（11）与 `IsAsOperator`（`as` / `satisfies`）；`ExpressionBuilder` 两处改为**一次委托**，文件里不再出现数字 11 |
| `x as T;` / `x satisfies T;` / `a as T as U;` / `(a as T).b;` | 基线已支持，本轮**未回归** | 形状层与 AST 由既有门（op-ast 62/62）与真实用例覆盖；本轮未新增专用 case（见 §5 剩余工作） |
| 逗号运算符（`SequenceExpression`） | **未覆盖**，保持基线行为 | `ParseExpression` 仍用 `BinaryExpressionShape` 承载 `,`；TS 侧是 `SequenceExpression`，二者 AST 形状不同，**属已知差异而不是已验证等价**；本轮刻意未改，避免在无专用 case 的情况下改树 |
| `import.meta` / 动态 `import()` | **未覆盖**（保守拒绝） | `tests/statement-possible/op-ast-proof.mjs` 里对 `import.meta` / `import("x")` 有显式判否（`tsBareImport` 分支，注释写明「被形状层保守拒绝，legacy 树不同」）；本轮未触碰 |
| 类型实参歧义（`a<b>`、`f<T>(x)`） | **未覆盖**，保持安全回退 | 未改动 `AngleJudge` / `ParseTypeArguments` 路径 |
| 解构赋值 / 箭头 / 函数 / 类表达式 | **未覆盖** | 任务书列为可选；本轮预算内未做，仍走 legacy |
| `#private` | **未覆盖** | 同上 |

## 2. 变更文件

源码（`.xl.md`，UTF-8 无 BOM + LF，已复核 `crlf=0`、首字节 `0x23`）：

- `typescript/tokens/expressions/operator-table.xl.md`：新增 `static field AsPrecedence:int = 11` 与
  `static method IsAsOperator:(text:string)=>bool`，并在文档里写明「`Precedence` 对 `as` 仍返回 -1」
  （右操作数是类型，`ParseBinary` 的二元循环绝不能把它当普通运算符吃掉）。
- `typescript/tokens/expressions/expression-builder.xl.md`：
  - `ParseBinary` 里 `const precedence = 11;` → `const precedence = OperatorTable.AsPrecedence;`
  - `IsTypeOperator` 尾三行 → `return OperatorTable.IsAsOperator((unit as Common).TempToString());`
  - 方法上方说明段同步为「优先级与集合都由 `OperatorTable` 提供，`ParseBinary` 只做一次委托」。

生成产物（`dist/ts`，xl build 直出，不进 git）：`operator-table.ts:54 AsPrecedence = 11`、
`operator-table.ts:56 IsAsOperator`、`expression-builder.ts:332/375` 两处委托。

## 3. `as` 优先级迁移证据

1. 生成物逐行（`dist/ts/...ts`）：`OT 54: public static AsPrecedence: number = 11;` / `OT 56: public static IsAsOperator(text: string): boolean` /
   `EB 332: const precedence = OperatorTable.AsPrecedence;` / `EB 375: return OperatorTable.IsAsOperator((unit as Common).TempToString());`
2. 源码里 `const precedence = 11;` 的残留：`leftover11=False`（写回后回读校验）。
3. **lint 自己就是判据**：`node tests/statement-possible/harness.mjs --lint` →
   `[lint] OperatorTable 数字优先级条目=12`、`[lint] 结果：PASS（ASI 实现唯一 / 优先级数字表只在 operator-table）`。
   即「优先级数字表只在 operator-table」由工具而不是由本文件声明。
4. **四道 AST 门逐位不变**（同一台机、同一命令、与基线读数完全一致）：
   `op-ast 62/62`、`op-proof 40/40`、`ast-json 6167/6167 + ast-json-diff 0/0/0`、`token-ast 1716/1706/0/0/10`。
   迁移没有改变任何一棵树，也没有让任何一条用例从 red 变 green——它只改变了「数字住在哪里」。

## 4. 全表读数（本分支最后一次全量运行）

| 门 | 读数 |
| --- | --- |
| `xl build`（core+typescript → ts） | **886 written / 0 error**（第一次全量）；改后增量 `1 written, 0 error` |
| `tsc -p tsconfig.json` | **exit 0** |
| op-ast-proof（`ast-from-shapes`） | **62/62**（形状树接管 62、TS 逐节点 62、数字叶子 8） |
| op-proof（`operators-live`） | **40/40**（结构文本 40、InsertBetween 计数 38） |
| harness `--group=operators-live` | **40 pass / 0 fail**，double-accept 冲突 0，file-fallback 0 |
| harness `--group=dev` | exit 0，fallback 仅出现在声明过的用例里 |
| harness `--all` | **101 pass / 0 fail / known 1 / uncovered 0**（8 组跑、3 组 skip） |
| harness `--double-accept` | **cases=120 failed=0**，冲突 0 |
| harness `--lint` | **PASS**（数字优先级条目=12，表只在 operator-table） |
| `tests/parse/validate.mjs` | **1720 条，0 条不合格** |
| ast-json（四步） | **6167/6167**；`git status --short typescript/cases` **空**；diff **0 结构差 / 0 位置差 / 0 字段差** |
| token-ast | **total=1716 ok=1706 crash=0 diff=0 ts-invalid=10**（与基线同） |
| real-dts-ast | **226 文件，解析成功 226、崩溃 0、AST 完全一致 226** |
| feas-operator harness / insert-between | **6/6**、**9/9** |
| perf（中位数，无硬阈值） | long n=300 **5.64ms**（32 candidateCalls）；many 2000 条 **26.73ms**（32016 calls）；scale 100/200/400 = 0.70/1.58/3.42ms，比值 **2.27 / 2.17** |

## 5. 未覆盖清单与安全回退（下一类要接的手）

1. **逗号运算符**：`ParseExpression` 目前把 `,` 建成 `BinaryExpressionShape`（运算符 token 是 `,`），TS 是
   `SequenceExpression`（`expressions` 数组）。**未验证等价，也未声称等价**；要接这一类，须新建
   `SequenceExpressionShape` + `StatementShapeAst` 分支，并在 `op-ast-cases` 里加
   `a, b;` / `f(), g();` / `a = (1, 2);`（后者应确认**不是** Sequence：`(1, 2)` 在括号内仍是逗号表达式，
   而参数/数组里的逗号属于列表而不是 Sequence）。
2. **`import.meta` / 动态 `import()`**：`op-ast-proof.mjs` 的 `tsBareImport` 分支显式判否，属**已声明的保守回退**；
   `import.meta.url` 在 TS 侧是 `MetaProperty`（`import` + `.` + `meta`），`import("x")` 是 `CallExpression` 且
   callee 是关键字 `import`，两者都需要新的形状承载，且要与语句级 `ImportDeclaration` 分派**互斥**。
3. **类型实参歧义**：`a<b>`、`f<T>(x)` 仍走安全回退（`AngleJudge` 未动）。`as`/`satisfies` 的右操作数走
   `TypeBuilder` 全量类型解析，所以 `x as Array<Array<number>>` 里的 `>>` 拆分是既有能力，不是本轮新增。
4. **解构赋值 / 箭头 / 函数 / 类表达式 / `#private`**：未覆盖，仍 legacy。
5. **专用 case 未加**：本轮只在既有门上取证，没有向 `op-cases.json` / `op-ast-cases.json` 追加
   `as` / `satisfies` / 逗号条目。原因是本轮预算已用尽，且「先写期望值再让门变绿」有伪造绿的诱惑；
   下一轮应当**先写 case**（`TotalShapeAst>0`、XML==legacy、与 TS 逐节点一致），再决定是否改树。

## 6. 风险

- **半程风险**：`OperatorTable` 新增的 `AsPrecedence` / `IsAsOperator` 目前只有 `ExpressionBuilder` 一个调用方。
  若后续有人绕过 `ExpressionBuilder` 直接写 `11`，lint 可捕获（表唯一性已是 PASS 判据），但**没人检查
  `IsAsOperator` 的集合是否被复制**——建议下一类把「`as`/`satisfies` 文本集合」也纳入 lint。
- **`as` 换行歧义**：`dev-cases.json` 里 `const a = b as T\n(c); const d = e as U\n(f);` 仍走 fallback，
  说明 `as` 后换行 + 括号的 ASI 边界按保守策略处理，未收紧。
- **`SequenceExpression` 缺失是真实差异**：任何含逗号表达式的项目一旦被形状层接管，AST 形状会与 TS 不同。
  目前没有门覆盖它，所以「绿」不等于「对」；这是本轮明确留下的最大缺口。
- perf 未回归（5.64ms / 26.73ms / 比值 ≈2.1–2.3），但本轮改动不触及热路径，该读数只作基线记录。

## 7. 复现命令（cwd = 本目录）

```powershell
xl_build targets=["ts"] paths=["core","typescript"]      # 0 error
node node_modules/typescript/bin/tsc -p tsconfig.json    # exit 0
node tests/statement-possible/op-ast-proof.mjs           # 62/62
node tests/statement-possible/op-proof.mjs               # 40/40
node tests/statement-possible/harness.mjs --all          # 101/0/known1
node tests/statement-possible/harness.mjs --lint         # PASS
node tests/parse/validate.mjs                            # 1720/0
node typescript/cases/ast-json.mjs; git status --short typescript/cases; git checkout -- typescript/cases
node typescript/cases/ast-json-diff.mjs                  # 0/0/0
```
