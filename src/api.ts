export type User={id:string;handle:string;role:'user'|'admin'};
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
 const response=await fetch('/api'+path,{...options,headers:{'Content-Type':'application/json',...options.headers}});
 if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('서버 연결을 확인해주세요.');
 const body=await response.json();
 if(!response.ok)throw new Error(body.error??'요청을 처리하지 못했습니다.');
 return body as T;
}
