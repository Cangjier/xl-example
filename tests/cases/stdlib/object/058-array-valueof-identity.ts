// xl:title 数组的 `valueOf` 给的就是它自己
// xl:round 305
// xl:judge stdout
// xl:end

const xs = [1];
console.log(xs.valueOf() === xs, typeof xs.valueOf(), Array.isArray(xs.valueOf()));
