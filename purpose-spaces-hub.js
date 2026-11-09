/* Spaces hub (0.18.0): one place to read every space's purpose, project progress and who is working on what.
   Example data only. Capabilities shown here are static example records standing in for the server's allowedActions;
   this file does not decide permissions, invitation expiry or membership. */
paths.spaces = '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><path d="M17 13.5v7M13.5 17h7"/>';
paths.more = '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>';
const hubMarksV18 = ['#3e8391', '#9165b0', '#a77d35', '#43886b', '#ad6280'];
const hubAdminActionsV18 = { invite: true, leave: true, delete: true, manageMembers: true, deleteProject: true, reason: '' };
let hubMobileDetailV18 = false;

function hubSeedV18() {
  const spaces = purposeSpacesV16;
  if (spaces.career) Object.assign(spaces.career, { mark: '#9165b0', note: '혼자', members: [{ id: 'me', name: '나', role: 'admin' }], exampleActions: { ...hubAdminActionsV18 } });
  if (spaces.pinit) {
    Object.assign(spaces.pinit, {
      mark: '#3e8391', note: '3명',
      members: [{ id: 'me', name: '나', role: 'admin' }, { id: 'minji', name: '민지', role: 'member' }, { id: 'junho', name: '준호', role: 'member' }],
      exampleActions: { ...hubAdminActionsV18 }
    });
    spaces.pinit.projects.onboarding = { name: '온보딩 안내 정리', outcome: '처음 온 사람이 안내 없이 첫 작업을 기록하기' };
  }
  spaces.running = {
    name: '주말 러닝 모임', note: '3명', mark: '#a77d35',
    purpose: '올해 안에 모두 함께 10km를 완주하기',
    projects: { race: { name: '11월 대회 준비', outcome: '대회 당일 모두 같은 시간에 출발선에 서기' } },
    members: [{ id: 'seoyeon', name: '서연', role: 'admin' }, { id: 'me', name: '나', role: 'member' }, { id: 'dohyun', name: '도현', role: 'member' }],
    exampleActions: { invite: false, leave: true, delete: false, manageMembers: false, deleteProject: false, reason: '관리자 서연님만 할 수 있어요.' }
  };
  const examples = [
    [101, '카드 마감 표시 색 정리', 'pinit', '2026-10-27', true, 'pinit', 'cards', 'minji'],
    [102, '중요도·난이도 원형 크기 조정', 'pinit', '2026-10-30', false, 'pinit', 'cards', 'junho'],
    [103, '빈 목록 안내 문구 다듬기', 'pinit', '2026-10-31', false, 'pinit', 'cards', 'none'],
    [104, '첫 작업 기록 안내 초안', 'pinit', '2026-11-03', false, 'pinit', 'onboarding', 'minji'],
    [105, '온보딩 화면 캡처 정리', 'pinit', '2026-11-04', false, 'pinit', 'onboarding', 'none'],
    [106, '가이드 링크 점검', 'pinit', '2026-10-27', true, 'pinit', 'onboarding', 'me'],
    [107, '대회 참가 접수 확인', '개인', '2026-10-25', true, 'running', 'race', 'seoyeon'],
    [108, '주말 장거리 코스 정하기', '개인', '2026-10-31', false, 'running', 'race', 'me'],
    [109, '단체 티셔츠 수량 조사', '개인', '2026-11-02', false, 'running', 'race', 'none']
  ];
  examples.forEach(([id, title, category, due, done, space, project, assignee]) => {
    if (!tasks.some(task => task.id === id)) tasks.push({ id, title, category, due, importance: 5, difficulty: 3, duration: 30, done, description: '스페이스 허브 시안의 예시 작업이에요.', ready: !done });
    purposeSpaceStateV16.assignments[id] = { space, project };
    purposeCrudV17.assignees[id] = assignee;
  });
  purposeCrudV17.hubSeedV18 = true;
  save(); savePurposeSpacesV16();
}
function hubNormalizeV18() {
  let index = 0;
  Object.entries(purposeSpacesV16).forEach(([id, space]) => {
    if (id === 'personal') { space.mark = ''; return; }
    if (!space.mark) {
      const used = Object.values(purposeSpacesV16).map(item => item.mark);
      space.mark = hubMarksV18.find(color => !used.includes(color)) || hubMarksV18[index++ % hubMarksV18.length];
    }
    if (!space.exampleActions) {
      // A space created in the prototype: its creator is recorded as administrator in the example data.
      space.members = (space.members || [{ id: 'me', name: '나' }]).map(member => member.id === 'me' ? { ...member, role: 'admin' } : member);
      space.exampleActions = { ...hubAdminActionsV18 };
    }
  });
}
if (!purposeCrudV17.hubSeedV18) hubSeedV18();
hubNormalizeV18();

function hubSpaceIdsV18() {
  const left = purposeCrudV17.leftSpaces || [];
  return Object.keys(purposeSpacesV16).filter(id => !left.includes(id)).sort((a, b) => (a === 'personal' ? -1 : b === 'personal' ? 1 : 0));
}
function hubAssigneeV18(taskId) { return purposeCrudV17.assignees[taskId] || 'me'; }
function hubTasksV18(spaceId, projectId) {
  return tasks.filter(task => !task.archived).filter(task => {
    const at = taskSpaceV16(task);
    return at.space === spaceId && (projectId === undefined || at.project === projectId);
  });
}
function hubRunningV18(task) {
  return scheduled.some(item => item.taskId === task.id && ['IN_PROGRESS', 'SUSPENDED'].includes(item.state));
}
function hubStateV18(task) {
  if (task.done) return 'done';
  if (hubRunningV18(task)) return 'running';
  return hubAssigneeV18(task.id) === 'none' ? 'unassigned' : 'todo';
}
function hubDueV18(list) {
  const open = list.filter(task => !task.done && task.due).map(task => task.due).sort();
  if (!open.length) return '';
  const [, month, day] = open[0].split('-');
  return Number(month) + '/' + Number(day) + ' 마감';
}
function hubMarkV18(spaceId) {
  const space = purposeSpacesV16[spaceId];
  return '<span class="hub-mark' + (spaceId === 'personal' ? ' is-personal' : '') + '" style="--mark:' + (space.mark || '#727c8d') + '" aria-hidden="true"></span>';
}
function hubDotsV18(list) {
  const order = { done: 0, running: 1, todo: 2, unassigned: 3 };
  const states = list.map(hubStateV18).sort((a, b) => order[a] - order[b]);
  if (states.length > 20) {
    const count = name => states.filter(state => state === name).length;
    return '<span class="hub-bar" aria-hidden="true">' + ['done', 'running', 'todo', 'unassigned'].map(name => count(name) ? '<i class="is-' + name + '" style="flex:' + count(name) + '"></i>' : '').join('') + '</span>';
  }
  return '<span class="hub-dots" aria-hidden="true">' + states.map(state => '<i class="is-' + state + '"></i>').join('') + '</span>';
}
function hubSummaryV18(list) {
  const count = name => list.filter(task => hubStateV18(task) === name).length;
  const parts = ['작업 ' + list.length + '개 중 ' + count('done') + '개 완료'];
  if (count('running')) parts.push('진행 중 ' + count('running') + '개');
  if (count('unassigned')) parts.push('담당자 미정 ' + count('unassigned') + '개');
  return parts.join(', ');
}
function hubMemberNamesV18(spaceId) {
  return membersPurposeV17(spaceId).map(member => esc(member.id === 'me' ? '나' : member.name) + (member.role === 'admin' ? '<small>관리자</small>' : '')).join('<span class="hub-sep">, </span>');
}
function hubActionsV18(spaceId) { return purposeSpacesV16[spaceId].exampleActions || hubAdminActionsV18; }
function hubReasonV18(spaceId, allowed) { return allowed ? '' : '<p class="hub-reason">' + esc(hubActionsV18(spaceId).reason || '관리자만 할 수 있어요.') + '</p>'; }

function hubRailV18() {
  const current = purposeSpaceStateV16.space;
  return '<nav class="hub-rail" aria-label="스페이스 목록"><ul>' + hubSpaceIdsV18().map(id => {
    const space = purposeSpacesV16[id], open = hubTasksV18(id).filter(task => !task.done).length;
    const members = membersPurposeV17(id).length;
    const who = id === 'personal' ? '본인 전용' : members > 1 ? members + '명' : '혼자';
    return '<li><button type="button" class="hub-rail-item" aria-current="' + (id === current ? 'true' : 'false') + '" onclick="hubSelectV18(\'' + id + '\')">' + hubMarkV18(id) + '<span class="hub-rail-copy"><strong>' + esc(space.name) + '</strong><small>' + who + '</small></span><span class="hub-rail-count" aria-label="미완료 작업 ' + open + '개">' + open + '</span></button></li>';
  }).join('') + '</ul><p class="hub-rail-note">숫자는 아직 끝나지 않은 작업 수예요.</p></nav>';
}
function hubPurposeV18(spaceId) {
  const space = purposeSpacesV16[spaceId];
  if (space.purpose) return '<div class="hub-purpose"><p class="hub-purpose-text">' + esc(space.purpose) + '</p><button type="button" class="text-btn" onclick="openPurposeEditorV17()">목적 수정</button></div>';
  if (spaceId === 'personal') return '<div class="hub-purpose is-empty"><p>목적 없이 바로 기록해도 괜찮아요.</p><button type="button" class="text-btn" onclick="openPurposeEditorV17()">목적 작성</button></div>';
  return '<div class="hub-purpose is-empty"><p>이 스페이스에서 이루려는 것을 적어 두면 참여자 모두가 같은 방향을 볼 수 있어요.</p><button type="button" class="btn" onclick="openPurposeEditorV17()">목적 작성</button></div>';
}
function hubProjectRowV18(spaceId, projectId) {
  const project = purposeSpacesV16[spaceId].projects[projectId], list = hubTasksV18(spaceId, projectId);
  const done = list.filter(task => task.done).length, completed = purposeSpaceStateV16.completed[spaceId + '/' + projectId];
  const actions = hubActionsV18(spaceId);
  return '<li class="hub-project' + (completed ? ' is-completed' : '') + '"><button type="button" class="hub-project-main" onclick="openPurposeProjectV16(\'' + spaceId + '\',\'' + projectId + '\')" aria-label="' + esc(project.name + ' 작업 보기. ' + hubSummaryV18(list)) + '"><strong>' + esc(project.name) + '</strong><small>' + esc(project.outcome || '') + '</small></button>' + (list.length ? hubDotsV18(list) : '<span class="hub-empty-inline">작업 없음</span>') + '<span class="hub-count">' + done + '/' + list.length + '</span><span class="hub-due">' + hubDueV18(list) + '</span>' +
    '<details class="hub-menu"><summary aria-label="' + esc(project.name) + ' 프로젝트 동작">' + icon('more') + '</summary><div class="hub-menu-list"><button type="button" onclick="openProjectEditorV17(\'' + projectId + '\')">수정</button><button type="button" onclick="hubToggleProjectV18(\'' + projectId + '\')">' + (completed ? '다시 열기' : '완료로 표시') + '</button><button type="button" class="danger" ' + (actions.deleteProject ? '' : 'disabled ') + 'onclick="openDeletePurposeV17(\'project\',\'' + projectId + '\')">삭제</button>' + (actions.deleteProject ? '' : '<p class="hub-reason">' + esc(actions.reason) + '</p>') + '</div></details></li>';
}
function hubProjectsV18(spaceId) {
  const space = purposeSpacesV16[spaceId], ids = Object.keys(space.projects);
  const isDone = id => purposeSpaceStateV16.completed[spaceId + '/' + id];
  const open = ids.filter(id => !isDone(id)), closed = ids.filter(isDone), loose = hubTasksV18(spaceId, '');
  let body = '<section class="hub-section" id="hubProjectsV18" aria-labelledby="hubProjectsTitleV18"><div class="hub-section-head"><h3 id="hubProjectsTitleV18">프로젝트</h3><button type="button" class="text-btn" onclick="openProjectEditorV17()">' + icon('plus') + '프로젝트 만들기</button></div>';
  body += open.length ? '<ul class="hub-projects">' + open.map(id => hubProjectRowV18(spaceId, id)).join('') + '</ul>' : '<p class="hub-empty">진행 중인 프로젝트가 없어요. 목적에 다가갈 첫 프로젝트를 만들어 보세요.</p>';
  if (closed.length) body += '<details class="hub-closed"><summary>완료한 프로젝트 ' + closed.length + '개</summary><ul class="hub-projects">' + closed.map(id => hubProjectRowV18(spaceId, id)).join('') + '</ul></details>';
  if (loose.length) body += '<button type="button" class="hub-loose" onclick="openPurposeProjectV16(\'' + spaceId + '\',\'\')">프로젝트 없이 기록한 작업 ' + loose.length + '개 보기</button>';
  return body + '</section>';
}
function hubPeopleV18(spaceId) {
  if (spaceId === 'personal') return '';
  const members = membersPurposeV17(spaceId), list = hubTasksV18(spaceId), actions = hubActionsV18(spaceId);
  const open = list.filter(task => !task.done);
  const unassigned = open.filter(task => hubAssigneeV18(task.id) === 'none');
  let body = '<section class="hub-section" id="hubPeopleV18" aria-labelledby="hubPeopleTitleV18"><div class="hub-section-head"><h3 id="hubPeopleTitleV18">담당</h3><button type="button" class="btn" ' + (actions.invite ? '' : 'disabled ') + 'onclick="openInvitePurposeV17()">초대 링크 만들기</button></div>' + hubReasonV18(spaceId, actions.invite);
  if (members.length === 1) body += '<p class="hub-empty">아직 혼자 쓰는 스페이스예요. 초대 링크로 함께할 사람을 불러 보세요.</p>';
  body += '<ul class="hub-people">' + members.map(member => {
    const mine = open.filter(task => hubAssigneeV18(task.id) === member.id);
    return '<li class="hub-person"><span class="hub-person-name">' + esc(member.id === 'me' ? '나' : member.name) + (member.role === 'admin' ? '<small>관리자</small>' : '') + '</span><span class="hub-count">미완료 ' + mine.length + '</span><span class="hub-due">' + hubDueV18(mine) + '</span>' +
      (member.id !== 'me' && actions.manageMembers ? '<details class="hub-menu"><summary aria-label="' + esc(member.name) + ' 참여자 동작">' + icon('more') + '</summary><div class="hub-menu-list"><button type="button" class="danger" onclick="openRemoveMemberPurposeV17(\'' + member.id + '\')">스페이스에서 제외</button></div></details>' : '<span class="hub-menu-placeholder"></span>') + '</li>';
  }).join('') + '</ul>';
  body += unassigned.length
    ? '<div class="hub-unassigned"><span class="hub-person-name">담당자 미정</span>' + hubDotsV18(unassigned) + '<span class="hub-count">' + unassigned.length + '개</span><button type="button" class="btn primary" onclick="hubOpenAssignV18()">배정하기</button><p>담당자가 없는 작업은 누구의 오늘에도 나오지 않아요.</p></div>'
    : '<p class="hub-quiet">모든 작업에 담당자가 있어요.</p>';
  return body + '</section>';
}
function hubSettingsV18(spaceId) {
  const actions = hubActionsV18(spaceId);
  let body = '<section class="hub-section hub-settings" aria-labelledby="hubSettingsTitleV18"><h3 id="hubSettingsTitleV18">스페이스 설정</h3><div class="hub-settings-row"><button type="button" class="text-btn" onclick="openSpaceInfoEditorV17()">이름·목적 수정</button>';
  if (spaceId === 'personal') return body + '</div><p class="hub-quiet">나의 스페이스는 본인 전용이라 초대·나가기·삭제가 없어요.</p></section>';
  body += '<button type="button" class="text-btn" ' + (actions.leave ? '' : 'disabled ') + 'onclick="openLeavePurposeV17()">스페이스 나가기</button><button type="button" class="text-btn danger" ' + (actions.delete ? '' : 'disabled ') + 'onclick="openDeletePurposeV17(\'space\')">스페이스 삭제</button></div>';
  return body + hubReasonV18(spaceId, actions.delete) + '</section>';
}
function renderSpacesHubV18() {
  if (currentView !== 'spaces') return;
  hubNormalizeV18();
  const spaceId = purposeSpaceStateV16.space, space = purposeSpacesV16[spaceId], panel = document.getElementById('alternatePanel');
  const openMenus = [...panel.querySelectorAll('details[open]')].map(item => item.querySelector('summary')?.getAttribute('aria-label'));
  panel.innerHTML = '<div class="spaces-hub' + (hubMobileDetailV18 ? ' is-detail' : '') + '">' + hubRailV18() +
    '<article class="hub-overview" aria-labelledby="hubSpaceTitleV18"><button type="button" class="hub-back" onclick="hubBackV18()">' + icon('left') + '모든 스페이스</button>' +
    '<header class="hub-identity">' + hubMarkV18(spaceId) + '<h2 id="hubSpaceTitleV18">' + esc(space.name) + '</h2><p class="hub-members">' + (spaceId === 'personal' ? '본인 전용' : hubMemberNamesV18(spaceId)) + '</p></header>' +
    hubPurposeV18(spaceId) + hubProjectsV18(spaceId) + hubPeopleV18(spaceId) + hubSettingsV18(spaceId) + '</article></div>';
  openMenus.forEach(label => panel.querySelector('summary[aria-label="' + label + '"]')?.parentElement.setAttribute('open', ''));
}
function hubSelectV18(spaceId) {
  hubMobileDetailV18 = true;
  choosePurposeSpaceV16(spaceId);
  renderSpacesHubV18();
  if (matchMedia('(max-width:760px)').matches) document.querySelector('.hub-back')?.focus();
  else document.querySelector('.hub-rail-item[aria-current="true"]')?.focus();
}
function hubBackV18() {
  hubMobileDetailV18 = false;
  renderSpacesHubV18();
  document.querySelector('.hub-rail-item[aria-current="true"]')?.focus();
}
function hubToggleProjectV18(projectId) {
  const key = purposeSpaceStateV16.space + '/' + projectId;
  purposeSpaceStateV16.completed[key] = !purposeSpaceStateV16.completed[key];
  savePurposeSpacesV16(); renderPurposeChromeV16(); renderSpacesHubV18();
  toast(purposeSpaceStateV16.completed[key] ? '프로젝트를 완료로 표시했어요.' : '프로젝트를 다시 열었어요.');
}
function hubOpenAssignV18() {
  const spaceId = purposeSpaceStateV16.space, members = membersPurposeV17(spaceId);
  const list = hubTasksV18(spaceId).filter(task => !task.done && hubAssigneeV18(task.id) === 'none');
  if (!list.length) { closeModal(); renderSpacesHubV18(); return; }
  modal(modalHead('담당자 미정 작업 ' + list.length + '개') + '<p>맡을 사람을 고르고 배정하세요. 배정한 작업은 그 사람의 오늘에 나와요.</p><ul class="hub-assign">' + list.map(task => {
    const project = purposeSpacesV16[spaceId].projects[taskSpaceV16(task).project];
    return '<li><div><strong>' + esc(task.title) + '</strong><small>' + esc((project ? project.name + ', ' : '') + hubDueV18([task])) + '</small></div><label><span class="sr-only">' + esc(task.title) + ' 담당자</span><select id="hubAssign' + task.id + '">' + selectedOptionsV2(members.map(member => [member.id, member.id === 'me' ? '나' : member.name]), 'me') + '</select></label><button type="button" class="btn primary" onclick="hubAssignV18(' + task.id + ')">배정</button></li>';
  }).join('') + '</ul><div class="dialog-actions"><button class="btn" onclick="closeModal()">닫기</button></div>');
}
function hubAssignV18(taskId) {
  const memberId = document.getElementById('hubAssign' + taskId)?.value;
  const member = membersPurposeV17(purposeSpaceStateV16.space).find(item => item.id === memberId);
  if (!member) return;
  purposeCrudV17.assignees[taskId] = member.id;
  recordPurposeV17('task', taskId, '담당자 지정 · ' + (member.id === 'me' ? '나' : member.name));
  refreshPurposeCrudV17('배정했어요.');
  hubOpenAssignV18();
}

// The hub replaces the management modal. Existing flows that reopened it now land on the hub.
openManagePurposeV17 = function (tab = 'purpose') {
  closeModal();
  hubMobileDetailV18 = true;
  navigate('spaces');
  const target = { projects: 'hubProjectsV18', people: 'hubPeopleV18' }[tab];
  if (target) requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ block: 'start' }));
};
openInvitePurposeV17 = function () {
  const spaceId = purposeSpaceStateV16.space, space = purposeSpacesV16[spaceId];
  if (spaceId === 'personal' || !hubActionsV18(spaceId).invite) return;
  modal(modalHead('초대 링크') + '<p>이 링크를 받은 사람은 1시간 동안 <strong>' + esc(space.name) + '</strong>에 참여할 수 있어요. 여러 사람이 같은 링크를 써도 돼요.</p><div class="hub-invite-link"><code>/spaces/join/example-link</code><button type="button" class="btn" onclick="hubCopyInviteV18()">링크 복사</button></div><p class="notice">시안의 예시 링크예요. 실제 링크와 만료 시각은 서버가 발급해요. 참여한 사람은 가입할 때 정한 닉네임으로 표시돼요.</p><div class="dialog-actions"><button class="btn" onclick="closeModal()">닫기</button></div>');
};
function hubCopyInviteV18() {
  const done = () => toast('링크를 복사했어요.');
  try { navigator.clipboard.writeText(location.origin + '/spaces/join/example-link').then(done, () => toast('복사하지 못했어요. 링크를 직접 선택해 복사하세요.')); }
  catch (_) { toast('복사하지 못했어요. 링크를 직접 선택해 복사하세요.'); }
}
const saveProjectBeforeHubV18 = saveProjectPurposeV17;
saveProjectPurposeV17 = function (projectId) {
  const fromHub = currentView === 'spaces';
  saveProjectBeforeHubV18(projectId);
  if (fromHub && !document.getElementById('projectNameV17')) navigate('spaces');
};

// Navigation: a "스페이스" destination after 오늘. Mobile keeps its bar and reaches the hub from the space sheet.
document.querySelector('.sidebar .nav [data-nav="today"]').insertAdjacentHTML('afterend', '<button data-nav="spaces" onclick="navigate(\'spaces\')">' + icon('spaces') + '스페이스</button>');
const navigateBeforeHubV18 = navigate;
navigate = function (view) {
  if (view !== 'spaces') { navigateBeforeHubV18(view); return; }
  navigateBeforeHubV18('tasks');
  currentView = 'spaces';
  document.querySelectorAll('[data-nav]').forEach(button => button.classList.toggle('active', button.dataset.nav === 'spaces'));
  document.getElementById('crumb').textContent = '스페이스';
  document.getElementById('pageTitle').textContent = '스페이스';
  document.getElementById('pageSubtitle').textContent = '스페이스마다 목적과 프로젝트 진행, 누가 무엇을 맡았는지 확인하세요.';
  document.getElementById('content').className = 'content spaces-only';
  document.getElementById('primaryLayout').classList.add('hidden');
  document.getElementById('focusBanner')?.classList.add('hidden');
  document.getElementById('alternatePanel').classList.remove('hidden');
  document.querySelector('.head-actions').innerHTML = '<button class="btn primary" onclick="openNewPurposeSpaceV17()">' + icon('plus') + '스페이스 만들기</button>';
  renderPurposeChromeV16();
  renderSpacesHubV18();
  document.title = '핀잇 · 스페이스';
};
const renderTasksBeforeHubV18 = renderTasks;
renderTasks = function () { renderTasksBeforeHubV18(); renderSpacesHubV18(); };

// Breadcrumb shows the scope the screen actually uses; management shortcuts collapse into the hub destination.
const chromeBeforeHubV18 = renderPurposeChromeV16;
renderPurposeChromeV16 = function () {
  hubNormalizeV18();
  chromeBeforeHubV18();
  const state = purposeSpaceStateV16, space = purposeSpacesV16[state.space], project = space.projects[state.project];
  const crumb = document.querySelector('.breadcrumb .home-crumb');
  [workspaceV16, mobileSpacePickerV16].forEach(trigger => trigger.querySelector('.space-switcher-avatar')?.style.setProperty('--mark', space.mark || 'transparent'));
  crumb.innerHTML = ['tasks', 'schedules', 'statistics'].includes(currentView) ? hubMarkV18(state.space) + esc(space.name) + (project ? ' › ' + esc(project.name) : '') : '모든 스페이스';
  if (hubLastSpaceV18 !== state.space) { hubLastSpaceV18 = state.space; hubScheduleScopeV18 = 'mine'; }
  if (currentView === 'schedules') { renderWeek(); renderTimeline(); }
  if (currentView === 'statistics' && !hubStatsRenderingV18) { hubStatsRenderingV18 = true; try { renderStats(); } finally { hubStatsRenderingV18 = false; } }
  hubStatsScopeV18();
  projectsNavV16.querySelectorAll('.purpose-create-link').forEach(button => { if (!button.querySelector('svg')) button.remove(); });
  document.querySelectorAll('.purpose-manage-action').forEach(element => element.remove());
  if (currentView === 'spaces') document.getElementById('pageTitle').textContent = '스페이스';
};
const dialogBeforeHubV18 = renderSpaceDialogV16;
renderSpaceDialogV16 = function () {
  dialogBeforeHubV18();
  spaceDialogV16.querySelectorAll('.space-switcher-option').forEach(option => {
    option.querySelector('.space-switcher-avatar')?.style.setProperty('--mark', purposeSpacesV16[option.dataset.space]?.mark || 'transparent');
  });
  const manage = spaceDialogV16.querySelector('[data-manage-purpose]');
  if (manage) manage.innerHTML = icon('spaces') + '모든 스페이스 보기';
};

// Unassigned is a real choice in the example data ('none'); cards and details say so instead of falling back to 나.
const cardBeforeHubV18 = taskHTML;
taskHTML = function (task) {
  const html = cardBeforeHubV18(task);
  return hubAssigneeV18(task.id) === 'none' ? html.replace('<span class="purpose-assignee">담당 나</span>', '<span class="purpose-assignee is-unassigned">담당자 미정</span>') : html;
};
const detailBeforeHubV18 = openDetail;
openDetail = function (id) {
  detailBeforeHubV18(id);
  if (hubAssigneeV18(id) !== 'none') return;
  document.querySelectorAll('.dialog .detail-grid > div').forEach(cell => { if (cell.querySelector('small')?.textContent === '담당자') cell.querySelector('strong').textContent = '담당자 미정'; });
};
const affiliationBeforeHubV18 = updateAffiliationPurposeV17;
updateAffiliationPurposeV17 = function (rebuildProjects = true) {
  const panel = document.querySelector('.purpose-affiliation'), select = document.getElementById('assigneeV17');
  const first = panel && !panel.dataset.hubReady;
  const wanted = first ? (purposeCrudV17.assignees[panel.dataset.itemId] || 'me') : select?.value;
  affiliationBeforeHubV18(rebuildProjects);
  const assignee = document.getElementById('assigneeV17');
  if (!panel || !assignee) return;
  panel.dataset.hubReady = '1';
  if (!assignee.querySelector('[value="none"]')) assignee.insertAdjacentHTML('beforeend', '<option value="none">담당자 미정</option>');
  if (wanted === 'none') assignee.value = 'none';
};
// 0.19: 일정과 통계가 선택한 스페이스 범위를 따른다. 팀 스페이스의 일정은 내 일정이 기본이고 팀 전체를 켤 수 있다.
let hubScheduleScopeV18 = 'mine', hubLastSpaceV18 = purposeSpaceStateV16.space, hubAllSchedulesV18 = null;
function hubScheduleSeedV18() {
  [
    [9101, '빈 목록 문구 검토', '11:00', 30, 103, 'QUICK_TASK'],
    [9102, '원형 크기 조정', '14:00', 60, 102, 'DEEP_WORK'],
    [9103, '작업 카드 위계 정리', '15:00', 60, 2, 'DEEP_WORK'],
    [9104, '첫 작업 안내 초안 작성', '16:30', 45, 104, 'DEEP_WORK']
  ].forEach(([id, title, time, duration, taskId, type]) => {
    if (!scheduled.some(item => item.id === id)) scheduled.push({ id, title, date: '2026-10-28', time, duration, type, state: 'NOT_STARTED', taskId, description: '스페이스 범위 시안의 예시 일정이에요.' });
  });
  purposeCrudV17.hubScheduleSeedV18 = true;
  save(); persistPurposeCrudV17();
}
function hubScheduleAssigneeV18(item) { return item.taskId ? hubAssigneeV18(item.taskId) : 'me'; }
function hubScheduleInScopeV18(item) {
  const at = scheduleSpacePurposeV17(item), state = purposeSpaceStateV16;
  return at.space === state.space && (!state.project || at.project === state.project);
}
function hubScheduleVisibleV18(item) {
  if ((purposeCrudV17.leftSpaces || []).includes(scheduleSpacePurposeV17(item).space)) return false;
  if (currentView === 'today') return hubScheduleAssigneeV18(item) === 'me';
  if (currentView === 'statistics') return hubScheduleInScopeV18(item);
  if (currentView !== 'schedules') return true;
  if (!hubScheduleInScopeV18(item)) return false;
  return !sharedPurposeV17(purposeSpaceStateV16.space) || hubScheduleScopeV18 === 'team' || hubScheduleAssigneeV18(item) === 'me';
}
let hubAllTasksV18 = null, hubStatsRenderingV18 = false;
function hubWithScopedSchedulesV18(render) {
  hubAllSchedulesV18 = scheduled;
  scheduled = scheduled.filter(hubScheduleVisibleV18);
  if (currentView === 'statistics') { hubAllTasksV18 = tasks; tasks = tasks.filter(task => taskInPurposeScopeV16(task)); }
  try { render(); } finally {
    scheduled = hubAllSchedulesV18; hubAllSchedulesV18 = null;
    if (hubAllTasksV18) { tasks = hubAllTasksV18; hubAllTasksV18 = null; }
  }
}
const saveBeforeHubV18 = save;
save = function () {
  if (!hubAllSchedulesV18 && !hubAllTasksV18) return saveBeforeHubV18();
  const viewSchedules = scheduled, viewTasks = tasks;
  if (hubAllSchedulesV18) scheduled = hubAllSchedulesV18;
  if (hubAllTasksV18) tasks = hubAllTasksV18;
  try { return saveBeforeHubV18(); } finally { scheduled = viewSchedules; tasks = viewTasks; }
};
function hubScheduleToggleV18() {
  const head = document.getElementById('week')?.closest('.panel')?.querySelector('.panel-head');
  if (!head) return;
  let group = document.getElementById('hubScheduleScopeV18');
  if (currentView !== 'schedules' || !sharedPurposeV17(purposeSpaceStateV16.space)) { group?.remove(); return; }
  if (!group) {
    head.insertAdjacentHTML('beforeend', '<div id="hubScheduleScopeV18" class="hub-scope-toggle" role="group" aria-label="일정 보기 범위"></div>');
    group = document.getElementById('hubScheduleScopeV18');
  }
  group.innerHTML = [['mine', '내 일정'], ['team', '팀 전체']].map(([value, label]) => '<button type="button" aria-pressed="' + (hubScheduleScopeV18 === value) + '" onclick="hubSetScheduleScopeV18(\'' + value + '\')">' + label + '</button>').join('');
}
function hubSetScheduleScopeV18(value) {
  hubScheduleScopeV18 = value;
  renderWeek(); renderTimeline();
  document.querySelector('#hubScheduleScopeV18 [aria-pressed="true"]')?.focus();
}
function hubHiddenTeamNoteV18() {
  document.getElementById('hubHiddenNoteV18')?.remove();
  if (currentView !== 'schedules' || hubScheduleScopeV18 !== 'mine' || !sharedPurposeV17(purposeSpaceStateV16.space)) return;
  const hidden = scheduled.filter(item => item.date === selectedDateV2() && hubScheduleInScopeV18(item) && hubScheduleAssigneeV18(item) !== 'me').length;
  if (hidden) document.getElementById('timeline').insertAdjacentHTML('beforebegin', '<div id="hubHiddenNoteV18" class="hub-hidden-note"><span>이 날 팀원 일정 ' + hidden + '개는 숨겨져 있어요.</span><button type="button" class="text-btn" onclick="hubSetScheduleScopeV18(\'team\')">팀 전체 보기</button></div>');
}
const timelineBeforeHubV18 = renderTimeline;
renderTimeline = function () { hubWithScopedSchedulesV18(timelineBeforeHubV18); hubHiddenTeamNoteV18(); hubScheduleToggleV18(); };
const weekBeforeHubV18 = renderWeek;
renderWeek = function () { hubWithScopedSchedulesV18(weekBeforeHubV18); };
const scheduleCardBeforeHubV18 = scheduleHTMLV2;
scheduleHTMLV2 = function (item) {
  const html = scheduleCardBeforeHubV18(item);
  if (currentView !== 'schedules' || hubScheduleScopeV18 !== 'team' || !sharedPurposeV17(purposeSpaceStateV16.space)) return html;
  const id = hubScheduleAssigneeV18(item), member = membersPurposeV17(purposeSpaceStateV16.space).find(person => person.id === id);
  const label = id === 'none' ? '담당자 미정' : id === 'me' ? '나' : member ? member.name : '참여자 아님';
  return html.replace('<div class="schedule-caption">', '<div class="schedule-caption"><span class="hub-schedule-who' + (id === 'none' ? ' is-unassigned' : id === 'me' ? ' is-me' : '') + '">' + esc(label) + '</span>');
};
function hubStatsScopeV18() {
  const panel = document.getElementById('alternatePanel');
  panel?.querySelector('.hub-stats-scope')?.remove();
  if (currentView !== 'statistics' || !panel) return;
  const id = purposeSpaceStateV16.space, space = purposeSpacesV16[id], project = space.projects[purposeSpaceStateV16.project];
  const members = membersPurposeV17(id).length, name = space.name + (project ? ' › ' + project.name : '');
  const who = id !== 'personal' && members > 1 ? ' 참여자 ' + members + '명 전체의 기록이에요.' : '의 기록이에요.';
  panel.insertAdjacentHTML('afterbegin', '<p class="hub-stats-scope">' + hubMarkV18(id) + '<span><strong>' + esc(name) + '</strong>' + who + '</span></p>');
  document.getElementById('pageSubtitle').textContent = '선택한 스페이스의 기록을 기존 집계 기준으로 돌아보세요.';
}
const statsBeforeHubV18 = renderStats;
renderStats = function () { hubWithScopedSchedulesV18(statsBeforeHubV18); hubStatsScopeV18(); };

if (!purposeCrudV17.hubScheduleSeedV18) hubScheduleSeedV18();
const resetBeforeHubV18 = resetDemo;
resetDemo = function () { hubMobileDetailV18 = false; hubScheduleScopeV18 = 'mine'; resetBeforeHubV18(); hubSeedV18(); hubScheduleSeedV18(); hubNormalizeV18(); renderPurposeChromeV16(); renderTasks(); renderWeek(); renderTimeline(); };

renderPurposeChromeV16();
