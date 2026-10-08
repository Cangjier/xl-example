// xl:title getOwnPropertyDescriptor 数字键
// xl:round 706
// xl:judge stdout
// xl:want differ
// xl:why getOwnPropertyDescriptor 的**数字键**没走 ToPropertyKey：这一支的闸门只收字符串 / 符号，数字键一路走到最后那趟自有属性查找 ⇒ 给 undefined（JS 给一个描述符）。同一个函数在 Object.hasOwn / hasOwnProperty 两处第 691 轮就收数字键了，只有 defineProperty 的反面这一格漏着。
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = { 1: "v" }; console.log(show(Object.getOwnPropertyDescriptor(o, 1) !== undefined));
