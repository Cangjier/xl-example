// 语料 28：字符串可迭代 · 字符串下标 · 空值上的属性读（第 136 轮）
// ——stdout 与 `node <本文件>` 逐字节对拍。
//
// **这一份的来历**：第 135 轮收尾时量出「字符串不是可迭代物」✓，这一轮修它 ✓——
// 而顺着那一条又找出**同一件事的另一半** ✓：
//
//   ① **`iter_new` / `iter_next` 不认字符串** ✗：`for (const c of "ab")` 报
//      `iterating a non-object` ✓。修法在**引擎**（`runtime/vm.xl.md` ✓）：
//      字符串**不是对象** ✓，所以那一支必须排在 `IsObject` 那句**之前** ✓；
//      游标那一支按**码元**给「一个码元的字符串」✓——与 `.length` / 下标 / `charAt` /
//      `spread_into` **同一条口径** ✓。**JS 那边是按码点** ✗（`for (const c of "😀")`
//      只给一个 ✓ 而 `"😀".length` 是 2 ✓）——**这是一处已知差** ✓：
//      整层的口径是码元 ✓，单独让迭代按码点会让「`[...s]` 与 `for (const c of s)`
//      给的不一样」✗（同一种东西两种答案比一起偏更糟 ✓）。
//   ② **字符串下标读一直是 `undefined`** ✗（`"xy"[0]` 在 JS 里是 `"x"` ✓）。
//      规范里原本写着「这是一块已知的语义差，不在这里顺手猜一个」✓——
//      可 `props.xl.md` 的 `GetIndex` **早就办到了** ✓，只是 `vm.xl.md` 那一层没走它 ✗。
//      **同一件事两处答案，删掉错的那一处** ✓。它顺带修掉
//      「`const [a, b] = "xy"`」✓（数组模式的解构**按下标读** ✓）。
//   ③ **读 `null` / `undefined` 的属性不抛** ✗：JS 是 `TypeError` ✓，
//      而这里一律给 `undefined` ✗——`try { null.y } catch {}` 在 Node 里进 `catch` ✓、
//      在这里不进 ✗。**静默错值里最贵的一种** ✓。修法是两处：`props.xl.md` 抛 ✓，
//      `vm.xl.md` 那一支**包一层 `Guard`** ✓（不包的话抛出来的是**引擎的**异常 ✓，
//      整份程序照样挂 ✗——与第 127 轮 `str + obj` 那条修法同源 ✓）。
//
// **语料里避开的**（各自记着，不是漏测）：
//   · `instanceof TypeError` / `e.name` —— 抛出来的走**错误工厂** ✓，`try` 接得住 ✓，
//     但「是哪一种错误」还分不出来 ✗；
//   · 代理对（`😀`）—— 见上面第 ① 条那处已知差 ✓；
//   · `new C(...xs)` / `super(...xs)` —— 第 133 轮记着的两条 ✓。

console.log("str-iter", (() => {
  const out = [];
  for (const c of "abc") out.push(c);
  return out.join("|");
})());
console.log("str-iter-control", (() => {
  let n = 0;
  let last = "";
  for (const c of "hello") {
    if (c === "l") continue;
    n = n + 1;
    last = c;
    if (c === "o") break;
  }
  return n + ":" + last;
})());
console.log("str-iter-empty", (() => {
  let n = 0;
  for (const c of "") n = n + 1;
  return n;
})());
console.log("str-iter-nested", (() => {
  const out = [];
  for (const word of ["hi", "no"]) {
    for (const c of word) out.push(c);
  }
  return out.join("");
})());
console.log("str-index", "xy"[0], "xy"[1], "xy"[5], "abc".length, "abc".charAt(2));
console.log("str-destructure", (() => {
  const [a, b] = "pq";
  const out = [];
  for (const [k, v] of ["rs"]) out.push(k + v);
  return a + b + ":" + out.join("");
})());
console.log("nullish-read", (() => {
  const seen = [];
  try {
    const bad = null;
    seen.push(bad.member);
  } catch (error) {
    seen.push("caught-member");
  }
  try {
    const { missing } = null;
    seen.push(missing);
  } catch (error) {
    seen.push("caught-destructure");
  }
  try {
    const undefinedValue = undefined;
    seen.push(undefinedValue[0]);
  } catch (error) {
    seen.push("caught-index");
  }
  return seen.join(",");
})());
console.log("after", 1 + 1);
