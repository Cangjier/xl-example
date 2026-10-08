// xl:title Error.prototype.toString 的拼法
// xl:round 304
// xl:judge stdout
// xl:end

console.log(String(new Error("boom")));
console.log(String(new TypeError("bad")));
const e = new Error("m");
e.name = "";
console.log(String(e));
const e2 = new Error("");
e2.name = "Custom";
console.log(String(e2));
