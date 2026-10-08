// xl:title 模板串：内插、转义、行继续与原文
// xl:round 338
// xl:judge stdout
// xl:end

const name = "world";
const n = 42;
console.log(`hello ${name}, n=${n}`);
console.log(`tab:\tend`, `tab:\tend`.length);
console.log(`multi
line`, `multi
line`.split("\n").length);
console.log(`esc \${notInterp}`, `a\\b`);
function tag(parts: any, ...rest: any[]): string {
  return parts.raw.join("|") + "#" + rest.length;
}
console.log(tag`x\ty${1}z`);
console.log(`${1 + 1}${"a"}${true}`);
