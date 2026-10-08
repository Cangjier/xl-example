// xl:title 模板字面量：内插、嵌套、标签函数、`String.raw`
// xl:round 749
// xl:judge stdout
// xl:end
const name = "world";
console.log(`hello ${name}`);
console.log(`a${1 + 1}b${"c"}d`);
console.log(`nested ${[1, 2].map((v) => `<${v}>`).join("")}`);
console.log(`multi
line`);
function tag(strings: any, ...values: any[]) { return strings.raw.join("|") + "//" + values.join(","); }
console.log(tag`a${1}b${2}c`);
console.log(String.raw`a\nb`);
console.log(`${undefined}|${null}|${[1, 2]}|${{ a: 1 }}`);
