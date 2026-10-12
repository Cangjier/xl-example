// xl:title 方法取出后 this 丢失 + bind / call / apply
// xl:round 623
// xl:judge stdout
// xl:end

class C {
  v = 5;
  m(this: any) { return this.v; }
}
const c = new C();
console.log(c.m(), c.m.call({ v: 9 }), c.m.apply({ v: 8 }, []));
const bound = c.m.bind({ v: 7 });
console.log(bound(), bound.call({ v: 1 }));
