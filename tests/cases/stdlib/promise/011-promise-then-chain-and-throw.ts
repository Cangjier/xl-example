// xl:title 承诺链：值传递与抛出的接住
// xl:round 291
// xl:judge stdout
// xl:end

Promise.resolve(1).then((v) => v + 1).then((v) => console.log("v", v));
Promise.resolve().then(() => { throw new Error("boom"); }).catch((e) => console.log("caught", e.message));
console.log("sync");
