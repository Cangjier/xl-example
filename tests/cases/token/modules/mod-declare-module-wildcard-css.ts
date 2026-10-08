// xl:note wildcard module declaration for CSS files
// xl:expect Let
declare module "*.css" {
  const c: string;
  export default c;
}
