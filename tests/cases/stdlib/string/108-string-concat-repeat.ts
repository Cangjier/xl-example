// xl:title String.concat / repeat / padStart / padEnd / at
// xl:round 623
// xl:judge stdout
// xl:end

console.log("a".concat("b", "c"), "ab".repeat(3), "x".padStart(3, "0"), "x".padEnd(3, "-"));
console.log("abc".at(-1), "abc".at(0), "abc".at(5));
