# Token History Sync Utility

이 유틸리티는 PolygonScan API를 사용하여 MSQ 생태계 토큰들의 히스토리 데이터를 한 번에 수집하는 도구입니다.

## 📋 목적

- 토큰 배포 시점부터 현재까지의 모든 트랜잭션을 PolygonScan API를 통해 빠르게 수집
- 최초 1회만 실행하여 데이터베이스를 채움
- 이후에는 chain-scanner가 실시간으로 새로운 트랜잭션 처리

## 🔧 설정

### 1. 환경 변수 설정

`.env` 파일을 생성하고 필요한 값을 입력하세요:

```bash
cp .env.example .env
```

`.env` 파일 내용:
```bash
# PolygonScan API Key (필수)
POLYGONSCAN_API_KEY=your_api_key_here

# Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=msq_tx_monitor
MYSQL_USERNAME=root
MYSQL_PASSWORD=password
```

### 2. PolygonScan API Key 발급

1. [PolygonScan](https://polygonscan.com/register) 회원가입
2. [API Keys 페이지](https://polygonscan.com/myapikey) 이동
3. "Add" 버튼 클릭하여 새 API Key 생성
4. 생성된 API Key를 `.env` 파일에 입력

### 3. 의존성 설치

프로젝트 루트에서 pnpm install을 실행하면 자동으로 설치됩니다:

```bash
pnpm install
```

## 🚀 사용법

### 전체 토큰 동기화 (권장)

```bash
pnpm sync:all
```

4개 토큰 (MSQ, KWT, SUT, P2UC) 모두를 순차적으로 동기화합니다.

### 개별 토큰 동기화

```bash
# MSQ만 동기화
pnpm sync:msq

# KWT만 동기화
pnpm sync:kwt

# SUT만 동기화
pnpm sync:sut

# P2UC만 동기화
pnpm sync:p2uc
```

### 직접 실행

```bash
pnpm sync --token=ALL
pnpm sync --token=MSQ
```

## 📊 동작 과정

1. **PolygonScan API 호출**
   - 각 토큰의 배포 블록부터 현재까지 트랜잭션 조회
   - 페이지당 최대 10,000개씩 자동 페이지네이션

2. **데이터 변환**
   - PolygonScan 응답 → 데이터베이스 형식으로 변환
   - Unix timestamp → Date 객체 변환

3. **데이터베이스 저장**
   - 1,000개씩 배치 단위로 저장
   - `skipDuplicates: true` 옵션으로 중복 방지
   - 기존 데이터는 건너뜀

4. **진행 상황 표시**
   - 페이지별 진행 상황 실시간 출력
   - 저장된 트랜잭션 수 및 중복 건수 표시

## ⚙️ 토큰 설정

| 토큰 | Contract Address | Deployment Block |
|------|-----------------|------------------|
| MSQ  | 0x6A8Ec2d9BfBDD20A7F5A4E89D640F7E7cebA4499 | 28,385,214 |
| KWT  | 0x435001Af7fC65B621B0043df99810B2f30860c5d | 69,407,446 |
| SUT  | 0x98965474EcBeC2F532F1f780ee37b0b05F77Ca55 | 52,882,612 |
| P2UC | 0x8B3C6ff5911392dECB5B08611822280dEe0E4f64 | 73,725,373 |

## ⚠️ 주의사항

### API Rate Limit

- **무료 플랜**: 초당 5회 요청 제한
- 자동으로 200ms 딜레이 적용
- 대량 데이터 수집 시 시간이 오래 걸릴 수 있음

### 데이터 중복

- `skipDuplicates: true` 옵션으로 안전하게 재실행 가능
- 이미 존재하는 트랜잭션은 자동으로 건너뜀

### 실행 시간

토큰별 트랜잭션 수에 따라 다름:
- 적은 트랜잭션 (~1만): 수 분
- 보통 트랜잭션 (~10만): 수십 분
- 많은 트랜잭션 (~100만): 몇 시간

### 중단 및 재개

- 중단 시 안전하게 종료됨
- 재실행 시 `skipDuplicates`로 이미 저장된 데이터는 건너뜀
- 중단된 시점부터 자동으로 이어서 진행

## 📝 출력 예시

```
🚀 Token History Sync Utility
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target: ALL
API Key: YourKey1...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Initializing database connection...
✅ Database connected

============================================================
🔄 Syncing MSQ (0x6A8Ec2d9BfBDD20A7F5A4E89D640F7E7cebA4499)
   Deployment Block: 28,385,214
============================================================

  📄 Fetching page 1...
  ✅ Page 1: 10,000 transactions (Total: 10,000)
  📄 Fetching page 2...
  ✅ Page 2: 10,000 transactions (Total: 20,000)
  ...

  📊 Total fetched: 45,230 transactions

  🔄 Converting to database format...
  💾 Saving to database...

    💾 Batch 1/46: Saved 1,000/1,000 transactions
    💾 Batch 2/46: Saved 1,000/1,000 transactions
    ...

  ✅ MSQ sync completed!
     Total fetched: 45,230
     Total saved: 45,230
     Duplicates skipped: 0

============================================================
✅ All sync operations completed successfully!
============================================================
```

## 🔄 재실행

이미 실행한 후 다시 실행해도 안전합니다:
- 중복 데이터는 자동으로 건너뜀
- 새로운 트랜잭션만 추가됨
- 데이터 무결성 보장

## 📂 파일 구조

```
test-utils/sync-token/
├── package.json          # 의존성 및 스크립트
├── tsconfig.json         # TypeScript 설정
├── .env.example          # 환경변수 예시
├── .env                  # 실제 환경변수 (git ignored)
├── README.md             # 이 문서
└── src/
    ├── index.ts          # 메인 실행 로직
    ├── polygonscan.ts    # PolygonScan API 클라이언트
    ├── types.ts          # TypeScript 타입 정의
    └── utils.ts          # 유틸리티 함수
```

## 🐛 문제 해결

### API Key 오류
```
❌ Error: POLYGONSCAN_API_KEY not found in environment variables
```
→ `.env` 파일에 API Key가 설정되어 있는지 확인

### Database 연결 오류
```
❌ Error: Can't connect to MySQL server
```
→ MySQL이 실행 중인지, `.env`의 DB 설정이 올바른지 확인

### Rate Limit 오류
```
❌ PolygonScan API Error: Max rate limit reached
```
→ API Key의 Rate Limit 초과, 잠시 대기 후 재시도

## 📞 도움말

문제가 발생하면:
1. `.env` 파일 설정 확인
2. MySQL 데이터베이스 연결 확인
3. PolygonScan API Key 유효성 확인
4. 로그 메시지 확인
