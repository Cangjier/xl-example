# HANDOFF — impl-wp3-18（WP-3 第十八波：`prefix-operand-newline` 根因落地修正）

STATUS: **PARTIAL / 净正**（AST **6134 / 6167**、结构差 **27**、位置差 **26**、字段差 0、cj-fail 0 —— 与起点
`impl-wp3-17 @ 429a9819` 逐项相同；buffer xml **PASS 4488 / FAIL 16 / ERROR 52**，起点 4487/17/52
（**+1 PASS / −1 FAIL**，`prefix-operand-newline` 类消掉一条）；real-dts 226/226；quick/standard PASS；
xl_check 0 error / 2414 warning；tsc 0。）

BRANCH: impl-wp3-18（源码 1 个文件 + 本文件）
BASE: impl-wp3-17 @ 429a9819

## 0. 一句话结论（给 Lead）

`prefix-operand-newline` 的根因**不在** root item 表、也不在 `StatementBuilder.BuildStatement`（wp3-17 §3
的「空 Units」假设是读错了行号：`build/ts/.../statement-builder.js:170` 抛的是 `语句意外结束`，
而实际异常文案 `表达式意外结束` 出自 `expression-builder.xl.md:566 / 2362`）。真正的落点是
`StatementBuilder.BuildExpressionStatement` 的 ASI 循环：**表达式以 `++`/`--` 开头且行尾换行时，
`EndsAtLineBreak` 把前缀运算符当成「能收尾」的后缀运算符**，于是 `expressionLast = first`，
表达式被裁成单独一个 `--`，`ExpressionBuilder` 抛「表达式意外结束」→ item 建不出 → 整段 raw。
修法是给这条 ASI 判据加一个「前缀操作数」豁免（见 §1），一条 `if` 守卫。

`RecordBuild` 的 raw 回退粒度（C 类）**本波实测并否决**（见 §2）：它确实能阻止「一条建不出来的 item
吞掉后面所有语句」，但在 AST 语料上是 **净 −3**（6134→6131，结构差 27→30、位置差 26→29），
buffer 一项不涨（4487/17/52 不变），因此**已回滚，未进提交**。

## 1. 本波唯一源码改动（`typescript/tokens/statements/statement-builder.xl.md`）

`BuildExpressionStatement` 的 ASI 扫描循环（原 `at > first &&` 那个 `if`）前置一条豁免：

```ts
const prefixOperand = at - 1 === first
  && (this.IsSymbol(this.Units[at - 1], "++") || this.IsSymbol(this.Units[at - 1], "--"));
if (at > first && !prefixOperand
  && (StatementBuilder.EndsAtLineBreak(this.Units[at - 1], this.Units[at])
    || ExpressionStatementPossibleShape.IsAsiBoundary(this.Units, at, first))) {
  asiEnd = at - 1;
  break;
}
```

判据为什么正当：

- `EndsExpression`（`statement-builder` 的静态判据）把 `++`/`--` 一律当「能收尾」，**分不出前缀/后缀**；
- 表达式**从 `first` 起**就以 `++`/`--` 开头时它不可能是后缀（左边没有操作数），
  而且单独一个 `--` 也不是合法语句 —— 所以这里不能认换行边界，必须等下一行的操作数；
- 后缀形态不受影响：`x++` ⏎ `--y` 里 `++` 不在 `first`，仍由 `IsAsiBoundary` 的
  「`x++` ⏎ `++y`」分支判成两条语句（wp3-16 的判据保留原样）。

效果（实测）：`tests/cases/token/statements/prefix-operand-newline.ts` 不再塌成 raw，
buffer xml **PASS 4487→4488 / FAIL 17→16**；AST 总读数不变（该用例在 AST 语料里的差异
与另一条已知差异互换，总数 6134/27/26 不变）。

## 2. C 类：`RecordBuild` raw 回退粒度 —— 实测否决（已回滚）

按 wp3-17 §3.2 实现并**逐项实测**了三个变体（全部在 `core/syntax/batch/item-list.xl.md`）：

1. `Build` 返回 `null` 时把 raw 区间从 `[Start, to)` 退到「本条第一个 `;`（含）」，
   `State.Checked` 回退到 raw 右界、`Feed` 从那里重读（新增 `SemiEnd` 帮助方法、
   `Feed` 的 EOF 尾巴改成可重扫的 `again` 循环）；
2. 同一变体 + `ApplyBuilds` 里对 `RawFrom/RawTo` 做 `Rebase`；
3. 同一变体 + 仅在 `to >= host.Data.length`（真正的 EOF 吞并）时才退。

三次读数**完全相同**：AST **6131 / 6167**（结构差 30、位置差 29、字段差 0、cj-fail 0），
buffer xml 4487/17/52 不变。⇒ 退让粒度只重塑「raw 恢复的形状」，既不修 `prefix-operand`
（那条 item 本来就建不出来，问题在表达式层，见 §1），又让 3 条本来 coincidentally 一致的
恢复类用例变红。**结论：这条 C 类不是 `prefix-operand` 的根因，收益为负，已 `git checkout` 回滚。**

给下一波的可复用结论：

- `RecordBuild` 的 `to` 在 `Winner = -1` 时确实等于 `Checked`（常为 EOF），「一条吞全部」是**真的**；
- 但把它细化成 `;` 粒度**不会**让 AST 变好，因为真正要修的是「那条 item 为什么建不出来」；
- 若要再做，正确的前置条件是先让 `Build` 成功率上去，否则只会改变 raw 恢复的字节形状。

## 3. 门禁读数（本分支实测，2026-10-24）

| 项 | 命令 | 读数 | 判定 |
|---|---|---|---|
| xl_build | core+typescript → dist | 875 written / 0 error / 2414 warning | PASS |
| tsc | `tsc -p tsconfig.json` | exit 0 | PASS |
| xl_check | core+typescript | **0 error / 2414 warning** | PASS |
| AST 全量 | `ast-json` + `ast-json-diff` | 6167 条：一致 **6134**；结构差 27、位置差 26、字段差 0、cj-fail 0 | 与起点相同 |
| real-dts | `real-dts-ast.mjs` | 226 文件：成功 226、崩溃 0、AST 一致 226 | PASS |
| buffer | `--mode both --base ..\baseline-build\build --new build --dts 8 --quiet` | xml **PASS 4488 / FAIL 16 / ERROR 52**；digest PASS 4380 / FAIL 124 / ERROR 52 | **+1 PASS vs 起点** |
| quick | `gates.ps1 -Tier quick` | **PASS** 5.7s | PASS |
| standard | `gates.ps1 -Tier standard` | **PASS** 10.7s（tests/gates 1/8 = 基线 KNOWN-RED） | PASS |

## 4. 未完成项（按类，精确落点）

- **C 类 4（`RecordBuild` 向前看 `;`）**：本波实现并实测否决，见 §2；不要再按「退到 `;`」重做。
- **D 类 4（`StatementBuilder` / `ExportAssignmentShape` 表达式终点）**：未动。`const x = a` ⏎ `(b)`
  是 statements 构造里**唯一**剩下的差异（`#290`，`CallExpression -1 / ExpressionStatement +1 /
  ParenthesizedExpression +1`，`VariableStatement ts[0,15] cj[0,11]`），下一波从这里进。
- **F 类 5（装饰器变量声明）**、**G 类 2（module `{}` 边界）**、**H 类 3（无体模块 `End+1` /
  namespace-export `End+1` / `ExportKeyword Pos`）**、**I 类 13**：一步没动。
- buffer 剩余 16 FAIL / 52 ERROR 未逐条分析（与 wp3-17 同集合，少一条 `prefix-operand` 类）。

## 5. 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-19 -From impl-wp3-18 -Base impl-wp3-18
cd impl-wp3-19
# xl_build(cwd="...\impl-wp3-19", paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
node .\typescript\cases\ast-json.mjs; node .\typescript\cases\ast-json-diff.mjs
```

下一波首选 D 类：`typescript/tokens/statements/statement-builder.xl.md` 的
`BuildExpressionStatement`（`const x = a` ⏎ `(b)` 应把 `(b)` 并进同一个 `VariableDeclaration` 的
初始化式，`ts[0,15]` vs `cj[0,11]`）。

## 6. 阻塞点

无。

## 7. 踩过的坑（新增，省下一波的时间）

1. **wp3-17 §3 的「空 Units」结论是行号误导**：`build/ts` 的行号不是 `.xl.md` 的行号；
   `statement-builder.js:170` 抛的是 `语句意外结束`，而 `表达式意外结束` 只在
   `expression-builder.xl.md:566 / 2362` 出现。定位异常文案时先 `Select-String` 全仓找文案。
2. **改 `core/**` 后 `git checkout` 回滚 `.xl.md` 不会回滚 `dist/ts/*.ts`**：`xl_build` 按指纹跳过，
   `tsc` 编的还是上一版。回滚源码后**必须**对那个文件再跑一次 `xl_build`，否则读数一直是旧行为
   （本波踩过：回滚 item-list 后没重建，连着三次读数都是 6131）。
3. `.xl.md` 代码块的**局部变量不能写类型标注**（`let n: int = …`）：xl 只翻译签名，局部标注原样进
   `.ts` → `tsc` 报 `TS2304: Cannot find name 'int'`。局部一律 `let n = …`。
4. `ast-json.mjs` 会重写 `typescript/cases/*.cj-ast.json`（diff 是拿它跟 `.ts-ast.json` 比，
   不是跟 git 比），跑完 `git checkout -- typescript/cases`。
5. 每次只 `xl_build` 改动的那个 `.xl.md`（`paths=[...]`）能把输出从 ~370 KB 降到一行。
