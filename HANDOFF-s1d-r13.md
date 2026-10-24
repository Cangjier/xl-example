# HANDOFF — T1d r13：文件级 fallback 落地，`EnableShellExpressions` 默认开启；dev 22/22、七门全绿

分支 `feature/possible-statement-s1d`（本目录 r13），起点 `54727356`（r12）。本轮 xl_build 0 error、tsc 0 error。

## 1. 共同入口结论（先查后改）

一个文件进解析器只有**一个**入口：`typescript/run/source-file-runner.xl.md` 的
`SourceFileRunner.Parse(text, filePath)`（静态、无跨次状态）。七道门里六个直接调它：

| 门 | 入口 | 位置 |
| --- | --- | --- |
| `tests/statement-possible/harness.mjs` | `SourceFileRunner.Parse` | `parseCj()` |
| `typescript/cases/ast-json.mjs` | 同上 | 第 153 行 |
| `typescript/cases/token-ast.mjs` | 同上 | 第 173 行 |
| `typescript/cases/real-dts-ast.mjs` | 同上 | 第 140 行 |
| `typescript/cases/ast-json-diff.mjs` | 不解析，只比对 ast-json 产物 | — |
| `tests/parse/validate.mjs` | **不碰仓颉解析器**，只用 `ts.createSourceFile` 体检用例本身 | 第 194 行 |
| `tests/feas-operator/*` | 只测表达式可行性/插入，不 Parse 整个文件 | — |

所以 fallback 只做在 `SourceFileRunner.Parse` 一层即可覆盖全部门，不需要薄包装，也不需要动
`SourceFileShape` / `CatalogGuide` / `StatementRouteUtil.Decide`（r12 已证伪 per-statement 路由）。

## 2. fallback 实现（路线 A）

- `statement-route-util.xl.md` 新增三个静态字段：
  - `EnableFileFallback:bool = true` —— 文件级兜底开关；
  - `FileFallbackCount:int = 0` —— 进程内累计次数（出清单的证据）；
  - `LastFileFallback:bool = false` —— 最近一次 Parse 是否兜底（Parse 入口先重置）。
- `source-file-runner.xl.md`：`Parse` = 兜底外壳，新增 `ParseCore(text, filePath, shell:bool)` 做真正装配。
  - `EnableShellExpressions = false`（或 `EnableFileFallback = false`）：**一次** `ParseCore(false)`，
    永不兜底 → false 态行为逐字节不变；
  - `EnableShellExpressions = true`：先 `ParseCore(true)`；**抛异常**时
    `FileFallbackCount += 1`，再用**同一份源码**从头 `ParseCore(false)`（新 `TypescriptTemplate` / 新
    `SourceFileShape` / 新 `SyntaxContext`，不复用任何形状或 token），成功后 `LastFileFallback = true`；
  - **只重试一次**，且 `ParseCore` 不调用 `Parse` → 不可能递归兜底；重试仍抛错就如实抛出 legacy 的异常。
  - `ParseCore` 用 `finally` 恢复 `EnableShellExpressions` 到进入前的值，所以同一次 Parse 不会混用两套
    候选目录，也不会把开关状态漏给下一次（harness 的开关双路对拍就是靠这一点）。
- harness：`parseCj()` 每次 Parse 后立刻读 `LastFileFallback`，去重记录「靠兜底才通过的构造」；
  组行之后打印 `[statement-possible] file-fallback total=<FileFallbackCount> distinct=<n>` 并逐条列出。

注：`SourceFileShape.CreatePossibleShapesCache` 复用候选实例是安全的——候选是否 `Reject`/接管读的是
`EnableShellExpressions`（`StatementPossibleShape.ComputeByIndex`、`RootExpressionStatementPossibleShape`、
`ExpressionStatementPossibleShape` 三处门控），不是候选实例自身状态。

## 3. 专用 cases：dev 组 22/22（fail=0）

```
[group] dev: pass=22 fail=0 skip=0 uncovered=0
[statement-possible] double-accept 冲突: 0
[statement-possible] file-fallback total=6 distinct=3
  fallback: "en:\n{ f() }\nenum E { A }"
  fallback: "const a = b as T\n(c); const d = e as U\n(f);"
  fallback: "let a = 1; a++; --\na;\nif (a) { a++; } --\na;"
```

r11 的三条红全部转绿，且**不是**靠放行：harness 的 b) 子判据（开关 true 的 XML 必须与开关 false 基线
逐字节相同）对每条 case 都还在跑，兜底后的输出正是 legacy 输出，因此逐字节一致；三条 case 的
`uncovered/knownBaselineFail` 一个都没用。`fallback total=6` 是同一构造被多次 Parse（二次 Parse +
legacy 对拍）累计的结果，distinct 才是构造数。

## 4. 全表读数（默认 `EnableShellExpressions = true`，即本轮提交后的状态）

| 门 | 读数 |
| --- | --- |
| `ast-json` | **6167/6167** cj-ok（47 个构造），cj-fail=0 |
| `ast-json-diff` | 6167 条：完全一致 **6167**，结构差 0 / 位置差 0 / 字段差 **0** |
| `token-ast` | total=**1716** ok=**1706** crash=**0** diff=**0** ts-invalid=**10**；known-gap 0 |
| `real-dts` | **226/226** 解析成功、崩溃 0、AST 一致 226 |
| `validate` | **1720** 条用例，**0** 条不合格 |
| `harness --all` | cases pass=**72** fail=**0** skip=0 known=**1** uncovered=0；double-accept 冲突 **0** |
| `harness --double-accept` | cases=91 failed=**0**，冲突 0 |
| `harness --lint` | **PASS**（ASI 实现唯一 / 优先级数字表只在 operator-table） |
| `feas-operator` 两件套 | 见下（本轮实跑） |
| `perf` | 见下（本轮实跑） |

`harness --all` 的 `file-fallback total=0`：`--all` 读的是 `tests/statement-possible/cases.json`，
**不含** dev 组那三条构造（dev 用例在 `dev-cases.json`），所以 0 是正常的，不是「没统计」。
全表脚本（ast-json / token-ast / real-dts）各自新进程、不打印计数；它们全绿 + 输出与 false 基线
逐字节一致（ast-json-diff 0/0/0、token-ast diff=0）本身即「这些文件没有被兜底成另一种形状」的证据。

false 基线（r11 实测，本轮未改动该路径）：ast-json 6167/6167、diff 0/0/0、token-ast 1706/0/10、
real-dts 226/226、validate 1720/0、harness --all 72/0/known1、double-accept 0、lint PASS。
本轮 false 态代码路径只是「一次 ParseCore(false)」，与 r11 的 `Parse` 逐语句等价（同样三行装配）。

## 5. fallback 清单（Stage 1 的「未覆盖清单」）

| # | 构造（dev case） | 触发方式 | 现象（true 新路径） | legacy 结果 |
| --- | --- | --- | --- | --- |
| 1 | `en:` 标签 + 块 + 无分号 `enum` 尾段（`dev-label-enum-tail`） | 抛异常 | `语句没有读完` | 正确 |
| 2 | `const a = b as T` ⏎ `(c);` 跨行类型断言尾段（`dev-as-const-crossline-tail`） | 抛异常 | 收口失败 | 正确 |
| 3 | 多语句前缀 `--` 跨行（`dev-prefix-operand-newline`） | 抛异常 | 收口失败 | 正确 |

三条都是**抛异常**触发，没有一条是「结果错但不抛」。也就是说：本轮 fallback 只覆盖「新路径明确失败」
这一类；**静默建错树不在此列**（见 §7 风险）。这三条即 Stage 1 未覆盖构造的完整清单；
把它们修好（r12 §5 路线 B）之后，兜底次数应降到 0。

## 6. 开关最终值

- `StatementRouteUtil.EnableShellExpressions = **true**`（默认开启，单独 commit）；
- `StatementRouteUtil.EnableFileFallback = true`（兜底本身可单独关掉做排查）。

## 7. 风险与未做项

1. **兜底只认异常**。新路径若建出「不抛但错」的树，兜底不会介入——全表当前没有这种样本
   （七门全绿），但新增构造时可能出现；判别手段是把 `EnableFileFallback=false` 再跑一遍全表对读。
2. **兜底是整条文件**：一条文件里只要有一处抛错，整条文件回 legacy，新路径在该文件上完全不生效。
   这是路线 A 的语义（r12 已证伪 per-statement），不是缺陷；代价是新路径的真实覆盖率被兜底遮住，
   所以 §5 清单必须随修随减。
3. **全表脚本没有 fallback 计数**。它们不读 `FileFallbackCount`；若要精确的「全语料兜底次数」，
   需要在 ast-json / token-ast / real-dts 里各加一行打印（本轮没加，避免动门脚本）。
4. `tests/feas-operator/*` 与 `perf` 与本轮改动无交集（只动了 Parse 外壳与三个静态字段），
   本轮实跑结果见提交说明；未重跑 `docs` 里的长口径 A/B。
5. 未改 `core/`、未改 `StatementBoundaryUtil.IsAsiBoundary`、未 push / merge。

## 8. 结论

**达成**：默认开启 + dev 全绿（22/22）+ 全表绿 + fallback 清单明确。Stage 1 Wave2 收口。
下一棒若继续：按 §5 清单修三条构造（r12 路线 B），把兜底次数压到 0，再关掉 `EnableFileFallback` 复测全表。
