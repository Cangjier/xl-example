// xl:title valueOf / Number() / 原始值包装对象的身份
// xl:judge stdout
// xl:end

const n = 5;
console.log(n.valueOf(), n.toString(), Number(n), typeof n.valueOf());
console.log(Number(true), Number(false), Number(null), Number(undefined), Number(""));
console.log(Number([]), Number([7]), Number([1, 2]));
