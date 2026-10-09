// xl:title JSON.stringify 的文本转义：引号 / 换行 / 控制字符
// xl:round 785
// xl:judge stdout
// xl:end
// **合并**（第 785 轮）：stdlib/json/probe693-j09 / j10 与 probe695-j28 / j29 ——
// 判定点只有一个：串里的引号、换行、控制字符该怎么转义。逐条原样搬进来。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};
probe(() => JSON.stringify("a\"b"));
probe(() => JSON.stringify("\n"));
probe(() => JSON.stringify({ a: "x\ny" }));
probe(() => JSON.stringify({ a: "\u0001" }));
