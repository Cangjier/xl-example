// xl:title 成员位与下标位上的复合赋值
// xl:round 305
// xl:judge stdout
// xl:end

const o = { n: 10, xs: [1, 2] };
o.n += 5;
o.n *= 2;
o.xs[0] += 9;
console.log(o.n, o.xs.join(","));
