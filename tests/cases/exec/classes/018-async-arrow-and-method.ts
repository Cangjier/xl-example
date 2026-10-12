// xl:title async 的三条形状：箭头 / 方法 / 类方法，各自 await
// xl:judge stdout
// xl:end

const arrow = async (n: number) => (await Promise.resolve(n)) + 1;
const obj = { async m(n: number) { return (await Promise.resolve(n)) * 2; } };
class C { async run(n: number) { return (await Promise.resolve(n)) - 1; } }
async function main() {
  console.log(await arrow(1), await obj.m(2), await new C().run(3));
}
main();
