# HANDOFF — S3a + S3b 收尾 r2（结构证明达成）

分支 `feature/possible-statement-s3-ops`（本目录 r2），基线 `f6b2df07`。只改本分支：未改 `core/`、未改 `StatementBoundaryUtil.IsAsiBoundary`、未 push/merge。
（本文件取代 `HANDOFF-s3-ops-r2.md`：那份经 pwsh 命令行传中文被转成了乱码，内容以本文件为准。）

## 1 诊断：problems 原文与调用证据

`op-proof` 的 problems **原文**只有一类（上一棒被 grep 过滤掉的正是它）：

```
FAIL  op-mul-add  "1*2+3;"
        结构文本不符：期望 ["+(*(1,2),3)"] 实际 []
...（同样的「期望 X 实际 []」共 9 条）
FAIL  op-prefix  "-a+b;"
        结构文本不符：期望 ["+(-(a),b)"] 实际 ["-(a)"]
FAIL  op-multi-statement  实际 ["a"]
```

**没有** `Incomplete.Reason`、**没有** `bodies=0`、**没有**抛错：`TotalBodies=1`、`TotalInserts` 已随格增长、XML 逐字节等于 legacy。三条错误假设因此被排除。

**prototype patch 逐格取证**（untracked 临时 `.cjs`，未提交）——`ComputePossibleShapes` 覆写**确实被调用**，每格 `Data` 增长一格，单元序列是 `Common` 标识符/数字 + `Symbol` 运算符（首格就已含两个单元）：

```
1+2;    cell1 dataLen=2 Ingest Common[1], Symbol[+]  -> text="+(1,?)"  frames=1
        cell2 dataLen=3 Ingest Common[2]             -> text="+(1,2)"   frames=1 expect=2 LastComplete=false
1*2+3;  cell1 dataLen=2 Ingest 1,*   -> "*(1,?)"
        cell2 dataLen=3 Ingest 2     -> "*(1,2)"
        cell3 dataLen=4 Ingest +     -> "+(*(1,2),?)"   （InsertBetween 已发生）
        cell4 dataLen=5 Ingest 3     -> "+(*(1,2),3)"   frames=1 expect=2 LastComplete=false
-a+b;   cell1 dataLen=2 Ingest -,a   -> "-(a)"  frames=0 expect=2 LastComplete=TRUE  ← 中途快照被发布
        cell2 dataLen=3 Ingest +     -> "+(-(a),?)"
        cell3 dataLen=4 Ingest b     -> "+(-(a),b)"  frames=1
```

**根因（两条，都在「发布判据」，不在识别/插入）**：

1. `LastComplete` 判的是 `Frames.length == 0`，但**已完成**的二元节点只在「后面来了更低/同级优先级运算符」时才弹栈；一条表达式跑完时栈里仍压着一串 `FramePending == false` 的节点。于是最终格永远 `LastComplete=false`，`ShapeTexts` 永远收不到最终结构（`-a+b` 例外地收下了中途的 `-(a)`）。
2. 发布必须「按体覆盖」：同一个体在多格上可能多次「恰好完整」（`1*2+3` 在 `2` 之后是 `*(1,2)`），只有最后格的覆盖结果才是整条表达式。

另有两处与用例口径不符（9/12 之后的剩余 3 条）：括号节点被渲染成前缀 `(+(b,c))`，而用例口径是中缀 `(b+c)`；ASI 要向前看一个单元，下一语句的首个标识符会先进本壳并触发 `Fail`，把已完整的 `+(a,b)` 撤掉。

## 2 修法（只改 `statement-operator-body.xl.md`；`statement-shape` 的覆写与 `root-expression` 的建体未动）

| 改动 | 内容 |
| --- | --- |
| `IsComplete()` | `!Incomplete && Expect == ExpectOperator && 无帧在等右操作数`；**不看 `Frames.length`**（栈里的都是已建完的节点；收口不需要弹栈，也没有弹栈的时机） |
| `Slot` + `Publish()` | 每个体在 `ShapeTexts` 里占一个固定槽位，之后每格**覆盖**同一槽位；中途快照不会作为独立条目留在证明里 |
| `Fail()` 撤槽 | 判 `Incomplete` 时撤回自己的槽位（仅当它是最后一条时 pop），半棵树不冒充结构证明 |
| `Nested` + `Counted` | 括号内部的嵌套体只建树：不发布、不刷新进程级读数、不计入 `TotalBodies`；`TotalBodies` 移到首次 `IngestAll` |
| `RenderInfix()` | 括号节点渲染**中缀**：`a*(b+c)` → `*(a,(b+c))` |
| `Closed` | 「期望运算符却来了能当操作数起点的 `Common`」判为 ASI 语句边界并撒手，**不算未实现**（原来会 `Fail` 并撤掉已完整的 `+(a,b)`） |

## 3 op-proof 逐条（本机实测，12/12）

```
PASS  op-mul-add          texts=["+(*(1,2),3)"]                    inserts=2 bodies=1
PASS  op-add-mul          texts=["+(a,*(b,c))"]                    inserts=2 bodies=1
PASS  op-sub-left         texts=["-(-(a,b),c)"]                    inserts=2 bodies=1
PASS  op-paren            texts=["*(a,(b+c))"]                     inserts=2 bodies=1
PASS  op-mixed            texts=["-(+(a,*(b,c)),/(d,e))"]          inserts=4 bodies=1
PASS  op-ident-only       texts=["+(a,b)"]                         inserts=1 bodies=1
PASS  op-div-mul          texts=["*(/(1,2),3)"]                    inserts=2 bodies=1
PASS  op-paren-chain      texts=["*(*(a,(b+c)),d)"]                inserts=3 bodies=1
PASS  op-prefix           texts=["+(-(a),b)"]                      inserts=1 bodies=1
PASS  op-multi-statement  texts=["+(*(1,2),3)","+(a,*(b,c))"]      inserts=4 bodies=2
PASS  op-asi              texts=["+(a,b)","*(c,d)"]                inserts=2 bodies=2
PASS  op-unsupported-call texts=[]                                 inserts=0 bodies=1
[op-proof] group=operators-live cases=12 pass=12 fail=0 | 结构文本已核 12 条、InsertBetween 计数已核 11 条
```

- `1*2+3;`：`ShapeTexts = ["+(*(1,2),3)"]`、`TotalInserts = 2`、`bodies = 1` —— 与 `HANDOFF-s3-ops.md` §1.3 的表逐字一致。
- `a+b*c-d/e;`：`-(+(a,*(b,c)),/(d,e))`、inserts=4（表给的下限 3：`+` 插、`*` 插、`-` 弹栈后插、`/` 插，四次都是增量插入）。
- `a*(b+c);` inserts=2 而表写 1：`TotalInserts` 是进程级计数，括号内部的嵌套体也插了一次（内层 `+`），外层 `*` 一次。结构文本仍按口径。
- `op-unsupported-call`（`f(1, 2);`）：`texts=[]` 且 `incomplete=true` —— 未覆盖构造不建错树，也不留下半棵树。

## 4 全表读数（本轮实测，退出码全 0）

| 仪器 | exit | 关键读数 |
| --- | --- | --- |
| tsc | 0 | 无输出 |
| op-proof | 0 | cases=12 pass=12 fail=0 |
| op-harness（operators-live） | 0 | pass=12 fail=0 uncovered=0；互斥 cells=86 candidateCalls=408 acceptCells=15；double-accept 冲突 0；file-fallback 0 |
| all | 0 | groups run=6；cases pass=72 fail=0 known=1；互斥 cells=422 candidateCalls=2627；冲突 0；fallback 0 |
| all --double-accept | 0 | cases=91 failed=0；冲突 0 |
| all --lint | 0 | PASS（ASI 实现唯一 / 优先级数字表只在 operator-table，条目=12） |
| validate | 0 | — |
| ast-json | 0 | 各组 cj-ok 全通过（declarations 817/817、basic-token 221/221…），cj-fail=0 |
| ast-json-diff | 0 | 每组「完全一致 N / N」 |
| token-ast | 0 | 全 OK |
| real-dts | 0 | 文件 226（跳过非法 0）：解析成功 226、崩溃 0；AST 完全一致 226、差异 0 |
| feas-operator | 0 | cases=6 pass=6 fail=0 |
| insert-between | 0 | tests=9 pass=9 fail=0 |
| perf | 0 | long(300) 12.80ms；many(2000) 31.55ms；scale 2.04/3.85/13.78ms，ratio 1.89 / 3.58（>2.5 为既有告警，不判失败） |

`ast-json` 跑完后已 `git checkout -- typescript/cases`（工作树无残留）。

## 5 剩余问题（未覆盖清单，S3c+）

1. 体只接管**形状层**：AST 仍由 `StatementBuilder` 从 raw 单元逐字节建（`BuildFromShell` 未改），本棒**不产出 AST**；接 AST 时要改成「叶子持 raw 单元 + 形状交给构造器」（见 `HANDOFF-s3-ops.md` §1.4）。
2. 未覆盖构造仍按约定 `Incomplete` 停摄入、不建错树：字符串/模板/正则字面量、数组/对象字面量、成员访问 `.`/`?.`、索引 `[...]`、调用 `(...)`、赋值与复合赋值、条件 `?:`、逗号、箭头函数、`**`、`&& || ?? << >> & | ^`、比较族、`instanceof`/`in`、`++/--`、关键字/字面量起点、`.5` 这类以 `.` 开头的数字、`0x/0b/0o/1_000/1n` 的数值判定。
3. 表达式体只覆盖**根层**语句；`{ ... }` 块内仍走 legacy 表达式路径。
4. `--double-accept` 的 KNOWN 项（`as` 的固定优先级 11 在 `expression-builder.js:311`）不在本棒范围，读数与上一棒一致。
5. `perf` 的 scale ratio 仍有一条 > 2.5 的既有告警（`400/200 = 3.58`），与本棒无关：改的是发布判据，不在每格热路径上新增分配。
6. 本棒未新增用例文件：`op-cases.json` 与 `op-proof.mjs` 沿用上一棒，12 条全部由规格表驱动。

## 6 开关状态与 AST 中性

- `StatementRouteUtil.EnableShellExpressions` **默认启用**（与上一棒一致）；体只在 `StatementShape.OperatorBody` 字段上，**不注册进 `CatalogGuide`**，不参与 `Accept`/`Reject`。
- AST 中性由 `op-proof` 的断言守住：壳 XML 与 legacy XML 逐字节相同、无文件级 fallback、XML 里不出现 `<StatementShape>` / `<StatementOperandShape>` / `<StatementOperatorBody>`。12/12 通过 ⇒ 体没有漂进 XML。
- 关掉本棒行为：置 `EnableShellExpressions = false` 走 legacy，或去掉 `root-expression-statement-possible-shape.xl.md` 里的建体一行；旧门两种状态下都不依赖体。
