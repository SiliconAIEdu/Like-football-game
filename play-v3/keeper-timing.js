// Shared research-informed dive, including landing and return to set posture.
import {DIVE_DURATION} from './keeper-biomechanics.js';
export const KEEPER_DIVE_SECONDS=DIVE_DURATION;
export const KEEPER_RECOVERY_SECONDS=.65;
export const keeperCanDive=actor=>(actor?.diveRecoveryLeft??0)<=0;
export function tickKeeperRecovery(actor,dt){if(actor)actor.diveRecoveryLeft=Math.max(0,(actor.diveRecoveryLeft??0)-Math.max(0,dt));}
