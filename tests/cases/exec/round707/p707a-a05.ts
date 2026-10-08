// xl:title Array.isArray 五档
// xl:round 707
// xl:judge stdout
// xl:want blocked
// xl:why `Uint8Array` 这一族（TypedArray）整个没登记：降级层在名字解析那一步就报 `name is not a local or a capture: Uint8Array`（**整份文件进不来**）。本仓的值模型里没有 TypedArray 那一档，要做先得定「它是不是一个新的 ValueTag」。
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(Array.isArray([])) + "," + show(Array.isArray({ length: 0 })) + "," + show(Array.isArray("ab")) + "," + show(Array.isArray(new Uint8Array(1))));
