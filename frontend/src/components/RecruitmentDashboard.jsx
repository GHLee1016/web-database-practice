import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  CheckCircle,
  Database,
  FileWarning,
  Power,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Users,
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:5000';

const defaultEvalForm = {
  applicant_id: '',
  evaluator_id: '',
  score: '',
  eval_type: '최종면접',
  comment: '',
};

const defaultDocUpdate = {
  id: '',
  status: 'verified',
  is_disqualified: false,
  issue_note: '',
};

const defaultSeasonId = '1';

const RecruitmentDashboard = () => {
  const [disqualified, setDisqualified] = useState([]);
  const [dbStatus, setDbStatus] = useState('unknown');
  const [searchId, setSearchId] = useState('');
  const [seasonId, setSeasonId] = useState(defaultSeasonId);
  const [applicantStats, setApplicantStats] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [evalForm, setEvalForm] = useState(defaultEvalForm);
  const [docUpdate, setDocUpdate] = useState(defaultDocUpdate);

  const setStatus = (message) => {
    setFeedback(message);
    setErrorMessage('');
  };

  const setError = (message) => {
    setErrorMessage(message);
    setFeedback('');
  };

  const initData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [dbRes, disqRes] = await Promise.all([
        axios.get(`${API_BASE}/common/db-check`),
        axios.get(`${API_BASE}/admin/recruiting/disqualified-list`),
      ]);

      setDbStatus(dbRes.data.status === 'healthy' ? 'connected' : 'error');
      setDisqualified(Array.isArray(disqRes.data) ? disqRes.data : []);
    } catch (error) {
      setDbStatus('error');
      setError('백엔드 또는 DB 연결에 실패했습니다. Flask 서버와 DATABASE_URL 설정을 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initData();
  }, [initData]);

  const fetchStats = async () => {
    if (!searchId.trim()) {
      setError('지원자 ID를 입력해주세요.');
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/admin/applicants/${searchId}/stats`);
      setApplicantStats(res.data);
      setStatus('지원자 통계를 불러왔습니다.');
    } catch (error) {
      setApplicantStats(null);
      setError(error.response?.data?.error || '지원자 통계를 불러오지 못했습니다.');
    }
  };

  const submitEval = async (event) => {
    event.preventDefault();

    try {
      await axios.post(`${API_BASE}/admin/evaluations`, {
        applicant_id: Number(evalForm.applicant_id),
        evaluator_id: Number(evalForm.evaluator_id),
        score: Number(evalForm.score),
        eval_type: evalForm.eval_type,
        comment: evalForm.comment,
      });

      setEvalForm(defaultEvalForm);
      setStatus('면접 평가가 저장되었습니다.');
    } catch (error) {
      setError(error.response?.data?.error || '평가 저장에 실패했습니다.');
    }
  };

  const updateDoc = async (event) => {
    event.preventDefault();

    if (!docUpdate.id.trim()) {
      setError('문서 ID를 입력해주세요.');
      return;
    }

    try {
      await axios.patch(`${API_BASE}/admin/documents/${docUpdate.id}`, {
        status: docUpdate.status,
        is_disqualified: docUpdate.is_disqualified,
        issue_note: docUpdate.issue_note,
      });

      setDocUpdate(defaultDocUpdate);
      setStatus(
        `문서 ${docUpdate.id} 상태가 업데이트되었습니다. 결격 해제라면 목록에서 사라졌는지 바로 아래 표에서 확인해주세요.`,
      );
      await initData();
    } catch (error) {
      setError(error.response?.data?.error || '서류 상태 업데이트에 실패했습니다.');
    }
  };

  const handleSeasonAction = async (action) => {
    if (!seasonId.trim()) {
      setError('시즌 ID를 입력해주세요.');
      return;
    }

    const actionLabel = action === 'close' ? '시즌 종료' : '데이터 파기';
    if (!window.confirm(`${actionLabel} 작업을 진행하시겠습니까?`)) {
      return;
    }

    try {
      if (action === 'close') {
        await axios.patch(`${API_BASE}/admin/recruiting/season/${seasonId}/close`);
        setStatus(`시즌 ${seasonId} 종료 처리가 완료되었습니다.`);
      } else {
        const res = await axios.delete(`${API_BASE}/admin/recruiting/season/${seasonId}/cleanup`);
        setStatus(`시즌 ${seasonId}에서 ${res.data.deleted_count ?? 0}명의 데이터가 정리되었습니다.`);
      }

      await initData();
    } catch (error) {
      setError(error.response?.data?.error || `${actionLabel} 작업에 실패했습니다.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800">
      <header className="mx-auto mb-8 flex max-w-7xl flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-100">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Recruit Admin</h1>
            <p className="text-sm text-slate-500">Flask + PostgreSQL 채용 운영 대시보드</p>
          </div>
        </div>
        <div
          className={`flex items-center gap-2 self-start rounded-full px-3 py-1 text-xs font-bold md:self-auto ${
            dbStatus === 'connected'
              ? 'bg-green-100 text-green-700'
              : dbStatus === 'error'
                ? 'bg-red-100 text-red-700'
                : 'bg-slate-100 text-slate-500'
          }`}
        >
          <Database size={14} />
          {dbStatus === 'connected' ? 'DB ONLINE' : dbStatus === 'error' ? 'DB OFFLINE' : 'DB CHECKING'}
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-bold">
                <Search size={18} className="text-blue-500" />
                지원자 통계 조회
              </h2>
              <p className="text-xs text-slate-400">API: `/admin/applicants/&lt;id&gt;/stats`</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder="지원자 ID 입력"
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:ring-2 focus:ring-blue-500"
                value={searchId}
                onChange={(event) => setSearchId(event.target.value)}
              />
              <button
                onClick={fetchStats}
                className="rounded-2xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-700"
              >
                조회
              </button>
            </div>

            {applicantStats && (
              <div className="mt-4 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/70 p-4 text-center">
                  <p className="text-xs font-bold uppercase text-blue-600">성함</p>
                  <p className="mt-2 text-lg font-black">{applicantStats.name}</p>
                </div>
                <div className="rounded-2xl bg-white/70 p-4 text-center">
                  <p className="text-xs font-bold uppercase text-blue-600">평균 점수</p>
                  <p className="mt-2 text-lg font-black">{applicantStats.avg_score ?? 0}점</p>
                </div>
                <div className="rounded-2xl bg-white/70 p-4 text-center">
                  <p className="text-xs font-bold uppercase text-blue-600">평가 횟수</p>
                  <p className="mt-2 text-lg font-black">{applicantStats.total_evals}회</p>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-bold">
                  <AlertCircle size={18} className="text-red-500" />
                  결격 사유 발생자
                </h2>
                <p className="mt-1 text-sm text-slate-400">서류 누락 또는 결격 처리된 지원자를 확인합니다.</p>
              </div>
              <button
                onClick={initData}
                className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:text-blue-500"
                aria-label="새로고침"
              >
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">이름</th>
                    <th className="px-4 py-3 font-semibold">문서 ID</th>
                    <th className="px-4 py-3 font-semibold">지원자 ID</th>
                    <th className="px-4 py-3 font-semibold">전공</th>
                    <th className="px-4 py-3 font-semibold">서류</th>
                    <th className="px-4 py-3 font-semibold">상태</th>
                    <th className="px-4 py-3 font-semibold">결격 사유</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {disqualified.map((item, index) => (
                    <tr key={`${item.name}-${item.doc_type}-${index}`} className="transition hover:bg-slate-50">
                      <td className="px-4 py-4 font-semibold">{item.name}</td>
                      <td className="px-4 py-4 text-slate-600">{item.doc_id}</td>
                      <td className="px-4 py-4 text-slate-600">{item.applicant_id}</td>
                      <td className="px-4 py-4 text-slate-500">{item.major}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          {item.doc_type}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-500">{item.status}</td>
                      <td className="px-4 py-4 font-medium text-red-600">{item.reason}</td>
                    </tr>
                  ))}
                  {disqualified.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-4 py-10 text-center text-slate-400">
                        현재 결격 대상자가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 flex items-center gap-2 font-bold">
              <CheckCircle size={18} className="text-green-500" />
              면접 점수 입력
            </h2>
            <form onSubmit={submitEval} className="space-y-4">
              <input
                type="number"
                placeholder="지원자 ID"
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:ring-2 focus:ring-green-500"
                value={evalForm.applicant_id}
                onChange={(event) => setEvalForm({ ...evalForm, applicant_id: event.target.value })}
              />
              <input
                type="number"
                placeholder="평가자 ID"
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:ring-2 focus:ring-green-500"
                value={evalForm.evaluator_id}
                onChange={(event) => setEvalForm({ ...evalForm, evaluator_id: event.target.value })}
              />
              <input
                type="number"
                placeholder="점수 (0-100)"
                max="100"
                min="0"
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:ring-2 focus:ring-green-500"
                value={evalForm.score}
                onChange={(event) => setEvalForm({ ...evalForm, score: event.target.value })}
              />
              <select
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none"
                value={evalForm.eval_type}
                onChange={(event) => setEvalForm({ ...evalForm, eval_type: event.target.value })}
              >
                <option value="서류">서류평가</option>
                <option value="1차면접">1차면접</option>
                <option value="최종면접">최종면접</option>
              </select>
              <textarea
                placeholder="종합 코멘트"
                rows="3"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:ring-2 focus:ring-green-500"
                value={evalForm.comment}
                onChange={(event) => setEvalForm({ ...evalForm, comment: event.target.value })}
              />
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-700"
              >
                <Send size={16} />
                평가 전송
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h2 className="mb-6 flex items-center gap-2 font-bold text-amber-900">
              <FileWarning size={18} className="text-amber-600" />
              서류 상태 수정
            </h2>
            <form onSubmit={updateDoc} className="space-y-4">
              <input
                type="number"
                placeholder="문서 ID"
                required
                className="w-full rounded-2xl border border-amber-200 bg-white p-3 outline-none transition focus:ring-2 focus:ring-amber-500"
                value={docUpdate.id}
                onChange={(event) => setDocUpdate({ ...docUpdate, id: event.target.value })}
              />
              <select
                className="w-full rounded-2xl border border-amber-200 bg-white p-3 outline-none"
                value={docUpdate.status}
                onChange={(event) => setDocUpdate({ ...docUpdate, status: event.target.value })}
              >
                <option value="verified">verified</option>
                <option value="pending">pending</option>
                <option value="rejected">rejected</option>
              </select>
              <label className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-white p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={docUpdate.is_disqualified}
                  onChange={(event) =>
                    setDocUpdate({ ...docUpdate, is_disqualified: event.target.checked })
                  }
                />
                결격 여부로 함께 처리
              </label>
              <textarea
                placeholder="보완 메모 또는 결격 사유"
                rows="3"
                className="w-full rounded-2xl border border-amber-200 bg-white p-3 outline-none transition focus:ring-2 focus:ring-amber-500"
                value={docUpdate.issue_note}
                onChange={(event) => setDocUpdate({ ...docUpdate, issue_note: event.target.value })}
              />
              <button
                type="submit"
                className="w-full rounded-2xl bg-amber-600 py-3 font-bold text-white transition hover:bg-amber-700"
              >
                서류 상태 반영
              </button>
            </form>
          </section>

          <section className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl">
            <h2 className="mb-4 font-bold text-slate-300">시즌 컨트롤 룸</h2>
            <input
              type="number"
              placeholder="시즌 ID"
              className="mb-4 w-full rounded-2xl border border-slate-700 bg-slate-800 p-3 text-white outline-none transition focus:ring-2 focus:ring-blue-500"
              value={seasonId}
              onChange={(event) => setSeasonId(event.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSeasonAction('close')}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-slate-800 p-4 transition hover:bg-amber-600"
              >
                <Power size={20} />
                <span className="text-xs font-bold uppercase">시즌 종료</span>
              </button>
              <button
                onClick={() => handleSeasonAction('cleanup')}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-slate-800 p-4 transition hover:bg-red-600"
              >
                <Trash2 size={20} />
                <span className="text-xs font-bold uppercase">데이터 파기</span>
              </button>
            </div>
          </section>
        </div>
      </main>

      {(feedback || errorMessage) && (
        <div className="mx-auto mt-6 max-w-7xl">
          {feedback && (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {feedback}
            </div>
          )}
          {errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecruitmentDashboard;
