// xl:title 模板标签：strings 的 raw 与 cooked、插值位置对得上
// xl:round 7
// xl:judge stdout
// xl:end

function tag(strings: TemplateStringsArray, ...vals: any[]): string {
  return strings.raw.join("|") + "#" + vals.join(",") + "#" + strings.length;
}
console.log(tag`a${1}b${2}c`);
console.log(tag`x\ny`);
console.log(tag`only`);
