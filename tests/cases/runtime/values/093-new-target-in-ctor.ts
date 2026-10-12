// xl:title new.target：直接构造认得出、普通调用是 undefined
// xl:round 304
// xl:judge stdout
// xl:end

function F() { console.log("called", new.target === F); }
F();
new F();
class B { constructor() { console.log("name", new.target && new.target.name); } }
new B();
