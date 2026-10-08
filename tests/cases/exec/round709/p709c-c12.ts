// xl:title for..of 一个不可迭代物的异常是 TypeError 吗
// xl:round 709
// xl:judge stdout
// xl:end
try { for (const x of ({ length: 1 } as any)) { console.log(x); } console.log("no"); } catch (e: any) { console.log("isTypeError:" + (e instanceof TypeError)); }
