// xl:title trim / trimStart / trimEnd 与各种空白
// xl:judge stdout
// xl:end

const s = "  \t x y \n ";
console.log("[" + s.trim() + "]", "[" + s.trimStart() + "]", "[" + s.trimEnd() + "]");
console.log("".trim().length, "  ".trim().length);
