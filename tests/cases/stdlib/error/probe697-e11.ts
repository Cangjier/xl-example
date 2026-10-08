// xl:title typeof new Error("m").stack
// xl:round 697
// xl:judge stdout
// xl:want differ
// xl:why `new Error('m').stack` 在 Node 里是一个**字符串**（实现自定），本仓**没有这一格** ⇒ `undefined`。本仓的错误对象上没有 `stack`：它不是规范的一部分，而「照抄宿主栈文本」会把行号/路径写死。要收就得先定口径（本仓自己的帧信息从哪儿来），记在这里。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(typeof new Error("m").stack));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
