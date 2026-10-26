# B4h · 类型位置函数类型参数 `(`（`type F = (x: number) => void`）— 实施报告

| 项 | 值 |
| --- | --- |
| 工作副本 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b4h-fn-type`，分支 `feature/b4h-fn-type` |
| 基线 | 主仓库 HEAD `20167c71`（B4g 合并后；增量形状 / 表达式括号目录默认开） |
| 提交 | `feat(b4h): function type alias params early via bracket role (F/G, optional ?)` |
| 性质 | 在**类型槽**把函数类型参数表接到 B0 的 `BracketRoleResolver` + B1 的 `ParameterPossibleShape`；收口仍由 legacy `TypeBuilder` 消费已建参数 |
| 构建 | `xl_build {core,typescript}` **634 页 / 0 error / 3 warning**（3 条均既有 `E1107`）；`tsc -p .` exit 0；`xl check`（3 个改动页）0 error / 0 warning |

---

## 0. 结论先行

1. **目标 1 达成**：`type F = (x: number) => void` 的 `(` 在**创建格**（step 10，字符 `(`）由
   `BracketRoleResolver.Classify` 判成 `Known / FunctionTypeParams`，并建 `FunctionTypeShape` 形状位
   （`Pos=9`，与 legacy `ParseFunctionType` 的 `Positions[start]` 同源）；`x` 在**名字关格**（step 12，字符 `:`）
   成 `ParameterShape + IdentifierShape`（`pos=11`）；`=>` 后 `void` 在自己的 token 完成格（step 29）成
   `VoidKeywordShape`（`pos=24`）；**收口格（`;` 关格 / 下一语句首词关格）新增 shape 0**。
2. **目标 2 达成（G；H 只做参数表）**：`type G = (a: string, b?: number) => a is string` 的 `a` / `b` 各自
   在自己的名字格成 `ParameterShape + IdentifierShape`，`?` 在自己的闭合格（step 53，字符 `:`）成
   `QuestionTokenShape`（`pos=52`、`op="?"`）；返回类型 `a is string` 成 `TypePredicateShape`。
   `type H = <T>(x: T) => T` 的**参数表**同样早建（`x` / `T` 在名字 / 类型格），但 `FunctionTypeShape`
   仍由 legacy `ParseGenericFunctionType` 在收口格建 —— 本棒不建泛型函数类型壳（§4.2）。
3. **目标 3 达成**：判据只看**类型上下文**——宿主是 `TypeAliasDeclarationShape`（已经在 `=` 之后，
   是类型槽）+ 配对 `)` 之后紧跟 `=>`（legacy `ParseType` 在 `(` 上的同一个判据）。
   表达式 `(a)` / 箭头 `(` 的宿主是变量声明 / 语句壳 / 表达式形状，一条都不经过这个分支；
   `type A = (B)` / `(B)[]` / `(B) | C` 的 `(` 仍是 `Fallback`，树与 legacy 逐字节一致（探针 §3 断言）。
4. **目标 4 达成**：目录用的是 B1 的**同一份** `ParameterPossibleShape`（`ParameterListPossibleShape.Shapes()`，
   进程内一份），角色目录注册 / 安装在 B0 的 `RegisterCatalog` → `Resolve` → `BracketCatalogInstaller`；
   收口仍调**同一份** legacy `FromUnits` / `TypeBuilder.ParseReturnType`，没有第二条建树路径。
5. **验收读数全绿**：`gates` **4 / 0 / 7**；`wide-ast` **0 / 29 / 82+13=95**（与基线逐项相同）；
   `real-dts` **PASS**；`tts` **PASS 429**；`ts-all` **429 / 426 ok / 3 err**（同为 class-ball /
   expression-zoo / generic-container 三条）；`--legacy` **gates 4 / 0 / 7、wide-ast 0 / 0 / 2**；
   `cases:check` 1720 / 0。没有把「少几条」当完成（§4 写明没做的三类）。

> 任务书点名先读 `_reports/BRACKET-A2.md` 与 `_reports/B1.md`：这两个文件在基线 `20167c71` 的工作树与
> 全部 git 历史里都不存在（`_reports/` 只有 B0a / B2 / B2b / B2c / B3 / B4× 等）。本棒按同一份事实来源实施：
> `bracket-role-resolver.xl.md`（B0/A2 的判据与三态）、`parameter-list-possible-shape.xl.md`（B1 的
> `ParameterPossibleShape` / `ParameterScan`）、`_reports/B4c.md`（别名壳与收口格口径）、`_reports/B4g.md`
> （`=>` 与 replay 的既有通道）。

---

## 1. 改动文件（4 个：3 修改 + 1 新建探针）

| # | 文件 | 内容 |
| --- | --- | --- |
| 1 | `typescript/tokens/statements/bracket-role-resolver.xl.md` | 新增角色 `BracketRole.FunctionTypeParams`；`Classify` 的 `(` 分支新增「宿主是类型别名壳 + 配对 `)` 后紧跟 `=>`」⇒ `Known`；新增三个只读前瞻：`SkipTextTrivia` / `ParenCloseOf` / `HasFunctionArrowAfterParen` / `IsSimpleFunctionTypeParams` |
| 2 | `typescript/tokens/types/parameter-list-possible-shape.xl.md` | `ParameterScan.AllowQuestion` / `FinalizeDone`；`Probe` 动作 10（`?` → `QuestionTokenShape`，只在 `AllowQuestion` 为真时）；`EnsureRegisteredForFunctionType`（注册 `FunctionTypeParams` 目录，候选复用 `Shapes()`）；`InstallForFunctionType`（只给简单参数表挂状态）；`Finalize` 幂等（`FinalizeDone`）与 `Finalized` 的语义分开写清 |
| 3 | `typescript/tokens/declarations/type-alias-declaration-shape.xl.md` | 新字段 `FunctionType` / `ParamsBracket` / `ArrowConsumed` / `ArrowEnd`；`OnBracketCreatedEvent` 的 `(` 分支 → `MountFunctionType`；`TryFinalizeFunctionParams`（`)` 格收最后一个参数壳）；`ConsumeFunctionArrow`（`=>` 格搬参数、摘括号与 `=>`）；`TryBuildFunctionReturn` / `BuildFunctionReturn` / `FlushFunctionReturn` / `FlushFunctionReturnAt`（返回类型，legacy `TypeBuilder.ParseReturnType`）；`IsFunctionReturnTerminator`；`ComputeEndIndex` 拒绝「返回类型未建」的格；`NoteEqualStep` 加 `<>` 深度（只认别名自己的 `=`） |
| 4 | `typescript/cases/tts/tools/function-type-probe.mjs`（新） | 9 条只读断言：角色 `Known/FunctionTypeParams`、参数 / 返回类型子节点类名、F 的逐格首见 step（`(` / 名字关格 / `void` / 收口格）、`(B)` / `(B)[]` / `(B) \| C` 三个负样本的角色与树、增量树与 legacy `ToAstLine(0)` 完全一致 |

---

## 2. 逐格证据（`node typescript/cases/tts/tools/tshape-judge.mjs trace <file>`）

### 2.1 `type F = (x: number) => void`（acceptance 第 1 条）

| shape | step | char | 说明 |
| --- | ---: | --- | --- |
| `FunctionTypeShape` | **10** | `"("` | **`(` 创建格**；`Pos=9`（`=` 的 `EndIndex`），`src=[10,...)` |
| `ParameterShape` / `IdentifierShape(x)` | **12** | `":"` | 名字关格（`x` 的 `Common` 被 `:` 关闭）：`ParameterShape pos=11`、`IdentifierShape pos=11` |
| `NumberKeywordShape` | 20 | `")"` | 参数类型（`:` 闭合格建的 `ParameterShape.Type`） |
| `VoidKeywordShape` | **29** | `";"` | `=>` 后返回类型在 `void` 的**完成格**建出（`pos=24`，`TypeBuilder.ParseReturnType`） |
| `TypeAliasDeclarationShape`（正品） | 30 | `"\r"` | 收口格：**新增 shape 0**（只剩已经建好的 4 个形状换成正品） |

带分号的同一条（`tmp/fn1.ts`）：`VoidKeywordShape` @29 字符 `;`，别名正品 @30（`\r`）——
**收口格新增 shape 0**。不带分号时（`tmp/acc.ts`，下一条语句 `type G`）收口格是下一语句首词关闭的那一格
（step 34，字符 `" "`），同样新增 shape 0。

### 2.2 `type G = (a: string, b?: number) => a is string`（acceptance 第 2 条）

| shape | step | char |
| --- | ---: | --- |
| `FunctionTypeShape`（`Pos=38`） | 39 | `"("` |
| `ParameterShape(a)` / `IdentifierShape(a)` | 41 | `":"` |
| `StringKeywordShape`（a 的类型） | 49 | `","` |
| `ParameterShape(b)` / `IdentifierShape(b)` | 52 | `"?"` |
| `QuestionTokenShape`（`pos=52`、`op="?"`） | **53** | `":"` |
| `NumberKeywordShape`（b 的类型） | 61 | `")"` |
| `TypePredicateShape`（`a is string`） | 77 | `"\n"` |

`a` / `b` 各自在自己的名字格成 `ParameterShape + IdentifierShape`；`?` 在自己的闭合格成
`QuestionTokenShape`（`ParameterShape` 的子节点顺序 = Identifier → QuestionToken → Type，与 legacy
`ParseParameter` 同字段、同顺序）。

### 2.3 `type H = <T>(x: T) => T`（泛型函数类型，target 2 的「先做简单形参」）

| shape | 首见 | 说明 |
| --- | --- | --- |
| `ParameterShape(x)` / `IdentifierShape(x)` | 名字格 | 参数表由本棒早建（`InstallForFunctionType` 挂状态） |
| `TypeReferenceShape(T)`（参数类型） | 类型格 | 同上 |
| `FunctionTypeShape` | 收口格 | **仍由 legacy `ParseGenericFunctionType` 建**（壳不在本棒写域，§4.2） |

`ParameterShape` 的 `Pos` / 区间 / 子节点与 legacy 逐项一致（探针把整棵树与 legacy `ToAstLine(0)` 比对）。

---

## 3. 门控 / 兼容纪律

- **角色只在 B0 那一处判**：`FunctionTypeParams` 的判据写在 `BracketRoleResolver.Classify`，不在
  `TypeAliasDeclarationShape` 里另写一份。判据两条：① 宿主类名 `TypeAliasDeclarationShape`（类型槽）；
  ② 配对 `)` 之后紧跟 `=>`（`HasFunctionArrowAfterParen`）。`type A = (B)` / `(B)[]` / `(B) | C`
  落回既有 `Fallback("no-host-rule:…")`，一个字节都不改。
- **目录只装一次、候选只有一份**：`EnsureRegisteredForFunctionType` 幂等注册
  `BracketRoleCatalog("FunctionTypeParams", ParameterListPossibleShape.Shapes(), null)`；
  候选就是 B1 的 `ParameterPossibleShape`。`InstallForFunctionType` 只给
  `IsSimpleFunctionTypeParams` 认的形态 `EnsureState` + `AllowQuestion=true`。
- **简单参数表之外整段交 legacy**：默认值 / 解构 / 非简单类型（`X.Y` / `A<B>` / 函数类型参数）都判否 ⇒
  不建 `FunctionTypeShape` 壳、不挂状态、不建参数；`FunctionTypeParams` 目录虽然装上但 `FindState` 为
  `null`，`ParameterPossibleShape.IsBuildable` 恒 `false`，收口格由 legacy `ParseFunctionType` 一次建出。
- **`?` 只在函数类型参数表可建**：`ParameterScan.AllowQuestion` 默认 `false`，B1 的 function 形参表 /
  B4f 的箭头形参表一个字节不变（`tts` 426 / 0 与 `ts-all` 426 / 3 逐项同基即证据）。
- **收口不新增建树路径**：参数由 B1 在括号 `Data` 里逐字建，`=>` 格只**搬**（`FunctionType.Add`）、
  返回类型由 legacy `TypeBuilder.ParseReturnType` 建；别名收口仍是 `TypeAliasDeclarationShape.FromUnits`
  消费「单个已建类型节点」（B4c 的既有分支）。
- **`Finalize` 幂等与 B1 的 `Finalized` 分开**：`Finalized` 在第一个 `,` 收壳时就置真（B1 既有语义），
  不能当「收口已完成」；新增 `FinalizeDone` 只由 `Finalize` 在自己跑完时置真，防止「括号关格之后
  同一只括号又被问到」时为空壳另建一只 `ParameterShape`（§5.1）。

---

## 4. 明确没做的（不把「少几条」当完成）

### 4.1 复杂参数表（默认值 / 解构 / 非简单类型）— 显式后置

- 最小复现：`type R = (a = 1) => void;`、`type D = ({x}: A) => B;`、`type Q = (a: X.Y) => Z;`。
- 现状：`IsSimpleFunctionTypeParams` 判否 ⇒ 不建壳、不挂状态、整段交 legacy `ParseFunctionType`；
  树与 legacy 一致（`tshape ts` 对拍 ok），**但参数不是早建的**。任务书允许它们后置。

### 4.2 泛型函数类型壳（`type H = <T>(x: T) => T`）

- 现状：参数表早建（本棒的直接收益），`FunctionTypeShape` / `TypeParameterShape` 仍由 legacy
  `ParseGenericFunctionType` 在收口格建。要在 `<` 格建泛型头需要把 `TypeParameterList` 的早建
  （B4c 一直后置）也做掉，属另一棒的写域。
- 判据上有一个**安全的前瞻读法**：`(` 的宿主是别名壳且 `)=>` 成立就装参数目录，不管 `before` 是
  `=` 还是 `>`；只有 `before === "="` 才建 `FunctionTypeShape` 壳。`type X = Wrap<(a: number) => void>`
  因此也是「参数早建 + legacy 建壳」，树一致（`tshape ts` ok）。

### 4.3 联合 / 交叉里的函数类型（`type U = A | (x: B) => C`）

- 现状：`(` 在 `|` / `&` 之后不建 `FunctionTypeShape` 壳（联合的早建从 B4c 起就是关闭的，
  `BuildUnionStep` 恒 `false`）；这一族整段由 legacy `ParseUnionType` 建。不建壳是为了不把
  `UnionTypeShape` 与 `FunctionTypeShape` 的先后次序弄错。
- 返回类型里的函数类型（`type N = (a: A) => (b: B) => C`）同理：内层参数表早建、内层壳由
  legacy 在建外层返回类型时消费 —— 树一致，只是壳不在 `(` 格。

### 4.4 `;` 收口格的「新增 shape 0」口径

严格说：`void` 的 `VoidKeywordShape` 是在 **`;` 字符那一格**（`void` 的完成格）建的；
**别名收口格**（`;` 的下一次 Compute，step 30）新增 0。与 B4c「`}` 格没有新的同类外壳」同一读法。
若把「`;` 字符格」本身要求成 0，则与「`=>` 后 `void` 在自己的 token 格成 `KeywordType`」互相矛盾
（`void` 的最后一个字符之后没有别的信号，只能等 `;` 关闭它）；本报告按前一种读法给读数，并把两格
都列出来（§2.1）。

---

## 5. 实施中定位到的三个既有问题（都已在本次提交里修掉，附最小复现）

### 5.1 `Finalize` 被同一只括号问到两次 → 空壳 `ParameterShape`

`gap-r676-func-type-comment-before-arrow.ts`（`type F = (a: number) /* c */ => string;`）在 `)` 关格之后
括号仍是 `Data` 的末单元（注释 / `=>` 还没到），`Finalize` 第二次被调用时 `Probe` 的「没有开壳」分支
会为空壳另建一只 `ParameterShape`（实测 `ParameterShape pos=92 src=[92,...)` 一只、`src=[92,101)` 一只），
随后 `TryToClose` 抛错 ⇒ 整文件 fallback。修法：`ParameterScan.FinalizeDone` + `Finalize` 幂等闸
（**不能用 `Finalized`**：它在第一个 `,` 收壳时就置真，会让多参数函数声明最后一个参数永远建不出来 ——
本棒第一版这样改时新增 40 件 fallback，已回退重做）。

### 5.2 类型参数默认值里的 `=` 被当成别名等号

`type Visitor<TIn extends Node = Node, TOut extends Node | undefined = TIn | undefined> = (node: TIn) => VisitResult<TOut>`
（`typescript.d.ts`）的 `FunctionTypeShape.Pos` 落在**类型参数里的 `=`** 上（`399022` vs TS `398965`），
`wide-ast` 因此新增 2 条 `moved`（`typescript.d.ts` / `@types/node/module.d.ts`）。修法：`NoteEqualStep`
按 `Data` 里 `<` / `>` 符号的深度只认**深度 0** 的 `=`；`MountFunctionType` 另用紧邻括号的 `before`
的 `EndIndex` 作为 `Pos`（双保险）。

### 5.3 返回类型里的 `<…>` 提前收口 → 「泛型实参缺少 >」

`type R = (o: unknown) => Record<K, V>` 在 `K` 闭格（下一个字符 `,`）被判成「类型已完」，把
`Record<K` 交给 `ParseTypeArguments`。修法：`TryBuildFunctionReturn` 先数 `shapeAt+1..end` 里
`<` / `>` 的深度，深度 > 0 一律等下一格（`>>` / `>>>` 按字符数减）。

> 这三个都是**本棒启用早建之后才可达**的路径（`wide-ast` 基线 82 / 29 就是在它们修掉之前读到的
> 86 / 31）；修完回到 82 / 29，与基线逐项相同。

---

## 6. 验收读数（同一 bundle）

| 命令 | 基线 `20167c71` | 本分支 |
| --- | --- | --- |
| `xl_build {core,typescript}` | 634 页 / 0 error / 3 warning | **634 页 / 0 error / 3 warning** |
| `node node_modules/typescript/bin/tsc -p .` | exit 0 | **exit 0** |
| `node tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | **4 / 0 / 7** |
| `node tests/gates/run.mjs --legacy` | 4 / 0 / 7 | **4 / 0 / 7** |
| `node tests/parse/wide-ast.mjs` | 崩溃 0 / 差异 29 / fallback 82+13=95 | **0 / 29 / 82+13=95** |
| `node tests/parse/wide-ast.mjs --legacy` | 0 / 0 / 2 | **0 / 0 / 2** |
| `real-dts-ast`（gates 内） | PASS（0 崩溃 / 0-33 差异） | **PASS：0 崩溃 / 差异 0/33 / 缺 range 0** |
| `node typescript/cases/tts/run.mjs` | PASS 429 | **PASS 429 / FAIL 0** |
| `node typescript/cases/tts/tools/tshape-judge.mjs ts-all` | 429 / 426 ok / 3 err | **429 / 426 ok / 3 err**（同三条：class-ball / expression-zoo / generic-container） |
| `cases:check`（gates 内） | 1720 / 0 | **1720 / 0** |
| `node typescript/cases/tts/tools/function-type-probe.mjs` | — | **FUNCTION-TYPE-PROBE PASS**（`FunctionTypeMountCount=7`，9 个片段树与 legacy 一致） |
| `xl check`（3 个改动页） | — | **0 error / 0 warning** |

---

## 7. 可复算命令

```powershell
$d = "C:\Users\Admin\Documents\GitHub\xl-example-set\b4h-fn-type"; Set-Location $d
xl_build { cwd: $d, paths: ["core","typescript"], targets: ["ts"] }   # 634 页 / 0 error / 3 warning
node node_modules/typescript/bin/tsc -p .                              # exit 0

# 逐格 trace（acceptance 第 1 / 2 条）
@'
type F = (x: number) => void
type G = (a: string, b?: number) => a is string
type H = <T>(x: T) => T
'@ | Set-Content -Encoding utf8 tmp/acc.ts
node typescript/cases/tts/tools/tshape-judge.mjs trace tmp/acc.ts       # §2

node typescript/cases/tts/tools/function-type-probe.mjs                 # PASS
node tests/parse/wide-ast.mjs                                           # 0 / 29 / 82+13=95
node tests/parse/wide-ast.mjs --legacy                                  # 0 / 0 / 2
node typescript/cases/tts/run.mjs                                       # PASS 429
node typescript/cases/tts/tools/tshape-judge.mjs ts-all                 # 426 / 3
node tests/gates/run.mjs                                                # 4 / 0 / 7
node tests/gates/run.mjs --legacy                                       # 4 / 0 / 7
```

`tmp/` 全部 gitignored：`tmp/fallback-scan.mjs`（逐文件 fallback 对照）、`tmp/one-error.mjs`
（只走增量那一跳打印真实异常）、`tmp/ret-debug.mjs`（返回类型 builder 的单元序列）、
`tmp/wide-ours.txt` / `tmp/wide-base.txt`（`--per-file` 两栏差集）都不入库。
