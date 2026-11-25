// Native duration of the keeper clip shipped in yamal-playable-v1.glb.
export const KEEPER_DIVE_SECONDS=32/30;
export const KEEPER_RECOVERY_SECONDS=.65;
export const keeperCanDive=actor=>(actor?.diveRecoveryLeft??0)<=0;
export function tickKeeperRecovery(actor,dt){if(actor)actor.diveRecoveryLeft=Math.max(0,(actor.diveRecoveryLeft??0)-Math.max(0,dt));}
