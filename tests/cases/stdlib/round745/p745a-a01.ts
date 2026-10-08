// xl:title `flat` 的深度实参：没给 / `undefined` / 数字四档
// xl:round 745
// xl:judge stdout
// xl:end
const a = [1, [2, [3]]];
console.log(JSON.stringify(a.flat()), JSON.stringify(a.flat(undefined)));
console.log(JSON.stringify(a.flat(0)), JSON.stringify(a.flat(1)));
console.log(JSON.stringify(a.flat(2)), JSON.stringify(a.flat(Infinity)));
console.log(JSON.stringify(a.flat(-1)), JSON.stringify(a.flat(1.9)));
