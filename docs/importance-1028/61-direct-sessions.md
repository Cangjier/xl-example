# 61 设计偏离审计 — typescript/tokens/direct 的四个会话（control / export / declaration / function）

审计对象为本批 **4** 个文件，均已逐行读到物理末行；判据取自 `01-rules.md`（R01–R36，编号 `S1…D1`），事实表取自 `_facts/typescript-tokens-direct.md`，行号为 `read` 返回的真实行号（各文件全文行数：control **1444**、export **769**、declaration **536**、function **533**；事实表的「代码行」只数围栏内代码）。只读源码，未改任何源码与 `docs/IMPORTANCE.md`。

本批的共同前提（背景资料，已定为事实，本文件只是引用）：`direct-*` 是**完全绕开 shape/possible/end 的会话式建造器**——`DirectSession` 约定 `Ingest(units, context)` + `Finish(endIndex, context)`（`direct-build-session.xl.md:9-28`），`DirectBuildRouter` 按 kind 从工厂表 `new` 出 session（`direct-build-router.xl.md:35-49`），失败 `Declined` 让语句壳退回 legacy；`statement-shape.xl.md:346-349` 是「新路径优先、失败再 legacy」的证据。第 40 篇判 `type-builder` 是设计外的解析器，第 50 篇审 `expression-builder`，第 60 篇审 `direct-expression-engine`。本批审的是**会话层本体**：谁在建语句 / 声明 / export 的 AST，以及它与同一族 possible 的关系。

---

### typescript/tokens/direct/direct-control-session.xl.md（59977B / 1163 代码行（全文 1444 行）；ControlFlowStatementDirectSession）

- 结构：**会话层（DirectSession 的唯一「语句族」实现）**，不是 basic token、不是 shape、不是 possible/end。`# class ControlFlowStatementDirectSession implements DirectSession`（`:48`）一个类承担 `ShellStatementFamily(4)` / `ShellBlock(5)` / `ShellLabel(6)` 三种壳（注册表 `direct-build-plugins.xl.md:48-50`），把壳里**整段 raw 单元**折成 `code/codeAt` 后递归建出 `EmptyStatementShape` / `BlockShape` / `IfStatementShape` / `While` / `Do` / `For` / `ForIn` / `ForOf` / `Return` / `Throw` / `Break` / `Continue` / `Try` / `Switch` / `CaseBlock` / `With` / `Debugger` / `Labeled` / `Yield` / `Await` 共 20 余种节点。全文 `ParseFromShape` **0** 处、`PossibleShape`/`ComputeByIndex`/`tokenIndex`/`CatalogGuide`/`GetState`/`SetState`/`GetRaw` 各 **0** 处，`new XxxShape(` **17** 处，`TryToClose(` **9** 处，`Span(` **14** 处，`catch` **1** 处，`Decline(` **46** 处。

- 偏离：

  - `[S4]` ● AST 由本类直接建，`ParseFromShape` 全文 0 处：节点用 `new XxxShape(this.Template)` 现造、子节点按 TS children 顺序 `Add`、区间/关闭由 `Span` 就地完成 — 证据 `direct-control-session.xl.md:517-519`（`const shape = new IfStatementShape(this.Template); shape.Add(condition); shape.Add(thenStatement);`）、`:541-543`（`DirectStatementAssembly.Span(shape, code[from], code[toExclusive - 1], ...)`）、`:813-826`（`new ForStatementShape` + 三个可选槽 `Add` + `Span`）、`:1268-1274`（`new SwitchStatementShape` + `Span` 到 case 块 `}`）
  - `[X2]` ● 这条旁路是**默认路径**、不是备选：kind 4/5/6 全注册到本类（`direct-build-plugins.xl.md:48-50`），`BuildFromShell` 在 `new StatementBuilder` **之前**先调 `direct.Finish`，只有 `direct === null || direct.Declined` 才落到 legacy — 证据 `typescript/tokens/statements/statement-shape.xl.md:350-353`（`if (direct !== null && !direct.Declined) { let directBuilt:Token | null = null; try { directBuilt = direct.Finish(endIndex, context);`）、`:448-449`（`const builder = new StatementBuilder(host.Template, context); builder.Load(consumed, shell.Pos);`）、`:502-506`（`built = StatementFamilyDispatch.Build(builder, shell.Kind); if (built === null) { ... built = builder.BuildStatement(); }`）
  - `[X1]` ● 设计外的四件套：注册表 + 指标计数器 + `--strict` 开关 + 从宿主壳鸭子类型读 `Kind`。`(owner as any).Kind` 让 router 的 `Create(kind, …)` 的 kind 又要从壳上再读一次（router 不传 kind，见 `direct-build-router.xl.md:46`） — 证据 `:118`（`this.Kind = (owner as any).Kind === undefined ? 0 : (owner as any).Kind;`）、`:172-176`（`DirectBuildMetrics.Declined += 1; DirectBuildMetrics.NoteDecline(reason, category); if (DirectBuildMetrics.Strict) { ... throw new Error("DirectBuild strict: " + reason + " [" + this.Summary() + "]"); }`）、`:184-188`（`DirectBuildMetrics.IncompleteFallback += 1; ... StrictViolations += 1;`）、`:294-295`（`StatementsBuilt += 1; Trace("control built: " + this.HeadText + " units=" + String(code.length));`）、`:106`（`## static field AcceptedHeads:Array<string> = [";", "if", "while", ...]`）
  - `[C2]` ● 整段重建：`Ingest` 只在**首代码单元**那一格做判定，其余结构一律留到 `Finish` 对 `[0..endIndex]` 重扫成两张平行数组，注释自陈这样取舍 — `:194-215`（`if (this.FirstCodeAt < 0) { this.FirstCodeAt = at; this.RecognizeHead(unit); }`）、`:196-197`（`// B1 的唯一 Ingest 期判定是「首代码单元是不是本类接手的起点」——其余结构判定全在 Finish，` / `// 因为每一条都要看整段（if 的 else 链、do 的 while 尾、for 头的分号数），逐格状态机没有收益。`）、`:276-289`（`for (let at = 0; at <= endIndex && at < this.Units.length; at++) { ... code.push(this.Units[at]); codeAt.push(at); }` + `const shape = this.BuildRange(code, codeAt, 0, code.length);`）
  - `[C1]` ● 每轮重扫、无 cache 复用：同一段头部要扫两遍才拿到两个 `;`，单语句体的边界靠一条线性扫，块体残留再全扫一遍括号 `Data` — 证据 `:732-741`（`for (let at = 0; at < innerCode.length; at++) { if (this.IsSymbolText(innerCode[at], ";")) { semicolons = semicolons + 1; continue; } if (inOfAt < 0 && (...)) { inOfAt = at; ...`）、`:761-770`（第二次 `for` 只为取 `semi1` / `semi2`）、`:562-571`（`while (end < toExclusive) { ... if (this.IsSymbolText(code[end], ";")) { return end + 1; } end = end + 1; }`）、`:451-457`（`for (const unit of (bracket as any).Data) { if (unit.IsTriviaToken || !unit.IsBasicToken) { continue; } this.Decline("块体内还有未建树的裸单元", "stmt.body");`）
  - `[B2]` ● 单语句体 `class` 处 `catch` 把 `BuildFromCode` 的异常吃掉、只降级成 `Decline`，注释直接写「整段放弃」 — 证据 `:410-417`（`try { shape = ClassDeclarationShape.BuildFromCode(this.Owner as Token, slice, basePos, this.Context, allowAnonymous); } catch (error) { const message = error instanceof Error ? error.message : String(error); this.Decline("语句位类声明形状失败: " + message, "decl.class"); return null; }`）
  - `[B4]` ○ 收口点拿到的是**未截断**的整段：`this.Units = units` 原样收下壳的全部 `Data`（壳可能已吞进下一条语句），`Finish` 只在折 `code` 时截到 `endIndex`，但 `BuildBlock`(451) / `BuildCaseBlock`(1289-1350) / `BuildStatementClass`(411 把整个壳当 host) 三处读取都没有 `endIndex` 上界 — 证据 `:203`（`this.Units = units;`）、`:232`（`for (let at = 0; at <= endIndex && at < this.Units.length; at++)`，唯一有上界的一处）、`:1144`（`const head = inner[innerCodeAt[0]];`）+ `:1290-1345`（case 子句循环全程按 `innerCodeAt.length` 走）
  - `[C3]` ○ cache 语义完全未落地：`GetState`/`SetState`/`GetShare`/`SetShare` 各 0 次，中间态全在 12 个实例字段里（`Ingested`/`Kind`/`HeadText`/`LabelText`/`StoppedAt`/`Units`/`HasUnits`/`FirstCodeAt`），既不是 possible 的 `state`（build 后 reset）也不是 `share` — 证据 `:90-104`（`## field Ingested:int = 0` … `## field FirstCodeAt:int = -1`）、`:205-207`（`while (this.Ingested < units.length && !this.Declined) { const at = this.Ingested; this.Ingested = at + 1;`，游标只增不减、无 reset 口）
  - `[P2]` ○ 候选判定五条（R26–R30）在会话层整体缺席：没有 `Accept`/`Reject`/`Uncertain`、没有 `IsBuildable`、没有「`Candidates == 0` ⇒ `BuildByIndex`（`SignOut`→`TryToClose`→`Quit`）」，替代物是**一个粘性布尔** + 一个 category 字符串 — 证据 `:78-82`（`## field Declined:bool = false` / `## field Reason:string = ""` / `## field Finished:bool = false`）、`:164-178`（`Decline`：`if (this.Declined) { return; } this.Declined = true; this.Reason = reason;`）
  - `[P3]` ○ build 产物**没有去向**：会话自己签范围 + 关闭（`Span` → `SignIn`/`SignOut`/`Pos`/`TryToClose`），但既不 `SignOut` 到壳、也不 `host.MountedUnit = shape`，splice 由调用方做 — 证据 `typescript/tokens/direct/direct-statement-assembly.xl.md:76-83`（`shape.SignIn(head.SourceRange.StartIndex); ... shape.SignOut(tail.SourceRange.EndIndex); shape.Pos = pos; shape.TryToClose(context);`）、`statement-shape.xl.md:380`（`host.Data.splice(0, consumed.length);`）、本文件 `:990-991`（手写关闭：`shape.Pos = DirectStatementAssembly.PositionAt(...); shape.TryToClose(this.Context);`）

#### `Declined` 的语义：是「不认领」还是「建失败」（本批四文件共用口径）

- `[X1]` ● **两种语义被压成同一个布尔**，调用方无法区分：范围外走 `Decline`（`RecognizeHead:247` `"控制流起点不在本轮范围"`、`BuildRange:392-394` `"单语句体不在本轮范围"`），建不出来也走 `Decline`（`:410-417` `"语句位类声明形状失败: " + message`、`:419` `"语句位类声明形状为空"`、`:424-426` `"语句位类声明形状覆盖不一致"`）。对 `BuildFromShell` 而言两者完全等价（都是「回 legacy」），差别只留在 `DeclineReasons` 的 category 键上（`direct-build-metrics.xl.md:76-80` `NoteDecline`）。
- `[B2]` ● 与 R23 的关系必须说清：R23 禁止的是 **possible 的 compute/build 里 catch 掉异常**；会话不是 possible，字面上不受该条约束 —— 但它在**同一位置**（建树失败）做的正是 R23 想禁止的事：异常 → `Decline` 布尔 → 同一段 raw 被 legacy 重读一次（`statement-shape.xl.md:448-449`）→ 解析照旧成功。用户看到的是一棵「换条路建出来」的树，而不是诊断。
- `[X1]` ● 更隐蔽的一层：`--strict` 下 `Decline` 会**主动抛错**（`:176`），而这个抛错又被上层两处 `catch` 接住 —— `BuildFromShell` 的 `try`（`statement-shape.xl.md:354-370`，并按 `message.indexOf("DirectBuild strict") !== 0` 决定**不计** `Errors`）与 `DirectStatementHook.Attach` 的 `try`（`direct-statement-hook.xl.md:46-59`，同一条判据）。于是「严格的诊断」也被兜住，只剩一行 `Trace`：异常在三条链上（会话内部 catch / hook catch / BuildFromShell catch）都到不了用户。

#### 方法:行 分布（34 项，行数为「含标题行到下一标题前」）

| 方法 | 行 | 行数 | 判定 |
| --- | --- | --- | --- |
| `constructor` | 108 | 12 | `X1` 鸭子类型读 `Kind`（118） |
| `TextOf` / `IsText` / `IsSymbolText` | 121 / 127 / 133 | 各 5 | 复用 `DirectStatementAssembly`（无第二份符号表） |
| `IsOpenParen` / `IsOpenBrace` | 139 / 145 | 各 5 | 纯 `instanceof Bracket` 判据 |
| `IsDeclarationKeyword` | 151 | 12 | `X2` 把 `let/const/var/using` 表交给声明族（156） |
| `Decline` | 164 | 15 | `X1`/`P2` 粘性布尔 + 指标 + strict 抛错 |
| `Incomplete` | 180 | 11 | 第二个降级通道（`IncompleteFallback`） |
| `Ingest` | 192 | 26 | `C2` 只判首格；`X1` 双游标（`Units` vs 参数 `units`） |
| `RecognizeHead` | 219 | 30 | `X1` `ShellLabel` 分支按 `Kind` 走；首个 `Decline` 点（247） |
| `Finish` | 250 | 48 | `C2` 全段折 `code/codeAt`（276-289）；唯一 `endIndex` 上界 |
| `BuildRange` | 299 | 99 | `C1` 纯文本表分派（20 个 `if`）；递归入口 |
| `BuildStatementClass` | 399 | 31 | `B2` 唯一 `catch`（412）；`B4` 整壳当 host（411） |
| `BuildBlock` | 431 | 29 | `C1`/`B4` 全扫括号 `Data`（451） |
| `BuildCondition` | 461 | 10 | 交给表达式引擎（`ExpressionOf`） |
| `BuildIf` | 472 | 73 | `S4` `new IfStatementShape`（517）；`C1` 悬垂 `else` 递归 |
| `StatementExtent` | 546 | 28 | `C1` 线性扫到 `;`/`else`（563-571） |
| `IfExtent` | 575 | 20 | 悬垂 `else` 归属递归（复刻 TS 规则） |
| `BuildWhile` | 596 | 28 | `S4` `new WhileStatementShape`（617） |
| `BuildDo` | 625 | 59 | `C1` 扫到 `while`（647-649） |
| `BuildFor` | 685 | 143 | `C1` 头部两次全扫（732-741 / 761-770）；`X2` 声明头转 `DirectDeclarationAssembly`（775） |
| `BuildForInOf` | 829 | 64 | `S4` + `X1` 手写 `AwaitKeywordShape`（875-884） |
| `BuildReturnThrow` | 894 | 35 | `S4` 两形状二选一（919-921） |
| `BuildYield` | 930 | 69 | `S4` 手签 + `TryToClose`（984-991） |
| `BuildAwait` | 1000 | 38 | 整条尾段交引擎（1025-1026） |
| `BuildBreakContinue` | 1039 | 42 | `S4` + `Span`（1071-1078） |
| `BuildDebugger` | 1082 | 16 | 最小形状（无子节点） |
| `BuildWith` | 1099 | 29 | `S4` 体走同一 `BuildRange` |
| `BuildCatchBinding` | 1129 | 33 | `X2` 转 `DirectDeclarationAssembly.IdentifierBinding`（1151） |
| `BuildTry` | 1163 | 74 | `S4` `Data=[Block, CatchClause?, Block?]` |
| `BuildSwitch` | 1238 | 38 | `Span` 到 case 块 `}`（1272-1273） |
| `BuildCaseBlock` | 1277 | 126 | `S4` 手签 + 手关（1393-1400）；`B4` 全扫（1290-1345） |
| `BuildLabeled` | 1404 | 33 | `S4` `new LabeledStatementShape`（1431） |
| `Summary` | 1438 | 7 | `X1` 诊断字符串（`ingested=`/`units=`/`declined(...)`） |

- 结论：**偏离（10 条：`S4`×1、`X2`×1、`X1`×1、`C2`×1、`C1`×1、`B2`×1、`B4`×1、`C3`×1、`P2`×1、`P3`×1；其中 ● 6、○ 4）**。它是语句族（控制流 / 块 / 标签）在收口点的**第二套建树器**，且是默认路径；形态判据（`if` 的 `else` 链、`do` 的 `while` 尾、`for` 头的分号数、`case` 的三元冒号深度）全部靠**整段重扫**得到，逐格状态机被明确放弃。
- **与同一族 possible 的关系 = 并行（不是替代）**：`ControlFlowStatementPossibleShape.BuildByIndex` 照旧建壳（`control-flow-statement-possible-shape.xl.md:171`、`:232` `const shell = new StatementShape(host.Template);`），并在 `return shell` 之前调 `DirectStatementHook.Attach(shell, context)`（`:285`）把会话挂到壳上；收口时 `BuildFromShell` 先问会话（`statement-shape.xl.md:350`），Decline 后**同一个函数体内**再 `new StatementBuilder` + `StatementFamilyDispatch.Build` + `BuildStatement()`（`:448`、`:502-506`）。所以 possible/end 一件都没少，被替换的只是「终结候选 BuildByIndex 里的建树」这一半（R27 的 `SignOut`→`TryToClose`→`Quit` 由会话的 `Span` + 一个布尔取代，`Quit` 无处可调）。
- 合规面：`S1`=0（只读 basic token，不造 token：仅 `TextOf`/`instanceof` 判据，无 `new Common`/`new Symbol`）；`S2`=0（possible/end 未取消，见上）；`S3`=0（子节点顺序 = `Data` 顺序 = TS children，`Span` 前先 `Add` 完）；`U1`/`U4`=0（消费过的 basic 单元由调用方 `host.Data.splice` 丢弃，会话自身不保留副本，`:451-457` 反过来把「括号里还剩 basic 单元」当**失败判据**）；`U2`/`U3`=0（无自造回挂通道）；`B1`=0（`code[from+1]`、`code[toExclusive-1]` 前均有 `from/toExclusive` 守卫，如 `:477`、`:1051-1053`）；`B3`=0（严格按 `from..toExclusive` 顺序推进，无跳过）；`R1`/`R2`=0（不覆盖 `ExitOrPre`/`ComputePossibleShapes`）；`X3`=0；`D1`=0（围栏外 0 行散文，唯一 `txt` 围栏 `50-68` 是形态示例）。

---

### typescript/tokens/direct/direct-export-assembly.xl.md（37356B / 612 代码行（全文 769 行）；DirectExportAssembly）

- 结构：**装配层（既不是 possible、也不是 session 的第三类建树单位）**。`# class DirectExportAssembly`（`:53`）不是 `DirectSession` 实现：没有 `Ingest`/`Finish`/`Declined`/`Owner`，只有 `LastReason` 一个静态串（`:67`）+ **18 个静态方法**；它把 `export` / `import` / `declare` / `using` 的整段折成 `code`/`codeAt` 后按文件头那张表分派（`:35-51`），由 `ModuleFamilyDirectSession` / `DeclarationFamilyDirectSession` 调进来（`direct-declaration-session.xl.md:370`、`:389`）。全文 `ParseFromShape` **0** 处、`FromUnits(` **10** 处（`ImportDeclaration`/`ImportEqualsDeclaration`/`ExportDeclaration`/`NamespaceExportDeclaration`/`ModuleDeclaration`/`InterfaceDeclaration`/`TypeAliasDeclaration`/`EnumDeclaration`/`FunctionDeclaration`×2）、`catch` **8** 处、`new XxxShape(` **5** 处、`Data.splice(` **2** 处、`Parent = ` **2** 处。

- 偏离：

  - `[X2]` ● legacy 整段重建被**内联成直建的主干**，不是回退：10 处直接调 legacy 形状工厂，按 `(host, start, end)` 让它们从同一段 raw `Data` 重读 — 证据 `:267-270`（`const hostLike:any = { Data: host, Template: template }; let shape:Token | null = null; try { shape = ExportDeclarationShape.FromUnits(hostLike, codeAt[0], host.length - 1, context);`）、`:315`（`ImportEqualsDeclarationShape.FromUnits`）、`:330`（`ImportDeclarationShape.FromUnits`）、`:429`（`ModuleDeclarationShape.FromUnits(code, positions, context)`）、`:467`（`ClassDeclarationShape.BuildFromCode(owner, innerCode, innerPos, context, anonymous)`）、`:469`/`:471`/`:473`（`Interface`/`TypeAlias`/`Enum` 的 `FromUnits`）、`:479`（`FunctionDeclarationShape.FromUnits(hostLike, startAt, lastAt, context, false, modifierCount >= 2)`）、`:575`（`NamespaceExportDeclarationShape.FromUnits`）、`:634`（`declare function` 的 `FromUnits`）
  - `[X1]` ● 「装配层」本身是设计外的第三种建树单位：一个 612 行的静态工具类，承担了本应由 shape/possible 承担的族分派（`export as` / `export =` / `export default` / `export declare` / `export import` 五条特殊头的判据全部写在这里），并通过 `hostLike:any = { Data, Template }` **伪造宿主对象**去骗 legacy 工厂 — 证据 `:53`（`# class DirectExportAssembly`，无基类、无接口）、`:456`（`const hostLike:any = { Data: data, Template: template };`）、`:572`（`const hostLike:any = { Data: host, Template: template };`）、`:631`（同款）、`:589-597`（`BuildDeclare` 的注释自陈「`declare` **不是独立形状** … 四个分支的共同点」）
  - `[B2]` ● 8 处 `catch` 把 legacy 工厂的异常降级成一句 `LastReason` 字符串 + `null`，异常本体不上升；其中 `BuildInner` 的 catch 罩住**九条分支的全部异常** — 证据 `:271-275`（`} catch (error) { const message = error instanceof Error ? error.message : String(error); DirectExportAssembly.LastReason = "export 子句形状失败: " + message; return null; }`）、`:316`、`:331`、`:430`、`:498-502`（`} catch (error) { ... LastReason = "export 内层声明形状失败(" + headText + "): " + message; return null; }`）、`:576`、`:617`、`:635`
  - `[C2]` ● 整段重建 + **为满足 legacy 前置条件而伪造 basic token**：`ClauseHost` 在副本末尾 `push` 一个零宽虚拟 `;`（`new Symbol`），只为让硬要求末 `;` 的工厂能开工 — 证据 `:160-178`（`if (tail instanceof Symbol && (tail as Symbol).Is(";")) { return data.slice(0, lastAt + 1); } ... const work:Array<Token> = data.slice(0, lastAt + 1); const semi = new Symbol(template); semi.SignIn(tailEnd); semi.AppendValueAndSignOut(";", tailEnd - 1); work.push(semi);`）
  - `[S1]` ○ basic token 层被越权：虚拟分号是**语法层自己造的 basic token**（`new Symbol(template)` + `AppendValueAndSignOut`），不是 basic token 层产出的；它既不在源码里，也不在壳 `Data` 里，只活在 `hostLike.Data` 这个临时对象上 — 证据 `:174-177`、`:263`（`const host = DirectExportAssembly.ClauseHost(data, lastAt, template);`）
  - `[P3]` ● 手工挂载：修饰词不走 `Add`，而是 `built.Data.splice(0, 0, modifier)` 后手写 `modifier.Parent = built`，并把 `built.Pos` 直接覆盖成壳的 `basePos`；`Data`/`Parent` 的一致性由装配层自己维护 — 证据 `:523-538`（`if (index === 0) { modifier = ExportKeywordShape.FromBasicToken(unit as Common, context); } ... (modifier as ShapeToken).Pos = modifierPos; built.Data.splice(0, 0, modifier); modifier.Parent = built; ... (built as ShapeToken).Pos = basePos;`）、`:549-555`（`modifier.Pos = modifierPos; built.Data.splice(0, 0, modifier); modifier.Parent = built; (built as ShapeToken).Pos = modifierPos;`）
  - `[C1]` ● 每轮重扫、O(n²)：`PosAt` 每次调用都从 0 累加到 `index`，而 `PrependModifiers` 在循环里对每个修饰词各调一次 — 证据 `:87-93`（`let pos = basePos; for (let at = 0; at < index && at < code.length; at++) { const end = code[at].SourceRange.EndIndex; if (end >= 0) { pos = end; } }`）、`:518-521`（`while (index >= 0) { const unit = code[index]; const modifierPos = DirectExportAssembly.PosAt(code, index, basePos);`）、`:211-216`（为找 `=` 扫全段）、`:298-303`（`BuildImport` 再扫一遍同一段找 `=`）、`:723-726`（`BuildUsing` 的初始化器扫描）
  - `[B4]` ○ 绝对位置前瞻：族判定读「后面第 2、3 个代码单元」而不问它们是否已到达；`export default async ⏎ function` 这种换行敏感形态还要再看两格的**换行关系** — 证据 `:126-141`（`const second = code[2]; ... if (text === "async") { if (code.length > 3 && DirectExportAssembly.TextOf(code[3]) === "function") { return StatementScanner.NoLineBreakBetween(second, code[3]); } return false; }`）、`:143-147`（`if (text === "abstract" || text === "declare") { if (code.length > 3 && !StatementScanner.NoLineBreakBetween(second, code[3])) { return false; } }`）
  - `[P2]` ○ 无候选语义（同 control）：失败只有一个静态 `LastReason` + `null` 返回，没有 `Accept`/`Reject`/`IsBuildable`；「谁该建」由 `Build` 里 20 个 `if` 的**顺序**决定 — 证据 `:187-252`（`DirectExportAssembly.LastReason = ""; if (code.length === 0) { ... } if (afterText === "as") { ... } if (afterText === "import") { ... } ...`）

#### 方法:行 分布（18 项）

| 方法 | 行 | 行数 | 判定 |
| --- | --- | --- | --- |
| `TextOf` | 69 | 6 | 复用 `DirectStatementAssembly.TextOf` |
| `IsSymbolText` | 76 | 5 | 纯 `Symbol.Is` |
| `PosAt` | 82 | 14 | `C1` 每次从头累加（88-93） |
| `IsDeclarationHead` | 97 | 17 | `X1` 手抄 legacy 的声明头闭集（109-112） |
| `IsDefaultDeclarationHead` | 115 | 36 | `B4` 读 `code[2]`/`code[3]`（129-147） |
| `ClauseHost` | 152 | 28 | `C2`/`S1` 伪造虚拟分号（173-177） |
| `Build` | 181 | 73 | `X1` 20 个 `if` 的族分派（202-251） |
| `BuildClause` | 255 | 28 | `X2` `ExportDeclarationShape.FromUnits`（270）+ `catch`（271） |
| `BuildImport` | 284 | 59 | `X2` 两条 `FromUnits`（315/330）+ 两个 `catch` |
| `BuildVariable` | 344 | 35 | `S4` 真直建（`new VariableStatementShape` 361/373）+ 空列表恢复形（354-366） |
| `BuildAssignment` | 380 | 30 | `S4` 真直建（`new ExportAssignmentShape` 402）；`Span` 后重复赋 `Pos`（406-407） |
| `BuildModuleShape` | 411 | 30 | `X2` `ModuleDeclarationShape.FromUnits`（429）+ `catch`（430） |
| `BuildInner` | 442 | 69 | `X1` 九分支分派 + **一个 catch 罩全部**（459-502） |
| `PrependModifiers` | 512 | 29 | `P3` `Data.splice` + `Parent =`（534-535） |
| `PrependDeclare` | 542 | 16 | `P3` 同款（553-554） |
| `BuildNamespaceExport` | 559 | 29 | `X2` `FromUnits`（575）+ `catch`（576） |
| `BuildDeclare` | 589 | 87 | `X1` 四分支共用（`declare` 非独立形状）；`X2`（607/616/634）；两个 `catch`（617/635） |
| `BuildUsing` | 677 | 93 | `S4` 真直建；判据是 `ListFrom` 的**第二份**（684-686 注释自陈） |

- 结论：**偏离（9 条：`X2`×1、`X1`×1、`B2`×1、`C2`×1、`S1`×1、`P3`×1、`C1`×1、`B4`×1、`P2`×1；其中 ● 6、○ 3）**。它是本批**最矛盾**的一个文件：一边以「直建」命名，一边把 10 处 legacy `FromUnits` 当主干调用，真正自己造节点的只有 `BuildVariable` / `BuildAssignment` / `BuildUsing` 三个方法（`new VariableStatementShape` :361/:373、`new ExportAssignmentShape` :402、`new VariableDeclarationListShape` + `new VariableStatementShape` :699/:765）。「直建」的边界不是设计定的，而是 A6（`builder.Load` 调用数）逼出来的：注释反复写「`FromUnits` 内部 `new ExpressionBuilder`（A6 会红）」（`:226`、`:384`），于是凡是不拉 builder 的形态就调 legacy 工厂，凡是拉的形态才自己装配。
- **与同一族 possible 的关系 = 并行且**共用同一批工厂**（不是替代）**：`export` 族自己的 possible 也调同一批 `FromUnits`（`export-declaration-possible-shape.xl.md:688`/`:690`/`:692`/`:816`/`:828`/`:838`/`:880`/`:912`/`:933`/`:994`/`:1134`/`:1230`，`BuildByIndex` 在 `:573`），终结候选另有 `export-declaration-end-possible-shape.xl.md:185`。所以同一段 `export …` 存在**两条建树入口**，且两者最终落到**同一个工厂**——「两套都能建、谁先赢」在这里退化成「谁先调 `FromUnits`」。
- 合规面：`S4` 未记（本文件不实现 `DirectSession`，无 `Finish` 可谈「AST 由关闭后的 shape 产出」；真正的 `S4` 落在调用它的 `ModuleFamilyDirectSession` / `DeclarationFamilyDirectSession` 上）；`U1`/`U2`/`U3`/`U4`=0（虚拟分号只活在临时 `hostLike.Data` 上，不写回壳）；`B1`=0（`code[lastCodeIndex]`、`data[lastAt]` 取用前都有 `length` 守卫，如 `:160-163`、`:449-452`、`:600-603`）；`B3`=0；`R1`/`R2`=0；`X3`=0；`D1`=0（围栏外 0 行散文；`:35-51` 那张表的 `#` 前缀是标题不是散文）。

---

### typescript/tokens/direct/direct-declaration-session.xl.md（21327B / 355 代码行（全文 536 行）；DeclarationFamilyDirectSession）

- 结构：**会话层（DirectSession 的「声明族」实现，同时是第二族转发器）**。`# class DeclarationFamilyDirectSession implements DirectSession`（`:21`）接 `ShellDeclarationFamily(7)`（注册见 `direct-build-plugins.xl.md:52`），按首代码单元分 9 类头（`HeadNone…HeadUsing`，`:40-56`），`interface` / `type` / `enum` 三族**委托 legacy 工厂**建树（`FromUnits`），`import`/`export`/`namespace`/`module`/`declare` 整段转交第二个会话 `ModuleFamilyDirectSession`（`:86`、`:366-369`），`using` 走同一转发但改 category（`:378-395`），`class`/装饰器在**第一次喂入就 Decline**（`:159-163`）。全文 `ParseFromShape` **0** 处、`FromUnits(` **3** 处、`catch` **3** 处、`new XxxShape(` **0** 处。

- 偏离：

  - `[S4]` ● AST 不是由关闭后的 shape 产出，而是 `FromUnits(owner, start, end)` 现建：`interface` / `type` / `enum` 三族各一句，且**都传 `start=0`**（即以壳的 `Data[0]` 为起点重读整段） — 证据 `:431`（`shape = InterfaceDeclarationShape.FromUnits(this.Owner as Token, 0, bodyIndex, this.Context);`）、`:455`（`shape = TypeAliasDeclarationShape.FromUnits(this.Owner as Token, 0, lastIndex, this.Context);`）、`:503`（`shape = EnumDeclarationShape.FromUnits(this.Owner as Token, 0, bodyIndex, this.Context);`）
  - `[X2]` ● 三条主干全部是 legacy 整段工厂（这就是「直建」的全部内容），且 `start=0` 让工厂**从壳的第一个单元**重读，等于把 possible 已经做过的增量判定作废 — 证据 `:428-431`（`try {` + `// FromUnits 的 start=0 让内部 host.Data[start-1] 取不到前一个单元（pos=0），所以建完必须用壳自己的 Pos 覆盖` + `shape = InterfaceDeclarationShape.FromUnits(...);`）、`:429-430`（注释自陈「建完必须用壳自己的 Pos 覆盖（`R5-CONTRACT §2.2` 陷阱 ① / R5-R2）」）→ `:441`（`shape.Pos = this.BasePos;`）
  - `[X1]` ● 一个 kind 两个族、两层会话：`Module:ModuleFamilyDirectSession | null` 字段懒建第二个 session，两处转发（`BuildModuleFamily` / `BuildUsingDeclaration`）只是**失败 category 不同**，建树逻辑完全重复 — 证据 `:86`（`## field Module:ModuleFamilyDirectSession | null = null`）、`:366-370`（`if (this.Module === null) { this.Module = new ModuleFamilyDirectSession(this.Template, this.Context, this.BasePos, this.Owner as Token); } const shape = this.Module.Build(code, codeAt);`）、`:385-389`（同款五行，只把 category 换成 `"decl.head"`）、`:98`（`this.Kind = (owner as any).Kind === undefined ? 0 : (owner as any).Kind;`）
  - `[B2]` ● 3 处 `catch` 把 `FromUnits` 的异常降级成 `Decline` + 一句中文；`interface` 那一处连 `error` 之外的上下文都不带 — 证据 `:432-436`（`} catch (error) { const message = error instanceof Error ? error.message : String(error); this.Decline("接口声明形状失败: " + message, "decl.shape"); return null; }`）、`:456-460`、`:504-508`
  - `[C2]` ● 整段重建：`Ingest` 只做两件纯 token 判定（kind 早拒 + 首格识别），结构判定全留 `Finish`，注释自陈 — 证据 `:146-150`（`// Ingest 期只做两件**纯 token** 判定 … // 结构判定全部在 Finish（要整段已就位：体括号闭合、类型别名读到 ; / ASI）。`）、`:165-176`（`while (this.Ingested < units.length && !this.Declined) { ... if (this.FirstCodeAt < 0) { this.FirstCodeAt = at; this.ApplyHead(unit); } }`）、`:293-301`（`for (let at = 0; at <= endIndex && at < this.Units.length; at++) { ... code.push(this.Units[at]); codeAt.push(at); }`）
  - `[C1]` ● 每轮重扫、判定重复：头识别做**两遍**（首格一遍、收口再一遍）只为做一致性核对，区间覆盖再比一遍 — 证据 `:230`（`const kind = this.RecognizeHead([unit]);`）、`:308`（`const headKind = this.RecognizeHead(code);`）、`:313-316`（`if (headKind !== this.HeadKind) { this.Decline("声明头与收口区间不一致: " + this.HeadText, "decl.shape");`）、`:323-328`（`const expectedEnd = code[code.length - 1].SourceRange.EndIndex; if (!this.CoverageOk(shape, expectedEnd)) { ... "decl.coverage"`）
  - `[B4]` ○ 读取没有 `endIndex` 上界：`EnumMembersArePlain` 全量遍历**体括号的 `Data`**，`BodyBracketOf` 用 `code[code.length-1]` 判体，`Finish` 的 `expectedEnd` 也取最后一个代码单元 — 证据 `:477-484`（`for (const unit of body.Data) { if (unit instanceof Symbol && (unit as Symbol).Is("=")) { return false; } if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "[") { return false; } }`）、`:407-415`（`const lastAt = code.length - 1; const tail = code[lastAt]; ... return tail as Bracket;`）、`:323`
  - `[P3]` ○ 产物既不签范围也不关闭，全靠 legacy 工厂 + 一句 `Pos` 补丁：与会话应有的「签范围 / 取字段 / `TryToClose`」相比，这里连 `Span` 都没有，只有一个 `shape.Pos = this.BasePos` — 证据 `:441`、`:465`、`:513`（三处同款 `shape.Pos = this.BasePos;`）
  - `[P2]` ○ 无候选语义：`Decline`/`Incomplete` 两通道 + `Declined`/`Finished` 两布尔，没有 `Accept`/`Reject`/`IsBuildable`；`class`/装饰器的拒绝发生在 **Ingest 的第一次喂入**（比 possible 的 `Reject` 更早、且不可撤回） — 证据 `:159-163`（`if (this.Kind === StatementRoute.ShellClassDeclaration || this.Kind === StatementRoute.ShellDecoratedDeclaration) { this.Decline("类声明 / 装饰器声明属 R6（kind " + String(this.Kind) + "）", "decl.class"); return; }`）

#### 方法:行 分布（18 项）

| 方法 | 行 | 行数 | 判定 |
| --- | --- | --- | --- |
| `constructor` | 88 | 12 | `X1` 鸭子类型读 `Kind`（98） |
| `TextOf` / `IsSymbolText` | 101 / 108 | 6 / 5 | 复用装配层 |
| `Decline` / `Incomplete` | 114 / 130 | 15 / 11 | `P2` 粘性布尔 + 两套指标 |
| `Ingest` | 142 | 36 | `C2` 只判首格；`P2` 首次喂入即拒 class（159-163） |
| `RecognizeHead` | 179 | 41 | `C1` 被调两遍（230 / 308）；9 类头闭集 |
| `ApplyHead` | 221 | 45 | `X1` 有副作用的首格处理（Decline + trace） |
| `Finish` | 267 | 67 | `C2` 全段折 `code`；`C1` 头复核 + 覆盖校验 |
| `BuildDeclaration` | 335 | 22 | 五路分派（含两处转发） |
| `BuildModuleFamily` | 358 | 19 | `X1` 懒建第二会话（366-369） |
| `BuildUsingDeclaration` | 378 | 18 | `X1` 同款，只换 category（391） |
| `BodyBracketOf` | 397 | 20 | `X2` 复用 `TypeBuilder.IsBodyBrace`（412）；`B4` 取末单元 |
| `BuildInterface` | 418 | 28 | `S4`/`X2` `FromUnits`（431）+ `catch`（432）+ `Pos` 补丁（441） |
| `BuildTypeAlias` | 447 | 21 | 同款（455 / 456 / 465） |
| `EnumMembersArePlain` | 469 | 18 | `B4` 全扫 `body.Data`（477-484）；成员门（拒绝 `=`/`[`） |
| `BuildEnum` | 488 | 28 | 同款（503 / 504 / 513） |
| `CoverageOk` | 517 | 10 | `C1` 第三次判定（只比上界） |
| `Summary` | 528 | 9 | `X1` 诊断串（`kind` + `ingested` + `units`） |

- 结论：**偏离（9 条：`S4`×1、`X2`×1、`X1`×1、`B2`×1、`C2`×1、`C1`×1、`B4`×1、`P3`×1、`P2`×1；其中 ● 6、○ 3）**。这个会话的「直建」含量是本批最低的：**0 处 `new XxxShape`**，三族建树全是 legacy 工厂的一句调用，剩下的代码只做三件事——族分派、成员门（防 ExpressionBuilder）、覆盖校验。它存在的意义更像**一个准入门**：把「哪些声明族不许走 legacy 工厂」写成 before-`FromUnits` 的否决条件（`EnumMembersArePlain` `:469-486`），而不是自己建树。
- **与同一族 possible 的关系 = 并行 + 互相让位，且落到同一个 `FromUnits`（不是替代）**：`DeclarationStatementPossibleShape.BuildByIndex` 的注释写得很直白——「收口仍走同一份 legacy `FromUnits`」（`declaration-statement-possible-shape.xl.md:192`），未命中时「逐字落回 `super.BuildByIndex`」（`:163`、`:198`）；`control-flow-statement-possible-shape.xl.md:78-114` 还专门为 `enum`/`namespace`/`module`/`declare function` 写了**让位判据**（`if (b3cHeadText === "enum" || ... ) { return ShapeStates.Reject; }`），理由写在 `:75-77` 的注释里：不让位就会「同格双 Accept」。这就是「两套都能建、谁先赢」的直接证据——赢家由候选表顺序 / 让位判据决定，而不是由设计规定。
- 合规面：`S1`=0；`U1`/`U4`=0（不保留 raw 副本，`Data` 由调用方 splice）；`B1`=0（`code[0]` 前有 `code.length === 0` 守卫 `:302-305`，`codeAt[code.length-1]` 前有 `code.length < 3` 守卫 `:404-406`）；`B3`=0；`R1`/`R2`=0；`X3`=0；`D1`=0（围栏外 0 行散文；`txt` 围栏 `23-38` 是形态表）。

---

### typescript/tokens/direct/direct-function-session.xl.md（20399B / 383 代码行（全文 533 行）；FunctionDeclarationDirectSession）

- 结构：**会话层（DirectSession 的「函数声明」实现）**。`# class FunctionDeclarationDirectSession implements DirectSession`（`:22`）接 `ShellFunctionDeclaration(8)`（`direct-build-plugins.xl.md:51`），把 `[async?] function [*?] name ( params ) [: returnType] body` 这一段拆成六个子节点直建：`AsyncKeywordShape` / `AsteriskTokenShape` / `IdentifierShape` / `ParameterShape[]`（由 legacy `BuildParameters` 建）/ 返回类型（由 `DirectTypeAssembly` 建）/ `BlockShape`（由 `DirectStatementAssembly.BlockFrom` 收集）。全文 `ParseFromShape` **0** 处、`new XxxShape(` **5** 处、`catch` **0** 处、`DirectBuildMetrics.*` **8** 处。

- 偏离：

  - `[S4]` ● AST 由本类直接建：`new FunctionDeclarationShape` + 按 `FromUnits` 的子节点顺序 `Add`（async → `*` → name → params → returnType → body），区间/关闭由 `Span` 完成 — 证据 `:356`（`const shape = new FunctionDeclarationShape(this.Template);`）、`:403-410`（`shape.Add(name); for (const parameter of builtParameters) { shape.Add(parameter); } if (returnType !== null) { shape.Add(returnType); } shape.Add(block);`）、`:414`（`DirectStatementAssembly.Span(shape, head, body, this.BasePos, this.Context);`）
  - `[X2]` ● 两个子结构仍复用 legacy 工厂，且理由被写成「因为 `FromUnits` 在体内会 `new StatementBuilder`」——直建与 legacy 的边界由 A6 计数决定，不由设计决定 — 证据 `:261`（`// 不调用 FunctionDeclarationShape.FromUnits 的理由见文件头注释（它有体会 new StatementBuilder）。`）、`:388-389`（`const builtParameters = FunctionDeclarationShape.BuildParameters(this.Owner as Token, parameters as Bracket, this.Context);`）、`:395`（`returnType = DirectTypeAssembly.ReturnTypeOf(returnUnits, typePos, this.Template, this.Context);`）
  - `[X1]` ● 指标 / 追踪 / 注册表 / 双参数门：8 处 `DirectBuildMetrics`（含三条自定义 trace 文案）+ 两张**并存**的参数判据表（`ParametersAreIdentifiers` 保留给 R3 的读数、`ParametersAreTypeAnnotated` 是新门），同一件事写了两份判据 — 证据 `:117-131`（`Decline`：`DirectBuildMetrics.Declined += 1; ... if (DirectBuildMetrics.Strict) { ... throw new Error("DirectBuild strict: " + reason ...)`）、`:192`/`:198`/`:249`（`Trace("function ingest head: function")` 等）、`:302-309`（`if (!this.ParametersAreIdentifiers(parameters as Bracket)) { if (!this.ParametersAreTypeAnnotated(parameters as Bracket)) { this.Decline(...); return null; } DirectBuildMetrics.Trace("function parameters annotated"); }`）
  - `[C2]` ● 整段重建：`Ingest` 只认 `function`/`async` 两个起点（外加 `async` 后一格校验），全部结构判定在 `Finish` 里对整段折 `code` 后做，注释自陈 — 证据 `:148-151`（`// Ingest 期只做两件**纯 token** 判定 … // 结构判定全部在 Finish（要整段已就位）。`）、`:159-180`（`while (this.Ingested < units.length && !this.Declined) { ... if (this.AsyncHead && !this.HeadChecked) { ... } }`）、`:230-238`（`for (let at = 0; at <= endIndex && at < this.Units.length; at++) { ... code.push(this.Units[at]); codeAt.push(at); }`）
  - `[C1]` ● 每轮重扫、无 cache：`BuildDeclaration` 用一个 `at` 光标线性走完整段（名字 / 星号 / 参数 / 冒号 / 体五步全靠 `IsText` 现判），返回类型再扫一段，两张参数门又各全扫一遍括号 `Data` — 证据 `:262-321`（`let at = 0; ... if (this.IsText(code[0], "async")) { asyncUnit = code[0]; at = 1; } ... const body = code[code.length - 1];`）、`:315-317`（`for (let cursor = at; cursor < code.length - 1; cursor++) { returnUnits.push(code[cursor]); }`）、`:433`（`for (const unit of inner) {`）、`:493`（`const inner:Array<Token> = bracket.Data;` + `:496-523` 第二遍）
  - `[B4]` ○ 用**整段最后一个单元**当函数体、用绝对位置判返回类型：`const body = code[code.length - 1]` 是「先决定结尾、再认中间」的写法（结尾对不对要到收口才知道，等于把后文的可见性当判据）；`code.length - 2` 也被当边界用 — 证据 `:304-308`（`const body = code[code.length - 1]; if (!this.IsOpenBrace(body)) { this.Decline("函数声明缺少函数体（ambient / 签名形态属 R6）", "stmt.func");`）、`:311-314`（`if (at > code.length - 2) { this.Decline("函数声明的返回类型为空", "stmt.func");`）、`:349-355`（`for (const unit of (body as any).Data) { if (unit.IsTriviaToken || !unit.IsBasicToken) { continue; } this.Decline("函数体内还有未建树的裸单元", "stmt.body");`）
  - `[P3]` ○ build 产物同样**没有去向**：签范围 + 关闭由 `Span` 完成，但既不回写给壳、也不 `MountedUnit` 挂载；splice 在 `BuildFromShell` 里做 — 证据 `:414`（`DirectStatementAssembly.Span(shape, head, body, this.BasePos, this.Context);`）、`statement-shape.xl.md:380`（`host.Data.splice(0, consumed.length);`）
  - `[P2]` ○ 无候选语义：`Decline`/`Incomplete` 两通道 + `Finished`/`Declined` 两布尔；没有 `Accept`/`Reject`/`Uncertain`、没有 `IsBuildable` — 证据 `:49-53`（`## field Declined:bool = false` / `## field Reason:string = ""` / `## field Finished:bool = false`）、`:117-143`（两个降级方法）

#### 方法:行 分布（15 项）

| 方法 | 行 | 行数 | 判定 |
| --- | --- | --- | --- |
| `constructor` | 77 | 8 | 只存 4 个引用，不读 `Kind`（与另两个 session 不同） |
| `TextOf` / `IsText` / `IsSymbolText` | 86 / 93 / 99 | 6 / 5 / 5 | 复用装配层 |
| `IsOpenParen` / `IsOpenBrace` | 105 / 111 | 各 5 | 纯括号判据 |
| `Decline` | 117 | 15 | `X1` 指标 + strict 抛错 |
| `Incomplete` | 133 | 11 | 第二降级通道 |
| `Ingest` | 145 | 37 | `C2` 只判两格（首格 + `async` 后一格） |
| `RecognizeHead` | 183 | 20 | 两个起点；其余一律 `Decline`（201） |
| `Finish` | 204 | 48 | `C2` 全段折 `code`（230-238）；唯一 `endIndex` 上界 |
| `BuildDeclaration` | 253 | 164 | `S4` 主建树（356-415）；`X2` `BuildParameters`（388）；`B4` 末单元当体（304） |
| `ParametersAreTypeAnnotated` | 418 | 67 | `X1` 第二张参数表；拒 `=`/`@`/解构（407-438） |
| `ParametersAreIdentifiers` | 486 | 40 | `X1` 第一张参数表（保留 R3 读数） |
| `Summary` | 527 | 7 | `X1` 诊断串 |

- 结论：**偏离（8 条：`S4`×1、`X2`×1、`X1`×1、`C2`×1、`C1`×1、`B4`×1、`P3`×1、`P2`×1；其中 ● 5、○ 3）**。它是四个文件里唯一**不含任何 `catch`** 的（`catch`=0），因此「异常被吃掉」这条在本文件不成立——`BuildParameters` / `BlockFrom` / `ReturnTypeOf` 抛出的异常会直接从 `Finish` 穿出，被 `statement-shape.xl.md:354-370` 接住并计入 `Errors`（那条 catch 明确区分「已计数的 Decline / strict」与「真异常」，真异常 `Errors += 1`）。
- **与同一族 possible 的关系 = 并行且同格竞争，而且会话可能根本轮不到（本轮最值得追的一条）**：`function` 族有两条互斥的建树路——(a) `FunctionDeclarationPossibleShape` 在增量模式挂的壳是 **`FunctionDeclarationShape` 本体**（`function-declaration-possible-shape.xl.md:468-469` `const shell = new FunctionDeclarationShape(host.Template); shell.CatalogGuide = new CatalogGuide([], new FunctionDeclarationEndPossibleShape());`），收口由其终结候选 `FromUnits` 建树（`function-declaration-end-possible-shape.xl.md:175`）；(b) `ControlFlowStatementPossibleShape` 在 `route === ShellFunctionDeclaration` 时挂的是 **`StatementShape`**（`control-flow-statement-possible-shape.xl.md:116-135`、`:232`），只有这种壳才带 `DirectSession` 字段、才进 `BuildFromShell`。两条候选在**同一格**都可能 Accept，为此 `control-flow-statement-possible-shape.xl.md:99-103` 专门为 `declare function` 写了让位（`FunctionDeclarationPossibleShape.Owns(...) ⇒ Reject`），而 `:75-77` 的注释承认「不让位就会同格双 Accept」。⇒ 「谁先赢」由候选表顺序与让位判据决定；若 (a) 赢，本会话一次都不会被创建。
- 合规面：`S1`=0；`B2`=0（**0 处 catch**）；`B1`=0（`code[0]` 前有 `code.length === 0` 守卫 `:239-242`，`code[code.length-1]` 前有 `at >= code.length` 守卫 `:300-303`）；`B3`=0；`U1`=0（`code` 折成后 raw 单元由调用方 splice，会话不保留）；`U2`/`U3`/`U4`=0；`R1`/`R2`=0；`X3`=0；`D1`=0（围栏外 0 行散文；`txt` 围栏 `24-45` 是形态表）。

---

## 本批统计

- 文件数 **4**；有偏离文件 **4**；偏离条数 **36**（● **23** / ○ **13**）。
- 按编号计数：`S4:3 S1:1 X1:4 X2:4 C1:4 C2:4 C3:1 B2:3 B4:4 P2:4 P3:4`（合计 **36** 条）。`P1`/`P4`/`U1`/`U2`/`U3`/`U4`/`B1`/`B3`/`R1`/`R2`/`X3`/`D1` 本批均未出现。
- 每文件条数：control **10**（●6/○4）、export **9**（●6/○3）、declaration **9**（●6/○3）、function **8**（●5/○3）。

| 编号 | ● | ○ | 落在哪（文件:行） |
| --- | --- | --- | --- |
| `S4` | 3 | 0 | control 直建 20 余种语句（`:517-519`/`:813-826`/`:1268-1274`）；declaration 走 `FromUnits`（`:431`/`:455`/`:503`）；function `new FunctionDeclarationShape`（`:356`/`:403-410`） |
| `S1` | 0 | 1 | export 伪造虚拟分号 basic token（`:174-177`） |
| `X1` | 4 | 0 | control 开关/指标/鸭子类型（`:118`/`:172-176`/`:106`）；export 第三种建树单位 + 伪造宿主（`:53`/`:456`）；declaration 双族转发（`:86`/`:366-369`）；function 双参数门（`:302-309`/`:418-525`） |
| `X2` | 4 | 0 | control 默认路径（`statement-shape.xl.md:350-353`）；export 10 处 `FromUnits` 当主干（`:270`/`:429`/`:479`/`:634`）；declaration 三族 `FromUnits` + `start=0`（`:431`/`:455`/`:503`）；function `BuildParameters`（`:388`） |
| `C1` | 4 | 0 | control 头部两次扫（`:732-741`/`:761-770`）；export `PosAt` O(n²)（`:87-93`/`:518-521`）；declaration 头识别两遍（`:230`/`:308`）；function 光标扫 + 两遍参数门（`:262-321`/`:433`/`:496`） |
| `C2` | 4 | 0 | 四文件同形态：`Ingest` 只认首格、结构全在 `Finish`（control `:276-289`；export `:160-178`；declaration `:293-301`；function `:230-238`） |
| `C3` | 0 | 1 | control 全用实例字段、cache 四式全 0（`:90-104`/`:205-207`） |
| `B2` | 3 | 0 | control 1 处（`:410-417`）；export 8 处（`:271`/`:316`/`:331`/`:430`/`:498`/`:576`/`:617`/`:635`）；declaration 3 处（`:432`/`:456`/`:504`）；function **0** 处 |
| `B4` | 0 | 4 | control 未截断整段（`:203`/`:451`/`:1290-1345`）；export 读 `code[2..3]`（`:126-147`）；declaration 全扫 `body.Data`（`:477-484`）；function 末单元当体（`:304`） |
| `P2` | 0 | 4 | 四文件都是「粘性布尔 + category 字符串」替代 R26–R30 五条（control `:78-82`；export `:67`/`:187-252`；declaration `:159-163`；function `:49-53`） |
| `P3` | 1 | 3 | export 手工 `Data.splice` + `Parent=`（`:534-535`/`:553-554`）；其余三家的产物只签范围/关闭、不挂载，splice 在 `statement-shape.xl.md:380` |

- 本批最重的 5 条（按影响面排序）：
  1. `[X2]` **四个会话全部是「默认路径」而非备选**：`BuildFromShell` 在 `new StatementBuilder` 之前先调 `direct.Finish`，直建成功时 builder 一次都不建（`statement-shape.xl.md:350-359`），失败才落到同一个函数体里的 `StatementFamilyDispatch.Build` / `BuildStatement()`（`:502-506`）。`statement-shape.xl.md:348-349` 自陈「直建成功时 builder 一次都不创建（验收口径 A6：builder.Load 调用数 == 0）」——**这是偏离被固化成验收指标的证据**。
  2. `[X2]` **「与 possible 的关系」四个文件都不是替代，而是并行**；其中 declaration / export 两家更退一步：直建调的 `FromUnits` 与 possible 调的是**同一批工厂**（`direct-declaration-session.xl.md:431`/`:455`/`:503` 对 `declaration-statement-possible-shape.xl.md:192`「收口仍走同一份 legacy `FromUnits`」；`direct-export-assembly.xl.md:270`/`:429`/`:634` 对 `export-declaration-possible-shape.xl.md:688`/`:828`/`:994`）。只有 control / function 是真正意义上的第二份实现。
  3. `[B2]`+`[P2]` **失败语义被压成布尔**：`Declined` 同时表示「不认领」与「建不出来」，共 12 处 `catch`（control 1 + export 8 + declaration 3，function 0）把异常转成这个布尔；随后同一段 raw 被 legacy 重读、解析照旧成功。R23 的字面约束对象是 possible 的 compute/build，但会话在**同一位置**做了 R23 不许做的事，并且比 catch 更隐蔽——`Errors` 计数器不为它增加（`statement-shape.xl.md:362-368` 特意排除已计数的 Decline）。
  4. `[C2]`+`C1` **四家的 `Ingest` 都近乎空转**：它只认「首代码单元是不是我的起点」（control `:194-215`、declaration `:146-176`、function `:148-180`），结构判定 100% 在 `Finish` 里对整段重扫；`C1` 的极端例子是 control 的 `for` 头两次全扫（`:732-741`/`:761-770`）与 export 的 `PosAt` 逐修饰词累加（`:87-93`/`:521`）。这直接违反 R06（增量为主）、R08（结果应记 cache）、R12（第 n 个字符时 AST 应已建）。
  5. `[S4]` **`ParseFromShape` 在整个 `typescript/tokens/direct` 是 0 处**（本批 4 文件均 0；全仓仅 `typescript/ast/declarations/import-declaration-ast-node.xl.md:28-31` 有一个声明且直接 `throw new Error("ImportDeclarationAstNode.ParseFromShape 未实现")`）。R21 描述的「关闭后的 shape → AST」这条通道**在本工程不存在实现**：语句/声明的 AST 就是这些会话（及第 60 篇的表达式引擎）用 `new` 拼出来的形状树本身。
- 本批合规面（防止误读）：`D1`=0（四文件围栏外**均 0 行散文**，脚本按 UTF-8 逐行统计 `prose=0`；所有中文都在 `ts` 围栏内注释，`txt` 围栏仅 5 处形态表）；`X3`=0；`P1`/`P4`=0（不涉及 possible 触发与 bracket 晋升）；`R1`/`R2`=0（无 `ExitOrPre` / `ComputePossibleShapes` 覆盖）；`B1`=0（四文件的下标取用前都有 `length`/`from-toExclusive` 守卫）；`B3`=0（都按 `from..toExclusive` 顺序推进）；`U2`/`U3`=0（无自造回挂通道）；`U1`/`U4`=0（不保留 raw 副本，`Data.splice` 由 `statement-shape.xl.md:380` / `:511` 统一做）；control 的 `BuildBlock`(`:451-457`) 与 function 的体残留判据(`:349-355`) 反而是**为了不静默丢掉未建树语句**而加的负向判据，属合规取向。
- 本批**方法体的两处文档级缺陷**（不构成编号偏离，登记备查）：function `:261` 写「不调用 `FromUnits` 的理由见文件头注释」，但文件头 `:24-45` 只有一张形态表、无该注释；export `:234` 的 `}if (afterText === "type" && code.length > 2) {` 把两个语句挤在同一行（`}` 与 `if` 之间无换行），是格式化残留。
