import React from 'react';
// 대시보드 컴포넌트를 불러옵니다. (폴더 구조에 주의하세요!)
import RecruitmentDashboard from './components/RecruitmentDashboard';
// Tailwind CSS 설정을 포함한 스타일 파일입니다.
import './index.css';

/**
 * App 컴포넌트
 * 리크루팅 관리 시스템의 메인 컨테이너 역할을 합니다.
 */
function App() {
  return (
    <div className="App selection:bg-blue-100">
      {/* 
        추후 전역 알림(Toast)이나 네비게이션 바를 추가하고 싶다면 
        대시보드 상단/하단에 배치하면 됩니다. 
      */}
      
      <main>
        <RecruitmentDashboard />
      </main>

      {/* 푸터나 공통 레이아웃이 필요하다면 여기에 추가 */}
      <footer className="py-8 text-center text-slate-400 text-sm">
        &copy; 2026 Recruit Admin System. All rights reserved.
      </footer>
    </div>
  );
}

export default App;