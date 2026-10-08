// xl:title 带剩余元素的元组类型 + 解构
// xl:round 305
// xl:judge stdout
// xl:end

type T = [string, ...number[]];
const t: T = ["a", 1, 2];
const [head, ...tail] = t;
console.log(head, tail.join(","), t.length);
