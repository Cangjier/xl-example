// xl:title 标签模板：strings 的 raw 与多段拼接
// xl:round 623
// xl:judge stdout
// xl:end

function tag(strings: TemplateStringsArray, ...vals: any[]) {
  return strings.join("|") + "#" + vals.join(",");
}
console.log(tag`a${1}b${2}c`);
console.log(tag`z`);
