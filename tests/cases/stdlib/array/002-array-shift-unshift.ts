// xl:title Array.shift / unshift
// xl:judge stdout
// xl:end

const xs = [2, 3];
console.log(xs.shift(), xs.join(","));
console.log(xs.unshift(0, 1), xs.join(","));
console.log([].shift());
