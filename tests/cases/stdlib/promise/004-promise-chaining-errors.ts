// xl:title 链上的错误：抛出来的会被下一段 catch 接住
// xl:judge stdout
// xl:end

Promise.resolve(1)
  .then((v: number) => { throw new Error("mid"); })
  .then((v: number) => console.log("skipped", v))
  .catch((e: any) => console.log("caught", e.message));
