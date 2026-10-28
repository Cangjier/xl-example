# 80-run —— `typescript/run` 设计偏离审计

判据：`docs/importance-1028/01-rules.md`（R01–R36、S1…D1）；事实表：`docs/importance-1028/_facts/typescript-run.md`。
本批 5 文件，逐个读完；只记录结论与证据，源码与 `docs/IMPORTANCE.md` 一字未改。

### typescript/run/typescript-template.xl.md（8826B / 204行；TypeScriptRegexTemplate、TypescriptTemplate）

- 结构：模板层（basic token 的外围配置与词法判定）。`TypeScriptRegexTemplate` 覆盖 core `RegexTemplate` 的 `IsFlag` / `CanStartAt`；`TypescriptTemplate.Create` 装配 `Template`（符号合成表、字符串/数字/模板串开关、正则模板与表达式关键字）。不涉及 shape / possible / end / cache。
- 偏离：
  - `[X1]` ● 模板注册表把「字符→basic token」的分派装成表驱动层，IMPORTANCE 没有这一层 — 证据 `typescript-template.xl.md:249`（`template.BranchTemplate.DefaultValue = Template.BasicBranchQueue();`）；该默认队列只含 `BasicDispatch.Transit`，它在 `core/syntax/templates/basic-dispatch.xl.md:49-53` 用 `template.BasicClassTable` 的位图按 `charCodeAt` 直达某类 token。它替代的是「9 类 basic token 逐个 `Transit` 试错」的链式分派；代价是分类判据出现第二份副本——`basic-dispatch.xl.md:289-316` 的 `BuildClassTable` 又读了一遍 `BomChars` / `ShebangMarker` / `Quotes` / `( { [` / `IsWhiteSpace` / `IsSymbol`，与各类 token 自己的 `Transit` 判据并列存在。
  - `[X1]` ● 词法层反向查询语法层：用运行时注册表 + 类名字符串反射判断「这个单元是不是操作数」 — 证据 `typescript-template.xl.md:118-131`（`ExpressionAtomRegistry.HasContainer(unit)`，随后 `unit.constructor.name` 的 `endsWith("ExpressionShape")` / `endsWith("LiteralShape")` / `=== "IdentifierShape"`）；`ExpressionAtomRegistry` 本身是 shape 实例的 `Set<any>`（`typescript/tokens/expressions/forms/shared/expression-atom-registry.xl.md:14-16,81`）。IMPORTANCE 只定义 basic token→语法层的单向消费（IMPORTANCE.md:7），没有反向查询通道；按类名后缀分派在设计里也无对应物。
  - `[S1]` ○ basic token 层越权承担「`/` 是正则起点还是除号」的语法裁决 — 证据 `typescript-template.xl.md:26-67`（`CanStartAt` 里 `IsControlHeadTail` 判 `if (…)` / `while (…)` 头、`IsArrowBodyTail` 判 `=> {` 体尾、`IsStatementBraceTail` 判语句块尾），另 `:69-113`（`CanEndOperand` 判 `)` / `]` / `}` / `++` / `--` 是否结束操作数）。这些是语法形态判断，却落在词法模板里；因 TS 扫描器本身也要做同一裁决，故记疑似。
  - `[X1]` ○ 硬编码 30 项二元运算符表，与语句层同表重复 — 证据 `typescript-template.xl.md:218`（`text === "=="` … `text === ">>>="` 的长串），同一集合另有一份在 `typescript/tokens/statements/statement-route-util.xl.md:396-407`（`IsBinarySymbol`）。设计未定义「运算符集合」归属层，两处副本是同一判据的两个真相源。
- 结论：偏离（4 条）。文件为纯配置 + 纯词法判定，无 `ExitOrPre` 覆盖、无 `ComputePossibleShapes` 覆盖、无 catch、无 tokenIndex，故 R1/R2/B2/B4 不涉及；围栏外散文 0 行，无 D1。

### typescript/run/text-document.xl.md（5023B / 145行；TextDocument extends Document）

- 结构：文档层（token 之下的字符数据源），实现 `Document` 的抽象成员并加行号索引。不参与分词，也不参与 shape / possible。
- 偏离：
  - `[X1]` ○ 行号体系与行终止符体系是两套口径，设计未规定二者同源 — 证据 `text-document.xl.md:30-36`（`ProcessLineStartOffsets` 只在 `this.Content[i] === "\n"` 处切行），而同一批的 `line-terminator.xl.md:16`（`"\n" || "\r" || "\u2028" || "\u2029"`）。后果：只有 `\r` 的旧式文件、以及含 U+2028/U+2029 的文件，`GetLine` / `GetLineOffset` / 诊断里的 `at file:…:N` 行号与词法层认定的换行不一致。
  - `[C1]` ○ 诊断渲染每次调用都从头重扫全文重建行表，已算好的 `LineStartOffsets` 不用；两个方法除前缀外逐字重复 — 证据 `text-document.xl.md:112-124`（`for (let i = 0; i < count; i++) { … lines.push(lineTemp) … }`）与 `:167-179`（同一段循环再写一遍）。判据 R08 只约束 compute/build，这里是诊断路径，故记疑似。
- 结论：偏离（2 条）。判定要点逐条核过：分词/切词里无 syntax 判断（`:20` 只传 `(index) => content[index]` 与长度取用器，`ProcessLineStartOffsets` 只找 `\n`，不看 token、不看 shape）⇒ 无 S1；越界一律 `throw`（`:61`、`:75`、`:89`）不 catch ⇒ 无 B2；无 `tokenIndex` 概念，`GetValue` 是调用方定点的随机读，不存在「看 tokenIndex 之后」的分支 ⇒ 无 B4。`Document.GetValue` 契约返回字符而非 `Nothing`，与本文件不构成 B1。

### typescript/run/line-terminator.xl.md（3172B / 92行；LineTerminator）

- 结构：词法工具层（行终止符判定），供 ASI / 形状判定查询「两 token 之间 / 之后有没有换行」。静态方法集合，无状态、无 shape。
- 偏离：
  - `[X1]` ○ 自带一套原文扫描器，把注释词法的判据在手写循环里复制了一份 — 证据 `line-terminator.xl.md:109-129`（`if (next === "/") { … while (at < count && !IsLineTerminator(whole.At(at))) at++; }` 与 `if (next === "*") { … while (at + 1 < count && !(whole.At(at) === "*" && whole.At(at + 1) === "/")) … }`）：行注释 / 区域注释的边界判据在 basic token（`LineAnnotation` / `AreaAnnotation`）里已有一份，这里是第二份。IMPORTANCE 只定义 basic token 层（IMPORTANCE.md:7-17），没有「词法工具直接逐字符读原文并自判注释」这一层。
  - `[B4]` ○ `HasAfter` 读 token 之后的原文 — 证据 `line-terminator.xl.md:99-131`（`let at = last.EndIndex; while (at < count) { const ch = whole.At(at); … }`，会一路跳过空白与注释直到下一个代码字符或 EOF）。读的是已完整装载的原文而不是尚未建出的 token，R22 担心的「数据未就绪」不成立，故记疑似而非确认；同一文件里 `HasBefore` 只读到 `units[tokenIndex].SourceRange` 起点为止（`:76` 经 `HasBetween:54-59`），不越界，两者的差别说明「越界读原文」是有意只留在 `HasAfter` 一处。
- 结论：偏离（2 条）。R25 方向是符合的：`HasBefore` 先判 `tokenIndex < 1 || tokenIndex >= units.length`（`:66-68`）、`HasAfter` / `HasBetween` 先判 `null` 与负索引（`:45-51`、`:90-96`）才取值，无解引用越界 ⇒ 无 B1；全是纯函数判定，无 catch、无 `ExitOrPre`、无 possible ⇒ 无 B2/R1/R2；围栏外散文 0 行 ⇒ 无 D1。

### typescript/run/source-file-runner.xl.md（2384B / 34行；SourceFileRunner）

- 结构：驱动层——`SyntaxContext.Process` 的唯一调用者（`:50`），负责建模板、建根形状、建文档、发车，并在失败时换配置重来。
- 偏离：
  - `[X2]` ● 失败即整文件换配置重解析，这是一条 legacy 全量旁路 — 证据 `source-file-runner.xl.md:23-30`（`try { return ParseCore(text, filePath, true); } catch (error) { … const root = ParseCore(text, filePath, false); … return root; }`）。第二趟在 `:47-50` 重新 `TypescriptTemplate.Create()`、重新 `new SourceFileShape`、重新 `new TextDocument` 并重新 `context.Process`，第一趟的整棵 shape 树、possible cache 与已切出的 basic token 全部丢弃。**这与 R17 的 `Reload` 通道是两回事**：R17④ 的 `Reload Message` 是 `SyntaxContext.Process` 内部按单字符窗口重放（`core/syntax/syntax-context.xl.md:122-149`），R17③ 的 `Reclose` 是在原树上重开 close；而这里是进程级「换一套引擎重跑整篇」，连 `SyntaxException: no progress`（`syntax-context.xl.md:90-93`）这类死锁也被它以重跑收口，而不是作为诊断上报。
  - `[X1]` ● 驱动层维护一组 IMPORTANCE 未定义的运行时开关位与指标计数器，并在解析期间就地改写全局状态 — 证据 `source-file-runner.xl.md:38-45`（`EnableShellExpressions` / `EnableIncrementalVariableShapes` / `EnableIncrementalShapes` 三个全局位被 `ParseCore` 就地赋值，`shell=false` 时把两个增量位一起压 false）与 `:52-56`（`finally` 里逐个还原），以及 `:26-28`（`FileFallbackCount` 自增、`LastFileFallback` 置位）。这些位本身定义在 `statement-route-util.xl.md:73,75,83,91-95`，被 50 余处代码读作模式闸（例如 `source-file-shape.xl.md:87-91`、`block-possible-shape.xl.md:196`）。IMPORTANCE 没有「解析模式开关」层，也没有指标计数器。
  - `[C2]` ○ 兜底趟把两个增量引擎整体关掉，于是同一份 `*.xl.md` 里增量建形状与全量/legacy 建形状两条管线并存 — 证据 `source-file-runner.xl.md:42-45`（`StatementRouteUtil.EnableIncrementalVariableShapes = false; StatementRouteUtil.EnableIncrementalShapes = false;`）配 `:27`（`ParseCore(text, filePath, false)`）。按 R06/R07「能增量而用全量 ⇒ 差」，兜底趟正是全量；但它不是主路径而是失败后的第二趟，故记疑似。
  - `[B2]` ○ 异常被 catch 后彻底吞掉：`error` 未使用、无日志、无重抛，调用方只拿到另一棵树 — 证据 `source-file-runner.xl.md:25-29`（`} catch (error) { StatementRouteUtil.FileFallbackCount = …; … return root; }`）。R23 要求 compute/build 的异常作为 possible 诊断给用户看，此处异常不产生于 compute/build 内（位置在驱动层），但「诊断消失」的后果与 R23 所指相同，故只记疑似。
- 结论：偏离（4 条）。除上述外无别的路径：`ParseCore` 只有一条 `context.Process` 发车（`:50`），窗口大小 128 硬编码在 `:49`；无 `ExitOrPre` / `ComputePossibleShapes` 覆盖 ⇒ 无 R1/R2；不碰 `host.Data[tokenIndex]` ⇒ 无 B1/B3/B4/U1–U4；围栏外散文 0 行 ⇒ 无 D1。

### typescript/run/typescript-symbol-template.xl.md（1193B / 39行；TypeScriptSymbolTemplate extends SymbolTemplate）

- 结构：模板层里的字符分类器与符号合成约束（`IsWhiteSpace` 扩表、`IsCombineBlocked` 禁合），只被 `Symbol` / `WrapSymbol` 的 `Transit` 读取，不涉及 shape / possible / end / cache。
- 偏离：
  - 无（符合：两个方法都是纯函数式的词法事实判定——`IsWhiteSpace` 在 `super` 之上补 U+000B/U+000C/U+0085/NBSP/各种空格（`:13-44`），`IsCombineBlocked` 只禁 `?:` 与「`?.` 后接数字」（`:50-55`），前者是空白集合、后者是「`a ? .5 : b` 不能被并成 `?.`」的词法前瞻，都不需要读形状、不产生 candidate、不写 cache；无 catch、无 tokenIndex、无原文扫描、无 `ExitOrPre`）。唯一可议的是 U+2028/U+2029 同时被算作空白（`:36-37`）与行终止符（`line-terminator.xl.md:16`），这与 TS 的 `isWhiteSpaceSingleLine` / `isLineBreak` 双真口径一致，不构成偏离。
- 结论：符合（0 条）。

## 本批统计

| 文件 | 字节 | 代码行 | ● | ○ | 合计 |
| --- | --- | --- | --- | --- | --- |
| `typescript/run/typescript-template.xl.md` | 8826 | 204 | 2 | 2 | 4 |
| `typescript/run/text-document.xl.md` | 5023 | 145 | 0 | 2 | 2 |
| `typescript/run/line-terminator.xl.md` | 3172 | 92 | 0 | 2 | 2 |
| `typescript/run/source-file-runner.xl.md` | 2384 | 34 | 2 | 2 | 4 |
| `typescript/run/typescript-symbol-template.xl.md` | 1193 | 39 | 0 | 0 | 0 |
| **合计** | **20598** | **514** | **4** | **7** | **11** |

按编号：`X1` 5（●3 / ○2）、`S1` 1（○）、`X2` 1（●）、`B2` 1（○）、`B4` 1（○）、`C1` 1（○）、`C2` 1（○）。本批 5 文件中 4 个有偏离，1 个（`typescript-symbol-template.xl.md`）符合。未出现：`S2`/`S3`/`S4`/`P1`–`P4`/`C3`/`U1`–`U4`/`B1`/`B3`/`R1`/`R2`/`X3`/`D1`。

三个最值得先处理的问题：

1. `X2`（`source-file-runner.xl.md:23-30`）——失败后整文件换配置重解析，把 possible 的诊断与死锁都变成静默第二趟；这是本批唯一会掩盖其它所有缺陷的机制。
2. `X1`（`source-file-runner.xl.md:38-45,52-56`）——三个全局解析模式开关在解析期间被就地改写，50 余处代码读它做模式闸；设计里没有这一层，且它使「同一份代码走哪条管线」不可从输入推断。
3. `X1`（`typescript-template.xl.md:249` 与 `:118-131`）——字符→token 位表分派层、以及词法层用 `ExpressionAtomRegistry` / 类名反射回问语法层；两者都是 IMPORTANCE 未定义的跨层/反射通道，判据出现第二份副本。
