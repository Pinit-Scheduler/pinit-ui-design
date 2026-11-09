/* Complete example-only management flows. Product policies remain proposals in the evidence document. */
var purposeCrudReadyV17 = false;
const initialPurposeModelV17 = structuredClone(purposeSpacesV16);
let purposeCrudV17 = { assignees: {}, schedules: {}, history: {}, invitations: [], trash: [] };
try {
  const stored = JSON.parse(localStorage.getItem('pinit-purpose-model-v17'));
  if (stored?.spaces && stored.spaces.personal) {
    Object.keys(purposeSpacesV16).forEach(key => delete purposeSpacesV16[key]);
    Object.assign(purposeSpacesV16, stored.spaces);
    purposeCrudV17 = { ...purposeCrudV17, ...stored.crud };
    if (stored.state && purposeSpacesV16[stored.state.space]) purposeSpaceStateV16 = { ...purposeSpaceStateV16, ...stored.state };
  }
} catch (_) { /* Keep the example model available. */ }
const mePurposeV17 = { id: 'me', name: '나', email: '', role: 'member' };
function membersPurposeV17(spaceId) { return purposeSpacesV16[spaceId]?.members || [mePurposeV17]; }
function sharedPurposeV17(spaceId) { return spaceId !== 'personal' && membersPurposeV17(spaceId).length > 1; }
function persistPurposeCrudV17() {
  try {
    localStorage.setItem('pinit-purpose-model-v17', JSON.stringify({ spaces: purposeSpacesV16, state: purposeSpaceStateV16, crud: purposeCrudV17 }));
    return true;
  } catch (_) { toast('시안을 저장하지 못했어요. 저장 공간을 확인한 뒤 다시 시도하세요.'); return false; }
}
const persistBeforeCrudV17 = savePurposeSpacesV16;
savePurposeSpacesV16 = function () { persistBeforeCrudV17(); persistPurposeCrudV17(); };
function refreshPurposeCrudV17(message) {
  const saved = persistPurposeCrudV17();
  if (saved) persistBeforeCrudV17();
  renderPurposeChromeV16(); renderTasks(); renderTimeline();
  if (message && saved) toast(message);
  return saved;
}
function snapshotPurposeV17() { return structuredClone({ spaces: purposeSpacesV16, state: purposeSpaceStateV16, crud: purposeCrudV17, tasks, scheduled, trash: trashV2, activeSchedule }); }
function commitPurposeV17(before) {
  if (persistPurposeCrudV17()) { persistBeforeCrudV17(); return true; }
  Object.keys(purposeSpacesV16).forEach(key => delete purposeSpacesV16[key]);
  Object.assign(purposeSpacesV16, before.spaces); purposeSpaceStateV16 = before.state; purposeCrudV17 = before.crud;
  tasks = before.tasks; scheduled = before.scheduled; trashV2 = before.trash; activeSchedule = before.activeSchedule;
  save();
  errorPurposeV17('변경 내용을 저장하지 못했어요. 입력 내용은 남아 있으니 다시 시도하세요.');
  return false;
}
function valuePurposeV17(id) { return document.getElementById(id)?.value.trim() || ''; }
function errorPurposeV17(message) { const error = document.getElementById('purposeErrorV17'); if (error) error.textContent = message; }
function keyPurposeV17(prefix) { return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6); }
function fieldPurposeV17(label, id, value = '', area = false, placeholder = '') {
  return formFieldV2(label, area ? '<textarea id="' + id + '" rows="3" maxlength="800" placeholder="' + esc(placeholder) + '">' + esc(value) + '</textarea>' : '<input id="' + id + '" maxlength="80" value="' + esc(value) + '" placeholder="' + esc(placeholder) + '">');
}
function formPurposeV17(title, body, action, label = '저장') {
  modal(modalHead(title) + '<form onsubmit="event.preventDefault();' + action + '">' + body + '<p id="purposeErrorV17" class="field-error" role="alert"></p><div class="dialog-actions"><button type="button" class="btn" onclick="closeModal()">취소</button><button class="btn primary">' + label + '</button></div></form>');
  document.querySelector('.dialog').classList.add('purpose-management-dialog');
  requestAnimationFrame(() => document.querySelector('.dialog form input:not([type=checkbox]),.dialog form textarea,.dialog form select')?.focus());
}
function recordPurposeV17(kind, id, action) {
  const key = kind + ':' + id;
  if (!purposeCrudV17.history[key]) purposeCrudV17.history[key] = action.endsWith('생성') ? [] : [{ at: '기존 기록 · 예시', actor: '나', action: '이동 전부터 보관된 항목 기록' }];
  purposeCrudV17.history[key].push({ at: new Date().toLocaleString('ko-KR'), actor: '나', action });
}
function historyPurposeV17(kind, id) {
  const records = purposeCrudV17.history[kind + ':' + id] || [{ at: '기존 기록 · 예시', actor: '나', action: '항목 생성' }];
  return '<section class="detail-section"><h3>활동 기록</h3><ol class="purpose-history">' + records.map(r => '<li><strong>' + esc(r.action) + '</strong><small>' + esc(r.actor + ' · ' + r.at) + '</small></li>').join('') + '</ol></section>';
}
function openNewPurposeSpaceV17() {
  formPurposeV17('목적 스페이스 만들기', '<p>혼자 시작하고, 필요할 때 함께할 사람을 초대할 수 있어요.</p>' + fieldPurposeV17('스페이스 이름', 'spaceNameV17', '', false, '예: 함께 만드는 서비스') + fieldPurposeV17('이 스페이스의 목적', 'spacePurposeV17', '', true, '이 스페이스에서 이루고 싶은 방향과 결과를 적어보세요.'), 'savePurposeSpaceV17()', '스페이스 만들기');
}
function savePurposeSpaceV17(id) {
  const name = valuePurposeV17('spaceNameV17'), purpose = valuePurposeV17('spacePurposeV17');
  if (!name) return errorPurposeV17('스페이스 이름을 입력하세요.');
  if (Object.entries(purposeSpacesV16).some(([key, space]) => key !== id && space.name === name)) return errorPurposeV17('다른 스페이스와 구분할 수 있는 이름을 입력하세요.');
  const before = snapshotPurposeV17(), spaceId = id || keyPurposeV17('space');
  purposeSpacesV16[spaceId] = { ...purposeSpacesV16[spaceId], name, purpose, note: id === 'personal' ? '본인 전용' : '혼자 사용하는 목적 스페이스', projects: purposeSpacesV16[spaceId]?.projects || {}, members: membersPurposeV17(spaceId) };
  purposeSpaceStateV16.space = spaceId; purposeSpaceStateV16.project = '';
  if (!commitPurposeV17(before)) return;
  closeModal(); navigate('tasks'); refreshPurposeCrudV17(id ? '스페이스 정보를 수정했어요.' : '스페이스를 만들었어요.');
  openManagePurposeV17('purpose');
}
function openPurposeEditorV17(mode = 'edit') {
  const id = purposeSpaceStateV16.space, space = purposeSpacesV16[id];
  if (mode === 'clear') {
    modal(modalHead('목적 내용 삭제') + '<p>목적 내용만 지웁니다. 스페이스와 프로젝트, 작업·일정은 남아 있어요.</p><div class="notice">함께 사용하는 스페이스에서는 참여자 모두가 바뀐 목적을 보게 돼요.</div><div class="dialog-actions"><button class="btn" onclick="openManagePurposeV17(\'purpose\')">취소</button><button class="btn danger" onclick="clearPurposeTextV17()">목적 내용 삭제</button></div>');
    return;
  }
  formPurposeV17(space.purpose ? '목적 수정' : '목적 작성', fieldPurposeV17('이 스페이스의 목적', 'purposeTextV17', space.purpose, true, '이 스페이스에서 이루고 싶은 방향과 결과'), 'savePurposeTextV17()');
}
function clearPurposeTextV17() {
  const before = snapshotPurposeV17(); purposeSpacesV16[purposeSpaceStateV16.space].purpose = '';
  if (!commitPurposeV17(before)) return;
  refreshPurposeCrudV17('목적 내용을 삭제했어요.'); openManagePurposeV17('purpose');
}
function savePurposeTextV17() {
  const before = snapshotPurposeV17();
  purposeSpacesV16[purposeSpaceStateV16.space].purpose = valuePurposeV17('purposeTextV17');
  if (!commitPurposeV17(before)) return;
  refreshPurposeCrudV17('목적을 저장했어요.'); openManagePurposeV17('purpose');
}
function openProjectEditorV17(projectId = '') {
  const space = purposeSpacesV16[purposeSpaceStateV16.space], project = space.projects[projectId];
  formPurposeV17(project ? '프로젝트 수정' : '프로젝트 만들기', '<p>' + esc(space.name) + (project ? '의 프로젝트를 수정합니다.' : '에 프로젝트를 만듭니다.') + '</p>' + fieldPurposeV17('프로젝트 이름', 'projectNameV17', project?.name || '') + fieldPurposeV17('목적에 기여할 성과 · 권장', 'projectOutcomeV17', project?.outcome || '', true, '이 프로젝트를 마쳤을 때 남을 성과를 적어보세요.'), 'saveProjectPurposeV17(\'' + projectId + '\')', project ? '수정 저장' : '프로젝트 만들기');
}
function saveProjectPurposeV17(projectId) {
  const space = purposeSpacesV16[purposeSpaceStateV16.space], name = valuePurposeV17('projectNameV17');
  if (!name) return errorPurposeV17('프로젝트 이름을 입력하세요.');
  if (Object.entries(space.projects).some(([id, item]) => id !== projectId && item.name === name)) return errorPurposeV17('이 스페이스에 같은 이름의 프로젝트가 있어요.');
  const before = snapshotPurposeV17(), id = projectId || keyPurposeV17('project');
  space.projects[id] = { ...space.projects[id], name, outcome: valuePurposeV17('projectOutcomeV17') };
  purposeSpaceStateV16.project = id;
  if (!commitPurposeV17(before)) return;
  closeModal(); navigate('tasks'); refreshPurposeCrudV17(projectId ? '프로젝트를 수정했어요.' : '프로젝트를 만들었어요.');
}
function openManagePurposeV17(tab = 'purpose') {
  const state = purposeSpaceStateV16, space = purposeSpacesV16[state.space], members = membersPurposeV17(state.space);
  const tabs = [['purpose', '목적·정보'], ['projects', '프로젝트'], ['people', '참여자']];
  let body = '<div class="purpose-manager-tabs">' + tabs.map(([id, name]) => '<button type="button" class="btn ' + (id === tab ? 'active' : '') + '" onclick="openManagePurposeV17(\'' + id + '\')">' + name + '</button>').join('') + '</div>';
  if (tab === 'purpose') body += '<div class="purpose-info-heading"><div><h3>' + esc(space.name) + '</h3><p>' + (state.space === 'personal' ? '본인 전용 기본 스페이스' : sharedPurposeV17(state.space) ? members.length + '명이 함께 사용하는 스페이스' : '혼자 사용하는 목적 스페이스') + '</p></div><button class="text-btn" onclick="openSpaceInfoEditorV17()">이름 수정</button></div><section class="detail-section"><h3>목적</h3><p>' + esc(space.purpose || '아직 목적을 작성하지 않았어요. 목적 없이 바로 작업을 기록해도 괜찮아요.') + '</p><div class="purpose-inline-actions"><button class="btn" onclick="openPurposeEditorV17()">' + (space.purpose ? '목적 수정' : '목적 작성') + '</button>' + (space.purpose ? '<button class="text-btn danger" onclick="openPurposeEditorV17(\'clear\')">목적 내용 삭제</button>' : '') + '</div></section>' + (state.space !== 'personal' ? '<div class="purpose-danger-zone"><button class="text-btn" onclick="openLeavePurposeV17()">스페이스 나가기</button><button class="text-btn danger" onclick="openDeletePurposeV17(\'space\')">스페이스 삭제</button></div>' : '<p class="notice">나의 스페이스는 본인 전용이며 사람을 초대할 수 없어요.</p>');
  if (tab === 'projects') body += '<div class="purpose-info-heading"><p>목적에 기여할 프로젝트를 관리하세요.</p><button class="btn primary" onclick="openProjectEditorV17()">프로젝트 만들기</button></div>' + (Object.entries(space.projects).map(([id, item]) => '<article class="purpose-manager-row"><button class="purpose-manager-main" onclick="closeModal();openPurposeProjectV16(\'' + state.space + '\',\'' + id + '\')"><strong>' + esc(item.name) + '</strong><small>' + esc(item.outcome || '기여할 성과를 적어보세요.') + '</small></button><button class="text-btn" onclick="openProjectEditorV17(\'' + id + '\')">수정</button><button class="text-btn danger" onclick="openDeletePurposeV17(\'project\',\'' + id + '\')">삭제</button></article>').join('') || '<p class="empty">아직 프로젝트가 없어요. 첫 프로젝트를 만들어보세요.</p>');
  if (tab === 'people') body += peopleMarkupPurposeV17();
  modal(modalHead('스페이스 관리') + body + '<div class="dialog-actions"><button class="btn" onclick="closeModal()">닫기</button></div>');
  document.querySelector('.dialog').classList.add('purpose-management-dialog');
}
function openSpaceInfoEditorV17() {
  const space = purposeSpacesV16[purposeSpaceStateV16.space];
  formPurposeV17('스페이스 정보 수정', fieldPurposeV17('스페이스 이름', 'spaceNameV17', space.name) + fieldPurposeV17('목적', 'spacePurposeV17', space.purpose, true), 'savePurposeSpaceV17(\'' + purposeSpaceStateV16.space + '\')');
}
function peopleMarkupPurposeV17() {
  const id = purposeSpaceStateV16.space;
  if (id === 'personal') return '<p class="notice">나의 스페이스는 본인 전용입니다. 함께할 스페이스를 새로 만들면 사람을 초대할 수 있어요.</p><button class="btn primary" onclick="openNewPurposeSpaceV17()">목적 스페이스 만들기</button>';
  const members = membersPurposeV17(id), pending = purposeCrudV17.invitations.filter(invite => invite.space === id && invite.status === 'pending');
  return '<div class="purpose-info-heading"><h3>참여자 ' + members.length + '명</h3><button class="btn primary" onclick="openInvitePurposeV17()">사람 초대</button></div>' + members.map(member => '<article class="purpose-manager-row"><span class="space-switcher-avatar" aria-hidden="true">' + esc(member.name.slice(0, 1)) + '</span><div class="purpose-manager-main"><strong>' + esc(member.name) + (member.id === 'me' ? ' · 나' : '') + '</strong><small>' + esc(member.email || '스페이스를 함께 관리할 수 있어요.') + '</small></div>' + (member.id !== 'me' ? '<button class="text-btn danger" onclick="openRemoveMemberPurposeV17(\'' + member.id + '\')">제외</button>' : '') + '</article>').join('') + (pending.length ? '<h3 class="purpose-section-title">초대 대기</h3>' + pending.map(invite => '<article class="purpose-manager-row"><div class="purpose-manager-main"><strong>' + esc(invite.email) + '</strong><small>아직 참여하지 않았어요.</small></div><button class="text-btn" onclick="openInvitationPurposeV17(\'' + invite.id + '\')">초대 화면 보기</button><button class="text-btn danger" onclick="cancelInvitationPurposeV17(\'' + invite.id + '\')">초대 취소</button></article>').join('') : '') + '<p class="notice">이 디자인 시안의 초대는 예시 상태로만 저장됩니다. 실제 메일을 보내지 않습니다.</p>';
}
function openInvitePurposeV17() {
  if (purposeSpaceStateV16.space === 'personal') return openManagePurposeV17('people');
  formPurposeV17('함께할 사람 초대', '<p>' + esc(purposeSpacesV16[purposeSpaceStateV16.space].name) + '의 목적과 프로젝트, 공유 작업을 함께 보고 수정할 수 있어요.</p>' + formFieldV2('이메일', '<input id="inviteEmailV17" type="email" required placeholder="name@example.com">') + fieldPurposeV17('표시 이름 · 선택', 'inviteNameV17', '', false, '예시 참여자의 이름') + '<p class="notice">스페이스에 있는 공유 항목의 과거 기록도 참여자에게 표시됩니다.</p>', 'saveInvitePurposeV17()', '초대 만들기');
}
function saveInvitePurposeV17() {
  const space = purposeSpaceStateV16.space, email = valuePurposeV17('inviteEmailV17');
  if (space === 'personal') return errorPurposeV17('기본 개인 스페이스에는 초대할 수 없어요.');
  if (!email || !email.includes('@')) return errorPurposeV17('초대할 이메일을 입력하세요.');
  if (membersPurposeV17(space).some(m => m.email?.toLowerCase() === email.toLowerCase()) || purposeCrudV17.invitations.some(i => i.space === space && i.email.toLowerCase() === email.toLowerCase() && i.status === 'pending')) return errorPurposeV17('이미 참여 중이거나 초대를 기다리는 이메일이에요.');
  const before = snapshotPurposeV17(), invitation = { id: keyPurposeV17('invite'), space, email, name: valuePurposeV17('inviteNameV17') || email.split('@')[0], status: 'pending' };
  purposeCrudV17.invitations.push(invitation);
  if (!commitPurposeV17(before)) return;
  openInvitationPurposeV17(invitation.id);
}
function openInvitationPurposeV17(id) {
  const invitation = purposeCrudV17.invitations.find(i => i.id === id), space = purposeSpacesV16[invitation?.space];
  if (!invitation || !space) return;
  modal(modalHead('스페이스 초대') + '<div class="purpose-invitation"><span class="space-switcher-avatar" aria-hidden="true">' + esc(space.name.slice(0, 1)) + '</span><h3>' + esc(space.name) + '에 초대받았어요</h3><p>' + esc(space.purpose || '함께할 프로젝트와 작업을 확인하세요.') + '</p><small>' + esc(invitation.email) + '</small></div><p class="notice">참여하면 이 스페이스의 공유 내용과 이동 전 기록을 함께 보고 수정할 수 있어요. 지금은 초대받은 사용자의 예시 화면입니다.</p>' + (invitation.status === 'pending' ? '<div class="dialog-actions"><button class="btn" onclick="respondInvitationPurposeV17(\'' + id + '\',false)">참여하지 않기</button><button class="btn primary" onclick="respondInvitationPurposeV17(\'' + id + '\',true)">스페이스 참여</button></div>' : '<p class="notice">' + (invitation.status === 'accepted' ? '참여한 초대입니다.' : '종료된 초대입니다.') + '</p><div class="dialog-actions"><button class="btn" onclick="openManagePurposeV17(\'people\')">참여자 보기</button></div>'));
}
function respondInvitationPurposeV17(id, accepted) {
  const invitation = purposeCrudV17.invitations.find(i => i.id === id);
  if (!invitation || invitation.status !== 'pending' || !purposeSpacesV16[invitation.space]) return;
  const before = snapshotPurposeV17();
  invitation.status = accepted ? 'accepted' : 'declined';
  if (accepted) {
    const space = purposeSpacesV16[invitation.space];
    space.members = [...membersPurposeV17(invitation.space), { id: keyPurposeV17('member'), name: invitation.name, email: invitation.email, role: 'member' }];
    space.note = space.members.length + '명이 함께 사용하는 스페이스';
  }
  purposeSpaceStateV16.space = invitation.space;
  if (!commitPurposeV17(before)) return;
  refreshPurposeCrudV17(accepted ? '스페이스에 참여했어요. 같은 공유 항목을 함께 관리합니다.' : '초대 참여를 거절했어요.');
  openManagePurposeV17('people');
}
function cancelInvitationPurposeV17(id) {
  const before = snapshotPurposeV17(), invitation = purposeCrudV17.invitations.find(i => i.id === id);
  if (invitation) invitation.status = 'cancelled';
  if (!commitPurposeV17(before)) return;
  refreshPurposeCrudV17('초대를 취소했어요.'); openManagePurposeV17('people');
}
function openRemoveMemberPurposeV17(memberId) {
  const state = purposeSpaceStateV16, member = membersPurposeV17(state.space).find(m => m.id === memberId);
  if (!member || memberId === 'me') return;
  const assigned = tasks.filter(t => taskSpaceV16(t).space === state.space && purposeCrudV17.assignees[t.id] === memberId);
  const others = membersPurposeV17(state.space).filter(m => m.id !== memberId);
  formPurposeV17('참여자 제외', '<p class="notice">검토안 · 제외 권한과 담당 작업 처리 방식을 확인할 수 있습니다.</p><p><strong>' + esc(member.name) + '</strong>님은 이 스페이스의 공유 내용을 더 이상 볼 수 없어요.</p><p class="notice">담당 작업 ' + assigned.length + '개와 기존 활동 기록을 확인하세요. 과거 기록의 작성자 표시는 남깁니다.</p>' + (assigned.length ? formFieldV2('담당 작업을 넘길 사람', '<select id="reassignMemberV17">' + selectedOptionsV2(others.map(m => [m.id, m.name]), 'me') + '</select>') : ''), 'removeMemberPurposeV17(\'' + memberId + '\')', '참여자 제외');
}
function removeMemberPurposeV17(memberId) {
  const before = snapshotPurposeV17(), spaceId = purposeSpaceStateV16.space, space = purposeSpacesV16[spaceId];
  tasks.filter(t => taskSpaceV16(t).space === spaceId && purposeCrudV17.assignees[t.id] === memberId).forEach(t => { purposeCrudV17.assignees[t.id] = valuePurposeV17('reassignMemberV17') || 'me'; recordPurposeV17('task', t.id, '참여자 제외로 담당자 변경'); });
  space.members = membersPurposeV17(spaceId).filter(m => m.id !== memberId);
  space.note = space.members.length > 1 ? space.members.length + '명이 함께 사용하는 스페이스' : '혼자 사용하는 목적 스페이스';
  if (!commitPurposeV17(before)) return;
  refreshPurposeCrudV17('참여자를 제외했어요.'); openManagePurposeV17('people');
}
function openLeavePurposeV17() {
  const spaceId = purposeSpaceStateV16.space;
  if (spaceId === 'personal') return;
  if (membersPurposeV17(spaceId).length === 1) {
    modal(modalHead('마지막 참여자입니다') + '<p class="notice">검토안 · 마지막 참여자는 먼저 스페이스를 정리하도록 안내합니다.</p><p>혼자 남은 스페이스입니다. 스페이스를 남기려면 다른 사람을 초대하고, 더 이상 쓰지 않으면 삭제할 수 있어요.</p><div class="dialog-actions"><button class="btn" onclick="openInvitePurposeV17()">사람 초대</button><button class="btn danger" onclick="openDeletePurposeV17(\'space\')">스페이스 삭제</button></div>'); return;
  }
  formPurposeV17('스페이스 나가기', '<p class="notice">검토안 · 내 담당 작업을 넘긴 뒤 나가는 흐름입니다.</p><p>나간 뒤에는 초대를 받아 다시 참여할 수 있어요. 이 스페이스에 남아 있는 내 담당 작업은 다른 참여자에게 넘깁니다.</p>' + formFieldV2('담당 작업을 넘길 사람', '<select id="leaveAssigneeV17">' + selectedOptionsV2(membersPurposeV17(spaceId).filter(m => m.id !== 'me').map(m => [m.id, m.name]), '') + '</select>'), 'leavePurposeV17()', '스페이스 나가기');
}
function leavePurposeV17() {
  const before = snapshotPurposeV17(), spaceId = purposeSpaceStateV16.space, next = valuePurposeV17('leaveAssigneeV17');
  if (!next) return errorPurposeV17('담당 작업을 넘길 사람을 선택하세요.');
  tasks.filter(t => taskSpaceV16(t).space === spaceId && (purposeCrudV17.assignees[t.id] || 'me') === 'me').forEach(t => { purposeCrudV17.assignees[t.id] = next; });
  purposeSpacesV16[spaceId].members = membersPurposeV17(spaceId).filter(m => m.id !== 'me');
  purposeCrudV17.leftSpaces = [...(purposeCrudV17.leftSpaces || []), spaceId];
  purposeSpaceStateV16.space = 'personal'; purposeSpaceStateV16.project = '';
  if (!commitPurposeV17(before)) return;
  closeModal(); navigate('today'); refreshPurposeCrudV17('스페이스에서 나왔어요.');
}
function scheduleSpacePurposeV17(schedule) {
  const own = purposeCrudV17.schedules[schedule.id];
  if (own && purposeSpacesV16[own.space]) return { ...own, project: purposeSpacesV16[own.space].projects[own.project] ? own.project : '' };
  const task = tasks.find(t => t.id === schedule.taskId);
  return task ? { ...taskSpaceV16(task), visibility: 'personal' } : { space: 'personal', project: '', visibility: 'personal' };
}
function destinationOptionsPurposeV17(excludedSpace = '', excludedProject = '') {
  const options = [];
  Object.entries(purposeSpacesV16).forEach(([spaceId, space]) => {
    if (spaceId === excludedSpace || (purposeCrudV17.leftSpaces || []).includes(spaceId)) return;
    options.push([spaceId + '|', space.name]);
    Object.entries(space.projects).forEach(([projectId, project]) => {
      if (spaceId === purposeSpaceStateV16.space && projectId === excludedProject) return;
      options.push([spaceId + '|' + projectId, space.name + ' › ' + project.name]);
    });
  });
  return options;
}
function affectedPurposeV17(kind, projectId) {
  const state = purposeSpaceStateV16;
  const match = assignment => assignment.space === state.space && (kind === 'space' || assignment.project === projectId);
  return { tasks: tasks.filter(t => match(taskSpaceV16(t))), schedules: scheduled.filter(s => match(scheduleSpacePurposeV17(s))) };
}
function openDeletePurposeV17(kind, projectId = '') {
  const state = purposeSpaceStateV16, space = purposeSpacesV16[state.space], item = kind === 'space' ? space : space.projects[projectId];
  if (!item || (kind === 'space' && state.space === 'personal')) return;
  const affected = affectedPurposeV17(kind, projectId), running = affected.schedules.filter(s => ['IN_PROGRESS', 'SUSPENDED'].includes(s.state));
  if (running.length) { modal(modalHead('진행 중인 일정이 있어요') + '<p>이 항목에는 진행 중이거나 일시정지한 일정 ' + running.length + '개가 연결돼 있어요. 해당 일정을 완료하거나 실행을 취소한 뒤 삭제하세요.</p><div class="dialog-actions"><button class="btn" onclick="closeModal()">닫기</button><button class="btn primary" onclick="closeModal();navigate(\'schedules\')">일정 보기</button></div>'); return; }
  const count = affected.tasks.length + affected.schedules.length;
  formPurposeV17(kind === 'space' ? '스페이스 삭제' : '프로젝트 삭제', '<p class="notice">검토안 · 연결된 항목의 처리와 복원 방식을 확인하세요.</p><h3>' + esc(item.name) + '</h3><p class="notice">' + (kind === 'space' ? '프로젝트 ' + Object.keys(space.projects).length + '개, ' : '') + '작업 ' + affected.tasks.length + '개, 일정 ' + affected.schedules.length + '개에 영향을 줍니다.</p>' + (count ? formFieldV2('연결된 내용 처리', '<select id="deleteHandlingV17" onchange="document.getElementById(\'deleteDestinationFieldV17\').classList.toggle(\'hidden\',this.value!==\'move\')"><option value="">처리 방법 선택</option><option value="move">다른 소속으로 옮겨 보관</option><option value="trash">함께 휴지통으로 이동</option></select>') + '<div id="deleteDestinationFieldV17" class="hidden">' + formFieldV2('옮길 위치', '<select id="deleteDestinationV17">' + selectedOptionsV2(destinationOptionsPurposeV17(kind === 'space' ? state.space : '', projectId), 'personal|') + '</select>') + '<p>옮기는 작업의 담당자는 나로, 일정은 내 일정으로 설정됩니다.</p><label class="check-field"><input type="checkbox" id="deleteImpactConfirmedV17">처리 범위와 공유 스페이스 이동 시 과거 기록 공개를 확인했어요.</label></div>' : '<p>연결된 작업과 일정이 없습니다. 삭제한 구조는 휴지통에서 복원할 수 있어요.</p>'), 'deletePurposeEntityV17(\'' + kind + '\',\'' + projectId + '\')', '휴지통으로 이동');
}
function deletePurposeEntityV17(kind, projectId) {
  const state = purposeSpaceStateV16, spaceId = state.space, space = purposeSpacesV16[spaceId], affected = affectedPurposeV17(kind, projectId);
  if (kind === 'space' && spaceId === 'personal') return;
  const mode = valuePurposeV17('deleteHandlingV17') || (!(affected.tasks.length + affected.schedules.length) ? 'empty' : '');
  if (!mode) return errorPurposeV17('연결된 내용의 처리 방법을 선택하세요.');
  const before = snapshotPurposeV17();
  const backup = { id: keyPurposeV17('trash'), kind, space: spaceId, project: projectId, name: kind === 'space' ? space.name : space.projects[projectId].name, snapshot: structuredClone(kind === 'space' ? space : space.projects[projectId]), tasks: affected.tasks.map(t => t.id), schedules: affected.schedules.map(s => s.id), mode };
  if (mode === 'move') {
    const [targetSpace, targetProject] = valuePurposeV17('deleteDestinationV17').split('|');
    if (!purposeSpacesV16[targetSpace] || (kind === 'space' && targetSpace === spaceId) || (kind === 'project' && targetSpace === spaceId && targetProject === projectId)) return errorPurposeV17('삭제되는 항목 밖의 소속을 선택하세요.');
    if (!document.getElementById('deleteImpactConfirmedV17')?.checked) return errorPurposeV17('연결된 항목의 처리와 기록 공개 범위를 확인하세요.');
    affected.tasks.forEach(t => { purposeSpaceStateV16.assignments[t.id] = { space: targetSpace, project: targetProject || '' }; purposeCrudV17.assignees[t.id] = 'me'; recordPurposeV17('task', t.id, '상위 항목 삭제로 ' + purposeSpacesV16[targetSpace].name + '에 이동'); });
    affected.schedules.forEach(s => { purposeCrudV17.schedules[s.id] = { space: targetSpace, project: targetProject || '', visibility: 'personal' }; recordPurposeV17('schedule', s.id, '상위 항목 삭제로 소속 이동'); });
  } else if (mode === 'trash') {
    affected.schedules.forEach(s => moveTrashV2('schedule', s.id));
    affected.tasks.forEach(t => moveTrashV2('task', t.id));
  }
  purposeCrudV17.trash.push(backup);
  if (kind === 'space') { delete purposeSpacesV16[spaceId]; state.space = 'personal'; }
  else delete space.projects[projectId];
  state.project = '';
  if (!commitPurposeV17(before)) return;
  save(); closeModal(); navigate('tasks'); refreshPurposeCrudV17('휴지통으로 옮겼어요.');
}
function openRestorePurposeV17(id) {
  const entry = purposeCrudV17.trash.find(item => item.id === id);
  if (!entry) return;
  if (entry.kind === 'project' && !purposeSpacesV16[entry.space]) { modal(modalHead('상위 스페이스를 먼저 복원하세요') + '<p>이 프로젝트가 속했던 스페이스가 휴지통에 있습니다. 스페이스를 복원한 뒤 프로젝트를 복원할 수 있어요.</p><div class="dialog-actions"><button class="btn" onclick="closeModal()">닫기</button></div>'); return; }
  formPurposeV17('복원', '<h3>' + esc(entry.name) + '</h3><p>' + (entry.kind === 'space' ? '이 스페이스와 프로젝트 구조를 복원합니다.' : '원래 스페이스에 프로젝트를 복원합니다.') + '</p>' + (entry.mode === 'move' ? '<p class="notice">다른 소속으로 옮겨 둔 작업과 일정은 현재 위치에 남습니다.</p>' : entry.mode === 'trash' ? '<label class="check-field"><input type="checkbox" id="restoreChildrenV17" checked>함께 휴지통으로 보낸 작업·일정도 복원</label>' : ''), 'restorePurposeEntityV17(\'' + id + '\')', '복원');
}
function restorePurposeEntityV17(id) {
  const entry = purposeCrudV17.trash.find(item => item.id === id);
  if (!entry) return;
  const before = snapshotPurposeV17();
  if (entry.kind === 'space') purposeSpacesV16[entry.space] = entry.snapshot;
  else if (purposeSpacesV16[entry.space]) purposeSpacesV16[entry.space].projects[entry.project] = entry.snapshot;
  else return errorPurposeV17('상위 스페이스를 먼저 복원하세요.');
  if (document.getElementById('restoreChildrenV17')?.checked) {
    entry.tasks.forEach(taskId => { if (trashV2.some(t => t.kind === 'task' && t.item.id === taskId)) restoreTrashV2('task', taskId); });
    entry.schedules.forEach(scheduleId => { if (trashV2.some(s => s.kind === 'schedule' && s.item.id === scheduleId)) restoreTrashV2('schedule', scheduleId); });
  }
  purposeCrudV17.trash = purposeCrudV17.trash.filter(item => item.id !== id);
  if (!commitPurposeV17(before)) return;
  save(); closeModal(); refreshPurposeCrudV17('복원했어요.'); if (currentView === 'trash') renderTrashV2();
}
const itemRestoreBeforeCrudV17 = restoreTrashV2;
restoreTrashV2 = function (kind, id) {
  const location = kind === 'task' ? purposeSpaceStateV16.assignments[id] || seedSpaceAssignmentsV16[id] : purposeCrudV17.schedules[id];
  if (location && (!purposeSpacesV16[location.space] || (location.project && !purposeSpacesV16[location.space].projects[location.project]))) {
    const parent = purposeCrudV17.trash.find(entry => entry.kind === 'space' && entry.space === location.space || entry.kind === 'project' && entry.space === location.space && entry.project === location.project);
    modal(modalHead('소속을 먼저 복원하세요') + '<p>이 항목이 속했던 스페이스 또는 프로젝트가 휴지통에 있어요. 먼저 소속을 복원하면 항목도 원래 위치로 복원할 수 있습니다.</p><div class="dialog-actions"><button class="btn" onclick="closeModal()">닫기</button>' + (parent ? '<button class="btn primary" onclick="openRestorePurposeV17(\'' + parent.id + '\')">소속 복원</button>' : '') + '</div>');
    return;
  }
  itemRestoreBeforeCrudV17(kind, id);
};
const trashBeforeCrudV17 = renderTrashV2;
renderTrashV2 = function () {
  trashBeforeCrudV17();
  document.getElementById('alternatePanel').insertAdjacentHTML('beforeend', '<section class="detail-section"><h3>스페이스·프로젝트</h3>' + (purposeCrudV17.trash.map(entry => '<article class="purpose-manager-row"><div class="purpose-manager-main"><strong>' + esc(entry.name) + '</strong><small>' + (entry.kind === 'space' ? '스페이스' : '프로젝트') + '</small></div><button class="btn" onclick="openRestorePurposeV17(\'' + entry.id + '\')">복원</button></article>').join('') || '<p class="subtitle">삭제한 스페이스와 프로젝트가 없습니다.</p>') + '</section>');
};
function affiliationMarkupPurposeV17(assignment, kind, itemId) {
  const memberId = kind === 'task' ? purposeCrudV17.assignees[itemId] || 'me' : 'me';
  const left = purposeCrudV17.leftSpaces || [];
  return '<section class="purpose-affiliation" data-affiliation-kind="' + kind + '" data-item-id="' + (itemId || '') + '" data-original-space="' + assignment.space + '" data-original-visibility="' + (assignment.visibility || 'personal') + '"><h3>소속</h3><div class="form-row">' + formFieldV2('스페이스', '<select id="affiliationSpaceV17" onchange="updateAffiliationPurposeV17()">' + selectedOptionsV2(Object.entries(purposeSpacesV16).filter(([id]) => !left.includes(id)).map(([id, space]) => [id, space.name]), assignment.space) + '</select>') + formFieldV2('프로젝트', '<select id="affiliationProjectV17" onchange="updateAffiliationPurposeV17(false)">' + selectedOptionsV2([['', '프로젝트 없음'], ...Object.entries(purposeSpacesV16[assignment.space].projects).map(([id, project]) => [id, project.name])], assignment.project) + '</select>') + '</div>' + '<label class="field" id="assigneeFieldV17"><span>담당자 한 명</span><select id="assigneeV17">' + selectedOptionsV2(membersPurposeV17(assignment.space).map(m => [m.id, m.name]), memberId) + '</select></label>' + (kind === 'schedule' ? '<p class="subtitle">검토안 · 일정의 소유·공유 정책은 확인이 필요해요.</p>' + formFieldV2('일정 보기 범위', '<select id="scheduleVisibilityV17" onchange="updateAffiliationPurposeV17(false)">' + selectedOptionsV2([['personal', '내 일정으로 보기'], ['shared', '스페이스 참여자와 함께 보기']], assignment.visibility || 'personal') + '</select>') : '') + '<div class="notice hidden" id="sharingWarningV17"><strong>이동 전 기록도 공유됩니다.</strong><p>이 항목의 이전 활동과 실행 기록도 이 스페이스의 참여자에게 보입니다. 다른 개인 항목은 옮겨지지 않습니다.</p><label class="check-field"><input type="checkbox" id="shareHistoryConfirmedV17">공개될 기록의 범위를 확인했어요.</label></div>' + (kind === 'task' && itemId && scheduled.some(s => s.taskId === itemId) ? '<label class="check-field"><input type="checkbox" id="moveLinkedSchedulesV17">연결된 일정도 같은 소속으로 옮기기</label><p class="subtitle">선택하지 않으면 일정의 소속은 현재 위치에 남습니다.</p>' : '') + '</section>';
}
function updateAffiliationPurposeV17(rebuildProjects = true) {
  const panel = document.querySelector('.purpose-affiliation'); if (!panel) return;
  const spaceId = valuePurposeV17('affiliationSpaceV17'), space = purposeSpacesV16[spaceId]; if (!space) return;
  if (rebuildProjects) document.getElementById('affiliationProjectV17').innerHTML = selectedOptionsV2([['', '프로젝트 없음'], ...Object.entries(space.projects).map(([id, project]) => [id, project.name])], '');
  const assignee = document.getElementById('assigneeV17'), selected = assignee.value;
  assignee.innerHTML = selectedOptionsV2(membersPurposeV17(spaceId).map(m => [m.id, m.name]), membersPurposeV17(spaceId).some(m => m.id === selected) ? selected : 'me');
  document.getElementById('assigneeFieldV17').classList.toggle('hidden', panel.dataset.affiliationKind !== 'task' || !sharedPurposeV17(spaceId));
  const movedToShared = panel.dataset.itemId && sharedPurposeV17(spaceId) && (panel.dataset.affiliationKind === 'task' ? panel.dataset.originalSpace !== spaceId : valuePurposeV17('scheduleVisibilityV17') === 'shared' && (panel.dataset.originalSpace !== spaceId || panel.dataset.originalVisibility !== 'shared'));
  const visibility = document.getElementById('scheduleVisibilityV17');
  if (visibility) { visibility.querySelector('[value=shared]').disabled = spaceId === 'personal'; if (spaceId === 'personal') visibility.value = 'personal'; }
  document.getElementById('sharingWarningV17').classList.toggle('hidden', !movedToShared);
  const form = panel.closest('form'); form.dataset.purposeSpace = spaceId; form.dataset.purposeProject = valuePurposeV17('affiliationProjectV17');
}
function readAffiliationPurposeV17() {
  const space = valuePurposeV17('affiliationSpaceV17'), project = valuePurposeV17('affiliationProjectV17');
  return { space, project, visibility: valuePurposeV17('scheduleVisibilityV17') || 'personal' };
}
function validateAffiliationPurposeV17() {
  const target = readAffiliationPurposeV17(), fieldError = document.getElementById('taskErrorV2') || document.getElementById('scheduleErrorV2');
  const fail = message => { if (fieldError) fieldError.textContent = message; return false; };
  if (!purposeSpacesV16[target.space] || (target.project && !purposeSpacesV16[target.space].projects[target.project])) return fail('올바른 스페이스와 프로젝트를 선택하세요.');
  if (!document.getElementById('sharingWarningV17').classList.contains('hidden') && !document.getElementById('shareHistoryConfirmedV17').checked) return fail('이동 전 기록의 공개 범위를 확인하세요.');
  return true;
}
const taskFormBeforeCrudV17 = openTaskFormV2;
openTaskFormV2 = function (id) {
  taskFormBeforeCrudV17(id);
  const form = document.querySelector('.dialog form'), original = tasks.find(t => t.id === id);
  const assignment = original ? taskSpaceV16(original) : currentView === 'tasks' ? { space: purposeSpaceStateV16.space, project: purposeSpaceStateV16.project || '' } : { space: 'personal', project: '' };
  form.querySelector('.space-form-destination')?.remove();
  form.insertAdjacentHTML('afterbegin', affiliationMarkupPurposeV17(assignment, 'task', id));
  updateAffiliationPurposeV17(false);
};
const taskSubmitBeforeCrudV17 = submitTaskV2;
submitTaskV2 = function (id) {
  if (!validateAffiliationPurposeV17()) return;
  const target = readAffiliationPurposeV17(), assignee = valuePurposeV17('assigneeV17') || 'me', moveSchedules = document.getElementById('moveLinkedSchedulesV17')?.checked;
  const ids = new Set(tasks.map(t => t.id)), previous = tasks.find(t => t.id === id), source = previous ? taskSpaceV16(previous) : null;
  const linkedLocations = previous ? scheduled.filter(s => s.taskId === id).map(s => [s.id, { ...scheduleSpacePurposeV17(s) }]) : [];
  taskSubmitBeforeCrudV17(id);
  if (document.getElementById('taskTitleV2')) return;
  const saved = id ? tasks.find(t => t.id === id) : tasks.find(t => !ids.has(t.id)); if (!saved) return;
  linkedLocations.forEach(([scheduleId, location]) => { purposeCrudV17.schedules[scheduleId] = location; });
  purposeSpaceStateV16.assignments[saved.id] = { space: target.space, project: target.project };
  purposeCrudV17.assignees[saved.id] = assignee;
  recordPurposeV17('task', saved.id, source && (source.space !== target.space || source.project !== target.project) ? '소속 변경 · ' + purposeSpacesV16[target.space].name : id ? '작업 내용 수정' : '작업 생성');
  if (moveSchedules) scheduled.filter(s => s.taskId === saved.id).forEach(s => { purposeCrudV17.schedules[s.id] = { ...target }; recordPurposeV17('schedule', s.id, '연결된 작업과 소속 이동'); });
  refreshPurposeCrudV17();
};
const taskCardBeforeCrudV17 = taskHTML;
taskHTML = function (task) {
  const html = taskCardBeforeCrudV17(task), assignment = taskSpaceV16(task);
  if (!sharedPurposeV17(assignment.space)) return html;
  const member = membersPurposeV17(assignment.space).find(m => m.id === (purposeCrudV17.assignees[task.id] || 'me'));
  return html.replace('<div class="task-meta">', '<div class="task-meta"><span class="purpose-assignee">담당 ' + esc(member?.name || '나') + '</span>');
};
const taskDetailBeforeCrudV17 = openDetail;
openDetail = function (id) {
  taskDetailBeforeCrudV17(id); const task = tasks.find(t => t.id === id); if (!task) return;
  const assignment = taskSpaceV16(task), space = purposeSpacesV16[assignment.space], project = space.projects[assignment.project], member = membersPurposeV17(assignment.space).find(m => m.id === (purposeCrudV17.assignees[id] || 'me'));
  document.querySelector('.dialog .detail-grid')?.insertAdjacentHTML('beforeend', '<div><small>담당자</small><strong>' + esc(member?.name || '나') + '</strong></div>');
  const context = '<section class="detail-section"><h3>목적과 프로젝트</h3><p>' + esc(space.purpose || '목적 없이 기록한 작업입니다.') + '</p>' + (project?.outcome ? '<p>기여할 성과 · ' + esc(project.outcome) + '</p>' : '') + '<button class="btn" onclick="openTaskFormV2(' + id + ')">소속·담당자 변경</button>' + (sharedPurposeV17(assignment.space) ? '<p class="subtitle">참여자 모두가 같은 작업과 상태를 관리하며, 이동 전 기록도 볼 수 있어요.</p>' : '') + '</section>' + historyPurposeV17('task', id);
  document.querySelector('.dialog .detail-actions')?.insertAdjacentHTML('beforebegin', context);
};
const toggleTaskBeforeCrudV17 = toggleTask;
toggleTask = function (id) { const before = tasks.find(t => t.id === id)?.done; toggleTaskBeforeCrudV17(id); const after = tasks.find(t => t.id === id)?.done; if (before !== after) { recordPurposeV17('task', id, after ? '작업 완료' : '작업 재개'); persistPurposeCrudV17(); } };
function tasksForTodayV17() {
  if (!purposeCrudReadyV17) return tasks;
  return tasks.filter(task => !(purposeCrudV17.leftSpaces || []).includes(taskSpaceV16(task).space) && (purposeCrudV17.assignees[task.id] || 'me') === 'me');
}
const scheduleFormBeforeCrudV17 = openScheduleFormV2;
openScheduleFormV2 = function (id, taskId) {
  scheduleFormBeforeCrudV17(id, taskId);
  const schedule = scheduled.find(s => s.id === id), task = tasks.find(t => t.id === (schedule?.taskId || taskId));
  const assignment = schedule ? scheduleSpacePurposeV17(schedule) : task ? { ...taskSpaceV16(task), visibility: 'personal' } : { space: currentView === 'tasks' ? purposeSpaceStateV16.space : 'personal', project: currentView === 'tasks' ? purposeSpaceStateV16.project : '', visibility: 'personal' };
  document.querySelector('.dialog form').insertAdjacentHTML('afterbegin', affiliationMarkupPurposeV17(assignment, 'schedule', id));
  updateAffiliationPurposeV17(false);
};
const scheduleSubmitBeforeCrudV17 = submitScheduleV2;
submitScheduleV2 = function (id, taskId) {
  if (!validateAffiliationPurposeV17()) return;
  const target = readAffiliationPurposeV17(), previous = new Set(scheduled.map(s => s.id));
  scheduleSubmitBeforeCrudV17(id, taskId);
  if (document.getElementById('scheduleTitleV2')) return;
  const saved = id ? scheduled.find(s => s.id === id) : scheduled.find(s => !previous.has(s.id)); if (!saved) return;
  purposeCrudV17.schedules[saved.id] = target;
  recordPurposeV17('schedule', saved.id, id ? '일정 내용·소속 수정' : '일정 생성');
  refreshPurposeCrudV17();
};
const scheduleCardBeforeCrudV17 = scheduleHTMLV2;
scheduleHTMLV2 = function (schedule) {
  const target = scheduleSpacePurposeV17(schedule), space = purposeSpacesV16[target.space];
  return scheduleCardBeforeCrudV17(schedule).replace('<div class="schedule-caption">', '<div class="schedule-caption"><span class="purpose-schedule-affiliation">' + esc(space.name + (target.project ? ' › ' + (space.projects[target.project]?.name || '') : '')) + '</span>');
};
const scheduleDetailBeforeCrudV17 = openScheduleDetailV2;
openScheduleDetailV2 = function (id) {
  scheduleDetailBeforeCrudV17(id); const schedule = scheduled.find(s => s.id === id); if (!schedule) return;
  const target = scheduleSpacePurposeV17(schedule), space = purposeSpacesV16[target.space];
  document.querySelector('.dialog .detail-grid')?.insertAdjacentHTML('beforeend', '<div><small>스페이스·프로젝트</small><strong>' + esc(space.name + (target.project ? ' › ' + (space.projects[target.project]?.name || '') : '')) + '</strong></div><div><small>보기 범위</small><strong>' + (target.visibility === 'shared' ? '스페이스 참여자' : '내 일정') + '</strong></div>');
  document.querySelector('.dialog .detail-actions')?.insertAdjacentHTML('beforebegin', historyPurposeV17('schedule', id));
};
const spaceDialogBeforeCrudV17 = renderSpaceDialogV16;
renderSpaceDialogV16 = function () {
  spaceDialogBeforeCrudV17();
  (purposeCrudV17.leftSpaces || []).forEach(id => spaceDialogV16.querySelector('[data-space="' + id + '"]')?.remove());
  spaceDialogV16.querySelector('.space-switcher-footer').insertAdjacentHTML('beforebegin', '<div class="purpose-picker-actions"><button type="button" data-create-purpose>' + icon('plus') + '목적 스페이스 만들기</button><button type="button" data-manage-purpose>' + icon('help') + '선택한 스페이스 관리</button></div>');
  const openFromPicker = callback => { spaceDialogV16.close(); requestAnimationFrame(callback); };
  spaceDialogV16.querySelector('[data-create-purpose]').addEventListener('click', () => openFromPicker(openNewPurposeSpaceV17));
  spaceDialogV16.querySelector('[data-manage-purpose]').addEventListener('click', () => openFromPicker(() => openManagePurposeV17()));
};
const spaceChromeBeforeCrudV17 = renderPurposeChromeV16;
renderPurposeChromeV16 = function () {
  if (!purposeSpacesV16[purposeSpaceStateV16.space] || (purposeCrudV17.leftSpaces || []).includes(purposeSpaceStateV16.space)) { purposeSpaceStateV16.space = 'personal'; purposeSpaceStateV16.project = ''; }
  const space = purposeSpacesV16[purposeSpaceStateV16.space];
  if (purposeSpaceStateV16.project && !space.projects[purposeSpaceStateV16.project]) purposeSpaceStateV16.project = '';
  spaceChromeBeforeCrudV17();
  projectsNavV16.classList.remove('hidden');
  projectsNavV16.insertAdjacentHTML('beforeend', '<button type="button" class="purpose-create-link" onclick="openProjectEditorV17()">' + icon('plus') + '<span>프로젝트 만들기</span></button><button type="button" class="purpose-create-link" onclick="openManagePurposeV17()">스페이스 관리</button>');
  mobileProjectsV16.classList.toggle('hidden', currentView !== 'tasks');
  mobileProjectsV16.insertAdjacentHTML('beforeend', '<button type="button" onclick="openProjectEditorV17()">+ 프로젝트</button>');
  document.querySelectorAll('.purpose-manage-action').forEach(element => element.remove());
  if (currentView === 'tasks') {
    document.querySelector('.head-actions').insertAdjacentHTML('afterbegin', '<button type="button" class="btn purpose-manage-action" onclick="openManagePurposeV17(\'' + (purposeSpaceStateV16.project ? 'projects' : 'purpose') + '\')">' + (purposeSpaceStateV16.project ? '프로젝트 관리' : '스페이스 관리') + '</button>');
    if (!space.purpose) {
      purposeContextV16.classList.remove('hidden');
      purposeContextV16.innerHTML = '<p>목적을 작성하면 이 스페이스에서 하려는 일을 함께 확인할 수 있어요.</p><button class="btn" onclick="openPurposeEditorV17()">목적 작성</button>' + (selectedPurposeProjectV16() ? '<button class="btn" onclick="togglePurposeProjectV16()">' + (purposeSpaceStateV16.completed[purposeSpaceStateV16.space + '/' + purposeSpaceStateV16.project] ? '프로젝트 재개' : '프로젝트 완료') + '</button>' : '');
    }
  }
};
const resetBeforeCrudV17 = resetDemo;
resetDemo = function () {
  Object.keys(purposeSpacesV16).forEach(key => delete purposeSpacesV16[key]); Object.assign(purposeSpacesV16, structuredClone(initialPurposeModelV17));
  purposeCrudV17 = { assignees: {}, schedules: {}, history: {}, invitations: [], trash: [] };
  resetBeforeCrudV17(); persistPurposeCrudV17();
};
const taskListBeforeCrudV17 = renderTasks;
renderTasks = function () {
  taskListBeforeCrudV17();
  if (currentView === 'tasks' && !tasks.some(taskInPurposeScopeV16)) {
    const project = selectedPurposeProjectV16();
    document.getElementById('taskList').innerHTML = '<div class="purpose-empty"><strong>' + (project ? '프로젝트의 첫 작업을 적어보세요.' : '이 스페이스의 첫 작업을 적어보세요.') + '</strong><p>목적이나 프로젝트를 먼저 정하지 않아도 바로 기록할 수 있어요.</p><button class="btn primary" onclick="openTaskFormV2()">작업 추가</button></div>';
  }
};
// Keep the management flow modal on touch and keyboard, including nested editor transitions.
const modalBeforePurposeV17 = modal, closeBeforePurposeV17 = closeModal;
let modalOriginPurposeV17 = null, modalOverflowPurposeV17 = '', modalInertPurposeV17 = [];
modal = function (content) {
  if (!document.querySelector('.overlay')) {
    modalOriginPurposeV17 = document.activeElement; modalOverflowPurposeV17 = document.body.style.overflow;
    modalInertPurposeV17 = [...document.body.children].filter(el => !['modalRoot', 'toastRoot'].includes(el.id) && !['SCRIPT', 'STYLE'].includes(el.tagName)).map(el => [el, el.inert]);
  }
  modalBeforePurposeV17(content);
  modalInertPurposeV17.forEach(([el]) => { el.inert = true; });
  document.body.style.overflow = 'hidden';
};
closeModal = function () {
  closeBeforePurposeV17();
  modalInertPurposeV17.forEach(([el, inert]) => { el.inert = inert; }); modalInertPurposeV17 = [];
  document.body.style.overflow = modalOverflowPurposeV17;
  const visibleOrigin = modalOriginPurposeV17?.isConnected && modalOriginPurposeV17.getClientRects().length && !modalOriginPurposeV17.closest('[inert],dialog:not([open])');
  const focusTarget = visibleOrigin ? modalOriginPurposeV17 : matchMedia('(max-width:760px)').matches ? mobileSpacePickerV16 : document.getElementById('purposeSpacePickerV16');
  focusTarget?.focus({ preventScroll: true });
  modalOriginPurposeV17 = null;
};
scheduled.forEach(s => { if (!purposeCrudV17.schedules[s.id]) purposeCrudV17.schedules[s.id] = { ...scheduleSpacePurposeV17(s) }; });
purposeCrudReadyV17 = true;
renderPurposeChromeV16(); renderTasks(); renderTimeline();
