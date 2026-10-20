// spread-forms 用例集：spread 实参 / spread 数组元素 / 泛型 new。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行。
// 快照：node typescript/cases/ast-json.mjs spread-forms && node typescript/cases/ast-json-diff.mjs spread-forms
//
// 口径（TS 实测）：SpreadElement 的 children 是被展开的表达式（`...` 不是节点，但区间从 `...` 起）；
// NewExpression 的 children 是 callee + TypeReference 们 + arguments。

// ===== 1. spread 实参 =====
f(...a);
f(a, ...b, c);
f(...a, ...b);
f(...(a));
f(...a ? b : c);
f(...a.b);
f(...[a, b]);
new C(...a);
// + trivia：`...` 两侧注释 / 换行 / 行尾逗号
f(... /* c */ a);
f(/* c */ ...a);
f(a, /* c */ ...b, c);
f(\n...a\n);
f(a, ...b,);

// ===== 2. spread 数组元素（语句首 `[` 仍被 CanStart 挡着：借括号 / 赋值 / 实参测量）=====
([...a]);
x = [...a];
f([a, ...b]);
([a, ...b, c]);
([a, ...b, ...c]);
// + trivia
([ ... /* c */ a ]);
([/* c */ ...a]);
f([a, /* c */ ...b, c]);
([\n...a\n]);
([a, ...b,]);

// ===== 3. 泛型 new =====
new C<T>();
new C<T, U>(a);
new a.b<T>();
new C<T>(a, ...b);
// + trivia
new C<T>(/* c */ a);
new /* c */ C<T>();
new C< /* c */ T>();
