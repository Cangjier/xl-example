// xl:title 方法里的箭头回调捕获 `this`
// xl:round 305
// xl:judge stdout
// xl:end

const obj = {
  v: 10,
  run(): number[] { return [1, 2].map((n) => n + this.v); },
};
console.log(obj.run().join(","));
