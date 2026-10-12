// xl:title `Object.freeze` 之后键与查询
// xl:round 331
// xl:judge stdout
// xl:end

const o = { a: 1, b: 2 };
Object.freeze(o);
console.log(Object.isFrozen(o), Object.keys(o).join(","));
const nested = { inner: { n: 1 } };
Object.freeze(nested);
nested.inner.n = 5;
console.log(nested.inner.n, Object.isFrozen(nested.inner));
