// xl:title then 回调的返回值 / 抛错两条路
// xl:judge stdout
// xl:end

Promise.resolve(1)
  .then((v) => { console.log("got", v); return v + 1; })
  .then((v) => { console.log("next", v); throw new Error("mid"); })
  .catch((e) => console.log("caught", e.message))
  .then(() => console.log("after"));
