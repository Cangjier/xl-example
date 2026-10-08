// xl:title every / some 的短路与空数组
// xl:judge stdout
// xl:end

const xs = [2, 4, 6];
console.log(xs.every((v) => v % 2 === 0), xs.some((v) => v > 5), xs.some((v) => v > 99));
console.log([].every(() => false), [].some(() => true));
let calls = 0;
[1, 2, 3].every((v) => { calls++; return v < 2; });
console.log("calls", calls);
