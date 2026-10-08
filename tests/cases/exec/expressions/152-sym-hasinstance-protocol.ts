// xl:title Symbol.hasInstance 走自定义判定
// xl:round 678
// xl:judge stdout
// xl:end

const even: any = {};
even[Symbol.hasInstance] = (v: any) => typeof v === "number" && v % 2 === 0;
console.log(typeof (even as any)[Symbol.hasInstance]);
try {
  console.log(2 instanceof even, 3 instanceof even);
} catch (e: any) {
  console.log("抛了");
}
