# 剩余失败分类：9 个 AST diff 组

本文件只做分析（不改代码 / `.xl.md` / 语料 / `IMPORTANCE.md`）。对象：主仓 `feature/quick-parse`
HEAD `85daba1d` 上 `token-ast.mjs` 的 **9 份 diff**（token 语料读数 **1648 ok / 35 crash / 9 diff /
10 ts-invalid / 1 gap-now-passing**，known-gap 2）。每份的读数、TS-vs-本仓节点树、根因落点、
§6 归类、修法、难度/风险与是否值得修如下。

## 0. 方法与读数

```text
node typescript/cases/token-ast.mjs <9 个过滤词>     → 9/9 DIFF（无 crash）
tmp/probe.mjs（本文件同目录的一份临时探针，未提交）→ 对每份文件输出 ts/cj 的扁平节点 + pos/end 计数差
```

扁平口径与 `token-ast.mjs` 相同：`ts.createSourceFile` 的 `forEachChild` vs 本仓 shape `Data`，
`ts` 端 pos/end 左闭右开，`cj` 端已换算成 `[shape.Pos, End.Index+1)`。

## 1. 分组表（按根因）

| 组 | 名称 | 份数 | 文件 | 共同根因 | 难度 |
| --- | --- | --- | --- | --- | --- |
| **G-A** | 语句/成员边界 ASI 判据（end compute） | 3 | `stmt-throw-no-argument-then-statement`、`gap-r907-index-signature-newline-after-readonly`、`decl-class-computed-member` | `;`/换行处「能不能续接」的收口判据：throw 的 restricted production、`readonly` 与 `[` 必须同行、`= 1` 换行 `[` 仍算续接 | S / S-M / M |
| **G-B** | 语句收口与候选（块尾/do 体） | 2 | `gap-r1231-decl-newline-operator`（known-gap）、`stmt-do-while-body-terminated` | 块 `}` 后换行 `/` 的开新语句 + `do` 体自带 `;` 的壳形态没接住 | M / M-L |
| **G-C** | build 出的节点嵌套/投影 | 3 | `gap-r979-new-inst-tagged`、`gap-r869-exp-named-newline-then-from-like`、`gap-r955-yield-await-outside-context` | build/投影阶段节点层级与 TS 不同：`new` + 标签模板的外层、`from(…)` 的括号化 moduleSpecifier、裸 `yield`/`await` 的 Identifier 化 | M / S / L |
| **G-D** | 类型位「词 + `{`」边界（known-gap） | 1 | `gap-r1237-type-position-brace` | 类型位里 `{` 的归属（heritage 的类型字面量 vs 接口体；谓词类型字面量 vs 函数体） | L |

## 2. 逐组展开

### G-A1 `statements/stmt-throw-no-argument-then-statement.ts`（1 份，S，真 bug / TS 恢复形）

**行号原文**（:5-6）：

```text
5: function f(){ throw
6:  x; }
```

**差异明细**（实测）：
- TS：`ThrowStatement[178,184)`（无表达式）→ 子节点零宽 `Identifier[184,184) text=""`；随后 `ExpressionStatement[184,188)` → `Identifier[184,187)`（`x`）。
- 本仓：`ThrowStatement[178,188)` → `Identifier[184,187)`（`x` 被吞成 throw 的表达式），没有第二条语句、没有零宽节点。

**根因**：`typescript/tokens/statements/statement-builder.xl.md` → `BuildReturnOrThrow`（:1040-1092）。
`split` 条件写死 `!isThrow`（:1050-1052），所以 `throw` 换行后不会走「无操作数」分支；后面 :1057-1064
的扫描把下一行 `x` 收成表达式，:1074-1086 的零宽 `Identifier` 合成代码永远进不去。

**§6 归类**：**end compute 不对**（restricted production 的换行收口没判）。

**修法**：让 `split` 对 `throw` 也成立（throw 后换行即收口）；收口后走 :1074 的零宽 `Identifier`
合成（TS 恢复形，现有代码已备好），再让下一行成为独立 `ExpressionStatement`。
- 何时 build：`throw` 关键字那一格（换行判据在关键字 `End` 之后）。
- build 提取：ThrowStatement 的 End = 关键字 End；零宽 Identifier 的 Pos/End = 关键字 End+1。
- 何时 close：换行成立即 close，`;` 不在 throw 范围内。

**回归风险**：低（只影响 `throw` 换行；`throw x;` 仍走原路）。**是否 TS 恢复图**：是（TS 对
`throw\n…` 报诊断并给零宽节点），但本仓尺子按 TS AST 对拍，**对齐成本很低（S）**，建议进第一批。

---

### G-A2 `types/gap-r907-index-signature-newline-after-readonly.ts`（1 份，S-M，真 bug）

**行号原文**（:10-11）：

```text
10: interface I { readonly
11:  [k:string]:number }
```

**差异明细**：
- TS：`PropertySignature[1085,1094)`（名字就是 `readonly`，无类型）＋ `IndexSignature[1094,1113)`（`readonly` **不**当它的修饰词）。
- 本仓：单个 `IndexSignature[1085,1113)`，`ReadonlyKeyword[1085,1094)` 被当成索引签名的修饰词。

**根因**：修饰词与 `[` 的绑定判据。`typescript/tokens/declarations/class-declaration-shape.xl.md:616`
的修饰词换行判断只在 `nextIsModifierWord` 时生效；`typescript/tokens/types/member-boundary.xl.md`
的 `LooksLikeMemberStart`（:75-104，`[` 后跟 `:`）本来会判出「`[` 是新成员起点」，但这里
`readonly` 走的是**索引签名修饰词**路径，范围被并到 `[` 上。
（同族知识：TS 的成员修饰词必须和 `[` **同一行**才绑定；同一行的 `readonly [k:string]` 仍是
`ReadonlyKeyword` 修饰的 `IndexSignature`，见语料 `ty-readonly-index-signature-line`。）

**§6 归类**：**end compute 不对**（成员边界：换行后的 `[` 属于下一成员，不是修饰词目标）。

**修法**：在「修饰词 + `[`」路径先问 `MemberBoundary.HasLineBreakBetween(readonly, [)`：
- 有换行 → `readonly` 收成只有名字的 `PropertySignature`（无类型），`[` 起下一个成员；
- 无换行 → 维持现在的修饰词绑定。
- 何时 close：修饰词后面没有同行 `[`/类型时，修饰词自身就是一个成员，End=修饰词 End。
- build 提取：PropertySignature 的 name=readonly（无 type、无 question）；IndexSignature 独立 build。

**回归风险**：低-中（成员切分共享 `MemberBoundary`；应只影响「修饰词换行 + `[`」这一格）。
**建议**：第一批（S-M）。

---

### G-A3 `declarations/decl-class-computed-member.ts`（1 份，M，真 bug，低价值）

**行号原文**（:3-7）：

```text
3: const KEY = "k"
4: class C {
5:   [KEY] = 1
6:   ["s" + "t"] = 2
7: }
```

**差异明细**：
- TS：一个 `PropertyDeclaration[86,116)`：name=`ComputedPropertyName[86,94)`（`[KEY]`），
  initializer=`BinaryExpression[96,116)`（`1["s" + "t"] = 2` —— 换行后的 `[` **可以续接**表达式，
  TS 不插 ASI，于是第 6 行成了第 5 行初始化器的下标 + 赋值链，`ElementAccessExpression[96,112)`、
  `EqualsToken[112,114)` 都在里面）。
- 本仓：两条 `PropertyDeclaration`（`[86,98)`、`[98,116)`），第二个 `ComputedPropertyName[98,112)` +
  `BinaryExpression[102,111)`。

**根因**：成员值范围的收口把「换行 + `[`」一律当成新成员。落点：
`typescript/tokens/declarations/class-declaration-shape.xl.md` 的 `BuildMembers` 里
`MemberBoundary.FindMemberBoundary` 三处取值（:914 类型边界、:1083 类型边界、:1126 值边界）；
`member-boundary.xl.md:75` 的 `LooksLikeMemberStart` 对 `[` 判真（:87-103），但没有先问
「上一行末尾能不能被 `[` 续接」（`1[`、`(f)[`、`x![` 都能续接 → 不该断）。

**§6 归类**：**end compute 不对**（成员/语句收口：能续接时不插 ASI）。

**修法**：在 `FindMemberBoundary` 判定「`[` 是新成员起点」之前加一条
`CanContinueExpression(prevUnit, "[" )`：若上一成员的值以「可被 `[` 索引」的单元收尾
（数字/字符串/标识符/`)`/`]`/`}`），**不**在此断行；把续接段并回值，`=` 之后的赋值链由
ExpressionBuilder 一次 build 完（TS 的 `PropertyDeclaration` End 覆盖到赋值链末尾）。
- 何时 build：值表达式到「真正收口」的那一格（换行 + 不能续接）再 build。
- close：PropertyDeclaration 的 End = 续接链最后一单元 End。

**难度 M / 回归风险 中**（成员边界是共享判据，`[` 在类体/类型字面量两处都用）。
**价值判断**：TS 行为是规范行为（不是恢复图），但对**无分号的对抗输入**才出现；
建议放第二批、低优先（可接受长期 diff 或加 known-gap 说明）。

---

### G-B1 `expressions/gap-r1231-decl-newline-operator.ts`（1 份，M，known-gap）

**行号原文**（:16-17）：

```text
16: const v = () => { }
17: /re/g;
```

**差异明细**：
- TS：`VariableStatement[1164,1185)`（到箭头体 `}` 为止）；随后 `ExpressionStatement[1185,1192)` →
  `RegularExpressionLiteral[1185,1191)`。
- 本仓：`VariableStatement[1164,1192)`（把 `/re/g` 续进声明），内部 `BinaryExpression[1175,1191)` +
  `SlashToken`×2（`() => {} / re / g` 的除法链），pos: VariableStatement ts[1164,1185) cj[1164,1192)。

**根因**：语句收口（end compute）不认为「块 `}` + 换行 + `/`」是新语句：`/` 被按二元运算符续接。
登记过的候选是「语句切分 + `RegexStartAfter`/`CanStartAt`」：
- `typescript/tokens/files/source-file-end-possible-shape.xl.md`（语句收口/ASI 判据）；
- `typescript/run/typescript-template.xl.md` 的 `TypeScriptRegexTemplate.CanStartAt`（控制头 `)`、
  `else`/`do`、块尾 `}` 之后 —— 目前**没有写入点**往 `SyntaxContext.RegexStartAfter` 登记；
- `expression-builder.xl.md` 的 `ParseBinary`/`ParseUnary` 对 `}` 后的 `/` 没有 re-scan。

**§6 归类**：**end compute 不对**（次 **possible compute 不对**：`RegexStartAfter` 没登记）。

**修法（两条路线）**：
1. **end 侧**：语句收口判据在「`}`（块/箭头体）+ 换行 + `/`」处收口（把 `}` 当表达式结束的
   ASI 断点），后续 `/re/g;` 作为新语句交给 `ExpressionBuilder`（`/` 起正则）；
2. **possible 侧**：在块尾 `}` 那一格往 `RegexStartAfter` 写入下一个 `/` 的下标（RegExp 重新扫描），
   或让 `CanStartAt` 在「`}` 后换行」时返回真。
推荐 1（改动集中在 end 判据），2 作为兜底。

**难度 M / 回归风险 中**（`}` 后 `/` 在 `a = {} / 2` 这种同行除法必须仍是除法）。
**是否 known-gap / 用户决策**：文件头有 `xl:known-gap`；属于「已知未修」但不涉及 basic token，
可由 shape 层修，无需用户裁定（建议第二批）。

---

### G-B2 `statements/stmt-do-while-body-terminated.ts`（1 份，M-L，真 bug）

**行号原文**（:3-10）：

```text
3: let x = 0;
4: do x++; while (x < 3);
5: do ; while (false);
6: do f(); while (false);
7: do x++
8: while (x < 4);
9: do { x++; } while (x < 5);
10: function f() {}
```

**差异明细**：
- TS 5 个 `DoStatement`：`[246,269)`、`[269,289)`、`[289,312)`、`[312,334)`、`[334,361)`；
  最后一个块体的 `Block[337,346)`、`FunctionDeclaration[361,377)`、`Block[374,377)` 都在。
- 本仓只有 4 个 `DoStatement`（`[246,269)`、`[269,289)`、`[289,312)`、`[312,334)`）：
  **少第 5 个**（`do { x++; } while (x < 5);`），并且 `FunctionDeclaration`/`Block`/`NumericLiteral[357,359)`
  全部缺失；`Identifier` 少 3、`PostfixUnaryExpression` 少 1、`BinaryExpression` 少 1、`FirstBinaryOperator` 少 1。
  即第 9-10 行被并入/吞掉。

**根因**：`typescript/tokens/statements/statement-builder.xl.md` → `BuildDo`（:871）与
`DoWhileCloseRule` 的「壳 + 条件」收口：`do` 体自带 `;` 时先被收成语句壳，`while` 读进来后再合成
DoStatement；块体形态（`do { … } while (…)`）在「`}` 之后等 `while`」这一格没接住，导致后续语句
被并进 do 体。相关扫描在 `statement-scanner.xl.md`（do 关键字到 `while` 的条件）。

**§6 归类**：**end compute 不对**（次 **possible compute 不对**：`DoStatementPossibleShape` 是空桩
（`do-statement-possible-shape.xl.md:18/24` throw 未实现），现由 builder 兜底，形态分派不齐）。

**修法**：
- 壳侧：`do` 体可能是「单语句 + 自带 `;`」「空语句 `;`」「块 `{…}`」三档；块档要等到 `}` 后
  再吃 `while (…)`，`;` 收口。
- build 时机：`while` 条件括号闭合（或 `}` 后见到 `while`）才 build DoStatement；`do ;` 立即 build。
- close：`while (…)` 的 `;` 或 `)` 收口；后续语句独立。

**难度 M-L / 回归风险 中**（do-while 全部形态共享）。**建议**：第三批。

---

### G-C1 `expressions/gap-r979-new-inst-tagged.ts`（1 份，M，真 bug）

**行号原文**（:7-12）：

```text
7: const a = new f<T>`t`;
8: const b = new f<T>`t`.b;
9: const c = new f<T>`t`(1);
```

**差异明细**：
- TS（第一档）：`NewExpression[1042,1054)` 外层，child = `TaggedTemplateExpression[1046,1054)`
  （tag=`Identifier[1046,1048)`，`TypeReference[1049,1050)`，模板 `[1051,1054)`）；
  本仓相反：`TaggedTemplateExpression[1042,1054)` 外层，child = `NewExpression[1042,1051)`。
  pos 差：NewExpression ts[1042,1054) cj[1042,1051)；TaggedTemplateExpression ts[1046,1054) cj[1042,1054)；
  第 8 行同一处 +`PropertyAccessExpression`；第 9 行本仓还多一个 `CallExpression[1090,1105)`（TS 这里是
  标签模板作为 `new` 的被构造者，调用括号属于 NewExpression 的 arguments）。

**根因**：`expression-builder.xl.md` 的 `ParseNew` 与后缀模板处理的**结合顺序**：`ParseNew` 先把
`new f<T>` 建成 NewExpression（:1013-1030），回到 `ParsePostfix` 后模板分支（:771-786）把
NewExpression 当成 tag 包成 TaggedTemplateExpression。TS 的语法是 `new (TaggedTemplate)`：
模板属于「被构造者」，`new` 的表达式是整条 TaggedTemplate（含 typeArguments 挂在
TaggedTemplateExpression 上），调用实参 `(1)` 也属于 NewExpression。

**§6 归类**：**possible build 不对**（build 出的节点嵌套层级 + 区间错）。

**修法**：在 `ParseNew` 的 callee 后缀链里处理模板（现有「`new A.B`t``」分支 :~1000 已是这个方向），
让 NewExpression 覆盖整条 callee（含 TaggedTemplate 的 typeArguments）；`ParsePostfix` 的模板分支
在「表达式是刚 build 的 NewExpression 且模板紧跟其 callee」时不要在外层再包。
- 何时 build：`new` 的被构造者后缀链（含模板）走完后再 build NewExpression。
- build 提取：NewExpression.expression = TaggedTemplateExpression；End 覆盖模板/实参。

**难度 M / 回归风险 中**（`new f<T>`t`` / `new A.B`t`` / `new Map<K,V>()` 三类共享）。**建议**：第二批。

---

### G-C2 `modules/gap-r869-exp-named-newline-then-from-like.ts`（1 份，S，真 bug/恢复形）

**行号原文**（:2-3）：

```text
2: export { a }
3: from("m");
```

**差异明细**：
- TS：`ExportDeclaration[0,355)`；moduleSpecifier 是 `ParenthesizedExpression[349,354)` →
  `StringLiteral[350,353)`（`from` 后的 `("m")` 被括号化）。
- 本仓：`ExportDeclaration[0,355)` 只有 `NamedExports[338,344)` → `ExportSpecifier[340,342)` →
  `Identifier[340,342)`；**少 ParenthesizedExpression + StringLiteral**（我们没把 `from("m")` 的
  字符串收成 moduleSpecifier 的括号化形态，`ModuleSpecifier` 字段为空/不投影）。

**根因**：`typescript/tokens/declarations/export-declaration-shape.xl.md` → `FromUnits` 的
moduleSpecifier 提取（:147-180、:236）：只认 `from` 后面**裸 `String`**（`specifierUnit as String`），
括号形态（`from("m")`，`Bracket` 里包 `String`）没有对应的投影分支；`ModuleSpecifier` 字段与
投影（`import-declaration-ast-node.xl.md` 同款）需要 `ParenthesizedExpression` 包装节点。

**§6 归类**：**possible build 不对**（build 时 moduleSpecifier 提取不认括号化形态）。

**修法**：`from` 后单元是 `Bracket("(")` 且其 `Data` 只有一个 `String` 时：
- 建 `ParenthesizedExpressionShape`（Pos=`(` 的 Pos，End=`)` End），child 是 `StringLiteralShape`；
- `ModuleSpecifier` 指向这个 ParenthesizedExpression（TS 的字段就是它），并作为 ExportDeclaration 的 child。
- 何时 close：`from` 后的括号单元闭合即 build/close。

**难度 S / 回归风险 低**（只影响 `export/import … from ( … )` 形态）。**建议**：第一批。

---

### G-C3 `expressions/gap-r955-yield-await-outside-context.ts`（1 份，L，缺上下文标志）

**行号原文**（:20-23）：

```text
20: const v = yield;
21: function f() { return (yield); }
22: const w = await;
23: function g() { return await; }
```

**差异明细**：
- TS：裸 `yield`（无操作数）= `Identifier[1418,1424)`、`Identifier[1449,1454)`；裸 `await` 同理；
  本仓 = `YieldExpression[1418,1424)`、`YieldExpression[1449,1454)`（多 2 个 YieldExpression、
  少 2 个 Identifier）。
- 守卫（同一份文件里）：生成器里 `yield 1`、非生成器 `yield g()`、`await 1`、模块顶层 `await 0` 都
  仍是 YieldExpression/AwaitExpression（TS 同口径），所以**不能只按「有没有操作数」一刀切**。

**根因**：`expression-builder.xl.md` → `ParseYield`（:624-657）与 `ParseUnary` 的 `await` 分支：
无条件造 YieldExpression / AwaitExpression，**没有 generator/async 上下文信息**；`SyntaxContext`
目前也没有该标志（`core/syntax/syntax-context.xl.md` 只有通用 key/value）。此前登记的修法是
**先在投影层用祖先链判**：`typescript/ast/print-ast-common.xl.md` 的 `projectExpression` /
`functionContextOf`（`Parent` 链 = 产物树：语句 → 块 → 函数，一跳就到）。

**§6 归类**：**possible build 不对**（次 **缺少 possible / 上下文缺失**：没有 generator/async 的候选状态）。

**修法（两条）**：
1. **投影层**（推荐先做）：`projectExpression` 看到 `YieldExpression`/`AwaitExpression` 且
   **无操作数**时，沿 `Parent` 链找最近函数：生成器内 `yield` 仍是 YieldExpression；非生成器/非 async
   的裸 `yield`/`await` 投影成 `Identifier`（文本就是词本身）。注意：带操作数的保持现状；
   `this` 等 Keyword 不能按 kind 一刀放行（文件注释里的实测）。
2. **shape 层**（彻底）：在 `SyntaxContext` 加 `IsGenerator`/`IsAsync` 标志（由
   `FunctionDeclaration`/`FunctionExpression`/方法 build 时压栈），`ParseYield`/`ParseUnary` 读它。
   这是跨层改动 + 影响 `await`/`yield` 所有形态，风险高。

**难度 L / 回归风险 高**（`expr-yield-await-context.ts` 的五条正向守卫必须全绿）。
**是否用户决策**：需要；建议先投影层试探（不动 core、不动候选），再决定是否上 shape 层标志。

---

### G-D `types/gap-r1237-type-position-brace.ts`（1 份，L，known-gap）

**行号原文**（:22-28）：

```text
22: interface I extends { a: 1 } { }
24: function f(x: any): x is { a: 1 } {
25:   return true;
26: }
28: function g(x: any): asserts x is { a: 1 } { }
```

**差异明细**：
- TS（第一档）：`InterfaceDeclaration[0,1636)` → `HeritageClause[1615,1632)` →
  `ExpressionWithTypeArguments[1623,1632)` → `ObjectLiteralExpression[1623,1632)` →
  `PropertyAssignment[1625,1630)`；本仓：`InterfaceDeclaration[0,1632)` → `HeritageClause[1615,1623)`（到 `extends` 的类型名就截止），
  然后把 `{ a: 1 }` 当成了接口体 → 多 `PropertySignature[1625,1630)` / `LiteralType[1628,1630)` / `Block[1632,1636)`。
- 第二/三档（`is` / `asserts` 谓词）：谓词的类型字面量 `{ a: 1 }` 与**函数体 `{`** 相邻，
  本仓把第一个 `{` 当函数体，多出 `Block`。

**根因**（同族，三档各自量过；文件头 :15-20 有完整现场）：
- heritage 类型字面量：`typescript/tokens/declarations/interface-declaration-possible-shape.xl.md`
  Stage 3（:111-139）把 `{` 直接当接口体；`interface-declaration-shape.xl.md` 的 heritage 实体名
  走 `TakeDottedName`/`InterfaceBranch`（只认标识符），不认 `TypeLiteral` 当实体名。
- 谓词类型字面量：`typescript/ast/print-ast-common.xl.md` 的谓词投影入口
  （`TypePredicateCloseRule` 先吃第一个 `{` 的形态）——类型位「词 + `{`」的边界判据只在
  「成员类型」那条路径统一过，谓词这条路还各自判断。

**§6 归类**：**possible compute 不对**（次 **possible build 不对**：heritage 实体名/谓词类型的
节点构造没接）。

**修法**：三档共用一个「类型位里 `{` 的边界」判据：
- `heritage`：`extends` 后的实体名允许 `TypeLiteral`（`ExpressionWithTypeArguments.expression` 可以是对象字面量式类型）；
  接口体 `{` 必须是 heritage 结束后的**下一个** `{`（不是类型字面量里的那个）。
- 谓词：`x is {…}` / `asserts x is {…}` 的 `{…}` 归类型，函数体 `{` 是紧随其后的那一格。
**难度 L / 回归风险 高**（heritage + 谓词三类都改，且类型位 `{` 判定与 `IsStatementStart` 名单纯值位共用经验）。
**是否用户决策**：known-gap（文件头已登记），建议单独立项，不进近期批次。

## 3. 三类划分

| 类别 | 文件 | 说明 |
| --- | --- | --- |
| **结构性真 bug（值得修）** | `gap-r869`（S）、`gap-r907`（S-M）、`gap-r979`（M）、`decl-class-computed-member`（M，低价值）、`stmt-do-while`（M-L）、`gap-r1231`（M，known-gap 但可 shape 层修） | TS 行为稳定、分歧来自本仓 shape/end/build 的判据 |
| **TS 错误恢复图（不建议/低价值模仿）** | `stmt-throw`（TS 对 `throw\n…` 给零宽 Identifier；成本 S，但属模仿恢复图）、`gap-r869` 的 `from(…)` 括号化 moduleSpecifier 也带恢复色彩（结构确定，建议照做以便对拍） | 对齐尺子需要模仿；可按「S 低成本」例外处理 throw |
| **known-gap / 需用户决策** | `gap-r955`（缺 generator/async 上下文标志，L）、`gap-r1237`（类型位「词 + `{`」三档，L） | 要么跨层加上下文标志/大改边界判据，要么接受长期 diff；需用户拍板 |

## 4. 修复批次建议（性价比从高到低）

| 批次 | 文件 | 预期收益 | 难度 | 风险 | 备注 |
| --- | --- | --- | --- | --- | --- |
| **B1** | `gap-r869`、`stmt-throw`、`gap-r907` | diff 9 → 6 | S/S/S-M | 低 | 三个都是单点判据；throw 的零宽合成代码已存在，只需让 split 对 throw 生效 |
| **B2** | `gap-r979`、`decl-class-computed-member` | 6 → 4 | M/M | 中 | `new`+标签模板顺序、成员值 `[` 续接；后者价值低，可只做前者（5） |
| **B3** | `gap-r1231`、`stmt-do-while` | 4 → 2 | M/M-L | 中 | 块尾 `/` 与 do 壳形态，共享语句收口判据，建议一起做并跑全量对拍 |
| **B4（需用户决策）** | `gap-r955`、`gap-r1237` | 2 → 0 | L/L | 高 | 上下文标志 / 类型位 `{` 边界；先出方案让用户选 |

**单点最高性价比**：`gap-r869`（S）+ `stmt-throw`（S）+ `gap-r907`（S-M）——三个文件、三种判据、
彼此不共享代码路径，B1 一轮可收 3 份且回归面小。**最不建议先做**：`gap-r955`、`gap-r1237`
（都要求跨函数上下文/类型边界的大改）。

## 5. 附：读数与文件位置

```text
当前 HEAD 85daba1d：token 1648 ok / 35 crash / 9 diff / 10 ts-invalid / 1 gap-now-passing
9 份 diff（known-gap 2：gap-r1231、gap-r1237）：
  declarations/decl-class-computed-member.ts
  expressions/gap-r1231-decl-newline-operator.ts      [known-gap]
  expressions/gap-r955-yield-await-outside-context.ts
  expressions/gap-r979-new-inst-tagged.ts
  modules/gap-r869-exp-named-newline-then-from-like.ts
  statements/stmt-do-while-body-terminated.ts
  statements/stmt-throw-no-argument-then-statement.ts
  types/gap-r1237-type-position-brace.ts              [known-gap]
  types/gap-r907-index-signature-newline-after-readonly.ts
```
