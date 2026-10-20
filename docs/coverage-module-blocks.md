# module / namespace 块覆盖（chunk 1）

本页记 `typescript/cases/module-blocks.ts` 这一轮收了什么、怎么实现、还差什么。口径是
`node typescript/cases/ast-json.mjs` + `node typescript/cases/ast-json-diff.mjs`（本分支唯一权威 AST 尺子）。

## 1. 本轮落地

根级可达：`namespace N {}`、`namespace N { <语句> }`（体内用 statements chunk 1 的语句建树器，
已收 `let` / `const` / `var` 语句、块、空语句、`if`）、`module N {}` / `module N { … }`（关键字不同、同一种节点）、
`declare module "m" {}`（字符串模块名 + `declare` 修饰）、`declare namespace N {}`、
`export namespace N {}`（`export` 修饰）、限定名 `namespace A.B {}` / `A.B.C`（TS 的嵌套 `ModuleDeclaration` 结构）。

实现方式（`typescript/tokens/declarations/`）：

| 文件 | 职责 |
| --- | --- |
| `module-declaration-possible-shape.xl.md` | 根级候选：扫 `[export\|declare] namespace\|module` + 名字 + 可选 `.` 链 + 闭合 `{…}`；`BuildByIndex` 只消费到 `{` 那一格。 |
| `module-declaration-shape.xl.md` | 建树：修饰词 / 名字 / 体进 `Data`（= AST children）；限定名按 TS 嵌套建 `ModuleDeclaration`，只有最内层挂 `ModuleBlock`。 |
| `module-block-shape.xl.md` | `{…}` → `ModuleBlock`：把括号单元的 `Data` 交给 `StatementBuilder` 逐条建语句。 |
| `module-block-possible-shape.xl.md` | **仍是桩**：本 chunk 的模块体是「闭合括号单元 → 一次建完」的原子路径，没走候选目录；挂载型留给 chunk 2（augmentation / `global`）。 |

为什么用「原子建树」而不是挂载型：`{ … }` 在词法层已经是**一个闭合的括号单元**，所以「到齐」= 这个单元出现在
`host.Data` 里，一次 `splice` 建完整棵；不需要壳 + 终结候选两层。等 augmentation 出现（`declare module "m" { … }`
里再开 `namespace` / 插值式增补）再补挂载型。

两条对 `ast-json` 重要的口径：

- **不设 `Name` / `Modifiers` 字段**：TS 侧对 `ModuleDeclaration` 不比 `name`，投影字段表里也没有它；
  名字 / 修饰词只作为 `Data` 里的子节点（`Identifier` / `StringLiteral` / `ExportKeyword` / `DeclareKeyword`），
  多立字段会凭空多出字段差。
- **限定名的嵌套位置**：`namespace A.B {}` 里 TS 的 `ModuleDeclaration B` 的 `pos` 是 `A` 的 `End + 1`、
  `end` 是整条声明右边界（与最外层相同）；建树按 `positions[名字下标]` 给内层 `Pos`，每层 `SignOut` 到模块体结尾。

## 2. 用例

`module-blocks.ts` 共 21 条：M1 `namespace` 基形（空体 / 单条 / 多条 / 空语句 / 嵌套块 / 体内 `if`）、
M2 `module` 关键字、M3 `declare module "m"`、M4 `export namespace`、M5 trivia（词间注释 / 行尾注释 + 换行）、
M6 限定名（`A.B` / `A.B.C` / 体内有语句）与 `declare namespace N`。`\n` 由生成器还原成真实换行。

## 3. 暂缓（写成 `//` 目标行，未煮进用例）

| 目标 | 原因 / 依赖 |
| --- | --- |
| `namespace N { function f() {} }` | 依赖 declarations 的 `FunctionDeclaration`（未启用） |
| module augmentation（`declare module "m" { … }` 的增补形态 / 省略体） | chunk 2；需要挂载型与终结候选 |
| `export as namespace X;` | chunk 2（`NamespaceExportDeclaration`） |
| `global` augmentation（`declare global {}`） | chunk 2（`ModuleDeclaration` 的 `GlobalAugmentation` 标志） |
| 体内类 / 接口 / 枚举声明 | 依赖 cover-declarations-1 |

## 4. 依赖与注意事项

- 根候选表只把 `new ModuleDeclarationPossibleShape()` 一行从注释改为启用；候选顺序、其余 27 行注释未动。
- `ModuleDeclarationPossibleShape` 对 `export` / `declare` 开头先答「不确定」，等第二个代码单元（`namespace` / `module`）
  才定；因此 `export { a }` / `export const a = 1` / `declare import …` 在第二格 `Reject`，不会挡住 import / export 候选
  （全量 1221 条无回归）。
- 体内语句复用 `StatementBuilder`：`{…}` 内部的 `Pos` 取 `{` 的下一个位置（与 TS 一致），无需新写语句子系统。
- 构建口径：`xl_build({cwd, targets:["ts"], paths:["core","typescript"]})`（整树会因
  `cjcli.xl.md` 引用已删除的 `dawn/text/*.xl.md` 而 0 产物），再 `tsc -p tsconfig.json`。

## 5. 读数

- `module-blocks`：21 / 21 完全一致（结构差 0、位置差 0、字段差 0）。
- 全量：本分支基线 1200 / 1200 → `1200 + module-blocks 21 = 1221 / 1221` 全绿；expression / import / export /
  statements / types / literals / members / string / number / regex / end 无回归。
