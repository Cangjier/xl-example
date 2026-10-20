# bindings 族覆盖记录（chunk 1）

分支 `cover-bindings-1`，基线 `origin/integration @0a02bda2`（statements chunk 2 的解构用例已合并）。
测量入口：变量语句（`let` / `const` / `var`）与 `for (const … of …)`；对拍尺子 =
`node typescript/cases/ast-json.mjs bindings` + `ast-json-diff.mjs`。

## 读数

```
bindings    39 / 39              # 本块从 0 条到 39 条，全部完全一致
statements  91 / 91             # 不变（statements 的 5 条解构用例同步走本块形状）
全量        1519 / 1519         # 基线 1480 + 39；结构差 0 / 位置差 0 / 字段差 0
tsc exit 0；xl_check 0 error
```

## 形状层改动（bindings 家族三个 shape，未动 statements / expressions / core）

`BindingElementShape.FromTokens` 从「raw basic token 当孩子」改成**直接建 AST 子节点**：

- 名字：`IdentifierShape`（Common / 关键字名），`Pos` = 该元素起点（含前导 trivia）；
- 嵌套 pattern：`ArrayBindingPatternShape.FromBracket` / `ObjectBindingPatternShape.FromBracket` 递归，
  嵌套 pattern 自己的 `Pos` 由父元素给；
- rest：`DotDotDotTokenShape` 作为第一个子节点（`...` 在 token 层是一颗组合 Symbol；旧的「三颗 `.`」形态也兼容）；
- 默认值：`ExpressionBuilder.ParseAssign` 解析 `=` 之后的单元，作为最后一个子节点；
- children 顺序与 TS 的 `BindingElement` 完全一致：`DotDotDotToken`、`PropertyName`、`BindingName`、`Initializer`。
  TS 的 `BindingElement` **不含** `=` 这个 EqualsToken（实测 `[a = 1]` 只有 Identifier + NumericLiteral），本块按实测建。

`ArrayBindingPatternShape.FromBracket` / `ObjectBindingPatternShape.FromBracket` 按 `,` 切组后逐个调
`FromTokens`，`[` `]` / `{` `}` 只进区间；空位（`[a, , b]`、`[, a]`）建零宽 `OmittedExpressionShape`
（消费 expressions 家族形状，不编辑它），对象模式的行尾逗号与空模式不产生空位。

### 与 statements 的兼容（没有改 statements 一行）

`statement-builder.NormalizeBindingPattern` 是 statements chunk 1 的旧 workaround：它按 pattern 的
`Elements` 字段逐组把 `Data` 重写成「只留 Common token 的 Identifier」。本块把元素**直接 Add 进 `Data`**、
让 `Elements` 保持为空——该 workaround 在第一个非空组就 `break`，于是成为 no-op，正确的子节点不会被覆盖。
`ArrayBindingPatternShape.Elements` / `ObjectBindingPatternShape.Elements` 的字段注释里已写明这一约定；
待 statements 家族删掉 workaround 后可以把 `Elements` 回填。

## 已收形态（base + trivia，全部绿）

- 基础：`let [a, b] = x;`、`let { a, b } = x;`、`let { a: b } = x;`、空模式 `[]` / `{}`；
- 嵌套：`let [[a], b] = x;`、`let { a: { b } } = x;`、`let [{ a }] = x;`、`let { a: [b, c] } = x;`、`let [{ a }, { b }] = xs;`；
- 默认值：`let [a = 1] = x;`、`let { a = 1 } = x;`、`let { a: b = 1 } = x;`、`let [{ a = 1 }] = x;`；
- rest：`let [...a] = x;`、`let [a, ...b] = x;`、`let { ...a } = x;`、`let { a, ...b } = x;`；
- 空位：`let [a, , b] = x;`、`let [, a] = x;`、`let [a, , , b] = x;`；
- for-of：`for (const [a, b] of xs) a;`、`for (const { a } of xs) a;`；
- trivia：元素间 / 冒号两侧 / 等号两侧 / `...` 前后注释、行内换行、空模式里的注释。

## AST 口径（TS 实测）

| 构造 | TS children / 区间 |
| --- | --- |
| `let [a, b] = x;` | `ArrayBindingPattern[3,10)` → `BindingElement[5,6)`→`Identifier[5,6)`、`BindingElement[7,9)` |
| `let { a: b } = x;` | `ObjectBindingPattern[3,12)` → `BindingElement[5,10)`→`Identifier[5,7)`、`Identifier[8,10)` |
| `let [[a], b] = x;` | 外层 `BindingElement[5,8)` 的第一个 child 是嵌套 `ArrayBindingPattern[5,8)` |
| `let [a = 1] = x;` | `BindingElement[5,10)` → `Identifier[5,6)`、`NumericLiteral[8,10)`；无 EqualsToken |
| `let [...a] = x;` | `BindingElement[5,9)` → `DotDotDotToken[5,8)`、`Identifier[8,9)` |
| `let [a, , b] = x;` | 中间是零宽 `OmittedExpression[7,7)`（pos == end） |
| `let [] = x;` / `let {} = x;` | pattern 无 children |

`Pos` 一律按 IMPORTANCE §4：`Pos = 前一个非 trivia 单元 End+1`（第一个元素是 `[` / `{` 之后）；
cjAst 的 `end = SourceRange.End.Index + 1`，所以零宽 `OmittedExpression` 的终点点在 `position - 1`。

## 暂缓（附依赖）

- 字面量名 `let { "s": a } = x;` ← 与 members 同一个 `ParseName` 缺口（字面量当属性名）；
- computed name `let { [k]: a } = x;` ← `ComputedPropertyNameShape`（types 家族）；
- for-in 解构 `for (const [a] in xs)` ← TS 本身语法不允许（不是本仓缺口）；
- rest 里再嵌 pattern 的其它形态、参数位 / catch 位的解构测量 ← 等对应语句/声明家族放开入口。
