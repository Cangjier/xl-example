// xl:title 字符串转义与模板里的转义：`\u` / `\x` / 续行 / 码点
// xl:round 768
// xl:judge stdout
// xl:note 四组一起钉：转义字符的**长度**（`\t` 是一格、`\u0041` 是一格、`\u{1F600}` 是**两格**码元）、
// xl:note `\x41` 与 `\0`、**行尾反斜杠续行**（`"a\<换行>b"` 的长度是 2 —— 续行本身不占格）、
// xl:note 以及模板里同一批转义（处理过的 `strings[i]` 与原文 `raw` 只差这一层）。
// xl:note `[...码点字符]` 的长度是 1（迭代按码点、`.length` 按码元——两种视角，都是对的）。
// xl:end
console.log("01", "a\tb".length, "a\nb".length, "\\".length, "\"".length);
console.log("02", "\u0041", "\u{1F600}".length, "\x41", "\0".length);
console.log("03", "line1\
line2".length);
console.log("04", `\u0041${1}\n`.length, `a\tb`.length);
console.log("05", "\u{1F600}".codePointAt(0), [..."\u{1F600}"].length);
console.log("06", JSON.stringify("\u2028\u2029\u0000").length > 0);
