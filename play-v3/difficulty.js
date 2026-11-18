export const difficulties = Object.freeze({
 easy: Object.freeze({name:'简单',time:50,reaction:.22,keeperSpeed:2.4,diveScale:.78,accuracy:.55,chargeMs:750,incomingPower:.10,judgeTime:25,description:'门将反应较慢，射门更稳，准备时间更充足。'}),
 normal: Object.freeze({name:'普通',time:35,reaction:0,keeperSpeed:3.4,diveScale:1,accuracy:1,chargeMs:550,incomingPower:.22,judgeTime:18.3,description:'保留当前节奏，适合熟悉操作后挑战。'}),
 hard: Object.freeze({name:'困难',time:30,reaction:-.05,keeperSpeed:3.8,diveScale:1.06,accuracy:1.15,chargeMs:500,incomingPower:.36,judgeTime:14,description:'门将反应更快，需要更准确地选择角度和力度。'}),
 expert: Object.freeze({name:'特难',time:20,reaction:-.18,keeperSpeed:5.2,diveScale:1.25,accuracy:1.25,chargeMs:400,incomingPower:.55,judgeTime:11,description:'每球20秒，门将反应更快、移动和扑救更强，蓄力节奏更紧。'})
});
export function difficultyFor(id){return difficulties[id]||difficulties.normal;}
