// xl:title 标签模板的 cooked 与 raw（含换行与转义）
// xl:round 8
// xl:judge stdout
// xl:end

function tag(strings, ...values) {
  console.log(JSON.stringify(strings.raw), JSON.stringify(strings), values);
  return strings.length;
}
console.log(tag`a\nb${1}c\td`);
