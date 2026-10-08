# TypeScript 解析：现状、口径边界与不再试的改法

**这份文件只装「今天还有用」的东西**：口径边界、怎么量缺口、解析层的硬规矩、被证伪的改法。
逐轮的现场（每次的根因、探针、差分读数）在 **git 历史**里，不再往这里堆；
**当前读数只有一份**（README 的「当前状态」表），这里不再抄数字，免得两处各说一套。

## 现状

语料的覆盖面：`node_modules` 的 `@types`、`typescript/lib`、`undici-types`
加本项目的 `dist/ts/**`、`samples`、`tests/parse/cases/**`。
其中**所有真实可达的 TS 构造**都已经对上；`SyntaxKind` 全表与语料的差集只剩
**合成节点**（`Bundle` / `Count` / `SyntaxList` / `Synthetic*` / `NotEmitted*` / `PartiallyEmittedExpression`，
它们不由源码解析产生）与 **JSX 那一族**（见下）。

## 怎么量缺口

1. **语法有效性基准**是 TypeScript 自己的 parser：`ts.createSourceFile(...).parseDiagnostics`，
   只有 TS 认为合法的样本才算缺口。
2. **两条路一起用**：`cases:tsast` 量**形状**（与 `ts.createSourceFile` 逐节点比 kind / 区间 / 字段名，
   坐标是地基——没有坐标就只能靠文本猜位置，一遇到壳节点就断）；`coverage` 量**语义**
   （同一份 `.ts` 交给 `node` 与 `tsrun` 各跑一遍，比 stdout 逐字节 + 退出码）。
3. **加宽语料之前先普查**（`npm run coverage:sweep -- <候选.mjs>`）：候选的形状与 `cases/*.mjs` 一样，
   但**不写读数、不看台账、不红**——拿 `run.mjs` 去试会得到一片红，红里混着「真坏了」与「本来就还没做」。
4. **搜缺口要写小片段探针**（一条一个构造、同进程对拍）：203 条片段一次就翻出六处真缺口
   （第 623 轮），比读大文件快得多。

## 口径边界（**明确不做**，不是缺口）

| 边 | 为什么 |
| --- | --- |
| **JSX / TSX** | 独立于 TypeScript 的语法扩展，不在 `.ts` 范围内。四个 `.tsx` 用例只钉住「不抛异常 / 不吞掉后面的代码」 |
| **`RegExp`** | `runtime-architecture.md` §15 那张「明确不做」的表里（与 `BigInt` / `Proxy` / `Intl` 同档） |
| **装饰器的运行期语义** | 同一张表；`node` 的类型剥离与变换两种模式都拒收，裁判给不出来 |
| **多文件模块加载** | 由宿主的装载器决定；`tsrun` 的口径是**单文件** |
| **`Object.freeze` 之后写属性 / 只读访问器上赋值** | 本仓一律抛（**严格模式**的选择）；`node` 把 `.ts` 当 CJS 跑是松散模式、静默失败 |
| **`console.log(new Error("x"))`** | Node 打的是**栈**（含 V8 内部帧，行号随宿主版本变），逐字复现不在目标里 |

## 解析层几条硬规矩

- **ASI 按形状预判**（`typescript/tokens/statement.xl.md` 的 `Statement.IsLineBreakBoundary`）：
  前一个单元不再要操作数、后一个单元也不能续接 ⇒ 断句，加上 `return` / `throw` / `break` /
  `continue` / `yield` 与后缀 `++` / `--` 的受限产生式。规范里还有一条「**语法不允许时**才插分号」——
  本工程不看完整文法、只看形状，所以极端排版仍可能与 TS 不同，这类情况由 `cases:tsast` 巡检。
- **不看未来**那条铁律：判据只用**已经读到**的东西，所以「成员层」这类没有入口字符的构造
  靠**体自己认边界**（见 [member-layer-plan.md](member-layer-plan.md)）。
- **`Parent` 不变式**（`core/syntax/close-rule.xl.md` 的 `ApplyTo`）：规则用 `ReplaceCountAt`
  换进来的节点**不带 `Parent`**（那是核心的 `splice`），每趟 `Process` 之后就地把新换进的那一小段补齐——
  否则「靠当前单元的父亲认容器」的规则（元组成员、方括号类型…）会判不出容器。
- **正则不能吞代码**：`/` 只有在**本行内能找到配对的 `/`** 时才算正则开头——
  少了这条，JSX 闭合标签 `</div>` 里的 `/` 会把文件余下内容整段吃掉。
- **字符串起点有三种引号**（`"` / `'` / `` ` ``，见 `parse-pipeline.xl.md` 的 `ExtendStringStarts`）：
  少了单引号 / 反引号，`import … from './x'` 里的 `/` 会被正则词法接手。
- **语言配置带来的差异不是缺陷**：`\a` 解成响铃字符而不是字母 `a`；
  `@'…'` / `@"…"` 是逐字字符串前缀、不是装饰器。

## 已知仍开着的缺口

四条都是**探针量出来的**（`tmp/` 里那种一次一条的小片段，见「怎么量缺口」第 4 条），
**不在语料里**——所以七道门是绿的，而它们是真实存在的形状：
- **对象字面量里的「语句关键字」当成员名**：`{ if(): T { … } }` / `{ function(): T { … } }`。
  **其余三十来个保留字都已经对了**（第 640 轮，`return` / `throw` / `delete` / `new` / `in` /
  `typeof` / `void` / `await` / `yield` / `class` / `default` / `enum` …，
  判据 [`expr-object-keyword-method-names.ts`](../tests/parse/cases/expressions/expr-object-keyword-method-names.ts)）；
  这三个是被**更早的规则 / 解析期向导**抢走的：
  `if` 由 `IfSetBranch` 在 `(` 处认领（`if-set.xl.md`，那是个**跳转向导**，只看「前面那个词是 `if`」，
  不看位置），`function` 由 `FunctionCloseRule`、`import` 由 `MethodDeclarationCloseRule` 里那条
  **就地拒收**（`typeof import("m")` 与 `{ import(): T { … } }` 的父单元都是成员体，
  按父单元分不开——第 640 轮试过、当场被 `types/type-import-typeof-member` 拦下）。
- **`do` 的体本身是一条 `while` 语句**：`do while (a) x++; while (b);`。
  体起手就是 `while` 词，`DoWhileCloseRule.BodyEnd` 的「往后找到那个 `while`」于是找到**体自己**，
  返回的结尾落在体起点之前（实测体空、`x++` 掉在 `DoWhile` 外面，多出 4 个节点）。
  要修得先能算出「一条 `while` 语句到哪结束」——那时它自己还没收尾，与下面那条 `do if`
  是同一类问题的两个方向。**`do` 的体是 `if` 语句的那一档已经修掉**（第 646 轮）：条件是
  `while (c);` 自带分号、先被语句层收成壳，`BodyEnd` 与 `Previous` 现在都认得「壳里第一格是
  `while`（或已经是 `While` 单元）」，`Process` 多一支按壳/单元取条件并签在壳的右端
  （那个 `;` 在壳的区间里），判据
  [`stmt-do-while-if-body.ts`](../tests/parse/cases/statements/stmt-do-while-if-body.ts)。
- **`switch` 体里同一行写完一个块，后面再跟 `case` / `default`**：
  `switch (1) { case 1: { break; } default: break; }`。语句层把 `default:` 那一截并进了
  **同一个 `Statement` 壳**，而 `switch` 的分段是在体括号的**顶层单元**上找 `case` / `default`
  （`switch.xl.md` 的 `SegmentWordOf`）——壳只有一个，于是只有一段，`default` 整条落进前一段的
  `SwitchStatement`。**换行写法是好的**（`default:` 自己一条壳），所以只有单行 / 压缩过的代码中招。
  同族的那条「块后面紧跟着表达式」在 [README](../README.md) 的「开着的缺口」里，改法已被否决过
  （块当语句边界会切断复合赋值的展开），这一条要修得先能区分「块 + `case`」与「块 + 操作数」。
- **带两个以上实参的泛型出现在下标访问的方括号里**：**已修**（第 644 轮）——
  `type X = K[A<B, C>]` 里那个 `<` 的宿主是**还没成形的 `[`**，它自己的 `Data` 里只有 `K` / `A`
  两个操作数，本地回扫只能答「表达式位」。修法不是原来记的「重跑括号自己的队列」（那条路走不通：
  `GenericType` 由**跳转向导**在读取时成形，关闭之后重跑收尾规则补不回来），
  而是 `generic-type.xl.md` 的 `IsTypePosition` 多一档：宿主是**方括号**时，
  换宿主、换起点（括号在父单元里的下标减一）把同一个问题再问一次，并加一个 `bounded`
  收窄——只走当前这一条声明，括号与语句壳都是边界（函数体在解析期摊平在 `Root` 上，
  不收窄会一路穿到上一条声明的 `:` 上）。用例
  [`type-indexed-access-generic-args.ts`](../tests/parse/cases/types/type-indexed-access-generic-args.ts)。
- **非空断言的成员链后面**`再**接一个字符串**（第 638 轮又缩了一次 ✓）：
  `o.a!.toString() + "x" + "y"` 里**第一个 `+`** 折不出来 ✓ ⇒ 后面那个 `"y"` 反而被
  `PropertyAccessCloseRule` 当成成员链收了 ✗（实测缺 `CallExpression` / `PlusToken` /
  `StringLiteral` 各一 ✓）。
  **缩到只差一步** ✓：`o.a.toString() + "x" + "y"`（**没有 `!`**）是好的 ✓、
  `o.a! + "x"` 是好的 ✓、`f() + "x" + "y"` 是好的 ✓ ⇒ 触发条件是
  「**`!` 断言的成员链 + 一次调用，再接两个以上的 `+`**」✓。
  这一条的**另外两条**已经修掉 ✓（同一轮 ✓）：
  `!` 后面跟 `.` 被误判成明确赋值断言（`not-null.xl.md` 的 `IsDefiniteAssignment` ✓）、
  「调用结果接字符串」被误当成模板标签而放过（`binary-operator.xl.md` 的 `CanBeTag` ✓）。
  两条都进了用例：`tests/parse/cases/expressions/ex-nonnull-member-chain.ts` 与
  `ex-call-plus-string-chain.ts`。
  剩下那一档**还没定位到是哪条收尾规则抢跑** ✓——加 `IfSegment.BraceRangeText` 时踩到过 ✓，
  规范源码暂时写成「先各取一个 `String`、再拼两个局部量」绕开 ✓。

**已经修掉的**（留着是为了说明「哪一类形状值得先探」）：`do` 的体自带分号那一族
（`do x++; while (c);` / `do ; while (c);` / `do f(); while (c);`，第 635 轮）、
循环头部括号里出现 `)`（`while (g(")")) ;`，第 634 轮）、
括号 / 一次调用当被调用者时的可选链（`(x as T)?.m?.()`，第 630 轮）、注释夹在语法相邻位置之间
（`new /* c */ A()`、`for (const a /* in */ of xs)`、`a /* c */ = 1`、`[a /* c */?: T]`，第 631 轮）。

## 被否决的改法（不要再试）

1. **`Token.Reorganize` 改成「每条规则重复扫到无改动」**：能让三层以上嵌套三元收敛，
   但它对**所有规则**生效 —— 整批用例一起跑直接 `FATAL ERROR: heap out of memory`。
2. **把 11 个复合赋值符号补进 `IsCombinedSymbol`**：`a ??= 1` 一族内存失控
   （单条 200ms、整份文件 5 秒超时 + 768MB 堆爆）——「切成 `op` + `=` 再克隆左值」
   与「克隆出来的单元又被同一条规则重新处理」叠在一起发散。
3. **`IsMemberSignature` 要求「参数表后紧跟 `:`」+ `BodyIndex` 要求「同行的 `{`」**：两条都是**净回归**
   （把接口里成片的多行重载、一行一条的 `get x(): number` 一起打掉）。
   要修得先能区分「体在下一行」与「下一条成员」——只往前看分不出来。
4. **把语句位上的裸块当语句边界**（`StatementReorganization2.Previous`）：切断了复合赋值的展开，
   **整段内容丢失**，比边界不合严重。
