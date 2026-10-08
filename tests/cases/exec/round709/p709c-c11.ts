// xl:title 迭代一个不可迭代物的异常是 TypeError 吗
// xl:round 709
// xl:judge stdout
// xl:end
try { [...({ length: 1 } as any)]; console.log("no"); } catch (e: any) { console.log("isTypeError:" + (e instanceof TypeError)); }
