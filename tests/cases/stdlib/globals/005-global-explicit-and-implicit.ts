// xl:title 全局函数与隐式转换：Boolean / Number / String / Array / Object
// xl:judge stdout
// xl:end

console.log(Boolean(0), Boolean(""), Boolean([]), Boolean({}), Boolean(NaN));
console.log(Number(true), Number(null), Number(undefined) !== Number(undefined), Number(" 12 "));
console.log(String(1), String(null), String(undefined), String([1, 2]));
console.log(Array(3).length, Array(1, 2).length, Object(1).valueOf());
