// xl:title 数组的洞：length 算、读出来是 undefined、join 留空
// xl:judge stdout
// xl:end

const xs = [1, , 3];
console.log(xs.length, xs[1], xs.join("-"), Object.keys(xs).length);
const ys = new Array(3);
console.log(ys.length, ys.join(","), ys[0]);
