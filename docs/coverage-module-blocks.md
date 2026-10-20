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

- `module-blocks`：**44 / 44 完全一致**（结构差 0、位置差 0、字段差 0）；chunk 3 新增 13 条。
- 全量：integration 基线 1561 → 合并 declarations-2 + chunk2 后 1592（含 module-blocks 31）→ chunk 3 后
  **1605 / 1605 全绿**（16 个构造，0 结构差 / 0 位置差 / 0 字段差，无回归）。
