# B2b · 成员子 token 逐字成形 — 实施报告

| 项 | 值 |
| --- | --- |
| 状态 | **主修完成**：三个 case 的子 token（modifier / name / 初始字面量）各自在自己的闭合格成形状；全量回归与 B2 基线逐条一致 |
| 分支 | `feature/b2b-member-subtokens` |
| 目录 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b2b-member-subtokens` |
| 基线 | 主仓库 `b6bd50aa`（B2 已合入） |
| 提交 | 见 `git log --oneline -1`（ASCII） |

---

## 0. 缺口与修法（一句话）

B2 的外壳把成员攒成**原样单元**，所以 `private` / `static` / `readonly` / `x` / `1` 只在「换正品那一格」
（class 40）一次性出现。B2b 给外壳加**第二层**：外壳内的 basic token 关闭时，按「位置」把刚闭合的那一格
换成修饰词 / 名字 / 初始字面量的形状，并记下它替换掉的原样单元 `Raw`；收口前 `Restore` 把形状换回 `Raw`，
legacy builder 看到的单元与从未成形过逐字节相同 ⇒ **最终 AST 仍由 legacy builder 产出，判据一行未改**。

两个前提都落在 `member-boundary.xl.md` 的新类 `MemberHeadScan`（document 前瞻）：

- 成员**第一格**闭合时就能判出「跳过修饰词链之后，名字后面是 `:` / `=` / `;` / `}`」⇒ 外壳从成员头就存在；
- 前瞻判不出的一律 `-1`（`(` `<` `[` `{` `.` `@` `*`、换行、文件尾）⇒ 交旧路径，方法 / 构造器 / 访问器 /
  静态块 / 计算名 / index signature **一格都不碰**。

---

## 1. 改动文件（7 个，全部修改）

| # | 文件 | 动作 | 内容 |
| --- | --- | --- | --- |
| 1 | `typescript/tokens/types/member-boundary.xl.md` | 修改 | 新增 `MemberHeadScan`（`IsWordStart` / `IsWordChar` / `IsModifierWord` / `CanFollowWord` / `SkipTrivia` / `ModifierCount`）；`ModifierCount` 把**本格自己**算进修饰词链，返回修饰词个数或 `-1` |
| 2 | `typescript/tokens/types/member-shell-catalog.xl.md` | 修改 | 新增 `MemberShellHeadPart`（形状 + `Raw`）与 `MemberShellEntry.Modifiers` / `Parts`；新增 `FindPart` / `RawData` / `Restore` / `PreviousEnd` / `HeadKindAt` / `BuildHeadShape` / `WrapAt` / `WrapAll` / `HeadCompute`；`Create` 记 `Modifiers` 并当场 `WrapAll`；`Finalize` / `Unwrap` / `HandOffOnBodyClose` 先 `Restore`；**删掉** `MemberShellEndPossible` + 「外壳挂 `CatalogGuide`」（改由 `ComputePossibleShapes` 直连） |
| 3 | `typescript/tokens/types/class-member-possible-util.xl.md` | 修改 | `IsEarlyMemberHead`：`code.length === 1` 且 `MemberHeadScan.ModifierCount(code[0]) >= 0` ⇒ 早建（成员第一格就建壳） |
| 4 | `typescript/tokens/types/property-declaration-shape.xl.md` | 修改 | 新增 `ComputePossibleShapes`：外壳态转 `MemberShellCatalog.HeadCompute`，否则 `super` |
| 5 | `typescript/tokens/types/property-signature-shape.xl.md` | 修改 | 同上 |
| 6 | `typescript/tokens/members/enum-member-shape.xl.md` | 修改 | 同上 |
| 7 | `typescript/tokens/types/property-signature-possible-shape.xl.md` | 修改 | `Analyze`：`code.length === 1` 且前瞻判得出 `name :` ⇒ 早建（比 B2 的「`:` 闭合格」再早一格） |

**为什么走 `ComputePossibleShapes` 而不是继续用 `CatalogGuide`**：`CatalogGuide` 只有「唯一候选 Accept」才
建，`BuildByIndex` 之后无条件 `Reset + Built`，没有办法表达「这一格只成形、不建东西」；而 `Symbol.Close` /
`Common.Close` 的既定入口就是「问父单元 `ComputePossibleShapes`」。外壳因此自己接管这个入口：
成形 + 判边界，**到了边界才返回 `Built`**（当前字符重放，与 B2 逐字一致），没到边界返回 `Waiting`
（通道继续走原来的路，当前字符不被重放）。

`HeadKindAt` 的位置判据（`Modifiers` 由前瞻给出）：

- `codeIndex < Modifiers` ⇒ 修饰词（`ClassDeclarationShape.BuildModifier`，含 `private/public/protected/static/readonly/abstract/declare/override/async/accessor`）；
- `codeIndex === Modifiers` ⇒ 名字（`IdentifierShape.FromBasicToken` / 数字名 `NumericLiteralShape` / 字符串名）；
- `codeIndex > Modifiers` 且前面出现过 `=` ⇒ 初始字面量（数字 / 字符串），否则原样。

---

## 2. 验收读数（step = 源码 0 基；同一 bundle）

### 2.1 `class-field-modifiers.ts`（`class A { private static readonly x = 1; }`，44 step）

| 形状 | B2 首见 | B2b 首见 | token 闭合格 |
| --- | ---: | ---: | --- |
| `ClassDeclarationShape` | 5 | 5 | — |
| `PropertyDeclarationShape` | 35 | **17** | 成员头（`private` 闭合） |
| `PrivateKeywordShape` | 40 | **17** | ✓ `private` 闭合格 |
| `StaticKeywordShape` | 40 | **24** | ✓ `static` 闭合格 |
| `ReadonlyKeywordShape` | 40 | **33** | ✓ `readonly` 闭合格 |
| `IdentifierShape`（`x`） | 40 | **35** | ✓ `x` 闭合格 |
| `NumericLiteralShape`（`1`） | 40 | **39** | ✓ `1` 闭合格 |

- **零成员形状窗口**：B2 `29 步 [6..34]` ⇒ B2b **`11 步 [6..16]`**（step 6–16 只有 `ClassDeclarationShape`，
  17 起成员壳与 `private` 同时出现）。剩下的 11 步是「成员第一格还没到」，不是「成员头已到但没形状」。
- `=` 仍是 `Symbol`（`=` 本来就是符号块；最终 AST 不投影 `=`，包装成 `EqualsTokenShape` 只增风险）。
- 收口计数：`created 1 / finalized 1 / unwrapped 0 / pruned 0`。

`tmp/class-min.ts`（`class A { x: number }`，24 step）：`PropertyDeclarationShape` **11**（B2 同 11）、
`IdentifierShape` **11**（B2 那次是 40 档的整条重建）；类型注解 `number` 的 `NumberKeywordShape` 仍 @20。

### 2.2 `interface-basic.ts`（`interface I { a: string }`，27 step）

| 形状 | B2 首见 | B2b 首见 | 说明 |
| --- | ---: | ---: | --- |
| `InterfaceDeclarationShape` | 11 | 11 | — |
| `PropertySignatureShape` | 16 | **15** | 名字闭合格（比 B2 早 1 步，不再「迟 8 步」） |
| `IdentifierShape` | 24 | **15** | `a` @ 名字闭合格（`:` 就在下一格） |
| `StringKeywordShape` | 24 | 24 | 类型注解，不在本 WP 范围 |

### 2.3 enum

`enum-numeric.ts`（`enum E { A = 1, B }`，21 step）

| 形状 | B2 首见 | B2b 首见 |
| --- | ---: | ---: |
| `EnumMemberShape` | 10 | 10 |
| `IdentifierShape`（成员名 `A`） | 15 | **10** |
| `NumericLiteralShape`（`1`） | 15 | **14** |

`tmp/enum-min.ts`（A/B 两成员，逐成员首次出现）：

| 成员 | B2 | B2b |
| --- | ---: | ---: |
| `A` 的 `EnumMemberShape` | 10 | **10** |
| `B` 的 `EnumMemberShape` | 18 | **17** |

（`A` / `B` 的成员名各自在自己的闭合格成 `IdentifierShape`。）

### 2.4 全量回归

| 套件 | B2 基线 | 本分支 |
| --- | --- | --- |
| `tshape-judge ts-all` | 429 / 426 ok / 3 err / 0 structural / 0 fields / 0 moved | **429 / 426 ok / 3 err**（`class-ball` / `expression-zoo` / `generic-container` 三条 `incremental-error` 逐条一致）/ **0** structural / **0** fields / **0** moved |
| `tts run.mjs` | PASS 429（throw 3 / incremental 426） | **PASS 429 / FAIL 0**（throw 3 / atomic 0 / partial 0 / incremental 426），exit 0 |
| `tts-impl run.mjs` | PASS 0 | **PASS 0**, exit 0 |
| `xl_build`（core+typescript→ts） | 0 error | **0 error**（3 条既有 `E1107` warning，与本 WP 无关） |
| `tsc -p .` | exit 0 | **exit 0** |
| `tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | **4 PASS / 0 FAIL / 7 N/A**，exit 0 |

### 2.5 计数器（incremental 模式，逐 case 增量）

| 用例 | created | finalized | unwrapped | pruned |
| --- | ---: | ---: | ---: | ---: |
| `class-field-modifiers` | 1 | 1 | 0 | 0 |
| `interface-basic` | 1 | 1 | 0 | 0 |
| `enum-numeric` | 2 | 2 | 0 | 0 |
| `enum-min`（tmp） | 2 | 2 | 0 | 0 |
| `class-min`（tmp） | 1 | 1 | 0 | 0 |
| `class-method` / `class-getter` / `class-abstract` / `class-static-block` / `class-constructor-param-property` | **0** | 0 | 0 | 0 |

- `unwrapped = 0`：**没有一个外壳需要拆壳回退**，即「前瞻判成属性」的每一条成员最后都由 legacy builder
  认下来了（`BuildMember` 的 `Pos` / `End` 断言全过）。
- `StatementShellCatalog.ShellTakeOutOfOrderCount` = **0**，无上涨；`ShellTakeByIdentity/Fallback/Miss` 全 0。
- `DeferredBracketCatalog`：`ReplayCount` / `ReplayFailureCount` / `BindCount` 全 **0**（本 WP 不登记 Deferred）。

---

## 3. 未完成项（按重要性）

1. **`interface` 的名字 `I` 仍 @24，没有降到「名字闭合格」(@11)。** 那是**声明级**外壳
   （`InterfaceDeclarationShape` 在 step 11 就是空壳，正品由 `BuildFromCode` 在 `}` 收口时一次建成），
   属于 `StatementShellCatalog` 那一层的「头部子 token 成形」，不是成员层。B2b 只做成员层，
   所以 `I` 仍与 B2 一致。同一缺口的还有 class / enum / function / type-alias 的声明名。
2. **method / constructor / accessor / index signature 未做**：前瞻对 `(` / `<` / `[` / `{` / `.` / `@` / `*` /
   换行一律 `-1`，显式交回旧路径（`created = 0`，见 §2.5）。这几族的头部在「名字那一格」无法与属性区分，
   要做得先有「名字之后可能是参数表」的二级前瞻 + 方法体的块体目录回填，属下一 WP。
   方法名 + 参数表复用 B1 参数目录这条路线本轮**没有**推进。
3. **类型注解的 token 未逐字成形**：`:` 之后的 `number` / `string` / 任何类型都原样（`NumberKeywordShape`
   在 class-min 仍 @20、`StringKeywordShape` 在 interface-basic 仍 @24）。`HeadKindAt` 只认「`=` 之后的初始字面量」，
   类型位置需要一整套类型 token 目录。
4. **`=` 不产出 `EqualsTokenShape`**：`=` 本来就是 `Symbol`（任务书要求的「成 `Symbol`」已满足），
   且最终 AST 不投影 `=`，包装它只增加 `Restore` 面。
5. **`MemberShellEndPossible` 已删除**：它的「三种收口证据」逻辑原样搬进 `FinalizeShell`（判据未改，
   只是不再作为 `CatalogGuide` 的终结候选——外壳不再挂 `CatalogGuide`）。若后续有别的 catalog 想复用它，
   需要重新引入。
6. **前瞻的保守面**：`get` / `set` 前缀、装饰器 `@`、修饰词链跨行（`private ⏎ x = 1`）都返回 `-1`，
   于是这些成员仍然「边界才建」。这是有意的：跨行修饰词链的 ASI 判据在 legacy builder 里，前瞻不复制它。
7. `tmp/` 下的探针（`probe.mjs` / `class-min.ts` / `enum-min.ts`）是诊断用，`tmp/` 已 gitignore，未提交。

---

## 4. 可复算命令

```powershell
$d = "C:\Users\Admin\Documents\GitHub\xl-example-set\b2b-member-subtokens"
Set-Location $d
xl_build { cwd: $d, paths: ["core","typescript"], targets: ["ts"] }
node node_modules/typescript/bin/tsc -p .

# 首见格（逐格全树；表里第二行起是 B2b 的目标）
node typescript/cases/tts/tools/tshape-judge.mjs trace typescript/cases/tts/cases/incremental/declarations/class-field-modifiers.ts
node typescript/cases/tts/tools/tshape-judge.mjs trace typescript/cases/tts/cases/incremental/types/interface-basic.ts
node typescript/cases/tts/tools/tshape-judge.mjs trace typescript/cases/tts/cases/incremental/declarations/enum-numeric.ts
node typescript/cases/tts/tools/tshape-judge.mjs trace tmp/enum-min.ts

# 计数器（created / finalized / unwrapped + StatementShellCatalog + Deferred）
node tmp/probe.mjs typescript/cases/tts/cases/incremental/declarations/class-field-modifiers.ts

# 回归
node typescript/cases/tts/tools/tshape-judge.mjs ts-all --out tmp/ts-all-b2b.json   # 429 / 426 ok / 3 err / 0 structural / 0 fields
node typescript/cases/tts/run.mjs --quiet                                          # exit 0（PASS 429）
node typescript/cases/tts-impl/run.mjs --quiet                                     # exit 0（PASS 0）
node tests/gates/run.mjs                                                           # 4 PASS / 0 FAIL / 7 N/A
```
