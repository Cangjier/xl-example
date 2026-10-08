// xl:title `JSON.parse` 出来的嵌套结构再走一遍方法
// xl:round 305
// xl:judge stdout
// xl:end

const v = JSON.parse('{"xs":[3,1,2],"name":"n"}');
console.log(v.xs.sort().join(","), v.name.toUpperCase(), Array.isArray(v.xs));
