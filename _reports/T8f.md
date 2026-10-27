# T8f — B 类里选下一个最小可修 case（匿名默认导出函数）并做最小修复

分支 `feature/all-possible-1027-t8f`，基点 `feature/all-possible-1027` @ `bb91c14e`（T8e 已合入）。
工作副本 `C:\Users\Admin\Documents\GitHub\xl-example-set\all-possible-1027-t8f`。

## 1. 起点：重新测一遍 fallback（并先修掉探针自己的一个口径 bug）

沿用 T8c/T8e 的口径：对 `tests/cases/token/**/*.ts`（1716 个文件）逐条

1. 直接调 `SourceFileRunner.ParseCore(text, file, true)` 取**首跳**异常文本；
2. 再走默认路径 `Parse` 读 `StatementRouteUtil.LastFileFallback`。

**第一次跑出 70，不是 62。**差值 8 条全部是 `declaration :`（`let v: any` 这种
「带类型标注、无初始化器」的变量声明）。逐条追下去，问题在探针自己：

```ts
// 错：把尾部换行也删掉了
body.replace(/^\s*\n/, "").replace(/\s+$/, "")
```

- `let v: any` ⏎ **EOF** ⇒ 声明壳拿不到换行收口 ⇒ 首跳 `declaration :` ⇒ 真 fallback；
- `let v: any` **⏎** ⇒ 换行已能给 ASI 收口 ⇒ 不 fallback。

语料里这 8 份文件的正文都以换行结尾，`tests/cases/case-file.mjs` 的 `readCaseFile().body`
（= `lines.slice(bodyStart).join("\n")`，**保留尾部换行**）才是唯一正确口径。
改成 `readCaseFile(filePath, "token").body` 之后复测：**FALLBACK = 62**，与任务书逐个对上。

> **给下一轮**：探针千万不要 `trim()` 正文；`build/ts` 是 `tsc` 从 `dist/ts` 产出的，
> `tmp/` 里任何自写探针都要走 `readCaseFile`，否则会凭空多出 8 条假 fallback。

62 条按首跳分组（`tmp/t8f-fallback-base.json`，本分支实测）：

| 首跳 | 条数 |
|---|---:|
| `CatalogGuide: … BinaryExpressionShape，下标 2`（类型实参 postfix 家族） | 9 |
| `declaration 初始化器有未并入的括号`（其中 2 条是 `lex-number-*`，A3） | 5 |
| `CatalogGuide: … ConditionalExpressionShape，下标 3` | 4 |
| `declaration 初始化器根之外还有代码` | 4 |
| `declaration 初始化器多根` | 4 |
| `declaration 符号 +` | 4 |
| `expression 条件表达式问号` | 4 |
| `expression 前缀一元操作数` | 4 |
| `expression new 关键字` | 3 |
| `declaration 符号 !` | 3 |
| `declaration 初始化器未读完` | 3 |
| 其余 16 组各 1~2 条 | 15 |

## 2. 选中 case

- 文件：`tests/cases/token/modules/mod-export-default-function-anon.ts`（**43 字节**正文）
- 内容：`export default function () { return 1; }`
- 首跳（改前）：`函数声明的名字不是标识符`
- 默认路径（改前）：`LastFileFallback=true`、`FileFallbackCount=1`
- 期望：`Function, FunctionBody`；`absent ReturnType`

**为什么选它（逐条核过任务书的四条排除线）**：

| 排除线 | 本 case |
|---|---|
| 箭头大族 | ✗ 源码里没有 `=>`，也没有形参类型标注；首跳落在 `export` 内层声明的函数名字位 |
| 数字 / 原子 postfix（A3） | ✗ 没有数字字面量、没有 `1..` / `1 .`、没有后缀括号 |
| `xl:ts-invalid` | ✗ 文件没有该指令（TS 侧 `parseDiagnostics=0`） |
| 已修 import 家族 / tag 家族 | ✗ 是 `export`，不是 `import`；没有模板 / 标签模板 / 后缀成员链 |

而且它是 B 类里**唯一「一处实参就能收口」**的一条：`FunctionDeclarationShape.FromUnits`
**早就有** `allowAnonymous` 这个形参（`function-declaration-shape.xl.md` §5d-8c 的注释
就是照着 `export default function ()` 写的），只是**本 case 走的那个调用点把实参写死成 `false`**。
其余更小的候选（19 / 22 / 23 / 25 / 27 字节）都落在类型实参 postfix、前缀一元 postfix、
数字 postfix 或 `xl:ts-invalid`，是被任务书排除的类级面。

## 3. 根因

`export default function …` 的内层声明由 `ExportInnerDeclarationDelegate` 接管
（`ProbeKind` 的 `KindFunction` 只在 `default` + 同行 `function` 时给出，所以这个委托的
**定义域就是 `export default function …`**）。它的建造点原来是：

```ts
const built = FunctionDeclarationShape.FromUnits(shell, functionAt, lastCode, context, false, false, shell.Pos);
//                                                                                    ambient ^    ^ allowAnonymous
```

TS 里 `export default function () {}` 的 `FunctionDeclaration` **没有名字 child**
（`ExportKeyword` / `DefaultKeyword` 之后直接是参数表）。`FromUnits` 在
`function-declaration-shape.xl.md:443` 有：

```ts
} else if (!(allowAnonymous ?? false)) {
  throw new Error("函数声明的名字不是标识符");
}
```

`allowAnonymous=false` ⇒ 匿名形直接抛 ⇒ 整文件 C10 回退 legacy。

**同一棵树上已有的两条旁证**（说明缺的不是契约，只是这一格没接上）：

- `source-file-end-possible-shape.xl.md:1040` 的**无体**恢复形已经传 `true, true`，
  旁边注释明写「否则 `FromUnits` 抛『函数声明的名字不是标识符』、被 catch 后整条落进
  `isExportDefault` 的表达式路径 crash」；
- `export default async function () {}` **改前就是 ok**——因为 `ProbeKind` 对
  `default` + `async` 返回 `0`，它根本不进这个委托，走的是已经放行匿名的另一条路。

触发面实测（改前，`tmp/t8f-anon.cjs`）：

| 源码 | 改前 | 改后 |
|---|---|---|
| `export default function () { return 1; }` | FALLBACK | **ok** |
| `export default function () {}` | FALLBACK | **ok** |
| `export default function () { return 1; }` ⏎ `const z = 2;` | FALLBACK | **ok** |
| `const z = 2;` ⏎ `export default function () { return 1; }` | FALLBACK | **ok** |
| `export default function f() { return 1; }` | ok | ok |
| `export default async function () {}` | ok | ok |
| `export default class {}` / `export default class C {}` | ok | ok |

## 4. 改动（1 个文件、1 个实参 + 6 行注释）

`typescript/tokens/declarations/forms/export-inner-declaration-delegate.xl.md`：

```ts
const built = FunctionDeclarationShape.FromUnits(shell, functionAt, lastCode, context, false, true, shell.Pos);
```

`allowAnonymous = true` 在**本委托的定义域内恒为真**（`ProbeKind` 只在这里给出 `KindFunction`），
不是「见到匿名就放行」的宽条件。具名形逐字不变：名字是 `Common` 时
`paramIndex = cursor + nameOffset + 1` 照常前进一格，与放宽前同源。

**没做什么**：不新增 guide、不碰 `ContainerCloseGuide`、不删 `StatementShape`、
不动任何箭头 / 数字 postfix / 类型实参 postfix / 前缀一元 postfix 判据、不改 30 target 行为、不跑 gates。

## 5. 结果

| 项 | 要求 | 实测 |
|---|---|---|
| `xl_build(core,typescript → ts)` | 0 error | **1 written / 636 skipped / 0 error / 3 warning**（仍是既有 3 条 E1107；空缓存首跑 637 written / 0 error） |
| `node node_modules/typescript/bin/tsc -p .` | exit 0 | **exit 0** |
| 选中 case `tshape-judge ts` | status=ok | **`{"status":"ok","structural":[],"moved":[],"fields":[]}`** |
| 选中 case 默认路径 | `LastFileFallback=false` | **false，`FileFallbackCount=0`，首跳不再抛** |
| 全语料 fallback | 下降 ≥1 | **62 → 61**（`tmp/t8f-fallback-after.json`；对比 `t8f-fallback-base.json`：**FIXED=1 / REGRESSED=0**） |
| 全语料 AST 逐文件哈希（1716 条） | 无漂移 | **1715 条逐字节相同；唯一变化就是被修好的那 1 条，而且只翻了 `fb` 标志——`ToAstLine(0)` 的 sha256 前后完全一样** |
| 30 target（`node tmp/target-cases.mjs`） | 30/30、fallback=0、diff=0、error=0 | **cases=30 ok=30 moved=0 diff=0 error=0 fallback=0 \| LastFileFallback=0 \| pin-miss=1** |
| 5 smoke `ts.json` SHA256 前 16 位 | 不变（`BB07DA2201FC5087`） | **5 份全 `BB07DA2201FC5087`** |

- `pin-miss=1` 是既有现象（026 的 `// xl:expect fallback` 按要求未改），与本轮无关。
- 「AST 哈希前后一样」是本轮最强的一条证据：**这条 case 改前改后的树是同一棵**，
  改的只是「谁建它」——从 legacy 兜底变成增量壳自己建，而 `FromUnits` 与 legacy 本来就是同一个建树函数。
  所以本轮对 1716 条语料是**零 AST 风险**（不是「只有 1 条变化且变化可接受」，是**没有变化**）。

## 6. 复现

```powershell
$id = "all-possible-1027-t8f"
Set-Location C:\Users\Admin\Documents\GitHub\xl-example-set\$id
# xl_build(cwd=$PWD, paths=["core","typescript"], targets=["ts"])  → 1 written / 0 error
node node_modules/typescript/bin/tsc -p .
node tmp\t8f-probe.mjs tmp\t8f-fallback-base.json      # 改前全语料 fallback（62）
node tmp\t8f-probe.mjs tmp\t8f-fallback-after.json     # 改后全语料 fallback（61）
node tmp\t8f-diff.cjs                                  # FIXED / REGRESSED 逐条
node tmp\t8f-anon.cjs                                  # 匿名默认导出函数变体矩阵
node tmp\t8f-one.cjs tests/cases/token/modules/mod-export-default-function-anon.ts
node tmp\t8f-corpus-hash.mjs tmp\t8f-before.tsv        # 逐文件 AST 哈希（配 git stash 对拍）
node tmp\t8f-corpus-hash.mjs tmp\t8f-after2.tsv
node tmp\t8f-tsv-diff.cjs
node tmp\target-cases.mjs                              # 30 target
node typescript\cases\tts\tools\tshape-judge.mjs ts tests\cases\token\modules\mod-export-default-function-anon.ts --out tmp\t8f-judge-final
```

`tmp/` 被 gitignore；本轮新增 `tmp/t8f-{probe,diff,groups,one,anon,err,matrix,corpus-hash,tsv-diff}.mjs|cjs`、
`tmp/t8f-fallback-{base,after}.json`、`tmp/t8f-{before,after,after2}.tsv`、`tmp/t8f-smoke{,2}/`、
`tmp/smoke-in/` 全部只在本地。

## 7. 剩下的 61 条（给下一轮，本分支实测）

按「一处判据能不能收口」重新分了类，**不再照抄旧表**：

| 字节 | 文件 | 首跳 | 判定 |
|---:|---|---|---|
| 19 | `expressions/gap-r977-inst-tagged.ts` | CatalogGuide Binary 下标 2 | ✗ 类型实参 postfix（同族 9 条） |
| 19 | `lexical/lex-string-dollar-prefix-intact.ts` | 初始化器未读完 | ✗ 带 `xl:ts-invalid` |
| 22 | `expressions/gap-r977-inst-tagged-template-expr.ts` | CatalogGuide Binary 下标 2 | ✗ 同族 |
| 22 | `expressions/gap-r977-inst-tagged-two-args.ts` | `declaration >` | ✗ 同族 |
| 22 | `modules/mod-import-equals-entity-name-newline.ts` | `import-equals 括号` | ✗ import 家族（任务书排除） |
| 23 | `expressions/expr-typeof-regex-range.ts` | `expression 前缀一元操作数` | ✗ 前缀一元 postfix（同族 4 条） |
| 25 / 25 | `lexical/lex-number-*-*.ts` | 初始化器有未并入的括号 | ✗ 数字 postfix（A3） |
| 27 | `types/type-cond-in-annotation.ts` | `declaration 声明体` | 类型标注里的条件类型（可考虑，但属类型面） |
| 28 | `lexical/lex-preprocessor-if.ts` | 表达式没有读完 | ✗ 带 `xl:ts-invalid` |
| 29 | `expressions/expr-instanceof-instantiation.ts` | CatalogGuide Binary 下标 2 | ✗ 类型实参 postfix |
| 33 | `expressions/gap-instanceof-then-add.ts` | CatalogGuide Binary 下标 3 | ✗ 同族 |
| 39 / 39 | `declarations/*-instantiation-line-end.ts` | 根之外还有代码 | ✗ 同族 |
| 44 | `declarations/decl-instantiation-not-comparison.ts` | CatalogGuide Binary 下标 3 | ✗ 同族（守卫用例） |
| 48~944 | 其余 `statement / expression` 例 | 见 §1 分组表 | 箭头体 / 三元 / `new` / 前缀一元 / 谓词括号 / 除号续接，均为类级 |

**本轮之后没有一个「单文件 + 单个已存在实参」的候选了**：剩下 61 条里，逐条量过的
每一组都要么是任务书排除项（箭头、数字 postfix、import、tag、`xl:ts-invalid`），
要么是类级面（同族 3~9 条一起 fallback，需要新判据而不是接线）。
下一轮若还要做单点收口，建议优先看 `types/type-cond-in-annotation.ts`（27 B，
`declaration 声明体`，类型队列面）——它是剩下唯一一条**不属于任何已排除族、且在类型面而非
postfix / 箭头面**的单文件。

## 8. 结论

B 类里选 43 B 的 `mod-export-default-function-anon.ts`：`ExportInnerDeclarationDelegate`
建 `export default function …` 时把 `FunctionDeclarationShape.FromUnits` 的
`allowAnonymous` 实参写死成 `false`，而 TS 的这个形**没有名字 child**。
改 1 个实参（+6 行注释说明定义域），清掉 1 条 fallback（62 → 61），
1716 条语料的 AST 逐字节不变（只有 `fb` 标志翻了），30 target、5 smoke 读数逐位不变。

顺带记一条口径陷阱（§1）：探针 `trim()` 正文会凭空多出 8 条 `declaration :` 假 fallback。
