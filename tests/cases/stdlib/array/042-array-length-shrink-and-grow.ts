// xl:title length 的写：截断、回填成洞、越界赋值
// xl:round 291
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 4];
xs.length = 2;
console.log(xs.join(","), xs.length);
xs.length = 4;
console.log(xs.length, xs[3], xs.join(","));
xs[9] = "x";
console.log(xs.length, xs.join(","));
