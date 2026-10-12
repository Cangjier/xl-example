// xl:note 第 1231 轮**新登记**的一族（换了一片地形普查撞出来的：`tmp/r1231-sweep.mjs` 拿
// 82 个底样 × 3 个位置问「X`t`」，其中 4 个底样对不上，这一族是**新的一类根**）：
// **二元规则跨行把「函数声明」折成了左操作数** —— `function w() { }` 换行之后那一行以
// `/` / `+` / `-` 开头时，产物是
//
//     <BinaryOperator op="/"><BinaryOperator op="/">
//       <Function range="[22,37]" name="w" …>…</Function>
//       <SymbolToken>/</SymbolToken><Identifier>re</Identifier>
//     </BinaryOperator><SymbolToken>/</SymbolToken><Identifier>g</Identifier></BinaryOperator>
//
// ——`function` 那一格与下一行的 `/` 折进了同一个 `BinaryOperator`，于是**整条函数声明丢**
//（实测缺 `FunctionDeclaration` + 后一条 `ExpressionStatement`、多 8 格）。
// 判据本来是该问「左操作数**真的在运算符左边**」（`binary-operator.xl.md` 第 580 行那一段，
// 第 306 轮立的），可那一格此刻**看不出自己是声明**（同一格 `function` 既可以是声明也可以是
// 表达式，`IsOperand` 第 692 轮又刻意把 `Function` 补进了名单——`typeof function () {}` 要它）；
// `class C { }` / `const w = function () { }` / `if (a) { }` 三种对照**都对上**，
// 说明这一格缺的是「这一格站在语句位」这个事实，而不是名单少一格。
// 同一族还有两档（读数都在 `tmp/r1231-asi.mjs` / `tmp/r1231-obj.mjs`）：
//   · `for (;;) { }` 换行 `/re/g;` —— 正则**没成形**（多一个 `SlashToken`、缺 `RegularExpressionLiteral`）；
//   · 语句位的 `{ p: 1 }`t`` —— TS 读成「块 + 一条模板表达式语句」，产物折成**一条**标签模板
//     （缺 1 多 2）。
// 按本仓规矩**先登记、不猜**：用例进语料，缺口走 `xl:known-gap` 那条账。
// xl:known-gap 二元规则跨行把语句位的 `function` 声明 / 块折成左操作数（那一格此刻看不出自己是声明）
// xl:round 1231
// xl:end
declare const a: any;

function w1() { }
/re/g;

function w2() { }
+1;

function w3() { }
-1;

function w4() { }
/re/g`t`;

{ p: 1 }`t`;
