// xl:note 第 1232 轮新立：**语句位的声明 / 体之后那一行以运算符或 `/` 开头**那一族
//（口径 1.1 收掉的那一半；第 1231 轮登记在 `gap-r1231-decl-newline-operator.ts` 里的
// `function` / `class` / `for` / `while` 四档 + 裸块那一档，本轮全部收掉）。
//
// 两处根因（同一件事的两半，都在**位置**上）：
//
// ① `binary-operator.xl.md` 的 `Previous`：`function w() { }` 换行 `/re/g;` 里那一格
//    `Function` 是**声明**（自己就是一条语句），而 `IsOperand` 第 692 轮为了
//    `typeof function () {}` / `function () {} + 1` 把 `Function`（与第 328 轮的 `Class`）
//    补进了名单 ⇒ 整条声明被折成二元左操作数（`FunctionDeclaration` 与
//    `ExpressionStatement` 一起丢）。补的那一句是 `Statement.IsDeclarationPosition`
//    （第 679 轮立的、`IsStatementBoundary` 用的同一句）：**位置**才是那两档的分界线。
//
// ② `regex-token.xl.md` 的 `Condition`：体那个花括号（`function w() { }` / `for (;;) { }` /
//    `while (a) { }` / 裸块）在解析期还是**裸 `Bracket`**，原来「凡是 `Bracket` 都答除号」
//    ⇒ `/` 退化成 `SlashToken`、正则整格丢。补的那一句先由 `IsObjectLiteralBrace`
//    挡掉值位那一档（`const v = { p: 1 }` 换行 `/re/g` 仍是除号），再拿
//    `RegexTokenBranch.IsStatementBrace`（往回找到构造的头、问 `IsStatementStart`）判
//    「这一格体是不是一条语句的收尾」。
//
// 对照档（**必须仍是除号**，这一支不是放宽）：表达式位的函数 / 类 / 箭头
//（`const v = function () { }` / `const v = class { }` / `const v = () => { }`）
// 与值位对象字面量（`f({ p: 1 })`）后面那个 `/`。
//
// **裸块那一档不在这里**：`{ }` 换行 `/re/g;` 里那个 `/` 现在读成正则了（token 那一半是对的），
// 但语句壳仍把它与那个块收在同一条语句里（多一条 `ExpressionStatement`、缺块与正则两条），
// 那是块 / 对象字面量分岔上的另一格——留在 `gap-r1231-decl-newline-operator.ts` 里。
// xl:round 1232
// xl:end
declare const a: any, o: any, f: any, C: any;

function w1() { }
/re/g;

function w2() { }
+1;

function w3() { }
-1;

function w4() { }
/re/g`t`;

function w5() { }
/re/g.test("x");

class K1 { }
/re/g;

class K2 { }
+1;

class K3 { }
-1;

for (;;) { }
/re/g;

while (a) { }
/re/g;

if (a) { }
/re/g;

switch (a) { }
/re/g;

interface I1 { }
/re/g;

enum E1 { }
/re/g;

declare module "m" { }
/re/g;

export default function w6() { }
/re/g;

outer: { }
/re/g;

// —— 对照：这些 `/` 仍然是**除号**（表达式位 / 值位）
const v1 = function () { }
/re/g;

const v2 = class { }
/re/g;

const v3 = { p: 1 }
/re/g;

f({ p: 1 })
/re/g;

const v4 = o[0]
/re/g;

const v5 = (a)
/re/g;

const v6 = "s"
/re/g;

const v7 = /re/
/re/g;
