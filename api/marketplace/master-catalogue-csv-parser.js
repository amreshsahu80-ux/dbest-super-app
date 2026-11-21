'use strict';
// Strict RFC4180-style CSV parser for Owner catalogue dry runs.
// No dependencies, no file writes, no formula evaluation.
function parseCsv(input,{maxRows=1000,maxBytes=2000000}={}){
 if(typeof input!=='string'||Buffer.byteLength(input,'utf8')>maxBytes)throw Error('invalid_csv_size');
 const source=input.replace(/^\uFEFF/,'');
 const records=[];let record=[],field='',quoted=false,closed=false;
 for(let i=0;i<source.length;i++){
  const ch=source[i];
  if(quoted){
   if(ch==='"'&&source[i+1]==='"'){field+='"';i++}
   else if(ch==='"'){quoted=false;closed=true}
   else field+=ch;
  }else if(ch==='"'&&!field&&!closed){quoted=true}
  else if(ch===','){record.push(field);field='';closed=false}
  else if(ch==='\n'||ch==='\r'){
   if(ch==='\r'&&source[i+1]==='\n')i++;
   record.push(field);field='';closed=false;
   if(record.some(v=>v!==''))records.push(record);
   record=[];
   if(records.length>maxRows+1)throw Error('csv_row_limit');
  }else{
   if(closed||ch==='"')throw Error('malformed_csv_quote');
   field+=ch;
  }
 }
 if(quoted)throw Error('unterminated_csv_quote');
 if(field!==''||record.length){record.push(field);if(record.some(v=>v!==''))records.push(record)}
 if(records.length<2)throw Error('csv_requires_header_and_rows');
 if(records.length>maxRows+1)throw Error('csv_row_limit');
 const headers=records.shift().map(h=>h.trim());
 if(headers.some(h=>!h)||new Set(headers).size!==headers.length)throw Error('invalid_csv_headers');
 return records.map((cells,index)=>{
  if(cells.length!==headers.length)throw Error('csv_column_count_row_'+(index+2));
  return Object.fromEntries(headers.map((h,i)=>[h,cells[i].trim()]));
 });
}
module.exports={parseCsv};
