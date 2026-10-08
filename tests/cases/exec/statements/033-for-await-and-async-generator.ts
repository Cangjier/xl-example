// xl:title for await 与异步生成器的类型标注
// xl:round 371
// xl:judge stdout
// xl:end
async function* source(): AsyncGenerator<number> {
  yield 1;
  yield 2;
}
async function main(): Promise<void> {
  const out: number[] = [];
  for await (const v of source()) out.push(v);
  for await (const v of [Promise.resolve("a"), "b"] as any) out.push(String(v).length);
  console.log(out.join(","));
}
main();
