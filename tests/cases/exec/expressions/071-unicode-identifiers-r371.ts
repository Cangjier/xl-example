// xl:title Unicode 标识符与字符串里的转义
// xl:round 371
// xl:judge stdout
// xl:end
const \u0061bc = 1;
const café = 2;
const 日本語 = 3;
const $d = 4;
const _e = 5;
console.log(abc, café, 日本語, $d, _e);
console.log("\u0041\x42\u{43}", "a\tb".length, "\0".length);
