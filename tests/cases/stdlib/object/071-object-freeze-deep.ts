// xl:title `Object.freeze` 的浅层语义与查询
// xl:round 330
// xl:judge stdout
// xl:end

const inner = { n: 1 };
const outer = { inner, list: [1] };
Object.freeze(outer);
outer.inner.n = 2;
console.log(outer.inner.n, Object.isFrozen(outer), Object.isFrozen(outer.inner));
console.log(Object.keys(outer).join(","));
