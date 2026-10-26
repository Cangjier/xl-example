# types 区 —— 类型语法的增量形状覆盖

分区：`cases/<class>/types/*.ts`（class = throw / atomic / partial / incremental）。
判定：`node typescript/cases/tts/run.mjs --filter types`；口径见 [`../README.md`](../README.md)。

**结论（当前实现）：类型语法在本区没有 `incremental` case，只有 `throw` / `atomic` / `partial` 三档。**

```
80 条 case：throw 18 / atomic 54 / partial 8 / incremental 0        （--filter types 全 PASS，退出码 0）
```

- `throw` = 变量声明/初始化器路由显式拒绝（C10「全有或全无」）；
- `atomic` = 整个类型产生式在 EOF 一次性建树（开关对时序无影响）；
- `partial` = 只长出 `VariableStatement/List/Declaration` 骨架 + 绑定名 `IdentifierShape`，`as`/`satisfies` 断言体仍原子；
- `incremental` = 无。类型语法要真正增量，前提是变量初始化器路由能把类型一路长出来，目前不可达；
  正向对照仍在 `incremental/controls/`（`let x = 2*3+1`、`let x`）。

复算证据：

```text
node typescript/cases/tts/run.mjs --filter types                 # 80 / 80 PASS
node typescript/cases/tts/run.mjs --show atomic/types/alias-mapped
node build/ts/cjcli.js typescript/cases/tts/cases/atomic/types/alias-mapped.ts
```

## 1. 覆盖清单（构造 → 分类 → case）

### 1.1 类型标注（变量/参数/返回/字段/可选/readonly）—— 变量声明一律 throw

| 构造 | 最小 case | 分类 | throw 文案 |
| --- | --- | --- | --- |
| `let x: T`（无初始化器） | `throw/types/let-annotation-no-init.ts` | throw | `declaration 符号 :` |
| `const x: T = <非数字>` | `throw/types/const-annotation-init.ts` | throw | `declaration 符号 :` |
| `var x: readonly T[]` | `throw/types/var-readonly-array-annotation.ts` | throw | `declaration 符号 :` |
| `let { a }: T = obj` | `throw/types/destructure-object-annotation.ts` | throw | `declaration 解构绑定` |
| `let [a]: T = xs` | `throw/types/destructure-array-annotation.ts` | throw | `declaration 解构绑定` |
| 参数注解 `function f(a: T): U` | `atomic/types/function-param-return.ts` | atomic | — |
| 返回注解 + 类型谓词 `x is T` | `atomic/types/function-predicate.ts` | atomic | — |
| `this` 参数 `function f(this: C, a: T)` | `atomic/types/function-this-param.ts` | atomic | — |
| 属性注解 `class C { p: T }` / `static readonly` | `atomic/types/class-property-readonly.ts` | atomic | — |
| 明确赋值断言字段 `p!: T` | `atomic/types/class-property-definite.ts` | atomic | — |
| 构造器参数属性 `constructor(readonly a: T)` | `atomic/types/class-ctor-param-property.ts` | atomic | — |
| 对象字面量类型 `{ readonly a?: T }` | `atomic/types/alias-object-optional-readonly.ts` | atomic | — |
| catch 参数注解 `catch (e: unknown)` | `atomic/types/catch-clause-annotation.ts` | atomic | — |
| for 头声明注解 `for (let i: number = 0; ...)` | `atomic/types/for-init-annotation.ts` | atomic | — |

要点：注解内容不影响分类——变量声明在 `:`（或解构 `{`/`[`）处就拒绝，类型还没开始解析。
所以类型产生式的多样性全部放在 type alias 里覆盖（见 1.2），annotation 位置只保留“位置”维度。
`for` 头里的 `let i: number` 是 atomic 而不是 throw：`for` 初始化区的声明不走增量声明路由。

### 1.2 类型引用 / 泛型 / 类型操作符（type alias 声明 → 全部 atomic）

| 构造 | case |
| --- | --- |
| 原语类型 | `alias-primitive.ts` |
| 类型引用 `Foo` | `alias-reference.ts` |
| 泛型实参 `Array<string>` | `alias-generic-args.ts` |
| 泛型默认参数 `type A<T = string> = T[]` | `alias-generic-default.ts` |
| union / intersection | `alias-union.ts` / `alias-intersection.ts` |
| 括号类型 | `alias-parenthesized.ts` |
| 数组 / readonly 数组 | `alias-array.ts` / `alias-readonly-array.ts` |
| `typeof x` 类型查询 | `alias-typeof-query.ts` |
| `keyof T` 类型操作符 | `alias-keyof.ts` |
| 索引访问 `T["k"]` / `T[K]` | `alias-indexed-access.ts` / `alias-indexed-generic.ts` |
| 递归 alias | `alias-recursive.ts` |
| 字面量类型 `"a"` | `alias-literal-string.ts` |
| import 类型 `import("m").T` | `alias-import-type.ts` |
| `import { type T, U } from "m"` | `atomic/types/import-inline-type.ts` |
| `declare const sym: unique symbol` | `atomic/types/declare-unique-symbol.ts` |
| `interface` / 多 extends | `interface-basic.ts` / `interface-extends-multi.ts` |
| `class C implements A, B` | `class-implements-multi.ts` |
| `enum E { A = "a" }` | `enum-string.ts` |
| `as` / `satisfies` 表达式语句 | `as-expression-statement.ts` / `satisfies-expression-statement.ts` |

### 1.3 函数/构造器类型、条件类型、映射类型、tuple、对象类型字面量（全部 atomic）

| 构造 | case |
| --- | --- |
| 函数类型 `(a: T) => U` | `alias-fn-type.ts` |
| 泛型函数类型 `<T>(a: T) => T` | `alias-fn-type-generic.ts` |
| 构造器类型 `abstract new () => T` | `alias-ctor-type-abstract.ts` |
| 类型谓词返回 `=> x is T` | `alias-predicate.ts` |
| `asserts` 断言 `=> asserts x is T` | `alias-asserts.ts` |
| 条件类型 `T extends U ? X : Y` | `alias-conditional.ts` |
| 条件类型 + `infer` | `alias-conditional-infer.ts` |
| `infer` 约束 `infer U extends string` | `alias-infer-constraint.ts` |
| 模板字面量类型 `` `a${T}b` `` | `alias-template-literal.ts` |
| 模板字面量 + infer | `alias-template-infer.ts` |
| 映射类型 `{ [K in keyof T]: T[K] }` | `alias-mapped.ts` |
| 映射类型 `+readonly` / `+?` 修饰 | `alias-mapped-modifiers.ts` |
| 映射类型 `as` 键重映射 | `alias-mapped-remap.ts` |
| tuple / 可选元素 / rest / named | `alias-tuple.ts` / `alias-tuple-optional.ts` / `alias-tuple-rest.ts` / `alias-tuple-named.ts` |
| 对象类型 / 索引签名 / 方法签名 | `alias-object.ts` / `alias-object-index-readonly.ts` / `alias-object-method.ts` |
| 调用 + 构造签名混合 | `alias-object-call-construct.ts` |

### 1.4 初始化器位置里的类型语法（`as` / `satisfies` / 断言）—— partial 或 throw

| 构造 | case | 分类 |
| --- | --- | --- |
| `const x = y as string` | `partial/types/as-primitive-type.ts` | partial |
| `const x = y as const` | `partial/types/as-const-assertion.ts` | partial |
| `const x = y as unknown as T`（断言链） | `partial/types/as-chain-type.ts` | partial |
| `const x = y as keyof typeof z`（类型操作符） | `partial/types/as-keyof-typeof.ts` | partial |
| `const x = y as \`a${string}b\``（模板字面量类型） | `partial/types/as-template-literal-type.ts` | partial |
| `const x = y as "a"`（字面量类型） | `partial/types/as-literal-string-type.ts` | partial |
| `const x = y satisfies T` | `partial/types/satisfies-type.ts` | partial |
| `const x = y satisfies T as U` | `partial/types/satisfies-then-as.ts` | partial |
| `const x = y as A \| B` | `throw/types/as-union-type.ts` | throw `declaration 符号 \|` |
| `const x = y as A & B` | `throw/types/as-intersection-type.ts` | throw `declaration 符号 &` |
| `const x = y as ns.T` | `throw/types/as-qualified-type.ts` | throw `declaration 符号 .` |
| `const x = y as T[]` | `throw/types/as-array-type.ts` | throw `declaration 括号` |
| `const x = y satisfies { a: number }` | `throw/types/satisfies-object-type.ts` | throw `declaration 括号` |
| `const x = (y as T)` | `throw/types/paren-as-init.ts` | throw `declaration 括号` |
| `const x = y!` | `throw/types/nonnull-assertion.ts` | throw `declaration 符号 !` |
| `<T>y` 尖括号断言 | `throw/types/angle-assertion.ts` | throw `expression 运算符 <` |
| `const f = <T>(a: T) => a` | `throw/types/generic-arrow-typed-param.ts` | throw `expression 运算符 <` |
| `const x = f<string>()`（调用类型实参） | `throw/types/generic-call-type-args.ts` | throw `declaration 括号` |
| `const f = (a: T) => a` | `throw/types/arrow-typed-param.ts` | throw `declaration 括号` |
| `const f = async (a: T) => a` | `throw/types/arrow-async-typed-param.ts` | throw `declaration 括号` |
| `const f = function (a: T) {}` | `throw/types/function-expression-typed-param.ts` | throw `declaration 括号` |

要点：`const x = <init>` 的增量声明路径只容忍 `标识符 / as / satisfies / 字面量 / 关键字` 组成的链；
一遇到 `(` `{` `[` `|` `&` `.` `!` `<` 就抛（分别报 `括号` / `符号 X` / `运算符 <`）。
因此“同一形态带不带括号/管道”就是 partial 与 throw 的分界（`as string` vs `as T[]`）。

## 2. throw 文案样本（`增量变量形状未支持：…`）

```text
declaration 符号 :        let x: number / const x: string = getValue() / var r: readonly string[]
declaration 解构绑定      let { a }: T = obj / let [a]: T = xs
declaration 括号          const f = (a: number) => a / const x = f<string>() / const x = y as T[] / (y as T)
declaration 符号 |        const x = y as string | number
declaration 符号 &        const x = y as A & B
declaration 符号 .        const x = y as ns.T
declaration 符号 !        const x = y!
expression 运算符 <       const x = <T>y / const f = <T>(a: T) => a
```

throw 的 case 里 `cjcli` 也会直接失败（同为增量路径）：

```text
$ node build/ts/cjcli.js typescript/cases/tts/cases/throw/types/let-annotation-no-init.ts
cjcli: 解析失败：throw by line 0 ---> ...
line 1: let x: number
line 1:      ^^
```

## 3. 逐字符证据（两类代表形态）

atomic —— `alias-mapped.ts`（`type A<T> = { [K in keyof T]: T[K] }`）：char 0..36 每一步只有
`SourceFileShape` + basic token（`Common` / `Symbol` / `WrapSymbol`），**一个 shape 节点都没有**；
`TypeAliasDeclarationShape` / `MappedTypeShape` / `TypeParameterShape` / `IndexedAccessTypeShape`
全部在 `## [EOF]` 一次性出现（开关置 false/true 逐字符树逐字节相同 → atomic）。

partial —— `as-primitive-type.ts`（`const x = y as string`）：

```text
## [char 7] " "     → VariableStatementShape@0 / VariableDeclarationListShape@0
                      / VariableDeclarationShape@5 / IdentifierShape@5   ← 骨架当场长出来
## [char 8..21]     → 初始化器只剩 basic token（Common "y"、"as"、"string"）
## [EOF]            → 才出现 AsExpressionShape@9 / StringKeywordShape@14
```

骨架提前、标的（`AsExpressionShape`）不提前 ⇒ `partial`。

## 4. 观察与坑（需要 Lead 知道的）

1. **尾随换行会改分类（必须遵守 case 规范）。** `const x = y!` 带 `\n` 时增量路径在收口时拒绝
   （`declaration 符号 !` → throw）；同一份源码**去掉**尾随换行却是 partial（`!` 落到 EOF 兜底，
   EOF 树里长出 `NonNullExpressionShape`）。所以尾随换行不是形式主义：`partial` 与 `throw`
   的分界靠它。“EOF 兜底”这一档无法作为 case 收录（规范要求换行结尾），只在此记录。
2. **注解内容不参与判定。** `let x: number`、`let x: T[]`、`let x: { a: T }`、`let x: (a: T) => U`
   的 throw 步号与文案完全相同（都在 `:` 处，steps=7）。因此 annotation 位置只保留 3 个变量声明
   case + 解构 2 个；类型产生式覆盖改用 type alias 声明（1.2/1.3）。
3. **`for` 头 / `catch` 参数 / `declare` 变量声明都不走增量声明路由。**
   `for (let i: number = 0; i < 3; i++) {}`、`try {} catch (e: unknown) {}`、
   `declare let x: number`、`declare const sym: unique symbol` 实测 atomic；
   与顶层 `let x: number`（throw）形成对照。`declare` 探针还在，但只收了 unique symbol 一例。
4. **类型别名/接口/类/枚举/import 全部 atomic**，且不依赖类型内容的复杂度（嵌套、映射、条件、
   infer、模板字面量都一样）。这符合“增量形状只挂变量声明路径”的实现边界。
5. **本区 0 divergent、0 invalid。** 过程中出现过 invalid，但都是探针文件的转义事故（PowerShell 把
   模板字面量的反引号吃掉，写出非法 TS），不是产品问题；随后改用 here-string 重写。runner 现在强制
   TS 语法合法，这类文件会直接 FAIL（`TS 语法不合法`）。
6. **同一产生式、已探针但为控数量未单列的形态**（实测分类与已收 case 相同）：
   `let x: number, y: string`（throw 符号 :）、`type A = typeof import("m")`（atomic）、
   `type A<in T, out U> = (x: T) => U`（atomic，变型注解）、`type A = -1` / `1n`（atomic，字面量）、
   `type A = Map<string, number>`（atomic，多泛型实参）、`interface I { m(a: string): void; m(a: number): void }`
   （atomic，方法重载）、`class C { [k: string]: number }`（atomic，类索引签名）、
   `declare function f(a: string): void`（atomic）、`import type { T } from "m"`（atomic）、
   `function f<T extends string = "a">(a: T): T { return a }`（atomic，泛型约束+默认）、
   `const x = y as readonly string[]`（throw 括号）、`const x = y as unknown as T`（partial，断言链已收）、
   `type A<T> = { [K in "a" | "b"]: string }`（atomic，联合键映射）。
7. `INDEX.md` 未重写（不在本分区职责内，`--write-index` 会覆盖别人的行）；由 Lead 统一生成。

## 5. 分类计数

| 分类 | 条数 | 文件名 |
| --- | --- | --- |
| throw | 18 | 见 §1.1、§1.4（`throw/types/`） |
| atomic | 54 | 见 §1.2、§1.3（`atomic/types/`） |
| partial | 8 | 见 §1.4（`partial/types/`） |
| incremental | 0 | —（本区无正向 case，见开头结论） |

case 规范自查（80/80）：合法 TS、以 `\n` 结尾、无注释、无 BOM、单构造、≤2 行。
