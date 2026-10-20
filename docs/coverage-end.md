# end / possible 第 1 块：ASI 断句 + EOF 边界 + CanStart `[`

本文件记录 `cover-end-1` 这一批的**实际落地内容、判据口径、读数与剩余目标**。
分析依据见 `docs/expression-ast-analysis.md` §4.3 / §4.6 / §5.2；本批不动 `core/**`。

## 1. 落地了什么

| 文件 | 改动 |
| --- | --- |
| `typescript/tokens/statements/expression-statement-possible-shape.xl.md` | ASI 判据（`IsAsiBoundary` 及其四个静态助手 `IsStatementWord` / `HasLineBreak` / `CanEndExpression` / `IsContinuation`）；`ComputeByIndex` 见到边界主动 `Reject`；`CanStart` 放开 `[` |
| `typescript/tokens/files/source-file-end-possible-shape.xl.md` | 根终结候选：除 EOF 哨兵外，认 ASI 边界并 `Accept`；`BuildByIndex` 分两条路——ASI 走 `FromUnits(..., false)` 只建「换行处结束的那一条」，EOF 保持原有收尾 |
| `typescript/cases/end.ts`（+ 两份快照） | 新增 53 条 end 用例：EOF 族 / ASI 正反两族 / trivia 叠加 / 重复形 / 数组字面量 |

没有用 `ExitOrPre` 结束 shape，没有覆盖 `ComputePossibleShapes`，`CatalogGuide` 契约一个字没改：
普通候选在边界上 `Reject` → `Candidates == 0` → 终结候选 `Accept` 并建那一条。

## 2. ASI 判据（四条同时成立才断句）

1. 当前单元是**代码**（trivia 与 EOF 哨兵都不算）；
2. 它前面还有代码单元 `prev`，且 `prev` 能收住一条完整表达式（`CanEndExpression`）；
3. `prev` 与它之间至少有一个**换行 trivia**（空白块里的 `\n` / `\r`，以及块注释里的换行都算）；
4. 当前单元**接不上**上一条表达式（`IsContinuation` 为假）。

要点：`;` 不是 ASI 边界（`a\n;` 仍是一条）；`a +\nb` 里 `+` 收不住表达式所以不断；
`typeof\na` / `export\n{ a }` 这类关键字不是操作数，`CanEndExpression` 与 `CanStart` 共用同一张
`IsStatementWord` 排除表。`(` / `[` / 反引号模板 / 二元与赋值标点 / `in` / `instanceof` 都是延续符，
所以 `a\n+b`、`a\n(b)`、`a\n[0]`、`a\n.b`、``a\n`t` `` 仍是一条。

## 3. CanStart 本轮只放开 `[`

`[a, b];`、`[];`、`[\na,\nb,\n];`、`[a, b].c;`、`[a][0];` 全部转绿（builder 的 `ParsePrimary` `[` 分支本来就绪）。

`// ` 目标（本批不放，各有依赖）：
- `// `<`：尖括号断言 / 泛型箭头 —— 缺 `ParseType`（Tier 2）
- `// `async`：缺箭头函数产生式
- `// `import`：`import.meta` —— 缺 `MetaProperty` 分支（且要先修 `ImportDeclarationPossibleShape` 的 compute 与 close 自检）
- `// `{`：块 / 对象二义 —— 需要先有块候选

## 4. 读数

```text
node typescript/cases/ast-json.mjs        → 835/835 cj-ok（7 个构造）
node typescript/cases/ast-json-diff.mjs   → 835/835 完全一致；结构差 0 / 位置差 0 / 字段差 0
node typescript/cases/ast-json-diff.mjs end → 53/53 完全一致
node tmp/probe-eof.mjs（主仓 tmp，只读复跑）→ 23/23 一致（EOF 既有语义未变）
xl check（paths: core + typescript）→ 0 error（2175 warning，与基线同族）
```

基线 782/782 未回退；`import` / `export` / EOF 族（23/23）语义保持不变。

## 5. 未做 / 已知边界

- `new-line-trivia-possible-shape.xl.md` **仍是桩**（`throw 未实现`）：它没有被任何 `CatalogGuide` 注册，
  本批的换行判据落在表达式语句候选与根终结候选上（§5.2 的「同一候选的第二条判据」路线）。
  要把它做成真形状，得先有一个收 newline trivia 的宿主目录，属于更后面的一轮。
- **`a\nimport b from "m";` 这一类会抛「终结候选与其它候选同时成立」**：ASI 边界那一刻 `import`
  普通候选还活着，而 `CatalogGuide` 规定「终结候选 Accept 且 Candidates > 0 → 抛错」，`core` 不许改。
  这类输入现在也没有任何用例覆盖（改动前同样失败，只是错误不同），列在下一 chunk 处理。
- 数组字面量内部只验到已有 builder 能建对的形态；`[...a]`（展开）、`[a, ...b]` 未收。

## 6. 下一 chunk 建议

1. 终结候选拆细：给「ASI 断句」一个能按「下一条语句起点」判定的独立通道，解掉 §5 第二条；
2. Tier 2 `ParseType` 入口（`as` / `satisfies` / 泛型实参 / 尖括号断言），随 CanStart 放开 `<`；
3. 箭头函数产生式 → CanStart 放开 `async`；`import.meta` → 放开 `import`；
4. 补齐 `new-line-trivia` 形状（若决定把 ASI 做成真实单元形态）。

## 7. 构建口径

fresh clone 里 `xl_build` **不传 paths** 会因 `cjcli.xl.md` 的 dead import（`dawn/text/*`）中止、写 0 个产物。
本批用的命令是 `xl_build({ cwd: <clone>, targets: ["ts"], paths: ["core", "typescript"] })`（854 files / 0 error），
再 `node .\node_modules\typescript\bin\tsc -p .\tsconfig.json`。改单个文件时 `paths` 只给改过的文件即可。

## 8. chunk 2（cover-end-2）：声明条目的体前换行不是 ASI 边界

**修点**：`ExpressionStatementPossibleShape.IsAsiBoundary` 增加第 5 条——先找出**本条语句的起点**（从 `prev` 往回跳过属于自己的 basic token，遇到建好的形状就停），
若起点是语句 / 声明关键字（复用 `IsStatementWord`：`class` / `interface` / `enum` / `declare` / `function` / …），则该处换行**不是** ASI 边界。
`class C\n{}` 的 `{` 是类体、`C` 只是声明头，那里不存在「上一条表达式」，根终结候选不再 `Accept`，声明候选照常把 `{` 吃进声明。
`CatalogGuide` 契约未改，无 `ExitOrPre`，未覆盖 `ComputePossibleShapes`。

**证据**：新 stem `typescript/cases/end-declarations.ts`（37 条）37/37 完全一致：
class / interface / enum / declare class / declare interface 的空体、`{ }`、多行体、多行枚举成员；
声明头与 `{` 之间的块注释 / 行注释 / 空行；多条声明连排；以及表达式 ASI 回归（`a\n++b;`、`a\nb;`、`a\n+b;`、`a\n(b);`、`[a, b];`、`a\nb\nc;`）。

**读数（本分支）**：全量 ast-json / diff **1376/1376**（1339 + 37），结构差 0 / 位置差 0 / 字段差 0；xl_check 0 error。

**明确未收（原因写在用例里，不是静默跳过）**：带成员的体前换行
（`class C\n{\nx: number;\n}`、`interface I\n{\na: number;\n}`、`declare class C\n{\nx: number;\n}`、`declare interface I\n{\na: number;\n}`）
——类 / 接口成员需要 types 家族的 class element shapes（declarations chunk 1 已明确暂缓，见 `docs/coverage-declarations.md`）；
同行写法 `class C { x: number; }`、`interface I { a: number; }` 同样红，说明红点与「体前换行」无关。
`end-declarations.ts` 里以 ``// `` 目标 + 原因保留。

**仍然存在（chunk 1 记录的通用边界）**：`a\nimport b from "m";` 会抛「终结候选与其它候选同时成立」
（import / export 候选在边界那一刻仍活，`CatalogGuide` 不许改，需要 `core` 之外的独立通道）；本块未处理。

## 8. end-declarations chunk 2：声明条目在 EOF 的收口（缺分号的 type alias / import-equals）

**新增用例**（`typescript/cases/end-declarations.ts` append-only，37 → 76，+39 条）：

- EOF 族：`function f() {}` / `function f(a: A): B { return a; }` / `enum E { A }` / `type T = A;` /
  `namespace N {}` / `module N {}` / `module "m" {}` / `declare module "m" {}` / `import x = require("m");`
  单条结尾；尾部换行 / 尾部注释变体（`class C {}\n`、`class C {} // c`、`class C {}\n// c` 等）；
  两条声明背靠背到 EOF（class+class / class+interface / function+class / enum+type / namespace+class / interface+enum）。
- 声明之间的换行边界：`class C {}\ninterface I {}`、`function f() {}\nclass C {}`、空行 / 行注释分隔、
  `type T = A;\nclass C {}`、`import x = require("m");\nclass C {}`。
- 体前换行补齐：`function f()\n{}`、`function f(a: A): B\n{\nreturn a;\n}`、`module N\n{}`、`namespace N\n{}`。
- 无分号 vs 必须分号（oracle：TS 两种都合法）：`type T = A`、`import x = require("m")`、
  `type T = A;\ninterface I {}`、`class C {}\ntype T = A;`。
- ASI 回归（原有行保留）：`a\n++b;`、`a\nb;`、`a\n+b;`、`a\n(b);`、`[a, b];`、`a\nb\nc;`。

**发现并修掉的真实缺口**（唯一改动 xl 源的地方，`source-file-end-possible-shape.xl.md`）：

- 现象：文件以 `type T = A` 或 `import x = require("m")` 结尾（无 `;`）时，两条都抛
  `表达式语句没有读完`——声明候选在 EOF 不 `Accept`，终结候选的 EOF 兜底一律按
  `ExpressionStatementShape.FromUnits(..., false)` 建最后一条，于是把声明当表达式解析。
- 修法：EOF 兜底前先试 `BuildTrailingDeclaration`：只认 `type` 开头与 `import <名> = …`（`code[2]` 是 `=`），
  在最后一个真实代码单元后补一个**零宽合成 `Symbol ";"`**（`SignIn(End)` + `AppendValueAndSignOut(";", End)`，
  所以 `Is(";")` 成立、`End.Index + 1` 正好是声明右边界），再走
  `TypeAliasDeclarationShape.FromUnits` / `ImportEqualsDeclarationShape.FromUnits` 的正常入口；
  其余老路径不变。
- 为什么不是改声明候选：`TypeAliasDeclarationPossibleShape` / `ImportEqualsDeclarationPossibleShape`
  不在本块 write scope（也不该把「EOF 也是终结符」塞进 declaration possible）；终结候选本来就是
  「这一条到头了」的判定点。
- 未改任何 declaration shape 文件，未碰 `core/**`。

**读数（本分支）**：`end-declarations` **76/76 完全一致**；全量 ast-json / diff **1773/1773**
（基线 1734 + 39），结构差 0 / 位置差 0 / 字段差 0，无回归；tsc 0 error；xl_check 0 error（仅仓库既有 W3102/W3103 文档类 warning）。

**仍暂缓**：`declare function f(): void;` / `declare function f()\n{}`（无体函数声明需要声明侧的 end 候选，
declarations 尚未收）；带成员的体前换行（归 cover-members-1）；`a\nimport …` 的「终结候选与其它候选同时成立」
仍是 chunk 1 记录的通用边界，本块未处理。

## 9. end-declarations chunk 3：无体函数声明的 EOF 收口

**落地**（`end-declarations.ts` 76 → 89，+13）：

- 无体函数声明在 EOF（无分号）：`declare function f(): void`、`declare function f(a: A): B`、
  `declare function f()`（无返回类型，只有 declare 允许）、重载签名 `function f(a: A): B`；
- 带分号 / 尾注释 / 尾换行 / `declare` 与 `function` 之间换行：`declare function f(): void;`、
  `declare function f(): void // c`、`declare function f(): void\n`、`declare\nfunction f(): void`
  （后者 TS 是「ExpressionStatement`declare` + FunctionDeclaration」两条，靠下面的连排拆分对齐）；
- 两条无体声明背靠背（无分号 / 带分号）；与其它声明相邻：`class C {}\ndeclare function f(): void`、
  `function f() {}\ndeclare function g(): void`、`class C {}\nfunction f() {}`。

**修法**（`source-file-end-possible-shape.xl.md` 的 `BuildTrailingDeclaration`）：

1. 函数族：`function` 开头或 `declare function` 开头；无体时在最后一个代码单元后补**零宽合成 `Symbol ";"`**
   （`SignIn(End)` + `AppendValueAndSignOut(";", End)`，与 chunk 2 同款）再调
   `FunctionDeclarationShape.FromUnits`——该形状本来就支持「最后一块是 `;`」的形态；
   有体时直接以 `}` 为 `tokenIndex` 调 `FromUnits`。
2. 多条无分号声明连排：找**最后一个换行后出现的声明起点**，前缀递归建（建不出来按
   `ExpressionStatement(…, false)` 收尾），后缀递归建。`declare function f(): void\ndeclare function g(): void`
   与 `declare\nfunction f(): void` 都靠这条转绿。
3. 紧邻的 `class … {}`（作为后缀/单条）：以 `}` 为 `tokenIndex` 调 `ClassDeclarationShape.FromUnits`。
   未改任何 declaration shape 文件，未碰 `core/**`。

**读数（本分支）**：`end-declarations` **89/89 完全一致**；全量 ast-json / diff **2100/2100**
（基线 2087 + 13），结构差 0 / 位置差 0 / 字段差 0，无回归；tsc 0 error；xl_check 0 error
（仅仓库既有 W3102/W3103 文档类 warning）。

**chunk 3 仍红（TS 合法；写成用例里的 `//` 目标，不静默跳过）**：

- `declare function f(): void\nclass C {}`、`function f(a: A): B\nfunction f(a: A): B { return a; }`
  ——「无体声明在前、带体声明在后」的多条连排：`FunctionDeclarationPossibleShape` 在 EOF 边界仍活，
  先于根终结候选建，报「函数声明的返回类型没有读完」。修法在 declarations 侧（让该候选在 EOF `Reject`
  或给声明自身加 end 候选），不属于本块 write scope。
- `export declare function f(): void`（`FunctionDeclarationShape` 不认 `export` 修饰）、
  `declare type T = A`（`TypeAliasDeclarationShape` 不认 `declare` 修饰）——同属声明形状侧的修饰支持。

## 10. end-declarations chunk 4：带成员的 class / interface 在 EOF 的收尾

**落地**（`end-declarations.ts` 89 → 103，+14；全部 green，**无需改动任何 shape**）：

- class 带成员到 EOF：`class C { m() {} }`、`class C {\n  x = 1;\n}`、尾随换行 `… }\n`、
  尾随行注释 `… } // c`、尾随块注释 `… } /* c */`；
- interface 带成员到 EOF（成员无分号也合法）：`interface I { a: number }`、
  `interface I {\n  a: number;\n}`、尾随注释 `interface I { a: number } // c`；
- `declare class C { m(): void; }` 到 EOF；
- 两条声明到 EOF：`class C { m() {} }\ninterface I { a: number }`、反向 `interface I { a: number }\nclass C {}`；
- 体前换行 + 成员：`class C\n{ m() {} }`、`interface I\n{ a: number }`、`class C\n{\n  m() {}\n}`。

**为什么不需要改 `source-file-end-possible-shape`**：这 14 条都在**声明候选自己的建树路径**上收尾——
类体 / 接口体是一个已经闭合的魔号单元，候选在体闭合后直接 `Accept`/建树，不落到根终结候选的 EOF 兜底；
chunk 3 加的「紧邻 class（以 `}` 为 tokenIndex）」兜底在本批也没有被触发。也就是说 chunk 2/3 记录的
「带成员的体前换行/EOF」红点是**成员形状未合入**造成的，成员形状合入后自然转绿，不属于 end 层缺口。

**读数（本分支）**：`end-declarations` **103 / 103 完全一致**；全量 ast-json / diff **2667 / 2667**
（基线 2653 + 14），结构差 0 / 位置差 0 / 字段差 0，无回归；tsc 0 error；本轮没有改 xl 源文件（xl_check 与基线一致）。

**仍暂缓**（TS 合法；写成用例里的 `//` 目标）：chunk 3 记录的「无体声明在前、带体声明在后」多条连排
（`declare function f(): void\nclass C {}` 等，归 declarations 侧让候选在 EOF `Reject`）；
`a\nimport …` 的「终结候选与其它候选同时成立」通用边界（chunk 1 记录，需 core 之外的独立通道）。

## 11. EOF 声明混排（chunk 3 报告的 known red）

**落地**（`end-declarations.ts` 103 → 109，+6）：

- `declare function f(): void\nclass C {}` → 2 条语句（FunctionDeclaration + ClassDeclaration）；
- `function f(a: A): B\nfunction f(a: A): B { return a; }`（overload + implementation 到 EOF）；
- `declare function f(): void\ninterface I {}`、`interface I {}\nclass C {}`（后者本来已绿，补进用例集对照）；
- `type T = A\nclass C {}`（类型别名在前、class 在后到 EOF）；
- 回归对照：`declare function f(): void\ndeclare function g(): void`（chunk 3 已绿）。

**修法（两处，均在 write scope 内）**：

1. `function-declaration-possible-shape.xl.md`：Stage 3 / Stage 4 增加 **ASI Reject**——
   若当前代码单元是「statement word」（复用 `ExpressionStatementPossibleShape.IsStatementWord`）且与
   前一个代码单元之间**有换行**（新增 `LineBreakBefore`：按 Source 区间逐字符找 `\n` / `\r`，块注释里的换行也算），
   则本候选 `Reject`。于是 `declare function f(): void\nclass …` 不会再把 `class C {}` 当成返回类型 / 函数体。
   `class/interface` 形状文件未改。
2. `source-file-end-possible-shape.xl.md` 的 `BuildTrailingDeclaration`：混排家族补 `interface`
   （含 `declare interface`，走 `InterfaceDeclarationShape.FromUnits(host, start, at)`，`at` 落在 `}` 上）；
   另外前缀递归可能建出**多条**声明（如 `declare function …` 前缀自身再拆），所以后缀起点不再假设
   `start + 1`，而是从 `Data` 里现数「前缀建出的连续 non-trivia 形状个数」再推。

**读数（本分支）**：`end-declarations` **109 / 109 完全一致**；全量 ast-json / diff **2797 / 2797**
（基线 2791 + 6），结构差 0 / 位置差 0 / 字段差 0，无回归（declarations 276、end 53、export 等 stem 全绿）；tsc 0 error。

**仍暂缓**：三条混排（`declare function f(): void\nclass C {}\ninterface I {}`）——前缀递归在「前缀自己再拆两条」
时还没有把第二条的边界传回来，属 BuildTrailingDeclaration 的递归返回约定，写成用例里的 `//` 目标；
`a\nimport …` 的候选共存边界（chunk 1）仍未处理。

## 12. 装饰器换行 ASI（`@dec\nclass C {}`）

**根因（探针定位）**：`@dec\nclass C {}` 的 token 流是 `@`、`dec`、空白(`\n`)、`class`、…。
类候选在 `@` 处已接过装饰器、**存活**；而在 `class` 那一格，根终结候选的 `IsAsiBoundary` 成立
（前一个代码单元 `dec` 能收住表达式、中间有换行、`class` 是 statement word 不是延续符）→ 终结候选 `Accept`；
此时 `Candidates` 里还有类候选 → `CatalogGuide` 抛「终结候选与其它候选同时成立」。探针读数：
`@dec\nclass C {}` 下标 3、`@a @b\nclass C {}` 下标 6、`@dec()\nclass C {}` 下标 4、`@dec\nabstract class C {}` 下标 3；
`@a class A {}\n@b class B {}`、成员装饰器换行（`class C { @dec\nm() {} }`、`@dec\nx = 1;`）本来就是绿的。

**修法（只改 `source-file-end-possible-shape.xl.md`，未动 core、未动 class candidate）**：
`ComputeByIndex` 在 `IsAsiBoundary` 成立后，再用新增的 `HasDecoratorPrefix(units, tokenIndex)` 往前看：
把「`.` / Common / `(…)` 括号单元」当作装饰器表达式的一部分往回走，碰到 `@` 就说明这段是**下一条声明的装饰器前缀**，
于是返回 `Uncertain`（不当 ASI 边界、不 Accept），把边界留给还在吃装饰器的类候选。判据只认「`@` 前缀」这一种形态，
普通 `a\nclass C {}` 的 ASI 行为不变（类候选在那条里早已 `Reject`）。

**用例**（`declarations.ts` append-only，+10）：`@dec\nclass C {}`、`@a @b\nclass C {}`、`@dec()\nclass C {}`、
`@dec(a)\nclass C {}`、`@dec\nabstract class C {}`、`@a\nclass A {}\n@b\nclass B {}`、`@dec\n\nclass C {}`、
`@dec /* c */\nclass C {}`、`@dec\nclass C {}\nclass D {}`、`class C { @dec\n x = 1; }`；
成员装饰器换行（`class C { @dec\nm() {} }`）与单行装饰器（`@dec class C {}`）已在既有组，作为对照保留。

**读数（本分支）**：`declarations` **315 / 315 完全一致**；全量 ast-json / diff **3053 / 3053**
（基线 3043 + 10），结构差 0 / 位置差 0 / 字段差 0，无回归（decorator / using-declarations / end-declarations 109 全绿）；tsc 0 error。

**仍暂缓**：`@dec` 与声明之间插入**其他语句**的写法（TS 本来非法，不列用例）；装饰器元数据 / 参数装饰器 / 接口·枚举上的装饰器
仍是 declarations 家族后续 chunk；chunk 11 的两条暂缓（三条声明混排、`a\nimport …` 共存边界）不变。

## 13. declare ASI 拆句 + 尾注释 EOF（declare-var 的两条 deferred）

**根因（探针定位）**
1. `declare\nconst x: number;`：TS 拆成 2 条（`ExpressionStatement(declare)` + `VariableStatement`）。
   本仓语句候选在 `declare` 后换行时已 `Mismatch`，但根终结候选的 `IsAsiBoundary` 也不成立
   （`declare` 是 statement word、`CanEndExpression` 为假），于是到 EOF 落进 `ExpressionStatement` 兜底 → 「表达式语句没有读完」。
2. `declare const x: number // c\n`：变量语句没有分号、到 EOF 时语句候选仍 `Accept`（`ScanToSemicolon` 的 AtEOF 收口），
   与终结候选同时成立 → `CatalogGuide` 抛「终结候选与其它候选同时成立」。同族现象在普通 `const x = 1 // c\n` 上也存在（既有 quirk）。

**修法（只改 statement-scanner + source-file-end，未动 core）**
- `statement-scanner`：`ScanToSemicolon` 增加可选 `stopAtEof`；`let/const/var` 与 `declare + 变量关键字` 两个入口传 `true`，
  EOF 时 `Mismatch` 而不是按 ASI 自收——把 EOF 尾部的变量语句让给根终结候选。
- `source-file-end` `BuildTrailingDeclaration`：新增变量语句族兜底（`const/let/var/using` 开头，或 `declare` + 变量关键字开头），
  用 `StatementBuilder` 按正常语句路径补建（`DeclareKeyword` 子节点与 `Pos` 由 builder 处理）；
  多条连排的边界关键字补 `const/let/var/using`，于是 `declare\nconst …` 被拆成两条语句，与 TS 逐节点一致。

**用例**（`declarations.ts` append-only，+13）：`declare\nconst x: number;`、`declare\nconst x = 1;`、`declare\n\nconst x: number;`、
`declare /* c */\nconst x: number;`、`declare const x: number // c\n`、`declare const x: number /* c */`、`declare let y: string // c\n`；
同族既有 quirk 一并转绿：`const x = 1 // c\n`、`let y: string\n`；controls：`declare const x: number;`、`declare function f(): void;`、`a\n++b;`、`a\nb;`。

**读数（本分支）**：`declarations` **481 / 481 完全一致**；全量 ast-json / diff **3432 / 3432**
（基线 3419 + 13），结构差 0 / 位置差 0 / 字段差 0，无回归（statements / end-declarations / expressions 等 stem 全绿）；tsc 0 error。
# end / possible �?1 块：ASI 断句 + EOF 边界 + CanStart `[`
> **ASI boundary 2**����֧ `cover-asi-boundary-2`����� `origin/integration @d8077d98`����
> `end-declarations.ts` **109 �� 121**��+12����`asi-import-boundary.ts` **31 �� 40**��+9������ stem ȫ�̣�
> ȫ�� **3419 �� 3440** ȫ�̣�tsc 0 error��`import` 66/66 �޻ع顣
>
> **A. ������ EOF ���ţ����ޣ�**�������� `BuildTrailingDeclaration` ��ǰ׺/��׺�ݹ���Լ��ǰ׺�ݹ����һ�ν���**����**����
> ������`declare function f(): void\nclass C {}` ǰ׺���Ƚ� declare function���ٲ� class�������ɺ�׺��λ��
> `at + inserted - (prefixEnd - start + 1)` ���������� ����ǩ��/type/import ǰ׺�ڲ�������ϳ� `;` �� splice��
> ��ƫ�Ʊȹ�ʽ��һ�񣻢� inserted ֻ����start ������ non-trivia����������״֮��� trivia ʱ���**�ڶ�������״**���ɺ�׺��㡣
> �ĳɣ���׺��� `cursor` �������� trivia **���ѽ���״���� basic token��**����׺�յ�����Գ���
> `cursor + (at - codeAt[boundary])`����������ǰ׺���������޺�����˳������������Ŷ��̣��ҵݹ�ɼ����� N ����
> **B. `a\nimport ��` / `a\nexport ��` �߽磨����������ģ�**��import/export ��ѡ�ݽ������������� TS һ�����
> ExpressionStatement + ImportDeclaration/ExportDeclaration/`export const`��`a\nimport b from 'm';\nc;` ����Ҳ�ԡ�
> ����ֻ�������� `asi-import-boundary` �������������ģ���ǰ��ע�͡����� import ���š�`export function`/`export default function`����
> ������end-declarations +12������˳��class��3��declare+type+class��type+class+interface��declare+class+class��
> declare+interface+class��interface+declare+class��class+interface+type��ע�����м�/��ע�͡�declare+declare+class����
> asi-import-boundary +9��`a\nimport b/��b��/* as ns`��`a\nexport const`��import �����䡢`export function`��
> `export default function`������ import��ע��λ�ã���
本文件记�?`cover-end-1` 这一批的**实际落地内容、判据口径、读数与剩余目标**�?分析依据�?`docs/expression-ast-analysis.md` §4.3 / §4.6 / §5.2；本批不�?`core/**`�?
## 1. 落地了什�?
| `typescript/tokens/statements/expression-statement-possible-shape.xl.md` | ASI 判据（`IsAsiBoundary` 及其四个静态助�?`IsStatementWord` / `HasLineBreak` / `CanEndExpression` / `IsContinuation`）；`ComputeByIndex` 见到边界主动 `Reject`；`CanStart` 放开 `[` |
| `typescript/tokens/files/source-file-end-possible-shape.xl.md` | 根终结候选：�?EOF 哨兵外，�?ASI 边界�?`Accept`；`BuildByIndex` 分两条路——ASI �?`FromUnits(..., false)` 只建「换行处结束的那一条」，EOF 保持原有收尾 |
| `typescript/cases/end.ts`�? 两份快照�?| 新增 53 �?end 用例：EOF �?/ ASI 正反两族 / trivia 叠加 / 重复�?/ 数组字面�?|
没有�?`ExitOrPre` 结束 shape，没有覆�?`ComputePossibleShapes`，`CatalogGuide` 契约一个字没改�?普通候选在边界�?`Reject` �?`Candidates == 0` �?终结候�?`Accept` 并建那一条�?
## 2. ASI 判据（四条同时成立才断句�?
1. 当前单元�?*代码**（trivia �?EOF 哨兵都不算）�?2. 它前面还有代码单�?`prev`，且 `prev` 能收住一条完整表达式（`CanEndExpression`）；
3. `prev` 与它之间至少有一�?*换行 trivia**（空白块里的 `\n` / `\r`，以及块注释里的换行都算）；
4. 当前单元**接不�?*上一条表达式（`IsContinuation` 为假）�?
要点：`;` 不是 ASI 边界（`a\n;` 仍是一条）；`a +\nb` �?`+` 收不住表达式所以不断；
`typeof\na` / `export\n{ a }` 这类关键字不是操作数，`CanEndExpression` �?`CanStart` 共用同一�?`IsStatementWord` 排除表。`(` / `[` / 反引号模�?/ 二元与赋值标�?/ `in` / `instanceof` 都是延续符，
所�?`a\n+b`、`a\n(b)`、`a\n[0]`、`a\n.b`、``a\n`t` `` 仍是一条�?
`[a, b];`、`[];`、`[\na,\nb,\n];`、`[a, b].c;`、`[a][0];` 全部转绿（builder �?`ParsePrimary` `[` 分支本来就绪）�?
- `// `<`：尖括号断言 / 泛型箭头 —�?�?`ParseType`（Tier 2�?- `// `async`：缺箭头函数产生�?- `// `import`：`import.meta` —�?�?`MetaProperty` 分支（且要先�?`ImportDeclarationPossibleShape` �?compute �?close 自检�?- `// `{`：块 / 对象二义 —�?需要先有块候�?
node typescript/cases/ast-json.mjs        �?835/835 cj-ok�? 个构造）
node typescript/cases/ast-json-diff.mjs   �?835/835 完全一致；结构�?0 / 位置�?0 / 字段�?0
node typescript/cases/ast-json-diff.mjs end �?53/53 完全一�?node tmp/probe-eof.mjs（主�?tmp，只读复跑）�?23/23 一致（EOF 既有语义未变�?xl check（paths: core + typescript）→ 0 error�?175 warning，与基线同族�?```
基线 782/782 未回退；`import` / `export` / EOF 族（23/23）语义保持不变�?
- `new-line-trivia-possible-shape.xl.md` **仍是�?*（`throw 未实现`）：它没有被任何 `CatalogGuide` 注册�?  本批的换行判据落在表达式语句候选与根终结候选上（�?.2 的「同一候选的第二条判据」路线）�?  要把它做成真形状，得先有一个收 newline trivia 的宿主目录，属于更后面的一轮�?- **`a\nimport b from "m";` 这一类会抛「终结候选与其它候选同时成立�?*：ASI 边界那一�?`import`
  普通候选还活着，�?`CatalogGuide` 规定「终结候�?Accept �?Candidates > 0 �?抛错」，`core` 不许改�?  这类输入现在也没有任何用例覆盖（改动前同样失败，只是错误不同），列在下一 chunk 处理�?- 数组字面量内部只验到已有 builder 能建对的形态；`[...a]`（展开）、`[a, ...b]` 未收�?
1. 终结候选拆细：给「ASI 断句」一个能按「下一条语句起点」判定的独立通道，解�?§5 第二条；
2. Tier 2 `ParseType` 入口（`as` / `satisfies` / 泛型实参 / 尖括号断言），�?CanStart 放开 `<`�?3. 箭头函数产生�?�?CanStart 放开 `async`；`import.meta` �?放开 `import`�?4. 补齐 `new-line-trivia` 形状（若决定�?ASI 做成真实单元形态）�?
fresh clone �?`xl_build` **不传 paths** 会因 `cjcli.xl.md` �?dead import（`dawn/text/*`）中止、写 0 个产物�?本批用的命令�?`xl_build({ cwd: <clone>, targets: ["ts"], paths: ["core", "typescript"] })`�?54 files / 0 error），
�?`node .\node_modules\typescript\bin\tsc -p .\tsconfig.json`。改单个文件�?`paths` 只给改过的文件即可�?
## 8. chunk 2（cover-end-2）：声明条目的体前换行不�?ASI 边界
**修点**：`ExpressionStatementPossibleShape.IsAsiBoundary` 增加�?5 条——先找出**本条语句的起�?*（从 `prev` 往回跳过属于自己的 basic token，遇到建好的形状就停），
若起点是语句 / 声明关键字（复用 `IsStatementWord`：`class` / `interface` / `enum` / `declare` / `function` / …），则该处换行**不是** ASI 边界�?`class C\n{}` �?`{` 是类体、`C` 只是声明头，那里不存在「上一条表达式」，根终结候选不�?`Accept`，声明候选照常把 `{` 吃进声明�?`CatalogGuide` 契约未改，无 `ExitOrPre`，未覆盖 `ComputePossibleShapes`�?
**证据**：新 stem `typescript/cases/end-declarations.ts`�?7 条）37/37 完全一致：
声明头与 `{` 之间的块注释 / 行注�?/ 空行；多条声明连排；以及表达�?ASI 回归（`a\n++b;`、`a\nb;`、`a\n+b;`、`a\n(b);`、`[a, b];`、`a\nb\nc;`）�?
**读数（本分支�?*：全�?ast-json / diff **1376/1376**�?339 + 37），结构�?0 / 位置�?0 / 字段�?0；xl_check 0 error�?
**明确未收（原因写在用例里，不是静默跳过）**：带成员的体前换�?（`class C\n{\nx: number;\n}`、`interface I\n{\na: number;\n}`、`declare class C\n{\nx: number;\n}`、`declare interface I\n{\na: number;\n}`�?——类 / 接口成员需�?types 家族�?class element shapes（declarations chunk 1 已明确暂缓，�?`docs/coverage-declarations.md`）；
同行写法 `class C { x: number; }`、`interface I { a: number; }` 同样红，说明红点与「体前换行」无关�?`end-declarations.ts` 里以 ``// `` 目标 + 原因保留�?
**仍然存在（chunk 1 记录的通用边界�?*：`a\nimport b from "m";` 会抛「终结候选与其它候选同时成立�?（import / export 候选在边界那一刻仍活，`CatalogGuide` 不许改，需�?`core` 之外的独立通道）；本块未处理�?
## 8. end-declarations chunk 2：声明条目在 EOF 的收口（缺分号的 type alias / import-equals�?
**新增用例**（`typescript/cases/end-declarations.ts` append-only�?7 �?76�?39 条）�?
  单条结尾；尾部换�?/ 尾部注释变体（`class C {}\n`、`class C {} // c`、`class C {}\n// c` 等）�?  两条声明背靠背到 EOF（class+class / class+interface / function+class / enum+type / namespace+class / interface+enum）�?- 声明之间的换行边界：`class C {}\ninterface I {}`、`function f() {}\nclass C {}`、空�?/ 行注释分隔�?  `type T = A;\nclass C {}`、`import x = require("m");\nclass C {}`�?- 体前换行补齐：`function f()\n{}`、`function f(a: A): B\n{\nreturn a;\n}`、`module N\n{}`、`namespace N\n{}`�?- 无分�?vs 必须分号（oracle：TS 两种都合法）：`type T = A`、`import x = require("m")`�?  `type T = A;\ninterface I {}`、`class C {}\ntype T = A;`�?- ASI 回归（原有行保留）：`a\n++b;`、`a\nb;`、`a\n+b;`、`a\n(b);`、`[a, b];`、`a\nb\nc;`�?
- 现象：文件以 `type T = A` �?`import x = require("m")` 结尾（无 `;`）时，两条都�?  `表达式语句没有读完`——声明候选在 EOF �?`Accept`，终结候选的 EOF 兜底一律按
  `ExpressionStatementShape.FromUnits(..., false)` 建最后一条，于是把声明当表达式解析�?- 修法：EOF 兜底前先�?`BuildTrailingDeclaration`：只�?`type` 开头与 `import <�? = …`（`code[2]` �?`=`），
  在最后一个真实代码单元后补一�?*零宽合成 `Symbol ";"`**（`SignIn(End)` + `AppendValueAndSignOut(";", End)`�?  所�?`Is(";")` 成立、`End.Index + 1` 正好是声明右边界），再走
  其余老路径不变�?- 为什么不是改声明候选：`TypeAliasDeclarationPossibleShape` / `ImportEqualsDeclarationPossibleShape`
  不在本块 write scope（也不该把「EOF 也是终结符」塞�?declaration possible）；终结候选本来就�?  「这一条到头了」的判定点�?- 未改任何 declaration shape 文件，未�?`core/**`�?
**读数（本分支�?*：`end-declarations` **76/76 完全一�?*；全�?ast-json / diff **1773/1773**
（基�?1734 + 39），结构�?0 / 位置�?0 / 字段�?0，无回归；tsc 0 error；xl_check 0 error（仅仓库既有 W3102/W3103 文档�?warning）�?
**仍暂�?*：`declare function f(): void;` / `declare function f()\n{}`（无体函数声明需要声明侧�?end 候选，
declarations 尚未收）；带成员的体前换行（�?cover-members-1）；`a\nimport …` 的「终结候选与其它候选同时成立�?仍是 chunk 1 记录的通用边界，本块未处理�?
**落地**（`end-declarations.ts` 76 �?89�?13）：
- 无体函数声明�?EOF（无分号）：`declare function f(): void`、`declare function f(a: A): B`�?  `declare function f()`（无返回类型，只�?declare 允许）、重载签�?`function f(a: A): B`�?- 带分�?/ 尾注�?/ 尾换�?/ `declare` �?`function` 之间换行：`declare function f(): void;`�?  `declare function f(): void // c`、`declare function f(): void\n`、`declare\nfunction f(): void`
  （后�?TS 是「ExpressionStatement`declare` + FunctionDeclaration」两条，靠下面的连排拆分对齐）；
- 两条无体声明背靠背（无分�?/ 带分号）；与其它声明相邻：`class C {}\ndeclare function f(): void`�?  `function f() {}\ndeclare function g(): void`、`class C {}\nfunction f() {}`�?
**修法**（`source-file-end-possible-shape.xl.md` �?`BuildTrailingDeclaration`）：
1. 函数族：`function` 开头或 `declare function` 开头；无体时在最后一个代码单元后�?*零宽合成 `Symbol ";"`**
   （`SignIn(End)` + `AppendValueAndSignOut(";", End)`，与 chunk 2 同款）再�?   `FunctionDeclarationShape.FromUnits`——该形状本来就支持「最后一块是 `;`」的形态；
   有体时直接以 `}` �?`tokenIndex` �?`FromUnits`�?2. 多条无分号声明连排：�?*最后一个换行后出现的声明起�?*，前缀递归建（建不出来�?   `ExpressionStatement(�? false)` 收尾），后缀递归建。`declare function f(): void\ndeclare function g(): void`
   �?`declare\nfunction f(): void` 都靠这条转绿�?3. 紧邻�?`class �?{}`（作为后缀/单条）：�?`}` �?`tokenIndex` �?`ClassDeclarationShape.FromUnits`�?   未改任何 declaration shape 文件，未�?`core/**`�?
**读数（本分支�?*：`end-declarations` **89/89 完全一�?*；全�?ast-json / diff **2100/2100**
（基�?2087 + 13），结构�?0 / 位置�?0 / 字段�?0，无回归；tsc 0 error；xl_check 0 error
（仅仓库既有 W3102/W3103 文档�?warning）�?
**chunk 3 仍红（TS 合法；写成用例里�?`//` 目标，不静默跳过�?*�?
  ——「无体声明在前、带体声明在后」的多条连排：`FunctionDeclarationPossibleShape` �?EOF 边界仍活�?  先于根终结候选建，报「函数声明的返回类型没有读完」。修法在 declarations 侧（让该候选在 EOF `Reject`
  或给声明自身�?end 候选），不属于本块 write scope�?- `export declare function f(): void`（`FunctionDeclarationShape` 不认 `export` 修饰）�?  `declare type T = A`（`TypeAliasDeclarationShape` 不认 `declare` 修饰）——同属声明形状侧的修饰支持�?
## 10. end-declarations chunk 4：带成员�?class / interface �?EOF 的收�?
**落地**（`end-declarations.ts` 89 �?103�?14；全�?green�?*无需改动任何 shape**）：
- class 带成员到 EOF：`class C { m() {} }`、`class C {\n  x = 1;\n}`、尾随换�?`�?}\n`�?  尾随行注�?`�?} // c`、尾随块注释 `�?} /* c */`�?- interface 带成员到 EOF（成员无分号也合法）：`interface I { a: number }`�?  `interface I {\n  a: number;\n}`、尾随注�?`interface I { a: number } // c`�?- `declare class C { m(): void; }` �?EOF�?- 两条声明�?EOF：`class C { m() {} }\ninterface I { a: number }`、反�?`interface I { a: number }\nclass C {}`�?- 体前换行 + 成员：`class C\n{ m() {} }`、`interface I\n{ a: number }`、`class C\n{\n  m() {}\n}`�?
**为什么不需要改 `source-file-end-possible-shape`**：这 14 条都�?*声明候选自己的建树路径**上收尾—�?类体 / 接口体是一个已经闭合的魔号单元，候选在体闭合后直接 `Accept`/建树，不落到根终结候选的 EOF 兜底�?chunk 3 加的「紧�?class（以 `}` �?tokenIndex）」兜底在本批也没有被触发。也就是�?chunk 2/3 记录�?「带成员的体前换�?EOF」红点是**成员形状未合�?*造成的，成员形状合入后自然转绿，不属�?end 层缺口�?
**读数（本分支�?*：`end-declarations` **103 / 103 完全一�?*；全�?ast-json / diff **2667 / 2667**
（基�?2653 + 14），结构�?0 / 位置�?0 / 字段�?0，无回归；tsc 0 error；本轮没有改 xl 源文件（xl_check 与基线一致）�?
**仍暂�?*（TS 合法；写成用例里�?`//` 目标）：chunk 3 记录的「无体声明在前、带体声明在后」多条连�?（`declare function f(): void\nclass C {}` 等，�?declarations 侧让候选在 EOF `Reject`）；
`a\nimport …` 的「终结候选与其它候选同时成立」通用边界（chunk 1 记录，需 core 之外的独立通道）�?
## 11. EOF 声明混排（chunk 3 报告�?known red�?
**落地**（`end-declarations.ts` 103 �?109�?6）：
- `declare function f(): void\nclass C {}` �?2 条语句（FunctionDeclaration + ClassDeclaration）；
- `function f(a: A): B\nfunction f(a: A): B { return a; }`（overload + implementation �?EOF）；
- `declare function f(): void\ninterface I {}`、`interface I {}\nclass C {}`（后者本来已绿，补进用例集对照）�?- `type T = A\nclass C {}`（类型别名在前、class 在后�?EOF）；
- 回归对照：`declare function f(): void\ndeclare function g(): void`（chunk 3 已绿）�?
**修法（两处，均在 write scope 内）**�?
1. `function-declaration-possible-shape.xl.md`：Stage 3 / Stage 4 增加 **ASI Reject**—�?   若当前代码单元是「statement word」（复用 `ExpressionStatementPossibleShape.IsStatementWord`）且�?   前一个代码单元之�?*有换�?*（新�?`LineBreakBefore`：按 Source 区间逐字符找 `\n` / `\r`，块注释里的换行也算），
   则本候�?`Reject`。于�?`declare function f(): void\nclass …` 不会再把 `class C {}` 当成返回类型 / 函数体�?   `class/interface` 形状文件未改�?2. `source-file-end-possible-shape.xl.md` �?`BuildTrailingDeclaration`：混排家族补 `interface`
   （含 `declare interface`，走 `InterfaceDeclarationShape.FromUnits(host, start, at)`，`at` 落在 `}` 上）�?   另外前缀递归可能建出**多条**声明（如 `declare function …` 前缀自身再拆），所以后缀起点不再假设
   `start + 1`，而是�?`Data` 里现数「前缀建出的连�?non-trivia 形状个数」再推�?
**读数（本分支�?*：`end-declarations` **109 / 109 完全一�?*；全�?ast-json / diff **2797 / 2797**
（基�?2791 + 6），结构�?0 / 位置�?0 / 字段�?0，无回归（declarations 276、end 53、export �?stem 全绿）；tsc 0 error�?
**仍暂�?*：三条混排（`declare function f(): void\nclass C {}\ninterface I {}`）——前缀递归在「前缀自己再拆两条�?时还没有把第二条的边界传回来，属 BuildTrailingDeclaration 的递归返回约定，写成用例里�?`//` 目标�?`a\nimport …` 的候选共存边界（chunk 1）仍未处理�?
## 12. 装饰器换�?ASI（`@dec\nclass C {}`�?
**根因（探针定位）**：`@dec\nclass C {}` �?token 流是 `@`、`dec`、空�?`\n`)、`class`、…�?类候选在 `@` 处已接过装饰器�?*存活**；而在 `class` 那一格，根终结候选的 `IsAsiBoundary` 成立
（前一个代码单�?`dec` 能收住表达式、中间有换行、`class` �?statement word 不是延续符）�?终结候�?`Accept`�?此时 `Candidates` 里还有类候�?�?`CatalogGuide` 抛「终结候选与其它候选同时成立」。探针读数：
`@dec\nclass C {}` 下标 3、`@a @b\nclass C {}` 下标 6、`@dec()\nclass C {}` 下标 4、`@dec\nabstract class C {}` 下标 3�?`@a class A {}\n@b class B {}`、成员装饰器换行（`class C { @dec\nm() {} }`、`@dec\nx = 1;`）本来就是绿的�?
**修法（只�?`source-file-end-possible-shape.xl.md`，未�?core、未�?class candidate�?*�?`ComputeByIndex` �?`IsAsiBoundary` 成立后，再用新增�?`HasDecoratorPrefix(units, tokenIndex)` 往前看�?把「`.` / Common / `(�?` 括号单元」当作装饰器表达式的一部分往回走，碰�?`@` 就说明这段是**下一条声明的装饰器前缀**�?于是返回 `Uncertain`（不�?ASI 边界、不 Accept），把边界留给还在吃装饰器的类候选。判据只认「`@` 前缀」这一种形态，
普�?`a\nclass C {}` �?ASI 行为不变（类候选在那条里早�?`Reject`）�?
**用例**（`declarations.ts` append-only�?10）：`@dec\nclass C {}`、`@a @b\nclass C {}`、`@dec()\nclass C {}`�?`@dec(a)\nclass C {}`、`@dec\nabstract class C {}`、`@a\nclass A {}\n@b\nclass B {}`、`@dec\n\nclass C {}`�?`@dec /* c */\nclass C {}`、`@dec\nclass C {}\nclass D {}`、`class C { @dec\n x = 1; }`�?成员装饰器换行（`class C { @dec\nm() {} }`）与单行装饰器（`@dec class C {}`）已在既有组，作为对照保留�?
**读数（本分支�?*：`declarations` **315 / 315 完全一�?*；全�?ast-json / diff **3053 / 3053**
（基�?3043 + 10），结构�?0 / 位置�?0 / 字段�?0，无回归（decorator / using-declarations / end-declarations 109 全绿）；tsc 0 error�?
**仍暂�?*：`@dec` 与声明之间插�?*其他语句**的写法（TS 本来非法，不列用例）；装饰器元数�?/ 参数装饰�?/ 接口·枚举上的装饰�?仍是 declarations 家族后续 chunk；chunk 11 的两条暂缓（三条声明混排、`a\nimport …` 共存边界）不变�?
## 14. end-declarations chunk 6：export / import 声明在 EOF（measurement-first）

**探针先量（20 条）**：本批只修真红项；已绿项只补用例固化，不改 shape。

**已经绿（不改 shape，补用例）**：`export {}`、`export * from "m"`、`export { a } from "m"`、
`import x from "m"`、`import "m"`、`import x = require("m")`、`export function f() {}`、`export class C {}`、
`export interface I {}`、`export enum E { A }`、`export namespace N {}`、`export function f() {}\n`。

**修红（只改 `source-file-end-possible-shape.xl.md`）**：`export type T = A`（无分号到 EOF）与
`export type T = A // c` 原本报「表达式语句没有读完」——EOF 兜底只认 `type` 开头，不认 `export type`；
把 `export` + `type` 也纳入 `isType` 族（`TypeAliasDeclarationShape` 本来就支持 `[export] [declare] type` 前缀），
补零宽合成 `;` 后按类型别名正常建，两条转绿。

**读数（本分支）**：`end-declarations` **135 / 135 完全一致**（121 → 135，+14）；全量 ast-json / diff
**3537 / 3537**（基线 3523 + 14），结构差 0 / 位置差 0 / 字段差 0，无回归（end 53 / export / import 族不变）；tsc 0 error。

**仍红（写成用例里的 `//` 目标 + 归属，不静默跳过）**：
- `export const x = 1`、`export const x = 1 // c\n`、`export const x = 1\nclass C {}`：
  归属 **export / statement 族**——export 变量语句候选在 EOF 仍 `Accept`，与根终结候选同时成立；
  需要 export 侧像 declare-var 那样在 EOF 让位（`stopAtEof` 同款），end 兜底目前也不建 export 变量语句。
- `export default 1`、`export default 1 // c\n`：归属 **export 族**（`ExportAssignment` 候选在 EOF 仍活），同上。
- `import x from "m"\nclass C {}`：归属 **import 族**——`ImportDeclarationShape.Close` 把 class 单元当成未识别单元。
- `import x from "m" // c` / `export { a } from "m" // c`：归属 **import / export 族位置口径**——
  尾注释被算进声明的 `End`（TS 到字符串/大括号为止）；无注释的形态全绿。

## import/export EOF reds（chunk import-export-eof）

GREEN（本 chunk 修复）
- `export const x = 1`（无分号 EOF）、`export const x = 1 // c`、`export var v = 1`、`export let l = 1`、`export const c1 = 1\nexport const c2 = 2`：
  `ExportDeclarationPossibleShape` 在 EOF 主动让位（Stage=3），由 `SourceFileEndPossibleShape.BuildTrailingDeclaration`
  新增 `isExportVariable` 支路：用 `StatementBuilder` 按变量语句建，再把 `ExportKeyword` unshift 到 Data 首位、改写 Pos。
- `export default 1`、`export default 1 // c`：同一 fallback 新增 `isExportDefault` 支路，用 `ExpressionBuilder` 建表达式 +
  `ExportAssignmentShape`（children 只有表达式，export/default 不投影），Pos/End 按 oracle。
- 多语句边界：`BuildTrailingDeclaration` 的 ASI 边界关键字表加入 `export`，于是 `export const x = 1\nclass C {}` 拆成
  「export 变量语句 + class」，144 条 end-declarations 全绿。

STILL RED（本 chunk 未解，已注释进用例文件并写明原因）
- `import x from "m" // c`、`export { a } from "m" // c`、`export * from "m" // c`：声明在 EOF 收尾时 End 把尾注释算进去
  （TS 停在 string / `}` 之后）。根因在 core 的 EOF 收尾（挂载壳被 EOF 关闭时用 EOF 位置 SignOut），
  shape/end-possible 层拿不到二次 SignOut 机会（SignOut 只能设一次），按边界不改 core → 暂缓。
- `import x from "m"\nclass C {}` / 无分号连续 import/export：需要在挂载壳的 EndPossible 里做真正的 ASI 收尾
  （newline 后接新语句时提前 Close）；试过 raw lookahead Accept，会让壳的「终结候选与其它候选同时成立」，
  需要 core CatalogGuide 配合 → 暂缓。