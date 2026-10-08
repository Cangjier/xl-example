// xl:title `try` 当属性名：字面量键、成员读、成员写
// xl:round 331
// xl:judge stdout
// xl:end

const o = { try: 1, catch: 2, class: 3 };
console.log(o.try, o.catch, o.class);
const box: any = {};
box.try = 5;
console.log(box.try, box["try"]);
console.log(typeof Promise.try);
