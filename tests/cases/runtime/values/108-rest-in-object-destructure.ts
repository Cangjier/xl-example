// xl:title 对象解构里的剩余
// xl:round 304
// xl:judge stdout
// xl:end

const o = { a: 1, b: 2, c: 3 };
const { a, ...rest } = o;
console.log(a, JSON.stringify(rest), Object.keys(rest).join(","));
const { b: renamed, ...rest2 } = o;
console.log(renamed, JSON.stringify(rest2));
