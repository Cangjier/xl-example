// xl:title 非空断言在三种位置上的取值
// xl:round 330
// xl:judge stdout
// xl:end

const data: { items?: { id: number }[] } = { items: [{ id: 7 }] };
console.log(data.items![0]!.id);
const maybe: string | null = "hi";
console.log(maybe!.length);
