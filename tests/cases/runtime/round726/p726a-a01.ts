// xl:title `await` 后面跟对象字面量（第 726 轮收掉的根）
// xl:round 726
// xl:judge stdout
// xl:end
async function asStatement() { await { v: 1 }; return "statement"; }
asStatement().then((x: string) => console.log(x));
(async () => { const o: any = await { v: 2 }; console.log("init", o.v); })();
const arrow = async () => await { v: 3 };
arrow().then((o: any) => console.log("arrow", o.v));
async function returned() { return await { v: 4 }; }
returned().then((o: any) => console.log("return", o.v));
async function nested() { return (await { v: 5 }).v; }
nested().then((v: number) => console.log("nested", v));
