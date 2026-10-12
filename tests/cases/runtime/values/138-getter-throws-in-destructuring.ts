// xl:title 解构触发的 getter 抛错能被 catch 接住
// xl:round 305
// xl:judge stdout
// xl:end

const o: any = { get a() { throw new Error("boom"); } };
try {
  const { a } = o;
  console.log("no throw", a);
} catch (e) {
  console.log("caught", (e as Error).message);
}
