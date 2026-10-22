# cover5 round5 — 缺少 possible（类别 2）

日期：2026-10-22 ｜ 分支：`cover5-missing-possible` ｜ 基点：`5362a38bffd3a94d605b321a95ac32f3fd02e34c`
工作区：`C:\Users\Admin\Documents\GitHub\xl-example-set\cover5-missing-possible`

## 1. 最终读数

| 项 | 基线 | 修复后 |
|---|---|---|
| `node typescript/cases/ast-json.mjs` | 5335 cases / 5335 cj-ok / 0 fail | **5391 cases / 5391 cj-ok / 0 fail**（+56 条，缺失 0） |
| `node typescript/cases/ast-json-diff.mjs` | 5335/5335，结构 0 / 位置 0 / 字段 0 | **5391/5391，结构 0 / 位置 0 / 字段 0** |
| `node typescript/cases/token-ast.mjs --quiet` | non-known-gap 1704（ok 1694 / ts-invalid 10，crash 0 / diff 0） | **同上，ok 1694 / diff 0 / crash 0 / ts-invalid 10**（无回归） |
| `node typescript/cases/real-dts-ast.mjs` | 226 文件，226 解析成功，AST 全一致 | **226/226，0 崩溃，0 差异** |
| `tsc -p tsconfig.json` | 0 error | **0 error**（1730+ 文件） |
| `xl_build`（core+typescript → ts） | 0 error | **0 error**（仅既有 W3102/W3103 噪音 + 3 个既有 E2004 孤儿 warning） |
| TS 版本 | 6.0.3 | 6.0.3 |

新增用例：`typescript/cases/missing-possible.ts` 从 35 条 → **91 条（+56）**，单 stem 与全量均全绿。

## 2. 问题清单（真红 = TS `parseDiagnostics.length === 0` 且本仓 crash / 错形状）

探针：`tmp/probe.mjs`（TS 6.0.3 `createSourceFile` vs 本仓 `SourceFileRunner.Parse`，
用 `typescript/cases/ast-compare.mjs` 的 `createAstCore/cjAst` 三栏对拍）。
种子方向：语句 / 声明起点的新形态（`namespace` / `abstract` / `const enum` / `declare` 组合 /
装饰器位置 / `export` 组合 / 被标体 / `yield`），共探 321 条候选，红 33 条，全部落在同一族
**「块 / 体 / 被标体里的声明头没有分派」**（外加 2 条根级零候选）。

### 2.1 主族：块 / 体 / 被标体里的声明头没有分派（31 条）

| 复现（TS diag=0） | 本仓症状 |
|---|---|
| `{ namespace N { let a = 1; } }` | crash「表达式没有读完」 |
| `{ module 'm' { export let a = 1; } }` | crash「表达式没有读完」 |
| `{ global {} }` | crash「表达式没有读完」 |
| `{ abstract class A {} }` / `function f() { abstract class A {} }` | crash「表达式没有读完」 |
| `{ const enum E { A } }` / `class C { static { const enum E { A } } }` | crash「变量声明里有无法识别的单元」 |
| `{ declare class C {} }` / `declare interface` / `declare enum` / `declare const enum` / `declare namespace` / `declare module 'm' {}` / `declare type` / `declare function` / `declare abstract class` | crash「表达式没有读完」（`declare const enum` 崩「变量声明里有无法识别的单元」） |
| `{ @dec class C {} }` / `@dec interface` / `@dec type` / `@dec enum` / `@dec namespace` / `@dec abstract class` / `@dec('x') class` / `@a @b.c class` | crash「不支持的表达式起点」 |
| `{ @dec export class C {} }` | crash「不支持的表达式起点」 |
| `{ export class C {} }` / `export const` / `export enum` / `export interface` / `export type` / `export namespace` / `export function` / `export abstract class` / `export declare class` / `export default class` / `export default class {}` / `export default interface` / `export default abstract class` / `export default function f() {}` | crash「表达式没有读完」 |
| `namespace N { @dec class C {} }` / `namespace N { export @dec class C {} }` / `namespace N { declare class C {} }` | crash「不支持的表达式起点」/「表达式没有读完」 |
| `declare module 'm' { export default abstract class C {} }` | crash「export = 声明的表达式没有读完」 |
| `l: const enum E { A }` / `l: abstract class A {}` / `l: @dec class C {}` | crash「表达式语句没有读完」/「表达式没有读完」/「不支持的表达式起点」 |

**归类**：缺少 possible（§6 第 2 类）。根级 / 模块体有候选表，但**块体内的语句分派**
`StatementBuilder.BuildStatement` 就是块层的「候选表」，它只认 `function` / `class` / `interface` /
`enum` / `type` / 变量 / 语句关键字，其它声明头一律落到末尾的 `BuildExpressionStatement()`
兜底——与 §6「掉进错误兜底（ExpressionStatement）」的定义同款。

**根因（file:line，修复前位置；行号以修复后文件为准的对应方法）**：
- `typescript/tokens/statements/statement-builder.xl.md:BuildStatement`（修复前 :204-333，
  现 :212）：只有 `function/class/async/declare+变量/let/const/var/interface/enum/type/语句关键字`
  分派，缺 `namespace/module/global`、`abstract class`、`const enum`、`declare <声明>`、
  装饰器声明、`export <声明>`、`default <声明>` 入口。
- `BuildClassDeclaration` / `BuildInterfaceDeclaration` / `BuildEnumDeclaration` /
  `BuildFunctionDeclaration` 起始格写死（`class` / `interface` / `enum` / `function`），
  无法接受「修饰词 / 装饰器前缀从本格起」。
- `typescript/tokens/declarations/module-block-shape.xl.md:136`：`export default` 后的声明词
  白名单缺 `abstract` / `async`。
- `typescript/tokens/declarations/enum-declaration-shape.xl.md:FromUnits`：不接受装饰器前缀
  （TS 的 `@dec enum E {}` children 第一项是 Decorator）。
- 修饰词 `Pos`：块内**首个**声明的第一个修饰词按「前一个代码单元 End+1」推会回退成 0
  （模块体早有 `ModuleBlockShape.BuildMember` 的重锚，块层没有）。

**四问**：
1. **正确何时 build**：一条语句在块 / 体里「到齐」时由 `BuildStatement` 一次分派建完；
   声明头要能在修饰词 / 装饰器起首格就认出来（`namespace` / `abstract` / `const enum` /
   `declare` / `@` / `export` / `default`），而不是等到表达式兜底。
2. **build 提什么**：`export` / `default` 修饰词摘下来建完再插回成员 `Data` 最前
   （`ExportKeywordShape` / `DefaultKeywordShape`，Pos=修饰词起点）；声明本身交给既有
   `FromUnits`（`ModuleDeclaration` / `ClassDeclaration` / `InterfaceDeclaration` /
   `EnumDeclaration` / `TypeAliasDeclaration` / `FunctionDeclaration`），它们自己吃
   `declare` / `abstract` / `const` / `export`（在装饰器之后的顺序）/ 装饰器前缀。
3. **何时 close**：声明在 `FromUnits` 内一次建完即关闭（体是闭合 `{…}` 括号单元；无体
   ambient 函数 / 声明以 `;` 收尾）。块层这条路径不挂载、不等下一单元。
4. **close 提什么**：装饰器 / 关键字的区间与 Pos（首个修饰词用本层 `Positions[first]` 重锚）、
   名字 / 修饰词 / 类型 / 体内成员；basic token 在 `FromUnits` 里直接消费掉，不进 Data。

### 2.2 次族：根级零候选（2 条）

| 复现 | 本仓症状 | 根因 |
|---|---|---|
| `yield 1;` | 零候选 → 终结候选兜底 crash「SourceRange.End has been setted」 | `typescript/tokens/statements/expression-statement-possible-shape.xl.md:CanStart`（:115）把 `yield` 归进 `IsStatementWord` → 表达式候选 Reject；`yield` 在 TS parse 视角是一元前缀（语义层才报「只能在 generator」），builder 的 `ParseYield` 已能建。 |
| `l: const enum E { A }` | 零候选 → 根终结候选的 ExpressionStatement 兜底「表达式语句没有读完」 | `typescript/tokens/statements/statement-scanner.xl.md:ScanBody`（:233）对 `const` + `enum` 直接 `Mismatch`——那是**根级**给 enum 候选让位的判据，在被标体 / 块体里没有 enum 候选，应改为按声明体扫。 |

## 3. 修复文件（只在 typescript 层）

| 文件 | 改动 |
|---|---|
| `typescript/tokens/statements/statement-builder.xl.md` | `BuildStatement` 增加 `export` / `default` / `namespace`·`module`·`global` / `abstract class` / `const enum` / `declare <声明>` / `@` 装饰器分派；新增 `BuildModuleDeclaration`(:597) / `BuildExportedStatement`(:629) / `BuildDefaultModifierStatement`(:648) / `ScanDecoratedHead`(:672) / `BuildDecoratedStatement`(:726) / `IsModuleDeclarationHead` / `IsExportDeclarationHead` / `IsDefaultDeclarationHead` / `AnchorFirstModifier`(:481)；`BuildClassDeclaration` · `BuildInterfaceDeclaration` · `BuildEnumDeclaration` · `BuildFunctionDeclaration` 起始格泛化（按 `TypeBuilder.IsBodyBrace` 找体）；`@dec enum` 与匿名 `export default class` 支持 |
| `typescript/tokens/declarations/enum-declaration-shape.xl.md` | `FromUnits` 支持装饰器前缀（Decorator 进 Data 最前，Pos 从 decoratorEnd 起链） |
| `typescript/tokens/declarations/module-block-shape.xl.md` | `export default` 的声明词白名单补 `abstract` / `async` |
| `typescript/tokens/statements/expression-statement-possible-shape.xl.md` | `CanStart` 放行 `yield`（:115） |
| `typescript/tokens/statements/statement-scanner.xl.md` | `ScanBody` 的 `const enum` 走 `ScanDeclarationBody`（:237） |

`core/**` 与 `typescript/IMPORTANCE.md` 未改动。未新增 `PossibleShape` 类：本族缺的不是根级候选
形状，而是**块层分派表**（等价于候选入口判据）；所有新入口都复用既有 `FromUnits`（一次建完，
没有重复扫描，符合 §3.4/§7 的 cache 口径——本族不在 possible 循环里逐格扫描）。

## 4. 未纳入本类的红（交 Lead / 其它类别）

| 复现（TS diag=0） | 本仓症状 | 判断 |
|---|---|---|
| `{ import x from 'm'; }` / `{ import { a } from 'm'; }` / `{ import 'm'; }` / `{ import x = require('m'); }` / `{ export import x = require('m'); }` / `{ export { a }; }` / `{ export * from 'm'; }` | crash「表达式没有读完」 | 块里的**模块说明符语句**（import/export 子句）没有分派。形态与 2.1 同族，但需要 Import/Export 形状的体校（`ImportDeclarationShape.FromUnits` / `ExportDeclarationShape.FromUnits` / `ImportEqualsDeclarationShape.FromUnits` + 修饰词投影），单独一批更稳；本轮未做。 |
| `{ export = foo; }` / `{ export = class {}; }` / `{ export default 1; }` | 错形状（ExpressionStatement+Binary）或 crash | ExportAssignment 在块里没有分派；属 export assignment 族。 |
| `{ export default function () {} }` / `{ export default async function () {} }` | crash「函数声明的名字不是标识符」 | 匿名 default 函数：`FunctionDeclarationShape.FromUnits` 要求名字；匿名只允许在 `export default` 后，需要像 class 那样给匿名口子。 |
| `import type from 'm';` | 结构差：TS 把 `type` 当默认导入名（ImportClause + Identifier），本仓按 type-only 导入 | **possible compute**（4 类），非本类。 |
| `a?.<T>(b);` | crash「缺少标识符」 | 表达式侧（可选调用 + 类型实参），**possible build**（5 类）。 |
| `yield 1;` 的语义上下文 | 已能建树；但 `SyntaxContext` 仍没有 generator 标志 | 本类只放开「候选存在」；与 `await`/`yield` 上下文相关的语义对拍属另一类（D17），未动。 |

## 5. 新增用例（+56，`typescript/cases/missing-possible.ts` 末尾新段落）

按组（§5：base 在前，trivia / 重复形变体随后；一行一例，行内 `\n` 还原为换行）：
- 块内 namespace / module 字符串名 / 限定名 / 嵌套 / 成员族：7
- 块内 `abstract class` / `const enum` / static block：5
- 块内 `declare <声明>` 族（class/interface/enum/const enum/namespace/module/type/function/abstract class）：10
- 块内装饰器声明（class/带参/多装饰器/abstract/interface/type/enum/namespace、装饰器后 export、函数体内）：10
- 块内 export 声明（class/const/enum/interface/type/namespace/function/abstract class/declare class/`export default` 各类/匿名类/连排）：15
- namespace / module 体内的同类变体：5
- 被标体里的声明（`l: const enum` / `l: abstract class` / `l: @dec class`）：3
- 根级 `yield 1;`：1
（组内小计相加 56；实际 91 条 = 35 条既有 + 56 条新增，单 stem `ast-json-diff` 91/91 一致。）

## 6. 需用户裁定项

1. **块里的 import / export 子句声明**（§4 第 1 行）要不要继续补？形态合法（TS diag=0）、
   与本轮修复同族，但需要 `ImportDeclarationShape` / `ExportDeclarationShape` 的 FromUnits 接线与
   修饰词投影，建议作为本类下一批或单独一批。
2. **匿名 `export default function () {}`** 是否要给 `FunctionDeclarationShape.FromUnits` 开匿名口子
   （与 class 的 `FromUnitsAllowAnonymous` 同款）。
3. 块层 accept 的是「TS **parse** 合法」的形态（如 `{ namespace N {} }`、`{ declare class C {} }`
   语义上可能不合法，但 TS parser 不报 parseDiagnostic）。本轮口径沿用 IMPORTANCE §3 与
   既有语料口径（parseDiagnostics=0 即算真值）；若要求「语义合法才算」，上述块内声明用例应整体撤下。

## 7. 遗留

- 上面 §4 的 7 条块内 import/export 子句与 3 条 ExportAssignment 未修（同族但另批）。
- `yield` / `await` 的 generator/async 上下文标志（D17）未做，本轮只保证候选存在。
- `tmp/` 探针（`probe.mjs` / `dump-ts.mjs` / `snippets*.json` / `reds-batch*.json` / 日志）未提交。
