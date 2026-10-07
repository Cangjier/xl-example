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

## 四、落地顺序（自小而大，每步都跑全语料）

1. **`EnumBody`**（最小）：`EnumMember` 改成吃字符的 `UnitToken`（构造器里挂成员列表队列 +
   通用队列给初始化式）；`EnumBody` 在第一个实义字符上开成员、在 `,` / `}` 上收；
   注释与逗号作为体自己的子单元；`EnumMemberReorganization` 删除。
   验收：`cases` 2.2s 快循环 → 全语料 `--per-file` → `samples` / `cases:check`；
   探针：`enum E { A, B = 2 }` / 上面那条带注释的 / `enum E { A = "x" }` / `enum E {}`（空体）。
2. **`InterfaceBody`**：成员以 `;` / `}` 收尾，没有方法体；
   `SignatureReorganization` / `FieldReorganization` 的接口分支跟着搬。
3. **`ClassBody`**：最复杂——成员可能是方法（自己带一对 `{}`）、字段（`;` / 换行收）、
   静态块（已搬完，`StaticBlockBranch` 在体的队列里认 `{`）。
   方法那一支要注意：`{}` 一挂载，`;` / `}` 就都到不了方法这一层了（嵌套靠挂载链）。
4. **`StaticBlock`**：它自己就是体，只需要确认成员级收尾与 1–3 一致。

## 五、每步都要钉住的三件事

- **注释保留**（用户口径）：注释单元照旧进树，只是位置从「被语句层切出来的边界」变回「trivia 原位」；
- **区间**：成员与体的区间要逐位置与 TS 对齐（`--file` 单文件尺子看四个方向 + 缺 range / 越界）；
- **`Data` 与字段的分工**（用户口径）：能被字段完整表达的进字段、带子树的留 `Data`；
  成员这一层暂时没有 meta 字段，先不动这条。
