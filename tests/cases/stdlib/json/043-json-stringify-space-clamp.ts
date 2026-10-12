// xl:title JSON.stringify 的 space 上限 10 与字符串 space
// xl:round 647
// xl:judge stdout
// xl:end

const o = { a: { b: [1, 2] } };
console.log(JSON.stringify(o, null, 20).split("\n")[1].length);
console.log(JSON.stringify(o, null, "abcdefghijklmn").split("\n")[1].length);
console.log(JSON.stringify(o, null, 0));
