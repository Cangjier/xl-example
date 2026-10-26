# B4c · `type` 别名真壳 + 类型字面量早建（P1 成批补建消除）— 实施报告

| 项 | 值 |
| --- | --- |
| 工作副本 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b4c-type-alias`，分支 `feature/b4c-type-alias` |
| 基线 | 主仓库 HEAD `48597fbf`（B4b 合并后；表达式括号目录默认开） |
| 提交 | `8cf7bb4d` `feat(b4c): early type alias shell, name and type-literal shells (union/function early build deferred)` |
| 性质 | **真壳替换 B4a 占位** + 名字 / 类型字面量两处早建；联合 / 函数类型 / 映射**显式后置**（见 §4） |
| 构建 | `xl_build {core,typescript}` **632 页 / 0 error / 3 warning**（3 条均既有 `E1107`）；`tsc -p .` exit 0 |

---

## 0. 结论先行（不把「少几条」当完成）

1. **目标 1 达成**：`type` 关键字关闭格挂**真壳** `TypeAliasDeclarationShape`（不再是 B4a 的
   `IsTriviaToken=true` 占位），名字在**名字关闭格**（`=` / `<` 闭合那一格）成 `IdentifierShape`，
   收口仍调**同一份** legacy `TypeAliasDeclarationShape.FromUnits`（没有第二套建树路径）。
2. **目标 2 达成（一个子项有量差）**：`type T = { a: number; b?: string }` 的 `{` 在**创建格**
   建 `TypeLiteralShape`（`Pos = `=` 的 `EndIndex`，与 legacy 同源），`a` 在 `:` 闭合格成
   `PropertySignatureShape` + `IdentifierShape`，`b` 的成员壳在 `?` 闭合格建出（step 24）；
   `}` 格**不再建整棵子树**，只把已建成员收进 `TypeLiteralShape`。量差：最后一个无分隔符成员
   （`b?: string`）与 interface 成员同一手法，在 `}` 格才由 `HandOffOnBodyClose` 收成
   `QuestionTokenShape` / `StringKeywordShape`（§2.3 给出读数）。
3. **目标 3 只做到「壳 + 名字」**：`type U = A | B`、`type F = (x: number) => void`、
   `type M = { [K in keyof T]: T[K] }` 的类型节点**仍由 legacy 在别名收口格一次建出**。
   联合的早建在实测中产生区间差（前导 `|` / 行注释尾 / `=>` 优先级），为守 `wide-ast` 已**显式关闭**；
   函数类型 / 映射按任务书「映射/条件/元组可后置」一并后置（§4 逐条最小复现）。
4. **验收读数**：`tts` **PASS 429**、`ts-all` **426 ok / 3 err**、`--legacy` **0/0/2 PASS**；
   `wide-ast`（incremental）**崩溃 0 / 差异 33（=天花板）/ fallback 86**。
   **fallback 比天花板 85 多 1**，因此 `gates` 为 **3 PASS / 1 FAIL / 7 N/A**（差的就是这一道尺子）。
   这一条**没有掩盖**：§4/§5 给了定位口径与最小复现；`gates` 未全绿就是未全绿。

---

## 1. 改动文件（5 个：4 修改 + 1 新建）

| # | 文件 | 内容 |
| --- | --- | --- |
| 1 | `typescript/tokens/declarations/forms/type-alias-declaration-mount.xl.md` | `ShouldMount` / `AttachPlaceholder`（trivia 占位）→ **`TryBuild`**：在 `type` 关格把 `start..tokenIndex` 搬进**真壳**，`Incremental = true`，`host.MountedUnit = shell`，并补一次 `shell.ComputePossibleShapes` |
| 2 | `typescript/tokens/declarations/type-alias-declaration-shape.xl.md` | 新增 `BodyBracket` / `Literal` / `UnionShape` / `NameBuilt` / `HasParams` / `SeenEqual` / `TypeBasePos` / `PendingBasePos` / `MemberCatalogInstalled` / `Finished` / `Incremental`；`OnBracketCreatedEvent`（`{` 创建格建 TypeLiteral）、`ComputePossibleShapes`（逐格驱动）、`TryToClose` / `ExitOrPre`（EOF / 父括号闭括号收口）、`BuildAliasName`、`CloseTypeLiteral`、`ComputeEndIndex`（`;` / 换行 ASI / EOF）、`FinishAt`、`PeekMappedHead`；`FromUnits` 增可选 `basePos` 并消费**已建**的 `IdentifierShape` 名字与单个已建类型节点 |
| 3 | `typescript/tokens/declarations/type-alias-literal-start-possible-shape.xl.md`（新） | 类型字面量成员目录的**门**：首个成员出现时换成 B2c 的 interface 成员目录（`PropertySignature` / 方法 / 索引 / 调用 / 构造）；`[` 开头或带 `+`/`-`/`readonly` 修饰的映射类型让 Reject（整段交 legacy `ParseMappedType`） |
| 4 | `typescript/tokens/statements/declaration-statement-possible-shape.xl.md` | `TypeAliasDeclarationMount.TryBuild` 接线（interface 之后、`super.BuildByIndex` 之前）；不再挂 trivia 占位 |
| 5 | `typescript/tokens/types/type-builder.xl.md` | `ParseTypeLiteral`：`TypeBuilder.ConsumeBuiltMembers` 为真时消费早建成员形状（只为「字面量后还有续接」的放弃路径保留；默认 `false`，legacy / interface 建树逐字节不变） |

---

## 2. 逐格证据（`node typescript/cases/tts/tools/tshape-judge.mjs trace <file>`）

### 2.1 `type T = { a: number; b?: string }`（acceptance 第 1 条）

| shape | step | char | 说明 |
| --- | ---: | --- | --- |
| `TypeAliasDeclarationShape` | **7** | `" "`（`type` 关格） | 真壳（非占位） |
| `IdentifierShape`（T） | **9** | `=` 关格 | 名字关闭格 |
| `TypeLiteralShape` | **10** | `{` | **`{` 创建格**，`Pos=9` |
| `PropertySignatureShape`（a） | **14** | `:` 关格 | + `IdentifierShape(a)@11` |
| `PropertySignatureShape`（b） | **24** | `?` 关格 | 最后成员，`}` 格收口 |
| `NumberKeywordShape` | 22 | `number` 关格 | 类型字面量成员值类型 |
| `QuestionTokenShape` / `StringKeywordShape` | 34 | `}` | **最后一个无分隔符成员的收口**（与 interface 同手法），不是整棵子树 |

`}` 格之前 `TypeAliasDeclarationShape` / `TypeLiteralShape` 都已存在；`}` 格没有新的
`TypeAliasDeclarationShape` / `TypeLiteralShape` / `PropertySignatureShape`（同类外壳已建）。

### 2.2 `type U = A | B`（acceptance 第 2 条）

早期版本在第一个 `|` 闭合格建 `UnionTypeShape`（`A`/`B` 各自由 `TypeBuilder.ParseType` 建
`TypeReferenceShape`），读数曾为 `UnionType@48 / TypeReference@48`。但同一实现让
`tests/cases/token/types/type-union-leading-bar.ts`、带行注释尾的 union、以及
`=>` 优先级组合出现区间/结构差（`wide-ast` 一度 79 差异），因此**已关闭早建**：
现在 `A` / `|` / `B` 在别名收口格由 legacy `ParseUnionType` 一次建出。
→ **acceptance 第 2 条未达成**，这是本棒最大的未完成项（§4.1）。

### 2.3 `type F = (x: number) => void` / `type M = { [K in keyof T]: T[K] }`

| 形态 | 早到的形状 | 类型节点首见 |
| --- | --- | --- |
| `type F = …` | `TypeAliasDeclarationShape@7`、`IdentifierShape(F)@9` | `FunctionTypeShape` 在别名收口格（下一条语句首词 / `;` / EOF），**不在** `(` / `=>` 格 |
| `type M = …` | 同上 | `MappedTypeShape` 在收口格；`{` 不做 TypeLiteral 早建（`PeekMappedHead` 认出 `[` 头，整段交 `ParseMappedType`） |

→ acceptance 第 3 条**未达成**（函数类型 / 映射后置；映射属任务书允许后置项）。

---

## 3. 门控 / 兼容纪律

- 真壳只在 `StatementRouteUtil.IsIncrementalShapesEnabled()` 为真、且
  `StatementRouteUtil.IsDeclarationHost(host)`（根层 / 模块块）时挂；`export type` / `declare type`
  与非声明宿主一律返回 `null`，逐字落回既有声明壳。
- 收口全部走 `TypeAliasDeclarationShape.FromUnits`（legacy 同一函数）；`FinishAt` 只做
  「把尾巴还给父单元 + 补一次父目录计算」，不另建 AST。
- `ParseTypeLiteral` 的「消费已建成员」由 `TypeBuilder.ConsumeBuiltMembers` 单点开关控制，
  只在别名早建收口那一拍打开；legacy / interface / 其它族的 `ParseTypeLiteral` 行为逐字节不变
  （`--legacy` 0/0/2 PASS 即为此证据）。
- 映射类型 / 索引签名头（`{ +readonly [K in …] }` / `{ [k: string]: A }`）由 `PeekMappedHead`
  在 `{` 创建格判出，不建 TypeLiteral 早壳，整段留给 legacy。

---

## 4. 未完成项（逐类：最小复现 + 归属）

### 4.1 union（acceptance 第 2 条，未达成）

- 最小复现：`type U = A | B`（无分号）→ `UnionTypeShape` / `TypeReferenceShape` 首见于别名收口格。
- 上一版已实现「`|` 格建 UnionType + 后续成员逐个追加」，但三处实测差值被迫回退：
  1. `type T = | A | B`：前导 `|` 被当成成员前缀，产出嵌套 `UnionType+1 / TypeReference-1`；
  2. `type T = A | B//c\n;`：行注释 + 换行把 `B` 的尾界带进联合区间（`UnionType 896-906 vs 896-898`）；
  3. `type T = (a: A) => B | C`：`|` 优先级属于函数返回类型，早建会包错层。
- 定位口径：`node typescript/cases/tts/tools/tshape-judge.mjs ts tests/cases/token/types/type-union-leading-bar.ts`。

### 4.2 function type（acceptance 第 3 条，未达成）

- 最小复现：`type F = (x: number) => void` → `FunctionTypeShape` 在别名收口格。
- 缺的落点：参数表 `(` 的 `ParameterList` 目录（B1 已有 `ParameterListPossibleShape`，但此处宿主是
  别名壳而非函数声明族）+ `=>` 闭合格建 `FunctionTypeShape` + 返回类型在自己的格建。
- 已有伏笔：`type-fn-return-typeliteral.ts`（`(a: A) => { … }`）一旦由本壳收口，会暴露 interface
  成员里**既有**的增量差异（基线靠整文件 fallback 掩盖）；本棒没有为此加抛错，避免把 fallback 抬得更高。

### 4.3 mapped（任务书允许后置，未达成）

- 最小复现：`type M = { [K in keyof T]: T[K] }` → `MappedTypeShape` 在收口格。
- 现状：`{` 创建格被 `PeekMappedHead` 判为映射头 → 不建 TypeLiteral 早壳；成员目录不装；
  `MappedTypeShape` 由 legacy `ParseMappedType` 在 `;` / 换行 / EOF 一次建出。

### 4.4 fallback 86/85（唯一的门禁红项）

- `wide-ast` incremental：崩溃 **0/0**、差异 **33/33**、fallback **86/85**（多 1）。
  新增的这 1 件 fallback 是「早建字面量后还有续接、放弃早建」路径上的一个文件：
  `ConsumeBuiltMembers` 只覆盖「已建成员被子树消费」的情形，仍有 1 件在放弃后 legacy 解析时抛错 →
  整文件 fallback。定位命令：

  ```powershell
  node tests/parse/wide-ast.mjs            # 看 FileFallbackCount 86 > 85
  # 逐件定位：对语料调用 SourceFileRunner.Parse 后读 StatementRouteUtil.LastFileFallback
  ```

- 没有可用的一行修法时不把该文件「删出语料」或把上限调高；这是本棒留下的唯一门禁债。

---

## 5. 验收读数（同一 bundle）

| 命令 | 基线 `48597fbf` | 本分支 |
| --- | --- | --- |
| `xl_build {core,typescript}` | 631 页 / 0 error / 3 warning | **632 页 / 0 error / 3 warning** |
| `node node_modules/typescript/bin/tsc -p .` | exit 0 | **exit 0** |
| `tts run.mjs --quiet` | PASS 429 | **PASS 429 / FAIL 0** |
| `tshape-judge ts-all` | 429 / 426 ok / 3 err | **429 / 426 ok / 3 err**（同三条 `class-ball` / `expression-zoo` / `generic-container`） |
| `wide-ast`（incremental） | 崩溃 0 / 差异 33 / fallback 98(85+13) | **崩溃 0 / 差异 33 / fallback 99(86+13)** |
| `wide-ast --legacy` | 0 / 0 / 2 PASS | **0 / 0 / 2 PASS** |
| `gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | **3 PASS / 1 FAIL / 7 N/A**（差的唯一一道：incremental `wide-ast` 的 fallback 86 > 85） |

---

## 6. 可复算命令

```powershell
$d = "C:\Users\Admin\Documents\GitHub\xl-example-set\b4c-type-alias"; Set-Location $d
xl_build { cwd: $d, paths: ["core","typescript"], targets: ["ts"] }   # 632 / 0 error / 3 warning
node node_modules/typescript/bin/tsc -p .                              # exit 0

# 逐格 trace（acceptance 第 1 条）
@'
type T = { a: number; b?: string }
'@ | Set-Content -Encoding utf8 tmp/acc1.ts
node typescript/cases/tts/tools/tshape-judge.mjs trace tmp/acc1.ts    # §2.1

node typescript/cases/tts/run.mjs                                     # PASS 429
node typescript/cases/tts/tools/tshape-judge.mjs ts-all               # 426 / 3
node tests/parse/wide-ast.mjs                                         # 0 / 33 / 86(+13)
node tests/parse/wide-ast.mjs --legacy                                # 0 / 0 / 2 PASS
node tests/gates/run.mjs                                              # 3 / 1 / 7
```

`tmp/` 全部 gitignored；`tmp/debug*.cjs` 是本轮定位用的临时脚本，不入库。
