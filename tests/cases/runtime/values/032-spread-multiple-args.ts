// xl:title 一次调用里展开两处，外加普通实参
// xl:judge stdout
// xl:end

function f(...xs: any[]): string { return xs.join("|"); }
const a = [1, 2];
const b = [3, 4];
console.log(f(...a, 9, ...b));
console.log(f(0, ...a, ...b, 5));
console.log(Math.max(...a, ...b, 100));
console.log([...a, ...b, 7].join(","));
