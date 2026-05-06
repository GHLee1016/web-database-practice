/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}", // src 폴더 안의 모든 JS/JSX 파일을 감시합니다.
      "./public/index.html"
    ],
    theme: {
      extend: {
        // 나중에 브랜드 컬러나 특정 폰트를 추가하고 싶을 때 여기서 확장합니다.
        fontFamily: {
          sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', 'sans-serif'],
        },
      },
    },
    plugins: [],
  }