// xl:title Error.prototype.toString 的形态
// xl:judge stdout
// xl:end

console.log(String(new Error("msg")));
console.log(String(new TypeError("bad")));
console.log("" + new Error("m"));
