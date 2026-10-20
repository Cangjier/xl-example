# members / bindings / literals 覆盖报告（chunk 1）

分支 `cover-members-1`，基线 `feature/quick-parse @3116ef85`。
本块只动三处：`typescript/tokens/members/**`、`typescript/tokens/bindings/**`、`typescript/cases/{members,bindings,literals}.ts`；
`expression-builder.xl.md`（expressions 家族）与 `tokens/types/**`（types 家族）一行没动。

## 读数

| 指标 | 基线 | 本块之后 |
| --- | --- | --- |
| ast-json 全量 | 782 / 782 | **928 / 928**（9 个构造） |
| members.ts | — | 76 / 76 完全一致 |
| literals.ts | — | 70 / 70 完全一致 |
| bindings.ts | — | 0 条（等 statements 家族，见下） |
| tsc | 0 error | 0 error |
| xl_check（members + bindings） | — | 0 error |

增量 = 76（members）+ 70（literals）；bindings 是注释目标，不增计数。

## members：已测量（绿色）

借表达式语句测量对象字面量成员（`({ ... });`、`f({ ... })`、`x = { ... }` 都行，避开语句首 `{` 的块歧义）。
`property-assignment-shape.xl.md` 补了 `FromParts(name, value, context)`（区间 = 名字起点到值终点），
`ParseObjectLiteral` 现有的 `Add(name) / Add(value) / SpanNode` 与它同口径，所以**不用改 builder 就全绿**。

已覆盖：标识符名与关键字名（IdentifierName）、值覆盖字面量 / 一元 / 属性 / 元素 / 调用 / 括号 / 二元 / 三元 / 赋值 /
数组与对象嵌套；空字面量、2~4 条重复形、行尾逗号；trivia（前导、名词后、冒号后、值后、逗号前后、行内 `\n`、多行）；
其它出现位置（括号内、逗号表达式、调用实参、后缀链起点、行尾注释）。

## members：已实现但未解锁（等 expressions 家族改 ParseObjectLiteral）

`tokens/members/` 里三个 shape 都已按 TS 的 children / pos / end 填好并给了静态工厂：

| shape | TS 子节点顺序 | 工厂 |
| --- | --- | --- |
| PropertyAssignmentShape | Name, Initializer | `FromParts(name, value, context)` |
| ShorthandPropertyAssignmentShape | Name, Initializer?（`{ a = 1 }`） | `FromParts(name, initializer, context)` |
| SpreadAssignmentShape | Expression（`...` 不进 Data，但区间从 `...` 起） | `FromExpression(dotDotDot, expression, context)` |

**需要 expressions 成员配合（本块不能改 `expression-builder.xl.md`）**，`ParseObjectLiteral` 目前是
「ParseName → 必须 `:` → ParseAssign」，所以在下面这些形态上直接抛错（`对象字面量缺少冒号` / `缺少标识符`）：

1. 分派缺失：`({ a })`、`({ a, b })` 应在 ParseName 之后**看不到 `:`** 时走 `ShorthandPropertyAssignmentShape.FromParts(name, null)`；
   看到 `=` 时走 `FromParts(name, id, …)`（`{ a = 1 }`，注意它不是 PropertyAssignment）。
2. `...` 前缀：`({ ...a })` 应在 ParseName 之前认 `...`（`Symbol` 三个点或 punctuation 家族的 DotDotDotToken），
   再 ParseAssign，走 `SpreadAssignmentShape.FromExpression`。
3. 名字不是 `ParseName` 的三种：
   - `({ m() {} })`：名字后跟 `(` → MethodDeclaration（**需要 types 家族的 MethodDeclarationShape**，Body 还要 statements 的 BlockShape）；
   - `({ get a() {} })` / `({ set a(v) {} })`：`get`/`set` 后跟名字再跟 `(` → Get/SetAccessorDeclarationShape（types 家族）；
   - `({ [a]: 1 })`：`[` 开头 → ComputedPropertyNameShape（types 家族）。
4. 字面量名：`({ "s": 1 })` 抛 `缺少标识符`；`({ 1: 2 })` 更糟——ParseName 把数字收成 `IdentifierShape`，
   结构差是 `NumericLiteral -1 / Identifier +1`。需要 ParseName 认 String / Numeric / 关键字字面量名
   （TS 的 PropertyName 是 IdentifierName | StringLiteral | NumericLiteral | ComputedPropertyName）。
5. `$` 名字：`({ $a: 1 })`、`({ a$b: 1 })` 失败——`Common` basic token 不收 `$`，属**用户决策项**（basic token 只能由用户发起修改）。

members 的 possible-shape 三页仍是占位：**成员解析走的是 builder 循环，不是候选表**，所以它们没有派发点，
实现出来只能是永不调用的死代码；建议随 ParseObjectLiteral 迁到候选架构时再落，或直接删。

## bindings：已测量（cover-bindings-1 接手，见 docs/coverage-bindings.md）

> **状态更新（cover-bindings-1）**：`binding-element-shape` 已改成直接建 AST 子节点
> （Identifier / 嵌套 pattern / 默认值 / DotDotDot），`Elements` 固定留空让 statements 的
> `NormalizeBindingPattern` workaround 成为 no-op（statements 一行未改，91/91 仍绿）；
> `bindings.ts` 已从 0 条涨到 39 条全绿（含空位 OmittedExpression、嵌套、默认值、rest、for-of、trivia）。
> 下表是 chunk 1 交付时的原始状态，正文口径以 `docs/coverage-bindings.md` 为准。

| 文件 | 内容 |
| --- | --- |
| `binding-element-shape.xl.md` | `FromTokens(tokens, context, pos)`：解析 `...`? 名字 (`:` 名字)? (`=` 值)?，child 顺序 DotDotDot → PropertyName → Name → Initializer，字段名用 `BindingName`（避开 AST 投影里 `name` 字段） |
| `array-binding-pattern-shape.xl.md` | `FromBracket(bracket, context)`：按 `,` 切元素建 BindingElementShape，`[`/`]` 只进区间 |
| `object-binding-pattern-shape.xl.md` | 同上，`{`/`}` |
| `*-possible-shape.xl.md` ×3 | 候选项：到 tokenIndex 为止最后一个非 trivia 单元是 `[` / `{` 括号 → Accept 并由 BuildByIndex 就地替换；扫描进度记进 PossibleShapeCache（IMPORTANCE 3.4） |

**给 cover-statements-1 的接口**：变量声明 / for-of 拿到 `[...]`、`{...}` 括号单元后调
`ArrayBindingPatternShape.FromBracket(bracket, context)` / `ObjectBindingPatternShape.FromBracket(...)`，
再把形状放到 declarator 的 Name 位置并维护 `Pos`（括号前一个非 trivia 单元 `End+1`）即可；
`FromTokens` 的入参是「逗号之间的非 trivia 单元」，trivia 会被跳过。

**未做**：`[a, , b]` 的空位（OmittedExpressionShape 属 expressions 家族）；`{ [k]: a }` 的 computed name（types 家族）；
rest 元素里的嵌套 pattern 作为名字（`...{a}`）暂按「名字单元」处理。测不了的目标逐条列在 `bindings.ts` 注释里。

## literals：已测量（绿色）

`string.ts` / `number.ts` / `regex.ts` 已把字面量在**语句首**的写法全部覆盖（75+70+256 条），不重复造。
本块补的是「同一个字面量出现在**非语句首**的语句可解析位置」：赋值右值、调用实参、数组字面量元素、
对象字面量属性值——覆盖数字（进制 / 分隔符 / 指数 / 前导点 / 尾点 / 超长）、bigint、字符串（含空串、转义）、
模板（含空模板）、正则（含 flags），以及这些位置的 trivia。70 条全绿。

暂缓：jsx-text / jsx-text-all-white-spaces 在 .ts 口径里没有对应节点，无从测量；
语句首字面量归三张既有用例集；八进制 / 非法 `\x` / 非法 `\u` 转义 ts 会报诊断，string.ts 已明确只收无诊断写法。

## 下一块建议

1. expressions 成员按上面 1–4 改 `ParseObjectLiteral` 后，members.ts 直接取消注释即可转绿（shape 已就绪）；
   顺序建议：shorthand → spread → 字面量名（这三个不依赖别的家族），method / accessor / computed 等 types 家族就绪后再接。
2. statements 成员接变量声明时优先用 bindings 的三页（`FromBracket` + `FromTokens`），一次能带出 array/object pattern 的绿色用例。
3. `$` 名字是 basic token 缺口，需要用户决策（与 `string.ts` 的 `\u` / `\x` 同类）。

## chunk 2（cover-obj-members-1，从 origin/integration @22e87cfe）：method / accessor / computed / generator 成员

只改 `expression-builder.xl.md`（+ 新增 `class-expressions.ts`），未改 members 家族 shape、未改 declarations / statements。

- `ParseObjectLiteral` 的成员分派扩成：`async`? / `get` / `set` / `*` 前缀 → 名字（标识符 / 字面量 / `[computed]`）→ 若是 `(` 则按
  `MethodDeclaration` / `GetAccessor` / `SetAccessor` 建（参数用 `ClassDeclarationShape.BuildParameters`、返回类型用
  `TypeBuilder`、函数体用 `StatementBuilder`，children 顺序 = 修饰符→`*`→名字→参数们→返回类型→Block）；否则仍走
  PropertyAssignment / Shorthand / SpreadAssignment。
- get/set 的判定带前瞻：`({ get: 1 })` / `({ get() {} })` 不会被误判成 accessor；`async` 同理。
- 新增 `ParseComputedPropertyName`：`[expr]` → `ComputedPropertyName`（children 只有表达式）。
- `ParseClassExpression` 改为完整类表达式：名字? → `extends` 的 `HeritageClause`（`HeritageClauseShape.BuildClauses`）→
  成员（`ClassDeclarationShape.BuildMembers`），全部是**消费** declarations 的静态助手、不编辑它；
  `class` 后是 `extends` 时不当名字处理。
- 新增 `class-expressions.ts`（17 条）：空体 / 名字 / 属性 / 方法 / constructor / 计算名 / extends / trivia。

读数：members 141/141（base 10 新增 17 条）、class-expressions 17/17；全量 2495/2495，结构/位置/字段差 0。
暂缓：decorators、static block、private `#x`（class extras 分支）、heritage 里放 class 表达式。

## chunk 3（cover-obj-methods-2）：async / generator / async generator 方法 + optional private access

只改 `expression-builder.xl.md` 的对象字面量成员分派 + 追加 `members.ts` / `expression.ts`；未碰 class-declaration / statements / core。

### 实现落点

- `ParseObjectLiteral` 的 async 判定原本只认「后随名字 / `[computed]`」；新增 `asyncFollowedByGenerator`：
  当 `async` 后面紧跟 `*` 时也算方法修饰，这样 `({ async *m() {} })` / `({ async *m() { yield 1; } })` 能进
  MethodDeclaration 分支（children = `AsyncKeyword` → `AsteriskToken` → 名字 → 参数 → 返回类型 → Block）。
- `({ *[k]() {} })` / `({ async [k]() {} })` / `({ async *[k]() {} })` 由既有的 `*` / computed 分支直接覆盖。
- 回归：`({ async m() {} })`、`({ *m() {} })`、`({ async m(a: A): B {...} })`、get/set 组合均已绿。

### optional private access：oracle 判非法

`this?.#x` 与 `obj?.#x` 在 `ts.createSourceFile` 下**直接报诊断**（`?.#` 不是合法语法），
因此不进 AST 对拍语料；`expression.ts` 末尾以注释目标记录了原因。private 成员访问由 base 35 的
`this.#x` / `this.#m()` / `static C.#x` 覆盖。

### 读数

```
members            153 / 153      # base 11 新增 12 条（async generator / 带参返回类型 / computed 组合 / 混合 / trivia）
expression         584 / 584      # 不变（optional private access 非法，只留注释目标）
class-expressions   17 / 17       # 不变
全量              3156 / 3156     # 3144 + 12；结构差 0 / 位置差 0 / 字段差 0
```

### 暂缓

- object literal parameter properties / decorators（非法或属 decorator 家族）；
- `this?.#x` / `obj?.#x`：TS 语法直接拒（parse diagnostics），不收入语料。