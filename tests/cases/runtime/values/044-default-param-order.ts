// xl:title 默认参数：从左到右求值、能看见前面的实参
// xl:judge stdout
// xl:end

function f(a: number, b = a * 2, c = b + 1) { return [a, b, c].join(","); }
console.log(f(1), f(1, 5), f(1, 5, 9), f(3, undefined, 0));
