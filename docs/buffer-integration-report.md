# buffer 集成报告（task-12，branch `integration-buffer`）

独立集成者：合流 10 个 buffer 分支 + 修集成期跨文件 API 缺口 + 出验收读数。
权威口径：`BUFFER-CONTRACT.md`、`buffer-core/docs/buffer-core-api.md`、`buffer-baseline/docs/buffer-baseline.md`。

- 工作目录：`C:\Users\Admin\Documents\GitHub\xl-example-set\buffer-integration`（独立 clone）
- 分支：`integration-buffer`
- base：`origin/feat/buffer-bootstrap` @ `b7a6df40`
- 代码修复提交：`8e451a6c`（19 个文件，+92/−68）
- 环境：Windows 10 LTSC / Xeon 8378C / Node v24.21.0 / tsc 6.0.3

---

## 1. 合流顺序与提交

| # | 分支 | 方式 | 结果 |
| --- | --- | --- | --- |
| 0 | `origin/feat/buffer-bootstrap` | base | `b7a6df40` |
| 1 | `origin/feat/buffer-core-doc` | fast-forward | `95ac0f1f` |
| 2 | `origin/feat/buffer-basic` | merge `6c0e7ff5` | 9 处 import 冲突（仅 `Source`→`SourceRange` 一行），取 theirs |
| 3 | `origin/feat/buffer-basic-string` | merge `47d9ff69` | 8 处同型 import 冲突，取 theirs |
| 4 | `origin/feat/buffer-shape` | merge `756901c5` | 干净 |
| 5 | `origin/feat/buffer-ts-decl-a` | merge `164f2e94` | 干净 |
| 6 | `origin/feat/buffer-ts-decl-b` | merge `c851d0ed` | 干净 |
| 7 | `origin/feat/buffer-ts-expr` | merge `c5d9e131` | 干净 |
| 8 | `origin/feat/buffer-ts-types` | merge `7a5896c4` | 干净 |
| 9 | `origin/feat/buffer-tests` | merge `a6c5a5eb` | 干净 |
| 10 | `origin/verify/buffer-baseline` | merge `6c64d3c0` | 干净 |

`feat/buffer-basic-string` 在开工时**已存在**（`5919d4b1`），按序合入，未走「跳过/PARTIAL」路径。

---

## 2. 构建与 xl check

| 项 | 命令 | 读数 |
| --- | --- | --- |
| xl_build | `xl_build`（cwd=本 clone，paths `core,typescript`，target `ts`） | **871 written / 0 skipped / 0 planned / 0 error / 2440 warning** |
| tsc | `node_modules\.bin\tsc.cmd -p tsconfig.json` | **exit 0，0 error** |
| xl_check | `xl_check`（paths `core,typescript`） | **871 file(s) / 0 error / 2440 warning** |

基线是 873 files / 2447 warning；本分支 871 files / 2440 warning（少的 2 个是契约删除的
`core/syntax/source.xl.md`、`core/syntax/process-source.xl.md` 产物）。**0 error，warning 未增加。**

---

## 3. 验收 6 项读数

| # | 门禁 | 命令 | 基线 | 集成读数 | 判定 |
| --- | --- | --- | --- | --- | --- |
| 1 | xl_check | 见 §2 | 0 error | **0 error** | PASS |
| 2 | xl_build + tsc | 见 §2 | 0 error；tsc 0 | **0 error；tsc 0** | PASS |
| 3 | body-guide | `node tests/body-guide/harness.mjs --all` | 109/109 | **109/109**（35+25+23+16+10，fail 0，skipped 0） | PASS |
| 4 | AST 快照 + 差异 | `node typescript/cases/ast-json.mjs` → `node typescript/cases/ast-json-diff.mjs` | 6167/6167，0/0/0 | **6167/6167 cj-ok=6167 cj-fail=0；完全一致 6167/6167，结构差 0、位置差 0、字段差 0** | PASS |
| 5 | real-dts AST | `node typescript/cases/real-dts-ast.mjs` | 226/0/0 | **226 份（跳过 0）：成功 226、崩溃 0、AST 差异 0** | PASS |
| 6 | token AST | `node typescript/cases/token-ast.mjs --quiet` | 1715/1705/0/0/10 | **total=1715 ok=1705 crash=0 diff=0 ts-invalid=10，known-gap 0** | PASS |
| 7 | parse validate | `node tests/parse/validate.mjs` | 1719/0 | **1719 条，0 条不合格** | PASS |
| 8 | cache-share | `node tests/cache-share/check.mjs` | 5/5 | **5/5 PASS，0 FAIL** | PASS |

### 3.1 等价（XML 逐字节 + 位置 digest；本节为 exc-fix 前 `7d566280` 读数）

命令：`node tests/bench/buffer-equivalence.mjs --mode both --base build-base --new build`
（`build-base` = `buffer-baseline/build-base` 的副本，873 个 js）

| 通道 | 读数 |
| --- | --- |
| xml | **PASS 4504 / FAIL 0 / ERROR 10 / 同错 42**；两侧字节都 34,109,694 B（逐字节相等） |
| digest | **PASS 4504 / FAIL 0 / ERROR 10 / 同错 42**；两侧 token 各 797,790 条 |

- 语料 4556 份、7,837,812 字符；FAIL 0（两个通道）、XML 字节完全一致。
- **ERROR 10 = 两侧都抛错、只是异常的 `^` 标注位置不同**（不是「一侧能解析另一侧不能」）：
  7 份 `typescript/cases/*.ts`（逐行夹具，整文件本身不可解析）+ 3 份 `tests/cases/e2e/scenarios/*`
  （超出当前语法面、基线同样抛错）。两侧 XML 字节都是 0，解析结果等价；该工具按「异常文本全等」判同错，
  所以计成 ERROR 而不是「同错」。详见 §6 未决项 1；exc-fix 后已归零，最终读数见 §7.2。
- 基线自检口径是 4504/0/0/52；本树把其中 42 份仍判同错，10 份因错误位置不同被判 ERROR。

### 3.2 性能（同机同会话）

| 项 | 命令 | 基线 | 集成读数 | 判定 |
| --- | --- | --- | --- | --- |
| parse-perf | `node tests/bench/parse-perf.mjs --dts 8 --repeat 3` | 2005–2011 ms | **TOTAL median 1413.399 ms（−29.5%）** | ≥20% PASS |
| buffer-ab | `node tests/bench/buffer-ab.mjs --base build-base --new build --repeat 5 --min-improve 20` | 2086.7 ms | **TOTAL 1445.254 ms，+30.74%**（每轮合计中位 +28.34%） | PASS，exit 0 |

parse-perf 逐文件 median（ms）：dom 724.517、webworker 288.128、typescript.d.ts 312.298、
es5 60.238、es2023.array 8.383、es2020.bigint 10.063、es2015.core 5.603、es2015.symbol 4.169。

---

## 4. 集成期修复（跨文件 API 缺口）

先按契约把 T5/T7 的 int 调用点改成传 token 的 `SourceRange`，再修合流后才暴露的语义缺口。
共 19 个 `.xl.md`：

### 4.1 tsc 报错直接修的调用点（T4/T5/T7/T8 交界）

| 文件 | 问题 | 修法 |
| --- | --- | --- |
| `typescript/tokens/types/member-boundary.xl.md` | `HasBetween(left.End, right.Start)` 传 int | 传 `left.SourceRange` / `right.SourceRange` |
| `typescript/tokens/declarations/type-alias-declaration-possible-shape.xl.md` | 同上 + `End/Start !== null` 旧口径 | 传 range；`EndIndex >= 0 && StartIndex >= 0` 才走 HasBetween，否则退回 trivia 扫描 |
| `typescript/tokens/expressions/expression-builder.xl.md` | `HasAfter(...EndIndex)` 传 int（2 处） | 传 `yieldUnit.SourceRange` / `keyword.SourceRange` |
| `typescript/tokens/statements/statement-scanner.xl.md` | `HasBetween(from, to)` 传 int | 传 `left.SourceRange` / `right.SourceRange` |
| `typescript/tokens/statements/statement-builder.xl.md` | `HasLineBreakAfter(last:int)` | 改成 `(last:Token)`，未签出（`EndIndex < 0`）判否，内部传 `last.SourceRange` |
| `typescript/tokens/keywords/{abstract,declare,export}-keyword-shape.xl.md` | `Start.Index`、`End !== null`、`SignOut(Source)` 未移植 | 改用 int：`Start >= 0` / `End >= 0`、`SignIn(Start)`、`SignOut(End)`、`Pos = Start` |
| `typescript/tokens/statements/expression-statement-shape.xl.md` | `end.Index + 1` | `EndIndex`，`>= 0` 判断 |
| `typescript/tokens/declarations/class-declaration-shape.xl.md` | `memberEnd === null` 三目链 | 单条三目，语义不变 |

### 4.2 合流后才暴露的语义缺口（单分支测不出）

1. **`SyntaxContext.DrainMessages` 与 T3a 的「有未消费消息先交回」守卫互斥**（`core/syntax/syntax-context.xl.md`、
   `core/syntax/unit-token.xl.md`）：
   - 现象：所有 `import x from "m"` 在 `from` 重放时抛 `reload made no progress`（114 条用例崩溃）。
   - 根因：重放窗口里队列还压着**排在后面**的消息，`UnitToken.Process` 的 `Messages.length > 0` 守卫
     让这次重放原地返回。
   - 修法：加 `SyntaxContext.Replaying` 标志，重放期间该守卫不生效；另把「重放没推进、但压了新消息」
     按旧 `SourceQueue` 语义**就地重试**（上限 8 次），仍不推进才抛 `reload made no progress`。
2. **`String` / `InterpolationString` 的自定义 `Process` 没有 T3a 的两条守卫**（`core/syntax/basic-tokens/string/{string,interpolation-string}.xl.md`）：
   - 现象：所有含 `${…}` 的模板字面量崩溃（58 条用例），`}` 泄漏成根级 `Symbol`。
   - 根因：子单元压了 `ReloadMessage` 后父串继续把同一窗口的字符吃掉，表达式语句读不完。
   - 修法：补 `Parent.MountedUnit !== this` 与 `!context.Replaying && Messages.length > 0` 两条提前返回。
3. **`ImportClauseEndPossibleShape` 等未归属文件**原本就是 int 直传（`FromRange(Start, End)` / `SignOut(End)`），
   合流后数值恰好等价，未改；真正卡住的是 §4.2.1。
4. **模板 `TemplateHead` / `TemplateMiddle` 的终点少 1**（`typescript/tokens/expressions/expression-builder.xl.md`）：
   TS 的 `TemplateHead` 含 `${` 的 `{`。type-builder 早已 `+1`，expression-builder 漏了 → 补 `+ 1`。
5. **模块体合成 `;` 的终点多加 1**（`typescript/tokens/declarations/module-block-shape.xl.md`，7 处）：
   `AppendValueAndSignOut(";", endSource)` 的 `endSource` 已是半开终点，函数内部再 `+1`
   → 传 `endSource - 1`（与 `StatementBuilder.SynthesizeSemicolon` 同口径）。修掉
   `namespace` / `module` / `global` 体里语句 end 多 1 的 60+ 条位置差。
6. **类体 raw 尾巴视图的起点多 1**（`typescript/tokens/declarations/body-guide-util.xl.md`）：
   临时 `Bracket` 视图 `SignIn(baseSource)`，而 `BuildMembers` 用 `Start + 1` 当首成员 `Pos`
   → 有前一个单元时改 `SignIn(baseSource - 1)`。修掉 `static {}` / 字符串名属性的 pos 差。
7. **零宽节点区间口径**（`typescript/tokens/expressions/expression-builder.xl.md`、`statement-builder.xl.md`）：
   `OmittedExpression`（数组空槽）与 `throw` 无参的零宽 `Identifier`，`Pos` 保持 TS 的 `pos == end`，
   区间按基线 digest 归一取 `[x-1, x)`（旧闭区间归一后就是这一段）。修掉 66 份 digest FAIL。
8. **契约残留清理**（`core/syntax/document.xl.md`、`source-range.xl.md`、`syntax-context.xl.md`、
   `typescript/run/line-terminator.xl.md`）：注释/正文里的 `Source` / `Document.At` / `ProcessSingle|ProcessAt`
   字样改写成「旧位置对象 / 旧下标入口」，使实现范围的 grep 真正归零。

---

## 5. grep 清零（实现范围）

范围：`core/**/*.xl.md`、`typescript/**/*.xl.md`（不含 `typescript/cases/**` 夹具）。
逐条 `-CaseSensitive` 搜：

```
\bSource\b                      0
Document\.At                    0
\.End\.Index                    0
Start === null                  0
End === null                    0
ProcessSingle|ProcessAt|SourceQueue|ProcessSource|LastSource   0
```

`typescript/cases/**` 是**逐行用例夹具**：里面出现 `Source` / `source` / `.End.Index` 是
「被解析的源码文本 + 历史注释」，不是实现调用；改动会移动夹具字符位置、破坏 `*.cj-ast.json` 快照，
故保持原样。`tests/bench/dts-cost-probe.mjs` 与历史 docs 里对已删 API 的说明同样保留（T9 已记账）。

---

## 6. 未决 / 说明

1. **等价工具 10 项 ERROR（两侧都抛错、异常 `^` 位置不同）——已解决**：
   `fix/buffer-exception-range` @ `74468f9a` 把 `UnitToken` / `String` / `InterpolationString` 三处窗口级
   `catch` 改成「`e instanceof SyntaxException` 就原样 `throw e`」，不再用窗口内旧 `index` 构造外层
   `SourceRange` 再 `FromInner` 包裹；只有真正的内层裸异常才套窗口范围。最终等价读数
   **xml/digest 均 FAIL 0 / ERROR 0 / 同错 52（原 42 + 10）**，XML 字节 34,109,694 两侧相等、
   token 797,790 两侧相等。原先那 10 份（7 份 `typescript/cases/*.ts` 逐行夹具 + 3 份
   `tests/cases/e2e/scenarios/*`）现在异常文本全等，按「同错」计。详见 §7.2。
2. `xl_build` 的 warning 数 2440 < 基线 2447（少的来自契约删除的两个源文件），未新增 warning。
3. `build/`、`build-base/`、`dist/` 均在 `.gitignore` 内，**未提交**；本报告只提交源码与文档。
4. 复跑顺序（本 clone）：
   ```
   xl_build            # cwd=本 clone，paths core,typescript，target ts
   node_modules\.bin\tsc.cmd -p tsconfig.json
   node typescript\cases\ast-json.mjs; node typescript\cases\ast-json-diff.mjs
   node tests\body-guide\harness.mjs --all
   node typescript\cases\real-dts-ast.mjs
   node typescript\cases\token-ast.mjs --quiet
   node tests\parse\validate.mjs
   node tests\cache-share\check.mjs
   node tests\bench\buffer-equivalence.mjs --mode both --base build-base --new build
   node tests\bench\parse-perf.mjs --dts 8 --repeat 3
   node tests\bench\buffer-ab.mjs --base build-base --new build --repeat 5 --min-improve 20
   ```

---

## 7. 最终读数（含 exc-fix）

最终合并者把 `fix/buffer-exception-range` @ `74468f9a`（父 `7d566280`）以 `--no-ff` 合入
`integration-buffer`（merge commit `6ebf9d25`），从零重建后重跑全部门禁、等价与性能。
同时按补文档对齐只改散文：`core/syntax/unit-token.xl.md`、
`core/syntax/basic-tokens/string/string.xl.md`、
`core/syntax/basic-tokens/string/interpolation-string.xl.md` 各补一句
「已经是 `SyntaxException` 的原样上抛」，不改代码行为。

- 工作目录：`C:\Users\Admin\Documents\GitHub\xl-example-set\buffer-final-merge`（独立 clone）
- 分支：`integration-buffer`，含 merge `6ebf9d25` + 散文/报告提交
- 环境：Windows 10 LTSC / Xeon 8378C / Node v24.21.0 / tsc 6.0.3

### 7.1 构建与门禁（全量重跑）

| 项 | 命令 | 读数 | 判定 |
| --- | --- | --- | --- |
| xl_build | `xl_build`（cwd=本 clone，paths `core,typescript`，target `ts`） | **871 written / 0 skipped / 0 planned / 0 error / 2440 warning** | PASS |
| tsc | `node_modules\.bin\tsc.cmd -p tsconfig.json` | **exit 0，0 error** | PASS |
| xl_check | `xl_check`（paths `core,typescript`） | **871 file(s) / 0 error**（warning 2440，与 xl_build 同） | PASS |
| body-guide | `node tests/body-guide/harness.mjs --all` | **109/109**（35+25+23+16+10，fail 0，skipped 0） | PASS |
| AST 快照 + 差异 | `node typescript/cases/ast-json.mjs` → `node typescript/cases/ast-json-diff.mjs` | **6167/6167 cj-ok=6167 cj-fail=0；完全一致 6167/6167，结构差 0、位置差 0、字段差 0** | PASS |
| real-dts AST | `node typescript/cases/real-dts-ast.mjs` | **226 份（跳过 0）：成功 226、崩溃 0、AST 差异 0** | PASS |
| token AST | `node typescript/cases/token-ast.mjs --quiet` | **total=1715 ok=1705 crash=0 diff=0 ts-invalid=10，known-gap 0** | PASS |
| parse validate | `node tests/parse/validate.mjs` | **1719 条，0 条不合格** | PASS |
| cache-share | `node tests/cache-share/check.mjs` | **5/5 PASS，0 FAIL** | PASS |

与上一版（`7d566280`）相比，9 项读数完全一致，**无回归**。

### 7.2 等价（exc-fix 后，XML 逐字节 + 位置 digest）

命令：`node tests/bench/buffer-equivalence.mjs --mode both --base build-base --new build`
（`build-base` = `buffer-baseline/build-base` 的副本，873 个 js）

| 通道 | 读数 |
| --- | --- |
| xml | **PASS 4504 / FAIL 0 / ERROR 0 / 同错 52**；两侧字节都 34,109,694 B（逐字节相等） |
| digest | **PASS 4504 / FAIL 0 / ERROR 0 / 同错 52**；两侧 token 各 797,790 条 |

- 语料 4556 份、7,837,812 字符；两通道全 PASS。
- **与 `7d566280` 的差异只在异常位置**：ERROR 10 → 0、同错 42 → 52（42 + 10），PASS 4504、字节数、
  token 数与解析耗时口径均不变。原 10 份「两侧都抛错、`^` 标注位置不同」的输入现在异常文本全等。
- 结论：等价闭环，§6 未决项 1 关闭。

### 7.3 性能（同机同会话）

| 项 | 命令 | 读数 | 判定 |
| --- | --- | --- | --- |
| buffer-ab | `node tests/bench/buffer-ab.mjs --base build-base --new build --repeat 5 --min-improve 20` | 基线 TOTAL 2163.713 ms → 实验 1406.993 ms，**+34.97%**（每轮合计中位 +32.4%），exit 0 | ≥20% PASS |
| parse-perf | `node tests/bench/parse-perf.mjs --dts 8 --repeat 3` | **TOTAL median 1409.012 ms**（基线 2005–2011 ms，约 −29.8%） | ≥20% PASS |

parse-perf 逐文件 median（ms）：dom 735.247、webworker 291.556、typescript.d.ts 294.021、es5 60.089、
es2023.array 8.416、es2020.bigint 9.923、es2015.core 5.583、es2015.symbol 4.177。

与上一版（`7d566280`）相比：buffer-ab +30.74% → **+34.97%**；parse-perf 1413.399 ms → **1409.012 ms**，
同量级、无退化。

### 7.4 最终结论

**PASS。** `fix/buffer-exception-range` 已合入 `integration-buffer`，从零重建
871 written / 0 error、tsc 0 error、xl_check 0 error；6 项门禁全部维持 109/109、6167/6167（0/0/0）、
226/0/0、1715/1705/0/0/10、1719/0、5/5；等价 xml/digest 双通道 **FAIL 0 / ERROR 0 / 同错 52**，
XML 字节 34,109,694 逐字节相等、token 797,790 相等；buffer-ab **+34.97%**、parse-perf **1409.012 ms**。
**无未决项**，原「10 条 ERROR」已由 `74468f9a` 修复关闭。
