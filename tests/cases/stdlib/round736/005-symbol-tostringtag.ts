// xl:title `Symbol.toStringTag` 改变 `Object.prototype.toString`
// xl:round 736
// xl:judge stdout
// xl:end
const o: any = { [Symbol.toStringTag]: "Custom" };
console.log(Object.prototype.toString.call(o));
class K { get [Symbol.toStringTag]() { return "KTag"; } }
console.log(Object.prototype.toString.call(new K()), String(new K()));
const m: any = new Map();
console.log(Object.prototype.toString.call(m));
