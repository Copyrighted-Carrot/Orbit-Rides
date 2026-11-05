import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// A real two-client race. It leaves one cancelled synthetic rental with its audit history.
const {project,key,accounts}=JSON.parse(readFileSync(0,'utf8').replace(/^\uFEFF/,''));
assert.equal(project,'eqxajqvaatjcbtxhwksv');
assert.ok(accounts.length===3 && accounts.every(a=>a.email.endsWith('@orbit-demo.example.invalid')));
const base='https://'+project+'.supabase.co';
const tokens=new Map();
async function http(actor,path,method='GET',data) {
 const headers={apikey:key,'Content-Type':'application/json'};
 if(tokens.has(actor))headers.Authorization='Bearer '+tokens.get(actor);
 const res=await fetch(base+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data),redirect:'error',signal:AbortSignal.timeout(20000)});
 const raw=await res.text();
 return {ok:res.ok,status:res.status,value:raw?JSON.parse(raw):null};
}
function ok(result,label){assert.ok(result.ok,label+' HTTP '+result.status+' '+(result.value?.code??''));return result.value;}
const rpc=(who,name,args)=>http(who,'/rest/v1/rpc/'+name,'POST',args);
const read=(who,query)=>http(who,'/rest/v1/'+query).then(r=>ok(r,query.split('?')[0]));
const [a,b]=accounts.filter(u=>u.role==='customer'),staff=accounts.find(u=>u.role==='admin');
const after=days=>new Date(Date.now()+days*86400000).toISOString();
try {
 for (const account of accounts){
   const s=ok(await http(null,'/auth/v1/token?grant_type=password','POST',{email:account.email,password:account.password}),'Sign in');
   assert.equal(s.user.id,account.id);tokens.set(account,s.access_token);
 }
 const [vehicle]=await read(a,'vehicles?select=id,daily_rate_minor&fleet_code=eq.DEMO-11');
 assert.ok(vehicle);
 const start=after(42),end=new Date(Date.parse(start)+25*3600000).toISOString();
 const interval={p_starts_at:start,p_ends_at:end};
 const args={p_vehicle_id:vehicle.id,...interval,p_request_id:randomUUID()};
 assert.equal((await rpc(a,'create_quote',{...args,p_price:1})).ok,false);
 assert.equal((await rpc(a,'create_quote',{...args,p_ends_at:start})).ok,false);
 assert.equal((await rpc(a,'create_quote',{...args,p_vehicle_id:randomUUID()})).ok,false);
 assert.equal((await http(a,'/rest/v1/vehicles?id=eq.'+vehicle.id,'PATCH',{daily_rate_minor:1})).ok,false);
 const qa=ok(await rpc(a,'create_quote',args),'Quote A');
 assert.equal(ok(await rpc(a,'create_quote',args),'Quote retry'),qa);
 assert.equal((await rpc(a,'create_quote',{...args,p_ends_at:after(45)})).ok,false);
 const qb=ok(await rpc(b,'create_quote',{...args,p_request_id:randomUUID()}),'Quote B');
 assert.equal((await rpc(b,'start_checkout',{p_quote_id:qa})).status,403);
 const [quote]=await read(a,'quotes?id=eq.'+qa);
 assert.equal(quote.billable_days,2);assert.equal(quote.total_minor,2*vehicle.daily_rate_minor);
 const attempts=await Promise.all([rpc(a,'start_checkout',{p_quote_id:qa}),rpc(b,'start_checkout',{p_quote_id:qb})]);
 assert.equal(attempts.filter(x=>x.ok).length,1,'Exactly one competing hold');
 assert.equal(attempts.find(x=>!x.ok).value.code,'23P01');
 const i=attempts.findIndex(x=>x.ok),owner=[a,b][i],other=[b,a][i],booking=attempts[i].value;
 assert.equal(ok(await rpc(owner,'start_checkout',{p_quote_id:[qa,qb][i]}),'Checkout retry'),booking);
 const open=async span=>ok(await rpc(null,'available_vehicles',span),'Availability').some(v=>v.vehicle_id===vehicle.id);
 assert.equal(await open(interval),false);assert.equal(await open({p_starts_at:after(1),p_ends_at:after(2)}),true);
 const [session]=await read(owner,'payment_sessions?booking_id=eq.'+booking);
 assert.equal(session.state,'pending');assert.equal(session.amount_minor,quote.total_minor);
 assert.equal((await read(other,'payment_sessions?id=eq.'+session.id)).length,0);
 assert.equal((await rpc(other,'approve_demo_payment',{p_session_id:session.id})).status,403);
 assert.equal((await rpc(owner,'approve_demo_payment',{p_session_id:randomUUID()})).ok,false);
 assert.equal((await http(owner,'/rest/v1/payment_sessions?id=eq.'+session.id,'PATCH',{state:'succeeded'})).ok,false);
 const sid={p_session_id:session.id};
 assert.equal(ok(await rpc(owner,'finalize_booking',sid),'Before approval'),null);
 assert.equal((await read(owner,'payment_sessions?id=eq.'+session.id))[0].state,'pending');
 const approvals=await Promise.all([rpc(owner,'approve_demo_payment',sid),rpc(owner,'approve_demo_payment',sid)]);
 assert.ok(approvals.every(r=>r.ok&&r.value==='succeeded'));
 const finals=await Promise.all([rpc(owner,'finalize_booking',sid),rpc(owner,'finalize_booking',sid)]);
 assert.ok(finals.every(r=>r.ok&&r.value===booking));
 const history=await read(owner,'bookings?id=eq.'+booking);
 assert.equal(history.length,1);assert.equal(history[0].state,'confirmed');assert.ok(history[0].reference);
 assert.equal((await read(staff,'bookings?id=eq.'+booking))[0].reference,history[0].reference);
 assert.equal((await read(other,'bookings?id=eq.'+booking)).length,0);
 const events=await read(owner,'booking_events?select=id,event_type&booking_id=eq.'+booking+'&order=id');
 assert.deepEqual(events.map(e=>e.event_type),['hold_created','payment_pending','payment_succeeded','confirmed']);
 assert.deepEqual(await read(staff,'booking_events?select=id,event_type&booking_id=eq.'+booking+'&order=id'),events);
 const notice='notifications?event_id=eq.'+events.at(-1).id;
 assert.equal((await read(owner,notice)).length,1);assert.equal((await read(other,notice)).length,0);
 ok(await rpc(owner,'mark_notification_read',{p_event_id:events.at(-1).id}),'Mark notification read');
 assert.ok((await read(owner,notice))[0].read_at);
 const req=ok(await rpc(owner,'request_cancellation',{p_booking_id:booking,p_reason:'End of synthetic concurrency check',p_request_id:randomUUID()}),'Request cancellation');
 assert.equal(await open(interval),false);
 const decision={p_request_id:req,p_accept:true,p_reason:'Synthetic rehearsal complete'};
 assert.equal((await rpc(owner,'decide_cancellation',decision)).status,403);
 ok(await rpc(staff,'decide_cancellation',decision),'Staff accepts cancellation');
 assert.equal((await read(owner,'bookings?id=eq.'+booking))[0].state,'cancelled');
 assert.equal(await open(interval),true);
 console.log('PASS simultaneous competing holds, trusted price, interval eligibility, demo approval/finalization retries, durable owner/admin projections, notifications and accepted cancellation');
} finally {
 for(const actor of tokens.keys())await http(actor,'/auth/v1/logout?scope=local','POST');
}

