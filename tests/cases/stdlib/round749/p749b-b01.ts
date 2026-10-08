// xl:title `Array.prototype` 的 `splice` / `fill` / `copyWithin` 落点
// xl:round 749
// xl:judge stdout
// xl:end
const a = [1, 2, 3, 4, 5];
console.log(JSON.stringify(a.splice(1, 2)), JSON.stringify(a));
const b = [1, 2, 3];
console.log(JSON.stringify(b.splice(-1)), JSON.stringify(b));
const c = [1, 2, 3, 4];
console.log(JSON.stringify(c.splice(1, 0, "x", "y")), JSON.stringify(c));
console.log(JSON.stringify([1, 2, 3].fill(0, 1)), JSON.stringify([1, 2, 3, 4].copyWithin(0, 2)));
console.log(JSON.stringify([1, 2, 3].with(1, 9)), JSON.stringify([1, 2, 3]));
console.log(JSON.stringify([1, [2, [3]]].flat(1)), JSON.stringify([1, [2, [3]]].flat(2)));
