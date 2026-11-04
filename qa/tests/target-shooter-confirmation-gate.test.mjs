import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIRMATION_DECISIONS,confirmationDecision,expectedVisibleFeedbackAction,findVisibleFeedbackOutcome
} from '../target-shooter-confirmation-gate.mjs';

test('does not click stale CONTINUAR after the incorrect target is already visibly resolved',()=>{
  assert.equal(confirmationDecision({targetState:'incorrect',interactionState:'READY',actionVisible:true,
    actionText:'CONTINUAR'},'incorrect'),CONFIRMATION_DECISIONS.resolved);
});

test('rejects CONTINUAR while a selected target has not reached the expected outcome',()=>{
  assert.equal(confirmationDecision({targetState:'selected',interactionState:'READY',actionVisible:true,
    actionText:'CONTINUAR'},'incorrect'),CONFIRMATION_DECISIONS.rejectContinue);
  assert.equal(confirmationDecision({targetState:'selected',interactionState:'AWAITING_CONTINUE',actionVisible:false,
    actionText:''},'correct'),CONFIRMATION_DECISIONS.rejectContinue);
});

test('permits only the visible CONFIRMAR action before target resolution',()=>{
  assert.equal(confirmationDecision({targetState:'selected',interactionState:'READY',actionVisible:true,
    actionText:' CONFIRMAR '},'correct'),CONFIRMATION_DECISIONS.click);
  assert.equal(confirmationDecision({targetState:'selected',interactionState:'READY',actionVisible:true,
    actionText:'TENTAR DE NOVO'},'correct'),CONFIRMATION_DECISIONS.rejectUnexpected);
  assert.equal(confirmationDecision({targetState:'selected',interactionState:'READY',actionVisible:false,
    actionText:'CONFIRMAR'},'correct'),CONFIRMATION_DECISIONS.wait);
});

test('accepts feedback evidence only with the exact visible state and action',()=>{
  const stale={targetState:'incorrect',targetVisible:true,feedback:'incorrect',ribbonHidden:false,actionText:'CONTINUAR'};
  const valid={...stale,actionText:'TENTAR DE NOVO'};
  assert.equal(expectedVisibleFeedbackAction('incorrect'),'TENTAR DE NOVO');
  assert.equal(expectedVisibleFeedbackAction('correct'),'CONTINUAR');
  assert.equal(findVisibleFeedbackOutcome([stale],'incorrect'),undefined);
  assert.deepEqual(findVisibleFeedbackOutcome([stale,valid],'incorrect'),valid);
});
