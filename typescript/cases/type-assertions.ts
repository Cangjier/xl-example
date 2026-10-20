// 尖括号断言与泛型箭头：语句首 `<` 在 TS（ScriptKind=TS，无 JSX 二义）只可能是这两者。
// TS 口径：TypeAssertionExpression children = [Type, expression]（`<` / `>` 不投影）；
//          ArrowFunction children = TypeParameter 们、Parameters、EqualsGreaterThanToken、body。
// 一行一个用例；行内的 \n 由 ast-json.mjs 还原成真实换行。

// ── base：尖括号断言 ──
<T>a;
<T>a.b;
<T>(a + b);
<T>f();

// ── base：泛型箭头 ──
<T>(a) => a;
<T>(a: T) => a;
<T, U>(a, b) => a;

// ── 断言：trivia 与操作数形态 ──
<T> a;
<T>\na;
/* c */<T>a;
<T>a\n+ b;
<T>-a;
<T>[a];
<T>x as T;

// ── 泛型箭头：trivia / 多参数 / 块体 / 与断言区分 ──
< T >(a) => a;
<T,U>(a, b) => a;
<T, U>(a, b, c) => a;
<T /* c */>(a) => a;
<T>(a) /* c */ => a;
<T>(a) => { return a; };
<T>(a) => a + b;

// ── 重复形：多条混排 ──
<U>b;
<T>(a) => a, <U>(b) => b;
<T>a; <T>b;

// ── 回归：泛型调用以标识符开头，不走断言分支 ──
a<T>(b);
f<T, U>(a);
a < b;
a < b > c;
