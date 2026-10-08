// xl:title Symbol 的 description / toString / String()
// xl:judge stdout
// xl:end

const s = Symbol("desc");
console.log(s.description, s.toString(), String(s), typeof s);
console.log(Symbol().description);
