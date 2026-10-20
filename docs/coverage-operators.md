# operator coverage（chunk 1：二元 / 赋值 / 一元 / 可选链，expression.ts 追加）

本页记 `typescript/cases/expression.ts` 这一轮追加的 operator 用例组、怎么验的、哪些 operator 还收不进来。
口径与既有用例相同：`node typescript/cases/ast-json.mjs` + `node typescript/cases/ast-json-diff.mjs`
（本分支唯一权威 AST 尺子）。**本轮没有改 shape / builder**：用例全绿说明现有 `ExpressionBuilder` 已经覆盖这些 operator，
缺的只在「builder 不产生的写法」那一类（见 §3）。

## 1. 追加的组（append-only，未动既有行）

| 组 | 内容 | 条数 |
| --- | --- | --- |
| base 29 二元优先级阶梯 | `**` `*` `/` `%` `+` `-` `<<` `>>` `>>>` `<` `>` `<=` `>=` `in` `instanceof` `==` `!=` `===` `!==` `&` `^` `\|` `&&` `\|\|` `??`；混合优先级（`a + b * c;`、`a < b && c > d;`、`a ** b ** c;`、`a \| b ^ c & d;`、`a == b === c;`、`a << b + c;`、`a in b && c instanceof d;`、`a ?? (b \|\| c);`、`(a ?? b) \|\| c;`）；trivia（词间注释 / 换行 / 多空格） | 40 |
| base 30 赋值全族 | `=` `+=` `-=` `*=` `/=` `%=` `**=` `<<=` `>>=` `>>>=` `&=` `\|=` `^=` `&&=` `\|\|=` `??=`；链式（`a = b = c;`、`a += b -= c;`）；trivia | 20 |
| base 31 一元 / 前缀 / 后缀 | `!` `~` `+` `-` `typeof` `void` `delete` `++x` `--x` `x++` `x--`；组合（`!a && ~b;`、`-a * +b;`、`+a + -b;`、`~a ^ !b;`、`typeof ++a;`、`void a++;`）；trivia | 24 |
| base 32 可选链 / 非空 / 逗号 / 三元 | `a?.b?.(c);`、`a?.b?.[c];`、`a!.b;`、`a!;`、`a?.b!.c;`、`a, b;`、`a, b, c;`、`a ? b : c ? d : e;`、`a = b, c = d;` | 10 |

合计追加 **94** 条；`expression` 从 397 → **491** 条，**491 / 491 完全一致**（结构差 0 / 位置差 0 / 字段差 0）。
未改动任何既有行、未改 `expression-builder.xl.md`、未改 aliases / punctuation（没有缺 shape 的情况）。

## 2. 合法性闸门

追加前对 88 个候选写法逐条跑 `ts.createSourceFile(..., ScriptKind.TS).parseDiagnostics`：
**0 条非法**。其中 3 条被排除在最终用例之外（不是非法，而是本仓暂不支持，见 §3）：
调用/数组 spread、`await`、`yield`；`a ?? b || c;` 这种「`??` 与 `\|\|` 不加括号混用」的写法
在 TS 里是语法错误，因此改用合法的 `a ?? (b || c);` / `(a ?? b) || c;`。

## 3. 暂缓（写成 `//` 注释目标，不在用例集里）

| 写法 | 原因 |
| --- | --- |
| `f(...a);` `[...a];` `f(...a, b);` `[a, ...b];` | `ExpressionBuilder.ParseBracketArguments` / `ParseArrayLiteral` 不吃 `...`（对象字面量的 `SpreadAssignment` 已支持） |
| `await a;` `function* f() { yield 1; }` | 语句候选（CanStart / end）与 builder 都没有 `AwaitExpression` / `YieldExpression` |
| `new.target;` / `import.meta;` | `MetaProperty` 未实现（`meta-property-possible-shape` 仍是 throw 桩；另见 docs/expression-ast-analysis.md §4.4） |

## 4. 口径备注：TS 反查名 = alias 形状类名

`ts.SyntaxKind[EqualsToken]` 反查印出来的是 **`FirstAssignment`**（TS 枚举里同一值有多个名字，反查取第一个），
`LessThanToken` 印 `FirstBinaryOperator`、`PlusEqualsToken` 印 `FirstCompoundAssignment`、`BarEqualsToken` 印 `LastBinaryOperator`。
产物侧正好有同名形状类（`FirstAssignmentShape` / `FirstBinaryOperatorShape` / …），所以这些 operator token 的 `kind`
直接对上，**不需要在 `ast-json.mjs` 的 `TS_KIND_ALIASES` 里加别名**。本轮验证了这条不是巧合：只用
`FirstAssignment` / `FirstBinaryOperator` / `FirstCompoundAssignment` / `LastBinaryOperator` 这四类 alias 形状，
其余 operator 都走各自的 punctuation 形状（`PlusTokenShape` → `PlusToken` 等）。

## 5. 读数

- `expression`：**491 / 491 完全一致**（+91 条 operator 用例）。
- 全量：`ast-json` 16 个构造全绿，`ast-json-diff` 合计一致（无结构差 / 位置差 / 字段差，无回归）。

## 6. 依赖与注意事项

- 本轮只改 `typescript/cases/expression.ts`（append-only）；未新增 `docs/` 之外的文件，也未改 xl 源文件，
  因此 `xl_check / tsc` 与基线一致。
- 后续若要收 §3 的写法，改动点在 `expression-builder.xl.md`（spread / await / yield / MetaProperty 产生式），
  不属于本轮 write scope。
