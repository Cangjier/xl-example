// xl:title Promise.resolve / then 的链路
// xl:judge stdout
// xl:end

Promise.resolve("v").then((v: any) => console.log("got", v));
Promise.resolve().then(() => console.log("empty-resolve"));
console.log("sync");
