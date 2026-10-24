# HANDOFF — Stage 3 S3d/S3e 合并切片：更多算子与叶子

分支 `feature/possible-statement-s3d`，基线 `feature/possible-statement` @ 6719ed24。
本切片首个提交 `f0de8460`（代码 + cases）。

## 1. 新增支持清单

### 1.1 二元算子（形状层 + AST 层同时支持）

集合**整体委托** `OperatorTable.IsBinaryOperator`（优先级数值仍只在 `operator-table.xl.md` 一处），因此新增：

| 族 | 运算符 |
| --- | --- |
| 比较 | `<` `>` `<=` `>=` `instanceof` `in` |
| 相等 | `==` `!=` `===` `!==` |
| 逻辑 | `&&` `\|\|` `??` |
| 位 | `&` `\|` `^` |
| 移位 | `<<` `>>` `>>>` |
| 幂 | `**`（右结合，`OperatorTable.IsRightAssociative`） |

AST 侧不重写节点结构：运算符 token 走 `ExpressionBuilder.MakeOperatorToken`（`<`→`FirstBinaryOperatorShape`、
`**`→`AsteriskAsteriskTokenShape`、`instanceof`→`InstanceOfKeywordShape`、`in`→`InKeywordShape` …），
容器仍是 `BinaryExpressionShape` + `SpanNode(首单元, 末单元)`。

### 1.2 前缀一元

集合委托 `OperatorTable.IsPrefixOperator`，**显式排除 `++` / `--`**：新增 `!` `~` `+` `-` `typeof` `void` `delete`。
AST 侧按 legacy `ParseUnary` 的同一批工厂分派：`typeof`→`TypeOfExpressionShape`、`void`→`VoidExpressionShape`、
`delete`→`DeleteExpressionShape`、其余→`PrefixUnaryExpressionShape`，跨度 `SpanNode(运算符, 操作数末单元)`
（运算符 token 不投影成子节点，legacy 同口径）。

### 1.3 叶子

| 叶子 | 形状层 | AST 层 |
| --- | --- | --- |
| `true` / `false` / `null` / `this` | 新 `KindKeyword`（`TextOfToken` 已能取 `Common` 正文） | `SpanLeaf(new TrueKeywordShape/…)`，与 `MakeKeywordLeaf` 同一口径 |
| 大整数 `1n` | 仍判 `KindNumber`（`Common.IsBigInt()`，回归防线不变） | `BigIntLiteralShape.FromBasicToken`（替换 S3c 的 `Decline`） |
| 数字（含 `.5`/`.5e2`/`1.`/`0x1f`/`1_000`） | 原有 | 原有 |
| 标识符 | 原有 | 原有 |

结构文本仍由 `StatementOperatorBody.Render` / `RenderInfix` 产出；新增叶子走默认分支（返回 `Text`），
所以 `+(1n,2n)`、`&&(true,false)`、`??(null,a)`、`this` 都是真实结构而不是占位符。

### 1.4 类型实参歧义（`f<T>(x)`）

`<` 在操作数之后既可能是小于号，也可能是类型实参表的开头。壳是**逐格**喂单元的（读到 `<` 那一格后面还没有单元），
因此判据放在 `IngestAll` 每格收尾处：`HasTypeArgumentCall(Units)` 扫全部单元，一旦某个 `<` 之后
「深度归零的 `>`（含 `>>`/`>>>` 跨层）紧跟一个 `(` 圆括号单元」，本体立刻 `Fail("类型实参调用")`，
AST 回 legacy 按类型实参调用解析。判错只损失接管条数，**不会建错树**。

## 2. 未覆盖清单（安全回退：`Incomplete` / `Decline`，XML 与 legacy 逐字节一致）

- 字符串字面量（形状层没有可复用的「原始文本」来源；AST 侧 `StringLiteralShape` 本来可复用，但形状文本无从取证）；
- 模板字符串 / 无替换模板 / 正则字面量；
- 数组字面量 `[...]`、对象字面量 `{...}`；
- 成员访问 `.`、可选链 `?.`、调用 `(...)`、索引 `[...]`、泛型调用 `f<T>(x)`；
- 赋值 `=` 与复合赋值、逗号 `,`、条件 `?:`、`as` / `satisfies`；
- `++` / `--`（前缀不接：legacy `PrefixUnaryExpressionShape` 不带 operator 字段；后缀不接）；
- `new`、箭头函数、函数/类表达式、`await` / `yield`、`import.meta`。

未覆盖构造的用例：`op-unsupported-call`（`f(1, 2)`）、`op-unsupported-postfix`（`a++`）、
`op-unsupported-string`（`"s" + a`）、`ast-fallback-call` / `ast-fallback-element` / `ast-fallback-member` /
`ast-fallback-postfix` —— 全部断言 `shapeAst=0` + `declined>0` + XML==legacy。

## 3. op 组逐条（`operators-live`，36/36）

原有 12 条：`op-mul-add` `+(*(1,2),3)` · `op-add-mul` `+(a,*(b,c))` · `op-sub-left` `-(-(a,b),c)` ·
`op-paren` `*(a,(b+c))` · `op-mixed` `-(+(a,*(b,c)),/(d,e))` · `op-ident-only` `+(a,b)` · `op-div-mul` `*(/(1,2),3)` ·
`op-paren-chain` `*(*(a,(b+c)),d)` · `op-prefix` `+(-(a),b)` · `op-multi-statement` · `op-asi` · `op-unsupported-call`。

本切片新增 24 条：

| case | 源码 | 结构文本 | inserts |
| --- | --- | --- | --- |
| op-cmp-lt | `a < b;` | `<(a,b)` | 1 |
| op-cmp-chain | `a <= b >= c;` | `>=(<=(a,b),c)` | 2 |
| op-eq-strict | `a === b !== c;` | `!==(===(a,b),c)` | 2 |
| op-logical | `x \|\| y && z;` | `\|\|(x,&&(y,z))` | 2 |
| op-nullish | `a ?? b;` | `??(a,b)` | 1 |
| op-bitwise | `a & b \| c ^ d;` | `\|(&(a,b),^(c,d))` | 3 |
| op-shift | `a << b >> c >>> d;` | `>>>(>>(<<(a,b),c),d)` | 3 |
| op-power-right | `a ** b ** c;` | `**(a,**(b,c))` | 2 |
| op-power-mul | `a * b ** c;` | `*(a,**(b,c))` | 2 |
| op-instanceof | `a instanceof B;` | `instanceof(a,B)` | 1 |
| op-in | `a in b;` | `in(a,b)` | 1 |
| op-prefix-not | `!a && b;` | `&&(!(a),b)` | 1 |
| op-prefix-tilde | `~a \| b;` | `\|(~(a),b)` | 1 |
| op-prefix-plus | `+a * b;` | `*(+(a),b)` | 1 |
| op-prefix-typeof | `typeof x === y;` | `===(typeof(x),y)` | 1 |
| op-prefix-void | `void a;` | `void(a)` | 0 |
| op-prefix-delete | `delete a;` | `delete(a)` | 0 |
| op-leaf-true | `true && false;` | `&&(true,false)` | 1 |
| op-leaf-null | `null ?? a;` | `??(null,a)` | 1 |
| op-leaf-this | `this;` | `this` | 0 |
| op-leaf-bigint | `1n + 2n;` | `+(1n,2n)` | 1 |
| op-paren-logical | `(a && b) \|\| c;` | `\|\|((a&&b),c)` | 2 |
| op-unsupported-postfix | `a++;` | —（Incomplete） | 0 |
| op-unsupported-string | `"s" + a;` | —（Incomplete） | 0 |

`op-ast-cases.json`（`ast-from-shapes`，47/47）在原有 24 条基线上新增 23 条并改 2 条：
`ast-prefix-minus`（原 `ast-fallback-prefix`，`shapeAst` 0→1）、`ast-num-bigint`（原 `ast-num-bigint-gap`，0→1），
以及比较/相等/逻辑/空值/位/移位/幂/`instanceof`/`in`/前缀 6 条/关键字 3 条/大整数/括号逻辑/`a++` 回退。

## 4. 全表读数（本切片末）

| 门 | 读数 |
| --- | --- |
| xl_build（core+typescript → ts） | 884 written, 0 error / 2505 warning（既有 W3102/W3103 噪声） |
| tsc | 0 error |
| op-ast-proof | 47/47（形状树接管计数 47、TS 逐节点 47、AST 数字叶子 8） |
| op-proof | 36/36（结构文本 36、InsertBetween 计数 33） |
| operators-live | 36/0/0/0，double-accept 0，file-fallback 0 |
| dev | 22/22 |
| harness --all | 72/0/known 1（stage4/stage5 仍 SKIP） |
| harness --double-accept | 91 cases / 0 failed |
| harness --lint | PASS（优先级数字表只在 operator-table） |
| validate | 1720/0 |
| ast-json | 6167/6167；`git status typescript/cases` 空；diff 完全一致 6167/6167、结构差 0、位置差 0、字段差 0 |
| token-ast | 1716 file（ok 1706、diff 0、ts-invalid 10）= 基线 |
| real-dts | 见 §6（本轮复核） |
| feas-operator / insert-between | 6/6、9/9 |

## 5. 风险

1. **类型实参判据是保守向前看**：`f<Array<number>>(x)` 这类「`>>` 跨层」已覆盖；但若将来出现
   「`>` 与 `(` 之间夹着注释以外的单元」或类型实参后紧跟模板标签 `f<T>\`x\`` 的写法，判据会回落到
   「按小于号接管」并可能建出与 legacy 不同的树——那时应把判据迁到 `ExpressionBuilder.CanStartTypeArgumentCall`
   的同一实现，而不是继续加启发式。当前所有 6167 条 AST 用例逐字节一致，是这条判据的现场证据。
2. **`a < b` 的接管依赖「后面看不到 `>` + `(`」**：保守方向是「少接管」，不是「建错树」。
3. **前缀 `++`/`--` 不接管**：legacy `PrefixUnaryExpressionShape` 目前不带 operator 字段，接管会丢掉
   `!` 与 `~`、`++` 与 `--` 的区分；这是 legacy 的既有形状，不是本切片引入的。
4. **perf 比例告警**：`tests/statement-possible/perf.mjs` 的 scale 比例（200/100=2.83、400/200=3.40，线性≈2.0）
   超过 2.5 的告警线（不判失败）。本切片没有改 candidate/路由逻辑，但新增的 `HasTypeArgumentCall` 每格
   扫一遍单元是 O(n²) 级别的增量成本，后续若要压这条曲线，可把它降级为「只在 `<` 出现后置位、且每格只扫新增单元」。
5. **形状层文本 vs TS 渲染**：关键字叶子 / BigInt / `typeof`/`void`/`delete` 在 `ts.createSourceFile` 侧
   不是 Identifier/NumericLiteral，故这些用例声明 `tsTexts: []`；这不是跳过比较，而是显式声明 TS 渲染不出来。

## 6. 复核记录

- 本轮 `node typescript/cases/real-dts-ast.mjs`：226/226（与基线一致）。
- `git status --short typescript/cases` 在 `ast-json.mjs` 之后为空，再跑 `ast-json-diff.mjs`，最后未做
  `git checkout -- typescript/cases`（无需回滚）。
