// xl:title Object.prototype.toString.call(/x/) 要给 [object RegExp]
// xl:round 704
// xl:judge stdout
// xl:end
// **这一格第 936 轮修好了**（`RegExp` 那一族进来、`protos.RegExp` 挂上
// `Symbol.toStringTag`），所以按规矩撤账：删 `xl:want` / `xl:why`，
// 文件名去掉 `-blocked` 尾巴，用例留着当守卫。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Object.prototype.toString.call(/x/)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
