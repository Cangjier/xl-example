// xl:title e18
// xl:round 705
// xl:judge stdout
// xl:want differ
// xl:why `console.log(new Error("boom"))` 的栈没有渲染：本仓只给 `Error: boom` 一行，`node` 还打调用帧。与 `stdlib/error/001-console-log-error-stack` / `probe697-e11` **同一条根**：`stack` 不是规范的一部分，要收就得先定「本仓的帧信息从哪儿来」。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
console.log(new Error("boom"));
