// xl:title `Object.prototype.toLocaleString` 已经装上（普通对象这一档）
// xl:round 689
// xl:judge stdout
// xl:end

// 规范里 `Object.prototype.toLocaleString` 只有一句：`Invoke(this, "toString")`——
// 本仓没有区域设置，所以普通对象这一档与 `Object.prototype.toString` 给同一个串
console.log(Object.prototype.toLocaleString !== undefined, ({}).toLocaleString());
console.log({ a: 1 }.toLocaleString());

// 它挂成**不可枚举**（与 toString 那一族同款）：`Object.keys` 必须还是空的
console.log(Object.keys({}).length, Object.keys(Object.prototype).length);
