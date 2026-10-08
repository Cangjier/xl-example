// xl:title 标签模板的 `raw` 与熟串各是各的
// xl:round 333
// xl:judge stdout
// xl:end

function tag(parts: any, ...rest: any[]): string {
  const raw = parts.raw;
  return raw.join("|") + "#" + parts.join("|") + "#" + rest.length;
}
console.log(tag`c\td`);
console.log(tag`a\nb${1}c`);
console.log(tag`x${1}y${2}z`);
console.log(String.raw`p\tq`.length, `p\tq`.length);
