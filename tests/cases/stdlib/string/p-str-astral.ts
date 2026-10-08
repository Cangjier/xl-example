// xl:title 星面字符按 UTF-16 计数
// xl:round 692
// xl:judge stdout
// xl:end

const e = String.fromCodePoint(0x1f600);
console.log(e.length, e.codePointAt(0), Array.from(e).length);
