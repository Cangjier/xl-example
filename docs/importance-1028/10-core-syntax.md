# 10 — core/syntax（语言无关的语法层骨架）

审计范围：`core/syntax/*.xl.md` 共 20 个文件（不含 `messages/`、`basic-tokens/`、`templates/`，它们各自成篇）。
判据见 [`01-rules.md`](01-rules.md)，编号 `S/P/C/U/B/R/X/D` 同该文件。

**本层总评**：IMPORTANCE 的「shape + possible + end + catalog guide + cache」骨架是**在的**，而且 `CatalogGuide` 的判定五条（R26–R30）实现得相当贴。偏离集中在两处：① 骨架外面又长了一层「每字符转发器 + 向导 token + 窗口驱动」，把「basic token 关闭才触发 possible」的单一触发放大成三个触发点；② `R19/R20`（build 时提取数据、close 后 `Data` 只剩子形状）没有在基类落地，基类只把 `Closed` 置真，丢弃/提取全靠每个 shape 自觉，`ShapeToken.AstOperator` 甚至在 AST 阶段回读源码。

---

### core/syntax/token.xl.md（7092B / 167 行；`Token`）
- 结构：所有 token 的基类——`Data` 子单元表、`SignIn/SignOut` 签范围、`TryToClose/Reclose` 关闭、`Quit` 卸载、`Add/MoveDataTo` 挂载，以及 `ToAstLine` 逐字 AST 打印。
- 偏离：
  - `[X1]` ● 基类自带一层「每字符转发器」：`ProcessQueue:Sequence<BranchTransiter>` + 抽象 `Process`，字符流由 `BranchTransiter` 链逐字符消费。IMPORTANCE 的触发点只有两个（basic token 关闭、bracket 创建）——R03/R13；这里变成「每个字符都进一次转发器链」，多出第三条驱动路径。证据 `token.xl.md:18`（`field ProcessQueue:Sequence<BranchTransiter> | null = null`）、`token.xl.md:118-122`（`Process` 抽象）。
  - `[U4]` ○ `Close` 完全抽象、基类不提供任何「丢弃 basic token」的落点；R19/R35 的「用完即丢弃」只能靠子类各自实现，基类没有兜底。证据 `token.xl.md:60-64`。
  - `[B2]` ○ `TryToClose` 在范围未签时**抛错**而不是返回 `Nothing`——与 R25 同源的 `Nothing` 语义相反。证据 `token.xl.md:69-71`（`throw SourceException.SourceRangeContainsNull`）。
- 符合项：`Reclose` 就是 R17③ 要求的「closed 置假重新 close」，`token.xl.md:75-80`；`Quit` 清 `Parent.MountedUnit`，即 R32 的卸载语义，`token.xl.md:109-116`；`MoveDataTo` + `Data.length = 0` 是 R19/R35 的丢弃工具，`token.xl.md:82-89`。
- 结论：偏离（3 条，1 条明确）。

### core/syntax/source-range.xl.md（5083B / 85 行；`SourceRange`）
- 结构：源码区间值对象（Start/End/Document），行号与原文切片工具。
- 偏离：
  - `[B1]` ○ 越界访问有两种相反语义：`At` 抛错、`ValueAt` 不校验直接 `Document.GetValue(index)`（返回 `undefined` 冒充 `string`）。R25 要求越界给 `Nothing`——这里既不给 `Nothing`，也不统一，调用方稍不注意就是越界读到「后面还没就绪」的字符。证据 `source-range.xl.md:42-55`。
- 符合项：`IsEof` 用 `Start === End && Start >= GetCount()` 判定 EOF，支撑 R17② 的「EOF 触发消费」，`source-range.xl.md:81-85`。
- 结论：偏离（1 条，疑似）。

### core/syntax/unit-token.xl.md（4538B / 89 行；`UnitToken`）
- 结构：可挂 `CatalogGuide` 的 token，`ComputePossibleShapes(ByIndex)` 转发给目录；`Process` 是字符主循环（挂载单元优先、`ExitOrPre` 预判、转发表、`Default` 兜底）。
- 偏离：
  - `[B2]` ● 主循环把**所有**非 `SyntaxException` 的异常包成 `SyntaxException.FromInner`（`unit-token.xl.md:128-135`）。possible 的 compute/build 正是从这条循环里被调起来的（`Default`→`Close`→父单元 `ComputePossibleShapes`），于是 `CatalogGuide` 按 R27/R28 故意抛出的「终结候选与非终结候选同时成立」「没有候选形状可以构成」这两类**诊断**，在这里被换成了另一种异常类型、丢了原始栈。R23 要求「异常禁止 catch 吃掉，这些异常是 possible 诊断，是用户期望看到的信息」。证据 `unit-token.xl.md:128-135`。
  - `[X1]` ● `OnBracketCreatedEvent` 是 IMPORTANCE 没有的钩子；设计里 bracket 创建只做一件事——触发 possible 并 install catalog（R13）。这里多出一条「子括号创建事件」广播。证据 `unit-token.xl.md:40`、`unit-token.xl.md:149-151`。
  - `[P1]` ○ `ComputePossibleShapes` 不带下标版本直接取 `host.Data.length - 1`（`catalog-guide.xl.md:47`），即「最后一个单元」而不是「当前触发单元」；配合 `[T2:GUARD]` 的去重键（tokenIndex+长度），同一格会被静默跳过。证据 `unit-token.xl.md:22-29`。
- 符合项：`ComputePossibleShapes` 就是 `CatalogGuide.ComputePossibleShapes` 的转发，R04 的「关联通过 catalog guide 表达」成立。
- 结论：偏离（3 条，2 条明确）。

### core/syntax/catalog-guide.xl.md（4245B / 66 行；`CatalogGuide`）
- 结构：候选集合 `Candidates` + 终结候选 `EndPossible` + possible 缓存，`ComputePossibleShapesByIndex` 是「淘汰 → 终结判定 → 零/多/唯一候选」的五条判定实现。
- 偏离：
  - `[X1]` ● `[T2:GUARD]`：同一 `(tokenIndex, Data.length)` 只要成功 build 过一次，再进这一格直接返回 `Nothing`，连候选都不问。这是 IMPORTANCE 完全没有的短路；它挡掉的正是 R17③ 的 `Reclose` 场景（回挂重关后同格应重新 compute）。需要说明的是 `Reclose` 全仓 0 个调用点，所以这条短路目前只在「同一格被父单元的 Close 再问一次」时生效——但那条路径也不该被静默跳过。证据 `catalog-guide.xl.md:56-65`。
  - `[X1]` ○ 目录上挂了 `FlushOnClose`、`BuildCount`、`RepeatedCellSkipCount`、`LastBuildTokenIndex/DataLength` 五个设计外字段：一个是「关闭前补问一次」的开关，其余是计数器/去重键。证据 `catalog-guide.xl.md:16-32`。
  - `[P3]` ○ R27 写明终结候选 build 后的动作是「`SignOut` → `TryToClose()` → `Quit()`」；`CatalogGuide` 自己一个都不做，全部押在 `BuildByIndex` 里由各 possible 自行完成——契约靠自觉，目录层无法保证。证据 `catalog-guide.xl.md:78-85`。
  - `[P2]` ○ `if (this.Candidates.size !== 1) throw`（`catalog-guide.xl.md:95-97`）不可达：上面 `=== 0` 与 `> 1` 都已返回。属死代码，不是缺陷，但会让「唯一候选不变量」看起来比实际更强。
- 符合项（这一节是本仓最贴 IMPORTANCE 的地方）：
  - R26 淘汰：只对 `ShapeStates.Reject` 做 `Candidates.delete`，`PossibleShapes` 数组只读不改，`Accept/Uncertain` 一视同仁，`catalog-guide.xl.md:66-70`。
  - R27 终结候选：`Accept` 且 `Candidates > 0` 抛错，`Candidates == 0` 才 build，然后 `Reset`+`Built`，`catalog-guide.xl.md:71-85`。
  - R28 零候选：`EndPossible === null` 抛错，否则 `Waiting`，`catalog-guide.xl.md:86-91`。
  - R29 多候选：`> 1` → `Waiting`，`catalog-guide.xl.md:92-94`。
  - R30 唯一候选：先 `IsBuildable` 再 `BuildByIndex`，`catalog-guide.xl.md:98-107`。
- 结论：偏离（4 条，1 条明确）——但五条判定本身是符合的。

### core/syntax/syntax-context.xl.md（4163B / 85 行；`SyntaxContext`）
- 结构：驱动层——按固定窗口推进 `Root.Process`、排空 `Messages`（Reload 重放）、维护变量表。
- 偏离：
  - `[X1]` ● 固定 32 字符窗口（`BufferSize`）驱动，是设计外的第三种「推进单位」（设计只有逐字状态机，R12 的验证口径就是逐字符）。窗口边界还逼出了跨窗口补丁（见 `area-annotation.xl.md:50` 的 `Tmp.endsWith("*")` 特判）。证据 `syntax-context.xl.md:15`、`syntax-context.xl.md:80-84`。
  - `[X1]` ● Reload 重放加了两道外挂守卫：同一位置「重放不推进」最多 8 次就抛错（`:133-148`），以及每窗口「`Index` 不前进」就抛错（`:89-94`）。设计里 Reload 的语义只是「重放这一格」，没有次数上限与挂死判定。证据 `syntax-context.xl.md:85-94`、`:129-150`。
  - `[X1]` ○ 回退保护 `if (this.Index < forwardFrom) this.Index = forwardFrom;`——设计没有「谁负责推进」的兜底约定，这里替所有 token 兜了底。证据 `syntax-context.xl.md:85-87`。
  - `[X1]` ○ `RegexStartAfter:Set<int>` 是「正则从这里强制开始」的外部白名单，正则起点本应是语法层（possible）的判断，现在可以在驱动层被点名。证据 `syntax-context.xl.md:27`、`regex-token.xl.md:152`。
  - `[X1]` ○ `HandleMessage` 空实现：`MessageTypes` 只有 `None`，除 `ReloadMessage` 外的消息没有任何处理者。证据 `syntax-context.xl.md:114`、`message.xl.md:9-11`。
- 符合项：EOF 处理（`Root.SignOut(count)` 后以空窗口再 `Process` 一次）正是 R17② 的「EOF 触发消费」，`syntax-context.xl.md:96-100`。
- 结论：偏离（5 条，2 条明确）。

### core/syntax/block-token.xl.md（2265B / 46 行；`BlockToken`）
- 结构：**原文累积型** token 的基类——`Temp` 里攒整段原文，`AppendAndSignOut` 每追加一个字符就改写一次 `SourceRange.End`，并覆盖了 `SignOut`（允许重复签出）。
- 偏离：
  - `[X1]` ● 覆盖 `SignOut` 让「已签即抛错」失效：基类 `Token.SignOut` 在 `End` 已设置时抛 `SourceRangeEndIsSetted`（`token.xl.md:146-160`），这里直接改写（`block-token.xl.md:103-110`）。签范围从一次性动作变成可反复擦写，`SourceRange` 不再是区间事实的载体。
  - `[X1]` ● 自造 `Process`：只有「挂载单元优先 + `Default`」，没有 `ExitOrPre`、没有分支队列（`:57-73`），与 `UnitToken.Process`（`unit-token.xl.md:54-127`）是两套驱动。同一个词法层因此有两条字符主循环。
  - `[X1]` ● `Undo` 会把自身从父 `Data` 里删掉（`:75-89`），`IsUndo` 恒 `true`（`:91-95`）——回溯撤销式词法，设计里撤销只有 `BranchStates.Undo`（本字符不归我），没有「删掉已产出的 token」。
  - `[U4]` ○ `Temp` 攒的是整段原文，`Default` 只往里拼字符（`:97-101`）；数据在 token 里是「字符串」，不是字段——与 R19 的「build 时提取到 shape 字段」之间只能靠上层再解析。
- 结论：偏离（4 条，3 条明确）。

### core/syntax/shape-token.xl.md（2312B / 49 行；`ShapeToken`）
- 结构：所有 shape 的基类，补 `Pos`、`TryToClose` 的收尾签范围、`TrimEndToLastCode`、AST 三件套（`AstPos/AstText/AstOperator`）。
- 偏离：
  - `[R1]` ● **shape 基类自己实现了 `ExitOrPre`**（返回 `BranchStates.Undo`）。R33 是「shape 禁止覆盖 `ExitOrPre`」——基类提供默认实现，等于把这条禁令降级成「子类别再覆盖」，而本仓大量子类正是覆盖它来结束自己（见第 20/21/23 篇）。证据 `shape-token.xl.md:65-69`。
  - `[U4]` ● `Close` 只做 `this.Closed = true`，**不过滤、不丢弃 `Data` 里的 basic token**，也没有任何断言。R20 要求「`Close` 之后 `Data` 等价于 AST 的 children（只剩子节点形状）」。证据 `shape-token.xl.md:58-63`。
  - `[R19]` ● `AstOperator` 在**产出 AST 时**回读源码：`range.Document.GetRaw(range.Start, range.End)`。R19 要求 basic token 的数据在 build 那一刻已全部提取到 shape 字段。证据 `shape-token.xl.md:84-106`。
  - `[R19]` ○ `AstText` 用 `(this as any).Text` 读一个**没有声明**的字段，读不到就返回空串——数据是否在 build 时提取，完全取决于子类有没有记得赋值，基类无从校验。证据 `shape-token.xl.md:77-82`。
- 结论：偏离（4 条，3 条明确）。

### core/syntax/possible-shape.xl.md（1808B / 15 行；`PossibleShape`）
- 结构：候选基类——`ComputeByIndex`/`BuildByIndex` 抽象、`IsBuildable` 默认 true、按类分配 cache slot。
- 偏离：
  - `[B4]` ○ `Compute` 用 `units.length - 1`、`Build` 用 `host.Data.length - 1` 作为默认下标，而不是「触发格」。R22 要求只看 `tokenIndex` 之前；当调用方按旧长度遍历（R25 明确允许这种调用）时，`units.length - 1` 会落到比 `tokenIndex` 更后的位置。证据 `possible-shape.xl.md:38`、`:50`。
  - `[X1]` ○ `ContinuationClaim`（`:59-64`，注释 `[D0:CONTINUATION]`）是设计没有的第九个候选协议方法：候选可以「认领」初始化器位置的委派。证据 `possible-shape.xl.md:59-64`。
  - `[X1]` ○ `Slots`/`SlotOf` 用一个进程级 `Map<any,int>` 给每个候选类分配 cache 下标（`:15-27`）。设计只说 state 面向每个 possible，没规定索引方式；属实现选择，记作外挂但不构成冲突。
- 符合项：`IsBuildable` 默认 `true`，正是 R30 的默认；`BuildByIndex` 抽象抛错，符合「未实现即诊断」。
- 结论：偏离（3 条，均疑似）。

### core/syntax/guide-token.xl.md（1286B / 22 行；`GuideToken`）
- 结构：一种「向导」token：`Navigate` 一次，然后按 `context.Index` 是否推进来决定是否吃掉字符。
- 偏离：
  - `[X1]` ● IMPORTANCE 的 token 家族只有 basic token、shape；`GuideToken` 是**第三类驱动单元**——它不产出词，只负责「导航」，并且自己改写 `context.Index`（`:47-56`）。这层在设计中不存在，`string/` 下还有 5 个 guide 建立在它上面。证据 `guide-token.xl.md:12`、`:35-56`。
  - `[B3]` ○ `Navigate` 返回后若 `context.Index > index` 就认为「已推进」并直接返回，不做任何「本字符是否已被 BASIC token 消费」的核对——跳跃式处理的温床。证据 `guide-token.xl.md:38-50`。
- 结论：偏离（2 条，1 条明确）。

### core/syntax/possible-shape-cache.xl.md（1272B / 22 行；`PossibleShapeCache`）
- 结构：state（`Values`）与 share（`Share`）两套按 slot 索引的数组，外加 `ItemStart` 记录。
- 符合项：
  - R09/R10：`GetState/SetState`、`GetShare/SetShare` 齐备，`possible-shape-cache.xl.md:9-39`。
  - R11：`Clear()` 只清 `Values`（`state` 在 build 后 reset），**不动 `Share`**（share 不 reset），`possible-shape-cache.xl.md:67-73` 与 `catalog-guide.xl.md:110-118` 的 `Reset` 配合正确。
- 偏离：
  - `[X1]` ○ `ItemStartValue/ItemStartLength` + `GetItemStart/SetItemStart`（`:47-65`）是设计外的「本轮起点」记忆。方向上符合 R08「把寻找结果记进 cache」，但它记的是**下标**而不是**结论**，各 possible 仍要自己判断 `-1`。
- 结论：符合（1 条外挂，疑似）。

### core/syntax/document.xl.md（1185B / 10 行；`Document`）
- 结构：源码读取抽象（取值/取行/取原文），全部方法为抽象成员或一行转发。
- 偏离：
  - `[N]` ○ 非设计项，但有一处自相递归：`GetRangeString`/`GetRangeLines` 都是 `return range.ToString()`（`:30-40`），而 `SourceRange.ToString` 又回调 `Document.GetRangeLines`（`source-range.xl.md:142-164`）——默认实现一旦被调用就是无限递归；靠 `TextDocument` 覆盖才没炸（见第 80 篇）。记在这里作为风险，不计入 IMPORTANCE 偏离。
- 结论：符合（不涉及 possible）。

### core/syntax/i-compute-possible-shapes.xl.md（735B / 0 行；`IComputePossibleShapes`）
- 结构：可被问「possible」的宿主接口。
- 偏离：
  - `[X1]` ○ 接口里多出 `OnBracketCreatedEvent`（`:20`）。R13 只需要「bracket 创建 → 触发 possible」，不需要事件广播；该成员把所有实现类都拖进了事件模型。
- 结论：符合（1 条外挂，疑似）。

### core/syntax/independent-token.xl.md（712B / 3 行；`IndependentToken`）
- 结构：一个「独立 token」，`Close` 只置 `Closed`，`Process` 与 `Default` 均为空体。
- 偏离：
  - `[X1]` ● `Process` 空实现（`:20`）意味着实例化后既不消费字符也不推进 `context.Index`——只能靠驱动层的 no-progress 守卫兜住（`syntax-context.xl.md:89-94`）。设计中不存在「什么都不做的 token」。证据 `independent-token.xl.md:20`、`:29`。
- 结论：偏离（1 条，明确）。

### core/syntax/message.xl.md（449B / 1 行；`Message`/`MessageTypes`）
- 结构：消息基类 + 消息类型枚举（只有 `None`）。
- 偏离：
  - `[X1]` ○ 设计只定义了一种消息（`Reload Message`，R17④），这里却先铺了 `MessageTypes` 与 `Target/ProcessOwner` 骨架，类型只有 `None`，`ReloadMessage.Type` 也返回 `None`（`messages/reload-message.xl.md:45`）——类型系统空转。证据 `message.xl.md:9-11`。
- 结论：符合（1 条外挂，疑似）。

### core/syntax/branch-transiter.xl.md（367B / 0 行；`BranchTransiter`）
- 结构：一个函数类型别名：`(context, unit, buffer, index, value) => BranchStates`。
- 偏离：
  - `[X1]` ● 这个别名是「每字符转发链」的地基：`Token.ProcessQueue` 里装的就是它，`UnitToken.Process` 每个字符都按链跑一遍（`unit-token.xl.md:99-118`）。IMPORTANCE 的触发模型是「basic token 关闭 / bracket 创建 → possible」，没有「每字符过一遍候选链」这一层。证据 `branch-transiter.xl.md:11`。
- 结论：偏离（1 条，明确）。

### core/syntax/compute-possible-shapes-states.xl.md（100B / 0 行；枚举）
- 结构：`Nothing / Waiting / Built` 三态。
- 结论：符合（`Nothing` 是 R25 的越界返回值，`Waiting` 对应 R28/R29/R30，`Built` 对应 R27/R30）。

### core/syntax/shape-states.xl.md（86B / 0 行；枚举）
- 结构：`Reject / Accept / Uncertain` 三态。
- 结论：符合（R26 的 `Accept`/`Uncertain` 同义、`Reject` 淘汰，枚举本身给了正确词汇）。

### core/syntax/branch-states.xl.md（80B / 0 行；枚举）
- 结构：`Undo / Done / Reload` 三态，供转发器返回。
- 偏离：
  - `[X1]` ○ 枚举本身无害，但它是转发器机制的返回值域；`Undo` 被当作「本字符不归我」广泛使用（见 `common/symbol` 的 `Transit`），与 R24「禁止跳跃式处理」是同一条缝。证据 `branch-states.xl.md:5-7`。
- 结论：符合（1 条外挂，疑似）。

### core/syntax/possible-source.xl.md（78B / 0 行；枚举）
- 结构：possible 的两个来源 `Close` / `BracketCreate`。
- 结论：符合，且**是设计意图的正面证据**：R13 说 possible 有两个来源（close 与 bracket create），这个枚举正好是那两个值（`possible-source.xl.md:5-6`）。

### core/syntax/close-states.xl.md（69B / 0 行；枚举）
- 结构：`Nothing / Built` 两态，`Close` 的返回值。
- 结论：符合（`Built` 用于「关闭时顺带 build 出了形状」的传播，对应 R17③ 的 `Reclose` 链路）。

---

## 本批统计

- 文件数：20；有偏离：13（明确 9）；完全符合：7。
- 按编号计数：`X1:13`、`R19:3`、`U4:3`、`B2:2`、`P1:1`、`P2:1`、`P3:1`、`R1:1`、`B1:1`、`B3:1`、`B4:1`、`S1:0`。
- 本批最严重 3 条：
  1. `[X1]` 每字符转发器（`branch-transiter` + `Token.ProcessQueue` + `UnitToken.Process`）——设计外的一整层驱动，是后续所有「跳跃/撤销/Reload 兜底」问题的源头。
  2. `[R1]` `ShapeToken` 基类自带 `ExitOrPre` 实现，R33「禁止覆盖」形同虚设。
  3. `[U4]/[R19]` 基类不负责在 `Close` 丢弃 basic token、`AstOperator` 在 AST 阶段回读源码——R19/R20 的「build 时提取、close 后只剩子形状」没有骨架级保障。
