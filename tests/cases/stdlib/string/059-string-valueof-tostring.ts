// xl:title valueOf / toString 在字符串包装上的取值
// xl:round 304
// xl:judge stdout
// xl:end

const s = "abc";
console.log(s.valueOf(), s.toString(), String.prototype.toString.call(s));
console.log(s.length, s[1], s.charAt(2));
