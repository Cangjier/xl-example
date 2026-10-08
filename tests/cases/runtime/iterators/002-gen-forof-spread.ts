// xl:title 生成器进 `for..of`、展开、解构、Array.from
// xl:judge stdout
// xl:end

function* nums(): any { yield 1; yield 2; yield 3; }
console.log([...nums()].join(","));
let s = 0;
for (const v of nums()) s += v;
console.log(s);
const [a, b] = nums();
console.log(a, b, Array.from(nums()).length);
