import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // 위에서 작성한 CSS 파일 임포트
import App from './App';

/**
 * React 앱의 렌더링 진입점입니다.
 * StrictMode는 개발 단계에서 잠재적인 문제를 감지하기 위해 두 번 렌더링되지만,
 * 실제 배포 시에는 영향을 주지 않습니다.
 */
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);