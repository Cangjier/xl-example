// xl:title `Promise.withResolvers`
// xl:round 305
// xl:judge stdout
// xl:end

const { promise, resolve, reject } = Promise.withResolvers<number>();
promise.then((v) => console.log("got", v));
resolve(3);
console.log(typeof reject);
