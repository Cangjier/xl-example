// xl:title allSettled / any / race 的形状
// xl:round 371
// xl:judge stdout
// xl:end
Promise.allSettled([Promise.resolve(1), Promise.reject(new Error("e"))]).then((rs) => {
  console.log(rs.map((r) => r.status + ":" + (r.status === "fulfilled" ? r.value : r.reason.message)).join("|"));
});
Promise.any([Promise.reject(new Error("a")), Promise.resolve("ok")]).then((v) => console.log("any", v));
Promise.any([Promise.reject(new Error("a")), Promise.reject(new Error("b"))])
  .catch((e: any) => console.log("agg", e.constructor.name, e.errors.length));
Promise.race([Promise.resolve("fast"), new Promise(() => {})]).then((v) => console.log("race", v));
