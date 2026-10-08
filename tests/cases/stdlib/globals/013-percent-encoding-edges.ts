// xl:title 百分号编解码的边界：代理对 · 保留字符 · 非 ASCII 空白
// xl:round 311
// xl:judge stdout
// xl:end

console.log(encodeURIComponent("😀"), decodeURIComponent("%F0%9F%98%80"));
console.log(decodeURI("%2F"), decodeURIComponent("%2F"));
console.log(encodeURI("http://x/y z"), encodeURIComponent("\u00a0|\u3000"));
console.log(JSON.stringify("\u00a0x\u00a0".trim()), JSON.stringify("\u3000y".trim()), JSON.stringify("\ufeffz".trim()));
