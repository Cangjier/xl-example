// xl:title then 回调返回承诺：结果跟着内层走
// xl:round 7
// xl:judge stdout
// xl:end

const chain = Promise.resolve(1)
  .then((v) => Promise.resolve(v + 1))
  .then((v) => ({ v }))
  .then((o) => o.v * 10)
  .then((v) => { if (v !== 20) throw new Error("bad " + v); return "ok"; });
chain.then((v) => console.log(v), (e) => console.log("err", String(e)));
Promise.all([Promise.resolve("x"), 1, "y"]).then((all) => console.log(all.join("|")));
