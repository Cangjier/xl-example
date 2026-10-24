# HANDOFF — Stage 3h：赋值 / 复合赋值、条件 `?:`、后缀 `++ --`

分支 `feature/possible-statement-s3h`（基线 `c616c7fe`）。四个 commit：OperatorTable → 形状状态机 →
形状树到 AST → 专用 cases + proof 脚本（本文件是第五个）。**只改 `typescript/tokens` 下三个 `.xl.md`
与 `tests/statement-possible` 的三个文件**；`core/` 与 `StatementBoundaryUtil.IsAsiBoundary` 未动。

## 1. 新增支持（三类，全部「形状层 + AST 层 + 专用 cases」三件齐）

| 构造 | 形状层 | AST 层 | 专用 cases |
| --- | --- | --- | --- |
| 赋值 / 复合赋值（16 个） | `KindOperator`，优先级 `OperatorTable.AssignmentPrecedence`=0、右结合 | 复用既有 `KindOperator` 分支：`BinaryExpressionShape` + `MakeOperatorToken`（`FirstAssignmentShape` / `FirstCompoundAssignmentShape`，`^=` 走 `LastBinaryOperatorShape`） | live 7 条 + ast 8 条 |
| 条件 `?:` | `KindConditional`(=20)：`?` 在 `Raw`、`:` 在 `Colon`、`Data=[条件,真,假]`，帧优先级 `CondPrecedence`=1 | `ConditionalExpressionShape`，五格「条件, ?, 真, :, 假」 | live 5 条 + ast 5 条 |
| 后缀 `++ --` | `KindPostfix`(=21)：`Data=[操作数]`、`Raw` 是运算符单元 | `PostfixUnaryExpressionShape`（运算符不进 children，只进区间） | live 4 条 + ast 5 条 |

`OperatorTable` 新增四项：`AssignmentPrecedence:int = 0`、`IsAssignmentOperator`（`=` 与 15 个复合赋值，
与 `ExpressionBuilder.IsAssignmentText` 逐字一致）、`IsCompoundAssignment`、`AssociationOf`（`right` / `left` /
空串三态；右结合 = `**` 与全部赋值）。**`Precedence` 对赋值仍返回 -1**，`IsRightAssociative` 原样保留——
legacy 的 `ParseBinary` 二元循环绝不能把 `=` 当二元吃掉，赋值只由 `ParseAssign` 再判一次。

## 2. 三个关键设计点（也是三个坑）

1. **赋值不弹条件帧**。条件帧优先级 1、赋值优先级 0，收敛循环本来是「栈顶 > 当前就弹」，于是
   `a ? b : c = d` 会把整个条件弹出来当左操作数，建出非法的 `=(?(a,b,c),d)`。这是 `ast-json` 的
   `expression` 夹具抓到的**真 bug**（重生成后 `typescript/cases/expression.cj-ast.json` 有 1 条位置/结构差）。
   文法上假分支是一个 `ParseAssign`，所以赋值属于假分支内部。修法：`PushOperator` 的收敛循环对
   `CondPrecedence` 显式封一格。修完重生成 → `git status` 空、diff 0/0/0；并补了
   `a ? b : c = d;` / `a ? b = 1 : c;` 两条用例把这条不变量钉住。
2. **后缀运算符不进 children**。`PostfixUnaryExpressionShape` 只有操作数一个子节点，运算符只影响区间；
   形状树照这个形状记，`Pos` 取 `SpanNode(操作数首单元, 运算符单元)`，与 `ParsePostfixSuffix` 的
   `SpanNode(start, At-1)` 同口径。后缀走成员访问同一条 `InsertionPoint` 路径（会穿过前缀节点），
   所以 `-a++` 是 `-(post(a))`。
3. **复用而不是新写**。赋值不新建 AST 分支：legacy `ParseAssign` 用的就是 `BinaryExpressionShape`，
   运算符由 `MakeOperatorToken` 决定，所以 `KindOperator` 既有的「先建左、再取 token、再建右、
   `SpanNode(最左, 最右)`」与 `ParseAssign` 逐字段同口径——这是「与 legacy 逐字段一致是结构性的」而不是对拍凑出来的。

## 3. 专用 cases 逐条

### live —— `tests/statement-possible/op-cases.json` → 组 `stage3h-live`（16 条）

`x = 1;` `x += 1;` `a = b = 1;` `x *= y + 1;` `a.b = 1;` `a[b] += 2;` `x ||= y;` `a ? b : c;`
`a ? b : c ? d : e;` `a ? b ? c : d : e;` `a ? b : c = d;` `a ? b = 1 : c;` `a++;` `a++ + b;`
`x = a ? b : c;` `-a++;`

每条断言：壳路径 XML 与同源码 legacy（`EnableShellExpressions=false`）逐字节一致、结构文本逐字相符、
`InsertBetween` 增量插入次数达标（赋值 1、连续赋值 2、`x *= y + 1` 2、`a[b] += 2` 2、`a++ + b` 2 …）。

### ast —— `tests/statement-possible/op-ast-cases.json` → 组 `stage3h-shapes`（22 条）

上面 16 条的同形，另加 `a--;`、`a = b++;`、`x = y = z = 0;`、`x >>= 1;`、`a = b;`（原 `s3g-declined-assign`
按新覆盖改判），以及两条**declined 安全回退**：`a = function () {};`、`a = class {};`（要求
`TotalShapeAst=0` 且 `declined>0`，即「拒绝接管」而不是「静默回退」）。

`op-ast-proof.mjs` 的 `tsPrefix` 补了 `ConditionalExpression` / `PostfixUnaryExpression` 两支，
所以条件与后缀也能与 `ts.createSourceFile` 逐节点渲染对拍（`?(a,b,?(c,d,e))` / `post(a)`）。

## 4. 未覆盖清单（本片之后仍然回 legacy，且都是 declined / Fail，不建错树）

- `as` / `satisfies`（类型运算符）
- 箭头函数、函数表达式、`class` 表达式
- 逗号表达式（`a = 1, b = 2`）
- 解构赋值左侧（`[a, b] = c`、`{ a } = b`）—— 未做专门对拍，按未覆盖对待
- `import.meta` / 动态 `import()`（`IsBareImport` 保守拒绝）
- 前缀 `++` / `--`（`IsPrefixText` 仍显式排除：legacy 的 `PrefixUnaryExpressionShape` 不带 operator，
  接管会建错树）
- `#private`、装饰器、类型实参调用歧义（`<` 走保守向前看，判成类型实参就整条放弃）
- **只有表达式语句走形状树**：`return` / `if` 条件 / `for` 头等位置的表达式仍由 legacy 建 —— 本阶段范围边界，
  不是遗漏

## 5. 全表读数（收尾时实测，cwd=本分支）

- `xl_build`（targets=ts，paths=core+typescript）：**886 写出 / 0 error** / 2505 warning（与基线同量级）
- `tsc -p tsconfig.json`：0 error
- `op-ast-proof`：默认组 **62/62**；`--group=stage3h-shapes`：**22/22**
- `op-proof`：operators-live **40/40**（结构文本 40 条、InsertBetween 计数 38 条）
- `harness`：`operators-live` 40/0、`stage3h-live` **16/0**、`dev` 22/0
- `harness --all`：**84 pass / 0 fail / known 1**（与基线一致）；`--double-accept`：cases=103 failed=0
- `harness --lint`：**PASS**（ASI 实现唯一 / 优先级数字表只在 operator-table，条目=12）
- `validate`：**1720 条 / 0 不合格**
- `ast-json` 四步：**6167/6167**；重生成后 `git status --short typescript/cases` **空**；diff 0/0/0
- `token-ast`：1716 文件（ok 1706 / ts-invalid 10 / known-gap 0）
- `real-dts`：**226/226** 解析成功且 AST 逐节点一致
- `feas-operator` 6/6、`insert-between` 9/9
- `perf`（中位数，不设硬阈值）：long n=300 = **5.31ms**；many 2000 条 = **30.83ms**；
  scale 0.69 / 1.51 / 3.32ms，ratio **2.18 / 2.20**（线性≈2.0，无退化告警）。
  基线同口径为 5.69ms / 28.32ms / ratio 2.13、2.37 —— 本片在噪声内，无系统性劣化。

## 6. 风险

1. **ASI 行首 `++` 没有专门用例钉住**：形状层不看换行，`a` ⏎ `++b` 若被壳当成一条语句喂进来会建 postfix
   而不是两条语句。当前靠 `IsAsiBoundary` 分句（本片未动它），dev 组的 `let a = 1; a++; --\na;` 仍走
   file-fallback 且通过。建议后续补一条 `a\n++b;` 的形状层用例。
2. **`CondPrecedence` 的不变量没有断言**：它必须 > `AssignmentPrecedence`(0) 且 < 最小二元优先级(4)。
   将来若新增优先级 ≤ 1 的二元运算符，会破坏「赋值不弹条件帧」；lint 只检查「优先级数字表只在
   operator-table」，没检查这条大小关系。
3. **两个用例文件被整体重排**：`op-cases.json` / `op-ast-cases.json` 由 `JSON.stringify` 重新序列化
   （2 / 4 空格缩进，与原文件一致），语义等价但 diff 噪声大；复核请用 `git diff -w`。
4. **非法左侧仍会被接管**：`a + b = c` 这类非法源码会建出与 legacy **相同**的树（`=(+(a,b),c)`），
   与既有行为一致，不是本片引入的偏差。
5. **`>>>=` 没有单独用例**：`x >>= 1` 已通过（说明 `>>=` 是单 token），`>>>=` 只在集合里被覆盖到。

## 7. 后续建议

- 下一片：`as` / `satisfies`、箭头函数、逗号表达式；补 `a\n++b` 的 ASI 用例
- 把 `CondPrecedence` 与 `AssignmentPrecedence` 的大小关系写成 lint 断言
- 若要把形状树推广到 `return` / `if` 条件里的表达式，`StatementOperatorBody` 需要能按「非语句位置」收口
