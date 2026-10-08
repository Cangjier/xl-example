// xl:title setPrototypeOf 换链之后读到的成员与 instanceof
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why `Object.setPrototypeOf` 换不动链：本仓当成普通的属性写（读回来的还是**旧原型**，`o.tag` 给 `base`、`getPrototypeOf(o)` 给 `null`）——`__proto__` 那一格也没装（见下一条），两处同一根：「对象内部那一格 [[Prototype]]」没有一条改它的路
// xl:end

function Base(): void {}
Base.prototype.tag = "base";
const o: any = {};
Object.setPrototypeOf(o, Base.prototype);
console.log(o.tag, o instanceof Base);
Object.setPrototypeOf(o, null);
console.log(o.tag, Object.getPrototypeOf(o));
