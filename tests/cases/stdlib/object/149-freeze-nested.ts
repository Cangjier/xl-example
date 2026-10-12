// xl:title `freeze` 是浅的（内层照写）
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { inner: { a: 1 } };
Object.freeze(o);
o.inner.a = 2;
console.log(o.inner.a, Object.isFrozen(o.inner));
