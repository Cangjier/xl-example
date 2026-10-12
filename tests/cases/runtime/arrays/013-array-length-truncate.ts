// xl:title 给 length 赋一个更小的值：尾巴真的没了
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 4, 5];
xs.length = 2;
console.log(xs.join(","), xs.length, xs[2]);
xs.length = 4;
console.log(xs.join("|"), xs.length);
