// xl:title `void` / `delete` 打在**字面量**上
// xl:round 740
// xl:judge stdout
// xl:end
console.log(void 0, void "s", void [1, 2], void { a: 1 });
const o: any = { a: 1 };
console.log(delete o.a, delete (o.b as any), Object.keys(o).length);
