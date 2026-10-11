// xl:note 第 1227 轮新立：`?.` 后面那一截**末尾跟一格反引号模板**、而模板前面那一截
// **不是一格名字**的那一族（`a?.b.c`t`` / `a?.b()`t`` / `a?.b(1)`t`` / `a?.b!()`t``
// 以及各自后面再接 `.d` / `()` 的排版）。
// 根因在投影层：`?.` 后面那一截在 token 层被收进**同一个** `NullConditionalOperator`，
// 而末尾那一格模板前面是 `PropertyAccess` / `Method` / `NotNull`（名字在里面，不在顶层）
// ⇒ 第 175 轮那一支（只认「模板前面恰好一格名字」）判否，`chainWithOptional` 里
// 那几条早退支各接各的、**末尾那格模板没人接**：`TaggedTemplateExpression` 与
// `NoSubstitutionTemplateLiteral` 整片缺，里面那次调用的区间还一路撑到模板串末尾。
// 补法是给 `chainWithOptional` 加一层：把**末尾连续那一串模板**摘下来交给 `chainOnto`
// （它本来就有「紧跟一格反引号模板 ⇒ 又是一条标签模板」那一支），余下那一截原样交给
// 原来的本体（判据、次序一个字没改）。判据与四档分界记在
// `typescript/print-ast-common.xl.md` 的 `chainWithOptional` 那一节。
// xl:ts-invalid TS 自己会给其中一部分一条**语义**错（可选链上取模板再调用之类），
// 可**树是照投的**——本仓的判据只算语法（kind / 区间 / 字段名），语义错不进账。
// xl:end
declare const a: any, b: any, c: any, d: any, T: any;

a?.b.c`t`;
a?.b()`t`;
a?.b(1)`t`;
a?.b!()`t`;
a?.b.c`t`.d;
a?.b()`t`.d;
a?.b(1)`t`.d;
a?.b!()`t`.d;
a?.b.c`t`();
a?.b()`t`();
a?.b(1)`t`();
a?.b!()`t`();
a?.[0]`t`;
a?.(1)`t`;
const q1 = a?.b.c`t`;
const q2 = a?.b()`t`;
function g() { return a?.b(1)`t`; }
