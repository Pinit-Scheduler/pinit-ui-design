# Pinit UI design

[pinit-fe](https://github.com/Pinit-Scheduler/pinit-fe)와 같은 화면에서 UI를 검토하고 바꿔 보는 비공개 저장소입니다. 화면 코드는 pinit-fe 소스를 그대로 가져온 것이며, 데이터는 브라우저 안의 예시(mock) API로만 동작합니다.

- 기준 FE: `Pinit-Scheduler/pinit-fe` master `a963f03` (2026-11-18)

## 실행

```sh
npm install
npm start
```

http://127.0.0.1:4173 을 열고 예시 계정 `demo` / `demo1234`로 로그인합니다. `.env`의 `VITE_USE_MOCK_API=true` 때문에 실제 서버에 연결하지 않습니다. mock은 개발 서버에서만 켜지므로 화면 확인은 `npm start`로 합니다.

## FE와 맞추기

FE가 바뀌면 같은 경로의 파일을 FE의 새 커밋으로 다시 가져오고 위 기준 커밋을 바꿉니다.

```sh
git -C ../pinit-fe archive <commit> -- src public index.html package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts eslint.config.js .gitignore | tar -x
```

`package.json`의 이름과 `start` 스크립트는 이 저장소 값으로 유지합니다.

가져온 뒤 FE에 없는 `src/` 파일은 지운다(`tar -x`는 지우지 않는다).

## 테스트

```sh
npm test
```

`npm test`(`node --test`)는 `tests/mind-map-*.test.mjs`로 마인드맵의 순수 모듈(`src/features/mind-map/model/`), API 응답 해석과 저장기, 마인드맵 mock(`src/mocks/mindMap.ts`)을 검사합니다. 브라우저 없이 TypeScript 소스를 그 자리에서 옮겨 읽습니다. FE로 옮길 때는 `tests/`의 파일도 같은 경로로 그대로 옮깁니다.

- `tests/support/`는 FE `tests/support/`의 사본입니다(기준 FE 커밋에서 `git -C ../pinit-fe archive <commit> -- tests/support | tar -x`). 여기서 고치지 않고 FE에서 다시 가져옵니다.
- `tests/fixtures/mind-map-text-cases.json`은 BE의 글 정리 표(`pinit-monolith` `modules/task/src/test/resources/mind-map/text-normalization-cases.json`)의 사본입니다. 화면과 서버가 같은 표로 글을 정리하는지 봅니다. 표가 바뀌면 BE에서 다시 가져옵니다.

## 마인드맵 화면 확인

```sh
node qa/mind-map/local.mjs
```

Playwright(Chromium)로 실제 앱을 PC 1280×860과 폰 390×800에서 걷습니다. 개발 서버(mock 켜짐)를 5198번에 스스로 띄우고, `demo` / `demo1234`로 로그인한 뒤 메뉴와 링크로만 옮겨 다닙니다(새로 읽으면 mock의 로그인과 상태가 처음으로 돌아갑니다). 단계마다 가로 넘침과 기대하지 않은 console error를 보고, 화면을 `qa/mind-map/screenshots/`에 밝은·어두운 테마로 찍습니다(`deviceScaleFactor: 1`, 커밋하지 않습니다). Playwright는 이 저장소의 의존성이 아니므로 전역에 두거나 `npm i --no-save playwright && npx playwright install chromium`으로 설치합니다.

- `QA_ORIGIN=http://127.0.0.1:4173`: 서버를 띄우지 않고 `npm start`로 띄운 앱을 씁니다.
- `QA_VIEWPORT=desktop|mobile`, `QA_TODAY=1`(홈 카드만), `QA_MENU=1`(메뉴·설정 줄만), `QA_SCREENSHOT_DIR`, `QA_FAILED_DIR`(실패한 단계의 화면).

개발자 도구의 `__pinitMock`으로 서버의 경우를 흉내 냅니다.

- `__pinitMock.mindMap.failNextSave('server' | 'lost' | null)`: 다음 저장 한 번을 실패시킵니다. `server`는 반영하지 않고 500, `lost`는 반영한 뒤 503(응답을 받지 못한 저장)입니다.
- `__pinitMock.mindMap.failNextLoad(true)`: 다음 맵 읽기 한 번을 500으로 답합니다.
- `__pinitMock.mindMap.remoteEdit()`: 다른 기기나 MCP가 고친 것처럼 주제 바로 아래 첫 가지 글 끝에 ` (다른 기기)`를 붙이고 version을 올립니다.
- `__pinitMock.setLatency(ms)`: 모든 mock 응답을 늦춥니다(새로 고쳐도 남으니 끝나면 `0`으로 되돌립니다).

### 재어 보고 정한 것

- **폰의 동작 단추 줄(390px)**: 일곱 단추(하위 가지, 같은 단계, 글 고치기, 체크박스, 접기, 삭제, 되돌리기)를 아이콘 위·글 아래(11.5px)로 한 줄에 둡니다. 실제 화면에서 단추 줄 356px, 단추마다 폭 48px·높이 50px, 글은 모두 한 줄이고 가장 긴 글(하위 가지·같은 단계·글 고치기)이 42.5px로 단추 안쪽에 들어갑니다. 그래서 글을 숨기는 대안은 쓰지 않았습니다. 375px에서는 단추 46px로 글이 안쪽 여백에 1.5px, 360px에서는 43px로 0.5px 걸쳐 여유가 거의 없습니다(여전히 한 줄이고 단추 테두리 안).
- **좁은 PC 창**: 캔버스 폭이 1,000px 미만이면(`@container mind-map-stage (max-width: 999px)`) 단추 옆 단축키(`kbd`)를 숨겨 일곱 단추가 캔버스 안에 다 들어갑니다. 1280px 창에서는 보이고, 900·1024px 창에서는 숨습니다.
- **미니 플레이어와 단추 줄**: 진행 중인 일정의 미니 플레이어가 캔버스 아래에 떠 있으면 단추 줄을 그만큼 올립니다. 올리는 양은 `MiniPlayerBar.css`의 아래 여백을 옮겨 온 PC 24px, 폰 32px입니다(두 파일이 따로 바뀌면 다시 맞춥니다).
- **폰의 위 막대**: 첫 줄에 `← 홈`·제목·저장 상태(오른쪽 끝), 둘째 줄에 숫자를 둡니다. 390px에서 저장 상태가 혼자 다음 줄 왼쪽으로 밀려나던 것을 고쳤고, `저장하지 못함`·이유·`다시 시도`도 첫 줄에 들어갑니다(이유는 말줄임).
- **설정의 마인드맵 줄**: 설정 머리 바로 아래에 새 카드(`마인드맵`)를 두고 그 안에 `마인드맵` 줄 하나를 둡니다. 폰에서 마인드맵으로 들어가는 주된 길이라 맨 위에 둡니다.
- **오늘 화면의 홈 카드**: "오늘의 작업"은 카드가 있어도 제자리이고, "오늘의 일정"은 한 칸(1000px 이하)이면 제자리, 두 칸이면 카드 높이 + 간격만큼만 내려갑니다. mock의 일정·작업이 오늘 날짜에 따라 바뀌어 절대 위치는 날마다 달라지므로, 스크립트는 카드가 없던 때의 배치와 비교합니다.

### 저장에서 정한 것

- **창이 숨을 때**(`visibilitychange`가 `hidden`: 탭 바꾸기, 폰에서 앱 나가기): 1초 뒤로 미뤄 둔 변경을 바로 보냅니다. 보통 저장처럼 응답을 받아 저장 상태에 보이고, 본문이 64KB 안이면 keepalive로 보내 탭이 그대로 닫혀도 끝까지 갑니다. 글을 쓰는 중이면 보내지 않습니다(보내면 쓰던 글이 빠진 나무가 가는 중이라, 이어 탭이 닫힐 때 `pagehide`가 쓰던 글까지 보내지 못합니다). 그때는 탭이 닫힐 때 `pagehide`가 쓰던 글을 확정한 나무를 keepalive로 보냅니다.
- **탭을 닫을 때 보낸 저장**(`pagehide`의 keepalive)은 응답을 받지 못한 저장으로 둡니다. 페이지가 되살아나면(bfcache) 다음 저장이 받은 충돌의 저장 번호로 그 저장이 들어갔는지 압니다.
- **페이지를 떠난 뒤의 저장이 실패하면**(응답 없음·5xx·시간 초과·400 등) 어느 화면에 있든 토스트로 `마인드맵의 마지막 변경을 저장하지 못했어요. 마인드맵을 다시 열면 이어서 저장해요.`를 띄웁니다. 같은 계정으로 마인드맵을 다시 열었을 때 서버의 version이 그 변경의 기준 그대로면 그 나무로 시작해 바로 저장하고, 그사이 다른 곳에서 바뀌었으면 덮지 않고 `마인드맵의 마지막 변경을 저장하지 못했어요. 그사이 다른 곳에서 바뀌어 최신 내용을 불러왔어요.`를 띄웁니다. 응답만 잃고 들어간 경우(서버 나무가 그 나무)는 알리지 않습니다. 화면 확인은 `leave-fails` 단계가 화면의 `fetch`를 감싸 떠나는 순간의 저장을 모두 500으로 만들어 봅니다.
- **홈 카드**도 페이지처럼 방금 떠난 페이지의 저장이 끝난 뒤에 맵을 읽습니다. 다시 읽은 맵은 아는 것보다 version이 클 때만 받아들입니다(그사이 저장이 성공했으면 답이 낡았습니다).
- **화면 읽기**: 저장 상태는 저장하지 못한 이유만 알립니다(`aria-live`). 쓰는 중인 가지 글은 이름이 `가지 글`인 글 상자이고, 캔버스는 키보드 초점이 있을 때 테두리를 보입니다.

### 확인하지 않았다

- 실제 한글 입력기. 조합 중의 Enter·Tab은 `isComposing`·keyCode 229인 키 이벤트를 보내 확인했을 뿐입니다.
- 실제 폰의 손가락 끌기와 두 손가락 확대. Chromium에 CDP 터치 이벤트를 보내 확인했을 뿐입니다.
- 탭을 닫거나 창이 숨는 순간의 저장(`pagehide`의 keepalive, 창이 숨을 때 바로 보내는 저장)과 그 64KB 한도. 저장기 테스트로만 확인했습니다.
- Firefox와 Safari. Chromium에서만 걸었습니다.
- 페이지를 떠났다가 저장 응답이 오기 전에 돌아오는 경합. 저장기 테스트(`tests/mind-map-saver.test.mjs`)로만 확인했습니다.
- MCP 동의 화면의 마인드맵 문구. mock에 OAuth 동의 경로가 없어 화면으로는 보지 못했고 단위 테스트로만 확인했습니다.
