// xl:title typeof new Error("m").stack
// xl:round 704
// xl:judge stdout
// xl:want differ
// xl:why `new Error("m").stack` 在 Node 里是一个**字符串**（实现自定），本仓没有这一格 ⇒ `undefined`。与 `stdlib/error/probe697-e11` / `001-console-log-error-stack` **同一条根**：`stack` 不是规范的一部分，要收就得先定「本仓的帧信息从哪儿来」。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(typeof new Error("m").stack));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
