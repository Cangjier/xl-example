// xl:title for..of 一个数字抛什么
// xl:round 709
// xl:judge stdout
// xl:end
try { for (const x of (42 as any)) { console.log(x); } } catch (e: any) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
