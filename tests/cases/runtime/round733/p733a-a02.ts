// xl:title 带可调用载荷的对象那一档：`Function.prototype` 四格自己的 `name`
// xl:round 733
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f: any) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Function.prototype.call.name) + " " + t(() => Function.prototype.call.length));
console.log(t(() => Function.prototype.apply.name) + " " + t(() => Function.prototype.apply.length));
console.log(t(() => Function.prototype.bind.name) + " " + t(() => Function.prototype.bind.length));
console.log(t(() => Function.prototype.toString.name) + " " + t(() => Function.prototype.toString.length));
