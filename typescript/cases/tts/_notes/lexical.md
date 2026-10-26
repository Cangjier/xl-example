# lexical 分区（词法 / trivia / 歧义）观察记录

本文件是 `typescript/cases/tts` 的 **lexical 分区**说明：枚举「词法单元、trivia、歧义」对增量形状的影响。
判定口径、目录约定与分类含义见 [README.md](../README.md)，判定器为 [run.mjs](../run.mjs)（只读，本次未改动）。

复算：

```powershell
node typescript/cases/tts/run.mjs --filter lexical     # 60 条，应全部 PASS
node typescript/cases/tts/run.mjs --show throw/lexical/let-init-object-literal
node build/ts/cjcli.js typescript/cases/tts/cases/incremental/lexical/comment-block-around-operator.ts
```

## 分类计数

| 分类 | 条数 | 本区含义 |
| --- | --- | --- |
| `throw` | 12 | 增量路径显式拒绝（C10）：声明已进增量通道，后续词法单元不被支持 |
| `atomic` | 14 | 开关对整棵树无影响；全部是表达式语句 / 控制流语句（不含变量声明骨架） |
| `partial` | 12 | 变量声明三层增量了，初始化器的字面量仍由 `ExpressionBuilder` 原子建树 |
| `incremental` | 22 | 纯 trivia 形态不构成缺口；真增量（正向对照） |
| 合计 | **60** | 全部 PASS，且全部通过 runner 的 TS 语法体检 |

## 覆盖清单（构造 → case → 分类）

### 1. 注释（块注释 = `AreaAnnotation`、行注释 = `LineAnnotation`、JSDoc 是块注释）

| 构造 | case | 分类 |
| --- | --- | --- |
| 块注释在 `let` 与绑定之间 | `incremental/lexical/comment-block-let-binding.ts` | incremental |
| 块注释在 `=` 与初始化器之间 | `incremental/lexical/comment-block-equals-init.ts` | incremental |
| 块注释在左操作数与运算符之间 | `incremental/lexical/comment-block-around-operator.ts` | incremental（残留 basic 行 +1） |
| 块注释在运算符与右操作数之间 | `throw/lexical/comment-block-after-operator.ts` | throw（`expression 右操作数`） |
| 块注释在语句尾部 | `incremental/lexical/comment-block-after-init.ts` | incremental |
| 行注释在 `let` 之后、绑定在下一行 | `incremental/lexical/comment-line-after-let.ts` | incremental |
| JSDoc 在整条声明之前 | `incremental/lexical/comment-jsdoc-before-let.ts` | incremental |
| 表达式语句里的块注释 | `atomic/lexical/expression-block-comment-between.ts` | atomic |

**边界结论：注释本身是 trivia、不打断增量；唯一跳变是「运算符右侧的注释」——`RightOperandPossibleShape` 在
注释后的右操作数上抛 `expression 右操作数`（C10），而运算符左侧的同一注释完全正常。**

### 2. shebang / BOM / 行尾 / 缩进 / 尾随空白

| 构造 | case | 分类 |
| --- | --- | --- |
| `#!/usr/bin/env node` 开头 | `incremental/lexical/shebang-let.ts` | incremental |
| UTF-8 BOM（`EF BB BF`）开头 | `incremental/lexical/bom-let.ts` | incremental |
| CRLF 行尾 | `incremental/lexical/crlf-let.ts` | incremental |
| tab 缩进 | `incremental/lexical/tab-indent-let.ts` | incremental |
| 尾随空白 | `incremental/lexical/trailing-space-let.ts` | incremental |

**边界结论：这些全部只是 trivia，属于「src 区间实现缺陷」而不是覆盖率缺口**——`rangeOnlyDifference=true`
（21/22 条 incremental、12/12 条 partial），`pos` 与类名在两遍里一致，所以判 incremental。
BOM 的 EOF 树 `VariableStatementShape src=[0,...)` 把 BOM 吞进区间，但 `pos` 不变。
本目录的 BOM 用例首字节刻意写成 `EF BB BF`、CRLF 用例刻意写成 `0d 0a`（见下方「写入注意」）。

### 3. 字符串（单/双引号、转义）

| 构造 | case | 分类 |
| --- | --- | --- |
| 单引号 | `partial/lexical/let-init-string-single.ts` | partial |
| 双引号 | `partial/lexical/let-init-string-double.ts` | partial |
| 转义序列 `"a\tb"` | `partial/lexical/let-init-string-escape.ts` | partial |

### 4. 模板字符串

| 构造 | case | 分类 |
| --- | --- | --- |
| 无内插 `` `s` `` | `partial/lexical/let-init-template-plain.ts` | partial |
| 有内插 `` `a${b}c` `` | `partial/lexical/let-init-template-subst.ts` | partial |
| 嵌套模板 `` `a${`b${c}`}d` `` | `partial/lexical/let-init-template-nested.ts` | partial |
| tagged `` tag`a` `` | `partial/lexical/let-init-template-tagged.ts` | partial |

**字符串 / 模板 / regex / 标识符初始化器的共同结论：声明三层照常增量，初始化器是「未接管的字面量 /
标识符基本单元」，EOF 时由 `ExpressionBuilder` 原子建树 ⇒ `partial`。** TS 没有原始字符串（raw string）语法，
该项不适用。

### 5. regex

| 构造 | case | 分类 |
| --- | --- | --- |
| flags `/ab/gimsuy` | `partial/lexical/let-init-regex-flags.ts` | partial |
| 转义斜杠 `/a\/b/` | `partial/lexical/let-init-regex-escaped-slash.ts` | partial |
| 字符类 `/[a-z\/]+/i` | `partial/lexical/let-init-regex-class.ts` | partial |

### 6. 数字

| 构造 | case | 分类 |
| --- | --- | --- |
| hex `0x1F` | `incremental/lexical/let-init-hex.ts` | incremental |
| binary `0b1010` | `incremental/lexical/let-init-binary.ts` | incremental |
| octal `0o17` | `incremental/lexical/let-init-octal.ts` | incremental |
| 指数 `1e10` | `incremental/lexical/let-init-exponent.ts` | incremental |
| 数字分隔符 `1_000` | `incremental/lexical/let-init-separator.ts` | incremental |
| 前导点 `.5` | `incremental/lexical/let-init-leading-dot.ts` | incremental |
| bigint `10n` | `partial/lexical/let-init-bigint.ts` | partial |
| 十进制基线 `let x = 1` | （`incremental/controls/let-number.ts`，非本区） | incremental |

- **bigint 是数字族里唯一的跳变**：`Common.IsNumber()` 不认 `10n`，`NumericLiteralShape` 不建 ⇒ 只剩骨架增量 ⇒ `partial`。
- `.5` / `1.` 都被词法器收成**单个数字 `Common`**（不是 `.` + 数字），因此走 numeric literal 增量路径 ⇒ incremental。
- **legacy octal `010` 被排除**：runner 现在强制 TS 语法合法，`010` 触发 TS `Octal literals are not allowed` ⇒ 该形态只能记在这里，不能收 case（实测 `invalid`）。
- 探针（未收 case）：`1e+10`、`1_0.5` 均 incremental；`let x = 1 >>> 2` 为 throw（`declaration 符号 >>>`）；`f<A<B<C>>>(1)`（`>>>` 泛型实参）为 atomic。

### 7. 标识符

| 构造 | case | 分类 |
| --- | --- | --- |
| `$` 开头绑定 `$x` | `incremental/lexical/ident-dollar-binding.ts` | incremental |
| `_` 开头绑定 `_x` | `incremental/lexical/ident-underscore-binding.ts` | incremental |
| 中文标识符 `变量` | `incremental/lexical/ident-chinese-binding.ts` | incremental |
| unicode 标识符 `café` | `incremental/lexical/ident-unicode-binding.ts` | incremental |
| 转义标识符 `\u0061` | `incremental/lexical/ident-escape-binding.ts` | incremental |
| 关键字作属性名 `obj.default`（初始化器） | `throw/lexical/let-init-member-keyword.ts` | throw（`declaration 符号 .`） |
| 关键字作属性名 `({ default: 1 })`（表达式语句） | `atomic/lexical/expression-object-in-paren.ts` | atomic |

探针（未收 case）：`let \u{61} = 1`（brace 形式转义标识符）同样 incremental。

### 8. ASI

| 构造 | case | 分类 |
| --- | --- | --- |
| 两条语句换行分隔（声明后接 `let`） | `throw/lexical/asi-two-declarations.ts` | throw（`declaration 初始化器未读完`） |
| 后缀 `++` 换行 | `throw/lexical/asi-postfix-newline.ts` | throw（`declaration 符号 ++`） |
| `return` ⏎ `1`（函数体） | `atomic/lexical/asi-return-newline.ts` | atomic |

**边界结论：增量声明不在换行处收口——`let x = "s"` 之后一旦还有下一条语句，下一条的首个单元就被当成
初始化器的一部分，于是显式抛错。** 探针（未收 case）：`foo()` ⏎ `let x = 1`（表达式语句在前、声明在后）为
incremental —— 换行在声明**之前**没有问题，问题只出在增量声明**之后**。

### 9. 歧义

| 构造 | case | 分类 |
| --- | --- | --- |
| `<` 比较链 `a < b > c` | `atomic/lexical/expression-angle-chain.ts` | atomic |
| 泛型实参调用 `f<Array<number>>(x)`（`>>` 拆分） | `atomic/lexical/expression-call-type-args.ts` | atomic |
| `f<A<B<C>>>(1)`（`>>>` 拆分） | `atomic/lexical/expression-shift-generic.ts` | atomic |
| 箭头 vs 括号 `(a) => a` | `atomic/lexical/expression-paren-arrow.ts` | atomic |
| 括号序列 `(a, b)` | `atomic/lexical/expression-paren-sequence.ts` | atomic |
| 括号内赋值 `(a = 1)` | `atomic/lexical/expression-paren-assign.ts` | atomic |
| `let` 作标识符 `let = 1` | `atomic/lexical/expression-let-identifier.ts` | atomic |
| 语句首对象（括号包裹）`({ default: 1 })` | `atomic/lexical/expression-object-in-paren.ts` | atomic |
| 语句首数组 `[1, 2]` | `atomic/lexical/expression-array-literal.ts` | atomic |
| async 箭头 `async () => a` | `atomic/lexical/expression-async-arrow.ts` | atomic |
| `new` 优先级 `new A()` | `atomic/lexical/expression-new-call.ts` | atomic |
| `?.` 与三元 `a?.b ? c : d` | `atomic/lexical/expression-optional-ternary.ts` | atomic |

这些形态全部是**表达式语句级别**的歧义，开关只作用于变量声明族，所以整棵树与 legacy 完全相同（atomic）。

### 10. 声明初始化器的词法单元边界（throw 补充）

| 构造 | case | 分类 |
| --- | --- | --- |
| 比较 `<` 初始化器 `let x = 1<2`（泛型 vs 比较同一条 `<`） | `throw/lexical/let-init-lt.ts` | throw |
| 右移 `>>` 初始化器 | `throw/lexical/let-init-shift.ts` | throw |
| 一元 `+` 初始化器 | `throw/lexical/let-init-unary-plus.ts` | throw |
| `;` 收口 | `throw/lexical/let-init-semicolon.ts` | throw |
| 多声明 `,` | `throw/lexical/let-init-multi-decl.ts` | throw |
| 类型注解 `:` | `throw/lexical/let-type-annotation.ts` | throw |
| 成员访问 `.` | `throw/lexical/let-init-member-keyword.ts` | throw |
| 前缀 `!` | `throw/lexical/let-init-bang.ts` | throw |
| 对象字面量初始化器（括号） | `throw/lexical/let-init-object-literal.ts` | throw |

## throw 文案样本（全部为 `增量变量形状未支持：…`）

| case | reason |
| --- | --- |
| `throw/lexical/let-init-lt.ts` | `增量变量形状未支持：expression 运算符 <` |
| `throw/lexical/let-init-shift.ts` | `增量变量形状未支持：declaration 符号 >>` |
| `throw/lexical/let-init-unary-plus.ts` | `增量变量形状未支持：expression 左操作数不是形状` |
| `throw/lexical/let-init-semicolon.ts` | `增量变量形状未支持：declaration 符号 ;` |
| `throw/lexical/let-init-multi-decl.ts` | `增量变量形状未支持：declaration 符号 ,` |
| `throw/lexical/let-type-annotation.ts` | `增量变量形状未支持：declaration 符号 :` |
| `throw/lexical/let-init-member-keyword.ts` | `增量变量形状未支持：declaration 符号 .` |
| `throw/lexical/let-init-bang.ts` | `增量变量形状未支持：declaration 符号 !` |
| `throw/lexical/let-init-object-literal.ts` | `增量变量形状未支持：declaration 括号` |
| `throw/lexical/comment-block-after-operator.ts` | `增量变量形状未支持：expression 右操作数` |
| `throw/lexical/asi-two-declarations.ts` | `增量变量形状未支持：declaration 初始化器未读完` |
| `throw/lexical/asi-postfix-newline.ts` | `增量变量形状未支持：declaration 符号 ++` |

## divergent / invalid / 残留 basic 等观察

1. **本区没有 divergent case**。分类器改用 `(类名, pos)` identity 之后，纯 trivia 形态不再因 src 区间被判
   divergent：21/22 条 incremental 与 12/12 条 partial 只是 `rangeOnlyDifference=true`（README 缺陷 #2：
   增量 src 区间吞前导/尾随 trivia），atomic 14 条没有区间差异。
2. **残留 basic 行只有 1 条**：`incremental/lexical/comment-block-around-operator.ts` 为 `+1`
   ——运算符左侧的 `AreaAnnotation` 留在 `BinaryExpressionShape` 的 `Data` 里（README 缺陷 #1 在 trivia 上的表现）。
3. **invalid 只出现在被排除的形态上**：legacy octal `let x = 010` 被 TS 判语法非法（runner 的 TS 体检会让
   任何 `tsValid=false` 的 case FAIL，即使分类相符），因此不进 case 目录，只在本文件记录。
4. **BOM 的复算差异要注意**：runner 与 `cjcli` 都不剥 BOM（BOM 是 basic/trivia token，`IsTriviaToken=true`），
   `cjcli` 会把首字符 dump 成 `Bom src=[0,1)`，与 runner 的 EOF 树一致；本用例可以放心收。
5. **写入注意**：BOM 用例必须写出真正的 `EF BB BF` 首字节（本次内容里带 U+FEFF，落盘后校验过）；
   CRLF 用例必须用能保留 `\r\n` 的写工具落盘（普通文本写工具会把 CRLF 归一成 LF，本次用
   `[System.IO.File]::WriteAllText` + `UTF8Encoding(false)` 重写并校验字节 `0d 0a`）。
   其余 case 全部以 LF 结尾，一个构造一个文件。

## 与 run.mjs 口径相关的备注（给 Lead）

- 目录第一层就是期望分类；`--filter lexical` 只匹配路径含 `lexical` 的 case（本区 60 条），不会误命中
  其它 area 的 case。
- 判定器当前 `pass = (actual === expected) && tsValid !== false`，因此 **TS 语法体检不合格会直接 FAIL**；
  legacy octal 这类「parser 能读但 TS 不合法」的形态只能进 notes。
- 分类按 `(类名, pos)` 与「形状首现步号」比较，EOF 树比较忽略 src 区间；trivia 形态因此在 incremental /
  partial 里，而不是 divergent —— 与 README「顺带发现的增量实现缺陷」两条一致，不阻塞覆盖判定。
