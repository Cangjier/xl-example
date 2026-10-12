// xl:note 第 1226 轮新立：实例化表达式后面跟**点号成员**那一族
// （`a<b>.b` / `a<b>.b`t`` / `a<b>.b(1)` / `a<b>.b.c` / `a<b>.b?.c` / `a<b>.b as T` …）。
// 两个根：① token 层的后继闸 `GenericTypeBranch.IsAllowedFollower` 表达式位原来只放行
// `( ) ; , ] ? : || &&` 与反引号、四个词（`as` / `satisfies` / `in` / `instanceof`）——
// 配对 `>` 后面紧跟一个点号时那次试读被判否 ⇒ `<b>` 退回裸符号 ⇒ 折成比较式（这一族整族丢）；
// ② 投影层 0a 那一支的收尾一律交给 `foldBinaryFrom`，而它开头一句要求 `rest` 以运算符打头，
// 点号**是**运算符单元 ⇒ 折出 `BinaryExpression(op=".")`（`DotToken` 当 `operatorToken`、
// `PropertyAccessExpression` 整格缺）。
// 这一族在 TS 里都带一条**语义**错（实例化表达式不能带类型实参），可**语法树是这么读的**
// ——本仓的判据只算语法（kind / 区间 / 字段名），语义错不进账。
// 形状与「后一位是数字」那一档（`a < b > .5` 是**合法的比较式**）的分界记在
// `typescript/tokens/generic-type.xl.md` 的 `IsAllowedFollower` 那一节。
// xl:ts-invalid TS 自己会给这族一条**语法/语义**错（`An instantiation expression cannot be
// followed by a property access.`），可**树是照投的**（`PropertyAccessExpression >
// [ExpressionWithTypeArguments, Identifier]`）——本仓的判据只算语法（kind / 区间 / 字段名），
// 所以这族照样进语料、照样逐格对拍。
// xl:end
declare const a: any, b: any, f: any, C: any, d: any;
interface T {}

a<b>.b;
a<b>.b`t`;
a<b>.b(1);
a<b>.b.c;
a<b>.b?.c;
a<b>.b!;
a<b>.b as T;
a<b>.b satisfies T;
a<b>.b[0];
a<b>.b().c;
f<T>.b;
(a)<b>.b;
a.b<c>.d;
const q = a<b>.b;
function g() { return a<b>.b; }
