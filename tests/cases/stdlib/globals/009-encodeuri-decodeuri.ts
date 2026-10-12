// xl:title encodeURI / decodeURI / encodeURIComponent
// xl:round 304
// xl:judge stdout
// xl:end

const s = "a b&c=d?e";
console.log(encodeURI(s));
console.log(encodeURIComponent(s));
console.log(decodeURI(encodeURI(s)), decodeURIComponent(encodeURIComponent("中文 & 符号")));
