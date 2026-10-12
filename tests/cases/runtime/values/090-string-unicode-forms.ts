// xl:title 代理对在长度、展开、码点上的三种读法
// xl:round 291
// xl:judge stdout
// xl:end

const s = "a😀b";
console.log(s.length, [...s].length, s.charCodeAt(1) > 255, s.codePointAt(1) > 65535);
