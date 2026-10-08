// xl:title 同名符号不相等
// xl:round 692
// xl:judge stdout
// xl:end

console.log(Symbol("a") === Symbol("a"), Symbol.for("b") === Symbol.for("b"));
