// xl:title Promise.finally：原值透传、finally 里抛则覆盖、finally 里 return 无效
// xl:judge stdout
// xl:end

const log: string[] = [];
const run = async () => {
  await Promise.resolve("v").finally(() => { log.push("fin"); }).then((v) => log.push("then:" + v));
  await Promise.reject(new Error("e")).finally(() => { log.push("fin2"); }).catch((e) => log.push("catch:" + (e as Error).message));
  await Promise.resolve("x").finally(() => "ignored").then((v) => log.push("kept:" + v));
  console.log(log.join("|"));
};
run();
