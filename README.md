# web-database-practice

웹 애플리케이션과 데이터베이스 연동을 연습하기 위한 개인 학습용 레포지토리입니다. JavaScript(프론트/서버)와 Python(백엔드/스크립트)을 중심으로, DB 설계/쿼리/CRUD/API/인증 등 웹 서비스에 자주 쓰이는 흐름을 직접 구현하며 정리합니다.

## 주요 내용
- **DB 기초**: 스키마 설계, 관계(1:N, N:M), 인덱스, 트랜잭션
- **CRUD**: 생성/조회/수정/삭제 기본 구현
- **API 연동**: REST 형태의 엔드포인트 구성 및 테스트
- **데이터 처리**: Python을 활용한 데이터 가공/마이그레이션/스크립팅
- **프론트 연동**: 간단한 UI(HTML/CSS)와 API 호출

> 참고: 레포지토리 구성/파일명은 학습 과정에서 변경될 수 있습니다.

## 실행 방법(일반 가이드)
프로젝트는 여러 실습 폴더로 구성될 수 있어, **각 폴더의 README 또는 소스 코드 상단 주석**을 먼저 확인하는 것을 권장합니다.

### 1) Node.js/JavaScript 실습
```bash
# 의존성 설치
npm install

# 실행(예: 서버)
npm run start
```

### 2) Python 실습
```bash
# 가상환경 생성(선택)
python -m venv .venv

# 가상환경 활성화
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 실행
python <파일명>.py
```

## 폴더/파일 구조(예시)
레포지토리 구조는 실습에 따라 달라질 수 있습니다.

```text
web-database-practice/
  ├─ (js) ...
  ├─ (python) ...
  ├─ (sql) ...
  ├─ (docs) ...
  └─ README.md
```

## 기술 스택
- JavaScript
- Python
- HTML / CSS
- (DB) 실습에 따라 SQLite/MySQL/PostgreSQL 등

## 목표
- 웹 ↔ DB 연동 흐름을 손으로 반복 구현하여 익숙해지기
- 쿼리 성능/정합성(트랜잭션, 제약조건) 감각 익히기
- 간단한 API 서버를 만들고 테스트/문서화 습관 들이기

## 라이선스
학습용 저장소이며, 별도 명시가 없다면 코드/자료는 개인 학습 목적으로 사용합니다.
