// xl:title 全局函数：isNaN / isFinite / Boolean / String / Number
// xl:judge stdout
// xl:end

console.log(isNaN("x"), Number.isNaN("x"), isFinite("3"), Number.isFinite("3"));
console.log(Boolean(""), Boolean("a"), String(null), Number(""), Number(" 7 "));
