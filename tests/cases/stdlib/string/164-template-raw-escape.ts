// xl:title 模板串里的转义与 `String.raw`
// xl:round 691
// xl:judge stdout
// xl:end
console.log("a\nb".length, String.raw`a\nb`.length);
console.log(`x${1 + 1}y`, `${"a"}${"b"}`);
console.log(String.raw`\u0041`);
