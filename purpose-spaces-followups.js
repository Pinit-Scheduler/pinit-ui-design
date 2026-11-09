/* Spaces follow-ups (0.21.0): the seven screen decisions from the per-page review, drawn on top of the hub (0.18–0.20).
   Example data only. Disabled actions and their reasons are static example records standing in for the server's
   allowedActions; the conflict is a staged example of the server's version conflict. This file decides no permission,
   membership, assignee release or conflict. */
const followupNarrowV21 = () => matchMedia('(max-width:899px)').matches;

// Example per-item actions (stand-in for allowedActions on each task in 주말 러닝 모임, where 나 is not an administrator).
const followupItemActionsV21 = { 107: { move: false, delete: false }, 108: { move: false, delete: false }, 109: { move: false, delete: false }, 110: { restore: false } };
function followupItemActionsForV21(id) { return followupItemActionsV21[id] || {}; }
function followupReasonV21(spaceId) { return hubActionsV18(spaceId).reason || '이 스페이스에서는 할 수 없어요.'; }
function followupReasonHTMLV21(spaceId) { return '<p class="hub-reason unavailable-reason">' + esc(followupReasonV21(spaceId)) + '</p>'; }

function followupSeedV21() {
  if (!trashV2.some(entry => entry.item.id === 110) && !tasks.some(task => task.id === 110)) {
    trashV2.push({ kind: 'task', item: { id: 110, title: '대회 당일 집합 장소 공지', category: '개인', tags: ['개인'], due: '2026-11-08', importance: 4, difficulty: 2, duration: 20, done: false, ready: true, previous: [], next: [], archived: false, description: '스페이스 후속 시안의 예시 작업이에요. 관리자 서연님이 휴지통으로 옮겼어요.' } });
  }
  purposeSpaceStateV16.assignments[110] = { space: 'running', project: 'race' };
  purposeCrudV17.assignees[110] = 'seoyeon';
  purposeCrudV17.followupSeedV21 = true;
  save(); savePurposeSpacesV16();
}
if (!purposeCrudV17.followupSeedV21) followupSeedV21();

/* 1. Up to 899px the sidebar is hidden (as in pinit-fe), so the space button sits in the top bar there too. */
positionSpaceDialogV16 = function () {
  const trigger = followupNarrowV21() ? mobileSpacePickerV16 : document.getElementById('purposeSpacePickerV16');
  const bounds = trigger.getBoundingClientRect();
  spaceDialogV16.style.setProperty('--space-panel-left', Math.max(12, Math.min(bounds.left, innerWidth - 332)) + 'px');
  spaceDialogV16.style.setProperty('--space-panel-top', Math.min(bounds.bottom + 10, innerHeight - 360) + 'px');
};
const closeModalBeforeFollowupV21 = closeModal;
let followupConflictLockV21 = false;
closeModal = function () {
  if (followupConflictLockV21) return;
  closeModalBeforeFollowupV21();
  if (followupNarrowV21() && (!document.activeElement || document.activeElement === document.body)) mobileSpacePickerV16.focus({ preventScroll: true });
};
const chromeBeforeFollowupV21 = renderPurposeChromeV16;
renderPurposeChromeV16 = function () {
  chromeBeforeFollowupV21();
  const state = purposeSpaceStateV16, space = purposeSpacesV16[state.space], project = space.projects[state.project];
  const label = space.name + (project && ['tasks', 'schedules'].includes(currentView) ? ' › ' + project.name : '');
  mobileSpacePickerV16.querySelector('.space-trigger-title').textContent = label;
  mobileSpacePickerV16.setAttribute('aria-label', '스페이스 전환. 지금 ' + label);
};

/* 2. In the narrow sheet, the selected space opens its project list right below it. */
const sheetBeforeFollowupV21 = renderSpaceDialogV16;
renderSpaceDialogV16 = function () {
  sheetBeforeFollowupV21();
  if (!followupNarrowV21()) return;
  const state = purposeSpaceStateV16, space = purposeSpacesV16[state.space], ids = Object.keys(space.projects);
  const option = spaceDialogV16.querySelector('.space-switcher-option[data-space="' + state.space + '"]');
  if (!option || !ids.length) return;
  option.classList.add('is-expanded');
  const rows = [['', '스페이스의 모든 작업'], ...ids.map(id => [id, space.projects[id].name])];
  option.insertAdjacentHTML('afterend', '<div class="sheet-projects" role="group" aria-label="' + esc(space.name) + '의 프로젝트">' + rows.map(([id, name]) => '<button type="button" class="sheet-project" data-sheet-project="' + id + '" aria-pressed="' + (state.project === id) + '"><span>' + esc(name) + '</span>' + (state.completed[state.space + '/' + id] ? '<small>완료</small>' : '') + '<span class="space-switcher-check" aria-hidden="true">' + (state.project === id ? icon('check') : '') + '</span></button>').join('') + '</div>');
};
function followupChooseProjectV21(projectId) {
  const state = purposeSpaceStateV16;
  if (currentView === 'schedules') { state.project = projectId; savePurposeSpacesV16(); renderPurposeChromeV16(); renderTasks(); return; }
  // Lists stay on screen; screens with a fixed scope (오늘, 통계, 휴지통) go to the task list, as in FE phase A.
  openPurposeProjectV16(state.space, projectId);
}
spaceDialogV16.addEventListener('click', event => {
  if (!followupNarrowV21()) return;
  const project = event.target.closest('[data-sheet-project]');
  if (project) { event.stopPropagation(); followupChooseProjectV21(project.dataset.sheetProject); spaceDialogV16.close(); return; }
  const option = event.target.closest('.space-switcher-option[data-space]');
  if (!option || !Object.keys(purposeSpacesV16[option.dataset.space]?.projects || {}).length) return;
  event.stopPropagation();
  if (option.dataset.space !== purposeSpaceStateV16.space) choosePurposeSpaceV16(option.dataset.space);
  renderSpaceDialogV16();
  spaceDialogV16.querySelector('[data-sheet-project][aria-pressed="true"]')?.focus();
}, true);

/* 3. Outside the hub, unavailable actions stay visible, grey, with one line saying why (example reasons). */
const detailBeforeFollowupV21 = openDetail;
openDetail = function (id) {
  detailBeforeFollowupV21(id);
  const task = tasks.find(item => item.id === id), actions = followupItemActionsForV21(id);
  document.querySelectorAll('.dialog .detail-grid > div').forEach(cell => { if (cell.querySelector('small')?.textContent === '카테고리') cell.remove(); });
  if (!task || actions.delete !== false) return;
  const remove = [...document.querySelectorAll('.dialog .detail-actions button')].find(button => (button.getAttribute('onclick') || '').includes('confirmTrashV2'));
  if (!remove) return;
  remove.disabled = true;
  remove.closest('.detail-actions').insertAdjacentHTML('afterend', followupReasonHTMLV21(taskSpaceV16(task).space).replace('<p class="', '<p class="detail-reason '));
};
const trashBeforeFollowupV21 = renderTrashV2;
renderTrashV2 = function () {
  trashBeforeFollowupV21();
  trashV2.forEach(({ kind, item }) => {
    if (kind !== 'task' || followupItemActionsForV21(item.id).restore !== false) return;
    const button = document.querySelector('#alternatePanel .setting-row button[onclick="restoreTrashV2(\'task\',' + item.id + ')"]');
    if (!button) return;
    button.disabled = true;
    const row = button.closest('.setting-row');
    row.classList.add('has-reason');
    row.insertAdjacentHTML('beforeend', followupReasonHTMLV21(taskSpaceV16(item).space));
    const label = row.querySelector('span small');
    if (label) label.textContent = '작업 · ' + purposeSpacesV16[taskSpaceV16(item).space].name;
  });
};

/* 4. One conflict dialog. The latest content loads into the form; my input stays readable and copyable. No auto-overwrite. */
const followupConflictTaskV21 = 104;
let followupConflictShownV21 = false, followupMyInputV21 = null;
function followupReadInputV21(task) {
  const read = id => document.getElementById(id)?.value ?? '';
  const fields = [['제목', read('taskTitleV2'), task.title], ['설명', read('taskDescriptionV2'), task.description || ''], ['마감일', read('taskDueV2'), task.due], ['예상 시간(분)', read('taskDurationV2'), String(task.duration ?? '')]];
  return fields.filter(([, mine, before]) => String(mine).trim() !== String(before).trim()).map(([label, value]) => ({ label, value }));
}
function followupMyInputHTMLV21(open) {
  const rows = followupMyInputV21 || [];
  const body = rows.length
    ? '<dl>' + rows.map((row, index) => '<div><dt>' + esc(row.label) + '</dt><dd><span>' + esc(row.value || '(비움)') + '</span><button type="button" class="text-btn" onclick="followupCopyV21(' + index + ')">복사</button></dd></div>').join('') + '</dl><button type="button" class="btn" onclick="followupCopyV21()">모두 복사</button>'
    : '<p>바꾼 내용이 없어요.</p>';
  return '<details class="conflict-mine"' + (open ? ' open' : '') + '><summary>' + (open ? '내 입력 보기' : '저장하지 못한 내 입력 보기') + '</summary>' + body + '</details>';
}
function followupCopyV21(index) {
  const rows = followupMyInputV21 || [], text = index === undefined ? rows.map(row => row.label + ': ' + row.value).join('\n') : rows[index]?.value || '';
  const fail = () => toast('복사하지 못했어요. 내용을 직접 선택해 복사하세요.');
  try { navigator.clipboard.writeText(text).then(() => toast('복사했어요.'), fail); } catch (_) { fail(); }
}
const submitTaskBeforeFollowupV21 = submitTaskV2;
submitTaskV2 = function (id) {
  if (id !== followupConflictTaskV21 || followupConflictShownV21) return submitTaskBeforeFollowupV21(id);
  const task = tasks.find(item => item.id === id);
  if (!task) return submitTaskBeforeFollowupV21(id);
  // Staged example: another participant saved this task first, so the server rejects this save with a version conflict.
  followupConflictShownV21 = true;
  followupMyInputV21 = followupReadInputV21(task);
  Object.assign(task, { title: '첫 작업 기록 안내 초안과 예시 문장', due: '2026-11-05', description: '처음 온 사람이 그대로 따라 쓸 예시 문장 두 개를 넣었어요.' });
  save(); renderTasks();
  closeModal();
  modal('<div class="dialog-head"><h2 id="dialogTitle">다른 참여자가 먼저 수정했어요</h2></div><p>저장하기 전에 이 작업이 바뀌어서 내 입력은 저장되지 않았어요. 최신 내용을 불러온 뒤 필요한 내용만 다시 입력하세요.</p>' + followupMyInputHTMLV21(true) + '<div class="dialog-actions"><button type="button" class="btn primary" onclick="followupLoadLatestV21()">최신 내용 불러오기</button></div>');
  document.querySelector('.overlay')?.removeAttribute('onclick');
  document.querySelector('.dialog')?.classList.add('conflict-dialog');
  followupConflictLockV21 = true;
};
function followupLoadLatestV21() {
  followupConflictLockV21 = false;
  closeModal();
  openTaskFormV2(followupConflictTaskV21);
  document.querySelector('.dialog form')?.insertAdjacentHTML('afterbegin', followupMyInputHTMLV21(false));
}
addEventListener('keydown', event => { if (followupConflictLockV21 && event.key === 'Escape') event.stopImmediatePropagation(); }, true);

/* 5. Affiliation as one summary line at the top of the form; choosing a space shows its effects right away. */
function followupNameV21(spaceId, memberId) {
  if (memberId === 'none') return '담당자 미정';
  if (memberId === 'me') return '나';
  return Object.values(purposeSpacesV16).flatMap(space => space.members || []).find(member => member.id === memberId)?.name || '이전 참여자';
}
function followupAffiliationV21() {
  const panel = document.querySelector('.purpose-affiliation');
  if (!panel || panel.dataset.followup) return;
  panel.dataset.followup = '1';
  const fields = document.createElement('div');
  fields.id = 'affiliationFieldsV21';
  fields.className = 'affiliation-fields';
  fields.hidden = true;
  [...panel.children].forEach(child => { if (child.tagName === 'H3') child.remove(); else fields.append(child); });
  panel.append(fields);
  const impact = '<ul class="affiliation-impact hidden" id="affiliationImpactV21"></ul>';
  const warning = document.getElementById('sharingWarningV17');
  if (warning) warning.insertAdjacentHTML('beforebegin', impact); else fields.insertAdjacentHTML('beforeend', impact);
  panel.insertAdjacentHTML('afterbegin', '<button type="button" class="affiliation-summary" id="affiliationSummaryV21" aria-expanded="false" aria-controls="affiliationFieldsV21" onclick="followupToggleAffiliationV21()"></button><p class="sr-only" id="affiliationLiveV21" aria-live="polite"></p>');
  // Linked schedules always move with their task (confirmed policy), so the optional checkbox and its paragraph go.
  const linked = document.getElementById('moveLinkedSchedulesV17')?.closest('label');
  if (linked) { linked.classList.add('hidden'); linked.nextElementSibling?.classList.add('hidden'); }
  const itemId = Number(panel.dataset.itemId) || 0, task = tasks.find(item => item.id === itemId);
  if (panel.dataset.affiliationKind === 'task' && task && followupItemActionsForV21(itemId).move === false) {
    ['affiliationSpaceV17', 'affiliationProjectV17'].forEach(id => { const select = document.getElementById(id); if (select) select.disabled = true; });
    fields.querySelector('.form-row')?.insertAdjacentHTML('afterend', followupReasonHTMLV21(taskSpaceV16(task).space));
  }
  panel.dataset.originalAssignee = document.getElementById('assigneeV17')?.value || 'me';
  panel.dataset.lastSpace = panel.dataset.originalSpace;
  followupAffiliationRefreshV21();
}
function followupToggleAffiliationV21(force) {
  const button = document.getElementById('affiliationSummaryV21'), fields = document.getElementById('affiliationFieldsV21');
  if (!button || !fields) return;
  const open = force ?? fields.hidden;
  fields.hidden = !open;
  button.setAttribute('aria-expanded', String(open));
  button.querySelector('.affiliation-summary-action').textContent = open ? '접기' : '바꾸기';
  if (open) document.getElementById('affiliationSpaceV17')?.focus();
}
function followupAffiliationRefreshV21() {
  const panel = document.querySelector('.purpose-affiliation');
  if (!panel?.dataset.followup) return;
  const spaceId = valuePurposeV17('affiliationSpaceV17'), space = purposeSpacesV16[spaceId];
  if (!space) return;
  const project = space.projects[valuePurposeV17('affiliationProjectV17')], kind = panel.dataset.affiliationKind;
  const itemId = Number(panel.dataset.itemId) || 0, moved = Boolean(itemId) && panel.dataset.originalSpace !== spaceId;
  const changedSpace = panel.dataset.lastSpace !== spaceId, noun = kind === 'task' ? '작업' : '일정';
  panel.dataset.lastSpace = spaceId;
  const lines = [], assignee = document.getElementById('assigneeV17');
  // Example of the backend rule (WorkspaceResourceService.clearForeignAssignee): a non-member assignee is released on move.
  const before = panel.dataset.originalAssignee;
  if (kind === 'task' && assignee && moved && before && !['none', 'me'].includes(before) && !membersPurposeV17(spaceId).some(member => member.id === before)) {
    if (changedSpace) assignee.value = 'none';
    lines.push(['release', '담당자 ' + followupNameV21(spaceId, before) + '님은 ' + space.name + ' 참여자가 아니라서 담당이 해제돼요.']);
  }
  if (spaceId === 'personal') { if (moved) lines.push(['share', '나의 스페이스는 나만 볼 수 있어요.']); }
  else if (sharedPurposeV17(spaceId)) lines.push(['share', space.name + ' 참여자 ' + membersPurposeV17(spaceId).length + '명이 이 ' + noun + '을 함께 봐요.']);
  if (kind === 'task' && moved) {
    const linked = scheduled.filter(item => item.taskId === itemId).length, checkbox = document.getElementById('moveLinkedSchedulesV17');
    if (checkbox) checkbox.checked = true;
    if (linked) lines.push(['schedule', '연결된 일정 ' + linked + '개도 함께 옮겨져요.']);
    const task = tasks.find(item => item.id === itemId);
    if ((task?.previous || []).length + (task?.next || []).length) lines.push(['link', '다른 스페이스에 남는 이전·다음 작업과의 연결은 해제돼요.']);
  }
  const list = document.getElementById('affiliationImpactV21');
  list.innerHTML = lines.map(([type, text]) => '<li class="is-' + type + '">' + esc(text) + '</li>').join('');
  list.classList.toggle('hidden', !lines.length);
  if (changedSpace) document.getElementById('affiliationLiveV21').textContent = lines.map(([, text]) => text).join(' ');
  const who = kind === 'task' ? valuePurposeV17('assigneeV17') || 'me' : (itemId ? hubScheduleAssigneeV18(scheduled.find(item => item.id === itemId) || {}) : 'me');
  const summary = document.getElementById('affiliationSummaryV21'), open = !document.getElementById('affiliationFieldsV21').hidden;
  summary.innerHTML = hubMarkV18(spaceId) + '<span class="affiliation-summary-text"><strong>' + esc(space.name) + (project ? ' › ' + esc(project.name) : '') + '</strong>, ' + (who === 'none' ? '담당자 미정' : '담당 ' + esc(followupNameV21(spaceId, who))) + '</span><span class="affiliation-summary-action">' + (open ? '접기' : '바꾸기') + '</span>';
  summary.setAttribute('aria-label', '소속 ' + space.name + (project ? ' ' + project.name : '') + ', ' + (who === 'none' ? '담당자 미정' : '담당 ' + followupNameV21(spaceId, who)) + '. ' + (open ? '접기' : '바꾸기'));
}
const affiliationBeforeFollowupV21 = updateAffiliationPurposeV17;
updateAffiliationPurposeV17 = function (rebuildProjects = true) { affiliationBeforeFollowupV21(rebuildProjects); followupAffiliationRefreshV21(); };
function followupFormCleanupV21() {
  const form = document.querySelector('.dialog form');
  if (!form) return;
  // 6. Projects are chosen in the affiliation line; the old category picker is no longer shown.
  const categories = form.querySelector('.category-section-v3');
  if (categories) {
    categories.classList.add('hidden');
    if (!form.querySelector('[name=primaryCategoryV3]:checked')) { const none = form.querySelector('[name=primaryCategoryV3][value=""]'); if (none) none.checked = true; }
  }
  followupAffiliationV21();
}
const taskFormBeforeFollowupV21 = openTaskFormV2;
openTaskFormV2 = function (id) { taskFormBeforeFollowupV21(id); followupFormCleanupV21(); };
const scheduleFormBeforeFollowupV21 = openScheduleFormV2;
openScheduleFormV2 = function (id, taskId) { scheduleFormBeforeFollowupV21(id, taskId); followupFormCleanupV21(); };
document.addEventListener('change', event => { if (event.target.id === 'assigneeV17') followupAffiliationRefreshV21(); });

/* 6. Categories become projects: cards show "스페이스 › 프로젝트" only beyond the current scope; no category badge. */
const taskCardBeforeFollowupV21 = taskHTML;
taskHTML = function (task) {
  const html = taskCardBeforeFollowupV21(task).replace(/<span class="primary-category-v3">[^<]*<\/span>/, '');
  const at = taskSpaceV16(task);
  if (['tasks', 'schedules'].includes(currentView)) {
    const project = purposeSpacesV16[at.space].projects[at.project];
    const path = /<div class="space-task-context">[\s\S]*?<\/button><\/div>/;
    if (purposeSpaceStateV16.project || !project) return html.replace(path, '');
    return html.replace(path, '<div class="space-task-context"><span class="space-task-project">' + esc(project.name) + '</span></div>');
  }
  return html.replace('<button type="button" class="space-task-link"', '<button type="button" class="space-task-link has-mark"').replace(/(<button type="button" class="space-task-link has-mark"[^>]*>)/, '$1' + hubMarkV18(at.space));
};
const scheduleCardBeforeFollowupV21 = scheduleHTMLV2;
scheduleHTMLV2 = function (item) {
  const html = scheduleCardBeforeFollowupV21(item).replace(/<span class="schedule-category-v3">[^<]*<\/span>/, '');
  if (currentView !== 'schedules') return html;
  const at = scheduleSpacePurposeV17(item), project = purposeSpacesV16[at.space]?.projects[at.project];
  const path = /<span class="purpose-schedule-affiliation">[^<]*<\/span>/;
  return purposeSpaceStateV16.project || !project ? html.replace(path, '') : html.replace(path, '<span class="purpose-schedule-affiliation">' + esc(project.name) + '</span>');
};
const scheduleDetailBeforeFollowupV21 = openScheduleDetailV2;
openScheduleDetailV2 = function (id) {
  scheduleDetailBeforeFollowupV21(id);
  document.querySelectorAll('.dialog .detail-grid > div').forEach(cell => { if (cell.querySelector('small')?.textContent === '카테고리') cell.remove(); });
};
const modalBeforeFollowupV21 = modal;
modal = function (content) {
  modalBeforeFollowupV21(content);
  // The filter dialog keeps its other controls; the category filter and its manager are replaced by projects in the sidebar and sheet.
  document.getElementById('categoryFilterV3')?.closest('.field')?.remove();
  [...document.querySelectorAll('.dialog button')].filter(button => button.textContent.trim() === '카테고리 관리').forEach(button => button.remove());
};
const statsBeforeFollowupV21 = renderStats;
renderStats = function () {
  statsBeforeFollowupV21();
  const panel = document.getElementById('alternatePanel');
  const category = [...panel.querySelectorAll('.stats-chart-panel')].find(section => section.querySelector('h2')?.textContent === '카테고리별 완료 시간');
  const mine = panel.querySelector('.hub-my-breakdown');
  if (category && mine) category.replaceWith(mine); else category?.remove();
};

const resetBeforeFollowupV21 = resetDemo;
resetDemo = function () { followupConflictShownV21 = false; followupMyInputV21 = null; followupConflictLockV21 = false; resetBeforeFollowupV21(); followupSeedV21(); renderPurposeChromeV16(); renderTasks(); };

renderPurposeChromeV16(); renderTasks();
