// xl:title 拒绝的四条路：执行器抛、then 抛、reject 调、throw 抛
// xl:round 331
// xl:judge stdout
// xl:end

function boomer(message: string): () => never {
  return () => {
    throw new Error(message);
  };
}
async function main(): Promise<void> {
  const a = await new Promise<string>((resolve, reject) => {
    reject(new Error("rejected"));
  }).catch((e) => "A:" + (e as Error).message);
  console.log(a);
  const b = await new Promise<string>(() => {
    throw new Error("executor");
  }).catch((e) => "B:" + (e as Error).message);
  console.log(b);
  const c = await Promise.resolve("seed")
    .then(boomer("then"))
    .catch((e) => "C:" + (e as Error).message);
  console.log(c);
  async function thrower(): Promise<string> {
    throw new Error("async");
  }
  const d = await thrower().catch((e) => "D:" + (e as Error).message);
  console.log(d);
  const e = await Promise.try(boomer("try")).catch((err) => "E:" + (err as Error).message);
  console.log(e);
}
main();
