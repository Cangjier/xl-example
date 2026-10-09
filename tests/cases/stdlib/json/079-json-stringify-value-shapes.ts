// xl:title JSON.stringify 值的形状：undefined / 函数 / -0 / 1e21 / null / 空容器 / 带空格的键
// xl:round 785
// xl:judge stdout
// xl:end
// **合并**（第 785 轮）：逐批重抄的原子探针按判定点并成一组——
//   · stdlib/json/probe693-j01 / j02 / j03 / j11 / j13 / j19 / j20（第 693 轮）
//   · stdlib/json/probe695-j21 / j23 / j30 / j31 / j33 / j34 / j39 / j40（第 695 轮）
// 判定点只有一个：**`JSON.stringify` 对「值的形状」的口径**——哪些格丢掉（对象里的
// undefined / 函数）、哪些写 null（数组里的洞）、`-0` / `1e21` / NaN / Infinity 怎么印、
// 空容器与带空格的键印成什么。逐条探针原样搬进来（每条各自 try/catch，语义一字未改）。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};
probe(() => JSON.stringify({ a: 1, b: undefined }));
probe(() => JSON.stringify([1, undefined, 2]));
probe(() => JSON.stringify({ a: [1, 2] }));
probe(() => JSON.stringify(NaN) + "," + JSON.stringify(Infinity));
probe(() => JSON.stringify(function () {}) === undefined);
probe(() => JSON.stringify({ a: { b: { c: 1 } } }).length);
probe(() => JSON.stringify([[]]));
probe(() => JSON.stringify({ a: undefined, b: function () {} }));
probe(() => JSON.stringify([]));
probe(() => JSON.stringify({ a: -0 }));
probe(() => JSON.stringify({ a: 1e21 }));
probe(() => JSON.stringify(Object.assign({}, { a: 1 })));
probe(() => JSON.stringify({ a: null }));
probe(() => JSON.stringify({ a: {}, b: [] }));
probe(() => JSON.stringify({ "a b": 1 }));
