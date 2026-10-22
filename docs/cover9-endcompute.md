# cover9 轮次：end compute 类（B2 族 9 条 + C 族 3 条＝12 条真红）

分支 `cover9-endcompute`，基点 `4d2dafe3`（`cover9-prep`，门禁读数与 `docs/COVER9-HANDOFF.md` §0 一致）。
本文件记录：复现、根因（含与交接文档的偏差修正）、修法、四问、逐条红→绿证据、新增用例、门禁读数、遗留风险。
改动只在 `typescript/` 层（3 个 `.xl.md` + `typescript/cases/end-compute.ts` + 两份快照 + `.gitattributes`），
`core/**` 与 `typescript/IMPORTANCE.md` 零改动（`git diff 4d2dafe3 -- core typescript/IMPORTANCE.md` 为空）。

## 0. 一句话结论

12 条候选全部 red→green；新增 **23 条**用例（`end-compute` 295 → **318**）；全量门禁无回退：
**ast-json 5952/5952（5929+23）、ast-json-diff 0/0/0、token-ast 1715、validate 1719/0、
real-dts 226/226、tsc 0、xl_check 0 error**。

## 1. 读数（基线 → 本轮结束）

| 项 | 基线（4d2dafe3） | 本轮结束 |
|---|---|---|
| `node typescript/cases/ast-json.mjs` | 5929 / 5929 cj-ok（47 构造） | **5952 / 5952 cj-ok**（47 构造） |
| `node typescript/cases/ast-json-diff.mjs` | 5929/5929；结构 0 / 位置 0 / 字段 0 | **5952/5952；结构 0 / 位置 0 / 字段 0** |
| `node typescript/cases/token-ast.mjs --quiet` | ok 1705 / ts-invalid 10 / crash 0 / diff 0（1715） | **同左（1715）** |
| `node tests/parse/validate.mjs` | 1719 条 / 0 条不合格 | **1719 条 / 0 条不合格**（本轮未新增 token 夹具） |
| `node typescript/cases/real-dts-ast.mjs` | 226 / 226 | **226 / 226** |
| `.\node_modules\.bin\tsc.cmd -p tsconfig.json` | 0 | **0** |
| `xl_check`（core+typescript，ts） | 0 error | **0 error**（864 文件；仅既有 W3102/W3103） |
| `node tests/cover9/probe.mjs` | red 44 / green 44 / ts-invalid 0 | **red 32 / green 56**（本批 12 条转绿；其余 red 一条未变） |
| `core` + `IMPORTANCE.md` diff | — | **空** |

## 2. 复现（修前）

`node tests/cover9/probe.mjs`（基点原样构建）逐条实测，12 条的原文与状态：

```text
B06  diag=0  red-crash: 类型别名声明的类型没有读完      input: type T = A\n<B>c;
B07  diag=0  red-crash: 类型别名声明的类型没有读完      input: type T = A\r<B>c;
B08  diag=0  red-crash: 类型别名声明的类型没有读完      input: type T = A\u2028<B>c;
B09  diag=0  red-crash: 类型别名声明的类型没有读完      input: type T = A\u2029<B>c;
B10  diag=0  red-crash: 类型别名声明的类型没有读完      input: type T = typeof x.y\n<Z>c;
B11  diag=0  red-crash: 类型别名声明的类型没有读完      input: type T = typeof x.y\r<Z>c;
B12  diag=0  red-crash: 类型别名声明的类型没有读完      input: type T = import("m")\n<T>(1);
B13  diag=0  red-crash: 类型别名声明的类型没有读完      input: type T = import("m")\r<T>(1);
B14  diag=0  red-crash: 类型别名声明的类型没有读完      input: type T = A\n<B>(1);
C04  diag=0  red-crash: CatalogGuide: 终结候选与其它候选同时成立（宿主 SourceFileShape，下标 3）  input: type T = A\nreturn
C05  diag=0  red-crash: CatalogGuide: 终结候选与其它候选同时成立（宿主 SourceFileShape，下标 3）  input: type T = A\ndebugger
C06  diag=0  red-crash: CatalogGuide: 终结候选与其它候选同时成立（宿主 SourceFileShape，下标 3）  input: type T = A\n{ a: 1 }
```

修后 `node tests/cover9/probe.mjs`：12 条全部 `green`；全库 red 44→32、green 44→56
（原有 44 条 green 一条未回退；red 里 A 组 21、B01–B04/B15/B16、C01–C03/C07/C08 原样）。
probe 会报 `[FAIL] 12 条候选的“存储值 vs 实测”不一致` 并 exit 1——这是**预期**：`tests/cover9/candidates.json`
的 `currentStatus` 记录的是修前基线，本任务写 scope 不含该文件，未改它。

## 3. 根因与修法

### 3.1 B2 族（B06–B14，9 条）：type alias 跨行 `<` 被当成类型续接

- 根因（`typescript/tokens/declarations/type-alias-declaration-possible-shape.xl.md`）：
  `IsAsiBoundary`（`:279`，调用点 `:230`）的「符号续接表」把 `<` 当成类型续接符，于是
  `type T = A` ⏎ `<B>c;` 在边界 token `<` 处**不**判 ASI，别名候选继续吃 `B`/`>`/`c`/`;`，
  最后在 `;` 上 Done，交给 `TypeAliasDeclarationShape.FromUnits` 的类型解析 → 抛
  「类型别名声明的类型没有读完」。
- TS 真值（`node_modules/typescript/lib/typescript.js` 的 `parseTypeArgumentsOfTypeReference`）：
  ```js
  if (!scanner2.hasPrecedingLineBreak() && reScanLessThanToken() === LessThanToken) { … }
  ```
  ⇒ 类型实参**只在同一行**才解析；换行后的 `<` 永远起不了类型实参。而本判据只在
  「`last` 与 `at` 之间已有换行」时被调用（两个调用点都有 `HasLineBreakBetween` 守卫），
  所以那里的 `<` 一定是**下一条语句**（TypeAssertion 表达式语句）的起点。
- 修法（`:314-334`）：`IsAsiBoundary` 先把 `<` 判为边界（`if (text === "<") return true;`），
  并从续接表里去掉 `<`；文档同步改 `:285-293`。块级 `statement-builder.BuildTypeAliasDeclaration`
  （`typescript/tokens/statements/statement-builder.xl.md:1154`）读同一份判据，顺带覆盖
  `{ type T = A` ⏎ `<B>c; }` 与 `function f(){ type T = A` ⏎ `<B>c; }`。

### 3.2 C 族（C04–C06，3 条）：ASI 边界留下的边界 token 在 EOF 撞上根终结候选

**先修正交接文档的推断**：`docs/COVER9-HANDOFF.md` §3 写的是「type alias 候选在边界 Accept 时
return / debugger / 块语句候选同时起动」，实测不是。用 `tmp/trace2.mjs`（临时给
`CatalogGuide.ComputePossibleShapesByIndex` 加逐候选日志，未进仓）实测 `type T = A\nreturn`：

```text
idx=8/9 token=Common("return")  end=Reject  → TypeAliasDeclarationPossibleShape 在边界（AsiEnd）建别名
idx=3/4 token=EndOfFileTokenShape  end=Accept  left=1
    候选状态：StatementPossibleShape=Accept（其余全 Reject）
    units: 0:TypeAliasDeclarationShape  1:WrapSymbol("\n")  2:Common("return")  3:EndOfFileTokenShape
→ CatalogGuide: 终结候选与其它候选同时成立（宿主 SourceFileShape，下标 3）
```

即：上一条语句在 ASI 边界收口时，边界 token（`return` / `debugger` / 裸块 `{…}`）被**原样留下**，
它不再有自己的判定格；下一轮候选仅在 **EOF 哨兵**这一格重新判定，`StatementPossibleShape` 在这格
`Accept`，而根终结候选在 EOF 也 `Accept` ⇒ CatalogGuide 抛「同时成立」。
（同一根因不止 C04–C06：`a` ⏎ `return`、`type T = A` ⏎ `break` / `continue` / `{}` 修前同样 crash。）

- 修法 1（让位，`typescript/tokens/statements/statement-possible-shape.xl.md:98-105`）：
  `ItemStart > 0`（前面已经建出过语句）且当前是 **EOF 哨兵**时返回 `Reject`，把这个尾段交给
  根终结候选建；文件头不建形状的「整份文件只有这一条语句」不受影响（那时 `ItemStart == 0`，
  老路照旧在最后一个代码单元上建）。文档见 `:51`。
- 修法 2（真建，`typescript/tokens/files/source-file-end-possible-shape.xl.md`）：
  EOF 路径原来的「裸块特例」只认 `start === at`；改成先跳过前导 trivia 求 `firstCode`（`:278-281`），
  当 `firstCode === at` 且该单元**自己就能构成一条完整语句**时，交给 `StatementBuilder` 按正常语句
  路径建（`:287-302`）。新判据 `IsStandaloneTrailingStatement`（`:206-226`）只认：
  裸块 `{…}`（BlockStatement，不是对象字面量）与 `return` / `debugger` / `break` / `continue`
  （ASI 在关键字这一格就收口的无操作数简单语句）。走 `ExpressionStatementShape` 的话关键字会报
  「表达式语句没有读完」、裸块会被投成对象字面量，所以必须走 `BuildStatement`。

未改 `core/**`、未改 `IMPORTANCE.md`、未改 `statement-builder`、未改 `catalog-guide`。

## 4. 四个问题的回答

1. **正确的应该什么时候 build**
   - type alias：类型已完整（`CanEndTypeAt(last)`）× 有换行 × 下一单元接不上（`IsAsiBoundary`）。
     其中「换行后的 `<` 接不上」是本轮补的那一格——TS 的类型实参要求同一行，所以别名在 `<` 之前收口，
     `<` 属于下一条独立的 TypeAssertion 语句（`type-alias-declaration-possible-shape.xl.md:230/:314`）。
   - 收尾语句：上一条语句在 ASI 边界收口时，边界 token 不建；等 **EOF** 时由根终结候选一次建完
     （`source-file-end-possible-shape.xl.md:287`，`statement-possible-shape.xl.md:98` 让位）。
2. **build 时应该提取哪些信息**
   - 别名侧不变：`Start` 取 `ItemUtil.ItemStart`，`AsiEnd` 时 `end = tokenIndex - 1`，区间只含类型
     （不含边界 token），`;` 仍计入声明的 End。
   - 收尾语句侧：`Pos` = 前一个非 trivia 单元的 `SourceRange.End.Index + 1`（含前导 trivia，与 TS 的
     `pos` 同口径），单元来自 `host.Data.slice(start, at + 1)`；`return` / `debugger` 不带操作数、
     裸块是整块 `Bracket`，都由 `StatementBuilder.Load` 统一算 `Positions`。
3. **什么时候 close**
   - type alias：顶层 `;` / 行末 ASI（`AsiEnd`）/ EOF（交给根终结候选）三条。
   - 收尾语句：EOF 兜底建完后由根终结候选签出根并 `TryToClose`（`source-file-end-possible-shape.xl.md`
     EOF 路径尾部逻辑不变）；`StatementBuilder` 建出来的语句自己 `TryToClose`。
4. **close 时应该提取哪些信息**
   - End = 最后一个非 trivia 代码单元（ASI 收口时是边界前那一格）；换行判断一律按**源位置**
     （块体 units 不带 trivia），CR / U+2028 / U+2029 都算行终止符（沿用 cover8 的 `LineTerminator`）。
   - 本轮没有新增需要提取的字段：`IsStandaloneTrailingStatement` 只读单元种类与文本。

## 5. 逐条红→绿证据（12 条候选 + 11 条新增变体）

修前 = 基点原样重建（`xl_build` + `tsc` 到 4d2dafe3 内容）；修后 = 本分支。口径与 probe 一致
（TS 6.0.3 `parseDiagnostics` + `ast-compare` 三栏）。

### 5.1 B2 族（`<` 跨行边界）

| case（写进 `end-compute.ts` 的行） | 修前 | 修后 |
|---|---|---|
| `type T = A\n<B>c;`（B06，base） | red-crash: 类型别名声明的类型没有读完 | green |
| `type T = A\r<B>c;`（B07，CR） | 同上 | green |
| `type T = A\u2028<B>c;`（B08，LS） | 同上 | green |
| `type T = A\u2029<B>c;`（B09，PS） | 同上 | green |
| `type T = A /* c */\n<B>c;`（trivia：词间块注释） | 同上 | green |
| `type T = A // c\n<B>c;`（trivia：行尾注释） | 同上 | green |
| `type T = A\n<B>c`（无分号） | 同上 | green |
| `type T = A\n<B>c;\nlet z = 1;`（重复形：后面还有语句） | 同上 | green |
| `type T = typeof x.y\n<Z>c;`（B10） | 同上 | green |
| `type T = typeof x.y\r<Z>c;`（B11，CR） | 同上 | green |
| `type T = import("m")\n<T>(1);`（B12） | 同上 | green |
| `type T = import("m")\r<T>(1);`（B13，CR） | 同上 | green |
| `type T = A\n<B>(1);`（B14） | 同上 | green |
| `export type T = A\n<B>c;`（修饰词） | 同上 | green |
| `{ type T = A\n<B>c; }`（块级，statement-builder 路径） | 同上 | green |
| `function f(){ type T = A\n<B>c; }`（函数体） | 同上 | green |

### 5.2 C 族（边界 token 的收尾语句）

| case | 修前 | 修后 |
|---|---|---|
| `type T = A\nreturn`（C04，base） | red-crash: 终结候选与其它候选同时成立（SourceFileShape，下标 3） | green |
| `type T = A\ndebugger`（C05） | 同上 | green |
| `type T = A\nbreak`（同族简单语句） | 同上 | green |
| `type T = A\ncontinue`（同族简单语句） | 同上 | green |
| `type T = A\n{ a: 1 }`（C06，裸块） | 同上 | green |
| `type T = A\n{ }`（C06 空块变体） | 同上 | green |
| `type T = A\n{ a: 1; b: 2 }`（C06 重复形：多成员块） | 同上 | green |

修前实测里另有一条对照 `type T = A\nreturn;` —— 修前**已绿**（`;` 让 `return` 语句候选在 `;` 那格
自己建），按「green 不是 case」未写入用例。

## 6. 新增用例（23 条）

追加在 `typescript/cases/end-compute.ts:405-444`（「cover9」段，295 → 318；两份快照由
`node typescript/cases/ast-json.mjs end-compute` 重生成，未手工合并）：

- B2 族 16 条：LF base 1 + CR/LS/PS 3 + trivia（词间块注释 / 行尾注释）2 + 无分号 1 +
  重复形（后接语句）1 + type query 2 + import() 2 + 括号操作数 1 + `export` 修饰 1 +
  块级 1 + 函数体 1；
- C 族 7 条：`return` base 1 + `debugger` / `break` / `continue` 3 + 裸块 3（含空块、多成员）。

`node typescript/cases/ast-json.mjs end-compute` → `cases=318 cj-ok=318 cj-fail=0`；
`ast-json-diff.mjs end-compute` → 318/318、结构 0 / 位置 0 / 字段 0。
行终止符写法：`\n` 用两字符转义；**CR / U+2028 / U+2029 用行内字面字符**
（`ast-json.mjs` 的 `decodeCaseText` 只展开 `\n`/`\v`/`\f`；`readCases` 会 `trim()`，
所以它们都放在行中间）。同 stem 内无重复行。

## 7. 构建与门禁（命令）

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\cover9-endcompute
# 1) 改过 3 个 .xl.md 后重建（xl 自动带依赖；首次可用 force）
#    xl_build(cwd=<clone>, paths=[3 个改过的 .xl.md], targets=["ts"], out="dist")
.\node_modules\.bin\tsc.cmd -p tsconfig.json
# 2) 全量门禁
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs --quiet
node tests/parse/validate.mjs
node typescript/cases/real-dts-ast.mjs
node tests/cover9/probe.mjs
# 3) 静态检查
#    xl_check(cwd=<clone>, paths=["core","typescript"], targets=["ts"])
```

`xl_build` 摘要：**3 written / 0 error**（只有改过文件本来就有的 W3102 / W3103 文档类 warning）。
`xl_check`：**864 files / 0 error / 2461 warning**（全部是既有 W3102 / W3103）。

## 8. basic-token 是否牵涉（只登记）

**不牵涉**。本轮的 `<` 边界与收尾语句都在 ts 层判据（`IsAsiBoundary` / `StatementPossibleShape` /
`SourceFileEndPossibleShape`），没有改 `core/syntax/basic-tokens/**`，也没有改字符归类：
CR / U+2028 / U+2029 早在 cover6/cover8 就是 trivia 与行终止符；`<` 本身就是 `Symbol`。
若将来要把「换行后的 `<`」做成 basic-token 级信息（例如给 Symbol 带「前面有换行」），那属于 basic-token
改动，需用户批准，本轮不需要。

## 9. `.gitattributes` 改动

`typescript/cases/end-compute.ts` 现在含 **3 个行内 lone CR**（B07/B11/B13 三条用例），为保证
commit / checkout 后字节不变，在 `.gitattributes:19-21` 追加：

```text
# cover9: end-compute.ts carries inline literal line terminators (CR / U+2028 / U+2029,
# see docs/cover9-endcompute.md); pin -text so the CR bytes survive commit/checkout.
typescript/cases/end-compute.ts -text
```

写入前实测该文件 CR=0 / LS=27 / PS=3；写入后 CR=3 / LS=28 / PS=4（LS/PS 是普通 UTF-8 字符，
不受 `-text` 影响；只有 CR 需要钉字节）。文件仍是无 BOM 的 UTF-8、LF 换行。

## 10. 遗留风险 / 未做项

1. **`tests/cover9/candidates.json` 的存储值未更新**：probe 因此报 12 条「存储值 vs 实测不一致」并 exit 1。
   该文件不在本任务写 scope（属 `cover9-prep` 产物），留给 Lead / 合并成员决定是否更新基线。
2. **同族但未入 case 的形态**（修前同因 crash，修后已绿，按「只写目标 stem 的 cover9 段 + 目标 red」未加）：
   根级 `a` ⏎ `return`、`a` ⏎ `debugger`、`type T = A` ⏎ `throw` 等。若要更宽的回归网，可在后续轮次补。
3. **`StatementPossibleShape` 的 EOF 让位判据带 `ItemStart > 0` 前提**：整份文件只有一条收尾语句
   （`ItemStart == 0`）时仍走老路（在最后一个代码单元上由候选自己建）。当前语料里该情形不 crash，
   但「候选在 EOF 哨兵 Accept」本身仍是隐患——若将来出现 `ItemStart == 0` 且 `status == 1` 的
   EOF 局面，会再次撞「同时成立」，需要在那个轮次一起收。
4. **`IsAsiBoundary` 的 `<` 直接判边界**以「调用方保证有换行」为前提：目前两个调用点
   （`type-alias-declaration-possible-shape.xl.md:230`、`statement-builder.xl.md:1154`）都有
   `HasLineBreakBetween` 守卫。将来新增调用点时若不带这个守卫，`type T = A<B>` 这种**同一行**的
   类型实参会被误判成边界，需要重新审视。
5. **块级路径**只通过共享 `IsAsiBoundary` 覆盖（2 条 case 实测绿），没有动 `statement-builder` 的
   `BuildTypeAliasDeclaration` 本体；若后续块级 data 开始带 trivia，`:1135-1173` 的 `this.At = end + 1`
   推进需要再核（cover5-end-compute §7.7 的同一处遗留）。
6. **未做**：`possible` / `end build` 其它组（A 组、B01–B04 / B15–B16、C01–C03 / C07–C08 原样红）；
   未 push / 未 merge 主仓；`tmp/` 未提交。
