# Mock Analytics Server

시간 범위 기능 테스트를 위한 Mock Data 제공 서버입니다.

## 🎯 목적

Analytics Dashboard의 Time Range 기능(1h, 24h, 7d, 30d)이 제대로 동작하는지 테스트하기 위해 만들어진 Mock 서버입니다.

## 🚀 사용 방법

### 방법 1: 스크립트 실행 (권장)
```bash
# 프로젝트 루트에서
cd test-utils/mock-server
./run-mock-server.sh
```

### 방법 2: 직접 실행
```bash
# 프로젝트 루트에서
node test-utils/mock-server/mock-analytics-server.js
```

> 💡 **의존성 없음**: Node.js 내장 모듈만 사용하므로 npm install이 필요 없습니다!

## 🧪 테스트 절차

1. **기존 tx-api 중지** (실행 중이라면)
2. **Mock 서버 시작** (위 명령어 중 하나)
3. **Analytics Dashboard 열기** (http://localhost:3000)
4. **Time Range 테스트**:
   - 1h: 1시간 데이터 확인
   - 24h: 24시간 데이터 확인
   - 7d: 7일 데이터 확인
   - 30d: 30일 데이터 확인

## 📊 Mock Server 특징

- **포트**: 8000 (기존 tx-api와 동일)
- **모든 API 엔드포인트 지원**: 6개 analytics API 모두 구현
- **실제같은 데이터**: 업무시간, 주말 패턴 반영
- **동적 데이터**: 시간 범위에 따라 적절한 데이터량 제공
- **토큰 지원**: MSQ, SUT, KWT, P2UC 모두 지원

## 🔗 지원하는 API 엔드포인트

- `GET /api/v1/analytics/realtime?token=MSQ&hours=24`
- `GET /api/v1/analytics/volume/hourly?hours=24&limit=24&token=MSQ`
- `GET /api/v1/analytics/distribution/token?token=MSQ&hours=24`
- `GET /api/v1/analytics/addresses/top?metric=volume&limit=10&token=MSQ&hours=24`
- `GET /api/v1/analytics/anomalies?token=MSQ&hours=24`
- `GET /api/v1/analytics/network?token=MSQ&hours=24`

## 🎯 테스트 포인트

1. ✅ Time Range 선택 시 즉시 데이터 반영
2. ✅ 각 범위별로 적절한 데이터량 표시
3. ✅ 차트가 정상 렌더링
4. ✅ 토큰별 필터링 작동
5. ✅ 모든 통계 정보 업데이트

## ⏹️ 서버 중지

서버를 중지하려면 터미널에서 `Ctrl+C`를 누르세요.

## 📝 참고사항

- Mock 서버는 실제 데이터베이스에 연결되지 않습니다
- 데이터는 매번 새로 생성되므로 일관성이 없을 수 있습니다
- 테스트 완료 후 기존 tx-api를 다시 시작하세요