// xl:title JSON.stringify 的 toJSON 探针组
// xl:round 785
// xl:judge stdout
// xl:end
// **合并**（第 785 轮）：stdlib/json/probe695-j18 / j19 / j20 —— 判定点只有一个：
// **`toJSON` 那一格**——顶层对象与嵌套对象都要先问它；它**不可调**（`{ toJSON: 5 }`）时
// 按普通数据格印。逐条原样搬进来。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};
probe(() => JSON.stringify({ toJSON() { return { a: 1 }; } }));
probe(() => JSON.stringify({ a: { toJSON() { return 1; } } }));
probe(() => JSON.stringify({ toJSON: 5 }));
