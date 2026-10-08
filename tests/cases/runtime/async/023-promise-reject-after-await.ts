// xl:title `await` 之后才被拒绝：三条路一起走
// xl:round 331
// xl:judge stdout
// xl:end

async function f(n: number): Promise<number> {
  await null;
  if (n === 2) throw new Error("boom");
  return n;
}
async function run(): Promise<void> {
  for (const n of [1, 2, 3]) {
    const got = await f(n).then((v) => "ok" + v).catch((e) => "err" + (e as Error).message);
    console.log(got);
  }
  const caught = await (async () => {
    try {
      await f(2);
      return "no-throw";
    } catch (e) {
      return "caught:" + (e as Error).message;
    }
  })();
  console.log(caught);
}
run();
