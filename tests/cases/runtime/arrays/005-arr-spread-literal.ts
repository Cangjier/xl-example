// xl:title 数组字面量里的展开（含字符串展开）
// xl:judge stdout
// xl:end

const a = [1, 2];
const b = [0, ...a, 3, ..."xy"];
console.log(b.join(","), [...a].length, [..."abc"].join("|"));
