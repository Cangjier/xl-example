# export declarations chunk 2 覆盖记录

> **export async / generator functions**（分支 `cover-export-async-fn-1`，起点 `origin/integration @c5cf9a25`）：
> `export-functions.ts` **25 → 49**（+24），**49/49** 完全一致；全量 **2879 → 2903** 全绿；`export` stem 182/182 无回归；tsc 0 error。
>
> Oracle（TS `createSourceFile` 实测 children 顺序；ExportKeyword/DefaultKeyword/AsyncKeyword/AsteriskToken 都在 children 里）：
> - `export async function f() {}` → `FunctionDeclaration`：ExportKeyword, AsyncKeyword, Identifier, Block
> - `export default async function f() {}` → ExportKeyword, DefaultKeyword, AsyncKeyword, Identifier, Block
> - `export function* g() {}` → ExportKeyword, AsteriskToken, Identifier, Block
> - `export default function* g() {}` → ExportKeyword, DefaultKeyword, AsteriskToken, Identifier, Block
> - `export async function* h() {}` → ExportKeyword, AsyncKeyword, AsteriskToken, Identifier, Block
> - `export default async function* g() {}` → ExportKeyword, DefaultKeyword, AsyncKeyword, AsteriskToken, Identifier, Block
> - `export declare async function f(): void;` → ExportKeyword, DeclareKeyword, AsyncKeyword, Identifier, VoidKeyword
> - 匿名 `export default async function () {}` → ExportKeyword, DefaultKeyword, AsyncKeyword, Block（无名字）
>
> 实现（只改 `export-declaration-possible-shape.xl.md`）：
> - 第二格分派新增 `async` → Stage 29（等 `function` 后转 Stage 16 的「体到齐」），Kind 仍用 **14**：
>   Build 的声明起点就是 `secondIndex`（= `async`），`FunctionDeclarationShape.FromUnits` 自己认 async / `*`，
>   所以 `export async function` 与 `export async function*` 共用同一条 build 分支；普通 `export function`（Kind 14）
>   路径不变。
> - `default` 之后新增 `async` → Stage 32（等 `function` 后转 Stage 23），**新 Kind 23**：
>   声明起点 = `async` 单元；有名字走 `FunctionDeclarationShape.FromUnits(asyncIndex, bodyIndex)`，
>   匿名走手工建（AsyncKeyword + Block）；最后 unshift Default/Export。
> - `declare` 之后新增 `async` → Stage 33（等 `function` 后转 Stage 15 的 `;` 收尾），Kind 仍 11：
>   Build 在 declare 与 name 之间插 `AsyncKeywordShape`。
> - Stage 23（default function）放行 `*`；Kind 10 的有名判定改成「`function` 后可选 `*` 再找名字」，
>   于是 `export default function* g() {}` 也转绿（原来 `*` 会让 Stage 23 退出）。
> - Kind 23 的有名判定同样先跳过 `*`（`async function * name`），修复 `export default async function*` 的崩溃。
>
> 24 条覆盖：`export async function`（空体 / await 体 / 参数与返回类型）、`export default async function`（有名 / 匿名）、
> `export async function*`（空体 / yield / await+yield）、`export default async function*`、`export default function*`、
> `export function*`（带 yield）、`export declare async function f(): void;`；
> trivia：`export /* c */ async`、`async /* c */ function`、`function /* c */ f`、体前注释、
> `export async function\nf() {}`、`export default /* c */ function*`；重复形（两条连排、`a\n` 后接 async 导出）。
>
> 仍未做（沿用既有 limitation，未新增注释目标）：`export declare async function f(a: A): B;`（Kind 11 的无体签名
> 只建名字 + 返回类型，参数表未建——与既有 `export declare function` 同一条限制）；匿名带参数的
> `export default async function (a: A) {}`（匿名手工 build 不含 Parameter，与既有同步匿名 default 同一限制）。
>
分支 `cover-export-decls-1`（从 `origin/integration` @4054100e 起，含 statements/class/interface/enum/types chunk1）。
产物：`node typescript/cases/ast-json.mjs export` + `ast-json-diff.mjs export`。

## 本 chunk 新增（`export.ts` base 8 / 9，全部逐条对拍 TS）

| 形态 | TS kind / children | 实现 |
| --- | --- | --- |
| `export const|let|var x = 1;` | `VariableStatement`（diff 别名 `FirstStatement`）→ `ExportKeyword` + `VariableDeclarationList` | `ExportDeclarationPossibleShape` 走 Stage 13（见到 `;` 建），`StatementBuilder` 建变量语句后把 `ExportKeywordShape` 插到 `Data[0]` |
| `export class C {}` | `ClassDeclaration` → `ExportKeyword` + `Identifier` | Stage 10（类体 `{}` 关闭时建），`ClassDeclarationShape.FromUnits` + `ExportKeyword` |
| `export interface I {}` | `InterfaceDeclaration` → `ExportKeyword` + `Identifier` | Stage 11，同上 |
| `export enum E { A }` | `EnumDeclaration` → `ExportKeyword` + `Identifier` + `EnumMember` | Stage 12（枚举体允许非空），`EnumDeclarationShape.FromUnits` + `ExportKeyword` |
| `export default <表达式>;` | `ExportAssignment` → 表达式 | Stage 20/22（`;` 时建），`ExpressionBuilder` + `ExportAssignmentShape`；`isExportEquals=false` 不在比较字段里 |
| `export default class D {}` | `ClassDeclaration` → `ExportKeyword` + `DefaultKeyword` + `Identifier` | Stage 20→21（类体关闭时建），`ClassDeclarationShape.FromUnits` + 两个 modifier |

要点：
- 声明前缀形**不挂载 shell**：`BuildByIndex` 直接把根级声明形状（`built.Pos` 改成 `export` 前一个非 trivia 的
  `End+1`，`SignOut` 保持声明自己的右边界）splice 回宿主；`host.MountedUnit` 只在子句形（Stage 2）设置。
- 修饰词位置：`ExportKeyword.Pos` = `export` 前一个非 trivia 的 `End+1`（文件开头是 0）；
  `DefaultKeyword.Pos` = `export.End+1`，与 TS 一致。
- class / interface 的体非空时主动 `Reject`（成员未实现，不静默丢）；enum 体允许成员（`EnumDeclarationShape` 已实现）。
- `export default <表达式>` 在这里建 `ExportAssignmentShape`；**没有改** cover-module-1 的
  `export-assignment-*` 文件（该分支的类是空壳，够产生 kind/children/pos/end）。合并后 `export =` 仍由
  module-1 的 `ExportAssignmentPossibleShape` 负责，两边扫描互斥（`=` vs `default`），无冲突。

## 已被现有 62 条覆盖、本 chunk 未重复的形态

具名导出 `{…}`/`{…} from`、`export *`、`export * as ns from`、`export type {…}`/`export type * as ns`、
`with`/`assert` 属性段、关键字导出名、同文件多语句。

## 暂缓（写进 export.ts 注释目标）

- `export default function f() {}` —— 函数声明未合并（cover-declarations 侧）。
- `export declare class C {}` —— `declare` 修饰词在 declarations 侧；本 chunk 不扩。
- `export { "a-b" as c }` / `export { a as "b-c" }` —— 引号导出名；现有 `ExportSpecifierShape` 只认 `Common`，
  需要 StringLiteral 名字与 harness 侧 `name` 字段口径，留作后续。
- `export as namespace NS;` / `export = a;` —— cover-module-1 的文件（前者已合入 integration，后者进行中）。

## chunk 4 新增（base 10，全部逐条对拍 TS）

| 形态 | TS children | 实现 |
| --- | --- | --- |
| `export declare const x: number;` / `let y: string;` / `var z = 1;` | `VariableStatement` → `ExportKeyword` + `DeclareKeyword` + `VariableDeclarationList` | Stage 14→13（Kind 12）：`StatementBuilder` 从 `declare` 后那个 `const/let/var` 起建变量语句，再 unshift `DeclareKeyword` / `ExportKeyword`，整体 Pos 改到 `export` 前边界 |
| `export declare type T = A;` | `TypeAliasDeclaration` → `ExportKeyword` + `DeclareKeyword` + `Identifier` + `TypeReference` | Stage 14→13（Kind 13）：`TypeAliasDeclarationShape.FromUnits` 从 `type` 起建，再补两个修饰词 |
| `export { a as "b-c" } from "m";` / `export { "a-b" } from "m";` | `ExportSpecifier` → `Identifier`/`StringLiteral` + `StringLiteral` | `ExportSpecifierShape.FromTokens` 两个位置都接受 `Common` 或 `String`；harness `cjAst` 增一条最小 name 语义：`shape.Name.Text`（StringLiteralShape 的文本字段）→ `out.name`，`TS_KIND_ALIASES` 未动 |

暂缓：`export default class D extends B {}`（heritage 未合并：类声明形状报「类表达式缺少类体」）；
`export declare class/interface/enum`、`export default function`（属 chunk 3 分支，未并入本 base）；
`export default function*`；`export declare\ntype T = A;`（`declare` 与 `type` 之间换行时 TS 侧
TypeAliasDeclaration 的 pos 是 14 而不是 0，属 ruler 口径问题，留作后续）。
## chunk 3 新增（base 10，全部逐条对拍 TS）

| 形态 | TS children | 实现 |
| --- | --- | --- |
| `export declare class C {}` | `ClassDeclaration` → `ExportKeyword` + `DeclareKeyword` + `Identifier` | Stage 14→10，Kind 7；`ClassDeclarationShape.FromUnits` 从 `declare` 起建，再 unshift `ExportKeyword`、整体 `Pos` 改为 `export` 前边界 |
| `export declare interface I {}` | 同上，`InterfaceDeclaration` | Stage 14→11，Kind 8 |
| `export declare enum E { A }` | `EnumDeclaration` → `ExportKeyword` + `DeclareKeyword` + 名字 + `EnumMember` | Stage 14→12，Kind 9（枚举体可非空） |
| `export default function f() {}` | `FunctionDeclaration` → `ExportKeyword` + `DefaultKeyword` + `Identifier` + `Block` | Stage 20→23，Kind 10；`FunctionDeclarationShape.FromUnits` + Default/Export modifier |
| `export default function () {}` | `FunctionDeclaration` → `ExportKeyword` + `DefaultKeyword` + `Block`（无名字） | 同 Kind 10 匿名分支：`StatementBuilder` 建 Block 作唯一 child |
| `export declare function f(): void;` | `FunctionDeclaration` → `ExportKeyword` + `DeclareKeyword` + `Identifier` + `VoidKeyword`（无 body） | Stage 14→15（等 `;`），Kind 11 手工建，返回类型走 `TypeBuilder.ParseType` |
| `export { "a-b" as c } from "m";` | `ExportSpecifier` → `StringLiteral` + `Identifier` | `ExportSpecifierShape.FromTokens` 属性名位置同时接受 `Common` 与 `String` |

暂缓：`export { a as "b-c" }` / `export { "a-b" }`（TS 的 ExportSpecifier.name 是字符串文本，cjAst 只认
IdentifierShape.EscapedText，harness 缺该语义 → 报告不硬改）；`export declare const`（statements 侧 declare）；
`export default function*`（generator `*`）；类/接口成员与 decorators。

## export forms sweep（measurement-only，不改 token 源）

新增 21 条 base+trivia 全绿用例（export stem 119 -> 141，其中仅 `export { type T } from "m";` 为暂缓目标）：
`export { };`（空具名导出，含 `export {}` 模块标记）、`export { a, b, c };`、`export { a as b, c as d };`、
`export { a as b } from "m";`、`export type { T } from "m";`、`export { a as default };`、`export { default as a };`、
`export * as ns from "m";`、`export * as ns from "m" with { type: "json" };`（及双属性）、
同文件多语句 + 语句间块注释/换行/行尾注释、`export {\n};`、`export\n{\n  a,\n  b,\n};`、
`export *\nas\nns\nfrom "m";` 等换行/前导空格变体。全部先经 `ts.createSourceFile(...).parseDiagnostics` = 0 验证。

暂缓（不支持，未改 token 源）：`export { type T } from "m";` —— TS 置 `ExportSpecifier.isTypeOnly=true` 且
children 为 `[Identifier T]`；本仓 `ExportSpecifierShape.FromTokens` 把 `type` 当 Identifier 名（pos 8..13 vs ts 13..15），
需要给 specifier 增加 inline `type` 修饰词语义，属 token 源改动，按任务要求只记目标。
## chunk 5 新增（base 13，全部逐条对拍 TS）

| 形态 | TS children | 实现 |
| --- | --- | --- |
| `export default class D extends B {}` / `implements I` / 两者 | `ClassDeclaration` → `ExportKeyword` + `DefaultKeyword` + `Identifier` + `HeritageClause`… | 既有 Kind 5 路径；heritage 由 `ClassDeclarationShape.FromUnits` 建 |
| `export abstract class C {}` | `ClassDeclaration` → `ExportKeyword` + `AbstractKeyword` + `Identifier` | Stage 24 / Kind 14（`FromUnits` 认 abstract） |
| `export default abstract class C {}` | … + `DefaultKeyword` + `AbstractKeyword` | Stage 20→25→21 / Kind 15 |
| `export declare abstract class C {}` | … + `DeclareKeyword` + `AbstractKeyword` | Stage 14→24 / Kind 16 |
| `export abstract class C extends D {}` | … + `HeritageClause` | Kind 14 + heritage |
| `export class C extends D implements I {}` | … + 两个 `HeritageClause` | 既有 Kind 1 路径 |
| `export interface I extends J {}` | `InterfaceDeclaration` → `ExportKeyword` + `Identifier` + `HeritageClause` | 既有 Kind 2 路径 |
| `export default class C { m() {} }` | … + `MethodDeclaration` | Kind 5；类体非空放行（class 成员已合入；interface 体仍要求空） |
| `export const enum E { A }` | `EnumDeclaration` → `ExportKeyword` + `ConstKeyword` + `Identifier` + `EnumMember` | Stage 27→12 / Kind 17：`EnumDeclarationShape.FromUnits` 不认 const，手工补 `ConstKeywordShape` |
| `export declare const enum E { A }` | … + `DeclareKeyword` + `ConstKeyword` | Stage 14→26→12 / Kind 18 |

暂缓（ruler 口径问题，未硬改）：`export abstract\nclass C {}` / `export default abstract\nclass C {}` —— modifier 与 `class`
之间换行时 TS 的 ClassDeclaration `pos` 是换行位置（15 / 23）而不是 0，与之前 `export declare\ntype` 同类。
同批保留了 `export\ndefault class …`、`export\ndefault…` 等换行变体且全绿。
## chunk 6 新增（base 14，全部逐条对拍 TS）

| 形态 | TS children | 实现/归属 |
| --- | --- | --- |
| `export declare interface I extends J {}` | `InterfaceDeclaration` → `ExportKeyword` + `DeclareKeyword` + `Identifier` + `HeritageClause` | 既有 Kind 8 路径（`InterfaceDeclarationShape.FromUnits` 认 declare + heritage）；本 chunk 只加用例 |
| `export default interface I {}` / `extends J` | `InterfaceDeclaration` → `ExportKeyword` + `DefaultKeyword` + `Identifier`（+ HeritageClause） | 新增 Stage 28 / Kind 20：`InterfaceDeclarationShape.FromUnits` 从 `interface` 起建，再补 `DefaultKeyword` + `ExportKeyword`，整体 Pos 改到 `export` 前边界；接口体闭合时收尾 |
| `export default abstract class C { m() {} }` | `ClassDeclaration` → `ExportKeyword` + `DefaultKeyword` + `AbstractKeyword` + `Identifier` + `MethodDeclaration` | 既有 Kind 16 路径 + class 成员（成员/抽象已由 declarations 侧提供；export-decl 只调 FromUnits） |

记录（已在此前 chunk 全绿，本次仅复核，未重复添加）：`export declare const/let/var …;`（Kind 12）、
`export declare type T = A;`（Kind 13）、`export declare function f(): void;`（Kind 11）、`export declare interface I {}`。

暂缓（ruler 口径，未硬改）：`export declare\ninterface I extends J {}` —— declare 与 interface 之间换行时
TS 的 InterfaceDeclaration `pos` 是 14 而不是 0；与 `export declare\ntype`、`export abstract\nclass` 同类。

归属说明：export-decl 只负责 `export` 前缀形与修饰词拼装；`declare`/heritage/成员语义由 declarations 侧的
InterfaceDeclarationShape / ClassDeclarationShape 提供（本 chunk 未改任何 interface/class/function declaration 文件）。
## inline type-only export specifiers + type-star（chunk typespec）

- `ExportSpecifierShape.FromTokens`：组首 `type` 且后面还有名字时置 `IsTypeOnly = true`（TS 的
  ExportSpecifier.isTypeOnly），名字/别名照旧从下一个 token 起解析；组首单独一个 `{ type }` 仍是导出名为
  `type` 的标识符（TS 口径）。名字 `Pos`：inline 形为 `type.End+1`；`as` 别名 `Pos` 为 `as.End+1`；
  复合区间/整体 `Pos` 与既有一致。has no children for `type` keyword（与 TS 一致：keyword 不投影）。
- 新增全绿用例（export.ts，+12）：`export { type T } from "m";`、`export { type T, a } from "m";`、
  `export { type T };`、`export { type T as U } from "m";`、`export { a, type T } from "m";`，以及前导空格/
  行尾注释/词间块注释（`{ /* c */ type T }`、`{ type /* c */ T }`）/换行（`type\nT`）变体；
  type-star 本体（`export type * from "m";`、`export type * as ns from "m";`）在 base 4 已绿，本次只补
  `export type *\nfrom "m";` 与多空格变体。
- 回归：export 194/194（182 + 12）、export-functions 全绿、全量无回归。
## export 组合形态：decorator / default / abstract / 泛型（chunk export-combos）

- **Probe（TS 6.0.3）**：`export @dec class C {}`、`export default @dec class C {}`、`@dec export default class C {}` 全部
  parseDiagnostics=0（decorator 与 export/default 同属一个 ClassDeclaration；`@dec` 在 `export` 前时 TS children 顺序是
  Decorator → ExportKeyword → DefaultKeyword）。`export class C<T>`、`export interface I<T>`、`export default class C<T>` 也合法。
- 修法（只在 `export-declaration-possible-shape.xl.md` 的候选扫描里，BuildByIndex 既有分支够用）：
  - Second 分派新增 `@` → 新 Stage 34（decorator 前缀）→ 遇到 `class` 后进 Stage 10（Kind 1）；
  - Stage 20（`export default …`）新增 `@` → Stage 34（Kind 5）→ 遇到 `class` 后进 Stage 21；
  - class/interface/enum/default-class 的头阶段（10/11/12/21）允许 Symbol 单元：`<T>`、heritage 类型实参
    （`extends D<E>`）里的 `<` `>` `,` `.` 不再把候选打回 Stage 3；body `{` 仍是唯一 Done 点，EOF 仍由既有 EOF 让位逻辑收尾；
  - BuildByIndex：Kind 1 从 `@` 起调 `ClassDeclarationShape.FromUnits`（其 decorator loop 已在最前），再 unshift Export；
    Kind 5 先跳过 `default`，从 `@`/`class` 起建 class，再 unshift Default + Export（children 顺序 = Export, Default, Decorator）。
- 新增全绿用例（export.ts，+20）：`export default abstract class C {}`、`export declare abstract class C {}`（回归
  `export abstract class C {}` / `export declare class C {}`）、`export @dec class C {}`、`export default @dec class C {}`、
  `export class C<T> {}`、`export interface I<T> {}`、`export function f<T>() {}`、`export type T<U> = U`、
  `export default class C<T> {}`、`export default @dec class C<T> {}`、`export @dec() class C {}`、
  `export default abstract /* c */ class C {}`、`export @dec class C {} // c`，以及 module 体内
  `declare module "m" { export import A = B.C; }` / `namespace N { export import A = B.C; }`（回归）、
  `export default function () {}`、`export default function f() {}`、`export default (a, b);`。
- 暂缓：`@dec export default class C {}`（TS 6.0.3 合法）—— 根候选是 class-declaration 家族，需要在
  class-declaration-possible-shape 里让 decorator 前缀后接受 `export`+`default`，不属于本 chunk 的 write scope；已写注释目标。

## 分支合并补记（docs 补全，数据由 git 推导）

> 用例行增量取 `git diff <merge>^1 <merge> -- typescript/cases/*.ts` 的 numstat（仅 .ts）；
> 实现文件取 `git diff --name-only <merge>^1 <merge> -- typescript/tokens`；tip = `git rev-parse <merge>^2`。
> 合并提交未记录 deferred，详见对应分支提交与报告。

- `cover-export-build-1` @ `25fb6529` — (module-body export star/named + export FromUnits)；cases +22/-2（export,module-blocks）；impl: export-declaration-shape,module-block-shape
- `cover-export-combos-1` @ `a47d8d5f` — (export declaration combinations)；cases +23/-0（export）；impl: export-declaration-possible-shape
- `cover-export-import-type-1` @ `7705593b` — (export import type aliases)；cases +8/-1（import）；impl: import-equals-declaration-possible-shape
- `cover-export-import-alias-1` @ `ff654862` — (export import A = B.C aliases)；cases +14/-1（export,import）；impl: import-equals-declaration-possible-shape,import-equals-declaration-shape
- `cover-export-typespec-1` @ `e71a3ad1` — (inline type-only export specifiers)；cases +19/-2（export）；impl: export-specifier-shape
- `cover-export-decls-6` @ `c2cd6b55` — (export default interface)；cases +22/-0（export）；impl: export-declaration-possible-shape
- `cover-export-decls-4` @ `6879138d` — (abstract/default-abstract/declare-abstract/const-enum forms)；cases +31/-0（export）；impl: export-declaration-possible-shape
- `cover-export-fn-1` @ `60b2f90b` — (export functions)；cases +47/-0（export-functions）；impl: export-declaration-possible-shape
- `cover-export-sweep-1` @ `14fd3654` — (named/star/type-only export cases)；cases +31/-1（export）；impl: 
- `cover-export-decls-3+4` @ `e1cf6149` — (export declare/specifier strings)；cases +26/-9（export）；impl: export-declaration-possible-shape,export-specifier-shape,source-file-shape
- `cover-export-decls-2` @ `6f9f46de` — (chunk3) into chunk4 branch；cases +28/-5（export）；impl: export-declaration-possible-shape,source-file-shape
- `cover-export-decls-2` @ `6f9f46de` — (export type aliases + candidate list)；cases +32/-5（export）；impl: export-declaration-possible-shape,export-specifier-shape,source-file-shape
