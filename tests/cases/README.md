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

语料 **8095** 条（token 1427 / exec 2216 / runtime 1023 / stdlib 3196 / e2e 246），判过 **8095** 条。
覆盖度按类算，**每一类的分母是那一类判过的条数**：

| 类 | 判过 | 过 | 缺口（blocked / differ） | 备注 |
| --- | --- | --- | --- | --- |
| `token` | 1414 | **1196** | 218 | 缺的那 218 条**全是** `xl:known-gap`；另有 13 条不进分母 |
| `exec` | 2216 | **2171** | 12 / 33 | 另有 1 条不进分母 |
| `runtime` | 1023 | **998** | 2 / 23 | |
| `stdlib` | 3196 | **3124** | 25 / 47 | |
| `e2e` | 246 | **242** | 4 / 0 | |
| **合计** | **8095** | **7731** | 261 / 103 | 加权 **95.9%** |

**第 748 轮再加 26 条**（分母 8069 → **8095**）、另新登 6 条：
**词法绑定的边角 / 抛出的形状 / 集合成员在迭代中的流向 / 渲染的深度与环**
（`runtime/round748` 16 条、`stdlib/round748` 10 条）——**20 条当场通过**、
新登 6 条，同一轮里**收掉两处根**：

- **`delete` 打在原始值接收者上**（`p748a-a08` 那一族，**整份文件进不来**）：
  `delete (s as any)[0]` / `delete (1 as any).x` 在 JS 里**恒给 `true`**
  （`ToObject` 造出来的包装对象当场丢掉，那一步只看「成功了吗」），
  而 `vm.xl.md` 的 `del_prop` 那一支**响亮地抛**
  （`unimplemented: delete on a primitive receiver`）。修法是那一支**先分流**：
  接收者不是对象 ⇒ 直接 `Value.FromBool(true)`（排在 `ToPropertyKey` **之前**，
  键的求值照旧发生）。**用例把四个面一起钉住**：字符串下标 / 数组成员 /
  `null` 经可选链 / 冻结对象（`false` 那一档）。
- **`Object.assign(null, {})` 抛的是普通 `Error`**（`p748b-b05`）：
  规范第一句是 `ToObject(target)`，它对这个值**只抛 `TypeError`**
  （Node 给 `e instanceof TypeError` 为真），而 `globals.xl.md` 那一支把
  「`null` / `undefined`」与「原始值目标（装箱那一层没做）」**合在一句里**抛。
  修法：`null` / `undefined` 单开一档抛 `TypeError`；原始值目标**照旧响亮地抛**
  （给一个假的装箱结果比抛坏得多）。用例把 `{ ...null }` / `{ ...undefined }`
  **给空对象**那一档一起钉住（那一条走的是另一条规格，不许被顺手改掉）。
- **新登的 6 条**（各是一条独立的根，都写在**每条用例自己的 `xl:why`** 里）：
  ① **TDZ 那一格的 `typeof`**（`p748a-a01`：JS 抛 `ReferenceError`，本仓给
  `"undefined"`——`NameIsUnreachable` 不分「找不到」与「还压在 TDZ 里」）；
  ② **块里的函数声明在声明之前调用**（`p748a-a03`：JS 提升到块顶，本仓报
  `cannot call a non-callable value`）；
  ③ **`delete` 字符串下标**（`p748a-a08`：JS 给 `false`——那一格不可配置，
  本仓给 `true`；本仓没有「字符串异质对象」那一层）；
  ④ **`console.log` 打自引用对象**（`p748a-a11`：Node 给 `<ref *1> … [Circular *1]`，
  本仓按深度截断成 `[Object]`）；
  ⑤ **`.then(undefined)` 不把源那一档传下去**（`p748a-a16`：本仓结果承诺停在
  `Pending`——量到的是「结清值到不了任务上」，试过两版都退回了）；
  ⑥ **`for…of` 一个遍历中改动的 `Map` / `Set`**（`p748b-b01`：迭代器是快照，
  与第 687 轮的 `110-forof-live-view-not-taken` **同一条根**，这一条把
  「删掉」与「新加」两个方向钉在一起）。

**第 747 轮再加 17 条**（分母 8052 → **8069**）、另新登 1 条：
**控制流与承诺那一侧的普查**——类 / 闭包捕获 / `this` 四种绑定 / `try` 与 `return` 的次序 /
`switch` 贯穿 / 标签 / 短路范围 / 解构 / 渲染 / 数字到文本 / 字符串三兄弟 /
`sort` 与 `to*` 族 / `Object.keys` 族。19 条探针 16 条当场通过，
新登的那一条是「两条承诺链同时在飞时的**微任务次序**」。
详见 [根 README 第 747 轮](../../README.md) 与 `tests/cases/{runtime,stdlib}/round747/`。

**第 744 轮再加 4 条**（分母 8027 → **8031**，另收掉 1 条）：**一元前缀 + 下标调用链 +
更松的二元**那一格（token 3 / exec 1）——**3 条过、1 条登记**，同一轮里收掉第 743 轮
自己登记的那一条（`typeof o["f"]().v + ""`，`!…` 与 `=== "number"` 两种排版一起）：

- **收掉的那一格**：一元单元里装的是**操作数的头**，续格与更松的运算符一起在下一个单元里；
  链那一支会把 `+ ""` 折进操作数 ⇒ 一元单元盖住整段（缺 1 漂 1 多 2）。
  修法：`splitChainTailInOperator` 把那个单元拆成「续格」与「运算符 + 右操作数」两段，
  续格递回 `projectExpression`（**给的是那一格单元本身**——裸的 `(` 兄弟不在链那一支的入口里），
  运算符那一段交给 `foldBinaryFrom`；「操作数挂回一元节点」抽成 `attachToUnary` 两处共用。
- **新登记的一条**：`1 + o["f"]().v + 2`（中间那一格收掉了，再往后接一个运算符时形状又换了）
  与 `o["f"]().v + o["f"]().v`（两个朝向同时出现）都还开着。

**第 743 轮再加 10 条**（分母 8017 → **8027**，另收掉 3 条）：**下标调用链落进二元单元**
那一族（token 6 / exec 4）——**8 条过、2 条登记**，同一轮里**收掉第 711 轮登记的三条**
（`p711b-b01` / `b02` / `b03`）：

- **收掉的那三条**：token 层把链的**下一截**（调用括号 + 后缀）折进了**那个二元单元**，
  两个朝向各一支——续格在单元**里面**时链那一支的入口认不出（尾巴那一支又把一格单元
  当成「以运算符开头的一串」⇒ `foldBinaryFrom` 直接返回 `left` ⇒ 交出**那个函数自己**）；
  续格掉在单元**外面**时「二元单元在头」那一支的 `tailIsChain` 只认 `.` 与 `?.`。
  修法：新判据 `chainTailInOperator`（**要递归**，`o[k]().v * 2 + 1` 是两层套着）
  + 摊平那一趟把续格摊成平级；`tailIsChain` 扩成「`isCallFirstUnit` 也算续接」。
- **新登记的两条**：`typeof o["f"]().v + ""`（一元那一支的操作数吃到尾随的 `+ ""`）与
  `o["f"]().v + o["f"]().v`（两个朝向同时出现时第二截没接上，降级期报
  `name is not a local or a capture: v`）。

**第 742 轮再加 43 条**（分母 7974 → **8017**）：**`switch` 那一族**（`runtime` 35 / `exec` 7）
与语句 / 循环的角落（并进那 35 条里）——**42 条全过**，另加一条收掉的那一格当守卫
（`p742d-d01`），同一轮里**收掉第 693 轮登记的那一条**（`probe693b-k32`）：

- **收掉的那一格**：**没有 `extends` 的类里 `super` 也有家对象**。
  `class A { m() { return super.toString } }` 本仓给 `undefined`、Node 给
  `Object.prototype.toString` 那个函数。根子是 `SuperName` 一个字段承担两件事
  （基类「父类叫 `Object`」与「根本不是类成员」都是空串）⇒ `SuperStartSlot` 一律 `-1`。
  修法：加第三位 `SuperBase` / `InSuperBase`，空串先问它；基类交给新的 `SuperBaseFromThis`，
  **从 `this` 反推家对象的原型**（实例两层 `get_proto`、静态一层）。
  `super.m()` / `super.x = v` 都接上同一个起点 ⇒ 基类里 `super.m()` 也与 Node 一样抛 `TypeError`
  （以前会找到自己 ⇒ 无限递归）。
- **这一族本仓做对、现在钉住的语义**：匹配上之后**后面的 `case` 表达式不再求值**
  （`p742c-c03`）、`default` 在中间也**最后才匹配**、匹配到再往下落（`p742c-c02`）、
  判别式**只求值一次**（`p742b-b02`）、`switch` 里的 `break` 只出 `switch` 而 `continue` 出循环
  （`p742a-a08`）、`case` 的引用相等 / `-0` / `NaN` 三格（`p742a-a05` / `p742a-a06` / `p742c-c10`）。

**第 741 轮再加 20 条**（分母 7954 → **7974**）：**可选调用 `?.()`** 那一族
（`runtime` 14 / `exec` 6）——**14 条过、6 条登记**（5 `differ` + 1 `blocked`），
同一轮里**收掉第 739 轮登记的那一条**（`p739a-a14`：`await o?.p + 1`）：

- **收掉的那一格**：`await o?.p + 1` 的产物是
  `[Keyword(await), Identifier(o), BinaryOperator(+( NCO(p), +, 1 ))]`——`?.p` 属于
  **`await` 的操作数**那一截链，而它长在**那个二元单元的第一个孩子**上。修法：找切点那一趟
  **把运算符单元本身也算切点**（摊平只摊头一格），再把 `NCO` 接到操作数上、`await` 套在外面，
  剩下交给 `foldBinaryFrom`。
- **一条根、六种排版**（第 729 轮登记过的那一族）：**实参括号与「已折好的那一格」
  之间没有接线**——`o?.["m"]()`（`p741a-a02` / `p741b-b05`）把下标括号与实参括号一起装进
  同一个 `NCO`，投影只认两种形状 ⇒ 落回「按成员名折属性访问」⇒ **交出方法本身**；
  `o.a?.m?.()`（`p741a-a03`）第二个 `NCO` 落成平级 ⇒ 静默给 `undefined`；
  `o?.m() * 2 + o?.m()`（`p741a-a07`）右操作数那半截掉在二元单元外面；
  `(await o?.m)()`（`p741a-a06`）差一整层；`o?.m()()`（`p741a-a09`）报
  `cannot call a non-closure value`。


**第 740 轮再加 24 条**（分母 7930 → **7954**）：**一元前缀 / 后缀与链的接线**
（`runtime` 18 / `exec` 6）——**24 条全过**，同一轮里**收掉三处**（两条新量的根，
一处是第 739 轮自己的回归）：

- **`?.` 接在一元前缀后面那一格只认 `expression`**（`p740a-a07`，静默错值）：
  `!o?.p` / `-o?.p` / `~o?.p` / `+o?.p` 本仓都给 `undefined`（Node 给 `false` / `-1`）——
  第 178 轮那一支只认 `TypeOfExpression` 那一族的字段名，而 `!` / `~` / `+` / `-` 是
  `PrefixUnaryExpression`（字段叫 `operand`）⇒ 整支不进、`?.p` 接到那个一元节点的**结果**上。
- **`.` 不是切点**（`p740b-b06`，**第 739 轮的回归**）：`typeof (await Promise.resolve("s"))`
  里那对括号的子单元是平铺的 `[await, Promise, ., resolve(…)]`，第 739 轮那句
  「在第一个运算符处切开」把 `.` 当成了运算符 ⇒ 折出 `(await Promise) . resolve`
  ⇒ `name is not a local or a capture: resolve`。修法：`.` 跳过，且尾巴里有平铺的 `.` 时回落。
- **`delete` 打在括号 / `as` / `!` 包着的成员上**（`p740a-a12`，整份文件进不来）：
  `delete (o.b as any)` 最外层是 `ParenthesizedExpression`，降级那一支只看最外层那一格
  ⇒ 报 `unimplemented: delete of ParenthesizedExpression`。四个透明壳先剥掉。


**第 739 轮再加 22 条**（分母 7908 → **7930**）：**`await` 是一元前缀**那一族
（`runtime` 16 / `exec` 6）——同一轮里**收掉三条根**（其中两条是第 738 轮刚登下的：
`p738a-a14` / `a16` 当场转绿、台账已撤），另**新登一条**（`await o?.p + 1`，
是 `?.` 那一条链的接线）：

- **`await` 只吃紧随其后的那一格**（`p739a-a01` / `a05` / `a07` / `a13`，**静默错值**）：
  JS 里 `await x + 1` 是 `(await x) + 1`、`await x && y` 是 `(await x) && y`，
  而 token 层**已经把 `await` 后面那一整段折进了一个单元**（`BinaryOperator(x + 1)`）——
  照原样投就是把二元那一段整个塞进 `await` 的操作数。根在**投影层**那句
  「`await` 收 `kids.slice(1)`」，收法是**沿最左边那条脊摊平、在第一个运算符处切开**
  （平铺的形态 `[await, x, >, 0]` 走同一条路；尾巴里有 `As` / `Satisfies` 时原样回落）。
- **`x && await y` 里那个内层 `await` 是 `Identifier`**（`p739a-a02`，整份文件跑不进来）：
  逻辑段从**外层那个前缀词**后面起算，内层那一个还没升成 `Keyword`，而投影那一支只认
  `Keyword` ⇒ 投出一个光秃秃的标识符 ⇒ 降级期报 `name is not a local or a capture: await`。
  收法与 `isOperatorUnit` 按文本认 `in` / `instanceof` 同一手法（**同一个词两态都要认**）。
- **`typeof await p`：两层前缀叠在一个一元单元里、操作数掉在外面**（`p739a-a09`）：
  产物是 `[UnaryOperator(typeof await), PropertyAccess(p)]`——链那一支的入口条件
  （`.` / 下标 / 以调用开头）一个都不成立，于是那个一元单元被单独投出去、
  报 `unimplemented: expression AwaitKeyword`。入口多认这一形状、剥到末尾那个词时往回退一格、
  字段名按 `op` 文本定（`typeof` / `void` / `delete` 是 `expression`）。
- **一条自测的教训**：第一版在一个 `if` 里套了一个**裸块**，`cases:tsast` 当场红
  ——`dist/ts/typescript/print-ast-common.ts` **自己就是那一门语料的一份**。


**第 738 轮再加 22 条**（分母 7886 → **7908**）：**前缀词后面跟逻辑那一族**
（`runtime` 16 / `exec` 6）——同一轮里**收掉第 737 轮刚登下的那一条**
（`yield` / `throw` 后面跟逻辑运算符），另**新登一条**（`await` 的操作数被当成它后面的全部）：

- **根在 token 层的一句名单上**（`logical-operator.xl.md` 的 `IsLogicalOperatorStart`）：
  它认 `return` 是逻辑段的起点，却没认 `yield` / `await` / `throw`
  ⇒ 那三个词被卷进链子当左操作数（`LogicalOperator[yield, 1, &&, 2]`，
  投影取那个词当 `left`、`1` 一个字都没留下）⇒ 降级期 `name is not a local or a capture: yield`。
  收法是那一格补成四个词；**`yield` / `throw` 的操作数本来就该是整段表达式**，所以两边一起对。
- **`await` 不一样**（`p738a-a14` / `a16`，静默错值）：它是一元前缀、比 `&&` 与 `+` 都紧，
  而本仓把 `await` **后面那一整个单元**当成操作数——`await Promise.resolve(1) + 1`
  在 Node 里给 `2`、本仓给 `[object Promise]1`。根在投影层「`await` 收 `kids.slice(1)`」那一句。
  **第 739 轮已收掉**（两条当场转绿，台账已撤，用例留着当守卫）。
- 另把第 737 轮 `p737b-b06` 的台账撤掉（它转绿了，用例留着当守卫）。

**第 737 轮再加 33 条**（分母 7853 → **7886**）：**迭代协议那一层**
（`stdlib` 7 / `runtime` 19 / `exec` 7）——同一轮里**收掉两格**，
另**新登一条**（`yield` 后面跟逻辑运算符）并把四条老根的新排版收进语料：

- **`WeakMap.prototype` 只该有五格**（`p737d-d01`）：`keys` / `values` / `entries` /
  `clear` / `forEach` 是 `Map` 独有的，第 733 轮那五格**多挂**在 `WeakMap.prototype` 上
  （第 733 轮写在明处当已知差）——`InstallMapMethods` 加一个 `weak` 形参收掉。
  顺带撞出第二处：挂名字那一趟借的 `ReadOwn` 是「缺这一格就抛」⇒ 少挂五格之后
  **装库当场抛**（整份脚本一行都没跑），换成 `FindProperty` + 判空。
- **私有字段不是自有属性名**（`p737d-d02`，第 736 轮登记的）：`Object.getOwnPropertyNames`
  那一支**不管 `enumerable`** ⇒ 实例列出 `["#p"]`。两问一起问（`#` 开头 **且** 不可枚举）。
- **新登的缺口**（`p737b-b06`，`blocked`）：**`yield 1 && 2` 整份文件跑不进来**
  ——投影成 `BinaryExpression(left: Identifier "yield", &&, 2)`，那个 `1` 一个字都没留下；
  分界是**运算符的类**（`yield 1 + 2` / `yield a ? b : c` 都对）。
- **四条老根的新排版**：迭代器就是数组（`p737c-c06` / `p737a-a05`，同 `p725a-b01`）、
  未启动生成器的 `it.return(9)`（`p737a-a10`，同 `probe694-g04`）、
  `await` 一个 thenable 不调 `then`（`p737a-a16`，同 `runtime/async/041-await-thenable`）、
  承诺续链的微任务格数差一格（`p737a-a17` / `p737b-b07`）。

**第 736 轮再加 26 条**（分母 7827 → **7853**）：**元编程那一层的四格口径**
（`stdlib` / `runtime` / `exec` 各一个 `round736/`）——同一轮里**收掉四格**
（`Reflect` 四个号的形参个数、`WeakMap` / `WeakSet` 的 `toStringTag`、
`Object.getPrototypeOf(null)` 的 `TypeError`、`Object.setPrototypeOf` 打在不可扩展对象上要抛）：

- **`Reflect` 那四格错在一个「顺手归族」上**：`getPrototypeOf` / `isExtensible` /
  `ownKeys` / `preventExtensions` 在 Node 里**都是 `1`**（只收目标），
  而 `BuiltinArity` 把它们与「目标 + 键」那一族一起写成了 `2`
  ——真正的分界是**收几个实参**，不是名字像不像邻居。
- **两个标签**：`WeakMap` / `WeakSet` 的原型第 733 轮才各自成格，
  `Symbol.toStringTag` 那一趟没铺过去 ⇒ `Object.prototype.toString.call(new WeakMap())`
  走到那条「缺 `Symbol.toStringTag`」的响亮一抛。补法与 `Map` / `Set` / `Date` /
  `Promise` / 生成器那几族**同一处、同一张表**。
- **两个 `TypeError`**：`Object.getPrototypeOf(null)`（`RequireObjectCoercible` 那一档，
  `({}).__proto__` 的 getter 是同一个落点）与
  `Object.setPrototypeOf(不可扩展的对象, 别的原型)`（规范第一条「不可扩展 ⇒ 给假」，
  而这一格拿到假就抛——`Reflect.setPrototypeOf` 给假，**不是同一档**；
  **同一个原型那一档不抛**，所以先比原型、再问可扩展性）。
- **登记 5 条**（各是另一条根）：`JSON.rawJSON` / `isRawJSON`、
  `Proxy` / `WeakRef` / `FinalizationRegistry` 三个全局名、
  `JSON.stringify` 看不见**元素区上的访问器**（与第 721 / 722 轮那条总根同一处）、
  私有字段漏进 `Object.getOwnPropertyNames`、基类构造经 `super()` 时 **`new.target` 丢了**。
- **另 17 条钉住这一批本来就是对的**：符号的注册表与 `description`、
  `Symbol.hasInstance` 与 `instanceof`、`Symbol.toStringTag` 覆写、符号键的可见性、
  `JSON` 的 replacer / reviver / `space` / getter 次序、描述符与原型、
  类表达式的名字、`try`/`finally` 的 `return`、`switch` 落空、`throw` 非 `Error`。

**第 734 轮再加 1 条**（分母 7814 → **7815**）：**原型方法那五族的 `name` / `length`**
（`runtime/round734/p734a-a01`）——`Array` / `String` / `Number` / `Object` / `Error` /
`Promise` 六家各取几格。**这一轮没有收掉任何台账**：它铺的是一个**没有任何现成判据在量**
的形状（第 733 轮那件工具只接了三处，这一轮铺到原型方法那一族），
量出来的第一条就是**同族里两种长度**那一档（`toUpperCase` 是 `0` 不是 `1`）。

**第 733 轮再加 4 条**（分母 7810 → **7814**）：**内建函数自己那两格**
（`runtime/round733/p733a-a01` … `a04`）——同一轮里**收掉七条旧账**
（`p706c-x20` / `p731a-a03` / `p709b-b17` / `p709b-b18` / `p719a-m09` /
`103-names-weakmap-proto` / `104-names-weakset-proto`）：

- **根**：本仓的内建有两种壳，**两种都没人给名字**。① **宿主引用**（`Math.max` /
  `__lookupGetter__` / `Reflect.get`）**连属性表都没有** ⇒ `GetProperty` 走到它就是「找不到」；
  ② **带可调用载荷的对象**（`Function.prototype.call` 那一族）有表、`length` 第 350 轮就挂上了，
  缺的只是「有没有人把名字传进来」。
- **两处修法**：`props.xl.md` 的 `GetProperty` **宿主引用也先看自有那一摞**
  （`HeapObject.Props` 本来就长在每一格上，只是**从来没人往里写过**）——
  **次序要紧**：必须排在「借 `protos.Function` 找一次」**之前**，否则
  `protos.Function` 上第 731 轮挂的 `name`（空串）会把每一个内建的名字顶掉；
  `globals.xl.md` 新增 `DefineBuiltinName` / `BuiltinHostRef` / `BuiltinArity` /
  `ObjectProtoMethod`，`MethodObject` 多收一格 `name`。
- **`CreateHostRef` 每次都 `AllocateRaw`** ⇒ 同一个内建号上可以有好几个**互不相等**的句柄；
  就地新造一个再挂 `name`，脚本读到的是**另一个句柄**（**静默无效**）。
  所以 `BuiltinHostRef` 取能力表里那一个。
- **第二批**：`WeakMap.prototype` / `WeakSet.prototype` 各成一格（**与 `Map` / `Set` 并列**，
  实测 Node 的链就是 `-> Object.prototype`），`Map` / `Set` 那两格的 `name` / `length` 也补上
  （`Map.prototype.set.length` 是 **`2`**，不是 `1`——**新语料 `a04` 当场量出来的**）。
- **新语料四条**：宿主引用那一档（`Math` / `__lookupGetter__` / `Reflect` / `Object.keys`）、
  `Function.prototype` 那四格、那两格的**标志位**（两处 `Object.keys` 都必须是空数组）、
  以及 `WeakMap` / `WeakSet` 两格原型（五个名字、`size` **不该**跟着来、`instanceof`）。

**第 732 轮再加 4 条**（分母 7806 → **7810**）：**计算键成员的 `name`**
（`runtime/round732/p732a-a01` … `a04`）——同一轮里**收掉第 731 轮刚登下的那条**
（`runtime/round731/p731a-a08`）：

- **两半各自以为对方会取名**：对象字面量那条路传的是占位符 `"<computed>"`（⇒ 匿名），
  而运行期那一半（`EmitComputedFunctionName`）又因为 `StaticKeyText` **非空**提前返回。
  修法是**静态键当场把名字传下去**（`{ [5]() {} }` 给 `"5"`），动态键照旧由运行期补；
  **访问器那一支同一个根**（要带 `get `/`set ` 前缀）一起改了。
- **新登 2 条**：动态键的**访问器**名字（运行期那个辅助函数写的是键本身、不带前缀）、
  **类成员**那一条路的名字（只认标识符——同一个形状在两条路上，只接了对象字面量那条）。

**第 731 轮再加 10 条**（分母 7796 → **7806**）：**闭包那两格属性与 `Function.prototype`**
（`runtime/round731/p731a-a01` … `a10`）——同一轮里**收掉一条旧账**
（`stdlib/object/122-names-function-proto`：`Function.prototype.length` / `.name` 取不到）：

- **两半一起做才成立**：① 语言层把这两格隐藏挂到 `protos.Function` 上；
  ② `props.xl.md` 的 `GetProperty` 把**闭包载荷那两格**（`Arity` / `Name`）**提到**
  「借 `protos.Function` 找一次」那一趟**之前**（JS 里它们是函数的自有属性）。
  **只做①就是第 690 轮那次 40 条回归**（每一个函数的 `f.name` / `f.length` 被原型顶掉）。
- **新登 3 条**：内建函数的 `name`（`MethodObject` 那一半 + `HostRef` 那一半，
  与 `p709b-b17` 同一条根）、**计算键方法的 `name`**（`{ ["c"]() {} }` 给空串）、
  `Function.prototype` 自己那两格受限属性（`arguments` / `caller`）。
- **另外 7 条**钉住这一族**对**的那些：四种函数的 `length` / `name`、形参口径
  （默认值 / 剩余 / 解构）、`bind` 出来的那两格、`getOwnPropertyDescriptor`、
  类那两格、赋值静默失败、以及**那 40 条回归的哨兵**。

**第 730 轮再加 12 条**（分母 7784 → **7796**）：**生成器 / `async` 那一族的标签与原型**
（`runtime/round730/p730a-a01` … `a12`）——同一轮里把那一族的 12 条登记缺口**收掉了**：

- **函数值出生时指哪个原型**是这一族的总根：`function*` / `async function` /
  `async function*` 在 JS 里指 `%GeneratorFunction%` / `%AsyncFunction%` /
  `%AsyncGeneratorFunction%` 三格（不是 `Function.prototype`），
  而 `Object.prototype.toString` 的标签与 `.constructor.name` **都长在那条链上**。
- **新登的两条**（都在那三条原型上）：`p730a-a09`（V8 给
  `%GeneratorFunction.prototype%` **多造**一格规范里没有的 `prototype`）、
  `p730a-a10`（`%GeneratorFunction%("a", "yield a")`——动态造函数那一档，
  与 `new Function` **同一条根**）。
- **剩下的十条钉住收掉的那些**：四档的 `inspect` 写法、匿名写法、
  `.constructor.name` 三档、生成器**对象**与生成器**函数**两格原型、方法那一档
  （对象字面量 / 类 / `async`）、`call` / `apply` / `bind` 照旧沿链找得到、
  类与箭头那两档**没被带偏**（三条回归的哨兵）、自有名表、`Symbol.toStringTag` 挂在哪一格。

**第 729 轮再加 4 条**（分母 7780 → **7784**）：**可选链 / 非空断言后面跟调用**那一格
（`runtime/round729/p729a-a01` … `a04`）——量出两条真缺口，**原样登进语料**：

- `o?.m?.()` 收成**两个平级 NCO**（`o` + `NCO(m)` + `NCO(括号)`）⇒ 那一格**静默给 `undefined`**
  （Node 给 `1`）；`o!.m!()` 收成 `NCO(Method(m, NotNull, 括号))` ⇒ 投影出空名字的被调者
  ⇒ 报 `cannot call a non-closure value`（**整份脚本断在这里**）。
- **根在一处**：实参括号与**已折好的那一格**（`NotNull` / `NCO`）之间没有接线——
  `OptionalCallCloseRule` 的 `IsCalleeEnd` / `IsChainLink` 认得这两个类，
  但真正成形的那一趟落在 `?.` 的**另一侧**（`MethodCloseRule` 与它各收各的）。
  第 153 轮试过两次、两次都写明「形状一点没变，说明那一格根本没被问到」，
  所以这一轮先把它量清楚、登在 `p729a-a01` 的 `xl:why` 里。
- **另三条钉住对的那些**：`new` / 下标 / 非空断言在**成员**那一格（`a02` / `a04`）都对，
  `void` 的更多位置（分组 / 嵌套 / `typeof` 并排 / 数组元素）也照旧（`a03`，第 727 轮那一格没漏）。

**第 728 轮再加 3 条**（分母 7777 → **7780**）：**`?.` 与 `[` / `(` 之间夹注释或换行**
（`runtime/round728/p728a-a01` … `a03`），并**收掉 3 条第 657 轮就登着的审计缺口**：

- **方括号的宿主换了人**：`a?.[c]` 里那个 `[` **被 `NullConditionalOperatorCloseRule`
  收进 NCO 的 `Data`**（投影那一层正好把「NCO 里一格裸方括号」读成下标访问，所以形状一直是对的），
  而 `JsonArrayCloseRule` 排在**后面** ⇒ 轮到它时宿主已经是 NCO，
  `IsArrayAt` 里那句 `parent instanceof NullConditionalOperator && index === 0`
  问的是「它是 NCO 的第一个子单元」——**夹一条注释就不是 0** ⇒ 判成 `ArrayLiteral` ⇒ 链断。
- **改法两处**：① 那一格改成「**它前面没有别的实义子单元**」
  （`GetSkipPrevious(parent.Data, at, IsTriviaUnit) === null`——`?.` 自己留在**外层**列表上，
  所以「前面什么都没有」与「紧跟 `?.`」是同一件事，有无注释走同一句）；
  ② 「前一个实义单元」那一问从**只跳软换行**改成**跳 trivia**，并补上
  「前一个单元是 `.` / `?.` 符号时那个 `[` 也是下标」。
- **收掉的 3 条**：`gap-sweep-comment-optchain-03` / `gap-sweep-linecomment-optchain-05` /
  `gap-sweep-newline-optchain-04`（`cases:tsast` 报「已经收掉」，`xl:known-gap` 与
  `xl:expect` 里的 `ArrayLiteral` 一起撤掉）。`SWEEP-*/optchain` 那一族还剩 16 条
  （落点在 `const v //c` 这种**声明头中间**的，是另一条根）。

**第 727 轮再加 6 条**（分母 7771 → **7777**）：**`void` 后面跟括号字面量**
（`runtime/round727/p727a-a01` … `a05` 过掉的五条 + `token/expressions/expr-void-literal-operand`
一条），并**收掉第 726 轮登记的那条缺口**（`runtime/round726/p726a-b01` 当场转绿、
`xl:want blocked` / `xl:why` 按规矩删掉）：

- **`void` 与 `delete` / `await` / `yield` 差在哪**：那几个词在类型位**根本不出现**，
  所以第 726 轮把它们直接写进豁免名单就完了；`void` **同时是类型位的一个词**
  （`function f(): void {` / `on(…): () => void {`，那两处的 `{` 是**函数体**）——
  无条件加进去**当场坏掉 64 条**，所以那一轮原样退回、把缺口登在 `p726a-b01`。
- **这一轮的闸门**：`IsValuePositionPrefix`（`text-common-util.xl.md`）从那个词
  **自己那一格**往回扫——撞上 `:` ⇒ 类型位；撞上 `=` ⇒ 值位；撞上 `=>` ⇒ 交给
  `IsFunctionTypeArrow`；撞上 `;` / `,` / `(` / `[` / `{` / `}` ⇒ 值位。
  最多扫 64 格、不递归（不可能绕圈），**答否 = 保持今天的行为**。
- **两个落点各接一次这一问**：`IsObjectLiteralBrace`（值位那个 `{` 是对象字面量）与
  `IsArrayAt`（值位那个 `[` 是数组字面量）的豁免名单各加 `void`。
- **`a04` 是守卫**：它把**类型位那一半**一起钉住（`: void {` / `(): () => void {` /
  `let xs: void[]` / `interface I { go(): void }`），收掉值位那半**不许**连累它们。

**第 726 轮再加 5 条**（分母 7766 → **7771**）：**`await` / `yield` / `delete` 后面跟括号字面量**
（`runtime/round726/p726a-a01` … `a04` 过掉的四条 + `p726a-b01` 登记的缺口）：

- **两个落点，同一个形状**：两张「前面是标识符 ⇒ 这不是字面量」的表都漏了
  **只可能做前缀的那几个词**——`IsObjectLiteralBrace`（`text-common-util.xl.md`）的豁免名单
  只有 `return` / `throw` / `typeof` 与类型位那五个词，`IsArrayAt`
  （`tokens/json/array-literal.xl.md`）只有 `return` / `typeof` / `of` / `in` 与声明词。
  于是 `await { v: 1 }` 被收成**块**（`v: 1` 成了标签 + 表达式语句）、`await [1, 2]` 被收成**下标**
  （链在 `await` 上起头）⇒ **整份文件跑不起来**（`expression Block` / `expression Bracket`）。
- **补法**：两张名单各加 `delete` / `await` / `yield`（与名单里已有的
  `return` / `throw` / `typeof` 同源）。
- **`void` 故意没收**（**实测撞到的**）：它在 TS 里还是类型位的一个词
  （`function f(): void {` / `on(…): () => void {` 后面那个 `{` 是**函数体**）——
  无条件加进去**当场坏掉 64 条**，所以这一轮原样退回，缺口登在 `p726a-b01`。

**第 725 轮再加 7 条**（分母 7759 → **7766**）：**迭代器助手的三个名字**
（`stdlib/round725/p725a-a01` … `a05` 过掉的五条、`p725a-b01` / `b02` 两条登记的缺口）：

- **`take` / `drop` / `toArray` 原来三个都是 `undefined`**（`cannot call a non-closure value`）：
  本仓的迭代器**就是那个数组**（游标 `__i` 与 `next` 挂在数组身上，第 279 / 331 轮），
  于是 `map` / `filter` / `flatMap` / `reduce` / `forEach` / `some` / `every` / `find`
  八个名字**恰好与 `Array.prototype` 同名**、沿原型链命中了数组那一格——
  而这三个**数组上没有**，所以只有它们露出来。
- **补法一处**（`AttachArrayIterator`，四个用户共用）：再挂三格隐藏属性 + 三个新号
  （43 / 44 / 45，`install.xl.md` 的 `helpers` 名单同步）。语义是「**当下那个游标**起的
  剩下那一段」：`take(n)` 取前 n、`drop(n)` 跳过 n、`toArray()` 收成**普通数组**
  （**不挂 `next`**）；`take` / `drop` 的结果**照挂**，所以 `it.take(2).next()` 也对。
- **一处写在明处的差别**：JS 的助手是**惰性**的，这一层拿不到「等被消费」那个时机
  ⇒ 当场抽干、接收者的游标按「这份结果被走完」推进（消费掉结果的那条路两边一致）。
- **两条新登记的缺口**：`p725a-b01`（`Array.isArray(迭代器)` 为真、`constructor.name` 是
  `"Array"`、`it.map` 命中的是急切的数组方法——**模型差本身**）、
  `p725a-b02`（**`Iterator` 这个全局对象没登记**：`typeof Iterator` 给 `undefined`）。

**第 724 轮再加 9 条**（分母 7750 → **7759**）：**展开实参后面跟 `as`** 那一格
（`exec/round724/p724a-a01` … `a06` 过掉的六条、`token/expressions/expr-spread-as.ts`
一条，以及 `p724a-b01` / `p724a-b02` 两条登记的缺口）：

- **`f(...xs as T)` 这条实参根本不展开**（**静默错值**，一条根盖住 14 条探针）：
  token 层把 `...xs as T` 记成**两个平级单元**（`Spread` + `As`，`as` 更松），
  而投影按「左边那一格 + `as`」折，折出来的是
  **`AsExpression{ expression: SpreadElement }`——与 TS 的
  `SpreadElement{ expression: AsExpression }` 两层套反**。
- **症状不是形状漂**：降级层看那一格不是 `SpreadElement` ⇒ `HasSpread` 为假 ⇒
  走定长那条路，**整个数组被当成一个实参**递进去
  （`rest(...[1, 2, 3] as any)` 的 `a.length` 给 **1**、`Math.max(...[1, 5, 3] as any)` 给 **NaN**）。
- **修法一处**（`print-ast-common.xl.md` 的 `as` / `satisfies` 那一支）：左边是 `Spread` 时，
  先把它照常投影、**取出里面那个操作数**当 `as` 的左操作数，再把整条 `as` 链**套回
  `SpreadElement` 里**。括号化那一档（`...([1, 2] as any)`）本来就装在同一格，一直是对的。
- **顺带转绿的一族**：`f(...new Set([1, 2]))` / `f(...gen())` / `f(...arr.values())` /
  `f(...m.keys())` 原来那几条差额也全是那个 `as any` 造成的（普查里看着像
  「可迭代物不能展开」）——`a06` 把这六种来路一次钉住。
- **两条新登记的缺口**：`p724a-b01`（`Object.getPrototypeOf(TypeError) === Error`
  在 JS 里为真、本仓为假；同一批还量到 `Error.stack` 那一格，与第 708 轮同根）、
  `p724a-b02`（**复制族把洞留着、JS 把它变成 `undefined`**：`[1, , 3].toSorted()`
  的 `1 in` 在 Node 里为真、本仓为假；`slice` / `concat` 是**另一条口径**、它们保留洞，
  用例把两边一起钉住）。

**第 723 轮再加 12 条**（分母 7738 → **7750**）：**`freeze` / `seal` / `preventExtensions`
管不管元素区**（`stdlib/round723/p723a-a01` … `a11` 过掉的、`p723a-b01` 登记的缺口），
并**收掉第 721 轮登记的第 ③ 条根**：

- **三条整体操作走的是「扫属性表」那两趟**，而**元素区不在属性表里** ⇒
  `Object.freeze(a); a[1] = 9` **照样写得进去**（判据 `p723a-a01`）、
  `Object.seal(a); delete a[1]` 给**真**（`p723a-a03`）、
  描述符那一趟答「可写 / 可配置**都是真**」（`p723a-a07`）。
- **补法与第 721 轮同一个形状**：`MaterializeElementShadows`（`globals.xl.md`）
  在 `freeze` / `seal` 时给**现在有的每一格元素**补一份「标志位影子」
  （可枚举；`seal` 再多一位可写），随后那两趟照常清标志位——
  于是「不可写 / 不可配置」两问都有落点，而**洞不补**（洞里根本没有那一格）。
- **`a[新下标] = v` 在不可扩展的数组上要静默**（`p723a-a04`）：
  `SetIndex` 现在先问「那一格在不在」（元素区有、或属性表里有那一份），
  不在且 `!Extensible` ⇒ **一声不响**。**在的那一格照旧可以写**
  （`preventExtensions` 只挡新的，`p723a-a06` 量的是 `length` 还能改）。
- **收掉 1 条台账**：`stdlib/round721/p721a-b07`（第 721 轮登的「`seal` 管不到元素区」）。
- **仍开着 1 条**（`p723a-b01`）：**原地改元素的那两格（`sort` / `reverse`）不问
  「这一格可写吗」**——`Object.freeze(a); a.sort()` 在 JS 里抛 `TypeError`，
  本仓照样排好。它与 `push` 那一档**不是同一条**：`push` 走 `RequireArrayGrowable`
  （问的是「可扩展吗」），而 `sort` 不新增格子
  （`Object.preventExtensions(a); a.sort()` 在 JS 里是**好的**）。
- 五类 **7383 / 7738 → 7395 / 7750**、`blocked 261`（没涨）、`differ` **94**（+1 新登记、
  -1 转绿）、`bad` 0、`regressions` 0，加权 **96.1%**（两个数都在这一位）。

**第 722 轮再加 14 条**（分母 7724 → **7738**）：**数组 `length` 那一格**的边界
（`stdlib/round722/p722a-a01` … `a14`，全过），并**收掉第 721 轮登记的第 ② 条根**：

- **`length` 那一格在 JS 里是一个真的自有属性**，可它在本仓**不住在属性表里**
  （是 `HeapArray` 的结构属性），于是 `DefineOwnFromDescriptor` 原来把它当**普通属性**写：
  造一格三个标志全假的 `Props` 项（值取描述符的 `value`）——**既不截短也不加长**。
  而 `RequireArrayGrowable`（`array.xl.md`）正好读那一份的「可写」位，
  所以「锁长度」那一半**碰巧是过的**（`c305-std-array-length-nonwritable`）。
- 现在那一格有了**完整的一支**：`{ value: n }` **削短 / 加长**（削短时碰到不可配置的
  元素就抛 `TypeError`，且**先判完再动手**）、非法长度值给 **`RangeError`**
  （先过 `ToNumber`：`"2"` 是 2、`true` 是 1、`null` 是 0）、`{ writable: false }` 之后
  赋值**静默**、`{ enumerable: true }` / `{ configurable: true }` / 访问器描述符三档都抛、
  `delete a.length` 给假、`Object.getOwnPropertyNames` 不再出现**两个** `length`。
- **`Object.freeze(a)` 也要锁住长度**（判据 `p722a-a03`）：`length` 不住在属性表里，
  冻结那一趟扫不到它 ⇒ 原来 `a.length = 5` 照样改。现在冻结时先把那一份造出来再照常清标志位。
- **收掉 5 条台账**：`stdlib/object/125-array-length-descriptor`、
  `exec/round707/p707b-d06`（两行都量这一格），以及第 721 轮自己登在
  `stdlib/round721/p721a-b04` / `b05` / `b06` 的三条（削短 / 加长 / `writable: false`）
  ——那三条的 `xl:want` / `xl:why` 已撤。
- 五类 **7364 / 7724 → 7383 / 7738**、`blocked 261`（没涨）、`differ 99 → 94`、
  `bad` 0、`regressions` 0，加权 **96.0% → 96.1%**。
- **仍开着的**：下标上的**访问器**那一族（读 / 写 / 展开 / `map` / `reduce` / `JSON.stringify`
  全走元素区，`get_index` / `set_index` 的快路径里没有调用通道）与
  `Object.seal` 管不到元素区那一档——两条都登在 `stdlib/round721/p721a-b01` … `b08` 里。

**第 721 轮再加 25 条**（分母 7699 → **7724**）：**数组下标那一格**的字段与标志位
（`stdlib/round721/p721a-a01` … `a17` 过掉的、`p721a-b01` … `b08` 登记的缺口）：

- **`Object.defineProperty` 在下标上没写 `value` 时把那一格抹掉了**（**静默错值**）：
  `Object.defineProperty(a, "1", { enumerable: false })` 在 JS 里**只改枚举性**
  （值还是 `9`），而那一支**无条件写 `fieldOf("value")`**（没写就是 `undefined`）
  ⇒ `a[1]` 变 `undefined`、`JSON.stringify` 跟着给 `null`（判据 `p721a-a02` 转绿，
  `stdlib/array/144-define-on-array-index` 的第二行**同一条根**，台账已撤）。
- **三个标志位原来只分了一档**：第 706 轮只按 `enumerable` 分流，`writable` /
  `configurable` 一律按描述符的缺省（假）算 ⇒ `{ enumerable: false }` 顺手把那一格
  变成**不可写 + 不可配置**。JS 的缺省是「**按下标那一格原来的性质**」——
  元素**可写、可枚举、可配置**，所以现在三格各自一档（`p721a-a02` / `a03` / `a04`）。
- **`a[1] = 42` 从来不问属性表**（`props.xl.md` 的 `SetIndex` 写的是元素区）⇒
  `defineProperty(a, "1", { writable: false })` 之后**照样写得进去**（判据 `p721a-a03`）。
  现在那一支先扫自有那一摞：不可写 ⇒ **一声不响**（非严格赋值的口径）、可写 ⇒
  **值两摞一起写**（不然 `a[1]` 与描述符里的 `value` 会各说各话）。
- **`delete a[1]` 从来不问属性表**（`props.xl.md` 的 `DeleteProperty` 先走元素那一段、
  无条件成功）⇒ `{ configurable: false }` 之后 `delete` 给**真**、那一格当场变洞。
  现在属性表那一摞**先看**：不可配置 ⇒ 给假、那一格留着（判据 `p721a-a04`）。
- **描述符那一趟原来只在「不可枚举」时才认属性表那一份**：`writable: false` 的那一格
  是可枚举的，于是描述符答「三个全真」——现在判据是「**有没有那一份**」，
  访问器那一份也一并认（`p721a-a05`：下标上的 getter 读得到 `get` 了）。
- **`slice` 把洞接成了显式的 `undefined`**（`[1,2,3]` 删中间一格再 `slice`，
  `1 in result` 从假变真）：`concat` 那一支早就用 `AppendSlot` 处理过同一件事，
  这一处是同一个坑的另一半（判据 `p721a-a06`）。
- **登记的 8 条缺口**（`p721a-b01` … `b08`，三个根）：
  ① **下标上的访问器调不到**（读 `a[1]`、`[...a]`、`a.map` / `reduce`、`JSON.stringify`
  全读元素区，`a[1] = v` 也调不到 setter）——`get_index` / `set_index` 这两条快路径的
  签名里**没有调用通道**（`NativeCall`），要收得把通道一路递进去、并让元素区那三十来处
  读取都问一遍属性表（迭代协议那一层的活）；本轮只把**描述符**那一趟接通了；
  ② **`length` 那一格的描述符语义**（削短 / 加长 / `writable: false` 之后
  `a.length = 5` 与 `push`）——与 `stdlib/object/125-array-length-descriptor` /
  `exec/round707/p707b-d06` 同一条根，要 `HeapArray` 上多一格「长度可写吗」；
  ③ **`Object.seal` 管不到元素区**（`seal` 把「不可扩展」写上了，可元素那一摞不在属性表里
  ⇒ `delete a[1]` 照样成功）——本轮给下标补的标志位落点只覆盖
  「`defineProperty` 显式写了标志位」那一档。
- 五类 **7346 / 7699 → 7364 / 7724**、`blocked 261`（没涨）、`differ 92 → 99`
  （`-1` 是 `stdlib/array/144` 转绿、`+8` 是本轮登记的缺口）、`bad` 0、`regressions` 0、
  加权 **96.1% → 96.0%**（分子 +18、分母 +25）。

**第 720 轮再加 20 条**（分母 7679 → **7699**）：`set_proto` 那两格的口径
（`stdlib/round720/p720a-s01` … `s10`）与同一批普查里过掉的那些（`p720b-b01` … `b10`）：

- **`Object.setPrototypeOf` 原来把规范的三档交给了 `RtSetProto` 的内部约定**：
  `({}, 1)` **静默返回那个对象**（Node 抛 `TypeError`）、`(1, {})` 抛普通 `Error`
  （Node **原样返回 `1`**）、`(null, {})` 抛普通 `Error`（Node 抛 `TypeError`）。
  三档补进那一格；**原型的判据多认 `HostRef`**（内建构造函数在 JS 里是对象）。
- **`Reflect.setPrototypeOf({}, 1)` 原来给 `false`**，而规范与 Node 都是 **`TypeError`**
  ——注释里那句「JS 的 `Reflect` 口径是给假」是错的（给假的是 `defineProperty` /
  `set` 那几格）。
- **对象字面量 `__proto__` 与 `o.__proto__ = 1` 照旧不抛**：它们走的是另一条路。
- **收掉台账一条**：`stdlib/object/probe697-q32` 转绿（`differ 93 → 92`）。

**第 719 轮再加 26 条**（分母 7653 → **7679**）：数字那一族的**接收者**与**实参**
（`stdlib/round719/p719a-n01` … `n16`、`p719a-m01` … `m10`）：

- **`-0` 经 `+` 拼出来是 `"-0"`**（静默错值）：`NumberToJsText` **搬到
  `runtime/host-text.xl.md`**（与 `NumberToHostText` 并排住，差别只有 `-0` 一格），
  `TextUnitsOf` 的 `Float64` 那一支改走它——**同一句判断原来有两个落点**，
  而 `+` 那条路在引擎里、import 不到语言层。
- **三格不问接收者的类型**（两处静默错值）：`Number.prototype.valueOf.call("x")` 给 `"x"`、
  `Boolean.prototype.toString.call(1)` 给 `"true"`，Node 两处都抛 `TypeError`。
- **位数与基数不走 `ToNumber`**：改走共用的 `NumArgOr` + `Math.trunc`（`ToIntegerOrInfinity`），
  `NaN` 原样交给宿主（`toFixed(NaN)` 给 `"2"`、`toPrecision(NaN)` 抛 `RangeError`）。
- `p719a-m09`（`Math.max.length` / `Math.random.name`）**如实登记**——与
  `round709/p709b-b17` / `b18` 同一条根（宿主引用值身上没有属性表）。

**第 718 轮再加 25 条**（分母 7628 → **7653**）：`String.prototype` 的 HTML 包装那一族
（`stdlib/round718/p718a-h01` … `h15`）与**接收者那一关**（`p718b-r01` … `r10`）：

- **十三个号、一份实现**（`CreateHTML`）：`(tag, attribute)` 两张表按 `id` 查
  （`anchor`=`a`+`name`、`fontcolor`=`font`+`color`、`fontsize`=`font`+`size`、
  `link`=`a`+`href`，其余九格没有属性）；转义**只有一处**（属性值里的 `"` → `&quot;`，
  `&` / `<` / `>` 一律不动）；属性值缺实参当 `undefined`；**接收者那一段原样搬**
  （过一趟宿主字符串会把落单的代理码元换成 `U+FFFD`）。
- **`trimLeft` / `trimRight` 照抄 `trimStart` / `trimEnd` 的号**：JS 里它们是**同一个函数对象**，
  另开两个号会让 `trimLeft === trimStart` 给假。**`String.prototype.length` 是 `0`**（三个标志全假）。
- **同一批探针量到的第二个根**：`RequireString` 原来只问「是不是字符串」
  ⇒ `String.prototype.bold.call(12)` 抛，而 JS 给 `<b>12</b>`——**同一条根盖着整个
  `String.prototype`**。改成 `RequireObjectCoercible` + `ToString`（与实参那一族**同一句**转换），
  `null` / `undefined` 与**符号**自己抛 `TypeError`（原来抛的是普通 `Error`）。
- **台账**：`stdlib/string/147-names-string-proto` 由**19 个名字**改写为**3 个**
  （`match` / `matchAll` / `search`，要 `RegExp` 整族）；第 717 轮忘了撤的两行
  （`stdlib/globals/059-reflect-basics`、`stdlib/object/probe705-o-b22`）一起撤掉。

**第 717 轮再加 15 条**（分母 7613 → **7628**）：`Reflect` 那一族（13 格，号 `685..697`）：

- **它原来一格都没有**（降级期就报 `name is not a local or a capture: Reflect`）。
  `GlobalNames()` 与 `BuildGlobals` **两边一起加**这个名字，方法**隐藏挂上**
  （JS 里 `Object.keys(Reflect)` 是 `[]`）。实现在 `install.xl.md` 的新方法 `InvokeReflect`：
  `construct` 要用 `ConstructApply`，而那一格住在 `install.xl.md`
  （依赖方向只允许它 import `globals`）。分派那一句**排在 `id >= 200` 之前**。
- **能转交的就转交**：`ownKeys` = `Object.getOwnPropertyNames` +
  `Object.getOwnPropertySymbols` 接起来（JS 的次序就是这样），
  `getOwnPropertyDescriptor` 转给同名那一格；其余各走一处现成的助手。
- 十五条钉的是：13 格的形状与边界（`ownKeys` 的符号键、`set` 在不可写属性上给假、
  非对象第一个实参要抛、`Reflect` 与 `Object` 两边同一件事两种口径）。
  **收掉 6 条台账**：`stdlib/object/probe703-o-a25` … `a28` 与
  `stdlib/globals/059-reflect-basics`、`stdlib/object/probe705-o-b22`（`blocked 267 → 261`）。

**第 716 轮再加 15 条**（分母 7598 → **7613**）：`Array.prototype.toString` 那一格
（`stdlib/round716/p716a-a01` … `a15`）——**现读 `this.join` 再调**：

- 第 193 轮把它**指到 `join` 那一格能力号**上（「JS 的它就是 `join(",")`」只对了一半），
  于是 `a.join = () => "J"` 之后 `String(a)` / `a + ""` / `a.toString()` 一个字都不变。
  收成自己的能力号（`ArrayToString`），里面 `GetProperty(self, "join")` +
  可调就 `call(join, self, [])`、不可调才转交 `Object.prototype.toString`。
  **它是 `ToPrimitive` 那条路上的一格**，所以 `String(a)` 与 `a + ""` 一起跟着动。
  `null` / `undefined` 仍抛 `TypeError`；`call` 为 `null` 时退回旧的静态那一路（写在明处）。
- 十五条钉的是：`join` 覆写走的三条路、`call` 到带 `join` 的对象、`join` 当 `this` 用、
  没有 `join` / `join` 不可调两档的转交、原型链上的 `join`、嵌套与空洞的渲染、
  `toString` 抛出去接得住。台账 `140` / `145` 两条**转绿、已撤**。

**第 715 轮再加 15 条**（分母 7583 → **7598**）：**数组方法的类数组接收者整族**
（第 714 轮只收了 `push` / `pop`），以及一批**属性枚举次序**的回归钉：

- 6 条钉写回那一族（`stdlib/round715/p715a-a01` … `a06`）：`shift` / `unshift` /
  `reverse` / `fill` / `copyWithin` / `splice` 在 `{ length: n, … }` 这种接收者上
  **元素怎么挪、`length` 怎么走、短了之后尾巴那一格有没有删掉**。
- 9 条钉枚举次序（`exec/round715/p715b-b01` … `b09`）：整数键在前、派生键按**数值**
  而不是字典序、`-1` / `1.5` 不是整数键、`delete` 之后重新插入排到最后、
  `JSON.stringify` / `Object.values` / `entries` / `getOwnPropertyNames` 与 `Object.keys`
  **同一次序**——**这一批 9 条全 pass**（这一层本来就是对的），用例把它钉住。
- **收法**（`typescript-exec/builtins/array.xl.md`，新方法 `IsArrayLikeWriter`）：
  **折成快照 → 走下面同一段真实现 → 把结果写回 `O`**——不照着接收者重写一遍通用语义
  （那是第二份会漂的判据）。写回时才露出来的四件事：尾部多出来的格要 `DeleteProperty`、
  洞要跟着走、`SetProperty` 返假就是 `TypeError`、**返回接收者的那四格要返回 `self`**
  （JS 的返回值是 `O` 本人，不是那个快照）。**`failed` 那一格不写回**（快照是半成品）。
  台账 `probe2-g11`（`reverse`）/ `probe2-g14`（`sort`）转绿、已撤。
- **这一轮新量到、但根已经在台账里的三条**（所以**没有新登记**）：`Reflect` 整族没装
  （`probe703-o-a25` … `a28`）、`Array.prototype.toString` 要**现读** `this.join`（`140` / `145`）、
  `for..of` 一个长大的 `Map` 看不见新键（`110`）。

**第 714 轮再加 2 条**（分母 7581 → **7583**）：`stdlib/round714/p714a-a01` 问
**`push` 写回类数组**（元素落在 `n` 那一格、`length` 跟着走、连推两格、与已有格子并存），
`p714a-a02` 问 **`pop` 写回类数组**（交出最后一格、删掉它、`length` 减一；
`length` 为 0 的那一档**不动那个对象**；`Object.freeze` 上 `push` 抛 `TypeError`）。
两条都 pass，**收掉台账 `stdlib/array/probe2-g10`**：

- **`push` / `pop` 的类数组接收者要写回那个对象**（第 714 轮）：只动**尾部一格 + `length`**，
  所以先做这两格；`sort` / `reverse` / `splice` 那一族照旧响亮地抛、台账里登着
  （`IsArrayLikeMethod` 那一段写着这条分界：只读那一族**折成快照**，
  会改接收者的那些**要写回**）。**次序是语义**：`push` 先写元素后写 `length`、
  `pop` 先删那一格后写 `length`。**不可扩展的接收者要抛**（实测撞到的）：
  只写不查的话 `Object.freeze({ length: 0 })` 上 `push.call` 给 `1`（Node 抛 `TypeError`）——
  JS 那个 `Set(…, true)` 的 `true` 就是「写不下去要抛」，而 `SetProperty` **静默返假**。

**第 713 轮不加语料，只收 1 条台账**：`exec/expressions/180-in-operator`
（`"a" in 1` 该抛脚本接得住的 `TypeError`；本仓原来**整份文件跑不起来**）。
两处一起改才对：抛的得是 `TypeError`（原来是普通 `Error`），
而且**要包 `Guard`**——rt 层的裸抛从 `Run()` 直接冒出去、脚本的 `try` 接不住
（只改前一半的症状是「前面几行照常打印、`catch` 一次都不进、退出码 1」）。

**同一轮试过、当场回退的一处**（**量出来的话登在 `probe694-g04` 的 `xl:why` 里**）：
`it.return(7)` 打在没跑过的生成器上该当场收摊（`{ value: 7, done: true }`、函数体不执行），
本仓跑到第一个 `yield` 停下（给 `{ value: 1, done: false }`，**静默错值**）。
收法是在 `DoIterNext` 里按「函数体开始跑过没有」拦一档——**实测 128 条回归**
（`e2e` 那一族生成器流水线一起红：`returns` 那一路与「正常恢复」共用一个入口），
**回退**。要收它得让**恢复那一步**也认得「这次是 return」。

**第 712 轮只加 1 条**（分母 7580 → **7581**）：`exec/round712/p712a-a01` 问
**`Set` 的 `Set.prototype[Symbol.iterator]` 那一格**（`typeof` 是 `"function"`、
取出来的第一个值是 `1`、它与 `Set.prototype.values` 是**同一个函数对象**）——
第 711 轮只钉了 `Map` 那一格，这一轮把 `Set` 那一半**用同一条形状补齐**（两格一起修的，
所以用例也成对）。**这一条 pass**，同时收掉 4 条台账：

- **`Map.prototype[Symbol.iterator]` / `Set.prototype[Symbol.iterator]` 没人挂**
  （第 712 轮，**同一根**：`for..of` / 展开走语言层 `GetIterator` 的**协议**路，
  **不问原型这一格**，于是 `for (const [k, v] of m)` 一直对、
  而 `m[Symbol.iterator]()` 报 `cannot call a non-closure value`）。
  两格挂在 `globals.xl.md` 的 `BuildGlobals` 里 **`Array.prototype[Symbol.iterator]` 那一处**，
  键从知名符号小表取、值指到**已经挂出去的那个能力号**（`MapEntries` / `SetValues`——
  JS 里 `Map.prototype[Symbol.iterator] === Map.prototype.entries`、
  `Set.prototype[Symbol.iterator] === Set.prototype.values`，**同一件事不写第二份实现**）。
  **位置是实测撞出来的**：第一版写在 `install.xl.md` 的 `InstallBuiltins` 里
  （与 `InstallMapPrototype` 并排），而那一句跑在 `BuildGlobals` **之前** ⇒
  符号表还是空的、取键得 `undefined`、**静默什么都不挂**（症状与「没修」一字不差）。
  台账 `exec/round711/p711c-c07`（`Map` 那一格）、`exec/round710/p710c-c01` /
  `runtime/iterators/probe693b-g15`（`Map` 迭代器条目按下标读）**三条转绿、台账已撤**。

**第 711 轮再加 26 条**（分母 7554 → **7580**）：第二十一批原子探针，专问
**「一元前缀 + 一条链」的形状**（`typeof` / `void` / `!` 后面接「下标调用 + 后缀」的链、
链上再套一层调用与取值）、**同一条链落在二元左操作数位**、以及**数组迭代器那一格**
（`[Symbol.iterator]` 在不在、`next()` 的两档、展开一个迭代器、`values` 与它是同一个函数）。
**这一批 22 条 pass、登记 4 条缺口**，而**普查当场红出一处静默错值**：

- **一元前缀的操作数在后面**（`typeof o[k]().v` **整条链被截断**）：token 层给的形状是
  `[UnaryOperator(typeof o[k]), Bracket(()), ., v]`——那个一元单元把 `typeof` 与
  **它的操作数**装在同一格里，而链上后面那些格接的是**操作数**
  （JS 里 `typeof` 管的是整条链）。照原样折会把后面那些格套在 `typeof` 的**结果**上：
  `typeof o[k]().v` 报 `cannot call a non-closure value`、`o[k]().v + ""`
  拿到的是**那个函数自己**（Node 给 `1`）。**修法与第 178 轮 `?.` 那一处一字不差**
  （那里也是「一元前缀 + 操作数在后」）：把操作数那一格接上链上其余格、当场递归折完，
  再套回那个一元节点。**踩到两处**：① 递进去的必须是**摊开之前**的那一份 kids
  （递摊开之后的三格平级会让它落进二元那一支，折出一个操作符是 `DotToken` 的
  `BinaryExpression`，降级期报 `name is not a local or a capture: v`）；
  ② 操作数那一格**有两个字段名**——`typeof` / `void` / `delete` 是 `expression`，
  而 `!` / `~` / `+` / `-` / `++` / `--` 是 `operand`，只认前者会让 `!o[k]().v`
  **退回旧路**（同一个形状两种结局）。台账 `runtime/iterators/probe694-g18` 与
  第 710 轮刚登的 `exec/round710/p710c-c02` 两条**同一条根**，这一轮一起转绿、台账已撤。

**新登记 4 条**：`Map.prototype[Symbol.iterator]` 那一格没装；
**二元左操作数位**上的链还没认（`o[k]().v + ""` / `1 + o[k]().v` / `o[k]().v === 1`
——第 711 轮收的是**一元**那一半）。

**加权仍是 95.9%**（分子 +24：收掉的 2 条 + 新过的 22 条；分母 +26，另登记 4 条缺口）。

**第 710 轮再加 49 条**（分母 7505 → **7554**）：第二十批原子探针，三层——
**`this` 的装箱**（松散 / 严格 / 类方法 / 箭头四档下 `call` / `apply` / `bind` 与 `new` 的
原始值接收者、装箱之后的 `instanceof` / `valueOf` / `constructor.name` / `length`）、
**全局与内建命名空间的标志位**（`Object.keys(globalThis)`、`Object.keys(Number|String|Array|Promise)`、
`Math.PI` 的整份描述符与赋值、`Error.prototype`、`Function.prototype.call`）、
**迭代器与生成器的形状**（`Map` 迭代器条目、数组迭代器的 `next`、生成器的标签与构造器名、
`Set` 展开、`Map.forEach` 次序）。
**这一批 43 条 pass、登记 6 条缺口**，而**普查本身收掉一族**：

- **`call` / `apply` / `bind` 的原始值接收者要 `ToObject`**（第 710 轮，**静默错值**）：
  `(function () { return typeof this; }).call(1)` 在 Node 里给 `"object"`
  （`this` 是 `Number` 包装对象），本仓原样递那个数 ⇒ 给 `"number"`——
  `this instanceof Number` / `this.constructor.name` / `String(this)` 三处跟着一起错。
  **修法收在语言层的一处 `BoxReceiver`**（字符串走 `MakeStringBox`、数字与布尔走 `MakeBox`，
  与 `Object(原始值)` 那一支**一字不差**），三个入口共用：`FunctionCall` / `FunctionApply`
  的 `thisArg` 与 `BoundCall` 里那个绑定时的 `this`（`bind` 记的是原值、装箱发生在**每一次调用**上）。
  **严格目标不装箱**（闭包的 `IsStrict` 那一位现问），**`null` / `undefined` 不在这里兜**
  （引擎更早一步把它们换成全局对象）。台账 `exec/functions/probe3-t03` / `probe3-t04` /
  `probe3-t14` / `probe700-f-e25` / `probe703-f-g11` / `probe703-f-g12` **六条转绿、台账已撤**；
  `094-bind-apply-primitive` 的**前四行**也对上了，它剩下的差额是最后一行打印全局对象的渲染
  （另一条根，台账已改写成实情）。
- **`Promise` 的八个静态也是「可枚举」挂的**（**实测撞到的**）：`Object.keys(Promise)` 在 Node 里是
  **`[]`**、本仓是 **8** —— 与第 709 轮那 128 处同一条根，这一轮把 `promise.xl.md` 那八处
  一起改成 `SetHiddenProperty`（`p710b-b08` 因此转绿）。

**新登记 6 条**：`Map` 迭代器条目按下标读、迭代器对象自己没有 `next`、生成器的
`[object Generator]` 标签、`AsyncFunction` / `GeneratorFunction` 两个构造器名、
`Object.keys(globalThis)` 那 15 个**宿主**全局（与 `057-names-globalthis` 同一件事）。

**加权仍是 95.9%**（分子 +49：收掉的 6 条 + 新过的 43 条；分母 +49，另登记 6 条缺口
——两个数落在同一位上）。

**第 709 轮再加 56 条**（分母 7449 → **7505**）：第十九批原子探针，三层——
**函数对象自己那几格**（松散普通函数 / 箭头 / 方法 / 访问器 / 生成器 / `async` 六档的
自有名字表、`arguments` 与 `caller` 的取值与 `hasOwnProperty`、`prototype` 那一格）、
**内建命名空间的成员标志位**（`Math` 的八个常量与方法、`JSON` / `Object` / `Number` /
`String.prototype` 的 `enumerable`、`Math` 上的 `for..in`）、
**不可迭代物的抛出种类**（`[...42]` / `for..of` 一个对象 / 数组解构一个数字 /
`Array.from({length:2})`）。
**这一批 51 条当场 pass，另登记 5 条缺口**（`p709a-a16` / `p709a-a19` / `p709d-d06` /
`p709b-b17` / `p709b-b18`），而**普查本身收掉了四族**：

1. **松散普通函数的 `arguments` / `caller` 两格从来没装**（**静默错值**，一条根串起 11 条）：
   JS 里函数声明与函数表达式**自有**这两格（`Object.getOwnPropertyNames(function f(a, b) {})`
   给 `["length","name","arguments","caller","prototype"]`），而**箭头 / 方法 / 访问器 /
   生成器 / `async` / 类 / 严格代码**都没有。本仓一格都没有 ⇒ `Object.getOwnPropertyNames`
   少两个名字、`f.arguments` 给 `undefined`（Node 给 `null`）。
   **修法**是在闭包上添一位 `HasRestricted`（`heap.xl.md`）——`new_closure` 第四格
   **原来借了两位给「这是类」与「这是严格代码」，这一轮借第三位（值 4），步长 4 → 8**；
   降级层按**节点种类**那一句话算出来（它手里正拿着那个节点），读那一侧在 `props.xl.md`
   的 `GetProperty` 里现答 `null`。台账里 `stdlib/object/151` / `128` / `probe2-d22` /
   `probe693-o06` / `probe703-o-a41` 与 `exec/functions/probe700-f-t05` / `probe703-f-g27`
   **七条一起转绿、台账已撤**。
2. **内建命名空间的成员全是「可枚举」的**（**静默错值**）：`Math` / `JSON` / `Object` /
   `Number` / `String.prototype` 上的成员在 JS 里**全是不可枚举**的
   （`Object.getOwnPropertyDescriptor(Math, "PI").writable` 给 `false`、
   `for (const k in Math)` **一个键都不给**），而本仓用 `SetProperty` 挂 ⇒ 三个标志全真、
   `Object.keys(Math)` 有 **36** 个名字。**128 处安装点一次改齐**（`SetHiddenProperty`
   的缺省就是「可写 + 可配置、不可枚举」），`undefined` / `NaN` / `Infinity` 三格
   另给 `flags = 0`（只读）；**唯一的例外是 `console`**——它不在规范里，Node 的实现
   把方法挂成**可枚举**（`Object.keys(console)` 数得出 25 个名字），所以那一格留在
   `SetProperty` 上，**两种口径写在明处**。
3. **`async` 函数不该有 `prototype`**（`Object.getOwnPropertyNames(async function a(b) {})`
   在 Node 里是 `["length","name"]`）：函数表达式与函数声明**两处**都会挂，
   这一轮两处一起排掉 `IsAsync`（生成器照旧有）。台账
   `runtime/async/probe697-z07` 转绿、已撤。
4. **不可迭代物抛的是 `TypeError`**（本仓抛普通 `Error`，`e instanceof TypeError` 分不出来）：
   `iter_new` 与 `DrainIterator` 两处改成抛宿主 `TypeError`（`Guard` 按宿主异常的类
   折成 `ErrorKindType`）。台账 `runtime/iterators/probe696-i08` / `probe705-i-c13` 转绿、已撤。

**另外两处顺带收掉**：`(function f() {}).hasOwnProperty("prototype")` 原来答**假**
（闭包在 `hasOwnProperty` 那一支被 `Tag` 白名单挡在扫描之外，而 `Object.getOwnPropertyNames`
列得出它——**同一个属性两种问法两个答案**）；`Object.keys(Error)` 那一格的真面目
（Node 24 上唯一可枚举的是 `stackTraceLimit`，本仓原来是 `prototype` 顶的——
**两个不同的键、同一个长度 1**，第 709 轮改齐命名空间的标志位之后当场露出来，判据
`stdlib/error/probe704-e-a23` 报了**倒退**一条，收法是把 `stackTraceLimit` 按实现挂成可枚举）。

**加权 95.8% → 95.9%**（分子 +62：收掉的 11 条 + 新过的 51 条；分母 +56）。

**第 708 轮再加 81 条**（分母 7368 → **7449**）：第十八批原子探针，三层——
**类内部件与成员形状**（缺省构造函数的 `length`、派生类 `super` 前后的 `this`、
私有方法 / `#x in o`、静态块与字段次序、计算键、方法取出后的 `this`、`new.target`）、
**取值链**（可选链的短路边界、可选调用与可选下标、`??` 与 `||` 的分界、逗号运算符）、
**解构与展开**（嵌套缺省、数组的洞与剩余、对象展开的次序、形参默认值引用前面的形参）、
以及 **`console` 的渲染形状 / `JSON` / 文本与数字的边界**。
**这一批 81 条里 78 条当场 pass**（前三批累计量出来的那些机制在这一层是稳的），
另登记三条：

- **`console.log` 的循环引用形状**：Node 先打 `<ref *1> { a: 1, self: [Circular *1] }`，
  而这一层**没有那张「见过的容器」表**，靠 `InspectDepth = 2` 兜住
  （不转圈，但一个自引用对象会被印成两层 `{ a: 1, self: { … } }`）；
- **`Error.stack` 没装**（与台账里 `probe697-e11` 同一条根）；
- `String.prototype.search` 的**字符串实参**要走 `new RegExp(串)`——与 `RegExp` 整族同一条根
  （`stdlib/string/probe693-y30` / `probe703-s-e35`）。

**加权仍是 95.8%**（分子 +78、分母 +81）。

**第 707 轮再加 117 条**（分母 7251 → **7368**）：第十七批原子探针，专问**静态面与构造器**
（`Object.assign` / `fromEntries` / `groupBy` / `create`、`Array.from` / `of` / `isArray` 与
`copyWithin` / `fill` / `splice` / `toReversed` 那一族、`Map.groupBy`、字符串与数字的格式化、
`Math` 的边界）、**异步与迭代**（`Promise` 四个组合子、生成器的 `return` / `throw` / `yield*`、
自定义可迭代物、`for..of` 与解构）、以及**描述符 / 类 / 错误**三小片。
**三处当场红，收掉两族**：

1. **`Object.assign` 往数组目标写下标时落在属性表上**（**静默错值**）：
   `Object.assign([], [1, 2])` 本仓给一个**长度 0** 的数组（JS 给长度 2）——
   元素住在 `Elements` 载荷里，而 `SetProperty` 那一趟只写属性表。
   修法：两条写回路径（源是数组那一条、源是普通对象那一条）都先问一次
   `ArrayIndexAt`，是下标就落进元素区。台账里 `probe694-o27` / `probe703-o-a38`
   两条**同一条根**，这一轮一起转绿、台账已撤。
2. **数字键与字符串键在属性表上不是同一格**（**同一个属性、四种问法、两个答案**）：
   对象字面量 `{ 1: "v" }` 的键是**数字字面量**（降级层原样交上来），
   于是 `o[1]` / `o["1"]` / `1 in o` / `o.hasOwnProperty(1)` **四条全对**，
   而 `Object.hasOwn(o, 1)` / `Object.getOwnPropertyDescriptor(o, 1)` /
   `o.propertyIsEnumerable(1)` **三条答假 / 给 `undefined`**（判据 `p707d-k01` / `k02`）。
   两处修法：`props.xl.md` 的 `KeyMatches` 认「整数两档」（`Int32` 与十进制文本是同一格，
   只认非负整数——`-1` / `1.5` 在 JS 里是普通属性名），
   而 `getOwnPropertyDescriptor` 的数字键**在入口处先归一成文本**（JS 那一步就是 `ToPropertyKey`），
   ——顺带把它那一支的「非数组 / 非字符串接收者直接给 `undefined`」改成
   **接着走自有属性表那一趟**（原来整数键在普通对象上整条路断路）。

**另登记两条**：`Uint8Array` 那一族（TypedArray）整个没登记（降级期就抛
`name is not a local or a capture: Uint8Array`，要做先得定它是不是一个新的 `ValueTag`）、
数组 `length` 的**描述符**没有异形语义（`Object.defineProperty(a, "length", { value: 1 })`
既不削短也不删元素、`{ writable: false }` 之后 `push` 也不抛；
赋值那条 `a.length = 1` 是好的——它要 `HeapArray` 上多一格标志位）。
**加权仍是 95.8%**（分子 +118：收掉的 2 条 + 新过的 115 条；分母 +117，另撤掉一条旧台账）。

**第 706 轮再加 133 条**（分母 7118 → **7251**）：第十六批原子探针，专问**对象模型那一层**
（冻结 / 密封 / 不可扩展、属性描述符与键序、数组的洞、全局对象面、类与访问器、符号、
`Date` / `JSON` 的文本面）。**这一批七处当场红，收掉三族**：

1. **`Object.defineProperty` 的键没走 `ToPropertyKey`**（**整份文件进不来**）：
   `Object.defineProperty(o, 1, …)` 与 `Object.defineProperty(o, { toString() { return "k"; } }, …)`
   都**响亮地抛**（`needs (object, string or symbol key, descriptor object)`——
   一句话里没有一个字提到「数字键」）。**同一个形状在隔壁早有答案**：
   `Object.hasOwn`（第 691 轮）/ `hasOwnProperty`（更早）/ `getOwnPropertyDescriptor`（第 692 轮）
   都收数字键——只有**写**那一侧漏着，而写不进一格比读不出一格更难被发现。
   修法是**把这条口径收成一个落点**：`text.xl.md` 添 `PropertyKeyValue`
   （符号留着、其余 `ToString`），`defineProperty` 与 `__lookupGetter__` 那一族都走它。
2. **`delete` 的键没走 `ToPropertyKey`**（**整份文件进不来**）：
   `delete o[1]` 报 `property keys must be strings or symbols`（`props.xl.md` 的 `KeyMatches`
   见到数字键当场抛）——而 `get_index` / `set_index` / `in` 三处第 190 / 191 / 305 / 123 轮
   就各自收过了。**读得到、写得了、删不掉**是同一条链上唯一漏掉的一环。
   修在 `vm.xl.md` 的 `del_prop`：与 `in` 那一格**一字不差**（符号原样、其余 `RtToString`）。
3. **`Object.prototype` 的老访问器辅助四格没装**（Annex B）：
   `__lookupGetter__` / `__lookupSetter__` / `__defineGetter__` / `__defineSetter__`
   ——判据 `stdlib/object/118-names-object-proto.ts` 登的六处差额里，四处就是它们
   （另两处第 697 / 689 轮各收掉一格）。实现**不写第二份算法**：读的两格转交
   `getOwnPropertyDescriptor`（并且**沿原型链走**——规范那一条算法是 `Repeat` 到 `null`，
   第一版只问自有那一格，`Object.create({ get g() {} }).__lookupGetter__("g")` 给 `undefined`），
   写的两格落在 `DefineAccessor` 上（第七格给 `true`：JS 里它造的格子**可枚举**，
   与 `Object.defineProperty` 的缺省**正好相反**）。
4. **数组下标的 `[[DefineOwnProperty]]` 那一趟从来没有**（**静默错值**，一条根串起四格）：
   `Object.defineProperty([], 0, { value: 5 })` 原来写成**一个普通属性** ⇒
   `a.length` 还是 `0`、`a[0]` 是 `undefined`、`JSON.stringify(a)` 给 `[]`
   （判据 `p706c-x08`；台账里 `probe694-o19` / `probe694-o22` / `probe698-c09` 三条**同根**，
   这一轮四条一起转绿、台账已撤）。修法在 `DefineOwnFromDescriptor`：**下标那一档写元素区**
   （`length` 跟着长），**不可枚举的那一档再进 `Props` 一份**——元素区**没有逐格标志位**，
   所以「在不在」与「算不算可枚举键」在这一层是两个问题，
   由新添的 `IndexKeyShadowed` 一句同时管住 `OwnEnumerableKeyTexts`（`Object.keys` / `for..in`）
   与 `getOwnPropertyDescriptor`（标志位按属性表答）。
   **没写 `enumerable` 时沿用那一格原来的枚举性**（`Object.defineProperty(xs, "1", { value: 9 })`
   在 JS 里**只改值**，`Object.keys(xs)` 还是三个键）——那是 `probe698-c09` 的差额。

**另登记三条**（这一轮量出来、没做的）：`getOwnPropertyDescriptor` 的**数字键**那一格
（`Object.getOwnPropertyDescriptor(o, 1)`，与 `defineProperty` 是同一条闸门的两半）、
`defineProperty` 的键**是对象**时那一趟 `ToPrimitive`（`TextFrom` 对对象当场抛
「ToString of this kind of value」，根子在引擎侧那次「值 → 键」没有调用通道）、
以及**宿主引用那两档没有 `name` / `length`**（`Object.prototype.hasOwnProperty.name`
取不到——本仓只给闭包与内建构造挂过那两格）。
**加权 95.7% → 95.8%**（分子 +133、分母 +133；另收掉四条旧台账）。

**第 702 轮（其三）补上五个 `Date.prototype` 成员**
（`stdlib/date/039-r676-std-date-gettimezoneoffset` 与 `043-r676-std-date-toutcstring` 转绿，
另补一条 `probe702-d-e01`）：`toUTCString`（与 `toGMTString` **同一个号**——JS 里是别名）、
`getTimezoneOffset`、`getYear`、`setTime`、`setYear`。**两处踩到的**：

- **号撞在保留段里**（第一版把这一批排在 `713..717`）：**`700..799` 是对象辅助函数那一段**
  （`install.xl.md` 的 `InvokeObjectHelper` **先接走**），于是 `d.getTimezoneOffset()` 报
  **`unimplemented: object helper 714`**、`d.toUTCString()` 报
  **`define_data needs (object, key, value)`**——症状里**没有一个字**提到号
  （与第 280 轮 `DateUTC` 撞 `TypeErrorCtor`、第 150 轮 `ArrayAt` 撞 `ArrayFlat` 同一个形状）。
  改到 `680..684`（那一段空着、且不在那道拦截后面）。
- **`getTimezoneOffset` 给 `0`**，这是本仓一贯的口径而不是「没做」：本地口径就是 UTC，
  去答机器真时区会让 `getHours()` 与它**互相矛盾**。代价写在用例台账里
  （Node 在同机给 `-480`，判据只钉「是个 `[-1440, 1440]` 里的整数」——两边都真）。

**仍不做的两族**（`stdlib/date/045-names-date-proto` 的差额从 11 缩到 5）：
`toDateString` / `toTimeString` 要**本地墙上时间 + 星期月份的英文名**、
`toLocaleDateString` / `toLocaleString` / `toLocaleTimeString` 要**一张区域表**
（与 `Intl` 整族一起没做）。

**第 702 轮（其二）收掉 `arguments` 那一格**（`stdlib/object/138-object-tostring-arguments` 转绿，
另补一条 `probe702-o-e01`）：本仓的 `arguments` **值就是一个数组**
（`vm.xl.md` 就是这么造的，`arguments[0]` / `.length` / `[...arguments]` 全靠它），
所以 `Array.isArray(arguments)` 给真、`Object.prototype.toString.call(arguments)` 给
`"[object Array]"`——而 Node 两处都给「不是数组」。收法**不是**改值模型
（那会牵动那一整片本来已经对的东西），而是**在造它的那一处挂两格**：
`__a`（标记）与 `callee`（值就是 `DoCallValue` 手上那个 `callee`），
由语言层的 `IsArgumentsValue` / `ObjectTagOf` / `ArrayIsArray` 去读。
**踩到的第一版**：`callee` 从 `frame.NewTarget` 上读——`frame` 是**调用者的帧**，
不是这一帧的，于是 `arguments.callee` 恒为 `undefined`（顶层帧的 `NewTarget` 永远是空的）。
**仍开着的一格**：`arguments[i]` 与形参之间**没有映射**（`arguments[0] = 9` 不改 `a`），
那要的是 `[[ParameterMap]]`——登在 `exec/functions/095-arguments-length` 的台账里。

**第 702 轮再加 4 条**（分母 6433 → **6437**）：**收掉第 700 轮登记的那一族**
（`probe700-g-e08` / `e09` … `e19` / `e38` 共 **13 条**转绿），并把这轮的新判断补成 4 条用例
（`stdlib/array/probe702-a-e01`、`stdlib/string/probe702-s-e01`、
`stdlib/globals/probe702-g-e01`、`probe702-g-e02`）。**differ 105 → 92**。

根子是 `array.xl.md` 里那个共用的实参取值器 `ArgOr`：它的签名里没有 `room` / `call` / `protos`，
**只认数值格子**，于是 JS 那一步 `ToIntegerOrInfinity(ToNumber(v))` 里的 `ToNumber`
**一次都没做**（字符串、对象、包装对象一律静默落到缺省值）。修法是**两个名字、两份签名**：

- **`IntArgOr` / `NumArgOr`**（宽签名，真做 `ToNumber`）——`InvokeString` / `InvokeArray` /
  `SpliceArray` / `InvokeGlobal` 那一族有通道，**45 处调用点**改走它；
- **`ArgOr` 保持窄签名**——`ArrayLikeAt` / `flat` 的自查那一族**根本没有 `call` 通道**，
  签名一旦变宽只能拿 `null` 充数，那是「看着像对了」的静默降级。

**顺带收掉的三处**（都是同一个「拿判据表内部那一半去顶语义那一半」的形状）：

- `Array.prototype.indexOf` / `at` / `splice` / `toSpliced` 原来走 **`ToInt32Of`**（只认数值格子）
  ⇒ `[1,2,3].indexOf(2, { valueOf: () => 1 })` **抛**（Node 给 `1`）、
  `[1,2,3].at({ valueOf: () => 2 })` **抛**（Node 给 `3`）；
- `parseInt(x, "16")` 原来落回缺省 10（Node 给 255）；
- `new Date("2020" as any, 0)` 里那个**字符串年份**落回 `0`，再吃 `0..99` 那条加 1900 的规则
  ⇒ **公元 1900 年**（Node 给 2020）。

**这一轮真正难的那一格**是 `NaN`：`int` 装不下 `NaN`，而 **`Math.floor(NaN)` 在宿主里给 `0`**
——第一版把「`NaN` 折成哨兵」写成 `Math.floor`，于是 `new Date(2020, undefined)` 又悄悄地
变成了 1 月（**看起来完全正常的一个日期**）。收法：`IntOfNumberStrict` 用
`int` 的最小值 `-2147483648` 当哨兵，`DateMakeMs` 在入口认它、`Date` 的七个 getter
在入口把非有限的时刻直接交回 `Value.FromDouble(NaN)`（**原来 `Value.FromInt(NaN)` 会渲染成空串**，
而 `typeof` 还是 `"number"`——`number:` 后面什么都没有）。

**第 701 轮再加 100 条**（分母 6333 → **6433**）：第十二批原子探针，三层——
**严格性那一格**（函数体开头的指令序言、类体、箭头、嵌套声明、`call` 的接收者）、
**控制流与异常**（`switch` 落穿与 `default` 的位置、多标签的 `break` / `continue`、
`try` / `catch` / `finally` 的五种组合、`for..in` 与原型链、抛出非 `Error` 的值）、
**数值与 `Math` 边界**（`toFixed` / `toPrecision` / `toString(radix)` 的取舍、
`Math.round(-0.5)` / `sign(-0)` / `clz32` / `fround`、`Number` 的字符串解析与 `-0`）。
**收掉两处**：

- **函数体开头的 `"use strict"` 从来没认过**（**静默错值**）：第 620 轮那条注释写着
  「本仓只认**类体**这个严格源」，而 `(function () { "use strict"; return this === undefined; })()`
  在 JS 里是**真**。修法：`HasUseStrictDirective`（只认**开头那串**「字符串字面量且是
  表达式语句」——`("use strict")` 与放在别的语句之后的都**不是**指令），
  在**函数值**与**函数声明**两条路上一起记进 `item.IsStrict`；
  **函数声明那条路原来一格都不设** ⇒ 类体里嵌套的 `function f() {}` 一直被当成松散
  （JS 的严格性沿词法继承）。**箭头不给指令序言这一档**：它的 `this` 是词法的。
- **`break` / `continue` 会把**外层** `try` 的 `finally` 也跑一遍**（**静默多跑**）：
  `try { for (…) { … continue; } } finally { … }` 本仓给 `"1f2f"`、Node 给 `"12f"`。
  修法：`LoopContext` / `BlockLabelContext` 各添一格 `FinallyDepth`，
  `EmitPendingFinalies(from)` 只发**目标那一层里面**的 `finally`。

**已收**：`exec/functions/probe693b-f17`（第 692 轮登记的「`"use strict"`」）与
`exec/functions/probe700-f-e24`（第 700 轮登记的同一个根）两条台账转绿、已撤。
另登记 2 条新缺口：没声明过的名字在降级期就抛（同第 692 轮那条根）、
模块顶层的 `this` 是 `undefined`（裁判按 CJS 给 `module.exports`）。
**加权 95.62% → 95.66%**（分子 +100、分母 +100）。

**第 700 轮再加 158 条**（分母 6175 → **6333**）：第十一批原子探针，三层——
**字符串方法的实参形状**（缺实参 / `undefined` / 数字 / 布尔 / 对象 / 包装对象 / 符号）、
**函数与闭包形状**（默认值、剩余、解构形参、`arguments` 那一族、`this` 的五档、
提升与 TDZ、`bind` / `call` / `apply`、访问器与简写方法）、
**迭代协议与生成器**（`yield*`、`return` / `throw` 两条清理路、自定义可迭代物、
`Array.from` / 展开 / 解构三处的落法）。**收掉一族静默错值**：

- **字符串方法一次都没转换自己的实参**。文本那一半直接走 `JsTextUnits`
  （**引擎的** `TextUnitsOf`，对对象当场抛），并且把**缺实参**当成空串——
  而 JS 那一步是 `ToString`：`"abc".includes({ toString() { return "b"; } })` 该给真、
  `"abc".includes()` 找的是 `"undefined"`（该给**假**，本仓给真）、
  `"abc".concat({ toString() { return "T"; } })` 该给 `"abcT"`（本仓给 `"abc[object Object]"`）。
  修法：添一格 `TextArgUnits`（缺实参当 `undefined`；对象走 `ToPrimitiveOf` + `JsTextUnits`，
  与 `String(x)` **同一处**），并把 `protos` 灌进 `InvokeString`——这一族有九个调用点，
  而那个函数的**调用点只有一处**；`replace` 的「不收正则」判据也改成 JS 的 `IsRegExp`
  （`Symbol.match` 可调才是正则），不再把普通对象一起挡掉。
  数值那一半：共用的 `ArgOr` 原来把非数字**一律**当缺省值，于是
  `"abc".slice(true)` 给整串、`"abc".repeat(true)` 给空串——现在布尔与 `null` 各认一档
  （`undefined` 仍走缺省值：规范里可选实参给 `undefined` 与没给是同一档）。
- 第 699 轮登记的那条（`stdlib/string/probe699-s-t08`）转绿、台账已撤。

另登记 20 条新缺口：**`ArgOr` 不做 `ToNumber`**（13 条，`charAt("1")` / `at({valueOf})` /
`slice({valueOf})` / `repeat({valueOf})` 那一族——`ToNumber` 要 `room` / `call` / `protos`，
而这个取值器被十几个内建共用）、**`arguments` 那一族**（形参双向别名 / `arguments.callee` /
`f.arguments`）、函数体开头的 `"use strict"`、`call` / `apply` 的原始值接收者没装箱、
形参默认值里的 TDZ、**往生成器里 `throw` 不走 `try/finally`**。
**加权 95.78% → 95.62%**（分子 +139、分母 +158）。

**第 699 轮再加 202 条**（分母 5973 → **6175**）：第十批原子探针，三层——
**强制转换与相等**（`==` 的整张矩阵、`ToPrimitive` 的三种 hint、`Symbol.toPrimitive`、
`+` / 比较 / `String()` / `Number()` 各走哪一步、`parseInt` / `parseFloat` 的边界）、
**类与成员形状**（字段与访问器的遮蔽、`super` 的两半、私有名的品牌与 `#x in o`、
静态块的次序与 `this`、`new.target`、类表达式的名字、`extends` 的三种目标）、
**字符串边界**（`padStart` / `repeat` / `split` 的限额、替换模式里 `$&` / `` $` `` / `$'` / `$$`、
`indexOf` / `includes` / `startsWith` / `endsWith` 的位置档、代理对与码点、`String.raw` 与标签模板）。
**收掉两处、并撤掉两条旧台账**：

- **类字段走的是「赋值」而不是 `[[DefineOwnProperty]]`**（**静默错值**）：第 128 轮起
  这条差异就**写在明处**（`typescript-exec/README.md` 那一句），这一轮把它收掉。
  现场：`class A { get x() { return 1; } }` + `class B extends A { x = 2 }` ⇒
  `new B().x` 本仓 **`1`**、Node **`2`**（字段被原型上的 getter 拦住 ⇒ 实例上什么都没有）；
  反面是父类有 setter 时**去调了它**。修法：语言层添一格内部调用 `define_data`（号 713），
  落在 `props.xl.md` 的 `CreateDataProperty` 上（第 697 轮给 `JSON.parse` 立的那格），
  **实例 / 静态 / 计算键三条字段路一起换**；`#私有字段` 仍走 `set_hidden`（它不是一个属性）。
  同一处顺手把 `set_hidden` 的键过一遍 `ToPropertyKey`（`class A { [1 + 1]() {} }`
  原来报 `set_hidden with a key that is not a string or a symbol`，整类进不来）——
  台账 `exec/classes/probe2-k14` 因此转绿、已撤。
- **具名类表达式那一层环境没开**（**整份文件进不来**）：`const A = class Named { static y = 2 }`
  报 `env_leave with no parent environment`——`HasNamedExpression` 只认 `FunctionExpression`，
  于是 `LowerClass` 那三步的收尾在**没有父亲的环境**上抛。加上 `ClassExpression` 之后，
  静态字段里的类名也要**当场**读得到：`class Named { static y = Named.name }` 原来读成
  `undefined`（`env_set` 排在静态成员**之后**）——写值挪到构造函数出来之后、`env_leave` 留最后。
  台账 `exec/classes/probe-c09` 转绿、已撤。

另登记 4 条新缺口：`class A extends Array { }`（内建构造当基类，`heap object is not an environment`）、
`class B extends null {}`（继承目标只按名字解析）、`super()` 之前读 `this` 该抛 `ReferenceError`、
字符串搜索族的实参没走 `ToPrimitive`（`"abc".includes({ toString() { return "k"; } })`）。
**加权 95.75% → 95.78%**（分子 +199、分母 +202）。

**第 698 轮再加 85 条**（分母 5888 → **5973**）：第九批原子探针，专问**排序与比较器**、
`ToPrimitive` 三件套（`Symbol.toPrimitive` / `valueOf` / `toString`）、属性描述符的迁移、
解构与默认值、`try/finally` 与标签的控制流、对象字面量的 getter / 展开，以及 `delete` / `in`。
**收掉两处**：

- **`async` 函数的返回值不是一个「真的承诺」**（第 692 轮就登在台账里的
  `runtime/async/probe3-a12` 与第 697 轮新登的四条）：`(async function () { return 1; })()`
  **有** `then`（第 285 轮把三个方法挂在实例上了），但它的原型一直是 `protos.Object` ⇒
  `instanceof Promise` **假**、`Object.prototype.toString` 给 `[object Object]`、
  `.constructor` 干脆**没有**（`p.constructor.name` 抛 `TypeError`）。
  修法：`vm.xl.md` 的 `MakeAsyncPromise` **把原型接上 `protos.Promise`**，
  并且**不再在实例上挂那三个方法**——第 690 轮它们已经在 `Promise.prototype` 上了
  （`Object.getOwnPropertyNames(Promise.prototype)` 与 Node 逐字相同），
  再挂一份就是**第二份账**（症状是 `Object.getOwnPropertyNames(promise)` 多出三格）。
  同一个根的第二处在建库层：`promise.xl.md` 的 `MakePromise` 也照改
  （注释里那句「与 `Map` / `Set` 同一条口径（实例方法）」在第 341 轮就已经过期）。
- **裸块里带 `in` 的数组字面量整份文件进不来**（**实测撞到的**）：
  `{ const r = ["a" in o]; }` 报 `unimplemented: expression TypeParameter`。
  根子：`IsMappedKeyBracket` 判「这个 `[` 是不是映射类型的键」时，容器那一问
  **只问了「父单元是不是一个 `{` 括号」，而块的花括号与类型字面量的花括号是同一个类**
  ⇒ 整个数组被当成映射键、投成 `TypeParameter`。
  修法：花括号那一档**再问一句「本单元是不是它的第一个实义单元」**——
  判据与 `type-literal/type-literal.xl.md` 的 `IsMappedTypeBrace` **同一条**
  （映射类型的键一定是花括号里的第一个；`readonly` / `+` / `-` 前缀要跳过），
  按类名判、不 import（那份文件向上 import 这一个文件，反过来会绕出环）。
  **试过又退回来的一条**：改用括号自己的 `Context === "type"` —— 真映射键那个 `{`
  不是 `"type"`，六条 token 用例（`ty-mapped` / `ty-mapped-as-remap` / `lex-keyword-in-of` …）
  当场判成「缺 16 多 7」，`cases:tsast` 与 `coverage` 同时红，所以那一版没有留下。

**加权仍是 95.7%**（分子 +87：收掉的 5 条 + 新过的 82 条；分母 +85，
另登记 3 条新缺口：计算键是对象时的 `ToPropertyKey`、`Object.defineProperty` 写数组下标、
**计算键写的 `__proto__` 不该改原型**——最后一条是第 697 轮那个访问器带出来的，
根子在「对象字面量的成员走 `[[Set]]`、而 JS 走 `CreateDataProperty`」）。

**第 697 轮再加 159 条**（分母 5729 → **5888**，三批：95 + 50 + 15）：第八批原子探针，专问
`Symbol` 与知名符号、`Error` 家族与 `cause`、`Promise` / `async` 的**形状**、
`Number` 与 `Math` 的格式化边界、`Object` 的冻结那一族与**属性枚举次序**，以及 `for..in`；
后两批**专钉本轮修的那一处**（原型那一格）。**收掉一处、而且它底下压着三小处**：

- **`Object.prototype.__proto__` 那个访问器没装**（**静默错值**，第 678 轮就登在台账里）：
  读 `o.__proto__` 给 `undefined`；**写**它更坏——`SetProperty` 对不存在的键造的是**数据属性**
  ⇒ `o.__proto__ = p` 写出一格**叫 `__proto__` 的普通自有属性**、链**一点没变**
  （`o.greet` 是 `undefined`、而 `o.__proto__ === p` 却为**真**——**半对**，最难查的一种）。
  修法：`ObjectProtoGet` / `ObjectProtoSet` 两个号 + `DefineAccessor` 挂到 `protos.Object` 上
  （与 `Map.prototype.size` 第 613 轮**同一条教训**：`SetProperty` 造的是数据属性，
  **造不出访问器**）。取法**与 `Object.getPrototypeOf` 共用 `PrototypeOfValue`**——
  规范里那一格的正身就是一句 `Return ? O.[[GetPrototypeOf]]()`，不写第二份。
  **`null` 那一档`与「原型是数字」不是同一个答案**：`o.__proto__ = null` / `Object.setPrototypeOf(o, null)`
  **真的断开链**（`RtSetProto` 原来把 `null` 与「随便什么非对象」挤在同一句 `return receiver` 里）。
- **写那一侧漏了「宿主可调用」这一档**（**这一轮实测撞到的，也是最要紧的一处**）：
  `SetPropertySearched` 判 setter 能不能调，用的是 `property.Setter.IsCallable()`——
  而**语言层往内建身上挂的 setter 是宿主引用**，`Value.IsCallable()` 看不到它
  ⇒ **继承来的宿主 setter 永远不调**（`o.__proto__ = p` 于是被静默当成「写了个不存在的名字」）。
  **读那一侧第 601 轮就修过了**（`ReadProperty` 用的正是 `IsCallableValue`，
  注释里还写着「实测撞到的」）——**同一个根长在两条路上，只修了一条**；
  这一轮把写那一侧对齐（判据 `exec/decorators-modifiers/051-beh-proto-accessor`）。
  修完当场红了三条 JSON 用例，引出下面那一处。
- **「按数据造对象」不能走 `[[Set]]`**：`JSON.parse('{"__proto__": {…}}')` 在 JS 里造的是
  **一格叫 `__proto__` 的普通自有属性**，而 `[[Set]]` 会**沿原型链调 setter** ⇒ 去**改原型**；
  装库期更响（`SetProperty(…, NeverCall, …)` 真调起来抛
  `unreachable: installing a builtin never calls a function`，**整份文件进不来**）。
  原来那三条用例**只是碰巧过**（setter 恰好被上面那一条挡在门外 ⇒ 静默变成「新建一格」）。
  修法：`props.xl.md` 添一格 `CreateDataProperty`（就是 `SetHiddenProperty` 那一趟 + 三个标志全开），
  `JSON.parse` 与 reviver 两处换成它。

**加权 95.8% → 95.6%**（分子 +148：收掉的 2 条 + 新过的 146 条；分母 +159，
另登记 13 条新缺口：`Error.stack` / `async` 函数那一层壳 / `Object.setPrototypeOf(o, 1)` 该抛
/ 两条 `blocked`——「函数体里的内建基类」与「查不到的名字」）。

**第 696 轮再加 152 条**（分母 5577 → **5729**，两批：102 + 50）：第七批原子探针，专问
**稀疏数组与洞**（`map` / `filter` / `indexOf` / `includes` / `reduce` 五条对洞的口径都不一样）、
`String.prototype` 的替换与切分、`Map` / `Set` 的构造与遍历、迭代协议在
**展开 / `Array.from` / 解构**三处的落法、标签模板的 `raw`，以及类里的访问器与 `super`；
第二批 50 条**专钉本轮修的那一处**（类数组接收者）。**收掉一处**：

- **类数组接收者那一族**（**静默错值 + 整族抛**）：`Array.prototype.map.call({ length: 2, 0: "a", 1: "b" }, f)`
  在 JS 里照跑，本仓报 `this method needs an array receiver`——`slice` / `join` 第 335 / 338 轮
  各有自己的类数组分支，**其余二十来个方法全建在 `HeapArray` 上**。
  修法不是「把每个方法都改成通用的」（那是三十份会漂的判据），而是**先把接收者折成一个真数组**
  （`ArrayLikeSnapshot`：`ToObject` + 逐格 `HasProperty`，`length` 走 `ArrayLikeLength`，
  **在就是值、不在就是洞**——`{ length: 2 }` 折出来是**两个洞**，与 Node 一致），
  再走**下面同一段**。只接**只读那一族**（`IsArrayLikeMethod`：`map` / `filter` / 谓词族 /
  `reduce` 两格 / `indexOf` / `lastIndexOf` / `includes` / `flat` / `flatMap` / `keys` / `values` /
  `entries` / `at` / `toSorted` / `toReversed` / `with` / `toSpliced`）；**会改接收者的那些**
  （`push` / `pop` / `shift` / `unshift` / `reverse` / `sort` / `splice` / `fill` / `copyWithin`）
  要**写回那个对象**，是另一处活，仍然响亮地抛（`probe2-g10` / `g11` / `g14` 的台账还在）。
  **第三个实参是原件**：JS 的回调收的第三个实参是 `O`（接收者对象）——快照**不是**它，
  所以四处回调传的是留下的一份 `receiver`（`probe696-r36` / `r37` / `r38` 钉的就是这一格）。
  **`ToObject` 那一半另有两个洞**：文本接收者（`slice.call("abc")` 原来给 `[]`——
  `ArrayLikeLength` 一句 `if (!receiver.IsObject()) return 0` 把原始值一律当 0，
  第 692 轮登记的 `probe2-g12`）与 `null` / `undefined`（要 `TypeError`，不然会被当成空数组
  **静默给 `[]`**）。**实测**：`probe2-g02` / `g04` / `g08` / `g12` / `g15` 五条台账转绿、已撤，
  `newlyPassing` 5、`regressions` 0。

**加权 95.7% → 95.8%**（分子 +154：收掉的 5 条 + 新过的 149 条；分母 +152）。

**第 695 轮再加 150 条**（分母 5427 → **5577**）：第六批原子探针，专问
**序列化与属性枚举**（访问器 / `toJSON` / 缩进 / 白名单 / 不可枚举）、`Object` 的静态面、
`String` 与 `Number` 的格式化边界、类的访问器与继承。**收掉一处**：

- **`JSON.stringify` 遇到访问器给 `{}`**（**静默错值**）：`JSON.stringify({ get a() { return 1; } })`
  本仓给 `{}`（Node 给 `{"a":1}`）——`JsonText` 那一趟**遇到访问器一律跳过**
  （四处 `PropertyKind.Accessor → continue`），而 `Object.values` / `entries` 第 655 轮
  就已经接上了「有 `call` 通道就**现读**」这条可选服务的纪律。修法：**读值收成一个方法**
  （`JsonMemberValue`：数据属性给 `property.Value`、访问器走 `GetProperty` + `call`、
  读到的值当场 `JsonAnchor` 锚住、**没有通道时给 `null`** 让调用方跳过），四处调用点换成它。
  **还有一处是同一个根的第二个门**：`JsonKeyOrder` 那一趟也把访问器**筛掉了**
  ——不放开它，次序表里根本没有那一格，前一处改得再对也轮不到它
  （实测：只改 `JsonText` 三处仍然给 `{}`）。判据 `probe694-o34` 转绿、撤台账，
  本批 `probe695-j01` … `j17` 与 `k15` / `k17` 把这一族钉住（含缩进、白名单、
  嵌套、`toJSON` 同时在场、`defineProperty` 的两种可枚举性）。

**加权仍是 95.7%**（分子 +151、分母 +150）。**本批 150 条全 pass**：这一族没有别的缺口。

**第 694 轮再加 242 条**（分母 5185 → **5427**）：第五批原子探针，专问**调用链与成员形状**
（谁在左边、谁被调用、`.bind` / `?.` / `new` 的落法、取值与赋值两侧的成员访问）、
**迭代协议与生成器的清理**、类的私有名与静态面，以及 `Object` / `String` / `Array` / `Map`
上还没问过的成员。**收掉一处**：

- **`return o.f?.()` 里那个 `return` 被吃进了被调者链**（第 694 轮，**整份文件进不来**）：
  `?.()` 那一条规则往左走成员访问链找被调者起点时只按**类名**判（`IsChainLink` 认
  `Identifier`），而那一刻 `return` 正是一个 `Identifier`（关键字升级还没轮到它）⇒
  产物里 `Method` 的名字成了 `"return"`、`return` 成了它的第一个孩子 ⇒ 降级期报
  `name is not a local or a capture: return`。`typeof o.f?.()` 同一处（报的是 `typeof`）。
  修法是给链的边界添一张**语句 / 一元关键字表**，并且**只看左边那一格是不是点号**
  ——`o.return?.()` 里的 `return` 是**属性名**（生成器的 `it.return()` 遍地都是），
  `this` / `super` / 字面量也**不进表**（它们可以是链的头）。顺带把第 693 轮登记的那条
  连续可选调用（`o?.f?.()`）也收掉了：`probe693b-e49` 撤掉台账转绿。

另登记 8 条新缺口（`blocked` +5 / `differ` +11，其中 8 条是本轮新登的，另 3 条是把
第 693 轮那批里同根的探针收进来）：**对象字面量里的类**当构造器（`new ns.C()`）、
生成器的 `return(7)` 实参没用上（**静默错值**）、迭代器对象自己没有 `next`、
方法里的**箭头函数用 `super`**、**数组的下标不是自有属性**那一族
（`defineProperty` 抛 / `hasOwnProperty(0)` 答假 / `Object.assign([], [1,2])` 静默给长度 0）、
`JSON.stringify` 遇到**访问器**给 `{}`。

**加权仍是 95.7%**（分子 +235、分母 +242，另收掉第 693 轮那条登记缺口）。

**第 693 轮再加 555 条**（分母 4630 → **5185**）：第四批原子探针（两批：一批问
`Object` 的静态面与键序 / `Array` 的泛用方法 / `Number` 的字符串解析与进制 /
`-0` 与 `NaN` / `String` 的模式替换与码点 / `JSON` / `Map`·`Set` 的 SameValueZero、
另一批问**形状**——语句与标签、ASI、可选链、生成器、解构与展开、`new` 与调用链、
类成员的各种写法）。**收掉三处**：

1. **对象解构写死的键走 `get_prop`**（**静默错值**，两半都是）：
   `const { 0: a } = [7]` 与 `({ 0: b } = [7])` 原来都给 `undefined`（JS 给 `7`）——
   键那一格是 `Identifier "0"`，而 `get_prop` **只认属性表里的字符串键**，
   **数组的下标不在属性表里**。两半一起改成走 `get_index`（与 `arr["0"]` 那条一字不差，
   也与计算键那一支合流）。
2. **引号名的键在投影那一步整个丢掉**（**静默错值**）：`const { "x": a } = o` 的
   `BindingElement` 里键是 `<String><ConstString>x</ConstString></String>`，
   而 `isNameNode` 只认 `Identifier` / `Keyword` ⇒ `propertyName` 没投出来，
   降级层把**绑定的名字**当成了键（`{ "x": a }` 读成 `{ a }`）⇒ 给 `undefined`。
   取法与 `specifierNameOf` 那条**一字不差**（引号名给 `StringLiteral`）。
3. **`break` 的目标只能是「块 / 循环 / `switch`」**：`lbl: if (…) { break lbl; }` 与
   `lbl: try { break lbl; } finally { … }` 都报
   `unknown label \`lbl\` (the parser should have rejected this)`（**整份文件进不来**），
   而**两句都是合法的 JS**。第 234 轮那一支只认裸块、第 692 轮只把它放宽到「标签头」，
   这一轮把判据换成「体**吃不吃**标签」——循环五档 + `switch` 走 `PendingLabels`，
   **其余一律给一层可跳出的上下文**（`BlockLabel`）。判据要**穿过嵌着的标签**看，
   否则 `first: second: for (…)` 的外层会被当成「不吃标签」，`continue first` 当场又断
   （那是第 692 轮刚收掉的一处）。

另登记 15 条新缺口（`blocked` +5 / `differ` +10）：函数自己的 `arguments` / `caller`、
`Object.keys.call.bind(Object.keys)`、`Array.isArray(arguments)`、`localeCompare`、
`search` / `match` 的字符串实参、`case` 后面的**裸块**、**块里的函数声明**（Annex B 提升）、
连续两次可选调用（`o?.f?.()`）、`class A extends Array`、`super.toString`、
`Map` 迭代器交回来的**条目数组**按下标读、`new Function`、函数体开头的 `"use strict"`、
`function () { }.bind(null)`（**函数表达式后面直接跟 `.`** 被投成了声明）。

**加权仍是 95.7%**（分母 4630 → 5185：新收的 540 条通过是分子，15 条登记缺口也是分母，
两个数在同一位上）。

**第 692 轮（其三）再加 103 条**（分母 4527 → **4630**）：第三批原子探针，
专问**闭包与作用域**（提升、TDZ、`var` / `let` 在循环里的闭包）、`this` 绑定
（`call` / `apply` / `bind` 与原始值）、承诺与 `async`、`Map` / `Set` 的成员面、
异常的流转、字符串与模板的边角。**收掉一处**：

- **`new Array(-1)` 抛的是普通 `Error`**（JS 抛 `RangeError: Invalid array length`），
  而同一支里 `new Array(1.5)` **根本不进「一个数是长度」那条路** ⇒
  **静默给 `[1.5]`**（Node 抛）。判据改成「是不是 `0..2^32-2` 的整数」，
  两档一起收：`new Array(NaN)` / `new Array(Infinity)` / `new Array(2 ** 32 - 1)`
  也都对上了。

另登记 5 条新缺口（`differ` +5）：`typeof` 一个**还没初始化**的 `let`（TDZ，该抛
`ReferenceError`，本仓给 `"undefined"`）、松散模式 `call` / `apply` / `bind` 的原始值
接收者**没有装箱**（3 条，与 `exec/functions/094` 同一条根）、`async` 函数的返回值
**不是一个承诺**。

**第 692 轮（其二）再加 150 条**（分母 4377 → **4527**）：第二批原子探针，
专问**属性描述符与访问器**、`Array.prototype` 的**泛用**写法（类数组接收者）、
**数字格式化**（`toPrecision` / `toExponential` 的缺省与 `undefined`）、`Math` 的边角、
类的 `super` 与私有名、解构 / 展开、装箱与 `ToPrimitive`、控制流
（`finally` 覆盖 `return`、带标签的跳出）。这一批**收掉五处**：

1. **带标签的语句后面那一截被壳吞掉**（**静默错值**，最响的一处）：
   token 层把 `outer: for (…) { … }` 与**它后面那条语句**收进**同一个** `Statement` 壳
   （`SplitShell` 遇到 `Label` 开头时一律让开），而投影的标签那一支只吃
   「标签 + 被标的语句」⇒ 壳里剩下的整段丢掉。顶层是「循环后面的语句一句都不跑」，
   **函数体里更响**：`function f() { lbl: { …; break lbl; } return out; }` 的 `return`
   也在壳里 ⇒ **函数返回 `undefined`**。修法：头是「一串连续标签 + 被它们标的那一格」
   （语句级单元，或者裸块 `lbl: { … }`），尾巴另收一条壳。
2. **多标签的循环**（`first: second: for (…)` + `break first`）：`PendingLabel` 只存
   **一个**名字，内层标签写的时候把外层**顶掉** ⇒ 那个名字谁也没吃、
   `break first` 报 `unknown label`（**整份脚本进不来**）。改成一摞
   （`PendingLabels` / `LoopContext.Labels`），`break` / `continue` 两个判据一起认。
3. **`(0.1).toPrecision()` 抛 `RangeError`**：规范对 `toFixed` / `toPrecision` /
   `toExponential` **各有一套缺省口径**，而且「不给实参」与「显式 `undefined`」是
   **同一档**（先问是不是 `undefined`，再做 `ToIntegerOrInfinity`）。原来把
   「不给实参」与「给 `NaN`」混成一档 ⇒ `toPrecision()` 抛、`(5).toString(undefined)`
   也抛。现在三格各写各的缺省（那一张实测表就在 `globals.xl.md` 里）。
4. **`Object.getOwnPropertyDescriptor(对象, 数字键)` 响亮地抛**：
   `Object.getOwnPropertyDescriptor([1], 0)` 与 `(…, "0")` 在 JS 里问的是**同一格**，
   而那一支只收字符串 / 符号键（`Object.hasOwn([1], 0)` 第 691 轮就收数字了）。
   现在键先过一趟 `ToPropertyKey`。
5. **`Array.prototype.map.call(null, f)` 给的是普通 `Error`**（JS 给 `TypeError`）：
   `catch (e) { if (e instanceof TypeError) … }` 那种写法在这里分不出来。
   `null` / `undefined` 与 JS 对齐；**其余非数组仍然响亮地抛**——
   「`Array.prototype.*.call(类数组)` 该照类数组跑」是**待做项**（下面那 10 条缺口）。

另登记 10 条新缺口（`differ` +10）：**类数组接收者**那一族（`map` / `indexOf` /
`filter` / `push` / `reverse` / `sort` / `every` / `slice(字符串)` 共 8 条，
其中 `slice.call("abc")` 是**不抛、给错值**）、函数自己的 `arguments` / `caller` 两格、
**计算键成员**（`class A { [1 + 1]() { … } }`，降级层明写不做）。

**第 692 轮（其一）再加 385 条**（分母 3992 → **4377**）：两批一次性的**角落普查**——
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
