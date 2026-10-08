# tests/cases —— 五类用例语料

**一条用例 = 一个 `.ts` 文件。** 五类语料在目录树上同一形状：

```
tests/cases/<类别>/<功能域>/<名字>.ts        类别 = token / exec / runtime / stdlib / e2e
```

| 类别 | 尺子 | 谁在量 | 权重 |
| --- | --- | --- | --- |
| `token` | **AST 尺子**：逐节点对 `ts.createSourceFile`（kind / 区间 / 字段名 + 未映射 / 缺 range / 越界） | `cases:tsast`（门）与 `coverage`（百分比） | 15% |
| `exec` | **执行尺子**：`node` 与 `tsrun` 各跑一遍，比 stdout 逐字节 + 退出码 | `coverage` | 25% |
| `runtime` | 同上 | `coverage` | 25% |
| `stdlib` | 同上 | `coverage` | 20% |
| `e2e` | 同上 | `coverage` | 15% |

## 文件头的文法

文件头是若干行 `// xl:<键> <值>`，**以 `// xl:end` 收尾**（覆盖层必须写；token 用例没有），
后面才是正文。**正文一个字节都不动**——跑的就是它。

```
// xl:title 泛型类的静态成员与实例字段
// xl:round 330
// xl:judge stdout
// xl:want blocked
// xl:why 静态成员在这一版还没有自己的格子
// xl:end
class Box<T> { static of<U>(u: U): U { return u; } }
console.log(Box.of(1));
```

| 键 | 属于 | 含义 |
| --- | --- | --- |
| `xl:note` / `xl:title` | 两套 | 这条在测什么的**一句话**（`note` 是 token 语料的旧名，等价） |
| `xl:expect` / `xl:absent` | token | 产物里必须出现 / 一个都不许有的标签（`Tag` 是「至少一个」、`Tag:N` 是「正好 N 个」） |
| `xl:known-gap` | token | 这条是**已知缺口**——差额走另一条账，还得对不上才记 `KNOWN` |
| `xl:ts-invalid` | token | 故意写非法 TS（默认必须合法） |
| `xl:bom` | token | 这份文件显式带 BOM（默认不许带） |
| `xl:want` | 覆盖层 | 台账：`pass`（默认）/ `blocked` / `differ` |
| `xl:skip` | 覆盖层 | **口径外**（不进分母），值写人话理由 |
| `xl:why` | 覆盖层 | `want` 不是 pass、或 `skip` 时的**根因**（人写） |
| `xl:judge` | 覆盖层 | 裁判怎么跑：`stdout`（默认） |
| `xl:args` | 覆盖层 | 裁判的额外实参（`--experimental-transform-types` 那一档） |
| `xl:may-fail` | 覆盖层 | 这一条本来就是「两边都非零退出」，退出码仍要对得上 |
| `xl:weight` | 覆盖层 | 这一条在覆盖度里的权重（默认 1） |
| `xl:round` | 覆盖层 | 哪一轮收编进来的（历史线索，不参与判定） |
| `xl:end` | 两套 | 头结束，后面是正文 |

**指令块允许续行**：`xl:note` 的值可以是多行的，续行是不带 `xl:` 的说明注释
（语料里满是这样写的）。**同名取最后一条**——与迁移前那条逐行扫全文的解析器逐位等价。

**没写在词表里的键一律报错**（`cases:check` 拦）：写错键名是静默的（值被忽略、用例照跑）。
**正文里出现 `xl:` 散文**时把它写成两条斜杠加两个空格（`//  xl:`）——一眼可辨，也不会
被读成指令（`exec` 里抄自 token 语料的那 39 条就是这个形态）。

## 行尾：`\r` 会把**整条指令**吃掉（第 685 轮实测的坑）

`.gitattributes` 是 `* text=auto eol=lf`，所以**库里的文本文件都是 LF**；
只有两条用例是**故意在盘上带 CRLF** 的（`token/lexical/lex-crlf` 与
`lex-crlf-mixed-with-lf`——判据不去断言这一点，见下）。

**解析器必须先把行尾归一成 LF**（`case-file.mjs` 的 `parseDirectives` 第一件事就是它）。
不归一的后果不是「少读一条」，而是**一条都读不到**：按 `\n` 切出来的行尾留一个 `\r`，
而 `^//\s*xl:(\S+)\s*(.*)$` 里的 `$` 在 `\r` **之前**不成立、`.` 也不吃 `\r`
⇒ 整条正则失败 ⇒ 文件头被当成正文，`xl:expect` / `xl:known-gap` 全部静默失效。

**这个坑藏了很久**：`cases:tags` 只报「期望与产物不符」，而**读不到的期望不产生断言**——
所以它一路是绿的。修好之后断言数从 **4764 涨到 4778**：那两份 CRLF 用例各贡献 7 条
（`xl:expect` 两行共 7 个标签），是一批**从来没执行过**的期望；其中 **4 条当场报错**——
`Const` / `BlockToken` 这两个标签名在产品里根本不存在（`const` 投成 `Let`、`{` 投成 `Bracket`），
已改成真名。也就是说：**行尾归一这一行代码，决定了另外 14 条断言存不存在**。

**那两份 CRLF 用例钉的是什么**：实测纯 LF / 纯 CRLF / 混合三种行尾下**产物逐标签相同**，
所以它们钉的是「换行风格不改变产物」，**不是**「盘上必须是 CRLF」——
`.gitattributes` 会把它们归一成 LF，这一点写在了那两份用例的 `xl:note` 里。

## 分母里有什么（数字是最近一次全量实测）

语料 **4377** 条（token 1416 / exec 758 / runtime 632 / stdlib 1339 / e2e 246）。
覆盖度按类算，**每一类的分母是那一类判过的条数**：

| 类 | 判过 | 过 | 缺口（blocked / differ） | 备注 |
| --- | --- | --- | --- | --- |
| `token` | 1403 | **1184** | 219 | 缺的那 219 条**全是** `xl:known-gap`；另有 13 条不进分母 |
| `exec` | 757 | **739** | 1 / 17 | 另有 1 条不进分母 |
| `runtime` | 632 | **628** | 1 / 3 | |
| `stdlib` | 1339 | **1284** | 20 / 35 | |
| `e2e` | 246 | **242** | 4 / 0 | |
| **合计** | **4377** | **4077** | 245 / 55 | 加权 **95.8%** |

**第 692 轮再加 385 条**（分母 3992 → **4377**）：两批一次性的**角落普查**——
① 手写的 81 条（属性枚举次序 / 数组的洞 / 字符串与数字格式化 / 位运算 / `Map`-`Set`
的键 / `JSON` / 类与访问器）；② **原子探针 299 条**（`probe-*`：一条只问一个表达式，
期望值由**真 `node` 现给**，打印口径钉成 `typeof:值`，免得把控制台渲染那一族的
已知缺口混进来）。这一批**加宽本身收掉四处**：

1. **`o["f"]().v` 这一族整段丢**（**静默错值**，最响的一处）：token 层把这种写法给成
   **两格**（`PropertyAccess(o["f"])` 与 `PropertyAccess(Bracket(()), ., v)`），
   而投影层的链那一支只看「`kids[1]` 是不是 `.` 或下标」⇒ 整个让开 ⇒ 只投 `kids[0]`：
   `console.log(o["f"]().v)` **打印那个函数自己**（Node 打印 `1`），
   `a["values"]().next().value` / `"ab"[Symbol.iterator]().next().value` 同样。
   修法：链那一支认「第二格**以一次调用开头**」（`isCallFirstUnit`），摊开之后与
   `o["f"]()` 那条既有路一字不差。
2. **`IsOperand` 不认 `Function`**（只认 `Class`，第 328 轮补漏的另一半）：
   `typeof function () {}` 折不起来 ⇒ 投影只吐一个光秃秃的 `TypeOfKeyword`
   （降级层报 `unimplemented: expression TypeOfKeyword`）；`!function () {}` 报
   `ExclamationToken`；`function () {} + 1` 里 `+` 被读成**前缀一元** ⇒ 报
   `FunctionDeclaration`。两份名单（`unary-operator` / `binary-operator`）一起补齐。
3. **补 `Function` 带出来的回归，同一轮当场收掉**：`function f() {} ++n;` 里 `++`
   的前一格成了「操作数」⇒ 被读成**后缀**、把函数声明折进操作数。判据是文法——
   后缀 `++` / `--` 要一个**引用**，字面量给不出来（`Class` 一并排掉）。
4. **`"abc".hasOwnProperty("length")` / `hasOwnProperty(0)` 原来答假**（JS 答真）：
   这一支在 `self.Tag !== Object && !== Array` 上就返回了，而**同一个问题**在
   `Object.hasOwn` 那一支（第 691 轮收下字符串）**早就是真**——两套答案。
   现在字符串走 `getOwnPropertyDescriptor`（越界给 `undefined` ⇒ 假），
   函数自己那两格（`length` / `name`，不住在属性表里）另认一句。

另登记 6 条新缺口（`differ` +5 / `blocked` +1）：`typeof eval` 没有那一格、
**没声明过的名字**在降级期就抛（JS 要到运行期才抛 `ReferenceError`）、
`Error` 的静态成员、生成器对象的内部标签（`[object Generator]`）、
私有名的品牌检查、**类表达式**静态块里类名没绑上。
另外 `token/expressions/expr-function-expression-plus` 这一条**收掉了**
（`xl:known-gap` 撤掉，`xl:expect` 从 `UnaryOperator` 改成 `BinaryOperator`）。

**不进分母的只有两档**（`xl:skip` 1 条 + `.tsx` / `xl:ts-invalid` 13 条 = 14 条）：

| | 条数 | 为什么不进 |
| --- | --- | --- |
| `xl:skip` | **1** | 装饰器：`node` 三种模式都拒收，**裁判给不出来**（没有基准就没法量） |
| `.tsx` / `xl:ts-invalid` | **13** | AST 尺子的裁判对不了（TSX 语法 4 条）；故意写非法 TS（9 条，判据要量的正是**错误处理**） |

**口径外只剩「裁判给不出来」那一档。** 其余一律进分母：`RegExp` 族 7 条、`BigInt` 族 4 条、
多文件导入 1 条、动态 `import()` 1 条、`eval` 1 条、`Error` 的栈 1 条
**都是待做项，记在台账里**（用户口径：这些都要做，`tsrun` 现在的单文件口径是**现状**，不是口径）。
**口径外只剩「裁判给不出来」那一档。** 其余一律进分母：`RegExp` 族、`BigInt` 族、
多文件导入、动态 `import()`、`Error` 的栈**都是待做项，记在台账里**（用户口径：
这些都要做，`tsrun` 的单文件口径是现状不是口径）。

## 跑一次

```bash
npm run cases:tsast     # token：八条全 0 才绿（门）
npm run cases:check     # 用例文件本身合不合格
npm run cases:tags      # xl:expect / xl:absent 对产物核实
npm run cases:shapes    # 形状覆盖
npm run coverage        # 五类 + 两种尺子 + 覆盖度报告
npm run gates           # 上面这几道一次跑完
```
