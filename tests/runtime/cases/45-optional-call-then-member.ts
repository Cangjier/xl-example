// 第 154 轮：可选调用的结果上再取属性（`o.m?.().k`）——投影那一层的修。
//
// **症状**：不带括号时 `o.m?.().k` **静默**给 `undefined`（JS 给 `3`）；
// 而 `(o.m?.()).k` 与 `const h = o.m?.(); h.k` 都是对的——差别只在**投影**那一层。
//
// **根因**（第 154 轮插桩查到的）：token 层的属性访问重组把 `( ) . k` 折成了**一个**
// `PropertyAccess`，所以 `chainWithOptional` 收到的第一格是 `PropertyAccess` 而不是实参括号；
// 原来那条「是实参括号 ⇒ 建 `CallExpression`」的分支于是没走到，掉进「按成员名折属性访问」
// 那一支——把括号当成名字，投出一个名叫 `()` 的属性访问。
//
// **修法**：在 `chainWithOptional` 里认出这个形状，按**语义的顺序**拆——
// 先拿头一个实参括号建调用，再把括号之后的成员（`.k` / `[i]`）逐个接到调用结果上。

const box: any = {
  m: () => ({ k: 3, deep: () => 7, inner: { n: 9 } }),
  missing: undefined,
};

// ① 调用结果上再取属性 / 下标 / 再调一次
console.log(box.m?.().k, box.m?.()["k"], box.m?.().deep?.(), box.m?.().inner.n);

// ② 带括号与「先接住」两条老路（本来就对，当回归）
// **这里不打印裸函数** ✗：`box.m?.()` 的值里含一个函数 ✓，
// 而「函数渲染成什么」是本仓**已经记着**的一处差异 ✓（Node 给 `[Function: deep]` ✓、
// 本仓给 `[Function (anonymous)]` ✓）——那是**另一件事** ✗，不混进这一份语料 ✓。
console.log((box.m?.()).k, box.m?.().inner.n);
const held = box.m?.();
console.log(held.k, held.deep());

// ③ 短路那一半照旧
console.log(box.missing?.().k, box.missing?.()["k"], box.missing?.().deep?.());

// ④ 与二元混在一起（这条是**另一档**已知缺口，先不在这份语料里量）
console.log(box.m?.().k === 3, box.m?.().k > 2);
