// 第 181 轮：**成员位上的逻辑赋值**（`o.a ??= 5` · `o[k] ||= 1` · `o.a.b &&= f()`）。
//
// 第 150 轮把 `||=` / `&&=` / `??=` 做成了「合成一棵树再降级」（`a ||= b` ⇒ `a || (a = b)`），
// 但**只认标识符** —— 成员位那两种响亮地抛 `logical assignment to a non-identifier`，
// 而 `o.a ??= {}` / `this.value ||= 1` 在普通 `.ts` 里很常见。
//
// **为什么成员位不能沿用合成树**：合成树里左边会出现**两次**——名字读两次没有副作用，
// 而 `o[f()] ||= 1` 里那个 `f()` 会**跑两遍**（JS 只求值一次）。
// 所以这一支走的是「**读引用一次 → 判 → 需要才写回同一格**」：
//
//   · **接收者只求值一次**（`get().a ??= 5` 里 `get()` 一次）；
//   · **键只求值一次**（`o[key()] ??= 1` 里 `key()` 一次）——读写用的是同样那两格；
//   · **右边只在需要时才算**（短路生效时一次都不算，与 `&&` / `||` / `??` 同一条口径）；
//   · 极性照那三支写：`??=` 空才写、`||=` 假才写、`&&=` 真才写。

const o: any = { v: 0, w: 1, n: null };

// ① 三个运算符各来一次（属性位）
o.v ||= 1;
o.w ||= 9;
o.n ??= 3;
console.log(o.v, o.w, o.n);

// ② 接收者只求值一次
let receivers = 0;
function get() { receivers++; return o; }
get().v ??= 5;
console.log(o.v, receivers);

// ③ 键只求值一次
let keys = 0;
function key() { keys++; return "v"; }
o[key()] ??= 6;
console.log(o.v, keys);

// ④ 右边只在需要时才算（`o.v` 非空 ⇒ 一次都不算；`o.missing` 空 ⇒ 算一次）
let rhs = 0;
function f() { rhs++; return 7; }
o.v ??= f();
o.missing ??= f();
console.log(o.v, o.missing, rhs);

// ⑤ 下标位与嵌套成员
const xs: any[] = [null, 0, 1];
xs[0] ??= "d";
xs[1] ||= 5;
xs[2] &&= 6;
const nested: any = { a: { b: null } };
nested.a.b ??= 8;
console.log(xs.join(","), nested.a.b);
