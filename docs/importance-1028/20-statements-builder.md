# 20 设计偏离审计 — typescript/tokens/statements/statement-builder.xl.md

审计对象只有本批一个文件；判据取自 `01-rules.md`，行号为 `read` 返回的真实行号。

### typescript/tokens/statements/statement-builder.xl.md（93388B / 2206 代码行（全文 2588 行）；StatementBuilder）

- 结构：**会话/建造器层**——不是 basic token、不是 shape、不是 possible/end。它把一个 basic token 数组（`Array<Token>`）装进 `Units`/`Positions`，用递归下降按首个代码单元的文本分派，直接 `new XxxStatementShape()` + `shape.Add(...)` 拼出语句形状，最后自己签范围并 `shape.TryToClose()`。它同时是产物来源与收口者：没有 possible/end、没有 catalog guide、没有 cache、不消费任何 shape 的 `Data`，全文 0 处 `ParseFromShape`（grep 无命中），0 处 `GetState`/`SetState`/`GetShare`/`SetShare`，0 处 `ExitOrPre`/`ComputePossibleShapes` 覆盖，0 处 `catch`。调用方（`statement-shape.xl.md:346-349,448-449`）明确把这条路径叫「旧路径」，只在直建 session `Declined` 之后创建 builder——即本文件是设计中的**旁路**，而它与设计主线并列地拥有「从 token 到 AST」的全部权力。

#### StatementBuilder —— 职责分布（8 字段 / 71 方法）

| 组 | 职责 | 方法:行 |
| --- | --- | --- |
| 装载与判词 | 收 raw 单元、剔 trivia、文本/符号/关键字判定、同行判定 | `Load:97` `Peek:116` `TextOf:126` `IsText:138` `IsSymbol:144` `IsVariableKeyword:150` `HasLineBreakAfter:2095` `IsKeywordUnit:2189` `IsClauseKeyword:2195` |
| 收口 | 唯一出口：签 In/Out、写 Pos、`TryToClose` | `Finish:160` |
| 语句分派 | 按首单元文本走 30 余个分支 | `BuildStatement:214` |
| 声明族 | function / class / interface / enum / module / type-alias | `446` `542` `577` `601` `625` `1167`，修饰词重锚 `AnchorFirstModifier:526` |
| 导出导入 | import、export 四型、namespace-export、export-assignment，修饰词从头上摘下来再 `splice` 回 `Data` | `660` `675` `690` `712` `731` `745` `764` `780` `787` `820` `916` `937` `959` `980` `1108` `1125` `1145` |
| 装饰器 | 装饰器头整段重解析 + 关键字侧信道 | `ScanDecoratedHead:993` `BuildDecoratedStatement:1056` `BuildDecoratedVariableStatement:1089` |
| 块与 case 块 | 块体、case 块、子句头、冒号定位 | `BuildBlock:1203` `HasBuiltBodyStatements:1228` `CollectBodyStatements:1242` `BuildCaseBlock:2335` `BuildCaseClauseHead:2277` `ClauseColonAt:2310` |
| 变量声明 | 变量语句、声明列表（类型段与初始化器段各自独立扫描）、绑定模式重写 | `1502` `1518` `1534` `1610` `NormalizeBindingPattern:2201` |
| 控制流 | if/while/do/for/for-in-of/return-throw/break-continue/debugger/labeled/switch/try/catch/with | `1769` `1791` `1809` `1863` `1958` `2005` `2104` `2155` `2167` `2254` `2461` `2486` `2572` |
| 表达式语句 | 整段切片交给新的 `ExpressionBuilder`；另有形状树直建入口 | `BuildExpressionRange:176` `ParseBracketExpression:195` `BuildExpressionStatement:1310` `BuildExpressionStatementFromShapes:1362` |
| 静态判界 | ASI 的三个判据 | `EndsExpression:1434` `ContinuesAcrossLine:1457` `EndsAtLineBreak:1481` `IsTypeArgumentStart:1493` |

- 偏离：

  - `[S4]` ● 整个类以递归下降直接从 raw basic token 产出 AST 节点，AST 不出自关闭后的 shape（`ParseFromShape` 全文 0 处）— 证据 `statement-builder.xl.md:214`（`## method BuildStatement:()=>Token`，其后按 `this.Units[this.At]` 的 `TempToString()` 逐文本分派到 30 余个建造器）
  - `[S4]` ● 每个建造器自己 `new` 语句节点再 `Add` 子节点，节点身份与层级由 builder 决定，而非由 shape 的 children 决定 — 证据 `statement-builder.xl.md:1781`（`const shape = new IfStatementShape(this.Template); shape.Add(condition); shape.Add(thenStatement);`）
  - `[S4]` ● 收口职责内联在 builder：`Finish` 自己 `SignIn`/`SignOut`/写 `Pos` 并 `TryToClose`（全文 13 处 `TryToClose`），关闭权不在 close/possible 一侧 — 证据 `statement-builder.xl.md:172`（`shape.TryToClose(this.Context);`）

  - `[X1]` ● 建造器机制本身即设计外挂：把 basic token 快照装进 `Units`/`Positions` 线性消费，用下标 `At` 模拟游标 — 证据 `statement-builder.xl.md:97`（`## method Load:(units:Array<Token>, basePos:int)=>void`，100-113 只剔 trivial 后整段收下）
  - `[X1]` ● 自造 host 对象喂 `FromUnits`，且用 `any` 抹掉类型检查 — 证据 `statement-builder.xl.md:514`（`const hostLike:any = { Data: this.Units, Template: this.Template };`，同样写法在 561/593/617/804/926/947/969/986/1195）
  - `[X1]` ● 设计未定义的开关位：匿名类/匿名函数许可 — 证据 `statement-builder.xl.md:696`（`this.AllowAnonymousClass = true; this.AllowAnonymousFunction = true;`，字段声明 84/86，复位 567/699-700）
  - `[X1]` ● 设计未定义的分支转发器：`ScanDecoratedHead` 把认出的关键字写进字段 `DecoratedKeyword`，`BuildDecoratedStatement` 再读它分派 — 证据 `statement-builder.xl.md:1052`（`this.DecoratedKeyword = (head as Common).TempToString();`，读取点 1060-1061）
  - `[X1]` ● 设计未定义的指标计数器被建树路径直接写 — 证据 `statement-builder.xl.md:1221`（`StatementLegacyMetrics.RawTailBuildCount++;`，另见 1265/1295；`StatementRouteUtil.BlockBodyStatementCount += 1;` 在 1276）
  - `[X1]` ● 合成 basic token 再撤回：`SynthesizeSemicolon` 造一个零宽 `Symbol` 插进 `Units`，建完再 `RemoveSemicolon` 删掉；「造 token」本属 basic token 层，且使同一条语句的两次读取看到不同的单元数组 — 证据 `statement-builder.xl.md:772`（`const semi = new Symbol(this.Template); semi.SignIn(tailEnd); semi.AppendValueAndSignOut(";", tailEnd - 1);`，撤回点 780-785，调用 801/923/944/966）
  - `[X1]` ● 手工造零宽 `IdentifierShape` 填 AST 空位（do 的条件位、throw 的操作数），节点既非源码 token 也非 shape 产出 — 证据 `statement-builder.xl.md:1851`（`const zero = new IdentifierShape(this.Template); zero.EscapedText = "";`，同款 2036-2044、2073-2086）
  - `[X1]` ● 对**已闭合**的子句头直接写 `SourceRange.End`，注释自认「`SignOutToken` 会撞已闭合断言，直接改字段」——绕开收口机制的补丁通道 — 证据 `statement-builder.xl.md:2388`（`headClause.SourceRange.End = clauseTail.SourceRange.EndIndex;`）

  - `[X2]` ● 整类即 legacy 旁路：调用方只在直建 session `Declined`/不存在时才创建它，注释写明「直建成功时 builder 一次都不创建」 — 证据 `typescript/tokens/statements/statement-shape.xl.md:448`（`const builder = new StatementBuilder(host.Template, context); builder.Load(consumed, shell.Pos);`，身份说明在同文件 346-349）
  - `[X2]` ● 块体在没有已建语句时整段 raw 重建：新起一个 builder 吃掉整个 `bracket.Data` — 证据 `statement-builder.xl.md:1210`（`if (StatementBuilder.HasBuiltBodyStatements(bracket)) { ...CollectBodyStatements... } else { ... }`，else 分支 1213-1223）
  - `[X2]` ● case 块里 raw `case`/`default` 仍走现场重建子句（与增量侧 `CaseClauseShape` 收下并存两条通道） — 证据 `statement-builder.xl.md:2393`（`if (inner.IsKeywordUnit(unit, "case")) { ... clause.Add(inner.BuildStatement()); }`，default 分支 2424-2447）
  - `[X2]` ● `NormalizeBindingPattern` 绕过 shape：按 `bracket.Data` 的 `,` 重新切组，清空已建 `BindingElementShape` 的 `Data` 再平铺填 `IdentifierShape` — 证据 `statement-builder.xl.md:2238`（`binding.Data = [];`，切组 2212-2223，回填 2240-2249）

  - `[C2]` ● 全量替代增量：块体整块 `Load` 后逐条 `BuildStatement`，未使用任何已建形状信息 — 证据 `statement-builder.xl.md:1218`（`inner.Load(bracket.Data, base);`，紧接 1219-1223 的 `while` 全量重扫）
  - `[C2]` ● switch 的 case 块整块 `bracket.Data` 一次性装进新 builder 再全量重扫判子句 — 证据 `statement-builder.xl.md:2344`（`inner.Load(bracket.Data, base);`，其后 2345-2449 的整段 while）
  - `[C2]` ● for 头部整段 `Load` 后对全部单元做一次全量扫描找 `;` 的个数与 `in`/`of` 位置 — 证据 `statement-builder.xl.md:1890`（`for (let at = 0; at < inner.Units.length; at++) { ... }`）
  - `[C2]` ● 装饰器头每次调用都新起 `ExpressionBuilder` 把整段剩余单元重新解析一遍，解析结果除「推进到哪」外全部丢弃 — 证据 `statement-builder.xl.md:1005`（`const builder = new ExpressionBuilder(this.Template, this.Context); builder.Load(this.Units.slice(index + 1), base); ... builder.ParseExpression();`）
  - `[C2]` ● 子区间不从已有形状取，而是切片后装进新 builder 从头再解析（`BuildExpressionRange`/`ParseBracketExpression` 各一份，表达式层因此被重复解析两次） — 证据 `statement-builder.xl.md:186`（`const builder = new ExpressionBuilder(this.Template, this.Context); builder.Load(units, this.Positions[first]); const value = builder.ParseExpression();`）

  - `[C1]` ● 五个声明建造器各自写一份 `for` 循环，从 `this.At` 线性扫到体括号，同一区间在分派与建造两处被反复扫描，扫出的体括号位置不落任何 cache — 证据 `statement-builder.xl.md:547`（`for (let scan = this.At; scan < this.Units.length; scan++) { ... if (scanned instanceof Bracket && ... StartBracketChar === "{") { end = scan; break; } }`，同款 582-589、606-613、630-641、1174-1194）
  - `[C1]` ● `ClauseEnd` 每次调用都从头扫到 `;` 或 ASI 边界，5 个调用点对同一子句可能各扫一次，`BuildExportStatement` 的 export-import 分支还额外再算一次 — 证据 `statement-builder.xl.md:745`（`for (let scan = from; scan < this.Units.length; scan++)`，调用 791/920/941/963/984 与 839）
  - `[C1]` ● 同一条语句头被判两次：`BuildStatement` 已按文本分派，进入某个建造器后又由该建造器从头扫一遍定界，两处判据并存且需人工保持一致 — 证据 `statement-builder.xl.md:242`（`const text = (unit as Common).TempToString();`，随后 265-268 `text === "class"` → `BuildClassDeclaration` → 547 再扫）
  - `[C1]` ● 类内无任何 cache 字段：8 个字段中没有任何「已找到的形状/位置」记录位，重复扫描无处可存 — 证据 `statement-builder.xl.md:78`（`## field Units:Array<Token> = []`，字段区 74-88）

  - `[C3]` ● cache 语义完全缺席：没有 `get state`/`set state`、没有 `share`，`state` 的「build 后 reset」语义因此无从谈起（字段只有输入快照与几个开关） — 证据 `statement-builder.xl.md:78`（`## field Units:Array<Token> = []`，至 88 `## field DecoratedKeyword:string = ""`）

  - `[B1]` ● 语句位越界直接抛错，不返回 `Nothing`（调用方按旧长度遍历时无法区分「没有数据」与「建树失败」） — 证据 `statement-builder.xl.md:217`（`if (this.At >= this.Units.length) { throw new Error("语句意外结束"); }`）
  - `[B1]` ○ 多处裸取 `this.Units[...]` / `this.Positions[...]` 而不走 `Peek` 的空值约定，越界会先拿到 `undefined` 再在属性访问处崩（`Finish` 的 `first`/`last`、if/while/do/for/switch 的头括号位、`BuildCaseBlock` 的 `Positions[bracketIndex]`） — 证据 `statement-builder.xl.md:163`（`const head = this.Units[first]; const tail = this.Units[last];`，同类 1774/1796/1818/1875/2259/2456；`Peek:116-124` 本身是合规的空值返回，但调用点普遍不用）

  - `[B3]` ○ 先取后面的形状、再回头补被跳过的 basic 段：`CollectBodyStatements` 遇到 basic token 直接 `at++` 跳过（未消费），先收下更靠后的已建语句形状，等下一次循环才把跳过的区间重新 `Load` 建掉 — 证据 `statement-builder.xl.md:1253`（`if (unit.IsTriviaToken || unit.IsBasicToken) { at++; continue; }`，回头重建 1260-1268）
  - `[B3]` ○ `BuildCaseBlock` 的混合序列同样先按 `!IsBasicToken` 收下后面的形状（跳过眼前的 basic 子句关键字与括号单元），再由内层 `while` 回头 `BuildStatement` 建它们 — 证据 `statement-builder.xl.md:2366`（`const clauseUnit = inner.Units[inner.At]; if (!clauseUnit.IsBasicToken) { ... continue; }`）

  - `[B4]` ○ 查看 `At` 之后很远的数据并据此改变建树结果：ambient 回退把「参数表之后到单元数组末尾」整段当成一条声明，`end` 直接取 `Units.length - 1` — 证据 `statement-builder.xl.md:510`（`end = this.Units.length - 1;`，判断依据是 482-506 对全尾部的第二次扫描）

  - `[U1]` ○ build 那一刻不提取字段：把整段 raw basic token 数组当 `Data` 转交 `FromUnits`，由上游再扫一遍才可能落字段，basic token 在「build」之后仍留在 `Data` 里 — 证据 `statement-builder.xl.md:517`（`const shape = FunctionDeclarationShape.FromUnits(hostLike, first, end, this.Context, !hasBody, allowAnonymousFunction);`）

  - `[S3]` ○ 块/子句容器的 `Data` 呈「壳 + raw basic token」混合，建造器靠显式类型分派与事后重写把两者拼成树；这也意味着关闭后的 `Data` 不等于 AST children，需由 builder 逐格修补 — 证据 `statement-builder.xl.md:1257`（`if (unit instanceof StatementShape) { throw new Error("块体里有未收口的语句壳"); }`，混合处理另见 2351-2353、2410-2419）

- 结论：**偏离（32 条）**。本文件是设计里最重的一处越权：它把「从 token 到 AST」整条链路（分派、定界、收口、范围修补）握在自己手里，与 `possible/end/catalog` 主线并行且被官方注释定性为「旧路径」；`ParseFromShape` 侧在本文件完全缺失，`state`/`share` 侧完全缺席，于是同一份源码在两条路径上各有一套判据（本文件内部还并存 raw 与增量两套 case/块体通道）。文件内两处**合规**项也需记明，以免误读：`Peek:116-124` 是干净的空值返回；全文无 `catch`（0 处 `B2`）、无 `ExitOrPre` 覆盖（0 处 `R1`）、无 `ComputePossibleShapes` 覆盖（0 处 `R2`）、围栏外 0 行散文（0 处 `D1`）、无 tsx/JSX 形状（0 处 `X3`）。

## 本批统计

- 文件数：1
- 有偏离文件数：1
- 按编号计数：`S4:3 X1:8 X2:4 C2:5 C1:4 C3:1 B1:2 B3:2 B4:1 U1:1 S3:1`（合计 32 条；`B2`/`R1`/`R2`/`D1`/`X3` 均为 0，未出现）
- 本批最严重 3 条：
  1. `[S4]` 整个 `StatementBuilder` 以递归下降直接从 raw basic token 建 AST，`ParseFromShape` 全文缺失（`statement-builder.xl.md:214`、`:1781`、`:172`）。
  2. `[X2]` 整类即 legacy 旁路，只在直建 session 声明失败后被创建，却拥有完整建树权（`statement-shape.xl.md:346-349,448`）。
  3. `[C2]` 块体与 switch 的 case 块整段 `Load` 后全量重建，增量信息（已建形状）被丢弃（`statement-builder.xl.md:1218`、`:2344`）。
