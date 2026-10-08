// xl:title slice / substring / substr 三种切法
// xl:round 291
// xl:judge stdout
// xl:end

const s = "abcdef";
console.log(s.slice(1, 3), s.slice(-2), s.slice(3, 1));
console.log(s.substring(3, 1), s.substring(-2));
console.log(s.substr(1, 2), s.substr(-2));
