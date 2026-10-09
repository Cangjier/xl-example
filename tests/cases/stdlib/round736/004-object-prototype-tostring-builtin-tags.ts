// xl:title `Object.prototype.toString` 的内建标签
// xl:round 736
// xl:judge stdout
// xl:end
const show = (v: any) => Object.prototype.toString.call(v);
console.log(show([]), show({}), show(function () {}));
console.log(show(new Date(0)), show(new Error("x")), show(new Map()), show(new Set()));
console.log(show(null), show(undefined), show(1), show("s"), show(true));
console.log(show([].values ? [] : []), show(new WeakMap()));
