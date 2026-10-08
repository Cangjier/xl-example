// xl:title Promise：resolve → then → then，值是逐级传的
// xl:judge stdout
// xl:end

Promise.resolve(1)
  .then((v: number) => v + 1)
  .then((v: number) => { console.log("chained", v); return v * 10; })
  .then((v: number) => console.log("last", v));
console.log("sync-first");
