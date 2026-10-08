// xl:title Promise.all：非承诺项、空数组、一项拒绝
// xl:round 371
// xl:judge stdout
// xl:end
Promise.all([1, Promise.resolve(2), "3"]).then((vs) => console.log("all", vs.join(",")));
Promise.all([]).then((vs) => console.log("empty", vs.length));
Promise.all([Promise.resolve(1), Promise.reject(new Error("boom")), Promise.resolve(3)])
  .then(() => console.log("never"))
  .catch((e) => console.log("catch", e.message));
Promise.all([Promise.reject(new Error("first")), Promise.reject(new Error("second"))])
  .catch((e) => console.log("which", e.message));
console.log("sync");
