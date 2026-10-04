// 第 152 轮：`?.` 有**两种**，守的东西不一样。
//
//   `o?.n?.()`  —— 形参那一层带 `?.`（`o?.n`）：空的是 `o` ⇒ **守接收者**；
//   `o.n?.()`   —— **调用那一层**带 `?.`（`?.()`）：空的是**取出来的方法**
//                  ⇒ **守方法值**（JS 里不调它，给 `undefined`）。
//
// 原来只有「守接收者」一条（判据是 `ChainHasOptional(call)`，而它分不出这两层），
// 于是 `o.n?.()`（`n` 是 `null`）**照样去调** ⇒ 报 `calling a non-closure value`
//（JS 给 `undefined`）。
//
// **注意方向**：`o?.n()`（调用那一层**没有** `?.`）在 JS 里是 **TypeError**，
// 这一轮**没有**把它变成 `undefined`——拿 `optional` 顶替 `callOptional` 就会犯那个错，
// 而静默错值比响亮地抛更糟。

const box: any = { m: () => 5, n: null, deep: { m: () => "deep" } };

// ① 调用那一层的 `?.`：方法为空就不调
console.log(box.n?.());
console.log(box.missing?.());
console.log(box?.n?.());
console.log(box?.missing?.());

// ② 正常情形照旧
console.log(box.m?.(), box?.m?.(), box.deep?.m?.());

// ③ 括号 / 先接住再读（这两种本来就对，留着当回归）
console.log((box.m?.() as any));
const held = box.m?.();
console.log(held);

// ④ 接收者那一层的 `?.` 照旧短路
const gone: any = null;
console.log(gone?.m?.(), gone?.deep?.m?.());
