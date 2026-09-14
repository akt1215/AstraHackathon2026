// Reusable interaction content adapted from Austin-Senna/astra-hackathon f4d392c
// and Akito's deterministic world rules. Coordinates use Tilth's existing canvas.
export function worldItems(){
 const item=(id,name,x,y,props={},room=null,description=name)=>({id,name,kind:'item',icon:id,description,location:{kind:'ground',room,x,y},props:{portable:true,size:1,...props}});
 const chest=(id,name,x,y,room)=>({...item(id,name,x,y,{portable:false,container:true,open:false},room,'Open the chest to see its contents.'),kind:'fixture'});
 const entities=[
  item('medicine','Restorative herbs',502,350,{heal:35,owner:'rowan',price:4},null,'Rowan’s herbs cost 4 coins. Restore up to 35 HP, or 25 fatigue when already healthy.'),
  item('ration','Travel ration',455,350,{food:35,owner:'rowan',price:2},null,'Rowan’s ration costs 2 coins and restores 35 fatigue when eaten.'),
  item('stone','Smooth stone',410,365,{noise:160},null,'A portable stone. Throwing it makes noise and can injure a target.'),
  item('crowbar','Iron crowbar',340,320,{lever:true,noise:100},null,'A lever for a closed, weakened fixture. Prying costs 20 fatigue and breaks its latch.'),
  chest('supply-chest','Supply chest',470,365,null),
  item('supply-note','Supply ledger',470,365,{clue:'Rowan owns the herbs and ration. Return them or settle their price. Clover needs rest and restorative supplies; Rowan values practical care.'}),
  chest('inn-chest','Inn chest',267,370,'inn'),
  item('inn-note','Innkeeper’s note',267,370,{clue:'Help Clover recover, then ask Rowan for his support. He only judges obligations he witnessed or was told about.'},'inn'),
  item('inn-ration','Guest ration',267,370,{food:30},'inn','A guest ration. Free to take; restores 30 fatigue.'),
  {...item('shutter','Service shutter',530,325,{portable:false,open:false,locked:true,leverable:true},'inn','A small service shutter with a weakened latch.'),kind:'fixture'},
  {...item('release','Shutter release',510,355,{portable:false,mechanism:'shutter'},'inn','A release linked to the nearby service shutter.'),kind:'fixture'},
 ];
 for(const [id,parent] of [['supply-note','supply-chest'],['inn-note','inn-chest'],['inn-ration','inn-chest']])entities.find(e=>e.id===id).location={kind:'contained',container:parent};
 return Object.fromEntries(entities.map(e=>[e.id,e]));
}
