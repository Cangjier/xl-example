// xl:title 符号的文本形态
// xl:round 692
// xl:judge stdout
// xl:end

const s = Symbol("x");
console.log(s.toString(), String(s), typeof s, s.description);
