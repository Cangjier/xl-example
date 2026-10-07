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

## 七、每步都要钉住的三件事

- **注释保留**（用户口径）：注释单元照旧进树，只是位置从「被语句层切出来的边界」变回「trivia 原位」；
- **区间**：成员与体的区间要逐位置与 TS 对齐（`--file` 单文件尺子看四个方向 + 缺 range / 越界）；
- **`Data` 与字段的分工**（用户口径）：能被字段完整表达的进字段、带子树的留 `Data`；
  成员这一层暂时没有 meta 字段，先不动这条。
