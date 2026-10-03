// 语料 24：展开与剩余的**字面量那一半** + 绑定模式的默认值（第 132 轮）
// ——stdout 与 `node <本文件>` 逐字节对拍。
//
// **这一份的来历**：上一轮量出来「十五条日常写法**全部**抛」✗，这一轮先啃**不需要动引擎**的那一半：
//   · `[...xs]`（数组字面量里的展开 ✓）
//   · `{...o}`（对象字面量里的展开 ✓）
//   · `const [x = 9] = []` / `const {a = 7} = {}`（绑定模式里的默认值 ✓）
//   · `const [a, ...r] = xs`（数组剩余 ✓）
//
// **还差的那一半要动引擎**（下一轮）：`function f(...rest)` 与 `f(...xs)`——
// `Op.Call` 收的是**定长**的连续参数窗口，`FunctionInfo.ParamCount` 也是定长，
// 「把多出来的实参收成数组」与「按数组铺开实参」都要新的算子与帧侧支持。
//
// **语料里避开的**（各自记着，不是漏测）：
//   · `[...xs, , 3]`（展开**之后**的洞）—— 要让洞也带上动态下标，引擎得给一个 `set_hole` 算子，
//     而静默填成 `undefined` 会让 `1 in a` 从假变真（形状变了）；
//   · `const {a, ...r} = o`（对象剩余）—— 要一份「排除名单」，引擎侧没有这条路；
//   · `for (const [k, v] of …)`（for..of 头部里的解构）—— 声明与每轮写入要先分开，
//     那是**另一条**待办；
//   · `{...'ab'}`（原始值来源）与访问器来源 —— 跟着 `Object.assign` 的口径走（不调 getter）。

console.log("spread-array", [...[1, 2], 3].join(","), [...[1, 2]].join(","));
console.log("spread-two", [...[1], ...[2, 3]].join(","));
console.log("spread-string", [..."abc"].join("-"), [...""].length);
console.log("spread-set", [...new Set([1, 2, 2, 3])].join(","));
console.log("spread-map", [...new Map([[1, "a"], [2, "b"]])].length);
console.log("spread-holes", (() => {
  const source = [1, , 3];
  const copy = [...source];
  // **`1 in copy` 不能直接写在数组字面量里** ✗：那是 token 层已记的一条缺口
  //（`[x in y]` 被读成映射键的 `TypeParameter`）——先算成字符串再入数组 ✓。
  const hasHole = 1 in copy ? "yes" : "no";
  return [copy.length, hasHole, copy.join("-")].join(" ");
})());
console.log("spread-not-iterable", (() => {
  try {
    const bad = [...5];
    return "no-throw";
  } catch (error) {
    return "caught";
  }
})());
console.log("spread-object", (() => {
  const base = { a: 1 };
  const merged = { ...base, b: 2 };
  return [merged.a, merged.b, { ...base }.a].join(" ");
})());
console.log("spread-object-order", (() => {
  const base = { a: 1 };
  return [{ a: 9, ...base }.a, { ...base, a: 9 }.a].join(" ");
})());
console.log("spread-object-nested", { ...{ a: { b: 1 } } }.a.b);
console.log("default-array", (() => {
  const [x = 9] = [];
  const [y = 9] = [1];
  return [x, y].join(" ");
})());
console.log("default-object", (() => {
  const { a = 7 } = {};
  const { b = 7 } = { b: null };
  return [a, b === null].join(" ");
})());
console.log("default-chain", (() => {
  const [a = 1, b = a + 1] = [];
  const { c = b * 2 } = {};
  return [a, b, c].join(" ");
})());
console.log("default-nested", (() => {
  const { a: { b = 5 } = {} } = {};
  return b;
})());
console.log("rest-array", (() => {
  const [a, ...r] = [1, 2, 3];
  const [c, ...empty] = [1];
  const [[d], ...tail] = [[1], [2], [3]];
  return [a, r.join(","), c, empty.length, d, tail.length].join(" ");
})());
console.log("rest-array-holes", (() => {
  const [a, ...r] = [1, , 3];
  // 同上：`in` 先算成字符串 ✓（JS 这里是**真**——解构剩余走迭代器，洞变成 `undefined` ✓）。
  const zero = 0 in r ? "yes" : "no";
  const one = 1 in r ? "yes" : "no";
  return [a, r.length, zero, one].join(" ");
})());
console.log("after", 1 + 1);
