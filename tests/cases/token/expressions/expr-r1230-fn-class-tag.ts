// xl:note 第 1230 轮新立：**函数表达式与类表达式当标签模板的标签**那一族
//（`function () {}`t`` / `function f() {}`t`` / `class {}`t`` / `class extends K {}`t``
//  以及各自后面接 `.d` / `()` / `!` / 下标 / 又一个模板的续写）。
// 根因与第 1229 轮那三处**同一条口径**：`tagIsPostfixChain`（`print-ast-common.xl.md` 第 0b 支的入口）
// 认的是「这一格能不能当标签」，而 `Function` / `Class` 两页各自依上下文投成两种节点
//（`FunctionDeclaration` / `FunctionExpression`、`ClassDeclaration` / `ClassExpression`），
// **两页都只有声明名那一格、没有这一格** ⇒ 入口判否 ⇒ 通用支把那一格按**声明**投出来
//（多一格 `FunctionDeclaration` / `ClassDeclaration`），模板整格丢。
// 实测 `tmp/r1230-fnexpr.mjs`（24 条排版）：**12 条对上 / 12 条对不上 → 24 条全对上**；
// `tmp/r1230-fnbody.mjs`（非空体、换行体、类体里有成员 / 字段）9 条也全对上。
// 补法：两页各补 `## field IsTagBaseNode:bool = true`（`New` 第 1221 轮、正则与
// `new` / `import` 第 1229 轮补的是同一格）——认下来之后投影走的是 `projectExpression(前缀)`，
// 那一趟本来就按**表达式位**投（与不带模板的 `const v = function () {};` 同一份算式）；
// 语句位的 `function () {}`t`` 是 TypeScript 自己非法的形状，不在缺口账里。
// xl:round 1230
// xl:end
declare const f: any, o: any, a: any;
class K { m() { return 1; } }

const v1 = function () {}`t`;
const v2 = function f() {}`t`;
const v3 = class {}`t`;
const v4 = class extends K {}`t`;
const v5 = function () { return 1; }`t`;
const v6 = class { m() { return 1; } }`t`;
const v7 = class { p = 1; }`t`;
const v8 = function () {}`t`.d;
const v9 = class {}`t`.d;
const v10 = function () {}`t`();
const v11 = class {}`t`();
const v12 = function () {}`t`!;
const v13 = class {}`t`!;
const v14 = function () {}`t`[0];
const v15 = class {}`t`[0];
const v16 = function () {}`t``u`;
const v17 = class {}`t``u`;
const v18 = function () {}`t` as any;
const v19 = class {}`t` as any;
f(function () {}`t`);
f(class {}`t`);
o.m(function () {}`t`);
o.m(class {}`t`);
const v20 = function () {
  return 1;
}`t`;
function w() { return function () {}`t`; }
class Z { q = class {}`t`; }
