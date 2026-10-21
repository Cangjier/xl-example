// expression-builder 修复的回归用例（token AST 尺子不扫 token-repros 子目录；整份已用尺子内核校验 PASS）
// G2(`>>`) / G3(async 函数与 async 箭头) / G7(无体成员、裸 await、实例化后接运算符) /
// G11(function* / function<T>) / stmt D(async 泛型箭头) / decl G8/G9(泛型箭头尾逗号、实例化后接 ?? || &&)
// 第二轮：嵌套泛型 `>>` 的表达式收口（new Map<…Array<number>>() 的实参表/调用括号不再错位）。
// 已知残留：`const x = new Map<string, Array<number>>();` 的裸逗号截断在 statement-builder（不在本文件）；
// 标签模板的标签是实例化表达式（`a<b>`t``）的投影余差与 expr-r1220 同源，均未列入本文件。
const c = <string>x;
const d = <Array<number>>y;
const f1 = async function () {};
const f2 = async (): Promise<void> => {};
const f3 = async (x) => x;
const f4 = async<T>(x) => x;
const f5 = async <T>(x: T) => x;
const f6 = async/*c*/(): Promise<void> => {};
const g1 = function* () { yield 1 };
const g2 = (function <T>(x: T) { return x; })(1);
const v = { new (a: number): I };
const w = await;
const a1 = f<number> ?? 1;
const a2 = f<number> || 1;
const a3 = f<number> && 1;
a<b> as T;
[a<b> as T];
f(a<b> as T);
a<b> instanceof C;
new Map<string, Array<number>>();
new Map<Array<Array<string>>>();
new Map<string, Array<number>>(1);
f<Map<string, Array<number>>>(1);
class S { m = new Map<string, Array<number>>() }
a < b && c > (d);
