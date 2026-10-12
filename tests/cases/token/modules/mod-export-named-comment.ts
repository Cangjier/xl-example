// xl:note re-export with a line comment inside the clause
// xl:expect Export
export {
  a, // the default entry
  b as c,
} from "m";
