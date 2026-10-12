// xl:title 一元：`!` `-` `+` `~` `void`
// xl:judge stdout
// xl:end

console.log(!0, !"", !null, -"3", +"3", +true, ~0, ~5);
console.log(void 0, void "x", -(-3), +("2.5"));
