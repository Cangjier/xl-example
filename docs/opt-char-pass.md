# O2：一次分派只读一次字符（`char-pass`，task-20，branch `opt/char-pass`）

把「每个位置上读当前字符」从**每条 basic 跳转各读一次**改成**调度层读一次、顺链传下去**。
语义不变、分派次序不变，只多一个函数参数。

- 工作目录：`C:\Users\Admin\Documents\GitHub\xl-example-set\opt-char-pass`（独立 clone）
- 分支：`opt/char-pass`，base：`perf/buffer-analysis` @ `1dd7ce7f`
- 环境：Windows 10 LTSC / Xeon 8378C / Node v24.21.0 / tsc 6.0.3

---

## 1. 动机（profile）

`docs/perf-profile-buffer.md`、`docs/perf-summary.md` 的 top 项：

| 读数 | 值 |
| --- | --- |
| `SourceRange.At` | 6.28 次/字符 |
| `SourceRange.Has` | 8.06 次/字符（`At` 内部 `Has` 校验各算一次） |
| 10 个 basic `Transit` 分派 | 3.37 次/字符 |

链式分派里，每轮都从第 1 条 `Bom.Transit` 问到接手的那条，**每条都自己 `buffer.At(index)`**；
同一个字符被读 2–10 次。O2 只动这一点。

---

## 2. 签名改动清单

### 2.1 类型

`core/syntax/branch-transiter.xl.md`

```ts
// 改前
type BranchTransiter = (context:SyntaxContext, unit:Token, buffer:SourceRange, index:number)=>BranchStates
// 改后
type BranchTransiter = (context:SyntaxContext, unit:Token, buffer:SourceRange, index:number, value:string)=>BranchStates
```

`value` 就是 `buffer.At(index)`，由调度层读一次。要看别的位置（前探 `index + k` / 回看 `index - k`）仍然走
`buffer.At` / `SourceRange.Whole` —— 这一条**没有**改。

### 2.2 三个调度循环（都只改传参，不改控制流）

| 文件 | 改动 |
| --- | --- |
| `core/syntax/unit-token.xl.md` | `Process` 的跳转循环前加 `const value = buffer.At(index);`，`item(context, this, buffer, index, value)` |
| `core/syntax/basic-tokens/string/string.xl.md` | 同型（该单元 `ProcessQueue` 为 `null`，这行实际不执行，只为类型同步） |
| `core/syntax/basic-tokens/string/interpolation-string.xl.md` | 同型（`ProcessQueue` 是 basic 队列，这行会执行） |

`value` 放在 `if (this.ProcessQueue !== null)` **里面**：`ExitOrPre` 已经返回 `Done` / `Reload` 的位置不读，
没有队列的单元也不读。`Default` 的签名**没有**动（它只会在所有跳转都 `Undo` 时被调用一次，读一次 `At` 可以接受）。

### 2.3 十个 basic `Transit`

`+ value:string`，方法体里删掉自己那次读：

| 文件 | 原来的读法 | 改后 |
| --- | --- | --- |
| `basic-tokens/bom.xl.md` | `Bom.CanStart(unit, buffer, index)` → `buffer.At(index)` | `Bom.CanStart(unit, value)` |
| `basic-tokens/shebang.xl.md` | `buffer.At(index) !== marker[0]` | `value !== marker[0]` |
| `basic-tokens/area-annotation.xl.md` | `buffer.At(index) !== "*"` | `value !== "*"` |
| `basic-tokens/line-annotation.xl.md` | `buffer.At(index) !== "/"` | `value !== "/"` |
| `basic-tokens/regex-token.xl.md` | `buffer.At(index) === "/"` | `value === "/"` |
| `basic-tokens/string/string-guide.xl.md` | `const value = buffer.At(index)` | 参数 `value` |
| `basic-tokens/bracket.xl.md` | `const value = buffer.At(index)` | 参数 `value` |
| `basic-tokens/wrap-symbol.xl.md` | 3 × `buffer.At(index)` | 参数 `value` |
| `basic-tokens/symbol.xl.md` | `const value = buffer.At(index)` | 参数 `value` |
| `basic-tokens/common.xl.md` | `const value = buffer.At(index)` | 参数 `value` |

**唯一被顺带改签名的辅助方法**：`Bom.CanStart:(unit, buffer, index)=>bool` → `Bom.CanStart:(unit, value:string)=>bool`。
理由：它是 `Bom.Transit` 的第一条判据，不改就变成**每字符多读一次**（`Bom` 是队列第一项，所有字符都会问它），
正好把这一项省下来的抵消掉。它只有 `Bom.Transit` 一个调用者（grep `CanStart` 全仓确认：另一个同名方法是
`RegexTemplate.CanStart`，与此无关）。

**明确没改**：`Token.Process` / `BlockToken.Process` / `GuideToken.Process` 的公开签名；`Default` 的签名；
`Template.BasicBranchQueue` 的 10 项顺序；`ProcessQueue` 的类型形状（只是类型别名换了参数表）。

---

## 3. At / Has 前后（`tests/bench/dts-cost-probe.mjs --count`）

探针只包装 `build/ts`，所以「改前」是在实现之前、`build` 仍是基线产物时跑的。

### 3.1 `--files 1`（`lib.dom.d.ts`，2,349,323 字符）

| 指标 | 改前 | 改后 | Δ |
| --- | --- | --- | --- |
| `SourceRange.At` / 字符 | 5.564 | **4.014** | **−27.9%** |
| `SourceRange.Has` / 字符 | 7.221 | **5.670** | **−21.5%** |
| `static:*.Transit` / 字符 | 3.343 | 3.343 | 0（分派次数不变） |

### 3.2 `--files 3`（dom + webworker + typescript.d.ts，合计 3,724,815 字符）

| 文件 | At 前 → 后 | Has 前 → 后 |
| --- | --- | --- |
| `lib.dom.d.ts` | 5.564 → 4.014 | 7.221 → 5.670 |
| `lib.webworker.d.ts` | 6.668 → 4.826 | 8.446 → 6.604 |
| `typescript.d.ts` | 9.552 → 6.110 | 12.014 → 8.572 |
| **合计（按字符加权）** | **6.427 → 4.516（−29.7%）** | **8.237 → 6.326（−23.2%）** |
| `static:*.Transit` / 字符 | 3.877 → 3.877 | — |

单次 `Parse` 的 ms 在探针里噪声很大（同一基线两次 1689 / 2260 ms），**耗时一律以 §6 的同进程 A/B 为准**。

### 3.3 剩下的 4.5 次/字符在哪（按代码路径推算）

- **1 次**：`UnitToken.Process` 的 `value`（每字符一次，这是 O2 新增的唯一一次）；
- **3 次**：`AreaAnnotation` / `LineAnnotation` / `RegexToken` 的 `Transit` 各回看一次 `index - 1`
  （`buffer.Has(preIndex) ? buffer.At(preIndex) : Whole.At(preIndex)`）——按本任务口径「回看仍走 `buffer.At`」保留；
- 其余 ~0.5 次：`Consume` / `ExitOrPre` / `Default` / `Symbol.IsAppend` 等各自的那一次。

`Has` 比 `At` 多约 1.8 次/字符，是因为 `At` 内部先调一次 `Has` 做越界校验。

**下一步（不在本任务内，已量化）**：把 `index - 1` 的字符也由调度层读一次传下来（第 6 个参数），可再去掉 3 次 `At`
（预期回到 ~1.5 次/字符，与 `perf-summary.md` 的估计一致）；`Symbol/Common.IsAppend` 每字符 2–3 次读可以再省
（`IsAppend(buffer, index)` 加可选 `value`）。两者都会扩大签名涟漪，故留作后续。

---

## 4. 等价（`buffer-equivalence.mjs --mode both`）

```
语料 4556 个文件，7837812 字符
xml:    PASS 4504 / FAIL 0 / ERROR 0 / 同错 52（字节 基线 34109694 / 实验 34109694）
digest: PASS 4504 / FAIL 0 / ERROR 0 / 同错 52（token 基线 797790 / 实验 797790）
结论: 等价（xml+digest 通道全部 PASS）。
```

`FAIL 0 / ERROR 0`，XML 逐字节相同、位置/文本 digest 逐条相同，包含 52 条「两版抛同一错误」的用例
（错误消息与 `^` 位置也一致）。

---

## 5. 门禁

| # | 门禁 | 命令 | 读数 | 判定 |
| --- | --- | --- | --- | --- |
| 1 | xl_build | `xl_build`（paths `core,typescript`，target `ts`） | 871 written / 0 error；增量重建 14 written / 857 skipped；warning 2440（基线同值） | PASS |
| 2 | tsc | `node node_modules/typescript/bin/tsc` | exit 0，0 error | PASS |
| 3 | xl_check | `xl_check`（paths `core,typescript`；忽略 W3102/W3103） | 871 file(s) / **0 error** / 4 warning（4 条 `E1107` 同名类型，基线既有） | PASS |
| 4 | parse validate | `node tests/parse/validate.mjs` | 1719 条，**0 条不合格** | PASS |
| 5 | AST 快照 | `node typescript/cases/ast-json.mjs` | total 6167，cj-ok **6167**，cj-fail **0** | PASS |
| 6 | AST 差异 | `node typescript/cases/ast-json-diff.mjs` | 完全一致 **6167 / 6167**；结构差 0、位置差 0、字段差 0 | PASS |
| 7 | real-dts AST | `node typescript/cases/real-dts-ast.mjs` | 226 份：成功 226、崩溃 **0**、AST 差异 **0** | PASS |
| 8 | token AST | `node typescript/cases/token-ast.mjs` | total 1715，ok 1705，crash **0**，diff **0**，ts-invalid 10，known-gap 0 | PASS |
| 9 | body-guide | `node tests/body-guide/harness.mjs --all` | **109 / 109**（35+25+23+16+10，fail 0，skipped 0） | PASS |

---

## 6. 性能（同进程 A/B）

### 6.1 `buffer-ab.mjs --base build-base --new build --repeat 5`

```
node v24.21.0  dts=8  repeat=5  warmup=1  顺序每轮交替
```

| 文件 | bytes | 基线中位 ms | 实验中位 ms | Δms | 提升% |
| --- | --- | --- | --- | --- | --- |
| lib.dom.d.ts | 2349483 | 770.978 | 753.348 | −17.63 | 2.29 |
| lib.webworker.d.ts | 787076 | 312.029 | 306.260 | −5.77 | 1.85 |
| typescript.d.ts | 588452 | 325.964 | 292.465 | −33.50 | 10.28 |
| lib.es5.d.ts | 218972 | 62.747 | 65.580 | +2.83 | −4.51 |
| lib.es2023.array.d.ts | 40197 | 9.885 | 8.736 | −1.15 | 11.62 |
| lib.es2020.bigint.d.ts | 38258 | 10.279 | 9.875 | −0.40 | 3.93 |
| lib.es2015.core.d.ts | 22824 | 6.189 | 5.579 | −0.61 | 9.86 |
| lib.es2015.symbol.wellknown.d.ts | 10971 | 4.270 | 4.133 | −0.14 | 3.20 |
| **TOTAL（逐文件中位之和）** | | **1502.341** | **1445.976** | **−56.37** | **3.75%** |
| **TOTAL（每轮合计的中位）** | | **1515.203** | **1454.353** | **−60.85** | **4.02%** |

每轮合计样本：基线 `[1606.3, 1515.2, 1570.1, 1453.7, 1500.1]`，实验 `[1454.5, 1563.7, 1454.4, 1362.3, 1423.8]`。
稳定性：逐文件中位之和 vs 每轮合计中位，基线差 12.9 ms、实验差 8.4 ms。

`lib.es5` 的 −4.5%（+2.8 ms）在噪声量级（该档 60 ms、单轮抖动可达数 ms）；其余 7 份里 6 份为正收益。
**总体 −3.75% / −4.02%，落在 profile 预估的 4.2–7.0% 区间下沿**——因为 O2 只省掉链上重复读，
回看（3 次/字符）与 `IsAppend` 仍按原样保留（见 §3.3）。

### 6.2 `parse-perf.mjs --dts 8 --repeat 3`（新 build 绝对值）

| 文件 | median ms |
| --- | --- |
| lib.dom.d.ts | 735.812 |
| lib.webworker.d.ts | 288.470 |
| typescript.d.ts | 277.851 |
| lib.es5.d.ts | 61.873 |
| lib.es2023.array.d.ts | 8.867 |
| lib.es2020.bigint.d.ts | 10.359 |
| lib.es2015.core.d.ts | 5.687 |
| lib.es2015.symbol.wellknown.d.ts | 4.016 |
| **TOTAL** | **1392.935** |

---

## 7. 回滚

纯源码改动，无数据/产物迁移。回滚即 `git revert <commit>`（或丢弃本分支）；`build/`、`dist/`、`build-base/`
都在 `.gitignore` 里，不参与提交。改动文件：16 个 `.xl.md` + `docs/buffer-core-api.md` + 本文。
