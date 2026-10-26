# declarations 分区笔记

> 分区：`declarations`（var/let/const、function、class、interface、enum、namespace/module、import/export、decorator 所在的声明族）。
> 只写 `cases/{throw,atomic,partial,incremental}/declarations/`；判定器与口径见 [README.md](../README.md)。

## 1. 计数与验收

| 分类 | 条数 |
| --- | --- |
| throw | 20 |
| atomic | 59 |
| partial | 7 |
| incremental | 4 |
| 合计 | **90** |

```powershell
node typescript/cases/tts/run.mjs --filter declarations
# 本区 90 条全部 PASS：throw 20 / atomic 59 / partial 7 / incremental 4
# 注意 --filter 是子串匹配，还会命中别的 area 里路径/文件名含 "declarations" 的 case
#   （如 throw/lexical/asi-two-declarations.ts），所以汇总条数会略大于 90，属正常。
```

- 90 条逐条实测 = 目录标注，全部 PASS，`tsValid` 全为 `true`，`residualBasicLines` 全为 0。
- 全部 case：LF、以换行结尾、无注释、一文件一个构造；throw/atomic 内没有嵌「`let x = 数字` / `let x = … * +`」这类可增量形态（也避免函数体/类体里的根级变量语句把分类带偏）。

## 2. 落地时发现的三个关键事实（建议 Lead 关注）

### 2.1 根级变量语句只要以 `;` 结尾就 throw —— 受支持的形态也一样

`let x = 1\n` 是 incremental，但 `let x = 1;\n` 是 **throw**：

```text
[node] cjcli 逐字符（let-semicolon-number.ts）
## [char 9] ";"
VariableDeclarationShape
├─ IdentifierShape  text="x"
├─ Symbol  text="="
├─ NumericLiteralShape  text="1"
└─ Symbol  text=";"          ← `;` 留在 declaration.Data 里
再吃换行收口 → 增量变量形状未支持：declaration 符号 ;
```

原因：增量路径在换行/EOF 才收口 `VariableDeclarationShape`，而 `FinishIncremental` 只接受「标识符 → `=` → 初始化器」，`;` 作为未消费 Symbol 触发 C10 显式拒绝。
**影响**：现有的 `incremental/controls/*` 全是无分号写法，所以既有验收没有覆盖「真实 TS 语句」的写法。实际支持面应表述为
「`let`/`const`/`var` + 单标识符 + 初始化器为数字或 `*`/`+` 二元表达式 + **语句不带 `;`**」。
本区用 `throw/declarations/let-semicolon-number.ts`、`let-semicolon-binding.ts` 把这个边界钉住。

### 2.2 只有「单 basic 单元、收口时能原子解析」的初始化器才落到 partial

- 无分号且初始化器是 `"s"` / `` `t` `` / `` `${y}` `` / `/r/` / 标识符 / `a < b`：外层骨架提前、初始化器原子建树 → **partial**。
- 其余初始化器全部 **throw**：`(` `[` `{`（括号/解构/数组/对象/箭头/调用）→ `declaration 括号`；`.` `,` `:` `!` `?` `&&` 等 Symbol → `declaration 符号 X`；`-` `**` 等运算符 → `expression 运算符 X`。
- 所以 partial 这一档几乎只有「字面量/标识符初始化器 + 无分号」，比 README 预期窄。

### 2.3 `export` / `declare` 前缀的变量声明不进增量路由（atomic），`const enum` 也不抛

- `export const x = 1;`、`export let x: number;`、`declare let/var/const x: number;` 实测 **atomic**（开关对时序无影响）：带前缀时变量语句不是根级裸语句，不触发 `IncrementalVariableStatementBuilder`。
- `const enum E { A }`、`export const enum E { A }`、`declare const enum E { A }` 实测 **atomic**，并没有走到 `statement const enum` 的 throw 分支。
- 因此「变量声明族」的 throw 只存在于**根级、无 export/declare 前缀**的裸 `let/const/var` 语句。

## 3. 覆盖清单（构造 → 分类）

### 3.1 var / let / const 矩阵
| 构造 | case | 分类 |
| --- | --- | --- |
| 单标识符 + 数字初始化器（无分号） | `incremental/declarations/const-number.ts` | incremental |
| 单标识符 + `+` 二元表达式（无分号） | `incremental/declarations/let-add.ts` | incremental |
| 无初始化器（无分号） | `incremental/declarations/let-binding.ts`、`var-binding.ts` | incremental |
| 数字/`+` 形态 + 分号 | `throw/declarations/let-semicolon-number.ts` | throw |
| 无初始化器 + 分号 | `throw/declarations/let-semicolon-binding.ts` | throw |
| `!` 确定赋值 | `let-definite-assignment.ts` | throw |
| 类型注解（有/无初始化器） | `let-type-annotation.ts`、`let-type-annotation-init.ts` | throw |
| 多声明（无/有初始化器、var） | `let-two-declarations.ts`、`var-two-initialized.ts` | throw |
| 对象解构（简写/默认值/嵌套） | `let-object-destructure{,-default,-nested}.ts` | throw |
| 数组解构（简写/rest） | `let-array-destructure{,-rest}.ts` | throw |
| 字符串初始化器（无分号） | `partial/declarations/let-string-init.ts`、`const-string-init.ts` | partial |
| 模板（无替换/带替换，无分号） | `partial/declarations/let-template-init.ts`、`let-template-substitution-init.ts` | partial |
| 正则 / 标识符（无分号） | `partial/declarations/let-regex-init.ts`、`let-identifier-init.ts` | partial |
| `a < b` 比较初始化器（无分号） | `partial/declarations/let-comparison-init.ts` | partial |
| 调用 / 括号 / 数组字面量 / 箭头 / 成员访问 / 三元 / `-` / `**` | `throw/declarations/let-{call,parenthesized,array,arrow,member,ternary,subtract,exponent}-init.ts` | throw |
| `const enum` | `atomic/declarations/const-enum.ts` | atomic |
| `declare let/var/const` | `atomic/declarations/declare-{let,var,const}.ts` | atomic |

### 3.2 function
| 构造 | case | 分类 |
| --- | --- | --- |
| 普通 / async / generator / async-generator | `atomic/declarations/function-{basic,async,generator,async-generator}.ts` | atomic |
| 参数默认值 / rest | `function-default-param.ts`、`function-rest-param.ts` | atomic |
| 返回类型 | `function-return-type.ts` | atomic |
| 重载签名（无实现） | `function-overload.ts` | atomic |
| `declare function` | `declare-function.ts` | atomic |
| 泛型 + `export default`（`export default function f<T>(a: T): T { return a; }`） | `function-generic-export-default.ts` | atomic |

### 3.3 class
| 构造 | case | 分类 |
| --- | --- | --- |
| 空类 | `atomic/declarations/class-empty.ts` | atomic |
| `extends` + `implements` | `class-extends-implements.ts` | atomic |
| 访问修饰符 + `static` + `readonly` 字段 | `class-field-modifiers.ts`（`private static readonly x = 1;`） | atomic |
| `abstract class` + abstract 方法 | `class-abstract.ts` | atomic |
| getter / setter | `class-getter.ts`、`class-setter.ts` | atomic |
| constructor 参数属性 | `class-constructor-param-property.ts` | atomic |
| 方法 | `class-method.ts` | atomic |
| static block | `class-static-block.ts` | atomic |
| decorator：class（**带参数 `@dec()`**）/ method / property / parameter | `class-decorator.ts`、`class-method-decorator.ts`、`class-property-decorator.ts`、`class-parameter-decorator.ts` | atomic |
| `declare class` | `declare-class.ts` | atomic |

### 3.4 interface
| 构造 | case | 分类 |
| --- | --- | --- |
| 多继承（`extends J, K`） | `atomic/declarations/interface-extends-several.ts` | atomic |
| 方法 / 属性 / 索引 / 调用 / 构造签名 | `interface-{method,property,index-signature,call-signature,construct-signature}.ts` | atomic |
| 泛型方法 | `interface-generic-method.ts` | atomic |
| `readonly` + 可选属性 | `interface-optional-readonly.ts` | atomic |

### 3.5 enum
| 构造 | case | 分类 |
| --- | --- | --- |
| 数字成员（含自增） | `atomic/declarations/enum-numeric.ts` | atomic |
| 字符串成员 | `enum-string.ts` | atomic |
| 计算成员（`1 << 2`） | `enum-computed.ts` | atomic |
| `const enum` | `const-enum.ts` | atomic |

### 3.6 namespace / module
| 构造 | case | 分类 |
| --- | --- | --- |
| 基本 / 嵌套 | `atomic/declarations/namespace-{basic,nested}.ts` | atomic |
| namespace 内 `export function` | `namespace-export-function.ts` | atomic |
| `declare namespace` | `declare-namespace.ts` | atomic |
| `declare global` | `declare-global.ts` | atomic |
| `declare module "m"` | `declare-module-string.ts` | atomic |
| `module N {}`（旧 shorthand，合法 TS） | `module-shorthand.ts` | atomic |

### 3.7 import / export
| 构造 | case | 分类 |
| --- | --- | --- |
| default / named / namespace / side-effect | `atomic/declarations/import-{default,named,namespace,side-effect}.ts` | atomic |
| type-only import / inline type specifier | `import-type-only.ts`、`import-inline-type.ts` | atomic |
| default + named 组合 | `import-default-named.ts` | atomic |
| import equals：`require` / 限定名 | `import-equals-{require,qualified}.ts` | atomic |
| export from（named re-export） | `export-named-from.ts` | atomic |
| `export * as ns` | `export-star-as.ts` | atomic |
| `export =` | `export-assignment.ts` | atomic |
| `export as namespace` | `export-as-namespace.ts` | atomic |
| `export declare const` | `export-declare-const.ts` | atomic |

### 3.8 decorator
class / method / property / parameter 四个位置各一条（见 3.3）；class 位置那条即**带参数装饰器** `@dec() class A {}`。限定名 `@a.b`、多组装饰器同属 atomic，已探测未收录（见 §6）。

## 4. throw 文案样本

`steps` = 判定器记录的步数（含抛错那一步、不含 EOF 兜底），抛错发生在 `steps-1` 号字符。

| case | 源码 | 抛错文案 | steps |
| --- | --- | --- | --- |
| `throw/declarations/let-type-annotation.ts` | `let x: number;` | `增量变量形状未支持：declaration 符号 :` | 7 |
| `throw/declarations/let-type-annotation-init.ts` | `let x: number = 1;` | `… declaration 符号 :` | 7 |
| `throw/declarations/let-definite-assignment.ts` | `let x!: number;` | `… declaration 符号 !` | 7 |
| `throw/declarations/let-two-declarations.ts` | `let x, y;` | `… declaration 符号 ,` | 7 |
| `throw/declarations/var-two-initialized.ts` | `var a = 1, b = 2;` | `… declaration 符号 ,` | 11 |
| `throw/declarations/let-object-destructure.ts` | `let { a } = obj;` | `… declaration 解构绑定` | 9 |
| `throw/declarations/let-object-destructure-default.ts` | `let { a = 1 } = obj;` | `… declaration 解构绑定` | 13 |
| `throw/declarations/let-object-destructure-nested.ts` | `let { a: { b } } = obj;` | `… declaration 解构绑定` | 16 |
| `throw/declarations/let-array-destructure.ts` | `let [a] = arr;` | `… declaration 解构绑定` | 7 |
| `throw/declarations/let-array-destructure-rest.ts` | `let [...rest] = arr;` | `… declaration 解构绑定` | 13 |
| `throw/declarations/let-parenthesized-init.ts` | `let x = (1);` | `… declaration 括号` | 11 |
| `throw/declarations/let-array-init.ts` | `let x = [1, 2];` | `… declaration 括号` | 14 |
| `throw/declarations/let-call-init.ts` | `let x = f();` | `… declaration 括号` | 11 |
| `throw/declarations/let-arrow-init.ts` | `let x = () => 1;` | `… declaration 括号` | 10 |
| `throw/declarations/let-member-init.ts` | `let x = a.b;` | `… declaration 符号 .` | 11 |
| `throw/declarations/let-ternary-init.ts` | `let x = a ? b : c;` | `… declaration 符号 ?` | 12 |
| `throw/declarations/let-semicolon-number.ts` | `let x = 1;` | `… declaration 符号 ;` | 11 |
| `throw/declarations/let-semicolon-binding.ts` | `let x;` | `… declaration 符号 ;` | 7 |
| `throw/declarations/let-subtract-init.ts` | `let x = 2 - 3;` | `… expression 运算符 -` | 12 |
| `throw/declarations/let-exponent-init.ts` | `let x = 2 ** 3;` | `… expression 运算符 **` | 13 |

## 5. partial / incremental 明细

| case | 源码 | 判定依据 |
| --- | --- | --- |
| `partial/declarations/let-string-init.ts` | `let x = "s"` | 4 个骨架节点提前，`nonSkeletonEarlier=0` |
| `partial/declarations/const-string-init.ts` | `const c = "s"` | 同上 |
| `partial/declarations/let-template-init.ts` | `` let x = `t` `` | 同上 |
| `partial/declarations/let-template-substitution-init.ts` | `` let x = `${y}` `` | 同上 |
| `partial/declarations/let-regex-init.ts` | `let x = /r/` | 同上 |
| `partial/declarations/let-identifier-init.ts` | `let x = y` | 同上 |
| `partial/declarations/let-comparison-init.ts` | `let x = a < b` | 同上 |
| `incremental/declarations/let-binding.ts` | `let x` | EOF 树只有骨架，4 个骨架节点提前 → incremental |
| `incremental/declarations/var-binding.ts` | `var y` | 同上 |
| `incremental/declarations/const-number.ts` | `const c = 1` | 5 个骨架节点 + `NumericLiteralShape` 提前 |
| `incremental/declarations/let-add.ts` | `let x = 1 + 2` | 8 个节点提前，其中 4 个非骨架 |

## 6. divergent / invalid / 探测后未收录

### 6.1 divergent（不收 case，报告即可）
- `let x = 2 / 3` 与 `let x = 2 / 3;`：**divergent**。EOF shape 树不同——
  legacy：`BinaryExpressionShape{ NumericLiteralShape("2"), SlashTokenShape("/"), NumericLiteralShape("3") }`；
  incremental：只剩 `NumericLiteralShape("2")`（`/` 及右操作数没有进树）。
  属于增量实现的结构差异/丢节点缺陷，不是「不支持」形态，未收 case；`/` 建议单列实现缺陷跟进。
- 同类运算符探测：`-`、`**` 是 throw（文案见 §4），`*`、`+` 已被支持（controls 已覆盖），`/` 是 divergent。

### 6.2 invalid（不收 case）
- `module {}`（无名 module 块）：TS parser 报 `Namespace must be given a name.` → invalid，不是合法 TS。
  旧式 `module N {}` 合法且 atomic，已收为 `atomic/declarations/module-shorthand.ts`。

### 6.3 探测过、分类正确、为满足 50–90 条上限未收录（已删除探测文件）
共约 175 个临时探测 case，最终留 90 条。以下变体实测分类与上面一致，可随时补回：
- 变量族：`let x = { a: 1 };`、`let x = a[0];`、`let x = new A();`、`let x = -1;`（throw）；`export const x = 1;`、`export let x: number;`（atomic）。
- function：`function f({ a }: T) {}`、`function f(a?: number) {}`、`function f<T>(a: T): T { return a; }`、`function f(this: T) {}`、`export function f() {}`、`export default function () {}`（atomic）。
- class：`class A extends B() {}`、`class A implements I {}`、`class A { static x = 1; }`、`class A { readonly x = 1; }`、`class A<T> {}`、`declare class A {}`、`export default class A {}`、`class A { #x = 1; }`、`class A { [k: string]: number; }`、`@a.b`/多装饰器（atomic）。
- interface：`interface I {}`、`interface I extends J<T> {}`、`interface I<T> {}`、`interface I { get x(): number; set x(v: number); }`、`export interface I {}`、`export default interface I {}`（atomic）。
- enum：`enum E {}`、`export enum E { A }`、`declare enum E { A }`、`export const enum E { A }`、`declare const enum E { A }`（atomic）。
- namespace：`namespace A.B {}`、`namespace N { export class A {} }`、`declare module "*.css" {}`（atomic）。
- import/export：`import type T from "m";`、`import type x = require("m");`（TS 合法）、`import a from "m" with { type: "json" };`、`import d, * as ns from "m";`、`import { a as b } from "m";`、`export { a, b };`、`export { a as b };`、`export * from "m";`、`export type { T } from "m";`、`export type T = number;`、`export default 1;`、`export {};`（atomic）。
- 已探测但与既有 `incremental/controls/*` 重复的正向形态（`let x = 2*3+1`、`var y = 2*3+1`、`let x = 1`）未重复收录。

## 7. 证据命令

```powershell
node typescript/cases/tts/run.mjs --filter declarations          # 全 PASS
node typescript/cases/tts/run.mjs --show throw/declarations/let-semicolon-number
node build/ts/cjcli.js typescript/cases/tts/cases/throw/declarations/let-semicolon-number.ts
#   → char 9 出现 NumericLiteralShape("1") + 残留 Symbol(";")，随后收口抛
#     「增量变量形状未支持：declaration 符号 ;」
node build/ts/cjcli.js typescript/cases/tts/cases/atomic/declarations/class-decorator.ts
#   → char 0..14 只有 basic token；吃进换行（[char 15]）时 ClassDeclarationShape /
#     DecoratorShape 一次性出现，与 legacy 同一步（开关无影响）
```
