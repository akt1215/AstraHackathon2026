// Gate content application on a valid response; never expose raw HTML/proxy errors.
export async function generationResponse(response){
 const status=response.status;
 let data;
 try{data=await response.json()}catch{
  if(status===404||status===405)throw new Error(`AI endpoint is unavailable (HTTP ${status}). Start the AI backend with npm start in production or npm run dev locally.`);
  if(status===504||status===408)throw new Error(`AI request timed out (HTTP ${status}). Please retry.`);
  throw new Error(`AI server returned an empty or invalid response${status?` (HTTP ${status})`:''}. Check that the AI backend is running, then retry.`);
 }
 if(!response.ok)throw new Error(typeof data?.error==='string'?data.error:`AI request failed${status?` (HTTP ${status})`:''}. Please retry.`);
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('AI server returned an invalid response. Please retry.');
 return data;
}
