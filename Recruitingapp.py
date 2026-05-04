# =========================
# 0) imports
# =========================
import os
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from flask import Flask, jsonify, request

# 로깅 설정 (서버 로그 확인용)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()
app = Flask(__name__)

# =========================
# 1) config (env)
# =========================
DB_URL = os.environ.get("DATABASE_URL")

# =========================
# 2) db 연결 함수
# =========================
def get_conn():
    """데이터베이스 연결 객체를 반환합니다."""
    return psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)

# =========================
# 3) 공통 라우트 (DB 연결 체크)
# =========================
@app.route("/common/db-check", methods=["GET"])
def db_check():
    conn = None
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            result = cur.fetchone()
        return jsonify({"status": "healthy", "database": "connected", "result": result}), 200
    except Exception as e:
        logger.error(f"Database check failed: {e}")
        return jsonify({"status": "unhealthy", "message": "Database connection failed"}), 500
    finally:
        if conn:
            conn.close()

# =========================
# 4) routes (리크루팅 관리)
# =========================

# [1. 조회] 서류 미비자 및 결격자 실시간 조회
@app.route("/admin/recruiting/disqualified-list", methods=["GET"])
def get_disqualified_list():
    season_id = request.args.get("season_id")
    conn = None
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            query = """
                SELECT a.name, a.major, d.doc_type, d.issue_note as reason
                FROM applicants a
                JOIN documents d ON a.applicant_id = d.applicant_id
                WHERE d.is_disqualified = TRUE
            """
            params = []
            if season_id:
                query += " AND a.season_id = %s"
                params.append(season_id)
            
            cur.execute(query, params)
            rows = cur.fetchall()
            
            if not rows:
                return jsonify({"message": "No disqualified applicants found"}), 200 # 404보다는 빈 리스트나 메시지가 적합할 수 있음
            return jsonify(rows), 200
    except Exception as e:
        logger.error(f"Error fetching disqualified list: {e}")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        if conn:
            conn.close()


# [2. 생성] 면접 평가 점수 입력
@app.route("/admin/evaluations", methods=["POST"])
def create_evaluation():
    data = request.get_json()
    
    # 입력값 검증
    score = data.get("score")
    if score is None or not (0 <= score <= 100):
        return jsonify({"error": "Score must be between 0 and 100"}), 400
    if not data.get("applicant_id") or not data.get("evaluator_id"):
        return jsonify({"error": "applicant_id and evaluator_id are required"}), 400

    conn = None
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO evaluations (applicant_id, evaluator_id, score, eval_type, comment)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    data.get("applicant_id"),
                    data.get("evaluator_id"),
                    score,
                    data.get("eval_type"),
                    data.get("comment"),
                ),
            )
            conn.commit()
        return jsonify({"message": "Evaluation recorded successfully"}), 201
    except Exception as e:
        if conn: conn.rollback()
        logger.error(f"Error creating evaluation: {e}")
        return jsonify({"error": "Database error", "details": str(e)}), 400
    finally:
        if conn:
            conn.close()


# [3. 수정] 합격 상태 및 서류 보완 업데이트 (PATCH)
@app.route("/admin/documents/<int:doc_id>", methods=["PATCH"])
def update_document_status(doc_id):
    """
    doc_id는 데이터가 들어간 순서대로 1로 시작하여 자동 증가하는 정수입니다. 
    예를 들어, 첫 번째로 입력된 문서의 doc_id는 1, 두 번째는 2, ... 이런 식으로 할당됩니다.
    업데이트 가능한 필드: status, is_disqualified, issue_note
    예시 요청 바디:
    {
        "status": "보완 필요",
        "is_disqualified": false,
        "issue_note": "졸업 증명서 미제출"
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    conn = None
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            # 동적 업데이트 대신 명시적 업데이트 (필요 시 COALESCE 사용 가능)
            cur.execute(
                """
                UPDATE documents
                SET status = %s, is_disqualified = %s, issue_note = %s
                WHERE doc_id = %s
                """,
                (
                    data.get("status"),
                    data.get("is_disqualified"),
                    data.get("issue_note"),
                    doc_id,
                ),
            )
            conn.commit()
            if cur.rowcount == 0:
                return jsonify({"error": "Document not found"}), 404
            return jsonify({"message": "Document status updated"}), 200
    except Exception as e:
        if conn: conn.rollback()
        logger.error(f"Error updating document {doc_id}: {e}")
        return jsonify({"error": "Update failed"}), 500
    finally:
        if conn:
            conn.close()


# [4. 삭제] 모집 시즌 종료 후 데이터 파기
@app.route("/admin/recruiting/season/<int:season_id>/cleanup", methods=["DELETE"])
def cleanup_unsuccessful_applicants(season_id):
    conn = None
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            # 1. 불합격자 데이터 삭제 (Cascade 설정 전제)
            cur.execute(
                "DELETE FROM applicants WHERE season_id = %s AND final_status != '합격'", 
                (season_id,)
            )
            deleted_count = cur.rowcount
            
            # 2. 시즌 종료 처리
            cur.execute(
                "UPDATE recruitment_seasons SET is_active = FALSE WHERE season_id = %s", 
                (season_id,)
            )
            
            conn.commit()
            return jsonify({
                "message": f"Cleanup complete. {deleted_count} unsuccessful applicants removed.",
                "season_status": "inactive"
            }), 200
    except Exception as e:
        if conn: conn.rollback()
        logger.error(f"Error during season {season_id} cleanup: {e}")
        return jsonify({"error": "Cleanup failed"}), 500
    finally:
        if conn:
            conn.close()


# [5. 분석] 지원자 평균 점수 조회
@app.route("/admin/applicants/<int:app_id>/stats", methods=["GET"])
def get_applicant_stats(app_id):
    conn = None
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT a.name, ROUND(AVG(e.score), 2) as avg_score, COUNT(e.eval_id) as total_evals
                FROM applicants a
                LEFT JOIN evaluations e ON a.applicant_id = e.applicant_id
                WHERE a.applicant_id = %s
                GROUP BY a.name
                """,
                (app_id,),
            )
            row = cur.fetchone()
            
            if not row or row['name'] is None:
                return jsonify({"error": "Applicant not found"}), 404
            return jsonify(row), 200
    except Exception as e:
        logger.error(f"Error fetching stats for applicant {app_id}: {e}")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    app.run(debug=True)