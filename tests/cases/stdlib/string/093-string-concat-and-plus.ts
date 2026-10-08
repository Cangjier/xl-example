// xl:title String.prototype.concat 与 `+` 的结果一致
// xl:round 371
// xl:judge stdout
// xl:end
const s = "a";
console.log(s.concat("b", 1, true, null, undefined));
console.log(s + "b" + 1 + true + null + undefined);
console.log([...s.concat("bc")].join("|"));
