// xl:title `Object.freeze` 是浅的（内层照改）
// xl:round 305
// xl:judge stdout
// xl:end

const o = Object.freeze({ inner: { n: 1 } });
o.inner.n = 2;
console.log(o.inner.n, Object.isFrozen(o), Object.isFrozen(o.inner));
