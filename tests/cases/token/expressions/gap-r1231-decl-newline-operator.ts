// xl:note 第 1231 轮**新登记**的一族（换了一片地形普查撞出来的：`tmp/r1231-sweep.mjs` 拿
// 82 个底样 × 3 个位置问「X`t`」，其中 4 个底样对不上，这一族是**新的一类根**）：
//
// 第 1232 ~ 1235 四轮把这一族收得只剩**一格**了（守卫用例见
// `expr-r1232-decl-newline-operator.ts` / `expr-r1233-control-head-regex.ts` /
// `expr-r1234-bare-block-regex.ts` / `stmt-r1235-bare-block-tail.ts`）：体那个花括号之后
// （`function` / `class` / `for (;;) { }` / `while (a) { }` / `try…catch`）、控制头的 `)` 之后
// （含 `do…while` 的尾巴）、裸块之后、`function` / `class` 换行 `+` `-` 那几档、
// 以及**语句位的 `{ p: 1 }`t``**（第 1235 轮：壳拆开那一趟的头认下裸块、空壳那一支认下
// 「裸块不吃尾分号」，见 `statement.xl.md` 的 `SplitShell` / `BlockClosedStatement`），
// 全部收掉。这里留着的是这片地形里**曾经还开着的那一格**（现已修复，按规则撤掉 `known-gap`）：
//
// ② **箭头函数的体之后**：`const v3 = () => { }` 换行 `/re/g;` 里那个 `/` 在 TS 里是
//    **一条新的正则语句**（实测 `ts.createSourceFile`：`[0,19)` 一条 + `[19,26)` 一条、
//    里面是 `RegularExpressionLiteral`；第 1234 轮那一页的注里写的是「TS 给
//    `((a) => {}) / re / g`」，**那一句是错的**，第 1235 轮如实记下。
//    产物那一列是**漂 3 多 9**（函数表达式那一档 `const v = function () { }` 是好的
//    ——TS 那一档确实给除法）。第 1232 轮量出来时与旧产物逐字节相同
//    ⇒ 不是那几轮改坏的，是这片地形里本来就还没做的一格。
//
// （按本仓规矩**只登记、不收**；该格后来已修复，按规则撤掉 `known-gap` 指令。）
// xl:round 1231
// xl:end
declare const a: any;

const v = () => { }
/re/g;
