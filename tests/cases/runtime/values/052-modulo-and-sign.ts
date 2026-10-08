// xl:title 取模与除法的符号纪律：% 跟被除数、/ 给 ±Infinity
// xl:judge stdout
// xl:end

console.log(7 % 3, -7 % 3, 7 % -3, -7 % -3);
console.log(1 / 0, -1 / 0, 0 / 0, 1 / -0 === -Infinity);
console.log(5 % 0, 0 % 5, (-5) % 2);
