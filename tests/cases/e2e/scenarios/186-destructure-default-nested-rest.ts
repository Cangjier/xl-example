// xl:title 端到端：嵌套解构 + 默认值 + 剩余 + 交换 + 函数参数解构
// xl:round 639
// xl:judge stdout
// xl:end

const payload = { user: { name: "kim", tags: ["a", "b", "c"] }, n: 3 };
const { user: { name, tags: [first, ...restTags] }, n = 0 } = payload;
console.log(name, first, restTags.join(""), n);
function draw({ w = 1, h = w * 2, label = `x${w}` } = {}) {
  return `${label}:${w}x${h}`;
}
console.log(draw(), draw({ w: 3 }), draw({ w: 2, h: 5, label: "z" }));
let p = 1;
let q = 2;
[p, q] = [q, p];
console.log(p, q);
const [[a, b = 9], [, c = 8]] = [[1], [7]];
console.log(a, b, c);
