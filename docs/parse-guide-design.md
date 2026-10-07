# 解析期 guide 的设计（第 398 轮）

这份文档只回答一件事：**把 `if` 从「事后重组」改成「解析期 guide + 单元吃字符」时，
每个决定的判据是什么、为什么它成立。** 它是照着用户给的口径写的：

> 当前面存在 `if`，并且当前是 `(` 时，则进入 if guide；
> if guide 立马挂一个 ifcondition，ifcondition 吃到 `)` 则退出；
> ifguide 继续根据不同形式挂载不同单元。

以及两条**铁律**：

1. **一个 guide 只准访问 `i` 与 `i-1`**（再加上 `0..i-1` 已经读出来的单元）。
   不许看 `i+1` —— 输入可能是一段一段送来的，拿不到时 `Document.GetValue` 给 `undefined`，
   判据悄悄成假、**产物错而不报**，比抛错更坏。
2. **一旦进入 guide，就必定是它那一类的形状，不能撤回。**
   没有「走到一半发现认错了」这条路，所以 `GiveBack` 那一类入口整个不存在。

---

## 一、一条总原则：用单元吃字符，不要攒到 plan

「攒字符 → 跑一遍算法 → 按下标重建结构」正是 `Reorganization` 的形状。
把时间从「父单元关闭时」挪到「读的时候」，**形状没有变**：

| | reorg | 「攒到 plan」（第 392～395 轮那版） |
| --- | --- | --- |
| 原料 | 一张平列表 | 一张平列表（暂存单元） |
| 手法 | 事后 reduce + 下标算术 | 读的时候 reduce + 下标算术 |
| 出口 | `ReplaceCountAt` | `Commit` + `MoveDataTo` + `AddRange` |

自证的痕迹有三条，都是实测的：

1. **下标**：那一版 `IfPlan` / `IfSegmentPlan` 上躺着 8 个下标
   （`SignIndex` `ConditionIndex` `BodyStart` `BodyEnd` `SetStart` `SetEnd` `EndIndex` `TailStart`）。
   下标正是 reorg 的病根。
2. **最难的两个 bug 全是「攒完再搬」造成的**：尾巴里搬走了一个**还挂在自己身上**的 `[`，
   它丢了收尾符 ⇒ `End == null` ⇒ 端到端掉 6 格；以及那个 `HandOverOpenUnit`
   —— 它**只因为**先过度消费、再要还回去才存在。字符从没被吃错，这个函数就不该有。
3. **每个字符重走一遍整条链**：无花括号体那一路还要 `SearchStatementEnd` 每次向前扫 ⇒ O(n²)。

**结论**：`Plan` / `IfPlan` / `IfSegmentPlan` / `Commit` 整块删掉。
字符由**单元**吃，结构**边读边长**，收工时只做**一次搬移**。

---

## 二、两个东西必须分开：`Parent` 与 `MountedUnit`

整套设计里最容易写错的一格，第 392 轮吃过一次亏：

- **`Token.Parent`** 是**树上那一格**（XML 里孩子挂在谁下面）；
- **`Token.MountedUnit`** 是**字符往哪儿送的指针**。

搬子单元（`Add` / `MoveDataTo` / `AddRange`）只改前者。所以：

> **一个单元可以「挂在 A 名下，而字符经由 B 送来」。**

这条正是 guide 能用单元吃字符的前提：guide 想让谁吃字符，就把自己的 `MountedUnit` 指过去，
**而那个单元的 `Parent` 仍然是它在树里该在的那一格**。

反过来，`Quit()` 清的是 `this.Parent.MountedUnit` —— 如果字符不是经 `Parent` 送来的，
这一句就清错了地方。所以 **guide 自己持有并回收这个指针**：每处理完一个字符看一次
`MountedUnit.Closed`，关上了就把指针收回（见下面 `Process`）。

---

## 三、`if` 的状态机

```
                 ┌──────────────── 入口：前面存在 if，当前是 ( ────────────────┐
                 │  1) 把那个已读到的 if 从宿主摘掉（它不是 XML 节点）        │
                 │  2) 建 IfSet + 第一段 IfSegment(key="if")，都用它的起点签入 │
                 │  3) 挂 IfGuide；把这个 ( 重新交给它                        │
                 └───────────────────────────────────────────────────────────┘
IfGuide.Stage:
  0  等条件   → 挂 IfCondition（自己吃 ( … )，吃到 ) 退出）
  1  等体     → 挂 IfStatement（花括号体 / 单语句体，见第四节）
  2  体之后   → 尾巴：trivia 照常词法化留在向导名下；看到一个**关上的** else 就是续段
  3  else 之后 → 下一个词是 if ⇒ else if；否则 ⇒ 普通 else，接着等体
```

三处细节是有实测依据的：

- **入口落在 `(` 而不是 `i`** ✓（第 395 轮改的）：落在 `i` 上就只能看 `i+1` 是不是 `f` ✗，
  违反铁律 1；落在 `(` 上则 `i` 是 `(` ✓、`if` 已经读完了 ✓，两样都在允许范围里 ✓。
  而且「`i` 后面紧跟 `(` 的 `i` 只可能是 `if`」⇒ **进门即定形** ✓，铁律 2 自然成立 ✓。
- **`IfSegment` 不必变成吃字符的单元** ✓：guide 直接把自己的 `MountedUnit` 指给
  `IfCondition` / `IfStatement`（而它们的 `Parent` 是那一段 ✓），所以「谁挂谁」这条链
  不需要真的长在树上 ✓。
- **尾巴上的字符照常走通用队列** ✓（向导自己也是一条队列的执行者）：
  trivia 与那个候选词被**照常词法化**，落在向导名下 ✓。
  - 是 `else` ⇒ 把它从向导名下摘掉（它不是 XML 节点 ✓），记下它的位置，进 Stage 3 ✓；
  - 不是 `else` ⇒ 它本来就该属于**父单元** ✓ ⇒ 收工时随那次搬移一起过去 ✓✓
    —— **这就是尾巴，不需要「还回去」**：从头到尾它是被当成父单元的东西在攒的 ✓。

---

## 四、三个单元的基类与终止判据（**终止由谁持有**是关键）

> **第 399 轮更新**：这一节原先的结论是「`PendingUnit` 保留，只把委托换成 `IsEnd`」✗。
> 用户追问「**为什么会有 `PendingUnit`？**」之后量了一遍，答案是**它不该存在** ✓：
> `Bracket.ExitOrPre` 与 `PendingUnit.ExitOrPre` 是**同一段机件**（前者写死了 `EndInclusive` 那一档 ✓），
> 而 `UnitToken` 的 9 个子类各自手写一份 `ExitOrPre`，绝大多数是同一件事——**拿当前字符跟一个标记比** ✓。
> ⇒ 机件收进 **`UnitToken`** ✓（`ExitOrPre` 一份 ✓ + `Close` 一份 ✓ + `ReloadOwner` ✓），
> 子类只回答 **`EndState`** 一句话 ✓，`PendingUnit` **整个删除** ✓。
> 下文表格里的 `PendingUnit` 一律读作 `UnitToken` ✓。

用户先把这一格纠正过两次，两次指向同一件事：

> 「`ifcondition` 不应该是 unit token 吗？类似 `bracket`？」
> 「**如何终止不应该是 self token 最清楚的吗？**」

第一条纠正的是**「它得是吃字符的单元」** ✓；第二条纠正的是**「终止判据归它自己」** ✓。
第 390 轮第一版把终止写成**外面传进来的委托** ✗（`new PendingUnit(template, (ctx, src) => …)` ✓），
第 398 轮实测推翻 ✓：委托的签名里那个 `unit` 参数**连子类的字段都带不出去** ✗，
也没法顺手改状态 ✗ ⇒ 写到 `IfStatement` 那儿只能**绕回去覆写 `IsEnd`** ✓，等于白留一层 ✗。

**改法（第 398 轮已落）**：`PendingUnit` 删掉 `Terminator` 委托与 `# type PendingTerminator` ✓，
`IsEnd` 变成**子类覆写的抽象钩子** ✓（基类 `throw new Error("abstract member: IsEnd")` ✓——
忘了覆写会当场炸 ✓，不会静默「恒 `Continue`」而永远不收尾 ✗）。
于是每一格都用最直接的那个：

| 单元 | 基类 | 终止判据 | 谁来消费开头 |
| --- | --- | --- | --- |
| `IfCondition` | `PendingUnit`（它**就是** `UnitToken` ✓） | **自己带的固定字符 `)`** ✓（一行 `IsEnd` ✓） | **向导**（建它的那一刻 ✓） |
| `IfStatement`（花括号体） | `PendingUnit` | 固定字符 `}` ⇒ 含地结束 | 向导 |
| `IfStatement`（单语句体） | `PendingUnit` | **自己状态的判断**：`Data` 的语句边界 ⇒ 交回 | 内容自己（第一个单元就是体的开头 ✓） |

**「类似 `Bracket`」落在哪** ✓：`Bracket` 也是「自己吃自己的跨度、结束符拿在自己手里」✓
（`# class Bracket extends UnitToken` ✓、`## field endBracket` ✓、`ExitOrPre` 直接比它 ✓），
差别只是它把那段机件**内联**在 `ExitOrPre` 里 ✓，而这里复用 `PendingUnit` 的三档机件 ✓——
两者是同一个形状 ✓，复用只是不重复写一遍 ✓。

**XML 不会因为加字段而变** ✓：属性**不是**从字段自动印的 ✗，
`Token.ToXmlString` 只印 `<类名>子单元</类名>` ✓，
带属性的那几个类（`Bracket` / `Class` / `Let` …）都是**自己覆写** `ToXmlString` 才有 ✓。
所以 `IfCondition` 带自己的终止字符字段，产物**仍是** `<IfCondition>…</IfCondition>` ✓
——只要它不覆写 `ToXmlString` ✓（它现在没有 ✓）。`IfCondition.ToDictionary` 同理照旧 ✓。

### 嵌套由挂载链解决，不由 `IsEnd` 解决

`if ((a) && (b)) { }` 里那个 `(` 是**条件内部的括号** ✓，它靠的是同一条挂载链 ✓：

```
向导消费最外层 (            → IfCondition 挂上
  (  #2  → IsEnd 说 Continue（不是我的终止符）⇒ Undo ⇒ 走 ProcessQueue
         ⇒ Bracket.JumpIn 挂一个 Bracket ✓ ⇒ 从此字符归**那个括号**
  a      → 送到 Bracket（IfCondition 根本没被调用 ✓）
  )      → Bracket.ExitOrPre 认自己的结束符 ⇒ 它收尾 ✓ ⇒ 挂载回到 IfCondition
  && (b) → 同上再挂一个
  )      → 这一格没有挂载单元 ⇒ 才轮到 IfCondition.IsEnd ⇒ 含地结束 ✓
```

（用户口径：`ifcondition` 中遇到 `(`，应该是继续挂载对应的 token，这样嵌套是能处理的 ✓。）

两个推论：

- **`IsEnd` 见到的 `)` 必定是它自己那一层的** ✓ ⇒ **不数深度、不做嵌套记账** ✗
  （数了就是第二份嵌套答案 ✗）；
- `IfCondition` 的 `ProcessQueue` 必须是**通用队列** ✓（里面得有 `Bracket.JumpIn` ✓）——
  `PendingUnit` 的构造器取 `BranchTemplate.Get(this.constructor)` 拿到的正是通用队列 ✓，
  这一格是白捡的 ✓。

### `IfStatement` 单语句体那一路的具体做法

**吃进一个字符之后**问一次 `Statement.IsStatementEnd(this.Data, this.Data.length - 1)` ✓，
成立就置一个标记，**下一个字符按 `EndExclusive` 交回** ✓。判据与原来那趟算法**是同一个函数** ✓，
只是从「问一张暂存列表」变成「问单元自己已经吃到的 `Data`」✓ —— 那是同一张列表，语义不变 ✓。
且只在「刚吃进一个可能下结论的单元」时才问（最后一个是 `;` 或软换行）✓，摊还是 O(1) ✓。

`EndExclusive` 把那个字符交回给**谁**要写清楚 ✗：默认是 `Quit()` 返回的 `Parent` ✓，
可这里 `Parent` 是**那一段** ✗（字符经向导送来 ✓——见第二节：`Parent` 与 `MountedUnit` 是两件事 ✓）。
所以 `PendingUnit` 需要一个「交回给谁」的口径：`ReloadOwner` ✓，
向导在挂体单元时把它指成**自己** ✓，于是那个不属于体的字符回到向导手里 ✓，
向导才能接着看 `else` ✓。

**为什么不能用「`;` 就是结束」一句话** ✗：`if (a) f()` 这种没有分号的写法要靠 ASI 判据 ✓
（`IsLineBreakBoundary` ✓）——这正是 `if` 这一族唯一真正难的地方 ✓，
也是它必须先于其它控制流被搬的理由 ✓（`while` / `for` / `switch` 都有这个形态 ✓，
`try` / `catch` / `finally` 没有 ✓）。

---

## 五、收工：一次搬移，外加把不归自己的那个字符交回去

收工有两种触发：

- **输入到头**（`Close()` ✓）；
- **外层的收尾符到了**（例如向导在 `{` 块里，而 `}` 来了 ✓）。

两种都做同一件事：

1. 把 `IfSet` 的终点签到最后一段的终点上（**尾随 trivia 要算进来** ✓——
   原来的算法是「第一个非 trivia 之前的最后一格」✓，这里用向导名下最后一个 trivia 的位置 ✓）；
2. `IfSet.TryToClose()`；
3. `this.MoveDataTo(parent)` —— **一次搬移**：`IfSet` 再加上尾巴上那些本来就属于父单元的单元 ✓，
   顺序天然正确（`IfSet` 在向导的第一格 ✓）；
4. 若是外层收尾符：把它 `ReloadMessage` 交给**宿主**（不是向导、也不是上一步搬出去的东西 ✓），
   然后摘掉自己 ✓。

**只有「向导名下没有开着的东西」时才收工** ✗（第 392 轮那条实测 ✓）：
只要有单元还开着，这张列表就还不是一张平列表 ✓，形状也还没定 ✓；
此时搬走它，`Add` 会改掉它的 `Parent`、可挂载指针还指着向导 ⇒ 后面的收尾符送不到它手上 ✗
⇒ 它带着 `End == null` 被 `TryToClose` ✗。**这一条成立，`HandOverOpenUnit` 就没有存在的理由** ✓。

---

## 六、连续两条链：不需要专门的多链逻辑

`if (a) f(); if (b) g();` —— 第二条链的 `if` 落在**向导的尾巴**里 ✓，
而向导自己的队列**保留 `IfGuideBranch`** ✓ ⇒ 那里会照常挂起**第二个向导** ✓，
它的 `Parent` 是外层的向导 ✓ ⇒ 收工时外层那次搬移把两个 `IfSet` 一起交给父单元 ✓，顺序正确 ✓。

⇒ 第 394 轮为「多链」加的 `SetStart` / `SetEnd` 那一套 ✓ **整块删掉** ✓。
⇒ 向导的队列**不需要摘掉自己** ✗（收集器那一版必须摘 ✓，因为暂存期间不该另起向导 ✓）。

---

## 七、这一族的坑（实测记录，写在这里省得再踩）

`if` 迁移过程中量到的三处，全是**同一个错误**：**把「事后判据」拿到读的时候用**。

| 哪一处 | 症状 | 修在 |
| --- | --- | --- |
| `\|` / `&` 在 `{` 上判死 | `): A \| B {` 的**方法体**被判成类型位 ⇒ 体里 `if` 拿不到向导 ⇒ 整条 `if` 子树消失（缺 118599 个节点） | 第 394 轮 |
| `Context` 分不出标签的冒号 | `outer: { … }` 的块被当成类型字面量 | 第 396 轮 |
| `is` / `asserts` 等返回类型里的词判死 | `): asserts x is string {` 的**函数体**同上 | 第 397 轮 |
| `TypeLiteralReorganization.Previous` | 它**自己文件里写着**「老走法能对，是因为它跑的时候 `LabelReorganization` 已经把冒号收走了」⇒ 开括号那一刻问它必然判宽 | 第 394 轮（换回 `Context`） |

判据：**一个判据能不能在读的时候用，看它依赖的输入是不是都已经读到了。**
`ClassReorganization.ScanHead` 只依赖「头 + 体括号」⇒ 可以 ✓；
`TypeLiteralReorganization.IsTypePosition` 依赖「冒号已经被 `Label` 收走」⇒ 不可以 ✗。

---

## 八、落地顺序

1. `IfCondition` 改成自己吃 `( … )`：**`extends UnitToken`**（写法对齐 `Bracket` ✓，
   自己带终止字符 `)` ✓，起点由向导消费并 `SignIn` ✓）；类名不变 ⇒ XML 标签不变 ✓；
   跳转队列由 `UnitToken` 的构造器取成通用队列 ✓（与旧路径逐字一致 ✓）。
2. `IfStatement` 改成自己吃体：**`extends PendingUnit`** ✓（终止是判断、不是一个字符 ✓），
   花括号体 / 单语句体两形态见第四节那张表 ✓；给它加 `ReloadOwner` ✓。
3. `IfGuide` 退成纯协调者（第三节那个状态机 ✓），删掉 `Plan` / `IfPlan` / `IfSegmentPlan` /
   `Commit` / `HandOverOpenUnit` ✓。
4. **每一步都拿 XML 验**（铁律：从打印 XML 验证设计 ✓）——`cases:tsast` 与覆盖矩阵只作参考 ✓。

验收见第九节——**不是**「XML 逐字节不变」✗。

---

## 九、第二个目标：让 token 贴近 AST（用户口径，第 398 轮）

> 「让 token 贴近 ast，这样 printAst 会更为简单。从 if 开始做起。」

这一条改的是**目标形状**，不只是实现方式 ✓。原来那一版把「产出与旧路径**逐字节相同**的 XML」
当验收 ✓——那等于把「事后重组」的产物形状**照抄**下来 ✗，包括它的别扭处 ✗。按新口径，
验收该是「**投影到 AST 依然正确**」✓，而 XML 可以（也应该）朝 AST 靠 ✓。

### `if` 的两边现在差在哪

TS 的 AST 是**嵌套**的：

```
IfStatement            { expression, thenStatement, elseStatement? }
  expression: Expression
  thenStatement: Statement          （有花括号时就是 Block）
  elseStatement?: Statement
```

本仓现在的 token 树是**平列表 + `key`**：

```
<IfSet>
  <IfSegment key="if">    <IfCondition/> <IfStatement><Statement/>…</IfStatement> </IfSegment>
  <IfSegment key="if">    ……        ← `else if` 也记成 "if"
  <IfSegment key="else">  ……        ← 最后那个 else
</IfSet>
```

三处差距，`PrintAst` 都得**反推**回来：

1. **平列表 vs 嵌套链** ✗：`elseStatement` 那一格要由 `PrintAst` 按 `key` 重新折出来 ✓
   （`else` 后面跟不跟 `if`、跟几段 ✓）；
2. **多一层 `Statement`** ✗：`IfStatement > Statement > 真语句` 三层对应 AST 的两层 ✓；
3. **`IfSegment` 没有终点** ✗：它只 `SignIn`、靠 `IfSet.SignOut` 递归签出 ✓
   （`token.xl.md` 里「终点缺失时从子节点兜底」记的就是它 ✓）⇒ 投影时必须走兜底 ✓。

### 朝 AST 靠，具体是这几件事

- **段的嵌套**：`else` 那一段（连同它后面的链）挂在前一段的 `else` 位上 ✓，
  而不是与它并排 ✓ ⇒ 投影变成「一个 token 对一个 AST 节点」✓，不再需要折 ✓。
  正好与第三节的状态机同构：向导挂完体之后看到 `else`，就是**把新段挂进上一段** ✓。
- **去掉多余的那一层** ✓：体的 token 形状对齐 AST 的 `Statement`（花括号体对齐 `Block`）✓。
- **每个段都签全两头** ✓（不再依赖兜底 ✗）——这也是目标第 ③ 项（受控重签 ✓）的第一个真实需求 ✓。

### 要讨论的两点（**先不动手**）

1. **`<IfSet>` 这一层留不留**？AST 里没有对应的节点 ✓（`if` 本身就是 `IfStatement` ✓）。
   两种走法：(a) 留 `IfSet` 当外壳、只把段改成嵌套 ✓（改动小 ✓、`PrintAst` 折的次数从 N 降到 0 ✓）；
   (b) 干脆让第一段就是顶层节点 ✓（最贴 AST ✓，但 XML 与夹具改动最大 ✓）。
2. **`key` 属性留不留**？嵌套之后「这是 `if` 还是 `else if`」由**位置**表达 ✓（在 `else` 位上 ✓），
   `key` 就冗余了 ✓——但它是下游（降级层 / 夹具）在用的形状 ✓，去掉要一并改 ✓。

我倾向 (a) + 段内嵌套（`else` 段挂进上一段）✓：它把「折」这件事彻底消掉 ✓，
而外层那一个 `<IfSet>` 只是名字问题 ✓，不值得为它牵动夹具与降级层 ✓。
