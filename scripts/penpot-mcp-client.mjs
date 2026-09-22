import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CallToolResultSchema, ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";

export async function connectPenpot({url="http://localhost:4401/mcp",timeoutMs=15000}={}) {
  const client=new Client({name:"duduq-penpot-bridge",version:"2.0.0"});
  const transport=new StreamableHTTPClientTransport(new URL(url));
  try { await Promise.race([client.connect(transport),new Promise((_,reject)=>setTimeout(()=>reject(Error("PENPOT_MCP_UNAVAILABLE")),timeoutMs))]); }
  catch(error){await client.close().catch(()=>{});throw Error(error.message.includes("fetch")?"PENPOT_MCP_UNAVAILABLE":error.message)}
  const tools=await client.request({method:"tools/list",params:{}},ListToolsResultSchema);
  const execute=tools.tools.find(t=>t.name==="execute_code" || t.name.endsWith("execute_code"));
  if(!execute){await client.close();throw Error("REQUIRED_MCP_TOOL_UNAVAILABLE")}
  const exportShape=tools.tools.find(t=>t.name==="export_shape");
  return {client,tools:tools.tools,executeName:execute.name,async execute(code){return client.request({method:"tools/call",params:{name:execute.name,arguments:{code}}},CallToolResultSchema)},async exportShape(arguments_){if(!exportShape)throw Error("REQUIRED_MCP_TOOL_UNAVAILABLE:export_shape");return client.request({method:"tools/call",params:{name:exportShape.name,arguments:arguments_}},CallToolResultSchema)},async close(){await client.close()}};
}
