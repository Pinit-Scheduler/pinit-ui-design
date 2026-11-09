# Pinit UI design

Pinit UI 개선안을 검토하는 비공개 저장소입니다. 원본 [pinit-fe](https://github.com/Pinit-Scheduler/pinit-fe)의 기능을 유지하는 방향으로 화면을 제안합니다. 실제 서비스의 API·인증·상태 처리 코드는 변경하지 않습니다.

## 최신 정책 명세

새로 확정한 팀 스페이스 정책은 [확정 정책·UX 상태](docs/design-evidence/team-space-policy.md)와 [백엔드 도메인 계약](docs/design-evidence/backend-domain-boundary.md)에 명세로만 남깁니다. 실제 구현은 백엔드 도메인이 담당하며, 애플리케이션/UI에 업무 규칙을 구현하지 않습니다. 아래 실행 시안은 기존 UX 참고이며 신규 정책의 구현 완료를 뜻하지 않습니다.

## 실행

Node.js만 필요하며 별도 패키지 설치는 없습니다.

```sh
npm run check
npm run build
npm start
```

브라우저에서 http://127.0.0.1:4173 을 엽니다. index.html을 직접 열어도 UI를 확인할 수 있습니다. 웹 폰트를 불러오지 못하면 시스템 글꼴을 사용합니다.

## 스페이스 허브 시안 (0.18.0)

사이드바의 "스페이스"에서 모든 스페이스를 한 화면에 모아 봅니다. 왼쪽 목록에서 스페이스를 고르면 오른쪽에 목적, 프로젝트별 진행(작업 하나를 점 하나로 표시), 참여자별 담당, 담당자 미정 작업과 배정, 스페이스 설정이 나옵니다. 모바일에서는 목록에서 스페이스를 누르면 상세로 넘어가고, 하단 시트의 "모든 스페이스 보기"로 들어올 수 있습니다. 화면 명칭은 "공간" 대신 "스페이스"를 씁니다. 가능 여부와 불가 사유는 예시 데이터에 적어 둔 값이며 권한을 판정하지 않습니다. [결정·제안·검증 증적](docs/design-evidence/spaces-hub.md)

## 스페이스 후속 화면 (0.21.0)

899px 이하에서는 상단 바의 스페이스 버튼으로 스페이스를 바꾸고, 시트에서 고른 스페이스 아래 프로젝트를 바로 고릅니다. 허브 밖에서도 할 수 없는 동작은 회색으로 꺼지고 이유가 한 줄로 나옵니다. 편집 충돌은 대화상자 하나로 알리고 내 입력을 복사할 수 있게 남깁니다. 작업·일정 폼은 소속 한 줄로 시작하고, 스페이스를 고르면 영향을 바로 보여 줍니다. 카테고리 표시는 프로젝트로 통일했습니다. 예시 작업 104를 처음 저장하면 충돌 예시가 나옵니다. [결정·제안·검증 증적](docs/design-evidence/spaces-followups.md)

## 목적 공간 관리 시안 (0.17, 이후 스페이스 허브로 대체)

기존 화면에 공간 선택과 프로젝트 탐색을 추가했습니다. `npm start`로 여는 같은 index.html에서 확인합니다. 데스크톱은 공간 버튼 아래 패널, 모바일은 하단 시트를 사용합니다. 오늘은 선택한 공간과 관계없이 기존 오늘 마감·시작 가능 기준으로 내 작업을 보여 주며, 프로젝트를 누르면 해당 작업 목록으로 들어갑니다.

공간 전환 → 목적 공간 만들기 또는 선택한 공간 관리에서 목적·정보, 프로젝트, 참여자를 관리합니다. 생성·수정·삭제/복원, 예시 초대·참여·제외·탈퇴, 작업·일정의 소속 선택·이동을 기존 폼에 연결했습니다.

초대는 예시 상태 전환이며 실제 메일이나 계정 권한을 바꾸지 않습니다. 삭제·복구·담당자 미정·일정 공유 등의 미결 정책은 검토용 제안으로 구분합니다. [전체 CRUD·PRD 커버리지와 검증 증적](docs/design-evidence/purpose-spaces-crud.md), [탐색 디자인과 지식베이스 대조](docs/design-evidence/purpose-spaces.md)에서 범위와 화면을 확인할 수 있습니다.

## 최신 변경

- 0.22.0 모션 레이어: 화면 전환은 본문만 올라오고 메뉴는 그대로입니다. 목록을 다시 그려도 남은 행은 움직이지 않고 새 행만 나타나며, 빠진 행은 잠깐 사라지며 나갑니다. 작업을 완료하면 상자가 차고 체크와 취소선이 그려진 뒤 회색으로 가라앉습니다. 대화상자·시트·토스트·일정 플레이어는 들어오고 나가며, 숫자는 새 값으로 넘어갑니다. 줄인 모션 설정에서는 불투명도만 바뀝니다. [FE가 따를 모션 명세와 검증](docs/design-evidence/motion.md)
- 연결 없는 작업도 우선순위·중요도·마감순 지도로 배치합니다. 지도 왼쪽 위의 ‘독립 작업’ 선택에서 기준을 바꿀 수 있습니다. 기준을 바꾸면 해당 영역으로 이동합니다.
- 우선순위 지도는 중요도 7–9 / 1–6과 마감 2일 이내(지난 마감 포함) / 그 이후·기한 없음의 네 구역입니다. 기존 중요도나 일정 순서를 변경하는 자동 계획 엔진이 아니라 위치를 정하는 명시적 UI 기준입니다.
- 완료한 독립 작업은 별도로 표시하며, 중요도 지도와 마감순 지도에서도 누락하지 않습니다. 시퀀스에 연결된 작업은 기존 연결과 배치를 유지합니다.
- ‘작업 맵’ 탭에서 모든 작업과 연결 흐름을 확인합니다. 시퀀스·트리 전환, 확대·축소, 드래그 이동, 전체 맞춤과 큰 화면 보기를 지원합니다.
- 연결된 작업은 같은 흐름으로 묶고, 여러 선행 작업이 합쳐져도 같은 작업을 중복 표시하지 않습니다. 검색·분류·상태 필터는 일치하는 작업을 강조하며 연결 맥락은 유지합니다.
- 노드를 누르면 기존 작업 상세가 열립니다. ‘분기·합류 예시 보기’는 실제 작업에 영향을 주지 않는 별도 미리보기입니다.
- 일정 직접 추가·수정에서도 카테고리를 선택하며, 작업 배정 시 선택한 카테고리를 이어받습니다. 새 항목의 카테고리는 자동 선택하지 않습니다.
- 작업 순서 연결을 항상 노출: 이전 작업 → 현재 작업 → 다음 작업.
- 중요도·난이도 원형 지표와 마감 글씨 확대.
- 대표 카테고리 6개: 업무·커리어, 학습, 개인 프로젝트, 생활·행정, 건강·운동, 여가·관계.
- 대표 카테고리는 하나, 개인 추가 태그는 여러 개 선택합니다. 사용자 정의 카테고리도 추가할 수 있습니다.
- 대표 카테고리는 향후 작업 시간 학습을 위한 UI 기준 제안입니다. 실제 학습이나 카테고리별 시간 산정은 구현하지 않았습니다.

## 소스

base.html은 첫 HTML 제안이고, refinement.*는 기능 진입 경로와 반응형 레이아웃, sequence-v3.*는 작업 순서, categories-v3.*는 분류와 가독성 변경을 담습니다. task-map-core.js는 연결과 배치 계산, task-map.js와 task-map.css는 작업 맵 화면을 담습니다. build.cjs가 독립 실행 가능한 index.html을 만들고 생성된 스크립트 구문을 검사합니다.

## 변경 추적과 원복

각 완성된 수정은 검증 후 커밋·푸시합니다. 기준 버전은 GitHub 커밋 기록에서 비교할 수 있습니다. 0.1.0 → 0.2.0 → 0.3.0 순으로 기록했습니다.

```sh
git log --oneline
git show COMMIT:index.html > previous.html
git revert COMMIT
git push origin main
```

git show는 이전 화면을 별도 파일로 확인할 때 사용합니다. git revert는 변경을 취소하는 새 커밋을 만들어 이력을 보존합니다. 원복할 커밋은 실제 기록에서 선택하세요. 강제 푸시는 사용하지 않습니다.

## 데모 범위

작업·일정 조작은 브라우저의 예시 데이터에만 적용됩니다. 인증, 푸시, MCP, 자동 계획 엔진, 반복 회차 생성, 기간 통계는 기존 서비스 연결 대상입니다. 실제 계정 데이터나 비밀 값은 포함하지 않습니다.

The default graph view uses circular nodes and directed arrows for dependencies. Sequence and tree remain available. All recorded tasks share one recommendation path. Solid arrows represent stored dependencies; dashed arrows suggest the next task without changing stored connections. The selected criterion ranks available tasks while preserving dependency order.

Graph nodes display task names directly inside circles, without numeric sequence labels.

Version 0.7 adds a spatial force graph with category-colored dots, labels, node dragging and local neighborhood highlighting. Controls adjust spacing and reset the layout; recommendation paths can be hidden without removing stored sequence connections. Graph placement is view-only.

Version 0.8 defaults to a directed execution flow. Start/next/waiting labels guide the user; ready sequence continuations stay together. Completed tasks remain visible outside the recommended path. Free spatial placement is still available from the graph layout selector.

Version 0.9 delivers only the sequence map. Desktop follows left-to-right links; mobile uses top-to-bottom links and previous/next navigation at readable scale. The mobile add button occupies the exact center of the navigation bar. Earlier graph sources are retained for history but are not bundled.

Version 0.10 adds an all-task Eisenhower matrix from the task view switch or #matrix. Importance 7–9 counts as important; urgency defaults to two days including overdue tasks. Completed tasks remain accessible separately. Six mobile actions remain: five equal destinations and a centered raised Add button.

Version 0.11 enlarges task context text and streamlines task forms. Category None is explicit and persistent; six standard categories use tiles. Existing tag data remains intact while task tag inputs are removed. Modal headers and action footers stay visible while content scrolls, with native form association preserved for submit buttons.

Version 0.12 moves the matrix under Task map, shortens regular feedback to 1.5 seconds and docks the running timer above the measured mobile navigation area. Statistics now include daily planned/completed-plan bars, schedule-state distribution and category completion time. Time charts aggregate planned minutes by schedule date; task-completion totals remain global because task completion timestamps are not recorded.

Version 0.13 uses categories as the single visible classification system across cards, task details, editing and filters. Category management replaces tag management; legacy stored values are retained only for compatibility. Compact category/dependency panels and shared typography tokens reduce form height. Task dependency details follow the full information grid.

Version 0.14 uses the app blue palette for every statistics chart. Sequence maps have smaller cards, less unused space and a compact header. The first desktop view fits the overview automatically; large maps use a readable flow focus. Mobile keeps a readable card and its navigation above the bottom bar, with filters and zoom available on demand.
