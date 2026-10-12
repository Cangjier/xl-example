// xl:title `String.raw` 与标签模板的 `raw` 那一栏
// xl:judge stdout
// xl:end

function tag(parts: any): string { return parts.raw[0] + "|" + parts[0]; }
console.log(String.raw`a\nb`.length, "a\nb".length);
console.log(tag`c\td`);
console.log(String.raw`x${1}y`);
