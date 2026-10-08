// xl:title `then` 回调返回一个 Promise 时会被展开
// xl:round 691
// xl:judge stdout
// xl:end
Promise.resolve(1)
  .then((v: number) => Promise.resolve(v * 10))
  .then((v: number) => console.log("flat", v));
const nested: any = { then(resolve: any) { resolve(Promise.resolve("inner")); } };
Promise.resolve(nested).then((v: any) => console.log("unwrap", v));
