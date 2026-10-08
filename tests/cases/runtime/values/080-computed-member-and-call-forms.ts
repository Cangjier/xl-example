// xl:title 计算成员：读、写、调、delete 四条路
// xl:judge stdout
// xl:end

const key = "k";
const o: any = { [key]: () => 1 };
console.log(o[key](), o["k"]());
o[key] = () => 2;
console.log(o.k());
delete o[key];
console.log(o.k, "k" in o);
