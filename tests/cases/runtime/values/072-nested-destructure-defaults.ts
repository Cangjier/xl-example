// xl:title 嵌套解构 + 默认值 + 数组洞
// xl:judge stdout
// xl:end

const cfg: any = { a: { b: [1, , 3] } };
const { a: { b: [x, y = 9, z] } } = cfg;
console.log(x, y, z);
const [, second = "s", ...rest] = ["first", undefined, "third", "fourth"];
console.log(second, rest.join(","));
