// xl:title `slice` / `splice` 的负下标与返回值
// xl:round 330
// xl:judge stdout
// xl:end

const xs = [0, 1, 2, 3, 4];
console.log(xs.slice(-2).join(","), xs.slice(1, -1).join(","), xs.slice(3, 1).join(","));
const removed = xs.splice(-2, 1, 99);
console.log(removed.join(","), xs.join(","), xs.length);
