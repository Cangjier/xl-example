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

## 用例的规范（**一条用例 = 一个判定点**）

这一节是**判据**，不是建议。`cases:check` 能机器拦的写在前面，机器拦不住的写在后面
（后者靠人，也靠 review）。

### 1. 命名

```
<三位序号>-<kebab-描述>.ts        stdlib/object/078-object-defineproperty-accessor.ts
```

- **序号**：同一功能域内三位、递增。它只保证**目录内稳定**，不保证全局唯一。
- **描述**：kebab-case，**说清"测什么"**，不是"用了什么语法"。
  `078-object-defineproperty-accessor` ✅ ／ `probe693-o41` ❌。
- **token 语料另有前缀词表**（前缀即类别，见下表），因为它们按**语法形状**分域而不是按 API。
- 名字里**不许出现轮次号**。轮次写在 `xl:round` 那一格（它本来就是为这个而存在的）。
  历史遗留的 `p<轮次>-<字母><序号>` 命名**不再新增**。

| 前缀 | 属于 | 例子 |
| --- | --- | --- |
| `lex-` / `lx-` | 词法 | `lex-regex-escaped-slash` |
| `stmt-` / `st-` | 语句 | `stmt-try-catch-finally` |
| `expr-` / `ex-` | 表达式 | `expr-optional-chain` |
| `ty-` / `type-` | 类型 | `type-cond-infer-constraint` |
| `decl-` | 声明 | `decl-class-computed-field` |
| `mod-` / `im-` | 模块 | `mod-export-assignment` |
| `gap-` | **已知缺口**（`xl:known-gap`）——**只在 `token/` 里当前缀**（AST 尺子的逐落点账，见下） | `gap-r676-unique-comment-operand` |
| `mut-` | 变异体（同一形状换一处） | `mut-type-union-after-readonly-93` |

**`gap-` 前缀的边界（第 790 轮（二）定）**：这一族在 `token/` 里是**前缀**，那是因为
token 的 186 条 `gap-sweep-*` / `gap-r676-*` 是 **AST 尺子的逐落点账**——一文件一次对拍，
落点序号（`-01` / `-02`…）本身就是名字要表达的东西。
**其余四类里 `gap` 不进文件名**：账的性质由 `xl:want`（`blocked` / `differ`）+ `xl:why` 表达、
轮次由 `xl:round` 表达，名字只写**描述 + 账的尾巴**——
`stdlib/round746/001-array-accessor-out-of-range-enumerable-differ` ✅ ／
`gap746-array-accessor-out-of-range-enumerable` ❌。

### 2. 一条用例只问**一个判定点**

**判定点** = 一次「实现改坏了，这条会红；实现改对了，这条会绿」的最小赌注。

- ✅ `Object.prototype.toString.call(null)` 该抛 `TypeError` —— 一个判定点。
- ✅ `Object.prototype.toString.call([])` 该给 `"[object Array]"` —— **另一个**判定点。
- ❌ 同一个判定点写成三条（只换数组内容 / 只换分隔符 / 只换打印壳）——**那是同一条**。

**同一判定点只许有一条用例。** 这条规矩是**新加的**（在此之前没有），
它存在的理由是一段实测：`Object.prototype.toString.call(null)` 在语料里被写了 **4 遍**
（`probe693-o41` / `probe704-o-d20` / `probe-j03` 与 `024`），
`Object.getOwnPropertyNames([1,2])` 被写了 **6 遍**——任何一处实现改动让 4~6 条一起红，
**判定力与一条完全相同，而分母被灌水了 4~6 倍**。

**怎么自查**：写新用例之前，先在同类目录里搜你要问的那个表达式 / 那个 API 名。
找得到同判定点的，**把新断言并进那一条**，不要新开文件。

### 3. 一条用例**不许越过自己的边界**

这是 `judgeGroup()`（`tests/coverage/run.mjs`）那条名单的**精神**，现在写成明规矩：

- **不许改共享的全局状态**，除非**当场改回去**。典型是 `Object.prototype` / `Array.prototype` /
  `Function.prototype` / 内建构造对象自己那几格。
  要测「不可配置属性」这类规则时，**自己造一个 disposable 的对象当靶子**
  （`Object.create` + `Object.freeze`），不要借 `Object.prototype`——本仓的 `delete`
  **真的会把它删掉**，同一批里后面每一条用例都跟着坏。
- **不许排宏任务**（`setTimeout` / `setInterval` / `setImmediate`）。批进程里定时器到点之前
  下一条已经装好了自己的缓冲，迟到的输出会落进**别人**的缓冲。
  这类用例进不了批，只能一条一进程跑（慢，且不给基准）。
- **不许 `process.exit`**，不许 `require(`（换掉模块语义）。

**这三档是实测撞出来的，不是洁癖**：第 783 轮有一条用例写了
`delete (Object.prototype as any).toString`，本仓的 `delete` 不抛 ⇒
**那一格被真删掉**，同一批里后续用例报出 3 条
`Cannot read properties of undefined (reading 'call')` 与 2 条
`Cannot convert object to primitive value`——**5 条 `bad` 全记在受害者头上，
投毒者自己报的是 `pass`**。也就是说这类越界**不会指向自己**，只会让别人的读数变脏。

### 4. 台账（`xl:want` / `xl:why`）必须诚实

- `xl:want` 只能写**实测**出来的判定（`pass` / `blocked` / `differ`），不许写"大概"。
- `xl:want` 不是 `pass` 就**必须**有 `xl:why`，写**根因**（哪一层、哪一处、为什么难收），
  不是写症状。这一格是给下一个人的全部线索。
- **收掉一条缺口之后要删掉那一行**（改回 `pass` 并去掉 `xl:why`）——
  `MOVED` / `NEWLY-PASSING` 那两档判决就是为"台账过期"而设的。

## 原子探针（`probe*` / `p<轮次>*`）——来历与取舍

**这一族不是遗产，是一次有意的加宽，也是一次有代价的加宽。** 名字与来历：

| | |
| --- | --- |
| 出处 | `tests/cases/README.md`「分母里有什么」一节的**第 692–711 轮**各段 |
| 定义（原文） | 「**原子探针**：一条只问一个表达式，期望值由**真 `node` 现给**，打印口径钉成 `typeof:值`」 |
| 动机 | 「免得把控制台渲染那一族的已知缺口混进来」——即**隔离打印层**，让每条只暴露一个语义差额 |
| 首现 | 第 692 轮（其一）：**385 条**（其中原子探针 299 条），分母 3992 → 4377 |
| 之后逐批 | 692（其二）150 · 692（其三）103 · 693 **555** · 694 **242** · 695 150 · 696 152 · 697 159 · 698 85 · 699 202 · 700 158 · 701 100 · 706 133 · 707 117 · 708 81 · 709 56 · 710 49 · 711 26 |
| 现状（第 808 轮之后） | git 跟踪 **0 条**——`probe*` / `p<轮次>*` / `p-*` 三种命名**全仓清零**（第 807 轮之后是 31、第 806 轮之后是 78、第 805 轮之后是 110、第 804 轮之后是 144、第 803 轮之后是 170、第 802 轮之后是 218、第 801 轮之后是 289、第 800 轮之后是 522、第 799 轮之后是 546、第 798 轮之后是 584、第 797 轮之后是 624、第 796 轮之后是 648、第 795 轮之后是 674、第 794 轮（三）之后是 734、第 794 轮（二）之后是 759、第 794 轮之后是 793、第 793 轮之后是 827、第 792 轮之后是 871、第 791 轮之后是 920、第 790 轮（三）之后是 973、第 790 轮（二）之后是 1025、第 790 轮之后是 1029、第 789 轮（三）之后是 1183、第 789 轮（二）之后是 1278、第 789 轮之后是 1503、第 788 轮（三）之后是 1759、第 788 轮（二）之后是 1793、第 788 轮之后是 1909、第 787 轮（三）之后是 2127、第 783 轮那一次是 3039）——逐轮按判定点收敛中；第 789 轮走完 `exec/functions`（165）与 `exec/round706`（125），第 789 轮（二）走完 `stdlib/map-set`（113）与 `stdlib/string`（111），第 789 轮（三）走完 `exec/statements`（96），第 790 轮走完 `exec/round708`（81）与 `runtime/iterators`（118），第 790 轮（三）走完 `exec/iterators`（52），第 791 轮走完 `stdlib/error`（53），第 792 轮走完 `exec/destructuring-spread`（48），第 793 轮走完 `stdlib/math`（44），第 794 轮走完 `runtime/exceptions`（34），第 794 轮（二）走完 `runtime/round742`（34），第 794 轮（三）走完 `stdlib/round718`（25），第 795 轮走完 `exec/round709`（35）与 `exec/round711`（25），第 796 轮走完 `stdlib/round719`（26，整域并进 `stdlib/math` 与 `stdlib/number`），第 797 轮走完 `stdlib/round721`（24），第 798 轮走完 `runtime/async`（91 → 22），第 799 轮走完 `stdlib/console`（71 → 11），第 800 轮走完 `stdlib/symbol`（67 → 10），第 801 轮走完 **整个 `stdlib` 的原子探针域**（32 个域 · 233 条探针 → 154 条规则用例，`stdlib` 探针命名清零），第 802 轮走完 **整个 `exec` 的遗留探针命名**（12 个纯探针域 + `expressions` / `statements` / `round778` 三处散条，76 条 → 31 条规则用例，`probe*` / `p<轮次>*` / `p-*` / `r<轮次>*` 四种命名全清零），第 803 轮走完 `runtime/round726`–`round734`（48 条探针 → 12 条规则用例），第 804 轮走完 `runtime/round736` 与 `round738`（26 条探针 → 6 条规则用例） |
| 现状（`gap-*` 一族） | git 跟踪 **186 条**，其中 token 180（`gap-sweep-*` 175 + `gap-r676-*` 11 之类）、runtime / stdlib 6 —— **第 790 轮（二）起这一族也在整理范围内**：同一条根的账并成一条、名字按规范给（`gap746-…` → `002-…-differ` 这种）；token 那 186 条**逐条量的是不同落点**（`xl:known-gap` 一行的差额各不相同），所以**没有重复可去**，仍按 `gap-` 前缀留在 `token/` 里（见下面第 790 轮（二）那一节） |

**它当时的收益是真的**：每一批都当场收掉几处根因，覆盖度从 3697/3992 一路推到目前的 4886/5284。
**它的代价是现在才显出来的**：同一判定点被**逐批重抄**——第 692 轮抄一遍、693 再抄一遍、
697 又抄一遍（`probe2` / `probe693` / `probe694` / `probe695` / `probe697` / `probe700` /
`probe703` / `probe704` / `probe705` / `probe-j`），于是：

- `Object.prototype.toString.call(null)` **4 遍**；
- `Object.getOwnPropertyNames([1,2])` **6 遍**；
- `Object.getOwnPropertyDescriptor({a:1},"a").writable` **5 遍**。

**取舍（本轮的判定）**：

1. **保留判定力，去掉重复**。同一个判定点留一条，把唯一的那条**改名成描述性命名**；
   其余条里**独有的断言并进保留的那条**（不是简单删掉）。
2. **`gap-*`（token 已知缺口）不动**——那是"还没实现"的账，删掉等于把缺口藏起来。
3. **`xl:want differ` / `blocked` 与 `xl:why` 原样保留**：它们是账，不是冗余。
4. **`xl:round` 保留**：轮次信息本来就该待在那格，而不是待在文件名里。

也就是说：**探针这个方法要留，探针的重复不要留。**

## 分母里有什么（数字是最近一次全量实测）

**第 804 轮的合并**（**`runtime/round736` 与 `round738` 两个探针域按判定点重排：26 → 6**）：

| 域 | 新条 | 判定点 | 吸收 |
| --- | --- | --- | --- |
| `round736` | `001-json-stringify-and-parse-hooks` | `stringify` 的钩子与值过滤（replacer 数组 / 函数、`space`、`toJSON`、`undefined` 与 getter）+ `parse` 的 reviver | `p736b-b01` · `b02` · `b03` · `b04` · `b06` · `b08`（6 条） |
| `round736` | `002-object-descriptors-and-frozen` | 访问器描述符 / `Object.create` 的原型链 / `hasOwn`·`is`·`getPrototypeOf` / 冻结之后 | `p736b-b09` · `b10` · `b13` · `b14`（4 条） |
| `round738` | `001-logical-chain-positions-and-shortcircuit` | 逻辑链作为语法单元的边界与短路（前后缀词、实参 / 下标 / 模板、`yield`） | `p738a-a01` · `a03` · `a04` · `a05` · `a08` · `a09` · `a11` · `a12` · `a13` · `a15`（10 条） |
| `round738` | `002-logical-chain-with-await` | `await` 只吃紧随其后的那一格（条件位与 `for await`） | `p738a-a02` · `a10` · `a14` · `a16`（4 条） |
| `round738` | `003-yield-logical-chain-evaluation-order` | `yield` 与逻辑链的短路次序（**只改名**） | `p738a-a06` |
| `round738` | `004-yield-logical-chain-tail` | `yield` 一条逻辑链之后再 `yield`（**只改名**） | `p738a-a07` |

几处判据上的取舍**写在这里**：

1. **`round738` 拆成四条不是拆判定点，是拆「能不能进同一个壳」**：`003` / `004` 是
   「生成器 + 手动 `next()`」，第 798 轮起就实测过**生成器那一族进不了合并壳**——
   实测症状是**静默丢输出**（放进块里只打出第一行、退出码还是 0），所以这两条一条都不并，
   只改名；`001` 里的生成器块只用 `[...g()]` 与 `yield*`，实测可以进壳（尺子逐字节核过）。
2. **异步块与同步块分开**：`await` 那四条要排空壳（`drain()`），同步那十条不需要——
   合在一条里会让「不排空」的那一半读数变成并发形状的读数。
3. **单来源的改名逐字节等于原探针**（2 条只换文件名与标题）；多来源的四条套「每条一个块」的壳。

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4460 → 4440**（净少 **20**：
删 26、添 6）、过 **4064 → 4044**；**blocked 258 / differ 138 / bad 0 一处没动**，
`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**，加权 93.22% → **93.18%**。

**验证一次**：`--category runtime --no-batch --jobs 8`（一条一个进程的权威口径）与批量**逐项相同**：
runtime **756 / 807 · blocked 6 · differ 45 · bad 0**（两边退出码 0）。

**收网扫描（亲手再列一遍）**：`round736` 现存 2 条、`round738` 现存 4 条，序号从 001 起连续、
全是 `<三位序号>-<kebab 描述>`；全仓 `probe*` / `p<轮次>*` / `p-*` 命名 **144 条且全在 `runtime`**
（第 803 轮之后是 170）。
**这一轮顺手量清的另一件事**：全仓还有 **171 条 `r<轮次>*` 命名的用例**（`runtime/round755` ·
`round756` · `round760`–`round772` 与 `stdlib/round760`–`round773` 一带）——它与第 802 轮在
`exec` 里清掉的那 5 条（`r692-*` · `r778g-01`）是**同一套旧约定**，只是当时那一把尺子
（`^(probe|p\d|p-)`）量不到它，所以**「`stdlib` / `exec` 探针命名清零」这句话的边界是那把尺子**：
`r<轮次>*` 一族仍然在，留给后续轮次按同一个手法处理。
并组完整性由同一把一次性尺子（`tmp-probe-ruler.mjs` + `tmp-probe-groups-804.json`，未进仓）核对：
6 组保留条（其中 2 组是单来源改名）的 `tsrun` stdout 与「各被吸收条 stdout 的顺次相接」
**逐字节相同**（26 条来源）。

**第 805 轮的合并**（**`runtime/round737` 与 `round739` 两个探针域按判定点重排：34 → 19**）：

| 域 | 新条 | 判定点 | 吸收 |
| --- | --- | --- | --- |
| `round737` | `001-array-string-map-iteration-values` | 三族迭代器的产物：`next()` 走到底之后的形状 / 码点迭代（代理对算一格）/ `for..of` 一个 `Map` | `p737a-a01` · `a02` · `a03`（3 条） |
| `round737` | `002-generator-protocol-step-and-return` | 生成器四档：`yield` 返回值与 `next(实参)` / `yield*` 委托 / 生成器自己可迭代 / `return` 与 `finally` 的次序 | `p737a-a07` · `a08` · `a09` · `a10`（4 条） |
| `round737` | `003-for-await-over-sync-iterable` | `for await` 一个同步可迭代物（**只改名**） | `p737a-a13` |
| `round737` | `004-async-function-return-and-await-timing` | `async` 返回值与 `await` 时序（**只改名**） | `p737a-a11` |
| `round737` | `005-promise-statics-settled-and-any` | `Promise` 静态形状与两条聚合路 | `p737a-a15` |
| `round737` | `006-await-thenable-adoption-differ` | `await` 一个 thenable 要调 `then`（**只改名**） | `p737a-a16` |
| `round737` | `007-microtask-relative-order` | 微任务相对次序（**只改名**） | `p737a-a19` |
| `round737` | `008-promise-chain-then-catch-finally-differ` | 承诺续链的 `then` / `catch` / `finally`（**只改名**） | `p737a-a17` |
| `round737` | `009-iterator-next-taken-off-and-cursor-state-differ` | `next` 取出来再 `call` 的游标状态（**只改名**） | `p737a-a05` |
| `round737` | `010-iteration-protocol-early-exit-and-build` | `for..of` 提前离开调 `return()` / 数组解构走迭代协议 / 不可迭代物抛 `TypeError` | `p737a-a04` · `a06` · `a14`（3 条） |
| `round737` | `011-weakmap-weakset-keys-and-shape` | `WeakMap` / `WeakSet` 的键与形状 | `p737a-a20` |
| `round739` | `001-await-precedence-class-and-relational` | `await` 与算术 / 相等 / 关系运算符（含条件位与三元） | `p739a-a01` · `a03` · `a04`（3 条） |
| `round739` | `002-await-precedence-logical-and-short-circuit` | `await` 与逻辑 / 空值合并，以及短路下的副作用次序 | `p739a-a02` · `a16`（2 条） |
| `round739` | `003-await-parenthesized-operand` | 括号化之后 `await` 吃整段 | `p739a-a06` |
| `round739` | `004-await-under-unary-prefix` | 一元前缀套在 `await` 外面 | `p739a-a09` |
| `round739` | `005-await-operand-is-literal-index-or-argument` | 操作数形状：字面量 / 下标 / 实参与返回值 / 承诺套承诺 / 两段以上复合 | `p739a-a12` · `a07` · `a15` · `a08`（4 条） |
| `round739` | `006-await-in-call-chain-template-and-comma` | 调用 · 成员链 / 模板串 / 数组字面量 / 逗号运算符里的 `await` | `p739a-a05` · `a10` · `a11`（3 条） |
| `round739` | `007-await-in-loop-conditions` | 循环条件里的 `await` | `p739a-a13` |
| `round739` | `008-await-with-as-notnull-and-optional-chain` | `await` 与 `as` / 非空断言 / 可选链 | `p739a-a14` |

这一轮量出两处**手法边界**，都写在这里给后来的人：

1. **单来源的异步探针不许套壳**。合并条的外壳是「一个 `async function main()`，每块一个被
   `await` 的 async IIFE」；实测 `p737a-a17`（承诺续链）套上壳之后**续链次序变了**
   （裸跑 `pass keep, rej r, fin, end c:e2` → 套壳 `pass keep, fin, end c:e2, rej r`）——
   因为它排下的微任务与外壳自己那一次 `await` 抢同一个挂点。所以凡是**单来源**、
   量的是异步调度那一层的，一律**只改名、正文一字不动**（第 805 轮这样处理了 7 条）。
2. **多来源里那些「排了就不管」的顶层调用要当场收住**。来源是「一条一进程、进程退出前把
   微任务跑干净」，并进一个文件之后只有把块里独占一行的效果调用（`main();` / `report();`）
   写成 `await …`，才还是原来那条的输出；不收的话实测 `round739/001` 的三块整体错位
   （`pos` 跑到 `pos neg` 前面）。块里其余每一个字节与来源一字不差。

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4440 → 4425**（净少 **15**：
删 34、添 19）、过 **4044 → 4029**；**blocked 258 / differ 138 / bad 0 一处没动**，
`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**，加权 93.18% → **93.15%**。

**验证一次**：`--no-batch`（一条一个进程的权威口径）与批量那一轮逐项相同。

**收网扫描（亲手再列一遍）**：`round737` 现存 11 条、`round739` 现存 8 条，序号都从 001 起
连续、全是 `<三位序号>-<kebab 描述>`；全仓 `probe*` / `p<轮次>*` / `p-*` 命名 **110 条且全在
`runtime`**（第 804 轮之后是 144），`r<轮次>*` 一族 **171 条**（`runtime` 与 `stdlib` 各半）。
并组完整性由 `tmp-r805-apply.mjs` + `tmp-r805-ruler.mjs` + `tmp-r805-groups.json`（未进仓）核对：
19 组保留条的 `tsrun` stdout 与「各被吸收条 stdout 的顺次相接」**逐字节相同**（34 条来源）。

**第 806 轮的合并**（**`runtime/round740` 与 `round741` 两个探针域按判定点重排：32 → 24**）：
`round740` 的 18 条一元前缀并成 11 条（操作数形状 / `delete` 的目标形状 / `++`·`--` 的成员与下标
四档 / 前缀套前缀与 `**` / 可选链 / 结果再取成员与函数·类表达式 / 与二元混排 / `void`·`delete`
打在字面量 / 实参·数组·对象·模板 / 与 `await` 同格（**只改名**）/ 非空断言与 `as`）；
`round741` 的 14 条可选调用并成 13 条（打在函数值上那条与短路不越过链节合成一条，
其余单来源只改名或换壳）。

**第 807 轮的合并**（**`runtime/round748` · `round749` · `round750` 三个探针域按判定点
重排：47 → 39**）：`round748` 的 16 条并成 15 条（生成器那一族之外的相邻判定点各留一条）；
`round749` 的 16 条并成 11 条（`yield*` 与 `return`/`throw` 的清扫合成一条、自定义迭代器与
`for…of` 解构合成一条、模板与标签模板合成一条、键的次序与描述符合成一条、嵌套异常与
`finally` 合成一条）；`round750` 的 16 条并成 13 条（原始值接收者的两半合成一条、
装箱与原始值属性读合成一条、字符串越界与大小写正规化合成一条）。

这两轮都把**手法边界**沿用下来：异步 / 承诺 / 生成器那几族，凡是**单来源**的
（`round740/010` · `round748/014` · `round748/015` · `round749/003` · `round750/004`）
一律**只改名、正文一字不动**，`want blocked` / `want differ` 的账原样跟着走。

**第 808 轮的合并**（**最后六个纯探针域按判定点重排：31 → 30，`probe*` 命名全仓清零**）：
`round747`（类 / `super` / `this` / 异步 / `try` / `switch` / 标签 / 短路 / 解构 / 渲染 /
闭包），`round751`（`at` 的形参个数 / 迭代器标签 / `new Array` 上界 / 宿主名字），
`round752`（字符串与数组的实参强制 / 描述符合法性 / `Map`·`Set` 相等 / 活视图 / `Array.from`），
`round753`（对象字面量 / 类的成员与初始化 / 继承与 `super`），
`round754`（标签模板对象 / 三个内建对象的标签 / 内建原型的标签 / 异步生成器 / `unscopables` /
`BigInt`），`round758`（`return` 后面的函数表达式）——六域各留一条到三条，全部改名成
`<三位序号>-<kebab 描述>`。

这一轮撞到**两处必须写下来的坑**（都是「改名的机械动作」踩出来的）：

1. **新序号会与域里已有的 `<三位序号>-…` 撞名**：`round747` 里已经有一条
   `002-promise-chain-microtask-order-differ`，而这一轮给 `super` 那一族也起了 `002-…`——
   撞名的后果不是报错，是**先把旧的那条删掉、再写新的那条**（脚本的「目标已存在」检查只看得见
   自己那一批），那条 `want differ` 的账当场从盘上消失（判据从 138 掉到 137）。
   **收网那一遍把它逮住了**：台账逐条对拍发现少了一条。
   规矩：**进一个域之前先列一遍域里已有的序号**，新名字要避开它们（这一轮把 `super` 那条改成
   `003-…`，其余顺次后移，域里 12 条序号连续且不重）。
2. **`git show HEAD:<path> | Set-Content -Raw` 会把整份文件折成一行**（PowerShell 管道的
   行尾被吃掉），而折成一行的用例**照过**——它只是「node 一行都没打印」⇒ 判据记 `bad`
   （`不打印的通过等于没验`）。恢复被误删的来源要用 `git checkout HEAD -- <path>`，
   恢复之后**先跑一遍 node 看它出不出话**，再拿去并组。

**第 809 轮的合并**（**跨域重复的同一个判定点并组：四条源文件下盘；第 760–762 轮的
`r<轮次>*` 名按规范收编：17 条**）：

这一轮**不按域走，按「同一个判定点在另一个类别 / 另一个域里又写了一遍」走**——
第 802 轮收尾时**如实留在明处**的那批跨域重复（见下面「跨域 / 跨类别的重复如实留在这里」
那一节），这一轮把其中**同类别**的四对并掉：

| 保留条 | 并掉的源文件 | 为什么是同一条 |
| --- | --- | --- |
| `runtime/round742/001-switch-match-semantics` | `exec/round742/001-switch-match-evaluation` | 判别式与 `case` 怎么比、各求值几次——同一句话在两处各写了一遍 |
| `exec/expressions/248-class-expressions-and-new` | `exec/round736/003-class-expression-name-and-tostring` | 类表达式当值时自己那一格（`name` 与 `toString` 的开头） |
| `exec/round737/002-array-from-iterables-and-array-likes` | `exec/round709/005-array-from-array-likes` | `Array.from` 认哪一支（迭代协议 / 类数组） |
| `runtime/exceptions/003-exc-finally-return` | `exec/round736/004-finally-abrupt-completion` | `finally` 对突然收场的接管（谁的话算数） |

四条被并掉的源文件里**独有的断言逐句搬进保留条**（不是整条删掉）：
switch 那一条收进三段（判别式是自增表达式、判别式是 `typeof`、`NaN` / `"1"` 落空）、
类表达式收进三条（匿名类的 `name`、`toString` 的开头、`new` 的被调者）、
`Array.from` 收进两行（`{ length: 2 }` 与 `{}`）、`finally` 收进一档
（`switch` 里 `break` 也要先走 `finally`）；保留条里被搬进来的正文**一字未改**，
只在前面挂一句「809 · 原 …」的出处注释。

**这一轮量出的一处坑（并组时现形的）**：`switch` 的 `case` 后面**再出现第二个
`case` / `default` 标签**时，本仓降级期**整份文件进不来**（实测
`name is not a local or a capture: case`；`exec/statements/084-switch-case-block-blocked`
是同一处账）——第一版把原样三条断言搬进来时连这一格一起搬了，那条 `runtime` 用例
**当场从 pass 变 blocked**。所以**并进来的断言要先过一遍「它在不在别的账上」**：
这一轮把那一档只留 `case 1`（`f(1)` 走 `try` → `finally` → `break` → `end`，
`f(2)` 落空，两档都盖到），**不碰那处已知缺口**。

**改名**（第 760–762 轮的 17 条）：`r760a-01-…` / `r761f-01-…` / `r762d-01-…` 一律收成
`<三位序号>-<kebab 描述>`，序号**域内从 001 起连续**，账的尾巴进名字
（`-differ` / `-blocked`）；`xl:round` **不动**（轮次本来就该待在那两格里）。
改名逐字节等于原文件，逐条用 `node` 与 `tsrun` 各跑一遍核对过。

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4409 → 4405**（净少 **4**：
删 4、改名 17 条不计增减）、过 **4013 → 4009**；**blocked 258 / differ 138 / bad 0 一处没动**，
`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**，加权 93.11%。

**收网扫描（亲手再列一遍）**：全仓遗留 `r<轮次>*` / `probe*` / `p<轮次>*` 命名 **154 条**
（本轮之前 **171**：第 760–762 轮那 17 条收掉了），全在 `runtime`（76）与 `stdlib`（78）两侧的
第 763–783 轮域里；第 760–762 轮六个域**逐目录列一遍**，不以数字开头的 **0 条**。

**第 809 轮（二）：`stdlib` 第 763–773 轮的 `r<轮次>*` 收编（49 → 44 条，探针命名清零）**

这一轮走 `stdlib` 的第 763–773 轮十一个域，把 **49 条**遗留命名收成 **44 条**规则用例
（删 **10** 条来源、添 **5** 条并组、**39** 条只改名）。并组逐条都按「三条规则」量过
（`node` stdout 与「各来源 stdout 的顺次相接」逐字节相同）：

| 保留条 | 并掉的来源 | 为什么是同一条 |
| --- | --- | --- |
| `round763/001-console-group-state-machine` | `r763a-01` · `a-02` · `a-03` · `b-01` | `console.group` 的缩进状态机只有一处，四条各量它的一个面 |
| `round764/001-console-format-string` | `r764b-01` · `b-02` | `FormatConsoleLine` 同一趟：说明符表 + 「不在第一位就一个都不换」 |
| `round769/001-descriptors-and-accessor-helpers` | `r769b-01` · `b-02` | 描述符接口那一族：读回 / 继承 / `__define*__` / 冻结三档 |
| `round771/001-method-receivers-and-argument-validation` | `r771a-01` · `a-02` | 方法在原始值 / 空值接收者上的读数与实参校验，只是分成两族写 |
| `round773/001-json-entry-arguments-and-values` | `r773a-01` · `r771b-02` | `JSON` 两个入口：`parse` 的实参强制与 `stringify` 的可序列化面 |

**这一轮撞到的两处坑（都记在这里）**：

1. **异步 / 承诺那一族不许并**。第一版把 `round766` 的三条（组合子结果、`race` 的拒绝、
   `.finally` 回调的拒绝）并成一条，`node` 一跑次序就变了（`08 tick` / `03 fin` / `07 tick`
   整体错位）——**每个来源各自一条进程时的微任务次序，与并进一个文件之后不是一回事**
   （第 798 / 803 轮的「单来源异步只改名」是同一件事）。这一轮把三条退回**只改名**
   （`002` / `008` / `009`），一条都不并。
2. **`git show HEAD:<path> | ...` 取回来的来源是 UTF-16**：`node` 读它一行都不出（不是报错），
   把「来源 stdout」比成了空串。要用 `[System.IO.File]::WriteAllText(..., UTF8Encoding($false))`
   落成 UTF-8 再跑。

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4405 → 4399**（这一轮删 6 条
进分母的来源、其余 4 条被吸收的本来就在 `xl:skip` / 口径外，所以分母只掉 6）、过 **4009 → 4003**；
**blocked 258 / differ 138 / bad 0 一处没动**，`MOVED` / `NEWLY-PASSING` / `REGRESSION` 全 0，
加权 **93.10% → 93.10%**（同一趟的读数：4003 / 4399）。

**收网扫描（亲手再列一遍）**：`stdlib` 第 763–773 轮**逐目录列一遍**，不以数字开头的 **0 条**；
全仓遗留 `r<轮次>*` / `probe*` / `p<轮次>*` 命名 **115 条**，全在 `runtime` 第 755–783 轮域里
（留给第 809 轮（三））。

**第 809 轮（三）：`runtime` 第 755–783 轮与 `stdlib` 第 777–783 轮的 `r<轮次>*` 全部收编
（116 → 75 条，**全仓探针命名清零**）**

| 侧 | 域 | 条数 | 侧 | 域 | 条数 |
| --- | --- | --- | --- | --- | --- |
| `runtime` | `round755` · `round756` | 4 · 2 | `stdlib` | `round777` | 1 |
| `runtime` | `round766` · `round767` | 5 · 7 | `stdlib` | `round778` · `round778b` | 4 · 3 |
| `runtime` | `round769` | 9 | `stdlib` | `round779` | 17 |
| `runtime` | `round772` · `round774` | 2 · 1 | `stdlib` | `round780` | 5 |
| `runtime` | `round775`–`round778b` | 2 · 2 · 1 · 2 · 4 | `stdlib` | `round781` | 5 |
| `runtime` | `round779` · `round780` · `round783` | 4 · 7 · 4 | `stdlib` | `round782` · `round783` | 3 · 3 |

**并组一条**：`runtime/round772/001-nullish-receiver-member-call` ← `runtime/round771/r771c-01`
（同一个判定点在两个域里各写了一遍；它只有三行，其中两行是变量接收者的最小形态，接在保留条末尾）。
**其余 115 条只改名**：名字取该条 `xl:title` 的要点（不是原样搬标题），账的尾巴进文件名
（`-differ` / `-blocked`），`xl:round` 一格不动。

**这一轮撞到的两处坑**（都是「批量改名」的机械动作踩出来的）：

1. **两个阶段的改名脚本第二段丢了目录前缀**：第一段把 `round755/r755a-01.ts` 改成
   `round755/tmp-100.ts`（对），第二段却拿 `tmp-100.ts` 当路径 ⇒ 55 条留在 `tmp-*.ts` 上
   （**`cases:check` 会拦不住**：它按目录收 `*.ts`，`tmp-*` 照样收）。收网那一遍
   （`Get-ChildItem | Where-Object { $_.Name -match '^(r\d|tmp-)' }`）把它逮住了，
   第二段改成带目录名的全路径才收干净。
2. **`glob` 的 100 条截断会漏文件**：`runtime/round769` 的 `r769a-02` 没进那一次 `glob`
   的结果，于是它既不在我的改名清单里、也没被算进「76 条」——**收网那一遍**
   （`Get-ChildItem` 逐目录列）才发现，补进来之后 `round769` 的序号整体后移一位。

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4399 → 4398**（删 1 条被吸收的来源）、
过 **4003 → 4002**；**blocked 258 / differ 138 / bad 0 一处没动**，
`MOVED` / `NEWLY-PASSING` / `REGRESSION` 全 0，加权 93.10%。
**验证一次**：`--no-batch --jobs 8`（一条一个进程的权威口径）与批量那一轮**逐项相同**——
**4002 / 4398 · blocked 258 · differ 138 · bad 0**（两边退出码 0）。

**收网扫描（亲手再列一遍）**：`Get-ChildItem exec,runtime,stdlib,e2e -Recurse -Filter *.ts`
逐条过 `^(r\d|p\d|p-|probe)` —— **0 条**：`probe*` / `p<轮次>*` / `p-*` / `r<轮次>*` 四种
旧命名**全仓清零**；`round769` 等每个域**逐目录列一遍**，不以三位序号开头的 0 条。

**第 810 轮的合并**（**`stdlib/array` 四个判定点族的重复条下盘：168 → 111**）：

这一轮不去碰探针命名（那四种命名第 809 轮（三）已经清零），走的是**另一类重复**：
**同一条用例早就被「合并」过一次、而被并掉的那些文件一直没从盘上删掉**——
它们自称是账、`xl:want` 与 `xl:why` 都写好了，可那个判定点的断言在保留条里**逐字节都有**，
于是同一处实现改动会让 15~21 条一起红（判定力等于一条，分母却被灌了 15~21 倍）。

四个族（保留条 → 下盘的来源）：

| 保留条 | 下盘 | 判定点 |
| --- | --- | --- |
| `stdlib/array/158-array-sort-comparator-stability-and-holes` | 20 条（`006` · `020` · `026` · `037` · `053` · `064` · `066` · `071` · `091` · `094` · `096` · `100` · `105` · `110` · `119` · `128` · `138` · `139` · `146` · `152`） | `sort` 的比较口径与落位：默认码元序 / 比较器只看符号 / 稳定 / `undefined` 与洞排尾 / 返回原数组 |
| `stdlib/array/167-array-nonmutating-methods` | 14 条（`021` · `027` · `045` · `046` · `062` · `065` · `068` · `087` · `092` · `093` · `107` · `112` · `116` · `127`） | `toSorted` / `toReversed` / `toSpliced` / `with` 各自交新数组、`with` 越界抛 `RangeError` |
| `stdlib/array/161-array-fill-and-copywithin` | 9 条（`016` · `040` · `048` · `069` · `086` · `099` · `108` · `111` · `131`） | `fill` / `copyWithin` 的两个下标规范化（负下标、越界、重叠复制） |
| `stdlib/array/160-array-flat-and-flatmap` | 14 条（`010` · `019` · `030` · `034` · `038` · `052` · `059` · `075` · `102` · `104` · `106` · `123` · `124` · `153`） | `flat` / `flatMap` 摊几层、洞怎么算 |

**这一轮的手法（与第 796 / 809 轮一致，但更机械）**：

1. **被并条的正文逐字搬进保留条**（每块一个 IIFE、块首一行 `---- 并自 <原文件名> ----`），
   保留条自己的正文一个字节没动、放在最前；**来源文件整份 `Remove-Item` 下盘**。
2. **凡「并」必有据，而且这一轮量的是最强的那个口径**：一把一次性尺子
   （`tmp-r810-ruler.mjs`，在 `.gitignore` 的 `tmp-*` 里，未进仓）把
   「**保留条改前那一份（`git show HEAD:` 取回）＋ 各被并条**的 stdout 顺次相接」
   与**合并后保留条**的 stdout 对拍，`node`（真 Node）与 `tsrun`（本仓）**两侧都必须逐字节相同**：
   四族分别 **785 / 893 / 499 / 560 字节，8 项全中**。这个口径比「断言是并集」强：
   它要求**次序**也一样。
3. **改名**：只有保留条 `158-array-sort` 一个名字不合规范（描述太短、没说出量的是比较口径），
   收成 `158-array-sort-comparator-stability-and-holes`；其余三条原名本来就说清了判定点，不动。
4. **保留条头部那三行自我介绍要跟着改**：它们原来列着「＋ `006-…` / `020-…` …」这串被并文件名，
   而这一轮那些文件真的下盘了——把清单换成一句「（第 810 轮下盘的 N 条，正文见下面各块）」，
   免得下一个人拿它当「盘上还有」的依据。

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4398 → 4341**（删 57 条**都是已经被吸收过的来源**，
其中 0 条是 `blocked` / 0 条是 `differ`）、过 **4002 → 3945**；
**blocked 258 / differ 138 / bad 0 一处没动**（逐 id 对拍：`blocked` 与 `differ` 两张名单
**一条不增、一条不减**），`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**，加权 93.10% → **93.03%**
（分母变小、缺口条数一条不变，百分比按算术下降）。

**验证一次**：`--no-batch --jobs 8`（一条一个进程的权威口径）与批量那一轮**逐项相同**——
**3945 / 4341 · blocked 258 · differ 138 · bad 0**。

**收网扫描（DSH 自己逐目录读盘，不用脚本代替）**：`stdlib/array` 现存 **111 条**，
序号 001–169 里空缺的都是这一轮下盘的那 57 个；留下的 `-r<轮次>` 尾巴只剩 **3 条**
（`054-array-every-some-empty-r305` · `076-array-every-some-empty-r371` · `088-array-of-r623`，
留给下一轮）；**其它三个族的同判定点重复一处没留**。
`gap-*` 一族 186 条一条没动（token 的逐落点账）。

**下一轮的去向（如实留在这里）**：`stdlib/string`（195 条，`-r291`…`-r676` 的重复条一大片）、
`exec/round708`（46 条，与 `stdlib/*` 的域大面积同判定点）、`stdlib/array` 余下三个功能族
（谓词族 / `reduce` 族 / 迭代器族）。手法与这一轮相同：先量并组、再下盘、再保台账。

**第 813 轮的合并**（**`stdlib/array` 里「早就自称合并过、文件却还在盘上」的 89 条真的下盘：111 → 17**）：

这一轮走的是**第 810 轮留下的那一类**：保留条的文件头写着「合并了原先同一个判定点的
二十余条＋ `004-array-find-family` / `005-array-reduce` / …」，而那些**被点名的文件一条都没从盘上删掉**——
于是同一个判定点仍然有十几条在量，任何一处实现改动会让十几条一起红（判定力等于一条、分母被灌了十几倍）。
**先把「自称合并过」与「真的合并过」量开**：一次性尺子（`tmp-r813-claimed.mjs`）按
「保留条头里的合并清单」列盘，量出 **75 条被点名却还在盘上**；再用另一把尺子
（`tmp-r813-verify-array.mjs`，逐条对保留条的 `tsrun` / `node` 产出做**按行子序列包含**）
量的结果是 **`ok=0 lost=75`**——也就是说这些来源的读数**一条都不在保留条里**：
它们不是「已并入的残留」，是**从没并过的重复条**。

**12 个保留条吸收 89 条来源**（75 条被点名的 ＋ 14 条**连点名都没有**的遗留条）：

| 保留条 | 吸收 | 判定点 |
| --- | --- | --- |
| `155-array-search-and-at` | 4 条（`114-arg-array-fromindex` · `133-includes-nan-negzero` · `137-indexof-fromindex` · `125-at-negative`） | `indexOf` / `lastIndexOf` / `includes` / `at` 的比较与起点 |
| `156-array-structure-and-mutation` | 8 条（`028` · `044` · `070` · `083` · `132` · `001-array-push-pop` · `002-array-shift-unshift` · `135-slice-negative`） | `slice` / `splice` / `concat` / `reverse` / 栈队列那一族的返回值与实参个数 |
| `157-array-join-and-tostring` | 8 条（`003` · `018` · `031` · `074` · `136` · `140` · `145` · `118-arg-array-join-holes`） | 元素 → 文本那一趟：洞与空值、`toString` 走 `join` |
| `159-array-construction` | 19 条（`007` · `009` · `024` · `036` · `049` · `055` · `072` · `080` · `081` · `088` · `095` · `098` · `103` · `121` · `122` · `129` · `008-array-from-arraylike` · `011-array-spread-conditional` · `063-array-fromasync`） | `Array` 构造 / `of` / `from` / `isArray` |
| `160-array-flat-and-flatmap` | 1 条（`117-arg-array-flat-reduce`） | `flat` / `flatMap` 的深度实参 |
| `161-array-fill-and-copywithin` | 1 条（`115-arg-array-range`） | `fill` / `copyWithin` / `slice` 的两个下标 |
| `162-array-length-writes` | 8 条（`012` · `042` · `060` · `078` · `084` · `130` · `141` · `079-array-index-and-length-key`） | `length` 那一格与下标格的联动 |
| `163-array-holes-per-method` | 5 条（`013` · `082` · `090` · `120` · `148`） | 洞在回调族与取值族里是两回事 |
| `164-array-predicates` | 10 条（`004` · `014` · `017` · `041` · `047` · `054` · `061` · `076` · `109` · `126`） | 谓词族的答案与短路 |
| `165-array-reduce` | 11 条（`005` · `015` · `029` · `033` · `039` · `050` · `073` · `097` · `101` · `134` · `147`） | 初值那一位决定一切 |
| `166-array-iterators` | 6 条（`022` · `035` · `051` · `067` · `077` · `089`） | 三个迭代器的步进值与 `next()` 的三段形状 |
| `168-array-generic-methods` | 2 条（`085-function-apply-array-like` · `151-array-from-arguments`） | `Array.prototype.*.call` 对类数组 / 字符串 / 原始值 |
| `169-array-index-accessors-and-proto` | 6 条（`142` · `143` · `144` · `149` · `150` · `154`） | 数组上挂访问器 / 往 `Array.prototype` 加格 |
| `exec/functions/088-fn-length-name` | 5 条（`023` · `032` · `043` · `056` · `057`） | **放错域**：函数自己那两格（`length` 数到第一个默认值 / 剩余参数为止、`name` 从推断来） |

**凡「并」必有据，而且这一轮量的是最强的那条口径**：三把一次性并组器
（`tmp-r813-merge.mjs` · `tmp-r813-merge2.mjs` · `tmp-r813-merge3.mjs`，都在 `.gitignore` 的
`tmp-*` 里、未进仓）把「**保留条改前那一份 ＋ 各来源**的 `node` / `tsrun` 产出**顺次相接**」
与**合并后保留条**的产出对拍，**两侧都必须逐字节相同才写盘**（19 组，两侧全中）；
核验不过就**一条都不写**（并组器是事务性的，不留半成品）。

**这一轮撞到的三处坑（都记在这里）**：

1. **两块 `const a` 会撞名**：并进来的块原来都是「一条一进程」，并进一个文件之后
   `const a` 在顶层重复声明 ⇒ **`node` 当场 `SyntaxError`**（而本仓的 `tsrun` 那一趟照样绿——
   它的作用域处理比 node 松）。改法是**每块套一个 `(function () { … })();`**（块里的正文一字未改），
   套壳之后两侧才都逐字节相同。
2. **异步条不许并**：`stdlib/array/058-promise-all-with-rejection` 与
   `stdlib/promise/029-promise-all-mixed` 同判定点，直接并进去实测**微任务次序就变了**
   （`sync` 跑到 `empty 0` 前面）——与第 805 / 809 / 812 轮那几处同一条手法边界，**这一条不并**。
3. **并进来的一档把一条 `pass` 变成 `differ`**：`150-array-species-subclass` 那一档
   （`class MyArr extends Array {}` 上 `a.map(…)`）并进 `169` 之后，`node` 给
   `b instanceof MyArr === true`、`tsrun` 给 `false`——**这是真差异，不是并组弄坏的**
   （单独跑那一条本来就差）。按规矩**如实登账**：`169` 的头部加 `xl:want differ` 与
   `xl:why`（写清只差第一个字段、其余各块两侧相同），这样 `differ` 撤掉一条、登记一条，
   仍是 **138**、`REGRESSION` 0。

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4269 → 4175**（净少 **94**：
`stdlib/array` 89 条下盘、5 条并进 `exec/functions/088`，其中 0 条 `blocked` / 0 条 `differ`）、
过 **3873 → 3779**；**blocked 258 / differ 138 / bad 0 一处没动**，
`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**，加权 92.93% → **92.78%**
（分母变小、缺口条数一条不变，百分比按算术下降）。

**验证一次**：`--no-batch --jobs 8`（一条一个进程的权威口径）与批量那一轮**逐项相同**——
**3779 / 4175 · blocked 258 · differ 138 · bad 0**。

**收网扫描（DSH 自己逐目录读盘，不用脚本代替）**：`stdlib/array` 现存 **17 条**
（`113-names-array` · `155`–`169` 十五条 · `058-promise-all-with-rejection`），
**每条都是 `<三位序号>-<kebab 描述>`**、序号不重；13 个保留条的头部都记着
「第 813 轮下盘了哪几条」与「正文在下面各块」；
`exec` / `runtime` / `stdlib` / `e2e` 四类里**不以三位序号开头的用例 0 条**，
`probe*` / `p<轮次>*` / `p-*` / `r<轮次>*` 四种旧命名仍是 **0 条**。
**这一轮量清的一处过期文档**：第 812 轮（三）写着「全仓 `-r<轮次>` 命名 0 条」——
**这句是错的**：逐目录读盘数出来的是 **135 条带 `-r<轮次>` 尾巴的用例**
（`e2e` 31 · `exec` 55 · `runtime` 18 · `stdlib` 31），留给第 814 轮按「轮次进 `xl:round` 那一格」的规矩处理。

**第 812 轮（三）：收网扫描（这一轮一条用例都没动，只把读数与一处过期的文档更正）**

前三轮（812 · 812（二））把 `stdlib/string` 的重复条收完之后，这一轮**只做第 7 / 9 步**：
**DSH 自己逐目录读盘列一遍**（不用脚本代替），并跑全量保台账与 `--no-batch` 对照。

- **四种旧命名**（`probe*` / `p<轮次>*` / `p-*` / `r<轮次>*`）：**0 条**（第 809 轮（三）清掉之后一条没回来）。
- **`-r<轮次>` 尾巴**：**0 条**（`stdlib/string` 的七条第 812 轮（二）收掉；`stdlib/array` 的三条第 810 轮就已下盘）。
- **不以三位序号开头的用例**：`exec` / `runtime` / `stdlib` / `e2e` 四类逐目录列过，**0 条**。
- **一处过期的文档**：第 810 / 811 轮 README 写着「`stdlib/array` 那三条 `-r<轮次>` 留给下一轮」，
  而它们在第 810 轮就已经下盘了（`054` / `076` / `088` 三条都不在盘上，那一轮 168 → 111）。
  这一轮把那段更正了——**收网扫描的价值就在这里：文档说的和盘上有的不一样时，以盘为准**。
- **保台账**：全量批量跑（`--jobs 8 --batch-workers 32`）与 `--no-batch --jobs 8` **逐项相同**——
  **3873 / 4269 · blocked 258 · differ 138 · bad 0**，`MOVED` / `NEWLY-PASSING` / `REGRESSION` 全 0。

**第 812 轮（二）的合并**（**`stdlib/string` 最后七条 `-r<轮次>` 尾巴 + `exec/round708` 六条跨类重复：4282 → 4269**）：

**这一轮把两处一直留在明处的重复收掉**：

1. **`stdlib/string` 剩下的七条 `-r<轮次>` 尾巴**（第 811 轮收尾时如实留在盘上的那一批）：

| 保留条 | 吸收 | 判定点 |
| --- | --- | --- |
| `192-string-char-code-and-codepoint` | `058-string-codepoint-iteration-r297` · `102-string-iterator-codepoints-r371` · `140-string-codepoint-iteration-r676` | 码元 / 码点两把尺子（代理对算一格） |
| `201-string-raw-forms` | `074-string-raw-r323` · `098-string-raw-r371` · `157-string-raw-r683` | `String.raw` 取 `raw` 那一栏、转义不生效 |
| `197-string-replace-string-mode` | `066-string-replace-forms-r304` | 字符串模式的替换次数与记号 |

2. **`exec/round708` 里与 `stdlib/string` 同判定点的六条**（第 810 轮写下的「下一轮去向」第二条）——
   跨类别、权重不同（`exec` 25% / `stdlib` 20%），但**判定点是同一个**，所以照并：

| 保留条（`stdlib/string`） | 下盘的（`exec/round708`） | 判定点 |
| --- | --- | --- |
| `190-string-pad-and-repeat` | `039-string-replace-and-repeat` | `repeat` / `padStart` 的目标长度与次数（那一条另有的 `replace` 半行归 `197`） |
| `194-string-tostring-of-values` | `042-string-to-number-coercion` · `044-template-literal-interpolation` | `String(…)` / `${…}` 那张表（数字格式化档、模板插值形状） |
| `192-string-char-code-and-codepoint` | `046-string-surrogate-pairs` | 代理对的 `length` / 迭代 / `codePointAt` |
| `208-string-at-negative-and-beyond` | `043-string-at-and-indexing` | `at` 与下标读 |
| `210-string-indexof-fromindex` | `045-string-includes-starts-with-ends-with` | 三个方法各自的位次实参 |

**凡「并」必有据**：一把一次性并组器（`tmp\x812b-merge.cjs`，在 `.gitignore` 的 `tmp-*` 里，未进仓）
把「**保留条改前那一份 ＋ 各来源**的 `node` / `tsrun` 产出**顺次相接**」与**合并后保留条**的产出
逐行对拍，**两侧都必须相同才落盘**（十三组，两侧全中）。块首 `---- 并自 … ----` 的条数
由收网那一遍逐文件数过（`190`=1 · `192`=4 · `194`=3 · `197`=6 · `198`=6 · `200`=9 · `201`=3 ·
`207`=2 · `208`=2 · `209`=1 · `210`=2 · `211`=1），**没有一条重复块**。

**这一轮顺手量清的一件事**：`stdlib/string` 的 `-r<轮次>` 尾巴**清零**；
**全仓 `-r<轮次>` 命名 0 条** —— `stdlib/array` 那三条（`054-array-every-some-empty-r305` ·
`076-array-every-some-empty-r371` · `088-array-of-r623`）**第 810 轮就已经不在盘上了**
（那一轮 168 → 111 时被一起下盘；第 810 / 811 轮 README 里那句「留给下一轮只改名」
**是过期的**——第 812 轮（三）收网逐目录列盘时逮住，特此更正）。
所以四类语料里**没有一条不以三位序号开头**的用例（`exec` / `runtime` / `stdlib` / `e2e`
逐目录列过，0 条）。

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4282 → 4269**（净少 **13**，
全部是被吸收过的来源，其中 0 条 `blocked` / 0 条 `differ`）、过 **3886 → 3873**；
**blocked 258 / differ 138 / bad 0 一处没动**，`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**，
加权 92.95% → **92.93%**。

**验证一次**：`--no-batch --jobs 8`（一条一个进程的权威口径）与批量那一轮**逐项相同**——
**3873 / 4269 · blocked 258 · differ 138 · bad 0**。

**收网扫描（DSH 自己逐目录读盘，不用脚本代替）**：`stdlib/string` 现存 **129 条**、
`exec/round708` 现存 **40 条**；`stdlib/string` 的 `-r<轮次>` 命名 **0 条**（全仓剩 `stdlib/array` 3 条）；
`probe*` / `p<轮次>*` / `p-*` / `r<轮次>*` 四种旧命名仍是 0 条（第 809 轮（三）清掉的那一批一个都没回来）；
保留条里 `---- 并自 … ----` 的条数与文件头点名的来源条数逐条对齐（见上），重复块 0 处。

**第 812 轮的合并**（**`stdlib/string` 的 `normalize` / `replace` / `toWellFormed` 三族与四条散条下盘：159 → 136**）：

同一类重复（保留条早就自称「合并过」、来源文件却一直留在盘上）在 `stdlib/string` 剩下的三族：

| 保留条 | 下盘 | 判定点 | 并组读数 |
| --- | --- | --- | --- |
| `200-string-normalize-forms` | 9 条（`039` · `053` · `065` · `072` · `085` · `097` · `110` · `120` · `132`） | `String.prototype.normalize` 那张表：四种形式恒等 / 组合字符合一 / 省略实参 / 非法形式抛 `RangeError` | 30 行，两侧逐行相同 |
| `197-string-replace-string-mode` | 5 条（`092` · `113` · `118` · `137` · `163`） | 字符串模式的替换次数：首处 vs 全部 / 空模式 / 模式里的 `$` 按字面 | 26 行，两侧逐行相同 |
| `198-string-replace-dollar-patterns` | 6 条（`041` · `124` · `150` · `156` · `159` · `185`） | 替换文本里 `$` 那一族的展开表与不合法的记号 | 41 行，两侧逐行相同 |
| `207-string-wellformed-predicate-and-fix`（原 `080`） | 2 条（`079` · `133`） | `isWellFormed` / `toWellFormed` 对落单代理的处理 | 7 行，两侧逐行相同 |
| `211-string-proto-member-table-regex-members-missing`（原 `136`） | 1 条（`147-names-string-proto`） | `String.prototype` 的成员表（正则那一族三格） | 22 行，两侧逐行相同 |

**四条散条并进各自的判定点族**（它们自第 783 轮改造完就一直是个「表达式当名字」的外形）：

| 下盘的 | 并进 | 判定点 |
| --- | --- | --- |
| `195-string-symbol-to-string-throws` | `194-string-tostring-of-values` | 符号的两档：`String(sym)` 给描述、`"" + sym` / `${sym}` 抛 `TypeError` |
| `204-a-localecompare-a` | `203-string-localecompare-and-repeat-edges`（原 `147`） | `localeCompare` 的相等 / 大小三档 |
| `205-abc-at-1` | `208-string-at-negative-and-beyond`（原 `086`） | `at` 认负下标、`charAt` 不认 |
| `141-r676-std-string-includes-fromindex` | `210-string-indexof-fromindex`（原 `162`） | 「从哪里开始找」这一格（`fromIndex` 的负数与越界） |
| `203-string-symbol-x` | **直接删**（断言逐字节已在 `194-string-tostring-of-values` 的 `String(sym)` 那一行） | `String(Symbol("x"))` |

**这一轮撞到的两处坑（都是「并组脚本跑两遍」踩出来的）**：

1. **同一族被并了两次，块就重复了**：`208` / `209` 两条的正文在加块之后**又被加了一遍**（第二次跑的是
   已经改过的保留条），于是同一个 IIFE 出现两次。**判定力没变**（同一个断言在同一份文件里重复不增加
   赌注），但**判据同源的两侧会一起错**——逐行对拍时两边都带重复，所以它**报的是相等**。
   逮住它的是**收网那一遍按块首注释数了一遍重复块**（每个保留条里 `---- 并自 … ----` 的出现次数
   必须等于它文件头里点名的那几条）。规矩：**并组这一步只许对 HEAD 那一份跑一次**，
   改完立刻把「已并入」记在文件头，第二次跑之前先用 `git diff` 确认保留条没被动过。
2. **`042` 与 `202` 看着像同一条，其实不是**：`042-string-match-and-split-regex` 是 **blocked**
   （卡在语法层的正则字面量，整份文件进不了门），`202-abc-search-b` 只是把 `search` 的**字符串实参**
   喂进去（语法合法，卡在「实参转 `RegExp`」那一趟）。第一版把后者并进前者，`tsrun` 两侧一比
   就露了（一个 exit 1、一个 exit 0）——**账条要先看 `xl:want` 再谈并组**，这条按规范改名成
   `212-string-search-string-argument-differ` 留盘。

**改名（这一轮的另一半）**：`080` → `207` · `086` → `208` · `147` → `203` · `162` → `210` ·
`136` → `211` · `202` → `212`，都是**序号取域内空位 + 描述说清判定点**；`xl:round` 一格不动。
域内 195–212 的旧名字（`195-string-symbol-to-string-throws` 那一批「表达式当名字」的）随之消失。

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4305 → 4282**（净少 **23**，全部是
被吸收过的来源，其中 0 条 `blocked` / 0 条 `differ`）、过 **3909 → 3886**；
**blocked 258 / differ 138 / bad 0 一处没动**，`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**
（`report.json` 里三张名单全是空表），加权 93.03% → **92.95%**
（分母变小、缺口条数一条不变，百分比按算术下降）。

**验证一次**：`--no-batch --jobs 8`（一条一个进程的权威口径）与批量那一轮**逐项相同**——
**3886 / 4282 · blocked 258 · differ 138 · bad 0**。

**收网扫描（DSH 自己逐目录读盘，不用脚本代替）**：`stdlib/string` 现存 **136 条**；
195–212 一段的盘上名字逐条列过——`196` / `197` / `198` / `199` / `200` / `201-raw-forms` 之后
新起了 `207`–`212`（`202`–`206` 与 `195`、`204`、`205` 的旧名字已随下盘消失，序号不重、不断层）；
四个保留条的**块首注释数量与文件头点名的来源条数逐条对齐**（`200`=9 · `197`=5 · `198`=6 ·
`207`=2 · `211`=1 · `194`=1 · `203`=1 · `208`=1 · `210`=1），重复块 0 处；
并组完整性按**行级残留**核对：合并后的 `node` / `tsrun` 两侧产出 ==「保留条改前那一份 ＋
各来源产出」的顺次相接（九组、两侧全部 `True`）。
**下一轮的去向（如实留在这里）**：`stdlib/string` 余下的 `-r<轮次>` 尾巴与
`exec/round708`（46 条，与 `stdlib/*` 大面积同判定点）、`stdlib/array` 余下三个功能族
（谓词族 / `reduce` 族 / 迭代器族）。

**第 811 轮的合并**（**`stdlib/string` 三个判定点族的重复条下盘：195 → 159**）：

同一类重复（保留条早就自称「合并过」、来源文件却一直留在盘上）在 `stdlib/string` 又是三族：

| 保留条 | 下盘 | 判定点 | 井组读数 |
| --- | --- | --- | --- |
| `189-string-split-limit-and-empty` | 15 条（`047` · `082` · `095` · `114` · `115` · `160` · `024` · `010` · `069` · `030` · `128` · `148` · `117` · `103` · `084`） | `split` 的分段规则：`limit` 三档 / 空分隔符按码元 / 空串源 / 相邻与头尾分隔符 | 759 字节，两侧逐字节相同 |
| `190-string-pad-and-repeat` | 16 条（`012` · `026` · `035` · `044` · `048` · `076` · `088` · `089` · `105` · `108` · `127` · `130` · `134` · `143` · `151` · `158`） | `padStart` / `padEnd` / `repeat` 的目标长度、填充串与次数 | 773 字节，两侧逐字节相同 |
| `187-string-slice-substring-substr` | 5 条（`009` · `031` · `050` · `087` · `138`） | `slice` / `substring` / `substr` 的三套负下标与越界口径 | 303 字节，两侧逐字节相同 |

**不并的三处（写在这里，免得下一轮重新讨论）**：

1. **`-r<轮次>` 不是并组的唯一线索，账条要先排除**：`123-string-split-limit-and-capture`
   （`want blocked`，正则字面量）与 `136-r676-std-string-regex-members`（`want differ`）
   **原样留在盘上**——它们的期望值本来就是「差着」，并进 `pass` 的那条会把账抹掉。
2. **同族里混着别的判定点的条**（`143-split-replace-and-pad` 里既有 `split` 又有 `replace` 与
   `pad`、`108-string-concat-repeat` 里既有 `concat` 又有 `at`）：这一轮**照并**，
   因为尺子量的是**次序与字节**——整块正文搬进 `190` 之后仍与来源 stdout 顺次相接，
   判定力一条没丢（它多带的那几格断言本来就是**别人的**判定点，不是**别人的**读数）。
3. **`stdlib/string` 还剩三族没走**（`normalize` / `replace` / `toWellFormed` 那一带，
   共 40 余条 `-r<轮次>` 与同判定点条），留给第 812 轮（三）；同一手法。

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4341 → 4305**（删 36 条来源，
其中 0 条 `blocked` / 0 条 `differ`）、过 **3945 → 3909**；
**blocked 258 / differ 138 / bad 0 一处没动**，`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**，
加权 93.03% → **93.03%**（同一趟的读数：3909 / 4305）。

**验证一次**：`--no-batch --jobs 8`（一条一个进程的权威口径）与批量那一轮**逐项相同**——
**3909 / 4305 · blocked 258 · differ 138 · bad 0**。

**收网扫描（DSH 自己逐目录读盘，不用脚本代替）**：`stdlib/string` 现存 **159 条**，
序号 001–205 里空缺的都是被并掉的来源；保留下来的 `-r<轮次>` 尾巴 **13 条**
（`058` · `066` · `072` · `074` · `079` · `097` · `098` · `102` · `110` · `132` · `133` · `140` · `157`，
留给第 812 轮（三）），`136` / `141` 两条本来就是 `differ` / `pass` 的独立账。

**第 803 轮的合并**（**`runtime` 前九个探针域按判定点重排：48 → 12**）：

这一轮走 `runtime/round726`–`round734` 九个纯探针域（`round734` 随之清零、目录消失），
**48 条**原子探针按判定点并成 **12 条规则用例**（净少 **36**：删 48、添 12），其中
**7 条是多来源并组**（吸收 43 条）、**5 条是单来源改名**。

| 域 | 新条 | 判定点 | 吸收 |
| --- | --- | --- | --- |
| `round726` | `001-await-and-yield-literal-operands` | `await` / `yield` / `delete` 后面那个 `{` / `[` 是值位 | `p726a-a01`…`a04`（4 条） |
| `round727` | `001-void-literal-operands` | `void` 后面跟字面量（值位）+ **类型位**的 `void` 守卫 | `p727a-a01`…`a05` + `round726/p726a-b01` + `round729/p729a-a03`（7 条） |
| `round728` | `001-optional-chain-trivia-between-links` | 注释 / 换行落在 `?.` 与它的括号之间 | `p728a-a01`…`a03`（3 条） |
| `round729` | `001-new-optional-chain-notnull-call-differ` | `?.` / `!` 后面跟调用（**账**） | `p729a-a01`（只改名） |
| `round729` | `002-optional-chain-notnull-and-new-shapes` | 上一条的守卫（过掉的形状） | `p729a-a02` · `a04`（2 条） |
| `round730` | `001-function-tags-and-construct-names` | 三档新函数的标签 / 构造名 / inspect / 自有名表 | `p730a-a01`…`a08` · `a11` · `a12`（10 条） |
| `round730` | `002-function-prototype-own-names-differ` | V8 多出来的 `prototype`（**账**） | `p730a-a09`（只改名） |
| `round730` | `003-generator-constructor-payload-differ` | 借来的载荷（动态造函数没做，**账**） | `p730a-a10`（只改名） |
| `round731` | `001-function-name-and-length-cells` | 函数的 `length` / `name` 两格（三个域各量了一遍的那一族） | `round731` a01…a09 + `round733` a01·a02·a03 + `round734` a01（13 条） |
| `round731` | `002-function-prototype-restricted-cells-differ` | `Function.prototype` 上的 `arguments` / `caller`（**账**） | `p731a-a10`（只改名） |
| `round732` | `001-computed-key-function-names` | 计算键那份函数的名字（含访问器与类成员） | `p732a-a01`…`a04`（4 条） |
| `round733` | `001-weakmap-weakset-prototype-shape` | `WeakMap` / `WeakSet` 两格原型的形状 | `p733a-a04`（只改名） |

几处判据上的取舍**写在这里**：

1. **同一个判定点在三个域里各量一遍的那一族并成一条**（`round731` × `round733` × `round734`：
   都是「函数那两格答什么」）——`round734` 因此清零、目录消失；`round733` 只留下与它无关的
   那一条（`WeakMap` / `WeakSet` 的形状）。
2. **`want` 不一致的两条不许并**：`round729` 的 `a01`（differ）与 `a02` · `a04`（pass）分成两条，
   后者是前者的守卫；`round730` 的两条账与那十条 `pass` 同样各成一条。
3. **异步块之间排空一次微任务队列**（`round726` / `round727` 两条各用了 `drain()`），
   `await` 只加在块**之间**，块里正文一行没改。
4. **单来源的改名逐字节等于原探针**（5 条只换文件名与标题）；多来源的新条才套「每条一个块」的壳。

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4496 → 4460**（净少 **36**）、
过 **4100 → 4064**；**blocked 258 / differ 138 / bad 0 一处没动**，
`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**，加权 93.29% → **93.22%**。

**验证一次**：`--category runtime --no-batch --jobs 8`（一条一个进程的权威口径）与批量**逐项相同**：
runtime **776 / 827 · blocked 6 · differ 45 · bad 0**（两边退出码 0）。八道门全绿
（`coverage` 4064 / 4460 · blocked 258 · differ 138 · bad 0）。

**收网扫描（亲手再列一遍）**：`round726`–`round733` 现存 12 条，序号从 001 起连续、全是
`<三位序号>-<kebab 描述>`；`round734` 目录已消失；全仓遗留探针命名 **170 条且全在 `runtime`**
（第 802 轮之后是 218），留给第 804 轮。并组完整性由同一把一次性尺子
（`tmp-probe-ruler.mjs` + `tmp-probe-groups-803.json`，未进仓）核对：
12 组保留条的 `tsrun` stdout 与「各被吸收条 stdout 的顺次相接」**逐字节相同**（48 条来源）。

**第 802 轮的合并**（**整个 `exec` 的原子探针域按判定点重排：76 → 31**，探针命名清零）：

这一轮走的是**整类**：`exec` 下 12 个纯探针域（`round712` · `round715` · `round724` ·
`round736`–`round743`）加 `expressions` / `statements` / `round778` 里散落的遗留命名
（`p-op-void-comma` / `p-optional-chain-null` / `probe694-m31` 与 `r692-*` 四条 · `r778g-01`），
一共 **76 条**（71 条 `probe*` / `p<轮次>*` / `p-*` + 5 条 `r<轮次>*`）。
**76 条**按判定点并成 **31 条规则用例**（净少 **45**：删 76、添 31），其中
**10 条是多来源并组**（吸收 53 条）、**21 条是单来源改名**，
**2 条**（`p-op-void-comma` / `p-optional-chain-null`）的断言**已全在保留条里**、直接删：
前者的 `void (n = 5)` / `n` / `(1, 2, 3)` 三句一字不差地在 `exec/expressions/241-typeof-and-void` 里，
后者的 `o?.a` / `o?.a?.b` / `o?.()` 分别在 `245-member-call-chains`（第 42 / 69 行那两条 probe）与
`058-optional-call-forms`（`f?.()`，`f` 就是 `null`）里。
**凡「并」必有据**：一把一次性尺子（`tmp-r802-verify-final.mjs`，在 `.gitignore` 的 `tmp-*` 里，没进仓；
被删掉的来源从 `git show HEAD:` 取回来再跑）逐组核对 —— 31 组保留条的 `tsrun` stdout 与
「**各被吸收条 stdout 的顺次相接**」**逐字节相同**（74 条来源，退出码也逐条一致）；
其中唯一 `node ≠ tsrun` 的 5 组**正是台账那 5 条**
（`differ` 4：稀疏复制族 / `new.target` / 异步微任务次序 / `?.` 后紧跟下标；`blocked` 1：
`new ns["C"]()`），不是并组弄坏的。

| 域 | 新条 | 判定点 | 吸收（原条） |
| --- | --- | --- | --- |
| `round712` | `001-set-symbol-iterator-cell` | Set 的 `Symbol.iterator` 那一格（与 `values` 同格、`next()` 给值） | `p712a-a01`（只改名） |
| `round715` | `001-property-key-enumeration-order` | 自有属性的枚举次序：整数键升序在前、其余按插入序（九种观察口径） | `p715b-b01`…`b09`（9 条） |
| `round724` | `001-spread-arguments-and-positions` | 展开的六种位置与来路（实参 / 接收者 / 数组字面量 / `new` 与 `call` / `satisfies`） | `p724a-a01`…`a06`（6 条） |
| `round724` | `002-error-subclass-prototype-chain` | `Object.getPrototypeOf(TypeError) === Error` | `p724a-b01`（只改名） |
| `round724` | `003-sparse-array-copy-family-differ` | 稀疏数组的复制族（**账**） | `p724a-b02`（只改名） |
| `round736` | `001-private-fields-and-methods` | 私有名不进属性表（`#p in o` 是品牌检查） | `p736c-c03` + `exec/round737/p737d-d02`（2 条） |
| `round736` | `002-new-target-in-derived-constructor-differ` | `super()` 那条路上 `new.target` 丢了（**账**） | `p736c-c05`（只改名） |
| `round736` | `003-class-expression-name-and-tostring` | 类表达式的 `name` 与 `toString` 的开头 | `p736c-c06`（只改名） |
| `round736` | `004-finally-abrupt-completion` | `finally` 对 `return` / `break` / `throw` 的接管 | `p736c-c09` + `exec/round742/p742b-b04`（2 条） |
| `round736` | `005-throw-non-error-values` | 抛一个非 `Error` 的值原样交回 | `p736c-c13`（只改名） |
| `round737` | `001-object-spread-uses-property-enumeration` | 对象展开走属性枚举、不是迭代协议 | `p737b-b02`（只改名） |
| `round737` | `002-array-from-iterables-and-array-likes` | `Array.from` 的两支（迭代协议 / 类数组） | `p737b-b03`（只改名） |
| `round737` | `003-forof-array-mutation-live-view` | 数组迭代器每步现读 `length` 与下标 | `p737b-b04`（只改名） |
| `round737` | `004-try-catch-destructuring-and-finally` | `catch` 形参位是一个完整的解构目标 | `p737b-b05`（只改名） |
| `round737` | `005-async-throw-and-return-await-differ` | 续链的微任务格数（**账**） | `p737b-b07`（只改名） |
| `round738` | `001-logical-chain-parsing-and-evaluation` | 逻辑链的解析与求值：位置 / 结合性 / 短路 / 交出操作数本身 | `p738b-b01`…`b06` + `exec/round737/p737b-b06`（7 条） |
| `round739` | `001-await-precedence-and-association` | `await` 只吞紧跟其后那一格（算术 / 逻辑 / 比较 / 下标与成员链） | `p739b-b01`…`b06`（6 条） |
| `round740` | `001-unary-prefix-and-member-chain` | 一元前缀与成员链 / 二元的结合（`typeof` / `delete` / `++` / `!` / `-`） | `p740b-b01`…`b06`（6 条） |
| `round741` | `001-optional-call-chain-and-shortcircuit` | 可选调用 `?.()` 的链与短路（基名 / 实参 / 二元与 `await`） | `p741b-b01`…`b04` · `b06`（5 条） |
| `round741` | `002-optional-index-then-call-differ` | `?.` 后面紧跟下标那一格（**账**） | `p741b-b05`（只改名） |
| `round742` | `001-switch-match-evaluation` | 判别式与 `case` 怎么比、各求值几次 | `p742b-b02` · `b03` · `b07` + `exec/round736/p736c-c12`（4 条） |
| `round742` | `002-switch-labelled-continue` | `continue outer` 从 `case` 里落到外层循环 | `p742b-b01`（只改名） |
| `round742` | `003-switch-case-block-scope` | `case` 后面跟一个块时那一格自己的作用域 | `p742b-b05`（只改名） |
| `round742` | `004-switch-case-side-effects` | `case` 体里的副作用与 `return` 的次序 | `p742b-b06`（只改名） |
| `round742` | `005-super-home-object-without-extends` | 不写 `extends` 时 `super` 的家对象 | `p742d-d01`（只改名） |
| `round743` | `001-index-call-chain-in-operands` | 下标调用链 `o[k]().v` 落在各种操作数位上 | `p743a-a01`…`a04` + `exec/round744/p744a-a01` + `exec/expressions/r692-element-call-then-member`（6 条） |
| `expressions` | `250-object-member-new-bracket-blocked` | `new ns["C"]()` 整份文件进不来（**账**） | `probe694-m31`（只改名） |
| `expressions` | `251-function-expression-as-operand` | 函数表达式 / 类当一元与二元的操作数（`IsOperand` 认不认 `Function`） | `r692-function-expression-operand`（只改名） |
| `statements` | `086-function-decl-then-prefix-update` | 函数声明后面那个 `++` 是**下一句的前缀** | `r692-function-decl-then-update`（只改名） |
| `statements` | `087-labeled-statement-tail` | 带标签的语句的尾巴不能被壳吞掉 | `r692-labeled-statement-tail`（只改名） |
| `round778` | `001-default-param-function-expression-blocked` | 默认实参里的函数表达式被投成声明（**账**） | `r778g-01`（只改名） |

几处判据上的取舍**写在这里**，免得下一轮重新讨论：

1. **跨域的同一判定点这一轮并掉了五处**（都在 `exec` 之内）：私有名那一格
   （`round736` × `round737`）、`switch` 判别式那一格（`round736` × `round742`）、
   `finally` 接管那一格（`round736` × `round742`）、逻辑链那一格（`round738` × `round737`）、
   下标调用链那一格（`round743` × `round744` × `expressions/r692-element-call-then-member`，
   `round744` 目录随之消失）。
   合并后的条落在**来源多的那一边**，被并掉的那一条的正文逐句搬进保留条的新块里。
2. **`want` 不一致的两条不许并**（沿用第 801 轮那条）：`p741b-b05`（`?.` 后紧跟下标的账）
   与同域那五条 `pass` 并排留着，另立 `002-…-differ`；同理 `round724` 的
   `b01`（pass）与 `b02`（differ）各成一条。
3. **异步块之间必须排空一次微任务队列**（第 798 轮那条坑，这一轮在 `round739` / `round740` /
   `round741` 三条里各用了一次）：保留条里加一个 `drain()`（200 轮 `await null`），
   块序与「各探针 stdout 的顺次相接」才逐字节对得上；`await` 只加在块**之间**，
   块里的正文一行没改。
4. **单来源的「改名」逐字节等于原探针**（21 条只换文件名与标题，正文一字未动）；
   多来源的新条才套「每条一个块」的壳，块里的正文**逐字照搬**，没有改写任何一行。
5. **标题里不再写轮次**：`p<轮次>*` 那套命名清零之后，轮次信息一律待在 `xl:round` 那一格；
   新标题只写「测什么」，账的尾巴写在标题末尾的 `（账）` / 文件名末尾的 `-differ` / `-blocked`。

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4541 → 4496**（净少 **45**）、
过 **4145 → 4100**；**blocked 258 / differ 138 / bad 0 一处没动**
（新增的 5 条 `differ` / `blocked` 与消失的 5 条逐条同根：`p<轮次>*` / `r<轮次>*` 换成了描述性命名的同一条），
`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**，加权 93.35% → **93.29%**
（分母变小、缺口条数不变，所以百分比按算术下降，不是判定变差）。

**验证一次**：`--category exec --no-batch --jobs 8`（一条一个进程的权威口径）与批量那一轮
**逐项相同**：exec **760 / 800 · blocked 10 · differ 30 · bad 0**（两边退出码 0）。
八道门全绿：`runtime:check` 243 条通过、`runtime:cli` 79 份一致、`cases:check` 1407 条 0 不合格、
`cases:tags` 4748 条断言 0 不一致、`cases:shapes` 0 未覆盖、
`coverage` 4100 / 4496 · blocked 258 · differ 138 · bad 0。

**收网扫描（DSH 自己逐域读盘，不用脚本代替）**：`exec` 下 `probe*` / `p<轮次>*` / `p-*` 命名**清零**
（本轮之前 71 条），`r<轮次>*` 那 5 条遗留命名（`r692-*` 四条 · `r778g-01`）也一并清掉 ——
**全 `exec` 用例的文件名都从三位序号开头**（逐目录列一遍，不以数字开头的 0 条）；
本轮 12 个纯探针域各自的序号从 001 起连续、全是 `<三位序号>-<kebab 描述>`；`round744` 目录已消失；
全仓遗留探针命名现在 **218 条且全在 `runtime`**（第 801 轮之后是 289：`runtime` 218 · `exec` 71，
留给第 803 轮）；`gap-*` 一族 186 条**一条没动**（那是 token 的逐落点账）。

**跨域 / 跨类别的重复如实留在这里**（不在本轮动）：`round737/002` ⊂
`exec/round709/005-array-from-array-likes`（`Array.from` 同一件事的两半）；
`round736/003` 与 `exec/expressions/248-class-expressions-and-new`（类表达式的 `name` 同一格）；
`round736/004` 与 `runtime/exceptions/002` · `003`（`finally` 的接管，**跨类别**、权重不同）；
`round742/001` 与 `runtime/round742/001-switch-match-semantics`（判别式与 `case` 的比较，**跨类别**）；
`expressions/250` 与 `expressions/248` 的分工写在两条的正文里（点号那一格已通过、下标那一格是账）；
`expressions/251` 与 `241-typeof-and-void` / `classes/086-class-object-shape`（`typeof function () {}`
与 `typeof class {}` 各占一格，本条钉的是一元与二元位置那一半）；
`statements/087` 与 `statements/079-labeled-statements`（079 的十条全在 IIFE 里，本条钉的是
「尾巴有没有被壳吞掉」那一半）。
**上面前四条（`round737/002` · `round736/003` · `round736/004` · `round742/001`）第 809 轮已经并掉**
（源文件下盘、独有断言搬进保留条，见上面第 809 轮那一节）；留在这里的是**本轮没动**的那几条。

**第 801 轮的合并**（**整个 `stdlib` 的原子探针域按判定点重排：233 → 154**，探针命名清零）：

这一轮走的是**整类**而不是一个域：`stdlib` 下 32 个域里所有遗留命名的原子探针
（`probe*` / `p<轮次>*` / `p-*`）——`round709`…`round759` 那 22 个纯探针域，
加上 `json` / `object` / `globals` / `date` 四个功能域里散落的探针。
**233 条**按判定点并成 **154 条规则用例**（净少 **79**：删 233、添 154），
其中 **31 条是多来源并组**（吸收 105 条）、**123 条是单来源改名**，
另有 **5 条**并进域内已有的同判定点规则用例（那些编号条本轮一个字节没动）。
**凡「并」必有据**：每条新用例的 `tsrun` stdout 与「各被吸收条 stdout 的顺次相接」**逐字节相同**
（一次性尺子逐组核对：`concat=true` 全中、丢断言 0），所以判定力一条没丢。

| 域 | 盘上 → 新条 | 域 | 盘上 → 新条 |
| --- | --- | --- | --- |
| `stdlib/round709` | 18 → 5 | `stdlib/round748` | 10 → 10 |
| `stdlib/round710` | 16 → 5 | `stdlib/round749` | 9 → 9 |
| `stdlib/round714` | 2 → 1 | `stdlib/round750` | 10 → 10 |
| `stdlib/round715` | 6 → 6 | `stdlib/round751` | 5 → 5 |
| `stdlib/round716` | 15 → 4 | `stdlib/round752` | 4 → 4 |
| `stdlib/round717` | 15 → 6 | `stdlib/round753` | 4 → 4 |
| `stdlib/round720` | 20 → 15 | `stdlib/round757` | 3 → 3 |
| `stdlib/round722` | 14 → 8 | `stdlib/round758` | 1 → 1 |
| `stdlib/round723` | 11 → 7 | `stdlib/round759` | 2 → 2 |
| `stdlib/round725` | 7 → 3 | `stdlib/json` | 6 条探针 → 2 新条（+3 并进已有） |
| `stdlib/round735` | 12 → 9 | `stdlib/object` | 5 条探针 → 4 新条（+1 并进已有） |
| `stdlib/round736` | 10 → 9 | `stdlib/globals` | 2 → 2 |
| `stdlib/round737` | 7 → 6 | `stdlib/date` | 1 → 1 |
| `stdlib/round745` | 9 → 4 | — | — |
| `stdlib/round746` | 7 → 7 | — | — |
| `stdlib/round747` | 4 → 4 | — | — |

几处判据上的取舍**写在这里**，免得下一轮重新讨论：

1. **`round715` / `round746` / `round747`…「N → N」不是没做事**：那些域里每条探针各问一个
   方法自己的语义（`shift` 与 `unshift` 是两个赌注），**一条也不许并**——本轮给它们的只是
   `<三位序号>-<kebab 描述>` 的名字与 `xl:round` 的落位。
2. **编号接着域内已有的最大序号往下排**：`json`（087/088）、`object`（200–203）、
   `globals`（063/064）、`date`（047）、`round745`（002–004）、`round746`（002–007）
   这些域里已经有编号条，新条**不从 001 起**（从 001 起会撞上已存在的 001）。
3. **`want` 不一致的两条不许并**：`round710/001`（`differ` 的宿主接口面账）、
   `round746/002` 与同域 `001`（`differ` 的越界访问器账）、`round723/007` 这些
   与同判定点的 `pass` 条**并排留着**——账不是冗余。
4. **单来源的「改名」逐字节等于原探针**（28/29 只换文件名，`round748/007` 另改了
   `xl:title` 一行，因为旧标题写的那一档正文里没有）；多来源的新条才套
   「每条一个 IIFE」的壳，壳里的正文逐字照搬，**没有改写任何一行**。
5. **头部的 `//  xl:why`（两个斜杠加两个空格）是正文散文，不是指令**：
   台账已撤（`want=pass`）却留着解释的守卫条，按第 799 轮那条例把那段解释降成正文。

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4620 → 4541**（净少 **79**）、
判过 4620 → 4541、过 **4224 → 4145**；**blocked 258 / differ 138 / bad 0 一处没动**
（新增的 23 条 `blocked`/`differ` 与消失的 23 条逐条同名同根：`p<轮次>*` 换成了描述性命名的同一条），
`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**，加权 93.44% → **93.35%**
（分母变小、缺口条数不变，所以百分比按算术下降，不是判定变差）。

**验证一次**：全量 **`--no-batch`**（一条一个进程的权威口径）再跑一遍，
总数与四档判决与批量那一轮**逐项相同**（4145 / 4541 · blocked 258 · differ 138 · bad 0）。
八道门里与本轮相关的两道也逐项照旧：`cases:check` 1407 条 0 不合格、
`cases:tags` 4748 条断言 0 不一致。

**收网扫描**（DSH 自己逐域读盘，不用脚本代替）：`stdlib` 下 `probe*` / `p<轮次>*` / `p-*`
命名**清零**（本轮之前 233 条、全仓 522 条，现在全仓 289 条：`runtime` 218、`exec` 71，
留给第 802 / 803 轮）；域内编号 001 起连续（接着已有编号的域除外，见上）；
`gap-*` 一族 186 条**一条没动**（那是 token 的逐落点账）。

**第 800 轮的合并**（**`stdlib/symbol` 整个域按判定点重排：67 → 10**）：
43 条编号条 + 24 条原子探针（`probe697-y*` 17 · `probe-y*` 5 · `p-sym-*` 2）里，
**描述与文本形态**被写了十几遍、**注册表**（`for` / `keyFor`）被写了十几遍。
67 条按判定点并成 **10 条规则用例**，`probe*` 与 `p-sym-*` 命名清零。
块都是同步的（唯一一处异步生成器 `030` 是单来源、原样留在顶层），
所以与第 799 轮一样不需要排空壳。

| 新条 | 判定点 | 吸收（原条） |
| --- | --- | --- |
| `001-symbol-description-and-text` | 符号的描述与文本形态：`description` / `toString` / `String(s)` / `typeof` / 唯一性 | `005` · `006` · `009` · `012` · `016` · `033` · `035` · `137` · `138` · `139` · `probe697-y01/y02/y09/y18` · `probe-y02/y05/y07` · `p-sym-tostring` · `p-sym-unique`（19 条） |
| `002-symbol-registry-for-and-keyfor` | `Symbol.for` / `keyFor` 的注册表：identity、键的取出、实参强制转换 | `008` · `010` · `013` · `023` · `024` · `027` · `029` · `probe697-y05/y06/y07/y20` · `probe-y03`（12 条） |
| `003-symbol-as-property-key` | 符号作属性键：不进 `Object.keys` / `JSON`，能列进 `getOwnPropertySymbols`、`in` / `entries` / `assign` | `032` · `probe697-y11`…`y17`（8 条） |
| `004-symbol-well-known-identity` | 内建符号的名字表与同一性（`iterator` / `asyncIterator` / `hasInstance` / `toStringTag` / `dispose` / `match` 那一族） | `025` · `031` · `034` · `036` · `037` · `134` · `135` · `probe697-y10`（8 条） |
| `005-symbol-iterator-custom-iterables` | 自定义 `Symbol.iterator` 的可迭代物：展开 / `for..of` / 手动 `next()` | `001` · `014` · `017` · `019` · `020` · `021` · `022`（7 条） |
| `006-symbol-toprimitive` | `Symbol.toPrimitive` 的三种 hint | `002` · `011` · `015` · `136`（4 条） |
| `007-symbol-hasinstance` | `Symbol.hasInstance` 自定义 `instanceof`（与 `Symbol.species`） | `003` · `026` · `028`（3 条） |
| `008-symbol-tostringtag` | `Symbol.toStringTag` 影响 `Object.prototype.toString` | `004` · `018`（2 条） |
| `009-symbol-string-and-compare-throws` | 符号进拼接 / 模板串 / 比较要抛 `TypeError` | `007` · `probe697-y19` · `probe-y06`（3 条） |
| `010-async-generator-asynciterator` | 异步生成器带 `Symbol.asyncIterator` 与 `for await` | `030`（只改名） |

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4677 → 4620**（净少 **57**：删 67、添 10）、
过 **4281 → 4224**；**blocked 258 / differ 138 / bad 0 一处没动**，
`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**，加权 93.50% → **93.44%**。

**验证一次**：域内两种口径**逐项相同** —— 批量（`--jobs 8 --batch-workers 32`）与
`--no-batch` 都是 24 条：**23 过 · differ 1 · blocked 0 · bad 0**
（10 条自己 + 过滤器带出来的邻域；那 1 条 differ 是老账
`stdlib/round783/r783b-03-symbol-prototype-own-cells`，与这一轮无关）。
并入的完整性用一把一次性的尺子（`tmp/round800/verify.mjs`）机械核对：
10 条的 stdout 与「各被并入条 stdout 的顺次相接」**逐字节相同**（67 条来源，`concat=true` 10/10、
`node==tsrun` 10/10）。

**收网扫描（亲手再过一遍）**：`stdlib/symbol` 现存 10 条（序号 001–010 连续、全是
`<三位序号>-<kebab 描述>`，域内 `probe*` / `p-sym-*` 命名 **0 条**），每条一个判定点；
域内同判定点的重复一处没留。两条「守卫」（原来的 `036` / `037`，台账已撤、留着当守卫）
并进 `004`，它们头部那段解释按规矩降成正文散文（`//  xl:why`，两个斜杠加两个空格——
第一版只改了首行、续行仍是 `// xl:why`，当场发现并改掉）。

**第 799 轮的合并**（**`stdlib/console` 整个域按判定点重排：71 → 11**）：
这个域是**同一个判定点被逐批重抄**最厉害的一个——33 条编号条里有 23 条在问同一件事
（`console.log` 怎么渲染一个值），38 条原子探针（`probe703-c-h*` 19 条 + `probe705-c-e*` 19 条）
又把它问了一遍。71 条按判定点并成 **11 条规则用例**，`probe*` 命名清零。
**这个域不需要第 798 轮那个「排空微任务队列」的壳**：每一块都是同步的 `console.log` 渲染，
块与块之间天然互不干扰（合并后的 stdout 就是各条 stdout 的顺次相接）。

| 新条 | 判定点 | 吸收（原条） |
| --- | --- | --- |
| `001-console-log-containers` | 容器形态：数组 / 对象 / 嵌套 / 空 / 稀疏洞 / 折行 | `003` · `006` · `007` · `009` · `011` · `013` · `015` · `016` · `017` · `019` · `021` · `022` · `026` · `probe703-h01/h02/h10/h16` · `probe705-e07/e08/e15/e16/e20`（22 条） |
| `002-console-log-numbers` | 数字口径：整数 / 浮点 / `-0` / `NaN` / `Infinity` / 指数 / 极值 | `002` · `018` · `023` · `probe703-h08/h19/h20` · `probe705-e12/e13`（8 条） |
| `003-console-log-strings` | 字符串口径：引号 / 换行 / 空串 / 拼接结果 | `005` · `008` · `024` · `probe703-h11` · `probe705-e10/e11/e17`（7 条） |
| `004-console-log-special-values` | 原始值与符号：`undefined` / `null` / 布尔 / `Symbol` / `Date` | `012` · `probe703-h05/h07/h15/h17/h18` · `probe705-e09/e14`（8 条） |
| `005-console-log-key-order-and-hidden-members` | 键序与不露面的成员：符号键 / 不可枚举 / 访问器 / 整数键在前 | `027` · `probe703-h09`（2 条） |
| `006-console-log-map-and-set` | `Map` / `Set`（含对象键）的渲染 | `004` · `025` · `033` · `probe703-h04` · `probe705-e06`（5 条） |
| `007-console-log-functions-and-classes` | 函数 / 类 / 方法：具名 / 匿名 / 箭头 / 对象方法 / 生成器与 `async` | `014` · `028` · `030` · `probe703-h13/h14` · `probe705-e01/e02/e03/e04/e19`（10 条） |
| `008-console-log-multi-args-and-format` | 多实参与格式说明符：空格相接、空调用、`%s` / `%d` / `%o` / `%%` | `001` · `010` · `031` · `032` · `probe703-h06/h12`（6 条） |
| `009-console-member-names-differ` | console 的成员名表（**账**，缺 30 个） | `020`（只改名，`xl:want` / `xl:why` 一字未动） |
| `010-console-log-circular-reference-differ` | 循环引用打出来是 `[Circular *1]`（**账**） | `029`（只改名） |
| `011-console-log-error-stack-differ` | `console.log(new Error("boom"))` 的栈没有渲染（**账**） | `probe705-c-e18`（只改名） |

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4737 → 4677**（净少 **60**：删 71、添 11）、
过 **4341 → 4281**；**blocked 258 / differ 138 / bad 0 一处没动**（三条账都是同一本账搬了个位置），
`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**，加权 93.55% → **93.50%**。

**验证一次**：域内两种口径**逐项相同** —— 批量（`--jobs 8 --batch-workers 32`）与
`--no-batch`（一条一个进程的权威口径）都是 15 条：**10 过 · differ 5 · blocked 0 · bad 0**
（11 条自己 + 过滤器带出来的邻域 `stdlib/error/001-console-log-error-stack`、
`stdlib/round761/r761f-01-console-count-and-reset`、`r761g-01-console-names-gap`、
`stdlib/round762/r762d-01-console-assert`）。并入的完整性用一把一次性的尺子
（`tmp/round799/verify.mjs`）机械核对：8 条合并条的 stdout 与「各被并入条 stdout 的
顺次相接」**逐字节相同**（71 条来源，`concat=true` 11/11；`011` 那条的 `concat` 报 false
只是因为它的 stdout 里**带着调用帧的盘上路径**、文件改名后路径自然不同——它本来就是账）。

**收网扫描（亲手再过一遍）**：`stdlib/console` 现存 11 条（序号 001–011 连续、全是
`<三位序号>-<kebab 描述>`，域内 `probe*` 命名 **0 条**），每条一个判定点；
顺手修掉一处**台账撤干净、散文没撤干净**的残留：`030-con-log-async-function` 的头部在
`xl:judge stdout` 后面挂着一行没有主人的 `xl:why` 尾巴（"…本仓的闭包只有 `IsClass` 一位。要做。"），
它会被读成 `judge` 的续行——这一轮并进 `007` 之前先删掉了。
**与 `stdlib/round761/r761g-01-console-names-gap` 的跨域重复如实留在这里**（不在本轮动）：
两条问的是同一张 console 名表（`009` 是逐个 `typeof`、`r761g-01` 是整表对拍）。
**与 `stdlib/error/001-console-log-error-stack` 同一条根**：`011` 就是它那一族的
`console.log(new Error(...))` 版（`xl:why` 里写着这一句）。

**第 798 轮的合并**（**`runtime/async` 整个域按判定点重排：91 → 22**）：
这是五类语料里探针最密的一个域——40 条 `probe3-*` / `probe697-p*` / `probe697-z*`，
外加 51 条编号条（其中 **9 条**在问同一个「微任务次序」、**7 条**在问同一族异步生成器、
**7 条**在问同一条承诺链的值与采纳）。91 条按判定点并成 **22 条规则用例**，
`probe*` / `p<轮次>*` 命名清零，四条的 `-r<轮次>` 尾巴（`013-async-generator-basic-r305` 这种）
一并去掉——轮次本来就该待在 `xl:round` 那一格。

| 新条 | 判定点 | 吸收（原条） |
| --- | --- | --- |
| `001-promise-chain-values-and-adoption` | 承诺链的逐级透传 / `then` 返回承诺的展开 / 兑现值是承诺时的采纳与拒绝传播 | `001` · `009` · `012` · `019` · `025` · `032` · `045` |
| `002-promise-catch-and-finally` | `catch` 接住之后回到兑现、`finally` 不改值也不吞拒绝 | `002` · `003` · `017` |
| `003-promise-combinators` | `all` / `race` / `allSettled` 的次序、空表与普通值混排 | `004` · `016` · `037` · `044` |
| `004-microtask-order` | 同步先跑完、`then` 逐环推进、`await` 与 `then` 同队混排 | `007` · `008` · `015` · `026` · `029` · `036` · `039` · `040` · `043` · `probe3-a01/a02/a05/a10/a13` · `probe697-p02/p15` |
| `005-async-function-order-and-value` | `async` 的同步段、`await` 的次序与返回值的形状 | `005` · `034` · `042` |
| `006-async-throw-and-reject` | `throw` / 执行器里抛 / `await` 一个被拒的承诺 | `006` · `024` · `027` · `047` |
| `007-await-in-try-finally` | `await` 落在 `try` / `finally` 里的收尾次序与 `finally` 里的 `return` | `011` · `021` · `046` · `049` |
| `008-await-in-loop` | 循环里顺序 `await`（每一轮一个新微任务） | `010` · `048` |
| `009-async-generator-basic-and-for-await` | 异步生成器 `yield` 的值与 `for await` 的收尾 | `013` · `035` |
| `010-async-generator-await-inside` | 生成器体里 `await` 之后的 `yield` | `014`（只改名） |
| `011-async-generator-suspend-kinds` | `await` 摘的挂起与 `yield` 摘的挂起不是一回事 | `020`（只改名） |
| `012-async-generator-for-await-protocol` | 异步生成器与 `for await` 的完整回合（手动 `next()` 三档） | `028`（只改名） |
| `013-async-generator-await-and-return` | `for await` 的顺序与 `return()` | `033`（只改名） |
| `014-async-generator-for-await-mixed` | `yield` / `yield await` / `return` 三格 + 混合可迭代 | `051`（只改名；它本身第 784 轮并过一次） |
| `015-await-rejection-paths` | `await` 一个被拒承诺的三条路（`catch` 体里 / 循环里 / 手动 `try`） | `018` · `022` · `023` |
| `016-async-thenable-adoption` | `async` 返回一个 thenable：会被采纳 | `038` |
| `017-await-non-promise-thenable-differ` | `await` 一个不是 Promise 的 thenable（**账**） | `041`（只改名，`xl:want` / `xl:why` 一字未动） |
| `018-promise-with-resolvers` | `Promise.withResolvers` | `030` |
| `019-symbol-asynciterator-protocol` | `Symbol.asyncIterator` 与 `for await` | `031` |
| `020-promise-object-tostring-tag` | `Object.prototype.toString.call(Promise.resolve())` | `050`（它本身已并过 `probe697-p10` / `z13`） |
| `021-promise-instance-and-static-shape` | 承诺的对象形状：`instanceof` / `constructor` / 方法与静态面的 `typeof` | `probe3` a03/a04/a06/a07/a08/a09/a11/a12/a14/a15 · `probe697` p01/p04/p06/p08/p09/p11/p12/p14 · z02/z03/z10/z12/z14（共 23 条） |
| `022-promise-and-async-function-names` | `name` / `constructor.name` / `prototype` / 自有属性表 | `probe697` p03/p05/p13 · z01/z05/z06/z07/z08/z11/z15（共 10 条） |

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4806 → 4737**（净少 **69**：删 91、添 22）、
过 **4410 → 4341**；**blocked 258 / differ 138 / bad 0 一处没动**（differ 是同一本账：
老 `041-await-thenable` → 新 `017-await-non-promise-thenable-differ`），
`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**，加权 93.66% → **93.55%**。

**验证一次**：域内两种口径**逐项相同** —— 批量（`--jobs 8 --batch-workers 32`）与
`--no-batch`（一条一个进程的权威口径）都是 23 条：**22 过 · differ 1 · blocked 0 · bad 0**
（第 23 条是过滤器带出来的邻域 `runtime/exceptions/022-throw-in-async-caught`）。
并入的完整性用一把一次性的尺子（`tmp/round798/verify.mjs`）机械核对：
22 条的 stdout 与「**各被并入条 stdout 的顺次相接**」**逐字节相同**（91 条来源、`concat=true` 22/22），
唯一一处 `node ≠ tsrun` 就是那条本来就 differ 的 `017`。

**收网扫描（亲手再过一遍）**：`runtime/async` 现存 22 条（序号 001–022 连续、全是
`<三位序号>-<kebab 描述>`，域内 `probe*` / `p<轮次>*` / `-r<轮次>` 命名 **0 条**），
每条一个判定点族；域内**没有留下**同判定点的重复。

**这一轮撞出来的两件事**（写在这里，别再踩）：

1. **合并的块与块之间必须排空一次微任务队列**：两块各自的承诺链在同一份文件里会交叉推进，
   读数就成了「并发形状」的读数、不再是各条原来那个判定点的读数。实测：不排空时
   「承诺链」那一条与「异步生成器」那一条**当场 differ**，`REGRESSION` 报 2 条
   （覆盖度 15/18）。改法是每块后面排 200 轮 `await null`（各块的链深远小于 200）——
   排空之后 22 条的 stdout 与各条单独跑的 stdout **顺次相接、逐字节相同**。
2. **异步生成器那一族不能进这个排空壳**：`await null` 排在异步生成器后面时 tsrun 会丢输出
   （单块实测：`028` 排空后 **0 字节**，`014` / `020` / `033` / `051` 也都变 differ；
   不排空时 7 条全对）。所以 `014` / `020` / `028` / `033` / `051` 这一轮**只改名、不合并**，
   只有 `013` + `035` 实测可以排空、并成 `009`。**这一条不新登台账**（保台账要求
   blocked / differ 一处不动），如实记在这里：**「异步生成器之后还能继续 await 别的」
   这件事在 tsrun 上是坏的**——一个能复现的最小形状是
   `(async () => { (function () { gen(); })(); for (let i = 0; i < 200; i++) await null; })()`。

**第 797 轮的合并**（**`stdlib/round721` 整个域按判定点重排：25 → 7**）：
这个域是**纯探针域**（`p721a-a01`…`a17` 17 条 + `p721a-b01`…`b06` / `b08` 7 条，外加一条早先并过的
编号条 `001-seal-after-delete-index-gives-false-write-still-ok`），25 条按判定点并成 **7 条规则用例**，
`probe*` / `p-*` 命名清零。

| 新条 | 判定点 | 吸收 |
| --- | --- | --- |
| `001-index-data-properties` | 下标上的**数据属性**：值 / `length` / `JSON` / 键、描述符回读、`defineProperties` 两格、可写格再赋值 | `p721a-a01` · `a02` · `a03` · `a12` · `a16` |
| `002-index-accessor-read-paths` | 下标上的**访问器**读那一格：`in` / `for..in` / 属性名表、`join` / `JSON`、展开与 `Array.from` | `p721a-a04` · `a15` · `b01` · `b03` |
| `003-index-accessor-setter-differ` | 下标上的 `get` + `set`（**differ**：`set_index` 没有调用通道）——原 `p721a-b02`，只改名 | — |
| `004-index-write-delete-and-holes` | 下标那一格的**写 / 删 / 留洞**：不可写、不可配置、`delete` 与 `concat` / `slice` | `p721a-a05` · `a06` · `a14` · `a17` |
| `005-length-growth-and-non-index-keys` | `length` 跟着长的两条路（define 与赋值）与**不是下标**的键 | `p721a-a07` · `a08` · `b08` |
| `006-length-property-descriptor` | `length` 那一格：描述符回读、define 的削短 / 加长、不可写之后的静默与 `TypeError` | `p721a-a09` · `a10` · `a11` · `b04` · `b05` · `b06` |
| `007-freeze-seal-and-index` | `freeze` / `seal` 之后下标那一格 | `p721a-a13`、原 `001-seal-…`（它本身并过 `p721a-b07` 与 `round723/p723a-a03`） |

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4824 → 4806**（净少 **18**：删 25、添 7）、
过 **4428 → 4410**；**blocked 258 / differ 138 / bad 0 一处没动**（differ 是同一本账：
老 `p721a-b02` → 新 `003`），`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**。

**验证一次**：域内两种口径**逐项相同**（7 条：6 过 · differ 1 · blocked 0 · bad 0）；
合并的完整性用一把一次性的尺子（`tmp-r797-verify.mjs`）机械核对 —— 7 条保留条的 stdout 与
「各探针 stdout 的顺次相接」**逐字节相同**（25 条探针、1049B），**不一致 0 条**。

**收网扫描（亲手再过一遍）**：`stdlib/round721` 现存 7 条（序号 001–007 连续、全是
`<三位序号>-<kebab 描述>`，域内 `probe*` / `p-*` 命名 0 条）；每条的判定点写在标题里。
按「文件名含 `probe` 或以 `p<轮次>` 开头」这一把可复现的尺子实测，全仓第 797 轮之后是 **615 条**
（上表那一行的 624 是沿用该行自己的历史口径逐轮相减）。
**与 `stdlib/array` 的跨域重复如实留在这里**（不在本轮动）：`001` ⊂ `array/144-define-on-array-index`
（而 `144` 自己又已被 `array/169` 吸收）、`002` ⊂ `array/143-getter-array-index` + `array/169` 的①、
`004` 的 `delete` 那一半与 `005` 的「越界赋值 / 非下标键」⊂ `array/162-array-length-writes` 的③④⑤——
`array` 域自己还留着 `143` / `144` 这两条被吸收过却没删的条，先记在这里。

**第 796 轮的合并**（**`stdlib/round719` 整个域跨域并进 `stdlib/math` 与 `stdlib/number`：26 → 0**）：
这个域是第 719 轮**成批重抄**标准域量过的边角（`p719a-m*` 10 条问 `Math`、`p719a-n*` 16 条问
`Number`），它与 `stdlib/math`（050–056）、`stdlib/number`（074–083）**同判定点**——探针里那一句
表达式，保留条里早就量过。所以这一轮不做「域内重排」，做**跨域并账**（与第 788 轮把 7 条函数
`name` / `length` 探针并进 `exec/functions/088` 同一手法）：24 条探针的正文**逐字**搬进 15 条保留条
的文件尾（各套自己的 `show` / `t` 壳、各套一个 IIFE），另外 2 条（`m01` / `m02`）的断言
**已全在保留条里**，直接删。域内 26 条清零，目录随之消失。

| 保留条（目标） | 判定点 | 吸收（探针 · 行） |
| --- | --- | --- |
| `stdlib/math/051-math-min-max-and-abs` | `min` / `max` / `abs` 的边角 | `m10`（1–2） |
| `stdlib/math/052-math-pow-sqrt-and-roots` | `pow` / `sqrt` / `cbrt` / `hypot` | `m03`（1–2）· `m04`（1） |
| `stdlib/math/053-math-logs-exp-and-constants` | 对数 / 指数 / 常量 | `m06`（1–2）· `m08`（1–2） |
| `stdlib/math/054-math-32bit-tools` | `imul` / `clz32` / `fround` | `m04`（2）· `m05`（1–2） |
| `stdlib/math/055-math-trig-and-hyperbolic` | 三角 / 双曲 | `m07`（1–2） |
| `stdlib/math/056-math-member-names` | 名字与 `length` | `m09`（1–2） |
| `stdlib/number/074-math-and-number-statics` | `Number` 常量 | `n11`（1–2） |
| `stdlib/number/075-number-conversion-table` | `Number(x)` 转换表 | `n12`（1–3） |
| `stdlib/number/076-number-parseint-parsefloat` | `parseInt` / `parseFloat` | `n13`（1–3） |
| `stdlib/number/077-number-tostring-radix` | `toString(radix)` 与越界 | `n07`（1–3）· `n08`（1–3） |
| `stdlib/number/078-number-tostring-default` | 默认 `ToString` | `n09`（1–3） |
| `stdlib/number/079-number-tofixed` | `toFixed` 与 `digits` | `n01`（1–3）· `n02`（1–3）· `n03`（1–3）· `n04`（1–2）· `n10`（1） |
| `stdlib/number/080-number-toprecision-toexponential` | `toPrecision` / `toExponential` | `n05`（1–3）· `n06`（1–3） |
| `stdlib/number/081-number-predicates` | `Number.is*` 与浮点误差 | `n14`（1–2）· `n16`（1–2） |
| `stdlib/number/083-number-wrapper-and-negative-zero` | 包装对象与 `-0` | `n10`（2）· `n15`（1–3） |
| （不并，直接删） | — | `m01` · `m02`（断言已全在 `050` / `051` 里） |

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4850 → 4824**（净少 **26**：删 26、添 0）、
过 **4454 → 4428**；**blocked 258 / differ 138 / bad 0 一处没动**，
`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**。

**验证一次**：两个受影响的域两种口径**逐项相同** —— 批量与 `--no-batch` 都是 `stdlib/math`
**7 过**、`stdlib/number` **15 过 · differ 1**（`073-number-tolocalestring`，与这一轮无关的老账）；
并入的完整性用一把一次性的尺子（`tmp-r796-verify.mjs`）机械核对 —— 15 条保留条改后的 stdout 与
「**HEAD 那一份的 stdout ＋ 各搬入块（探针原文件的行区间）的 stdout**」**逐字节相同**
（改后 368 行 / 改前 309 行，搬入 26 块 59 行），**不一致 0 条**。

**收网扫描（亲手再过一遍）**：`stdlib/round719` 已不存在（26 条清零、`probe*` / `p-*` 命名随之清零）；
`stdlib/math` 现存 7 条（050–056）、`stdlib/number` 现存 16 条，全是 `<三位序号>-<kebab 描述>`；
本轮的 15 条保留条各自仍然只有一个判定点（搬进去的块**只加断言、不改判据**）。

**第 795 轮的合并**（**`exec/round709` 与 `exec/round711` 两个纯探针域按判定点重排：
37 → 6、25 → 2**）：两个域都是**整体一批原子探针**（`p709a/c/d-*` 35 条 + 原本就并过一次的
`001` / `002` 两条；`p711a/b/c-*` 25 条），**62 条老文件按判定点并成 8 条规则用例**，
`probe*` / `p-*` 命名清零。

| 新条 | 判定点 | 吸收 |
| --- | --- | --- |
| `exec/round709/001-function-own-property-names` | 函数对象的自有名字表与自有格：八种函数形态（声明 / 箭头 / 对象方法 / 类方法 / 生成器 / `async` / 访问器 / 类构造）、`hasOwnProperty("arguments"/"caller"/"prototype")`、`Object.keys(fn.length)`、`for..in` | `p709a-a01`…`a08` · `a12`…`a15` · `a17` · `a20`、`p709d-d04` · `d07` · `d08` |
| `exec/round709/002-restricted-arguments-caller` | 受限属性 `arguments` / `caller` 的读法（**differ**：严格那一档该抛 `TypeError`，本仓给 `undefined`） | `p709a-a09` · `a10` · `a11` · `a16` |
| `exec/round709/003-script-strict-directive-prologue` | 脚本顶层的 `"use strict"` 指令序言（**differ**）——原 `001-function-at-strict-blockin`，只改名，正文与台账一字未动 | — |
| `exec/round709/004-spread-and-iteration-of-non-iterables` | `[...x]` / `for..of` / 数组解构一个不可迭代物该抛 `TypeError`；字符串、真数组是正例 | `002-spreadastring`、`p709c-c01`…`c08` · `c10` · `c11` · `c12` |
| `exec/round709/005-array-from-array-likes` | `Array.from` 的 array-like 那一支（有 `length` 的对象与空对象） | `p709c-c06` · `c07` |
| `exec/round709/006-math-constant-descriptors` | `Math` 八个常量的描述符逐格 + 值域 + 没有取值器 | `p709d-d01` · `d02` · `d03` |
| `exec/round711/001-call-chain-then-member` | 调用链之后再取成员：下标 / 点号 / `void` / `!` / 二元位 / 实参位（第 692 轮「`o["f"]().v` 整段丢」那一条根） | `p711a-a01`…`a12`、`p711b-b01`…`b06` |
| `exec/round711/002-array-iterator-surface` | 数组 / `Map` 的迭代器表面：`Symbol.iterator` 在不在、`next` 协议、展开迭代器、`values` 是同一格、取出 `next` 再调 | `p711c-c01`…`c05` · `c07` · `c08` |

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4904 → 4850**（净少 **54**：
删 62、添 8）、过 **4508 → 4454**；**blocked 258 / differ 138 / bad 0 一处没动**，
`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**。

**验证一次**：两个域内两种口径**逐项相同** —— 批量（`--jobs 8 --batch-workers 32`）与
`--no-batch`（一条一个进程的权威口径）都是 round709 **4 过 · blocked 0 · differ 2 · bad 0**、
round711 **2 过**；合并的完整性用一把一次性的尺子（`tmp-r795-equiv.mjs`，在 `.gitignore` 的
`tmp-*` 里，没进仓）机械核对 —— 8 条保留条的 `tsrun` stdout 与「各探针 stdout 的顺次相接」
**逐字节相同**（62 条老文件、1169B），**不一致 0 条**。

**收网扫描（两个域各亲手再过一遍）**：`exec/round709` 现存 6 条、`exec/round711` 现存 2 条，
序号 001 起连续、全是 `<三位序号>-<kebab 描述>`，域内 `probe*` / `p-*` 命名 0 条；
同一判定点的薄容器重复一处没留（两条账各自独立成条：受限属性那一档、脚本顶层严格序言那一档）。

**第 794 轮（三）的合并**（**`stdlib/round718` 整个域按判定点重排：25 → 5**）：
这个域也是**纯探针域**（`p718a-h*` 15 条 + `p718b-r*` 10 条，第 718 轮补 `String.prototype`
那两个缺口时逐句量的），没有一条编号条。25 条按判定点并成 **5 条规则用例**，
`probe*` / `p-*` 命名清零。

| 新条 | 判定点 | 吸收 |
| --- | --- | --- |
| `001-html-wrapper-methods` | 十三个 HTML 包装方法**各自吐出哪一句**、属性缺实参、只转义 `"`、属性值走 `ToString` | `p718a-h01`·`h02`·`h03`·`h04`·`h15` |
| `002-trim-aliases` | `trimLeft` / `trimRight` 与正名是同一格、行为对得上 | `p718a-h10`·`h11` |
| `003-html-names-and-length-cell` | 名字表怎么登记的：十三个名字都是函数、`length` 那一格的值与描述符、这一族不进 `Object.keys` | `p718a-h09`·`h12`·`h14` |
| `004-string-receiver-and-value-length` | 字符串值自己的 `length` 与包装出来的串是两条路 | `p718a-h13`、`p718b-r09` |
| `005-string-receiver-tostring` | 接收者那一半：数值 / 布尔 / 浮点 / `-0` 都按 `ToString` 收，对象走自己的 `toString`，`null` / `undefined` / 符号抛 `TypeError`，包装对象脱箱，函数拿源码文本 | `p718b-r01`…`r08`·`r10`、`p718a-h05`·`h06`·`h07`·`h08` |

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4938 → 4918**（净少 **20**：
删 25、添 5）、判过 **4924 → 4904**、过 **4528 → 4508**；**blocked 258 / differ 138 / bad 0
一处没动**（同前两段：这三个域一条账都没有，全是 `pass`），
`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**。

**验证一次**：域内两种口径**逐项相同**（5 条全 `pass`）；合并的完整性用一把一次性的尺子
机械核对（一把把每份老文件的 stdout 拿出来、逐行到保留条里找的脚本，量完就删了，没留在仓里）
—— 5 条保留条的 stdout 与「各探针 stdout 的
顺次相接」**逐行相同**（25 条探针、77 行），**不一致 0 条**。

**第 794 轮（二）的合并**（**`runtime/round742` 整个域按判定点重排：34 → 8**）：
这个域**整体就是一批原子探针**（`p742a-*` 14 条 + `p742c-*` 20 条，第 742 轮逐句量出来的
语句语义），没有一条编号条。34 条按判定点并成 **8 条规则用例**，`probe*` / `p-*` 命名清零。

| 新条 | 判定点 | 吸收 |
| --- | --- | --- |
| `001-switch-match-semantics` | 判别式与 `case` 表达式怎么比：严格相等、`-0` / `NaN`、求值一次、走过的才求值、`switch (true)`、引用相等 | `p742a-a04`·`a05`·`a06`·`a10`·`a14`、`p742c-c03`·`c04`·`c07`·`c10` |
| `002-switch-default-position` | 没有 `default` / 只有 `default` / `default` 在中间 / 在前头 | `p742a-a02`·`a07`、`p742c-c01`·`c02` |
| `003-switch-fallthrough` | 不写 `break` 时往哪儿落：三种落法、空 `case`、空 `switch`、带条件的块 | `p742a-a01`·`a11`、`p742c-c09` |
| `004-switch-blocks-and-scope` | `case` 那一格的块作用域、闭包捕获、`var` 提升、`break lbl`、嵌套 `switch`、循环里的 `break` / `continue` | `p742a-a03`·`a08`·`a12`·`a13`、`p742c-c05`·`c06`·`c08` |
| `005-switch-return-and-throw` | `return` / `throw` 穿过 `switch` 收口 | `p742a-a09` |
| `006-loops-and-labels` | 带标签的跳转落在哪一层、循环条件求值几次（无头 `for`、`do...while` 的 `continue lbl`、`for...in` / `for...of`、带标签的块） | `p742c-c12`·`c15`·`c19`·`c20`·`c21` |
| `007-statement-boundaries` | 悬垂 `else` 归谁、空语句 `;` 算不算一条语句 | `p742c-c13`·`c14` |
| `008-try-finally-control-flow` | `try` / `catch` / `finally` 谁的话算数（与 `runtime/exceptions` 分工：那边量异常对象的形状与传播，这边量**控制流的收口**） | `p742c-c16`·`c17`·`c18` |

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **4964 → 4938**（净少 **26**：
删 34、添 8）、判过 **4950 → 4924**、过 **4554 → 4528**；**blocked 258 / differ 138 / bad 0
一处没动**（这个域也一条账都没有，全是 `pass`），`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**。

**验证一次**：域内两种口径**逐项相同**（8 条全 `pass`）；合并的完整性用同一把一次性尺子
机械核对 —— 8 条保留条的 stdout 与「各探针 stdout 的
顺次相接」**逐行相同**（34 条探针、40 行），**不一致 0 条**。

**第 794 轮的合并**（**`runtime/exceptions` 整个域按判定点重排：74 → 27**）：这个域里
**逐条一问**的 34 条原子探针（`probe3-x*` 8 条、`probe694-x*` 16 条、`probe695-x*` 10 条，
三批重抄同一个判据）与**第 692 轮按标题起名的 6 条薄容器**（`035`–`040`，名字就是那句表达式）
与**逐轮重抄**的 6 条编号条（`012`·`021`·`024`·`025`·`026`·`033`）一共 **46 条**按判定点并进
**15 条保留条**（正文一字未改、独有断言一条不丢）；`probe*` / `p-*` 命名清零，另外 **13 条
逐字节重复**直接删掉（断言本就在保留条里）。域内没有一条没被动到。

| 保留条 | 判定点 | 吸收 |
| --- | --- | --- |
| `002-exc-finally-order` | 每条出口路径上 `finally` 跑没跑、跑在谁前面（含嵌套、catch 里重抛） | `probe3-x01`·`x02`·`x04`、`probe694-x08` |
| `003-exc-finally-return` | `finally` 里 `return` 接管；返回值提前算出来 | `035`、`probe3-x15` |
| `005-exc-error-family` | 错误对象的 `name` / `message` / `toString` / `instanceof` | `probe3-x09`·`x14`、`probe694-x10`·`x11`·`x12`·`x13` |
| `006-exc-catch-rethrow-finally` | catch 里抛出去的那一抛走哪条路、`finally` 还跑不跑 | `probe694-x21` |
| `009-exc-nested-error-fields` | `instanceof` 分派准不准（自己的子类 / 内置家族 / 引擎抛的） | `probe694-x16` |
| `011-exc-catch-then-callbacks-still-run` | 接住一次之后后面的回调照旧跑完 | `probe694-x24` |
| `013-error-custom-fields` | 自己写的错误子类那几格 | `033` |
| `014-throw-in-loop-caught` | 异常离开循环之后循环变量停在哪个值 | `probe694-x05`（一半） |
| `015-throw-null-and-object` | 抛出去的值原样到达 catch，以及内置操作各抛哪一族 | `012`·`015`、`probe694-x01`·`x02`·`x03`·`x04`·`x25`、`probe695-x01`·`x07`、`probe3-x11`·`x13`、`036`–`040` |
| `016-error-fields-and-name` | `Error` 与它自带的家族 | `025` |
| `017-try-continue-finally` | `continue` / `break` 这几条路上 `finally` 跑不跑 | `probe694-x05`（一半）、`probe694-x06` |
| `020-error-propagation-forms` | 包一层之后 `cause` 挂着的是原来那个对象 | `026` |
| `022-throw-in-async-caught` | async / await 那条路上抛出来的错接得住 | `probe695-x02` |
| `030-throw-non-error` | 非 Error 的值从抛到接的整条路 | `024`·`034` |
| `032-error-cause-and-aggregate` | `cause` 自己那一格 + `AggregateError.errors` | `033`（`cause` 那一格） |

**纯重复的 13 条直接删掉**（断言在保留条里已经有了，逐条对照如下）：

| 删掉的 | 断言已经在谁那里 |
| --- | --- |
| `probe694-x22`（`try { s += "t" } catch { s += "c" }`） | `029`（`e()` 那一句，逐字节同一条） |
| `probe695-x04`·`x05`（`throw { a: 1 }` / `throw "s"` 的取字段与取长度） | `015`（`obj.code` / `str` 那一行） |
| `probe695-x03`（`new Error("m") instanceof Error`） | `005`（`fields` 那一行） |
| `probe695-x06`（`finally { return "f" }` 盖掉 catch） | `029`（`d()` 那一句） |
| `probe695-x08`（`try { n++ } finally { n++ }`） | `029`（`g()` 与 `f()` 的次序判据） |
| `probe695-x09`·`x10`（生成器 `it.next()` / `it.return()` 的 `done`） | `027`（生成器里 `try` / `finally` 与提前结束） |
| `probe3-x03`·`probe3-x04`、`probe694-x07`（`function f() { try { return 1 } finally {} }`） | `035` → 并进 `003`（三个都逐字节同一条） |
| `probe694-x23`（箭头函数里抛 Error） | `015`（`arrow-throw` 那一行） |

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **5011 → 4964**（净少 **47**：
删 74、添 27）、判过 **4997 → 4950**、过 **4601 → 4554**；**blocked 258 / differ 138 / bad 0
一处没动**（这一批里一条账都没有，全是 `pass`），`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**。

**验证一次（batch + 一条一进程的多进程口径逐条对拍）**：`runtime/exceptions` 27 条两种口径
**逐条相同**（27 条全 `pass`、`blocked 0 / differ 0 / bad 0`）；合并件与「保留条 + 被吸收 46 条」
的 stdout **逐行对得上**——这次是一条一条比出来的：**52 份老文件**（46 份被吸收的 + 6 份
保留条自己）的每一行，都在它要去的那条保留条的 stdout 里**逐字找到**，
那把一次性尺子报 **不一致 0 条**（脚本量完就删了，没留在仓里）。第一次跑它是**不一致 31 条**——
那 31 条里 27 条只是标签前缀写法的差，**4 条是真的漏了**（`throw null` 的 `String(e)`、
本地 `class E` 的 `name`、`[].reduce` 的 `TypeError`、空 `finally` 的返回值都被我在合并时
「顺手改写」掉了）——**这就是这一步非要有不可的理由：人写合并会漏，机器比对不会。**

**收网扫描（最后一道把关，人看）**：全语料按正文指纹（各尺子按自己的输入、行尾换行算正文）
再扫一遍——**同输入的同尺子组 = 0 组**（跨尺子那一档，token 的输入里带着文件头，按这个定义
永远不会相等）。**逐字节层面没有重复可去**；这一轮做的是「同一个判定点的两种写法」那一层。

**第 793 轮的合并**（**`stdlib/math` 整个域按判定点重排：93 → 7**）：这个域里 49 条编号条
（`001`–`049`）与 44 条原子探针 / 老式 `p-*`（`probe-m*` 27 条、`probe2-h*` 14 条、`p-math-*` 3 条）
本来就是**同一个判定点被逐轮重抄**（`round` 的半值方向写了十几遍），一共 **93 条**按判定点并成
**7 条规则用例**（`050`–`056`）；`probe*` / `p-*` 命名清零，域内没有一条没被动到。

| 新条 | 判定点 | 吸收 |
| --- | --- | --- |
| `050-math-rounding-and-negzero` | 取整那一族：`round` 半值向 +Infinity、`floor` / `ceil` / `trunc`、`sign`、`Object.is` 看得见的 `-0` | `001`·`006`·`010`·`022`·`024`·`025`·`026`·`027`·`028`·`035`·`039`·`041`·`042`·`047`·`049`·`p-math-negzero` + `probe-m01`·`m02`·`m04`·`m09`·`m10`·`m22`、`probe2-h01`·`h09`·`h14`·`h15` |
| `051-math-min-max-and-abs` | `min` / `max` / `abs`：空实参、NaN 传染、±0 的取舍、非数值实参 | `002`·`005`·`009`·`011`·`018`·`029`·`038`·`045` + `probe-m05`·`m06`、`probe2-h05`·`h06`·`h07`·`h12`·`h13` |
| `052-math-pow-sqrt-and-roots` | `pow` / `sqrt` / `cbrt` / `hypot` 的边界与特殊值 | `003`·`007`·`012`·`019`·`030`·`040`·`046` + `probe-m07`·`m08`·`m23`·`m24`、`probe2-h02`·`h03`·`h04`·`h10`·`h11` |
| `053-math-logs-exp-and-constants` | 对数与指数那一族，加上 `Math` 的常量 | `004`·`013`·`016`·`020`·`031`·`043` + `probe-m12`·`m13`·`m20`·`m21`·`m27`·`m28` |
| `054-math-32bit-tools` | 32 位工具：`imul` / `clz32` / `fround` | `008`·`015`·`017`·`023`·`033`·`034`·`036`·`037`·`048`·`p-math-bit-helpers`·`p-math-cbrt-fround` + `probe-m11`·`m25`·`m26` |
| `055-math-trig-and-hyperbolic` | 三角与双曲：`sin` / `cos` / `tan` / `atan2` / `sinh` / `cosh` / `tanh` / `asinh` / `acosh` / `atanh` | `014`·`021`·`032` + `probe-m14`…`m19` |
| `056-math-member-names` | 名字逐个取一次：`Math` 的成员（缺几个） | `044`（**只改名**，判定点没变） |

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **5097 → 5011**（净少 **86**：
删 93、添 7）、判过 **4997**、过 **4687 → 4601**；**blocked 258 / differ 138 / bad 0 一处没动**，
`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**。

**验证一次（batch + 一条一进程的多进程口径逐条对拍）**：`stdlib/math` 7 条两种口径**逐条相同**
（7 条全 `ok`）；合并件的 stdout 与「保留条 + 被吸收 93 条之和」**逐行相同**
（7 个合并件 / 93 份源文件，其中 `056` 是只改名那一条）。八道门全绿
（runtime:check 243、runtime:cli 79 一致、cases:tsast 已知缺口 217 条还开着 0 条收掉、
cases:check 1407 条 0 不合格、cases:tags 4748 条断言 0 不一致、cases:shapes 0 未覆盖、
samples 三份一致、coverage 4601/4997）。

**收网扫描（最后一道把关，人看）**：用第 792 轮修对的那把指纹（各尺子按自己的输入、
行尾换行算正文）再扫一遍全语料——**同输入的同尺子组 = 0 组**，跨尺子那一档按这个定义
**永远不会相等**（token 的输入里带着文件头），所以也不报。**逐字节层面没有重复可去**；
剩下的重复是「同一个判定点的两种写法」，那一层靠人看，这一轮做的就是它。

**三轮合计（第 791–793 轮）**：语料 **5251 → 5011** 个 `.ts`/`.tsx`（净少 **240**）、
判过 **5237 → 4997**、过 **4839 → 4601**；**blocked 260 → 258**（只并掉两条同根的账）、
**differ 138 三轮一处没动、bad 0**，`MOVED` / `NEWLY-PASSING` / `REGRESSION` 三轮全 0；
八道门三轮全绿。走完三个域：`stdlib/error`（93 → 13）、`exec/destructuring-spread`（81 → 10）、
`stdlib/math`（93 → 7），外加 9 条同根的账并进它们在各域的主人。

**下一步的收网面**（第 794 轮（三）之后实测，`probe*` / `p<轮次>*` / `p-*` 三档合起来算）：
**734 条**（第 794 轮（二）之后是 759、第 794 轮之后是 793、第 793 轮之后是 827、第 792 轮之后是 871），
名字里还带轮次号（`-r<轮次>`）的 **200 条**；最密的几个域是 `runtime/async`（40）、
`stdlib/console`（38）、`exec/round709`（35）、`stdlib/round719`（26）、
`exec/round711`（25）、`stdlib/symbol`（24）、`stdlib/round721`（24）、`runtime/round740`（18）
——手法与第 791–794 轮相同：
**同一个域一次走完**（先分判定点家族，再一个家族一个文件；`xl:want` 不是 `pass` 的账
**单独留档、只改名**，不许并被吸收）。
**比上一轮多出来的一条纪律（第 794 轮撞出来的，写在这里）**：合并完必须**机械核对一遍**
「被吸收的每一条的 stdout，逐行都在保留条里」——人写合并会**顺手改写**表达式
（第 794 轮第一段就这样漏了 4 条：`throw null` 的 `String(e)`、本地 `class E` 的 `name`、
`[].reduce` 的 `TypeError`、空 `finally` 的返回值），而**改写了就不叫并账，叫丢断言**。
第二、三段用的是更严的那把尺子：保留条的 stdout 必须与「各探针 stdout 的**顺次相接**」
**逐行相同**（`runtime/round742` 34 条探针 / 40 行、`stdlib/round718` 25 条探针 / 77 行，
不一致都是 0 条）。
**另外记一笔**（第 794 轮（二）量过、量完就把那把尺子删了）：`stdlib/round719`（26 条）
与功能域是同一个判定点（数值域第 793 轮刚重排过）——当时那把尺子报它 26 条里
**11 条的值已经全在 `stdlib/math` + `stdlib/number` 的池子里**、其余 15 条是更细的边角
（`Math.f16round` / `expm1` / `log1p` / `toExponential` 那些）。结论：这一类 round* 域
要先量「它的断言在功能域里有没有」——没有的并进功能域、有的直接删，别在 `round*` 里
另起一套。一把一次性的尺子不值得留在仓里，量完结论写在这里就够了。
**还有一条**：`stdlib/round718` / `exec/round709` / `exec/round711` / `stdlib/round721` /
`runtime/round737` 这几个 `round*` 域也是**纯探针域**（域内没有编号条），一次走完的收益最大
（第 794 轮（三）就是这么走完 `stdlib/round718` 的；那一族的判定点在 `stdlib/string` 里
没有对应的条，所以它是**留在自己域里按判定点并**的，不是并进功能域）。

**第 792 轮的合并**（**`exec/destructuring-spread` 整个域按判定点重排：81 → 10**）：
这个域里 48 条原子探针（`probe2-e*` / `probe693b-d*` / `probe698-d*` 三批重抄）加上
**第 783 轮改名留下的 30 条单表达式编号条**（`024`–`033` 那一片）与 1 条 `p-*` 老命名，
一共 **79 条**按判定点并成 **8 条规则用例**（`034`–`041`）；`probe*` / `p-*` 命名清零。
域里没有被吸收的只剩 `015` / `016`——那是 token 语料 `decl-arr-destructure-rest` /
`decl-obj-destructure-rest` 的**执行尺子那一侧**（跨尺子的一对，历来不算重复）。

| 新条 | 判定点 | 吸收 |
| --- | --- | --- |
| `034-spread-in-call-and-new` | 展开实参：调用 / `new` / **部分展开**（后面的形参是 undefined）/ `apply` | `001`·`004`·`008`·`011`·`014`·`023`·`033` + `probe2-e11`·`e12` |
| `035-array-literal-spread` | 数组字面量里的展开：次序 / 长度 / 字符串 / `Set` / `Map` | `019`·`021` + `probe2-e09`、`probe693b-d14`·`d18`·`d29`·`d30` |
| `036-object-spread-and-override` | 对象展开：次序即覆盖 / 符号键 / 访问器求值一次 | `003`·`017`·`018` + `probe2-e10`、`probe693b-d15`·`d16`·`d19` |
| `037-object-destructuring-forms` | 对象解构的形态：重命名 / 嵌套 / 计算键 / 简写 / 数字键 / 赋值式 / 从字符串取 `length` | `026`·`032` + `probe2-e05`、`probe693b-d05`·`d08`·`d23`·`d33`·`d34`、`probe698-d03`·`d07`·`d11`·`d15` |
| `038-object-destructuring-defaults` | 默认值只认 `undefined`、后面的默认值看得到前面的、剩余里的键不算被取走 | `020`·`029`·`p-destructure-default` + `probe2-e03`、`probe693b-d25`·`d27`·`d28`·`d32`、`probe698-d02`·`d13` |
| `039-object-rest-and-keys` | 对象剩余里还剩哪几个键（JSON 与 `Object.keys` 两个出口） | `probe2-e02`·`e13`、`probe693b-d06`、`probe698-d05` |
| `040-array-destructuring-forms` | 数组解构：洞 / 剩余 / 交换 / 默认值 / 从字符串与 `Set` 取 | `022`·`024`·`025`·`027`·`030`·`031` + `probe2-e07`·`e15`、`probe693b-d22`·`d26`·`d35`、`probe698-d04`·`d06`·`d14` |
| `041-parameter-destructuring-and-rest` | 形参位上的解构 / 默认值 / 剩余：个数、`length`、剩余是真数组 | `002`·`005`·`006`·`007`·`009`·`010`·`012`·`013` + `probe2-e06`、`probe693b-d07`·`d09`·`d12`·`d13`·`d20`·`d31`、`probe698-d10` |

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **5168 → 5097**（净少 **71**：
删 79、添 8）、判过 **5083**、过 **4758 → 4687**；**blocked 258 / differ 138 / bad 0 一处没动**，
`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**。

**验证一次（batch + 一条一进程的多进程口径逐条对拍）**：`exec/destructuring-spread` 10 条
两种口径**逐条相同**（10 条全 `ok`）；合并件的 stdout 与「保留条 + 被吸收 79 条之和」
**逐行相同**（8 个合并件 / 79 份源文件）。八道门全绿（runtime:check 243、runtime:cli 79 一致、
cases:tsast 已知缺口 217 条还开着 0 条收掉、cases:check 1407 条 0 不合格、
cases:tags 4748 条断言 0 不一致、cases:shapes 0 未覆盖、samples 三份一致、coverage 4687/5083）。

**收网扫描（最后一道把关，人看）**：这一轮把**指纹本身**修对了两处，两处都是第 791 轮误报的根因——

1. **两把尺子的「输入」不是同一个东西**：token 那一把解析的是**整份文件**（连同注释与 shebang），
   其余四把跑的是**正文**（文件头只是元数据）。第 791 轮用「正文 + 去注释行」算指纹，
   于是 `lex-bom` / `lex-comment-*` / `lex-shebang` 那五条被判成一对——它们量的**正是**注释与
   shebang 本身。改成「各按各的输入」之后它们各归各位。
2. **行尾有没有换行也算正文**：`stmt-asi-two-calls`（末字节 `0a`）与
   `stmt-eof-no-trailing-newline-call`（末字节 `29`）是两份不同的输入。

修对之后全语料 **同输入的同尺子组 = 0 组**（跨尺子那一档因为 token 的输入里带着文件头，
按这个定义**永远不会相等**，所以也不报）。也就是说：**逐字节层面已经没有重复可去**；
剩下的重复只可能是「同一个判定点的两种写法」——那一层是**人看**的活儿，这一轮做的就是它。

**下一步的收网面**（第 792 轮之后实测，`probe*` / `p<轮次>*` / `p-*` 三档合起来算）：
**871 条**（第 791 轮之后是 920、第 790 轮（三）之后是 973），名字里还带轮次号（`-r<轮次>`）的
**189 条**；最密的几个域是 `stdlib/math`（44）、`runtime/async`（40）、`stdlib/console`（38）、
`exec/round709`（35）、`runtime/exceptions`（34）、`runtime/round742`（34）、
`stdlib/round719`（26）、`exec/round711`（25）——手法与第 791 / 792 轮相同：
**同一个域一次走完**（先分判定点家族，再一个家族一个文件；`xl:want` 不是 `pass` 的账
**单独留档、只改名**，不许并被吸收）。

**第 791 轮的合并**（**`stdlib/error` 整个域按判定点重排：93 → 13**）：这个域里
**逐条一问**的 53 条原子探针（`probe-e*` / `probe697-e*` / `probe704-e-a*` 三批重抄）与
**逐轮重抄**的 28 条编号条（`002`–`036` 里同一个「错误家族的形状」被写了九遍）按判定点并成
**13 条规则用例**；`probe*` 命名清零、两个带轮次号的名字（`-r291` / `-r304` / `-r623` / `-r682`）
随小条一起消失。删 **87** 条、添 **13** 条、改名 **1** 条（`025-error-print-and-types` →
`025-error-own-keys-and-enumerable`），另有 **9** 条按「同一条根并账」并进了它们在各域的主人。

| 现存的条 | 判定点 | 吸收 |
| --- | --- | --- |
| `001-console-log-error-stack` | `console.log(Error)` 的栈**没有渲染**（differ 账） | 原样留着 |
| `004-error-engine-throws` | 引擎自己抛的错：`null` / `undefined` 上取属性、调用非函数、`[1].reduce` | `003` + `probe-e08` / `probe-e12` / `probe697-e18` / `probe697-e20` |
| `005-error-tostring-forms` | `Error.prototype.toString` / `String(err)` 的拼法（name 空串、改名、无 message） | `013`·`015`·`018`·`034` + `probe-e05` / `probe697-e12` / `probe697-e19` / `probe704-e-a08`·`a33` |
| `006-error-custom-subclass` | `extends Error` 的那一层：构造器 / 额外字段 / name / 两级继承 / 抛出来接得住 | `014`·`020`·`024`·`027`·`033`·`035` |
| `007-symbol-concat-error-family` | 符号进字符串拼接抛的是 `TypeError`（族不是笼统的 `Error`） | 原样留着 |
| `008-error-cause-chain` | `cause`：显式传了才有、链、值原样（非 Error 的 `cause` 也在） | `009`·`012`·`017`·`021`·`036` |
| `010-error-aggregate` | `AggregateError`：名字 / 消息 / `errors` 数组 | `probe704-e-a15` |
| `019-error-iserror` | `Error.isError` 的判定面（+ `bind` 的部分实参与 `super` 的 `this`） | `022` + `probe704-e-a16`…`a18` |
| `025-error-own-keys-and-enumerable` | 错误对象的自有键 / `name` 可写 / `JSON.stringify` / `propertyIsEnumerable` | 只改名 |
| `031-error-static-member-names` | `Error` 自己那一格的名表（`captureStackTrace` 等四格缺、`Error.prototype` 全齐） | `032`·`087` + `probe-e10` / `probe704-e-a23`·`a24` |
| `084-error-stack-type` | `new Error().stack` 是字符串（自有 + 不可枚举） | 原样留着 |
| `085-error-family-shapes` | 七个族的 name / message / instanceof / 原型链 / 自有格 / `AggregateError` | `002`·`011`·`016`·`023`·`026`·`028`·`029`·`030`·`089`·`090` + `probe-e02`·`e04`·`e11` / `probe697-e04` / `probe704-e-a13`·`a14`·`a34`·`a39`·`a40` |
| `088-error-message-argument-coercion` | `message` 从实参来：缺省 / 字符串 / `1` / `null` / `undefined` | `086` + `probe704-e-a35`…`a37` |

**跨域并账的 9 条**（同一个根，并进它在别域的主人，原文件保留、只往后接正文）：

- `exec/statements/075-catch-undefined-function-error-name` ← `probe-e07`
  （没声明过的名字在降级期就抛——第 783 轮已经把逐字节相同的那一条并进来了）；
- `exec/statements/078-try-catch-finally` ← `probe704-e-a29`…`a32`（`finally` 覆盖 return、次序）；
- `exec/statements/083-error-objects-in-catch` ← `probe704-e-a25`…`a27`（catch 绑定接住抛出来的东西）；
- `exec/classes/099-class-extends-builtin-blocked` ← `probe697-e16`
  （函数体 + 内建基类 ⇒ `heap object is not an environment`）。

**纯重复的 16 条直接删掉**（断言在保留条里已经有了，逐条对照如下；其余 71 条是**并进**保留条、
正文一字未改，不是删）：

| 删掉的 | 断言已经在谁那里 |
| --- | --- |
| `probe-e01`（`new Error("x").message`） | `088`（同一个表达式，只换了字面量） |
| `probe697-e02`（`new TypeError("m").name`） | `085` 吸收的 `probe-e02` |
| `probe697-e05`（`null.x` 抛的那个） | `004` 吸收的 `probe-e08` |
| `probe697-e06`（`try { null.x } catch (e) { e.constructor.name }`） | `exec/statements/069`（**逐字节同一条**） |
| `probe697-e10`（`cause: 42`） | `008` 吸收的 `036`（同一格、同一个值） |
| `probe697-e14`（`Error("x") instanceof Error`） | `085` 吸收的 `probe-e04` |
| `probe704-e-a02`·`a03`·`a04`·`a05`·`a07` | `085`（`new Error("m")` 的 name / `Error("m").message` / 两条 `instanceof` / `constructor` 都在它里面） |
| `probe704-e-a11`·`a12`（`SyntaxError` / `ReferenceError` 的 name） | `085`（同一句，换了字面量） |
| `probe704-e-a20`·`a21`·`a22`（`Error.prepareStackTrace` / `stackTraceLimit` / `length` 的 `typeof`） | `031`（逐格都在它里面） |

**这一轮撞出来的一个坑（并把法要照它办）**：把被吸收的正文裹进 IIFE 不是**无条件**等价的——
`class M extends Error { name = "…" }` 这种**没有构造函数、又带字段**的派生类，降级层只在
**模块顶层**接得上；裹进箭头体（哪怕它是 IIFE）之后**整份文件**报 `heap object is not an
environment`。所以 `008-error-cause-chain` 里 `017` 那一段**不裹壳**，按原位置排在模块顶层
（第 780 轮 `runtime/round780/r780b-04` 的八档清单量过同一件事）。被吸收的正文里只要出现
这种类，就必须走这条例外，否则台账会从 `pass` 掉成 `blocked`。

**保台账（全量批量跑，`--jobs 8 --batch-workers 32`）**：语料 **5247 → 5168**（净少 **79**：
删 92、添 13）、判过 **5154**、过 **4839 → 4758**；**blocked 260 → 258**（只并掉上面那两条
同根的账：`probe-e07` 与 `probe697-e16`，两条主人本来就已被判 `blocked`）、
**differ 138 一处没动、bad 0**，`MOVED` / `NEWLY-PASSING` / `REGRESSION` **全 0**。

**验证一次（batch + 一条一进程的多进程口径逐条对拍）**：三个被动到的域**逐条相同**——
`stdlib/error` 13 条、`exec/statements` 86 条、`exec/classes` 53 条，`Compare-Object` 差异 0。
八道门全绿（runtime:check 243、runtime:cli 79 一致、cases:tsast 已知缺口 217 条还开着 0 条收掉、
cases:check 1407 条 0 不合格、cases:tags 4748 条断言 0 不一致、cases:shapes 0 未覆盖、
samples 三份一致、coverage 4758/5154）。

**收网扫描（最后一道把关，人看）**：全语料按正文指纹（去文件头、去纯注释行与空行、去行首缩进）
扫出 **42 组同正文**，其中 **39 组是跨尺子**（token 的 AST 尺子 vs 执行尺子，历来不算重复）；
**同一把尺子里的 3 组逐条读过、全部不是重复**——`lex-bom` / `lex-comment-*` / `lex-shebang`
那五条是**五份不同的词法输入**（指纹把**注释行也当噪声去掉了**，而它们量的正是注释本身）；
`lx-shebang` vs `stmt-eof-no-trailing-newline-let` 是**有没有 hashbang**；
`stmt-asi-two-calls` vs `stmt-eof-no-trailing-newline-call` 逐字节比过**末字节**——
前者末字节是 `0a`、后者是 `29`（**没有结尾换行**），是两份不同的输入。
**结论：全语料按正文去重已经没有重复可去**（与第 790 轮（三）同结论，只是这一轮的指纹多查了
一处：**行尾换行也算正文**，否则这两个 EOF 用例会被误判成一对重复）。

**当时的下一步的收网面**（第 791 轮之后的读数，**已被第 792 轮那一节取代**）：名字里还带
轮次号（`-r<轮次>`）的 **193 条**、`probe*` / `p<轮次>*` / `p-*` 三档合起来还剩 **920 条**；
当时最密的几个域是 `exec/destructuring-spread`（48，**第 792 轮已走完**）、`stdlib/math`（41）、
`runtime/async`（40）、`stdlib/console`（38）、`exec/round709`（35）、`runtime/exceptions`（34）、
`runtime/round742`（34）——手法与第 791 轮相同：**同一个域一次走完**（先分判定点家族，
再一个家族一个文件；`xl:want` 不是 `pass` 的账**单独留档、只改名**，不许并被吸收）。

**第 790 轮（二）的合并**（**`runtime/iterators` 整个域按判定点重排**）：这个域 118 条里
**逐条一问**的原子探针（`probe693b-g*` / `probe694-g*` / `probe695-g*` / `probe696-i*` /
`probe705-i-*` 五批重抄，同一个生成器协议被写了五遍）按判定点并成 **8 条规则用例**
（`046`–`055`，其中 `054` / `055` 是**改名留档**的账，`xl:want` / `xl:why` 一字未动）。
删 **118** 条、添 **10** 条：域内 **118 → 10**、`probe*` 命名清零。

| 新条 | 判定点 | 吸收的探针 |
| --- | --- | --- |
| `046-generator-object-surface` | 生成器对象自己那一格：`typeof` / `next`·`return`·`throw` / `@@iterator` 返回自己 / 自有名表 | `033`、`025`、`probe705-i-c03`·`c07`、`probe693b-g08`·`g12`、`probe694-g18`·`g24`·`g27`、`probe695-g07`·`g10` |
| `047-generator-yield-and-next-protocol` | `yield` 与 `next()` 协议：产出值、`done` 时序、双向传值、耗尽、惰性 | `001`、`004`、`006`、`009`–`011`、`013`、`014`、`018`、`019`、`021`、`022`、`036`、`042`、`045`、`probe693b-g01`…`g03`·`g07`·`g09`·`g10`·`g24`、`probe694-g25`·`g26`、`probe705-i-c05`（25 条） |
| `048-generator-return-and-throw-injection` | `return()` / `throw()` 注入与 `finally` 清理 | `005`、`007`、`008`、`015`、`017`、`020`、`024`、`028`、`029`、`035`、`probe693b-g06`、`probe694-g03`…`g05` |
| `049-yield-star-delegation` | `yield*`：转发、内层返回值、双向传值、清理次序 | `003`、`016`、`023`、`027`、`032`、`037`、`probe693b-g05`·`g25`、`probe694-g06`·`g07`、`probe695-g06` |
| `050-forof-and-iterator-close` | `for..of` 提前退出（`break` / `return` / 抛出）调 `return()` | `012`、`026`、`031`、`034`、`038`、`041`、`probe694-g08` |
| `051-iterable-consumption-and-destructuring` | 展开 / `Array.from` / 解构与剩余元素 | `002`、`030`、`043`、`044`、`probe693b-g18`·`g19`、`probe694-g09`·`g28`·`g29`、`probe695-g02`·`g04`·`g09`、`probe696-i03`·`i07`·`i08`、`probe705-i-c04`·`c13`·`c17`…`c20` |
| `052-builtin-iterators` | 数组 / 字符串 / `Map` / `Set` 的 `entries`·`keys`·`values` 与被消费 | `probe693b-g13`…`g15`·`g21`、`probe694-g11`…`g17`·`g22`、`probe695-g05`、`probe696-i02`·`i04`·`i09`·`i10`、`probe705-i-c02`·`c09`…`c11` |
| `053-custom-iterable-protocol` | `Symbol.iterator` 查表与迭代器对象 | `probe693b-g16`·`g17`、`probe694-g02`·`g19`·`g30`、`probe696-i06` |
| `054` / `055-…-differ` | `for..of` 期间改 `Map` / `Set` 的形状（**账**） | `039` / `040`（各 1 条，改名留档） |

**两种口径对拍**：`--category runtime --filter iterators/` 批量与 `--no-batch`
（一条一个进程的权威口径）**逐项相同**：**10 条判过 · 8 过 · blocked 0 · differ 2 · bad 0**。
并之前先把 116 条原件的 `node` stdout 落盘，再对**盘上最终那一份**合并件复核：
8 个合并件的 stdout 逐行等于其原件 stdout 的拼接（全 ✓）。

**第 790 轮的合并**（**`exec/round708` 整个域按判定点重排**）：这个轮次目录里 **81 条全是**
逐条一问的原子探针（`p708a-c*` / `d*` / `f*` / `p*` 与 `p708b-j*` / `l*` / `n*` / `s*`，
八批各问一件事），按判定点并成 **46 条规则用例**（`001`–`046`，每条一个判定点族；
`032` / `033` / `040` 是**改名留档**的账，`xl:want` / `xl:why` 一字未动）。
删 **81** 条、添 **46** 条：域内 **81 → 46**、`probe*` 命名清零。

| 新条 | 判定点 | 吸收的探针 |
| --- | --- | --- |
| `001-class-object-shape` | 类对象自己那一格：`name` / `length` / `prototype` 与方法自己的 `name` / `length` | `c01`、`c02`、`c05` |
| `004-this-binding-in-methods` | 方法的 `this`：静态与实例、取出之后丢失、IIFE 里 | `c04`、`c13`、`f06` |
| `005-class-fields-and-statics` | 字段的落点与次序：静态 / 实例 / 初始化先后 / 原型上没有 | `c06`、`c12`、`c14` |
| `007-class-private-members` | 私有成员：品牌检查与 `#x in o` | `c08`、`c09` |
| `010-object-destructuring-and-defaults` | 对象解构：缺省 / 重命名 / 嵌套 / 计算键 | `d01`、`d02`、`d04`、`d12` |
| `012-destructuring-assignment-targets` | 解构赋值的落点：交换与成员目标 | `d05`、`d09` |
| `013-rest-and-default-parameters` | 剩余参数与形参默认值 | `d10`、`d11` |
| `014-spread-of-objects-and-iterables` | 展开：对象的次序与覆盖、可迭代物的展开 | `d06`、`d07`、`d08` |
| `015-call-apply-bind` | `call` / `apply` / `bind` 的 `this` 与部分实参 | `f01`、`f02` |
| `017-function-declarations-and-expressions` | 函数声明的提升与具名函数表达式的自引用 | `f04`、`f05` |
| `018-function-source-text-and-arity` | 函数的源码文本与形参个数 | `f07`、`f08` |
| `019-optional-chaining-and-call-chains` | 可选链的短路边界与调用链 | `p01`…`p03`、`p05`、`p06` |
| `021-comma-and-comparison-chains` | 逗号运算符与比较链 | `p07`、`p08` |
| `022-json-stringify-value-shapes` | 值的形状：`undefined` / 函数 / 符号 / 洞 / 不可枚举 | `j02`、`j03`、`j08` |
| `025-json-parse-and-reviver` | `reviver` 与两个方向的往返 | `j05`、`j07` |
| `027-console-rendering-of-objects-and-arrays` | 对象与数组形状、多实参分隔 | `l01`、`l02`、`l11` |
| `028-console-rendering-of-primitives` | 原始值渲染：字符串引号 / 数字 / 特殊值 | `l03`、`l04`、`l05` |
| `031-console-rendering-of-strings-and-accessors` | 换行与访问器**不求值** | `l10`、`l12` |
| `034-float-precision-and-safe-integers` | 浮点精度与安全整数范围 | `n01`、`n02` |
| `037-number-parsing-and-literals` | 数值文本：字符串解析与进制 / 指数字面量 | `n05`、`n06` |
| `038-tofixed-and-math-round` | `toFixed` 的取舍与 `Math.round` 的半值方向 | `n07`、`n08` |
| `039-string-replace-and-repeat` | `replace` / `replaceAll` 的差别与 `repeat` / `pad` 的边界 | `s02`、`s06` |
| `042-string-to-number-coercion` | 字符串到数字与数字到字符串 | `s05`、`s09` |

（其余各条吸收 1 条同判定点的探针：`002`←`c03`、`003`←`c15`、`006`←`c07`、`008`←`c11`、
`009`←`c10`、`011`←`d03`、`016`←`f03`、`020`←`p04`、`023`←`j01`、`024`←`j04`、`026`←`j06`、
`029`←`l06`、`030`←`l07`、`032`←`l08`（账）、`033`←`l09`（账）、`035`←`n03`、`036`←`n04`、
`040`←`s03`（账）、`041`←`s04`、`043`←`s07`、`044`←`s08`、`045`←`s10`、`046`←`s01`。）

**两种口径对拍**：`--category exec --filter round708/` 批量与 `--no-batch`
（一条一个进程的权威口径）**逐项相同**：**46 条判过 · 43 过 · blocked 0 · differ 3 · bad 0**
（三条 differ 就是账 `032` / `033` / `040`，与并之前逐条相同）。
并出来的每一条都用两个出口（`node` 与 `tsrun`）核过：stdout **逐行等于**「保留条 + 被吸收的各条」
原来那条之和（唯一的例外是 `033`：栈里带着**本文件的行号**，而账只问「本仓不打栈」）。

**两域合计**：语料 **5437 → 5294** 个 `.ts`（净少 **143**：删 199、添 56）、判过 **5427 → 5284**；
**blocked 260 / differ 138 / bad 0 一处没动**（合并只去重复、不改判据），
`MOVED` / `NEWLY-PASSING` / `REGRESSION` 全 0。八道门全绿；
`cases:check` 1407 条 0 不合格、`cases:tags` 4748 条断言 0 不一致。

**第 790 轮（二）：`gap-*` 老语料进整理范围——查重、同根并账、按规范改名**。
口径先说清楚，因为这一族与前几轮的 `probe*` **不是同一种东西**：

- **`probe*` 是同一判定点被逐批重抄** ⇒ 能去重（分母里的水）。
- **`gap-*` 是「还没实现」的账**（`xl:known-gap`），**一条一个落点**。这一轮把 191 条
  `gap-*` 的**正文逐条比对**：**191 条正文互不相同，重复组 0 组**
  （`gap-sweep-<sep>/<feature>-NN` 的 NN 是落点序号，不是批次号——
  同一个 feature 下 `01`/`02`… 各是**另一种排版**，`xl:known-gap` 那一行的差额各不相同）。
  ⇒ **没有重复可去**，删任何一条都是把缺口藏起来。
- 所以这一族做的是**另外三件事**：**同名根的账并成一条**、**名字里的轮次号去掉、
  按 `<序号>-<描述>[-blocked|-differ]` 命名**、**把同族的守卫并进账里**。
- **判定力只增不减**：并账时把「同一族里当场是对的」那些探针一起收进账（守卫留在文件里），
  而**账的条数只减不增**：`differ` / `blocked` 的总数两轮下来**一处没动**（260 / 138）。
- **token 那 186 条 `gap-sweep-*` 原样留着**（名字不动）：它们是 **AST 尺子**的逐落点账，
  每个文件是**独立一次对拍**；把它们拼进一个文件会把「一文件一处差额」摊成一次大对拍，
  读数反而更粗（这正是本轮不做的那个取舍）。

| 新条 / 改名 | 判定点 | 吸收的落点 |
| --- | --- | --- |
| `stdlib/round745/001-flat-depth-argument-slot-differ` | `flat` 的深度实参落格：同句里另一个字面量把这一格顶掉（**账**） | `gap745-flat-infinity-argument-slot`（同一条根的反方向）+ `gap745-float-literal-eats-nan` + `p745a-a02`（`ToNumber` 那一档是对的，当守卫） |
| `runtime/round746/001-generator-return-and-throw-protocol` | 生成器 `return` / `throw` 协议：没跑过 / 跑了一半 / `finally` 链 / `yield*` 委托 | `p746a-a01` + `p746a-a02`（同一个判定点族） |
| `runtime/round746/002-forof-early-exit-not-lazy-differ` | `for..of` 提前退出不惰性（**账**） | `gap746-forof-early-exit-not-lazy`（只改名） |
| `runtime/round747/002-promise-chain-microtask-order-differ` | 两条互不相干的承诺链同时飞时的微任务次序（**账**） | `gap747-promise-chain-order` + `p747a-a05`（每条链单独跑都对——守卫并进账） |
| `stdlib/round746/001-array-accessor-out-of-range-enumerable-differ` | 越界下标访问器的可枚举性（**账**） | `gap746-array-accessor-out-of-range-enumerable`（只改名） |

读数的净变化：语料 **5294 → 5290**（净少 **4**：删 7、改 3 个名、添 3 条——其中
`stdlib/round745` **11 → 9**、`runtime/round746` **3 → 2**、`runtime/round747` **13 → 12**、
`stdlib/round746` **7 → 7**（只改名））；**blocked 260 / differ 138 / bad 0 一处没动**。
四个域的两种口径对拍**逐项相同**（域内读数：1/2 · 11/12 · 8/9 · 6/7，各域一张账原样）。
这条规矩写进下面「命名」那一节：**`gap-` 只在 `token/` 里是前缀（AST 尺子的已知缺口），
其余类别里 `gap` 一律不进文件名**（轮的号进 `xl:round`，性质进 `xl:want`）。

**三轮合计（第 790 轮全程）**：语料 **5437 → 5247** 个 `.ts`（净少 **190**）、
判过 **5427 → 5237**、过 **5029 → 4839**；
**blocked 260 / differ 138 / bad 0 三轮一处没动**，`MOVED` / `NEWLY-PASSING` / `REGRESSION` 全 0；
八道门三轮全绿（最后一趟：runtime:check 243、runtime:cli 79 一致、cases:check 1407 条 0 不合格、
cases:tags 4748 条断言 0 不一致、cases:tsast 已知缺口 217 条还开着 0 条收掉）。

**第 790 轮（三）：`exec/iterators` 按判定点重排 + 全语料的收网扫描**。

**`exec/iterators` 60 → 17**（删 52、添 9，`probe*` 命名清零；域内两条口径对拍**逐项相同**：
**17 条判过 · 17 过 · blocked 0 · differ 0 · bad 0**）。这个域里 52 条原子探针
（`probe700-i-e*` 43 条 + `probe700-i-t*` 7 条 + `probe-y*` 7 条之类）本来就是
**一条一个表达式**，按判定点并成 9 条规则用例：

| 新条 | 判定点 | 吸收的探针 |
| --- | --- | --- |
| `009-array-spread-and-iterable-spread` | 数组 / 字符串 / 可迭代物的展开与 `Array.of` | `e01`·`e03`·`e05`·`e15`·`e19`·`e38`·`e43`·`e44`·`e45`、`y13` |
| `010-collection-spread-set-and-map` | 集合展开：`Set` 去重、`Map` 的 `entries` / `values` / `keys` | `e02`·`e34`·`e35`·`e40` |
| `011-array-from-iterables` | `Array.from` 与它的 mapper / 类数组 | `e04`·`e06`·`e07` |
| `012-generator-yield-and-next-protocol` | 生成器 `yield` / `next` / `done` / `yield*` / `return` 清理 / `throw` 注入 | `e08`·`e09`·`e10`·`e27`·`e28`·`e29`、`t01`·`t03`·`t07`、`y10`·`y12`·`y14` |
| `013-generator-object-surface` | 生成器对象自己那一格：`Symbol.iterator`、`next` / `return` 的形状 | `e11`·`e12`·`e13`·`e30`、`y15`·`y16` |
| `014-forof-and-interior-mutation` | `for..of`：解构 / 内建迭代器 / 提前退出调 `return()` / 迭代器的值 | `e14`·`e24`·`e25`·`e26`·`e41`、`t02`·`t04`·`t05` |
| `015-custom-iterable-protocol` | 自定义可迭代物：`Symbol.iterator` 的两种写法 | `e36`·`e37` |
| `016-destructuring-and-arguments` | 解构（默认值 / 剩余 / 内建迭代器）与实参展开 | `e21`·`e22`·`e23`·`e39`、`t06` |
| `017-builtin-foreach-accumulation` | `Set` / `Map` 的 `forEach` 累加 | `e32`·`e33` |

**收网扫描（最后一道把关）**：把**整个语料 5294 条**按**正文指纹**（去掉空行与行首缩进后
逐行相同）扫了一遍——**35 组同正文**，其中 **33 组是「同一份 source 走两把尺子」**
（`token/` 的 AST 尺子与 `exec/` 的执行尺子各一条），按第 784 轮定的口径**不是重复**、
原样留着；**同类别里的 2 组**是：
`token/lexical/empty-file` 与 `lex-only-whitespace`（**空文件 vs 只有空白**，词法输入不同）、
`token/statements/stmt-asi-two-calls` 与 `stmt-eof-no-trailing-newline-call`
（**ASI 两行 vs 末行没有换行**，ASI 的边界不同）——两组都是**不同的判定点**，也留着。
**结论：全语料按正文去重已经没有重复可去**。

**当时的下一步的收网面**（第 790 轮（三）之后的读数，**已经被第 791 轮那一节取代**：
`stdlib/error` 那一格当轮走完了，剩下的最新名单见上面第 791 轮）：`probe*` 命名还剩 **973 条**，最密的几个域是
`stdlib/error`（53）、`exec/destructuring-spread`（49）、`stdlib/math`（44）、
`runtime/async`（40）、`stdlib/console`（38）、`exec/round709`（35）、
`runtime/round742`（34）、`runtime/exceptions`（34）、`stdlib/round719`（26）——
手法与第 790 轮相同：**同一个域一次走完**（先分判定点家族，再一个家族一个文件；
`xl:want` 不是 `pass` 的账**单独留档、只改名**，不许并被吸收）。


**第 789 轮（三）的合并**（**`exec/statements` 按判定点重排**）：这个域 172 条里有 **96 条**
`probe*` 命名（第 692 / 693 / 698 / 701 四批重抄：`probe2-c*` / `probe693b-s*` / `probe698-e*` /
`probe701-c-e*`，光 `switch` 就被测了四遍）。按判定点并成 **10 条规则用例**——删 **96** 条、添 **10** 条：
语料 **5527 → 5441**、判过 **5513 → 5427**、过 **5115 → 5029**（净少 **86**），
**blocked 260 / differ 138 / bad 0 一处没动**，`MOVED` / `NEWLY-PASSING` / `REGRESSION` 全 0。
域内 **172 → 86**、`probe*` 命名清零。

| 新条 | 判定点 | 吸收的探针 |
| --- | --- | --- |
| `statements/076-loop-forms-and-labels` | 循环与标签：`for` / `while` / `do-while`、`continue` / `break` 与带标签的跳转 | `p-label-continue`、`probe2-c03·c12`、`probe693b-s01·s02·s03·s07…s11·s19·s38·s39·s40·s45`、`probe698-e04·e05·e10`、`probe701-c-e04·e05·e06·e10·e31·e32·e37·e39`（27 条） |
| `statements/077-switch-statements` | `switch`：穿透 / `default` 的位置 / 严格相等 / 标签 `break` | `p-switch-default-middle`、`probe2-c07`、`probe693b-s12·s13·s15·s26`、`probe698-e07`、`probe701-c-e01·e02·e03·e30·e36` |
| `statements/078-try-catch-finally` | `try` / `catch` / `finally`：返回值的覆盖、`finally` 与 `continue`·`break` 的次序、不绑名的 `catch` | `probe2-c02·c09·c10·c11·c14·c15`、`probe693b-s16·s17·s18`、`probe698-e02·e08·e09`、`probe701-c-e07·e08·e09·e14·e27·e29·e35·e38` |
| `statements/079-labeled-statements` | 带标签的语句：块 / `if` / `while` / `try` / `switch` / `for-of` / `do-while` 上的 `break` | `probe693b-s20…s29`、`probe701-c-e11` |
| `statements/080-comma-and-empty-statements` | 逗号表达式与空语句（含块级遮蔽与 `var` 提升） | `probe693b-s32…s37·s41·s42·s44` |
| `statements/081-for-in-and-for-of` | `for-in` 与 `for-of`：键的次序、原型链上的可枚举、字符串按码位 | `probe2-c06`、`probe693b-s04·s05·s06`、`probe701-c-e19…e23` |
| `statements/082-callback-and-generator-bodies` | 语句位上的回调与生成器 | `probe701-c-e24·e25·e26·e33` |
| `statements/083-error-objects-in-catch` | `catch` 里的错误对象那一格 | `probe701-c-e15·e18·e40` |
| `statements/084-switch-case-block-blocked` | `case` 后面跟一个裸块（账） | `probe693b-s14` |
| `statements/085-block-function-hoisting-differ` | 块里函数声明的提升（账） | `probe693b-s30` |

**两种口径对拍**：`--category exec --filter statements/` 批量与 `--no-batch`
（一条一个进程的权威口径）**逐项相同**：**86 条判过 · 82 过 · blocked 3 · differ 1 · bad 0**
——域内两张账的**条数**与并之前逐项相同：这一域本来就有一条 blocked 与一条 differ，
被吸收的那 96 条里另有一条 blocked（`s14`）与一条 differ（`s30`），
它们各并成一条同根账（`084` / `085`），合计仍是 3 条 blocked、1 条 differ。八道门全绿。

**第 789 轮（二）的合并**（**`stdlib/map-set` 与 `stdlib/string` 两个域按判定点重排**）：
`map-set` 248 条里有 **113 条** `probe*` / `p-map-*`（692 / 693 / 694 / 696 / 703 / 705 六批重抄），
`string` 298 条里有 **111 条**（同一个域里 `probe693-y*` / `probe700-g-e*` / `probe703-s-e*` 逐批重抄）。
按判定点并成 **17 条规则用例**——删 **224** 条、添 **17** 条：
语料 **5720 → 5527**、判过 **5706 → 5513**、过 **5317 → 5115**（净少 **202**）。
两个域的目录读数：`map-set` **248 → 144**、`string` **298 → 195**，两个域里 `probe*` 命名清零。

**台账的两处净变化都是「同根合并」的结果，逐条可查**（不是新缺口，也不是缺口消失）：

- **blocked 263 → 260**：`string` 里四条**同一条根**的正则字面量探针
  （`probe696-s02` / `probe696-s05` / `probe703-s-e33` / `probe704-s-e12`）并成
  `145-regex-literal-blocked` 一条账（4 → 1）。
- **differ 140 → 138**：`string` 里三条 `String.prototype.match` / `matchAll` / `search` 探针
  （`probe703-s-e36` / `e37` / `e38`）并成 `146-string-proto-regex-methods-differ`（3 → 1）；
  另有 `stdlib/map-set/probe703-m-d10` → `143-map-internal-payload-visible-differ`（1 → 1）、
  `string/probe693-y29` → `144-localecompare-differ`（1 → 1）**原样保留**。
- **与本次无关的 blocked / differ 集合逐项相同**（判据：把两轮的删除名单与新增文件从两个名单里
  各自扣掉再比），`MOVED` / `NEWLY-PASSING` / `REGRESSION` / `bad` 全 0。

| 新条 | 判定点 | 吸收的探针 |
| --- | --- | --- |
| `map-set/136-map-instance-methods` | `Map` 的实例方法：`get` / `set` / `has` / `delete` / `clear` / `size` 与返回值 | `p-map-identity-key`、`p-map-nan-key`、`p-map-negzero-key`、`probe-g14`、`probe3-m09`、`probe693-m05`、`probe693-m16`、`probe694-map02·map03`、`probe696-m07·m11·m12·m13·m14·m22`、`probe703-m-d12·d13`、`probe705-m-d06·d10·d11·d15·d19` |
| `map-set/137-set-instance-methods` | `Set` 的实例方法：`add` / `has` / `delete` / `clear` / `size` 与返回值 | `p-set-nan-dedupe`、`probe-g05·g07·g09`、`probe3-m04·m11·m15·m16·m20`、`probe694-map19`、`probe696-m15·m17`、`probe703-m-d11·d21`、`probe705-m-d07·d09·d16` |
| `map-set/138-key-identity` | 键的同一性：`NaN` / `-0` / 对象 / 布尔 / `null` / `undefined` 与字符串键不相等 | `probe-g03`、`probe3-m10`、`probe693-m02·m03·m13·m17·m18·m19·m21`、`probe694-map05·map06·map07·map13·map14·map16`、`probe696-m16·m18`、`probe703-m-d27` |
| `map-set/139-iteration-and-entries` | 三种遍历与展开：`keys` / `values` / `entries`、`forEach` 的三个实参、`for..of` 解构 | `p-map-entries-spread`、`p-map-foreach-args`、`probe3-m01·m02·m03·m07·m08·m14·m19`、`probe693-m04·m07…m12·m20·m22`、`probe694-map08·map09·map11·map12·map20`、`probe696-m02·m03·m04·m08·m09·m10·m19·m24`、`probe703-m-d16`、`probe705-m-d03·d04·d12·d17·d18` |
| `map-set/140-construct-from-iterables` | 从可迭代物构造：数组 / 字符串 / 另一个 `Map` / `Object.entries` | `probe3-m17`、`probe693-m06·m15·m25`、`probe694-map15·map17`、`probe696-m01·m06`、`probe705-m-d08` |
| `map-set/141-prototype-and-tostring` | 集合族自己那一格：`prototype` / `constructor` / `instanceof` / `toString` | `p-map-tostring`、`probe3-m12`、`probe696-m20·m21`、`probe703-m-d19·d20·d29·d30` |
| `map-set/142` / `144` | `WeakMap` 那一格、`Set.clear()` 之后 `size` | `probe3-m18`、`probe3-m05` |
| `map-set/143-map-internal-payload-visible-differ` | `Map` 的内部载荷是可见的自有属性（账） | `probe703-m-d10` |
| `string/140-method-argument-coercion` | 字符串方法的实参强制转换：`ToString` / `ToIntegerOrInfinity` 与缺省实参 | `p-str-split-limit`、`p-str-split-empty`、`probe694-y05·y06·y07`、`probe699-s-e35·e39·t07…t10`、`probe696-s03`、`probe700-g-e01…e45`、`probe700-g-t03·t04·t05`、`probe703-s-e29`、`probe705-s-g02·g10`（61 条） |
| `string/141-string-coercion-and-boxing` | `String(...)` 与包装对象：值到字符串、`String` 对象那一层 | `probe693-y39·y40·y43`、`probe694-y12…y19`、`probe703-s-e32`、`probe704-s-e01·e03·e04·e05` |
| `string/142-indexing-and-code-units` | 下标与码元：越界 / `fromCodePoint` / 代理对 / `Symbol.iterator` | `p-str-astral`、`p-str-at-negative`、`p-str-charcodeat-nan`、`p-str-indexof-from`、`probe693-y34`、`probe695-y11·y15·y17`、`probe699-s-e38`、`probe703-s-e18`、`probe704-s-e07·e26·e28` |
| `string/143-split-replace-and-pad` | 切分 / 替换 / 填充：`split` 与 `limit`、`replace` 的 `$&`、`padStart` 与 `padEnd` | `p-str-padstart`、`p-str-replace-dollar`、`p-str-replaceall`、`probe693-y01`、`probe696-s22` |
| `string/144-localecompare-differ` | `localeCompare` 是区域设置那一族（账） | `probe693-y29` |
| `string/145-regex-literal-blocked` | 正则字面量还没进语法层（账） | `probe696-s02·s05`、`probe703-s-e33`、`probe704-s-e12` |
| `string/146-string-proto-regex-methods-differ` | `String.prototype` 上那三个接正则的方法没装（账） | `probe703-s-e36·e37·e38` |
| `string/147-string-misc-and-edge` | 其余边角：`repeat` 的边界、`localeCompare` 的一般档 | `p-str-localecompare`、`p-str-repeat-edge`、`probe699-s-e48·e49`、`probe703-s-e30`、`probe704-s-e22` |

**两种口径对拍**：`--filter map-set/` 与 `--filter string/`，批量与 `--no-batch`
（一条一个进程的权威口径）**逐项相同**：`map-set/` **144 条判过 · 140 过 · blocked 1 · differ 3**、
`string/` **195 条判过 · 184 过 · blocked 6 · differ 5 · bad 0**。八道门全绿。

**第 789 轮的合并**（**`exec/functions` 与 `exec/round706` 两个域按判定点重排**）：这两个域是
**同一个手法还没走过的地方**——`exec/functions` 268 条里有 **165 条** `probe*` 命名
（第 692 / 693 / 700 / 701 / 703 / 705 六批逐条一问重抄的原子探针），`exec/round706` 129 条里有 **125 条**
（`p706a/b/c/d/e/f-*`：同一个域里 `a` / `b` / `c` 三批把数组的洞、键序、`defineProperty` 各测了三遍）。
按判定点并成 **23 条规则用例**——删 **290** 条、添 **23** 条：
语料 **6001 → 5720**、判过 **5987 → 5706**、过 **5584 → 5317**（净少 **267**），
**blocked 263 / differ 140 / bad 0 一处没动**，`MOVED` / `NEWLY-PASSING` / `REGRESSION` 全 0。
两个域的目录读数：`exec/functions` **268 → 115**、`exec/round706` **129 → 15**，两个域里 `probe*` / `p-*` 命名清零。

| 新条 | 判定点 | 吸收的探针 |
| --- | --- | --- |
| `functions/116-function-length-and-name` | 函数自己那两格：`length` 数到第一个默认值 / 剩余参数、`name` 的推断与 `bind` 前缀 | `p-rest-param`、`probe-f05`、`probe693b-f11·f27·f28·f29`、`probe700-f-e07·e08·e09·e13·e40`、`probe703-f-g06·g07·g08·g18`、`probe705-t-a17·a23·a25·a26` |
| `functions/117-function-prototype-toString` | `Function.prototype.toString` 与函数自己那一份源码文本（含内建那一档的账） | `probe703-f-g22`、`probe705-t-a01…a13·a33·a34·a35·a36·a38·a39·a40` |
| `functions/118-function-own-shape` | 函数对象自己那一格：`prototype` / `constructor` / `call.length` / 自有名表 / 标签 | `probe-f07`、`probe693b-f12·f14·f26`、`probe700-f-e38·e41`、`probe703-f-g13·g15·g20·g27·g28·g30`、`probe705-t-a30·a32·a37` |
| `functions/119-this-binding-basics` | `this` 的绑法：裸调用 / 方法 / 摘出来 / `call`·`apply`·`bind` / 箭头 | `probe-f09…f12`、`probe3-s18`、`probe3-t01…t15` 里 13 条、`probe693b-f01·f04·f05·f06·f08·f16…f19·f24·f25`、`probe700-f-e23…e25·e33·e34·e39·e42…e45·t02·t04`、`probe703-f-g10·g11·g12` |
| `functions/120-strict-mode-and-module-this` | 严格模式指令的位置与模块顶层的 `this` | `probe701-s-t01…t10` |
| `functions/121-arguments-object` | `arguments` 的长度 / 下标 / 来源 / 与形参的别名 | `probe-f14`、`probe3-t11·t12`、`probe693b-f02·f03·f10·f30`、`probe700-f-e18·e19·e48·e50·t05`、`probe703-f-g25` |
| `functions/122-new-and-new-target` | `new` 与 `new.target` 的取值 | `probe-f13`、`probe700-f-e22` |
| `functions/123-hoisting-scope-blocks` | 提升与作用域：函数 / `var` / `let`、块与闭包 | `probe3-s01…s20` 里 17 条、`probe700-f-e26·e28…e32·t06` |
| `functions/124-arrow-and-default-params` | 箭头函数与形参默认值（解构 / 求值次序 / 默认值里的 TDZ） | `probe700-f-e01…e06·e14…e17·e35·e36·e49·t01·t03·t07`、`probe693b-f20·f21` |
| `functions/125-function-constructors-and-eval-globals` | `eval` 全局名（账） | `probe-f18` |
| `functions/126` / `127-new-function-construct*-differ` | 运行期造函数 `new Function(...)`（同一处根，两条账） | `probe693b-f13`、`probe703-f-g09` |
| `round706/005-sparse-arrays-and-holes` | 数组的洞与长度：赋值 / `defineProperty` / 访问器那一格、几种名表、`length` 的描述符 | `p706a-a01·a03·a04·a05`、`p706c-x01…x10`、`p706d-y01…y08`、`p706e-z01…z08`、`p706f-w01…w06`（34 条） |
| `round706/006-key-order-and-delete` | 键的次序与 `delete`：整数键 / 字符串键 / 符号键 | `p706a-k01…k06`、`p706b-e01…e07`、`p706c-x14…x18` |
| `round706/007-defineproperty-and-key-coercion` | `defineProperty` 与键的强制转换（含对象键那一档的账） | `p706a-o11…o16`、`p706b-d01…d08`、`p706c-x11` |
| `round706/008-accessor-members-and-enumerability` | 访问器成员与可枚举性：`__lookupGetter__` / `__defineGetter__` / `enumerable` | `p706a-o09`、`p706b-g01…g08`、`p706c-x19…x27`、`p706d-y04`、`p706a-p06` |
| `round706/009-freeze-seal-preventextensions` | 冻结 / 密封 / 不可扩展 | `p706a-o01·o03…o08` |
| `round706/010-globals-and-native-constructors` | `globalThis` / `Object()` / `Array()` / 原始值的原型 | `p706a-f03·f04·f05`、`p706a-p01…p05` |
| `round706/011-symbol-surface` | `Symbol` 的面：`for` / `keyFor` / `description` / `toStringTag` | `p706a-s01…s05` |
| `round706/012-json-stringify-and-parse` | `JSON` 两格的值形状与边界 | `p706a-j01…j06` |
| `round706/013-date-shapes` | `Date` 的形状 | `p706a-d01…d04` |
| `round706/014-class-member-shapes` | 类成员那一格：访问器 / 静态 / 计算键 / 继承与 `super` | `p706a-c01…c08` |
| `round706/015-functions-and-this` | 函数裸调用的 `this`（严格 / 松散） | `p706a-f01·f02` |

**并法沿用前几轮，但这一轮多了一步自查**：每条探针的正文**逐字搬进一个自己的 IIFE**
（`(() => { … })();`）——IIFE 既是作用域（同名声明互不打架）、又保证 `this` 仍从模块那一层取；
探针各自抄的那两行小壳（`const show = …` / `const run = …` / `const probe = …`）
**只在它与文件头那几行逐行一致时**才摘掉：**不是正则猜**——`const show = (v) => …` 与探针正文里
自己的箭头函数长得一样，猜会把断言一起删掉（这一步实测踩过一次）。
**对拍**：新文件与**原来那 290 条**逐条比 stdout（`node` 与 `tsrun` 各跑一遍）——
**逐行相同**；其中 8 条本来就是 `differ` 的账，两口径不一致是应该的，新文件里原样保留。

**两种口径对拍**：`--filter functions/` 与 `--filter round706/`，批量与 `--no-batch`
（一条一个进程的权威口径）**逐项相同**：`functions/` **141 条判过 · 129 过 · blocked 0 · differ 12**、
`round706/` **15 条判过 · 14 过 · blocked 1 · differ 0 · bad 0**。八道门全绿；
runtime:check 243 条、runtime:cli 79 份一致、cases:check 1407 条 0 不合格、cases:tags 4748 条断言 0 不一致。

**下一步的收网面（写在这里，别再翻一遍语料找）**：`probe*` 命名还剩 **1183 条**，最密的几个域是
`exec/round708`（81 条）、`runtime/iterators`（73 条）、`stdlib/error`（53 条）、
`exec/iterators`（52 条）、`exec/destructuring-spread`（49 条）、`stdlib/math`（44 条）、
`runtime/async`（40 条）、`stdlib/console`（38 条）、`exec/round709`（35 条）、
`runtime/exceptions`（34 条）、`runtime/round742`（34 条）、`stdlib/round719`（26 条）——
手法与这一轮相同：**同一个域一次走完**
（先分判定点家族，再一个家族一个文件；只有逐字节相同的正文才算同一条）。

**第 788 轮（三）的合并**（**`exec/round710` 整个域按判定点重排**）：这个轮次目录里 31 条
**逐条一问**的原子探针（`p710a-*` / `p710c-*` / `p710d-*`）按判定点并成 **3 条规则用例**
（`002`–`004`，与原有的 `001-arrayiterator-no-next` 一起共 4 条）。删 **31** 条、添 **3** 条：
语料 **6029 → 6001**、判过 **6015 → 5987**、过 **5612 → 5584**（净少 **28**），
**blocked 263 / differ 140 / bad 0 一处没动**，`MOVED` / `NEWLY-PASSING` / `REGRESSION` 全 0。

| 新条 | 判定点 | 吸收的探针 |
| --- | --- | --- |
| `002-this-binding-and-boxing` | `call` / `apply` / `bind` 的原始值接收者、严格与松散、箭头与类方法、装箱后的标签与取值 | `p710a-a01`…`a15` |
| `003-iterators-and-generators` | Map 条目 / Set 展开 / `forEach` 次序、生成器的 `return` 与标签、`async` 函数的形状 | `p710c-c01`、`c03`…`c10`、`c12` |
| `004-arguments-and-function-shape` | `arguments` 的长度与取值、箭头没有自己的、严格与松散、函数自有名表 | `p710d-d01`…`d06` |

**两种口径对拍**：`--category exec --filter round710/` 批量口径与 `--no-batch` **逐项相同**：
**4 条判过 · 4 过 · blocked 0 · differ 0 · bad 0**。八道门全绿。

**第 788 轮（二）的合并**（**整个 `exec/round707` 按判定点重排**）：这个轮次目录里 116 条
**逐条一问**的原子探针（`p707a-*` / `p707b-*` / `p707c-*` / `p707d-*`）按判定点并成 **11 条规则用例**
（`001`–`011`，其中 `006` 是 `Array.isArray` 那一族的 blocked 账，**改名留档**、
`xl:want` / `xl:why` 一字未动）。删 **116** 条、添 **11** 条：语料 **6134 → 6029**、
判过 **6120 → 6015**、过 **5717 → 5612**（净少 **105**），
**blocked 263 / differ 140 / bad 0 一处没动**，`MOVED` / `NEWLY-PASSING` / `REGRESSION` 全 0。

| 新条 | 判定点 | 吸收的探针 |
| --- | --- | --- |
| `001-array-methods` | `Array.from` / `of` / `isArray` / `copyWithin` / `fill` / `splice` / `to*` / `flat` / `at` / `includes` / `join` / `reduce` / `sort` | `p707a-a01`…`a04`、`a06`…`a15` |
| `002-map-set-methods` | `Map` / `Set` 的构造与插入序、`NaN` 与 `-0` 键、`get` / `has` / `delete`、`Map.groupBy`、`WeakMap` 的键 | `p707a-m01`…`m08` |
| `003-number-and-math` | `Number` 的判定 / 进制 / 格式化 / 边界与 `Math` 的取整、对数、符号、杂项 | `p707a-n01`…`n05`、`p707a-x01`…`x05` |
| `004-object-static-methods` | `Object.assign` 的落点与取值口径、`fromEntries`、`groupBy`、`create`、`setPrototypeOf`、`is`、`values` / `entries` | `p707a-o01`…`o15`、`p707c-o01`、`o03`、`o04`、`o05` |
| `005-string-methods` | `pad` / `slice` 与 `substring` / `trim` 家族 / `split` / `replace` 的 `$&` / `String.raw` / 码点 | `p707a-s01`…`s08` |
| `006-array-isarray-typedarray-blocked` | `Array.isArray` 五档（含 TypedArray 那一档）——**blocked 的账** | `p707a-a05` |
| `007-class-and-descriptors` | 静态继承 / `super` / 缺省构造 / 访问器 / 私有字段 / 静态块 / 描述符四档 / `for..in` | `p707b-c01`…`c08`、`p707b-d01`…`d08` |
| `008-errors-and-finally` | 错误家族的 `name` / `instanceof`、`cause` 与 `errors`、`catch` 不绑名、`finally` 覆盖 `return`、抛非错误 | `p707b-e01`…`e05` |
| `009-generators-and-iteration` | 生成器的 `return` 与 `finally`、`yield*` 委托、`throw` 进 `try`、`next` 的实参、迭代器的来源 | `p707b-g01`…`g10` |
| `010-promises-and-async` | `allSettled` / `any` / `race`、thenable、`async` 的返回值与抛出、`finally` 透传、微任务次序 | `p707b-p01`…`p10` |
| `011-numeric-and-string-keys` | 数字键的三种读法、`hasOwn` / 描述符 / `in` / `delete`、展开到数组与对象、小数与负数键 | `p707c-o02`、`o06`、`o08`…`o12`、`p707d-k01`…`k08` |

**两种口径对拍**：`--category exec --filter round707/` 批量口径与 `--no-batch` **逐项相同**：
**11 条判过 · 10 过 · blocked 1 · differ 0 · bad 0**。八道门全绿。

**第 788 轮的合并**（**整个 `exec/classes` 域按判定点重排**）：这个域里**逐批重抄的原子探针**
（228 条 `probe*` / `p-class-*`）与它们同判定点的薄容器按规则并成 **12 条规则用例**（`086`–`097`），
6 条 ledger 探针改名成描述性命名的账（`098`–`102`，其中两条 `extends Array` **同根并为一条**）。
删 **273** 条、添 **17** 条：语料 **6390 → 6134**、判过 **6376 → 6120**、过 **5972 → 5717**（净少 **255**），
**blocked 264 → 263**（同根的两条并成一条账）、**differ 140（一处没动）**、`bad 0`，
`MOVED` / `NEWLY-PASSING` / `REGRESSION` 全 0。域内从 **310 条降到 54 条**，`probe*` 命名清零。

| 新条 | 判定点 | 吸收的落点 |
| --- | --- | --- |
| `086-class-object-shape` | 类对象自己那一格：`name` / `length` / `typeof` / 原型链 / 自有名表 / `toString` | `069`、`078`、`079`、`probe693-c02·c03·c18`、`probe-c03·c10`、`probe694-k06·k22…k28·k30`、`probe695-k14`、`probe699-k-e20·e21·e43·e44·e50·e51`、`probe704-k-c09·c10` |
| `087-class-prototype-members` | 原型上的 `constructor`、成员描述符、方法名与形参个数 | `074`、`076`、`080`、`probe693b-k02·k26·k33·k34`、`probe694-k19·k20`、`probe695-k06·k09·k10`、`probe699-k-e22…e25·e28·e29·e46·t06·t10`、`probe704-k-c11·c20` |
| `088-class-fields` | 字段的落点、初始化次序、声明而不初始化、覆盖与枚举 | `probe693-c14·c22`、`probe693b-k06·k24·k25`、`probe694-k08·k09·k10`、`probe695-k12·k20`、`probe696-k14`、`probe699-k-e01…e04·e10…e12·e18·e19·e30…e32·e48·e49`、`probe2-k13`、`p-class-field-order` |
| `089-class-static-members` | 静态字段 / 方法 / 取值器 / 静态块 / 继承 | `066`、`073`、`082`、`probe-c04·c09`、`probe2-k01·k08`、`probe693-c13·c29·c30`、`probe693b-k05·k07·k14·k18·k35`、`probe694-k05·k07·k16·k17·k21`、`probe695-k04·k11`、`probe696-k05`、`probe699-k-e05·e06·e08·e33·e39·e45·t05·t09·t14`、`probe704-k-c14`、`p-class-static-inherit` |
| `090-class-private-members` | `#` 字段 / `#` 方法 / 静态私有 / `#x in o` 的品牌检查 | `067`、`071`、`077`、`081`、`probe693-c21`、`probe693b-k08·k09·k10`、`probe694-k01·k02·k04`、`probe695-k07`、`probe699-k-e13…e17·e47·t07` |
| `091-class-accessors` | 访问器的读写落点、现读次数、对象字面量上的访问器 | `009`、`015`（与 `017` 逐字相同）、`017`、`040`、`046`、`049`、`055`、`068`、`083`、`probe693-c26…c28·c49·c50`、`probe695-k01·k02`、`probe2-k07`、`probe699-k-e34`、`p-class-accessor-literal`、`p-class-super-getter` |
| `092-class-inheritance-and-super` | 构造器传参、方法 / 静态 / 访问器上的 `super`、原型链 | `007`、`037`、`045`、`065`、`070`、`072`、`075`、`probe2-k03`、`probe693b-k11…k13·k15·k16·k32`、`probe694-k11·k12·k14·k15`、`probe696-k06`、`probe699-k-e07·e09·e26·t08·t15` |
| `093-class-construction-and-instanceof` | `instanceof`、构造函数的返回值、脱离接收者的方法调用 | `085`、`probe-c07`、`probe2-k09·k10·k15`、`probe693-c17·c32`、`probe693b-k01·k17·k20·k21·k28·k29`、`probe696-k11·k12`、`probe699-k-e27·e35·e38·t11` |
| `094-class-expressions` | 匿名 / 具名自引用、立即实例化、`extends` 表达式与静态初始化 | `003`、`004`、`021`、`022`、`033`、`038`、`042`、`044`、`064`、`probe-c06`、`probe693b-k30`、`probe699-k-t02·t03`、`probe704-k-c01…c08·c15…c19` |
| `095-class-computed-member-names` | `[expr]`：方法 / 访问器 / 字段 / 静态 / 符号键 | `012`、`016`、`031`、`047`、`050`、`060`、`061`、`probe693-c41…c44·c47·c48`、`probe696-k10`、`probe699-k-e40`、`probe2-k14` |
| `096-class-enumeration-and-tags` | 枚举与渲染：`JSON.stringify` / `toString` / `Symbol.toStringTag` / 迭代 / 解构默认值 | `084`、`probe693-c25·c31·c33…c40·c45·c46`、`probe693b-k31`、`probe695-k08·k15…k18`、`probe2-k11`、`probe699-k-e42·t13` |
| `097-new-target` | `new.target`：函数两种调用、类与派生类 | `063`、`probe699-k-e36·e37` |

**ledger 改名（账照旧、名字按规范）**：`probe-c05` → `098-private-brand-check`（differ）、
`probe693b-k27` + `probe699-k-e41` → `099-class-extends-builtin-blocked`（blocked，**同一条根**）、
`probe699-k-t01` → `100-class-extends-null-blocked`（blocked）、
`probe694-k13` → `101-super-in-arrow-blocked`（blocked）、
`probe699-k-t12` → `102-super-before-this-differ`（differ）。
另有 7 条函数 `name` / `length` 的探针（`probe693-c04…c12`）并进 `exec/functions/088-fn-length-name`
（跨目录同判定点，两条独有断言搬入、其余五条本来就已覆盖）。

**两种口径对拍**：`--category exec --filter classes/` 批量口径与 `--no-batch`（一条一个进程的权威口径）
**逐项相同**：**53 条判过 · 48 过 · blocked 3 · differ 2 · bad 0**（另有 1 条 `xl:skip` 不进分母）。
八道门全绿；runtime:check 243 条、runtime:cli 79 份一致。


**第 787 轮（三）**（**收尾 `exec/expressions`，并顺手把语料里逐字节相同的探针清掉**）：
`exec/expressions` 剩下的 `probe694-m*`（55 条，`m31` 是 blocked 的账、原样留着）、
`probe693b-e67·e68·e70` 按判定点并掉，另把**两对逐字节相同**的探针并进它们各自的规则条——
语料 **6461 → 6390**、判过 **6447 → 6376**、过 **6043 → 5972**（净少 **71**：删 74、添 3），
**blocked 264 / differ 140 / bad 0 一处没动**，`MOVED` / `NEWLY-PASSING` / `REGRESSION` 全 0。
新增 3 条：`247-call-apply-bind`（`m04` · `m06` · `m17` · `m18`）、
`248-class-expressions-and-new`（`m26`–`m33` 里那 7 条；`m31` 的 `new ns["C"]()` 是 blocked、
不进这一条）、`249-member-reads-and-writes`（`m34` · `m44`–`m51` · `m58` · `m59` · `e70`）。
并进既有条的：`m01`–`m14` · `m35`–`m43` → `245`、`m23`–`m25` → `241`、`m52`–`m55` → `243`、
`m56`·`m57` → `174`、`e67`·`e68` → `173-ternary-nested`。
**跨类别那两对逐字节相同的**（`exec/classes/probe693-c08` ≡ `exec/functions/probe703-f-g03`、
`probe693-c11` ≡ `probe703-f-g19`）与 `exec/expressions` 的 `m19`·`m20`·`m21`·`m60`
一起并进 `exec/functions/088-fn-length-name`——它同时吸收了那一族「一个字面量一条」的
`092` / `097` / `098` / `099` / `100` / `103` / `107` / `108` / `110` / `111`（**19 条 → 1 条**）；
`stdlib/string/probe693-y46` ≡ `runtime/iterators/probe696-i01`（`[... "ab"].join("|")`）
并进 `stdlib/string/111-string-iterator`。
**收尾读数**：`exec/expressions` **485 → 256**（三轮合计），token 与对拍过的口径都没动；
`probe*` 命名从 2375 降到 **2127**（exec 1061 / stdlib 664 / runtime 402）。

**第 787 轮（二）**（**同一族的第二批：链与赋值那两族**）：`exec/expressions` 里剩下的
`probe693b-e*` / `probe698-g*` / `probe696-t*` 按判定点并掉——语料 **6522 → 6461**、
判过 **6508 → 6447**、过 **6104 → 6043**（净少 **61**：删 65、添 4），
**blocked 264 / differ 140 / bad 0 一处没动**，`MOVED` / `NEWLY-PASSING` / `REGRESSION` 全 0。
新增 4 条：`243-assignment-and-update`（复合赋值 / 逻辑赋值 / 自增自减，吸收 `e23`–`e27` · `e34`–`e37`）、
`244-instanceof`（`e42` · `e43`）、`245-member-call-chains`（成员与调用链的形状、含可选链与 `this`，
吸收 `e44`–`e66` 里那 19 条）、`246-tagged-templates`（`probe696-t01`–`t04`）；
另有 11 条并进既有条：`e04` → `235`、`e05` → `234`、`e07`·`e31`·`e32`·`e33` → `239`、
`e14`·`e17` → `237`、`e18`–`e22` → `242`、`probe698-g01`–`g08` 与 `probe704-x-b30` → `174-delete-semantics`、
`g04`·`g05`·`g09`·`g10` → `180-in-operator`。
**5 条是重复而不搬**（断言已在保留的那条里）：`e01`（`(1,2,3)` 在 `241`）、`e69`（`typeof (() => {})` 在 `241`）、
`e08`（`(-2) ** 2` 在 `239`）、`e13`（`NaN === NaN` 在 `240`）、`e39`–`e41`（`in` 的三格在 `180` 的 `g05` 里）。
**同一轮两种口径对拍**：`--category exec --no-batch`（一条一个进程，权威口径）
读数 **1879 / 1920 · blocked 11 · differ 30 · bad 0**，与批量口径（`--jobs 8 --batch-workers 32`）
那一版**逐项相同**。

**第 787 轮的合并**（**`exec/expressions` 的值与运算那一族**）：把「一个字面量一条用例」的
原子探针与逐批重抄的探针，按**判定点**并成 10 条规则用例——语料 **6690 → 6522**、
判过 **6676 → 6508**、过 **6272 → 6104**（净少 **168**），而
**blocked 264 / differ 140 / bad 0 一处没动**，`MOVED` / `NEWLY-PASSING` / `REGRESSION` 全 0。
删掉 **178** 条（119 条 `probe*` + 59 条「一个字面量一条」的命名用例），新增 **10** 条：

| 新条 | 判定点 | 吸收的落点 |
| --- | --- | --- |
| `233-to-primitive-and-wrappers` | ToPrimitive 的次序与提示、包装对象的取值 | `probe699-c-t01…t07`、`probe2-b07·b08·b09·b10·b14·b15`、`probe704-x-b46…b50`、`probe699-c-e36…e43` |
| `234-to-number-conversions` | `ToNumber`：一元 `+` / `-` / `~`、`Number()`、`parseInt` / `parseFloat` / `isNaN` | `probe-o01·o05·o09·o33·o34·o50·o51`、`probe699-c-e20·e21·e27·e50…e60`、`probe704-x-b10·b39`、`probe2-b12`、`177`、`183`–`188`、`171` |
| `235-to-boolean-conversions` | `ToBoolean` 的真假表（含包装对象与符号） | `probe-o13·o14`、`probe2-b01·b02·b03·b16·b17·b18` |
| `236-to-string-conversions` | `ToString` 与 `+` 拼接（数组 / 对象 / 空值 / 布尔） | `probe-o10·o30·o32·o52·o53`、`probe699-c-e13·e18·e19`、`probe704-x-b02·b03·b51`、`176`、`189`、`190`、`224`–`227`、`p-op-plus-coerce` |
| `237-abstract-equality` | `==` 的转换表（空值 / 布尔 / 数组 / 字符串） | `175`、`191`–`195`、`212`–`214`、`222`、`229`、`probe-o18·o21·o22`、`probe699-c-e03·e04·e09·e33·e34·e62·e63·t08`、`probe704-x-b54·b55` |
| `238-relational-comparison` | `<` `>`：都是字符串按码元、否则先 ToNumber | `196`、`198`、`199`、`probe-o23·o25·o26`、`probe699-c-e29·e30·e31`、`probe704-x-b16·b17·b19·b58` |
| `239-numeric-operators` | `%` / `**` 与位运算的 32 位有符号、除零与浮点 | `164`、`169`、`170`、`200`–`204`、`211`、`215`–`217`、`p-op-bit-shift`、`p-op-exponent`、`probe-o31·o37·o38·o39·o40`、`probe699-c-e15·e16`、`probe704-x-b39·b40·b41·b42` |
| `240-nan-and-negative-zero` | `NaN` 的三问与 `-0` 的区分 | `205`、`223`、`230`、`p-op-nan`、`p-op-negzero-compare`、`probe-o54·o55`、`probe699-c-e47·e48`、`probe704-x-b23` |
| `241-typeof-and-void` | `typeof` 的取值表、`void` 与逗号表达式 | `197`、`206`–`210`、`p-op-void-comma`、`probe-o47`、`probe2-b04`、`probe704-x-b24·b60` |
| `242-logical-and-nullish` | `&&` / `||` / `??` 的短路取值 | `probe704-x-b25…b28` |

**并法不是「删掉重复、留一句」**：每一条的表达式**逐句搬进新条**（挂在同一个 `probe(f)` 小壳上，
各自带自己的 `try/catch`），所以**输出逐行等于原来那些条之和、语义一字未改**；
另有两条同判定点的并进既有命名条：`218` 与 `p-op-in-operator` → `180-in-operator`。
`143-beh-tostring-valueof-order` 是 **differ 的账**（`Date` 的时区那一族），按规矩**原样留着**，
ToPrimitive 的探针因此并进了**新条**而不是它——账不被稀释，也不被顺手改掉。

**第 786 轮的合并**（**同一手法收尾 `stdlib/json`**）：把上一轮剩下的
`probe703-j-f*`（16）与 `probe-q*`（13）也并进那 5 条规则用例里——
语料 **6718 → 6690**、判过 **6704 → 6676**、过 **6300 → 6272**（净少 28，
**blocked 264 / differ 140 / bad 0 一处没动**，`NEWLY-PASSING` / `MOVED` / `REGRESSION` 全 0）。
并入的落点：`079` ← `probe-q01·q02·q03·q04·q12·q21·q24` + `probe703-j-f01·f02·f08·f12·f22·f23`、
`080` ← `probe-q14·q15` + `f10`、`081` ← `probe-q07` + `f19`、
`085` ← `probe-q10·q17` + `f07·f16·f17·f18·f24`、`086` ← `probe-q18`、
`044-json-parse-proto-key` ← `f14`（`f15` 的断言 `Object.getPrototypeOf(o) === Object.prototype`
那一条**本来就在 044 里**，所以它没有独有的断言）。只有 `probe703-j-f25`
（`typeof JSON.isRawJSON`，`differ`）**留着**——那是账，不是冗余。
`stdlib/json` **166 → 120 → 92** 条（两个轮次合计净少 **74**），
`084` / `085` 顺手去掉 `-probes` 尾巴（改名 `…-tojson-call` / `…-parse-shapes`）。

**第 785 轮的合并**（**原子探针按规则并组**，只在 `stdlib/json` 这一个域上走一遍）：
`stdlib/json` **166 → 120** 条（净少 **46**），语料 **6764 → 6718**、判过 **6750 → 6704**、
过 **6346 → 6300**；**blocked 264 / differ 140 / bad 0 又是一处没动**，
`NEWLY-PASSING` / `MOVED` / `REGRESSION` 全 0。做法：把逐批重抄的 `probe693-j*` /
`probe695-j*`（54 条）按判定点并成 **8** 条——

| 新条 | 判定点 | 吸收的探针 |
| --- | --- | --- |
| `079-json-stringify-value-shapes` | 值的形状（哪些格丢掉 / 写 null、`-0` / `1e21` / NaN / Infinity） | `probe693-j01·j02·j03·j11·j13·j19·j20`、`probe695-j21·j23·j30·j31·j33·j34·j39·j40` |
| `080-json-stringify-text-escaping` | 串里的引号 / 换行 / 控制字符 | `probe693-j09·j10`、`probe695-j28·j29` |
| `081-json-stringify-space-and-replacer` | 第二格（replacer）与第三格（space） | `probe693-j04·j06·j25`、`probe695-j06·j07·j08·j09·j25·j27·j38` |
| `082-json-stringify-accessor-visible` | 访问器要**现读**（`JsonText` 那一趟的根） | `probe695-j01…j05·j10…j13·j17·j35·j37` |
| `083-json-stringify-accessor-defined-and-throwing` | `defineProperty` 的 `enumerable` 那一档、getter 自己抛 | `probe695-j14·j15·j16·j36` |
| `084-json-stringify-tojson-probes` | `toJSON`（顶层 / 嵌套 / 不可调） | `probe695-j18·j19·j20` |
| `085-json-parse-probes` | `JSON.parse` 出来的是普通对象 / 数组、空白与往返 | `probe693-j14·j15·j18·j22` |
| `086-json-parse-errors` | 坏输入抛的是 `SyntaxError` | `probe693-j17·j24` |

**并法不是「删掉重复、留一句」**：每一条探针的表达式**逐条搬进新条**，各自带自己的
`try/catch`（`probe(f)` 那个小壳），所以**输出逐行等于原来那 54 条之和、语义一字未改**——
`stdlib/json` 这一次过滤跑：120/123 过、blocked 1 / differ 2（与并之前逐项相同）。
剩下的 `probe703-j-f*`（16）与 `probe-q*`（13）**还没并**，下一轮同一手法。

**第 784 轮的合并**（**同一个判定点写了两遍**那一族，五类一起过）：
语料 **6824 → 6764** 条（净少 **60**：删 61、添 1），判过 **6810 → 6750**。
**blocked / differ / bad 三条账一处没动**（264 / 140 / 0），`NEWLY-PASSING` / `MOVED` /
`REGRESSION` 全是 0——**挤掉的 60 条全是本来就过的重复条**，判定力一条没少。
两条轴、两种做法：

1. **正文逐字节相同（只差文件头散文 / 行尾 / 局部名字）**：`token` 20 组——
   同一份 `source` 喂给同一把 AST 尺子，**独有的 `xl:expect` / `xl:absent` 并进保留的那条**
   （例如 `stmt-switch-basic` 的 `SwitchCompare` 并进 `stmt-switch-no-braces-body`），
   其余从盘上删掉。这一批**只动 token 的同尺子重复**：
   `token` 与 `exec` 里那 30 组「同一份 source 走两把尺子」的**不是**重复，原样留着。
2. **同一条规则换了个局部名字 / 字面量**（`stdout` 四类）：41 组。留下的那条
   **改成描述性命名**（`probe693-c01` → `069-class-name` 那种收敛：本轮改名 **27** 条，
   例如 `probe-c08` → `080-class-getter-on-prototype`、`probe-q08` → `078-json-stringify-key-order`），
   有独有断言的**把断言并进去**（`stdlib/string/057` 并 `p-str-trim-kinds` 的那一行、
   `exec/functions/064` 并 `108-parameter-properties-r9` 的 `class D`、
   `stdlib/array/048` 并 `025` 的两个负下标、`exec/generics/026` 并 `019` 的 `Stack`）。
   另把 `runtime/round737/p737a-a12` 与 `runtime/round749/p749a-a06` 并成
   `runtime/async/051-async-generator-for-await`（同一族两半：`yield`/`return`/手动 `next()`
   与 `for await` 消费生成器、`for await` 迭代混合可迭代对象）。
**这一轮只删重复、不动判据**：`runtime/functions/021` 并掉旁边两条同判定点的闭包计数器
（`014` / `values/046`），`exec/functions/080` 与 `runtime/operators/040` 是同一份正文、
留 `runtime/operators/040`——**同一个判定点只留一条**，权重差不是留着水的理由。

**第 783 轮（十二）的合并**：把「同一判定点被逐批重抄」的那一批**按判定点并掉**——
语料 **8373 → 6824** 条（少 **1549** 条，**全部**出在那四个 `stdout` 类里，
`token` 一条没动：它量的是 AST，不在这条重复轴线上）。判过的条数同比例下降，而
**blocked / differ / bad 三条账一处没动**（合并只去重复，不改判据）。
即：**分母里那 1549 条水挤掉了，判定力一条没少**。

**语料 5247 条**（token 1403 / exec 972 / runtime 1005 / stdlib 1622 / e2e 246），判过 **5237** 条。
覆盖度按类算，**每一类的分母是那一类判过的条数**：

| 类 | 判过 | 过 | 缺口（blocked / differ） | 备注 |
| --- | --- | --- | --- | --- |
| `token` | 1394 | **1177** | 217 / 0 | 缺的那 217 条**全是** `xl:known-gap`；另有 9 条不进分母 |
| `exec` | 970 | **930** | 10 / 30 | 另有 1 条不进分母 |
| `runtime` | 1005 | **954** | 6 / 45 | |
| `stdlib` | 1622 | **1536** | 23 / 63 | |
| `e2e` | 246 | **242** | 4 / 0 | |
| **合计** | **5237** | **4839** | 260 / 138 | 加权 **94.1%** |

（第 790 轮（三）那一版是 5237 / 4839 —— **blocked 260 / differ 138 与上一版逐项相同**，
第 790 轮（二）那一版是 5280 / 4882，第 790 轮那一版是 5284 / 4886，
第 789 轮（三）那一版是 5427 / 5029，
第 789 轮（二）那一版是 5513 / 5115（blocked 260 / differ 138：两处净变化都是「同根合并」，
见上面那一节），第 789 轮那一版是 5706 / 5317 —— **blocked 263 / differ 140 与上一版逐项相同**，
第 788 轮（三）那一版是 5987 / 5584，第 788 轮（二）那一版是 6015 / 5612，
第 788 轮那一版是 6120 / 5717，
第 787 轮（三）那一版是 6376 / 5972，
第 787 轮（二）那一版是 6447 / 6043，
第 787 轮那一版是 6508 / 6104，第 786 轮那一版是 6676 / 6272，
第 784 轮那一版是 6750 / 6346、第 783 轮那一版是 6810 / 6406——十二版的
`blocked` / `differ` **逐项相同**：分母小了，加权读数跟着轻降，这就是上面那句
「不是退化」的实例。）

**加权读数会因为「分母变小」而轻微下降**（同样的缺口除以更小的分母），这不是退化：
`bad` 一直是 **0**，`blocked` / `differ` 的**绝对值**一处没涨。

### 合并这一轮撞出来的两件事（写在这里，别再踩）

1. **没有 `// xl:end` 的 stdout 用例是「空跑」**：`case-file.mjs` 的头部文法里，
   没有终止行就一直读到文件尾 ⇒ `body` 是空串 ⇒ 判据**一条都不产生**、覆盖度里恒 `pass`。
   本轮普查撞出 **5 条**（`exec/round724/p724a-b01` · `stdlib/error/probe697-e11` 与
   `probe704-e-a38` · `stdlib/round749/p749b-b06` · `stdlib/round781/r781a-01`）——
   它们的 `xl:want` 全是 `blocked`，也就是说**账上写着"还差"，实际上什么都没测**。
   补上终止行之后它们当场都过了（三处根因第 724 / 749 / 781 轮已经收掉了，台账过期）。
   **自查**：`node` 里跑一遍 `body === ""` 的清单，stdout 那四类里**一条都不该有**
   （token 那 1427 条是正常的：它们的正文就在头部指令之后，`jsdoc` 之外的代码没有被拍成 body）。
2. **`cases:check` 抓得住它，但它不是 `coverage` 的前置**：`case-file.mjs` 对**覆盖层**
   （写了 `judge` / `round` / `want` 那一类键的）本来就报
   「覆盖层的用例文件头要以 `// xl:end` 收尾」——上面那 5 条**全都写了 `xl:judge`**，
   所以 `npm run cases:check` **一条不落地会报出来**。漏掉的原因是**没人跑它**：
   `coverage` 是另一支命令，它自己不调 `validate.mjs`。
   **所以并入流程的应该是这一条**：改完语料先 `npm run cases:check`，再 `coverage`。

**读数不稳，看趋势不要看小数点**：同一份代码连跑两次，`differ` 会在 144 与 148 之间漂
（第 783 轮实测）。根因是裁判批里**共享状态会跨界**——一条用例改了 `Object.prototype`，
同批后面每一条的读数都跟着变，而判决全记在**受害者**头上。
上面那张表是**某一次**的读数，不是"此刻的真值"。

**第 782 轮再加 3 条**（分母 8349 → **8352**，全在 `stdlib/round782`）：**接收者自己那一格**与
**内建构造的原型**——**2 条当场通过、1 条登记**，同一轮里**收掉四处**：
① `SetPropertySearched` 少了「接收者自己那一格」⇒ `super.x = v` 在派生实例上**再建一格重名自有属性**、
读那一格先命中旧的那一份（**静默错值**，第 780 轮 `r780b-03` 的四个落点之一）；
② 内建构造对象自己那一格原型（错误家族七个后代接 `Error`、`Error` 自己接 `Function.prototype`）
⇒ `Object.getPrototypeOf(TypeError) === Error` / `Error instanceof Function`；
③ `util.inspect` 的错误那一档把名写死成 `"Error"`（`console.log(new TypeError("t"))` 印 `{}`、
`new RangeError("r")` 印成 `Error: r`）；
④ `Error.stack` 那一格（自有 + 不可枚举的字符串，**给的是那一段的头一行**——
帧里的路径与行号是本仓的实现细节，照抄宿主栈会把实现钉进脚本看得见的值里；
头一行与 `util.inspect` 印的头一行逐字相同，判据就从两个出口把同一句读回来比）。
**试过又退回来的一格**：其余内建构造（`Array` / `Date` / `Map` / `Promise` …）也接
`Function.prototype` 在 JS 里同样对，整批接上去之后 `runtime:check` 当场红两条
（`String(String)` 走继承来的 `Function.prototype.toString` ⇒ `"function () { [native code] }"`，
**静默错值**）⇒ 退回只接错误家族，另一半登记在 `r782a-02`（`differ`，25 行照 JS 的答案写）。
**五笔旧账到期**：`exec/round724/p724a-b01`、`stdlib/error/probe697-e11`、`probe704-e-a38`、
`stdlib/round749/p749b-b06`、`stdlib/round781/r781a-01`（`xl:want` / `xl:why` 按规矩撤掉）。
覆盖度 7943 / 8349 → **7950 / 8352**、blocked **267**（没动）、differ 139 → **135**、bad 0、
regressions 0，加权 **95.4%**。

**第 781 轮再加 6 条**（分母 8343 → **8349**，全在 `stdlib/round781`）：错误家族 /
抛出与接住 / 分组 / `structuredClone` / 弱集合 / 新族方法——**3 条当场通过、3 条登记**，
同一轮里**收掉一处**：`Object.groupBy` 的**键**原来无条件 `ValueText` 成字符串
（`() => Symbol("s")` 在 Node 里给一个**符号键**的格子、本仓响亮地抛 `TypeError`；
对象的键同一处），修法是走 `text.xl.md` 的 `PropertyKeyName`（与 `get_index` / `set_index`
同一条路，不写第二份转换表）。登记的三条：错误家族里 `Error.stack` 与
`Object.getPrototypeOf(TypeError) === Error` 两条**旧账的新排版**（`class My extends Error {}`
写在函数体里仍是 `r778m-01` / `r780b-04` 那一处根，所以那条用例里不写它）、
`structuredClone` 对不可克隆的值抛的是 `DOMException`（本仓抛 `TypeError`，没有那一族）、
`typeof WeakRef`（第 736 轮登记的三个全局名那一族）。

**第 780 轮再加 12 条**（分母 8331 → **8343**，`runtime/round780` 7 条 / `stdlib/round780` 5 条）：
把第 779 轮那一族**整族 dump**（按家族逐格 `typeof` + `name` + `length`，三百余格）——
**7 条当场通过、5 条登记**（4 `differ` + 1 `blocked`），同一轮里**收掉六处**：
`Object.getOwnPropertyDescriptors`（`1`）与 `Object.setPrototypeOf`（`2`）整格不在表里、
`String.fromCharCode` / `fromCodePoint` / `raw` 三格、`Symbol.for` / `keyFor`、
`Error.isError`（`1`）/ `captureStackTrace`（`2`）、
`Number.prototype.toLocaleString` 的 `length` **`0`**（与 `toString` 共号 ⇒ 改走 `MethodObject`
另造一个可调用对象）。**新登两条根**：**函数体里的派生类隐式构造器**
（`class E extends Base {}` 只要长在函数体里，`new E()` 报
`new_closure needs an environment or undefined`；同一个形状写在模块顶层是好的，
与第 778 轮 `r778m-01` 同一处根）、**同一条路径上先读后声明的名字**
（`try { new C() } catch { } class C { }` 降级期就报 `name used before its declaration`，
与第 778 轮 `r778l-01` 同一处根）。另两条 `differ`：整族 dump 里只剩
`String.prototype.match` / `matchAll` / `search` 没装（与 `058` / `135` 同根）、
**`super` 的四个落点**（类字段箭头指到了自己那一层 / 对象字面量里的 `super` 抛 /
`super.v = w` 静默不写 / 函数体里派生类的 `instanceof`）。

**第 779 轮再加 21 条**（分母 8310 → **8331**，`runtime/round779` 4 条 / `stdlib/round779` 17 条）：
**内建函数对象自己那两格**（`name` / `length`）那一族的普查——**17 条当场通过、4 条登记**
（2 `differ` + 2 `blocked`），同一轮里**收掉四处根**：`Array` / `Number` / `Object` 的静态十三格、
`Date` 的三格静态与八格全局函数原来走的是**裸句柄**（名字与形参个数两格没人写，
`Array.isArray.name` 给 `""`）；`Date.prototype` 二十六个槽位一个名字都没有
（`InstallDateMethods` 多收一格 `vm`，**按槽位各挂各的句柄**——`getTime` / `valueOf` 在 Node 里
**不是同一个函数**，所以按号取同一个值会把先写的名字顶掉）；生成器 `next` / `return` / `throw`
与五格 `[Symbol.iterator]` 同款。`BuiltinArity` 补的格：`parseInt` 是 **`2`**（原来与
`parseFloat` 顺手归成一族）、`JSON.parse` 是 `2` / `JSON.stringify` 是 `3`（原来写成「都是一格」）、
`Object.getOwnPropertyDescriptor` 是 `2`、`Date.UTC` 是 `7`、七个 `set*` 是 `1..4`、
以及错误家族八个构造器自己的 `length`（七个 `1`、`AggregateError` 是 `2`）。
登记的四条：`arguments` **不是数组**（第 702 轮的有意取舍：四个面与 JS 不同）+
松散模式下形参与 `arguments` 的别名（与 `exec/functions/095` 同一条根）、
`RegExp` **全局名根本没登记**（构造器那一半与「字符串方法接 RegExp 对象」那一半）。

**第 756 轮再加 2 条**（分母 8183 → **8185**，全是 `runtime/round756`）：
**下标访问器与数组的洞 / 属性描述符的默认值与冻结**——**1 条当场通过**（16 行全对），
同一轮里**收掉一处根**：**`join` 在装了访问器的下标上读不到那一格**
（它原来按**元素区的格子数**循环，而装访问器会把那一格**摘成洞** ⇒ 循环一次都不进；
现在上界是 `length`、那一格改走 `GetProperty`），
**两条旧台账到期**（`stdlib/array/143-getter-array-index` 与 `stdlib/round721/p721a-b01`，
指令已按规矩撤掉）。另新登 1 条：**严格代码里写只读属性该抛 `TypeError`**
（`ir.xl.md` 的 `case SetProp` 本来就写着这一句，缺的是「写那一趟不知道是不是严格」——
要动引擎，收尾轮不顺手改）。加权仍是 **95.7%**。

**第 755 轮再加 4 条**（分母 8179 → **8183**，全是 `runtime/round755`）：
**函数与访问器的名字推导 / 属性枚举的次序 / 数组的洞与新方法 / 字符串与数字的格式化**
——**3 条当场通过**（枚举次序、洞与新方法、格式化**一条不差**），
同一轮里**收掉一处根**：**计算键成员的名字**（类成员与对象字面量访问器两处一起，
静态键当场给、动态键运行期由 `set_function_name` 补写），
**两条旧台账到期**（第 732 轮 `p732a-a02` / `p732a-a03`，指令已按规矩撤掉）。
另新登 1 条：**解构默认值里的函数值不取名**（`const { a = function () {} } = {}` 的
`a.name` 该是 `"a"`——`Destructure` 那条路一格名字提示都没挂）。加权 **95.6% → 95.7%**。

**第 750 轮再加 26 条**（分母 8121 → **8147**）、另新登 5 条：
**原始值接收者与装箱 / 数组的洞与长度 / 数字与字符串的边界 / 对象整体操作**
（`runtime/round750` 16 条、`stdlib/round750` 10 条）——**21 条当场通过**、
同一轮里**收掉四处根**：

- **对象键的 `ToPropertyKey`**（`p750b-b02` / `p750b-b03` 那一族，**整份文件跑不起来**）：
  `t[new Set()] = "x"` 在 JS 里给 `"[object Set]"`（`Object.keys(t)` 是一格），
  而本仓在**取键那一步**就抛（`unimplemented: ToString of this kind of value`）
  ——`get_index` / `set_index` 的键落到 `RtToString` 上，而 `TextUnitsOf` 对**对象**
  是**响亮地抛**（那一处的注释写着「对象要 `ToPrimitive`，那是建库层的事」）。
  修法是**开一格语言层能力号**（`PropertyKeyId = 714`）+ `PropertyKeyName`
  （`text.xl.md`：对象先走 `ToPrimitiveOf`，与 `Symbol.toPrimitive` 给出的符号原样返回），
  引擎那一侧添 `PropertyKeyHookId` / `RegisterPropertyKeyHook` / `PropertyKeyOf`
  ——**没登记钩子就照旧抛**（与第 750 轮之前**一字不差**：不做 ≠ 换个行为）。
- **`Object.freeze` / `Object.seal` 打在原始值上**（`p750a-a02`，**整份文件进不来**）：
  JS 的 `Object.freeze(1)` 给 **`1`**（`ToObject` 的包装对象当场丢掉、返回值是实参本身），
  本仓**响亮地抛**。`preventExtensions` 那一格第 304 轮就是这么写的，只有这两格漏了
  ——修法是同一条（非对象 ⇒ 原样返回）。
- **`console.log("%i", …)` 是 `parseInt`**（`p750b-b08`）：Node 的 `util.format` 里
  `%i` 走 `parseInt(value, 10)`、`%d` 走 `Number(value)`，两者**只在小数上分岔**
  （`%i` 接 `"42.9"` 给 `42`、`%d` 给 `42.9`），而本仓把两档**并成了一句**。
- **往原始值上写属性**（`p750a-a04`，**整份文件进不来**）：`let s = "abc"; s.x = 1`
  在 JS 里**一声不响**（那一格建在临时包装对象上、随它丢掉），
  本仓报 `assigning a property on a primitive receiver`。修法是 `SetPropertySearched`
  那一支返回**假**（「没写下去」，与「不可写的属性」同一条口径）——
  它连带把「字符串的 `length` 只读」那一档也答对了（JS 里那也是静默失败）。
- **新登的 5 条**：① **原始值目标该抛 `TypeError`、本仓抛普通 `Error`**
  （`p750a-a01`：`defineProperty` / `setPrototypeOf` / `Reflect.defineProperty` 三处——
  与第 748 轮收掉的 `Object.assign(null, …)` 同一条根）；
  ② **内建方法不是同一个对象**（`p750a-a04` 的第五行：
  `n["toFixed"] === Number.prototype.toFixed` Node 给真、本仓给假——
  `CreateHostRef` 每次新造句柄那条教训的第 733 轮同族）；
  ③ **`a.length = "2"` 该截到 2**（`p750a-a06`：规范先走 `ToNumber`，
  本仓非数字一律抛——**要 `protos` 才能收**，而那是每一次属性写入都要过的路）；
  ④ **`Reflect.setPrototypeOf` 在不可扩展对象上该给假**（`p750a-a08`：
   Node 给假且不改原型，本仓给真且改了）；
  ⑤ **内建函数的描述符**（`p750b-b03`：`d(Math, "max")` 本仓抛、
  `d(Math, "PI")` 两边都对——缺的是**宿主引用**那一档的读值）。
- **这一批的探针面**：原始值接收者（`setPrototypeOf` / `defineProperty` /
  `keys` / `hasOwn` / `freeze` / `preventExtensions`）、装箱三兄弟、
  原始值上的属性读、数组的洞（`in` / `keys` / 映射 / 展开 / `length` 读写）、
  非法长度与越界下标、对象整体操作、`Reflect` 两套口径、访问器与不可枚举、
  `NaN` 与 `-0` 的渲染比较、`==` 的七种组合、稀疏与密集的传递、
  `Object.entries` / `assign` / 展开的落点、`typeof` / `instanceof` / `Array.isArray`、
  字符串的越界与代理对、大小写与正规化；`Array.from` / `Map`·`Set` 迭代器形状、
  描述符在数组 / 字符串 / 函数上、`JSON` 的 `toJSON` / 键次序、`String` / `Number`
  转换矩阵、`indexOf` 家族的起点、函数 `length` / `name` 六种写法、
  `console` 两条流与格式串边界、`Date` 形状、`WeakMap` / `WeakSet`。

**第 749 轮再加 26 条**（分母 8095 → **8121**）、另新登 3 条、**撤掉 2 条旧台账**：
**生成器与迭代协议 / `for await` / 模板字面量 / 属性次序与描述符**
（`runtime/round749` 16 条、`stdlib/round749` 10 条）——**23 条当场通过**：

- **这一轮没有收掉任何一处根**（三处新登、两处是**旧台账到期**）：
  `runtime/round736/p736b-b08`（`JSON.stringify` 看不见元素区上的访问器）与
  `stdlib/round721/p721a-b08`（空数组上装下标访问器时 `length` 该跟着长）**都转绿了**
  ——它们是第 721 / 736 轮登的，`coverage` 一直报 `NEWLY-PASSING`；
  这一轮把它们那两行 `xl:want` / `xl:why` **按规矩撤掉**（用例留着当守卫）。
- **新登的 3 条**：① **松散模式下形参与 `arguments` 的别名**（`p749a-a12`：
  `function h(a) { a = 99; return arguments[0] }` 在 Node 里给 `99`、本仓给 `1`
  ——形参住在帧槽、`arguments` 是开帧时另造的数组，**两份存储**）；
  ② **两级可选链 + 二元运算符**（`p749a-a15`，**静默错值**：
  `o.a?.b?.c + 1` 本仓给 `[object Object]1`、`o.a?.b?.c ?? 9` 给 `{ c: 1 }`
  ——`BinaryOperatorCloseRule` 往回找链的起点时只跳 `NCO`，
  `o` 与那个 `.` 留在 `BinaryOperator` 外面；分界量清了：
  **一级 `?.` 对、点号链后一级对、两级 `?.` 不带运算符也对**）；
  ③ **`Error.stack` 那一格**（`p749b-b06`：Node 给字符串、本仓给 `undefined`
  ——与第 697 / 704 / 708 轮同一条根，本用例把它钉在 `Error` 家族形状旁边）。
- **这一批的探针面**：`yield*` 委托与 `return` / `throw` 的透传、生成器清扫、
  自定义迭代器三条写法、`for..of` 解构、`async` 的次序与 `async` 生成器 + `for await`、
  模板字面量（内插 / 嵌套 / 标签 / `String.raw`）、标签模板的被调者形状、
  符号键与整数键的次序、描述符三档、`for..in`（原型链 / `null` 原型 / 数组）、
  `call` / `apply` / `bind`、`do…while` 与逗号表达式、可选链与空合的边界、
  嵌套 `try` 的次序；`splice` / `fill` / `copyWithin` / `with` / `flat`、
  `reduce` 家族、字符串切分与替换串、`Object` 取值族、`Map` / `Set` 构造与集合运算、
  `Error` 家族形状、`Number` / `Math` 的转换边界、`JSON` 的 replacer / reviver / space、
  `console` 的多种调用形状、全局函数的返回值。

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
