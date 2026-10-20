# statements family 覆盖（chunk 1 + chunk 2 + trivia chunk + chunk 3 + labeled chunk�?

> **GAP �տ� B���� label �ĺ���/������ + generic class expression**����֧ `cover-gap-stmt-1`����� `origin/integration @ff728771`����
> `statements.ts` **406 �� 412**��+6����`class-expressions.ts` **26 �� 34**��+8����ȫ�� **4312 �� 4326** ȫ�̣�tsc 0 error��
> `labeled-statements` 42/42 �޻ع顣
>
> **GAP 1�����ޣ���`lbl: function f() {}`**��Oracle��TS �� `LabeledStatement[0,20] > [Identifier lbl, FunctionDeclaration[4,20]]`
> ����annex-B �Ѻ����������� label �������� + ��������`lbl: function* g() {}`��`lbl: class C {}`��
> `lbl: async function f() {}` ͬ���Ϸ���CJ �����ս��ѡ��������ѡͬʱ�������ĸ���`StatementScanner.ScanBody` ��
> `function`/`class`/`async function` û���������ɣ��䵽 `ScanExpressionBody` ���ѡ� EOF�����ս��ѡ��ͻ��
> �޷���`ScanBody` �� `function` / `class` / `async`+`function` �������� `ScanDeclarationBody`��ɨ������պ� `{��}`
> ����/���������ż� Complete�����ɼ��� `BuildLabeled` �� `BuildStatement` �� function/class ���ɽ�����6 ��ת�̣�
> `lbl: function f() {}`�����Ρ���������`lbl: class C {}`��`lbl: async function f() {}`������ͬ��̬��
> �Ƿ���oracle parseDiagnostics��Identifier expected������`lbl: function () {}`��ȱ�����������������ա�
>
> **GAP 2���Ϸ���̬���� + �󱨳��壩**���Ϸ� generic class expression ȫ������ͨ������
> `const C = class<T extends A> {};`��`class<T extends A = B>`��`(class<T, U> {})`��`(class<T extends A> {})`��
> `const C = class<T> extends B {};`��`const C = class<T, U> extends B {};` �� `class C<T>` / `class C<T extends A>`
> �ع顣���� `const C = class<T, U> ��` ԭ�Ⱥ죬������ class-expression ���������������б������� `,` �г�ʼ������
> `class<T, U>` �����Ͳ������ű����������ָ������޷���`BuildVariableDeclarationList` �ĳ�ʼ����ɨ�����׵�Ԫ��
> `class` ʱ���������� `{��}` �����ٴ������ `,`��������̬��������������ʽ����
> **��ơ��� `class<T extends A> {}`������**��oracle `parseDiagnostics` Ϊ�գ��� TS ��**ȱ���ָ�**����AST ��
> û�� `Identifier` ���ֵ� `ClassDeclaration`��`class {}` ͬ���������ǿɶ��ĵĺϷ�����CJ �� class ���� shape Ҫ�����֣�
> �ʰ��ָ���̬��Ϊ�󱨣�`//` ע�� + ����¼����
> **�ݻ�**��`export default class<T> {}` ���� �� export ���壨`export-declaration-shape` �� default class ·������
> ���� WRITE SCOPE ֮�⣬`//` Ŀ������ class-expressions �����������
>> **statement-start private brand check**（分�?`cover-hash-start-2`，起�?`origin/integration @890e3b0a`�?> private-in 已合入主线）：`expression.ts` 追加 10 条，**563/563** 完全一致（结构�?位置�?字段差均 0）；
> 全量 **2996 �?3006** 全绿；tsc 0 error�?>
> 根因与修法（最小改动）：private-in 合入�?`ExpressionBuilder` 已有 `#` 分派（`Symbol "#" + Common name`
> �?`PrivateIdentifierShape`），但语句首仍被 `ExpressionStatementPossibleShape.CanStart` 拦下：Symbol 白名�?> 不含 `#`，候�?Reject 后根终结候选把整段（含 `;`）当表达式收�?�?「表达式语句没有读完」�?> 本轮�?`CanStart` �?Symbol 分支加一�?`text === "#"`（注释说�?`#x` �?token 层是 Symbol "#" + Common "x"�?> 语句首只可能�?brand check），其它候�?文件未动�?>
> 绿（10 条）：`#x in obj;`（语句首）、`/* c */ #x in obj;`、`#x in obj; // tail`、`#x /* c */ in obj;`�?> 同文件两条（`#x in obj;\n#y in obj;`）、括号内 `(#x in obj);`、函数体�?`function f() { #x in obj; }` /
> `return #x in obj;`、class 方法�?`return #x in this;` / `#x in this;` 语句�?> 体内�?class 方法体本来就�?ExpressionBuilder（private-in 合入后已绿），本轮一并纳入测量�?>
> �?/ 暂缓（写�?`//` 目标行，�?expressions 家族后续）：**private 成员访问** `this.#x` / `this.#m()` —�?> ExpressionBuilder �?`.` 成员分派只认 Common 名字，不�?`#` + 名字（`class C { #x = 1; m() { return this.#x; } }`
> �?`class C { #m() {} m2() { return this.#m(); } }` 实测仍红）。本�?WRITE SCOPE 不含 expressions 源，故只记目标�?>

> **labeled chunk**（分�?`cover-label-root-1`，起�?`origin/integration @26dd9b3b`）：
> �?stem `typescript/cases/labeled-statements.ts` **42/42** 完全一致；全量 **2337 �?2379** 全绿；tsc 0 error�?>
> 机制（两处配合，都在 statements 家族内）�?> - `expression-statement-possible-shape.xl.md`（最小改动）：累计扫描加 `CodeCount` / `FirstIdentifier` / `SawQuestion`�?>   只有「首单元�?Common 标识符、第 2 个代码单元是 `Symbol ":"`、且此前没出现过 `?`」才 `Reject`�?>   合法的三元（`a ? b : c`）第 2 单元�?`?`，不会被误杀；对象字面量 / 类型上下文以括号或关键字起头，也不受影响�?> - `statement-scanner.xl.md`：`ScanRoot` 对「普通标识符起头」在第一个代码单元用文档前视 `NextChar` 判断
>   （跳过空白与注释后下一个字符是 `:` 才继续等，否则立�?`Mismatch`，普通表达式语句的判定时机与改动前完全一样）�?>   见到 `:` �?`ScanBody(at + 2)` 递归扫体。`ScanBody` 同时支持**体内嵌套标签**（`Identifier ":"` 递归），
>   修掉�?`a: b: { c(); }`（嵌套标�?+ 块体）之前「一直等 `;` �?EOF」的问题�?> - `LabeledStatementShape` �?`BuildLabeled`（chunk 2 就有）直接复用；`break lbl;` / `continue lbl;` 的标签叶子也复用�?>
> 42 条覆盖：`lbl: b;`、`lbl: { }` / `{ break lbl; }`、`lbl: if`、`lbl: while` / `for` / `do` / `switch`
> （块体与非块体）、`break` �?`continue` 的目标标签、嵌套标�?`a: b: c;` / `a: b: c: d;` / `a: b: { c(); }`�?> 双层循环�?`break a;`；trivia：前�?/ 标签后冒号前 / 冒号后注释、行尾注释、`lbl:\nb;`、块内多行；
> 重复形与混排（两�?/ 三条标签、标签与 `let` / 表达式混排）�?> 回归：`a;`、`a ? b : c;`、嵌套三元、`a.b;`、`a();`、`a = b;`、`a, b;`、`(a, b);`、`f(a, b);` 全部不受影响�?>
> 暂缓：标签直接修饰函�?类声明（TS 语法本身非法，故不收）；标签�?ASI 的交互（end 家族边界）�?>

> **trivia chunk**（分�?`cover-statements-trivia-1`，起�?`origin/integration @ebbbacab`）：
> 纯测量轮—�?*�?append `typescript/cases/statements.ts`**，没有改任何 token 源文�?/ shape / candidate�?> statements.ts **91 �?174**（新�?83 �?trivia / 重复形），全�?**1734 �?1817** 完全一致，
> 结构�?/ 位置�?/ 字段差均 0�?*无意外红�?*（所有新增行一次通过 TS oracle）�?>
> 新增覆盖（base 已在 chunk 1/2 有过，这里只�?trivia 与重复形）：
> - if/else 链：头与体之间注释、`if ( /* c */ a /* c */ )`、空体带注释（`if (a) /* c */ ;`）�?>   `} else {` 多行变体、`if (a)\n{ b; }`、else �?后注释、`if (a) { } else if (b) { } else { }`�?> - 循环：while / do-while / for / for-in / for-of 的头与体之间注释与换行、空体带注释�?>   体内多语句（`{ b; c; }`）、`do b;\nwhile (a);`、for 体里再放一条变量语句；
> - 变量语句：多 declarator（有�?init 混排）、declarator 之间注释、`var a = 1, b = 2; // tail`�?>   `let x = 1; /* c */`、同文件 2~3 条；
> - switch/try/with：`switch` �?�?case �?case 冒号前后/子句语句前后注释、多 case 换行�?>   try 头注释、`} /* c */ catch`、catch 绑定括号内外注释、空 catch 块、finally 前注释、嵌�?try�?>   with �?体注释与体内多语句；
> - labeled/break/continue/throw/return/debugger 的标�?表达式前注释与行尾注释；
> - 混排：同文件 3~5 条语句（if + while、switch + try + let、with + do + debugger 等）�?>
> 结论：statements 家族�?trivia 口径（Pos / 区间 / trivia 过滤 / 可选关键字前视）在既有 shape 上全部成立，
> 本轮没有需要报�?statements 源文�?owner 的红项�?
本页�?`typescript/cases/statements.ts` 收了什么、怎么实现、还差什么。口径是
`node typescript/cases/ast-json.mjs` + `node typescript/cases/ast-json-diff.mjs`（本分支唯一权威 AST 尺子）�?
## 1. 已落�?
**chunk 1（核心语句）**：空语句 `;`、块 `{}`、变量语句（`var` / `let` / `const`，单 / 多声明）�?`if` / `else` / `else-if`、`while`、`do-while`、`for`（三子句、含空子句与多声明初始化）�?`for-in`、`for-of`、`return`、`break`（含标签）、`continue`（含标签）、`throw`、`debugger`�?`labeled` 在块 / 体内可达（`{ lbl: b; }`）�?
**chunk 2（本块新增）**�?- `switch` / `case` / `default`：空 switch、多 case / fallthrough、default 首位 / 中间、嵌套、case 表达式；
- `try` / `catch` / `finally`：带绑定 catch、无绑定 catch、try-finally、try-catch-finally、嵌套；
- `with`（块�?/ 单语句体）；
- 解构绑定：`let [a,b] = x;`、`let {a,b} = x;`、`let {a: c} = x;`、`for (const {a} of xs)`、`for (const [a] of xs)`�?- 类型注解：`let x: number = 1;`、`var t: boolean;`、`for (let i: number = 0; �?`�?
实现方式（`typescript/tokens/statements/`）：

| 文件 | 职责 |
| --- | --- |
| `statement-scanner.xl.md` | 符号层的递归下降**终结位置扫描�?*：回答「到齐没有、到齐在哪个下标」。不建形状�?|
| `statement-builder.xl.md` | 到齐后一次建完整条语句的递归下降建树器；表达式交 `ExpressionBuilder`、类型交 `TypeBuilder`�?|
| `statement-possible-shape.xl.md` | 根级候选：只认本族起点（`{` / `;` / 固定关键字），其它起�?`Reject`；`BuildByIndex` 只消费到扫描出的 `End`�?|

关键点：

- **可选关键字的前�?*：`else` / `catch` / `finally` 可能还在文档里没�?token 化。扫描器在体 / 块到齐那一�?  �?`NextWord`（跳过空白与 `//`、`/* */` 注释读一个词）判断「要不要继续等」，不需要第二套挂载 / 续接机制�?  也不会把「还�?else」拖�?EOF 哨兵上与根终结候选打架（`if (a) {}`、`try { �?} catch { �?}` 在文件末尾都本地建）�?- **chunk 2 的结构件**：`CaseBlockShape`（declarations，直接实例化）、`CaseClauseShape` / `DefaultClauseShape` /
  `CatchClauseShape`（members，直接实例化），成员顺序�?TS �?children 顺序 Add�?- **解构绑定**：`Array/ObjectBindingPatternShape.FromBracket` 建元素（bindings 家族），语句层只做两件事�?  放到 declarator �?Name 位并�?`Pos`；把元素孩子里的原始 basic token 归一�?`IdentifierShape`
  （`NormalizeBindingPattern`——bindings 那几页是「已实现未测量」，`FromTokens` 的孩子是 raw token）�?- **类型注解**：变量声明里 `名字 : 类型` 之间那段�?`TypeBuilder.Load + ParseType`，放�?Name �?Initializer 之间�?- **区间口径**：`Pos = 前一个非 trivia 单元 End + 1`；shape �?`SourceRange` 是闭区间；块内第一条语句的 `Pos`
  �?`{` 的下一个位置，�?TS 一致�?
## 2. 用例

`statements.ts`：base + trivia 变体（前�?/ 词间注释、词间多空格、词间换行、行尾注释）+ 重复形（同文件多语句）�?`\n` 由生成器还原成真实换行。当�?**174 �?*（chunk 1 �?55 + chunk 2 �?36 + trivia chunk �?83）�?
## 3. 暂缓（写�?`//` 目标行）

| 目标 | 原因 / 依赖 |
| --- | --- |
| ASI（无分号断句�?| �?cover-end-1 |
| 函数 / 类声�?| 后续 declarations 成员 |
| ~~**根级标签语句** `lbl: b;`~~ | **已收（labeled chunk�?*：expression 候选按「首单元 Identifier + �?2 代码单元 `:`」Reject、statement 候选用 `NextChar` 前视 + `ScanBody` 递归负责；新 stem `labeled-statements.ts` 42/42�?|
| case 里的三元表达�?`case a ? b : c:` | `case` 条件按本层第一�?`:` 切分，三元里�?`:` 需要类�?/ 条件层的配合，本块不越界 |
| catch 绑定�?`...` / 默认�?| bindings �?rest 元素尚未测量，本块只收名�?/ 改名 |

## 4. 依赖与注意事�?
- 变量语句 / `for` 初始化的形状载体�?`variable-declaration(-list)-shape.xl.md`；两�?`*-possible-shape` 仍是桩、未启用�?- 解构绑定消费 bindings 家族（`Array/ObjectBindingPatternShape.FromBracket`、`BindingElementShape`）；
  case / default / catch 子句消费 members 家族的三�?clause shape；类型注解消�?types 家族�?`TypeBuilder`�?  这三族的文件一行未改�?- `typescript/cases/ast-json-diff.mjs` �?`TS_KIND_ALIASES` 保留�?chunk 1 补的 `LastStatement �?DebuggerStatement`�?- 根候选表只加�?`new StatementPossibleShape()`�?- 构建口径：`xl_build({cwd, targets:["ts"], paths:["core","typescript"]})`（整树会�?`cjcli.xl.md`
  引用已删除的 `dawn/text/*.xl.md` �?0 产物），�?`tsc -p tsconfig.json`�?
## 5. 读数

- `statements`�?74 / 174 完全一致（trivia chunk 新增 83 条，零红项）�?- 全量：trivia chunk 起点 1734 / 1734 �?本轮 1817 / 1817 全绿；其余构造无回归�?- tsc 0 error；xl_check 0 error（本轮未�?xl 源文件）�?
## chunk 3：case 表达�?/ catch 解构用例（来�?cover-statements-3，APPEND UNION 合并�?
语句用例�?APPEND UNION 合并：base 1..91 + trivia �?+ case/catch 块；合并�?statements = 210 条（174+36，无重复行）�?
> **chunk 3**（分�?`cover-statements-3`，起�?`origin/integration @c49f394b`）：
> statements.ts **91 �?127**（新�?36 条）�?*127/127** 完全一致；全量 **1893 �?1929** 全绿；tsc 0 error�?>
> chunk 3 唯一改动的源文件：`statement-builder.xl.md` �?`BuildCaseBlock` —�?case 标签的终�?`:` 改为
> **按三元深�?0 判定**：扫描时 `Symbol "?"` 让深�?+1、`Symbol ":"` 在深�?>0 �?-1 并继续，深度 0 �?`:`
> 才是 case 标签结束符（括号 / 逗号 / 运算符在本层都是整单元，挡不�?`:` 的只有三元）�?> 这样 `case a ? b : c:`、嵌套三�?`case a ? b : c ? d : e:`、`case (a, b):`、`case a || b:`、`case a = b:`
> 都能切出完整 case 表达式�?>
> 新增 36 条：
> - case 表达式：三元 / 嵌套三元 / 括号逗号 / `||` / 赋�?/ 三元后接多语句或 default �?/ default 后再 case /
>   �?case（`case a ? b : c: case d: e();`�? 终结符前后注释、三元中间换行；
> - switch：块内嵌�?switch、if 体内嵌套、case 体多语句、fallthrough（注释分隔）、case 体为�?/ if�?> - catch 解构绑定：`catch ({ message })`、`catch ([a, b])`、`catch ({ a, b })`、`catch ({ a: c })`�?>   �?finally、空 try 体、catch 括号内绑定前注释（builder �?`BuildCatchClause` �?chunk 2 已按 brackets
>   分支接好 bindings，本轮只补测量，未改代码）；
> - for-of/for-in 解构 trivia：`for (const [a, b] of xs)`、`for (const { a } of xs)`、`for (const {a: c} of xs)`�?>   `for (const [ a , b ] of xs)`、头体间换行、体多语句、行尾注释；
> - 混排：switch + for-of、try/catch 解构 + let�?>
> 暂缓：根级标签（�?chunk 之后�?labeled chunk 已收）、`for await`、end 家族 ASI 边界�?> `catch` 绑定�?rest / 默认值（bindings 未测量）仍未收�?>


## using 声明（cover-using-1�?
TS 5.2+ �?`using` / `await using`：oracle �?`ts.createSourceFile` 逐条验过（parseDiagnostics 为空）�?
- 合法形式：`using x = a;`、`using x: A = a;`、`using x = f();`、`using a = x, b = y;`、`using { a } = x;`（对象解构合法）�?  块内 / `switch` case 体内 / `for (using x of xs)` 都合法；**`using [a] = x;` 不合�?*（被解析�?`using[a] = x` 表达式）�?  `using` 后不能跟数组解构�?- AST：`VariableStatement`（TS 反查名是别名 `FirstStatement`）→ children 只有 `VariableDeclarationList`�?  List �?`VariableDeclaration`（Identifier [+ Type] [+ initializer]）；`using` / `await using` 关键字不�?AST
  （TS 只记�?List �?flags 上）。List �?`Pos`：`using` �?`using` 起算，`await using` �?`await` 起算�?  Declaration �?`Pos` �?`using` 之后算�?- 实现：`StatementScanner` �?ScanRoot / ScanBody 接受 `using`（`ScanToSemicolon`）与 `await using`（仅�?await 后紧�?using�?  其余 `await …` 交回表达式候选）；`StatementBuilder.BuildStatement` 分派�?`BuildVariableStatement`（支�?await 前缀�?  List �?listStart 口径）；`IsVariableKeyword` �?`using` �?`for (using x of xs)` 复用声明列表构建�?- harness 增加别名 `["FirstStatement","VariableStatement"]`（diff 侧原本就有，ast-json 侧补齐）�?- 暂缓：顶�?`await using`（与表达式语句候选抢同一格）、`for (await using x of xs)`、`using` �?if/while 单语句体（未测量）�?### await using（顺�?chunk：cover-await-using-1�?
async function 声明与嵌�?async 合入后，`await using` 全部打通（oracle 逐条验过）：

- async 函数体内：`await using x = a;`、后�?`await g();`、带类型标注、多声明符、嵌套块内、注�?trivia —�?全部合法�?  AST 与普�?using 相同（VariableStatement �?VariableDeclarationList �?VariableDeclaration），`await` 只是 List �?flag�?- **顶层 `await using x = a;`**：合法（顶层 await）。因为语句首 `await` 同时是表达式候选的 CanStart�?  �?`ExpressionStatementPossibleShape` 加了一条最小优先级规则：首�?await �?AwaitStage=1，次格是 `using` �?Reject�?  让语句候选独占；同时 `StatementScanner` 对「只�?await 一格」返�?NeedMore（等待下一格确认是 using 还是表达式）�?- **`for (await using x of xs) {}`**：合法。`BuildForInOrOf` 识别「await + using」头，声明列表从 `using` 起解析�?  List �?Pos/区间仍从 `await` 起算（与 TS �?VariableDeclarationList pos 一致）�?
## 修复说明（docs 乱码恢复�?
本文件曾�?`1ddd3eaa`（feat(statements): sweep 4 �?do-while ASI + edge cases）被整体写成乱码�?UTF-8 中文被按 GBK 重新解释（部分文件还含非�?UTF-8 字节），生成时已�?U+FFFD 替换不可映射字节，信息不可逆�?本次修复以上一�?**strict-UTF-8 合法** �?revision `938b01d7` 为基准重建全文；
此后新增/改写的章节（涉及 `1ddd3eaa, 8a0508a8`）已随乱码丢失、无法无损恢复，因此未收录（原文仍保留在 git 历史中，
可用 `git show <sha>:docs/...coverage-statements.md` 查看乱码原样）�?没有发明新内容：本文件其余部分逐字来自上述干净 revision�?
## 历史 chunk 记录补遗（据 git 历史重建，原文件乱码�?
> 本段原在 `1ddd3eaa`（feat(statements): sweep 4）的乱码版本里，修复时随全文重建丢失�?> 以下按乱码原文与 git 历史转写：分支、数值、代�?span 照原文保留�?
### statements sweep 4（分�?`cover-statements-4`，起�?`origin/integration @5a230659`�?- `statements.ts` **210 �?242**�?32），**242/242** 完全一致；全量 **3144 �?3176** 全绿，tsc 0 error�?- Oracle（TS `createSourceFile`，parseDiagnostics 全空）：optional catch（`catch {}`）、`for(;;);`、`while(a);`�?  `do a(); while (b);` / `do {} while (b)` 的尾分号可省、EOF、跨行后续语句、同一行接下一句（`do {} while (b) a;` TS 也接�?  DoStatement + ExpressionStatement）、`switch (a) {}` / `{ default: }` / `{ case 1: }`、`with (a) b;`、`debugger` 后接不接分号�?EOF�?  `lbl: ;`�?- 唯一源改动只�?`statement-scanner.xl.md` �?`ScanDo`：do-while 尾分号可�?ASI 省略。原实现只认可「下一�?code 单元�?`;` �?EOF」，
  导致 `do {} while (b)` �?EOF 处候选不能收尾；`do {} while (b)\na;` 也走进回退路径（被当成「表达式语句没有读完」）�?  修法：`NextChar(headerEnd)` 在原始文本上只看�?`;` 才继续等分号，否则（EOF / `}` / 换行 / 同一行下一句）直接
  `Complete(whileAt + 1)`，与 TS �?ASI 口径一致；�?optional catch、switch �?case、with、`debugger` EOF、空语句、`lbl: ;`
  原语序不变，只补测量�?- 32 条新增：optional catch 3 条（�?`finally`、关键字与注释）、for �?3 条（`for (;;) {}` / `for (;;);` / 带注释）�?  `while (a);` + 注释、do-while 8 条（�?无分号、EOF、跨行接语句、同行接语句、注释位置、`do {} while (b)\n;`）�?  switch 5 条（`{}` / `default:` / `case 1:` / `default: break;` / 注释）、with 3 条、debugger 3 条（`;` / EOF / 注释后接 `;`）�?  空语�?4 条（`;` / `;;` / `;;;` / `{ ; }`）、`if (a) ;`、`lbl: ;` �?`lbl /* c */ : ;`�?
### statement-start private brand check（分�?`cover-hash-start-2`，起�?`origin/integration @890e3b0a`，private-in 已合入主线）
- `expression.ts` 追加 10 条，**563/563** 完全一致（结构�?/ 位置�?/ 字段差均 0）；全量 **2996 �?3006** 全绿；tsc 0 error�?- 根因与修法（最小改动）：private-in 合入�?`ExpressionBuilder` 已有 `#` 分派（`Symbol "#" + Common name` �?  `PrivateIdentifierShape`），但语句首仍被 `ExpressionStatementPossibleShape.CanStart` 拦下：Symbol 白名单不�?`#`�?  候�?Reject 后根终结候选把整段（含 `;`）当表达式收�?�?「表达式语句没有读完」。本轮在 `CanStart` �?Symbol 分支加一�?  `text === "#"`（注释说�?`#x` �?token 层是 Symbol `#` + Common `x`，语句首只可能是 brand check），其它候选文件未动�?- 绿（10 条）：`#x in obj;`（语句首）、`/* c */ #x in obj;`、`#x in obj; // tail`、`#x /* c */ in obj;`、同文件两条
  （`#x in obj;\n#y in obj;`）、括号内 `(#x in obj);`、函数体�?`function f() { #x in obj; }` / `return #x in obj;`�?  class 方法体内 `return #x in this;` / `#x in this;` 语句�?- 暂缓（写�?`//` 目标行，�?expressions 家族后续）：**private 成员访问** `this.#x` / `this.#m()` —�?`ExpressionBuilder`
  �?`.` 成员分派只认 Common 名字，不�?`#` + 名字（`class C { #x = 1; m() { return this.#x; } }` �?  `class C { #m() {} m2() { return this.#m(); } }` 实测仍红）；本块 WRITE SCOPE 不含 expressions 源，故只记目标�?
### labeled chunk（分�?`cover-label-root-1`，起�?`origin/integration @26dd9b3b`�?- �?stem `typescript/cases/labeled-statements.ts` **42/42** 完全一致；全量 **2337 �?2379** 全绿；tsc 0 error�?- 机制（两处配合，都在 statements 家族内）：`expression-statement-possible-shape.xl.md`（最小改动）累计扫描�?  `CodeCount` / `FirstIdentifier` / `SawQuestion`，只有「首单元�?Common 标识符、第 2 个代码单元是 `Symbol ":"`、且此前没出现过 `?`�?  �?Reject（合法三�?`a ? b : c` �?2 单元�?`?`，不会被误杀；对象字面量 / 类型上下文以括号或关键字起头，也不受影响）；
  `statement-scanner.xl.md` 跳过空白与注释后下一个字符是 `:` 才继续等，否则立�?`Mismatch`；见�?`:` �?`ScanBody(at + 2)`
  递归扫体，`ScanBody` 同时支持体内嵌套标签（`Identifier ":"` 递归），修掉 `a: b: { c(); }`（嵌套标�?+ 块体）之�?  「一直等 `;` �?EOF」的问题。`LabeledStatementShape` �?`BuildLabeled`（chunk 2 就有）直接复用，`break lbl;` / `continue lbl;`
  的标签叶子也复用�?- 42 条覆盖：`lbl: b;`、`lbl: { }` / `{ break lbl; }`、`lbl: if`、`lbl: while` / `for` / `do` / `switch`（块体与非块体）�?  `break` / `continue` 的目标标签、嵌套标签（`a: b: c;` / `a: b: c: d;` / `a: b: { c(); }`）、双层循环里�?`break a;`�?  trivia：前�?/ 标签后冒号前 / 冒号后注释、行尾注释、`lbl:\nb;`、块内多行；重复形与混排（两�?/ 三条标签、标签与 `let` / 表达式混排）�?  回归：`a;`、`a ? b : c;`、嵌套三元、`a.b;`、`a();`、`a = b;`、`a, b;`、`(a, b);`、`f(a, b);` 全部不受影响�?- 暂缓：标签直接修饰函�?类声明（TS 语法本身非法，故不收）；标签�?ASI 的交互（end 家族边界）�?
### trivia chunk（分�?`cover-statements-trivia-1`，起�?`origin/integration @ebbbacab`�?- 纯测量轮：只 append `typescript/cases/statements.ts`，没有改任何 token 源文�?/ shape / candidate�?  `statements.ts` **91 �?174**（新�?83 �?trivia / 重复形），全�?**1734 �?1817** 完全一致，结构�?/ 位置�?/ 字段差均 0�?  **无意外红�?*（所有新增行一次通过 TS oracle）�?- 新增覆盖（base 已在 chunk 1/2 有过，这里只�?trivia 与重复形）：if/else 链（头与体之间注释、`if ( /* c */ a /* c */ )`�?  空体带注�?`if (a) /* c */ ;`、`} else {` 多行、`if (a)\n{ b; }`、else 前后注释、if / else-if / else 全链）；
  循环（while / do-while / for / for-in / for-of 头体之间注释与换行、空体带注释、体内多语句、`do b;\nwhile (a);`�?  for 体里再放一条变量语句）；变量语句（�?declarator �?�?init 混排、declarator 之间注释、`var a = 1, b = 2; // tail`�?  `let x = 1; /* c */`、同文件 2~3 条）；switch/try/with（`switch` �?case 冒号前后 / 子句语句前后注释、多 case 换行�?  try 头注释、`} /* c */ catch`、catch 绑定括号内外注释、空 catch 块、finally 前注释、嵌�?try；with 头体注释与体内多语句）；
  labeled/break/continue/throw/return/debugger 的标�?表达式前注释与行尾注释；混排（同文件 3~5 条语句：if + while�?  switch + try + let、with + do + debugger 等）�?- 结论：statements 家族�?trivia 口径（Pos / 区间 / trivia 过滤 / 可选关键字前视）在既有 shape 上全部成立，
  本轮没有需要报�?statements 源文�?owner 的红项�?
## 修复说明（docs 乱码二次修复�?
本文件在 `5d2f15e4c`（docs(docs): reconstruct mojibake-lost chunk sections in coverage-end/declarations/statements (docs-only, from git history)）之后再次被写坏�?`845a88574`（feat(statements): block-level class declarations dispatch（statements 406/406，全�?4152/4152））�?UTF-8 中文按错误编码重写，
字节里已经含 U+FFFD 替换字符（信息不可逆），因此该提交之后的正文无法无损还原�?
本次以上一�?**strict-UTF-8 合法�?U+FFFD=0** �?revision `5d2f15e4c` 为基准重建全文；
被丢失的 chunk 记录只回�?git 可确证的事实（提�?sha / subject / 文档 diff 统计），
正文内容不虚构，统一标注�?�?git 历史重建，原文件乱码)」�?
### 丢失章节（该 revision 之后、本文档的提交）

| commit | subject | 本文�?diff |
| --- | --- | --- |
| `32182a78` | feat(statements): ASI continuation edges �?return/break/continue newline split（statements 290/290，全�?3769/3769�?| +98 / -175 |
| `4fa193e7` | merge: cover-asi-edges-1 (ASI continuation edges) | +95 / 0 |
| `f5d5c0b2` | test(statements): using / await using measurement sweep（statements 314/314，全�?3886/3886�?| +194 / -323 |
| `c4a9eb59` | test(statements): expression-statement start token matrix（statements 388/388，全�?4052/4052�?| +24 / 0 |
| `845a8857` | feat(statements): block-level class declarations dispatch（statements 406/406，全�?4152/4152�?| +25 / 0 |

### 近期 chunk 记录（据 git 历史重建，原文件乱码；正文不可无损恢复）

| 家族 / chunk | git 证据（提�?· 合并�?| 读数（来自提�?subject�?|
| --- | --- | --- |
| using / await using | bad1f73e · d6d7d8ad (merge cover-using-1) · f5d5c0b2 (measurement sweep) | using-declarations stem；statements 314/314，全�?3886/3886 |
| statement sweep 4 (do-while ASI / edges) | 1ddd3eaa | statements 242/242，全�?3176/3176 |
| statement sweep 5 (switch lexical bodies, try/finally, throw, labeled jumps) | 022e3346 (merge cover-statements-5) | 测量记录 |
| ASI continuation edges | 32182a78 · 4fa193e7 (merge cover-asi-edges-1) | statements 290/290，全�?3769/3769 |
| expression-statement start token matrix | c4a9eb59 | statements 388/388，全�?4052/4052 |
| block-level class declarations | 845a8857 | statements 406/406，全�?4152/4152 |

以上提交的原始乱码正文仍保留�?git 历史中（`git show <sha>:docs/...`），docs 家族可按需重新转写�?