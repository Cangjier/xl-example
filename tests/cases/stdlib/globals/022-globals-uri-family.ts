// xl:title encodeURI / decodeURI / encodeURIComponent 的差别
// xl:round 371
// xl:judge stdout
// xl:end
const s = "a b/c?d=e&f+g";
console.log(encodeURI(s));
console.log(encodeURIComponent(s));
console.log(decodeURI(encodeURI(s)) === s, decodeURIComponent(encodeURIComponent(s)) === s);
console.log(encodeURIComponent("\u00e9\u4e2d"));
try { decodeURIComponent("%"); } catch (e) { console.log((e as Error).name); }
