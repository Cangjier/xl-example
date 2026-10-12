// xl:title String() / Number() / Boolean() 三个全局转换
// xl:judge stdout
// xl:end

console.log(String(1), String(null), String(undefined), String([1, 2]), String({}));
console.log(Number("12"), Number(""), Number(" "), Number(true));
console.log(Boolean(0), Boolean(""), Boolean(null), Boolean([]), Boolean({}));
