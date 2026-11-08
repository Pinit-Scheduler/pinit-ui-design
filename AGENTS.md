# Pinit UI design workflow

- Preserve existing product features and API behavior. This repository contains a UI prototype, not the production pinit-fe app.
- Make requested UI edits in the source CSS/JS files, run npm run check and npm run build, and validate affected flows in desktop and mobile layouts.
- Update CHANGELOG.md for each completed user-requested change. Commit the validated change and push it to this repository. The user explicitly requested a commit after every completed modification in this workflow. Do not create a scheduled background monitor.
- Use one coherent commit per completed change, not per keystroke. Never silently leave a completed change only in the local checkout.
- Confirm the active GitHub identity matches the user-designated account before remote writes. Current account: GoGradually (메인 계정). Do not switch to jim2ning unless the user explicitly requests it. Organization: Pinit-Scheduler. Repository: pinit-ui-design.
- Do not overwrite history, force-push, or reset shared branches. Restore prior behavior with git revert or a new restoration commit.
- Never commit credentials, tokens, private browser data, or real account exports. Keep example data clearly identified.

## 저장소 기반 디자인 작업과 증적 (2026-11-08)

- 사용자가 요청한 디자인 변경은 이 저장소의 시안 소스에서 작업한다. 채팅에서 보여주는 시안은 논의와 확인을 돕는 미리보기이며, 완료한 변경을 채팅 안에만 남기지 않는다.
- 기존 작업본의 변경 사항을 먼저 확인하고, 독립 작업본과 작업 브랜치에서 검토 가능한 형태로 진행한다. 사용자의 다른 작업본을 임의로 전환하거나 정리하지 않는다.
- 의미 있는 변경 한 건을 마칠 때마다 CHANGELOG.md에 변경 내용과 이유를 기록하고, 해당 소스와 검증 기록을 하나의 일관된 커밋으로 남겨 이 저장소의 작업 브랜치에 푸시한다. 매 입력이나 중간 실험마다 커밋할 필요는 없다.
- UI 변경의 증적은 docs/design-evidence/ 아래 주제별 기록에 남긴다. 사용자 확정 사항, 제안 및 미결 사항, 변경 파일, 실제 실행한 검사와 결과, 확인한 데스크톱·모바일 흐름, 예시 화면 캡처를 구분한다. 실행하지 못한 검증은 제한 사유를 명시하고 통과로 쓰지 않는다.
- 화면 캡처에는 예시 데이터로 실행한 시안만 담고, 개인 브라우저 화면·계정 데이터·비밀 값은 저장하지 않는다.
- 완료를 보고하기 전에 원격 브랜치와 커밋의 반영 상태를 재조회한다. 사용자에게 확인 가능한 커밋이나 비교 링크와 검증 결과를 함께 제시한다. 로컬 저장·채팅 미리보기·원격 반영 상태를 혼동하지 않는다.
- 새 제품 정책을 시안에서 암묵적으로 확정하지 않는다. 현재 제품의 관찰 사실, 제안, 사용자 확정 및 미결 사항을 증적에 구분한다.
- 화면의 기존 분류·조회·상태 동작을 바꾸기 전에 pinit-docs의 공통 시작점과 관련 설계 문서, 연결된 실제 코드를 대조한다. 같은 항목이 다른 조건의 구역에 표시된다는 이유만으로 오류나 제거 대상으로 단정하지 않는다.
- frontend-design 스킬을 적용하되 기존 핀잇 디자인과 사용자 범위를 우선한다. 데스크톱뿐 아니라 앱으로 이어 쓸 모바일 배치·터치·포커스·닫기 동작을 검토한다.
- 이 규칙은 디자인 저장소의 시안 작업에 적용한다. 제품 저장소·운영 데이터 변경이나 자동 병합·배포로 범위를 넓히지 않는다.

## 실제 구현의 레이어 경계 (2026-11-08 사용자 확정)

- 실제 제품의 비즈니스 규칙은 백엔드 도메인 레이어가 담당한다. 애플리케이션 레이어부터 UI까지 권한·기본값·만료·중복 참여·이동 등 규칙을 중복 구현하거나 판단하지 않는다.
- 애플리케이션 레이어는 인증 주체 전달, 도메인 호출, 트랜잭션, 저장소·이벤트 등 입출력을 조정한다. Redis·DB·실시간 전송은 포트/어댑터로 연결하고 정책 판단을 옮겨 넣지 않는다.
- UI는 백엔드가 제공하는 기본값·capabilities·처리 결과·버전을 표시한다. 역할 이름이나 클라이언트 시각만으로 제품 권한·초대 만료·중복 가입을 판정하지 않는다.
- 낙관적 락의 원자성은 백엔드 저장소에서 보장하고, 도메인이 정의한 충돌 결과를 UI가 한 번 안내한 뒤 최신 상태로 갱신한다.
- 이 저장소에서 이번 확정 정책은 명세와 UX 상태/계약으로만 관리한다. 실행용 도메인 모의 구현, 실시간 동기화 엔진, 초대 만료/권한/중복 참여를 판정하는 새 실행 코드를 추가하지 않는다. 실제 구현은 백엔드 도메인에서 수행한다.
- 기존 승인된 화면 시안과 신규 정책 명세를 구분한다. 시안의 예시 조건을 제품 정책의 구현 완료나 실제 Redis/DB/서버 검증 결과로 보고하지 않는다.
