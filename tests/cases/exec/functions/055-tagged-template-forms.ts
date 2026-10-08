// xl:title 标签模板：cooked / raw / 前后缀、返回值参与运算
// xl:round 371
// xl:judge stdout
// xl:end
function tag(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.length + ":" + values.length + ":" + strings.join("|") + ":" + strings.raw.join("|");
}
console.log(tag`a${1}b${2}c`);
console.log(tag`no-sub`);
console.log(tag`x\ny`.indexOf("\\n") >= 0);
function upper(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((acc, s, i) => acc + s.toUpperCase() + (i < values.length ? String(values[i]) : ""), "");
}
console.log(upper`a${1}b`.length, upper`${"z"}`);
