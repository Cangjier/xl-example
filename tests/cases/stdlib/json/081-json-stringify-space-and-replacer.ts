// xl:title JSON.stringify 的 space 与 replacer 探针组
// xl:round 785
// xl:judge stdout
// xl:end
// **合并**（第 785 轮）：逐批重抄的原子探针按判定点并成一组——
//   · stdlib/json/probe693-j04 / j06 / j25
//   · stdlib/json/probe695-j06 / j07 / j08 / j09 / j25 / j27 / j38
// 判定点只有一个：**第三格（space）与第二格（replacer）**——数字、字符串、超范围、
// 0 与 `"\t"` 两档，replacer 的数组白名单与函数形态。逐条原样搬进来。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};
probe(() => JSON.stringify({ a: 1 }, null, 2));
probe(() => JSON.stringify({ a: 1, b: 2 }, (k, v) => (k === "b" ? undefined : v)));
probe(() => JSON.stringify({ a: 1 }, null, "\t").length > 0);
probe(() => JSON.stringify({ get a() { return 1; } }, null, 2));
probe(() => JSON.stringify({ get a() { return 1; }, b: 2 }, null, 2));
probe(() => JSON.stringify({ get a() { return 1; } }, ["a"]));
probe(() => JSON.stringify({ get a() { return 1; } }, (k, v) => v));
probe(() => JSON.stringify({ a: 1 }, null, 0));
probe(() => JSON.stringify({ a: { b: 1 } }, null, 2).length > 10);
probe(() => JSON.stringify([1, [2, [3]]], null, 1).length);
// **第 786 轮并入**：stdlib/json/probe-q07（replacer 白名单挑不中）与
// probe703-j-f19（字符串 space）——同一判定点的另外两档。
probe(() => JSON.stringify({ a: 1 }, ["b"]));
probe(() => JSON.stringify({ a: 1 }, null, " "));
