/* Extends the existing UI and example data; no production API or membership is added. */
const purposeSpacesV16 = {
  personal: { name: '나의 공간', note: '본인 전용', purpose: '', projects: {} },
  career: { name: '커리어 성장', note: '혼자 사용하는 목적 공간', purpose: '내 경험과 강점을 설득력 있게 전달하기', projects: {
    interview: { name: '면접 준비', outcome: '경험과 강점이 분명한 발표 자료와 답변 완성' },
    portfolio: { name: '포트폴리오 정리', outcome: '문제 해결 과정과 결과가 드러나는 포트폴리오 완성' }
  } },
  pinit: { name: '핀잇 개선', note: '혼자 사용하는 목적 공간', purpose: '해야 할 일을 더 편하게 계획하고 실행하기', projects: {
    cards: { name: '작업 카드 개선', outcome: '작업을 읽고 다음 행동을 고르기 쉬운 화면 만들기' }
  } }
};
const seedSpaceAssignmentsV16 = {
  1: { space: 'career', project: 'interview' }, 4: { space: 'career', project: 'interview' },
  3: { space: 'career', project: 'portfolio' }, 2: { space: 'pinit', project: 'cards' }
};
let purposeSpaceStateV16 = { space: 'personal', project: '', assignments: {}, completed: {} };
try {
  const stored = JSON.parse(localStorage.getItem('pinit-purpose-spaces-v16'));
  if (stored && purposeSpacesV16[stored.space]) purposeSpaceStateV16 = { ...purposeSpaceStateV16, ...stored };
} catch (_) { /* Optional prototype storage. */ }
function taskSpaceV16(task) {
  const assignment = purposeSpaceStateV16.assignments[task.id] || seedSpaceAssignmentsV16[task.id] || { space: 'personal', project: '' };
  const space = purposeSpacesV16[assignment.space];
  return space ? { space: assignment.space, project: space.projects[assignment.project] ? assignment.project : '' } : { space: 'personal', project: '' };
}
function taskInPurposeScopeV16(task) {
  const assignment = taskSpaceV16(task), state = purposeSpaceStateV16;
  return assignment.space === state.space && (!state.project || assignment.project === state.project);
}
function savePurposeSpacesV16() {
  try { localStorage.setItem('pinit-purpose-spaces-v16', JSON.stringify(purposeSpaceStateV16)); } catch (_) { /* View remains usable. */ }
}
function selectedPurposeProjectV16() {
  return purposeSpacesV16[purposeSpaceStateV16.space].projects[purposeSpaceStateV16.project];
}
function choosePurposeSpaceV16(space) {
  if (!purposeSpacesV16[space]) return;
  purposeSpaceStateV16.space = space;
  purposeSpaceStateV16.project = '';
  savePurposeSpacesV16();
  if (currentView === 'tasks') resetFiltersV2();
  renderPurposeChromeV16();
  renderTasks();
}
function openPurposeProjectV16(space, project) {
  if (!purposeSpacesV16[space] || (project && !purposeSpacesV16[space].projects[project])) return;
  purposeSpaceStateV16.space = space;
  purposeSpaceStateV16.project = project;
  savePurposeSpacesV16();
  query = ''; archiveMode = false; selectedCategoryFilterV3 = '';
  advancedV2 = { ...advancedV2, status: 'CURRENT', deadline: 'ANY', importance: 0, difficulty: 21 };
  navigate('tasks');
}
function openTaskSpaceV16(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;
  const assignment = taskSpaceV16(task);
  openPurposeProjectV16(assignment.space, assignment.project);
}
function togglePurposeProjectV16() {
  const project = selectedPurposeProjectV16();
  if (!project) return;
  const key = purposeSpaceStateV16.space + '/' + purposeSpaceStateV16.project;
  purposeSpaceStateV16.completed[key] = !purposeSpaceStateV16.completed[key];
  savePurposeSpacesV16();
  renderPurposeChromeV16();
  toast(purposeSpaceStateV16.completed[key] ? '프로젝트를 완료로 표시했어요.' : '프로젝트를 다시 열었어요.');
}
const workspaceV16 = document.querySelector('.workspace');
workspaceV16.classList.add('space-workspace');
workspaceV16.innerHTML = '<button type="button" id="purposeSpacePickerV16" class="space-switcher-trigger" aria-haspopup="dialog" aria-expanded="false" aria-controls="purposeSpaceDialogV16"><span class="space-switcher-avatar" aria-hidden="true">나</span><span class="space-switcher-copy"><strong class="space-trigger-title">나의 공간</strong><small class="space-trigger-note">본인 전용</small></span><span class="space-switcher-chevron" aria-hidden="true">⌄</span></button>';
const projectsNavV16 = document.createElement('nav');
projectsNavV16.className = 'space-project-nav';
projectsNavV16.setAttribute('aria-label', '선택한 공간의 프로젝트');
document.querySelector('.sidebar nav').after(projectsNavV16);
const mobileSpacePickerV16 = document.createElement('button');
mobileSpacePickerV16.type = 'button';
mobileSpacePickerV16.className = 'space-mobile-picker';
mobileSpacePickerV16.setAttribute('aria-haspopup', 'dialog');
mobileSpacePickerV16.setAttribute('aria-expanded', 'false');
mobileSpacePickerV16.setAttribute('aria-controls', 'purposeSpaceDialogV16');
mobileSpacePickerV16.innerHTML = '<span class="space-switcher-avatar" aria-hidden="true">나</span><span class="space-trigger-title">나의 공간</span><span aria-hidden="true">⌄</span>';
document.querySelector('.breadcrumb').prepend(mobileSpacePickerV16);
const spaceDialogV16 = document.createElement('dialog');
spaceDialogV16.id = 'purposeSpaceDialogV16';
spaceDialogV16.className = 'space-switcher-dialog';
spaceDialogV16.setAttribute('aria-labelledby', 'spaceDialogTitleV16');
document.body.append(spaceDialogV16);
let spaceDialogTriggerV16 = null;
let spaceDialogBodyOverflowV16 = '';
function positionSpaceDialogV16() {
  const trigger = matchMedia('(max-width:760px)').matches ? mobileSpacePickerV16 : document.getElementById('purposeSpacePickerV16');
  const bounds = trigger.getBoundingClientRect();
  spaceDialogV16.style.setProperty('--space-panel-left', Math.max(12, Math.min(bounds.left, innerWidth - 332)) + 'px');
  spaceDialogV16.style.setProperty('--space-panel-top', Math.min(bounds.bottom + 10, innerHeight - 360) + 'px');
}
function renderSpaceDialogV16() {
  const row = (id, space) => '<button type="button" class="space-switcher-option" data-space="' + id + '" aria-pressed="' + (id === purposeSpaceStateV16.space) + '"><span class="space-switcher-avatar" aria-hidden="true">' + esc(space.name.slice(0, 1)) + '</span><span class="space-switcher-copy"><strong>' + esc(space.name) + '</strong><small>' + esc(space.note) + '</small></span><span class="space-switcher-check" aria-hidden="true">' + (id === purposeSpaceStateV16.space ? icon('check') : '') + '</span></button>';
  spaceDialogV16.innerHTML = '<div class="space-sheet-handle" aria-hidden="true"></div><div class="space-switcher-heading"><h2 id="spaceDialogTitleV16">공간 전환</h2><button type="button" class="icon-btn" aria-label="공간 선택 닫기" data-close-space>' + icon('close') + '</button></div><div class="space-switcher-options"><p class="space-switcher-group-label">내 공간</p>' + row('personal', purposeSpacesV16.personal) + '<p class="space-switcher-group-label">목적 공간</p>' + Object.entries(purposeSpacesV16).filter(([id]) => id !== 'personal').map(([id, space]) => row(id, space)).join('') + '</div><p class="space-switcher-footer">오늘에는 모든 공간의 내 할 일이 모입니다.</p>';
}
function openSpaceDialogV16(trigger) {
  spaceDialogTriggerV16 = trigger;
  renderSpaceDialogV16();
  positionSpaceDialogV16();
  spaceDialogBodyOverflowV16 = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  spaceDialogV16.showModal();
  document.getElementById('purposeSpacePickerV16').setAttribute('aria-expanded', 'true');
  mobileSpacePickerV16.setAttribute('aria-expanded', 'true');
  spaceDialogV16.querySelector('[aria-pressed="true"]').focus();
}
document.getElementById('purposeSpacePickerV16').addEventListener('click', event => openSpaceDialogV16(event.currentTarget));
mobileSpacePickerV16.addEventListener('click', event => openSpaceDialogV16(event.currentTarget));
spaceDialogV16.addEventListener('click', event => {
  const option = event.target.closest('[data-space]');
  if (option) { choosePurposeSpaceV16(option.dataset.space); spaceDialogV16.close(); return; }
  if (event.target.closest('[data-close-space]')) { spaceDialogV16.close(); return; }
  if (event.target === spaceDialogV16) {
    const bounds = spaceDialogV16.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) spaceDialogV16.close();
  }
});
spaceDialogV16.addEventListener('close', () => {
  document.body.style.overflow = spaceDialogBodyOverflowV16;
  document.getElementById('purposeSpacePickerV16').setAttribute('aria-expanded', 'false');
  mobileSpacePickerV16.setAttribute('aria-expanded', 'false');
  spaceDialogTriggerV16?.focus();
});
addEventListener('resize', () => { if (spaceDialogV16.open) positionSpaceDialogV16(); });
const purposeContextV16 = document.createElement('section');
purposeContextV16.className = 'space-context-bar hidden';
purposeContextV16.setAttribute('aria-label', '목적과 프로젝트');
document.querySelector('.page-head').after(purposeContextV16);
const mobileProjectsV16 = document.createElement('nav');
mobileProjectsV16.className = 'space-mobile-projects hidden';
mobileProjectsV16.setAttribute('aria-label', '프로젝트 선택');
document.querySelector('.page-head').after(mobileProjectsV16);
function renderPurposeChromeV16() {
  const state = purposeSpaceStateV16, space = purposeSpacesV16[state.space], project = selectedPurposeProjectV16();
  [workspaceV16, mobileSpacePickerV16].forEach(trigger => {
    trigger.querySelector('.space-trigger-title').textContent = space.name;
    trigger.querySelector('.space-switcher-avatar').textContent = space.name.slice(0, 1);
  });
  workspaceV16.querySelector('.space-trigger-note').textContent = space.note;
  projectsNavV16.classList.toggle('hidden', !Object.keys(space.projects).length);
  projectsNavV16.innerHTML = '<p>프로젝트</p><button type="button" class="' + (!state.project && currentView === 'tasks' ? 'active' : '') + '" onclick="openPurposeProjectV16(\'' + state.space + '\',\'\')">공간의 모든 작업</button>' + Object.entries(space.projects).map(([id, item]) => '<button type="button" class="' + (state.project === id && currentView === 'tasks' ? 'active' : '') + '" onclick="openPurposeProjectV16(\'' + state.space + '\',\'' + id + '\')"><span>' + esc(item.name) + '</span>' + (state.completed[state.space + '/' + id] ? '<small>완료</small>' : '') + '</button>').join('');
  mobileProjectsV16.classList.toggle('hidden', currentView !== 'tasks' || !Object.keys(space.projects).length);
  mobileProjectsV16.innerHTML = [['', { name: '전체 작업' }], ...Object.entries(space.projects)].map(([id, item]) => '<button type="button" aria-pressed="' + (state.project === id) + '" onclick="openPurposeProjectV16(\'' + state.space + '\',\'' + id + '\')">' + esc(item.name) + '</button>').join('');
  document.querySelector('.breadcrumb .home-crumb').textContent = currentView === 'tasks' ? space.name : '모든 공간';
  purposeContextV16.classList.toggle('hidden', currentView !== 'tasks' || !space.purpose);
  if (currentView === 'today') {
    document.getElementById('pageTitle').textContent = '오늘 할당된 일';
    document.getElementById('pageSubtitle').textContent = '모든 공간에서 오늘 마감인 작업과 바로 시작할 수 있는 작업을 확인하세요.';
    document.getElementById('taskHeading').innerHTML = '오늘의 작업 <span class="number" id="taskCount"></span><span class="space-scope-note">모든 공간</span>';
  } else if (currentView === 'tasks') {
    document.getElementById('pageTitle').textContent = project ? project.name : space.name + '의 작업';
    document.getElementById('pageSubtitle').textContent = project ? project.outcome : '선택한 공간의 작업을 확인하세요. 오늘에서는 모든 공간의 내 작업을 볼 수 있어요.';
    purposeContextV16.innerHTML = '<details><summary>목적 · ' + esc(space.purpose) + '</summary>' + (project ? '<p>목적에 기여할 성과 · ' + esc(project.outcome) + '</p>' : '<p>하나의 목적 아래 프로젝트를 나누어 관리해요.</p>') + '</details>' + (project ? '<button type="button" class="btn" onclick="togglePurposeProjectV16()">' + (state.completed[state.space + '/' + state.project] ? '프로젝트 재개' : '프로젝트 완료') + '</button>' : '');
  }
  document.title = '핀잇 · ' + document.getElementById('pageTitle').textContent;
}
const taskCardBeforePurposeV16 = taskHTML;
taskHTML = function (task) {
  const assignment = taskSpaceV16(task), space = purposeSpacesV16[assignment.space], project = space.projects[assignment.project];
  const chip = '<div class="space-task-context"><button type="button" class="space-task-link" onclick="openTaskSpaceV16(' + task.id + ')" aria-label="소속 보기 · ' + esc(space.name + (project ? ' · ' + project.name : '')) + '">' + esc(space.name) + (project ? ' › ' + esc(project.name) : '') + '</button></div>';
  return taskCardBeforePurposeV16(task).replace('<div class="task-meta">', chip + '<div class="task-meta">');
};
const matchesBeforePurposeV16 = matchesV2;
matchesV2 = function (task) {
  return matchesBeforePurposeV16(task) && (currentView !== 'tasks' || taskInPurposeScopeV16(task));
};
const renderTasksBeforePurposeV16 = renderTasks;
renderTasks = function () {
  renderTasksBeforePurposeV16();
  if (currentView === 'tasks') {
    const scoped = tasks.filter(task => !task.archived && taskInPurposeScopeV16(task));
    const done = scoped.filter(task => task.done).length, percent = Math.round(done / Math.max(scoped.length, 1) * 100);
    document.getElementById('progressLabel').textContent = done + ' / ' + scoped.length + ' 완료';
    document.getElementById('progressPercent').textContent = percent + '%';
    document.getElementById('progressBar').style.width = percent + '%';
  }
};
const navigateBeforePurposeV16 = navigate;
navigate = function (view) { navigateBeforePurposeV16(view); renderPurposeChromeV16(); renderTasks(); };
const detailBeforePurposeV16 = openDetail;
openDetail = function (id) {
  detailBeforePurposeV16(id);
  const task = tasks.find(item => item.id === id);
  if (!task) return;
  const assignment = taskSpaceV16(task), space = purposeSpacesV16[assignment.space], project = space.projects[assignment.project];
  document.querySelector('.dialog .detail-grid')?.insertAdjacentHTML('beforeend', '<div><small>공간</small><strong>' + esc(space.name) + '</strong></div><div><small>프로젝트</small><strong>' + esc(project?.name || '없음') + '</strong></div>');
};
const taskFormBeforePurposeV16 = openTaskFormV2;
openTaskFormV2 = function (id) {
  taskFormBeforePurposeV16(id);
  const existing = tasks.find(task => task.id === id), project = selectedPurposeProjectV16();
  const target = existing ? taskSpaceV16(existing) : currentView === 'tasks' && project ? { space: purposeSpaceStateV16.space, project: purposeSpaceStateV16.project } : { space: 'personal', project: '' };
  const form = document.querySelector('.dialog form');
  form.dataset.purposeSpace = target.space; form.dataset.purposeProject = target.project;
  form.insertAdjacentHTML('afterbegin', '<p class="space-form-destination">' + (existing ? '소속 · ' : '추가할 위치 · ') + esc(purposeSpacesV16[target.space].name) + (target.project ? ' › ' + esc(purposeSpacesV16[target.space].projects[target.project].name) : '') + '</p>');
};
const submitTaskBeforePurposeV16 = submitTaskV2;
submitTaskV2 = function (id) {
  const form = document.querySelector('.dialog form'), destination = { space: form.dataset.purposeSpace, project: form.dataset.purposeProject || '' }, previous = new Set(tasks.map(task => task.id));
  submitTaskBeforePurposeV16(id);
  if (document.getElementById('taskTitleV2')) return;
  const created = id ? null : tasks.find(task => !previous.has(task.id));
  if (created) { purposeSpaceStateV16.assignments[created.id] = destination; savePurposeSpacesV16(); renderTasks(); }
};
const resetBeforePurposeV16 = resetDemo;
resetDemo = function () { purposeSpaceStateV16 = { space: 'personal', project: '', assignments: {}, completed: {} }; savePurposeSpacesV16(); resetBeforePurposeV16(); };
renderPurposeChromeV16();
renderTasks();
