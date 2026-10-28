# 13 — core/syntax/templates 设计偏离审计

- 判定口径：`IMPORTANCE.md:7-20` 只有两层——basic token 层（「将字符串转换成词组」）与 shape/possible/end 层；触发点只有两个（basic token 关闭、bracket 创建）。本批 10 个文件都属于**文档里不存在的「模板层」**，故按它实际做了什么分档：只做配置与纯判定 → 无偏离（`N` 性质）；一旦由它决定字符归属（分词）、决定何时关闭（即何时触发 possible）、或自带跳转器/自有缓存 → `X1`，并叠加对应的 `P1`/`B4`/`C1`/`U1`。
- 本批 `prose` 全为 0（`_facts/core-syntax.md:44-53`），R01/`D1` 不逐文件重复。
- 行号均为 `read` 返回的真实行号；括号内「代码行」取 `_facts/core-syntax.md` 的 ```ts 代码行数。

---

### core/syntax/templates/basic-dispatch.xl.md（15447B / 259 行；BasicDispatch）

- 结构：模板层的**字符分派器**（词法驱动）。`Transit` 读 128 项位表 → 按 ①–⑧ 的优先级依次问 Bom / Shebang / 区域注释·行注释·正则 / StringGuide / Bracket / WrapSymbol / Symbol / Common 谁能认下当前字符，返回 `BranchStates`（`Undo`/`Done`/`Reload`）；`BatchPlain` 另做整段标识符的批量收；`BuildClassTable` 生成并回写 `Template.BasicClassTable`。
- 偏离：
  - `[X1]` ● 模板层把「basic token 如何切词组」收成一条优先级 if 链：字符归属不再由各 basic token 自己判定后关闭，而由分派器按位表顺序**指派**，`Done` 由分派器返回，`possible` 一次都不在这里被触发——与 `IMPORTANCE.md:7`（basic token 自己完成转换）和 `IMPORTANCE.md:20`（关闭/建 bracket 即触发 possible）不是同一套机制 — 证据 `core/syntax/templates/basic-dispatch.xl.md:53`（`const bits = table.charCodeAt(code);`）、`:157`（`return Common.Transit(context, unit, buffer, index, value);` 兜底）
  - `[X1]` ● 自建**词法分类位表**并寄存在 `Template` 上（跨轮复用、非 possible cache）：128 项 × 7 位的字符串表，首次用时惰性构建，之后每次 `Transit` 直接 `charCodeAt` 查表 — 证据 `core/syntax/templates/basic-dispatch.xl.md:289`（`for (let code = 0; code < 128; code++) {`）、`:313-315`（`text += String.fromCharCode(bits);` / `template.BasicClassTable = text;`）
  - `[X1]` ● `BatchPlain` 由**模板层**一次吞掉整段标识符并直接构造 basic token：`document.GetRaw` 扫描 → `unit.Add(new Common(...))` → `AppendAndSignOut(runText, at - 1)`，随后由模板层改写 `context.Index` 跳格，逐字符的增量收敛被跳过 — 证据 `core/syntax/templates/basic-dispatch.xl.md:272-274`（`unit.Add(new Common(unit.Template));` / `AppendAndSignOut(runText, at - 1).SignIn(index);` / `context.Index = at;`）
  - `[P1]` ○ 关闭时机（也就是 **possible 的触发时机**）被前移到分派器：`BatchPlain` 亲手对上一个单元 `TryToClose`，`CloseStates.Built` 时再发 `BranchStates.Reload` 让同一格重放。`IMPORTANCE.md:20,26` 里 close 由 basic token 自身发生、possible 由 close 连带触发，这里多了一个「谁来关」的决策点 — 证据 `core/syntax/templates/basic-dispatch.xl.md:269-271`（`if (last !== null && !last.Closed && last.TryToClose(context) === CloseStates.Built) { return BranchStates.Reload; }`）
  - `[B4]` ○ 预读 `tokenIndex` 之后的字符：一次取到窗口末尾再向前扫，直到非标识符字符为止，用「前瞻出 token 边界」替代「逐字符追加、关闭时收敛」。预读范围受窗口上限约束（`SyntaxContext.BufferSize` 默认 32，`syntax-context.xl.md:15,81-82`）、字符本就在文档里，故不构成「读未就绪数据」，只记为 ○ — 证据 `core/syntax/templates/basic-dispatch.xl.md:249`（`const raw = document.GetRaw(index, buffer.End);`）、`:251`（`while (offset < raw.length) {`）
  - 已核对、判为不成立：`S1`（分派链覆盖 `IMPORTANCE.md:8-17` 全部十类，不缺 token 类）、`U1`/`U4`（`BatchPlain` 写进的是 basic token 自己的 `Temp`，`block-token.xl.md:29-38`，未越过 build 取走 shape 字段，`Data` 也未残留 basic token）、`B1`/`B2`（全程无 `try/catch`；`unit.Last()` 可空已判，回看下标有 `preIndex >= 0` 与 `preIndex >= buffer.Start` 双重约束，`:73-76`）。
- 结论：偏离（5 条；3 `X1` ●、1 `P1` ○、1 `B4` ○）。

### core/syntax/templates/symbol-template.xl.md（5386B / 141 行；SymbolTemplate）

- 结构：模板层最底下的**纯配置 + 纯判定**：若干符号集合（赋值/比较/复合赋值/成员/语句）、Unicode 转义标识符开关，以及 `IsSymbol` / `IsCombinedSymbol` / `IsWhiteSpace` / `IsNumber` 等字符判定。无方法改写 token 树、无 possible、无缓存。
- 偏离：
  - 无（符合：全部方法都是「查表 → 返回 bool / 改自己的集合」（`:39-79`、`:120-124`），不消费 token、不建形状、不触发 possible；`IsCombineBlocked` 不是死钩子，`symbol.xl.md:41` 调用它、`typescript/run/typescript-symbol-template.xl.md:47` 覆写它，属正常扩展点；符号集合的增删方法只改本对象字段，不触碰 `Data`）。
  - 备注（非偏离）：`IsNumber` 用字符串比较 `Value >= "0" && Value <= "9"`（`:158-162`），对多字符输入（如 `"10"`）也返回 true；调用方只传单字符（`common.xl.md:211,229`、`common.xl.md:308`），故不影响判定。
- 结论：符合。

### core/syntax/templates/template.xl.md（2587B / 10 行；Template）

- 结构：模板聚合根。持有各子模板字段、`BasicClassTable`（位表缓存）、`BranchTemplate`（分支跳转队列的注册表）与静态 `BasicBranchQueue()`。
- 偏离：
  - `[X1]` ● 引入文档里没有的**分支转发器**这一层：`BranchTemplate` 的类型是 `SequenceTemplate<BranchTransiter>`，`BasicBranchQueue()` 把 `BasicDispatch.Transit` 作为 basic 队列的默认一条，basic token 在构造时 `template.BranchTemplate.Get(this.constructor, null)` 取自己的队列（`bom.xl.md:27`、`string.xl.md:54`、`bracket.xl.md:44`…）。`IMPORTANCE.md:19-20` 只有 shape/possible/end 三件套，没有「字符级跳转队列」这个中间层 — 证据 `core/syntax/templates/template.xl.md:31`（`## field BranchTemplate:SequenceTemplate<BranchTransiter> = new SequenceTemplate<BranchTransiter>()`）、`:65-67`（`new Sequence<BranchTransiter>([ BasicDispatch.Transit, ])`）
  - `[X1]` ● 队列本身是**跨模板的静态单例**：`BasicBranchQueueCache` 为 `static`，一旦建成所有 template 共用同一条队列，已有调用方必须专门绕开它（`typescript/tokens/files/source-file-shape.xl.md:57-60` 注释「不能直接用全局缓存的 `Template.BasicBranchQueue()`」） — 证据 `core/syntax/templates/template.xl.md:59`（`## private static field BasicBranchQueueCache:Sequence<BranchTransiter> | null = null`）、`:64-69`
  - `[X1]` ● `BasicClassTable` 字段把词法分类结果挂在模板上，`Initialize` 重新配置时只清这一张表（`:75`）——模板层有了自己的缓存与失效点，而 IMPORTANCE 只承认 possible cache（`IMPORTANCE.md:26-27`，R09-R11） — 证据 `core/syntax/templates/template.xl.md:57`（`## field BasicClassTable:string = ""`）
  - 附带证据（说明队列曾是「每类 token 一条」的链）：依赖围栏引入 Bom/Shebang/AreaAnnotation/Bracket/Common/LineAnnotation/RegexToken/StringGuide/Symbol/WrapSymbol 十类（`:4-13`），类体除 `BasicDispatch.Transit` 外一个都不引用——队列已塌缩成一条转发器，十行 import 成为残壳。
- 结论：偏离（3 条；均 `X1` ●）。

### core/syntax/templates/regex-template.xl.md（2068B / 48 行；RegexTemplate）

- 结构：正则与除号的**上下文判定器**。`CanStart` 按前一个 token 的类型/文本决定 `/` 是正则起点还是除号；`CanStartAt` 从 `units` 回看、跳过 trivia 后取 `lastCode` / `previousCode`；`IsOperandEnd` 判断操作数是否已结束。
- 偏离：
  - `[X1]` ● 语法层的上下文判定被放在模板层：判据是「前一个 token 是不是 `String`/`RegexToken`/`Bracket`、`Common.TempToString()` 是否落在 `ExpressionKeywords` 里、`Symbol` 文本是不是 `!`/`++`/`--`」——这是表达式语法问题，不是词法配置。`IMPORTANCE.md:7` 把 basic token 之后的一切交给语法层（shape/possible/end），这里却在 basic token 层内部先做一次语法裁决 — 证据 `core/syntax/templates/regex-template.xl.md:49-60`（`if (lastCode instanceof String || lastCode instanceof RegexToken || lastCode instanceof Bracket) { return false; }` … `if (text === "!" || text === "++" || text === "--") { return !this.IsOperandEnd(previousCode); }`）
  - `[U1]` ○ 模板层直接读 basic token 的**中间态文本**作判据：`TempToString()` 取的是尚未关闭的 `Common` 的 `Temp`，而 `IMPORTANCE.md:55` 要求数据在 build 那一刻才提取到 shape 字段。此处只读不清、不丢数据，故为 ○ — 证据 `core/syntax/templates/regex-template.xl.md:35`（`return !this.ExpressionKeywords.includes((unit as Common).TempToString());`）、`:53`（`return this.ExpressionKeywords.includes((lastCode as Common).TempToString());`）
  - `[C1]` ○ 同一段回扫被做两遍：调用方 `RegexToken.Transit` 已经用 `data` 回看过 `lastCode`/`previousCode`（`regex-token.xl.md:127-149`），随后又调 `CanStartAt(data, data.length)` 让模板**从头再扫一遍**同样的 trivia 链 —— 每遇一个 `/` 就重复线性回扫两次，结果没有复用 — 证据 `core/syntax/templates/regex-template.xl.md:68-83`（三段 `while (at >= 0 && units[at].IsTriviaToken) { at--; }`），调用点 `core/syntax/basic-tokens/regex-token.xl.md:154`（`!unit.Template.RegexTemplate.CanStartAt(data, data.length)`）
  - 已核对、判为不成立：`B4`/`B3`（`CanStartAt` 只从 `index - 1` 向前走，从不看 `index` 之后；跳过 trivia 是 `IMPORTANCE.md:67` 明文允许的例外）。
- 结论：偏离（3 条；1 `X1` ●、1 `U1` ○、1 `C1` ○）。

### core/syntax/templates/sequence-template.xl.md（1962B / 28 行；SequenceTemplate）

- 结构：分支队列的**注册表 + 缓存**。`CoverData`/`BanedData`/`ModifyItem` 存配置，`CompletedData` 存按 `target`（通常是 `this.constructor`）算好的 `Sequence<T>` 队列，`Get` 命中即返回。
- 偏离：
  - `[X1]` ● 这套 `CoverData` / `BanedData` / `CompletedData` / `ModifyItem` 就是分支转发器的落地机制：`Template.BranchTemplate` 的类型参数正是它（`template.xl.md:31`），每个 basic token 用 `Get(this.constructor, null)` 领一条自己的跳转链。IMPORTANCE 没有「按 token 类型分发一条跳转链」的概念 — 证据 `core/syntax/templates/sequence-template.xl.md:14`（`# class SequenceTemplate<T>`）、`:26-49`（`Get` 的整段缓存逻辑）
  - `[X1]` ● 第二个缓存层**永不失效**：`Set` 只写 `CoverData`、`Ban` 只写 `BanedData`，两者都不碰 `CompletedData`；`Get` 一旦命中就直接返回旧队列，于是「模板重配置」被静默忽略。对照 `Template.Initialize` 会清 `BasicClassTable`（`template.xl.md:75`），可见本仓对模板缓存是有失效点概念的，这里缺了 — 证据 `core/syntax/templates/sequence-template.xl.md:29`（`if (!this.CompletedData.has(target)) {`）、`:54`（`this.CoverData.set(target, value);`）、`:60`（`this.BanedData.push(...Items);`）
  - `[X1]` ○ `ModifyItem` 是「取队列时顺手改队列元素」的副作用钩子：命中缓存后仍会对每个元素调一次 `modify(item)`，同一个 transiter 实例可能被反复改写，而改了什么、改几次没有任何记录 — 证据 `core/syntax/templates/sequence-template.xl.md:39-45`（`const modify = this.ModifyItem.get((item as any).constructor); if (modify !== undefined) { modify(item); }`）
  - 已核对、判为不成立：`C3`（这里的 `CompletedData` 不是 possible cache 的 `state`/`share`，R09-R11 不覆盖它，故归 `X1` 而非 `C3`）。
- 结论：偏离（3 条；2 `X1` ●、1 `X1` ○）。

### core/syntax/templates/sequence.xl.md（1642B / 36 行；Sequence）

- 结构：纯集合容器（`Data:Array<T>` + 不可变式 `Removed`/`Added`/`Inserted*`，后者复制一份再改）。被 `SequenceTemplate` 当作队列值，也被 `Token.ProcessQueue` 使用。
- 偏离：
  - `[B1]` ○ 越界不判：`InsertedBefore` / `InsertedAfter` 对 `indexOf` 返回 `-1` 不设防，`splice(-1, 0, …)` / `splice(0, 0, …)` 会静默插到末尾前 / 头部；而同文件里等价的失败场景（`InsertedBeforeWhere` 找不到元素）却是抛错。同一类越界两种语义，调用方无法靠返回值区分 — 证据 `core/syntax/templates/sequence.xl.md:60-61`（`const index = result.Data.indexOf(item); result.Data.splice(index, 0, ...items);`）、`:83-84`（`result.Data.splice(index + 1, 0, ...items);`）、`:71-73`（`if (index < 0) { throw new Error("InsertedBeforeWhere: no element matched the predicate"); }`）
  - 已核对、判为不成立：`U1`/`U4`/`C1`/`C3`（不碰 token 数据、不遍历形状、不自带缓存；`Removed`/`Added`/`Inserted*` 每次复制 `Data`，`:38-43`、`:48-52`，是值语义，不是「每轮重新寻找」）。
- 结论：偏离（1 条；`B1` ○）。

### core/syntax/templates/number-template.xl.md（1178B / 26 行；NumberTemplate）

- 结构：数字字面量的**后缀配置 + 匹配纯函数**。`PlainSuffixes` / `BigIntSuffix` / `SuffixIgnoreCase` 三项配置，`MatchPlainSuffix` 取最长命中、`MatchBigIntSuffix` 取唯一命中。
- 偏离：
  - `[C1]` ● `MatchPlainSuffix` 在 possible 的每轮 compute/build 里被重跑，且每次都是「遍历全部后缀 + 对整段 `Temp` 重做 substring」，最长匹配结果没有记进任何 cache：`Common.IsNumber()` / `NumberBody()` 逐次调用它（`common.xl.md:256,281`），而这两个方法正被 `ComputeByIndex` / `BuildByIndex` 每轮调用（`typescript/tokens/expressions/numeric-literal-possible-shape.xl.md:61,74`、`right-operand-possible-shape.xl.md:73,121`）。这正是 `IMPORTANCE.md:61` 说的「每轮都进行寻找/遍历 ⇒ 差」 — 证据 `core/syntax/templates/number-template.xl.md:24-31`（`for (const item of this.PlainSuffixes) { … const tail = text.substring(text.length - item.length); … matched = item; }`）
  - 已核对、判为不成立：`S1`/`B1`/`B2`（只做字符串匹配，不看 token 树，无异常抛出与吞掉；空串 / 超长都在函数内先判，`:25`、`:42-44`）。
- 结论：偏离（1 条；`C1` ●）。

### core/syntax/templates/method-name-template.xl.md（615B / 11 行；MethodNameTemplate）

- 结构：名字黑/白名单 + `IsMethodName`。默认放行（只有 `BanedNames` 里的名字被拒），`BanedNames` 是**语句位控制关键字**表（`if`/`for`/`while`/`catch`/`await`…）。
- 偏离：
  - `[X1]` ○ 模板层留了一份**没人消费**的判据：`Template.MethodNameTemplate` 只被实例化（`template.xl.md:39`），全仓没有一处读它——`IsMethodName` 已从判定路径上撤掉。而它历史上被用在成员位，判据却是语句位的表（`if (x)` / `catch (e)` 那一类），`catch`/`finally` 因此被误挡、整条 `.catch(cb).then(cb2)` 链消失；修法是把「`.` 后面的名字永远是成员名」搬去调用方，这张表随之悬空 — 证据 `core/syntax/templates/method-name-template.xl.md:5`（`## field BanedNames:Array<string> = ["if", "for", "foreach", "while", "catch", "async", "return", "as", "await"]`）、`tests/runtime/cases/67-keyword-members.ts:6-15`（「那张表**是给语句位准备的**」/ 修法「控制关键字那张表不该管这里」）
- 结论：偏离（1 条；`X1` ○）。

### core/syntax/templates/string-template.xl.md（590B / 0 行；StringTemplate）

- 结构：字符串的纯字段配置——引号集、转义符、行终止符集、`StrictTemplateEscapes` / `AllowLongUnicodeBraceEscape` / `HasVerbatim` / `HasInterpolationPrefix` / `HasRaw` 等开关、`@` 与 `$` 前缀。无方法体。
- 偏离：
  - 无（符合：0 行代码、无方法，不碰 token、不建形状、不触发 possible；字段都被真实读取——`basic-dispatch.xl.md:203,284` 读 `Quotes`、`typescript-template.xl.md:256-260` 重配行终止符与转义开关，属「配置」而非「行为」，`N` 性质）。
- 结论：符合。

### core/syntax/templates/keyword-template.xl.md（518B / 8 行；KeywordTemplate）

- 结构：关键字黑/白名单 + `IsKeyword`（先查 `BanedKeywords`，否则以 `AllowedKeywords` 白名单为准，默认拒绝）。
- 偏离：
  - `[X1]` ○ 与本批其它「死配置」同型：`Template.KeywordTemplate` 被实例化（`template.xl.md:37`），但全仓没有任何 `.KeywordTemplate.` 读取点，`IsKeyword` 不参与分词也不参与形状创建；且它与 `MethodNameTemplate` 的默认方向相反（一个白名单默认拒、一个黑名单默认放），两张表都没有调用方来固定语义 — 证据 `core/syntax/templates/keyword-template.xl.md:23-29`（`if (this.BanedKeywords.includes(item)) { return false; } return this.AllowedKeywords.includes(item);`）、`core/syntax/templates/template.xl.md:37`（`## field KeywordTemplate:KeywordTemplate = new KeywordTemplate()`）
- 结论：偏离（1 条；`X1` ○）。

---

## 本批统计

| # | 文件 | 字节 / 代码行 | 偏离数 | 编号 |
| --- | --- | --- | --- | --- |
| 1 | basic-dispatch.xl.md | 15447 / 259 | 5 | `X1`●×3、`P1`○、`B4`○ |
| 2 | symbol-template.xl.md | 5386 / 141 | 0 | — |
| 3 | template.xl.md | 2587 / 10 | 3 | `X1`●×3 |
| 4 | regex-template.xl.md | 2068 / 48 | 3 | `X1`●、`U1`○、`C1`○ |
| 5 | sequence-template.xl.md | 1962 / 28 | 3 | `X1`●×2、`X1`○ |
| 6 | sequence.xl.md | 1642 / 36 | 1 | `B1`○ |
| 7 | number-template.xl.md | 1178 / 26 | 1 | `C1`● |
| 8 | method-name-template.xl.md | 615 / 11 | 1 | `X1`○ |
| 9 | string-template.xl.md | 590 / 0 | 0 | — |
| 10 | keyword-template.xl.md | 518 / 8 | 1 | `X1`○ |

- 合计：10 文件、31993B、567 代码行；**8 个文件有偏离**，共 **18 条**（● 10 条 / ○ 8 条）。
- 按编号：`X1` 12（● 9 / ○ 3）、`P1` 1 ○、`B4` 1 ○、`U1` 1 ○、`C1` 2（● 1 / ○ 1）、`B1` 1 ○。`S1`/`S2`/`S3`/`S4`/`P2`/`P3`/`P4`/`C2`/`C3`/`U2`/`U3`/`U4`/`B2`/`B3`/`R1`/`R2`/`X2`/`X3`/`D1` 全为 0。
- 贯穿性结论（一条，非新增编号）：**「模板层」整体是 IMPORTANCE 之外多出来的一层**——`basic-dispatch` + `template.BranchTemplate` + `sequence-template` 三者构成一个「字符级跳转队列 + 位表 + 按 token 类型分发」的机制，它取代的是 `IMPORTANCE.md:20` 那条「basic token 关闭 / bracket 创建 ⇒ 触发 possible」的唯一路径：分词与关闭时机都在这一层被决定（见 1/3/5 号文件）。本批 10 个文件里没有一处 `ComputePossibleShapes`/`BuildByIndex`/`ParseFromShape`，即这层既不建形状也不产出 AST，全部偏离都落在「谁决定边界、谁决定关闭」上。
- 三条最该先看：① `basic-dispatch.xl.md:269-271`（`TryToClose` + `Reload` 由分派器发起 ⇒ `P1`）；② `sequence-template.xl.md:29,54,60`（模板队列缓存永不失效，重配置被静默忽略）；③ `number-template.xl.md:24-31`（possible 每轮重扫后缀表 ⇒ `C1` ●，`IMPORTANCE.md:61` 判「差」）。
