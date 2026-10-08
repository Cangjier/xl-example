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

语料 **3840** 条（token 1415 / exec 610 / runtime 614 / stdlib 955 / e2e 246）。
覆盖度按类算，**每一类的分母是那一类判过的条数**：

| 类 | 判过 | 过 | 缺口（blocked / differ） | 备注 |
| --- | --- | --- | --- | --- |
| `token` | 1402 | **1182** | 220 | 缺的那 220 条**全是** `xl:known-gap`；另有 13 条不进分母 |
| `exec` | 609 | **601** | 0 / 8 | 另有 1 条不进分母 |
| `runtime` | 614 | **613** | 1 / 0 | |
| `stdlib` | 955 | **914** | 15 / 26 | |
| `e2e` | 246 | **242** | 4 / 0 | |
| **合计** | **3826** | **3552** | 240 / 34 | 加权 **96.2%** |

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
