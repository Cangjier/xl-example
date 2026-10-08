// xl:title String.replaceAll（纯字符串形态）：全替换、空串模式插空
// xl:judge stdout
// xl:end

console.log("a-b-c".replaceAll("-", "+"), "aaa".replaceAll("a", "b"), "abc".replaceAll("", "-"));
console.log("a.b.c".split(".").length, "a.b.c".split(".", 2).join("|"), "abc".split("", 0).length);
