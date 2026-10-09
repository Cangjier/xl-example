// xl:title 自有属性的枚举次序：整数键升序在前、其余按插入序（九种观察口径）
// xl:round 715
// xl:judge stdout
// xl:end
// **按判定点并组（第 802 轮）**：吸收同域逐条一问的九条原子探针
// `p715b-b01` … `p715b-b09`，正文逐句搬进各自的块里，打印口径与探针一字不差。
// 判据只有一条：**自有属性的枚举次序**——整数键（array index）按数值升序排在最前，
// 其余字符串键按插入序；`delete` 之后再插回来的排到最后；负数与小数键**不是**整数键。
// 九种观察口径（`Object.keys` / `for..in` / `JSON.stringify` / `values` · `entries` /
// `getOwnPropertyNames` / 派生键 / `delete` 重插 / 展开与 `Object.assign`）问的是同一条规则。
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

// b01 · `Object.keys` 把整数键排在前面
{
  const o: any = { b: 1, 2: 2, 1: 3, a: 4 };
  console.log(show(Object.keys(o).join(",")));
}

// b02 · `for..in` 与 `Object.keys` 同一次序
{
  const o: any = { b: 1, 2: 2, 1: 3, a: 4 };
  const ks: string[] = []; for (const k in o) ks.push(k);
  console.log(show(ks.join(",")));
}

// b03 · `JSON.stringify` 的键序
{
  const o: any = { b: 1, 2: 2, 1: 3, a: 4 };
  console.log(show(JSON.stringify(o)));
}

// b04 · `Object.values` / `entries` 的次序
{
  const o: any = { b: "B", 2: "2", 1: "1" };
  console.log(show(Object.values(o).join(",")) + "|" + show(JSON.stringify(Object.entries(o))));
}

// b05 · `Object.getOwnPropertyNames` 的次序
{
  const o: any = { b: 1, 2: 2, 1: 3, a: 4 };
  console.log(show(Object.getOwnPropertyNames(o).join(",")));
}

// b06 · 派生键（10 与 9）按数值而不是字典序
{
  const o: any = {}; o[10] = "x"; o[9] = "y"; o["z"] = "w";
  console.log(show(Object.keys(o).join(",")));
}

// b07 · 负数与小数键不是整数键
{
  const o: any = {}; o[-1] = 1; o[1.5] = 2; o["0"] = 3;
  console.log(show(Object.keys(o).join(",")));
}

// b08 · `delete` 之后重新插入排到最后
{
  const o: any = { a: 1, b: 2 }; delete o.a; o.a = 3;
  console.log(show(Object.keys(o).join(",")));
}

// b09 · 展开与 `Object.assign` 的次序
{
  const o: any = { b: 1, 2: 2, 1: 3 };
  console.log(show(JSON.stringify({ ...o })) + "|" + show(JSON.stringify(Object.assign({}, o))));
}
