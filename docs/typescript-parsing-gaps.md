# TypeScript 解析：现状、口径边界与不再试的改法

**这份文件只装「今天还有用」的东西**：判据怎么量、哪些形状明确不做、哪几条改法已经被证伪。
逐轮的现场（每次的根因、探针、差分读数）在 **git 历史**里，不再往这里堆。

## 现状（第 623 轮实测）

| 判据 | 读数 |
| --- | --- |
| `cases:tsast` | **1491 / 1491 逐文件完全一致**（缺 / 漂移 / 多出 / 字段名四方向全 0） |
| 未映射标签 / 缺 range / 区间越界 | **0 类 0 处 / 0 / 0** |
| 语料 | `node_modules` 的 `@types`、`typescript/lib`、`undici-types` + 本项目 `dist/ts/**` + `samples` + `tests/parse/cases/**` |

语料里**所有真实可达的 TS 构造**都已经对上；`SyntaxKind` 全表与语料的差集只剩
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

- **括号断言的表达式当链底**（第 623 轮发现）：`(x as T)?.m?.()` 与 `(x as T).m?.()`。
  `MethodCloseRule` 抢在链规则前面，把那个 `Bracket` 读成一次调用 ⇒ 降级层报
  `unimplemented: expression DotToken` / `NullConditionalOperator`。
  `(x as T)?.v` / `(x as T)?.m()` / `o.m?.()` / `o?.m?.()` 都是好的，只有这两格断。

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
