// xl:title 模板串：嵌套、多行、转义、标签函数
// xl:round 9
// xl:judge stdout
// xl:end

const who = "world";
const inner = `[${1 + 1}]`;
console.log(`hello ${who} ${inner} ${"x".repeat(2)}`);
function tag(parts: TemplateStringsArray, ...vals: any[]) {
  return parts.length + ":" + vals.join(",");
}
console.log(tag`a${1}b${2}c`);
console.log(`line1
line2`);
