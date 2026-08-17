const LIMITS = Object.freeze({archiveBytes:1024*1024*1024,directoryBytes:16*1024*1024,entries:4096,conversationFiles:64,entryBytes:50*1024*1024,totalBytes:350*1024*1024,compressionRatio:100,maxMs:45000});
const safeName = name => name.split('/').pop().replace(/[^\w.-]/g,'_');
const timedOut = started => Date.now()-started>LIMITS.maxMs;

export async function unzipEntries(file){
  const started=Date.now();
  if(!file || file.size>LIMITS.archiveBytes) throw Error('This ZIP exceeds the 1 GB local safety limit.');
  const decoder=new TextDecoder(),tailStart=Math.max(0,file.size-65557),tail=new Uint8Array(await file.slice(tailStart).arrayBuffer()),tailView=new DataView(tail.buffer);
  let end=-1; for(let index=tail.byteLength-22;index>=0;index--) if(tailView.getUint32(index,true)===0x06054b50){end=index;break;}
  if(end<0) throw Error('This does not appear to be a standard ZIP archive.');
  const count=tailView.getUint16(end+10,true),directorySize=tailView.getUint32(end+12,true),directoryOffset=tailView.getUint32(end+16,true);
  if(count>LIMITS.entries) throw Error('ZIP has too many entries for safe local processing.');
  if(directorySize>LIMITS.directoryBytes||directoryOffset+directorySize>file.size) throw Error('ZIP directory is invalid or too large.');
  const directory=new Uint8Array(await file.slice(directoryOffset,directoryOffset+directorySize).arrayBuffer()),view=new DataView(directory.buffer);
  let pointer=0,uncompressedTotal=0,matched=0; const output=[];
  for(let index=0;index<count;index++){
    if(timedOut(started)) throw Error('Local ZIP processing exceeded the 45 second safety limit.');
    if(pointer+46>directory.byteLength||view.getUint32(pointer,true)!==0x02014b50) throw Error('Invalid ZIP directory.');
    const method=view.getUint16(pointer+10,true),compressed=view.getUint32(pointer+20,true),uncompressed=view.getUint32(pointer+24,true),nameLength=view.getUint16(pointer+28,true),extraLength=view.getUint16(pointer+30,true),commentLength=view.getUint16(pointer+32,true),localOffset=view.getUint32(pointer+42,true),name=decoder.decode(directory.slice(pointer+46,pointer+46+nameLength));
    pointer+=46+nameLength+extraLength+commentLength;
    if(name.includes('..')||name.startsWith('/')||name.includes('\\')) throw Error('ZIP contains an unsafe path.');
    if(!/^conversations(?:-[\w]+)?\.json$/i.test(safeName(name))) continue;
    if(++matched>LIMITS.conversationFiles) throw Error('Too many conversation JSON files in this ZIP.');
    if(uncompressed>LIMITS.entryBytes||uncompressedTotal+uncompressed>LIMITS.totalBytes) throw Error('Conversation JSON exceeds the local safety limit.');
    if(compressed===0?uncompressed>0:uncompressed/compressed>LIMITS.compressionRatio) throw Error('Conversation JSON has an unsafe compression ratio.');
    uncompressedTotal+=uncompressed;
    const header=new Uint8Array(await file.slice(localOffset,localOffset+30).arrayBuffer()),headerView=new DataView(header.buffer);
    if(header.byteLength<30||headerView.getUint32(0,true)!==0x04034b50) throw Error('Invalid ZIP entry.');
    const start=localOffset+30+headerView.getUint16(26,true)+headerView.getUint16(28,true);
    if(start+compressed>file.size) throw Error('ZIP entry is truncated.');
    const raw=new Uint8Array(await file.slice(start,start+compressed).arrayBuffer()); let bytes;
    if(method===0) bytes=raw;
    else if(method===8){if(!globalThis.DecompressionStream) throw Error('Your browser does not support local ZIP decompression.'); bytes=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());}
    else throw Error(`Conversation JSON uses unsupported ZIP compression method ${method}.`);
    if(bytes.byteLength!==uncompressed) throw Error('ZIP entry size did not match its directory record.');
    try { const parsed=JSON.parse(decoder.decode(bytes)); if(!Array.isArray(parsed)&&!(parsed&&typeof parsed==='object')) throw Error(); output.push(parsed); } catch { throw Error(`Could not read ${safeName(name)} as JSON.`); }
  }
  if(!matched) throw Error('No conversations.json or conversations-*.json file was found. Use the full ChatGPT data export, not a single conversation download.');
  return output;
}
