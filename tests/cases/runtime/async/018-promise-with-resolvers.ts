// xl:title Promise.withResolvers
// xl:round 651
// xl:judge stdout
// xl:end

const { promise, resolve, reject } = (Promise as any).withResolvers();
promise.then((v: any) => console.log("resolved", v));
resolve(5);
console.log(typeof resolve, typeof reject);
