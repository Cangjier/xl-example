// xl:title `Symbol.toStringTag` 顶掉默认标签
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = {};
console.log(Object.prototype.toString.call(o));
o[Symbol.toStringTag] = "Custom";
console.log(Object.prototype.toString.call(o));
const arr: any = [];
console.log(Object.prototype.toString.call(arr));
