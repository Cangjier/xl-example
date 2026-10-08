// xl:title Promise：finally 不改变值、也不吞掉拒绝
// xl:judge stdout
// xl:end

Promise.resolve("v").finally(() => console.log("cleanup-1")).then((v: any) => console.log("got", v));
Promise.reject("bad").finally(() => console.log("cleanup-2")).catch((e: any) => console.log("caught", e));
