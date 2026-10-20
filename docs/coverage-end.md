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

