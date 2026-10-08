// xl:title Promise.all 的次序与非承诺项
// xl:round 304
// xl:judge stdout
// xl:end

Promise.all([Promise.resolve(3), 1, Promise.resolve(2)]).then((xs) => console.log(xs.join(",")));
Promise.all([]).then((xs) => console.log("empty", xs.length));
Promise.all([Promise.resolve(1), Promise.reject(new Error("no"))]).catch((e) => console.log("rejected", e.message));
