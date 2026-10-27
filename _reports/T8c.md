# T8c — 从剩余 fallback 里挑一个 B 类小 case 并做最小修复

分支 `feature/all-possible-1027-t8c`，基点 `feature/all-possible-1027` @ `e5230e3d`。
工作副本 `C:\Users\Admin\Documents\GitHub\xl-example-set\all-possible-1027-t8c`。

## 1. 起点：重新测一遍 fallback（不沿用旧表）

主仓的 `tmp/fallback-list.txt` 已失效（1716 行全标 `FALLBACK`，是老探针关着
`EnableIncrementalShapes` 跑的，`last` 恒为 `false`/`true` 混杂、无法用作分类）。
本轮新写 `tmp/t8c-probe.mjs`：对 `tests/cases/token/**/*.ts`（1716 个文件）逐条

1. 直接调 `SourceFileRunner.ParseCore(text, file, true)` 取**首跳**异常文本（不让
   `Parse` 的整文件兜底把它吞掉）；
2. 再走默认路径 `Parse` 读 `StatementRouteUtil.LastFileFallback`。

首跑读数：**fallback = 69**（任务书估 73，同一量级；差异来自这期间已修的条目）。

## 2. 分类（26 条首跳消息 → A / B / C）

按任务书口径：**A** = 数字/原子 postfix（`1..` / `1 .` / `不支持的表达式起点` /
前一个原子是数字的「有未并入的括号」）；**B** = 收口 / 根之外还有代码 / 未读完 /
非数字原子的「有未并入的括号」；**C** = 其它。

| 首跳消息 | 文件数 | 类 |
|---|---:|---|
| `declaration 初始化器根之外还有代码` | 6 | **B** |
| `declaration 初始化器有未并入的括号`（非数字原子） | 6 | **B** |
| `ImportDeclarationShape.Close: 缺少模块说明符`（收口格） | 4 | **B** |
| `declaration 初始化器未读完` | 2 | **B** |
| `表达式没有读完` | 1 | **B** |
| `函数声明的返回类型没有读完` | 1 | **B** |
| `declaration 初始化器有未并入的括号`（数字原子：`lex-number-*`） | 2 | A（A3，T8b 已证，跳过） |
| `不支持的表达式起点` | 1 | A |
| `CatalogGuide: 没有候选形状可以构成（BinaryExpressionShape）` | 11 | C |
| `CatalogGuide: 没有候选形状可以构成（ConditionalExpressionShape）` | 4 | C |
| `declaration 初始化器多根` | 4 | C |
| `declaration 符号 +` | 4 | C |
| `expression 条件表达式问号` | 4 | C |
| `expression 前缀一元操作数` | 4 | C |
| `expression new 关键字` | 3 | C |
| `declaration 符号 !` | 3 | C |
| `declaration import-equals 括号` / `符号 ===` / `>` / `符号 ?.` / `声明体` | 5 | C |
| `不支持的类型起点` / `函数声明的名字不是标识符` / `构造类型缺少 new` / `不支持的对象类型成员` | 4 | C |
| **合计** | **69** | A=3 / **B=20** / C=46 |

B 类候选 20 个，按字节升序（最小 12 个见 `tmp/t8c-fallback.json`）：

| 字节 | 文件 | 首跳 |
|---:|---|---|
| 168 | `types/type-pred-arrow.ts` | 根之外还有代码 |
| **172** | **`modules/mod-import-type-equals.ts`** | **ImportDeclarationShape.Close: 缺少模块说明符** |
| 195 | `declarations/decl-instantiation-line-end.ts` | 根之外还有代码 |
| 235 | `expressions/expr-typeof-import-meta.ts` | 根之外还有代码 |
| 312 | `modules/mod-import-equals-require-args-newline.ts` | 缺少模块说明符 |
| 334 | `modules/mod-import-equals-type-head-newline.ts` | 缺少模块说明符 |
| 391 | `modules/mod-import-equals-from.ts` | 缺少模块说明符 |
| 400 | `lexical/lex-string-dollar-prefix-intact.ts` | 初始化器未读完（case 带 `xl:ts-invalid`，不可作验收） |
| 474 / 1148 / 1240 | `gap-instantiation-line-end` / `stmt-adversarial-shapes` / `expr-as-then-value-operator` | 根之外还有代码 |
| 1929 | `gap-r1231-decl-newline-operator.ts` | 初始化器未读完 |

## 3. 为什么改选 172 B 而不是 168 B

**168 B 的 `type-pred-arrow.ts` 先被选中，量完之后放弃**（记录在此，避免下一轮重走）：

- 首跳 `declaration 初始化器根之外还有代码`。源码 `const isStr = (x: unknown): x is string => typeof x === "string"`。
- 探针定位到真正成因：箭头**收口太早**，`ArrowFunctionShape` 只盖 `… => typeof x`
  （`src=[89,126)`），`=== "string"` 落在根之外。
- 触发面很窄，量出来是「**形参带类型标注** + 二元运算符 `==` / `===`」：
  `(x: unknown) => a === b` 抛、（`x: unknown`) => `a + b` 不抛、`(x) => a === b` 不抛。
  原因是形参带类型标注时收口格提前接受了一个「体到当前 raw 末尾」的半截箭头
  （探针见到 attempts units=2/3），`builtShape` 被缓存后 `===` 再进来就没人接。
- **为什么不在守卫处打补丁**：`raw` 的第一格已经是被消费掉的箭头本身
  （`raw=[ArrowFunctionShape, " ", "===", " ", "b"]`，形参 `(` 不在 raw 里），
  走既有「整条原子重建」分支只会得到 `((x)=>typeof x) === "string"`
  ——**一棵静默错树**。正确修法是改箭头体的续接/收口接受条件，超出「最小改动」，
  且直接威胁 30 target 与 A3 边界。

所以本轮改选 B 里**并列最小、且真正独立**的**收口格**一族：`ImportDeclarationShape.Close: 缺少模块说明符`。
它 4 个文件共用同一个首跳，一处修可全部清掉。

## 4. 选中 case

- 文件：`tests/cases/token/modules/mod-import-type-equals.ts`（**172 字节**）
- 源码：`import type x = require("m")`
- 首跳（改前）：`ImportDeclarationShape.Close: 缺少模块说明符`
- 同族：`mod-import-equals-from.ts`(391) / `mod-import-equals-type-head-newline.ts`(334) /
  `mod-import-equals-require-args-newline.ts`(312)

## 5. 根因与改动（1 个文件，1 处）

`typescript/tokens/statements/statement-route-util.xl.md` 的 `import` 声明路由
（`DecideShell`，`text === "import"` 分支）本来只探「名字后面一格是不是 `=`」：

```ts
const afterAt = ItemUtil.NextCode(units, nextAt + 1);   // nextAt = 名字
if (units[afterAt] is "=") return StatementRoute.None;  // import-equals → 留给 legacy
```

`import type x = require("m")` 的第一个代码单元是**类型修饰词** `type`，不是名字，
于是探测落成了 `type` 之后的 `x`，探不到 `=` ⇒ 误判成本族 ⇒ 建出
`ImportDeclarationShape` ⇒ 收口格找不到模块说明符 ⇒ 整文件兜底。

改动：`type` 是修饰词时把「名字落点」跳过它再探 `=`；`import type = require("m")`
（`type` 是别名本身）与 `type` 之后已无代码两种情形仍按老行为返回 `None`。
**不比行终止符**——`import` ⏎ `type A = …` 与 `import /*c*/ type B = …` 都是合法
import-equals（`mod-import-equals-type-head-newline.ts` 实测两条），加换行判据会打回原形。
`type` 之后是 `{` / `*` / 名字+`from` 的三种类型导入，跳过之后探不到 `=`，仍走本族，行为不变。

```ts
let nameAt = nextAt;
if ((next as Common).Is("type")) {
  const afterTypeAt = ItemUtil.NextCode(units, nextAt + 1);
  // `import type = require("m")`：`type` 是别名本身、不是修饰词 ⇒ 仍按老行为交回 legacy。
  if (afterTypeAt >= units.length
    || (units[afterTypeAt] instanceof Symbol && (units[afterTypeAt] as Symbol).Is("="))) {
    return StatementRoute.None;
  }
  nameAt = afterTypeAt;
}
const afterAt = ItemUtil.NextCode(units, nameAt + 1);
```

未新增 guide、未碰 `ContainerCloseGuide`、未删 `StatementShape`、未改 30 target 行为、未跑 gates。

## 6. 结果

| 项 | 要求 | 实测 |
|---|---|---|
| `xl_build(core,typescript → ts)` | 0 error | **1 written / 636 skipped / 0 error / 3 warning**（仍是既有 3 条 E1107） |
| `node node_modules/typescript/bin/tsc -p .` | exit 0 | **exit 0** |
| 选中 case `tshape-judge ts` | status=ok | **`{"status":"ok","structural":[],"moved":[],"fields":[]}`** |
| 选中 case 默认路径 | `LastFileFallback=false` | **false，`FileFallbackCount` 增量 0，首跳不抛** |
| 同族 3 条 `tshape-judge ts` | status=ok | **3/3 ok**（334/391/312 字节三条全 ok，默认路径同样 `LastFileFallback=false`） |
| 30 target（`node tmp/target-cases.mjs`） | 30/30、fallback=0、diff=0、error=0 | **cases=30 ok=30 moved=0 diff=0 error=0 fallback=0 \| LastFileFallback=0 \| pin-miss=1** |
| 5 smoke `ts.json` SHA256 前 16 位 | 不变（`BB07DA2201FC5087`） | **5 份全 `BB07DA2201FC5087`** |

- `pin-miss=1` 是既有现象（026 的 `// xl:expect fallback` 按要求未改），与本轮无关。
- 全语料复测：**fallback 69 → 65**，`tmp/t8c-fallback.json` 与 `tmp/t8c-fallback2.json` 对比
  **FIXED=4 / REGRESSED=0**——清掉的正是上表 4 条 import-equals，其余 1697 条读数不变。

## 7. 复现

```powershell
$id = "all-possible-1027-t8c"
Set-Location C:\Users\Admin\Documents\GitHub\xl-example-set\$id
# xl_build(cwd=$PWD, paths=["core","typescript"], targets=["ts"])
node node_modules/typescript/bin/tsc -p .
node tmp/t8c-probe.mjs                 # 全语料 fallback 盘点（69 → 65）
node tmp/t8c-selected.mjs              # 选中 case 默认路径取证
node tmp/target-cases.mjs              # 30 target
node typescript/cases/tts/tools/tshape-judge.mjs ts tests/cases/token/modules/mod-import-type-equals.ts --out tmp/t8c-judge
```

`tmp/` 被 gitignore；本轮新增探针 `tmp/t8c-probe.mjs`、`tmp/t8c-selected.mjs`、
`tmp/t8c-variants.mjs`、`tmp/t8c-bisect.mjs`、`tmp/t8c-param.mjs`、`tmp/t8c-ops.mjs`、
`tmp/t8c-import*.mjs`、`tmp/t8c-one.mjs` 全部只在本地。

## 8. 结论

B 类候选 20 个；本轮取并列最小的**收口格**一族，一处 7 行改动清掉 4 个 fallback，
30 target 与 5 smoke 读数逐位不变。
严格最小的 168 B `type-pred-arrow.ts` 已在 §3 定性为「箭头体续接面」问题——
守卫处打补丁会产出静默错树，留待专门一轮处理，本轮不动。
