// xl:title charCodeAt / codePointAt 在代理对上的两种答案
// xl:round 304
// xl:judge stdout
// xl:end

const s = "a😀b";
console.log(s.length, s.charCodeAt(0), s.charCodeAt(1), s.codePointAt(1), s.codePointAt(0));
console.log(s.charCodeAt(99), s.codePointAt(-1));
