# module / namespace 块覆盖（chunk 1 + 2 + 3）

本页记 `typescript/cases/module-blocks.ts` 收了什么、怎么实现、还差什么。口径是
`node typescript/cases/ast-json.mjs` + `node typescript/cases/ast-json-diff.mjs`（本分支唯一权威 AST 尺子）。

## 1. 已落地

**chunk 1（base）**：`namespace N {}`、`namespace N { <语句> }`（体内用 statements 的语句建树器：
`let` / `const` / `var`、块、空语句、`if`）、`module N {}` / `module N { … }`（关键字不同、同一种节点）、
`declare module "m" {}`（字符串模块名 + `declare` 修饰）、`declare namespace N {}`、
`export namespace N {}`（`export` 修饰）、限定名 `namespace A.B {}` / `A.B.C`（TS 的嵌套 `ModuleDeclaration` 结构）。

**chunk 2（augmentation）**：module augmentation 的成员语句（`let x: number;` / `const x = 1;` / 多语句 / trivia）、
`export` 修饰的成员语句（`export let x: number;`）、`declare global { … }`（名字是 `Identifier "global"`、
无 namespace/module 关键字）、模块体里的空接口声明（含 `export interface`）。

**chunk 3（带体声明进模块体）**：

- `namespace N { class C {} }`、`{ interface I {} }`、`{ function f() {} }`、`{ enum E { A } }`、
  `{ function f(a: A): B { return a; } }`（多声明 / 带前序语句的体）；
- export 修饰的带体成员：`namespace N { export class C {} }`、`export function f() {}`、
  `export enum E { A }`、`export interface I {}`；
- ambient 模块里的带体声明：`declare module "m" { class C {} }`、`{ enum E { A } }`、`{ interface I {}\nclass C {} }`。

实现方式（`typescript/tokens/declarations/`）：

| 文件 | 职责 |
| --- | --- |
| `module-declaration-possible-shape.xl.md` | 根级候选：扫 `[export\|declare] namespace\|module` 或 `declare global` + 名字 + 可选 `.` 链 + 闭合 `{…}`；`BuildByIndex` 只消费到 `{` 那一格。 |
| `module-declaration-shape.xl.md` | 建树：修饰词 / 名字 / 体进 `Data`（= AST children）；限定名按 TS 嵌套建 `ModuleDeclaration`，只有最内层挂 `ModuleBlock`；`global` 走「名字 = global、无关键字」分支。 |
| `module-block-shape.xl.md` | `{…}` → `ModuleBlock`：逐个成员 `BuildMember`——普通语句交 `StatementBuilder`；带体声明（`class` / `interface` / `enum` / `function`）先扫出本层第一个 `{` 括号单元当体，再按关键字交各自的 `FromUnits(bracket, dataStart, dataEnd)`；`export` 修饰词插到成员 `Data` 最前并回写 `Pos`。 |
| `module-block-possible-shape.xl.md` | **仍是桩**（见 §4 决策）：模块体走「闭合括号单元 → 一次建完」的原子路径，没有候选目录。 |

为什么用「原子建树」而不是挂载型：`{ … }` 在词法层已经是**一个闭合的括号单元**，所以「到齐」= 这个单元出现在
`host.Data` 里，一次 `splice` 建完整棵；模块体成员的体（类体 / 接口体 / 枚举体 / 函数体）同样各自是闭合括号单元，
所以在模块体这一层递归 `FromUnits` 即可，不需要壳 + 终结候选两层。

四条对 `ast-json` 重要的口径：

- **不设 `Name` / `Modifiers` 字段**：TS 侧对 `ModuleDeclaration` 不比 `name`，投影字段表里也没有它；
  名字 / 修饰词只作为 `Data` 里的子节点（`Identifier` / `StringLiteral` / `ExportKeyword` / `DeclareKeyword`），
  多立字段会凭空多出字段差。
- **限定名的嵌套位置**：`namespace A.B {}` 里 TS 的 `ModuleDeclaration B` 的 `pos` 是 `A` 的 `End + 1`、
  `end` 是整条声明右边界（与最外层相同）；建树按 `positions[名字下标]` 给内层 `Pos`，每层 `SignOut` 到模块体结尾。
- **模块体成员的 `Pos`**：`StatementBuilder` 用「`{` 的下一个位置」起算（与 TS 一致）；各声明形状的
  `FromUnits` 返回后必须用本层 `Positions` 覆盖 `Pos`——它们只看 `host.Data` 前一个单元，括号内下标从 0 起时会算成 0。
- **带 `export` 的成员 `Pos`**：回到修饰词起点；修饰词进 `Data` 最前（TS children 顺序 `[ExportKeyword, …]`）。

## 2. 用例

`module-blocks.ts` 共 44 条：M1 `namespace` 基形（空体 / 单条 / 多条 / 空语句 / 嵌套块 / 体内 `if`）、
M2 `module` 关键字、M3 `declare module "m"`、M4 `export namespace`、M5 trivia（词间注释 / 行尾注释 + 换行）、
M6 限定名（`A.B` / `A.B.C` / 体内有语句）与 `declare namespace N`、M8 module augmentation（typed 变量 /
`export` 修饰 / `const` / 多语句 / 换行）、M9 `declare global`、M10 模块体里的空接口、M11 augmentation 的 trivia、
M13 带体声明（class / interface / function / enum、带参+返回类型的函数、同体多成员）、M14 export 修饰的带体成员、
M15 ambient 模块里的 class / enum / interface+class。`\n` 由生成器还原成真实换行。

## 3. 暂缓（写成 `//` 目标行，未煮进用例）

| 目标 | 原因 / 依赖 |
| --- | --- |
| `function f(): void;`（无体函数，ambient / 重载） | 需要 declarations 侧的「声明 end 候选」：本层扫不到 `{` 体，会落到语句路径 |
| 非空类体（`class C { m() {} }`）/ 非空接口体 / `interface I extends …` | 属 declarations / members 批次（本批只收空体） |
| `export as namespace X;` | 属 cover-module-1（`NamespaceExportDeclaration`） |
| 组合修饰 `export declare module`、模块体内再开 `module` | 后续 chunk |

## 4. 决策：`module-block-possible-shape.xl.md` 保持桩

模块体在本架构里不是独立候选宿主：`{…}` 是**单个闭合括号单元**，成员在它的 `Data` 上由
`StatementBuilder` / 各声明形状的 `FromUnits` 递归建，没有「还差一个单元、等终结候选」的时刻。
因此 `ModuleBlockPossibleShape` 在本 chunk 没有任何消费者，保持桩（与 `*-possible-shape` 桩的既有约定一致），
等出现挂载型需求（如非闭合边界、增量增补）再实现；用例与 diff 不依赖它。

## 5. 依赖与注意事项

- 根候选表里 `ModuleDeclarationPossibleShape` 为启用状态（chunk 1 改的一行）。chunk 3 从 `origin/integration`
  合并 `cover-declarations-2` 与 `cover-module-blocks-2` 时，只有 `source-file-shape.xl.md` 的候选表冲突：
  两次都按「保留 integration 现状 + 打开 `FunctionDeclarationPossibleShape`（declarations-2 的贡献）、
  保留 `ModuleDeclarationPossibleShape` 启用」解决，未删/未重排其它候选行。
- 模块体成员复用 `StatementBuilder` 与 declarations 已合入的 `ClassDeclarationShape` / `InterfaceDeclarationShape` /
  `EnumDeclarationShape` / `FunctionDeclarationShape` 的 `FromUnits`；本 chunk 没有改这些文件，也没有改 core。
- `ModuleDeclarationPossibleShape` 对 `export` / `declare` 开头先答「不确定」，第二个代码单元才定；
  `declare global` 也走这条（要求 `declare` 在前、后面紧跟 `{`），不会挡住 import / export 候选。

## 6. 读数

- `module-blocks`：**58 / 58 完全一致**（结构差 0、位置差 0、字段差 0）；chunk 4 新增 14 条。
- 全量：integration 基线 **2337 / 2337**（23 个构造）→ chunk 4 后 **2351 / 2351 全绿**，无回归。

## 7. chunk 4：ambient module / namespace 里的无体函数声明

**新增用例**（`module-blocks.ts` 44 → 58，append-only +14）：

- `declare module "m" { function f(): void; }`、`declare module "m" { function f(a: A): B; }`、
  `declare namespace N { function f(): void; }`、`declare namespace N { function f(a: A): B; }`；
- 两条无体函数同体：`declare module "m" { function f(): void; function g(): void; }`；
- 与已有成员混合：`let x: number; function f(): void;`、`function f(): void; interface I {}`、
  `interface I {} function f(): void;`、`function f(): void; let x: number;`；
- `export` 修饰的无体函数：`declare module "m" { export function f(): void; }`、
  `declare namespace N { export function f(): void; }`（`BuildMember` 先提出 `ExportKeyword`，建完无体函数后插回 `Data` 最前）；
- trivia：`function f(): void /* c */ ;`、`{function f():void;}`。

**修法**（`module-block-shape.xl.md` 的 `BuildMember` 一处）：

- 原来只扫本层第一个 `{` 括号当体；现在扫的时候对 `function` 家族额外认**本层第一个 `;`**：
  `;` 先到 → 无体函数，`dataEnd` 取 `;` 在括号 `Data` 里的下标，直接
  `FunctionDeclarationShape.FromUnits(bracket, dataStart, dataEnd)`（该形状本来就支持「最后一块是 `;`」）；
  `{` 先到 → 有体函数，走原路径。`Pos` 仍用本层 `Positions` 覆盖。
- 不需要零宽合成 `;`：模块体里的 `;` 是真实 token（`declare module "m" { function f(): void; }` 里那个分号就在
  `Bracket.Data` 里），直接以它为 `tokenIndex` 即可。`from core/**` 一行未动，function/class/interface 声明文件也一行未改。

**仍红 / 暂缓**（TS 合法，用例里写成 `//` 目标）：

| 写法 | 原因 |
| --- | --- |
| `declare module "m" { function f(); }` | `FunctionDeclarationShape` 规则是「无体且无 `declare` 时必须有返回类型」；ambient 上下文隐含 `declare`，需要声明形状侧改（不在本块 write scope） |
| `namespace N { function* f() {} }` / `declare module "m" { function* f(): void; }` | `BuildMember` 与 `FunctionDeclarationShape` 都不认 `*`（generator star）——generator 形状还没接到函数声明路径 |
| `declare module "m" { async function f(): void; }` | `BuildMember` 只认 `export` 修饰；`async` 也不在声明形状里 |
| `export as namespace X;` | cover-module-1 所有者（`NamespaceExportDeclaration`） |

## module body：嵌套 function / async / generator / using（cover-module-body-1）

chunk 3 之后，模块体里的这些成员已经全部能与 TS AST 对齐（oracle 用 `ts.createSourceFile` 逐条验过 `parseDiagnostics` 为空）：

- 嵌套 function：`namespace N { function f() {} }`、`async function f() {}`、`function* g() { yield 1; }`、
  `async function* h() {}`，以及 `declare namespace` / `declare module` 里无体的 `async function f(): void;`、
  `function* g(): void;`；
- `using` / `await using` 在模块体里：`namespace N { using x = a; }`、`namespace N { await using x = a; }`；
- export 修饰：`namespace N { export function f() {} }`、`export async function f() {}`、`export function* g() { … }`、
  `export async function* h() { … }`、`export using x = a;`（TS 的 children 顺序是 `[ExportKeyword, …成员自己的 children]`）；
- 已有的 class / interface / enum 成员无回归。

机制说明：这几种成员**不需要改 `ModuleBlockShape.BuildMember`**——`function` 族（含 `*` / 无体 `;`）早已走
「扫第一个 `{` 括号 → FunctionDeclarationShape.FromUnits」；`async function` / `async function*` / `using` /
`export using` 则落到 `StatementBuilder.BuildStatement`（嵌套函数与 using 分派在 statements 家族已实现），
`export` 修饰词仍由 BuildMember 提出、插回成员 `Data` 最前并修正 `Pos`。本 chunk 的工作是补测量并确认这些路径。

## module globals / 嵌套 namespace / 无体模块（cover-module-globals-1）

- 点分与嵌套 namespace：namespace A.B.C {}、module A.B {}、namespace A { namespace B {} }、
  namespace A { namespace B { interface I {} } }、declare namespace N { namespace Inner { class C {} } }；
  实现：ModuleBlockShape.BuildMember 新增 namespace / module 分派，直接调 ModuleDeclarationShape.FromUnits
  （传本层非 trivia 单元切片与对应 Positions），内层声明按 TS 的嵌套 ModuleDeclaration 结构建。
- declare global {} / declare global { interface Window {} }：module-declaration 候选与形状原本已支持，本 chunk 补测量。
- export as namespace X;：顶层已绿；模块体内的 declare module "m" { export as namespace X; } 新增成员分派——
  TS 的 NamespaceExportDeclaration children 没有 ExportKeyword，所以该成员由 BuildMember 直接调
  NamespaceExportDeclarationShape.FromUnits（起始格含 export）并跳过修饰词插回。
- declare module "m"; 无体 ambient module：候选 Scan 增加「declare + module + 字符串名 + 分号」到齐分支；
  ModuleDeclarationShape.FromUnits 支持无体形态（children 只有修饰词 + 名字，区间到分号为止）。
- 模块体内 import x = require("n"); / export import x = require("n");：BuildMember 新增 import-equals 分派，
  复用 ImportEqualsDeclarationShape.FromUnits；有 export 时仍按普通修饰词插回最前。
- 暂缓（原因）：declare module "m" { import x from "n"; } —— ImportDeclarationShape 没有 FromUnits，
  需要 import 家族改动，超出本 chunk 写范围；function f(); 这类无体无返回类型 ambient 函数同理留在 deferred。

## module-body import declarations（chunk module-imports）

- `ImportDeclarationShape.FromUnits(host, start, end)` 新增：host 是 module block 的 `Bracket`，切片就是该成员在
  `bracket.Data` 里的 token；复用既有 children 形状 —— ImportClause（可带 `type` 修饰、`IsTypeOnly`）、
  NamedImports（`shape.FromBracket`）、NamespaceImport（`shape.FromTokens`）、default `Identifier`、以及
  module `StringLiteral`；位置口径与 TS 对齐（ImportClause/名字/绑定 Pos = 前一个非 trivia token 的 End+1；
  NamedImports/NamespaceImport Pos = `import`/`type`/逗号之后；module StringLiteral Pos = `from`.End+1；
  声明本身 Pos 由调用方按成员起点设置，SignOut 到 `;`）。side-effect `import "n";` 只装 StringLiteral。
- `ModuleBlockShape.BuildMember` 的 `import` 分支：原来只认 `import x = require(...)`（有 `=`），现在无 `=` 时
  扫到 `;` 后调 `ImportDeclarationShape.FromUnits`，不改根 import 候选。
- 新增全绿用例（module-blocks.ts，+11）：`declare module "m" { import x from "n"; }`、
  `{ import { a, b } from "n"; }`、`{ import * as ns from "n"; }`、`{ import "n"; }`、
  `namespace N { import x from "n"; }`、`{ import type { T } from "n"; }`，以及行尾注释/换行/词间块注释变体；
  回归：module 体内 `import x = require("n")` 仍绿。
- 暂缓：module 体内带 attributes 的 import（`import x from "n" with {…}`）需要 FromUnits 再接 attributes 段；
  `export import x = require(...)` 之外的 export+import 组合不在本 chunk。
## module-body imports 2：attributes + entity-name aliases（chunk module-imports-2）

- `ImportDeclarationShape.FromUnits` 现在解析尾随 attributes 段：module StringLiteral 之后可跟 `with`/`assert` +
  `{ … }`，用既有 `ImportAttributesShape.FromBracket(bracket, "with"|"assert", context)` 建（Pos =
  模块字符串 Token End+1），side-effect 形（`import "n" with {…};`）同样接上；`Close` 原有 assert/attributes 分派继续生效。
  TS children：ImportDeclaration > [ImportClause?] + StringLiteral + AssertClause/ImportAttributes。
- 新增全绿用例（module-blocks.ts，+10）：`declare module "m" { import x from "n" with { type: "json" }; }`、
  `{ import { a } from "n" with {…}; }`、`{ import "n" with {…}; }`、legacy `assert`、`{ import type { T } from "n" with {…}; }`、
  多属性，以及行尾注释/多行 `with`/词间块注释变体；另加 `namespace N { export import A = B.C; }`（绿）。
- entity-name import alias（import.ts，+2 全绿）：`import A = B.C;`（ImportEqualsDeclaration → Identifier +
  QualifiedName（harness 侧 TS 反查名 FirstNode 已有别名））、回归 `import A = require("n")`。
- 暂缓（超出本 chunk 写范围）：根级 `export import A = B.C;` —— 根 `import` 候选在 `export` 前缀下先建
  ImportDeclarationShape shell 并在 Close 报「缺少模块说明符」；要修需要改 import 候选分派 / export-import 组合
  （import-declaration-possible / export 侧），按任务边界只记录不硬改。