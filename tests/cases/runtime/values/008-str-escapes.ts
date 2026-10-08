// xl:title 转义：引号、换行、制表、反斜杠
// xl:judge stdout
// xl:end

console.log("a\tb", "x\ny", "q\"q", 'p\'p', "b\\s");
console.log("".length, " ".length, "\u0000".length);
