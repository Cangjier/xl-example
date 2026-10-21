# import / export 收口：当前 AST 对拍剩余红点属于哪一类问题

本文件回答两件事：**跑完全量 AST 对拍之后，剩下的红点到底是 IMPORTANCE §6 七类里的哪一类**，
以及**按「何时 build / build 提什么 / 何时 close / close 提什么」该怎么修**。
它不改任何 shape、不碰 `core/**`，只记录本轮只读分析与探针读数。

## 1. 基线读数

```text
node typescript/cases/ast-json.mjs        → 4402 / 4402 cj-ok（30 个构造，0 崩溃）
node typescript/cases/ast-json-diff.mjs   → 4402 / 4402 完全一致；结构差 0 / 位置差 0 / 字段差 0
```

即：**用例集本身是全绿的**。剩下的红点不在 `typescript/cases/*.ts` 的生效行里，而在两类地方：
case 文件里用 `//` 记录、没有生效的 deferred 形态，以及把边界再推远一格的变体（尾随空白 / 尾随注释 / 无分号后接语句）。

## 2. 探针方法与读数

把 case 里 `//` 记录的 deferred 形态与边界变体抽成 `tmp/reds-all.json`（105 条，去重后），
用 `tmp/probe-reds.mjs` 逐条跑「TS `ts.createSourceFile` 的 AST vs 本仓 `SourceFileRunner.Parse` 的形状树」，
口径与 `ast-json-diff.mjs` 完全相同（结构 / 位置 / 字段三栏）。

```text
105 条探针：45 条与 TS 不一致
  其中 34 条是 shape 层真红（三组，见 §3）
  其中  8 条 TS 自己 parseDiagnostics ≠ 0（尺子不测：export attrs 换行 ASI、export declare/abstract 换行、
        class C<T<U>>、import source、export … with 换行）
  其中  3 条 TS 静默恢复（parseDiagnostics = 0，但 AST 是恢复产物：throw\na;、class {}）
```

对照组全绿：`class` / `function` / `enum` / `interface` / `type` / `const` / `namespace` /
`export const` / `export class` 的 EOF 尾注释；带 `;` 的 import / export；`import x = require("m")`；
`export default <expr>` 到 EOF；`declare function …` 多声明混排；`export default abstract class C {}`（同行）等。

## 3. 红点分组与 §6 归类

| 组 | 形态 | 条数 | 现象 | §6 归类 |
| --- | --- | --- | --- | --- |
| **A** | import / export 声明**无分号到 EOF**，且尾随空白 / 换行 / 行注释 / 块注释 | **19** | 结构、字段都对，**只有声明 `End` 被撑到 trivia 末尾**（`import x from "m" // c`：TS `0-17`，本仓 `0-22`） | **end build 不对**（close 时 End 取错单元） |
| **B** | import / export 声明**无分号**，换行后接下一语句（另一条 import/export、class、表达式） | **6** | import：`ImportDeclarationShape.Close: 未识别的单元（Common）` 抛错；export：两条被并成一条（少一个 `ExportDeclaration`） | **end compute 不对**（终结候选漏 ASI 判据） |
| **C1** | `export = <expr>` 无分号（EOF / 尾注释 / 后接语句） | **6** | `ExportAssignment` 整条丢失，被兜底成 `ExpressionStatement(BinaryExpression(export = expr))` | **缺少 end**（export= 没有无分号收口路径） |
| **C2** | `export default <expr>` 换行后接**表达式语句**（含 `export default abstract\nclass C {}`） | **3** | `export default 的表达式没有读完` 抛错；`abstract` 那条把 `class` 当成了 default class 的修饰链 | **possible compute 不对**（ExportDeclaration 候选不认 ASI 边界）＋ **缺少 end**（export default 表达式没有 ASI 收口） |
| **D** | TS 自身非法 / 静默恢复 | 11 | 8 条 TS 有诊断；3 条 TS 恢复成零宽 Identifier / 无名 ClassDeclaration | 不是 shape 问题（见 §7） |

**结论：34 条真红全部落在 `end` 这一族（end build / end compute / 缺少 end），
不涉及 basic token、不涉及「缺少 possible」，也不涉及 possible build。**
`possible compute` 只在 C2 出现一次（ExportDeclaration 候选该在边界 Reject 却没有）。

## 4. 证据链（每组根因）

### A 组：EOF 收口走了通用 `TryToClose`，End 取到最后那个 trivia

- `SourceFileShape.Process` 的 EOF 分支先关挂载单元：
  `mounted.TryToClose(context); mounted.Quit();`
  （`typescript/tokens/files/source-file-shape.xl.md:107-111`）
- `ShapeToken.TryToClose` 的兜底是**最后一个 `Data` 单元**的终点：
  `const last = this.Last(); … this.SourceRange.End = tail;`
  （`core/syntax/shape-token.xl.md:53-61`）
- 挂载壳的 `Data` 在 `Close` 之前**故意保留 basic token**（含 trivia；Close 里才按白名单过滤，
  见 `import-declaration-shape.xl.md:245-295`），所以 `Last()` 就是尾随空白/注释 → End 被撑大。
- 探针 trace（`import x from "m" // c`）：

  ```text
  ROOT.Process EOF mounted=ImportDeclarationShape[0-21]
    SHELL TryToClose End=21 last=LineAnnotation[18-21]
    SHELL Close Data=[import, WrapSymbol(" "), ImportClause, …, StringLiteral[14-16], WrapSymbol(" "), LineAnnotation[18-21]]
  ```

- **壳自己的终结候选没有错，只是没被叫到**：`ImportDeclarationEndPossibleShape` /
  `ExportDeclarationEndPossibleShape` 的 `ComputeByIndex` 里都有 EOF 分支
  （`units[tokenIndex] instanceof EndOfFileTokenShape` → `Accept`），`BuildByIndex` 也会取
  「最后一个非 trivia」签出（`…-end-possible-shape.xl.md:59-63 / 137-149`）。
  但 EOF 路径在造 EOF 哨兵**之前**就 `TryToClose` 了壳，终结候选永远看不到 EOF。
- 补充：`WrapSymbol.Close` 明确**不问父单元**（`wrap-symbol.xl.md`），所以尾随空白这一支连
  「重算候选」都不会触发——这也说明 A 组只能从 close 时取值这一侧修。

### B 组：两个终结候选的 `ComputeByIndex` 漏了 ASI 边界

- 两个 `…DeclarationEndPossibleShape.ComputeByIndex` 只认两种情况：
  最后一个代码单元是 `;`，或当前单元是 EOF 哨兵；其余一律 `Reject`
  （`import-declaration-end-possible-shape.xl.md:56-63`、`export-declaration-end-possible-shape.xl.md:57-64`）。
- 两个文件里都写了 `CanEndAt(units, last)`——恰好吃「行注释结尾」与「换行后接新语句」，
  但 **`git grep CanEndAt` 只有两处定义、零个调用点**：判据写好了却没接线。
- trace（`import x from "m"\nimport y from "n"`）：

  ```text
  END ImportDeclarationEndPossibleShape#5  unit=String[14-16]  => Reject   ← "m" 之后的判据
  END ImportDeclarationEndPossibleShape#7  unit=Common("import")[18-23] => Reject   ← 下一条语句的起点
  GUIDE ImportDeclarationShape#7 cand 3->0 => Waiting   ← 普通候选此刻已全灭
  ```

  `export { a } from "m"\nexport { b } from "n"` 同理：第二条 `export` 那一格 `cand 4->0`。
  也就是说**边界那一刻 `Candidates == 0`，接上 `CanEndAt` 就能收口，不会触发
  `CatalogGuide` 的「终结候选与其它候选同时成立」**。
- 唯一要小心的时机：`Accept` 必须发生在「下一条语句第一个**代码**单元」那一格。
  在换行 trivia 或最后一个代码单元（如 `String`）上 `Accept` 时候选还活着，才会触发那条共存抛错
  （这也是历史上「raw lookahead Accept 一试就炸」的原因）。

### C1 组：`export = <expr>` 没有无分号收口

- `ExportAssignmentPossibleShape.ComputeByIndex` 只在 `;` 上置 `Done`；
  遇到 EOF 直接 `state.Rejected = true`（`export-assignment-possible-shape.xl.md:74-78`、`:93-102`）。
  `IsBuildable` 又要求 `Done && DoneAt === tokenIndex`（`:116-121`）→ EOF 处永不 build。
- `SourceFileEndPossibleShape.BuildTrailingDeclaration` 的 EOF 兜底只认
  `type` / `import … =` / `function` / `class` / `interface` / `export const` / `export default`，
  **没有 `export =`**（`source-file-end-possible-shape.xl.md:155-392`）→ 落回
  `ExpressionStatementShape.FromUnits(...)`，于是 `export = 1` 被当成赋值表达式。
- trace（`export = 1 // c`）：`END SourceFileEndPossibleShape.BuildByIndex` → 根 children 只剩
  `ExpressionStatementShape[0-9]`。

### C2 组：`export default <expr>` 的 ASI 边界没人认

- `ExportDeclarationPossibleShape` 把 `export default …` 一路吃到下一句的 `;` 才 `Accept`，
  然后 `BuildByIndex` 抛「export default 的表达式没有读完」
  （`export-declaration-possible-shape.xl.md:1224`）。trace（`export default x\na;`）：
  `ExportDeclaration` 在 `a` 那一格仍是 `Uncertain`，最后在 `;` 上 `Accept` → Build 抛错。
- 根终结候选也救不了：`ExpressionStatementPossibleShape.IsAsiBoundary` 第 5 条——
  「本条语句起点是语句/声明关键字（含 `export`）时，该换行不是 ASI 边界」——
  把 export 开头的条目整条排除了（`expression-statement-possible-shape.xl.md:338-350`）。
- `export default abstract\nclass C {}` 还多一层：`abstract` 在 `IsStatementWord` 表里，
  即便走专用 ASI 通道，也要在那条通道里单独把它当「表达式尾」。

## 5. 五个问题的答案

- **正确的应该什么时候 build**
  - A 组：不新增 build 时机。EOF 收口仍由壳自己 `TryToClose`；要改的只是「取 End 的那一步」。
  - B 组：下一条语句第一个**代码**单元到达时（换行 + `CanEndAt` 成立），由终结候选 `BuildByIndex` 收口。
  - C1：EOF（`BuildTrailingDeclaration` 补 `export =` 分支，或无分号入口）。
  - C2：下一条语句第一个代码单元处，走根终结候选的专用 export-default ASI 通道（Build 成 `ExportAssignment`）。
- **build 时应该提取哪些信息**
  - 统一只取：起始位置（`SignIn` 已在 `import` / `export` 关键字上）+ **最后一个非 trivia 代码单元**的 End。
  - 字段各归各：import → `ImportClause` / `ModuleSpecifier` / `Attributes`；
    export → `ExportClause` / `ModuleSpecifier` / `Attributes`；export-assignment → `Expression`。
  - trivia（空白 / 行注释 / 块注释）永远不参与 End，也不参与字段。
- **什么时候 close**
  - 三条边界：`;`（已实现）、**ASI 边界（B 组缺、C2 缺）**、EOF（已实现，但 A 组走成了通用 `TryToClose`）。
  - C1 的 close 时机是 EOF。
- **close 时应该提取哪些信息**
  - End = 最后一个**非 trivia** 子单元的 `SourceRange.End`（不能直接用 `Last()`）；
  - Start 已在 `SignIn` 时定下；
  - 字段从子形状提取；basic token 残留按白名单校验后丢弃（现有 `Close` 逻辑保留）。

## 6. 建议修法（三处，全部在 `typescript/` 层，不动 `core/**`）

1. **P1（修 A，19 条）——close 时 End 跳过 trivia。**
   `ImportDeclarationShape` / `ExportDeclarationShape` 覆写 `TryToClose`：End 仍为空时，
   从 `Data` 末尾跳过 `IsTriviaToken`，取最后一个代码单元的 End 再交给基类。
   局部改动、`CatalogGuide` / `ShapeToken` 契约不变。
   （备选是在 `ShapeToken.TryToClose` 里统一改，但那会影响所有形状，不建议本轮做。）
2. **P2（修 B，6 条）——终结候选接线 `CanEndAt`。**
   两个 `…DeclarationEndPossibleShape.ComputeByIndex` 在 `;` 之后、EOF 之前加一条：
   「当前单元是代码 && 与 `LastCode` 之间有换行 && `CanEndAt(units, LastCode)`」→ `Accept`。
   因为 `Accept` 只落在这条语句之后的新代码单元上，`Candidates` 此刻已经为 0，不会撞共存抛错。
3. **P3（修 C，9 条）**
   - `BuildTrailingDeclaration` 增 `export =` 分支（与 `isExportDefault` 同款：`ExpressionBuilder` +
     `ExportAssignmentShape`，End 取最后一个代码单元）；
   - `ExportDeclarationPossibleShape` 在 `export default <expr>` 完成 + 换行 + 新语句起点处 `Reject`；
   - 根终结候选加专用 `IsExportAssignmentBoundary`（或在 `IsAsiBoundary` 末尾加 export-default 例外），
     Build 走 `ExportAssignment`；`abstract` 情形在同一通道里放行。
4. **用例**：新增 `typescript/cases/end-import-export.ts`（或 append 到 `end-declarations.ts`），
   覆盖 A 19 + B 6 + C 9 + 对照组；修完重跑 `ast-json.mjs` / `ast-json-diff.mjs` 全量，
   预期 4402 → 4436 左右全绿。

## 7. 留给用户决定 / 明确不需要动的东西

- **basic token：本轮不需要你拍板任何一条。** 旧账里怀疑的两个 basic-token 场景都已证伪：
  `class C<T<U>>` 与 `export … \nwith {…}`（export attrs 换行 ASI）TS 自己 `parseDiagnostics ≠ 0`，
  属尺子不测；尾随注释撑大 End 是 close 时取值问题，不是 trivia 基本单元的问题。
- **TS 静默恢复（3 条）是否要追**：`throw\na;`（TS 造零宽 `Identifier`、`ThrowStatement` 只到 `throw`）、
  `class {}`（TS 造无名字 `ClassDeclaration`）。它们 `parseDiagnostics = 0` 但 AST 是恢复产物，
  要追就得合成零宽节点 / 恢复形状；建议记为 TS-recovery、不追（交你决定）。
- **C2 的 `export default abstract\nclass …`**：TS 合法（把 `abstract` 当标识符表达式），
  但属上下文关键字的边角；建议随 C2 通道一起收，若不想扩大范围可单独暂缓。
- **JSX / `.tsx`**：已由 `typescript/IMPORTANCE.md` 第 8 条定为不支持，不追。

## 8. 落地状态（按用户决定先解决 A、B 两组）

**A + B 已转绿**，改动只在 `typescript/tokens/declarations/` 的 4 个规范页（未碰 `core/**`）：

| 组 | 修点 | 文件 |
| --- | --- | --- |
| A | 挂载壳覆写 `TryToClose`：只在「壳还挂载着」时重算 End = 最后一个**非 trivia** 代码单元的 End。实现时发现 EOF 收尾有**两条**污染路径：`ShapeToken.TryToClose` 的 `Last()` 兜底，以及 `SyntaxContext.Process` 末尾对根 `SignOut` 后递归 `TrySignOut` 到挂载壳（`End` 被写成最后一个字符的下标）；`FromUnits` 建出来、从不挂载的入口保持原有 `SignOut` 结果（它们的 End 合法地落在 `;` 上，而 `;` 不在形状 `Data` 里） | `import-declaration-shape` / `export-declaration-shape` |
| B | 两个终结候选的 `ComputeByIndex` 接线 ASI：当前格是**下一条语句的第一个代码单元**、与前一个代码单元之间有换行、且 `IsCompleteAt`（声明结构已完整）× `CanEndAt`（下一行不是延续关键字）同时成立才 `Accept`。`BuildByIndex` 的 ASI 支路把这一格从壳 `Data` 里摘出来、还给父单元，再关闭并卸下壳（`;` 与 EOF 两条老路原样保留） | `import-declaration-end-possible-shape` / `export-declaration-end-possible-shape` |

实现中踩到的两个坑（已写进规范页注释）：

1. **`IsCompleteAt` 必须按「结构已完整」判**，只看「后面有换行」不够：`import x\nfrom "m"`、`import type\n{ T }`、
   `export { a }\nfrom "m"`、`import x from "m" with\n{…}` 这些换行后的单元仍属于同一条声明；
   `CanEndAt` 的延续关键字表因此从 `with` / `assert` 扩到 `from` / `as` / `type` / `defer`。
2. **`;` 与 EOF 必须留在老路径**：`BuildByIndex` 里若把「非 EOF」一律当 ASI，会连 `;` 一起还给父单元
   （`;` 变 `EmptyStatement`、`CatalogGuide` 报「终结候选与其它候选同时成立」）。

**读数（本分支）**

```text
新 stem typescript/cases/end-import-export.ts：46 条，46/46 完全一致
全量 ast-json / diff：4448 / 4448 完全一致（基线 4402 + 46，31 个构造）；结构差 0 / 位置差 0 / 字段差 0
105 条 deferred 探针：45 red → 20 red（A 19 + B 6 全绿；剩下的 20 = C 组 9 + TS 恢复/非法 11，见 §3）
tsc 0 error；xl_check 0 error（仅仓库既有 W3102/W3103 文档类 warning）
```

**仍未做**：C 组（`export =` / `export default <expr>` 的无分号收口，9 条）按用户指示留到下一轮。
