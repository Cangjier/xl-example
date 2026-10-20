# module / namespace 块覆盖（chunk 1 + chunk 2）

本页记 `typescript/cases/module-blocks.ts` 收了什么、怎么实现、还差什么。口径是
`node typescript/cases/ast-json.mjs` + `node typescript/cases/ast-json-diff.mjs`（本分支唯一权威 AST 尺子）。

## 1. 已落地

**chunk 1（base）**：`namespace N {}`、`namespace N { <语句> }`（体内用 statements 的语句建树器：
`let` / `const` / `var`、块、空语句、`if`）、`module N {}` / `module N { … }`（关键字不同、同一种节点）、
`declare module "m" {}`（字符串模块名 + `declare` 修饰）、`declare namespace N {}`、
`export namespace N {}`（`export` 修饰）、限定名 `namespace A.B {}` / `A.B.C`（TS 的嵌套 `ModuleDeclaration` 结构）。

**chunk 2（augmentation）**：

- module augmentation 的成员语句：`declare module "m" { let x: number; }`（typed 变量，statements chunk 2 提供）、
  `declare module "m" { const x = 1; }`、多条语句 / trivia 变体；
- `export` 修饰的成员语句：`declare module "m" { export let x: number; }`
  （TS 的 `VariableStatement` children = `[ExportKeyword, VariableDeclarationList]`，修饰词由模块体提出并放在 `Data` 最前）；
- global augmentation：`declare global { let x: number; }`（TS 节点仍是 `ModuleDeclaration`，
  名字直接是 `Identifier "global"`，没有 namespace/module 关键字）；
- 模块体里的接口声明（空体）：`declare module "m" { interface I {} }`、`namespace N { interface I {} }`、
  以及 `export interface` 形态（`InterfaceDeclarationShape.FromUnits`，本 chunk 只调用、不改 interface 文件）。

实现方式（`typescript/tokens/declarations/`）：

| 文件 | 职责 |
| --- | --- |
| `module-declaration-possible-shape.xl.md` | 根级候选：扫 `[export\|declare] namespace\|module` 或 `declare global` + 名字 + 可选 `.` 链 + 闭合 `{…}`；`BuildByIndex` 只消费到 `{` 那一格。 |
| `module-declaration-shape.xl.md` | 建树：修饰词 / 名字 / 体进 `Data`（= AST children）；限定名按 TS 嵌套建 `ModuleDeclaration`，只有最内层挂 `ModuleBlock`；`global` 走「名字 = global、无关键字」分支。 |
| `module-block-shape.xl.md` | `{…}` → `ModuleBlock`：逐个成员 `BuildMember`——普通语句交 `StatementBuilder`，`export` 修饰的语句把 `ExportKeywordShape` 插到 `Data` 最前并回写 `Pos`，`interface`（空体）交 `InterfaceDeclarationShape.FromUnits`。 |
| `module-block-possible-shape.xl.md` | **仍是桩**（见 §4 决策）：模块体走「闭合括号单元 → 一次建完」的原子路径，没有候选目录；等真正的挂载型需求（例如非闭合边界的增量增补）出现再实现，本 chunk 不需要。 |

为什么用「原子建树」而不是挂载型：`{ … }` 在词法层已经是**一个闭合的括号单元**，所以「到齐」= 这个单元出现在
`host.Data` 里，一次 `splice` 建完整棵；augmentation 的 `declare module "m" { … }` 与普通命名空间同形，
成员语句/接口声明都在括号单元的 `Data` 上递归建，不需要壳 + 终结候选两层。

三条对 `ast-json` 重要的口径：

- **不设 `Name` / `Modifiers` 字段**：TS 侧对 `ModuleDeclaration` 不比 `name`，投影字段表里也没有它；
  名字 / 修饰词只作为 `Data` 里的子节点（`Identifier` / `StringLiteral` / `ExportKeyword` / `DeclareKeyword`），
  多立字段会凭空多出字段差。
- **限定名的嵌套位置**：`namespace A.B {}` 里 TS 的 `ModuleDeclaration B` 的 `pos` 是 `A` 的 `End + 1`、
  `end` 是整条声明右边界（与最外层相同）；建树按 `positions[名字下标]` 给内层 `Pos`，每层 `SignOut` 到模块体结尾。
- **模块体成员的 `Pos`**：`StatementBuilder` 用「`{` 的下一个位置」起算（与 TS 一致）；接口声明用
  `InterfaceDeclarationShape.FromUnits` 后必须用本层 `Positions` 覆盖 `Pos`——它只看 `host.Data` 前一个单元，
  括号内下标从 0 起时会算成 0。带 `export` 的成员 `Pos` 回到修饰词起点。

## 2. 用例

`module-blocks.ts` 共 31 条：M1 `namespace` 基形（空体 / 单条 / 多条 / 空语句 / 嵌套块 / 体内 `if`）、
M2 `module` 关键字、M3 `declare module "m"`、M4 `export namespace`、M5 trivia（词间注释 / 行尾注释 + 换行）、
M6 限定名（`A.B` / `A.B.C` / 体内有语句）与 `declare namespace N`、M8 module augmentation（typed 变量 /
`export` 修饰 / `const` / 多语句 / 换行）、M9 `declare global`、M10 模块体里的空接口声明、M11 augmentation 的 trivia。
`\n` 由生成器还原成真实换行。

## 3. 暂缓（写成 `//` 目标行，未煮进用例）

| 目标 | 原因 / 依赖 |
| --- | --- |
| `declare module "m" { function f(): void; }` | 依赖 declarations 的 `FunctionDeclaration`（未合入） |
| `export as namespace X;` | 属 cover-module-1（`NamespaceExportDeclaration`） |
| 非空接口体 / `interface I extends …` | 属 declarations 的接口批次（本批只收空体） |
| 组合修饰 `export declare module`、`declare module "m"` 内部再开 `module` | 后续 chunk；前者需要修饰词组合判定 |

## 4. 决策：`module-block-possible-shape.xl.md` 保持桩

模块体在本架构里不是独立候选宿主：`{…}` 是**单个闭合括号单元**，成员在它的 `Data` 上由
`StatementBuilder` / `InterfaceDeclarationShape.FromUnits` 递归建，没有「还差一个单元、等终结候选」的时刻。
因此 `ModuleBlockPossibleShape` 在本 chunk 没有任何消费者，保持桩（与 `*-possible-shape` 桩的既有约定一致），
等出现挂载型需求（如非闭合边界、增量增补）再实现；用例与 diff 不依赖它。

## 5. 依赖与注意事项

- 根候选表里 `ModuleDeclarationPossibleShape` 为启用状态（chunk 1 改的一行）；从 `origin/integration` 合并时
  与 declarations-1 的 `EnumDeclarationPossibleShape` 行冲突，按「两侧都启用」解决（Enum + Module 同时启用）。
- 模块体成员复用 `StatementBuilder`（typed 变量由 statements chunk 2 提供）；本 chunk 只调用
  `InterfaceDeclarationShape.FromUnits`，没有改 interface / class / enum / function 文件。
- `ModuleDeclarationPossibleShape` 对 `export` / `declare` 开头先答「不确定」，第二个代码单元才定；
  `declare global` 也走这条（要求 `declare` 在前、后面紧跟 `{`），不会挡住 import / export 候选。

## 6. 读数

- `module-blocks`：**31 / 31 完全一致**（结构差 0、位置差 0、字段差 0）；其中 chunk 2 新增 10 条。
- 全量：integration @9c44730f 基线 1433 → + chunk1 21 = 1454 → + chunk2 10 = **1464 / 1464 全绿**
  （14 个构造，0 结构差 / 0 位置差 / 0 字段差，无回归）。
