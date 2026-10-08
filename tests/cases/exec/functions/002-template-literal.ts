// xl:title 模板字面量：插值、嵌套、多行、转义
// xl:judge stdout
// xl:end

const n = 2;
const s = "x";
console.log(`n=${n} s=${s} sum=${n + 1}`);
console.log(`nested ${[1, 2].map((v) => `<${v}>`).join("")}`);
console.log(`line1
line2`, `\${n}`.length);
