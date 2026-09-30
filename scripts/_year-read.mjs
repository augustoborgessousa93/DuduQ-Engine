import { connectPenpot } from "./penpot-mcp-client.mjs";
const mcp = await connectPenpot();
try {
  const result = await mcp.execute(`const s=penpotUtils.findShapeById("3de5f4a9-acdb-80c7-8008-b5b778029415");return {markup:penpot.generateMarkup([s],{type:"svg"}),style:penpot.generateStyle([s],{type:"css",includeChildren:true})};`);
  console.log(JSON.stringify(result.content));
} finally { await mcp.close(); }
