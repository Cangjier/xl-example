# token_next：catalog guide 与 shape token 的第一版落地

[design](../docs/catalog-guide-architecture.md) 的实现。两棵树：

```
token_next/core/                与语言无关的那一半（设计 §1 的树上那八格 + 收敛机制）
  token.xl.md                     Token：唯一的骨架
  lexicon.xl.md                   词法表：符号 / 空白 / 数字、配对表、运算符集、词表（§1.1）
  string-config.xl.md              字符串配置：引号 / 转义 / 原始 / 插值 / 模板 / 多行（§2）
  source.xl.md                    Source / Document（字符流）
  context.xl.md                   SyntaxContext：账（三种失败唯一的出口，§5）
  template.xl.md                  Template：一次解析一份表
  common-token.xl.md              CommonToken：名字 / 数字 / 字面量文本
  symbol-token.xl.md              SymbolToken：最长匹配
  bracket.xl.md                   Bracket：配对符号
  comment-token.xl.md             CommentToken
  wrap-token.xl.md                WrapToken：软换行（不吐文本）
  string-token.xl.md              StringToken：配置驱动的完整字符串支持（§2）
  regex-token.xl.md               RegexToken
  language-token.xl.md            LanguageToken：词法表 + 词表 + 身份判据 + 装配入口（§1 第 3 条）
  language-catalog-guide-token.xl.md  LanguageCatalogGuideToken：六条契约 C1~C6 + 收敛（§3）
  language-shape-token.xl.md      LanguageShapeToken：reader 与形状（§4 四步）
  convergence-exception.xl.md     池 = 0 的证据（§5 第一种失败）
  lexeme.xl.md                    挂一个单元 / 挂一串词法 / 收口那一趟（module 级方法）

token_next/typescript_tokens/   TypeScript 的那一层
  typescript-lexicon.xl.md        §1.1 那张表逐行落成值
  typescript-token.xl.md          身份判据 + 池的声明（C2）+ 装配入口
  parse.xl.md                     Parse：装配 → 逐字符 → 收口 → 报告
  shapes/                         五个形态族 + 根容器
    source-file-shape.xl.md         根容器（挂载方：C2 从它这里发出去）
    value-shape.xl.md               名字 / 数字（池由第一段正文收成一格）
    paren-shape.xl.md               分组 / 调用 / 箭头形参（判别事件在括号**后面**那一格）
    brace-shape.xl.md               对象字面量 / 块（池由位置一次定死）
    bracket-shape.xl.md             数组字面量 / 下标（同上）
    string-shape.xl.md              插值洞（字符串本体在 core，§2.1 说它不需要向导）
```

## 怎么跑

```bash
node tmp/r1051/xl.mjs check token_next      # 0 error / 0 warning
node tmp/r1051/xl.mjs build token_next      # 规范 → dist/ts/token_next/**
npx tsc                                     # strict，0 error
node token_next/probe.cjs                   # 21 段输入 + 池 = 0 那一格的直接驱动
```

（`tmp/r1051/xl.mjs` 是 README 里那个「读数与真命令行同一份」的入口；`xl` 不在 PATH 上。）

## 设计没写死、实现必须选一种的几处

设计写的是**架构**，下面这些是它的缝；每一处都选了最保守的一档，并且在代码里写明理由。

| 缝 | 这一版怎么落 |
| --- | --- |
| 「关闭只是一个触发信号」怎么落地 | `Process` 返回**「这个字符被我吃了」**：没吃（关了、或我不认）由调用方接着问下一格。关闭不改树，只是让上面那一层有机会重问同一个字符 |
| 「basic token 关闭时通过 parent 往上找到 catalog guide」 | `NotifyClosed` 沿 `Parent` 往上走，**第一个答 `true` 的祖先吃掉这次关闭**；core 因此不认识向导这个类（覆写 `OnChildClosed` 就接上了） |
| 「需要构造结束事件才能判」 | `Finish` 沿挂载链往下传；输入结束时还开着的那几格由 `CloseChain` **从最里面往外**关掉（次序是实测逼出来的，见下） |
| C1「它是一个真实单元，字符经它转给子单元」 | 向导**被挂载**（`AddToMounted`）但**不进 `Data`**——C6「不进产物」于是是结构上的事实，再加 `InProduct` 一句显式声明 |
| C2「池的初始值由挂它的那个 shape 声明」 | `LanguageToken.DeclareShape` 由**挂载方**调用、由语言层回答：池里那些名字是语言形状的名字。同一趟还要说**要不要交左邻**（调用的被调用者、下标的被下标者） |
| `LanguageShapeToken` 的两种身份 | `Pool` 非空 = **reader**（那一族的入口，建向导、管括号、最后搬运）；`Pool` 空 = **池里的一格**（它出产物） |
| resolve 与 exit 的分别 | resolve（池 == 1）只**建出**那一格；搬运（`MoveDataTo` 那一手）在 exit：`FinishConstruct` 把左邻、内容、判别事件按次序搬进形状，自己退出树 |
| §1.1 那五行之外还需要的表 | `CommentConfig`（注释标记）、`RegexConfig` 的转义与字符类括号、`NewlineChars`（空白表的第二个面）、`PunctuationOperators`（运算符集的第六格：`=>` / `...` / `?.` / `??`）、`MultilineForms`（多行**按形态**切分）——都写在各自那一页的说明里 |
| 「名字字符」那张表 | **不加**：`ClassOf` 把三张表都没认领的字符算作 `text`，名字就是一段 `text`——core 因此不需要第四张表 |

## 三种失败在这一版里的样子

| 情形（§5） | 这一版 |
| --- | --- |
| **池 = 0** | 抛 `ConvergenceException`，证据齐全：触发关闭的单元（标签 / 正文 / 区间）、**清空前**的池、之前每一次收敛各收掉了什么。合法输入到不了这一格——五个族的排除都是单向的（`probe.cjs` 直接驱动那一格来证明证据齐） |
| **构造结束仍 > 1** | 记一条账（挂我的形状、池、收敛事件），并**如实留下未收敛的那一串单元**——不猜、也不挑一个看起来顺眼的形状。`probe.cjs` 的 `g = (a)` 就是它：判别事件（`=>`）在括号**后面**，输入正好断在那里 |
| **池 = 1 但是错的** | 承认它存在（形式化上不可判定），这一版不做任何兜底——按设计只由逐字节等价兜底，而那是接进旧树之后的事 |

## 实测逼出来的三处改动（都是探针先红的）

1. **`(` 上无限递归**（栈溢出）：`Bracket` 一开始只用基类的调度（有挂载单元就转给它），于是开符号被
   挂上去的内容读到、内容又问一次「这里要不要开一个形状」⇒ 同一个 `(` 上无限开新括号。
   改法：`Bracket` 覆写 `Process`，**开符号先认自己**。
2. **闭符号的次序反过来**：只做到第 1 条时，`f(1)` 的参数整格变成没收敛的 reader——
   括号把 `)` 先抢走了，内容里那一格永远没机会关掉自己、正文也就没机会落地。
   改法：**闭符号先让内容收口、再认自己**。
3. **输入结束那一趟**：`Next()` 是用「走出界」报告结束的，所以收尾时游标停在 `Length()` 上——
   不退回最后一格，未闭合的构造会多记一格（`f(a` 的 `CallShape` 曾量到 `[1,3]`）。
   改法：`Source.Rewind` + `CloseChain` **从最里面往外**关（反过来的话，`f(a` 的参数会整段丢掉）。

## 这一版的边界（没做的，记在这里）

- **没有语句层**：`const x = 1;` 里那个 `const` 现在是一格 `NameShape`——词表（`Keywords` /
  `ModifierWords` / `DeclarationWords`）已经装进表里，但还没有哪一族去读它。
- **判别事件那一格落进形状的子单元**：`(a) ;` 的 `;`、`(a) => b` 的 `=>` 现在排在形状内容的后面
  （次序是对的：左邻 → 内容 → 判别事件），但它们本该归语句层——语句层还没有。
- **类型位没分**：`Array<T>` 那一类现在与值位同形（`<>` 是符号，还没有那一族）。
- **`<` 的歧义族没做**：`f<A>(x)` 与 `a < b` 是真正的**内容判别**（设计里最像它想解决的那一格），
  这一版只有五个族。
- **没有接进旧树的门**：`token_next` 是**并列的第二套实现**，`tests/gates` 里没有一道门量它。
  唯一的接触面是**生成物**：它们落进 `dist/ts/`，于是 `cases:tsast` 的语料里就有它们
  （现算：`corpus("all")` **2127 份里有 27 份**来自这一棵）——旧解析器照常解析、照常与 TS 的 AST 对拍，
  这一趟是绿的。（`cases:direct` 吃的是 `corpus("cases")` **1689 份**，不含 `dist/ts`。）
  这一版真正的证据还是上面那三条命令与探针的 21 段输入。

## 这一版留下的读数

- `xl check token_next`：**27 页 0 error / 0 warning**；
- `npx tsc`（strict，整仓 `dist/**`）：**0 error**；
- 探针 21 段输入：**形状与区间对得上、账 0 条、没有不被认领的字符**（池 = 0 那一格是刻意触发）；
- 旧树的八道门：**8 通过 / 0 失败**（本轮只重跑了旧树的产物生成，规范一行没动）。
