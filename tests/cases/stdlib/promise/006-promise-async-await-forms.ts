// xl:title async 箭头函数 / 方法 / await 链
// xl:judge stdout
// xl:end

const f = async (n: number) => { const v = await Promise.resolve(n); return v * 2; };
f(3).then((v: number) => console.log("arrow", v));
class Api { async load(): Promise<string> { return await Promise.resolve("data"); } }
new Api().load().then((v: string) => console.log("method", v));
