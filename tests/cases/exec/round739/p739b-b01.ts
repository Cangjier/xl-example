// xl:title 降级层：`await` 与算术的层级
// xl:round 739
// xl:judge stdout
// xl:end
async function f(): Promise<number> { return await Promise.resolve(1) + 1; }
f().then((v) => console.log(v));
