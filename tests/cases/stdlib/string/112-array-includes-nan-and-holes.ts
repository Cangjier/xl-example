// xl:title includes 的 SameValueZero 与稀疏槽
// xl:round 647
// xl:judge stdout
// xl:end

const xs = [1, , NaN, undefined];
console.log(xs.length, xs.includes(NaN), xs.includes(undefined), xs.indexOf(NaN), xs.indexOf(undefined));
console.log(xs.includes(1, 1), xs.includes(1, -4));
