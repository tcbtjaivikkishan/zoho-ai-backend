 import { embedAndStore } from "./embedAndStore.js";
import { data } from "./data";
import { flattenChunks } from "./chunker.js";


const chunks = flattenChunks(data);

// console.log("Total chunks:", chunks.length);

embedAndStore(chunks);





