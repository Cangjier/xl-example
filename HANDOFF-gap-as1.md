# HANDOFF — gap-AS1：`do` 体 ASI 与类型实参歧义

分支 `feature/possible-statement-gap-as1`，基线 `a03df655`（第 31 轮转正后：声明族语句壳默认开）。
本轮 HEAD = **`17aeeccc`** `fix(statements): do 体 ASI 与类型实参歧义（gap-AS1）`。

## 1. 结论先行

两条缺陷**都真修好了**，修法都是「补上 TS 本来就有、我们缺的那条判据」，没有改期望、没有删用例：

| 缺陷 | 修前 | 修后 |
| --- | --- | --- |
| A `do b` ⏎ `{}` | THROW「表达式语句没有读完」 | **AST == TS 逐节点**（DoStatement + ExpressionStatement + 条件位 ObjectLiteral），XML == legacy |
| B `let a: Foo<Bar>` ⏎ `let b = 1;` | DIFF #1（CJ 首节点 `Common`，整份文件退化成裸 token） | **AST == TS 逐节点**（两条 VariableStatement），XML == legacy |

`harness --all` 的 **known 已归零**：`102 pass / 0 fail / known=0 / file-fallback=0`（修前 `101/0/known=1`）。
`cases.json` 里那条 `knownBaselineFail` 已按纪律**改成正式期望**（缺陷修好后才关，见 §4）。
默认全门零回归（§5），新增 23 条专用 cases 全绿（§6）。

## 2. 两条根因（实证）

### A — `do b` ⏎ `{}`：`ScanDo` 只认字面 `while`，没有 TS 的错误恢复

TS 的 `parseDoStatement`（`node_modules/typescript/lib/typescript.js`）是：

```
parseExpected(DoKeyword); statement = parseStatement();
parseExpected(WhileKeyword);          // 报 "while expected"，但**不消费**当前 token
openParenParsed = parseExpected(OpenParen);   // 报 ")" expected
expression = parseExpression();       // 条件位照读一个表达式
```

所以 `do b\n{}` 在 TS 里是 `DoStatement[0,7]`：body=`ExpressionStatement(b)`、**condition=`ObjectLiteralExpression`(\n{})**，
两条语法诊断（`'while' expected.` / `')' expected.`）；`do\n{}` 是 `DoStatement` + `Block` + **零宽 `Identifier`[5,5]**。

我们的链路：`ScanBody(..., stopAtWhile=true)` 已经正确把体在 `b` 处按 ASI 收住（R3 的块起点判据），
问题在下一步——`ScanDo` 看到 `whileAt` 那一格是 `{}` 而不是 `while`，直接 `Mismatch`；
控制流壳因此整条 `Reject`，最后由根 EOF 兜底把 `do b\n{}` 当**一条表达式语句**交给
`ExpressionStatementShape.FromUnits` → 抛「表达式语句没有读完」（`expression-statement-shape.js:52`）。
shell 路径抛错后文件级 fallback 到 legacy，legacy 走同一份 `ScanDo` → 再抛，所以两条路径都是 THROW。

### B — `let a: Foo<Bar>` ⏎ `let b = 1;`：`EndsAtLineBreak` 不认类型实参表收尾的 `>`

`ScanToSemicolon` 的换行收口读 `StatementBoundaryUtil.EndsAtLineBreak`，它的第三条件是
`StatementScanner.EndsExpression(previous)`；`EndsExpression` 对 Symbol 只认 `++` / `--`，
`>` 一律判 false。于是 `Foo<Bar>` 后面那个换行**不是** ASI 边界，声明一路扫到下一条语句的 `;`
（`ScanRoot` → `Complete` 落在 `let b = 1;` 的 `;`），`BuildStatement` 读到两条语句 → 抛错 →
shell 走文件级 fallback → legacy 用同一份扫描器同样抛 → `SourceFileShape` 只剩裸 token
（这就是实测里首节点 `Common`、整份文件没有语句形状的来源）。

`EndsAtLineBreak` 里**原本已有一条** `>` 判据，但它只在下一格是**调用位**（`(` / `[` / 模板）时成立
（`a as T<U>` ⏎ `(b)`）。`let a: Foo<Bar>` ⏎ `let b` 的下一格是普通单词，走不到那一条。

## 3. 改动文件（4 个源文件 + 2 个 cases）

### `typescript/tokens/statements/statement-scanner.xl.md`
- **新增 `IsTypePositionBefore(code, index)`**：`<` 左边最近的「上下文决定词」是不是类型位
  （`:` / `as` / `satisfies` / `extends` / `implements`）。扫到 `=`、值位运算符、`?`、`=>`、`;` 即判否。
  这是防误判的闸：`a < b >` 的 `<` 左边只有 `a`，判否，仍走旧的比较式路径。
- **新增 `IsTypeArgumentClose(code, index)`**：`>` / `>>` / `>>>` 是不是某个 `<` 的配对闭合。
  配对**不新写**，交给 `AngleJudge.FindClose`（`angle-judge.xl.md` 自己的「唯一判据」），
  再叠加 ①配对 ②`<` 在类型位，两条都成立才为真。
- **新增 `ScanConditionEnd(code, from)`**：do-while 条件位的恢复形尾界。续接表直接读
  `ExpressionStatementPossibleShape.IsContinuation`（不写第二份表达式文法），
  `;` / EOF / 接不上的单元即止；调用位括号是整单元，其它续接符后面再吃一格右操作数。
- **`ScanDo` 两处恢复形**：①`whileAt >= code.length` 且 `AtEOF` → 收在体尾（条件位没有单元）；
  ②`whileAt` 那一格不是 `while` → 条件位交给 `ScanConditionEnd`，`Complete(conditionEnd)`。
  正常 `while ( … )` 分支**逐行保留**（含 `;` / ASI 的原有四条判断）。

### `typescript/tokens/statements/statement-boundary-util.xl.md`
- **`EndsAtLineBreak` 新增一条分支**（插在既有「调用位」分支之后、「`!EndsExpression` 早退」之前）：
  `previous` 是类型实参表收尾的 `>` 且 `IsTypeArgumentClose` 为真、下一格又接不上
  （`!IsContinuation(next)`）→ ASI 边界。**既有分支一行未改**；`IsAsiBoundary` 函数体**完全没有碰**。
- **`CanEndDeclarationTail` 的变量声明例外精化**：原来「段首是 `const`/`let`/`var`/`using` 时，
  尾巴是 `>` 一律不算声明尾」（怕 `export const x = a >` ⏎ `b`）。现在这一格委托
  `StatementScanner.IsTypeArgumentClose`：`declare const a: Foo<Bar>` 的类型注解位判真，
  `= a >` 的值位仍判假。修这一条之前 `declare const a: Foo<Bar>` ⏎ `let b` 会走一次文件级 fallback
  （结果正确但不干净）；修完 `file-fallback=0`。

### `typescript/tokens/statements/statement-builder.xl.md`
- **`BuildDo` 恢复形**：正常 `while ( … )` 路径原样搬进 if 分支（缺 `(` 仍抛）；
  缺 `while` 时条件位交给同一个 `ScanConditionEnd`，`BuildExpressionRange` 建表达式
  （`do b\n{}` 建成 ObjectLiteral）；条件位没有单元时补**零宽 `IdentifierShape`**
  （`EscapedText=""`、`Pos = 体尾`，与 `throw` / `return` 无操作数那条占位路径同口径）。

### `tests/statement-possible/cases.json`
- `satisfies-decl-instantiation-no-semicolon`（`let a: Foo<Bar>\nlet b = 1;`）：
  `"knownBaselineFail": true` → 删除，换成 `"note"` 说明它是 gap-AS1 转正用例。
  **这是缺陷真修好之后**才关的 known（`harness --all` 实测 known=0，见 §5）。

### `tests/statement-possible/gap-as1-cases.json`（新增，23 条）
A 组 10 条：`do b\n{}`、`do b\n{} while (a);`、`do if (a) b\n{} while (c);`、`do\n{}`、`do ({a:1})`、
`do b\n({a:1})`，以及 4 条合法 do-while 对照（`do { } while (c);`、`do b; while(c);`、
`do {} while (b) a;`、`do f(); while (a)`）。
B 组 13 条：`let a: Foo<Bar>`（含 `>>` 嵌套 / `Map<string, number>` / `| Baz` / `[]` / 后接 `{}` / 后接箭头）、
`let a = b as Foo<Bar>`、`declare const a: Foo<Bar>`、有 `;` / EOF 两条对照，
以及两条**防误切**对照（`let a = b < c > d;`、`const x = y < z > w` —— `<` `>` 在值位，不许当类型实参）。
诊断形态显式标注 `allowTsDiagnostics: true`（do 恢复形 TS 本身就有语法诊断），仍做逐节点 AST 对拍。

## 4. 前后读数（同一探针，`tmp/gap-probe.mjs`，tmp 不入库）

修前（基线 `a03df655`，我本地实测）：

```
A do-body-block         THROW 表达式语句没有读完   (shell 与 legacy 都抛)
A do-body-block-while   THROW 表达式语句没有读完
A do-body-stmt-block    THROW 表达式语句没有读完   (do b\n{ c; }，本轮仍未修，见 §7-1)
A do-block-only         THROW 表达式语句没有读完
A do-block-while        EQUAL
A do-body-semicolon     EQUAL
A do-object-cont        DIFF  #1 kind: cj=ExpressionStatement ts=DoStatement
A do-object-newline     THROW 表达式语句没有读完
A do-body-if            THROW 表达式语句没有读完
B type-arg-newline      DIFF  #1 kind: cj=Common ts=VariableStatement
B type-arg-semicolon    EQUAL
B type-arg-eof          EQUAL
B type-arg-nested       DIFF  #1 kind: cj=Common ts=VariableStatement
B type-arg-fn           DIFF  #1 kind: cj=Common ts=VariableStatement
B type-arg-asi-block    THROW 表达式语句没有读完
B cmp-expr / cmp-expr-2 EQUAL
```

修后：**17/17 全部 EQUAL 且 XML == legacy**（含上面每一条）。

中和对照（证明修复点就是这两条判据，不是别的东西顺带变好）：

```
# B：把 StatementScanner.IsTypeArgumentClose 中和成 () => false
type-annot-asi       EQUAL -> DIFF"      declare-type-annot   EQUAL -> EQUAL(旧路径靠 fallback)
type-annot-nested    EQUAL -> DIFF"      as-type-annot        EQUAL -> DIFF"
cmp-in-init          EQUAL -> EQUAL      cmp-then-decl        EQUAL -> EQUAL
relational-only      DIFF  -> DIFF       type-annot-semicolon EQUAL -> EQUAL
# A：把 StatementScanner.ScanConditionEnd 中和成 () => -1
do-body-block        EQUAL -> DIFF       do-object-cont       EQUAL -> EQUAL（走 Builder 零宽分支）
do-body-block-while  EQUAL -> DIFF       do-block-only        EQUAL -> EQUAL（同上）
do-valid-block/body  EQUAL -> EQUAL      （合法 do-while 不受恢复形影响）
```
" = 整份文件退化（首节点 `Common`）。

## 5. 默认（= 转正后）全门读数（本轮改完、`xl_build` 0 error + `tsc` exit 0 之后实跑）

| 门 | 读数 |
| --- | --- |
| `typescript/cases/ast-json.mjs` | **6171 / 6171**（47 构造，cj-fail 0） |
| `typescript/cases/ast-json-diff.mjs` | **6171 / 6171**，结构差 0 / 位置差 0 / 字段差 0；`git status --porcelain typescript/cases` 空（已 `git checkout --`） |
| `typescript/cases/token-ast.mjs --quiet` | total=1716 **ok=1706 crash=0 diff=0** ts-invalid=10（与基线一致） |
| `typescript/cases/real-dts-ast.mjs` | **226 / 226**，崩溃 0、差异 0 |
| `harness.mjs --all` | **102 pass / 0 fail / known=0 / uncovered=0 / file-fallback=0**（修前 101/0/known=1） |
| `harness.mjs --double-accept` | **120 / 0**，冲突 0 |
| `declaration-statement-takeover.mjs` | **33 / 33**，knownGap=0、takeover=27 |
| `final-matrix.mjs` | **38 / 38**（shapeAst / xmlEqLegacy / astEqTS 全 38/38，failed=0；knownGap=1 是既有的 `clause-nested-known-gap`，与本轮无关） |
| `tests/parse/validate.mjs` | **1720 条 / 0 条不合格** |
| `gap-as1-cases.json`（新） | **23 / 23**，0 skip、0 known、conflict 0、file-fallback=0 |
| `r2-counterfactual.mjs` | 31 条全部 MATCH（`changed-by-fix=11`，与 R3 记录一致） |
| `r3-probe.mjs` | 27 MATCH / 1 THROW；唯一 THROW 是 `const g = () => 1\n{ }`（HANDOFF-r3 §5-2 的既有未覆盖形态，**修前就 THROW**）；原先 THROW 的 `do b\n{} while (a);` 已变 MATCH |

## 6. 修法为什么是「补判据」而不是「打补丁」

- A 不是「把 `do` 后面的 `{` 当块」那么简单：TS 在那里把 `{}` 收成**条件位的对象字面量**，
  照「块」建反而会与 TS 的 AST 对不上。本轮按 `parseDoStatement` 的恢复语义建树，
  条件位读表达式、没有单元时补零宽 `Identifier`（与既有 `throw` / `return` 占位同一条路径），
  所以 `do\n{}` / `do ({a:1})` / `do b\n({a:1})` 一并从 THROW/DIFF 变成 EQUAL。
- B 的判据链是「配对（AngleJudge）→ 类型位（新闸）→ 换行 + 接不上（既有 IsContinuation）」，
  没有第二份角括号计数、没有第二份 ASI；`IsAsiBoundary` 函数体一字未改。

## 7. 未绿与风险（诚实清单）

1. **`do b` ⏎ `{ c; }` 仍抛错**（消息由「表达式语句没有读完」变成「缺少标识符」）。
   原因：TS 在条件位把 `{ c; }` 恢复成 ObjectLiteral + ShorthandPropertyAssignment（`;` 被容错），
   我们的 `ExpressionBuilder` 对象字面量不接受 `;`。属对象字面量恢复形，**不在本轮范围**，
   修前修后都是抛错（不是新抛错）。同类形态 `if (a) b\n{ c; }` 是 MATCH（不经过 do 条件位）。
2. **`a < b >` ⏎ `c` 仍 DIFF / legacy 下 THROW**：比较式尾的既有缺口。中和对照证明
   `IsTypeArgumentClose` 对它返回 false（`<` 不在类型位），本轮规则**没有触及**它的输出。
3. **`const g = () => 1` ⏎ `{ }` 仍 THROW**：HANDOFF-r3 §5-2 已记录的未覆盖形态，本轮未动。
4. **`IsTypeArgumentClose` 的成本**：每遇到一个 `>` 会向前找 `<` 并各做一次 `AngleJudge.FindClose`
   （最坏 O(n²)，只在含 `>` 的语句上）。全语料（6171 + 1716 + 226）实测无可见退化，
   但超长语句 + 大量 `<` 时是已知成本；要优化应在 `AngleJudge` 里加缓存，不该在调用点复制判据。
5. **`IsTypePositionBefore` 是保守闸**：条件类型 / 映射类型 / 字面量类型里的 `<` 可能漏判
   （如 `A extends B ? C<D> : E`），漏判只会退回旧行为（不收口），不会误切。
6. `tmp/` 下的探针（`gap-probe.mjs` / `gap-as1-candidates.mjs` / `gap-as1-counterfactual.mjs` /
   `gap-as1-do-counterfactual.mjs` / `dump-one.mjs` / `ts-dump.mjs`）**不入库**（`tmp` 已 gitignore）；
   可复现的长期证据是 `tests/statement-possible/gap-as1-cases.json`。

## 8. 复现与回退

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-gap-as1
# 专用 cases（长期证据，已入库）
node tests/statement-possible/harness.mjs --file=tests/statement-possible/gap-as1-cases.json --group=gap-as1
# 全门
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs
git checkout -- typescript/cases          # ast-json 会写快照，测完必须还原
node typescript/cases/token-ast.mjs --quiet
node typescript/cases/real-dts-ast.mjs
node tests/statement-possible/declaration-statement-takeover.mjs
node tests/statement-possible/final-matrix.mjs
node tests/parse/validate.mjs
```

改完 `.xl.md` 之后必须重新生成 + 编译（本轮每一轮都按这个顺序跑，`xl_build` 0 error、`tsc` exit 0 才跑测试）：

```powershell
# xl_build 工具：cwd=本目录，paths=["core","typescript"]，targets=["ts"]
node node_modules/typescript/bin/tsc -p tsconfig.json
```

回退：`git revert 17aeeccc`（单提交，源码 + cases 一起回退；`build/ts`、`dist/ts` 是生成物，回退后重新
`xl_build` + `tsc` 即可）。若只想关上 B 的判据而不回退整轮：
`StatementScanner.IsTypeArgumentClose = () => false` 即可回到修前行为（A 的恢复形用
`StatementScanner.ScanConditionEnd = () => -1` 中和，见 §4）。
