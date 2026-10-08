// xl:title slice / substring / substr 三种负下标口径
// xl:round 371
// xl:judge stdout
// xl:end
const s = "abcdef";
console.log(s.slice(-3), s.slice(1, -1), s.slice(-2, -1), s.slice(4, 2));
console.log(s.substring(4, 2), s.substring(-2, 3), s.substring(2));
console.log(s.substr(-2), s.substr(1, 3), s.substr(-10, 3));
