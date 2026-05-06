# GitHub + Render 배포 가이드

## 1. GitHub에 올리기

GitHub 문서 기준으로 기존 로컬 프로젝트는 새 리포지토리를 만든 뒤 `git remote add origin <repo-url>` 후 `git push -u origin main` 방식으로 올릴 수 있습니다.

이 프로젝트는 아직 `.gitignore`가 없어서 민감정보와 빌드 결과물이 같이 올라갈 수 있었는데, 지금은 아래 항목을 제외하도록 정리했습니다.

- `backend/.env`
- `frontend/.env`
- `backend/.venv`
- `frontend/node_modules`
- `frontend/build`

## 2. Render 구조

이 저장소는 모노레포 형태라서 Render에서 서비스를 2개로 나누는 구성이 가장 자연스럽습니다.

- 백엔드: Python Web Service (`backend`)
- 프론트엔드: Static Site (`frontend`)

루트의 `render.yaml`은 위 구조를 기준으로 작성되어 있습니다.

## 3. Render에서 해야 할 값

`render.yaml`에는 비밀값을 넣지 않았습니다. Render 대시보드에서 아래 값을 직접 채워주세요.

- 백엔드 `DATABASE_URL`
- 프론트엔드 `REACT_APP_API_BASE_URL`

프론트의 `REACT_APP_API_BASE_URL` 값은 배포된 백엔드 URL이어야 합니다.

예시:

```text
https://recruit-backend.onrender.com
```

## 4. PostgreSQL 이전

지금 로컬에서 쓰던 PostgreSQL은 Render에 그대로 따라가지 않습니다. 배포용 DB가 따로 필요합니다.

선택지는 보통 2개입니다.

- Render Postgres를 새로 만들고 `DATABASE_URL` 연결
- 외부 Postgres(예: Neon, Supabase, RDS)를 만들고 `DATABASE_URL` 연결

로컬 SQL 파일을 새 DB에 넣을 때는 보통 아래처럼 진행합니다.

```bash
psql "배포용_DATABASE_URL" < backend/디비디비딥.sql
```

파일명이 다르면 실제로 사용할 SQL 파일명으로 바꿔서 실행하면 됩니다.

## 5. 배포 순서

1. GitHub에 이 프로젝트를 push
2. Render에서 `New > Blueprint`
3. GitHub 리포지토리 연결
4. 루트의 `render.yaml` 선택
5. Postgres 준비 후 백엔드 `DATABASE_URL` 입력
6. 백엔드가 배포되면 해당 공개 URL 확인
7. 프론트 서비스의 `REACT_APP_API_BASE_URL`에 백엔드 URL 입력 후 재배포

## 6. 참고

- Render 웹 서비스는 공식 문서상 `0.0.0.0`에 바인딩되어야 하며 기본 포트는 `10000`입니다.
- Render는 모노레포에서 서비스별 `rootDir` 설정을 지원합니다.
- Flask 앱은 Render 공식 quickstart처럼 `gunicorn app:app`으로 실행하도록 맞췄습니다.
