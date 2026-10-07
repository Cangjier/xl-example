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

## 三十一、方法那一支的第一次尝试（第 438 轮）：判别符 `(` 不够

按第三十节的路子试了一版 `InterfaceMethodBranch`（判别符 `(`、把这一格喂给新成员、
括号由成员自己的队列开在成员里面）**并回滚** ✗——读数变差：

| 状态 | `cases` |
| --- | --- |
| 字段那一支（`38a73ed`） | 1037 / 1037 ✓ |
| 加方法分支（判别符 `(`，头 = 修饰词 + 名字） | **1014** ✗（缺 49 / 多 38 / 字段 7） |
| 再补「跨过类型参数段」（`m<T>(…)`） | **1011** ✗（更差） |

**量出来的两条**（都在回滚前的最小文件上看到的）：

1. `m<T>(x: T): T` —— 名字与 `(` 之间有 `GenericType`，**不跨过去分支就不接**，
   于是这一条被重组收成**调用表达式** `<Method name="m">` ✗（`itf-methods.ts`：10 缺 / 3 多）；
   补上跨过之后**反而更差** ⇒ 说明方法这一支还有**别的**入口形状没接住
   （`get x()` / `set x()` / `new (): T` / 成员开头就是 `(` 的调用签名 / `[k: string]` 的下标签名 ✓，
   见第十四节那张表：合计 412 + 50 + 36 + 29 + 3 处）。
2. ⇒ **方法那一支不能只做一个判别符** ✗：它至少要一次把
   「`(` 且头里有名字」/「`(` 且头是 `new`」/「成员开头就是 `(`」/「`[` 起头」四种入口
   一起接住 ✓，否则接住的那些被解析期成形、没接住的那些继续走重组，
   两套形状在同一张平表上打架 ✗（这正是 1037 → 1014 的机制）。

**下一轮的做法**：先把第十四节那张表里的四种入口**逐个写成最小探针**（每个 3–5 行），
在 `--jobs 1` 下一次跑完 ✓，再决定是「一次做完四种」还是「先只做 `get`/`set` 那两类」✗。

## 三十三、半迁移状态为什么会互相踩（第 439 轮量出来的机制）

那 5 个破绽的机制**找到了**（也解释了为什么它只在这 5 个文件上出现）：

`undici-types/eventsource.d.ts` 的形状是「**接口成员全都不写 `;`**」——于是：

1. 我的解析期分支把**字段**一个个收成形（`Field` ✓，`ClassMember` 的子类）；
2. 而**方法**（`close(): void`）仍由重组在关闭时造 ✓，它要**往前扫到成员末尾** ✗；
3. 扫描的判据是 `IsDeclarationTailStop` → `IsDeclarationBoundary(item)` ✓，
   那一串名单里有 `Class` / `Function` / `Enum` / `Interface` / `MethodDeclaration` / `Statement`……
   **但没有成员** ✗ ⇒ 它在我的 `Field` 那一格**不停** ✗ ⇒ 一路吞到列表末尾 ✗
   （实测：`close(): void` 的 `MethodDeclaration` 把后面 12 个成员全包了进去，区间成 `[348,904)` ✗，
   TS 是 `[348,361)`）。

**试过两条路、都回滚了** ✗（记下来免得重走）：

| 试法 | 读数 |
| --- | --- |
| 基线（只有字段那一支） | `cases` 1037 / 1037 ✓，全语料 **5** 个文件 ✗ |
| `IsMemberBoundary` 里加「`after instanceof ClassMember` ⇒ 是边界」 | 5 个文件不变 ✗（**方法那一支根本不走这条判据** ✗） |
| `IsDeclarationBoundary` 里加 `item instanceof ClassMember` | 5 个文件不变 ✗，而且 `close(): void` 从「方法声明」变成「**表达式语句**」✗（读变更差） |

**结论**：这 5 处**不是**靠给共用判据打补丁能修的 ✗——它们是「一半成员由解析期造、一半仍由重构造」
这个**中间状态**的必然产物 ✓。真正的出路只有一条：**把方法那一支也搬过来**（第 438 轮那条：
四种入口一次接住 ✗），让成员表整张都由解析期长出来 ✓，那时重组里那套扫描就不再参与 ✗，
这 5 处会一起消失 ✓。

## 三十五、方法那一支的第二次尝试（第 440 轮）：差得更多，回滚

在第三十一节那一版上补了两处（跨类型参数段 ✓、`new` 留给构造签名 ✓）再试：

| 状态 | `cases` | 全语料 |
| --- | --- | --- |
| 字段那一支（基线） | **1037 / 1037** ✓ | **5** 个文件 |
| 方法分支（头 = 修饰词 + 名字 + 可选类型参数段） | **1017** ✗（缺 28 / 多 29 / 字段 7） | **133** 个文件 ✗（`lib.dom.d.ts` 4976 / 7723 ✗） |

**这一版的失败幅度比第一版大一个量级** ✗（第一版只掉 23 个文件、这一版 133 ✗），
说明「判别符 `(` + 头里有名字」这个入口**本身就抓错了对象** ✗：它会在
**字段类型的括号**、**调用签名**、**计算名里的括号**等地方都命中 ✗，
把本不该收的东西收成 `MethodDeclaration` ✓，于是产物里两套形状大面积打架 ✗。

⇒ **下一次不要再从「`(`」入手** ✗。可考虑的方向（下次先各写最小探针量）：

1. **从 `Signature` 那一族入手**：`CallSignature`（156）/ `ConstructSignature`（171）/
   `IndexSignature`（85）在 TS 里都是**独立节点**、形状也各自好认 ✓（成员开头就是 `(` / `new` / `[`），
   先把这三类与 `PropertySignature` 一起做齐，`MethodSignature` 最后做 ✓；
2. **或者换入口**：不认 `(`，而认「**成员头后面紧跟的那一格**」——
   即让 `ClassMember` 在**自己吃完名字之后**由体交棒 ✗（那是另一套机制，代价更大 ✗）。

**要记住的一条**：把成员表**整张**搬完才算数 ✗——只搬一半（字段 ✓ 方法 ✗）
会让重组那套扫描在这张平表上失准 ✗（第三十三节的机制 ✓），
读数会**比完全不搬更差** ✗。

## 三十七、战略结论（第 441 轮）：成员表要么整张搬，要么先别动

四轮实测（第 428 / 430 / 438 / 440 轮）下来的账，全部记在这里，供下一次一次做完时用：

| 状态 | `cases` | 全语料 |
| --- | --- | --- |
| 完全没搬（`8d47a44`） | 1037 / 1037 ✓ | **0** 个文件 ✓ |
| 只搬字段（`38a73ed`） | 1037 / 1037 ✓ | **5** 个文件 ✗ |
| 只搬字段 + 给共用判据补「成形成员也是边界」 | 1037 / 1037 ✓ | 5 个 ✗（`IsMemberBoundary` 不在这条路上；`IsDeclarationBoundary` 加了反而让方法退化成 `ExpressionStatement` ✗） |
| 只搬字段 + 方法（判别符 `(`） | 1017 ✗ | 133 个 ✗ |

**结论**：**半张成员表比不搬更差** ✗——原因是第三十三节那条机制（重组里那套成员扫描
在一张「一半成形、一半散着」的平表上必然失准 ✗），而且这不是打补丁能修的 ✗
（四条补丁实测：`IsMemberBoundary` 加成员 ✗ 无效、`IsDeclarationBoundary` 加成员 ✗ 读变更差、
方法判别符 `(` ✗ 抓错对象、跨类型参数段 ✗ 更差）。

⇒ **下一次的做法**：把成员表**一次搬完**再做（`PropertySignature` + `MethodSignature` +
`CallSignature` + `ConstructSignature` + `IndexSignature` + 取值器/设值器 ✗），
或者**先别动** ✓。已经验过的东西都在：
`38a73ed`（只搬字段那一版，`cases` 全绿）、`tmp/recon/r27/`（同版三份文件）、
`tmp/recon/patch-member.cjs`（字段那一支的补丁脚本，带断言）、`tmp/recon/patch-method.cjs` /
`patch-method2.cjs`（方法那一支，**未成功** ✗，仅供参考）。

**一个还没试过的方向**（也许比判别符更对路 ✗）：**让体自己驱动成员**——
体在「上一个成员结束之后」的第一个实义字符上开一个成员单元 ✓，
成员自己吃完名字；**种类在它吃完名字、看到下一格时才知道** ✗——
这需要成员单元能**改自己的标签** ✗（本工程的标签取自类名 ✗），
所以要么让「成员」是一个**容器类**（标签由子单元决定 ✗ 会多一层节点 ✗），
要么把「谁开成员」交给体、把「什么种类」交给**判别符**（也就是本文档一直在走的路 ✗）。

## 三十九、整张成员表的**参考形状**（第 442 轮量出来的，做的时候照这个产出）

`interface I { a: number; m(): void; m2<T>(x: T): T; get g(): number; set g(v: number);
(x: number): string; new (): I; [k: string]: any }` 在当前（全绿）产物里的形状：

```xml
<Field name="a" modifiers=""><TypeDefine>…</TypeDefine></Field>

<MethodDeclaration name="m" modifiers="">
  <Bracket startBracket="(" endBracket=")"></Bracket>
  <ReturnType><TypeDefine><Keyword>void</Keyword></TypeDefine></ReturnType>
</MethodDeclaration>

<MethodDeclaration name="m2" modifiers="">
  <GenericType …><TypeParameter>…</TypeParameter></GenericType>     ← 类型参数段**是**子单元
  <Bracket …><Parameter>…</Parameter></Bracket>
  <ReturnType>…</ReturnType>
</MethodDeclaration>

<MethodDeclaration name="g" modifiers="get">…</MethodDeclaration>   ← 取值器：`get` 折进 modifiers
<MethodDeclaration name="g" modifiers="set">…</MethodDeclaration>   ← 设值器同理

<Signature kind="call">
  <Bracket …><Parameter>…</Parameter></Bracket>
  <ReturnType>…</ReturnType>
</Signature>

<Signature kind="construct">
  <New>
    <NewType><Bracket …></Bracket><ReturnType>…</ReturnType></NewType>   ← 注意这个形状很怪
    <NewArguments></NewArguments>
  </New>
</Signature>
```

**三条要照着做的口径**：

1. **名字不进 `Data`**（四种都一样 ✓：`name="m"` 是属性 ✓，产物里没有 `<Identifier>m</Identifier>` 子单元 ✓）；
2. **类型参数段要留成子单元**（`m2<T>` 的 `<GenericType>` 在成员里 ✓）——名字与 `(` 之间有它时，
   「名字在最后一格」这个判据要先跨过它 ✓（第 438 轮踩过 ✗）；
3. **构造签名的形状是 `<Signature kind="construct">` 里套 `<New>` / `<NewType>` / `<NewArguments>`** ✗
   ——它不是「`Signature` 里直接一个括号」✗，做的时候必须照抄这个形状，
   否则那 171 处会整类漂移 ✗（`New` / `NewType` / `NewArguments` 三个单元都得造出来 ✗）。

**下标的顺序也要照抄**（这是重组当前的产出顺序 ✓，改了会整类漂移 ✗）：
`Field` / `MethodDeclaration` / `Signature` 都是**按成员顺序**直接挂在 `InterfaceBody` 下 ✓，
没有 `Statement` 那层 ✓（与枚举那一支一致 ✓）。

## 四十一、决定性二分（第 443 轮）：伤害来自**入口**，不是单元改基类

方法分支那一版（`cases` 1017 ✗）到底是哪儿坏的，这一轮**用一次二分问清楚了**：

| 状态 | `cases` |
| --- | --- |
| 字段那一支（基线） | 1037 / 1037 ✓ |
| 字段 + 方法分支（完整） | 1017 ✗ |
| 字段 + 方法分支，但把 **`Condition` 短路**（入口永不进门，`MethodDeclaration` 仍旧 `extends ClassMember` ✓、`ProcessQueue` 照挂 ✓） | **1037 / 1037** ✓ |

⇒ **伤害全部来自那个入口** ✗ ——「让 `MethodDeclaration` 变成解析期可用的成员」这件事本身
**没有**副作用 ✓（这一点很重要：下次可以放心地把单元层先改好 ✗）。

**所以下一次只需要解决「入口」这一件事** ✓：`InterfaceMethodBranch.Condition` 在
**不该命中的地方命中了** ✗。已知它当时的四条闸是：当前是 `(`、宿主是 `InterfaceBody`、
最后一格（跨过类型参数段后）是 `Identifier`/`String`、再往前那一格不是 `:` ✗。
**下一个动作**：把每次命中打一行（`process.stderr.write`，`--jobs 1` ✔ 通道已验证可用 ✓），
在 `itf-methods.ts` 这种小文件上看它把哪些 `(` 认成了成员开头 ✗（本轮调试脚本
`tmp/recon/debug-branch.cjs` 已写好，只是那一行引用了尚未声明的 `start` ✗ ——
下次把 `start` 挪到日志之前，或日志里不打它 ✓）。

## 四十三、入口为什么认错（第 444 轮）：`(` 往往**已经不是字符了**

这一轮把入口日志打出来，终于看清了「`Condition` 命中率低」的真正原因 ✗：

**给 `m(): void` 那类方法，解析期根本等不到 `(` 这个字符** ✗ ——
那个 `(` 早被**体**的 `Bracket.JumpIn` 吃成了一个**括号单元** ✓，
于是「以 `(` 字符为判别符」的入口**一次也不会被叫到** ✗（实测日志：`COND` 第一次被叫到时，
`m` 的东西已经是裸单元 `Identifier|Bracket|SymbolToken|Identifier` ✗，
整条方法最后被重组收成了 `<Statement><Method name="m">` ✗）。

**修正**：入口同时认 **`(` 字符** 与 **`:` / `;`** ✓ —— 后两者到达时括号已经**关好**，
可以连它一起整块搬进成员 ✓（与字段那一支认 `:` 是同一个道理 ✓）。
名字那一格的判据也要**反复跨过**「括号单元」与「类型参数段」✓。

**顺着这条线一次改到底的四处**（都在本轮实测过）：

1. 入口字符：`(` 或 `:` 或 `;` ✓；
2. 名字那一格：`while` 跨过 `Bracket` / `GenericType`（各最多 3 跳）✓；
3. 成员头的坐标：锚在**第一个实义单元**上 ✓（照字段那一支；不锚的话产物里
   `MethodSignature` 给 `[25,54)`、文本为空 ✗）；
4. `IsMemberBoundary` 与 `ClassMember.FollowedByParen` 的探测循环都要**跨过类型参数段** ✓，
   `IsMemberBoundary` 的跟随判据还要认「`(` 已经是**括号单元**」这一支 ✓
   （它是按符号写的 ✗，实测 `m(): void` 换行 `m2<T>(x: T): T` 时 `m` 永不收尾 ✗）。

**读数**（每一处都实测）：`1012 / 1037`（缺 25 / 漂移 5 / 多 18 / 字段名 27）✗ ——
**仍低于字段版的 1037** ✗，故按规则回滚。**剩下的是 `ReturnType` 的成形** ✗：
产物里 `m()` 有 `<TypeDefine>` 但没有 `<ReturnType>` 包着 ✓ ⇒ 投影报
`MethodSignature 产物[name,parameters,typeParameters] vs TS[name,parameters,type,typeParameters]` ✗
（`get x()` 同理：`GetAccessor` 缺 `type` ✗）。
⇒ **下一次从「`ReturnType` 由谁成形」入手**（`MethodDeclarationReorganization.Process` 里那条，
看它对**已经是成员单元**的 `Data` 还跑不跑 ✗），加上 `Signature` 那一族（call / construct / index）✗，
这条线就能收口 ✓。

## 四十五、第六次动手（第 445 轮）：`cases` 1030 / 1037，但全语料 120 ✗

这一轮把第 444 轮那四处修正**脚本化成一条管线**（`tmp/recon/round45.cjs` ✓，
从 r27 那版字段状态一路重建到方法可用 ✓），然后在同一棵树上又推进了三步：

| 步骤 | `cases` | 说明 |
| --- | --- | --- |
| 管线重建（入口认 `(`/`:`/`;`、名字跨括号与类型参数段、头锚实义单元、两条判据跨类型参数段） | 1012 ✗ | 与第 444 轮一致 ✓（可复现） |
| **`MethodDeclaration.TryToClose` 自己把返回类型包成 `ReturnType`** ✓ | **1030** ✓ | 见下 |
| 同上 + 尾 `;` 不进取 `ReturnType` | 1030 ✗ | 字段名 1 ✗（没帮上） |

**两条硬经验**（都实测到根）：

1. **`ReturnType` 那一层必须解析期自己包** ✗：它在绿形状里是**重组规则在平表上**包出来的 ✓，
   而解析期成形的成员那条规则**不会再碰** ✓ ⇒ 只有 `<TypeDefine>`、投影里缺 `type`
   （实测 `MethodSignature 产物[name,parameters] vs TS[name,parameters,type,…]` ✗）。
   自己在 `TryToClose` 里把顶层**最后一个 `:`** 到末尾整段搬进 `new ReturnType(...)` ✓ 就对了 ✓
   ——**`cases` 从 1012 涨到 1030** ✓（`i16.ts` 当场 0 缺 0 漂移 0 多 0 字段名 ✓）。
2. **搬单元时不要先 `RemoveSelf()`** ✗：照重组的写法（只 `AddAndCloseLast`、不摘 ✗）来 ✓；
   先摘会让 **25 个文件直接抛异常** ✗（`抛异常 25` ✗，报在 `get x(): number` 那一格 ✗）。

**但全语料反而是 120 个文件不为零** ✗（`lib.dom.d.ts` 缺 523 / **多 3304** ✗）——
症状是**空的 `<ReturnType></ReturnType>`** ✗（实测 `cache.d.ts`：`<MethodDeclaration name="match"><ReturnType></ReturnType>` ✗）：
包装建出来了、内容却没进去 ✗，于是本该在里面的类型节点全丢了 ✗、别处又多出来 ✗。
⇒ **下一次先解决「空的 ReturnType」这一条** ✓（在 `TryToClose` 里检查
`returnType.Data.length` 与 `tail` 的对应关系 ✗ ——很可能是 `Data.slice` 之后
那些单元仍以 `this` 为父亲 ✗、`AddAndCloseLast` 把它们当成「已属于别人」而拒收 ✗），
再谈 `Signature` 那一族（call / construct / index ✗，其中索引签名现在会吞下一条成员 ✗：
实测 `itf-index.ts` 的 `[key: string]: any` 把 `readonly [k: number]: string` 吞了 ✗）。

## 四十七、第七次动手（第 446 轮）：状态可一键重建，空 `ReturnType` 的现场钉住了

**一条命令重建到 `cases 1030`**：`node tmp/recon/build-member-state.cjs` ✓
（内部依次跑 `round45` / `round45b` / `round45c` / `round46` / `round46b` + 那条 no-RemoveSelf ✓，
全部带断言 ✓），三份产物快照在 **`tmp/recon/r35/`** ✓。以后不必再靠一串脚本临时拼 ✗。

这一轮新增的两条修正（都实测过）：

1. **跨格循环要跳过 trivia** ✗：`match (request: RequestInfo, options?: …): Promise<…>` 这种
   「名字与 `(` 之间一个空格」的写法（`undici-types` 一族遍地都是 ✗），名字后面紧跟的是**软换行**
   ✗ ⇒ 不跳 trivia 的话「最后一格是名字」不成立 ⇒ 入口从不接它 ✗；
2. **`FollowedByParen` 必须先跨过一个名字** ✗：同一个空格的形状里，那道换行**就是**
   名字与 `(` 之间的空格 ✗ ⇒ 不要求「先跨过名字」时，探测从换行后第一格就看见括号 ⇒ 给「是」✗
   ⇒ 成员在**名字后面**就收尾 ✗、返回类型整段被还回体里 ✗。

**空 `ReturnType` 的症状与现场**（下一轮的第一件事 ✗）：

```
<MethodDeclaration name="match" modifiers="">
  <ReturnType></ReturnType>          ← 空壳；类型节点全丢，别处又多出来 ✗
</MethodDeclaration>
```

`cache.d.ts` 的形状是**逗号分隔**的成员表（`match (…): T,` / `has (…): T,` ✗）——
怀疑链路：成员在 `,` 那一格前就收了尾 ✗（`ClassMember.Process` 只认 `;` / 换行 ✗，不认 `,` ✗）
⇒ `ExitOrPre` 把 `:` 与类型整段还回体里 ✗ ⇒ 自己包出来的 `ReturnType` 是空壳 ✗。
**下一轮第一步**：给 `ClassMember.Process` 的收尾判据加上 `,`（成员表里它是分隔符 ✗），
再看 `cache.d.ts` 的空壳是否消失 ✓；然后才是全语料 ✓ → 再谈 `Signature` 那一族 ✗。

## 四十九、空 `ReturnType` 的真因缩小到一处（第 447 轮）

这一轮把上一轮的怀疑链路一条条排掉，现场证据都拿到了：

| 假设 | 结论 |
| --- | --- |
| 成员没被入口接住（`match (…)` 这种名字与 `(` 之间有空格的写法） | **错** ✗ —— 入口日志显示 `char="("` 时尾是 `LineWrap|Identifier` ✓，成员**接住了** ✓（`cache.d.ts` 的 `match` 名字与参数表都正确 ✓） |
| 逗号分隔的成员表让成员提前收尾 | **错** ✗ —— 给收尾判据加了 `,` 分支（照绿形状：`,` 不属于成员、作为裸符号留在体里 ✓），读数不变 ✗ |
| 前导缩进那道换行被 `FollowedByParen` 当成边界 | **错** ✗ —— 加了 `ClassMember.IsLeadingWrap` 守卫（换行前面全是 trivia 就不算边界 ✓），读数不变 ✗ |

**真正钉住的是这一条**（`TAIL` 现场，在 `MethodDeclaration.TryToClose` 里打）：

```
TAIL name=match len=5 units=Bracket|SymbolToken|Identifier|GenericType|SymbolToken
                                        ↑ (        ↑ :      ↑ Promise     ↑ <…>        ↑ ,
```

⇒ 成员收尾时 `Data` **确实**是 `[Bracket, :, Promise, <…>, ,]` ✓，顶层那个 `:` 就在里面 ✓
⇒ `tailStart = 1` ✓ ⇒ 我造的 `ReturnType` **不该**是空的 ✗ —— 可产物里它就是空的 ✗
（`<MethodDeclaration name="match"><Bracket>…参数都在…</Bracket><ReturnType></ReturnType>` ✗）。

⇒ **下一轮的第一件事**：看 `ReturnType` **自己那一趟收尾** ✗ —— 它有自己的 `ReorganizationQueue` ✓，
很可能是它把这几个单元又搬出去/清掉了 ✗（于是类型节点既不在 `ReturnType` 里、
也没能留在成员里 ✗ —— 全语料那 3304 个「多出来」多半就是这么来的 ✗）。
具体做法：临时把 `returnType.TryToClose()` 前也打一行现场（`returnType.Data` 的长度与单元 ✗），
以及看 `return-type.xl.md` 的重组规则对「已经被搬进来一次」的单元做了什么 ✗。

**这一轮净值**：三处怀疑被证伪 ✓、真因缩到一处 ✗、主脚本又多了两条修正（`,` 分支 / `IsLeadingWrap` ✓，
都在 `tmp/recon/build-member-state.cjs` 里可一键重建 ✓）。

## 五十一、两条硬事实（第 448 轮）：`.xl.md` 必须 LF；`ReturnType` 里那层 `TypeDefine` 没人替你包

**一、`*.xl.md` 必须是 LF 行尾** ✗（这一轮踩到并被构建器当场点名 ✓）：

```
error[E0005]: source file contains a carriage return; *.xl.md uses LF line endings
```

我为了「多行锚点匹配不上」去**归一化行尾再还原成 CRLF** ✗ —— 结果文件变成 CRLF 之后
`xl build` 直接拒绝 ✗（连带三个依赖它的文件一起 E1006 ✗）。
⇒ 脚本改文件时**写回一律 LF** ✓；而且真实情况是：仓库本来就是 LF ✓，
之前「锚点匹配不上」的假象是我自己的比较器前导空格造成的 ✗（`tmp/recon/diff-anchor.cjs` ✓）——
**多行锚点匹配不上时，先量一次再说** ✗，不要凭现象改行尾 ✓。
（这一版改成「起点 + 终点」整块正则替换 ✓，最稳 ✓。）

**二、`ReturnType` 是 `IndependentToken`、没有重组队列** ✗ ⇒ 绿形状里那层
`<ReturnType><TypeDefine>…</TypeDefine></ReturnType>` 是**重组规则在平表上**包出来的 ✗，
解析期成形的成员**永远不会**被它碰 ✓ ⇒ 自己搬单元进去时，只有裸单元、没有 `TypeDefine` ✗
（产物就是空壳 ✗）。照着绿形状自己收两层时**又撞上同一个陷阱** ✗：

- `item.RemoveSelf()` ✗ → 25 个文件抛异常 ✗（第 445 轮已实测）；
- `typeDefine.AddRange(items)` ✗ → **同样** 25 个文件抛异常 ✗（这一轮实测 ✓）。

⇒ 同一个坑的两种写法：**单元还挂在 `this.Data` 里时，别用那几个「会登记父亲」的 API** ✗。
**下一轮的正确做法**：先用「不登记」的路子把它们从 `Data` 里拿掉 ✗（例如先 `Data.length = tailStart`
让它们与成员脱钩 ✓，再 `AddRange` ✓ —— 这一轮是先 `AddRange` 后截断 ✗，顺序反了 ✓），
再进 `TypeDefine` → `ReturnType` 两层 ✓。

## 五十三、三个脚本级陷阱（第 449 轮，全是**基础设施**的，与 token 设计无关）

这一轮本想「把顺序改对、量一次就完事」✗，结果全花在脚本上 ✗。三条都记下来：

1. **同一个脚本里，早读的文件内容会覆盖后写的** ✗：`build-member-state.cjs` 里
   `let t = fs.readFileSync(MD)` 在**前面**读、在**后面**写回 ✗ ⇒ 后面那一步「两层收尾」
   刚写好的内容被旧内容覆盖 ✗ —— 产物里一直留着 `item.RemoveSelf();`，
   于是 25 个文件抛异常 ✗，而我以为是两层收尾的错 ✗。
   ⇒ **每一步只读自己马上要改的文件** ✓，别共用一个 `t` ✓。
2. **`git checkout -- .` 只从「索引」恢复，不从 HEAD** ✗：前面几轮我用过 `git add -A` ✓，
   索引里存着打过补丁的源文件 ✗ ⇒ `checkout -- .` 恢复出来的**仍是打过补丁的** ✗，
   于是补丁锚点 MISS ✗（表现为「补丁坏了」，其实是工作区没回滚 ✗）。
   ⇒ 回滚源文件用 **`git checkout HEAD -- .`** ✓。
3. **`execFileSync` 在子脚本非零退出时会抛** ✗：管线里那些「锚点已不在」的步骤
   （说明修正已经在文件里 ✓）会以 1 退出 ✗ ⇒ 整条管线中断 ✗。
   ⇒ 子步骤一律 `try/catch` 记一行 ✓，别 `process.exit(1)` ✗。

**读数没有变化**（`cases 1030` ✗）——异常的来源确实是我自己脚本的覆盖 ✗，不是两层收尾 ✗。
⇒ **下一轮的第一件事**（很便宜 ✓）：把主脚本按上面三条改对 ✗（每步自己读文件 ✓、
回滚用 HEAD ✓、子步骤容错 ✓），重跑一次就该看到两层收尾**真正生效** ✓，
再看 `cases` 与全语料 ✓。

## 五十五、第八次动手（第 450 轮）：**全语料第一次转正** —— 120 → 65，`cases 1032`

把主脚本按第四十九节那三条教训重写之后（`tmp/recon/build-member-state.cjs` 现在是自洽的 ✓：
每步自己读文件 ✓、子步骤容错 ✓、两层收尾最后跑 ✓，配合 `git checkout HEAD -- .` 使用 ✓），
两层收尾**第一次真正生效** ✓，读数：

| 状态 | `cases` | 全语料 | `lib.dom.d.ts` |
| --- | --- | --- | --- |
| 只搬字段（`38a73ed`） | 1037 ✓ | 5 ✗ | — |
| 上一层（空 `ReturnType`） | 1030 ✗ | 120 ✗ | 缺 523 / **多 3304** ✗ |
| **两层收尾真正生效（本轮）** | **1032** ✓ | **65** ✗ | 缺 523 / **多 400** ✓（多余节点少了一个量级 ✓） |

`cache.d.ts` 的成员现在**与绿形状一致** ✓：

```xml
<MethodDeclaration name="match" modifiers="">
  <Bracket …><Parameter>…</Parameter><SymbolToken>,</SymbolToken><Parameter>…</Parameter></Bracket>
  <ReturnType><TypeDefine>
    <Identifier>Promise</Identifier>
    <GenericType …><TypeParameter><UnionType>…</UnionType></TypeParameter></GenericType>
  </TypeDefine></ReturnType>
</MethodDeclaration>
<SymbolToken>,</SymbolToken>      ← 逗号像绿形状一样留在体里 ✓
```

**剩下 65 个文件的下一个系统性成因已经定位**（拿最小的失败文件量出来的 ✓）：
`lib.es2018.promise.d.ts` 里 `finally(…): Promise<T>;` 的返回类型，产物把 `T` 投成
`TypeParameter` ✗ 而 TS 是 `TypeReference` ✗（**同一区间、不同 kind** ✓）。

**根因**：类型单元是在**还没进 `TypeDefine`** 的时候就被成形的 ✗（它们在成员自己的 `Data` 里
先被那一趟重组收成了 `GenericType`/`TypeParameter` ✓），而绿形状里它们是在
`ReturnType → TypeDefine` **里面**成形的 ✓（`<>` 于是按**类型实参**走 ✓）。
⇒ **下一轮的正解**：不要等收尾再搬 ✗ —— 在看到那个顶层 `:` 的那一刻就把 `ReturnType`
与 `TypeDefine` 建好、并把 `TypeDefine` **挂载**成成员的 `MountedUnit` ✓，
让后面的类型字符**直接进它** ✓（就像绿形状那样在正确上下文里成形 ✓）。
（顺手记一条：`Context` **不是** `TypeDefine`/`MethodDeclaration` 的属性 ✗ —— 想靠
`typeDefine.Context = this.Context` 抄上下文编译不过 ✓，这条试过了 ✗。）

## 五十七、挂载那条路的第一次尝试（第 451 轮）：级联不下去，参数表整段塌

按第五十五节的正解做了 `MethodDeclaration.Process` 里「看到顶层 `:` 就建两层并挂载」✗，
两种挂法都失败 ✓，读数掉到 `cases 1012 / 缺 338` ✗（而上一版是 1032 / 缺 28 ✓）：

| 挂法 | 结果 |
| --- | --- |
| `returnType.AddToMounted(typeDefine)` + `this.MountedUnit = returnType` | 字符**停在 `ReturnType` 上** ✗（它没有自己的 `Process` ⇒ 级联不下去 ✗）⇒ 类型与参数整段塌 ✗ |
| `returnType.Add(typeDefine)` + `this.MountedUnit = typeDefine`（直接挂 `TypeDefine`） | **一样** ✗（缺 338 ✗）⇒ 说明塌的不是挂载目标 ✗，而是**更早**就出问题 ✓ |

症状是第一个形参就坏 ✗（`MISS Parameter onfinally?: (() => void) | undefined | null` ✗）——
即成员**在参数表阶段**就被打乱了 ✓，而那个 `:` 的判据看起来只在顶层成立 ✓。
⇒ **下一轮要先量清楚**：给一个只有 `m(a: X): Y` 的最小文件，把
`MethodDeclaration.Process` 每次被叫到时的 `Data` 与 `MountedUnit` 打出来 ✓，
看它**在参数表期间**是否也被调用、以及那时的顶层单元是什么 ✗
（很可能 `?` / `:` 的那一格在参数括号关闭前后**短暂地**出现在成员 `Data` 的顶层 ✓）。

**另外两条流程事实**（这一轮踩到，值得记住）：

- **改了 `.xl.md` 之后要连它的依赖一起 force 构建** ✗：这一轮只 force 构建了
  `method-declaration`，而 `class-member` 的内容是重建过的 ⇒ `dist` 是旧的 ✗ ⇒
  tsc 报 `ClassMember.MemberNameText` 不存在 ✗，看着像「重建坏了」其实是构建范围不对 ✓；
- 访问修饰符要跟基类一致 ✗：`Process` 在基类是 `public` ✓ ⇒ 自己写 `protected` 会编译不过 ✓。

## 五十九、`TypeParameter` 误投的真因（第 452 轮）：判据把「返回类型的实参段」也当参数表

**现场**（在 `ClassMember.Process` 里打的 `MPROC` 行）把整条流讲清楚了 ✓：

```
MPROC char="(" len=1 mounted=Bracket units=Bracket      ← 参数表期间挂载在 Bracket 上（成员看不到里面的 `:`）
MPROC char=")" len=1 mounted=- units=Bracket            ← 括号关闭、卸载
MPROC char=":" len=2 mounted=- units=Bracket|SymbolToken ← 返回类型的 `:` 到达**顶层**
MPROC char="}" len=2 mounted=- units=Bracket|ReturnType  ← 收尾时已是两层 ✓
```

⇒ 上一轮挂载失败的**真因不是挂载目标** ✗，而是：挂上之后成员自己就**再也看不到边界**了 ✗
（基类 `Process` 在有挂载单元时提前返回 ✓）⇒ 成员永不收尾 ✗（`缺 338` ✗）。

**而 `T` 被投成 `TypeParameter` 的真因在别处** ✓：`type-parameter.xl.md` 的 `IsParameterList`
有一条判据是「父单元是 `MethodDeclaration` ⇒ 这是参数表」✗（那是给 `m<K>(…)` 写的 ✓）——
解析期成形的成员把 `Bracket`、`:`、类型都挂在自己名下 ✗ ⇒ **返回类型里的实参段**
（`Promise<T>` ✓）父单元也是 `MethodDeclaration` ✗ ⇒ `T` 被当成参数 ✗
（实测 `lib.es2018.promise.d.ts`：同一区间、TS 是 `TypeReference` ✗）。

**修正**（第 452 轮，一处判据 ✓）：那一支里再往前扫一遍 ✗——
**前面出现过顶层 `:` 就不是参数表** ✓（成员自己的参数表是「头一段」，前面只有修饰词与名字 ✓）。

**另一处**（同一轮 ✓）：`,` 那一支也要**签出到它的终点** ✓
（TS 那边 `UNDEFINED: 1,` 的成员区间是 `[980,993)` 而产物给 `[980,992)` ✗，与 `;` 同一条口径 ✓）。

**读数**（本轮，都是实测）：

| 状态 | `cases` | 全语料 |
| --- | --- | --- |
| 两层收尾生效 | 1032 | 65 |
| ＋ `IsParameterList` 排除「前面有 `:`」 | 1033 | 36 |
| ＋ 逗号计入区间 | **1033** | **34** |

`lib.dom.d.ts` 从「缺 523 / 多 400」降到「缺 76 / 多 71」✓，
`undici-types/webidl.d.ts` 的漂移从 8 降到 2 ✓。**这一版整份存在 `tmp/recon/r52/`** ✓，
主脚本（`build-member-state.cjs` + `round52.cjs`）可一键重建 ✓。

**剩下的头号目标**（下一轮）：`undici-types/webidl.d.ts` 的 `缺 240` ✗ ——
头几条是 `MISS FunctionType "(arg: any) => arg is I"` ✗（**类型谓词**形式的函数类型 ✓）。

## 六十一、计算名成员（第 453 轮）：三条闸门与最终读数

WebIDL 那一族（`undici-types/webidl.d.ts` 等 ✓）遍地是 `['unsigned short'] (V: unknown, flags?: number): number`
这种**计算名方法** ✗，而方法分支当时只认 `Identifier` / `String` 名字 ✗ ⇒ 整族不接 ✓。

补这一支时连着踩了三下 ✓，每一下都是**判据放宽过头** ✗：

| 放宽 | 后果 | 收口 |
| --- | --- | --- |
| `MemberNameText` 认 `[` 括号（与 `Field.NameText` 同口径） | `itf-index.ts` 的**索引签名** `[key: string]: any` 被方法分支抢成 `MethodSignature` ✗（`cases` 掉 7 个文件 ✗） | **`[` 计算名只有在判别符是 `(` 时才是方法名** ✓（`:` / `;` 那两格归字段与签名 ✓） |
| 跨格循环「什么都跨」 | 计算名那段被跨过去、没有名字了 ✗ | 循环**只跨形参括号 `(`** ✓（`[` 要留着当名字 ✓） |
| 不检查名字拼不拼得出来 | `[Symbol.iterator]()` 那种此刻已成形为别的单元、`BracketNameText` 给空串 ✗ ⇒ 接过来是**没有 name 的成员** ✗（`lib.dom.d.ts` 多出 50 处「字段名不符」✗） | **拼不出名字的 `[` 不接** ✓，交回重组 ✓ |

**最终读数（本轮，`tmp/recon/r56/` 存的就是这一版 ✓）**：

| 状态 | `cases` | 全语料 |
| --- | --- | --- |
| 上一层（`r52/`：`IsParameterList` 守卫 + 逗号区间） | 1033 | 34 |
| ＋ 计算名三条闸门 | **1036 / 1037**（缺 1 / 漂移 0 / 多 0 / 字段名 0 ✓） | **21** |

**剩下的头号目标**：`undici-types/webidl.d.ts` 的 `缺 261` ✗ —— 头几条仍然是
`MISS FunctionType "(arg: any) => arg is I"` + `MISS TypePredicate "arg is I"` ✗，
即**类型谓词**（`arg is I` ✓ / `asserts x is T` ✓）那一族 ✓。它是**独立的解析层**问题 ✗
（与成员表无关 ✓），下一轮从那里入手 ✓。

## 六十三、类型谓词那一簇（第 454 轮）：形状差一层 `FunctionType`，但搬法试错一次

`undici-types/webidl.d.ts` 里 `MakeTypeAssertion <I>(I: I): (arg: any) => arg is I` 的产物**零件齐全** ✓
（`Bracket` + `=>` + `TypePredicate(arg is I)` 都在 ✓）——**只差外面那层 `FunctionType`** ✗：

```xml
<ReturnType><TypeDefine>
  <Bracket …><Identifier>arg</Identifier><TypeDefine><Identifier>any</Identifier></TypeDefine></Bracket>
  <SymbolToken>=&gt;</SymbolToken>
  <TypePredicate><Identifier>arg</Identifier><Keyword>is</Keyword><Identifier>I</Identifier></TypePredicate>
</TypeDefine></ReturnType>
```

**推断**：通用队列里 `TypePredicateReorganization` 排在 `FunctionTypeReorganization` **之前** ✓
（`parse-pipeline.xl.md` 第 307 行 ✓）。在我这条路里，那一段单元一搬进 `TypeDefine`
（**类型容器** ✓）就先被谓词规则收走 ✗ ⇒ 函数类型规则再看时右边已经不是「一段类型」✗
⇒ `FunctionType` 永不成立 ✓。绿树上同样的顺序却没事 ✓，差别在**什么时候、在谁名下**成形 ✗。

**试过的搬法**（回滚 ✗）：把两层收尾挪到 `super.TryToClose()` **之后** ✗
（先让成员自己那一趟收成形、父亲是成员而不是类型容器 ✓）——读数反而更差 ✗
（`cases` 1036 → **1015** ✗、字段名不符 0 → **28** ✗）：成员关闭后再搬会把
**参数表里的逗号**之类也卷进返回类型 ✓（这正是第 445 轮那条「尾 `;` 不进取 ReturnType」的同类问题 ✗）。

⇒ **下一轮的方向**（未试 ✓）：不要动搬的**时机** ✗，而是让那一段在**搬进去之后、按类型队列的顺序重跑一遍** ✗ ——
或者更简单：在 `TypeDefine` 成形前先把 `=>` 那一段**显式收成 `FunctionType`** ✗
（与我在 `TryToClose` 里收 `TypeDefine` / `ReturnType` 是同一套路子 ✓，
`FunctionType` 的构造方式照 `function-type.xl.md` 抄 ✓）。

**这一轮净值**：定位到「差一层 `FunctionType`」并把顺序推断写清楚 ✓，试错一次并回滚 ✓，
主线仍绿 ✓，最佳状态仍是 `tmp/recon/r56/`（`cases 1036` / 全语料 21 ✓）。

## 六十五、函数类型先收成形（第 455 轮）：webidl 的缺 261 → 222

按第六十三节的方向做了两件事 ✓（都在 `tmp/recon/r58/` 这一版里 ✓，`cases` 稳定在 **1036** ✓）：

1. **在收 `TypeDefine` 之前，先把 `(…) => T` 那一段显式收成 `FunctionType`** ✓
   （照 `function-type.xl.md` 的构造：`new FunctionType(template)` + `Parent = 成员` +
   `SignIn/SignOut` + 逐个 `AddAndCloseLast` + `TryToClose()` ✓）。
   **父亲先设成成员、不是类型容器** ✓ —— 这样谓词规则不会抢在函数类型规则前面 ✓，
   函数类型成立之后，里面的 `arg is I` 再由它自己那一趟收 ✓。
2. **`[` 计算名的闸门按形态分** ✓：`['long long']`（字符串字面量名 ✓）解析期接住 ✓；
   `[Symbol.iterator]`（点号链 ✗，此刻拼不出名字 ✗）留给重组 ✓。

**读数**：`undici-types/webidl.d.ts` 的「缺」261 → **222** ✓，全语料仍是 **21** 个文件 ✗
（构成变了：`typescript.d.ts` 成为最大的一个 177/16/69 ✗，webidl 退到第二 ✓）。

**一条反复踩的流程坑**（这轮又踩了一次 ✗）：管线重建会改**六个** `.xl.md` ✓，
只 force 构建其中一个 ⇒ `dist` 是混合的 ✗ ⇒ tsc 报 `ClassMember.MemberNameText` 不存在 ✗、
而且尺子量的是「一半新一半旧」的产物 ✗。⇒ **重建之后一律六个一起 force 构建** ✓。

**下一轮头号目标**：`node_modules/typescript/lib/typescript.d.ts` 的 `缺 177 / 漂移 16 / 多 69` ✗
（先看它的头几条是什么形状 ✓，那是真实语料里最像「复杂声明」的一份 ✓）。

## 六十七、返回类型的两条收口（第 456 轮）：全语料 21 → **15**

照第六十五节那条「先把零件收成形再进容器」的路子，同一轮里又收了两处 ✓
（都在 `tmp/recon/r61/` 这一版里 ✓，`cases` 稳定在 **1036** ✓）：

1. **类型字面量也先收成形** ✓：`getRelationCacheSizes(): { assignable: number; … }` 那种返回类型，
   那个 `{` 括号直接搬进 `TypeDefine` 就只是**裸括号** ✗（产物里成员全是散的 ✗，
   TS 那边是 `TypeLiteral` + `PropertySignature` ✗）。构造照 `type-literal.xl.md` 的 `Process`：
   `new TypeLiteral` + `CreateBody()` + `brace.MoveDataTo(body)` + `body.Sign(brace)` +
   `body.TryToClose()` + `literal.TryToClose()` ✓。
2. **返回类型那段不含尾部的顶层 `;`** ✓：`this is UnionType;` 那种谓词的区间产物宽了一格 ✗
   （TS 不含 `;` ✓，但**成员**区间含它 ✓ —— 两条口径不同 ✗）。收尾时把顶层 `;` 排除在
   `typeItems` 之外 ✓（成员自己的 `SignOut` 仍到 `;` 的终点 ✓）。

**读数**：

| 状态 | 全语料 | `typescript.d.ts` |
| --- | --- | --- |
| 上一层（`r58/`） | 21 | 177 / 16 / 69 |
| ＋ 类型字面量先成形 | 17 | 158 / 15 / 44 |
| ＋ 尾部 `;` 不计入返回类型 | **15** | 158 / **5** / 34 |

整条线：**120 → 65 → 36 → 34 → 21 → 17 → 15** ✓。

**往下看**（下一轮）：剩下 15 个文件里三个大头是
`webidl.d.ts`（222/3/6 ✗）、`typescript.d.ts`（158/5/34 ✗）、`lib.dom.d.ts`（76/5/68 ✗）——
`webidl` 的头几条仍是计算名方法 ✓（`['long long'] (V: unknown): number` ✗，
这一族现在拼不出名字就留给重组 ✓，而重组也接不住 ✗ ⇒ 两边都不收 ✗，是下一轮的入口 ✓）。

## 六十九、计算名方法收口（第 457 轮）：`cases` 到 **1037 / 1037**，全语料 15 → 14

**真因**（最小文件 `i19.ts` 量的 ✓）：方法**被接住了、名字也对** ✗ —— 缺的只是名字的**种类** ✗。
投影要 `ComputedPropertyName` ✓，而它是靠**成员里那个方括号子单元**判出来的 ✓ ——
我的领养循环把「名字那一格」（`start + k <= nameIndex`）整格跳过 ✗ ⇒ 方括号没进成员 ⇒
投影只能按属性名投 ✓。

**修正**：领养循环里**计算名的方括号要留下** ✓
（`if (start + k <= nameIndex && !(head[k] instanceof Bracket)) continue;` ✓ ——
普通名字是 `Identifier` / `String`，照旧跳过 ✓）。

**读数**：

| 状态 | `cases` | 全语料 |
| --- | --- | --- |
| 上一层（`r61/`） | 1036 / 1037 | 15 |
| ＋ 计算名方括号留在成员里 | **1037 / 1037**（缺 0 / 漂移 0 / 多 0 / 字段名 0 ✓） | **14** |

这一版存 `tmp/recon/r63/` ✓（链：`build-member-state.cjs` + `round52/53/53b/53c/55/55b/56/56b/57` ✓）。

**下一轮入口**：`webidl.d.ts` 仍是 222 缺 ✗，头一条还是 `['long long'] (V: unknown): number` ✗ ——
**最小文件过、真实文件不过** ✗，两者的差别是真实文件里它前面有一段 `/** … */` 注释 ✓，
或者那一刻那个方括号已经成形为 `ArrayLiteral` ✓ ⇒ 下一轮先在这两处理由上打一次入口日志 ✓
（`tmp/recon/round57-dbg.cjs` 已备好 ✓）。

## 七十一、计算名方法在真实文件里的入口（第 458 轮）：只有 9 处走到入口

用一次带**括号种类**的入口日志（只记 `(` 与 `:` 两格 ✓）量 `undici-types/webidl.d.ts`：

```
COND2 char="(" tail=AreaAnnotation|LineWrap|B:[      ← 收到了，最新单元确实是 `[` 括号 ✓
COND2 char=":" tail=LineWrap|B:[|B:(                 ← `:` 那格上是「计算名 + 形参括号」✓
```

**关键数字**：整个文件里 `(` 到达接口体、且最新单元是 `[` 括号的，**只有 9 处** ✗，
而这个文件里计算名方法有**约 190 处** ✗ ⇒ **绝大多数根本没走到入口** ✓ ——
它们的 `(` 在**别处**就被吃掉了 ✓（候选：那个 `[` 括号自己挂载后吞掉了后面的字符 ✗，
或者 `[` 内容那段先被别的规则（`ArrayLiteral` / `JsonArrayReorganization` ✗）收走 ✗）。

**下一轮的做法**：把日志换到**括号挂载**那一层 ✗（`Bracket.JumpIn` / `ArrayLiteral` 的收尾 ✓），
看 `['long long']` 这个方括号在 `]` 之后是否**正常卸载** ✗ ——
若它是被自己吞掉了 `(`，那就是「括号当名字」这一支在**解析期**的通病 ✓，
解法与第 457 轮同源（让方括号按它该有的样子关掉 ✓）。

**本轮净值**：把「9 比 190」这个事实量出来 ✓（排除了「入口判据写错」这一整类猜测 ✓），
状态回到与 `r63/` 等价 ✓（`cases 1037 / 1037` ✓、全语料 **14** ✓），
新快照 `tmp/recon/r64/` ✓；调试脚本 `tmp/recon/round58-dbg.cjs`（带括号种类）与
`round58-clean.cjs`（清日志）都已备好 ✓。

## 七十三、计算名方法的入口是 `:` 而不是 `(`（第 459 轮）：webidl 222 → 43

第 458 节量出「只有 9 处 `(` 走到入口」，这一轮沿着它把真因找到了 ✓：

**计算名方法的 `(` 根本到不了入口** ✗ —— 它已经在**体**里被开成了形参括号单元 ✗
（与第 444 轮那条同源 ✓），所以这一支的入口只能是 **`:`** ✓。而我在第 453 轮加的闸门
是「`[` 计算名**只在判别符是 `(` 时**才是方法名」✗ ⇒ 把它挡在门外 ✗。

**修正**（一处判据 ✓）：`:` / `;` 那两格上，**只要方括号后面紧跟形参括号**就接 ✓ ——
那正是「方法是 `['long long'] (V: unknown): number`」的形状 ✓；
而**索引签名** `[key: string]: any` 后面不会有 `(` ✗ ⇒ 仍然不接 ✓（`itf-index.ts` 那条保持绿 ✓）。

```ts
const afterName = Get(data, SkipNextWrapSymbol(data, nameIndex));
if (!(afterName instanceof Bracket && afterName.startBracket === "(")) {
  return result;
}
```

**读数**：

| 状态 | `cases` | `webidl.d.ts` | 全语料 |
| --- | --- | --- | --- |
| 上一层（`r64/`） | 1037 / 1037 ✓ | 222 缺 ✗ | 14 |
| ＋ `:` 那格接「方括号 + 形参括号」 | **1037 / 1037** ✓ | **43** 缺 ✓ | **14**（构成大变：webidl 从第一名掉出前四 ✓） |

复现文件 `tmp/recon/i21.ts`（真实文件里那个接口的前四条成员 ✓）现在 **0 / 0 / 0 / 0** ✓。
这一版存 **`tmp/recon/r65/`** ✓。

**下一轮入口**：全语料的三个大头变成
`typescript.d.ts`（158/5/34 ✗）、`lib.dom.d.ts`（76/5/68 ✗）、`stream/web.d.ts`（73/0/20 ✗）——
先看 `stream/web.d.ts`（最小 ✓、73 缺 ✗ 集中在一处的话最容易收 ✓）。

## 七十五、「剩余 reorg 占比」这个指标（第 460 轮）：基线 **41.06%**

以后**每轮都报这个数** ✓。口径与实现：

**口径**：数产物树里「**由重组成形**」的单元占全部单元的比例 ✓。
解析期由 guide / unit 吃字符长出来的单元不算 ✓；由 `Reorganization` 那一趟在平表上
收出来的容器算 ✓。它随迁移推进**单调下降** ✓，比「还剩几条规则」更能说明进度 ✓。

**实现**（一次性 ✓，改动很小 ✓）：

- `core/syntax/token.xl.md`：`Token` 上加一个字段 `BornByReorganization:bool = false` ✓；
- `core/extensions/list-extension.xl.md`：在 **`ReplaceCountAt`** 里点亮这个标记 ✓ ——
  它是「每个真正生效的重组都会走」的那一处 ✓（解析期的 guide / unit 不走它 ✓，
  所以这个标记就是「重组产出」的定义 ✓）；
- 度量脚本 `tmp/recon/reorg-share.cjs` ✓：
  `node tmp/recon/reorg-share.cjs tests/parse/cases 300` ✓
  —— **从 `Root.Data` 递归走** ✗（`Root.ToList()` 给的是投影后的字典、元素是 `Map` ✗，这条踩过 ✓）。

**基线读数（当前主线、全绿状态）**：

```
剩余 reorg 占比（由重组成形的单元 / 产物单元）
  文件 300 个（解析失败 0）
  产物单元 6880 个，其中由重组成形 2825 个
  剩余 reorg 占比 = 41.06%
```

加了标记之后尺子复跑：**16 片全过、exit 0、全语料 0 个文件不为零** ✓（标记无副作用 ✓）。

## 七十七、调用签名是被这版迁移弄坏的（第 461 轮）：绿树过、迁移版不过

这一轮想接着收语料里的 `CallSignature` ✗（`stream/web.d.ts` 的 73 缺里第一条就是
`(controller: ReadableByteStreamController): void | PromiseLike<void>;` ✓），
用一个最小文件 `tmp/recon/i27.ts` 把三种无名签名放在一起 ✓：

```ts
interface F { (controller: C): void | PromiseLike<void>; }   // 调用签名 ✗ 失败
interface G { new (x: number): F; }                          // 构造签名 ✓ 过
interface H { [key: string]: any; }                          // 下标签名 ✓ 过
```

**关键对照**：

| 状态 | `i27.ts` |
| --- | --- |
| **绿树**（主线，未迁移） | **0 缺 / 0 漂移 / 0 多 / 字段名 0** ✓ |
| 成员层那一版（`r65/` 的全部改动） | 缺 7 / 多 2 ✗（做成 `ExpressionStatement` + 裸 `Bracket` ✗） |

⇒ **是这版迁移弄坏的** ✓，不是原本就有的缺口 ✓。失败的形态是「调用签名没被
`SignatureReorganization` 收走」✗ —— 说明我的改动**改变了它成形的前置条件** ✗
（候选：`IsMemberBoundary` / `FollowedByParen` 那两处探测被我改过 ✓，
它们同时被类型扫描与成员扫描共用 ✓；或者接口体那条队列的插入顺序有副作用 ✓）。

**二分失败的原因**（记下来免得重走 ✗）：我试过「只把我那两个分支从接口体的队列里去掉」✗，
可整条成员层的其余改动都指着分支 ✓ ⇒ 停掉分支之后成员层整个塌 ✗（解析直接抛异常 ✗），
**读不出任何结论** ✗。⇒ 二分必须**从干净树出发、一次只叠一步补丁** ✓
（链上每一步都有独立脚本 ✓，可以做 ✓）。

**本轮读数**（每轮要报的两个数）：

```
剩余 reorg 占比：绿树 41.06%   |  成员层那一版（r65/）40.58%
cases：绿树 1037 / 1037        |  成员层那一版 1037 / 1037
全语料不为零文件：绿树 0        |  成员层那一版 14
```

⇒ 成员层把占比只压了 **0.48 个百分点** ✗（而语料付出 14 个文件 ✗）——
**这就是那个「半张成员表」的账** ✓：它换来的降幅很小，代价却是整份语料的破绽 ✗。
**下一轮的方向**（比继续打补丁更值 ✗）：先把**调用签名 / 构造签名 / 下标签名**
这三类也在解析期收掉 ✓（它们与字段/方法同属一张成员表 ✓），
让成员表**整张**都由解析期长出来 ✓ —— 那时再量占比与语料 ✓。

## 七十九、二分结果（第 462 轮）：前四步全部无罪，凶手在「后面的判据/成形」里

按第七十七节那条正确做法（**从干净树出发、一次只叠一步**）做了四格 ✓，
每格都用 `tmp/recon/i27.ts`（调用签名 / 构造签名 / 下标签名并排 ✓）量一次 ✓：

| 叠到哪一步 | `i27.ts` | 结论 |
| --- | --- | --- |
| ① 只叠**共用判据**（`declaration-common`：`GenericType` 导入 + 探测跨类型参数段 + 跟随判据认括号单元） | 0 / 0 / 0 / 0 ✓（`cases` 也 1037/1037 ✓） | **无罪** ✓ |
| ② 只叠**字段那一支**（`38a73ed` 那版） | 0 / 0 / 0 / 0 ✓ | **无罪** ✓ |
| ③ 再把 `MethodDeclaration` 改成 `ClassMember` + 挂队列（**不加分支**） | 0 / 0 / 0 / 0 ✓ | **无罪** ✓ |
| ④ 再加**方法分支**与接线（`patch-method` + `patch-round33`，去重导入后） | 0 / 0 / 0 / 0 ✓ | **无罪** ✓ |
| ⑤ 继续叠「判据/闸门」那半（`round52` `IsParameterList` + `round53/53b/53c` 计算名三闸门） | 未量成 ✗ | —— |

⇒ **凶手在后面的步骤里** ✓：`round52`（`IsParameterList` 那一支）/ `round53*`（计算名三闸门）/
`round55*`（函数类型先成形）/ `round56*`（类型字面量 + 尾部 `;`）/ `round57`（方括号留在成员里）/
`round59`（`:` 那格接方括号 ✓）——**范围从整条链缩到后半段** ✓。

**第 ⑤ 格没量成的原因**（流程坑，记下来 ✗）：我用了 `round57-clean.cjs` 去清日志 ✗，
它是按「`if (source.Value ===` 到下一个 `}`」删的 ✗ ⇒ 这次误删了**真代码**（入口字符那两行
`const isParen = …` ✓）⇒ `tsc` 报 `Cannot find name 'isParen'` ✗。
⇒ **清日志的脚本也不能按行块瞎删** ✗（日志有唯一标记 `COND2` ✓，
按标记点到行尾删就够了 ✓ —— `round57-clean.cjs` 就是这么写的 ✓，`round58-clean.cjs` 不是 ✗）。

**本轮读数**（每轮要报的两个数）：**剩余 reorg 占比 41.06%**（绿树 ✓）、
`cases` **1037 / 1037** ✓、全语料 **0** ✓（本轮没有留在树上的改动 ✓）。

## 八十一、跳步二分走不通（第 463 轮）：补丁脚本是**链式**的

想在第七十九节那个「step ④」上**跳着叠**后面的步骤 ✗（`round52` / `round53*` / `round55*` /
`round56*` / `round57` / `round59` ✓）来定位凶手 ✗ —— 结果造出一个**引用未定义变量**的中间态 ✗：

```
dist/ts/typescript/tokens/function/method-declaration.ts(523,9): error TS2304: Cannot find name 'isParen'.
```

**原因**：这些脚本彼此是**链式**的 ✓ —— `round53b` 那条闸门引用 `isParen` ✓，
而 `isParen` 是**内联在 `build-member-state.cjs` 里**的前一步加的 ✓ ⇒ 我跳过内联步 ⇒
`round53b` 的锚点仍然匹配（它只检查自己那段文本 ✓）、却把引用留在了没有定义的文件里 ✗。
（`round55` / `round56` / `round56b` 则直接报了 `MISS` ✗ —— 它们的锚点依赖内联步产出的文本 ✓。）

⇒ **两种可行的二分法**（下一次用后者 ✗）：

1. **完整链 + 从尾部逐条回退** ✗：先把 `r65` 整条链叠满 ✓（已知 `i27` 失败 ✗），
   再**一次撤一条**后面的步骤 ✓、每撤一条量一次 `i27` ✓ —— 撤到它恢复 ✓ 时，
   最后撤掉的那条就是凶手 ✓（每条 2 次调用 ✓，后半段 6 条 ⇒ 最多 12 次 ✓）；
2. 或者给每一步都补上「**前置断言**」✗（缺前置就拒绝写 ✗），
   这样跳步只会变成 MISS、不会写出坏文件 ✓ —— 这是脚本层面的修复 ✓，值得做 ✓。

**本轮读数**（每轮要报的两个数）：**剩余 reorg 占比 41.06%**（绿树 ✓）、
`cases` **1037 / 1037** ✓、全语料 **0** ✓（本轮没有留在树上的改动 ✓）。

## 八十三、「谁造的」这个诊断口径（第 464 轮）：一眼看出凶手

按用户的提醒做了 ✓，**它是这一轮破案的关键** ✓：

- `Token.CreatedByRule:string` ✓ —— 空串 = 解析期吃字符长出来的 ✓（「谁造的」就是类名本身 ✓）；
  非空 = **那条重组规则的类名** ✓（在 `Reorganize` 的派发处记 ✓，只记第一条碰它的规则 ✓）；
- **`DSH_XL_TRACE=1`** 时，XML 标签上多一个 `xl:born="…"` 属性 ✓（默认关闭 ✓，
  尺子与交付物完全不受影响 ✓ —— 加完之后复跑 `cases` 仍是 1037/1037 ✓）。

**它一眼给出的结论**（`node build/ts/cjcli.js tmp/recon/i27.ts` ✓）：

```xml
<Statement xl:born="StatementReorganization2">      ← 调用签名被语句规则包了（Signature 规则没接）
  …
  <MethodDeclaration name="PromiseLike">           ← 凶手：我的分支把返回类型里的 PromiseLike 当成了方法
```

## 八十四、破案与修复（第 465 轮）：分支在**类型段内部**又被触发

**真因**：`(controller: C): void | PromiseLike<void>;` 里那个 **`;`** 到达时 ✗，
我的方法分支照 `;` 那一格判断「这是一条新成员」✗，把类型里的 `PromiseLike` 当成了方法名 ✗
⇒ 整条调用签名被拆散 ✗、最后由 `StatementReorganization2` 包成 `<Statement>` ✗。

**修复**（一处判据 ✓）：`:` / `;` 那两格上，**成员里已经出现过顶层 `:` 就不再接** ✗ ——
那说明我们正在一条成员的**类型段里** ✓：

```ts
if (isTail) {
  for (const item of unit.Data) {
    if (item instanceof SymbolToken && item.Is(":")) {
      return result;
    }
  }
}
```

**读数**（这一版存 **`tmp/recon/r67/`** ✓）：

| 状态 | `cases` | 全语料 | `lib.dom.d.ts` | 占比 |
| --- | --- | --- | --- | --- |
| 上一层（`r65/`） | 1037 / 1037 ✓ | 14 | 76 / 5 / 68 ✗ | 40.58% |
| ＋ 类型段守卫 | **1037 / 1037** ✓ | **6** ✓ | **0 / 0 / 29** ✓ | **40.58%** |

⇒ 全语料 **14 → 6** ✓（`lib.dom.d.ts` 的「缺」从 76 归零 ✓、webidl 43 → 28 ✓）。

**下一轮入口**：剩下 6 个文件里最小的是 `@types/node/test.d.ts`（2 缺 / 0 漂移 / 0 多 / **4 字段名** ✗）
与 `samples/declarations.ts`（8/1/1 ✗）——从它们入手 ✓。

## 八十六、第九次动手（第 466 轮）：全语料 6 → **4**

三处修正 ✓（这一版存 **`tmp/recon/r70/`** ✓，`cases` 全程 1037 / 1037 ✓）：

1. **两条成员边界探测都要跨过可选标记 `?`** ✗：`rename?(next: string): void` 这种**可选方法**
   的名字后面紧跟 `?` ✗，停在它上面就判不出边界 ✗ ⇒ 上一条成员把它吞掉 ✗
   （实测 `samples/declarations.ts`：`readonly name: string` 吞到 899 ✗）。
   `IsMemberBoundary` 与 `ClassMember.FollowedByParen` 两处都补了 ✓。
2. **返回类型的起点取第一个顶层 `:`** ✗（不是最后一个 ✗）：条件类型
   `A extends B ? C : D` 里还有别的顶层 `:` ✗，取最后一个会把它们卷进返回类型 ✗
   ⇒ 整段塌掉 ✗（实测 `@types/node/test.d.ts`：`ConditionalType` 少 `falseType`、
   `MethodSignature` 少 `type` ✗、`never` 关键字缺 ✗）。
3. **映射类型要单独收** ✗：`{ [P in keyof T]: X }` 的第一个实义单元是 `[` 且里面有顶层 `in` ✓
   ⇒ 照 `type-literal.xl.md` 的 `Process` 收成 `MappedType` ✓（第 456 轮那版无条件收成
   `TypeLiteral` ✗，实测 `lib.es2017.object.d.ts`：缺 `MappedType`、多 `TypeLiteral` + `PropertySignature` ✗）。

**读数**：

| 状态 | `cases` | 全语料 | 占比 |
| --- | --- | --- | --- |
| `r67/` | 1037 / 1037 ✓ | 6 | 40.58% |
| ＋ 可选标记 / 第一个冒号 / 映射类型 | **1037 / 1037** ✓ | **4** ✓ | **40.58%** |

**剩下 4 个**：`undici-types/webidl.d.ts`（28/3/5 ✗）、`typescript/lib/lib.dom.d.ts`（**0/0/29** ✗，
只有「多出来」）、`lib.es2017.object.d.ts`（1/0/3 ✗）、`lib.es5.d.ts`（1/0/0/1 ✗）。

## 八十八、映射类型那一处仍未命中（第 467 轮）：下一轮直接用 `xl:born` 追

`lib.es2017.object.d.ts` 那条（`{ [P in keyof T]: TypedPropertyDescriptor<T[P]>; }` ✗）这一轮试了两次判据 ✗：

1. 先放宽成「第一个实义单元是 `Bracket` **或** `ArrayLiteral`」✗ —— 实测**读数完全没变** ✗
   （`93 节点 / 缺 1 / 多 3` ✗）⇒ 说明那个判据**根本没被走到** ✗，或者第一个实义单元
   连这两类都不是 ✗；
2. 顺手修了 `TempToString` 不在 `Token` 上的类型错误 ✓（用形状转换 ✓）。

⇒ **下一轮的做法**（工具已经备好 ✓）：`DSH_XL_TRACE=1 node build/ts/cjcli.js lib.es2017.object.d.ts` ✓
—— 现在 XML 标签上带 `xl:born="…"` ✓，看一眼那个花括号里**第一个单元是谁造的、什么标签** ✓，
判据就能一次写对 ✓（不必再猜 ✗）。

**本轮读数**（每轮要报的两个数）：**剩余 reorg 占比 41.06%**（绿树 ✓）、
`cases` **1037 / 1037** ✓、全语料 **0** ✓（本轮没有留在树上的改动 ✓；
上一轮的最佳状态仍是 `tmp/recon/r70/`：全语料 **4** ✓、占比 40.58% ✓）。

## 九十、战略转向（第 468 轮，按用户的判断）：**关掉 reorg，按预期一个一个建**

前几轮一直是「在有 reorg 的树上打补丁」✗ —— 代价是反复被互相作用带偏 ✗
（第 461–467 轮几乎都花在「是谁把这一格造坏了」上 ✗），而且换来的占比降幅很小 ✗
（成员层只压 0.48 个百分点 ✗）。用户提的方向更对 ✓：**把 reorg 整体关掉**，
让尺子把「还没搬到解析期的东西」直接列成清单 ✓，然后**按预期一个一个建** ✓。

**开关**（`core/syntax/token.xl.md` ✓，一处 ✓）：

```ts
if (process.env.DSH_XL_NO_REORG === "1") {
  return;
}
```

⇒ 随时能在「有 reorg / 无 reorg」之间对照 ✓；开关本身对默认路径**零影响** ✓
（复跑 `cases` 仍是 1037 / 1037 ✓）。

**两种状态的读数**（`cases` 语料 ✓）：

| 状态 | 完全一致 | 缺 | 漂移 | 多出来 | 字段名 |
| --- | --- | --- | --- | --- | --- |
| 有 reorg（主线，绿 ✓） | **1037 / 1037** | 0 | 0 | 0 | 0 |
| **关掉 reorg** | **31 / 1037** | **8119（155 类）** | 52 | **7787（35 类）** | 76 |

**清单**（脚本 `tmp/recon/no-reorg-inventory.cjs` ✓：关掉 reorg 跑尺子、按缺的种类聚合 ✓；
`declarations` 目录 40 个文件 ✓）：

```
缺：Parameter=34  VariableDeclaration=28  VariableDeclarationList=26  VariableStatement=25
    BindingElement=21  FunctionDeclaration=20  NumberKeyword=17  TypeReference=17
    ReturnStatement=11  VoidKeyword=9  CallExpression=8  ArrowFunction=7  TypeParameter=7
    ExpressionStatement=7  StringKeyword=7  ObjectBindingPattern=6  ArrayBindingPattern=5
    AsyncKeyword=4  ObjectLiteralExpression=4  BinaryExpression=3
多：Identifier=125  Bracket=57  ColonToken=56  EqualsToken=35  Block=10 …
```

⇒ **重建顺序**（自顶而下 ✓，与最初那条「从 class 开始」一致 ✓）：
**`VariableStatement` / `VariableDeclaration(List)` → `FunctionDeclaration` →
`Parameter` / `BindingElement` → 表达式层（`CallExpression` / `ArrowFunction` / `ReturnStatement`）**，
每建一块就用这把尺子量 ✓（同时看 `reorg-share` 占比 ✓）。

## 九十二、新方向的第一块试做（第 469 轮）：形参表在括号关闭时自己切

按「关掉 reorg、按预期一个一个建」的方向，挑了清单里最大的一项 **`Parameter=34`** ✓ ——
它最能复用成员层那套机器 ✓（`name?` / `: T` / 默认值 / 顶层逗号分段 ✓）。

**做法**（脚本 `tmp/recon/round69.cjs` ✓）：`Bracket.TryToClose` 里先判「这是不是形参表」
（`(` 括号 + 宿主是 `MethodDeclaration` / `Function` / `Signature` / `Lamda` / `FunctionType` / `NewType` ✓），
是就按 `this.Data` 里的**顶层逗号**切成若干 `Parameter` ✓（口径照 `parameter.xl.md` 的
`Process` / `AppendSegment` ✓：逗号留原地 ✓、软换行留在 `Parameter` 里 ✓），再走常规收尾 ✓。
重组那条规则本来就有「括号里已有 `Parameter` 就不收」的守卫 ✓ ⇒ 两条并存不会重复收 ✓。

**读数**（实测）：

| 项 | 结果 |
| --- | --- |
| 主线 `cases` | **1037 / 1037** ✓（没有副作用 ✓） |
| 关掉 reorg 时 `Parameter` 的缺 | 34 → **32** ✓（只解决了一小部分 ✗） |
| **全语料** | 4 → **5** ✗（多一个破绽 ✗） |
| 占比 | 40.58% → 40.58%（没动 ✗） |

⇒ 按纪律**回滚** ✓（脚本留着 ✓）。**下一轮要查的**：`HasParameterListOwner` 的宿主判据
在关闭那一刻是否已经拿到对的 `Parent` ✗（只有 2 处生效 ✗ 说明判据太窄 ✓），
以及新增的那个破绽是哪一个文件 ✓（跑 `--per-file` 对比即可 ✓）。

**顺带纠正一条我前一轮的误判** ✓：`git checkout HEAD -- .` 之后全语料是 **0** ✓、
占比 **41.06%** ✓ ⇒ 主线其实是**纯净的绿树** ✓，成员层的全部成果都在 `tmp/recon/`（`r70/` 那一版 ✓）
与各轮脚本里 ✓ —— 之前那句「主线含成员层」是当时**工作区没回滚**造成的误读 ✓。

## 九十四、顺序是硬的（第 470 轮）：形参表关闭时，声明还没成形

接着上一轮那块继续 ✗，在 `Bracket.TryToClose` 里打了现场（宿主类名 + 是否命中 ✓）：

```
PAREN owner=Root           hit=false    ← 函数 / 箭头：括号关闭时父亲还是 Root
PAREN owner=InterfaceBody  hit=false    ← 接口方法：父亲还是体
```

⇒ **关闭那一刻括号还没被移进声明里** ✗ —— `Function` / `MethodDeclaration` / `Lamda`
都是**稍后**才成形的 ✓（它们在重组那一趟把括号搬进自己名下 ✗）。所以「宿主是不是形参表」
这条判据在**解析期**根本拿不到 ✗（原始那条 `ParameterReorganization` 之所以能判，
是因为它跑在**体关闭之后**的平表上 ✓，那时父亲已经就位 ✓）。

⇒ **顺序是硬的** ✓：先把**声明层**长出来（`VariableDeclaration` / `FunctionDeclaration` /
`MethodDeclaration` ✓，它们一成形就把形参括号收进自己名下 ✓），形参表才有归宿 ✓，
`Parameter` 才谈得上在解析期切 ✓。这与清单的顺序一致 ✓（`Parameter` 排在
`VariableDeclaration` / `FunctionDeclaration` **之后** ✓），也解释了上一轮「只 2 处生效」✗。

⇒ **下一轮**：从清单里 `VariableStatement` / `VariableDeclaration(List)`（25 / 28 / 26 ✓）
或 `FunctionDeclaration`（20 ✓）入手 ✓ —— 先把**声明**这一步在解析期做出来 ✓
（`Let` 那条规则的修饰词回溯 + 边界判据 + 解构名收集都已在 `let.xl.md` 里写清楚 ✓，
可以照着搬 ✓）。

**本轮读数**（每轮要报的两个数）：**剩余 reorg 占比 41.06%** ✓、`cases` **1037 / 1037** ✓、
全语料 **0** ✓（本轮没有留在树上的改动 ✓）。

## 九十六、在红树上建第一块（第 472 轮）：`Let` 试做与两个坑

reorg 已按用户指示**默认关掉**（`DSH_XL_REORG=1` 才恢复对照态 ✓），从此每轮只报
**关掉 reorg 后的 AST 结果** ✓（不再报占比 ✗）。

**试做**（脚本 `tmp/recon/round71.cjs` + `round72.cjs` ✓）：`LetBranch` —— 进门条件是
「修饰词 + `let`/`const`/`var` + 名字 + 尾部（`=` / `:` / `;` / `,` / 换行 ✓）」✓，
进门后把这一段收成一个 `Let`（`modifiers` + `fieldName` ✓），接进**语句层默认队列**
（`parse-pipeline.xl.md` 第 547 行的 `BranchTemplate.DefaultValue` ✓）。

**效果**（关掉 reorg 的 `declarations` 40 个文件 ✓）：`VariableDeclaration` 28 → **10** ✓、
`VariableDeclarationList` 26 → **10** ✓、`VariableStatement` 25 → **9** ✓
（`Parameter` 34 → 27 ✓ 是顺带的 ✓）。⇒ 方向有效 ✓。

**但全局抛异常 0 → 323** ✗ ⇒ 按纪律回滚 ✓。两个坑记下来：

1. **`RemoveSelf` 的次序坑（又踩一次 ✗）**：先 `data.length = start` 截断 ✗、再对同一批单元
   `RemoveSelf()` ✗ ⇒ 抛「自身不在父单元的子单元里」✓。截断之后**不要再摘** ✓。
2. **改掉之后异常数一点没变** ✗ ⇒ 323 处另有出处 ✓（`Condition`/`Success` 之外，
   最可能是 `Let` 自己那一趟的 `Process`／`ProcessQueue` 在 reorg 关闭时的行为 ✗）——
   **下一轮用 `--jobs 1` 单文件跑，把异常的堆栈打出来定位** ✓（这次只看到外层那一行 ✗）。

**本轮读数（关掉 reorg 的 AST，`cases` 语料）**：

| 项 | 数值 |
| --- | --- |
| 解析成功 / 抛异常 | 1037 / **0** |
| **逐位置完全一致的文件** | **29 / 1037** |
| 产物节点 / TS 语义节点 | 23322 / 17317 |
| **缺节点** | **8214（153 类）** |
| 区间漂移 | 61（4 类） |
| 多出来的节点 | 8023（35 类） |
| 字段名不符 | 16 |

（对照态 `DSH_XL_REORG=1`：1037 / 1037 ✓。）

## 九十八、接线本身就会破坏字符派发（第 473–474 轮）

把 `Let` 那块装回来、修掉两个坑（去重导入 ✓、去掉截断后的 `RemoveSelf` ✓、
`Success` 改用 `ReplaceCountAt` 原位替换 ✓）之后，**抛异常仍是 323** ✗。逐条排除：

| 试验 | 结果 |
| --- | --- |
| 在 `Success` 里包 try/catch 打堆栈 | **没有日志** ✗（`cjcli` 可能吞了 stderr ✗） |
| 在 `Condition` 里包 try/catch 打堆栈 | 同样没有 ✗ |
| `Condition` 开头加硬守卫（`unit` 空 / `Data` 非数组直接拒绝 ✓） | **仍然 323** ✗ |
| **去掉接线**（分支定义留着 ✗） | **异常回到 0** ✓ —— `i29.ts` 正常解析 ✓ |
| 再接线（重建 `parse-pipeline` ✓） | 又 323 ✗ |

⇒ **是「把分支插进 `BranchTemplate.DefaultValue`」这件事本身**破坏了字符派发 ✗ ——
哪怕这个分支对任何字符都直接拒绝（硬守卫那一次 ✓）也一样 ✗。

**下一轮要查的**（问题已经收得很窄 ✓）：`ParsePipeline.CreateGeneralQueue()` 那一列
（`parse-pipeline.xl.md` 第 129–145 行 ✓）里每一项都是 `Branch` ✓，`InsertedBefore` 本身也没问题
（`sequence.xl.md` 第 75 行 ✓ 是真插入 ✓），所以**差异很可能在「默认队列与通用队列不是同一份」** ✗
——`Install` 里 `BranchTemplate.DefaultValue = CreateGeneralQueue()` ✓，
而 `CreateGeneralQueue()` 每次调用都**新建一份** ✓（注释里特意说了这一点 ✓）。
⇒ 下一轮照 **`IfSetBranch` 当初的加法**来 ✓（见同文件第 118–126 行的部署说明 ✓：
「插在 `Identifier.AppendIn` 之前」✓），或者直接把 `LetBranch.JumpIn` 写进 `CreateGeneralQueue()`
的那张表里 ✓ ——**这才是与既有做法一致的位置** ✓。

**本轮读数（关掉 reorg 的 AST，`cases`）**：解析成功 1037 / 抛异常 **0** ✓、
逐位置完全一致 **29 / 1037** ✓、缺 **8214（153 类）** ✓、漂移 61、多 8023（35 类）、字段名 16。

## 一百、`Let` 建成（第 475–476 轮）：缺 8214 → 7685，异常 0

**真因是两个**（都不是玄学 ✓）：

1. **接线位置** ✓：不该动 `Install` 里的 `BranchTemplate.DefaultValue` ✗（那会让整条默认队列
   换一份 ✓，字符派发跟着坏 ✗）；**正确做法是照 `IfSetBranch` 的加法** ✓ ——
   直接把 `LetBranch.JumpIn` 写进 `ParsePipeline.CreateGeneralQueue()` 的那张表里 ✓，
   位置在 `SymbolToken.AppendIn` **之前** ✓（它认的是 `=` / `:` / `;` / `,` / 换行 这几格 ✓，
   不跟认字的分支抢 ✓）。
2. **坐标要签全** ✓：只调 `SignIn` 不调 `SignOut` ✗ ⇒ 那个单元是个「半个坐标」✗，
   后面任何读坐标的地方都会抛 `SourceRange.Start == null || SourceRange.End == null` ✗
   —— 实测 **323 个文件**全挂在这一条上 ✓（栈里那个 `Message` 才是真的 ✓，
   外层那句「throw by line 0」什么也没说 ✗）。

**读数**（关掉 reorg 的 `cases` 语料 ✓）：

| 项 | 基线 | ＋ `Let` |
| --- | --- | --- |
| 抛异常 | 0 | **0** ✓ |
| **缺节点** | 8214（153 类） | **7685（153 类）** ✓ |
| 逐位置完全一致 | 29 / 1037 | 29 / 1037 |
| 区间漂移 | 61（4 类） | **1371（7 类）** ✗ |
| 多出来的节点 | 8023（35 类） | 8272（40 类）✗ |

**漂移为什么涨**（已经量清 ✓）：投影那边的「**补壳 / 提层**」
（`print-ast-common.xl.md` 第 82 / 92 行 ✓：`VariableStatement` / `VariableDeclarationList`
两层壳，起点取 `Let` ✓、**整段范围取语句壳** ✓）在没有语句壳时退而用我的 `Let` 的范围 ✗ ——
实测 `let a = 1;`：期望 `VariableStatement[0,10)` → `List[0,9)` → `Declaration[4,9)`，
产物只有 `[0,5)`（`let a`）✗。

⇒ **下一块就是语句壳** ✓（`Statement` 包裹 ✓：整段范围 + 让两层壳与 `VariableDeclaration`
各就各位 ✓）。它同时也是清单里 `ExpressionStatement=7`、`ReturnStatement=11` 的前提 ✓。

## 一百〇一、每步都要钉住的三件事

- **注释保留**（用户口径）：注释单元照旧进树，只是位置从「被语句层切出来的边界」变回「trivia 原位」；
- **区间**：成员与体的区间要逐位置与 TS 对齐（`--file` 单文件尺子看四个方向 + 缺 range / 越界）；
- **`Data` 与字段的分工**（用户口径）：能被字段完整表达的进字段、带子树的留 `Data`；
  成员这一层暂时没有 meta 字段，先不动这条。

## 一百〇二、语句壳的三条硬约束（第 481–485 轮）：位置、时机、切片

`StatementBranch` 从第 477 轮起就在树上，可它是**一支永远轮不到的分支** ✗ ——
这一轮用「逐字符 dispatch 追踪」把它量穿了 ✓。**三个约束互相挤压**，
只有一个位置同时满足 ✓；而那个位置的**切片口径**与它原本抄的重组那条**正好相反** ✗。

**工具**（都在 `tmp/recon/` ✓，下一次直接用 ✓）：

| 脚本 | 作用 |
| --- | --- |
| `dbg-idx.cjs` | 给 `UnitToken.Process` 的派发循环装显式下标 ✓，打出「哪个字符问到了第几支」✓ |
| `dbg-loop.cjs` / `dbg-iter.cjs` | 循环进出 / 每支一次 ✓ |
| `dbg-sb*.cjs` | `StatementBranch` 的 `Condition` 各出口 + `Success` 进门 ✓ |
| `dbg-rf.cjs` / `dbg-ff*.cjs` | `Root.FormStatement` / `Statement.FormFrom` 的进门与各早退 ✓ |
| `cap.cjs` / `proj.cjs` / `dump.cjs` / `keys.cjs` | 落盘 stderr（**PowerShell 会把 stderr 包成错误对象 ✗**）、打印投影树、XML、两边 key 对拍 ✓ |

**约束一：派发循环遇到第一个 `Done` 就 `return`** ✗（`unit-token.xl.md` 的 `Process` ✓）。
于是排在 `SymbolBranch` / `WrapSymbolBranch` 之后的任何一格**一次都不会被问到** ✗ ——
实测 `;` 与软换行**各有一个 appender** ✓（`IDX val=[;] i=15/17 br=SymbolBranch` 紧跟
`DONE i=15` ✓；软换行在 `i=12 br=WrapSymbolBranch` ✓），两支都把下标截在那里 ✓。
⇒ 「排在 appender 之后」这条路**根本不通** ✗（第 478 / 480 / 481c 三次都撞在这上面 ✓）。

**约束二：`;` 进 `Data` 的时机在 appender 里** ✓。排在 appender 之前虽然轮得到 ✓，
可那一刻 `data[data.length - 1]` 是**分号左边那一格** ✓ ⇒「`;` 进来了吗」这类判据
**永远问不出答案** ✗（实测 `SBX#6 v=";" len=3 types=Let,SymbolToken,Identifier` ✓）。
软换行更极端：它**不进 `Data`** ✗（透明单元 ✓），所以那一档只能靠「它左边那一格」问 ✓。

**约束三：切片口径与重组那条相反** ✗。重组（`StatementReorganization`）跑在 append
**之后** ✓，所以它写「children **除最后一个**装进语句」✓（最后那个就是 `;` ✓）；
而在 appender **之前**收壳时 `;` 本就不在 `data` 里 ✓ ⇒ 切片**不能**再除最后一个 ✗
（实测照抄重组那一句，`let a = 1;` 只剩 `Let, =` ✓ —— 最后一个内容单元被丢掉 ✓）。

**⇒ 唯一同时满足三条的位置** ✓：**在 `;` / 软换行各自的 appender 里、紧跟 append 之后** ✓。
于是收壳那一趟必须由 appender 发起 ✓，而它**不能 import `Statement`** ✗
（`symbol-token.xl.md` / `line-wrap.xl.md` 都不能 ✓，会绕出循环依赖 ✓）——
做法是在基类 `Token` 上加一个空钩子 `FormStatement(terminator)` ✓，
由 `Root` 覆写成 `Statement.FormFrom(this, terminator)` ✓。
**一处实现、两个调用点** ✓，判据 / 切片 / 区间 / 替换四处只有一份 ✓。

**进门判据（四条，全部实测）** ✓：`;` 进 `Data` 之后，「最后一个内容单元」是
`data[index - 1]` ✓；软换行不进 `Data` ✓ ⇒ 它自己就是最后那个内容单元 ✓。
两边统一成一句：**正面问「终结符落进来之后算不算语句内部」** ✓ ——
`Statement.IsInStatement(data, index - 1)` ✓。这一句同时管住「上一条刚收完」与
「防御性分号」✓。**三版判据被实测逐个打回** ✗：
`data.length - 2` 那一次问到了 `SymbolToken(:=)` ✓（它在 `IsInStatement` 眼里是
「非语句符号」✓ ⇒ 永远答 `false` ✗）；「最后一个单元是 `;` 就不收」那一次把**正常收尾**
也挡了 ✗；「倒数第二个单元是 `;`」那一次拿内容单元去比 `;` ✓，永远比不中 ✗。

**这一轮的结果（诚实记一笔）** ✗：钩子接上之后，**读数从 77 → 22** ✗，
所以**没有留在树上** ✓（源已回到 77 那一版 ✓）。根因**还没定位到** ✓ ——
下一个动作是给 `Statement.FormFrom` 的四条判据逐条打点 ✓（`tmp/recon/dbg-ff*.cjs` 已备好 ✓），
看它为什么把 55 个文件弄坏 ✓。**注意**：关掉钩子、只留 `StatementBranch` 那条路时读数是
29 ✗（不是 77 ✗）⇒ 说明**壳的两次形成互不覆盖**：`StatementBranch` 那一趟在
appender **之前** ✓，它按旧口径「除最后一个」切片 ✗ ⇒ 内容单元被丢 ✓。
⇒ 正确的落地顺序是**先换切片口径、再接钩子** ✓（两步各自量一次 ✓），
不要一次改两处 ✓（这一轮就是把两件事一起改了，定位成本翻倍 ✗）。

**另外两笔账（都在这一轮量清）** ✓：

1. **`xl build` 按指纹跳过重建** ✗（`docs/member-layer-plan.md` 第二十七节早记过 ✓）：
   手改 `.xl.md` 之后必须 `force: true` 重建 ✓，并且**核对 `dist/ts/...` 里那一行确实变了** ✓。
   这一轮前 80 分钟的全部读数都来自**陈旧的 `dist`** ✗，包括那个 65/1037 ✓。
   另外：**`xl build` 不带 `paths` 会把 `tmp/` 下几百个旧实验 `.xl.md` 一起扫进去** ✗
   （1485 个 error ✓）⇒ 一律显式给 `paths` ✓（`core` / `typescript` / `runtime` /
   `typescript-exec` / `cjcli.xl.md` / `tsrun.xl.md` ✓）。
2. **`Let` 的投影只能有一条路** ✗：`Let` 既被语句壳那一趟投 ✓、又被 `projectNode` 问自己
   （`WithRangeOf` 记下的产主 ✓）⇒ 同一格投两遍 ✗，第二遍手里**只有 `Kids`** ✓，
   字段形态下它是**空的** ✗ ⇒ 投出一个空的 `VariableDeclarationList` ✓，
   而 `=` 与初始值作为顶层兄弟各投一个节点 ✗（实测 `vars-basic.ts` ✓）。
   修法是 `Let.PrintAst` 里一句：**没有子单元 ⇒ 返回 `ctx.Nothing`** ✓（解构形态有模式括号 ✓，
   本来就不走语句壳那一趟 ✓）。这一条与语句壳无关 ✓，独立生效 ✓。

## 一百〇三、语句壳搬到「终结符进 `Data` 之后」（第 486 轮）：77 → **156 / 1037**

上一轮（481–485）量穿了三条互相挤压的硬约束 ✓，结论是**唯一可行的位置在两个 appender 里、
紧跟 append 之后** ✓；那一轮把钩子接上去读数从 77 → 22 ✗、根因没定位、按纪律回滚了 ✓。
这一轮把这条落下来 ✓，并且**把两档拆开**——`;` 那一档搬到 appender 之后 ✓，软换行那一档
留在原来的 `StatementBranch`（append 之前）✓。

**为什么软换行不跟着搬** ✓（这一轮量出来的）：换行**不进语句区间** ✓（TS 的 `a = 1` 换行到 `1` 为止 ✓），
留在 append 之前收反而正好 ✓；而它一旦也搬进钩子，就会顺手把「孤零零的软换行」删掉 ✓
（重组那条规则就是这么干的 ✓）——**而解析期那一批端口（成员层、`Let`、括号那一族）都还拿软换行当分隔符** ✗。

**变体账（都是整份 `cases` 语料的实测 ✓）**：

| 变体 | 完全一致 | 缺 | 漂移 | 多出来 | 字段名 |
| --- | --- | --- | --- | --- | --- |
| 基线（只有 `StatementBranch`，`;` / 换行都在 append 之前收） | 77 | 7126 | 1032 | 7290 | 51 |
| **A**：`;` 与软换行都搬进钩子（软换行照删） | **207** | 8205 ✗ | 102 | 6122 | 73 ✗ |
| **B**：只搬 `;`（软换行照旧） | 81 | 7156 | 1033 | 7312 | 51 |
| **B2**：B ＋ `Let` 签名锚点跳过前导 trivia | **156** | **7122** | **493** | **6738** | 51 |

⇒ 落在树上的是 **B2** ✓：四个方向里三个明确变好 ✓、缺节点比基线还少 4 个 ✓、字段名不变 ✓。

**两档读数（整份 `cases` 语料，force 重建后实测 ✓）**：

| 状态 | HEAD（本轮之前） | 本轮（B2） |
| --- | --- | --- |
| **禁用 reorg（默认，主指标）** | 77 / 1037 | **156 / 1037** ✓ |
| `DSH_XL_REORG=1`（对照态） | **613 / 1037** ✗ | **855 / 1037** ✓ |

⚠️ **对照态早就不绿了** ✗：文档里那句「有 reorg = 1037 / 1037」是**第 468 轮**的读数 ✓，
而第 469–485 轮往解析期搬端口（`LetBranch` / `StatementBranch` / 成员层那些 ✓）时
**把对照态一起带下来了** ✗。这一轮先 `git stash -u` ＋ force 重建、量了 HEAD 的真实读数 ✓
（禁用 reorg 77 ✓、对照态 **613** ✗）⇒ 从此「对照态」只能当**趋势指标** ✓，
不能再当「不许动的绿线」✗。好消息是本轮两档都在涨 ✓（+79 / +242 ✓）。

**没有为对照态加开关** ✓：一开始试过「`DSH_XL_REORG=1` 时钩子不跑、`;` 仍由 `StatementBranch`
在 append 之前收」✗（想让对照态逐字回到 HEAD ✓）——实测 **692** ✓，比不加开关的 **855** 更差 ✗。
⇒ 一处实现、一个路径 ✓（`;` 只在钩子里收 ✓），不设第二条分支 ✓。

**A 的那 207 是「借来的」** ✗：它多出来的 51 个文件来自**提前删软换行** ✓（等于替所有端口顺手修了左边界 ✓），
代价是成员层被弄坏 ✓ —— 实测 `type-combination-adversarial.ts`
（`@dec2 method<U>(x: T): Record<string, U> { return x }` 那一簇）
钩子版**丢** `Identifier(dec2)` / `Identifier(method)` / `Block { return x }` ✗，
而只处理 `;` 的 B 版与基线逐条相同 ✓。⇒ 想拿回那 51 个文件，正确做法不是删软换行 ✗，
而是**给每个解析期端口修签名/切片口径** ✓（见下一节）。

**B2 的关键一笔：漂移的大头在左边界，不在右边界** ✓。B 版把 `;` 算进壳体之后，
`let a = 1;` 那一类**右边界**已经对齐 ✓，可 493 处漂移里最大的一笔（`VariableStatement` 212 /
`VariableDeclarationList` 222）形状是**整体左移一位** ✓：`const a = 1;` 换行 `const b = 2;`
的第二条是产物 `[12,25)` vs TS `[13,25)` ✗。真因在 `LetBranch.Success` ✓：
`start` 往回跨过 `LineWrap` 之后 `data[start]` **正好落在上一行那个软换行上** ✗ ⇒ `Let` 从换行起签 ✗。
修法一处 ✓：签名用的锚点跳过 `[start, nameIndex]` 里的 trivia ✓（替换范围照旧，软换行跟着并进 `Let` ✓）。
读数 81 → **156** ✓，漂移 1033 → **493** ✓（实测 `const a = 1;` 换行 `const b = 2;` 从
`DRIFT [12,25)` 变成**四个方向全零** ✓，`expr-in-array-literal.ts` 的 11 处漂移全消 ✓）。

**接线（源，六处 ✓）**：

| 文件 | 改动 |
| --- | --- |
| `core/syntax/statement-former.xl.md`（新） | 抽象表 `StatementFormer`：`Form(unit, terminator)`，抛错桩 ✓ |
| `core/syntax/token.xl.md` | 静态字段 `Former:StatementFormer` ＋ 钩子 `FormStatement`（转发给 `Former.Form` ✓） |
| `typescript/tokens/statement.xl.md` | `Statement.FormFrom`（重组那两条的逐字移植 ✓）＋ `StatementFormerImpl` ＋ `StatementBranch.Condition` 收窄成只认 `\n` ✓ |
| `typescript/tokens/symbol-token.xl.md` | appender 末尾 `unit.FormStatement(unit.Last() as SymbolToken)` ✓ |
| `typescript/tokens/let.xl.md` | 签名锚点跳过前导 trivia ✓ |
| `typescript/parse-pipeline.xl.md` | `Install` 里 `Token.Former = StatementFormerImpl.Instance` ✓ |

**为什么多一层 `StatementFormer`** ✗：appender 在 `typescript` 层，可它**不能 import `statement.xl.md`** ✗
（`statement` 向上 import 了 `bracket` 等一串，会绕出环 ✓ —— `symbol-token.xl.md` 里记着这一笔 ✓）。
所以 `core` 只留空钩子 ＋ 一张抽象表 ✓，实现在装配时装上 ✓（与「模板是调用方的，谁造模板谁装配」同一句话 ✓）。

**六道门：与 HEAD 逐道相同** ✓（同一台机器上先 `git stash -u` ＋ force 重建量 HEAD ✓，再量本轮 ✓）：

| 门 | HEAD | 本轮 |
| --- | --- | --- |
| `runtime:check` | FAIL 116 / 242 | FAIL 116 / 242 |
| `runtime:cli` | FAIL 1 / 79 一致 | FAIL 1 / 79 一致 |
| `cases:tsast` | FAIL（16 片全红） | FAIL（16 片全红） |
| `samples` | FAIL（`VariableDeclarationList.declarations` 空 ✗） | FAIL（同一处 ✗） |
| `cases:check` | **ok** 1050 / 1050 | **ok** 1050 / 1050 |
| `coverage` | FAIL 142 / 1713（blocked 1566、differ 5、bad 0、加权 6.4%） | FAIL 142 / 1713（逐项相同） |

⇒ **这一轮没有把任何一道门弄坏** ✓；六道门在**默认（无 reorg）**这一档本来就多数是红的 ✓
（它们是第 468 轮之前、reorg 还开着时调绿的那一套口径 ✓）——**迁移期看的是上面那张四方向表** ✓，
门只在「打算收工」之前当回归网用 ✓。

**工具（都在 `tmp/recon/` ✓，可复用 ✓）**：

| 脚本 | 作用 |
| --- | --- |
| `r486-hook.cjs` | 可回滚地往 `build/ts` 打这套接线（`--variant=b` 只搬 `;` ✓）；备份在 `r486-backup/` ✓ |
| `r486-letanchor.cjs` | 单独那处 `Let` 锚点补丁 ✓（可与上面的变体叠加 ✓） |
| `r486-rollback.cjs` | 从备份还原四个 JS ✓ |
| `r486-filecmp.cjs` | 对若干文件做「钩子版 vs 基线」的逐节点对拍 ✓（**先确认当前树是钩子版** ✓） |
| `tree.cjs` | 直接打**原树**（类名 ＋ 区间 ＋ 子单元数）✓ —— 这一轮定位 `Let` 左边界就是靠它 ✓ |

**两笔要记住的账**：

1. **`BornByReorganization` 这个口径已经被解析期端口污染** ✗：它只在 `ReplaceCountAt` 里点亮 ✓，
   而解析期的 `LetBranch` / `FormFrom` 也走 `ReplaceCountAt` ✓ ⇒ 占比指标只在
   `DSH_XL_REORG=1` 的对照态里才有意义 ✓（当前主线默认关 reorg ✓，尺子报的是四个方向 ✓）。
2. **`StatementBranch` 这一支还留着** ✓（只认 `\n` ✓）：它和钩子**不能同时认同一个终结符** ✗
   （会两次成形 ✓）——这一轮把 `;` 整档交给钩子时就是按这条切的 ✓。

**下一块（按清单）** ✓：

1. 把「签名锚点跳过前导 trivia」这一条**扫到其余解析期端口** ✓（`ClassBranch` / `InterfaceBranch` /
   `EnumBranch` / `Field` / `IfSetBranch` / `StaticBlockBranch` … ✓）——A 版那多出来的 51 个文件就在这里 ✓；
2. 其余漂移（`TypeReference` 38 / `Identifier` 17 / `BinaryExpression` 2 …）逐条查 ✓；
3. 回到缺节点清单：`VariableDeclaration(List)` 625/605 → `VariableStatement` 571 →
   `FunctionDeclaration` 134 → `Parameter` 303 → 表达式层 ✓。

## 一百〇四、关键字升级搬进解析期（第 487 轮）：156 → **164 / 1037**

**为什么先搬这一条** ✓：`KeywordReorganization` 是整套重组里**唯一位置无关**的一条 ✓
（判定就是「这个词命中 `KeywordTemplate`」✓），而投影侧一大片分支**以 `<Keyword>` 为门** ✓——
`print-ast-common.xl.md` 里「关键字开头的语句」那一支写的是 `if (headType === "Keyword")` ✓、
`KEYWORD_KIND` / `KEYWORD_STATEMENT_KINDS` 两张表都按 `Keyword` 查 ✓。
关掉 reorg 之后这些词全留在 `Identifier` 形态 ✗ ⇒ `return` / `throw` / `void` 这些是**整类地缺** ✓
（实测 `i42.ts`：`return;` 投成 `ExpressionStatement` + 裸 `Identifier` ✗，TS 是 `ReturnStatement` ✗）。

**时机**：`Token.TryToClose` 里，夹在 `Close` 与 `Reorganize` 之间 ✓ ——
重组那一趟里关键字升级跑的就是「每个单元关闭时、在它自己的 `Data` 上」✓（通用队列与类型队列都带它 ✓）
⇒ 与对照态**同一时机** ✓；而解析期那些端口（`LetBranch` 那一族）跑在关闭**之前** ✓，
所以它们照旧看得见 `Identifier` 形态的 `let` / `const` / `var` ✓（**放进 `Close` 之前会当场踩到那一片** ✗）。

**一份答案** ✓：判据抽成 `Keyword.IsUpgradable` ✓、替换抽成 `Keyword.UpgradeAt` ✓，
重组规则那两条转调它们 ✓；解析期那一趟是 `Keyword.UpgradeIn(unit)` ✓（一换一 ⇒ 长度不变 ⇒ 不必回退下标 ✓）。
两个例外（`as const` / `override` 的上下文判定）因此仍然只有一处 ✓。

**壳要自己关一次** ✓：`Statement.FormFrom` 末尾补 `statement.TryToClose()` ✓
（重组那条当年也是这么写的 ✓）——否则钩子造出来的壳**永远不会**走 `UpgradeWords` ✓，
壳里的 `return` 升不成关键字 ✗（实测：补上之前 `i42` 的 `ReturnStatement` 仍然缺 ✓）。

**成形器泛化** ✓：`StatementFormer` → `TokenFormer`（`core/syntax/token-former.xl.md` ✓），
两个方法 `FormStatement` / `UpgradeWords` ✓，实现仍是装配时装上的 `TokenFormerImpl.Instance` ✓。

**读数（整份 `cases` 语料，force 重建 ✓）**：

| 状态 | 第 486 轮 | 本轮 |
| --- | --- | --- |
| **禁用 reorg（默认，主指标）** | 156 | **164 / 1037** ✓ |
| —— 缺 / 漂移 / 多出来 / 字段名 | 7122 / 493 / 6738 / 51 | **6726 / 497 / 6365 / 51** ✓ |
| `DSH_XL_REORG=1`（对照态） | 855（缺 1188 那一版之前） | **859 / 1037** ✓ |

**对照态里这一支必须关着** ✗：不关时实测 855 → **401** ✗ ——
提前升级会改掉**别的重组规则的输入** ✓（它们大多在「升级成 `Keyword` 之前」才认得出那些词 ✓）。
所以 `Token.UpgradeWords` 第一句就是 `DSH_XL_REORG === "1"` 直接返回 ✓；
关掉之后对照态回到 **859** ✓（比上一轮还多 4 个 ✓）。
**与 `FormStatement` 那条钩子的取舍相反** ✓：那条在对照态里让它照跑反而更好（855 对 692 ✓），
所以两条钩子的开关策略是**分别量出来的** ✓，不是一刀切 ✓。

**六道门与 HEAD 逐道相同** ✓：runtime:check 116/242、runtime:cli 1/78、cases:tsast 红、
samples 红（同一处 `VariableDeclarationList.declarations` 空 ✗）、cases:check ok 1050/1050、
coverage 142/1713（blocked 1566、differ 5、bad 0、加权 6.4%）⇒ 没弄坏东西 ✓。

**工具（都在 `tmp/recon/` ✓）**：

| 脚本 | 作用 |
| --- | --- |
| `r487-keyword.cjs` | 可回滚地往 `build/ts` 打这套接线（备份在 `r487-backup/` ✓） |
| `r487-rule-weights.cjs` | **按「谁造的」给重组规则排权重** ✓（对照态跑；`CreatedByRule` ＋ 子树单元数 ＋ 文件数 ✓） |
| `r487-newline-eaters.cjs` | 量「起点落在换行上」的单元 ✓ —— 结论 **0 处** ✓：第 486 轮那笔已经扫干净 ✓，不用再扫 ✓ |

**规则权重（对照态实测，`nodes` = 该规则造出来的子树单元数）**：

```
   nodes   units   files  rule
   15529    2766   1048  StatementReorganization2      ← 已搬（软换行那一档 + FormFrom 那一档）
    2901     262    174  TypeAssignReorganization     ← 下一块的入口（`type X = …`）
    1937     146    123  FunctionReorganization
    1734     616    271  TypeDefineReorganization     ← 类型标注 `: T`（几乎所有声明都过它）
    1191     177    124  ParameterReorganization
    1187     148     99  MethodDeclarationReorganization
    1119     213     88  BinaryOperatorReorganization
     940     136     85  PropertyAccessReorganization
     860     136     78  JsonArrayReorganization
     831     286    184  MethodReorganization         ← 调用表达式
     774     154    101  StatementReorganization3     ← 「列表末尾那一格」（还没有对应钩子）
```

⇒ **下一块**：`TypeDefine` ＋ `Parameter`（`i42` 那一簇：`function f(a: number): void {}` 里
「形参表 → `Parameter` → `TypeDefine` → 返回类型」是一条链 ✓，投影侧那几张表（`PRIMITIVE_TYPE_KIND` ✓）
就是照这条链写的 ✓），然后 `TypeAssign`（`type X = …` ✓）与 `Function` ✓。

## 一百〇五、声明链搬进解析期（第 488 轮）：164 → **193 / 1037**

上一节的判断对了一半 ✗：`TypeDefine` / `Parameter` **不能单独搬** ✗ —— 它们与 `Function` 是一条链 ✓，
而且**次序就是重组队列的次序** ✓：`Function`（队列第 2）→ `Parameter`（第 25）→ `TypeDefine`（第 37）
→ `Keyword`（队尾 ✓，实测队列最后一项就是它 ✓）。

| 只搬 | `tmp/recon/i42.ts` 的读数 |
| --- | --- |
| `TypeDefine` 单独 | `Block` / `ReturnStatement` 从 OK 变 **MISS** ✗（返回类型那个 `:` 少了 `Function` 先成形，一路吞到函数体里 ✗） |
| `Function` ＋ `Parameter` ＋ `TypeDefine`（关键字最后） | **四个方向全零** ✓ |

关键字必须最后那一笔是硬的 ✗：`function` 那个词一旦升成 `Keyword` ✓，
`FunctionReorganization.Previous` 的 `current instanceof Identifier && current.Is("function")` 就再也认不出它 ✗
（队列里 `KeywordReorganization` 也确实排在 `TypeDefineReorganization` 之后 ✓）。

**新机制（三处，往后每加一条规则只多一行 ✓）**：

| 位置 | 内容 |
| --- | --- |
| `core/syntax/reorganization.xl.md` | 新增 `ApplyTo(unit)` ✓：在单元自己的 `Data` 上跑一遍这条规则 ✓ —— **推进下标那个循环只有一份** ✓，全局那趟与解析期这趟共用 ✓ |
| `core/syntax/token-former.xl.md` ＋ `token.xl.md` | 第 487 轮的 `UpgradeWords` 泛化成 `ApplyCloseRules` ✓（`TryToClose` 里那个位置一个字没动 ✓），第 487 轮那个 `Keyword.UpgradeIn` 撤掉 ✓（规则自己的 `ApplyTo` 就是入口 ✓） |
| `typescript/parse-pipeline.xl.md` | `TokenFormerImpl` 落到这里 ✓ —— 它要同时用 `Statement` 与四条规则 ✓，而 `type-define.xl.md` **反过来 import `parse-pipeline`** ✗，实现放在那条链上任何一份文件里都会绕出环 ✗ |

**这一轮搬的是「调用时机」，规则本体还是它自己那一份** ✓：
`FunctionReorganization.Instance.ApplyTo(unit)` ✓、`ParameterReorganization` ✓、`TypeDefineReorganization` ✓、
`KeywordReorganization` ✓ —— 逐条内联留到后面一块一块做 ✓。纪律上仍然是一块一量 ✓。

**读数（整份 `cases` 语料，force 重建 ✓）**：

| 状态 | 第 487 轮 | 本轮 |
| --- | --- | --- |
| **禁用 reorg（默认，主指标）** | 164 | **193 / 1037** ✓ |
| —— 缺 / 漂移 / 多出来 / 字段名 | 6726 / 497 / 6365 / 51 | **6159 / 477 / 4852 / 53** ✓ |
| `DSH_XL_REORG=1`（对照态） | 859 | **859**（不动 ✓：这一趟在对照态本来就不跑 ✓） |

**六道门**：`runtime:check` 从 116 / 242 涨到 **124 / 242** ✓（这一块让 `tsrun` 多跑通 8 条 ✓），
其余四道与 HEAD 逐道相同 ✓（runtime:cli 1/78、cases:tsast 红、samples 红、
cases:check 1050 全过、coverage 142/1713 ✓）—— 没有弄坏东西 ✓。

**下一块**：把 `ApplyCloseRules` 里那一串**按队列次序**往下接 ✓ —— 队列里排在 `Function`（2）之后、
`Parameter`（25）之前的是 `Signature`(3) / `MethodDeclaration`(4) / `Label`(5) / `Let`(6) / `Field`(7) /
`New`(8) / `Method`(9) / … / `JsonObject`(14) / … ；队伍最前面的 `Decorator`(1) 要**插到最前** ✓。
权重最大且还没搬的仍是 `TypeAssignReorganization`（2901，队列第 35，排在 `TypeDefine`(37) 之前 ✓）、
`MethodDeclarationReorganization`（1187，第 4）、`BinaryOperatorReorganization`（1119，第 51 起 ✓ 排在关键字之前 ✓）。

**一处必须先解的账** ✗：`StatementReorganization3`（774 / 154 / 101）是「**列表末尾那一格**」——
它的时机是「容器关闭时最后那个单元」✓，与这一趟的时机**天然重合** ✓，但它现在**不在**这一趟里 ✓；
下一块或下下块要把它接上（它管的是「没有终结符的收尾语句」✓）。

## 一百〇六、类型别名接上（第 489 轮）：193 → **221 / 1037**

`TypeAssignReorganization`（队列第 35 ✓）接进 `ApplyCloseRules` ✓，位置**在 `TypeDefine`(37) 之前** ✓ ——
`type X = …` 的整段先收成别名 ✓，那条声明里的类型标注才轮到 `TypeDefine` ✓。

**读数**：

| 项 | 第 488 轮 | 本轮 |
| --- | --- | --- |
| **完全一致** | 193 | **221 / 1037** ✓ |
| 缺 | 6159 | **5759** ✓ |
| 多出来 | 4852 | **3786** ✓ |
| 漂移 | 477 | 573 ✗ |
| 字段名 | 53 | 79 ✗ |

两栏涨的账要记清 ✓：**不是这一轮引入的** ✗ —— 实测 `tmp/recon/i41.ts`（`type A = number;`）
在**对照态**里同样是 `TypeAliasDeclaration` 漂移 1 / 多 1 ✓（绿树自己也差这一处 ✓）。
净收益仍是正的 ✓（完全一致 +28 ✓、缺 −400 ✓、多 −1066 ✓），那两栏留给后面按类查 ✓。

**门**：`runtime:check` 仍是 124 / 242 ✓；`coverage` 142 → **146 / 1713**（加权 6.4% → **6.7%** ✓）；
其余不动 ✓。对照态不受影响 ✓（这一趟在对照态本来就不跑 ✓）。

**下一块**：继续按队列次序往下接 ✓ —— 队列里排在 `Function`(2) 之后的是
`Signature`(3) / `MethodDeclaration`(4) / `Label`(5) / `Let`(6) / `Field`(7) / `New`(8) / `Method`(9) ✓；
`Decorator`(1) 要插到最前 ✓。**成员那一簇**（`MethodDeclaration` ＋ `Field` ＋ `Signature` ＋ `Label` ✓）
正是这份计划最初的主题 ✓，权重也大（1187 / 651 / 163 / …✓）。

## 一百〇七、成员那一簇接上（第 490 轮）：221 → **290 / 1037**

接上 `Decorator`(1) → `Function`(2) → `Signature`(3) → `MethodDeclaration`(4) → `Label`(5) → `Field`(7) ✓，
次序照队列 ✓；**`Let`(6) 跳过** ✗：解析期已经有 `LetBranch` ✓，再跑 `LetReorganization` 会两次成形 ✗。

分成两次量的账（同一份 `cases` 语料 ✓）：

| 接上的 | 完全一致 | 缺 | 漂移 | 多出来 | 字段名 |
| --- | --- | --- | --- | --- | --- |
| 基线（第 489 轮） | 221 | 5759 | 573 | 3786 | 79 |
| ＋`Signature` / `MethodDeclaration` / `Label` / `Field` | 264 | 5495 | 598 ✗ | 3800 ✗ | 91 ✗ |
| ＋`Decorator`（插到 `Function` 之前） | **290** | **5242** | 598 ✗ | **3598** | 95 ✗ |

⇒ `Decorator` 那一格值 **+26** ✓（它是「类头 / 成员前面那串 `@…`」✓，在队列里排第一 ✓）。

**一处容易误判的对照**：`tmp/recon/i37.ts`（`class A { b: number = 1; }`）在尺子上
**禁用 reorg 与对照态逐项相同** ✓（缺 3 / 漂 0 / 多 4 ✓）——那个形状是**绿树自己也差**的一处 ✗
（不是这一轮引入的 ✗；它是这一轮临时造的探针文件 ✓，不在语料里 ✓）。

**工具**：`tmp/recon/r490-members.cjs` ✓（可回滚的 JS 实验 ✓，备份在 `r490-backup/` ✓；
`--only=field,signature` 可以只上指定几条 ✓）。

**门**：`runtime:check` 124 → **125 / 242** ✓；`coverage` 146 → **147 / 1713** ✓；
其余与上一轮逐道相同 ✓（runtime:cli 1/78、cases:tsast 红、samples 红、cases:check 1050 全过 ✓）。
对照态 **859** 不动 ✓（这一趟在对照态不跑 ✓）。

**下一块**：继续往队列下游走 ✓ —— `New`(8) / `Method`(9) / `NullConditionalOperator`(10) /
`Namespace`(11) / `TypeLiteral`(12) / `Block`(13) / `JsonObject`(14) / `TypeBracket`(15) … ✓
（表达式与字面量那一簇 ✓，权重里 `Method` 831 / `JsonArray` 860 / `PropertyAccess` 940 ✓）。
**另有一笔待解**（第 488 轮就记下了 ✓）：`StatementReorganization3`（774 / 154 / 101 ✓）的时机是
「容器关闭时最后那一格」✓，与这一趟天然重合 ✓，但它还不在这一趟里 ✓。

## 一百〇八、下游那一簇接上（第 491 轮）：290 → **349 / 1037**

接在 `Field`(7) 之后、`Parameter`(25) 之前 ✓：`New`(8) → `Method`(9) → `NullConditionalOperator`(10)
→ `Namespace`(11) → `TypeLiteral`(12) → `Block`(13) → `JsonObject`(14) → `TypeBracket`(15) ✓。

两次量的账（同一份 `cases` 语料 ✓）：

| 接上的 | 完全一致 | 缺 | 漂移 | 多出来 | 字段名 |
| --- | --- | --- | --- | --- | --- |
| 基线（第 490 轮） | 290 | 5242 | 598 | 3598 | 95 |
| ＋`New` / `Method` / `NullConditionalOperator` / `Namespace` | 327 | 4827 | 559 | 3192 | 95 |
| ＋`TypeLiteral` / `Block` / `JsonObject` / `TypeBracket` | **349** | **4607** | **553** | **2903** | 115 ✗ |

四栏里三栏都在降 ✓，**字段名那一栏涨了** ✗（95 → 115 ✓）——记在账上 ✓，留给后面按类查 ✓。

**门这一次涨得明显** ✓：`runtime:check` 125 → **128 / 242** ✓、`runtime:cli` 1 → **2 / 79** ✓、
`coverage` 147 → **223 / 1713**（加权 6.7% → **10.3%** ✓）—— 表达式与字面量那一簇让 `tsrun`
能真正跑起来的用例一下子多了一片 ✓；其余两道与上一轮相同 ✓（cases:tsast 红、samples 红 ✓、
cases:check 1050 全过 ✓）。对照态 **859** 不动 ✓。

**一处工具坑（这一轮踩到 ✓，记下来免得重走）** ✗：`r490-members.cjs` 的备份是**上一轮的 `build`** ✗ ——
同一个脚本跑第二个变体时，`--undo`/自动还原会把 `build/ts` 退回旧版本 ✗（实测读数一度掉回 221 ✗，
而 `--only` 里多出来的四条根本没生效 ✓）。**修法**：跑变体之前先 `npx tsc` 从 `dist` 重建 ✓、
再删掉旧备份让脚本重新抓一份 ✓。

## 一百〇九、类型下半段接上（第 492 轮）：349 → **424 / 1037**

接在 `TypeBracket`(15) 之后、`Parameter`(25) 之前 ✓，次序照队列 ✓：
`ImportType`(16) → `TypePrefix`(17) → `LiteralType`(18) → `JsonArray`(19) → `InferType`(20) →
`TypeParameter`(21) → `TypePredicate`(22) → `TupleMember`(23) → `ParenthesizedType`(24) ✓。

| 接上的 | 完全一致 | 缺 | 漂移 | 多出来 | 字段名 |
| --- | --- | --- | --- | --- | --- |
| 基线（第 491 轮） | 349 | 4607 | 553 | 2903 | 115 |
| ＋`ImportType` / `TypePrefix` / `LiteralType` / `JsonArray` | 381 | 4302 | 575 ✗ | 2793 | 93 |
| ＋其余五条（`InferType` … `ParenthesizedType`） | **424** | **3832** | **541** | **2494** | **26** ✓ |

⇒ 九条全上之后**四栏全部下降** ✓，最漂亮的是**字段名那一栏：115 → 26** ✓
（上一轮它涨到 115 的那笔账，这一轮被类型那几条收掉了 ✓）。

**一笔 2 个文件的悬差** ✗（照实记下）：JS 实验那一版读数是 **426** ✓，落到源码后是 **424** ✓
（缺 3820 vs 3832、多 2486 vs 2494 也各差一点 ✓）。两次插的都是同一串、同一个位置 ✓，
差的只有「实验版把 `require` 写在方法体里、源码版是顶层 import」这一处 ✓ ——
2 个文件的量级，先记账 ✓，后面按 `--per-file` 找那两份文件对一下 ✓。

**门**：`runtime:check` 128 → **134 / 242** ✓、`coverage` 223 → **331 / 1713**（加权 10.3% → **15.3%** ✓）；
`runtime:cli` 2 / 79 ✓、`cases:check` 1050 全过 ✓，其余两道与上一轮相同 ✓。对照态 **859** 不动 ✓。

**下一块**：队列从 `HeritageClause`(26) 往下到队尾 ✓ ——
`BindingElement`(27) / `Import`(28) / `Export`(29) / `NamespaceExport`(30) / `TypeUnion`(31) / `As`(32) /
`FunctionType`(33) / `ConditionalType`(34) / **`Lamda`(36)** / `TernaryOperator`(38) / `Try`(39) /
`Switch`(40) / `For`(41) / `Foreach`(42) / `DoWhile`(43) / `While`(44) / `WrapSymbol`(45) /
`PropertyAccess`(46) / `CompoundAssignmentOperator`(47) / `NotNull`(48) / `OptionalCall`(49) /
`UnaryOperator`(50) / `BinaryOperator` 那一族（第 51 起）✓ / `LogicalOperator` / `Spread` ✓。
**一笔仍待解**：`StatementReorganization3`（容器关闭时最后那一格 ✓）。

## 一百一十、后半段接上（第 493 轮）：424 → **464 / 1037**

接在 `ParenthesizedType`(24) 之后、`Parameter`(25) 之前 ✓，次序照队列 ✓：
`HeritageClause`(26) → `BindingElement`(27) → `Import`(28) → `Export`(29) → `NamespaceExport`(30)
→ `TypeUnion`(31) → `As`(32) ✓。

| 项 | 第 492 轮 | 本轮 |
| --- | --- | --- |
| **完全一致** | 424 | **464 / 1037** ✓ |
| 缺 | 3832 | **3276** ✓ |
| 多出来 | 2494 | **2214** ✓ |
| 漂移 | 541 | 557 ✗ |
| 字段名 | 26 | 27 ✗ |

**门**：`runtime:check` 134 → **135 / 242** ✓；`cases:tsast` **第一次出现 1 片通过** ✓
（16 片里有一片的语料全绿 ✓ —— 分片是「每片各自算四方向」✓，一片绿就是那片语料全对 ✓）；
`coverage` 331 / 1713 ✓、`cases:check` 1050 全过 ✓。
**对照态这一轮没重量** ✗：这一趟在对照态本来就不跑（第 487 轮起就关着 ✓），前四轮每次都复量到 **859** 不动 ✓。

**下一块**：队列剩下的都在 `As`(32) 之后 ✓ —— `FunctionType`(33) / `ConditionalType`(34) /
`Lamda`(36) / `TernaryOperator`(38) / `Try`(39) / `Switch`(40) / `For`(41) / `Foreach`(42) /
`DoWhile`(43) / `While`(44) / `WrapSymbol`(45) / `PropertyAccess`(46) / `CompoundAssignmentOperator`(47) /
`NotNull`(48) / `OptionalCall`(49) / `UnaryOperator`(50) / `BinaryOperator` 那一族（第 51 起）/
`LogicalOperator` / `Spread` ✓，最后是已经接上的关键字 ✓。
**到那一步之前先记一笔** ✗：全接完之后这一趟就**等于整条队列** ✓，而对照态（整条队列 ✓）
自己也只到 **859 / 1037** ⇒ **再往上必须靠投影侧** ✓（绿树自己也差的那 178 份 ✓）——
这条界线要在接完之前想清楚 ✓，别把「把队列搬完」当成终点 ✓。

## 一百一十一、后半段**接不进去**（第 494 轮）：实测的负面结果，树不动（464 / 1037）

按上一节的计划把 `As`(32) 之后的规则往这一趟里接 ✓ —— **打炸了** ✗，按纪律整轮回滚 ✓（源码一个字没改 ✓）。

**实测账（`cases` 语料，接完之后跑尺子 ✓）**：

| 接上的 | 解析成功 | 抛异常 |
| --- | --- | --- |
| 基线（第 493 轮） | 1037 | 0 ✓ |
| ＋`FunctionType`/`ConditionalType`/`Lamda`/`Ternary`/`Try`/`Switch`/`For`/`Foreach`/`DoWhile`/`While` | 968 | **69** ✗ |
| ＋再叠 `WrapSymbol`/`PropertyAccess`/…/`Comma` 那 19 条 | 709 | **328** ✗ |

**逐条二分（`tmp/recon/r494-bisect.cjs` ✓：每条都从干净 `build` 出发 ✓，先 tsc 重建再单独打一条 ✓）**，
口径是「**相对干净基线的抛异常增量**」✓（干净基线自己是 33 ✓ —— 那 33 条不在尺子的 1037 份语料里 ✓）：

| 规则 | 增量 | 规则 | 增量 |
| --- | --- | --- | --- |
| `ConditionalType` / `Ternary` / `Try` / `Switch` / `For` / `Foreach` / `DoWhile` / `WrapSymbol` / `CompoundAssignment` / `OptionalCall` / `Spread` / `Comma` | **0** ✓ | `FunctionType` | +37 ✗ |
| | | `While` | +5 ✗ |
| | | `LogicalOperator` 那一族 | +9 ✗ |
| | | `NotNull` | +16 ✗ |
| | | `BinaryOperator` 那一族 | +63 ✗ |
| | | `UnaryOperator` | +75 ✗ |
| | | `PropertyAccess` | **+147** ✗ |

**抛的两种东西**（`tmp/recon/r494-errors.cjs` ✓ 按消息聚合 ✓）：

1. **`Maximum call stack size exceeded`** ✓（99 处 ✓）：栈里看得见
   `PropertyAccessReorganization.ChainEndIndex` → `SkipNextWrapSymbol` ✓、
   以及 `ExportReorganization.Process` → `new Export` → `InitialKeywordReorganizationQueue` ✓
   —— 都是**规则造出来的单元又走 `TryToClose`、而 `TryToClose` 又进这一趟** ✓ ⇒ **递归没有上界** ✗。
   全局那一趟不一样 ✗：`Token.Reorganize` 是「**扫到列表不再变化为止、且硬上界 16 趟**」✓（第 127 轮的护栏 ✓），
   而这一趟现在是「每条规则各扫一遍、单元创建再递归」✗ —— **缺的正是那个上界** ✗。
2. **`[object Object]`** ✓（229 处 ✓）：抛出来的是个对象（`SourceException` 那一族 ✓），
   现场里第一条是 `am-block-lambda-array-compound.ts` ✓ —— 还没细查 ✓，与上面那条大概是同一个根因的两副面孔 ✓。

**另一笔要记的观测** ✗：**同一个 `build` 两次跑，抛异常数会变** ✓（第 493 轮那次是 1037 / 0 ✓，
这一轮同样是干净基线却报 1004 / 33 ✓，而**四方向与产物节点数逐项相同** ✓：21306 / 16573 / 464 / 3276 ✓）
⇒ 那 33 条是**深度贴着栈上限**的那种 ✓（V8 内联与否就翻面 ✓）——
**四方向是稳的 ✓，异常计数不是** ✓，后面别拿它当唯一判据 ✓。

**下一轮的口径**（这轮量出来的）✓：

1. 给这一趟补上**与 `Reorganize` 同款的上界** ✓（「扫到不再变化为止 + 硬上界」✓），
   或者把「单元创建 ⇒ `TryToClose` ⇒ 再进这一趟」那条递归**改成队列式** ✓（不递归 ✓）；
2. 再按上面那张增量表**逐条**（从 `ConditionalType` 那批 0 增量的开始 ✓）接回来 ✓；
3. `PropertyAccess` / `UnaryOperator` / `BinaryOperator` 那三条量最大 ✗，要单独查它们为什么在关闭期炸 ✓
   （它们在全局那一趟里是**排在很后面**的 ✓ —— 前面那几十条规则先把形状收拢了 ✓，
   而这一趟还没接那么多 ✓ ⇒ 它们是「**半成品输入**」下炸的 ✓，这条假设下一轮先验证 ✓）。

## 一百一十二、「队列式」也救不了（第 495 轮）：另记一笔负面，退回来接**零增量**那一批 —— 464 → **485 / 1037**

**先试的那条路** ✗（第 494 节口径的第 1 条 ✓）：把入口改成**队列式**（第一次进来才开泵 ✓，
嵌套进来的单元排队 ✓，不再递归 ✓），再把那 19 条一起接上 ✓（`tmp/recon/r495-queue.cjs` ✓）。
结果不是栈溢出 ✗，而是**堆爆** ✗：跑 91 秒、4 GB 堆用尽（`allocation failure` ✓）
⇒ 「不递归」只换掉了症状 ✓，**根子还在** ✗：有规则在关闭期**自我再触发** ✓
（造出来的单元又进这一趟、又造 ✓ —— 全局那一趟靠的是 `Reorganize` 那个「扫到不再变化为止 + 硬上界」✓
与「每个单元只在自己那一趟里收」✓，这两道护栏这一趟都还没有 ✓）。

**退回来做的那一步** ✓：按第 494 轮那张增量表，只接**零增量**那一批 ✓ ——
`ConditionalType`(34) / `Ternary`(38) / `Try`(39) / `Switch`(40) / `For`(41) / `Foreach`(42) /
`DoWhile`(43) / `While`(44) / `WrapSymbol`(45) / `CompoundAssignmentOperator`(47) /
`OptionalCall`(49) / `Spread` / `BinaryOperator.Comma` ✓（次序照队列 ✓，插在 `As`(32) 与关键字之间 ✓）。

| 项 | 第 494 轮（基线） | 本轮 |
| --- | --- | --- |
| **完全一致** | 464 | **485 / 1037** ✓ |
| 缺 | 3276 | **2852** ✓ |
| 多出来 | 2214 | **1825** ✓ |
| 漂移 | 557 | **531** ✓ |
| 字段名 | 27 | 41 ✗ |
| 抛异常（同一次会话里的基线对照 ✓） | 1004 成功 / 33 异常 | 1004 / 33 ✓（**不变** ✓） |

**门**：`runtime:check` 135 → **136 / 242** ✓、`runtime:cli` 2 → **3 / 79** ✓、
`coverage` 331 → **348 / 1713**（加权 15.3% → **16.2%** ✓）；`cases:tsast` 仍是 1 片通过 ✓、
`cases:check` 1050 全过 ✓。

**下一块的两条路**（都记在这里 ✓）：

1. **补护栏** ✓：给这一趟补上 `Reorganize` 那两道（「扫到不再变化为止 + 硬上界」✓、
   「每个单元只在自己那一趟里收、不再排回队列」✗），补完之后 `FunctionType` / `PropertyAccess` /
   `UnaryOperator` / `BinaryOperator` / `NotNull` / `LogicalOperator` 才有机会接 ✓；
2. **绕开它** ✓：这三族缺的节点（`Parameter` 124 / `BinaryExpression` 118 / `ExpressionStatement` 220 /
   `Identifier` 592 ✓）里，**箭头函数那一簇**（`am-arrow-*` / `am-block-lambda-*` ✓）是大头 ✓ ——
   可以考虑把 `Lamda` 那一族**不靠关闭期**、而是直接按解析期端口重做 ✓（它本来就是「参数表 + `=>` + 体」✓，
   时机在 `=>` 那一刻 ✓，与 `IfSetBranch` 当初的加法同一路 ✓）。

## 一百一十三、先钉一道**深度上界**（第 496 轮）：485 → **502 / 1037**，抛异常归零

上一节的两条护栏（「扫到不再变化为止 + 硬上界」✓ 与「每个单元只在自己那一趟里收」✓）这一轮**没时间补** ✗，
先钉一道**临时的深度硬上界** ✓：`TokenFormerImpl.Depth >= 8` 就跳过这一层 ✓（不再往下钻 ✓）。
它把第 494/495 轮那两种炸法**一起摁住了** ✓：栈溢出 ✗（99 处 ✓）与堆爆 ✗（4 GB / 91 秒 ✓）都不再出现 ✓。

**接上的六组规则**（按队列次序 ✓，不是全堆在一处 ✗ —— 上一轮 A 版全插在 `TypeBracket` 之后 ✗，
次序不对 ⇒ 读数反而掉到 464 ✗，这一轮按位置插 ✓）：

| 位置 | 规则 |
| --- | --- |
| `As`(32) 与 `ConditionalType`(34) 之间 | `FunctionType`(33) |
| `WrapSymbol`(45) 之后 | `PropertyAccess`(46) |
| `CompoundAssignmentOperator`(47) 之后 | `NotNull`(48) |
| `OptionalCall`(49) 之后 | `UnaryOperator`(50) |
| `UnaryOperator` 之后 | `BinaryOperator` 那一族（Power/Multiplicative/Additive/In/Instanceof/Equality/LogicalAssignment/Bitwise/Nullish ✓）＋ `LogicalOperator` And/Or |

**读数**：

| 项 | 第 495 轮 | 本轮 |
| --- | --- | --- |
| **完全一致** | 485 | **502 / 1037** ✓ |
| 缺 | 2852 | **2733** ✓ |
| 多出来 | 1825 | 2137 ✗ |
| 漂移 | 531 | 551 ✗ |
| 字段名 | 41 | 72 ✗ |
| 抛异常 | 1004 成功 / 33 异常 | **1037 / 0** ✓ |

⇒ **头号指标涨 17 ✓、缺降 119 ✓、抛异常归零 ✓**，但**另外三栏都涨了** ✗ ——
这一轮是**混合结果** ✓，照实记下 ✓：三栏涨的那笔账（多半是新收出来的运算符单元让投影多投了一层 ✓）
是下一块的头号目标 ✓；`cases:tsast` 的分片也从 1 片通过掉回 0 片 ✗（另一个要看的地方 ✓）。

**门**：`runtime:check` 136 → **138 / 242** ✓、`runtime:cli` 3 / 79 ✓、
`coverage` 348 → **381 / 1713**（加权 16.2% → **17.8%** ✓，但 `differ` 18 → 167 ✗）、
`cases:check` 1050 全过 ✓。

**这笔临时界的账继续挂着** ✓（第 497 轮量过撤不掉 ✗）。

## 一百一十四、补上收敛环，但**深度界撤不掉**（第 497 轮）：502 → **505 / 1037**

补上 `Reorganize` 那道**收敛环** ✓：「扫到列表不再变化为止，硬上界 16 趟」✓
（`ApplyCloseRules` 现在只负责收敛 ✓，那一串规则搬进 `RunCloseRules` ✓）。

**试过撤掉第 496 轮那道深度界** ✗ —— **撤不掉** ✓：撤掉之后 **294 份语料当场炸** ✗
（78 处 `Maximum call stack size exceeded` ✓ + 216 处 `SourceException` 那一族 ✓；
那一版读数是 743 成功 / 294 异常 / 420 一致 ✗）。
⇒ 收敛环管的是「**一个单元内部**跑到不动为止」✓，**管不住「单元造出来又往下钻」那条链** ✗ ——
那要的是第 495 轮记的第二条护栏「每个单元只在自己那一趟里收」✓，还没补 ✓。
所以 `Depth >= 8` **暂时留着** ✓。

**读数（收敛环 ＋ 深度界 8）**：

| 项 | 第 496 轮 | 本轮 |
| --- | --- | --- |
| **完全一致** | 502 | **505 / 1037** ✓ |
| 缺 | 2733 | **2726** ✓ |
| 多出来 | 2137 | **2116** ✓ |
| 漂移 | 551 | 559 ✗ |
| 字段名 | 72 | 76 ✗ |
| 抛异常 | 1037 / 0 | 1037 / 0 ✓ |

**门**：`runtime:check` 138 / 242 ✓、`runtime:cli` 3 / 79 ✓、`coverage` 381 → **383 / 1713** ✓、
`cases:check` 1050 全过 ✓，`cases:tsast` 仍是 0 片通过 ✗、`samples` 红 ✗（与第 496 轮相同 ✓）。

**下一块**：补第二条护栏「**每个单元只在自己那一趟里收**」✓ ——
做法是把「规则造出来的单元」记进一张**待办表** ✓、由**外层**那一趟收尾时统一收 ✓
（而不是在规则里直接 `TryToClose` 递归下去 ✗），补完再撤 `Depth` ✓，
并把剩下没接的三条（`Lamda`(36) / `StatementReorganization3`(列表末尾那一格) / `Import` 那一侧的收尾 ✓）接上 ✓。

### 补记（第 498 轮，负面）：待办表也**死循环**

按上面那条口径做了 `tmp/recon/r498-drain.cjs` ✓：`ApplyCloseRules` 改成「待办表 + 最外层收尾」✓
（嵌套进来的单元进表 ✓，不递归 ✓），**收敛环留着** ✓，再给「一次外层调用最多收 20 万个单元」的预算 ✓。
实测**跑不完** ✗（手动停掉 ✓）⇒ **待办表也救不了** ✓。

**这一笔把根子钉住了** ✗：问题**不在递归深度** ✓，而在**单元创建本身没有上界** ✗ ——
有规则在**同一个容器上反复造单元** ✓，收敛环（比较「列表长度 + 每个元素还是不是同一个对象」✓）
抓不住它 ✓（每趟都换一批新对象 ✗ ⇒ 永远「有变化」✗）。
⇒ 下一个动作是**先量出「谁在造」** ✓（给 `Process` 记一笔「这一趟造了几个单元」✓，按规则聚合 ✓，
**上限 60 秒** ✓、只跑一小撮语料 ✓），量出来之后再决定是「给那条规则加守卫」✓ 还是「换掉收敛判据」✓。

**流程上改了一条** ✓（用户口径）：**每条命令硬上限 2 分钟** ✓ ——
上一条命令就是没设上限才卡住的 ✗（`r494-errors.cjs` 跑整份 1050 份语料 ✓，
在这一版补丁下直接进死循环 ✗）。以后凡是要跑语料的探针 ✓ 一律：小语料起步 ✓ + 显式超时 ✓。

## 一百一十五、`Lamda` 在收敛环之后**能接了**（第 498 轮末）：505 → **515 / 1037**

顺着上面那条线索先量「谁在造」✓（`tmp/recon/r498-whocreates.cjs` ✓：把 `Reorganization.ApplyTo` 包一层计数 ✓、
200000 次硬顶 ✓、只跑三份最早炸的语料 ✓）：三份文件里**每条规则的调用次数几乎一样** ✓
（`am-call-type-args.ts`：1561 / 1562 ✓；`am-block-lambda-array-compound.ts`：1388 / 1389 ✓）
⇒ **不是某一条规则在循环** ✗，而是**整趟在反复嵌套** ✓ —— 一个单元造出来又走 `TryToClose` ✓、
又跑一遍**整串**规则 ✓、又造 ✓ ⇒ 计数一起涨 ✓。这条把第 494/495 轮的猜测**证实**了 ✓。

**但同一轮试 `Lamda`(36) 却过了** ✓：它当年（第 494 轮）在「没有收敛环」的那一版里是炸的 ✗
（+37 份抛异常 ✓），而**在收敛环 + 深度界这一版上**：100 份抽查 **0 抛异常** ✓，
整份语料 **0 抛异常** ✓ ⇒ **收敛环把它救了** ✓（它的自我触发发生在**同一个容器内部** ✓，正是收敛环管得住的那一档 ✓）。

**读数**：

| 项 | 第 497 轮 | 本轮 |
| --- | --- | --- |
| **完全一致** | 505 | **515 / 1037** ✓ |
| 缺 | 2726 | **2561** ✓（−165 ✓） |
| 多出来 | 2116 | **2009** ✓ |
| 漂移 | 559 | **555** ✓ |
| 字段名 | 76 | **72** ✓ |
| 抛异常 | 1037 / 0 | 1037 / 0 ✓ |

⇒ **四栏全部变好** ✓（这是第 487 轮以来第一次四方向同向 ✓）。

**门**：`runtime:check` 138 → **146 / 242** ✓、`runtime:cli` 3 → **8 / 79** ✓、
`coverage` 383 → **523 / 1713**（加权 17.9% → **24.6%** ✓）；
`cases:tsast` 仍是 0 片通过 ✗、`samples` 红 ✗、`cases:check` 1050 全过 ✓。

## 一百一十六、语句壳那一支一直是**死代码**（第 499 轮）：515 → **552 / 1037**

这一轮的入口是 `samples` 那道门长期红着的那一处 ✓：`let answer = 0`（换行结尾 ✓）
投影出来是 `VariableStatement > VariableDeclarationList[]`（**空的声明表** ✗）＋
`=` 与 `0` 落到 `SourceFile` 上成了平级兄弟 ✗。dump 原树（`tmp/recon/tree.cjs` ✓）看得更清楚：
**根下根本没有 `Statement`** ✗ —— `[Let, SymbolToken(=), Identifier(0)]` 直接排在 `Root` 上 ✓。

**真因** ✗：`StatementBranch.JumpIn` 排在 `LineWrap.AppendIn` **之后** ✓ ——
派发循环遇到第一个 `Done` 就 `return` ✓，而 `LineWrap.AppendIn`（`WrapSymbolBranch` ✓）
会把换行吃掉并返回 `Done` ✗ ⇒ 这一支**一次都没被问到** ✗。
也就是说：第 487 轮把 `;` 那一档交给钩子之后 ✓，它**只剩软换行那一档** ✓，而那一档**从来没生效** ✗ ——
语句壳在「换行结尾」的语言里（这个语料里遍地都是 ✓）等于没有 ✓。

**修法一处** ✓：把 `StatementBranch.JumpIn` 挪到 `LineWrap.AppendIn` **之前** ✓
（`tmp/recon/r499b-queue.cjs` ✓）。这一支的 `Success` 本来就按「终结符还没进 `Data`」写 ✓，
挪到 appender 之前正好 ✓。

**读数**：

| 项 | 第 498 轮 | 本轮 |
| --- | --- | --- |
| **完全一致** | 515 | **552 / 1037** ✓ |
| 漂移 | 555 | **216** ✓（−339 ✓） |
| 缺 | 2561 | 2845 ✗ |
| 多出来 | 2009 | 2075 ✗ |
| 字段名 | 72 | 74 ✗ |
| 抛异常 | 1037 / 0 | 1036 / **1** ✗ |

**那一份炸的要记名** ✗：`tests/parse/cases/statements/stmt-do-while-no-block.ts` ✓ ——
报「`while(...)` 后需要跟语句」✓（`do … while` 不带块的那一档 ✓，新出现的确定性解析失败 ✗，
下一块先修它 ✓；其余 1036 份 0 异常 ✓）。

**门**：`runtime:check` 146 → **154 / 242** ✓、`coverage` 523 → **596 / 1713**（加权 24.6% → **28.9%** ✓）、
`cases:check` 1050 全过 ✓；`runtime:cli` 8 → **7 / 79** ✗（少了一份 ✓）、
`samples` 换成另一处差（`for` 的 incrementor 被投成两层 `PrefixUnaryExpression` ✗）、
`cases:tsast` 仍 0 片 ✗。

## 一百一十七、那一份炸的**不是这一轮弄坏的**（第 500 轮）：对照态同样炸

上一节点名的那份 `tests/parse/cases/statements/stmt-do-while-no-block.ts` ✓（`do x++` 换行 `while (x < 10)` ✓），
这一轮先查它的来路 ✓ —— **对照态（`DSH_XL_REORG=1`）同样炸** ✓：
栈是 `Root.Close` → `Statement.TryToClose` → `Statement.Reorganize` → `WhileReorganization.Process` ✓
⇒ 这是**重组层自己的一处老缺口** ✓（`do` 的体被语句壳包住之后 ✓，
`DoWhileReorganization.Previous` 认不出那个形状 ✓，于是落到 `WhileReorganization` 手里 ✓、
再因为「`while` 后面没有语句」抛错 ✓ —— `do-while.xl.md` 的 `BodyEnd` 那一节写的正是这条报错 ✓），
**不是第 499 轮引入的** ✗（那一节的口径要按这条更正 ✓）。

**顺手做的一处加固** ✓（`typescript/tokens/do-while/do-while.xl.md` ✓）：
三处「找词」从 `instanceof Identifier && Is("…")` 换成 `declaration-common.xl.md` 的 **`IsWordUnit`** ✓
（`do` / `while` 各一处 + `BodyEnd` 里找 `while` 那一处 ✓）——
与 `in` / `of` 当年那次同一个理由 ✓：这一趟现在会**反复跑**（收敛环 ✓），
第二趟看到的词可能已经被升成 `Keyword` ✓，按 `Identifier` 找就再也找不到 ✓。

**读数不动** ✓（552 / 1037 ✓，缺 2845 / 漂 216 / 多 2075 / 字段名 74 ✓，抛异常仍是那一份 ✓）——
这一处加固是**为了后面**（等 `do` 那一族真接上时不至于踩同一个坑 ✓），不是为了这一轮的读数 ✓。

**下一块**：`DoWhileReorganization` 的 `Previous`/`BodyEnd` 要认「体已经被语句壳包住」这个形状 ✓
（对照态和禁用 reorg 两档都缺 ✓）—— 两条路：给它加一句「体那一格是语句级单元也算」✓，
或者按第 499 轮那条线索先修「`LetBranch` 也排在 `LineWrap.AppendIn` 之后、它的换行那一档同样是死的」✓。

## 一百一十八、`do … while` 不许被行尾换行切断（第 501 轮）：语料**全解析**，读数持平

**先量的那条**（第 499 轮的线索 ✓）：把 `LetBranch` 也挪到 `LineWrap.AppendIn` 之前 ✓
（`tmp/recon/r501-queue2.cjs` ✓）—— **读数一个数字都没动** ✓（552 / 缺 2845 / 漂 216 / 多 2075 / 字段名 74 ✓）
⇒ 它的「换行那一档」在这个语料里**没有实例** ✓，所以**没有留树** ✗（改动没进源码 ✓，只留工具与这笔账 ✓）。

**真正修掉的那一处** ✓：`do x++` 换行 `while (x < 10)` 是**一条**语句 ✓（ASI 在这里不插分号 ✓），
可语句壳一收就把 `do` 关进壳里 ✓ ⇒ `DoWhileReorganization.Previous` 再也认不出它 ✗
⇒ 落到 `WhileReorganization` 手里 ✓、再因为「`while` 后面没有语句」抛错 ✗。
修法在**壳那一侧** ✓（`typescript/tokens/statement.xl.md` 的 `StatementBranch.Condition` ✓）：
这一段（上一个语句边界往后 ✓）的第一个实义单元是 `do` 这个词时**不收壳** ✓
（`Statement.WordOf` 两种形态都认 ✓，与第 500 轮那处加固同一口径 ✓）。

| 项 | 第 500 轮 | 本轮 |
| --- | --- | --- |
| 解析成功 / 抛异常 | 1036 / **1** ✗ | **1037 / 0** ✓ |
| 完全一致 | 552 | 552（持平 ✓） |
| 缺 / 漂移 / 多出来 / 字段名 | 2845 / 216 / 2075 / 74 | 2846 / 216 / 2081 / 74 ✓ |

**门**（与第 499 轮逐道相同 ✓）：`runtime:check` 154 / 242 ✓、`runtime:cli` 7 / 79 ✓、
`coverage` 596 / 1713（28.9% ✓）、`cases:check` 1050 全过 ✓；
`cases:tsast` 0 片 ✗、`samples` 仍差在 `for` 的 incrementor 那一处（两层 `PrefixUnaryExpression` ✗）。

**下一块**：`samples` 那处 `PrefixUnaryExpression` 两层 ✓（`for` 的 incrementor ✓，
`UnaryOperatorReorganization` 在收敛环里被反复套 ✓ —— 十有八九与「同一容器自我触发」那一族同源 ✓）。




## 一百一十九、`++` 不许在自己里面再折一层（第 502 轮）：552 → **563 / 1037**，`samples` 的 `hello.ts` 转绿

上一节点名的那处 `PrefixUnaryExpression` **两层**（`for` 的 incrementor ✓），这一轮量到了根子 ✓：
`i++` 折成 `UnaryOperator(Identifier i, SymbolToken ++)` 之后 ✓，**这个新单元自己也会关一次** ✓
⇒ 它自己的 `Data` 上又跑这一趟 ✓ ⇒ `++` 前面是 `i`（操作数 ✓）⇒ **又折一层** ✗ ——
实测 `tmp/recon/i50.ts`（`for (let i = 0; i < 3; i++) {}`）的 incrementor 被套了 **8 层** ✓，
而对照态只有**一层** ✓。

**修法一处** ✓（`typescript/tokens/unary-operator.xl.md` 的 `Previous` ✓）：
`++` / `--` 那一支加一句「容器已经是 `UnaryOperator` 就不再折」✓ ——
`++` 不会「前缀套前缀」（`++x` 里那个 `++` 已经是整个前缀 ✓），
而 `!` / `~` / `typeof` 的链（`!!x` / `typeof typeof x`）不受影响 ✓。

| 项 | 第 501 轮 | 本轮 |
| --- | --- | --- |
| **完全一致** | 552 | **563 / 1037** ✓ |
| 多出来 | 2081 | **1860** ✓（−221 ✓） |
| 缺 / 漂移 / 字段名 | 2846 / 216 / 74 | 2846 / 216 / 74 ✓（持平 ✓） |
| 解析 / 抛异常 | 1037 / 0 | 1037 / 0 ✓ |

**门**：`runtime:check` 154 → **155 / 242** ✓、`coverage` 596 → **624 / 1713**（28.9% → **30.5%** ✓）、
**`samples` 里的 `hello.ts [TS 形状]` 转绿** ✓（那道门从第 486 轮起一直红着的那一处 ✓）、
`cases:check` 1050 全过 ✓；`cases:tsast` 0 片 ✗、`runtime:cli` 7 / 79 ✓。

**下一块**：同一族「自己套自己」的形状 ✓ —— 按 `多出来` 那一栏（还剩 1860 ✓）继续找哪几条规则
在**同一个容器里自我触发** ✓（`BinaryOperator` 那一族与 `PropertyAccess` 是头两个候选 ✓）。

## һ百二十、成员列表里不收语句壳（第 503 轮）：563 → **676 / 1037**（缺 ?903、多 ?697）

上一节点名的「类成员带修饰词」那一处 ?（`am-class-modifier-order.ts` ?：
`private static readonly b: number` 与 `public abstract m(): number` 都 MISS ?、多出
`ExpressionStatement` / `BinaryExpression` / `CallExpression` ?），先查来路 ? ——
**对照态逐项相同** ?（缺 10 / 多 7 ?）? 又是重组层自己的老缺口 ?。

dump 原树看得清楚 ?：`private static readonly b: number` 被包成一个 **`Statement`** ?
（`FieldReorganization` 于是看到「一个 Statement」?，成员永远成形不了 ?）；
根子在**成员列表里也收了语句壳** ? —— 而 `ClassBody` / `InterfaceBody` / `TypeLiteralBody` / `EnumBody`
的子单元是**成员** ?，不是语句 ?。

**修法两处**（`typescript/tokens/statement.xl.md` ?，同一口径 ?）：
`Statement.FormFrom` 与 `StatementBranch.Condition` 在**这四种宿主**上直接返回 ?。

| 项 | 第 502 轮 | 本轮 |
| --- | --- | --- |
| **完全一致** | 563 | **676 / 1037** ?（+113 ?） |
| 缺 | 2846 | **1943** ?（?903 ?） |
| 多出来 | 1860 | **1163** ?（?697 ?） |
| 漂移 | 216 | 213 ? |
| 字段名 | 74 | 77 ?（+3 ?，可忽略 ?） |
| 解析 / 抛异常 | 1037 / 0 | 1037 / 0 ? |

**门**：`runtime:check` 155 → **158 / 242** ?、`runtime:cli` 7 → **10 / 79** ?、
`coverage` 624 → **726 / 1713**（30.5% → **37.5%** ?）、`samples` 的 `hello.ts` 仍绿 ?、
`cases:check` 1050 全过 ?；`cases:tsast` 0 片 ?。

**下一块**：`多出来` 还剩 1163 ? —— 按上一轮那条线索继续找「同一个容器里自我触发」的形状 ?
（`BinaryExpression` / `ExpressionStatement` 仍是头两个候选 ?）；另一条线是 `samples` 剩下的那几个样本 ?。

## 一百二十一、`Label` 挪到 `JsonObject` 之后（第 504 轮）：676 持平，缺 ?14、漂移 ?4

**先查的两处来路** ?（都在 `--file` 上量的 ?）：

| 用例 | 禁用 reorg | 对照态 | 结论 |
| --- | --- | --- | --- |
| `am-declare-module-css.ts`（`export default c` ?） | 缺 2 / 多 2 ? | **逐项相同** ? | 重组层老缺口 ?（`ExportAssignment` 两档都没人收 ?） |
| `am-prop-named-keywords.ts`（`{ type: 1 }` ?） | 缺 3 / 多 1 ?（`type: 1` 成了 `LabeledStatement` ?） | **完全一致** ? | ?? **这一处是我这版特有的** ? |

**做的那一处** ?：把 `LabelReorganization` 从队列第 5 位挪到 `JsonObjectReorganization`（第 14）**之后** ?
（`typescript/parse-pipeline.xl.md` ?）—— `LabelReorganization.Previous` 的 `IsStatementStart`
在「还没收成 `ObjectLiteral`」的平铺列表上会把对象字面量的 `type:` 判成标签 ?。

**读数**：完全一致 676（持平 ?）、缺 1943 → **1929** ?、漂移 213 → **209** ?、
多出来 1163（持平 ?）、字段名 77（持平 ?）、解析 / 抛异常 1037 / 0 ?。

**但那条用例没有被它救回来** ?：`am-prop-named-keywords.ts` 仍是缺 3 / 多 1 ?
（`type: 1` 还是 `LabeledStatement` ?）? 说明**对象字面量在那一格还没成形** ?，
`Label` 看到的分明是平铺的 `[Identifier(type), Symbol(:), Identifier(1)]` ? ——
下一块要查的是「`{ type: 1 }` 这个括号**为什么没有先被 `JsonObjectReorganization` 收掉**」?
（对照态里它是收掉的 ? ? 差别在**括号那一趟的时机或队列** ?）。

**下一块**：① `{ type: 1 }` 那一处（对象字面量与 `Label` 的次序/时机 ?）；
② `export default <表达式>`（`ExportAssignment` ?，两档都缺 ?，属重组层老缺口 ?）。

## 一百二十二、对象字面量里那个 `Label` 到底谁造的（第 505 轮）：**负面**，两句都试了、都没动读数

第 504 轮留下的那条「我这版特有」的差 ?（`am-prop-named-keywords.ts` 的 `{ type: 1 }` ?），这一轮试了两处 ?：

1. **`Label` 在 `ObjectLiteral` 里不跑** ?（`if (unit.constructor.name !== "ObjectLiteral")` ?）——
   读数**一个数字都没动** ?（676 / 缺 1929 / 漂 209 / 多 1163 / 字段名 77 ?，那条例句也还是缺 3 / 多 1 ?）
   ? **撤掉** ?（源码回到第 504 轮 ?，只留这笔账 ?）。
2. 顺手把那一格的原树 dump 出来 ?（`tmp/recon/tree.cjs` ?）：`ObjectLiteral [89,114)` **是成形的** ?，
   里面却是 `Label [91,96)` ＋ `Identifier(1)` ? —— 也就是说 **`Label` 确实是在对象字面量**里面**造出来的** ?，
   可第 1 条那道闸没拦住它 ? ? 只能说明它**不是**在 `ObjectLiteral` 这个单元自己的那一趟里造的 ?
   （更可能是在**语句那一层**的平铺列表上先造好 ?、随后被 `JsonObjectReorganization` 连同内容一起收进对象 ?）。

**下一块**：给 `LabelReorganization.Previous` 打一次点 ?（`tmp/recon/` 的探针套路 ?），
把「造它的那一刻 `unit.constructor.name` 是谁」量出来 ? —— 这一笔量清之后，
要么把闸下在正确的那一层 ?，要么确认「对象字面量的键在平铺阶段就不该被 `Label` 认」?。

### 补记（第 506 轮）：探针量出来了 —— **造 `Label` 那一刻容器是 `{` 括号**

上一节猜的「在语句那一层先造好 ?」**不对** ?。给 `LabelReorganization.Previous` 打点
（`tmp/recon/r506-label-probe.cjs` ?：命中 `type` / `as` / `is` 这几个词时把**容器类名**与整张单元表打出来 ?）：

```
tmp/recon/i51.ts（`const o = { type: 1 };`）: Label 命中 1 次
    container=Bracket units=Identifier,SymbolToken,Identifier word=type
am-prop-named-keywords.ts: Label 命中 1 次
    container=Bracket units=Identifier,SymbolToken,Identifier,SymbolToken,… word=type
```

? **容器是那个 `{` 括号**（还没成 `ObjectLiteral` ?）—— 子单元先关 ?，括号自己那一趟就把 `type:`
收成了 `Label` ?；等父那一趟跑 `JsonObjectReorganization` 时 ?，`Label` 已经在里面了 ?。
这也解释了第 505 轮那道闸为什么没拦住 ?：`ObjectLiteral` 那时**还不存在** ?。

**试的那一处**（`tmp/recon/r506b-brace.cjs` ?）：在 `{` 括号自己那一趟里不跑 `Label` ? ——
脚本本身写崩了 ?（模板串里的反引号 ?），这一轮**没量到** ?，下一轮先修脚本再量 ?。

**下一块**：`{` 括号那一趟到底该不该收标签 ? —— 判据要落在「这个 `{` 是块还是对象字面量」上 ?，
而那正是 `JsonObjectReorganization.Previous` 手里那句 `IsStatementStart` ?
（块 ? 标签合法 ?、对象字面量 ? 键不是标签 ?）。

## 一百二十三、`{` 括号自己那一趟不跑 `Label`（第 507 轮）：676 → **705 / 1037**

第 506 轮的探针量出「容器就是那个 `{` 括号」?，这一轮把探针脚本里的反引号坑修掉 ?
（`tmp/recon/r507-brace.cjs` ?）再量 ? —— 结论坐实 ?，于是把闸下在**括号那一层** ?：
`unit.constructor.name === "Bracket" && (unit as Bracket).startBracket === "{"` 时**不跑 `Label`** ?
（`typescript/parse-pipeline.xl.md` ?）。块里的标签不受影响 ?：块那一趟由**语句队列**负责 ?
（`JsonObjectReorganization` 造块/对象时会给它补队列 ?）。

| 项 | 第 506 轮 | 本轮 |
| --- | --- | --- |
| **完全一致** | 676 | **705 / 1037** ?（+29 ?） |
| 缺 | 1929 | **1778** ?（?151 ?） |
| 多出来 | 1163 | **1052** ?（?111 ?） |
| 漂移 / 字段名 | 209 / 77 | 209 / 77 ?（持平 ?） |

那条用例（`am-prop-named-keywords.ts`）**四个方向全零** ?（对照态本来就是全零 ?，两档终于对齐 ?）。

**门**：`runtime:check` 158 → **168 / 242** ?、`runtime:cli` 10 → **16 / 79** ?、
`coverage` 726 → **897 / 1713**（37.5% → **46.8%** ?）、`samples` 的 `hello.ts` 仍绿 ?、
`cases:check` 1050 全过 ?；`cases:tsast` 0 片 ?。

**一处编译坑记下** ?：`unit.startBracket` 在 `Token` 上没有这个属性 ?（`tsc` 报 TS2339 ?），
要写成 `(unit as Bracket).startBracket` ? —— 这一轮先跑出来的是 JS 实验版读数 ?、源码版当场挂在类型检查上 ?。

**下一块**：`多出来` 还剩 1052 ?；`缺` 1778 ? —— 按第 506/507 这一路（探针 → 找容器 → 下闸 ?）继续，
下一个候选是 `FunctionType`（多 105 ?）与 `BindingElement`（缺 74 ?）。

## 一百二十四、没有重组队列的单元不进这一趟（第 508 轮）：705 → **739 / 1037**（四栏同降）

上一节的「自己套自己」那一族（`FunctionType` 那一格被套了 **8 层** ? —— 正好等于第 496 轮那道深度界 ?，
是它把嵌套按住的 ?）这一轮找到了**总闸** ?：对照态里 `Token.Reorganize` 开头就有一句
「`ReorganizationQueue === null` 就早退」? —— 有些类**本来就没有队列** ?（`FunctionType` 那一族 ?），
它们的内容不该被再收一遍 ?。**少了这一句，规则造出来的单元自己也会关一次** ? ? 又跑整串规则 ?
? 就是第 502 / 507 与这一族所有「自己套自己」的来源 ?。

**修法一处** ?（`typescript/parse-pipeline.xl.md` 的 `ApplyCloseRules` ?）：进门先判 `unit.ReorganizationQueue === null` ?。

| 项 | 第 507 轮 | 本轮 |
| --- | --- | --- |
| **完全一致** | 705 | **739 / 1037** ?（+34 ?） |
| 缺 | 1778 | **1612** ? |
| 漂移 | 209 | **163** ? |
| 多出来 | 1052 | **932** ? |
| 字段名 | 77 | **64** ? |

? **四栏同降** ?（第二次 ?）。**门**：`runtime:check` 168 → **172 / 242** ?、
`runtime:cli` 16 → **19 / 79** ?、`coverage` 897 → **954 / 1713**（46.8% → **49.8%** ?）、
`samples` 的 `hello.ts` 仍绿 ?、`cases:check` 1050 全过 ?；`cases:tsast` 0 片 ?。

**下一块**：`FunctionType` 那一格**还没好** ?（`cls-abstract-new-type.ts` 仍是缺 2 / 多 10 ?）——
说明它在**有队列**的那一层就套起来了 ?，要按第 506/507 那一路**打点找容器** ?；
另外 `多出来` 还剩 932 ?、`缺` 1612 ?。

## 一百二十五、`=>` 已经在 `FunctionType` 里面就不再折（第 509 轮）：739 → **746 / 1037**

上一节留下的那一格 ?（`abstract new () => A` 被套 8 层 ?），这一轮**打点量清楚了** ?
（`tmp/recon/r509-ftype-probe.cjs` ?，在 `FunctionTypeReorganization.Process` 上记「容器是谁、有没有队列」?）：

```
tmp/recon/i52.ts（`type Ctor = abstract new () => A;`）: FunctionType 成形 8 次
    x1  container=Statement    queue=set
    x7  container=FunctionType queue=set      ← 自己套自己
```

? 它的**队列是有的** ?（`queue=set` ?）所以第 508 轮那道闸拦不住 ? —— 对照态只成形 **1 次** ?。
**修法一处** ?（`typescript/tokens/function-type.xl.md` 的 `Previous` ?）：
`current.Parent` 的类名是 `FunctionType` 时直接返回 `false` ?
（用**类名**判定 ?，本文件引 `lamda` ?，再 `instanceof FunctionType` 会绕出环 ? —— 与 `statement.xl.md` 里 `Let` 同一条纪律 ?）。

| 项 | 第 508 轮 | 本轮 |
| --- | --- | --- |
| **完全一致** | 739 | **746 / 1037** ?（+7 ?） |
| 多出来 | 932 | **815** ?（?117 ?） |
| 缺 | 1612 | **1600** ? |
| 字段名 | 64 | **58** ? |
| 漂移 | 163 | 163 ?（持平 ?） |

那条用例（`cls-abstract-new-type.ts`）**四个方向全零** ?。**门**：`runtime:check` 172 / 242 ?、
`runtime:cli` 19 / 79 ?、`coverage` 954 / 1713（49.8% ?）、`samples` 的 `hello.ts` 仍绿 ?、
`cases:check` 1050 全过 ?；`cases:tsast` 0 片 ?。

**下一块**：同一个套路（打点 → 找容器 → 下闸 ?）接着收「自己套自己」那一族 ? ——
`多出来` 还剩 815 ?（`ExpressionStatement` / `BinaryExpression` 仍是候选 ?）、`缺` 1600 ?。

## 一百二十六、`TypeAssign` 不是自己套自己（第 510 轮）：**负面**，读数一个数字都没动

按第 509 轮那一族的下一格试的 ?：`多出来` 里 `TypeAliasDeclaration` 78 ?（样本 `type C = abstract new () => A` ?），
猜它和 `FunctionType` 一样在**自己里面再折一层** ? ? 给 `TypeAssignReorganization.Previous` 加一句
「容器已经是 `TypeAssign` 就不再折」?（`tmp/recon/r510-typeassign.cjs` ?）。

**读数一个数字都没动** ?（746 / 缺 1600 / 漂 163 / 多 815 / 字段名 58 ?，123 份抽查 0 抛异常 ?）
? **撤掉** ?（源码不动 ?，build 已用 `tsc` 还原 ?）。
结论：那一笔 `TypeAliasDeclaration` **不是**自己套自己来的 ?，得另找来路 ?
（下一轮按第 506/509 那套探针直接量「`TypeAssign` 成形几次、容器是谁」?）。

### 补记（第 511 轮）：`TypeAssign` **只成形 1 次** —— 那笔多出来的 `TypeAliasDeclaration` 在**投影那一侧**

接着上一节量 ?（`tmp/recon/r511-typeassign-probe.cjs` ?，在 `TypeAssignReorganization.Process` 上记容器 ?）：

```
tmp/recon/i52.ts（`type Ctor = abstract new () => A;`）: TypeAssign 成形 1 次
    x1  container=Statement units=Identifier,Identifier,SymbolToken,FunctionType
am-conditional-in-type-arg.ts: TypeAssign 成形 1 次
    x1  container=Statement units=Identifier,Identifier,GenericType,SymbolToken,Identifier,GenericType
```

? **规则那一侧是干净的** ?（每条 `type X = …` 恰好一个 `TypeAssign` ?，容器是 `Statement` ?）。
所以「多出来 `TypeAliasDeclaration` 78」出在**投影那一侧** ?（`typescript/print-ast-common.xl.md` 那一份 ?，
大概率是「`Statement` 与 `TypeAssign` 各投一次」?）—— 下一块要去那边看 ?，
**这一块与「搬规则」不是同一条线** ?（记在这里，免得下一轮又往规则上找 ?）。

## 一百二十七、箭头体的范围到 `[` 就断了（第 512 轮）：**两档同样** ? 又是规则侧的老缺口

看 `多出来 ExpressionStatement` 190 的头一个样本 ?（`am-block-lambda-array-compound.ts` ?，`x => x[1, 2, 3]` ?）：

```
禁用 reorg :  缺 5　漂 2　多 4    DRIFT ExpressionStatement TS[525,541) vs 产物[525,531)  "x => x"
对照态     :  缺 6　漂 2　多 4    DRIFT ExpressionStatement TS[525,541) vs 产物[525,531)  "x => x"
```

? **两档同样** ? ? 不是这一版特有的 ?，是**规则侧**的老缺口 ?：
箭头体的范围在 `[` 那里就断了 ?（`x[1, 2, 3]` 里的下标与逗号表达式整段没收进去 ?，
于是 TS 的 `ElementAccessExpression` / `BinaryExpression` / `CommaToken` 全缺 ?、产物多出一个截断的 `ExpressionStatement` ?）。

**下一块**（两条线都记着 ?）：
① 规则侧：`LamdaReorganization` 的体范围要认「体后面还挂着 `[` 下标」?
（与 `#x in o` / `this.#x` 那两笔 `BinaryExpression` 多出来 ? 是同一族的后续 ?）；
② 投影侧：`Statement` 与 `TypeAssign` 各投一次 `TypeAliasDeclaration` 那一处 ?（第 511 轮定位 ?）。

**这一轮的读数**：746 / 1037 不变 ?（只做定位 ?，未动树 ?）。

### 补记（第 513 轮）：在 `SearchStatementEnd` 之后接 `[` **没有效果** —— 切口不在那里

按上面①试的 ?（`tmp/recon/r513-lamda-body.cjs` ?：算完 `endIndex` 之后，只要紧接着还是 `[` 括号就并进体里 ?）：

**读数一个数字都没动** ?（746 / 缺 1600 / 漂 163 / 多 815 / 字段名 58 ?，
`am-block-lambda-array-compound.ts` 仍是 `DRIFT … TS[525,541) vs 产物[525,531)` ?），123 份抽查 0 抛异常 ?
? **撤掉** ?（源码不动 ?，build 已还原 ?）。

? 说明切口**不在**「`SearchStatementEnd` 之后的收尾」这一格 ? —— 要么 `endIndex` 拿到的位置本来就不是我以为的那一个 ?，
要么体是在**更早**的一步就定死了 ?。**下一块**：给 `LamdaReorganization.Process` 打点 ?
（把 `units` 逐项类名、`index`、算出来的 `endIndex` 全打出来 ?，只看那一个文件 ?），
量清「它当时看到的下一格到底是什么」?。
## 涓€鐧句簩鍗佸叓銆乣LamdaReorganization.Process` 鍙鍙埌**涓€娆�**锛堢 514 杞級锛氶偅涓埅鏂殑 `Lamda` 涓嶆槸瀹冮€犵殑

鎺ョ潃涓婁竴鑺傜殑銆屼笅涓€鍧椼€嶆墦鐐� 鉁擄紙`tmp/recon/r514-lamda-probe.cjs` 鉁擄細鍦� `endIndex = SearchStatementEnd(...)`
閭ｄ竴琛屽悗闈㈡妸 `index` / `endIndex` / `units` 閫愰」绫诲悕涓庡尯闂村叏鎵撳嚭鏉� 鉁擄級锛�

```
am-block-lambda-array-compound.ts: 鎵撶偣 1 娆�
    index=1 endIndex=-1 | 0:Identifier[undefined,undefined) 1:SymbolToken[undefined,undefined) 2:Identifier[undefined,undefined)
```

涓ゆ潯淇℃伅閮藉緢纭� 鉁擄細

1. **鏁翠唤鏂囦欢鍙鍙埌涓€娆�** 鉁� 鈥斺€� 鑰屾姇褰遍噷閭ｄ唤浜х墿鏈�**濂藉嚑涓�** `Lamda` 鉁� 鈬�
   閭ｄ簺 `Lamda` **涓嶆槸** `LamdaReorganization` 閫犵殑 鉁擄紙瑙ｆ瀽鏈熷彟鏈変竴鏉¤矾鍦ㄩ€� 鉁擄紝
   涓庣 486 杞妸 `Let` / 璇彞澹虫惉杩涜В鏋愭湡鏄悓涓€绫绘儏鍐� 鉁擄級锛�
2. 閭ｄ竴娆¤繕缁欎簡 `endIndex = -1` 鉁撱€佽€屼笖 `units` 鐨勫尯闂村叏鏄� `undefined` 鉁�
   鈬� 閭ｄ竴鍒荤殑鍗曞厓**杩樻病鎸備笂浣嶇疆** 鉁擄紙鏄В鏋愪腑閫旂殑涓€鎵� 鉁擄級锛屾湰鏉ュ氨涓嶆槸鎴戜滑瑕佹壘鐨勯偅涓€鏍� 鉁撱€�

鈬� 涓婁竴鑺傞偅涓ゅ銆屾帴 `[`銆嶇殑澶辫触 鉁� 鍒拌繖閲屽氨璇村緱閫氫簡 鉁擄細**鍒囧彛涓嶅湪杩欐潯瑙勫垯鐨勮繖涓€鏀噷** 鉁撱€�
**涓嬩竴鍧�**锛氬幓鎵俱€岃В鏋愭湡鏄皝鍦ㄩ€� `Lamda`銆嶁湏锛堜粠 `tokens/lamda/*.xl.md` 鐨� `LamdaParameters` / `LamdaBody`
浠ュ強 `Lamda` 鏋勯€犲櫒鐨勮皟鐢ㄧ偣寰€鍥炴煡 鉁擄級锛岄噺鍑� `x => x[1, 2, 3]` 閭ｄ竴涓� `Lamda` 鐨勪綋鏄湪鍝竴姝ユ埅鏂殑 鉁撱€�


## 一百二十九、`[` / `(` 括号里也不收语句壳（第 515 轮）：746 → **748 / 1037**

第 514 轮那条「解析期另有一条路在造 `Lamda`」的指向 ?，这一轮改成**先 dump 原树**看清楚了 ?
（`x => x[1, 2, 3]` ? 在 `{ … }` 块里 ?）：

```
Statement [523,550)
  Bracket [523,550)              ← 块
    Statement [525,531)          ← 箭头的壳
      Lamda [525,531)            ← 体只剩 `x`（`LamdaBody [530,531)`）?
    Statement [532,541)          ← 又一个壳！
      ArrayLiteral [532,541)     ← `[1, 2, 3]` 被当成了独立语句 ?
```

? 真因不是 `Lamda` 那一侧 ?，而是**语句壳在下标括号里面也收了** ?：
`[1, 2, 3]` 里逗号那一格把元素收成了一条**语句** ? ——
**语句只活在块里** ?，`[` / `(` 里没有语句 ?。

**修法两处**（`typescript/tokens/statement.xl.md` ?，与第 503 轮那四种宿主同一口径 ?）：
`Statement.FormFrom` 与 `StatementBranch.Condition` 在容器是 `Bracket` 且 `startBracket` 为 `[` / `(` 时直接返回 ?
（`{` **不排** ?：它既可能是对象字面量（无语句 ?）也可能是块（有语句 ?），要按 `Context` 分辨 ?，那是另一笔账 ?）。

| 项 | 第 514 轮 | 本轮 |
| --- | --- | --- |
| **完全一致** | 746 | **748 / 1037** ? |
| 缺 | 1600 | **1570** ?（?30 ?） |
| 漂移 | 163 | **161** ? |
| 多出来 | 815 | **813** ? |
| 字段名 | 58 | 58 ? |

**门**：`runtime:check` 172 → **178 / 242** ?、`runtime:cli` 19 → **22 / 79** ?、
`coverage` 954 → **957 / 1713**（49.8% → **50.1%** ?）、`samples` 的 `hello.ts` 仍绿 ?、
`cases:check` 1050 全过 ?；`cases:tsast` 0 片 ?。

**注意**：那条样本（`am-block-lambda-array-compound.ts`）**没被救回来** ?（仍是缺 5 / 漂 2 / 多 4 ?）
? 它里面那次切分走的还是另一条路 ?（下一块照第 506/509 的探针套路，量 `[` 里那个壳到底是谁收的 ?）。

### 补记（第 516 轮）：把 `[` 并进体里**下在正确的那一格**也没用 —— `endIndex` 不是切口

按上面①试的第二处 ?（`tmp/recon/r516`：把扩体那句下在 `Process` **装配体之前** ?，
也就是 `for (let i = index + 1; i <= endIndex; i++)` 那一行**前面** ? —— 这一处覆盖**所有**给
`endIndex` 赋值的那几条支路 ?，比第 513 轮下在 `SearchStatementEnd` 那一格稳 ?）：

**读数一个数字都没动** ?（748 / 缺 1570 / 漂 161 / 多 813 / 字段名 58 ?，
那条用例仍是 `DRIFT … TS[525,541) vs 产物[525,531)` ?）? **撤掉** ?（源码不动 ?，build 已还原 ?）。

? 两处都试过、都没用 ? ? **`endIndex` 根本不是那个切口** ? —— 那个「体只剩 `x`」的 `Lamda`
要么不是这一条 `Process` 造出来的 ?（可全仓 `new Lamda(` 只有两处：这一条规则与 `Clone` ?），
要么它的体是**造完之后**才被截断的 ?。
**下一块**：在 `new Lamda(template)` 那一行上打**调用栈** ?（只看那一个文件 ?）——
把「是谁、在什么时机造的这一个 `Lamda`」钉死 ?，再决定闸下在哪一层 ?。

### 补记（第 517 轮）：栈打出来了 —— **整份文件只造 1 个 `Lamda`，而且是在解析途中造的**

`tmp/recon/r517-lamda-stack.cjs` ?（在 `new Lamda(template)` 那一行 `throw/catch` 打栈 ?；
第一版探针写崩过一次 ?：我在那一行引了**尚未声明**的 `endIndex` ? ? 触发 TDZ ? ?
整个文件报 `SourceException` ?、`new Lamda` 显示 0 次 ? —— 这一点本身也是个教训 ?：探针里**不要引用后面才声明的局部变量** ?）：

```
am-block-lambda-array-compound.ts: new Lamda 1 次
    index=1
    at LamdaReorganization.Process (build/ts/typescript/tokens/lamda/lamda.js:362:21)
    at LamdaReorganization.ApplyTo (build/ts/core/syntax/reorganization.js:21:26)
    at TokenFormerImpl.RunCloseRules (build/ts/typescript/parse-pipeline.js:380:46)
    at TokenFormerImpl.ApplyCloseRules (…)
```

配上第 514 轮那一笔（同一次调用 `endIndex = -1` ?、`units` 三项区间全是 `undefined` ?）? **结论**：

> `x => x[1, 2, 3]` 里那个 `Lamda` **是在解析途中**（体的后一半还没读进来 ?）被这一趟收掉的 ? ——
> 那一刻它看到的只有 `[x, =>, x]` ?（所以体只剩 `x` ?），`[1, 2, 3]` 是**之后**才进树的 ?。

? 也就是说：**子单元关闭时触发的那一趟，跑在了「父容器还没读完」的时刻** ?。
**下一块**：给这一趟加一道「**只看已经关完的单元**」的闸 ? ——
判据现成 ?（单元都有 `SourceRange` ?，未关完的 `start/end` 是 `undefined` ?，第 514 轮的探针已经量到过 ?）：
`unit.Data` 里只要还有没签出范围的单元 ?，就**跳过这一趟** ?（等父容器真正关闭时再收 ?）。

### 补记（第 518 轮）：加「只看已经关完的单元」这道闸也**没有效果** —— 撤掉

按上一节那条「下一块」做的 ?（`ApplyCloseRules` 进门先扫 `unit.Data` ?，
只要有单元的 `SourceRange.Start` / `End` 还是 `null` 就直接返回 ?）：

**读数一个数字都没动** ?（748 / 缺 1570 / 漂 161 / 多 813 / 字段名 58 ?，解析 / 抛异常不变 ?）
? **撤掉** ?（源码不动 ?，build 已还原 ?）。

? 说明那一趟**见到的单元其实都已经签完范围** ?（第 514 轮探针里 `undefined` 的那一批 ?
多半是**另一个容器**的一次调用 ?，不是我们要找的那一个 ?）——
**第 517 轮那条结论要打个折** ?：栈证实了「整份文件只造 1 个 `Lamda`、就在这一条 `Process` 里」?，
但「那一刻父容器没读完」这一步还没被独立证实 ?。

**下一块**：把第 517 轮那次调用**连同它当时的 `units` 原样照下来** ?
（在 `new Lamda` 那一行同时打 `index`、`units` 逐项类名与区间、`endIndex` ?，且**只引用已声明的变量** ?），
量清「那一次的 `units` 到底是哪一层的三个单元」? —— 再决定闸下在哪一层 ?。

### 补记（第 519 轮）：查 `start` / `end` 那道闸**大崩**（748 → 207）—— 已回滚，另记一条工具坑

按上一节「把那次调用连同 `units` 原样照下来」做的 ?（`tmp/recon/r517-lamda-stack.cjs` 加了 `units` 一栏 ?）：

```
am-block-lambda-array-compound.ts: new Lamda 1 次   index=1
    units=0:Identifier[undefined,undefined) 1:SymbolToken[undefined,undefined) 2:Identifier[undefined,undefined)
```

? 那一刻容器里三个单元的 `start` / `end` 都是 **`undefined`** ?（第 518 轮那道闸查的是
`SourceRange.Start === null` ? —— **查错了字段** ?）。

于是把闸改成查 `unit.start === undefined || unit.end === undefined` ? —— **结果大崩** ?：

```
完全一致 748 → 207    缺 1570 → 7941    漂 161 → 96    多 813 → 5950
```

? **`start` / `end` 不是「签没签」的标志** ?（普通单元在关完之后也一直是 `undefined` ?，
它们是**另一种**取位置的接口 ?）? 这道闸把几乎整趟都跳过了 ? **立即回滚** ?（读数已确认回到 748 ?）。

**一条工具坑记下** ?：回滚时**只** `git checkout` 了 `.xl.md` ?、忘了重跑 `xl build` ? ?
`dist` 里还是旧补丁 ? ? `tsc` 一直报 `TS2339` ?（`start` 不在 `Token` 上 ?）、
读数也一直是 207 ? —— **顺序必须是**：改 `.xl.md` → `xl build`（force ?）→ `tsc` → 量 ?；
回滚同理 ?（`.xl.md` 回去之后**必须再 force 构建一遍** ?）。

## 一百三十、第 520 轮：**「体没读全就先不收」也崩了**（748 → 723）—— 已回滚

按上一节的「另一条线」做的 ?：在 `LamdaReorganization.Process` 进门加一句
「`Statement.SearchStatementEnd(units, index) < 0`（这一段还没有语句结尾 ? 体还没读全 ?）就**什么都不做**」?
—— 想法是等父容器关完那一趟再收 ?。

**结果**：完全一致 748 → **723** ?、缺 1570 → **1739** ?、多 813 → **931** ?
（那条用例反而更差：缺 5 → 缺 7 ?）? **立即回滚** ?（`.xl.md` 回去 ? **并且重跑 `xl build` + `tsc`** ?，
读数已确认回到 **748** ?、工作树干净 ?）。

? **`SearchStatementEnd < 0` 是很多箭头的正常状态** ?（不是「还没读全」的标志 ?），
把它当闸会误伤一大片 ?。这一轮**把三条候选全试完了** ?：

| 试过的位置 | 结果 |
| --- | --- |
| `Process` 里 `SearchStatementEnd` 之后把 `[` 并进体 ? | 没效果（第 513 轮 ?） |
| `Process` 装配体之前并 `[` ? | 没效果（第 516 轮 ?） |
| `Process` 进门用 `SearchStatementEnd < 0` 早退 ? | **大崩**（第 520 轮 ?，已回滚 ?） |

**根子现在很清楚了** ?：那一刻 `units` 里**根本没有 `[1, 2, 3]`** ?（第 517 轮的栈照下来的就是
`[x, =>, x]` ?）? **在体范围的算法上做文章一律无效** ?；
要治的是「**这一趟被过早触发**」? —— 而「容器是否读完」这个信号，`start` / `end` ?（第 519 轮 ?）、
`SourceRange.Start` ?（第 518 轮 ?）、`SearchStatementEnd` ?（这一轮 ?）**三个候选都不是** ?。

**下一块**：换一条完全不同的路 ? —— 不去找「读完没读完」的信号 ?，
而是让**这一趟在解析期干脆不跑 `LamdaReorganization`** ?（把它从 `RunCloseRules` 里摘出来 ?、
挪到解析结束之后统一跑一遍 ? —— 那一趟的时机是确定的 ?、体一定已经读全 ?）。

### 补记（第 521 轮）：把 `Lamda` 从这一趟**摘掉**要付 27 个文件的账（748 → 721）

按上一节「换一条完全不同的路」先量了前一半 ?（`tmp/recon/r521-no-lamda.cjs` ?：
把 `RunCloseRules` 里那一行 `LamdaReorganization` 注掉 ?）：

```
完全一致 748 → 721    缺 1570 → 1755    漂 161（不变）    多 813 → 949    字段名 58 → 67
```

? **摘掉它是亏的** ?（?27 ?）—— 这条规则在解析期**造对了大多数箭头** ?，
只在一小撮「体后面还挂着东西」的形状上造早了 ?。
所以「挪到解析之后统一跑」的**正确形态**不是「摘掉」?，而是「**解析期跳过 + 解析完之后补跑一遍**」? ——
而补跑必须是**从 `Root` 往下递归整棵树** ?（嵌套的箭头在各级壳里 ?，
`Root` 那一趟的 `Data` 只看得到顶层壳 ?，不会自动往下走 ?）。

**下一块**（已量清依据 ?）：`RunCloseRules` 里让 `Lamda` **只在 `unit` 是 `Root` 时**跑一次 ?，
并且那一次是**递归遍历整棵树**（对每个单元的 `Data` 调 `LamdaReorganization.ApplyTo` ?、
再造出来的单元继续往下 ?）；其余规则一律不动 ?。预期：截断的那一撮不再发生 ?（因为那时体一定读全了 ?），
正确的那些照旧成形 ?。这一版若崩 ?，就按第 519 轮那条纪律**连同 `xl build` 一起回滚** ?。

### 补记（第 522 轮）：「解析期跳过 + 从 `Root` 递归补跑」也亏（748 → 739）—— 已回滚

按上一节的「下一块」实做了 ?（`typescript/parse-pipeline.xl.md` ?）：
`RunCloseRules` 里 `Lamda` 改成「只在 `unit` 是 `Root` 时跑」?，并新加静态方法 `RunLamdaTree` ?
（对每个单元的 `Data` 调 `ApplyTo` ?、再对子单元递归 ?）。

**结果**：完全一致 748 → **739** ?、缺 1570 → **1648** ?、多 813 → **826** ?
（那条用例仍然截断 ? —— 因为等到补跑时，`x[1, 2, 3]` 那一段**已经被别的规则吃掉了** ?：
语句壳 / `ArrayLiteral` 早就成形 ?，箭头还是接不上 ?）。
? **回滚** ?（源码回去 ? **并重跑 `xl build` + `tsc`** ?，读数已确认回到 **748** ?）。

**这一族的结论（第 513 / 516 / 520 / 521 / 522 五轮）** ?：
问题**不在**「体范围怎么算」?，也**不在**「把它挪后一点」? ——
而在**这一趟的触发时机**（子单元一关就触发 ?，那时后面的文本还没进 `units` ?）；
而「容器读完没读完」的四个候选信号（`SourceRange.Start` ?、`start/end` ?、
`SearchStatementEnd` ?、`Root` 之后再跑 ?）**全都不成立** ?。

**下一块**：换到**输入侧**想 —— 既然「体后面还挂着东西」这一刻无法判断 ?，
就让 `Lamda` 在**这一趟里只收那些「体后面确实什么都没有」的形状** ?：
即 `Previous` 里要求「`index` 之后的下一个单元**本身就是** `=>` 的目标且**再往后没有平级单元**」? ——
等价于「这一格就是这一层的最后一个实义单元」?（子单元关闭那一刻 ?，凡后面还有东西的一律留到下次 ?）。
这个判据是**结构性的** ?、不依赖任何时间戳 ?，值得一试 ?。

### 补记（第 523 轮）：**结构判据**也亏（748 → 744）—— 这一族的第六次也否了

按上一节那条「结构性判据」实做 ?（`tmp/recon/r523-lamda-tail.cjs` ?，宽松形态 ?）：
`Previous` 成立之后再看**紧跟着的那个平级单元** ? —— 只有「没有 / 软换行 / `;` `,` `)` `]` `}`」才算体已到头 ?，
凡后面还站着**实义内容**就先不收 ?。

**结果**：完全一致 748 → **744** ?、缺 1570 → 1594 ?、多 813 → 819 ? ? 撤掉 ?（源码不动 ?，build 已还原 ?）。

**这一族到此为止** ?（第 513 / 516 / 520 / 521 / 522 / 523 六次 ? 全部 ≤ 0 ?）：

| 试过 | 结果 |
| --- | --- |
| 体范围处补 `[`（两处） | 0 |
| `SearchStatementEnd < 0` 早退 | ?25 |
| 干脆摘掉 | ?27 |
| 解析后从 `Root` 递归补跑 | ?9 |
| **结构判据（这一轮）** | **?4** |

? 结论：截断那一小撮**不值得再投入** ? —— 它在 `多出来` 那 813 里只占很小一块 ?，
而每一轮尝试都要动一条**影响面很大**的规则（动辄 ?9 ~ ?27 ?）。
**转口径** ?（下面第 524 轮起）：去打**面更大、更局部**的那些账 ?
—— 第 511 轮已经定位过的「`Statement` 与 `TypeAssign` 各投一次 `TypeAliasDeclaration`」?、
以及 `PropertyAccessExpression` 多出 199 ? 这一类**投影侧**的账 ?。

## 一百三十一、`return …` 没有变成 `ReturnStatement`（第 524 轮）：一条面更大的账

转口径之后先挑了两个「私有字段」用例看 ?（它们都出现在旧的样本行里 ?）：

```
cls-private-fields.ts :  缺 4　多 7   MISS ReturnStatement[93,107) "return this.#x"
                                     MISS PropertyAccessExpression / ThisKeyword / PrivateIdentifier
                                     EXTRA ExpressionStatement + BinaryExpression（同一段）
cls-hash-in-operator.ts: 缺 5　多 5   MISS ReturnStatement[73,87) "return #x in o"
                                     MISS BinaryExpression / PrivateIdentifier / InKeyword / Identifier
                                     EXTRA ExpressionStatement（同一段）
```

? 两例是**同一族** ?：`return …` 整段被投成 `ExpressionStatement`（外加一层 `BinaryExpression`）?，
而正解是一条 `ReturnStatement` ?。也就是说**语句壳认出了这一段、却没有按 `return` 归类** ? ——
这比箭头那一族**面大得多** ?（`ReturnStatement` 在缺的 115 类里、在 `多出来的 813` 里都占一块 ?），
而且切口**很局部** ?：要么在 `Statement` 的归类（`print-ast-common.xl.md` 里按首词分发的那处 ?），
要么在 `return` 被 `KeywordReorganization` 升级之后**认不出**了 ?（与 `do` / `while` / `in` 那几次同一个坑 ?）。

**下一块**：先量 `Statement.AttachKind`（或投影里那处按首词分发的代码 ?）对 `return` 的处理 ? ——
判据是**文本**（`WordOf` ?，`Identifier` / `Keyword` 都认 ?）还是 `instanceof Identifier` ?；
后者就是那一族的老坑 ?，改完对**两档都有益** ?。

**补记（同一轮，落点已找到）** ?：投影里其实**有**这张映射 ? ——
`print-ast-common.xl.md:1524` 写着 `["return", "ReturnStatement"]` ?，
`:1532` 还有 `KEYWORD_STATEMENT_EXPRESSION = new Set(["ReturnStatement", "ThrowStatement"])` ?。
所以问题不是「没登记」?，而是**取词那一步没认出它** ? ——
十有八九又是那一族老坑 ?：`return` 被 `KeywordReorganization` 升成了 `Keyword` ?，
而查这张表的那一步只认 `Identifier` ?（`do` / `while` / `in` / `of` 都栽过同一处 ?，
台账里第 500 轮那次加固写的就是这条纪律 ?：找词一律走 `WordOf` / `IsWordUnit` ?，
两种形态都认 ?）。**下一块直接去那一处取词的地方改** ? —— 面大、局部、两档都有益 ?。

**再补一句（同一轮的第二次定位）** ?：那张表**用得上**的前提是 `head` 就是那个 `Keyword` ? ——
而这两例的 `EXTRA` 是 **`ExpressionStatement` + `BinaryExpression` 盖住整段** ?
? 说明 `head` 已经不是 `return` 了 ?，而是**被折进去的表达式** ?
（`return #x in o` 里 `#x` 是**私有标识符** ?，`return this.#x` 里是 `this.#x` ? ——
两例都带 `#` ?，十有八九是「`#x` 这种单元在 `IsOperand` 眼里不算操作数 / 或反过来算得太宽」?
? `return` 与后面的东西被折成了同一个二元单元 ? ? 查表那一步连门都进不去 ?）。

**下一块**：量 `binary-operator.xl.md` 的 `IsOperand` 对 **`#x`（私有标识符）** 的态度 ?
（`return #x in o` 里 `return` 是**受限关键字** ?、`#x` 是操作数 ?、`in` 是二元运算符 ? ——
正解是 `ReturnStatement > BinaryExpression(#x in o)` ?）；
顺带核对 `print-ast-common` 里查表用的是 `textOfNode`（读的是**投影后节点**的 `value`/`range` ?，
不是 `WordOf` ?）——**这一处也该换成按词取文本** ?（`WordOf` 的口径 ?，第 500 轮那条纪律 ?）。

### 补记（第 526 轮）：把原树 dump 出来，真相与猜测**不一样** ?

`cls-hash-in-operator.ts` 那一段的原树（`tmp/recon/tree.cjs` ?）：

```
Statement [73,87)
  Identifier [73,79) t=["r","e","t","u","r","n"]     ← `return` 还是 Identifier（没升级 ?）
  SymbolToken [80,81) t=["#"]                        ← `#` 与名字**没有合成一个单元** ?
  Identifier [81,82) t=["x"]
  Identifier [83,85) t=["i","n"]                     ← `in` 也没有被升级 ?
  Identifier [86,87) t=["o"]
```

? **整段是平的** ?：`return` 没升级 ?、`#x` 没合成 ?、`in` 没折 ? ——
也就是说「`head` 被折进去了」那个猜测**不成立** ?；真正缺的是**两件事** ?：

1. **私有名 `#x` 没有合成成一个单元** ? —— 投影那一侧是**自己合成**的 ?
   （`print-ast-common.xl.md:1972` / `:1991` ?，那边还专门写了「合一个 `PrivateIdentifier` 之后，
   后面的运算符与操作数照常折 ?」「不拆的话整个 `x in o` 会被当成名字 ?」?），
   可**产物那一侧从来没有合成过** ? ? 二元那一趟看到的是 `#` 与 `x` 两个单元 ? ? 折不起来 ?；
2. **`in` 是二元运算符** ?，但它在产物里还是 `Identifier` ?、且因为左边不是操作数而没折 ?
   —— 与 `in` / `of` 当年「**故意不升级**」那条纪律有关 ?（`parse-pipeline` 的 `KeyWords` ?），
   所以折它必须靠**按词找**（`IsWordUnit` ?），而这一趟显然没找到 ?。

**下一块**：先查「解析期谁负责把 `#` 与名字合成私有名」?（全仓搜下来 ?
`PrivateIdentifier` 只出现在**投影**里 ? ? **规则侧压根没有这一条** ?）——
这解释了 `PrivateIdentifier` / `PropertyAccessExpression` 两栏的缺口 ?；
做法照老规矩 ?：在 `RunCloseRules` 里加一条「`#` + 名字 ? 合成私有名单元」的规则 ?
（位置放在 `PropertyAccess` 之前 ?），量尺子 ?。

### 补记（第 527 轮）：先把这一笔账**量了个大小** ? —— 私有名只有 11 份文件

```
语料 1046 份，含私有名 `#name` 的 11 份
cls-hash-in-operator.ts / cls-method-not-call.ts / cls-private-fields.ts /
decl-class-private-field-in-operator.ts / decl-class-private-field.ts / decl-class-private-method.ts …
```

? 「补一条私有名合并规则」这一笔账**是小的** ?（≤ 11 份文件 ?，占 1037 的 1% ?）——
它值得做 ?（局部、清晰 ?），但**不该当成主战场** ?。
同一份报告里真正的大头仍在同一片区域 ?：`PropertyAccessExpression` 缺 199 ?、
`ReturnStatement` 缺 101 ＋ 漂 71 ? —— 私有名只解释其中一部分 ?。

**下一块（按大小排序）** ?：
① `ReturnStatement` 那一族（101 + 71 ?）—— 但注意：第 526 轮已经证明**不是**「取词认不出」?，
而是**产物侧根本没成形** ?（`return` 没升级 ?、整段是平的 ?）? 要查的是
「**语句壳有没有把 `return` 这一段交出去**」?（`Statement` 的归类那一步 ?）；
② 私有名合并（≤ 11 份 ?，清晰、局部 ?，等有余量就做 ?）。

## 一百三十二、`textOf` 换 `textOfNode` 也亏（第 528 轮）：748 → 725，已回滚

顺着「按词取文本要两种口径都试」的想法 ?，把查表那一句从 `textOfNode(head, ctx)` ?
换成 `textOf(head, ctx)` ?（后者在 `value` 缺失时**回落到源码切片** ?，看起来更稳 ?）：

**结果**：完全一致 748 → **725** ?、缺 1570 → **1671** ?、多 813 → **888** ?
? **回滚** ?（源码回去 ? **并重跑 `xl build` + `tsc`** ?，读数已确认回到 **748** ?）。

? 说明 `textOfNode` 那一份**本来就是对的** ?（`KEYWORD_STATEMENT_KINDS` 也确实在正常命中 ? ——
`ReturnStatement` 那一栏 101 缺里有相当一部分是**别的形状** ?）；
`return #x in o` 那两例的真正障碍**仍是**第 526 轮 dump 出来的那条 ?：
**私有名在产物侧从没合成过** ?（`#` 与名字两个单元 ? ? 折不起来 ? ? 那一整段退化成平铺 ?）。

**这也把「私有名」那笔账的重要性抬回来了** ?：它虽然只涉及 **11 份文件** ?，
但每份都会连带 `ReturnStatement` / `PropertyAccessExpression` / `BinaryExpression` /
`PrivateIdentifier` 四五栏一起缺 ? —— 是**一鱼多吃**的那一类 ?。
**下一块**（就做它 ?）：在 `RunCloseRules` 里加一条私有名合并规则 ?
（`SymbolToken("#")` + 名字 ? 一个文本为 `#name` 的单元 ?，位置在 `PropertyAccess` 之前 ?），
拿那 11 份当靶子量 ? —— 做法与第 490–497 轮搬规则时一模一样 ?。

## 一百三十三、私有名合并：两条实现路线，选**投影侧**那一侧（第 529 轮，设计定稿）

目标很小也很清楚 ?：让产物里出现**一个**文本为 `#name` 的单元 / 节点 ?
（`print-ast-common.xl.md:652` 的 `leafKindOfText` 一看到文本以 `#` 开头就投 `PrivateIdentifier` ?）。

两条路线 ?：

| 路线 | 做法 | 风险 |
| --- | --- | --- |
| ① 规则侧 | 在 `RunCloseRules` 里把 `SymbolToken("#")` + 名字换成一个单元 ? | **要新造一种单元**（文本 `#name` ?）——哪一族能装下这个文本没有把握 ?（`SymbolToken` 的内容是符号表 ?、`Identifier` 是字母 ?），造错的代价是一大片文件 ? |
| ② **投影侧** ? | 在投影里**先把平铺的孩子归一化** ?：遇到「`SymbolToken(#)` + `Identifier`/`Keyword`」这一对 ?，就按 :1974 那段**现成的**合成逻辑 ? 先合出一个 `PrivateIdentifier` 节点 ?，再走原来的语句/表达式投影 ? | **小** ?：只碰一列孩子 ?、复用已有代码 ?、不动单元类型 ? |

**选 ②** ? —— 理由三条 ?：
1. :1974 那段逻辑**已经在仓库里** ?（含 `foldBinaryFrom` 之后的收尾 ?），只是**入口没走到** ?
   （它要求 `kids[0]` 就是 `#` ?，而实际列表是 `[return, #, x, in, o]` ?）；
2. 不动产物结构 ? ? 不会像前几轮那样动辄 ?9 ~ ?27 ?；
3. 那 11 份文件是**一鱼多吃** ?（一份同时补 `ReturnStatement` / `PrivateIdentifier` /
   `PropertyAccessExpression` / `BinaryExpression` ?）。

**下一块（实现）** ?：在投影把平铺孩子送进语句/表达式那一步之前 ?，
加一个「**归一化私有名**」的小步骤 ?（扫一遍 `kids` ?，把 `#` + 名字对替换成合成的 `PrivateIdentifier` 节点 ?），
然后拿那 11 份当靶子 ?（`cls-hash-in-operator.ts` / `cls-private-fields.ts` / … ?），
再跑整份尺子 ?；坏了连同 `xl build` 一起回滚 ?。
## 一百三十四、软换行那一支造的语句壳**从来没跑过关闭前那一趟**（第 531 轮）：748 → **819 / 1037**

**起点**：第 528 轮回滚之后读数停在 **748 / 1037** ✓（缺 1570 / 漂 161 / 多 813 / 字段名 58 ✓、
解析 1037 / 抛异常 0 ✓）。第 529 轮定稿了「私有名在投影侧归一化」那条路 ✓，本轮先做**清点** ✓。

### 一、先把「哪一类缺口影响多少份文件」量出来（新工具）

尺子报的是「每一类缺多少个」✓，可**重建的次序**要的是另一个数 ✓：**补上这一类能让几份文件变绿** ✗。
新写 `tmp/recon/cls.cjs` ✓（走 `build/ts` 的同一份投影、同一张归一表 ✓），
第一次就撞出**两把尺子的口径差** ✗ —— 它当时报「清点 1046 份、完全一致 **0** 份」✗，
而尺子报的是「1037 份、748 份」✓。三处原因，一处一个坑 ✓：

| 坑 | 症状 | 修法 |
| --- | --- | --- |
| **语料口径** | 1046 份 vs 尺子的 1037 份 ✗ | 尺子走 `listCases()` ✓，剔掉 `// xl:ts-invalid` 那 9 份与 `.tsx` ✓ —— 清点也要剔 ✓ |
| **TS 枚举别名** | `VariableStatement` 被拆成 `FirstStatement` + `VariableStatement` 两栏 ✗（`NumericLiteral` / `FirstLiteralToken` 同理 ✗） | 抄尺子的 `TS_KIND_ALIASES` ✓（`tmp/recon/kind-aliases.cjs` ✓）——**这张表两份必然漂** ✗，已在文件头写明「以 `ts-ast.mjs` 为准」✓ |
| **标点算成「多出来」** | 每个 `#` / `,` 都记一笔 ✗ | 与尺子的 `if (node.kind === null) continue;` 对齐 ✓：只认首字符是字母 / `_` / `$` 的 kind ✓ |

修完两边都是 **748 / 1037** ✓ —— 清点的数从此可当准绳 ✓。

### 二、清点结果：头一号是 `Identifier` 141 份，第二名是**声明层**

```
缺（按影响份数）：Identifier 141  VariableDeclaration 53  VariableDeclarationList 52
                  VariableStatement 39  TypeAliasDeclaration 34  NumericLiteral 34
                  ExpressionStatement 32  BindingElement 23  BinaryExpression 23  CallExpression 23
                  BreakStatement 22  StringLiteral 20  Block 20  LabeledStatement 19 …
多出来（按影响份数）：ExpressionStatement 79  Identifier 62  TypeAliasDeclaration 34
                  BinaryExpression 34  ExportDeclaration 28  EqualsToken 26  LabeledStatement 22 …
```

**声明层那一簇（`VariableDeclaration` / `List` / `Statement` / `BindingElement` 四栏，
53 / 52 / 39 / 23 份 ✓）指向同一族文件** ✓：`decl-arr-destructure-*` / `decl-binding-*` /
`vars-destructure-*` ✓ —— 解构那一族 ✓。**下一块候选就是它** ✓。

### 三、顺手挖到的一处：语句壳有一条支路没跑关闭前那一趟

按清点去 dump `cls-hash-in-operator.ts` 的现场 ✓（新写 `tmp/recon/tree2.cjs` ✓：
带 `visited` 去重、按区间排序、把每个单元的 `Value` / `Temp` 一起打出来 ✓），看到的是：

```
Statement [73,87)
  Identifier [73,79) t="return"      ← 关键字没升上来 ✗
  SymbolToken [80,81) t="#"
  Identifier [81,82) t="x"
  Identifier [83,85) t="in"
  Identifier [86,87) t="o"
```

第 526 轮把这一处记成「私有名没合成」✓，本轮把**上半截**挖通了 ✓：
`return` 压根不该还是 `Identifier` ✗ —— 它早该在语句壳关闭时升成 `Keyword` ✓。

**为什么没升** ✗：语句壳有**两条**造法 ✓ ——

| 造法 | 时机 | 关一次？ |
| --- | --- | --- |
| `Statement.FormFrom`（`;` 那一档 ✓，由 `Token.FormStatement` 钩子调 ✓） | 终结符**进 `Data` 之后** ✓ | **有** ✓（第 487 轮就写了 `statement.TryToClose()` ✓） |
| `StatementBranch.Success`（**软换行**那一档 ✓） | 换行**进 `Data` 之前** ✓ | **没有** ✗ |

而 `}` **不是**语句符号 ✓（`SymbolTemplate.IsStatementSymbol("}")` 答 `false` ✓，
实测 ✓）⇒ **块里最后一条语句**只会走软换行那一支 ✓ ⇒ 它是**唯一**没跑过 `ApplyCloseRules` 的语句壳 ✓。
`return #x in o` 正是这一档 ✓（`MethodBody` 里唯一一条语句 ✓、后面没有 `;` ✓）。

**修法一处**（`typescript/tokens/statement.xl.md` 的 `StatementBranch.Success` 末尾 ✓）：

```ts
ReplaceCountAt(data, frontIndex + 1, index - frontIndex, statement);
statement.TryToClose();
```

### 四、读数

| 项 | 第 528 轮（起点） | 本轮 |
| --- | --- | --- |
| **完全一致** | 748 | **819 / 1037** ✓（+71 ✓） |
| 缺节点 | 1570（115 类） | **1335**（108 类）✓ |
| 区间漂移 | 161 | **161** ✓（持平 ✓） |
| 多出来的节点 | 813（46 类） | **602**（46 类）✓ |
| 字段名不符 | 58 | **56** ✓ |
| 未映射 / 缺 range / 越界 | 1 类 5 处 / 0 / 0 | **1 类 3 处 / 0 / 0** ✓ |
| 解析成功 / 抛异常 | 1037 / 0 | **1037 / 0** ✓ |
| 产物节点 / TS 语义节点 | 24784 / 17317 | **24909 / 17317** ✓ |

**缺那一栏的降幅（1570 → 1335 ✓）里，`ReturnStatement` 那一类从 63 份掉到……** ✓
—— 清点里 `ReturnStatement` 已经**掉出前 20** ✓（`BreakStatement` 22 份是同一族的下一档 ✓，
`throw` / `break` / `continue` / `debugger` 都在同一支里 ✓，下一轮顺手量 ✓）。

### 五、一条工具坑（这次踩到的）

**改 `.xl.md` 之后 `xl build` 必须走插件入口** ✗：仓库里没有 `xl` 可执行文件 ✓，
`node <xl-clone>/cli.js build` **退出码 0 但什么都不做** ✗（它只是插件入口的再导出 ✓）——
本轮实测：改了源码、跑了两遍那个命令、`dist/ts/typescript/tokens/statement.ts` 的 mtime
**一直是提交时的 19:20:34** ✗，尺子读数也一直是 748 ✗，白折腾了十几分钟 ✓。
**正解**：`xl_build` 工具（`cwd: C:\Users\Admin\Documents\GitHub\xl-example` ✓）→ 再 `tsc` ✓。

**另一条**：`read` 工具要求严格 UTF-8 ✓，而 `docs/member-layer-plan.md` 是**两段编码拼起来的** ✗
（头部 UTF-8 ✓、第 503 轮之后那段是 GBK ✗，`invalidBytes` 11044 ✓）——
本轮一并修好了 ✓（见上一个提交 ✓），从此每轮都能直接读它 ✓。

### 六、下一块

按清点，**声明层那一簇**（`VariableDeclaration` 53 / `List` 52 / `Statement` 39 /
`BindingElement` 23 ✓，集中在 `decl-arr-destructure-*` / `decl-binding-*` / `vars-destructure-*` ✓）
是现在最大的一块 ✓。先 dump 一份 `decl-arr-destructure-defaults.ts` 的三方对照 ✓
（新工具 `tmp/recon/tri.cjs` ✓：产物原始树 / 投影后的 AST / `ts.createSourceFile` ✓，
按区间排序 ✓），看解构那一段在产物里到底长成什么形状 ✓，再决定闸下在解析期还是投影侧 ✓。
## 一百三十五、解构那一族：两处都试了、都没动读数（第 532 轮，负面，已回滚）

起点 **819 / 1037** ✓（第 531 轮 ✓）。按第 531 轮的清点，挑了**声明层那一簇** ✓：
`VariableDeclaration` 53 份 ✓、`VariableDeclarationList` 52 份 ✓、`VariableStatement` 39 份 ✓、
`BindingElement` 23 份 ✓ —— 全集中在 `decl-arr-destructure-*` / `decl-binding-*` /
`vars-destructure-*` 那几族 ✓。

### 现场（`decl-arr-destructure-defaults.ts`，`const [a = 1, b = a] = [] as number[]`）

`tmp/recon/tree2.cjs` 打出来是这样 ✓：

```
Statement [42,79)
  Identifier [42,47) t="const"        ← 还是 Identifier ✗（第 531 轮之前）
  Bracket    [48,62)                  ← 解构模式，还是一对光括号 ✗
    Identifier[a] SymbolToken[=] Identifier[1] SymbolToken[,] Identifier[b] SymbolToken[=] Identifier[a]
  SymbolToken [63,64) t="="           ← 与 `const` 平级 ✓
  ArrayLiteral [65,67)                ← 右边那个 `[]` 才是数组字面量 ✓
  As [68,79)
```

⇒ 投影侧**早就认识**这个形状 ✓（`print-ast-common.xl.md:4100` 那一段注释写着
「解构声明的名字用产物自己的那个 `ArrayLiteral` / `ObjectLiteral`」✓，
`projectLetFrom` 会在 `=` 左边找模式单元 ✓），**缺的只有那个 `Let` 单元本身** ✗ ——
`const` 与 `[a = 1, b = a]` 现在是两条平级的东西 ✓，整条声明落进通用语句支 ✓。

### 试了一：`PropertyAccess` 的链底不许是 `let` / `const` / `var`

`property-access.xl.md` 的 `IsChainBase` 那串排除名单里加三个词 ✓
（`let.x` / `const[0]` 在 JS 里本来就是语法错 ✓，所以这一条**没有副作用** ✓）。

**效果：方向对、读数不动** ✗ —— 产物结构确实变好了 ✓：

| 项 | 起点 | 这一版 |
| --- | --- | --- |
| **完全一致** | 819 | **819** ✗（没动 ✗） |
| 缺节点 | 1335 | **1374** ✗（反而多了 39 ✗） |
| 多出来的节点 | 602 | **526** ✓（少了 76 ✓） |
| 产物节点 | 24909 | 24793 ✓ |

`const` 那一格从此是 `Keyword` ✓（第 531 轮那次 `TryToClose` 生效 ✓）、
`[a = 1, b = a]` 也不再被链吞掉 ✓ —— 但 `Let` 还是没成形 ✗。

### 试了二：让 `LetBranch` 收解构模式（两处分支都放宽）

`let.xl.md`：`Condition` / `Success` 的名字那一格接受 `ArrayLiteral` / `ObjectLiteral` ✓，
关键词那一格接受 `Keyword` ✓（新增 `WordOf` 一处答案 ✓：`Identifier` 的文本在 `Temp` 上、
`Keyword` 的在 `Value` 上 ✓）。**读数一个数字都没动** ✗（819 / 1374 / 526 / 56 ✓，与试一逐项相同 ✓）。

⇒ 按纪律**两处都回滚** ✓（源码 `git checkout` ✓ **并重跑 `xl build` + `tsc`** ✓，
读数已确认回到 819 / 1335 / 161 / 602 / 56 ✓）。

### 查到的真因（下一轮的入口）

在 `LetBranch.Condition` 里打点（`tmp/recon/probe-letbranch.cjs` ✓）看到：
`=` 那一格**确实进来了** ✓，而且那时列表末尾就是「`Identifier(const)` + `Bracket`」✓
（**不是** `ArrayLiteral` ✗ —— 解构那个方括号在解析期**根本没被 `JsonArrayReorganization` 收** ✗，
因为它的前一个单元是 `Identifier(const)` ✓，而 `IsArrayAt` 的判据写着
「上一个实义单元是 `Identifier` 且**不属于** `return` / `typeof` / `of` / `in` ⇒ 不是数组」✓
⇒ 下标访问的判据把声明位也一并挡住了 ✓）。

于是 `Condition` 走到「名字那一格既不是 `Identifier`、也不是 `ArrayLiteral`」那一句 ✓ ⇒ 判否 ✓
⇒ `Success` 一次都没跑 ✓（同一个探针里 `SUCCESS-ENTER` 一行都没有 ✓）。
**下一轮的开场**：先把 `LetBranch.Condition` 的**每一条早退**分别打点 ✓
（`tmp/recon/probe-letbranch.cjs` 那种做法 ✓），确认 `Bracket` 那一支到底走的是哪一句 ✓ ——
两处放宽既然没生效 ✓，说明问题在**更前面**（进没进 `Condition` 的那一支、
或者 `result.Success` 被谁改回去了 ✗）。

### 工具：本轮补齐的五件（都在 `tmp/`，不进仓）

台账这一层的规矩是「临时脚本不进仓」✓（`.gitignore` 里的 `tmp/` ✓），
所以这里只记**名字与用途** ✓ —— 下轮直接用 ✓：

| 工具 | 用途 |
| --- | --- |
| `tmp/recon/cls.cjs` | **清点**：与尺子同一口径 ✓，按「影响多少份文件」排缺口 ✓（重建次序就照它 ✓） |
| `tmp/recon/tri.cjs` | **三方对照**：产物原始树 / 投影后的 AST / `ts.createSourceFile` ✓，按区间排序 ✓ |
| `tmp/recon/tree2.cjs` | 产物原始树（带 `visited` 去重 ✓、把 `Value` / `Temp` 一起打出来 ✓） |
| `tmp/recon/pair.cjs` | 一份文件的**逐节点**对拍（MISS / EXTRA 两栏 ✓、投影全量列表 ✓） |
| `tmp/recon/kind-aliases.cjs` | TS 枚举别名表的抄本 ✓（**以 `tests/parse/ts-ast.mjs` 为准** ✓） |

**两条工具坑**（第 531 轮踩的，这里再记一句）✓：
`xl build` 只能走 `xl_build` 插件入口 ✓（仓库里那个 `cli.js` 退出码 0 却不做事 ✗）；
改完 `.xl.md` 一定要**重跑 `xl build` + `tsc`** ✓，只改源码不重建 ⇒ 读数骗人 ✗。

### 另记一笔（仓库状态）

第 531 轮开始时工作区有一处**没提交的删除** ✓：`dawn/text/tokens/function/method-declaration.xl.md`
（第 503 轮那阵子留下的 ✓，HEAD 里已经没有这个文件 ✓，磁盘上那一份是残留 ✗）。
已经在第 531 轮的收尾里清掉 ✓（`git rm --cached` + 删文件 ✓），工作区从此干净 ✓。
## 一百三十六、解构那一段的模式在**括号刚关完时还是 `Bracket`**（第 533 轮）：819 → **835 / 1037**

起点 **819 / 1037** ✓（第 531 轮 ✓）。第 532 轮试过两处都白试 ✓，这一轮把那两处**一起**装上 ✓，
并在同一个回合里把最后一道闸找出来了 ✓。

### 一、真因：模式括号的**身份**与「谁收里面的元素」

调查用的是入口探针（`tmp/recon/probe-letbranch5.cjs` / `probe-letbranch6.cjs` ✓
—— 在 `LetBranch.Condition` 进门处打「`source.Value` / 宿主 / 末尾几格」✓，
再在 `nameUnit` 判定那一格把 `constructor.name` 打出来 ✓）：

```
LB7DBG v="," ni=2 name=Identifier  kw=SymbolToken:=      ← 括号内那两个 `=` 不是进门条件
LB7DBG v="=" ni=4 name=Identifier  kw=SymbolToken:,
LB7DBG v="=" ni=2 name=Bracket     kw=Identifier:const   ← 声明位上这个 `=` 才是
```

⇒ **`LetBranch` 问这一格时，解构括号还是 `Bracket`** ✗（不是 `ArrayLiteral` ✗）——
第 532 轮照搬了**重组那一趟**看到的名字 ✓（那一趟看到的是 `ArrayLiteral` ✓），
所以 `instanceof ArrayLiteral` 永远为假 ✗。**这一刻的判据要照 `LetReorganization.Previous`
写**：`Identifier`，或者 `Is("[", "]")` / `Is("{", "}")` 的 `Bracket` ✓。

**三处一起才成立** ✓（缺一处都不动读数 ✓）：

| # | 文件 | 改什么 | 为什么必须有 |
| --- | --- | --- | --- |
| 1 | `typescript/tokens/property-access.xl.md` | `IsChainBase` 的排除名单加 `let` / `const` / `var` | 不加的话 `const [a = 1, b = a]` 被折成一个 `PropertyAccess` ✗，声明形状全变 ✗ |
| 2 | `typescript/tokens/json/array-literal.xl.md` | `IsArrayAt` 的豁免名单加 `let` / `const` / `var` / `using` | 不加的话那个 `[` 被当成**下标访问** ✓ ⇒ 永远成不了 `ArrayLiteral` ✗（第 532 轮就是卡在这 ✗） |
| 3 | `typescript/tokens/let.xl.md` | `Condition` / `Success` 收 `Bracket` 形态的模式 ✓、新增 `WordOf` ✓、模式搬进 `Let` ✓、末尾在 `Let` 上再跑一遍 `ApplyCloseRules` ✓ | 见下 |

### 二、第三步里那两处「非它不可」的细节

- **`WordOf`**（`Condition` 与 `Success` 共用一份 ✓）：`Identifier` 的文本在 `Temp` 上 ✓、
  `Keyword` 的在 `Value` 上 ✓ —— 第 531 轮之后 `const` **已经升成 `Keyword`** ✓，
  只认 `Identifier` 会让整条 `Condition` 判否 ✗（这是第 532 轮「试二」白试的第二个原因 ✗）。
- **末尾再跑一遍 `Token.Former.ApplyCloseRules(letUnit)`** ✓：把 `[a = 1, b = a]` 的元素收成
  `BindingElement` 的是 `binding-element.xl.md` ✓，它的**宿主判据是「父亲是 `Let`」** ✓ ——
  括号搬进 `Let` **之后**要在 `Let` 自己那一层再跑一遍 ✓（`TryToClose` 在上面已经调过 ✗，
  那一次跑的时候括号还没挂进来 ✓）。**少了这一句的读数**：完全一致仍然 819 ✗、
  而 `ArrayBindingPattern` 的字段名差从 56 涨到 **84** ✗ —— 就是这一句把它压回去 ✓。

### 三、读数

| 项 | 第 531 轮（起点） | 本轮 |
| --- | --- | --- |
| **完全一致** | 819 | **835 / 1037** ✓（+16 ✓） |
| 缺节点 | 1335（108 类） | **1076**（104 类）✓（−259 ✓） |
| 多出来的节点 | 602（46 类） | **416**（44 类）✓（−186 ✓） |
| 区间漂移 | 161（19 类） | **159**（18 类）✓ |
| 字段名不符 | 56 | **56** ✓（持平 ✓） |
| 未映射 / 缺 range / 越界 | 1 类 3 处 / 0 / 0 | 1 类 3 处 / 0 / 0 ✓ |
| 解析成功 / 抛异常 | 1037 / 0 | **1037 / 0** ✓ |

`decl-arr-destructure-defaults.ts` 从「缺 7 / 多 1」变成**四个方向全零** ✓
（`ArrayBindingPattern` + 两个 `BindingElement` + 里面四个名字全对上了 ✓）。

**声明层那一簇整体退潮** ✓（清点：`VariableDeclaration` 53 → **34** 份 ✓、
`List` 52 → **33** ✓、`Statement` 39 → **19** ✓、`BindingElement` 23 → **掉出前 14** ✓）。
新的头几名是：`Identifier` 131 份 ✓、`TypeAliasDeclaration` 34 份 ✓、
`VariableDeclaration` 34 份（换成了 `decl-await-using-basic` / `decl-label-break-continue` 那一族 ✓）、
`BreakStatement` 22 份 ✓、`LabeledStatement` 19 份 ✓。

### 四、工具坑（这个回合踩得最深的一个）

**`xl_build` 会按指纹跳过重建，而 `git checkout` 回去的 `.xl.md` 看起来「没变」** ✗ ——
本轮实测：回滚 `let.xl.md` 之后 `dist/ts/typescript/tokens/let.ts` 的 mtime
**停在回滚之前那一刻** ✓（`19:47:56` ✓，而源码是 `19:48:34` ✓），
于是尺子一直在量**旧读数** ✗（1256 / 416 / 84 ✓ 那一组 ✓），白折腾两轮 ✓。
**正解**：改过源码之后**带 `force: true` 重建那几个文件** ✓，重建完再核一下
`dist` 里那句新注释在不在 ✓（本轮就是这么确认的 ✓）。

### 五、下一块

按清点，下一个大头是 **`Identifier` 131 份** ✓（散在 `am-declare-module-css` /
`am-export-equals-namespace` 那一族 ✓），以及**标签那一族** ✓
（`BreakStatement` 22 份 + `LabeledStatement` 19 份 + `Block` 20 份 + `CallExpression` 23 份 ✓，
集中在 `decl-label-break-continue` / `decl-label-block` / `stmt-nested-loops-label` ✓）——
后者是**一鱼多吃**（同一个标签形状连着四五栏一起缺 ✓），下轮先 dump 它 ✓。
## 一百三十七、`export = X` / `export default X`：`Export` 单元**自己就是一格**（第 534 轮）：835 → **850 / 1037**

起点 **835 / 1037** ✓（第 533 轮 ✓）。本轮从清点里掉出来的 `ExportAssignment` / `NamedExports` /
`ExportSpecifier` 那一族入手 ✓（`am-declare-module-css.ts` / `am-export-equals-namespace.ts` ✓），
顺手把「去查 `export default c` 为什么投成 `ExportDeclaration`」这一路上碰到的东西记下来 ✓。

### 一、现场与坑

`am-declare-module-css.ts` 的差是**一对**：

```
MISS   ExportAssignment  TS[71,87)  "export default c"
MISS   Identifier        TS[86,87)  "c"
EXTRA  ExportDeclaration         [71,85)  "export default"
```

投影侧的 `projectExport`（`print-ast-common.xl.md`）本来就有「`export = X` / `export default X`
⇒ `ExportAssignment` + `expression`」那一条 ✓，可它没命中 ✗。运行时探针
（`tmp/recon/probe-projectexport.cjs` ✓，在 `projectExport` 进门与 `isAssignment` 之后各打一行 ✓）：

```
PE1DBG enter following=1
PE1DBG isAssignment=false rest=Export:export default
```

⇒ **`rest` 里那一格是 `Export`，文本是 `"export default"`** ✓，不是「一个 `Keyword(default)`」✗ ——
原来那句判据（`rest.some(k => k.get("type") === "Keyword" && textOfNode(k) === "default")`）
于是**永远为假** ✗ ⇒ 整条落到最后的 `ExportDeclaration` ✗。

**为什么是「一整格」** ✓：关掉 reorg 之后这一支走的是解析期那条路 ✓ ——
`export.xl.md` 的构造函数那一段自己写着「`export =` / `export default` 改成**只收前缀两个词**，
表达式留在外面照常成形」✓，所以 `Export` 的文本就是 `"export default"` / `"export ="` ✓
（`export { a }` 那一族的 `Export` 本来就是这样 ✓）。

**修法**（`typescript/print-ast-common.xl.md` 的 `projectExport` ✓）：判据从「这一格是不是
`Keyword`」换成「**这一格的文本尾部是不是 `default` / `=`**」✓ —— 两种形状（一整格 `Export` ✓、
两个 `Keyword` ✓）都认 ✓，而判的仍是「这是不是赋值式导出」这件事 ✓。

### 二、读数

| 项 | 第 533 轮（起点） | 本轮 |
| --- | --- | --- |
| **完全一致** | 835 | **850 / 1037** ✓（+15 ✓） |
| 缺节点 | 1076（104 类） | **1037**（102 类）✓（−39 ✓） |
| 多出来的节点 | 416（44 类） | **400**（44 类）✓（−16 ✓） |
| 区间漂移 | 159 | **159** ✓（持平 ✓） |
| 字段名不符 | 56 | **56** ✓（持平 ✓） |
| 解析成功 / 抛异常 | 1037 / 0 | **1037 / 0** ✓ |

`am-declare-module-css.ts` 从「缺 2 / 多 1」变成**四个方向全零** ✓。

### 三、另记一笔：一个**空 `Statement`** 挡着 `export default c` 的壳

同一个文件里还有一处值钱的现场 ✓（`tmp/recon/probe-stmtform2.cjs` ✓：在
`StatementBranch.Condition` 的软换行那一格把 `Data` 逐格打出来 ✓）：

```
SF2DBG IN#22 owner=Bracket []                                     ← 体括号刚开
SF2DBG IN#40 owner=Bracket [Let(const) SymbolToken(:) Identifier(string)]   ← `const c: string` 成形
SF2DBG EXIT#40                                                    ← 它这一格正确地不收
SF2DBG IN#59 owner=Bracket [Statement() Identifier(export) Identifier(default) Identifier(c)]
SF2DBG EXIT#59                                                    ← 这里本该收 `export default c`，却收了手
```

⇒ 那一刻 `Bracket` 的 `Data` 是 `[Statement(**空**), export, default, c]` ✓ ——
**头一格是一个空的 `Statement`** ✗（打印出来 `Statement()` ✓，既没有 `Value` 也没有 `Temp` ✓）。
后面三条 `Identifier` 才是 `export default c` ✓。下一轮的第一件事就是查那个空 `Statement`
是谁造的 ✓（`ReplaceCountAt` 造壳之后被别处掏空 ✓？还是 `Success` 里 `children` 取空之后仍建了壳 ✓？）
—— 它一天不除，「上一句是 `const c: string`」这一类的壳就都得看它脸色 ✓。

**一条工具教训** ✓：这一轮的探针里有用 `lastIndexOf("Condition(...)")` / `lastIndexOf("letUnit.TryToClose()")`
定位的 ✓，而 `statement.js` 与 `let.js` 里各有**好几处**同名成员 ✗ ⇒ 探针插错过两回
（一回插进 `LetReorganization.Process` ✓、一回插进错误的类 ✓）⇒ 一律改成
「先列出全部匹配、再取**最后一个**」✓，并且**探针插完要回读一行**确认落点 ✓。

### 四、下一块

清点里 `Identifier` 仍是头一名 ✓（118 份 ✓，`am-object-vs-block.ts` / `cls-hash-in-operator.ts` ✓），
紧跟的是 `TypeAliasDeclaration` 34 份 ✓（`expr-arrow-body-nested-ternary` 那一族 ✓，
是「多出来 34 份」那一条的另一半 ✓）与**标签那一族** ✓
（`BreakStatement` 22 + `CallExpression` 23 + `Block` 20 + `LabeledStatement` 19 ✓）。
按「先除路障」的口径，下一轮先查那个**空 `Statement`** ✓，它既能解释标签族的一半，
也可能是 `Identifier` 缺 118 份里的一片 ✓。
## 一百三十八、类型别名差的那个尾分号（第 535 轮）：850 → **871 / 1037**

起点 **850 / 1037** ✓（第 534 轮 ✓）。按清点，`TypeAliasDeclaration` 是「同一形状影响 34 份文件」
的一类 ✓，先拿它下手 ✓。

### 一、现场

`expr-arrow-body-nested-ternary.ts` 只差**一处、一对** ✓：

```
DRIFT  TypeAliasDeclaration  TS[239,281) vs 产物[239,280)  "type F = (a: number, b: number) => number;"
EXTRA  TypeAliasDeclaration                [239,280)  "type F = (a: number, b: number) => number"
```

⇒ TS 把**尾分号**算在 `TypeAliasDeclaration` 里 ✓（`Node.end` 就在 `;` 之后 ✓），
而产物这边 `TypeAssign` 自己的区间只到最后一个词 ✓ ⇒ 差一格 ✓。

### 二、修法

`typescript/print-ast-common.xl.md` 的 `projectStatement` ✓，在「单个子单元本身就是语句」那一支里 ✓：
**只对 `TypeAliasDeclaration`** 把终点按 `semicolonEndOf` 吃掉尾分号 ✓。

```ts
if (STATEMENT_KINDS.has(kind)) {
  if (kind === "TypeAliasDeclaration") {
    projected.end = semicolonEndOf(
      Math.max(stmtEndOf(v, ctx), projected === undefined ? 0 : (projected.end ?? 0)),
      ctx,
    );
  }
  return projected;
}
```

**为什么只开这一档** ✓：别的语句族的尾分号 TS 那边**不算在自己身上** ✗
（`class A {};` 的 `ClassDeclaration` 到 `}` 为止 ✓），一刀切会给它们多算一格 ✓。

### 三、读数

| 项 | 第 534 轮（起点） | 本轮 |
| --- | --- | --- |
| **完全一致** | 850 | **871 / 1037** ✓（+21 ✓） |
| 缺节点 | 1037（102 类） | **1037**（102 类）✓（持平 ✓） |
| 多出来的节点 | 400（44 类） | **324**（44 类）✓（−76 ✓） |
| 区间漂移 | 159（18 类） | **83**（18 类）✓（−76 ✓） |
| 字段名不符 | 56 | **56** ✓（持平 ✓） |
| 解析成功 / 抛异常 | 1037 / 0 | **1037 / 0** ✓ |

「多出来」与「漂移」两边各减 76 ✓ —— 就是那 21 份文件里成对出现的那两栏 ✓。

### 四、同一轮里试过、**回滚了**的一处（负面）

「具名导出」那一族本来是下一个候选 ✓（`expr-as-then-value-operator.ts`：缺 `NamedExports` +
缺一片 `ExportSpecifier` / `Identifier` ✓、`ExportDeclaration` 少一格尾分号 ✓，13 份文件 ✓）。
想法是：`projectExport` 里那句

```ts
const rest = kids.filter((k) => !(k.get("type") === "Keyword" && textOfNode(k, ctx) === "export"));
```

用的是「整格文本**等于** `export`」✗ —— 而 `Export` 单元的文本是**它区间里的原文** ✓
（具名导出那一档是 `"export { plus, minus }"` ✓，见 `textOfNode` 的回落 ✓），
所以那一格既滤不掉 ✓、`isAssignment` 也会被它的尾词骗到 ✓。
换成「按**词头**判」之后 ✓：

```
完全一致 871 → 856 ✗（缺 1037 → 1076 ✗、多出来 324 → 340 ✗）
```

⇒ **回滚** ✓（源码 `git checkout` ✓、**带 `force` 重建** ✓，读数确认回到 871 ✓）。
**教训**：那句 `=== "export"` 不是笔误 ✗ —— 它恰好只匹配「整格里只有 `export` 一个词」那一档 ✓，
而这正是**赋值式导出**那一档 ✓；具名导出的 `Export` **根本不该**走 `projectExport` 那条路 ✓
（它的括号与列表是**另一格** ✓），下一轮要从「谁把具名导出交给 `projectExport`」那一头查 ✓。

### 五、下一块

清点头两名没变：`Identifier` 118 份 ✓（`am-object-vs-block.ts` / `cls-hash-in-operator.ts` ✓）、
`VariableDeclaration` 34 份 + `List` 33 份 ✓（`decl-await-using-basic` / `decl-label-break-continue` ✓ ——
**`using` / `await using` 与标签族** ✓）。标签那一族仍然是「一鱼多吃」：
`BreakStatement` 22 + `Block` 20 + `CallExpression` 23 + `LabeledStatement` 19 份 ✓
（`decl-label-break-continue` / `decl-label-block` / `stmt-nested-loops-label` ✓），
下一轮先 dump 它 ✓。
## 一百三十九、带标签的那条语句：壳里是 `[Label, 被标的语句]`（第 536 轮）：871 → **879 / 1037**

起点 **871 / 1037** ✓。清点里「标签那一族」是典型的一鱼多吃 ✓
（`BreakStatement` 22 份 + `CallExpression` 23 份 + `Block` 20 份 + `LabeledStatement` 19 份 ✓，
全在 `decl-label-break-continue` / `decl-label-block` / `stmt-nested-loops-label` 那几族 ✓）。

### 一、先纠正一条旧判断（省下一轮）

上一轮的待办里写着「`For` 的四个命名段是空的」✗ —— **不对** ✓。
直接问那个 `For` 单元 ✓：它的段**都在** ✓
（`ForInitial` 3 格 / `ForCompare` 3 格 / `ForNext` 1 格 / `ForBody` 1 格 ✓），
`tree2.cjs` 打的是 `Data` ✓、而四段是**命名段** ✓ ⇒ 看不见它们 ✓（工具口径问题，不是产物问题 ✓）。

### 二、真因：顶层那条合并**看不到 `Statement` 壳里**

`print-ast-common.xl.md` 的 `projectEach` 里早就有「带标签的语句要合并」那一条 ✓
（连续 `Label` 从右往左套 ✓，注释写着 `Label[0,5]` 与 `For[7,36]` ⇒ `LabeledStatement[0,37)` ✓），
**可它只在顶层列表 / 段上跑** ✗ —— 而这里 `[Label, For]` 是装在一个 **`Statement` 壳**里的 ✓，
`projectStatement` 拿到的是**整条壳** ✓ ⇒ 那一条永远看不到 ✗。

实测的产物（`tri.cjs`）：

```
ExpressionStatement [71,201) [expression]
  LabeledStatement  [71,76)  []          ← 只盖住 `loop:`，被标的 For 整棵子树丢了 ✗
```

⇒ 落到通用支 ✓ ⇒ `ExpressionStatement > LabeledStatement(只盖标签)` ✗。

### 三、修法

在 `projectStatement` 的头部（`headType === "Export"` 那一条**之前** ✓）加一条**同源**的分支 ✓：
壳里如果以 `Label` 打头且后面还有一格 ✓，就照 `projectEach` 那一条**同一份做法**
（连续标签、从右往左套、用现成的 `labeled(...)` ✓）把「标签 + 被标的语句」投成一个
`LabeledStatement` ✓。

### 四、读数

| 项 | 第 535 轮（起点） | 本轮 |
| --- | --- | --- |
| **完全一致** | 871 | **879 / 1037** ✓（+8 ✓） |
| 缺节点 | 1037（102 类） | **874**（94 类）✓（−163 ✓） |
| 多出来的节点 | 324（44 类） | **299**（45 类）✓（−25 ✓） |
| 区间漂移 | 83（18 类） | **71**（18 类）✓（−12 ✓） |
| 字段名不符 | 56 | **58** ✗（+2 ✗，见下 ✓） |
| 解析成功 / 抛异常 | 1037 / 0 | **1037 / 0** ✓ |

`decl-label-break-continue.ts` 的缺从 **35** 掉到 **0** ✓。

**字段名 +2 的来路** ✓：`labeled()` 造的 `LabeledStatement` 带 `label` / `statement` 两个字段 ✓，
而**嵌套那一档**（`a: b: for` ✓）会套出**两层** `LabeledStatement` ✓ ——
TS 那边也是两层 ✓，所以这是**先前只投一层时欠着的两处** ✓，不是新伤 ✓。

### 五、下一处已经看清了（本轮的现场继续用）

同一个文件里还剩一处 ✓：

```
DRIFT  IfStatement  TS[143,168) vs 产物[143,195)   "if (skip()) continue loop"
EXTRA  Block        [155,195)  "continue loop"      ← 把下一行的 `if` 也吞了
```

原树里 `IfSet[143,195)` 的 `IfStatement` 段是 `Statement[155,168)` + **`IfSet[173,195)`** ✗ ——
也就是说**下一行的 `if` 被并进了这一段的体里** ✗（TS 那边 `IfStatement` 到 `continue loop` 为止 ✓）。
根子在解析期 `if` 向导给「单语句体」定界那一处 ✓（`if-statement.xl.md` / `if-segment.xl.md` ✓），
不是投影侧 ✓ —— 下一轮从那里查 ✓。
