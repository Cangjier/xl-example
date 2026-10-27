# T8g — 最后一个单文件小 case：`types/type-cond-in-annotation.ts`（类型标注里的条件类型）

分支 `feature/all-possible-1027-t8g`，基点 `feature/all-possible-1027` @ `e4907d74`（T8f 已合入）。
工作副本 `C:\Users\Admin\Documents\GitHub\xl-example-set\all-possible-1027-t8g`。

## 1. 复现（口径先对齐 T8f §1）

正文一律走 `readCaseFile(file, "token").body`（**不 trim**，保留尾部换行）：

| 项 | 值 |
|---|---|
| 文件 | `tests/cases/token/types/type-cond-in-annotation.ts` |
| 正文 | `let x: T extends U ? A : B\n`（**27 B**，尾部有换行） |
| 首跳（`ParseCore(shell=true)`） | `增量变量形状未支持：declaration 声明体` |
| 默认路径（`Parse`） | `LastFileFallback=true`、`FileFallbackCount +1` |
| `tshape-judge ts` | `{"status":"incremental-error","step":287,"error":"…declaration 声明体"}` |
| TS 侧 | `parseDiagnostics=0` ⇒ **不是** `xl:ts-invalid` |

全语料基线（1716 条，`tmp/t8g-fallback-base.json`）：**FALLBACK = 61**，与任务书 / T8f 逐个对上。

> 顺带记一个探针陷阱（比 T8f §1 更隐蔽的一个）：`firstHop` 里翻 `EnableIncrementalShapes` 必须
> **存旧值再恢复**，不能写死 `true → false`。该字段默认就是 `true`，写死 `false` 会把后续每一条
> `Parse` 都赶到关闭态，凭空多出 **55 条**假 fallback（我第一遍就量成 116）。

## 2. 归类：不是任务书排除的任何一族

| 排除线 | 本 case |
|---|---|
| A3 数字 / 原子 postfix | ✗ 源码里没有数字字面量、没有后缀括号 |
| 箭头大族 | ✗ 没有 `=>`、没有形参类型标注 |
| `xl:ts-invalid` | ✗ TS `parseDiagnostics=0` |
| import / tag / 类型实参 postfix | ✗ 首跳落在**变量声明的类型注解**上，不是表达式后缀面 |

它落在**类型队列面**：注解里的 `T extends U ? A : B` 必须长成 `ConditionalTypeShape`，
不能被通用队列的 `TernaryOperatorReorganization` 收成三元表达式（case 的 `xl:note` 就是这个意思）。

## 3. 根因：注解落早了，`extends …` 全留在 `Data` 里

`VariableDeclarationShape.TryBuildAnnotation` 在**每个新单元关闭那一拍**尝试把注解落地，
落地判据是 `TypeCatalogFactory.CanEndType(lastTypeUnit)`。逐单元 dump（`tmp/t8g-dbg.mjs`）实测：

```
[TryBuildAnnotation] Data = [IdentifierShape(x 4..5) | ":"]                    -> 未落地
[TryBuildAnnotation] Data = [IdentifierShape | ":" | "T"]                      -> 落地！Data 变 [Ident, TypeReference(T)]
[AdvanceTypeMode]   Data = [Ident | TypeReference(T) | "extends"]              -> AnnotationDone 已是 true，不再尝试
... "U" / "?" / "A" / ":" / "B" 依次原样追加
[FinishIncremental] Data = [Ident | TypeReference(T) | extends | U | ? | A | : | B]
                    THREW 增量变量形状未支持：declaration 声明体
```

`FinishIncremental` 的契约是「`=` 之前最多一个非 basic 形状（注解）」；`extends` 是 `Common`（非 basic）
⇒ 第二个非 basic 单元 ⇒ 抛 `declaration 声明体` ⇒ 整文件 C10 回退 legacy。

**为什么在 `T` 就落地**：`CanEndType` 只看 `NextSignificantChar`：

```ts
static field TypeContinuation:string = ".[<|&?>"   // 全是符号
const next = NextSignificantChar(unit);            // 下一个显著字符
return TypeContinuation.indexOf(next) < 0;         // 不续接 ⇒ 可以落地
```

`T extends …` 里 `T` 的下一格是 **`e`**，不在 `TypeContinuation` 里 ⇒ 判「类型已完」。
`extends` 是这个位置上**唯一的单词续接器**（`infer` / `keyof` / `readonly` 都在它右边或类型之前）。

## 4. 改动（1 个文件）

`typescript/tokens/types/type-catalog-factory.xl.md`：

1. `CanEndType` 补一条：下一个**独立单词**是 `extends` ⇒ 类型还没长完（+2 行行为，其余是注释）。
2. 新增 `static method NextWord:(unit:Token)=>string`：`unit` 之后的下一个单词（跳过空白与两种注释，
   取连续 `[A-Za-z_$]`）。与 `StatementScanner.NextWord` **同一口径**，但不反向 import 语句层
   （`types/` 目前对 `statements/` 零依赖，这条保持不变）。

为什么必须用「单词」而不是 `NextSignificantText(unit, 7)`：后者把空白也跳掉了，
`extends U` 与 `extendsFoo` 在它眼里都是 `extends?`，分不开；而
`let x: T` ⏎ `extendsFoo()` 是**下一条语句**（合法 TS），判成条件类型会让注解永远落不了地。

**没做什么**：不新增 guide、不碰 `ContainerCloseGuide`、不删 `StatementShape`、
不动任何箭头 / 数字 postfix / 类型实参 postfix / 前缀一元 postfix 判据、不改 30 target 行为、不跑 gates。
`CanEndType` 的调用点**只有一个**（`variable-declaration-shape.xl.md:257`），爆炸半径是一格。

## 5. 结果

| 项 | 要求 | 实测 |
|---|---|---|
| `xl_build(core,typescript → ts)` | 0 error | **0 written / 637 skipped / 0 error / 3 warning**（既有 3 条 E1107） |
| `node node_modules/typescript/bin/tsc -p .` | exit 0 | **exit 0** |
| 选中 case `tshape-judge ts` | status=ok | **`{"status":"ok","structural":[],"moved":[],"fields":[]}`** |
| 选中 case 默认路径 | `LastFileFallback=false` | **false，`cntDelta=0`，首跳不再抛** |
| 全语料 fallback | 61 → ≤60 | **61 → 60**（`tmp/t8g-fallback-after.json`；对比 base：**FIXED=1 / REGRESSED=0**） |
| 全语料 AST 逐文件哈希（1716 条） | 无漂移 | **1716/1716 逐字节相同**；唯一变化是被修好的那条的 `fb` 标志翻成 `inc` |
| 30 target（`node tmp/target-cases.mjs`） | 30/30、fallback=0 | **cases=30 ok=30 moved=0 diff=0 error=0 fallback=0 \| LastFileFallback=0 \| pin-miss=1** |
| 5 smoke `ts.json` SHA256 前 16 位 | 不变（`BB07DA2201FC5087`） | **5 份全 `BB07DA2201FC5087`** |

- `pin-miss=1` 是既有现象（026 的 `// xl:expect fallback`），与本轮无关。
- AST 哈希的取法：`SourceFileRunner.Parse(body).ToAstLine(0)` 的 sha256，逐文件一行
  （`tmp/t8g-corpus-hash.mjs`）。改前快照是 `git stash` 掉本文件后**重新 build 再取**的，
  不是「同一份 build 跑两遍」——所以「1716/1716 相同」是**改前 vs 改后两份产物**的比对。

## 6. 边界矩阵（改前 / 改后，`tmp/t8g-matrix.mjs`）

| 源码 | 改前 | 改后 |
|---|---|---|
| `let x: T extends U ? A : B` ⏎ | FALLBACK（声明体） | **ok** |
| `let x: T extends U ? A : B;\n` | FALLBACK | **ok** |
| `let x: T extends U ? A : B, y: number;\n` | FALLBACK | **ok** |
| `const x: A extends B ? C : D = 1;\n` | FALLBACK | **ok** |
| `let x: T extends U ? A : B extends C ? D : E\n` | FALLBACK | **ok** |
| `let x: T /* c */ extends U ? A : B\n` | FALLBACK | **ok** |
| `let x: Array<T> extends U ? A : B\n` | FALLBACK | **ok** |
| `let x: (A | B) extends C ? D : E\n` | FALLBACK | **ok** |
| `for (let x: T extends U ? A : B; ; ) {}\n` | ok | ok |
| `let x: T\n` / `let x: number = 1;\n` | ok | ok（普通注解不动） |
| `let x: T\nextendsFoo()\n` | ok | ok（**单词边界**：更长的标识符不当地续接） |
| `let x: T\nextends U ? A : B\n` | ok | FALLBACK（声明 `:`） |
| `let x: T extends`（不完整，非法 TS） | FALLBACK | FALLBACK（声明体） |
| `let x: T extends U ? A : B`（**无尾换行**） | FALLBACK | FALLBACK（声明 `:`） |

两处「改后退化」都不是回归：

- `let x: T\nextends U ? A : B` 本身**不是合法 TS**——`tshape-judge` 判 `ts-invalid`
  （`Declaration or statement expected.`）：声明在换行处就 ASI 了，`extends` 开不了语句；
- `无尾换行` 是 T8f §1 已记录的声明壳收口口径（`let v: any` 同样如此），改前也 fallback。

全语料逐条比对（`tmp/t8g-diff.mjs`）确认：**REGRESSED=0**，语料里也**不存在**这两种形态。

## 7. 复现

```powershell
$id = "all-possible-1027-t8g"
Set-Location C:\Users\Admin\Documents\GitHub\xl-example-set\$id
# xl_build(cwd=$PWD, paths=["core","typescript"], targets=["ts"])  → 0 written / 637 skipped / 0 error
node node_modules/typescript/bin/tsc -p .
node tmp\t8g-one.mjs tests\cases\token\types\type-cond-in-annotation.ts   # 首跳 + 默认路径
node tmp\t8g-probe.mjs tmp\t8g-fallback-after.json                       # 全语料 fallback（60）
node tmp\t8g-diff.mjs tmp\t8g-fallback-base.json tmp\t8g-fallback-after.json   # FIXED / REGRESSED
node tmp\t8g-corpus-hash.mjs tmp\t8g-after.tsv                           # 逐文件 AST 哈希（配 git stash 对拍）
node tmp\t8g-tsv-diff.mjs tmp\t8g-before.tsv tmp\t8g-after.tsv
node tmp\t8g-matrix.mjs                                                  # 边界矩阵
node tmp\t8g-smoke.mjs                                                   # 5 smoke SHA16
node tmp\target-cases.mjs                                                # 30 target
node typescript\cases\tts\tools\tshape-judge.mjs ts tests\cases\token\types\type-cond-in-annotation.ts --out tmp\t8g-judge-final
```

`tmp/` 被 gitignore；本轮新增 `tmp/t8g-{one,probe,diff,dbg,dbg2,matrix,corpus-hash,tsv-diff,smoke}.mjs`、
`tmp/t8g-fallback-{base,after,after2}.json`、`tmp/t8g-{before,after}.tsv`、`tmp/smoke-in/`、`tmp/smoke/`、`tmp/probe/`
全部只在本地。

## 8. 结论

`type-cond-in-annotation.ts` **不是**箭头 / A3 postfix / `xl:ts-invalid` 里的任何一族，
它是**类型面**的单点缺口：`CanEndType` 只认符号续接器，漏了条件类型的单词续接器 `extends`，
于是注解在 `T` 就落地，`extends U ? A : B` 全部落到收口格的 `declaration 声明体` 上（C10 回退）。

修法是给 `CanEndType` 补一条「下一个独立单词是 `extends` ⇒ 类型还没长完」，
外加一个不跨层依赖的 `NextWord` peek。fallback **61 → 60**，1716 条语料 AST **逐字节不变**，
30 target 与 5 smoke 读数逐位不变。

**给下一轮**：剩下 60 条里已经没有「单文件 + 单个已存在实参 / 单个缺失判据」的候选了——
按 T8f §7 的分组，其余全部是 A3 postfix（类型实参 / 数字 / 前缀一元）、箭头体、三元、
`new`、import 家族或带 `xl:ts-invalid` 的类级面；继续做单点收口已经无利可图，
下一步要么按族推进（先定 A3 postfix 的候选目录），要么停止。
