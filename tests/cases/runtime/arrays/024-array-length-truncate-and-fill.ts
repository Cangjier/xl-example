// xl:title 改 length 截断与留洞；洞的遍历行为
// xl:round 323
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 4];
xs.length = 2;
console.log(xs.join(","), xs.length, xs[3]);
xs.length = 4;
console.log(xs.join(","), Object.keys(xs).join(","), xs.includes(undefined));
