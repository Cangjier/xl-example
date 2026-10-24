# HANDOFF — impl-wp3-21（WP-3 第二十一波：D 类残余 2 条已修，AST 6138）

STATUS: **COMPLETE**（本轮唯一任务 D 类 2 条全部修好）。AST **6136 → 6138 / 6167**
（结构差 25 → 23、位置差 24 → 22、字段差 0、cj-fail 0）；real-dts 226/226；
buffer xml **4487 / 17 / 52**（与起点逐项相同，未退步也未补回）；quick/standard PASS。

BRANCH: impl-wp3-21 @ a7611f84
BASE: impl-wp3-20 @ 7fdbe069

## 0. 一句话结论（给 Lead）

D 类残余 2 条（#290 `const x = a` ⏎ `(b)`、#184 `const f = () => 1` ⏎ `(y)`）**已修复**，
各 +1 = **+2**，其它 6136 条读数逐项不变。改动**只有一处**、**一个文件**、
`typescript/tokens/items/root-item-rule.xl.md`（`Alive.size === 0` 分支），
`source-file-tail-builder.xl.md` **一个字没动**——落点判断与 wp3-19 §4.1 / wp3-20 §3.1 的
「切点在 `BuildTrailingDeclaration` 段内」**不同**，见 §1 的更正。

## 1. 真正的根因（推翻了前两波的落点判断）

前两波认为切点在 `source-file-tail-builder.xl.md` 的 `BuildTrailingDeclaration`。**不是。**
用 tmp 探针（`SourceFileRunner.Parse` 单例 + 给 `build/ts/**/*.js` 打 `CJ_TRACE` 临时日志）实测：

- `const x = a\n(b)` 走到 `BuildTrailingDeclaration` 时**只剩** `\n` + `(b)` 两个单元
  （`[BTD] start=1 at=2 units=WrapSymbol:"\n" | Bracket:"[12,15]"`）——VariableStatement
  `[0,11]` **已经建完了**，尾巴只是把剩下的 `(b)` 兜成 ExpressionStatement。所以尾巴不是病灶。
- VariableStatement 是谁建的：`RootItemRule.Analyze → BuildByKind → BuildStatement`，
  而它拿到的 Units 只有 `const | x | = | a`（`[BVS] units=...`）——**`(b)` 根本没进去**。
- 为什么 `Alive` 在 `(b)` 上全灭：`StatementScanner.ScanToSemicolon`（变量语句，`const`/`var` 走
  `stopAtEof=true`）扫到 `(b)` 时判「有换行、但下一格是调用位 `(`」→ 不早收口；循环走完没有 `;`，
  落到 `AtEOF && stopAtEof ⇒ Mismatch`。候选 Reject ⇒ `Alive.size === 0` ⇒
  `RootItemRule` 走 ①（按 at-1 = `a` 收口）⇒ `(b)` 留成下一条 item。
- 对比：有 `;` 时同一格不 Reject（`ScanToSemicolon` 在 `;` 上 Complete），所以
  `const x = a\n(b);` 本来就对——与 wp3-19/20 的观察一致。
- `#184` 同一机制；TS 的期望是箭头体 `1` 被调用成 `1(y)`（`ArrowFunction [9,21]` 的体是
  `CallExpression [15,21]`），**不是** ASI。

## 2. 改了什么（唯一改动）

`typescript/tokens/items/root-item-rule.xl.md`，`Alive.size === 0` 分支内、① 之前新增一个判据：

```ts
const continuesCall: boolean = at > 0
  && StatementScanner.IsCallishUnit(code[at])
  && !StatementScanner.NoLineBreakBetween(code[at - 1], code[at])
  && !StatementScanner.EndsAtLineBreak(code, at - 1, at);
```

并把 ① 的收口条件从 `coversBefore && !tailEmptyArgs` 改成
`coversBefore && !tailEmptyArgs && !continuesCall`（`continuesCall` 时落到 ②「含这一格建」，
`StatementBuilder` 拿到完整单元后自己就建出 `CallExpression`）。

判据**复用** `StatementScanner.EndsAtLineBreak` 的调用位分支（不另写一套 ASI 规则）：
有换行 + 下一格是调用位（`(` / `[` / 反引号）+ 上一格**可**当调用者 ⇒ 不是 ASI 边界。

**对照实验（同一判据不能放宽到块体箭头）**：`const f = () => {}\n(y)` 仍然是
`VariableStatement[0,18] + ExpressionStatement[19,22]`（TS 也是这么切的）——
因为 `StatementScanner.IsCallPositionBlocked` 对 `=> {…}` 返回 true。

## 3. 门禁读数（本分支实测）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build | `paths=["core","typescript"]` | 875 written / 0 error / 2414 warning | PASS |
| tsc | `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | exit 0，4.0 s | PASS |
| AST 全量 | `node .\typescript\cases\ast-json.mjs` | 6167/6167 cj-ok，cj-fail 0 | PASS |
| AST diff 全量 | `node .\typescript\cases\ast-json-diff.mjs` | **6138 / 6167**；结构 23 / 位置 22 / 字段 0 | +2（起点 6136，结构 25 / 位置 24） |
| real-dts | `node .\typescript\cases\real-dts-ast.mjs` | 226 文件：成功 226、崩溃 0、一致 226 | PASS |
| buffer | `node .\tests\bench\buffer-equivalence.mjs --mode both --base ..\baseline-build\build --new build --dts 8 --quiet` | xml **PASS 4487 / FAIL 17 / ERROR 52**；digest PASS 4379 / FAIL 125 / ERROR 52 | 与起点逐项相同（未退步，也未补回那 1 个 PASS） |
| quick | `..\tools\gates.ps1 -Tier quick` | RESULT: PASS（5.6 s） | PASS |
| standard | `..\tools\gates.ps1 -Tier standard` | RESULT: PASS（10.7 s，8 道门为基线已知红 1/8） | PASS |
| xl_check | `paths=["typescript/tokens/items/root-item-rule.xl.md"]` | 0 error / 0 warning | PASS |

修好后**逐条红项清单（14 个构造）**：basic-token 220/221(1/1)、dts-recovery 20/22(2/0)、
dts-types 102/103(1/0)、end-build 248/251(2/3)、end-declarations 214/216(2/2)、
end-import-export 44/46(2/1)、import 90/91(0/1)、missing-end 139/142(0/3)、
missing-possible 152/157(5/5)、module-declarations 25/26(0/1)、possible-build 192/198(6/3)、
possible-compute 203/205(2/2)。
**`statements` 412/412、`end-compute` 318/318 —— 两条目标构造已全绿，且其它构造没有一条变差。**

## 4. 未完成项

- **G 类 2**（`#71 module N` ⏎ `{}`）未动：`module-declaration-shape` 体边界。
- **H 类 3**（无体模块 `End+1` / namespace-export `End+1` / `ExportKeyword Pos`）未动。
- **F 类 5**（`@dec` ⏎ `const x = 1;`）：wp3-20 §1 已证明从 accept 点进是死路，要从 possible-shape 侧进。
- **I 类 13**：清单见 HANDOFF.wp3-19 §4.5。
- buffer 的 1 个 PASS 未补回（本轮改动不影响 buffer 读数，仍 4487/17/52）。

## 5. 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-22 -From impl-wp3-21 -Base impl-wp3-21
cd impl-wp3-22
# xl_build(cwd="...\impl-wp3-22", paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
node .\typescript\cases\ast-json.mjs; node .\typescript\cases\ast-json-diff.mjs; git checkout -- typescript/cases
```

建议先做 G 类 2（`module N` ⏎ `{}`，`module-declaration-shape` 的体边界：换行后的 `{` 必须并进
声明、child 是 `ModuleBlock` 而不是 `Block`），再做 H 类 3。

## 6. 本波新增的坑（省一轮的）

1. **判落点前先看 `BuildByIndex` 走到尾巴时还剩几个单元**。给 `build/ts/**/*.js` 打临时
   `console.error`（`process.env.CJ_TRACE` 开关），跑 `node tmp/probe.mjs "<snippet>"`，
   **1 秒一轮**，比 `xl_build → tsc → 全量 AST` 快两个数量级；调试完 `tsc` 会整体重写
   `build/ts/**`，源码 `dist/` 不受影响，**不用回滚**（但要确认 `git status` 里 `build/`、
   `dist/` 都被 ignore）。
2. **`ast-json.mjs` 会重写 tracked 的 `typescript/cases/*.cj-ast.json`**；`gates.ps1` 也会跑一次，
   所以 **commit 之前**必须再 `git checkout -- typescript/cases`（本次第一次 checkout 后又被
   gates 弄脏，差点把 12 个快照一起提交）。`git status --porcelain` 只应剩你改的那个 `.xl.md`。
3. **`StatementPossibleShape.AtEOF`**：`StatementScanner.AtEOF` 按「当前单元之后文档里还有没有内容」
   置位，因此**只有 EOF 尾巴**会把 `stopAtEof` 的变量语句扫描逼成 Mismatch。这就是「有 `;` 就对、
   无 `;` 才裂」的机制性原因——判断某条 D/G/H 类是不是同一族，先看它在 EOF 尾巴上是否也这样。
4. `RootItemRule.Analyze` 的 `Alive.size === 0` 分支是**很多类共用的收口口**（`;` / `>` /
   `new …()` tailEmptyArgs / ① / ②）。往里加判据务必：(a) 只放宽「本该继续」的那一种，
   (b) 立刻跑**全量** diff 而不是子集，因为它一改就会波及所有构造。

## 7. 阻塞点

无。
