// xl:title Promise.then：onFulfilled 里抛 ⇒ 下一环走 catch；返回 Promise 会展开
// xl:judge stdout
// xl:end

const log: string[] = [];
const run = async () => {
  await Promise.resolve(1).then((v) => { throw new Error("t" + v); }).catch((e) => log.push("c:" + (e as Error).message));
  await Promise.resolve(1).then(() => Promise.resolve("inner")).then((v) => log.push("flat:" + v));
  await Promise.resolve(1).then(() => { throw "str"; }).catch((e) => log.push("str:" + typeof e));
  console.log(log.join("|"));
};
run();
