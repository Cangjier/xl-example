// xl:title Error 子类自己那一格的原型链（第 724 轮新登记的缺口）
// xl:round 724
// xl:judge stdout
// xl:want differ
// xl:why **内建错误构造自己那一格的原型链没接过**：`Object.getPrototypeOf(TypeError) === Error`
// xl:why 在 JS 里为真（`TypeError.__proto__` 就是 `Error`），本仓为假——`TypeError.prototype` 的
// xl:why 原型倒是接对了（`e instanceof Error` 一直为真），差的只是**构造那一侧**那一格。
// xl:why 同一批还量到 `Error.stack` 那一格（JS 里自有、`typeof` 是 `"string"`，本仓没有）——
// xl:why 与第 708 轮登记的那条同根，两条一起在这一条里看得见。
// xl:end
const e: any = new TypeError("x");
console.log(Object.getPrototypeOf(TypeError) === Error);
console.log(Object.getPrototypeOf(RangeError) === Error);
console.log(TypeError.prototype instanceof Error);
console.log(e instanceof TypeError, e instanceof Error);
console.log("stack" in e, typeof e.stack);
