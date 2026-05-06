-- [1] 기존 테이블 삭제 (초기화용)
DROP TABLE IF EXISTS evaluations CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS applicants CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS recruitment_seasons CASCADE;

-- [2] 테이블 생성
-- 1. 모집 기수
CREATE TABLE recruitment_seasons (
    season_id SERIAL PRIMARY KEY,
    season_name VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE,
    end_date DATE
);

-- 2. 운영진 정보
CREATE TABLE members (
    member_id INT PRIMARY KEY,
    member_name VARCHAR(50) NOT NULL,
    generation INT NOT NULL,
    join_year INT NOT NULL,
    society_role VARCHAR(50) NOT NULL,
	mentor_id INT NULL,
    CONSTRAINT fk_mentor FOREIGN KEY (mentor_id) REFERENCES members(member_id)
);

-- 3. 지원자 기본 정보
CREATE TABLE applicants (
    applicant_id SERIAL PRIMARY KEY,
    season_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    major VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    deleted_at TIMESTAMP DEFAULT NULL,
    final_status VARCHAR(20) DEFAULT '진행중' 
        CHECK (final_status IN ('진행중', '합격', '불합격', '대기')),
    FOREIGN KEY (season_id) REFERENCES recruitment_seasons(season_id) ON DELETE CASCADE
);

-- 4. 서류 상태 및 결격 사유
CREATE TABLE documents (
    doc_id SERIAL PRIMARY KEY,
    applicant_id INT NOT NULL,
    doc_type VARCHAR(50) NOT NULL 
        CHECK (doc_type IN ('자기소개서', '포트폴리오', '개인정보동의서')),
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'verified', 'missing', 'incomplete')),
    is_disqualified BOOLEAN DEFAULT FALSE,
    issue_note TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (applicant_id) REFERENCES applicants(applicant_id) ON DELETE CASCADE
);

-- 5. 평가 점수
CREATE TABLE evaluations (
    eval_id SERIAL PRIMARY KEY,
    applicant_id INT NOT NULL,
    evaluator_id INT NOT NULL, 
    score INT CHECK (score BETWEEN 0 AND 100),
    eval_type VARCHAR(20) 
        CHECK (eval_type IN ('서류', '1차면접', '최종면접')),
    comment TEXT,
    FOREIGN KEY (applicant_id) REFERENCES applicants(applicant_id) ON DELETE CASCADE,
    FOREIGN KEY (evaluator_id) REFERENCES members(member_id)
);

-- [3] 샘플 데이터 삽입
-- 1. 기수 정보
INSERT INTO recruitment_seasons (season_id, season_name, is_active, start_date, end_date) VALUES
(1, '2026 봄 12기 신입 모집', TRUE, '2026-03-01', '2026-03-15');

-- 2. 운영진 데이터
INSERT INTO members (member_id, member_name, generation, join_year, society_role, mentor_id) VALUES 
(2021001, '이준우', 10, 2025, '데이터 팀장', NULL),
(2022002, '김민서', 10, 2025, '부학회장', NULL),
(2021055, '박건희', 10, 2025, '교육부장', NULL),
(2022088, '윤서진', 10, 2025, '기획부장', NULL),
(2019012, '최재혁', 9, 2024, '시니어 고문', NULL);

-- 3. 지원자 데이터
INSERT INTO applicants (applicant_id, season_id, name, major, phone, email, final_status) VALUES
(2024101, 1, '강은호', '산업공학과', '010-1234-5678', 'euno@skku.edu', '합격'),
(2024102, 1, '한지아', '통계학과', '010-9876-5432', 'jia@skku.edu', '불합격'),
(2024103, 1, '윤선우', '컴퓨터공학', '010-5555-4444', 'sw@skku.edu', '불합격'),
(2024104, 1, '김도윤', '경영학과', '010-1111-2222', 'doyun@skku.edu', '진행중'),
(2024105, 1, '이서연', '경제학과', '010-3333-7777', 'sy@skku.edu', '합격');

-- 4. 서류 검수 데이터
INSERT INTO documents (applicant_id, doc_type, status, is_disqualified, issue_note) VALUES
(2024101, '자기소개서', 'verified', FALSE, '확인 완료'),
(2024101, '포트폴리오', 'verified', FALSE, 'GitHub 링크 정상'),
(2024102, '포트폴리오', 'missing', TRUE, '포트폴리오 파일 미첨부 (결격)'),
(2024103, '포트폴리오', 'incomplete', TRUE, '구글 드라이브 접근 권한 없음 (결격)'),
(2024104, '자기소개서', 'pending', FALSE, '검수 대기 중'),
(2024105, '자기소개서', 'verified', FALSE, '확인 완료'),
(2024105, '포트폴리오', 'verified', FALSE, '금융 데이터 분석 프로젝트 우수');

-- 5. 평가 데이터
INSERT INTO evaluations (applicant_id, evaluator_id, score, eval_type, comment) VALUES
(2024101, 2021001, 95, '1차면접', '엔지니어링 기초가 매우 탄탄함'),
(2024101, 2021055, 88, '1차면접', '팀워크 경험이 풍부함'),
(2024103, 2022002, 70, '서류', '포트폴리오 링크 오류로 기술 역량 확인 불가'),
(2024105, 2021055, 92, '서류', '경제 전공임에도 데이터 분석 도구 활용 능력이 뛰어남'),
(2024105, 2022088, 94, '서류', '시계열 분석 경험이 학회 주제와 잘 맞음');

ALTER TABLE applicants ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;