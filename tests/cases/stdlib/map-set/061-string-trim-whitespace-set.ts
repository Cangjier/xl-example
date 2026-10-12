// xl:title trim 家族：非 ASCII 空白与零宽字符
// xl:round 371
// xl:judge stdout
// xl:end
const s = "\u00a0\u2028\t x \n\u3000";
console.log(JSON.stringify(s.trim()), JSON.stringify(s.trimStart()), JSON.stringify(s.trimEnd()));
console.log(JSON.stringify("\u200b x".trim()));
console.log("\uFEFFx".trim().length);
