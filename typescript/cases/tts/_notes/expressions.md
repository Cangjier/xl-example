# expressions 区 — 表达式 / 初始化器位置的增量形状覆盖

本区只回答一个问题：**在变量初始化器（以及需要上下文时放进合法函数体/类体）位置，哪些表达式形态还不支持增量形状？**
每条 case 都是一行 `let x = <被测表达式>`（或带必要包装的一行），目录名即 `run.mjs` 的期望分类。

- 路径：`cases/<class>/expressions/<name>.ts`，`class ∈ throw | atomic | partial | incremental`
- 写法约定：**一行构造、无注释、无分号、以裸换行结尾**（分号本身会触发 `declaration 符号 ;`，见 §4.3）
- 判定口径以当前 `run.mjs` 为准：identity 用 `(类名, pos)`、EOF 树比较忽略 `src` 区间、**TS 语法必须合法**（有 parse diagnostic 即 FAIL）
- 本区未改动 `run.mjs` / `README.md` / `INDEX.md` / `controls` / 其他 area

## 1. 分类计数

| 分类 | 条数 | 含义 |
| --- | ---: | --- |
| `throw` | 66 | 增量路径显式拒绝：`增量变量形状未支持：…`，legacy 正常 |
| `partial` | 23 | 只有变量声明骨架（`VariableStatement/List/Declaration` + 绑定名）逐字符长，初始化器仍原子建树 |
| `incremental` | 11 | 允许形态的边界对照（`+` / `*` 链、数字字面量），不是缺口 |
| `atomic` | 0 | 本区没有（原因见 §4.5） |
| **合计** | **100** | 其中「不支持形态」= throw 66 + partial 23 = **89** |

> `incremental` 11 条按 Lead 约束控制在 ~10（`+`/`*` 与 4 种允许组合 + 6 种数字字面量），其余全部是不支持形态的账本。

## 2. 覆盖清单（构造 → 分类）

### 2.1 二元运算符矩阵（初始化器位置）

| 运算符 | case | 分类 |
| --- | --- | --- |
| `+` | `bin-add` | incremental |
| `-` | `bin-sub` | throw（`expression 运算符 -`） |
| `*` | `bin-mul` | incremental |
| `/` | `bin-div`（`a/b`） | partial；**数值左操作数时 divergent，见 §4.1** |
| `%` | `bin-mod` | throw（`expression 运算符 %`） |
| `**` | `bin-exp` | throw（`expression 运算符 **`） |
| `<` `>` | `bin-lt` `bin-gt` | throw（`expression 运算符 <` / `>`） |
| `<=` `>=` | `bin-le` `bin-ge` | throw（`declaration 符号 <=` / `>=`） |
| `==` `!=` | `bin-eq` `bin-ne` | throw（`declaration 符号 ==` / `!=`） |
| `===` `!==` | `bin-seq-eq` `bin-sne` | throw（`declaration 符号 ===` / `!==`） |
| `&&` `\|\|` `??` | `bin-and` `bin-or` `bin-nullish` | throw（`declaration 符号 &&` / `\|\|` / `??`） |
| `&` `\|` `^` | `bin-bitand` `bin-bitor` `bin-bitxor` | throw（`declaration 符号 &` / `\|` / `^`） |
| `<<` `>>` `>>>` | `bin-shl` `bin-shr` `bin-ushr` | throw（`declaration 符号 <<` / `>>` / `>>>`） |
| `in` | `bin-in` | partial |
| `instanceof` | `bin-instanceof` | partial |

允许形态的边界（对照）：

| 形态 | case | 分类 |
| --- | --- | --- |
| `2*3+1` | `bin-mul-add` | incremental |
| `2+3+4` | `bin-add-add` | incremental |
| `2*3*4` | `bin-mul-mul` | incremental |
| `2*3+4` | （已验证 incremental，未落盘：与 `2*3+1` 同形，留作控制组计数） | incremental |
| `1+2*3` | `bin-add-mul` | throw（`expression 新运算符结合更紧（优先级 14）`） |
| `(1+2)*3` | `bin-paren-mul` | throw（`declaration 括号`） |
| `2**3` | `bin-exp` | throw（`expression 运算符 **`） |

### 2.2 一元 / 更新

| 形态 | case | 分类 |
| --- | --- | --- |
| `+x` `-x` `!x` `~x` | `unary-plus` `unary-minus` `unary-not` `unary-bnot` | throw（`+` 是 `expression 左操作数不是形状`，其余 `expression 运算符 …` / `declaration 符号 !` / `~`） |
| `typeof x` `void x` | `unary-typeof` `unary-void` | partial |
| `delete x` | `unary-delete` | throw（`declaration 符号 .`，case 用 `delete o.p`） |
| `++x` `x++` `--x` `x--` | `update-pre-inc` `update-post-inc` `update-pre-dec` `update-post-dec` | throw（`declaration 符号 ++` / `--`） |
| `!!x` | `unary-chain-not` | throw（`declaration 符号 !`） |

### 2.3 三元 / 赋值 / 逗号 / 括号 / 断言

| 形态 | case | 分类 |
| --- | --- | --- |
| `a ? b : c` | `ternary` | throw（`declaration 符号 ?`） |
| `y = 1`（赋值表达式） | `assignment` | partial |
| `(a, b)`（逗号表达式） | `comma-expr` | throw（`declaration 括号`） |
| `((1))`（嵌套括号） | `paren-nested` | throw（`declaration 括号`；`(1+2)*3` 见 `bin-paren-mul`） |
| `<number>y`（尖括号断言） | `angle-assert` | throw（`expression 运算符 <`） |
| `y as number` | `as-expr` | partial |
| `y satisfies number` | `satisfies-expr` | partial |
| `[1] as const` | `as-const` | throw（`declaration 括号`） |
| `(1, 2, 3)`（序列） | `seq-three` | throw（`declaration 括号`） |

### 2.4 字面量初始化器

| 形态 | case | 分类 |
| --- | --- | --- |
| 十进制 `42` | `num-dec` | incremental |
| hex `0xff` / oct `0o17` / bin `0b1010` / 指数 `1e3` / 分隔符 `1_000` | `num-hex` `num-oct` `num-bin` `num-exp` `num-separator` | incremental |
| 小数 `0.5` / 前导点 `.5` | （已验证 incremental，未落盘，与数字同族） | incremental |
| bigint `1n`（及 `1_000n`） | `lit-bigint` | partial |
| 字符串 `'a'` / `"a"` / `'a\nb'` | `lit-string-single` `lit-string-double` `lit-string-escape` | partial |
| 模板 `` `a` `` / 插值 `` `a${b}c` `` / tagged `` tag`a` `` | `lit-template` `lit-template-sub` `lit-tagged` | partial |
| regex `/a/g` | `lit-regex` | partial |
| `true` / `false` / `null` / `undefined` | `lit-true` `lit-false` `lit-null` `lit-undefined` | partial |

### 2.5 引用形态

| 形态 | case | 分类 |
| --- | --- | --- |
| 标识符 `y` | `ref-ident` | partial |
| 成员 `a.b` | `ref-member` | throw（`declaration 符号 .`） |
| 索引 `a[0]` | `ref-index` | throw（`declaration 括号`） |
| 可选链 `a?.b`（及 `a?.()`、`a?.b()`） | `ref-optional` | throw（`declaration 符号 ?.`） |
| 非空 `a!` | `ref-nonnull` | throw（`declaration 符号 !`） |
| 调用 `f()` | `ref-call` | throw（`declaration 括号`） |
| `new C()` | `ref-new` | throw（`declaration 括号`） |
| `new C`（无实参括号） | `ref-new-no-parens` | **partial**（细粒度边界：有无 `()` 改变分类） |
| `this` | `ref-this` | partial |
| `super.m` | `ref-super` | throw（`declaration 符号 .`，类方法体内） |
| `import.meta` | `ref-import-meta` | throw（`declaration 符号 .`） |
| `new.target` | `ref-new-target` | throw（`declaration 符号 .`，函数体内） |

### 2.6 复合字面量

| 形态 | case | 分类 |
| --- | --- | --- |
| 对象 `{ a: 1 }` | `obj-literal` | throw（`declaration 括号`） |
| 数组 `[1, 2]` | `arr-literal` | throw（`declaration 括号`） |
| 数组 spread `[...a]` | `spread-array` | throw（`declaration 括号`） |
| 对象 spread `{ ...a }` | `spread-object` | throw（`declaration 括号`） |
| 方法简写 `{ m() {} }` | `method-shorthand` | throw（`declaration 括号`） |
| getter `{ get a() {…} }` | `getter` | throw（`declaration 括号`） |
| setter `{ set a(v) {} }` | `setter` | throw（`declaration 括号`） |
| computed key `{ [k]: 1 }` | `computed-key` | throw（`declaration 括号`） |

### 2.7 函数 / 类表达式

| 形态 | case | 分类 |
| --- | --- | --- |
| 单参箭头 `y => y` | `arrow-single` | throw（`declaration 符号 =>`） |
| 多参箭头 `(a, b) => a` | `arrow-multi` | throw（`declaration 括号`） |
| 默认值 `(a = 1) => a` | `arrow-default` | throw（`declaration 括号`） |
| rest `(...a) => a` | `arrow-rest` | throw（`declaration 括号`） |
| 解构参数 `({ a }) => a` | `arrow-destructure` | throw（`declaration 括号`） |
| async 箭头 `async () => 1` | `arrow-async` | throw（`declaration 括号`） |
| 块体 / 表达式体 | `arrow-block`（块体；表达式体见 `arrow-single`） | throw |
| `function () {}` | `func-expr` | throw（`declaration 括号`） |
| `class {}` | `class-expr` | throw（`declaration 括号`） |

### 2.8 await / yield

| 形态 | case | 分类 |
| --- | --- | --- |
| `await p`（`async function` 内） | `await-expr` | throw（`declaration 符号 }`） |
| `yield 1`（`function*` 内） | `yield-expr` | throw（`declaration 符号 }`） |

## 3. throw 文案样本（66 条按报错原文分组）

| 报错原文（前缀 `增量变量形状未支持：`） | 条数 | 代表 case |
| --- | ---: | --- |
| `declaration 括号` | 24 | `obj-literal` `arr-literal` `ref-call` `ref-new` `func-expr` `class-expr` `arrow-multi` `as-const` `comma-expr` `seq-three` … |
| `declaration 符号 .` | 5 | `ref-member` `ref-super` `ref-import-meta` `ref-new-target` `unary-delete` |
| `declaration 符号 !` | 3 | `unary-not` `unary-chain-not` `ref-nonnull` |
| `declaration 符号 ++` / `--` | 2 + 2 | 四个 update case |
| `declaration 符号 }` | 2 | `await-expr` `yield-expr` |
| `declaration 符号 ;` | —（未落盘） | `let x = 1;` / `let x = 1+2;`，见 §4.3 |
| `declaration 符号 <=` `>=` `==` `!=` `===` `!==` `&&` `\|\|` `??` `&` `\|` `^` `<<` `>>` `>>>` `?` `?.` `~` `=>` `,` `:` | 各 1 | 对应 case（`, :` 未落盘，见 §4.3/§4.4） |
| `expression 运算符 -` | 2 | `bin-sub` `unary-minus` |
| `expression 运算符 <` | 2 | `bin-lt` `angle-assert` |
| `expression 运算符 %` `**` `>` | 各 1 | `bin-mod` `bin-exp` `bin-gt` |
| `expression 左操作数不是形状` | 1 | `unary-plus` |
| `expression 新运算符结合更紧（优先级 14）` | 1 | `bin-add-mul`（`2+3*4` 同文案，未落盘） |

## 4. divergent / invalid / 其他观察

### 4.1 数值左操作数的 `/` 是 divergent（不能落盘，需实现方处理）

`2/3`、`2 / 3`、`1/2`、`6/2`、`2/b`、`6/3/2`、`1/2+3`、`2*3/4` 全部判 **divergent**（不是 `throw`）：

- legacy EOF 树：`BinaryExpressionShape(pos=7)` + `NumericLiteralShape(2)` + `SlashTokenShape(pos=9)` + `NumericLiteralShape(3)`
- incremental EOF 树：只有 `NumericLiteralShape(pos=7)`（除法子树整段缺失），与 legacy 结构不同
- 边界：左操作数是标识符时正常——`a/b`、`a/2`、`a/b+c` 都是 **partial**，所以 `/` 由 `partial/bin-div.ts` 覆盖
- 结论：数值字面量作为 `/` 的左操作数时，增量路径静默丢掉除法子树（疑似 `/` 被当 regex 起始吞掉），这是**实现结构缺陷**而非「显式拒绝」；按 README 口径 divergent 属 case 异常，未收进 case，移交 Lead/实现方

### 4.2 src 区间差异不构成 divergent

34 条非 throw case（11 incremental + 23 partial）**全部** `rangeOnlyDifference = true`：EOF 的
`VariableStatementShape / List / Declaration` src 区间比 legacy 多吃尾随换行（README「实现缺陷」#2）。
当前判据已忽略 src，只比结构，不影响分类；本次全部 case `residualBasicLines = 0`。

### 4.3 分号会直接 throw（重要写法约束）

`let x = 1;`、`let x = 1+2;` 都是 `throw`，报 `declaration 符号 ;`——**即使 `+`/数字本身是支持的**。
所以本区 case 一律以**裸换行**收尾，不能带分号。该形态归属 declarations 区（变量声明终结符），本区仅记录。

### 4.4 类型标注与多声明（归 declarations 区，本区未收）

`let x: number = 1+2` → `declaration 符号 :`；`let x = 1, y = 2` → `declaration 符号 ,`。均 throw。

### 4.5 为什么本区 `atomic` = 0

初始化器位置（`let/const/var x = …`）一律进入增量变量声明路由，结果只可能是
`throw`（初始化器被拒）/ `partial`（骨架增量、初始化器原子）/ `incremental`（允许形态）；
不存在「开关对整棵树完全无影响」的初始化器 case。

`atomic` 只属于**外层不是被路由的变量声明**的包装形态，实测（**未收**，属 statements/declarations area）：

| 包装 | 实测分类 |
| --- | --- |
| `export const x = 1+2` | atomic |
| `class C { p = 1+2 }`（字段初始化器） | atomic |
| `for (let i = 1+2; i < 3; i++) {}` | atomic |
| `function f() { return 1+2 }` | atomic |
| 表达式语句 `a+b` | atomic |

### 4.6 invalid / TS 合法性

本次 100 条：无 `invalid`、无 TS parse diagnostic（旧版判据不检查 TS，合法 TS 由人工保证；
现版 run.mjs 会直接 FAIL 不合法者，已逐条通过）。

### 4.7 其他细粒度边界

- `new C()` throw（`declaration 括号`）vs `new C` partial：无实参括号即可让初始化器骨架化。
- `1+2*3` / `2+3*4` throw（结合更紧，优先级 14）；`2*3+1` / `2+3+4` / `2*3*4` incremental。
- `2 ** 3`（带空格）与 `2**3` 同为 throw。
- `typeof` / `void` / `in` / `instanceof` / `as` / `satisfies` / 赋值表达式是 **关键字/词法形态**，不触发符号拒绝 → partial。

## 5. 逐字符证据（`node build/ts/cjcli.js <case>`）

- **throw** `throw/expressions/bin-lt.ts`（`let x = 1<2`）：
  - char 8（`1`）：初始化器仍是 basic `Common`；
  - char 9（`<`）：初始化器还是裸 `Symbol "<"`，整棵表达式树尚未出现；
  - 处理 `2` 时显式抛 `增量变量形状未支持` —— 全有或全无的拒绝，不会静默产出错树。
- **partial** `partial/expressions/ref-ident.ts`（`let x = y`）：
  - char 4 起 `VariableStatementShape / VariableDeclarationListShape / VariableDeclarationShape / IdentifierShape(绑定名)` 逐步长出；
  - 初始化器 `y` 到 char 9 仍是 `Common`，直到 **EOF** 才变成 `IdentifierShape pos=7` —— 只有外层增量。
- **incremental** `incremental/expressions/bin-mul-add.ts`（`let x = 2*3+1`）：
  - char 10 出现 `BinaryExpressionShape` + `AsteriskTokenShape`，char 11 出现 `PlusTokenShape`，
  - char 12 出现新的外层 `BinaryExpressionShape` —— 表达式形状随字符逐步生长，与 legacy 逐字符树不同。

## 6. 复现

```powershell
node typescript/cases/tts/run.mjs --filter expressions          # 100 条，全 PASS
node typescript/cases/tts/run.mjs --show throw/expressions/bin-lt
node build/ts/cjcli.js typescript/cases/tts/cases/incremental/expressions/bin-mul-add.ts
```
