# 形状普查：产物 token 树 vs TS AST

**一句话**：每一格 token 一个目录，在那里放几条源码，把**成形时的那棵产物树**与
`ts.createSourceFile` 的 AST 摆在一起，量**形状差在哪一节**。

```
tests/compare-shape-token-ast/
  run.mjs             普查器（跑、比、落盘）
  README.md           本文件（怎么跑、口径、怎么加一格）
  <token>/            一格 token 一个目录，名字就是产物标签的小写连字符写法
    01-xxx.ts         用例：首行可写 `// token: <标签>`（写错会判红），其余是源码
    README.md         这一格的读数表（`--snapshot` 时自动刷新）
    xml/01-xxx.xml         **出口 1**：`Token.ToXmlString()` 的原样（紧凑单行 XML）
    ast/01-xxx.json        **出口 3**：`cjcli <文件> --ts-ast` 的 stdout 原样（紧凑单行 JSON）
```

## 怎么跑

```bash
node tests/compare-shape-token-ast/run.mjs                   # 全部；只打读数
node tests/compare-shape-token-ast/run.mjs binary-operator   # 只看一格
node tests/compare-shape-token-ast/run.mjs --snapshot        # 连 xml/ 与 ast/ 一起落盘
node tests/compare-shape-token-ast/run.mjs --details         # 把两棵树形也打出来
node tests/compare-shape-token-ast/run.mjs --json tmp/rep.json  # 逐条读数写文件（不进 stdout）
```

**退出码**：只认**坏掉**的——产物抛异常（CRASH），或 `--snapshot` 该写的三份没写成。
**「内核不同」不判红**：这一门是**量差额**的，目录里的用例挑的就是形状还没对上的那几格。

## 三个出口，别混

同一棵树三个出口（`docs/ast-json.md` 第 20 行那张表 + `cjcli -h`）：

| 出口 | 取哪一份 | 形态 |
| --- | --- | --- |
| **XML**（默认） | `Root.ToXmlString()`（`Root.ToString()` 同一个）；`cjcli` 打印时再过一遍 `CommonUtil.FormatXml` 加缩进 | **紧凑单行 XML**；打印层那份才是缩进文本 |
| **AST JSON**（`--ast-json`） | `Root.ToJsonString()` = `JSON.stringify(Token.ToPlain(ToList()))` | **紧凑单行 JSON**（给下游程序读；`Map` 不过 `ToPlain` 会静默成 `{}`） |
| **TS 形状**（`--ts-ast`） | `ToJsonText(projectRoot(Root.ToList(), 原文))` | **紧凑单行 JSON**（`samples/*.expected.tsast.json` 就是它，`check.mjs` 逐字节比） |

两条容易踩的：**① `ToList()` 不能直接 `JSON.stringify`**——里面是 `Map`，还有 `Parent`
反向指针（成环，当场抛）；**② 「TS 形状」自己也是 JSON**，仓库把它当紧凑单行存
（`samples/*.expected.tsast.json`），不是纯文本树。

`--snapshot` 落盘的就两份，一个出口一份：

| 文件 | 出口 | 是谁的字节 |
| --- | --- | --- |
| `xml/<用例>.xml` | **出口 1**（默认） | `Token.ToXmlString()` 的**原样**——**不过 `FormatXml`**（排版只发生在打印层；要看缩进的样子，`cjcli <文件>` 打出来就是）。**每个开标签上带 `range="[起,止]"`**（第 987 轮起，出口 1 自己也印坐标） |
| `ast/<用例>.json` | **出口 3**（`--ts-ast`） | **真开 `cjcli <文件> --ts-ast` 进程**拿的 stdout，原样紧凑单行 |

**为何出口 3 那一份要真开进程**：它有两个层次——`cases:tsast` 的默认量的是**库路径**
（尺子直接 require `projectRoot`），`--cli` 量的是**发布路径**，中间隔着参数解析、读文件与 BOM、
`CjcliParseTsAst`、`ToJsonText`、标准输出。落盘的是发布路径的原样字节，同时与库路径那一份
核一遍（不等就打一行「提示」；那件事的判据是 `cases:tsast --cli`）。

**喂给 cjcli 的是去掉 `// token:` 头的那条源码**：那行头是这一门的元数据，带着它去比，
那行注释会变成一个 `LineAnnotation` 节点、还带自己的区间，两条路必然不等
（第一版就是这么比的：46 条全报「库 340 B vs 发布 352 B」）。

## 逐格定「动哪一格」：见 [FINDINGS.md](FINDINGS.md)

`run.mjs` 量的是「差多少」，**定不了「该动哪里」**。要定哪一格，用对齐视图：

```bash
node tmp/pa-flow.mjs method         # 一个 token 目录；tmp/ 下的工具不进版本库
```

它把出口 1 与出口 3 **按区间配在一起**（XML 的 `range="[起,止]"` 是闭区间、AST 的 `pos/end`
是半开，所以按 `起` 与 `止+1` 配），逐行打印「这个产物节点变成了哪个 AST 节点 /
还是压根没成节点」，再把「AST 有、产物那棵树上没有对上的」单独列一遍。

[FINDINGS.md](FINDINGS.md) 是拿这把视图逐格跑过一遍、再回着读那格 `PrintAst` 之后的定案:
一条系统差（闭/半开区间）、一族四格同一个毛病（**位置已经记下却只印成标量**）、
以及哪些 flat 是刻意的、不许搬。

## 与 `cases:tsast` 的分工

| | 问的问题 | 判据 |
| --- | --- | --- |
| `tests/parse/ts-ast.mjs`（`npm run cases:tsast`） | **投影之后**与 TS 是否完全一致 | kind / 区间 / 字段名，八项全 0 |
| 这一门 | **投影之前**差多远 | 逐格六栏读数，不判绿 |

投影可以补出 TS 要的节点，所以那一门能全绿；而**补之前差多远**就是投影要背的负担——
这一门量的正是它。方向与本仓那句「让 token 贴近 ast，这样 printAst 会更为简单」同源。

## 口径：三层，别把噪音当信号

1. **外壳**（`Statement` / `ExpressionStatement` / `Root` / `SourceFile` / 类体 / 实参括号…）
   —— 一侧有、另一侧没有的包装。**不计入内核形状**，只记「补了几个壳」。
2. **标点与关键字**（`SymbolToken` / `Keyword` 对 `PlusToken` / `InKeyword`…）
   —— **不计入内核形状**，单独一栏数（TS 的 `operatorToken` 就在这一层）。
3. **内核形状** —— 去掉上面两层之后。**这一层不等才是真的形状不同**。

判据只用第 3 层；前两层是读数。第一版没分这三层时，8 条用例报的全是
「产物 `<Statement>` vs TS `SourceFile`」——**那是噪音**，真信号被埋在里面。

## 六栏读数（每一格的负担摊在这里）

| 栏 | 含义 | 投影要做什么 |
| --- | --- | --- |
| **平子格** | 产物把一段子节点堆在 `children` 里 | TS 那边是按**具名字段**分的 ⇒ 投影得自己认「第几格是 `left`、第几格是 `operatorToken`」 |
| **标量当节点** | TS 是**子节点**、产物里只是**一行字符串属性**（`name` / `alias` / `op` / `modifiers`…） | 投影得**凭那行字符串造一个节点**出来 |
| **TS 有产物没有** | 按 (kind, 区间) 配对不上的 TS 节点 | 投影得**凭空补**（`f(x)` 的被调用者就是这一栏） |
| **真括号** | 产物有 `Bracket` 节点、TS 把内容提上去 | 投影得**提层**（把内容挂成父节点的一个字段） |
| **换名** | 两边都有、名字不同 | 投影得**换名**（`PropertyAccess` → `PropertyAccessExpression`…） |

`value`（叶子文本）**不算**「标量当节点」：两边都有，把它算进来每一格都虚增一大截。
两侧都有的名字（`Identifier` / `NumericLiteral`）**不算**换名——那是投影按值分出来的同名叶子。

## 第一批（14 格 / 46 条用例）量到了什么

**内核同形 15、内核不同 31。** 差额按形状分四类，判据各不相同：

| 形状 | 例子 | 差额在哪 |
| --- | --- | --- |
| **内核已经同形** | `BinaryOperator` 8/8、`Lamda` 3/3、`TernaryOperator` 2/2 | 嵌套与深度都对上了，**只差「平 `children` → 具名三格」**（`New` / `TernaryOperator` / `Lamda` 那三格连段名都已经是 `name` / `arguments` / `condition`…） |
| **平的一段没有名字** | `PropertyAccess`（`a.b.c` 是一串 `Identifier . Identifier . Identifier`）、`ArrayLiteral`、`Let` | TS 那边是 `expression` + `name` 这种**具名字段**；产物只有一段平的子格，投影得自己认第几格是谁 |
| **TS 是子节点、产物只是一行属性** | `Method` 的 `name:"f"`、`TypeAssign` 的 `alias:"T"`、`Class` 的 `name:"C"`、`BinaryOperator` 的 `op:"+"`、修饰词 `modifiers:"async"` | 投影得**凭那行字符串造一个节点**；`method` 三格的 `TS 有产物没有` 各是 1，差的就是被调用者那个 `Identifier` |
| **根本不在同一层** | `a?.b` 是 `Identifier` + `NullConditionalOperator` **两个平级兄弟**（TS 是一条 `PropertyAccessExpression`）；`PropertyAccess` 里夹着 `Method` | 投影不是在「折形状」，是在**重建归属** |

一条要记下的边界：**「内核不同」不是失败。** 这一门是**量差额**的——要让某一格转绿，
收掉的差额应该换成 `tests/cases/` 里的用例（那才是判据），这一门留的是还没对上的那几格。

## 加一格

1. 建目录：`tests/compare-shape-token-ast/<token>/`（名字 = 产物标签的小写连字符写法，
   如 `BinaryOperator` → `binary-operator`；`NullConditionalOperator` → `null-conditional-operator`）。
2. 放几条 `*.ts`，首行写 `// token: <产物标签>`（**写错会判红**——那行就是「这条用例量的
   是不是它」的判据），其余行是源码。
3. 跑 `run.mjs <token> --snapshot`：落盘三份产物 + 刷新那一格的 `README.md`。
4. 用例**挑着差额写**：能让某一格转绿的用例，写进 `tests/cases/`（那才是判据），
   这一门留的是「还没对上」的那几格。

## 归一表从哪来

`run.mjs` 里的 `KIND_BY_TAG` / `TOKEN_KIND` / `KEYWORD_KIND` 是
[`typescript/print-ast-common.xl.md`](../../typescript/print-ast-common.xl.md) 那三张表的**逐条副本**。
**为什么不 import 那一份**：本门要量的正是「投影之前」的形状，借投影的实现就是借被量者本身。

代价是它会漂：那边加一条标签，这里要跟着加。漂了的症状是「凭空多出一类换名 / 多」，**看得出来**。
第一次试就踩到了——漏 `BinaryOperator → BinaryExpression` 那一条时，8 条用例全报
「产物 `<BinaryOperator>` vs TS `BinaryExpression`」，那不是形状不同，是表漏了一行。
