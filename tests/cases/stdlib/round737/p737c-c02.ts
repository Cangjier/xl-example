// xl:title `Array.isArray` 与 `Array.from` 的产物原型
// xl:round 737
// xl:judge stdout
// xl:end
const a = Array.from([1]);
console.log(Array.isArray(a), Object.getPrototypeOf(a) === Array.prototype);
const spread = [...[1]];
console.log(Array.isArray(spread), spread.length);
const mapped = [1].map((x) => x);
console.log(Array.isArray(mapped), Object.getPrototypeOf(mapped) === Array.prototype);
