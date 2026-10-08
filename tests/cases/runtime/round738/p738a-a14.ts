// xl:title `await` 后面跟逻辑链在条件与 `for await` 里
// xl:round 738
// xl:judge stdout
// xl:end
async function f(x: any) { return await x && "T"; }
async function g(x: any) { if (await x || false) return "Y"; return "N"; }
async function main() {
  console.log(await f(Promise.resolve(1)), await f(Promise.resolve(0)));
  console.log(await g(Promise.resolve(0)), await g(Promise.resolve(1)));
  const out: string[] = [];
  for await (const v of [1, 2] as any) out.push((v && "v" + v) as string);
  console.log(out.join(","));
}
main();
