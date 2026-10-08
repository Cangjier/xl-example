// xl:title Array.from 把洞填成 undefined
// xl:round 692
// xl:judge stdout
// xl:end

const r = Array.from([1, , 3]);
console.log(r.join(","), 1 in r);
