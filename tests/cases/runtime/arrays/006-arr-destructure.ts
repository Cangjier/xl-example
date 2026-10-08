// xl:title 数组解构：默认值、跳过、剩余、嵌套
// xl:judge stdout
// xl:end

const [a, , c = 9, ...rest] = [1, 2, undefined, 4, 5];
console.log(a, c, rest.join(","));
const [[x], [y]] = [[1], [2]];
console.log(x, y);
const [p = "d"] = [];
console.log(p);
