// PUBLIC DEMO ONLY: not authentication, no accounts or server secrets.
export async function verify(code){return {kind:code.trim().toUpperCase()==='DEMO'?'ok':'denied'};}
