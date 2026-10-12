// xl:title 递归的 `yield*`：把嵌套数组压平
// xl:round 305
// xl:judge stdout
// xl:end

function* flat(xs: any[]): Generator<number> {
  for (const x of xs) {
    if (Array.isArray(x)) yield* flat(x);
    else yield x;
  }
}
console.log([...flat([1, [2, [3, 4]], 5])].join(","));
