// xl:title finally：值透传、异常替换、返回承诺要等
// xl:round 371
// xl:judge stdout
// xl:end
Promise.resolve(1).finally(() => console.log("fin1")).then((v) => console.log("v", v));
Promise.reject(new Error("orig")).finally(() => console.log("fin2")).catch((e) => console.log("c", e.message));
Promise.reject(new Error("orig3"))
  .finally(() => { throw new Error("replaced"); })
  .catch((e) => console.log("c3", e.message));
Promise.resolve(4).finally(() => Promise.resolve(9)).then((v) => console.log("wait", v));
