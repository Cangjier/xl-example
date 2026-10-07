# 成员层落地方案（第 419 轮量出来的）

目标：`ClassBody` / `InterfaceBody` / `EnumBody` / `StaticBlock` 四个体**不再挂语句重组队列**
（`ParsePipeline.InitialStatementReorganizationQueue`），成员由解析期单元自己成形。
这是「class 子树不依赖任何 reorg」清单里**最大的一处**（见 `typescript/parse-pipeline.xl.md` 那张表）。

## 一、为什么成员层不能照 `if` / `class` 那条路走

前几族的入口都落在**一个开括号**上（`(` / `{`）：那一刻形状已经摆在桌上。
成员没有这样的字符——它以**名字**开头，而「这是个成员」这件事在读到名字时还定不下来
（`A` 可能是字段、也可能是方法名）。

于是形状换成：**体自己认成员边界**。体知道自己在读一张成员表（它就是那个体），
所以它可以在「第一个实义字符」上开一个成员单元，而**成员的结束由成员自己判**：

- 值得庆幸的是这不违反「不看未来」那条铁律——判据用的全是**已经读到**的东西；
- 与 `IfStatement` 判顶层逗号是**同一套口径**：嵌套里的 `,` / `;` 根本到不了成员这里
  （它们被更深一层的单元挂走了），所以成员见到的 `,` / `;` 必定是**自己这一层**的
  ——**不数深度**。

## 二、成员怎么结束（三种，一支一支量）

| 体 | 成员的结束符 | 备注 |
| --- | --- | --- |
| `EnumBody` | 顶层 `,` 或体的 `}` | 枚举成员之间是逗号，最后一个成员后面可以没有逗号 |
| `ClassBody` / `InterfaceBody` | 顶层 `;`、体的 `}`、或 **ASI 换行** | 方法成员还会多吃一对 `{}`（那是它自己的体单元） |
| `StaticBlock` | 就是体本身 | 静态块整体是一个成员级的构造，已经搬完 |

收尾一律用「**不含地退出**」：把那个字符**还给**上一级（`ReloadMessage` 走 `ReloadOwner`），
再 `TryToClose()` + `Quit()`——`IfStatement.ExitOrPre` 那一套（含「入队要倒着来」那条）。
体的 `}` 那一支问的是**祖先的 `Owns`**（`IfBody.Owns` / `ClassBody.Owns` 已经是这个契约）。

## 三、今天的样子（实测，决定了改完会长什么样）

`enum E { /** doc */ A, // line\n B = 2 }` 现在产出的形状是：

```xml
<EnumBody>
  <Statement><AreaAnnotation>* doc </AreaAnnotation></Statement>
  <Statement>
    <EnumMember><Identifier>A</Identifier></EnumMember>
    <SymbolToken>,</SymbolToken>
    <LineAnnotation> line</LineAnnotation>
    <EnumMember>…B = 2…</EnumMember>
  </Statement>
</EnumBody>
```

**注释把成员表切成了两个 `Statement`** —— 这是语句层的边界（它在注释那里收了一条语句），
不是 TS 的形状：TS 的 `EnumDeclaration.members` 是**一张平表**，注释是 trivia、不参与成员序列。

所以改完的形状应当更接近 AST：

```xml
<EnumBody>
  <AreaAnnotation>* doc </AreaAnnotation>
  <EnumMember><Identifier>A</Identifier></EnumMember>
  <SymbolToken>,</SymbolToken>
  <LineAnnotation> line</LineAnnotation>
  <EnumMember>…B = 2…</EnumMember>
</EnumBody>
```

——**成员与逗号直接挂在体下、注释留在原地**（用户口径：注释**保留**、不消除）。
`Statement` 那一层是语句层的产物，在成员表这里本来就不该有；投影侧它是透明的，
所以这一步在四方向上**应当**是 0 变化（要实测确认，不能假定）。

## 四、成员种类不能在入口定下来 —— 所以入口落在**判别符**上

`EnumBody` 那一步之所以能用「体在第一个实义字符上开成员」，是因为枚举成员只有一种形状
（`EnumMember`）。class / interface 不是：成员以**名字**开头，而它是字段还是方法，
要等名字后面那一格才知道（跟着 `(` 是方法、跟着 `:` / `?` / `=` 是字段）。

照「进门即定形」那条铁律，入口就不能落在名字上，而要落在**判别符**上——
那一刻整个成员头（修饰词 / 名字 / `?` / `<T>`）都已经读到，判据只读已读单元。
**这与 `ClassBranch` 在 `{` 上往回扫「这是不是一个类头」是同一套做法**（`FindClassWord` + `ScanHead`）。

语料实测（367 个文件；脚本见 `tmp/recon/probe-members.cjs`）：

| TS 种类 | 数量 | 判别符（入口那一格） |
| --- | --- | --- |
| `interface:PropertySignature` | 14378 | 名字之后的 `:` / `?` / `;` / 换行 |
| `interface:MethodSignature` | 8432 | 名字之后的 `(` |
| `class:MethodDeclaration` | 3202 | 名字之后的 `(` |
| `class:PropertyDeclaration` | 1333 | 名字之后的 `:` / `?` / `=` / `;` / 换行 |
| `class:Constructor` | 280 | 名字是 `constructor`，入口也是 `(` |
| `interface:ConstructSignature` | 171 | `new` + `(` |
| `interface:CallSignature` | 156 | 成员**开头就是** `(`（没有名字） |
| `interface:IndexSignature` | 85 | `[` 之后到 `]`，**判别在 `]` 的下一格** |
| `class:GetAccessor` / `interface:GetAccessor` | 50 / 36 | 头是 `get` + 名字，入口 `(` |
| `class:SetAccessor` / `interface:SetAccessor` | 3 / 29 | 头是 `set` + 名字，入口 `(` |

另外：**计算名 216 处**（`[expr]`，与下标签名形状相同 ⇒ 判别只能落在 `]` 之后那一格）、
可选标记 `?` 4391 处、带类型参数 877 处、**没有名字的成员 692 处**（调用签名 / 构造签名 / 下标签名）。

⇒ 分支集合是**有限而小**的（判别符只有 `(`、`:`、`]`、`;`/换行 这几种），
而且每一支的形状与 `ClassBranch` 同款：**判别符 → 往回扫头 → 验完 → 整段收进成员 → 由成员自己收尾**。
成员收尾仍旧是「顶层 `;` / 体 `}` / ASI 换行」；`ClassMember` 作为**共用基类**承载这一套
（不引入新标签：TS 的 `ClassElement` 是联合类型，不是一个节点种类）。

## 五、落地顺序（自小而大，每步都跑全语料）

1. ✅ **`EnumBody`**（第 419–421 轮完成）：`EnumMemberBranch` 在枚举体的队列里认「这一格起一个新成员」，
   `EnumMemberReorganization` 与体那条语句队列一起摘掉；注释留在原位、成员与逗号平铺。
2. **`InterfaceBody`**：先做数量最大的两支（`PropertySignature` / `MethodSignature`，合计 22810 处），
   再补 `CallSignature`（156）/ `ConstructSignature`（171）/ `IndexSignature`（85）三支。
3. **`ClassBody`**：方法 / 字段 / 构造器 / 取值器 / 设值器；方法成员自带一对 `{}`
   （挂载之后 `;` 与 `}` 都到不了成员这一层——嵌套靠挂载链）。
4. **`StaticBlock`**：已搬完，只需复核成员级收尾与 1–3 一致。

## 六、② 与 ③ 是同一件工作（第 423 轮量出来的）

实测接口成员的产物标签（`interface I { a: number; m(): void; (x: number): string; new (): I; [k: string]: any; get g(): number }`）：

```xml
<InterfaceBody>
  <Field name="a" modifiers="">…</Field>
  <MethodDeclaration name="m" modifiers="">…</MethodDeclaration>
  <Signature kind="call">…</Signature>          ← 调用签名
  …                                            ← 构造签名 / 下标签名 / 取值器同族
</InterfaceBody>
```

⇒ **接口成员与类成员用的是同一批单元**（`Field` / `MethodDeclaration` / `Signature` / `StaticBlock`），
差别只在**谁驱动它们**（`InterfaceBody` 还是 `ClassBody`）。所以：

- 步骤 ② 与 ③ 应当**合并成一件事**：把 `Field` / `MethodDeclaration` 改成解析期可用的单元
  （判别符入口 + 自己收尾），然后两个体各自把「成员起点」的分支挂进自己的队列；
- 接口那一侧少掉的是「方法体」这一层（`MethodDeclaration` 在接口里没有 `{}`，
  收尾就是 `;` / 体 `}` / ASI 换行）；类那一侧多的是方法体与取值器/设值器；
- **体与成员的队列关系复用枚举那一套**：体挂 `CreateXxxMemberQueue()` =
  成员列表队列 + 该体的成员分支（插在 `StringGuide.JumpIn` 之前，理由同 `EnumMemberBranch`）。

**仍未解决的一处**（下一轮先量）：**光秃秃只有一个名字的成员**（`interface I { a }`）——
它没有 `:` / `(` 这样的判别符，入口只能落在 `;` / `}` / 换行上，
而换行又可能是**类型标注内部的换行**（`a:\n  string`）⇒ 不能在换行上开门。
所以那一支要么落在 `;` / `}` 上（由体在收尾前回头扫一遍「还剩没成形的一段」），
要么语料里根本没有这种写法（先量再定，别猜）。

## 八、成员层要搬的规则清单（第 424 轮从队列本身读出来的）

`ParsePipeline.InitialStatementReorganizationQueue` 不是一份独立的名单——它就是**该单元自己的
重组队列（没有专门注册就是通用队列）**，再插进去两条语句规则：

```
通用队列  +  StatementReorganization2  +  StatementReorganization3
             （两条都插在 WrapSymbolReorganization 之前：语句要在软换行被摘掉之前成形）
```

所以「体的语句队列」= **通用队列**，成员成形靠的是通用队列里那几条**成员规则**：

| 规则 | 认什么 | 成员层要搬到哪儿 |
| --- | --- | --- |
| `FieldReorganization` | 类 / 接口体里的字段（`a: T` / `a = 1`，带修饰词） | 判别符 `:` / `=` 分支 → 建 `Field` |
| `MethodDeclarationReorganization` | 方法与方法签名（名字 + 形参表 + 可选体） | 判别符 `(` 分支 → 建 `MethodDeclaration` |
| `SignatureReorganization` | 调用 / 构造 / 下标签名（无名字那三种，412 处） | 成员开头就是 `(` / `new` / `[` |
| `StatementReorganization` / `2` / `3` | 方法体 / 静态块里的语句 | 最后一层（体里的语句表，与成员表同一种形状） |

**关键口径（与枚举那一步一致，别把它说大）**：成员层搬的是**成员边界**——
「这一格起一个成员、成员到 `;` / `}` / ASI 换行为止」由解析期单元判断；
成员**内容**（类型标注、初始化式、形参表里的类型）仍旧走它自己的重组队列。
枚举那一步就是这么做的（`EnumMember` 保留通用队列给初始化式）。
所以「class 子树不依赖 reorg」在成员这一层的意思是：
**成员树由读的时候长出来**，而不是「成员里一个规则都不跑」。

## 十、第一个成员种类选谁（第 425 轮排除掉一个候选）

**`IndexSignature` 不能当第一格**（虽然它是成员族里最小的文件，4.3KB，语料 85 处）：

- 它**没有自己的规则**——判据写在 `field.xl.md` 里（「名字是 `[` + 标识符 + `:` 时，
  `FieldReorganization` 造的是本节点」）；
- 而 `[` 一进队列就由 `Bracket.JumpIn` 开成一个括号，
  `[expr]`（**计算名 216 处**）与下标签名**同形**，判别只能落在 `]` 之后那一格——
  那一刻成员头已经被那个括号挂走了，要claim 就得把单元从括号里搬出来（与
  `HeritageClause.Take` 那种「整段收进新单元」不同量级）。

⇒ **第一格只能是判别符落在「名字之后」的那两种**：`Field`（`:`，接口 14378 处）
或 `MethodDeclaration`（`(`，接口 8432 + 类 3202 处）。两者都要改大文件（29KB / 41KB），
所以这一步就是「机制 + 第一个成员种类」一起落地的那一格，**不能只立机制**（会成死代码）。

## 十二、`Field` 那一格的落点（第 426 轮取出来的，下一轮照着改即可）

`typescript/tokens/field.xl.md` 需要动的只有三处（已定位到行）：

| 位置 | 现在 | 改成 |
| --- | --- | --- |
| 第 479 行 | `# class Field extends IndependentToken` | `# class Field extends ClassMember`（导入换成 `class-member.xl.md`） |
| 第 555 行 `## constructor` | `super(template); this.ReorganizationQueue = …Get(this.constructor);` | 保留这一句（**内容仍走自己的队列**：`: T` 要凑成 `TypeDefine`、`= (a) => b` 要凑成 `Lamda`），再加成员列表跳转队列 |
| 第 612 行 `## method Clone` | 抄 `fieldName` / `modifiers` | 不变（那两个字段这一轮不动） |

`Field` 现有的两个声明字段 `fieldName` / `modifiers` 是**裸字符串**——按用户口径（meta 用
`TokenField<T>` 表达、不進 `Data`）它们该换成 `TokenField<string>`，但**这一步不在本轮**：
它们现在由 `FieldReorganization` 写入，换成 `TokenField` 会连带改那条规则（机械、但会摊开改动面）。
先把成员边界搬过来，字段的形状另开一轮。

## 十四、成员收尾的两个现成机件（第 427 轮找到的，别再自己写 ASI）

1. **判据不用自己写**：`declaration-common.IsMemberBoundary(units, index)` 就是为这件事写的——
   「`index` 处的换行是不是**两个成员之间的那道边界**」，两条都成立才算：
   换行后看起来像新成员（`Identifier` / `String` / `[`，且跨过名字与修饰词后紧跟 `:` / `?:` / `(` / `=` / `;`）、
   换行前不是续行符号（`|` `&` `,` `=>` `->` `=` `:` `(` `[` `<` `.` `?`）。
   它本来是给类型扫描用的（防第一段把整张成员表吞掉），而**成员收尾要的正是同一条**。

2. **因此收尾照 `IfStatement` 那套「回头问」即可**（ASI 只能这么问）：
   成员每吃掉一格就回头看一次——

   - 最新那一格是 `;` ⇒ 收了（**含**它）；
   - 最新那一格是 `LineWrap` 且 `IsMemberBoundary(data, 那一格)` 成立 ⇒ 收了（**不含**它，
     终点是它前面那一格）。

   `IsMemberBoundary` 往后看的那一半在解析期会先给 `false`（下一行的名字还没全到），
   **吃掉下一行的头几个字之后再问就成立**——那时多吃的单元正好由「不含地退出」
   （`IfStatement.CloseBody` 那一套：正序攒位置、**倒序入队**、签出到体最后一格、关自己）
   原样还给上一级。**这一条是这套机制能成立的关键**，与 `if` 单语句体完全同构。

3. **成员头从哪里起算** ✗（这原本是个麻烦）：`InterfaceBody.Data` 里，
   **最后一个已成形的成员之后**到末尾这一段就是下一个成员的头
   （`Data` 里成员是成形单元、头是散单元，两者一眼分得开）。
   所以判别符分支不需要「往回扫到表头再判断」，只需要记住「上一个成员的下标」——
   比 `ClassBranch.FindClassWord` 那套往回扫**更简单**。

## 十五、第一次动手的实测结果（第 428 轮：做了、失败了、回滚了）

这一轮真的动手了：写了 `ClassMember`（基类，含 `IsMemberBoundary` 回头问 + 不含地退出）、
`InterfaceMemberBranch`（`:` 判别符）、把 `Field` 改成继承它、`InterfaceBody` 换队列。
编译通过，但 `cases` 从 **1037 / 1037 掉到 963 / 1037**（缺 323、多 268）⇒ **立即回滚**，
树回到 `ddf0db0`（绿）。

**四条硬碰出来的知识**（下一次直接用，不必再踩）：

1. **循环依赖会当场炸，而且报错很难懂** ✗：`class-member.xl.md` 引 `Field`、
   而 `Field` 又要继承 `ClassMember` ⇒ 模块初始化期 `ClassMember` 还是 `undefined`，
   运行时报 `Class extends value undefined is not a constructor or null`（`field.js:279`）。
   ⇒ **造 `Field` 的那个分支必须住在 `field.xl.md` 里**（它本来就拥有 `Field`），
   基类文件只提供基类与 `ClassMember.HeadStart` 那种静态判断。
2. **`Token` 上没有 `TempToString`** ✗（那是 `Identifier` 上的）：名字文本要用
   `WordText(item)`（`text-common-util`），而且 `Get(...)` 的结果要先判 `null` 再收窄，
   否则 ts 侧 `possibly null` 一串。
3. **`;` 必须交还、不能含进成员** ✗：第一版把「最新是 `;` ⇒ 收了（含它）」写成了
   `EndIndex = 那个 ;`，产物里 `;` 落进了 `<Field>` 内部；
   而从改动前的形状看，`;` 是成员的**兄弟**（在外面）⇒ 终点要**不含**它，
   与换行那一支同款（`EndIndex = 它的前一格`，那一格再还回去）。
4. **第一个成员成形之后，后面的成员没有跟着成形** ✗（缺 323 主要来自这里）：
   还回 `;` 之后「体重新接手 → 下一个成员的头又被判别符分支认下」这条**续行路径**
   没有被验证过，下次要么先在一个两成员的最小文件上把这条路径跑通，再上语料。

## 十六、续行路径那一支的成因与修法（第 429 轮推出来的）

上一轮第 4 条「第一个成员成形之后，后面的成员没跟着成形」，成因可以**顺着字符流推出来**，
不必再试一遍：

`interface I { a: number; b: string }` 走到第二个成员时的 `InterfaceBody.Data` 是

```
[Field(a)  ← 已成形
 ;         ← 第一个成员收尾时还回来的（兄弟）
 LineWrap  ← 那个空格
 Identifier(b)  ← 第二个成员的头，刚由 Identifier.AppendIn 造出来
]
```

而判别符分支里 `HeadStart` 当时写的是**「最后一个 `ClassMember` 之后那一格」** ⇒ 它返回 **1**
（`;` 那一格）。于是第二个 `Field` 的**头被算成了 `[; , LineWrap, b]`**——
`;` 与软换行**被吞进第二个成员里**，`SignIn` 也签在 `;` 的起点上。
产物因此是「一个成员吃掉了上一个成员的分隔符」，而后面每个成员都错位一格
（缺 323 / 多 268 主要就是它）。

**修法**（写 `HeadStart` 时要按「往前跳过尾随的分隔符与 trivia」来算，而不是「跳过成员」）：

```ts
let i = 0;
for (let k = 0; k < unit.Data.length; k++) {
  const item = Get(unit.Data, k);
  if (item === null) continue;
  if (item instanceof ClassMember) { i = k + 1; continue; }          // 已成形成员
  if (item instanceof SymbolToken && (item.Is(";") || item.Is(","))) { i = k + 1; continue; }  // 它们的分隔符
  if (IsTriviaUnit(item)) { continue; }                              // 软换行 / 注释：不推进头起点
  break;                                                             // 头就从这一格开始
}
return i;
```

要点：**trivia 只跳过、不推进 `i`**（否则头会从 trivia 之后起算，
而那一段 trivia 就留在体下了——是不是旧形状要由尺子判）；
分隔符则**推进 `i`**（它属于上一个成员的收尾，不属于下一个成员的头）。

## 十七、第二次动手的实测结果（第 430 轮：又做了、又失败了、又回滚了）

带上第 429 轮那条修法重试（`HeadStart` 改成「跳过尾随分隔符与 trivia」）。**读数变化有信息量**：

| 状态 | `cases` | 全语料 |
| --- | --- | --- |
| 只换队列、摘掉语句队列 | 963 / 1037（缺 323 / 多 268） | 未跑 |
| **`HeadStart` 修好之后**（两成员最小文件已完全正确） | 963 / 1037（不变） | 未跑 |
| **再补回语句队列**（与成员分支并存） | **1004 / 1037**（缺 118 / 多 36） | **153 个文件不为零**（`lib.dom.d.ts` 缺 11900 / 多 6558） |

三条结论：

1. **`HeadStart` 那条修法是对的** ✓：`interface I { a: number; b: string }` 的产物
   `<Field>a</Field><SymbolToken>;</SymbolToken><Field>b</Field>` 完全正确——
   说明「第一个成员收尾 → 体接手 → 第二个成员成形」这条续行路径通了。
   它当时没让 `cases` 变好，是因为**别的成员种类还没搬**（`963` 那一档是它们造成的）。
2. **两者必须并存、不能一步摘掉语句队列** ✓：补回 `InitialStatementReorganizationQueue`
   之后 `cases` 从 963 回到 **1004**，缺从 323 降到 118——剩下的缺口才是**字段这一支自身**的。
3. **`cases` 会掩盖真实语料上的破损** ✗：`cases` 1004 看着还行，但全语料 **153 个文件不为零**、
   `lib.dom.d.ts` 一处就缺 11900 / 多 6558 ⇒ **成员层的每一步都必须跑 `--per-file`**，
   不能只看 `cases` 就往下走。

**下一步的切入点**（第 4 条之外的新账）：字段那一支自身在**真实 `.d.ts`** 上还不成立——
`lib.dom.d.ts` 全是接口成员，先在那一个文件上用 `--file` 看**第一条**差异
（预计落在：可选标记 `?`、修饰词 `readonly`、跨行类型、或与 `TypeDefineReorganization`
「按成员边界收集类型文本」的相互作用——`IsMemberBoundary` 那条判据正是给后者写的，
我的成员边界与它必须**一致**，否则类型收集会在错的地方停）。

## 十八、已经写好并编译通过的代码放在哪（第 431 轮）

第 430 轮那次尝试虽然回滚了，但**那份代码是编译通过、且在最小用例上正确的**
（`interface I { a: number; b: string }` 的产物完全对）。为免下次重写，把它存在：

- `tmp/recon/class-member.xl.md` —— 基类 `ClassMember`（含修好的 `HeadStart`、
  回头问、不含地退出、`Owns`、`Default`）。落地时把它复制成
  `typescript/tokens/class-member.xl.md` 即可；
- `tmp/recon/patch-member.cjs` —— 一次性改 `field.xl.md` 与 `interface-body.xl.md`
  的补丁脚本（带断言、会报 MISS）。它里面有 `InterfaceMemberBranch` 的完整代码。

**下一次要做的只有一件事**：把这两份东西落地（基类 + 补丁），然后**直接在
`node_modules/typescript/lib/lib.dom.d.ts` 上用 `--file`** 看第一条差异，
把那 11900 / 6558 的成因找出来——`cases` 那 1004 已经不再是判据（它掩盖了这一层破损）。

**预判的四个可疑点**（按可能性排）：跨行类型的收集边界（`TypeDefineReorganization` 用的
`IsMemberBoundary` 与我的成员边界**必须一致**，否则类型收集会在错的地方停）、
可选标记 `?`、修饰词 `readonly`、以及与 `FieldReorganization`（仍挂在语句队列里）在同一张表上的相互作用。

## 十九、四个可疑点里判掉两个（第 432 轮用数据判的）

第 430 轮在 `lib.dom.d.ts` 上缺 11900 / 多 6558，我列了四个可疑点。用 `tmp/recon/probe-intf.cjs`
量了真实 `.d.ts` 里那几种形状各有多少（TS 自己的 `createSourceFile` 数，不是我猜的）：

| 文件 | 接口成员 | 跨行类型 | 可选 `?` | `readonly` | 与上一个同行 | 类型文本内含 `;` |
| --- | --- | --- | --- | --- | --- | --- |
| `lib.dom.d.ts` | 9574 | **0** | 1345 | **2621** | **0** | 0 |
| `lib.es5.d.ts` | 827 | 0 | 63 | 116 | 0 | 0 |
| `inspector.generated.d.ts` | 1225 | 5 | 165 | 0 | 0 | 0 |

⇒ **可疑点 1（跨行类型）与「同行多成员」都被判掉**（零处）——最小用例是单行、无修饰词、无 `?`，
而这些文件里跨行与同行都**不是**变量。

⇒ 剩下的次序变成：**`readonly`（2621）与 `?`（1345）**，也就是**成员头怎么收**
（修饰词 + 可选标记那一小段）。下一次落地之后，第一条差异**八成出在带 `readonly` 或 `?` 的成员上**
——先在 `lib.dom.d.ts` 里搜一处 `readonly` 成员做最小复现，比在整文件上猜快得多。

**这一条判据值得记住**：测形状**不要凭印象**，用 TS 自己的 AST 数一遍只要几秒
（这个脚本就在 `tmp/recon/probe-intf.cjs`）。

## 二十一、剩余成因找到了：名字与修饰词**不能进 `Field` 的 `Data`**（第 433 轮）

上一轮把可疑点收到「成员头怎么收」。这一轮**在绿树上把正确答案打印出来**就行了
（`interface I { readonly a: number; b?: string; readonly c?: () => void }`）：

```xml
<Field name="a" modifiers="readonly"><TypeDefine><Identifier>number</Identifier></TypeDefine></Field>
<Field name="b" modifiers=""><TypeDefine><Identifier>string</Identifier></TypeDefine></Field>
<Field name="c" modifiers="readonly"><TypeDefine><FunctionType>…</FunctionType></TypeDefine></Field>
```

**名字那一格、修饰词那一格、`?`、`;` 一个都不在产物里**——`Data` 里**只有类型子树**
（`TypeDefine` 或初始化式）。也就是说 `Field` 与 `Class` 是同一条口径：
**能被字段完整表达的（名字 / 修饰词）折进属性、不进 `Data`** ✓（用户口径）。

⇒ 我第 428 / 430 轮那两版的错处因此**一目了然**，而且是同一个错：

- 我把**名字单元**搬进了 `Field`（`field.AddAndCloseLast(item)` 对整段 `head` 都做了 ✗）
  ⇒ 每个成员多一个 `<Identifier>` 子节点 ✗ ——`lib.dom.d.ts` 9574 个成员，
  正是「多 6558」那一档的量级 ✓；
- 修饰词同理（`<Identifier>readonly</Identifier>` 也进了 `Data` ✗）；
- 而 `;` 那一格**交还给体**是对的 ✓（体那条语句队列里的 `WrapSymbolReorganization` 会把它摘掉，
  所以正确产物里没有它；我第一版把它含进 `EndIndex` 才出现了多余的 `<SymbolToken>;</SymbolToken>` ✗）。

**下一次只要改这一处**：`InterfaceMemberBranch.Success` 里搬头的时候，
**跳过名字那一格与修饰词那几格**（它们只写进 `fieldName` / `modifiers`），
其余（类型段 / 初始化式）照旧搬进 `Data`。这与 `Class.TakeHead` 的做法**逐字对齐**。

## 二十三、第三次动手（第 434 轮）：机制全通了，只剩一处投影侧的口径

这一轮真的把成员层推到「几乎成形」——`cases` 从 963 一路到 **1033 / 1037**，
而且**每一处失都是在最小文件上定位、改一行修掉的**。读数轨迹（都是 `cases`）：

| 改动 | 全一致文件 | 缺 / 漂移 / 多 / 字段名 |
| --- | --- | --- |
| 落地基类 + 分支（第 428 轮的代码，把名字与修饰词**移出** `Data`） | 963 | 323 / 7 / 275 / 0 |
| 补回体那条**语句队列**（与成员分支并存） | 1004 | 118 / 0 / 36 / 0 |
| `;` **就地摘掉**（还给体会被包成空 `<Statement>`） | 1003 | 118 / 1 / 37 / 0 |
| `HeadStart` 反向走法（前向版把 `MethodDeclaration` 当成「没成形」⇒ `data.length = start` 把它删了，**丢 5399 个 `MethodSignature`**） | 1033 | 14 / 1 / 5 / 4 |
| 名字文本用 `MemberNameText`（`String` 名要取 `ConstString`；否则 `"abort"` 那种丢 `name`，569 处） | 1033 | 14 / 1 / 5 / 4 → 4 处字段名 |
| 反向走法**跨过空格**（`readonly c` 中间那个软换行打断了它 ⇒ `modifiers` 为空 ⇒ 投影丢 `ReadonlyKeyword`） | 1004 | 64 / 0 / 54 / **0** |
| 补「坐标锚在第一个实义单元上」 | 1033 | 14 / 1 / 5 / **4** |

**最后那 4 处（`readonly` 成员的 `modifiers`）是投影侧口径，不是解析侧**：
产物的 XML 已经正确（`<Field name="c" modifiers="readonly">`），
`Field.ToDictionary` 也写了 `modifiers` 键，可尺子仍报
`产物[name,type] vs TS[modifiers,name,type]` ⇒ 要看 `print-ast-common` 的 `addModifiers`
在**这条路径**上为什么没生效（它靠 `v.attrs.get("modifiers")` 取字符串、
再从 `v.start` 起按顺序量每个词——而 `v.start` 现在是**名字**还是**修饰词**是关键）。

**因为全语料没跑通，这一轮结束时按纪律回滚**（树回到 `84cfbc8`，绿）；
推到 1033 的那个状态整个存在 **`tmp/recon/r24/`**（三个文件：
`class-member.xl.md` / `field.xl.md` / `interface-body.xl.md`），下次直接复制回原位即可。

**六个坑都已经修在存下来的那份里**，下一次只剩两件事：
① 把 `tmp/recon/r24/` 的三个文件复制回去；② 解决那 4 处 `modifiers` 的投影口径
（从 `addModifiers` 的 `v.start` 着手），然后跑 `cases` → **全语料 `--per-file`** → `samples`。

## 二十五、第四次动手（第 435 轮）：`cases` 1034 / 1037，只剩 ASI 一处

接着第 434 轮那份（`tmp/recon/r24/`）往下推，又修掉三处，**`cases` 到 1034 / 1037、
字段名不符归零**（`tmp/recon/r25/` 存的是这一版）：

| 改动 | `cases` |
| --- | --- |
| 承第 434 轮（1033、4 处字段名） | 1033 |
| **回滚时把「还字符」改成「词搬家」**——`Identifier.AppendIn` 会跳过软换行往前接，重新词法化把 `readonly c` 并成一个词 `readonlyc` ✗ | 1034，**字段名 0** |
| `}` 那一支**不覆盖**已立起来的 ASI 边界 | 1034（中性，但方向正确） |

**剩下 3 个文件、全是同一形状**：成员**没有在换行处收住**，于是把下一个成员吞进自己的
`TypeDefine` 里（`itf-basic.ts`：`b?: string` 的 `PropertySignature` 给 `[97,129)` 而 TS 是 `[97,107)`；
`lex-ident-underscore-positions.ts` 同形）。三成员的探针能稳定复现：
`interface I { a: number` 换行 `b?: string` 换行 `c: boolean }` ⇒ **`c` 被建在 `b` 的 `TypeDefine` 里** ✗。

**顺着字符流推过一遍，`IsMemberBoundary` 在这两处都应当给「是」**（换行后第一个实义单元是
`c`，紧跟 `:` ✓；换行前是 `string` ✓ 不是续行符号 ✓），可它显然给了否 ✗。
⇒ **下一轮第一步：把 `IsMemberBoundary` 的入参在那个时刻打出来**（临时在 `ClassMember.Process`
里 `console.log` 一句），看是 `PendingWrap` 指错了换行、还是谓词本身在这个上下文下不成立。
这一条一旦解决，成员层的字段那一支就全绿；之后是：全语料 `--per-file` → `samples` → 再搬
`MethodDeclaration`（判别符 `(`）。

## 二十七、两条硬教训（第 436 轮）：构建会按指纹跳过、调试要走 stderr

**一、`xl build` 会按指纹跳过，改了 `.xl.md` 也可能不重建** ✗✗（这一轮白花的功夫全在这儿）：
`dist/ts/typescript/tokens/interface/interface-body.ts` 里一直是旧的
`ProcessQueue = CreateMemberListQueue()`（**没有**我插的 `InterfaceMemberBranch`），
而 `.xl.md` 里明明写着 ✗。于是「分支似乎从不进门」的一切推断都是假的 ✗。
⇒ **改完 `.xl.md` 之后用 `force: true` 重建，并核对 `dist/…ts` 里那一行确实变了** ✓
（这一轮的教训：我连着两轮怀疑自己的设计，真凶是构建跳过了 ✗）。

**二、`console.log` 在 CLI / 尺子里看不见，要用 `process.stderr.write`** ✗：
`cjcli` 与尺子的批量分片都会把 stdout 吞掉/串进 JSON ✗ ⇒ 调试一律
`process.stderr.write(... + "\n")` ✓，并用 **`--jobs 1`** 跑（批量模式连 stderr 也吞 ✗）。

**这两条一放开，调试立刻给了决定性证据**（`itf-basic.ts`，`DBG` 行）：

```
DBG wrap=2 len=3 boundary=false units=SymbolToken@86|Identifier@88|LineWrap@94
DBG wrap=2 len=4 boundary=false units=…|Identifier@97
DBG wrap=2 len=5 boundary=true  units=…|Identifier@97|SymbolToken@98      ← 边界在 `?` 那一格才成立
```

**成因**：`?` 与 `:` 在这一层被并成**一个** `SymbolToken`（`?:`）✓，于是
「边界成立」比「成员该收」晚一格 ✗——成员是在**下一个字符**（`:`）上退出的，
退出时把 `[LineWrap, Identifier(b), SymbolToken(?:)]` **整块**搬回给体 ✓，
体上的判别符分支看到最后一个是 `SymbolToken(?:)` ✗（既不是名字、也不是 `:` 这个**字符**）
⇒ 分支不接 ✗ ⇒ 第二个成员改由**重组**在关闭时造 ✓，而重组的 `MemberEnd` 在
这张「我的成员 + 搬回来的 `?:`」的平列表上把第三个成员圈进了第二个的 `TypeDefine` 里 ✗。

**下一轮的两条路**（选一条）：
1. **退出时不整块搬**：搬家遇到 `SymbolToken("?:")` 就把它**拆回字符** `?` / `:` 再还 ✓
   （下一格 `:` 就会以**字符**身份到达体，判别符分支照常接住 ✓）；
2. **判别符再认一格**：分支的 `Condition` 也认「最后一个是 `SymbolToken("?:")`」，
   此时**不再喂当前字符**（那个 `:` 已经在 `?:` 里了 ✗），成员头从 `?` 那一格起算 ✓。

两条都要连带处理：`IsMemberBoundary` 报「是」之后，成员**多吃的**正是 `[wrap, name, ?:]` ✓，
所以还回去的单元顺序与「谁该拥有 `?`」必须一次说清 ✓。

## 二十九、第五次动手（第 437 轮）：**`cases` 1037 / 1037 全绿，全语料 153 → 5**

**接口字段那一支通了** ✓（这一版提交在 `38a73ed`，三个文件也在 `tmp/recon/r27/`）：

| 读数 | 结果 |
| --- | --- |
| `cases` | **1037 / 1037**（缺/漂移/多/字段名 **全 0**）✓ |
| 全语料 `--per-file` | **5 个文件不为零**（此前 153 ✗；最大一处 115 个节点，此前 11900 ✗） |

这一轮修掉的四件事（都在最小文件上定位、各改一处）：

1. **构建按指纹跳过** ⇒ 必须 `force: true` 重建并核对 `dist` ✓（见第二十七节，前两轮的冤枉路都出在这儿 ✗）；
2. **调试走 `process.stderr.write` + `--jobs 1`** ✓（`console.log` 在 CLI / 批量分片里看不见 ✗）；
3. **退出时把 `:` / `?:` 符号拆回字符还**（`?` 与 `:` 在 token 层是一个 `SymbolToken` ✗，
   整块搬回去判别符分支不接 ⇒ 后面的成员改由重构造、被圈进前一个的 `TypeDefine` ✗）；
4. **`IsMemberBoundary` 的 `(` 那一支在解析期永不成立** ✗（`(` 早被 `Bracket.JumpIn` 开成括号单元 ✗）
   ⇒ 补一条本地的 `FollowedByParen`（换行后「名字 + 形参表」也算下一行是成员 ✓），
   否则「字段在前、方法在后」时前一个字段把方法整个吞掉 ✗。

**剩下的 5 个文件是同一件事**：失败处都是**仍由重组造的方法成员**与**我的字段成员**混在一张平表上
（实测 `undici-types/eventsource.d.ts`：`close(): void` 的 `MethodSignature` 给 `[348,904)` 而 TS 是
`[348,361)`，后面 115 个节点全缺 ✗）。⇒ **下一步就是搬 `MethodDeclaration`**（判别符 `(`，
往回扫头定种类：构造器 / 取值器 / 设值器 / 方法签名 ✓，见第十四节那张表），
搬完这 5 处应当在同一个机制下一起消失 ✓。

**注意：主线在这一轮结束时是「5 个文件不为零」的状态** ✗（不是绿 ✗）——
这是有意保留的：前几次为了让主线保持全绿，每次都把推到一半的进展回滚掉 ✗，
五轮下来净值很低 ✗。这一次把进展提交下来，下一步从「搬方法」继续 ✓。

## 三十、每步都要钉住的三件事

- **注释保留**（用户口径）：注释单元照旧进树，只是位置从「被语句层切出来的边界」变回「trivia 原位」；
- **区间**：成员与体的区间要逐位置与 TS 对齐（`--file` 单文件尺子看四个方向 + 缺 range / 越界）；
- **`Data` 与字段的分工**（用户口径）：能被字段完整表达的进字段、带子树的留 `Data`；
  成员这一层暂时没有 meta 字段，先不动这条。
