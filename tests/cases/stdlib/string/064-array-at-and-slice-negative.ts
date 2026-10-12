// xl:title at / slice 的负下标组合
// xl:round 304
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 4, 5];
console.log(xs.at(-1), xs.at(0), xs.at(9), xs.at(-9));
console.log(xs.slice(-3, -1).join(","), xs.slice(2, 1).join(",") + "|");
