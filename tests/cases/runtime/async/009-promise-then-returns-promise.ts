// xl:title then 里返回一个承诺：会被展开
// xl:round 304
// xl:judge stdout
// xl:end

Promise.resolve(1)
  .then((v) => Promise.resolve(v + 1))
  .then((v) => { console.log("value", v); return v * 10; })
  .then((v) => console.log("chained", v));
console.log("sync-first");
