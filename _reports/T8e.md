# T8e — B 类里选下一个最小可修 case（标签模板作为操作数）并做最小修复

分支 `feature/all-possible-1027-t8e`，基点 `feature/all-possible-1027` @ `74423f0f`（T8d 已合入）。
工作副本 `C:\Users\Admin\Documents\GitHub\xl-example-set\all-possible-1027-t8e`。

## 1. 起点：重新测一遍 fallback（不沿用旧表）

沿用 T8c 的探针口径（`ParseCore(shell=true)` 取**首跳** + 默认路径 `Parse` 读 `LastFileFallback`），
在**本分支**重跑全语料（1716 个 `tests/cases/token/**/*.ts`）：

首跑读数：**fallback = 63**，与 `_reports/T8d.md` §5 的 63 逐条一致（`tmp/t8e-fallback.json`）。

## 2. 剩余 B 类逐个量一遍（不是照抄旧表）

按任务书口径：B = 收口 / 根之外 / 未读完 / 非数字原子的「有未并入的括号」。
当前树里 B 类共 13 条（含已被任务书排除的种类），逐条测首跳 + 同族变体：

| 字节 | 文件 | 首跳 | 判定 |
|---:|---|---|---|
| 185 | `modules/im-dynamic.ts` | 初始化器有未并入的括号 | ✗ **import 家族**（`await import("x")` / `import("y").then`），任务书排除 |
| 195 | `declarations/decl-instantiation-line-end.ts` | 根之外还有代码 | ✗ `a<b>` **类型实参 postfix**（T8d §7 已定类） |
| 226 | `expressions/ex-round743-chain-in-binary-right.ts` | 有未并入的括号 | ✗ 见 §3（二元形状是根，重建无从接手） |
| 235 | `expressions/expr-typeof-import-meta.ts` | 根之外还有代码 | ✗ 实测 `typeof foo.bar` / `!foo.bar` 同样落（**前缀一元操作数 postfix** 类） |
| 400 | `lexical/lex-string-dollar-prefix-intact.ts` | 未读完 | ✗ 带 `xl:ts-invalid` |
| 431 | `expressions/expr-arrow-body-nested-ternary.ts` | 有未并入的括号 | ✗ 箭头体 |
| 474 | `declarations/gap-instantiation-line-end.ts` | 根之外还有代码 | ✗ 与 195 同族 |
| 796 | `expressions/expr-template-tagged-suffix.ts` | 有未并入的括号 | ✗ 本轮修掉它的**第一个**闸门后仍 fallback：卡在 `obj.tag\`abc\`.trim()`（见 §7） |
| **945** | **`expressions/expr-tag-nonnull-base.ts`** | **有未并入的括号** | **✓ 本轮选中** |
| 1148 | `statements/stmt-adversarial-shapes.ts` | 根之外还有代码 | ✗ 箭头泛型返回类型 |
| 1454 | `types/gap-r956-predicate-paren-type.ts` | 返回类型没有读完 | ✗ 谓词括号：实测 `(string)` 被 `MethodCloseRule` 收成 `ParameterShape`（`function` / `asserts` 落、`interface` 成员不落） |
| 1929 | `expressions/gap-r1231-decl-newline-operator.ts` | 未读完 | ✗ 箭头体 + `/re/g` |
| 1993 | `expressions/expr-r1233-control-head-regex.ts` | 有未并入的括号 | ✗ `const v1 = (a)` ⏎ `/re/g` 是**除号续接**（表达式跨行继续），不是括号面 |
| 161 | `lexical/lex-preprocessor-if.ts` | 表达式没有读完 | ✗ 带 `xl:ts-invalid` |

## 3. 为什么不是更小的 226 / 796（量过的证据，留给下一轮）

`ex-round743-chain-in-binary-right.ts`（226 B）首跳同为「有未并入的括号」，但 `tshape-judge trace`
把根钉在**二元形状**上：

```text
step 161 "["  BinaryExpressionShape src=[156,161)      ← 根只盖到 `1 + o`
final          ├─ Bracket src=[161,166)  ["f"]          ← 后缀括号成了兄弟
               ├─ Bracket src=[166,168)  ()
               └─ Symbol "." + Common "v"
```

也就是说：收口格看到的是「**已建好的二元根** + 后缀括号」。本轮先按「后缀括号一律交给
`ExpressionBuilder` 原子重建」试过（只改一处 `continue`），实测**不行**：`ParsePrimary` 只认登记过
身份的形状（`HasContainer` / `HasNode`），二元形状没登记 ⇒ 直接抛 `不支持的表达式起点`。
`const x = f()[0];` 同因失败（调用形状也没登记）。要让这条通，必须新增「后缀括号接在任意已建根之后」
的候选——那是 **A3 的 postfix 面**，与任务书排除项相邻，不是最小改动。这一实验已**回滚**，代码里没有残留。

`expr-template-tagged-suffix.ts`（796 B）在本轮修复后**第一个**闸门确实通了，但整文件仍 fallback，
新的首跳点是 `obj.tag\`abc\`.trim()` 这一行（标签本身是成员链）——那是同族的**第二个**子问题，不在本轮一处判据里。

## 4. 选中 case

- 文件：`tests/cases/token/expressions/expr-tag-nonnull-base.ts`（**945 字节**，`xl:round 1209`）
- 内容：`a!\`x\`` / `a!\`x\`!` / `a\`x\`.b` / `a\`x\`.b(a)` / `a\`x\`(b)` / `a\`x\`.b.c`
- 首跳（改前）：`增量变量形状未支持：declaration 初始化器有未并入的括号`
- 默认路径（改前）：`LastFileFallback=true`、`FileFallbackCount=1`
- **不是箭头、不是数字 / 原子 postfix、不是 import 家族**：源码只有 `declare const` + 带标签模板与其后缀，
  首跳落在声明收口格的「未并入的括号」，与 §2 的三条排除项都不相交。

选它的理由：它是 B 类里**唯一「整条失败只差一个已有契约」**的 case——「带标签模板是一个完整操作数」
这件事机制里已经有了（`.b` 已经走通，见 `tagged-template-primary-possible-shape.xl.md` 的 `MemberFollows`），
缺的只是把同一契约从 `.` 扩到 `[` / `(`，并在收口格让**已登记**的根接上后缀括号。其余更小的 case 都在
§2/§3 里量成类级（二元右操作数 postfix、类型实参 postfix、前缀一元 postfix、箭头体、谓词括号、除号续接）。

## 5. 改动（2 个文件，+20/−7）

### 5.1 `typescript/tokens/expressions/forms/primary/tagged-template-primary-possible-shape.xl.md`

`MemberFollows` 的字符判据从「`.`」扩到「`.` / `[` / `(`」：模板之后紧跟下标 / 调用括号时，
标签模板同样**不是收口格**，整条标签模板是一个完整操作数（TS：`a\`x\`[0]` 是
`ElementAccess(TaggedTemplate, [0])`，`a\`x\`(b)` 是 `CallExpression`）。判据本身不新写：
仍是 `IsTerminalAfter` 那套空白跳过的字符级前瞻，只是多认两个后缀字符。

```ts
return ch === "." || ch === "[" || ch === "(";
```

### 5.2 `typescript/tokens/declarations/variable-declaration-shape.xl.md`

收口格 D1 的「未并入的括号」检查前加一条：括号**整只落在根区间之后**、且根是**登记过身份**的形状
（`HasContainer` / `HasNode`）时，它是根的**后缀**，不抛错，交给下面既有的「整条 raw 原子重建」那支
（`ExpressionBuilder` 就是 legacy 同一个建造器，覆盖不全仍抛错）。

```ts
const suffixStart = unit.SourceRange.StartIndex;
const suffixRootEnd = builtShape.SourceRange.EndIndex;
if (suffixStart >= 0 && suffixRootEnd >= 0 && suffixStart >= suffixRootEnd
  && (ExpressionAtomRegistry.HasContainer(builtShape)
    || ExpressionAtomRegistry.HasNode(builtShape))) {
  continue;
}
```

「根必须登记过身份」这一条是**实测**边界（§3）：没登记过的根（二元 / 调用形状）交给
`ExpressionBuilder` 只会在 `ParsePrimary` 抛 `不支持的表达式起点`，所以仍按 C10 抛错，行为逐字不变。

**没做什么**：不新增 guide、不碰 `ContainerCloseGuide`、不删 `StatementShape`、不动任何箭头 / 数字
postfix / 类型实参 postfix 判据、不改 30 target 行为、不跑 gates。

## 6. 结果

| 项 | 要求 | 实测 |
|---|---|---|
| `xl_build(core,typescript → ts)` | 0 error | **2 written / 635 skipped / 0 error / 3 warning**（仍是既有 3 条 E1107）；再跑一次 **0 written / 637 skipped / 0 error** |
| `node node_modules/typescript/bin/tsc -p .` | exit 0 | **exit 0** |
| 选中 case `tshape-judge ts` | status=ok | **`{"status":"ok","structural":[],"moved":[],"fields":[]}`** |
| 选中 case 默认路径 | `LastFileFallback=false` | **false，`FileFallbackCount=0`，首跳 ok** |
| 全语料 fallback | 下降 ≥1 | **63 → 62**（`tmp/t8e-fallback3.json`；对比 `t8e-fallback.json`：**FIXED=1 / REGRESSED=0**） |
| 全语料 AST 逐文件哈希（1716 条） | 无漂移 | **1715 条逐字节相同；唯一变化 = 被修好的那 1 条**（`fb true→false`） |
| 30 target（`node tmp/target-cases.mjs`） | 30/30、fallback=0、diff=0、error=0 | **cases=30 ok=30 moved=0 diff=0 error=0 fallback=0 \| LastFileFallback=0 \| pin-miss=1** |
| 5 smoke `ts.json` SHA256 前 16 位 | 不变（`BB07DA2201FC5087`） | **5 份全 `BB07DA2201FC5087`** |

`pin-miss=1` 是既有现象（026 的 `// xl:expect fallback` 按要求未改），与本轮无关。

仅有的两处副作用（都仍 fallback，读数在 `_reports/T8e.md` 的探针里）：

- `expr-template-tagged-suffix.ts`：首跳从「有未并入的括号」推进到「初始化器未读完」（§3/§7）；
- `expr-r1233-control-head-regex.ts`：首跳从「有未并入的括号」推进到 `CatalogGuide: … ConditionalExpressionShape`。

两条都在 §2 里判过「不是本格」，本轮不动。

## 7. 剩下的 B 类（给下一轮）

| 字节 | 文件 | 现在卡在哪 | 需要的面 |
|---:|---|---|---|
| 185 | `im-dynamic` | 动态 import + 调用 / 成员后缀 | import 家族（任务书排除） |
| 195 / 474 | `*-instantiation-line-end` | 类型实参 `a<b>` 之后 | 类型实参 postfix |
| 226 | `ex-round743-chain-in-binary-right` | 二元根 + 后缀括号（根未登记） | A3 postfix 面（任意已建根之后接后缀） |
| 235 | `expr-typeof-import-meta` | `typeof foo.bar` | 前缀一元操作数 postfix |
| 431 / 1148 / 1929 | 箭头三例 | 箭头体 / 泛型返回类型 / 箭头体后正则 | 箭头体收口 |
| 796 | `expr-template-tagged-suffix` | `obj.tag\`abc\`.trim()`（标签是成员链） | 标签模板的**成员链标签**（子问题二） |
| 1454 | `gap-r956-predicate-paren-type` | `(string)` 被收成 `ParameterShape` | 谓词括号（`MethodCloseRule`） |
| 1993 | `expr-r1233-control-head-regex` | `(a)` ⏎ `/re/g` 是除号续接 | 表达式跨行续接判据 |
| 400 / 161 | 两条 `xl:ts-invalid` | — | 不可作验收 |

## 8. 复现

```powershell
$id = "all-possible-1027-t8e"
Set-Location C:\Users\Admin\Documents\GitHub\xl-example-set\$id
# xl_build(cwd=$PWD, paths=["core","typescript"], targets=["ts"])
node node_modules/typescript/bin/tsc -p .
node tmp/t8e-probe.mjs tmp/t8e-fallback3.json          # 全语料 fallback（63 → 62）
node tmp/t8e-one.mjs tests/cases/token/expressions/expr-tag-nonnull-base.ts   # 首跳 + 默认路径
node typescript/cases/tts/tools/tshape-judge.mjs ts tests/cases/token/expressions/expr-tag-nonnull-base.ts --out tmp/t8e-judge-nonnull
node tmp/t8e-snippets.mjs tmp/t8e-snips3.txt           # 后缀括号矩阵（容器 / 调用 / 标签模板）
node tmp/t8e-corpus-hash.mjs (Get-Location).Path tmp/t8e-after.tsv   # 对拍 t8e-before.tsv（= T8d 基线）
node tmp/target-cases.mjs                              # 30 target
```

`tmp/` 被 gitignore；本轮新增 `tmp/t8e-{probe,one,snippets,corpus-hash}.mjs`、`tmp/t8e-snips{1..6}.txt`、
`tmp/t8e-fallback{,2,3}.json`、`tmp/t8e-{before,after}.tsv`、`tmp/t8e-trace-*`、`tmp/t8e-smoke/` 只在本地。

## 9. 结论

B 类 13 条逐条量过：12 条属类级（箭头体 / 类型实参 postfix / 前缀一元 postfix / 二元右操作数 postfix /
谓词括号 / 除号续接）或任务书排除项（import 家族、`xl:ts-invalid`）。唯一「一处契约就能收口」的是
**945 B 的 `expr-tag-nonnull-base.ts`**：把标签模板「是一个完整操作数」的既有契约从 `.` 扩到 `[` / `(`，
收口格只对**登记过身份**的根放行后缀括号——2 个文件 +20/−7，清掉 1 条 fallback（63 → 62），
30 target、5 smoke、1715/1716 条语料 AST 读数逐位不变。
