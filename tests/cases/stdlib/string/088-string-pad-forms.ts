// xl:title padStart / padEnd：目标长度小于原长、填充串多字符
// xl:round 371
// xl:judge stdout
// xl:end
console.log("5".padStart(3, "0"), "5".padEnd(3, "0"));
console.log("abc".padStart(2, "0"), "abc".padEnd(2, "0"));
console.log("5".padStart(6, "ab"), "5".padEnd(6, "ab"));
console.log("x".padStart(4), JSON.stringify("x".padStart(4)));
console.log("x".padStart(4, ""), "x".padEnd(4, ""));
