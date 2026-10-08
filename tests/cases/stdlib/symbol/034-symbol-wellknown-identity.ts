// xl:title well-known Symbol 的同一性：iterator / asyncIterator 是同一格
// xl:judge stdout
// xl:end

console.log(Symbol.iterator === Symbol.iterator, typeof Symbol.asyncIterator, typeof Symbol.hasInstance);
console.log(Symbol.toPrimitive === Symbol["toPrimitive"], Symbol.match === Symbol.match);
