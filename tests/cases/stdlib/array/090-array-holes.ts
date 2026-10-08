// xl:title 稀疏数组：length / join / map / forEach 的跳空
// xl:round 623
// xl:judge stdout
// xl:end

const a = [1, , 3];
console.log(a.length, a.join(","), a.map((x) => x).length, a.filter(() => true).length);
let seen = 0;
a.forEach(() => seen++);
console.log(seen, JSON.stringify(a), Object.keys(a).join(","));
