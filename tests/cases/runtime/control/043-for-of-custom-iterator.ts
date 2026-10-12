// xl:title for-of 走自定义 Symbol.iterator，break 触发 return()
// xl:round 676
// xl:judge stdout
// xl:end

const custom: any = {};
custom[Symbol.iterator] = function () {
  let i = 0;
  return {
    next() {
      i += 1;
      if (i <= 3) return { value: i * 10, done: false };
      return { value: undefined, done: true };
    },
    return() {
      console.log("closed");
      return { value: undefined, done: true };
    },
  };
};
for (const v of custom) {
  console.log(v);
  if (v === 20) break;
}
