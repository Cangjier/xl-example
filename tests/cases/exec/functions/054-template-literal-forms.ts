// xl:title 模板串：多行、嵌套、表达式、与类型无关
// xl:round 371
// xl:judge stdout
// xl:end
const name = "w";
const n = 3;
const t = `hello ${name} #${n} ${n > 2 ? "big" : "small"}`;
const multi = `line1
line2 ${1 + 1}`;
const nested = `a${((): string => `b${n}`)()}`;
console.log(t);
console.log(multi.split("\n").length, multi.split("\n")[1]);
console.log(nested, `${"x"}`.length, ``.length === 0);
