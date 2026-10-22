# cover9 possbuild-class（块体/语句位匿名 `class {}` 恢复 AST，12 形）报告

- 克隆：`C:\Users\Admin\Documents\GitHub\xl-example-set\cover9-possbuild-class`
- 分支：`cover9-possbuild-class`，起点 `b465cf6e`（`merge: cover9-missingpossible`），不 push / 不 merge 主仓
- 范围：`typescript/tokens/statements/statement-builder.xl.md`、
  `typescript/tokens/declarations/class-declaration-shape.xl.md`、
  `typescript/tokens/declarations/module-block-shape.xl.md`、`typescript/cases/possible-build.ts` 及其两份快照、
  本文件。**`core/**` 与 `typescript/IMPORTANCE.md` 零改动**；`.gitattributes` 本分支**未改**（本批用例
  不需要 lone CR，全部用行内 `\n` 转义）。
- 目标 stem：`possible-build`（基线 155 条用例，本批 **+18**）。
- oracle：TypeScript 6.0.3 `ts.createSourceFile`，口径 `parseDiagnostics.length === 0` 且本仓 crash / AST 三栏
  任一不一致才算红。

## 0. 用户裁定记录

`docs/end-close-analysis.md` §7 曾把 `class {}`（TS 造无名字 `ClassDeclaration`）列为「TS 静默恢复，
建议记为 TS-recovery、不追（交用户决定）」。cover9 survey 报告 §5.2 复测出块体形 12 条，并把裁定交给用户。
**本轮用户裁定：追 TS 的静默恢复 AST**（块体 / 语句位匿名 `class {}` 也建无名字 `ClassDeclaration`）。
本报告的全部改动以这条裁定为前提；`throw\na;` 那条 TS 静默恢复不在本批范围（未动）。

## 1. 读数一览（修复后）

| 门禁 | 读数 |
|---|---|
| `node typescript/cases/ast-json.mjs` | **6008 / cj-ok 6008 / cj-fail 0**（5990 + 18；47 构造） |
| `node typescript/cases/ast-json-diff.mjs` | **6008/6008；结构 0 / 位置 0 / 字段 0** |
| 单 stem `possible-build` | cases=173 cj-ok=173 cj-fail=0；173/173 完全一致（155 + 18） |
| `node typescript/cases/token-ast.mjs --quiet` | **total 1715 / ok 1705 / crash 0 / diff 0 / ts-invalid 10**（与基线一致） |
| `node tests/parse/validate.mjs` | **1719 条用例 / 0 条不合格**（该门禁分母是 `tests/cases/**`，不含 `typescript/cases/*.ts`，M=0） |
| `node typescript/cases/real-dts-ast.mjs` | **226 文件 / 226 成功 / 崩溃 0 / AST 完全一致 226** |
| `.\node_modules\.bin\tsc.cmd -p tsconfig.json` | exit 0 |
| `xl_check(typescript, targets=["ts"], ignore=W3102/W3103/E2004)` | **811 文件 / 0 error**（仅 1 条既有 E1107 warning；新增成员都带描述） |
| `git diff b465cf6e..HEAD -- core typescript/IMPORTANCE.md` | 空 |
| 官方 `node tests/cover9/probe.mjs --quiet` | **red=20 / green=68**（O 组不在 `candidates.json`，与基线一致；exit 1 是存储值过期，预期） |

> 12 条 O 形不在官方 `tests/cover9/candidates.json` 里（它们来自 `cover9-survey-candidates.json`），
> 所以官方 probe 的 red/green 计数不变；O 组的逐条证据用 survey 探针口径（见 §3）与本报告的 dump 复跑。

## 2. 根因与修复（file:line）

### 2.1 根因

- `typescript/tokens/statements/statement-builder.xl.md:529` 的 `BuildClassDeclaration` 只把
  `AllowAnonymousClass`（字段 `:84`）当作唯一的放行开关，而这个开关**只在 export default 路径**
  （`BuildDefaultModifierStatement`，`:685-689`）打开。块 / 体 / 语句位的匿名 `class {}` 走
  `ClassDeclarationShape.FromUnits`（`class-declaration-shape.xl.md:87`）→ `BuildFromUnits(...allowAnonymous=false)`
  → `:232` 抛「class declaration requires a name」。
- namespace 体是第二条路径：`typescript/tokens/declarations/module-block-shape.xl.md` 的 `BuildMember`
  直接调 `ClassDeclarationShape.FromUnits`（旧 `:554`），同一个缺口（O15）。
- 12 条输入 **TS 都是 `parseDiagnostics=0`**，AST 是**无名字的 `ClassDeclaration`**（TS 恢复产物），
  没有 Identifier child；区间从 `class` 关键字（若有修饰词/装饰器则从修饰词）到类体 `}`。

### 2.2 修法（一份判据，三个调用点共用）

1. `class-declaration-shape.xl.md:101` 新增 `static method HasNoName:(units, start, end)=>bool`：
   在声明头里找 `class` 关键字，看它后面（跳过 trivia）的第一个代码单元——类体括号 / `extends` /
   `implements` ⇒ 没有名字（`class {}` 时那个单元就是类体括号，`next == end`）。这是**纯判据**，
   不建形状、不读原文以外的信息。
2. `statement-builder.xl.md:562`：`BuildClassDeclaration` 的放行条件改成
   `this.AllowAnonymousClass || ClassDeclarationShape.HasNoName(this.Units, first, end)`；
   命中就走 `FromUnitsAllowAnonymous`（`:565`）。export default 路径的旧开关保持原样。
3. `module-block-shape.xl.md:556`：`keyword === "class"` 分支按同一判据二选一
   （`HasNoName(...) ? FromUnitsAllowAnonymous(...) : FromUnits(...)`）。

没有新增候选 / 终结候选、没有改 `ComputeByIndex`、没有新增扫描 cache：本批只在**已判定为声明并开始
build** 之后决定「名字可选」，不改变任何 possible compute 的时机；`HasNoName` 只扫这条类声明的头，
线性一遍、不进入 compute 循环。

## 3. 12 条逐条红→绿证据（candidates O08–O19）

修前 12/12：`red-crash: class declaration requires a name`；修后 12/12：`green`（TS diag=0，三栏 0/0/0）。

| id | input | 修后 AST（TS 与 CJ 一致） |
|---|---|---|
| O08 | `function f(){ class {} }` | `FunctionDeclaration[0,24) Identifier[8,10) Block[12,24) ClassDeclaration[13,22)` |
| O09 | `function f(){ class { m() {} } }` | `… Block[12,32) ClassDeclaration[13,30) MethodDeclaration[21,28) Identifier[21,23) Block[25,28)` |
| O10 | `function f(){ class extends B {} }` | `… ClassDeclaration[13,32) HeritageClause[19,29) ExpressionWithTypeArguments[27,29) Identifier[27,29)` |
| O11 | `function f(){ class\n{} }` | `… ClassDeclaration[13,22)`（换行不影响无名判定） |
| O12 | `{ class {} }` | `Block[0,12) ClassDeclaration[1,10)` |
| O13 | `if (a) { class {} }` | `IfStatement[0,19) Identifier[4,5) Block[6,19) ClassDeclaration[8,17)` |
| O14 | `class C { m(){ class {} } }` | `ClassDeclaration[0,27) Identifier[5,7) MethodDeclaration[9,25) … Block[13,25) ClassDeclaration[14,23)` |
| O15 | `namespace N { class {} }` | `ModuleDeclaration[0,24) Identifier[9,11) ModuleBlock[11,24) ClassDeclaration[13,22)` |
| O16 | `function f(){ class {}\nfoo() }` | `… ClassDeclaration[13,22) ExpressionStatement[22,28) CallExpression[22,28) Identifier[22,26)` |
| O17 | `function f(){ // c\nclass {} }` | `… Block[12,29) ClassDeclaration[13,27)`（注释作为 trivia 不影响） |
| O18 | `function f(){ class {}\nclass {} }` | `… ClassDeclaration[13,22) ClassDeclaration[22,31)`（重复形） |
| O19 | `class C { m(){ class {} } }` | 与 O14 **输入重复**（candidates.json 里 notes 不同、input 相同）；AST 同 O14，用例不重复收录 |

补充实测（修前同为 crash、修后 green，已入用例）：`{ abstract class {} }`（`AbstractKeyword[13,22)`）、
`function f(){ @dec class {} }`（`Decorator[13,18) Identifier[15,18)`）、`if (a) class {}`、
`while (a) class {}`、`{ class extends B {} }`、`function f(){ class implements I {} }`。

红线证据（同 18 行用例、把 3 个 `.xl.md` 还原到基线后重建）：**18/18 crash「class declaration requires
a name」**（`tmp/cover9-red-before.txt`）；恢复修复重建后 **18/18 green**。

## 4. 四问（IMPORTANCE §3.3 候选 / 终结候选模型）

1. **何时 build**：不变——语句位 / 块体位的 `class` 声明仍由既有声明候选在「声明完整（类体 `}` 到齐）」
   那一格 build；本批只把「名字是否必需」放开，不改候选与终结候选的时机。
2. **build 提什么**：**无名字的 `ClassDeclaration`**：children = 修饰词 / 装饰器（`abstract` / `@dec`）→
   可选 `HeritageClause` → 成员（Method / Property / Constructor …）；**没有 Identifier child**；
   `Pos` 取含前导 trivia 的声明起点（与 TS `pos` 同口径）。
3. **何时 close**：类体 `}` 到齐时 `ClassDeclarationShape.FromUnitsAllowAnonymous` 按既有口径
   `TryToClose`；`StatementBuilder` 把 `At` 推到类体括号之后的下一格（`:At = end + 1`）。
4. **close 提什么**：区间 `ClassDeclaration[class 起点, 类体 } 末)`（含修饰词/装饰器，不含之后语句）；
   `name` 字段为空（TS 恢复 AST 没有名字），成员区间由各自成员构建器给出；`class` / `{` / `}` 不进 children。

## 5. 新增用例（`typescript/cases/possible-build.ts` 末尾 cover9 段，**18 条**）

- 段落位置：`:285` 起，用例 `:294`–`:316`，一行一例、`\n` 用转义（本批无 lone CR，故 `.gitattributes`
  未改；若与 cover9-possiblebuild 分支合并，那一行 `possible-build.ts -text` 由对方分支带进来即可）。
- base → 变体：函数体裸匿名 class（base）→ 成员 / heritage / 换行 → 裸块 / if 块 / if 体 / while 体 →
  方法体 / namespace 体（ModuleBlockShape 路径）→ 后接语句 / 注释前 / 两个连排 → 修饰词 `abstract` /
  装饰器 `@dec` / 裸块 heritage / `implements`。
- 12 条 O 形里 **11 条唯一输入全部收进用例**（O14/O19 输入相同，只收一次）；其余 7 条为本轮确认同根因的
  补充形（修前均 crash，修后 green）。
- 去重：与本 stem 现有 155 条无精确重复；`export default class {}` 早已绿，未重复收录。

## 6. basic-token 是否牵涉

**不牵涉、未改 `core/**`**。匿名 `class {}` 的字符承接（`class` 词、`{}` 括号、`extends` 词）全部沿用
既有 basic token，本批只在 build 阶段决定「名字可选」；token-ast 1715 与基线逐项一致（crash 0 / diff 0），
没动词法。

## 7. 遗留 / 风险

1. **恢复 AST 的边界**：本批判据覆盖「`class` 后直接是类体括号 / `extends` / `implements`」。TS 还有一些
   更松的恢复形（例如 `class extends {}` 这类表达式位歧义、`declare class {}` 在块内的合法性问题）——
   未在 candidates 里、也未在本批输入集中，若后续要做需逐条与 TS `parseDiagnostics` 对拍。
2. **TS 另一条静默恢复 `throw\na;` 未动**（end-close-analysis §7 同批登记；用户本轮裁定只针对 class，
   后续若裁定追，需要合成零宽 Identifier 的恢复形状）。
3. **无名字 ClassDeclaration 的 name 字段**：AST 侧不设 name（与 TS 一致）；若未来有消费者假设
   `ClassDeclaration.name` 必非空，需要在那侧处理，本仓 AST 投影已按 TS 恢复形输出。
4. **`~` 范围外的语法**：JSX / `.tsx` 仍按 IMPORTANCE §8 不支持。

## 8. 改动文件清单

| 文件 | 改动 |
|---|---|
| `typescript/tokens/declarations/class-declaration-shape.xl.md` | `:101` 新增 `HasNoName` 判据（`class` 后无名字的静态判定）；既有 `:87` `FromUnits` / `:93` `FromUnitsAllowAnonymous` 不动 |
| `typescript/tokens/statements/statement-builder.xl.md` | `:562` `BuildClassDeclaration` 的放行条件加 `ClassDeclarationShape.HasNoName(...)`，命中走 `:565` `FromUnitsAllowAnonymous` |
| `typescript/tokens/declarations/module-block-shape.xl.md` | `:556` namespace/module 体的 `class` 成员按同一判据走 `FromUnitsAllowAnonymous`（O15 路径） |
| `typescript/cases/possible-build.ts` | 末尾 cover9 段 **+18** 条（`:285` 起） |
| `typescript/cases/possible-build.{cj,ts}-ast.json` | `node typescript/cases/ast-json.mjs possible-build` 重新生成（173 条） |
| `docs/cover9-possbuild-class.md` | 本文件 |
