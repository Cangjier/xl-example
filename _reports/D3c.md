# D3c · 类型侧·尖括号配对（声明 / 类型 / new / 箭头泛型）

| 项 | 值 |
| --- | --- |
| 状态 | **检查点已提交**（未合并 / 未 push / 未删目录） |
| 分支 | `feature/d3c-angle` |
| 目录 | `C:\Users\Admin\Documents\GitHub\xl-example-set\d3c-angle` |
| base | `9734f514` `merge(d3a): raw initializer operators + orphan operator guard` |
| 交付 | 4 个 `.xl.md`（+330 / −6 行），全部在增量路径上；默认开关**未翻** |
| 构建 | `xl_build` 628 页 / **0 error** / 3 warning（3 条 E1107 base 已有）；`tsc -p .` **exit 0** |

**结论：目标达到。ON 崩溃 104 → 87（−17，目标 ≤88），尖括号三族（`符号 <` 9 + `尖括号缺少配对 >` 7 + `符号 >` 2）从 18 条降到 3 条。**
代价如实写在第 4 节：差异 104 → **106（+2）**，两条都是**修掉遮挡之后露出的既有增量缺陷**（各给了最小复现），
其中 1 条是「原来 ok → 现在 diff」，按验收口径算**回归 1**。

---

## 1. 根因：增量路径上「这一格在不在尖括号里」不可能用 `units` 回答

D3/D3a/D3b 把 `<` 族一直留给「尖括号配对」，但没人写下**为什么配对一直配不上**。本波第一件事是把它量出来：

`CatalogGuide` 是**逐格**问候选的（`core/syntax/catalog-guide.xl.md:85-107`）。`<` 那一格到达时，宿主的 `Data`
**只到 `<` 为止**——`T` / `>` 还在后面的字符流里：

```
const a = new A<T>;        <  那一格 Data = [a, =, new, A, <]            (8 格)
const f = <T,>(a: T)…      ,  那一格 Data = [f, =, <, T, ,]              (6 格)
```

于是 `AngleJudge.FindClose`（按 `units` 找配对）**恒返回 -1**，`CanStart` 恒假，
`CompositeInitializerTailJudge.Family` 的 `angle` 支只在「`=` 之后第一格就是 `<`」时命中，
`HasOpenTypeArgument` 只数 `>` 却永远等不到 `>` 减少——**所有基于 `units` 的配对判据在增量路径上都是空转**。
实测：把 `IsGroupMember` 写成 `FindClose` 版本，9 条 `declaration 符号 <` **一条也没动**（这正是本波第 1 次实验）。

### 修法：把配对放到**源码原文**上

`Token.SourceRange.Document` 是活的（`core/syntax/source-range.xl.md:31`），`GetRawRange(start,end)` 只读、
不建 token、不改形状。新增 `AngleJudge.FindCloseAhead(unit)`：从 `<` 这一格的 `EndIndex` 往后扫原文，
`<` +1 / `>` −1，归零即配对，返回配对 `>` 在文档里的下标。

保守闭集（判否就退回旧的显式错误，不猜）：

| 判否条件 | 理由 |
| --- | --- |
| 深度 > 0 时遇到 `;` `)` `=` `&&` `\|\|` | 它们不可能出现在类型实参 / 类型参数表里；没有这一条，比较链 `tokenIndex < 0 \|\| tokenIndex >= units.length` 会被读成尖括号组（实测把 `construct-signature-possible-shape.ts` 漂了一格） |
| `>` 后面紧跟 `=`（`>=`） | 比较运算符不是括号 |
| 反引号模板里有 `${` | 插值里再嵌 `<>` 不猜 |
| 没有 `Document` / 超过 `FindCloseAheadLimit`（4096 字符） | 单元测试里直接构造的形状、畸形输入 |

**为什么不数角深度**：比较链 `x == y < z` 里的裸 `<` 没有配对，按深度数会永远判「组还开着」，
整条声明再也收不了口。`FindCloseAhead` 返回 `-1` 正好把「不是组」判出去。

---

## 2. 改动（4 个文件，全部增量路径）

### 2.1 `typescript/tokens/types/angle-judge.xl.md`（+190 行，本波 ownership 的核心）

| 新增 | 内容 |
| --- | --- |
| `static field FindCloseAheadLimit:int = 4096` | 原文扫描上限 |
| `FindCloseAhead(unit)` | 原文配对扫描（规则见 §1） |
| `IsOpenAt(units, index)` | 本格之前有 `<`，其**原文配对 `>`** 落在本格或更后 |
| `IsGroupMember(units, index)` | 开括号那一格 / 组内任何一格 / 配对的 `>`（= `IsOpenAt` + 自己就是 opener） |
| `IsOpenGroup(units, index)` | `IsGroupMember` 的别名，给「这一格不能收口」那两处调用点读顺 |

既有 `FindClose` / `FindPair` / `CanStart` / `Shift` / `Guard` / `ScanDepth` **一个字未改**。

### 2.2 `typescript/tokens/declarations/variable-declaration-end-possible-shape.xl.md`（+62 行）

1. **`[D3c:ANGLE]` 新分支**（在 A4c 尾形分支之后、`HasOpenTypeArgument` 之前）：
   本格是 `Symbol("<" | ">" | ">>" | ">>>")`、**是组员**、**初始化器还是纯 raw**、**没有类型注解** ⇒ `Uncertain`（继续等），
   把整组交给收口格的原子建树（legacy `ExpressionBuilder`：类型实参 / 实例化表达式 / 泛型箭头 / 尖括号断言 /
   标签模板都由它建，与 legacy 同源，读完不齐就显式抛「初始化器未读完」）。
   - 三条反向边界：`IsRawInitializer` 为假（`const y = f()<T>` 这种形状之后再现尖括号）→ 原样 `throw`；
     `HasAnnotationColon`（注解由 TypeMode 接管）→ 原样 `throw`；**裸的 `<` / `>`（配不上对）→ 原样走既有分支**，
     所以 `a < b` 这类比较的既有账本一个字不改。
2. **ASI 两条判据加「组已经关完」**（trivia 分支 + `Common` 分支）：`AngleJudge.IsOpenGroup` 为真时不 `Accept`。
   `const f = <T` ⏎ `,>(a: T) => a` 在换行那一格原来会收口，收下去就是把 `<T` 半个尖括号交给原子建树。

### 2.3 `typescript/tokens/declarations/variable-declaration-list-possible-shape.xl.md`（+14 行）

`VariableDeclarationListEndPossibleShape.ComputeByIndex` 的 `Symbol` 分支最前面加一条：
**组员格一律 `Reject`**（`;` / `,` / `!` / `}` 都不在组里）。`<T,>` / `new Map<string, number>()` / `f<A, B>`t`` 的逗号
还开在 `<…>` 里，原来在那一格 `Accept`：声明带着半条初始化器收口，`FinishIncremental` 的原子建树拿到 `<T` 这样
半个尖括号，`ExpressionBuilder.ParseAngleStart` 抛「尖括号断言/泛型箭头缺少配对的 >」——**这就是那 7 条的真身**
（不是投影层，也不是 `bracket.xl.md`）。同一文件的两条 ASI 判据也加了 `IsOpenGroup` 附加条件。

### 2.4 `typescript/tokens/statements/statement-legacy-metrics.xl.md`（+8 行）

新增 `DeclarationAngleWaitCount`（+ `Reset` 里清零）：本判据「继续等」的次数，作为「尖括号整组进了可验证的原子建树
路径」的计数器——与 D1 的 `DeclarationBracketWaitCount` 同一用途。

### 2.5 为什么不动 `bracket.xl.md` / `member-chain-judge` / `variable-declaration-shape`

- 三角冲突点（triage §6.2）点名 `bracket.xl.md` 与 D3a 串行。本波**没有碰它**：尖括号的角色问题全部收在
  `angle-judge` 的原文配对里，`Bracket` 的既有 `Replay` / 角色判据一个字未动。
- `member-chain-judge`（D3a2）、`variable-declaration-shape`（D3a / D3a2）**一行未改**。

---

## 3. 读数（同一语料 / 同一口径，`tmp/snap.mjs` + `tmp/hop.mjs`）

```powershell
node tmp/snap.mjs tmp/snap-before.json      # base 9734f514（同一构建，未改源码）
node tmp/snap.mjs tmp/snap-a3.json          # 本提交
node tmp/cmp.mjs tmp/snap-before.json tmp/snap-a3.json
$env:HOP_DEPTH="-1"; node tmp/hop.mjs tmp/hop-final.json    # 首跳最深一条消息的族计数
```

| 指标 | base | 本提交 | 差 |
| --- | --- | --- | --- |
| 语料 / 跳过 TS 非法 | 2573 / 11 | 2573 / 11 | 0 |
| **崩溃** | **104** | **87** | **−17** |
| AST 完全一致 | 2354 | **2369** | **+16** |
| 有差异 | 104 | 106 | **+2** |
| `FileFallbackCount` | 239 | **182** | **−57** |
| 靠 fallback 救回（最终 ok/diff） | 135 / 3 | **95 / 3** | **−40** |
| 缺 range / 越界 / 字段名 | 0 / 0 / 0 | 0 / 0 / 0 | 0 |
| structural / moved | 607 / 130 | 614 / 131 | +7 / +1 |

逐文件三向比对（`tmp/cmp.mjs`）：`ok→ok` 2353、`crash→crash` 87、`diff→diff` 104、
**`crash→ok` 16**、`crash→diff` 1、**`ok→diff` 1**、`ok→crash` **0**、`diff→crash` **0**。

> `FileFallbackCount` 239 → 182 是**同一件事的另一把尺子**：本波没有把崩溃藏进 legacy，而是把 57 个文件
> 从「首跳抛错 → legacy 重解析」搬到「首跳自己走通」。triage §4 的隐性债务同步下降。

### 3.1 三个子族的前后计数（首跳口径）

| 子族（首跳最深消息） | 前 | 后 | 说明 |
| --- | --- | --- | --- |
| `增量变量形状未支持：declaration 符号 <` | **9** | **2** | 7 条转 ok；剩 2 条是**真比较链**（§5.2） |
| `尖括号断言/泛型箭头缺少配对的 >` | **7** | **0** | 清零（逗号不是列表分隔符 + ASI 不收在组里） |
| `增量变量形状未支持：declaration 符号 >` | 1 | **0** | `gap-d-generics-tuple-mapped-02.ts` → ok |
| `增量变量形状未支持：declaration >` | 1 | **1** | `gap-r977-inst-tagged-two-args.ts`，见 §5.1 |
| **合计** | **18** | **3** | −15 |

### 3.2 16 条 `crash→ok`（逐条）

`decl-instantiation-chain`（`a.b.c<string>`）、`fn-arrow-generic`（`<T,>(a: T): T => a`）、
`expr-arrow-generic`、`expr-async-arrow-adjacent-comment`、`expr-async-arrow-return-newline`
（`async (): Promise<void> => {}` 的返回类型）、`expr-generic-arrow-return-newline`、
`expr-generic-call-newline-before-comma`、`expr-new-generic-no-args`（`new A<T>`）、
`gap-r902-new-typeargs-newline`（`new A` ⏎ `<B>()`）、`gap-r907-arrow-generic-comment-before-close`、
`gap-r907-arrow-generic-newline-before-comma`（`<T` ⏎ `,>`）、`gap-r937-angle-assertion-newline`、
`gap-r979-new-inst-tagged`（`new f<T>`t``）、`gap-d-generics-tuple-mapped-02`、
`type-generic-signature`（`{ <T>(x: T): T }` / `const m = <T,>(x: T) => x`）、`type-param-const-comma`（`<const T,>`）。

**16 条全部 AST 逐节点一致**（不是「少崩」，是树对了）。

---

## 4. 差异 +2：两条都是**被崩溃遮住的既有增量缺陷**，不是本提交造出来的错树

### 4.1 `crash→diff`：`tests/cases/token/ambiguous/am-type-arg-in-new.ts`（structural=7）

```ts
const a = new Map<string, number>()   // ← 这一条现在走通了（修前首跳抛 `declaration 符号 <`）
const b = new Foo<T>(1)
```

最小复现（`tmp/cases/a3.ts`，两条语句各有 `<>`、都靠 **换行 ASI** 收口）：

```ts
const a = new Map<string, number>()
const b = new Foo<T>(1)
```

⇒ 第二条语句整条丢失（`VariableStatement/List/Declaration` 三连 −1、`Identifier −3`、`NewExpression/TypeReference/NumericLiteral` 各 −1）。
拆开单跑两条都对（`tmp/cases/a1.ts` / `a2.ts` 都是 ok），`const a = 1` ⏎ `const b = new Foo<T>(1)` 也对（`a4.ts`）——
**缺陷在「前一条是带尖括号组的声明、又在行尾 ASI 收口」这一格的壳层挂载**，不是本波改的三处判据：
`tmp/trace3.mjs` 实测该格的 `AngleJudge.IsGroupMember` 为 **false**（组已关完），
本波的 ANGLE 分支与 ASI 附加条件在该文件上**一次都没响**；它的行为差异只有一条——**不再抛错**。

### 4.2 `ok→diff`（验收口径上的唯一回归）：`dist/ts/typescript/tokens/types/construct-signature-possible-shape.ts`

修前：首跳在 `cache.GetState<MemberPossibleScan>(…)` 的 `<` 抛错 → **文件级 fallback** → 树正确（`fallback: true`）。
修后：首跳走通 → 增量路径建出 **`(modifierRecovery && built) instanceof MethodSignatureShape`**，
TS 是 `modifierRecovery && (built instanceof MethodSignatureShape)` ⇒ `moved BinaryExpression[28] 1`（`tmp/one.mjs`、`tmp/dump.mjs` 逐节点对拍）。

**这是与尖括号无关的既有增量缺陷**，最小复现（`tmp/cases/inst1.ts`，**一个尖括号都没有**，修前修后都错）：

```ts
const a = x && y instanceof Z;      // 增量：(x && y) instanceof Z   TS：x && (y instanceof Z)
const a = x && y in Z;              // 同样（tmp/cases/inst3.ts）
const a = x || y instanceof Z;      // 同样（tmp/cases/inst4.ts）
const a = x instanceof Y && z;      // 对（tmp/cases/inst2.ts）
```

⇒ `instanceof` / `in` 在 `&&` / `||` **右侧**时没有按优先级再结合（`ReassociationPossibleShape` 那一层）。
归 **D3b / 表达式二元族**（`binary-expression-possible-shape` / `reassociation-possible-shape`），不在本波 ownership，
一行未动。修掉它，本波的差异会回到 104。

---

## 5. 未完成项（按子族 + 最小复现 + 归谁）

### 5.1 D3b §5.3 的 6 条 `f<T>`t`` / `b instanceof C<D>` / `typeof f<T>`：**配对修好了，但仍抛**

| 文件 | 首跳 | 为什么本波接不住 |
| --- | --- | --- |
| `expr-inst-tagged.ts`、`gap-r977-inst-tagged.ts`、`gap-r977-inst-tagged-template-expr.ts`、`gap-r977-inst-tagged-two-args.ts` | `CatalogGuide @BinaryExpressionShape 下标 2`（前一条 `declaration >`） | `f` 已经先被 primary 候选建成 `IdentifierShape`，`Data` 因此**不是纯 raw**，本波 `` IsRawInitializer`` 界定的 deferral 不进入；`<` 那一格落到 `HasReducibleLeft`（左操作数已是形状 ⇒ 真）⇒ 让给 `BinaryOperatorPossibleShape`，于是又折成 `f < T` |
| `expr-instanceof-instantiation.ts`、`gap-d-generics-tuple-mapped-01.ts` | 同上 | `instanceof` 右边那一段同一个问题 |
| `expr-operand-template-generic.ts` | 同上 | `typeof f<T>` 的操作数是已建形状 |

最小复现：`const a = f<T>`t`;`（`expr-inst-tagged.ts` 第 1 行）。
**要接住它们，判据必须从「终结候选的 raw deferral」上移到「已建形状 + `<`」那一格**——
也就是 `BinaryOperatorPossibleShape` / `RightOperandPossibleShape` / `MemberChainJudge` 那一侧（D3b / P1 写域）。
本波**故意不动**：D3b §3.1 的 C10 与 `member-chain-judge` 的 ownership 都不在我这里，且
「崩是没了、树是错的」（`TaggedTemplateExpression −1 / BinaryExpression +2`）比继续抛更坏——
**本波没有让任何一条 `TaggedTemplateExpression` 变成 `BinaryExpression +2`**（`tmp/cmp.mjs` 里没有这类 structural 变化）。

### 5.2 剩下的 2 条 `declaration 符号 <`：**真比较链**，不是尖括号

```ts
const a = x == y < z   // expr-comparison-chain-mixed-eof-no-newline.ts（同类还有 expr-comparison-chain-mixed.ts）
```

`<` 两边没有 `>`（`FindCloseAhead` = −1）⇒ 本波判「不是组」⇒ 原样落到兜底 `throw`。
它要的是 `HasReducibleLeft` 认识「raw 前缀 `x == y`」这一半（D3a §6 已把它归 P5 / A4b），
或者把 `<`/`>` 加进 `CanDeferToAtomicInitializer`（D3a 当年为了不制造「半截尖括号」故意排除，
现在那半已经由本波 ANGLE 分支接管，**下一波可以安全加回来**——本波回合不够，未做）。

### 5.3 `SourceRange is not set`（5 条 lib.d.ts）+ `构造类型缺少 new`（1 条）

`lib.es2015.proxy` / `lib.es2017.object` / `lib.es2019.object` / `lib.es2024.sharedmemory` / `lib.esnext.typedarrays`：
首跳仍是定位异常，与 triage §7.3 的「显式 Fallback + 计数」路线一致，本波未触。
`type-return-abstract-new.ts`（`declare function f(): abstract new (a: number) => A;`）在返回类型里，
归**函数返回类型**那一族（D3 的「声明 / 函数」5 条），不在本波 ownership。

---

## 6. 默认关的四道门（与 base 逐项一致）

| 命令 | 读数 |
| --- | --- |
| `node typescript/cases/tts/run.mjs --quiet --json tmp/tts-final.json` | **exit 0**；total **429**，`ok 426` / `failures 3`（3 条既有 `throw` 用例） |
| `node typescript/cases/tts/tools/tshape-judge.mjs ts-all` | **429 / 426 ok / 3 err**（exit 1 是判据语义，base 同） |
| `node tests/gates/run.mjs` | **4 PASS / 0 FAIL / 7 N/A**（`wide-ast` PASS、`real-dts-ast` ok、`cases:check` 1720 条 0 不合格、`direct:lint` 0 违反；`wide-ast` 的 `FileFallbackCount 2` 与基线一致） |
| `xl_build {paths:["core","typescript"]}` | 628 页，**0 error**，3 条 E1107（base 已有） |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |

默认开关仍是 `false`：本波改的四个文件只在 `EnableIncrementalVariableShapes` 为真时被调用
（`angle-judge` 的三个新方法只被 `variable-declaration-*-possible-shape` 调用），
所以默认路径与 base 逐字节一致——四道门读数逐项不变即是证据。

---

## 7. 可复算命令

```powershell
$d="C:\Users\Admin\Documents\GitHub\xl-example-set\d3c-angle"; Set-Location $d
git log --oneline -1                                        # 检查点 SHA
xl_build { paths:["core","typescript"]; targets:["ts"] }     # 628 / 0 error / 3 warning
node node_modules/typescript/bin/tsc -p .                    # exit 0 -> build/ts

node tmp/snap.mjs tmp/snap-before.json                       # 改前：crash 104 / diff 104 / fallback 239
node tmp/snap.mjs tmp/snap-a3.json                           # 改后：crash  87 / diff 106 / fallback 182
node tmp/cmp.mjs tmp/snap-before.json tmp/snap-a3.json        # 逐文件三向比对（ok->crash 0 / ok->diff 1）
$env:HOP_DEPTH="-1"; node tmp/hop.mjs tmp/hop-final.json      # 首跳族计数（深层消息口径）
$env:HOP_DEPTH=$null
node tmp/pick.mjs tmp/hop-final.json "符号 <|尖括号"          # 子族逐文件
node tmp/cells.mjs <file>                                    # CatalogGuide 抛出格的宿主 + Data 全表
node tmp/trace3.mjs <file>                                   # 逐格：族判定 + IsGroupMember + ASI 两条判据
node tmp/one.mjs <file>                                      # 单文件 AST 对拍（structural / moved 逐条）
node tmp/dump.mjs <file>                                     # 全节点区间（跨构建逐行 diff 用）
```

`tmp/` 全部 gitignored，不提交。本波新增探针：`tmp/hop.mjs`（首跳**最深**一条消息的族计数 + 逐文件）、
`tmp/pick.mjs`（按族过滤）、`tmp/cells.mjs`（CatalogGuide 抛出格）、`tmp/trace3.mjs`（逐格判定流水）、
`tmp/one.mjs` / `tmp/dump.mjs`（单文件对拍 / 全节点区间）、`tmp/trans.mjs`（迁移清单）。
