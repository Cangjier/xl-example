// xl:title String.trim 家族：各类空白字符与只有空白的串
// xl:judge stdout
// xl:end

console.log(JSON.stringify("  \t\n a b \r\n ".trim()), JSON.stringify("  ".trim()));
console.log(JSON.stringify("\u00a0x\u00a0".trim()), JSON.stringify("\ufeffx".trim()));
console.log(JSON.stringify(" a ".trimStart()), JSON.stringify(" a ".trimEnd()));
