// xl:title String.substring / substr / slice 的取值规则
// xl:round 676
// xl:judge stdout
// xl:end

const s = "abcdef";
console.log(s.substring(1, 3), s.substring(3, 1), s.substring(-2, 2));
console.log(s.substr(1, 3), s.substr(-2));
console.log(s.slice(1, 3), s.slice(-2), s.slice(3, 1));
