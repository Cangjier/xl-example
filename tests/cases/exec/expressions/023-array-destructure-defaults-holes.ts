// xl:title 数组解构：跳位 / 默认值 / 剩余 / 嵌套
// xl:judge stdout
// xl:end

const xs = [1, , 3, 4, 5];
const [first, second = 20, , fourth, ...tail] = xs;
console.log(first, second, fourth, tail.join(","));
const [[a], [b, c = 0]] = [[1], [2]];
console.log(a, b, c);
