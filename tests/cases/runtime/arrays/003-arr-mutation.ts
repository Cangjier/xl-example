// xl:title 数组原地改：push / pop / shift / unshift / splice
// xl:judge stdout
// xl:end

const xs = [1, 2, 3];
console.log(xs.push(4), xs.join(","), xs.pop(), xs.join(","));
console.log(xs.shift(), xs.join(","), xs.unshift(0), xs.join(","));
const ys = [1, 2, 3, 4, 5];
console.log(ys.splice(1, 2).join(","), ys.join(","));
