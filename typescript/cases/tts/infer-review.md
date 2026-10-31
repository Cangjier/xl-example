# success/ 的 `.infer` 生成与缺口 review

- 日期：2026-10-31
- 范围：`typescript/cases/tts/success`，181 个用例
- 判定模型：宿主默认 `deepseek-official / deepseek-flash`（`case_infer` 插件，一例一次调用）
- 实现侧读数：`build/ts` 的逐字符推进；同一份 `build/ts` 上 `npm run tts:cases` 为 181/181 PASS

## 结论

- 167 个用例写出了 `.infer`；14 个无法生成，根因是节点身份对嵌套同类二元表达式不唯一（§4）。
- 共 1386 个节点：一致 646（46.6%）、late 134、early 437、never 169、stale/unfilled 0。
- 只有 **42 个用例带实现侧信号**：34 个有"类型子树到 EOF 才建"（169 个节点），11 个有"类型节点等到收口/提交点才建"，3 个两者都有；另有 5 个比较记号实现偏早。
- 其余 **125 个用例的缺口来自模型口径**：容器等到构造写完、叶子按记号首字符判。它们不是实现的错，但说明 `.infer` 现在还不能当门禁。
- 生成前修掉了 `case_infer` 的一个解析 bug，否则含 `let` 或数字字面量的用例会整批写不出来（§1）。

## 1. 生成过程与工具修复

### 1.1 修掉的 bug：TS 区间别名与 canonical 名字不一致

`success/controls/let-number`（`let x = 1`）第一次调用直接失败：

```text
有节点没填上（未写盘）：VariableStatement|0|0、NumericLiteral|7|8
```

原因：`astLines` 打印的是 TypeScript 的区间别名（`FirstStatement` / `FirstLiteralToken`），
`dsh-case-infer/src/parse.mjs` 用裸 `kind` 做节点键；而 `applyNumbers`、`nodeId`、actual 三边
都用 `canonicalKind` 折算后的名字（`VariableStatement` / `NumericLiteral`），于是这两个别名的
数字填不回去。`parseNumbers` 自己校验通过（它和模型用同一套裸名字），所以错误拖到填表阶段才暴露。

修复：`parse.mjs` 的 `keyOf` 统一走 `canonicalKind`（从 `../../shape-actual.mjs` 引入）。
`npm run infer:test` 4/4 通过；`dsh_plugins disable/enable dsh-case-infer` 重载后同一用例一次生成成功。
这处修改只影响节点对齐键，不改变模型回答的问题。

### 1.2 生成方式

按目录分成 8 批并行调用 `case_infer`；每例只传 `case`，不覆盖已有文件。每例一次模型调用
（输出不合格时插件内部最多重试一次）。167 例均一次写盘；14 例在两批里各失败两次，见 §4。

## 2. 总体读数

| 指标 | 数值 |
| --- | ---: |
| 用例（有 `.infer`） | 167 / 181 |
| 节点 | 1386 |
| 一致 `ok` | 646（46.6%） |
| `late +N` | 134 |
| `early -N` | 437 |
| `never`（逐字过程里从未出现） | 169 |
| `stale` / `unfilled` | 0 / 0 |

三种状态的口径：

- `late +N`：实现比模型判定的位置晚 N 格。
- `early -N`：实现比模型判定的位置早 N 格。
- `never`：逐字符推进的每一步都没见到这个节点。注意它不等于"最终树里没有"——
  `traceActual` 只在 0..N-1 的每一格收集，节点若只在外层 `SignOut`（EOF）才出现，
  map 里就没有记录；final 树里其实有它。

## 3. 缺口归因

### 3.1 模型口径：125 个用例（432 个 early + 54 个叶子 late）

拆开 437 个 `early`（其中 5 个是实现偏早，见 §3.2C）：

| 形态 | 行数 | 例 |
| --- | ---: | --- |
| 容器判在构造末尾（expected ≥ 节点 end） | 259 | Block 16 / actual 10；IfStatement、VariableDeclaration 等 |
| 容器判在构造内部某个收口格 | 165 | WhileStatement 8 / actual 5（`while` 关键字后就已确定） |
| 叶子判在收口之后 | 8 | `bin-ge` 的 Identifier 6 / actual 5 |
| 实现真的偏早 | 5 | 见 §3.2C |

另有 54 个叶子 `late` 是模型把 expected 放在记号内部（通常首字符）：Identifier 4 / actual 5、
`1` 8 / actual 9、`%` 9 / actual 10。

这一批与 prompt 自带的示例直接冲突：示例里 `let x = 1` 的 VariableStatement 是 char 5、
NumericLiteral 是 char 9；而模型这次把 VariableStatement 判到 9（行尾），在 `bin-mod` 里
又把 `1` 判到 8（首字符）。模型把"形状不再可能改变"理解成了"这个构造已经写完"，
而示例的口径是"kind 已经确定"。

**判定：模型口径偏差，不是实现缺口。** 但这 125 个用例的 `.infer` 数字不能当基线；
要让 `.infer` 可用，得先把口径写死再重生成（§5）。

`types/alias-*` 里 `TypeAliasDeclaration` 有 38 行 early：实现通常在第 6 格（名字收口）就建，
模型常等到 `=` 之后（如 `alias-array` 的 8 vs 6）；也有少数反过来（模型 4 vs 实现 6）。
连容器口径本身也不统一，这也支持"先定口径再重生成"。

### 3.2 实现缺口：42 个用例

#### A. 类型子树只在 EOF（SignOut）才建 —— 34 个用例 / 169 个 `never`

`traceActual` 逐字符 `collect`，节点第一次出现的那一格就是 actual；只在外层 `SignOut` 才出现的
节点在 map 里没有记录，于是显示 `never`。用 `alias-object` 直接验证：

```text
mapped 18   final 7
only-at-signout: TypeLiteral|8|9
only-at-signout: PropertySignature|10|11
only-at-signout: Identifier|10|11
only-at-signout: StringKeyword|13|14
```

覆盖的类型构造（34 个用例）：

| 构造 | 代表用例 | never 数 |
| --- | --- | ---: |
| type literal / 成员签名 | `alias-object`、`alias-object-method`、`alias-object-call-construct` | 4–12 |
| mapped type | `alias-mapped`、`alias-mapped-modifiers`、`alias-mapped-remap` | 11–17 |
| tuple | `alias-tuple`、`alias-tuple-named`、`alias-tuple-rest` | 3–7 |
| array / readonly array | `alias-array`、`alias-readonly-array` | 2–3 |
| union / intersection | `alias-union`、`alias-intersection` | 1–5 |
| indexed access | `alias-indexed-access`、`alias-indexed-generic` | 5 |
| keyof / 其它 type operator | `alias-keyof`、`alias-readonly-array` | 3 |
| literal type / import type | `alias-literal-string`、`alias-import-type` | 2–4 |
| template literal | `alias-template-literal` | 5 |
| function / constructor type | `alias-fn-type-generic`、`alias-ctor-type-abstract` | 4–9 |
| parenthesized / typeof / 简单引用 / 原始类型 | `alias-parenthesized`、`alias-typeof-query`、`alias-reference`、`alias-primitive` | 1–2 |

例：`alias-array`（`type A = string[]`）里 `ArrayType` 期望 16、实际 `never`，
`StringKeyword` 期望 15、实际 `never`；`alias-mapped-remap` 22 个节点里 17 个 `never`。

**判定：实现缺口（时序）。** 最终 AST 是对的（gate 全绿），但逐字树上类型内容整块要到 EOF 才出现，
"类型层增量建树"这件事没有真正发生。

#### B. 类型节点等到收口/提交点才建 —— 11 个用例（其中 8 个只有这一类问题）

这 11 个用例共有 26 个叶子的 `actual` 晚于记号自身的收口格（`src` 的 end）：

| 机制 | 例（expected → actual） |
| --- | --- |
| 尖括号里等到配平 `>` | `alias-generic-nested-tight-close`：`Array`/`T` 的 Identifier 都在 32（`>`）才出现 |
| 条件类型的被检类型等到 `extends` | `alias-conditional-infer`：`T` 的 TypeReference 14 → 21、Identifier 13 → 21 |
| 函数类型参数等到 `=>` | `alias-asserts`：参数 `x` 11 → 23；`alias-fn-type`：参数 `a` 11 → 22 |
| `infer` 等到 `>` | `alias-conditional-infer`：InferType 33 → 35 |
| `infer` 的模板头等到反引号 | `alias-template-infer`：TemplateHead 26 → 34 |
| `TypeParameter` 取 `<`（prompt 规则 4） | 11 行：`alias-conditional-infer` 6 → 8、`alias-generic-tight-close` 7 → 8 |

这些节点自身的 kind 在记号收口时其实已经确定，所以从"最早确定"的角度看可以更早建；
代价是后面可能需要把它们重新挂到 `ConditionalType` / `FunctionType` 下。
尖括号那一类还受 `<` 与小于号的歧义限制，属于已知的设计取舍（配平后才收口）。

`TypeParameter` 这一条是**规格与实现互相矛盾**：`dsh-case-infer` 的 prompt 规则 4 说"由列表转换
出来的节点取列表那一格（`<`）"，而 `type-alias-declaration-shape.xl.md` 的注释说"表自己按 `>`
收口成 TypeParameter"。两边必须先定一个，否则这 11 行永远是缺口。

#### C. 实现偏早 —— 5 个节点

`>=` / `<=` / `===` / `!==` 在第一个字符（`>` / `<` / `=` / `!`）就已经是完整记号，
模板尾部反引号早一格：

```text
bin-ge    GreaterThanEqualsToken       expected 11  actual 10  (10 是 `>`)
bin-le    LessThanEqualsToken          expected 11  actual 10
bin-seq-eq EqualsEqualsEqualsToken     expected 12  actual 11
bin-sne   ExclamationEqualsEqualsToken expected 12  actual 11
alias-template-infer LastTemplateToken expected 35  actual 34
```

**判定：实现缺口（反方向）。** 只有 5 个节点，但它说明"最早确定"在实现里也不是单调偏晚，
值得在修类型层时一起看。

#### D. 看似 `late`、其实是模型错 —— 10 个用例

这些用例的 late 全部来自容器被模型判在首字符/单记号内部，不是实现晚：

```text
bin-sub                FirstStatement          expected 0   actual 5
asi-newline            ExpressionStatement     expected 0/2 actual 1/3
let-binding            VariableDeclarationList expected 4   actual 5
bin-pow-trivia         FirstStatement          expected 4   actual 5
asi-expr-then-debugger ExpressionStatement     expected 0   actual 1
```

**判定：模型口径偏差**，不计入实现缺口。

## 4. 无法生成的 14 个用例

| 用例 | 失败原因（两次都一样） |
| --- | --- |
| `controls/let-mul-add` | 重复节点 `BinaryExpression|7|8` |
| `expressions/bin-add-add` | 同上 |
| `expressions/bin-bitwise-trivia` | 同上 |
| `expressions/bin-complex-trivia` | 重复节点 `BinaryExpression|7|14` |
| `expressions/bin-equality-trivia` | 重复节点 `BinaryExpression|7|8` |
| `expressions/bin-logical-trivia` | 重复节点 `BinaryExpression|7|8` |
| `expressions/bin-mul-add-bare` | 重复节点 `BinaryExpression|0|0` |
| `expressions/bin-mul-add-trivia-newlines` | 重复节点 `BinaryExpression|7|8` |
| `expressions/bin-mul-add` | 重复节点 `BinaryExpression|7|8` |
| `expressions/bin-mul-mul` | 重复节点 `BinaryExpression|7|8` |
| `expressions/bin-precedence-climb` | 重复节点 `BinaryExpression|12|13` |
| `expressions/bin-shift-trivia` | 重复节点 `BinaryExpression|7|8` |
| `expressions/bin-sub-trivia-assoc` | 重复节点 `BinaryExpression|7|8` |
| `statements/if-logical-condition` | 重复节点 `BinaryExpression|4|4` |

根因不是模型：节点身份是 `kind|pos|src 起点`（`end` 会随形状生长，不参与身份），而左结合的嵌套
二元表达式外层和内层起点相同。例如 `let x = 1 << 2 >> 3`：

```text
BinaryExpression  pos=7  src=[8,19)   ← 外层
   BinaryExpression  pos=7  src=[8,14)   ← 内层，身份同样是 BinaryExpression|7|8
```

模型按要求把两行都列出来，`parseNumbers` 看到同身份第二行就按"重复节点"拒绝。就算手写也没用：
`parseInfer` 用 Map 按身份存注记，两行会合并成一条，两个节点只能共用一个期望值。
所以这 14 例在当前身份方案下**没有可表达的 `.infer`**，不是重试能解决的。

建议：节点身份加 `depth`（或仅在本工具内用 `depth` 消歧）；否则只能把这些用例拆成单运算符。

## 5. 建议

1. **先定口径，再重生成。** 当前 125 个用例是模型口径偏差。把规则写死成两条：
   叶子取记号收口格（`src` 的 `end`）、容器取"kind 已确定"的提交格，并用 `let x = 1`
   的示例固化；然后只重生成模型口径的用例（`overwrite: true`）。
2. **处理 `TypeParameter` 的规则 4。** 要么把规则改成"列表收口（`>`）那一格"，
   要么把实现改成在 `<` 就建 TypeParameter；现在两边各说一套。
3. **节点身份加 `depth`。** 解决 14 个无法生成的用例，也让 viewer / `--check` 能区分
   嵌套的同类节点。
4. **类型层增量建树。** 优先 type literal / mapped / tuple / array：在 `}` / `]` / `)` / `>`
   收口时就建节点，而不是等 `SignOut`。这是 34 个用例、169 个 `never` 的主因。
5. **`.infer` 的定位。** 在口径统一前只作为诊断输入，不进 `npm run tts:cases` 门禁；
   现在 46.6% 的一致率主要量的是模型口径，不是实现质量。

## 复跑

```bash
# 单例：期望 vs 实际（只读，退出码 1 表示有差异）
node typescript/tools/case-infer.mjs --check typescript/cases/tts/success/types/alias-array.ts

# 生成（DSH 工具；已有文件要加 overwrite: true）
# case_infer { case: "success/types/alias-array" }

# 成功集门禁（与 .infer 无关，确认实现最终树仍全绿）
npm run tts:cases
```

## 附录 A：42 个带实现侧信号的用例

| 用例 | 节点 | ok | late | early | never | 判定 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `types/alias-array` | 5 | 2 | 0 | 1 | 2 | EOF 才建 |
| `types/alias-asserts` | 11 | 5 | 4 | 2 | 0 | 收口后才建 |
| `types/alias-conditional-branch-generic` | 18 | 2 | 16 | 0 | 0 | 收口后才建 |
| `types/alias-conditional-infer` | 16 | 10 | 6 | 0 | 0 | 收口后才建 |
| `types/alias-conditional-qualified` | 18 | 8 | 7 | 3 | 0 | 收口后才建 |
| `types/alias-conditional` | 11 | 7 | 2 | 2 | 0 | 收口后才建 |
| `types/alias-ctor-type-abstract` | 7 | 2 | 0 | 1 | 4 | EOF 才建 |
| `types/alias-fn-type-generic` | 12 | 2 | 0 | 1 | 9 | EOF 才建 |
| `types/alias-fn-type` | 8 | 2 | 3 | 2 | 1 | EOF 建 + 收口后建 |
| `types/alias-generic-args` | 6 | 2 | 0 | 1 | 3 | EOF 才建 |
| `types/alias-generic-default` | 9 | 3 | 2 | 1 | 3 | EOF 建 + 收口后建 |
| `types/alias-generic-nested-tight-close` | 13 | 3 | 7 | 1 | 2 | EOF 建 + 收口后建 |
| `types/alias-generic-tight-close` | 6 | 2 | 2 | 1 | 1 | EOF 才建 |
| `types/alias-import-type` | 7 | 2 | 0 | 1 | 4 | EOF 才建 |
| `types/alias-indexed-access` | 8 | 2 | 0 | 1 | 5 | EOF 才建 |
| `types/alias-indexed-generic` | 8 | 2 | 0 | 1 | 5 | EOF 才建 |
| `types/alias-infer-constraint` | 17 | 6 | 8 | 3 | 0 | 收口后才建 |
| `types/alias-intersection` | 8 | 2 | 0 | 1 | 5 | EOF 才建 |
| `types/alias-keyof` | 6 | 2 | 0 | 1 | 3 | EOF 才建 |
| `types/alias-literal-string` | 5 | 2 | 0 | 1 | 2 | EOF 才建 |
| `types/alias-mapped-modifiers` | 18 | 3 | 1 | 1 | 13 | EOF 才建 |
| `types/alias-mapped-remap` | 22 | 4 | 0 | 1 | 17 | EOF 才建 |
| `types/alias-mapped` | 16 | 5 | 0 | 0 | 11 | EOF 才建 |
| `types/alias-object-call-construct` | 15 | 2 | 0 | 1 | 12 | EOF 才建 |
| `types/alias-object-index-readonly` | 10 | 2 | 0 | 1 | 7 | EOF 才建 |
| `types/alias-object-method` | 10 | 2 | 0 | 1 | 7 | EOF 才建 |
| `types/alias-object-optional-readonly` | 9 | 1 | 0 | 2 | 6 | EOF 才建 |
| `types/alias-object` | 7 | 2 | 0 | 1 | 4 | EOF 才建 |
| `types/alias-parenthesized` | 5 | 2 | 0 | 1 | 2 | EOF 才建 |
| `types/alias-predicate` | 10 | 3 | 5 | 2 | 0 | 收口后才建 |
| `types/alias-primitive` | 4 | 2 | 0 | 1 | 1 | EOF 才建 |
| `types/alias-readonly-array` | 6 | 2 | 0 | 1 | 3 | EOF 才建 |
| `types/alias-recursive` | 11 | 2 | 0 | 1 | 8 | EOF 才建 |
| `types/alias-reference` | 5 | 2 | 0 | 1 | 2 | EOF 才建 |
| `types/alias-template-infer` | 18 | 5 | 8 | 5 | 0 | 收口后才建 |
| `types/alias-template-literal` | 8 | 2 | 0 | 1 | 5 | EOF 才建 |
| `types/alias-tuple-named` | 10 | 2 | 0 | 1 | 7 | EOF 才建 |
| `types/alias-tuple-optional` | 6 | 2 | 0 | 1 | 3 | EOF 才建 |
| `types/alias-tuple-rest` | 7 | 2 | 0 | 1 | 4 | EOF 才建 |
| `types/alias-tuple` | 6 | 2 | 0 | 1 | 3 | EOF 才建 |
| `types/alias-typeof-query` | 5 | 2 | 0 | 1 | 2 | EOF 才建 |
| `types/alias-union` | 6 | 2 | 0 | 1 | 3 | EOF 才建 |

## 附录 B：167 个用例的对拍读数

`late` / `early` 含容器与叶子；`never` 是逐字过程里从未出现的节点数。

| 用例 | 节点 | ok | late | early | never | 判定 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `controls/let-binding-only` | 5 | 5 | 0 | 0 | 0 | 模型口径 |
| `controls/let-number` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `declarations/let-add` | 9 | 7 | 0 | 2 | 0 | 模型口径 |
| `declarations/let-binding` | 5 | 4 | 1 | 0 | 0 | 模型口径 |
| `declarations/let-exponent-init` | 9 | 5 | 0 | 4 | 0 | 模型口径 |
| `declarations/let-semicolon-binding` | 5 | 5 | 0 | 0 | 0 | 模型口径 |
| `declarations/let-semicolon-number` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `declarations/let-subtract-init` | 9 | 4 | 4 | 1 | 0 | 模型口径 |
| `expressions/bin-add-mul-decl` | 12 | 5 | 1 | 6 | 0 | 模型口径 |
| `expressions/bin-add-mul` | 9 | 6 | 0 | 3 | 0 | 模型口径 |
| `expressions/bin-add-trivia-block-comments` | 9 | 5 | 0 | 4 | 0 | 模型口径 |
| `expressions/bin-add-trivia-leading-trailing` | 9 | 1 | 4 | 4 | 0 | 模型口径 |
| `expressions/bin-add-trivia-line-comment` | 9 | 1 | 4 | 4 | 0 | 模型口径 |
| `expressions/bin-add-trivia-spaces` | 9 | 5 | 0 | 4 | 0 | 模型口径 |
| `expressions/bin-add-trivia-tabs` | 9 | 5 | 0 | 4 | 0 | 模型口径 |
| `expressions/bin-add` | 9 | 6 | 0 | 3 | 0 | 模型口径 |
| `expressions/bin-and` | 9 | 4 | 1 | 4 | 0 | 模型口径 |
| `expressions/bin-bitand` | 9 | 3 | 3 | 3 | 0 | 模型口径 |
| `expressions/bin-bitor` | 9 | 5 | 0 | 4 | 0 | 模型口径 |
| `expressions/bin-bitxor` | 9 | 5 | 0 | 4 | 0 | 模型口径 |
| `expressions/bin-compare-trivia` | 9 | 8 | 1 | 0 | 0 | 模型口径 |
| `expressions/bin-eq` | 9 | 5 | 0 | 4 | 0 | 模型口径 |
| `expressions/bin-exp` | 9 | 6 | 0 | 3 | 0 | 模型口径 |
| `expressions/bin-ge` | 9 | 3 | 0 | 6 | 0 | 模型口径 |
| `expressions/bin-gt` | 9 | 5 | 0 | 4 | 0 | 模型口径 |
| `expressions/bin-le` | 9 | 4 | 0 | 5 | 0 | 模型口径 |
| `expressions/bin-lt` | 9 | 5 | 0 | 4 | 0 | 模型口径 |
| `expressions/bin-mixed-trivia` | 12 | 7 | 0 | 5 | 0 | 模型口径 |
| `expressions/bin-mod` | 9 | 3 | 5 | 1 | 0 | 模型口径 |
| `expressions/bin-mul` | 9 | 6 | 0 | 3 | 0 | 模型口径 |
| `expressions/bin-ne` | 9 | 3 | 3 | 3 | 0 | 模型口径 |
| `expressions/bin-nullish-trivia` | 9 | 4 | 1 | 4 | 0 | 模型口径 |
| `expressions/bin-nullish` | 9 | 7 | 0 | 2 | 0 | 模型口径 |
| `expressions/bin-or` | 9 | 5 | 0 | 4 | 0 | 模型口径 |
| `expressions/bin-pow-chain-trivia` | 15 | 9 | 0 | 6 | 0 | 模型口径 |
| `expressions/bin-pow-trivia` | 12 | 8 | 3 | 1 | 0 | 模型口径 |
| `expressions/bin-seq-eq` | 9 | 4 | 0 | 5 | 0 | 模型口径 |
| `expressions/bin-shl` | 9 | 3 | 2 | 4 | 0 | 模型口径 |
| `expressions/bin-shr` | 9 | 5 | 0 | 4 | 0 | 模型口径 |
| `expressions/bin-sne` | 9 | 4 | 0 | 5 | 0 | 模型口径 |
| `expressions/bin-sub` | 9 | 6 | 3 | 0 | 0 | 模型口径 |
| `expressions/bin-ushr` | 9 | 5 | 0 | 4 | 0 | 模型口径 |
| `expressions/num-bin` | 6 | 1 | 2 | 3 | 0 | 模型口径 |
| `expressions/num-dec` | 6 | 6 | 0 | 0 | 0 | 模型口径 |
| `expressions/num-exp` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `expressions/num-hex` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `expressions/num-oct` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `expressions/num-separator` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `lexical/comment-block-after-init` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `lexical/comment-block-after-operator` | 9 | 5 | 0 | 4 | 0 | 模型口径 |
| `lexical/comment-block-around-operator` | 9 | 5 | 0 | 4 | 0 | 模型口径 |
| `lexical/comment-block-equals-init` | 6 | 2 | 0 | 4 | 0 | 模型口径 |
| `lexical/comment-block-let-binding` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `lexical/comment-line-after-let` | 6 | 4 | 0 | 2 | 0 | 模型口径 |
| `lexical/crlf-let` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `lexical/ident-chinese-binding` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `lexical/ident-dollar-binding` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `lexical/ident-escape-binding` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `lexical/ident-underscore-binding` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `lexical/ident-unicode-binding` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `lexical/let-init-binary` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `lexical/let-init-exponent` | 6 | 2 | 1 | 3 | 0 | 模型口径 |
| `lexical/let-init-hex` | 6 | 6 | 0 | 0 | 0 | 模型口径 |
| `lexical/let-init-leading-dot` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `lexical/let-init-lt` | 9 | 5 | 0 | 4 | 0 | 模型口径 |
| `lexical/let-init-octal` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `lexical/let-init-semicolon` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `lexical/let-init-separator` | 6 | 2 | 1 | 3 | 0 | 模型口径 |
| `lexical/let-init-shift` | 9 | 5 | 0 | 4 | 0 | 模型口径 |
| `lexical/trailing-space-let` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `statements/asi-expr-then-debugger` | 4 | 1 | 2 | 1 | 0 | 模型口径 |
| `statements/asi-expr-then-let` | 8 | 6 | 2 | 0 | 0 | 模型口径 |
| `statements/asi-newline` | 5 | 1 | 4 | 0 | 0 | 模型口径 |
| `statements/asi-same-line` | 5 | 5 | 0 | 0 | 0 | 模型口径 |
| `statements/asi-three-expressions` | 7 | 7 | 0 | 0 | 0 | 模型口径 |
| `statements/asi-two-declarations` | 8 | 2 | 3 | 3 | 0 | 模型口径 |
| `statements/asi-two-variables` | 11 | 5 | 0 | 6 | 0 | 模型口径 |
| `statements/block-empty` | 2 | 1 | 0 | 1 | 0 | 模型口径 |
| `statements/break` | 5 | 3 | 0 | 2 | 0 | 模型口径 |
| `statements/continue` | 5 | 2 | 0 | 3 | 0 | 模型口径 |
| `statements/debugger` | 2 | 1 | 0 | 1 | 0 | 模型口径 |
| `statements/do-while` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `statements/empty-statement` | 2 | 1 | 0 | 1 | 0 | 模型口径 |
| `statements/expr-assign` | 6 | 4 | 0 | 2 | 0 | 模型口径 |
| `statements/expr-binary-arithmetic` | 6 | 4 | 0 | 2 | 0 | 模型口径 |
| `statements/expr-binary-bitwise` | 6 | 4 | 0 | 2 | 0 | 模型口径 |
| `statements/expr-binary-comparison` | 6 | 3 | 1 | 2 | 0 | 模型口径 |
| `statements/expr-binary-logical` | 6 | 4 | 0 | 2 | 0 | 模型口径 |
| `statements/for-classic` | 13 | 7 | 0 | 6 | 0 | 模型口径 |
| `statements/for-empty-clauses` | 3 | 1 | 0 | 2 | 0 | 模型口径 |
| `statements/for-head-let-atomic` | 13 | 7 | 0 | 6 | 0 | 模型口径 |
| `statements/for-in` | 5 | 3 | 0 | 2 | 0 | 模型口径 |
| `statements/for-of-const` | 7 | 3 | 0 | 4 | 0 | 模型口径 |
| `statements/for-of` | 5 | 3 | 0 | 2 | 0 | 模型口径 |
| `statements/if-bare-body` | 5 | 2 | 2 | 1 | 0 | 模型口径 |
| `statements/if-binary-body` | 8 | 4 | 0 | 4 | 0 | 模型口径 |
| `statements/if-binary-condition` | 8 | 5 | 1 | 2 | 0 | 模型口径 |
| `statements/if-block-let-semicolon` | 9 | 5 | 0 | 4 | 0 | 模型口径 |
| `statements/if-block-nested-else` | 12 | 6 | 0 | 6 | 0 | 模型口径 |
| `statements/if-else-block` | 9 | 4 | 0 | 5 | 0 | 模型口径 |
| `statements/if-else-if-chain` | 11 | 8 | 0 | 3 | 0 | 模型口径 |
| `statements/if-else-if-nested-then` | 13 | 7 | 0 | 6 | 0 | 模型口径 |
| `statements/if-nested-dangling-else` | 9 | 5 | 0 | 4 | 0 | 模型口径 |
| `statements/if-nested-deep-else` | 13 | 7 | 0 | 6 | 0 | 模型口径 |
| `statements/if-nested-else-if` | 13 | 7 | 0 | 6 | 0 | 模型口径 |
| `statements/if-nested-then-next-statement` | 9 | 7 | 0 | 2 | 0 | 模型口径 |
| `statements/if-nested-then-only` | 7 | 4 | 0 | 3 | 0 | 模型口径 |
| `statements/if-no-block` | 5 | 3 | 1 | 1 | 0 | 模型口径 |
| `statements/if-no-space` | 5 | 4 | 0 | 1 | 0 | 模型口径 |
| `statements/if-precedence-condition` | 11 | 5 | 0 | 6 | 0 | 模型口径 |
| `statements/if-right-assoc-condition` | 11 | 6 | 2 | 3 | 0 | 模型口径 |
| `statements/if-then-next-statement` | 7 | 6 | 0 | 1 | 0 | 模型口径 |
| `statements/let-continuation-identifier` | 9 | 2 | 3 | 4 | 0 | 模型口径 |
| `statements/let-continuation-number` | 9 | 5 | 0 | 4 | 0 | 模型口径 |
| `statements/let-identifier-init` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `statements/let-newline-before-init` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `statements/let-number-statement` | 6 | 3 | 0 | 3 | 0 | 模型口径 |
| `statements/switch-case-let-atomic` | 11 | 5 | 0 | 6 | 0 | 模型口径 |
| `statements/switch-fallthrough` | 14 | 6 | 0 | 8 | 0 | 模型口径 |
| `statements/switch-single-case` | 7 | 5 | 0 | 2 | 0 | 模型口径 |
| `statements/try-catch-nobind` | 9 | 4 | 0 | 5 | 0 | 模型口径 |
| `statements/try-catch` | 11 | 5 | 0 | 6 | 0 | 模型口径 |
| `statements/try-finally` | 8 | 5 | 2 | 1 | 0 | 模型口径 |
| `statements/while-block` | 6 | 4 | 0 | 2 | 0 | 模型口径 |
| `statements/while-no-block` | 5 | 3 | 0 | 2 | 0 | 模型口径 |
| `types/alias-array` | 5 | 2 | 0 | 1 | 2 | 实现缺口 |
| `types/alias-asserts` | 11 | 5 | 4 | 2 | 0 | 实现缺口 |
| `types/alias-conditional-branch-generic` | 18 | 2 | 16 | 0 | 0 | 实现缺口 |
| `types/alias-conditional-infer` | 16 | 10 | 6 | 0 | 0 | 实现缺口 |
| `types/alias-conditional-qualified` | 18 | 8 | 7 | 3 | 0 | 实现缺口 |
| `types/alias-conditional` | 11 | 7 | 2 | 2 | 0 | 实现缺口 |
| `types/alias-ctor-type-abstract` | 7 | 2 | 0 | 1 | 4 | 实现缺口 |
| `types/alias-fn-type-generic` | 12 | 2 | 0 | 1 | 9 | 实现缺口 |
| `types/alias-fn-type` | 8 | 2 | 3 | 2 | 1 | 实现缺口 |
| `types/alias-generic-args` | 6 | 2 | 0 | 1 | 3 | 实现缺口 |
| `types/alias-generic-default` | 9 | 3 | 2 | 1 | 3 | 实现缺口 |
| `types/alias-generic-nested-tight-close` | 13 | 3 | 7 | 1 | 2 | 实现缺口 |
| `types/alias-generic-tight-close` | 6 | 2 | 2 | 1 | 1 | 实现缺口 |
| `types/alias-import-type` | 7 | 2 | 0 | 1 | 4 | 实现缺口 |
| `types/alias-indexed-access` | 8 | 2 | 0 | 1 | 5 | 实现缺口 |
| `types/alias-indexed-generic` | 8 | 2 | 0 | 1 | 5 | 实现缺口 |
| `types/alias-infer-constraint` | 17 | 6 | 8 | 3 | 0 | 实现缺口 |
| `types/alias-intersection` | 8 | 2 | 0 | 1 | 5 | 实现缺口 |
| `types/alias-keyof` | 6 | 2 | 0 | 1 | 3 | 实现缺口 |
| `types/alias-literal-string` | 5 | 2 | 0 | 1 | 2 | 实现缺口 |
| `types/alias-mapped-modifiers` | 18 | 3 | 1 | 1 | 13 | 实现缺口 |
| `types/alias-mapped-remap` | 22 | 4 | 0 | 1 | 17 | 实现缺口 |
| `types/alias-mapped` | 16 | 5 | 0 | 0 | 11 | 实现缺口 |
| `types/alias-object-call-construct` | 15 | 2 | 0 | 1 | 12 | 实现缺口 |
| `types/alias-object-index-readonly` | 10 | 2 | 0 | 1 | 7 | 实现缺口 |
| `types/alias-object-method` | 10 | 2 | 0 | 1 | 7 | 实现缺口 |
| `types/alias-object-optional-readonly` | 9 | 1 | 0 | 2 | 6 | 实现缺口 |
| `types/alias-object` | 7 | 2 | 0 | 1 | 4 | 实现缺口 |
| `types/alias-parenthesized` | 5 | 2 | 0 | 1 | 2 | 实现缺口 |
| `types/alias-predicate` | 10 | 3 | 5 | 2 | 0 | 实现缺口 |
| `types/alias-primitive` | 4 | 2 | 0 | 1 | 1 | 实现缺口 |
| `types/alias-readonly-array` | 6 | 2 | 0 | 1 | 3 | 实现缺口 |
| `types/alias-recursive` | 11 | 2 | 0 | 1 | 8 | 实现缺口 |
| `types/alias-reference` | 5 | 2 | 0 | 1 | 2 | 实现缺口 |
| `types/alias-template-infer` | 18 | 5 | 8 | 5 | 0 | 实现缺口 |
| `types/alias-template-literal` | 8 | 2 | 0 | 1 | 5 | 实现缺口 |
| `types/alias-tuple-named` | 10 | 2 | 0 | 1 | 7 | 实现缺口 |
| `types/alias-tuple-optional` | 6 | 2 | 0 | 1 | 3 | 实现缺口 |
| `types/alias-tuple-rest` | 7 | 2 | 0 | 1 | 4 | 实现缺口 |
| `types/alias-tuple` | 6 | 2 | 0 | 1 | 3 | 实现缺口 |
| `types/alias-typeof-query` | 5 | 2 | 0 | 1 | 2 | 实现缺口 |
| `types/alias-union` | 6 | 2 | 0 | 1 | 3 | 实现缺口 |
