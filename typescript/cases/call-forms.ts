// call-forms 用例集：调用形态与 new 形态（spread 实参暂缓，见文末目标行）。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行。
// 快照：node typescript/cases/ast-json.mjs call-forms && node typescript/cases/ast-json-diff.mjs call-forms
//
// 口径（TS 实测）：NewExpression 的 children 是 callee + type arguments + arguments（`new C;` 只有 callee）。

// ===== 4. 调用 =====
f();
f(a, b);
a.b(c);
a[b](c);
f()();
(f())(a);
a?.b(c);
a?.();
// + trivia：实参前后 / 换行 / callee 与括号间
f(/* c */ a);
f(a /* c */, b);
f(\na,\nb,\n);
f\n(a);
a /* c */ . b(c);
a.\nb(c);
f() /* c */ ();
// 暂缓：spread 实参 —— ParseBracketArguments 不认 `...`（`不支持的表达式起点`）；
// `...` 属 expressions 家族的 SpreadElement 产生式，本块不改 expression-builder，先记目标：
// f(...a);
// f(a, ...b, c);
// f(... /* c */ a);

// ===== 5. new =====
new C();
new C(a, b);
new C;
new a.b();
new (f())();
new a.b(c);
// + trivia：new 与 callee 间 / 实参内 / 点两侧 / 换行
new /* c */ C();
new C(/* c */ a);
new a /* c */ . b();
new\nC();
// 暂缓：spread 实参（同 group 4，ParseBracketArguments 不认 `...`）：
// new C(...a);
// 泛型 new（`new C<T>();`）：TS 的 NewExpression children = callee + TypeReference（无实参节点），
// 但当前 ParseNew 不读类型实参，先记为暂缓目标：
// new C<T>();
