// xl:title 文本：码点、代理对、规范化与大小写
// xl:round 338
// xl:judge stdout
// xl:end

const emoji = "a\u{1F600}b";
console.log(emoji.length, [...emoji].length, emoji.codePointAt(1));
console.log("e\u0301".normalize("NFC") === "\u00e9", "\u00e9".normalize("NFD").length);
console.log("ABC".toLowerCase(), "abc".toUpperCase(), "x".repeat(3));
console.log("  trim  ".trim(), "pad".padStart(5, "*"), "pad".padEnd(5, "-"));
console.log("a-b-c".split("-").join("+"), "abc".includes("b"), "abc".startsWith("a"), "abc".endsWith("c"));
console.log("hello".slice(1, 3), "hello".substring(3), "hello".charAt(0), "hello"[4]);
console.log("ab".isWellFormed(), "\uD800".isWellFormed(), "\uD800".toWellFormed().length);
console.log(String.fromCharCode(65, 66), String.fromCodePoint(0x1F600).length);
