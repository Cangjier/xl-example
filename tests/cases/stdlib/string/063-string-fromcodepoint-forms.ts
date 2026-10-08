// xl:title String.fromCodePoint / fromCharCode 在代理对上的差别
// xl:round 304
// xl:judge stdout
// xl:end

console.log(String.fromCodePoint(0x1f600).length, String.fromCharCode(0x1f600).length);
console.log(String.fromCodePoint(65, 66), String.fromCharCode(65, 66));
console.log(String.fromCharCode(0xd83d, 0xde00).length);
