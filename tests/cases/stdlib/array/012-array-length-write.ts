// xl:title 给 length 赋值：截断 / 补洞
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 4];
xs.length = 2;
console.log(xs.join(","), xs.length);
xs.length = 4;
console.log(xs.join(","), xs.length, xs[3]);
