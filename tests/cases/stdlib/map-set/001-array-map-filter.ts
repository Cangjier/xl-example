// xl:title Array.map / filter：返回新数组、回调拿 (值, 下标, 数组)
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 4];
console.log(xs.map((v) => v * 2).join(","));
console.log(xs.filter((v) => v % 2 === 0).join(","));
console.log(xs.map((v, i, all) => v + ":" + i + "/" + all.length).join(" "));
console.log([].map((v: any) => v).length, xs.join(","));
