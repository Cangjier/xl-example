// xl:title trim / trimStart / trimEnd
// xl:round 291
// xl:judge stdout
// xl:end

console.log("  x  ".trim(), "|" + "  x  ".trimStart() + "|", "|" + "  x  ".trimEnd() + "|");
console.log("\t\n x \t".trim(), "".trim().length);
console.log(JSON.stringify("  a b  ".trim()), JSON.stringify("  a  ".trimStart()), JSON.stringify("  a  ".trimEnd()));
