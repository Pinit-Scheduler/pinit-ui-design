# Pinit UI design

Pinit UI 개선안을 검토하는 비공개 저장소입니다. 원본 [pinit-fe](https://github.com/Pinit-Scheduler/pinit-fe)의 기능을 유지하는 방향으로 화면을 제안합니다. 실제 서비스의 API·인증·상태 처리 코드는 변경하지 않습니다.

## 실행

Node.js만 필요하며 별도 패키지 설치는 없습니다.

```sh
npm run check
npm run build
npm start
```

브라우저에서 http://127.0.0.1:4173 을 엽니다. index.html을 직접 열어도 UI를 확인할 수 있습니다. 웹 폰트를 불러오지 못하면 시스템 글꼴을 사용합니다.

## 최신 변경

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
