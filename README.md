# Pinit UI design

[pinit-fe](https://github.com/Pinit-Scheduler/pinit-fe)와 같은 화면에서 UI를 검토하고 바꿔 보는 비공개 저장소입니다. 화면 코드는 pinit-fe 소스를 그대로 가져온 것이며, 데이터는 브라우저 안의 예시(mock) API로만 동작합니다.

- 기준 FE: `Pinit-Scheduler/pinit-fe` master `883ad0d` (2026-11-14)

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
