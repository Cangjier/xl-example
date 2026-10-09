// xl:title JSON.parse 的形态探针组：对象 / 数组 / 空白 / 往返
// xl:round 785
// xl:judge stdout
// xl:end
// **合并**（第 785 轮）：stdlib/json/probe693-j14 / j15 / j18 / j22 ——
// 判定点只有一个：**`JSON.parse` 出来的东西是不是普通对象 / 数组**，以及空白与往返。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};
probe(() => JSON.parse("{\"a\":1}").a);
probe(() => JSON.parse(" [1, 2] ").length);
probe(() => JSON.parse("{\"a\":1}") instanceof Object);
probe(() => JSON.parse(JSON.stringify({ a: [1, { b: 2 }] })).a[1].b);
// **第 786 轮并入**：stdlib/json/probe-q10 / q17 与 probe703-j-f07 / f16 / f17 / f18 / f24 ——
// 同一判定点（parse 的形态）的另外七档：空数组、两侧空白、reviver 改写、小数、串、null。
probe(() => JSON.parse("[]").length);
probe(() => JSON.parse("  1  "));
probe(() => JSON.parse("[1,2]", (k, v) => (typeof v === "number" ? v * 2 : v))[0]);
probe(() => JSON.parse("1.5"));
probe(() => JSON.parse('"a"'));
probe(() => JSON.parse("null"));
probe(() => JSON.parse("[1,2]").length);
