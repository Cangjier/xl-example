// xl:title indexOf / lastIndexOf / includes 的起始下标与负数
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 2, 1];
console.log(xs.indexOf(2), xs.indexOf(2, 2), xs.indexOf(2, -2), xs.indexOf(9));
console.log(xs.lastIndexOf(2), xs.lastIndexOf(1, 2), xs.lastIndexOf(9));
console.log(xs.includes(2, 4), xs.includes(1, 4));
