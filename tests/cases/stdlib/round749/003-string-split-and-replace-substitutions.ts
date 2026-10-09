// xl:title `String.prototype` 的切分与 `replace` 的替换串
// xl:round 749
// xl:judge stdout
// xl:end
console.log(JSON.stringify("a-b-c".split("-", 2)), JSON.stringify("abc".split("", 2)));
console.log(JSON.stringify("a1b2c".split("1")));
console.log("abc".replace("b", "$&$&"), "abc".replace("b", "[$&]"), "abc".replace("b", "x$'"));
console.log("aaa".replaceAll("a", "b"), "abc".replace("z", "y"));
console.log("x".concat("y", "z"), "abc".charAt(1), "abc".charCodeAt(1), "abc".codePointAt(1));
console.log(String.fromCharCode(97, 98), String.fromCodePoint(0x1f600).length);
