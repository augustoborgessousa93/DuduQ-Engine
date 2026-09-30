import { connectPenpot } from "./penpot-mcp-client.mjs";
import path from "node:path";
const mcp = await connectPenpot();
try {
  const exported = await mcp.exportShape({shapeId:"3de5f4a9-acdb-80c7-8008-b5b77802941a",format:"png",mode:"fill",filePath:path.resolve("core/assets/intro/icon-disciplina.png")});
  console.log(JSON.stringify(exported.content));
} finally { await mcp.close(); }
