// xl:title 带标签的模板：strings、raw 与 rest 值
// xl:round 676
// xl:judge stdout
// xl:end

function tag(strings: TemplateStringsArray, ...values: any[]) {
  console.log(strings.length, values.length, JSON.stringify(strings.raw));
  return strings.join("|") + "::" + values.join(",");
}
const a = 1;
const b = "x";
console.log(tag`p${a}q${b}r`);
console.log(tag`no-substitution`);
console.log(tag`\n${a}`);
