# 85 — members 与 bindings（对象/枚举成员、解构绑定）

审计范围：`typescript/tokens/members/*.xl.md` 11 个 + `typescript/tokens/bindings/*.xl.md` 6 个，共 17 个。
判据见 [`01-rules.md`](01-rules.md)。

**本层总评**：这一层是全仓**最接近 IMPORTANCE 原意**的一层——`PropertyAssignmentShape.FromParts`、`ShorthandPropertyAssignmentShape.FromParts`、`SpreadAssignmentShape.FromExpression`、`ImportAttributesShape.FromBracket` 四个都是 R31「立即关闭」的标准写法（签范围 → 取字段 → `TryToClose`），`ImportAttributesShape.FromBracket` 甚至连 `IMPORTANCE.md:80` 都点名了。两个绑定模式 possible 也是 R09/R11 的正面样板（把扫描进度记进 `state`，`Checked` 往前推，不从头重扫）。

偏离集中在三处：① `heritage-clause` / `binding-element` / 两种 pattern 的 `FromBracket` 都是**手写递归下降解析器**（`S4`/`X1`：形状自己切 token、自己调 `ExpressionBuilder`）；② `enum-member-possible` 在 `BuildByIndex` 里 `try/catch` 吞异常（`B2`，R23 明令禁止）；③ 成员壳（`enum-member-shape`）覆盖了 `ExitOrPre` 与 `ComputePossibleShapes`（R33/R34）。

---

### typescript/tokens/members/case-clause-shape.xl.md（343B / 19 行；`CaseClauseShape`）
- 结构：`switch` 的 `case` 子句标记 shape，只有构造函数。
- 偏离：
  - `[S4]` ○ 纯标记壳，没有字段、没有 `Close` 收口，AST 只能由 `StatementBuilder` 之类的旁路产出（第 20 篇），与 R21 相反。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/members/catch-clause-shape.xl.md（330B / 19 行；`CatchClauseShape`）
- 结构：`catch` 子句标记 shape。
- 偏离：`[S4]` ○ 同上，纯标记、无数据提取、无 `ParseFromShape`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/members/default-clause-shape.xl.md（347B / 19 行；`DefaultClauseShape`）
- 结构：`default` 子句标记 shape。
- 偏离：`[S4]` ○ 同上。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/members/enum-member-shape.xl.md（1362B / 45 行；`EnumMemberShape`）
- 结构：枚举成员壳，`Data` 里攒原始单元；`ExitOrPre` 与 `ComputePossibleShapes` 都转给 `MemberShellCatalog`。
- 偏离：
  - `[R1]` ● 覆盖 `ExitOrPre`：`MemberShellCatalog.IsOpen(this)` 为真时走 `HandOffOnBodyClose`，返回 `Reload` 让出字符（`:27-36`）。R33 明令 shape 禁止覆盖 `ExitOrPre`。
  - `[R2]` ● 覆盖 `ComputePossibleShapes`，把 possible 计算整个转给 `MemberShellCatalog.HeadCompute`（`:38-45`）。R34 明令禁止。
  - `[X1]` ● `MemberShellCatalog` 是 IMPORTANCE 没有的「成员壳目录」机制（第 40 篇详审），一个 shape 的 possible 计算被搬进静态目录类。
  - `[U4]` ○ 壳自己不在 `Close` 里丢弃 basic token（没有 `Close` 覆盖），`Data` 的清理依赖 `HandOffOnBodyClose`。
- 结论：偏离（4 条，3 条明确）。

### typescript/tokens/members/enum-member-possible-shape.xl.md（8445B / 297 行；`EnumMemberPossibleShape`、`EnumMemberPossibleUtil`、`EnumMemberPossibleScan`）
- 结构：枚举成员的 possible——用 `EnumMemberPossibleScan`（`Start/Checked/End/NameAt/CodeAt/Early`）记录扫描进度，`BuildByIndex` 里建成员或用 `MemberShellCatalog.Create` 建「早期外壳」。
- 偏离：
  - `[B2]` ● **`BuildByIndex` 里 `try { … } catch { built = null; }`**（`:282-287`）：R23 明令「compute/build 过程中发生的异常禁止 catch 吃掉，这些异常是 possible 诊断」。这里把成员建树失败吞成 `null`，再用注释解释为「恢复形留给 raw 兜底」。
  - `[B4]` ● `NextChar(last.SourceRange)` 从最后一个 token 的 `EndIndex` 往后读**原始文档**，跳过空白与注释直到下一个字符（`:80-118`），并在 `Analyze` 里用它判「成员是否已闭合」（`:165-189`）。这是 R22 禁止的「看 `tokenIndex` 之后」。
  - `[B1]` ○ 越界返回 `Uncertain` 而非 `Nothing`（`:236-239`）。
  - `[P3]` ○ `BuildByIndex` 的产出直接 `splice` 进宿主并 `return built`（`:294-296`）；`Early` 分支交给 `MemberShellCatalog.Create`（`:271-273`）——挂载/关闭由第三方决定，R31/R32 的两种去向在这里都不由自己完成。
  - `[X1]` ○ `Early` 早建 + `MemberShellCatalog` 外壳：设计里没有「先建空壳、稍后由 legacy 建正品」的通道。
- 符合项（这一条要留住）：cache 用法是**正确样板**——`Scan` 用 `ItemUtil.ItemStartCached` + `cache.GetState/SetState`，`state.Checked` 只增量推进（`:192-221`），符合 R09/R11；`IsBuildable` 只在恰好一个候选时被问（R30），它读的就是 cache 里的状态（`:247-255`）。
- 结论：偏离（5 条，2 条明确）。

### typescript/tokens/members/heritage-clause-shape.xl.md（9081B / 216 行；`HeritageClauseShape`）
- 结构：`extends` / `implements` 子句。`FromParts` 立即关闭；`BuildClauses` 是**手写的整段解析器**：`new TypeBuilder` 装全部单元，循环里按文本分派，类型字面量交给 `TypeBuilder`，`A.B` / `(x)` / `x[y]` / `new A()` 交给 `ExpressionBuilder`。
- 偏离：
  - `[S4]` ● `BuildClauses` 从原始单元直接产出 `ExpressionWithTypeArgumentsShape`（`:176-205`），AST 的层级（哪些是 expression、哪些是 type arguments）由这段手写逻辑决定，而不是由 possible 收敛 + `ParseFromShape` 决定。
  - `[X2]` ● 两处整段交 legacy：`new TypeBuilder(host.Template, context); builder.Load(units, basePos)`（`:59-60`）与 `new ExpressionBuilder(...); Load(units.slice(...))`（`:176-178`）。
  - `[C1]` ● 两次线性扫描找泛型实参的 `<`…`>`：先 `while (genericCursor < builder.Units.length)` 找 `<`（`:130-136`），再从 `<` 扫到配对的 `>`（`:137-163`），每次调用都重来。
  - `[X1]` ○ 为了区分「表达式承载的实体」与「名字 + 泛型实参」写了一大串启发式（`:93-126`：`new`/`typeof`/`void`/`await`/`yield`/`delete`、`.`/`?.`、`(`/`[`、模板串…）。设计里这个判断本该由候选收敛给出。
- 符合项：`FromParts` 是 R31 的标准写法（`ClauseKind`/`Types` 取字段 → 签范围 → `TryToClose`，`:35-53`）。
- 结论：偏离（4 条，3 条明确）。

### typescript/tokens/members/import-attribute-shape.xl.md（3065B / 87 行；`ImportAttributeShape`）
- 结构：`with { type: "json" }` 里的一个键值对；`FromTokens` 从 token 数组建，键用 `IdentifierShape`/`StringLiteralShape`，值交 `ExpressionBuilder.ParseAssign`。
- 偏离：
  - `[X2]` ● 值整段交 legacy：`new ExpressionBuilder(...); valueBuilder.Load(valueUnits, valuePos); ParseAssign()`（`:68-70`）。
  - `[X1]` ○ 键的两种形态（标识符 / 字符串）在这里用 `instanceof` 手判（`:48-60`），而不是由 possible 收敛决定。
- 符合项：`FromTokens` 签范围并 `TryToClose`（`:79-86`），`Key`/`Value` 是字段、`Data` 只放子形状 → R31 + R20/R19。
- 结论：偏离（2 条，1 条明确）。

### typescript/tokens/members/import-attributes-shape.xl.md（2053B / 68 行；`ImportAttributesShape`）
- 结构：`FromBracket` 把整个 `{…}` 括号按 `,` 切组，每组交 `ImportAttributeShape.FromTokens`。
- 偏离：
  - `[X1]` ○ 花括号里再按 `,` 手切成组（`:39-54`），是「括号内再解析」的第二层手写切分；设计里组内元素应由各自的 possible 收敛（R04）。
- 符合项：**这是 `IMPORTANCE.md:80` 点名的样板**——`FromBracket` 签范围（`:60-65`）、取字段（`Token`/`Elements`）、`TryToClose()`（`:66`），与「立即关闭」逐字对应；`Data` 只含 `ImportAttributeShape` 子形状（`:56-59`），R20 成立。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/members/property-assignment-shape.xl.md（1134B / 41 行；`PropertyAssignmentShape`）
- 结构：`{ a: 1 }` 的 `a: 1`；`FromParts` 只收名与值两个子节点（冒号/逗号不是节点，与 TS 一致）。
- 偏离：无。
- 符合项：R31 标准写法：`NameToken`/`Initializer` 取字段、`Add` 两个子形状、`SignInToken`/`SignOutToken`、`TryToClose`（`:29-40`）；`Data` 恰好是 AST children（R20）。
- 结论：符合。

### typescript/tokens/members/shorthand-property-assignment-shape.xl.md（1373B / 47 行；`ShorthandPropertyAssignmentShape`）
- 结构：`{ a }` 与 `{ a = 1 }`；`FromParts` 按有无默认值决定子节点数与区间终点。
- 偏离：无。
- 符合项：R31 + R20（`a = 1` 的默认值作为第二个子节点，`:34-46`）。
- 结论：符合。

### typescript/tokens/members/spread-assignment-shape.xl.md（1285B / 41 行；`SpreadAssignmentShape`）
- 结构：`{ ...p }`；`...` 只参与区间与字段，不进 `Data`。
- 偏离：无。
- 符合项：R31（`FromExpression` 签 `...` 到表达式终点、取 `DotDotDot`/`Expression` 字段、`TryToClose`，`:27-40`）；`Data` 只有表达式一个子节点，与 TS 的 `SpreadAssignment` children 一致（R20）。
- 结论：符合。

### typescript/tokens/bindings/array-binding-pattern-shape.xl.md（2729B / 86 行；`ArrayBindingPatternShape`）
- 结构：`const [a, , b] = xs` 的 `[…]`；`FromBracket` 把括号内单元按 `,` 切组，空位造零宽 `OmittedExpressionShape`。
- 偏离：
  - `[X1]` ● 形状自己做「按逗号切组 + 判空位 + 造零宽节点」（`:35-81`）：这是括号内再解析，设计里组内元素应由 candidate 收敛（R04）；零宽节点的 `SourceRange` 是手工捏的（`:74-79`）。
  - `[C2]` ○ 每次都把整个 `bracket.Data` 重新分组（`:39-53`），没有任何增量信息可用。
- 符合项：`FromBracket` 最后签范围 + `TryToClose`（`:82-84`），`Data` 只放元素形状（R20）。
- 结论：偏离（2 条，1 条明确）。

### typescript/tokens/bindings/object-binding-pattern-shape.xl.md（1955B / 68 行；`ObjectBindingPatternShape`）
- 结构：`const { a, b: c } = o` 的 `{…}`；同样按 `,` 切组。
- 偏离：
  - `[X1]` ● 与 array 版几乎逐行相同的第二份切组实现（`:34-63`）：同一语义两份代码，改一处必忘另一处。
- 符合项：签范围 + `TryToClose`（`:64-66`）；空组（`{ a, }`、`{}`）被判为非元素（`:55-58`），与 TS 一致。
- 结论：偏离（1 条，明确）。

### typescript/tokens/bindings/binding-element-shape.xl.md（6661B / 210 行；`BindingElementShape`）
- 结构：一个绑定元素（`...`? / 属性名 / 绑定名 / 默认值）。`FromTokens` 是**手写递归下降**：剥 `...`、判 `:`、判 `=`，默认值交 `ExpressionBuilder.ParseAssign`，名字交 `IdentifierShape` 或递归到两个 pattern 的 `FromBracket`。
- 偏离：
  - `[S4]` ● 绑定元素的 AST 层级（`DotDotDot`/`PropertyName`/`BindingName`/`Initializer` 四个字段 + 四个子节点）由这段手写逻辑决定（`:190-209`），没有 possible 收敛、没有 `ParseFromShape`。
  - `[X2]` ● 默认值与计算属性名两处整段交 legacy：`new ExpressionBuilder(first.Template, context); builder.Load(tokens.slice(index), …); ParseAssign()`（`:179-181`）与 `[k]` 的计算名（`:119-128`）。
  - `[X1]` ○ `MakeRest` 造 `DotDotDotTokenShape` 并**塞进 `Data`**（`:195-197`）；TS 的 `BindingElement` children 确实含 `dotDotDotToken`，但这里的 `...` 是由标点形状冒充的（`Symbol` 三点会被 `MakeRest` 合成为一颗形状）。
  - `[B1]` ○ `FromTokens` 大量 `return null` 表示「这不是一个元素」（`:79-110`、`:187-189`）——调用方拿到 `null` 只能静默跳过，与 R25 的 `Nothing` 语义混在一起。
- 符合项：`FromTokens` 签范围 + `TryToClose`（`:205-208`）；`Data` 只放子形状，`DotDotDot` 之外不塞 basic token（R20）。
- 结论：偏离（4 条，2 条明确）。

### typescript/tokens/bindings/binding-element-possible-shape.xl.md（5447B / 181 行；`BindingElementPossibleShape`）
- 结构：绑定元素的 possible——用 `BindingElementScan`（`Checked`/`LastCode`/`HasShape`）增量记录，只有「下一个非 trivia 单元是 `,`/`}`/`]`」时才 `Accept`。
- 偏离：
  - `[B4]` ● 为了判「下一个单元是不是分隔符」，它从 `tokenIndex + 1` 一路扫到 `units.length`（`:111-127`）：R22 明令「只允许查看 tokenIndex 之前，禁止查看其后，因为此时 tokenIndex 之后的数据不一定准备好」。
  - `[B1]` ○ 越界返回 `Uncertain`（`:38-40`）。
  - `[P2]` ○ 建不出来时 `return host`（`:162-164`、`:140-142`）——候选已 `Accept` 却没有产出，等于「僵尸候选」，与 R27 的「Accept 即终结、必须 build」不一致（另见第 30 篇 `export-declaration-possible-shape` 的同款问题）。
  - `[X1]` ○ `BuildByIndex` 为了找组首，**又把 `ComputeByIndex` 里做过的分组从后往前重做一遍**（`:143-154` vs `:69-92`）：同一分组两份实现。
- 符合项：cache 用法正确（`GetState/SetState` + `state.Checked` 只增量推进，`:41-60`），符合 R09/R11，注释也指明了 IMPORTANCE 的 cache 要求；build 产出交 `BindingElementShape.FromTokens` 后 `splice` 换入（`:178-180`）。
- 结论：偏离（4 条，1 条明确）。

### typescript/tokens/bindings/array-binding-pattern-possible-shape.xl.md（3349B / 105 行；`ArrayBindingPatternPossibleShape`）
- 结构：`[` 作为解构 pattern 起点的 possible——只看「到 tokenIndex 为止最后一个非 trivia 单元是不是 `[` 括号」，`BuildByIndex` 调 `ArrayBindingPatternShape.FromBracket` 并 `splice`。
- 偏离：
  - `[B1]` ○ 越界返回 `Uncertain`（`:36-38`）。
  - `[X1]` ○ `BuildByIndex` 里手工算 `Pos`（向前找上一个非 trivia 单元的 `End`，`:87-101`），同一件事在 `object` 版里换成了 `ShapePosition.PosAt`——同一语义两份实现，已经不一致。
- 符合项：cache 增量扫描（`:39-58`，`state.Checked`）；`Reject` 只在「宿主里已经有 `ArrayBindingPatternShape`」时给出（`:59-61`），符合 R26 的淘汰语义；build 后 `splice` 换入、`Parent` 设好（`:102-103`）。
- 结论：偏离（2 条，均疑似）。

### typescript/tokens/bindings/object-binding-pattern-possible-shape.xl.md（3146B / 92 行；`ObjectBindingPatternPossibleShape`）
- 结构：`{` 作为解构 pattern 起点的 possible，与 array 版同构。
- 偏离：
  - `[B1]` ○ 越界返回 `Uncertain`（`:37-39`）。
  - `[X1]` ○ 与 array 版是两个几乎逐行相同的类（只有 `StartBracketChar` 与 `Pos` 算法不同），同一语义两份实现。
- 符合项：cache 增量扫描（`:40-59`）；`Pos` 统一交给 `ShapePosition.PosAt`（`:88`），比 array 版更规范。
- 结论：偏离（2 条，均疑似）。

---

## 本批统计

- 文件数：17；有偏离：14（明确 8）；完全符合：3（`property-assignment`、`shorthand-property-assignment`、`spread-assignment`）。
- 按编号计数：`X1:8`、`X2:3`、`S4:5`、`B4:2`、`B1:4`、`B2:1`、`R1:1`、`R2:1`、`C1:1`、`C2:1`、`P3:1`、`P2:1`、`U4:1`。
- 本批最严重 3 条：
  1. `[B2]` `enum-member-possible-shape.BuildByIndex` 用 `try/catch` 吞掉建树异常（`:282-287`），正是 R23 明令禁止的写法。
  2. `[R1]/[R2]` `enum-member-shape` 同时覆盖 `ExitOrPre` 与 `ComputePossibleShapes`，把 possible 计算搬进 `MemberShellCatalog`（R33/R34）。
  3. `[X1]` 两套 pattern 的「按逗号切组」与两套 `Pos` 算法各自成对实现（array/object、binding-element 的 Compute/Build），同一语义多份代码。
