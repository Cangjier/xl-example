// xl:title Promise：reject → catch 接住 → 之后回到兑现那条路
// xl:judge stdout
// xl:end

Promise.reject(new Error("nope"))
  .catch((e: any) => "recovered:" + e.message)
  .then((v: any) => console.log(v));
Promise.resolve("ok").then((v: any) => console.log("fine", v));
