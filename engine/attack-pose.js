// Shared body animation, independent of player name or class.
export function attackPose(progress,weapon='sword',action='Slash',direction='down'){
 if(!Number.isFinite(progress)||progress<0||progress>=1||action==='Dodge')return{x:0,y:0,tilt:0,left:0,right:0,cape:0};
 const kind=({Cleave:'Heavy',Cyclone:'Spin',Breaker:'Bash'})[action]||action;
 const charge=kind==='Heavy'?.44:.24;
 const wind=Math.min(1,progress/charge);
 const release=progress<charge?0:Math.sin(Math.min(1,(progress-charge)/(1-charge))*Math.PI);
 const pull=progress<charge?wind:0;
 const dx={left:-1,right:1,up:0,down:0}[direction],dy={left:0,right:0,up:-1,down:1}[direction];
 if(weapon==='bow')return{x:dx*(release*2-pull*2),y:dy*(release*2-pull*2),tilt:(pull*.12-release*.08)*(direction==='left'?-1:1),left:-3,right:Math.round(pull*5-release*3),cape:Math.round(release*3)};
 if(weapon==='staff')return{x:0,y:-Math.round(pull*2+release*2),tilt:Math.sin(progress*Math.PI*2)*.08,left:-Math.round(3+pull*3),right:-Math.round(4+pull*5-release*2),cape:Math.round(Math.sin(progress*Math.PI*2)*3)};
 const reach=weapon==='spear'?6:kind==='Heavy'?5:3;
 return{x:dx*(release*reach-pull*2),y:dy*(release*reach-pull*2),tilt:(release*.17-pull*.13)*(direction==='left'?-1:1),left:Math.round(pull*2-release*3),right:Math.round(-pull*5+release*4),cape:Math.round(pull*3-release*4)};
}
