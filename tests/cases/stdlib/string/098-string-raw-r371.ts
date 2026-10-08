// xl:title String.raw 与标签模板的 raw 那一栏
// xl:round 371
// xl:judge stdout
// xl:end
console.log(String.raw`a\nb`);
function tag(parts: TemplateStringsArray, ...vals: unknown[]) {
  console.log(parts.raw[0] === "x\\ny", parts.length, vals.join(","));
  return parts.join("|");
}
console.log(tag`x\ny${1}z${2}`);
