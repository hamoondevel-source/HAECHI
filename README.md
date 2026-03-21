# HAECHI

HAECHI는 로봇 상태 모니터링과 현장 운용 제어를 위한 관제 솔루션입니다.

현재 구성:

- `backend`: Node.js + Express API
- `frontend`: Vite + React 관제 대시보드

## 시작하기

루트에서 의존성을 설치합니다.

```bash
npm install
```

백엔드를 실행합니다.

```bash
npm run dev:backend
```

프론트를 실행합니다.

```bash
npm run dev:frontend
```

## 현재 포함된 기능

- 로봇 목록 조회 API
- 단일 로봇 상세 조회 API
- 시스템 헬스체크 API
- 관제 대시보드 UI
- 상태 요약 카드와 로봇 플릿 현황 패널

## 다음 확장 후보

- 실시간 텔레메트리(WebSocket)
- 작업 할당과 원격 명령 전송
- 지도 기반 위치 시각화
- 사용자 인증과 권한 분리
