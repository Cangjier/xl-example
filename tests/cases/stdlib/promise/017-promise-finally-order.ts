// xl:title finally 的返回值不改结论、次序在中间
// xl:round 304
// xl:judge stdout
// xl:end

Promise.resolve(1)
  .finally(() => console.log("f1"))
  .then((v) => { console.log("then", v); return v + 1; })
  .finally(() => console.log("f2"))
  .then((v) => console.log("last", v));
