// xl:title Promise.any 空表与全拒绝的顺序
// xl:round 647
// xl:judge stdout
// xl:end

Promise.any([])
  .then(() => console.log("resolved"))
  .catch((e) => console.log(e.name, e.errors.length, e instanceof AggregateError));
Promise.any([Promise.reject("x"), Promise.resolve("y")]).then((v) => console.log("any", v));
