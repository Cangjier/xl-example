// xl:title this 形参与类型谓词：两个都只活在类型位
// xl:judge stdout
// xl:end

function isString(this: any, v: any): v is string { return typeof v === "string"; }
interface Box { n: number }
function hasN(v: any): v is Box { return typeof v.n === "number"; }
console.log(isString("a"), isString(1), hasN({ n: 1 }), hasN({}));
