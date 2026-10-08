// xl:title `toWellFormed`：落单代理换成 U+FFFD、其余原样
// xl:round 330
// xl:judge stdout
// xl:end

const fixed = "a\uD800b".toWellFormed();
console.log(fixed.length, fixed.charCodeAt(1).toString(16));
console.log("\uD83D\uDE00".toWellFormed() === "\uD83D\uDE00");
console.log("ok".toWellFormed());
