// xl:title 点名：String 的 replaceAll / replace（字符串模式）与 split / substring 全家
// xl:judge stdout
// xl:end

const s = "a-b-c";
console.log(s.replaceAll("-", "+"), s.replace("-", "+"), "aaa".replaceAll("a", "b"));
console.log(s.split("-").join("|"), "a,b,,c".split(",").length, "abc".split("").join("."));
console.log(s.split("-", 2).join("|"), "abc".split("", 2).join("|"));
console.log(s.substring(1, 3), s.slice(-2), s.slice(1, -1), s.slice(3, 1), s.substring(3, 1), s.at(-1));
console.log("  pad  ".trim(), "  pad  ".trimStart().length, "  pad  ".trimEnd().length);
console.log("  \t x \n ".trim().length, "a\u00a0".trim().length);
console.log("ab".padStart(4, "0"), "ab".padEnd(4, "0"), "ab".padStart(1), "ab".padEnd(4, "xy"));
console.log("AB".toLowerCase(), "ab".toUpperCase(), "ß".toUpperCase(), "İ".toLowerCase().length);
console.log(String.fromCharCode(97, 98), String.fromCodePoint(0x1f600).length, "😀".length, [..."😀"].length);
console.log("a😀b".codePointAt(1), "a😀b".charCodeAt(1), "abc".codePointAt(9));
console.log("b" > "a", "abc".localeCompare("abd"), "a".repeat(3), "a".repeat(0).length, "abc".concat("d"));
