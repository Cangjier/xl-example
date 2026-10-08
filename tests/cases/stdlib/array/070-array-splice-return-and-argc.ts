// xl:title splice 的返回值与实参个数口径
// xl:round 371
// xl:judge stdout
// xl:end
const a = [1, 2, 3, 4];
console.log(JSON.stringify(a.splice(1, 2)), JSON.stringify(a));
const b = [1, 2, 3];
console.log(JSON.stringify(b.splice(1)), JSON.stringify(b));
const c = [1, 2, 3];
console.log(JSON.stringify(c.splice(-1)), JSON.stringify(c));
const d = [1, 2, 3];
console.log(JSON.stringify(d.splice()), JSON.stringify(d));
