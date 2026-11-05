const normalize=value=>String(value||'').replace(/\s+/g,' ').trim().toLocaleUpperCase('pt-BR');

export const CONFIRMATION_DECISIONS=Object.freeze({
  resolved:'OBSERVE_RESOLVED_NO_CLICK',
  click:'CLICK_VISIBLE_CONFIRM',
  wait:'WAIT_FOR_VISIBLE_CONFIRM_OR_OUTCOME',
  rejectContinue:'REJECT_CONTINUE_BEFORE_OUTCOME',
  rejectUnexpected:'REJECT_UNEXPECTED_VISIBLE_ACTION'
});

/**
 * Decide whether a QA pointer may press the Target Shooter action button.
 * A resolved visible target always wins over a stale action label: the QA
 * must observe the outcome and must never turn CONTINUAR into confirmation.
 */
export function confirmationDecision(snapshot,expectedState){
  if(!['correct','incorrect'].includes(expectedState))throw Error('INVALID_EXPECTED_TARGET_STATE:'+expectedState);
  if(snapshot?.targetState===expectedState)return CONFIRMATION_DECISIONS.resolved;
  const action=normalize(snapshot?.actionText);
  if(snapshot?.interactionState==='AWAITING_CONTINUE'||(snapshot?.actionVisible&&action==='CONTINUAR'))
    return CONFIRMATION_DECISIONS.rejectContinue;
  if(!snapshot?.actionVisible)return CONFIRMATION_DECISIONS.wait;
  if(action==='CONFIRMAR')return CONFIRMATION_DECISIONS.click;
  return CONFIRMATION_DECISIONS.rejectUnexpected;
}

export function expectedVisibleFeedbackAction(state){
  if(state==='incorrect')return 'TENTAR DE NOVO';
  if(state==='correct')return 'CONTINUAR';
  throw Error('INVALID_EXPECTED_FEEDBACK_STATE:'+state);
}

export function findVisibleFeedbackOutcome(log,state){
  const action=expectedVisibleFeedbackAction(state);
  return [...(log||[])].reverse().find(item=>item?.targetState===state&&item.targetVisible===true&&
    item.feedback===state&&item.ribbonHidden===false&&item.actionText===action);
}
