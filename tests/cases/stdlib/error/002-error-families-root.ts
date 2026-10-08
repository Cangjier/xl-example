// xl:title Error / TypeError / RangeError 与 name / message
// xl:judge stdout
// xl:end

console.log(new Error("e").name, new Error("e").message);
console.log(new TypeError("t").name, new RangeError("r").name);
console.log(Error("no-new").message, TypeError("t2").name);
