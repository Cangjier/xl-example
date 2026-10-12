// xl:title 标签模板：字符串表与插值分开收
// xl:judge stdout
// xl:end

function tag(parts: TemplateStringsArray, ...values: any[]): string {
  return parts.join("|") + "::" + values.join(",");
}
console.log(tag`a${1}b${2}c`);
console.log(tag`plain`);
