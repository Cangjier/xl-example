// xl:title Promise.withResolvers：一对结清回调与承诺
// xl:round 323
// xl:judge stdout
// xl:end

const { promise, resolve, reject } = Promise.withResolvers();
promise.then((v) => console.log("resolved", v));
resolve(7);
const p2 = Promise.withResolvers();
p2.promise.catch((e) => console.log("rejected", e));
p2.reject("no");
console.log(typeof resolve, typeof reject);
