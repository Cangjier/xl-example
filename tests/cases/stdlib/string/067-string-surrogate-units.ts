// xl:title 代理对的 `length` / `charCodeAt` / `codePointAt`
// xl:round 305
// xl:judge stdout
// xl:end

const s = "😀";
console.log(s.length, s.charCodeAt(0), s.codePointAt(0), s.charCodeAt(0).toString(16));
