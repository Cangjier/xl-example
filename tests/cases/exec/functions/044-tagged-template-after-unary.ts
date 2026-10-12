// xl:title 标签模板出现在一元运算符的操作数位（`typeof t`z``）
// xl:round 321
// xl:judge stdout
// xl:end

const t = (s: any, ...v: any[]) => s[0] + v.join("");
console.log(typeof t`z`);
console.log(!t``);
