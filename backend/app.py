import os
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

load_dotenv()

# 로깅 설정 (서버 로그 확인용)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

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
                SELECT d.doc_id, a.applicant_id, a.name, a.major, d.doc_type, d.status,
                       d.is_disqualified, d.issue_note as reason
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
    
    # JSON body 누락
    if not data:
        return jsonify({"error": "JSON required"}), 400

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
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    conn = None
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            # 1. 서류 상태 업데이트
            cur.execute(
                """
                UPDATE documents
                SET status = %s, is_disqualified = %s, issue_note = %s
                WHERE doc_id = %s
                RETURNING doc_id, applicant_id, status, is_disqualified, issue_note
                """,
                (
                    data.get("status"),
                    data.get("is_disqualified"),
                    data.get("issue_note"),
                    doc_id,
                ),
            )

            updated_document = cur.fetchone()

            if not updated_document:
                return jsonify({"error": "Document not found"}), 404

            # 2. 지원자 상태 자동 변경 (추가된 로직)
            # 서류가 업데이트되면, 해당 지원자의 상태가 '불합격'인 경우에 한해 '진행중'으로 변경합니다.
            cur.execute(
                """
                UPDATE applicants 
                SET final_status = '진행중'
                WHERE applicant_id = (SELECT applicant_id FROM documents WHERE doc_id = %s)
                AND final_status = '불합격'
                """,
                (doc_id,)
            )

            conn.commit()
            return jsonify({
                "message": "Document and applicant status updated",
                "applicant_status": "changed to '진행중' (if it was '불합격')",
                "document": updated_document,
            }), 200
            
    except Exception as e:
        if conn: conn.rollback()
        logger.error(f"Error updating document/applicant {doc_id}: {e}")
        return jsonify({"error": "Update failed", "details": str(e)}), 500
    finally:
        if conn: conn.close()

# [4. 수정] 시즌 모집 종료
@app.route("/admin/recruiting/season/<int:season_id>/close", methods=["PATCH"])
def close_recruitment_season(season_id):
    conn = None
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            # 1. 시즌 존재 여부 확인
            cur.execute("SELECT is_active FROM recruitment_seasons WHERE season_id = %s", (season_id,))
            result = cur.fetchone()
            
            if not result:
                return jsonify({"error": f"Season {season_id} not found."}), 404
                
            if not result['is_active']:
                return jsonify({"message": "Season is already closed."}), 200

            # 2. 시즌 종료 처리 (is_active = FALSE)
            cur.execute(
                "UPDATE recruitment_seasons SET is_active = FALSE WHERE season_id = %s", 
                (season_id,)
            )
            
            conn.commit()
            
            return jsonify({
                "message": f"Season {season_id} has been closed successfully.",
                "status": "inactive"
            }), 200

    except Exception as e:
        if conn: conn.rollback()
        logger.error(f"Error closing season {season_id}: {str(e)}")
        return jsonify({"error": "Failed to close season"}), 500
    finally:
        if conn: conn.close()


# [5. 삭제] 모집 시즌 종료 후 데이터 파기
from enum import Enum

# 상태값 상수화
class ApplicantStatus(Enum):
    PASSED = "합격"

@app.route("/admin/recruiting/season/<int:season_id>/cleanup", methods=["DELETE"])
def cleanup_unsuccessful_applicants(season_id):
    conn = None
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            # 1. 시즌 상태 확인
            cur.execute("SELECT is_active FROM recruitment_seasons WHERE season_id = %s", (season_id,))
            result = cur.fetchone()
            
            if not result:
                return jsonify({"error": "Season not found"}), 404
            
            if result['is_active']: # is_active가 True인 경우
                return jsonify({"error": "Cannot cleanup an active season"}), 400

            # 2. Enum을 활용한 Soft Delete
            # f-string이나 %s 파라미터로 Enum 값을 넘겨줍니다.
            cur.execute(
                """
                UPDATE applicants 
                SET deleted_at = CURRENT_TIMESTAMP 
                WHERE season_id = %s 
                AND (final_status != %s OR final_status IS NULL)
                AND deleted_at IS NULL
                """, 
                (season_id, ApplicantStatus.PASSED.value)
            )
            deleted_count = cur.rowcount
            
            conn.commit()
            return jsonify({
                "message": "Cleanup successful",
                "deleted_count": deleted_count
            }), 200
            
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"error": "Internal server error"}), 500
    finally:
        if conn: conn.close()


# [6. 분석] 지원자 평균 점수 조회
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

# 시연을 위한 종료된 시즌과 삭제된 데이터 복원 (실제 운영에서는 삭제된 데이터를 가지고만 불합격자 분석 가능)
@app.route("/admin/recruiting/season/<int:season_id>/restore", methods=["PATCH"])
def restore_recruitment_season(season_id):
    conn = None
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            # 1. 시즌 존재 여부 확인
            cur.execute("SELECT is_active FROM recruitment_seasons WHERE season_id = %s", (season_id,))
            result = cur.fetchone()
            
            if not result:
                return jsonify({"error": f"Season {season_id} not found."}), 404
            
            # 2. 이미 활성화된 시즌인지 확인
            if result['is_active']:
                return jsonify({"message": "Season is already active."}), 200

            # 3. 시즌 활성화 및 지원자 데이터 복구 (deleted_at을 다시 NULL로)
            # 시즌 활성화
            cur.execute(
                "UPDATE recruitment_seasons SET is_active = TRUE WHERE season_id = %s", 
                (season_id,)
            )
            
            # 삭제된 지원자들 복구
            cur.execute(
                """
                UPDATE applicants 
                SET deleted_at = NULL 
                WHERE season_id = %s AND deleted_at IS NOT NULL
                """, 
                (season_id,)
            )
            restored_count = cur.rowcount
            
            conn.commit()
            
            return jsonify({
                "message": f"Season {season_id} and its data have been restored.",
                "restored_applicants": restored_count,
                "status": "active"
            }), 200

    except Exception as e:
        if conn: conn.rollback()
        print(f"복원 중 에러 발생: {e}")
        return jsonify({"error": "Failed to restore season"}), 500
    finally:
        if conn: conn.close()


if __name__ == "__main__":
    app.run(
        debug=os.environ.get("FLASK_ENV") == "development",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
    )
