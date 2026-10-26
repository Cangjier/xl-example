# D3e · unmapped 映射表 + `FileFallbackCount` 门禁

| 项 | 值 |
| --- | --- |
| 分支 | `feature/d3e-unmapped`（工作副本 `xl-example-set\d3e-unmapped`），基线 `8b3aa933` |
| 构建 | `xl_build` 628 written / 0 error / 3 warning（E1107 预存）；`tsc -p .` exit 0 |
| 判据 | **未改**：崩溃 / 差异 / 缺 range / 越界仍任一非 0 判红；`unmapped` 与新增计数都**不进** `broken` |
| 改动 | `typescript/cases/ast-compare.mjs`、`tests/parse/wide-ast.mjs`、`tests/gates/run.mjs`（+ 本报告与附录） |

---

## 1. unmapped 1150 条的真相：**全是记号形状，没有一条是缺别名**

`tmp/unmapped-probe.mjs` 在 ON 量尺上按旧口径把 1150 条逐个记账，只有 **8 个名字**：

| kind（`constructor.name` 去掉 `Shape`） | 条数 | 涉及文件 | 是什么 |
| --- | ---: | ---: | --- |
| `WrapSymbol` | 477 | 32 | 空白块（basic token，trivia） |
| `Common` | 337 | 32 | 标识符 / 数字块 |
| `Symbol` | 179 | 30 | 标点块（`=` `;` `,` `=>` …） |
| `Bracket` | 82 | 25 | 开括号块 |
| `LineAnnotation` | 34 | 13 | 行注释 |
| `AreaAnnotation` | 17 | 1 | 块注释 |
| `String` / `ConstString` | 12 / 12 | 9 | 字符串块及其内容块 |

这 8 个名字的 `folded === kind`（`TS_KIND_ALIASES` 里没有、也不该有），而且 **一个都不是 `ts.SyntaxKind`**：
它们是 `core/syntax/basic-tokens/` 里那批 `IsBasicToken = true` 的**记号**形状，`Data` 里摆的是那段源码的
**记号序列**（`wrap-symbol.xl.md`：“`Data` 里摆的就是那段源代玛的记号序列”）。

**所以「1150 条映射缺别名」这个诊断不成立**：`TS_KIND_ALIASES` 补不动它——那张表的语义是
「同一个枚举值的两个反查名」，而这些名字对应的是**另一层**（token 层），没有任何 TS 节点能折过去。
把它们塞进别名表才是**改判据**。

为什么它们会被算成 unmapped：TS 侧 `forEachChild` **从不**交出空白与标点（只交出声明的 token 字段，
例如 `MappedTypeNode.questionToken`），产物侧却把记号形状挂在 `Data` 上。于是同一批形状同时制造两种假读数：
**假结构差**（`WrapSymbol+6` / `Common+7` / `Symbol+5` / `Bracket+1`）和**假未映射**。

**默认路径一个都没有**：`tmp/count-check.mjs` 在默认开关下 `tokenLeaf=0 / tokenRecursive=0 / realUnmapped=0`，
2562 件语料 0 处。只有 `EnableIncrementalShapes` 走增量形状时才会把记号留在 `Data` 里。

## 2. 修法：在**唯一投影口径**里判「记号不是节点」

`typescript/cases/ast-compare.mjs` 新增 `isAstShape(shape) = shape.IsBasicToken !== true`，
`cjAst` 的 children 改为 `(shape.Data || []).filter(isAstShape).map(cjAst)`；
`tests/parse/wide-ast.mjs` 的 `walkFoundation` 同样先摘掉记号形状（只计数，不递归 —— basic token 是叶子）。

- **不是第二份投影**：过滤规则只写在 `ast-compare.mjs` 一处，`wide-ast` 从那里 import。
- **不是放宽判据**：摘掉的是 TS 侧结构上不可能存在的记号形状；真实节点一个没少（见 §4 的
  `ast:cases` / `ast:token` / `real-dts-ast` 逐项不动）。
- **可核对**：`wide-ast` 把摘掉的数量印成一行 `记号形状 … N 个`；默认路径打印 `0 个；本趟默认路径没有残留`，
  所以「这条过滤在本趟是空转」是可读的事实，不是承诺。
- **嵌套说明**：旧口径递归进记号形状内部，还会多数出 12 个 `ConstString@String`（字符串块的内容块）——
  总数 1138 + 12 = 1150，与 D3 §5 的 1150 对得上。按「记号是叶子」的新口径是 **649 个**。

## 3. `FileFallbackCount`：从隐性债变成可读指标（只告警，不判红）

`SourceFileRunner.Parse` 的两级结构里，`ParseCore(shell=true)` 抛异常后才走 `ParseCore(shell=false)`，
并置 `LastFileFallback`（救回来的那一支）与 `FileFallbackCount`（每次尝试 +1）。`wide-ast` 现在**只读**这两个字段：

```
FileFallbackCount 167（靠 EnableFileFallback legacy 重解析才通过的文件数；基线 167，增量形状 ON / D3 §4 实测 167）
FileFallbackAttempts 288（Parse 层 fallback 尝试次数，含救不回的崩溃）
FileFallbackByFamily dist/ts/typescript=95、tests/cases/token=44、node_modules/@types/node=10、dist/ts/core=10、…
```

- **基线两条，按量尺分开**（写死一条就是错的红线）：增量形状 **ON = 167**（D3 §4 的那 167）；
  **默认路径 = 2**（全语料只有 2 件走 shell 路径失败）。
- **只告警**：`fileFallbackCount > 基线` 时打 `WARN FileFallbackCount 比基线 … 多了 N 个文件`，
  `broken` 不含它 —— 现有 167 不会因此变红。`gates` 摘要里可读（`run.mjs` 新增 `gate.summary` 正则，
  **只影响怎么印，不参与 PASS/FAIL**）：

```
ok    wide-ast       9.8s  PASS 宽尺子：… 地基 0 处  ·  FileFallbackCount 2（… 基线 2，默认路径 / D3e 实测）
```

`FileFallbackByFamily` 按**目录族**分桶，不是按首跳消息：首跳异常在 `Parse` 的 `catch` 里被吞掉且不挂
`InnerException`（D3 §2），外层拿不到它的 message——这是同一笔债的另一个可见面（留给后续 WP）。

## 4. 读数：接受什么、没接受什么

| 指标 | 基线 `8b3aa933` | D3e | 结论 |
| --- | ---: | ---: | --- |
| wide-on 崩溃 | 121 | **121** | 不变（不动 parser，零崩溃风险） |
| wide-on 差异文件 | **102** | **102** | **未达 ≤70**，原因见 §5 |
| wide-on `structural` 条 | 734 | **598** | −136：全是摘掉的假结构差 |
| wide-on `moved` 条 | 129 | 129 | 不变 |
| wide-on `unmapped` 条 | **1150** | **0** | 目标达成（32 个文件清零） |
| 「原来通过现在失败」 | — | **0** | 逐文件复核：默认路径 2562 件全一致 |
| 默认 wide-ast | PASS 2562/0 | **PASS 2562/0**，`记号形状 0`、`FileFallbackCount 2` | 不动 |
| `tts:cases`（ts-all 429） | 429 PASS（426 incremental / 3 throw） | **429 PASS / 0 FAIL** | 不动 |
| `ast:cases` | 6171 条 / 6166 一致 / 5 结构差 | **6171 / 6166 / 5** | 逐项同值 |
| `ast:token` | 1716 / ok 1706 / crash 0 / diff 0 | **1716 / 1706 / 0 / 0** | 逐项同值 |
| `real-dts-ast` | 226/226 | **226/226** | 不动 |
| `gates` | 4-0-7 | **4-0-7** | PASS/FAIL 未被新计数改变 |

> `ast:cases` 会重写两份 `typescript/cases/astjson/*.cj-ast.json` 快照；那是 **HEAD 快照 vs 当前构建**的
> 预存漂移（stash 掉本次改动重跑，漂移一模一样），与本次改动无关，已 `git checkout` 还原、未提交。

## 5. 为什么差异停在 102：那 32 个文件不是「只有 unmapped」

逐文件核过（全表见 [`D3e-residual.md`](D3e-residual.md)）：**32 个 unmapped 文件里，过滤后仍有非记号差异的有 32 个**，
一个都没有「只剩记号差异」。两个例子：

```
tests/cases/token/ambiguous/am-call-type-args.ts
    VariableStatement-1  VariableDeclarationList-1  VariableDeclaration-1  Identifier-4
    CallExpression-1  NumberKeyword-1  PropertyAccessExpression-1  StringKeyword-1
    （旧：WrapSymbol+6 Common+7 Symbol+5 Bracket+1 ← 本次已清零）
tests/cases/token/types/type-mapped-modifier-in-generic.ts
    DeclareKeyword-1 Identifier-6 TypeReference-4 MappedType-1 MinusToken-1 TypeParameter-1
    TypeOperator-1 IndexedAccessType-1
```

`VariableStatement / VariableDeclarationList / VariableDeclaration 三连 -1` 正是 D3 §5.2 的 **A 类**根因
（ownership = `variable-declaration-*`，D3a），`MappedType-1 / MinusToken-1` 是 D3b / D3c 的表达式与类型侧。
**差异文件数是「文件有多少条差异」的函数，不是「差异有多少条」的函数**：把 136 条假结构差清零只让
`structural` 从 734 掉到 598，翻不动任何一个文件的干净与否。D3 §7.1 预测的「102 − 32 = 70」
隐含了「这 32 个文件是纯 unmapped」这个前提，**实测该前提不成立**。

要让 102 走到 ≤70，D3e 之外还需要 D3a 的三连（`Am-call-type-args` 这类文件正是它）——本波已经把
「哪 32 个文件、各自还差什么」逐条列在附录里，D3a/D3b 可以直接照着收。

## 6. 复算

```powershell
$d="C:\Users\Admin\Documents\GitHub\xl-example-set\d3e-unmapped"; Set-Location $d
npm run build                                   # 628 written / 0 error；tsc exit 0
node tmp/unmapped-probe.mjs                     # 旧口径 unmapped 名单（8 个名字 / 32 文件 / 1150 条）
node tmp/count-check.mjs --on                   # tokenLeaf=649 tokenRecursive=1138 realUnmapped=12(全是 ConstString@String)
node tmp/wide-on.mjs --top 0 --verbose          # 崩溃 121 / 差异 102 / structural 598 / unmapped 0 / FileFallbackCount 167
node tests/parse/wide-ast.mjs                   # PASS 2562/0；记号形状 0；FileFallbackCount 2
node tests/gates/run.mjs                        # 4-0-7，wide-ast 那行带 FileFallbackCount
npm run tts:cases                               # 429 PASS / 0 FAIL
```

`tmp/` 全部 gitignored，不提交；本波新增的探针都在 `tmp/`（`unmapped-probe.mjs`、`count-check.mjs`、
`predict.mjs`、`count-check.mjs`、`residual.mjs`），可随时重跑复算。
