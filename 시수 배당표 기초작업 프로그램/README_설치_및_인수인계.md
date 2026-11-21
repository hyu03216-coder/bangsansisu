# Clear Grid 6.4 | GitHub → Netlify → Google Apps Script / Sheets

**학교에서 매년 반복하는 교육과정·반편성·수업시수배당 업무를 위한 2인 동기화 시제품**

## 0. 이 버전에서 되는 것 / 안 되는 것

- 기존 Clear Grid 6.3의 학년도 관리, 리로스쿨 반편성 비교·승인, 시수배당, JSON 백업, 엑셀 내보내기 코드를 유지합니다.
- GitHub 저장소의 코드 변경을 Netlify에 자동 배포할 수 있도록 구성했습니다.
- Netlify Functions → Google Apps Script → Google 스프레드시트로 **전체 학년도 업무 상태**를 명시적으로 저장하고 불러올 수 있습니다.
- 담당자 A/B 각각 별도 32자 이상 비밀 토큰을 사용하고, 저장 버전이 다른 경우 **무조건 409 충돌로 거절**합니다. 두 담당자가 동시에 바꾼 내용을 임의로 합치거나 덮어쓰지 않습니다.
- 30초마다 서버의 버전 번호를 확인하되, **화면 내용은 자동으로 덮어쓰지 않습니다.** 변경사항을 다른 PC에 반영하려면 `클라우드 저장`을 눌러야 합니다.
- 이 패키지의 Google 연동은 실제 학교 Google/Netlify 계정으로 **아직 끝까지 실연결 테스트하지 않았습니다.** 아래 초기 설정과 실사용 검증이 필요합니다.

> **중요:** URL+토큰 방식은 학교 Google Workspace 로그인과 같은 강력한 교직원 인증이 아닙니다. 승인된 사용자만 토큰을 관리하고, 학생 이름·학번·반편성 원본 엑셀은 Google에 보내지 않도록 합니다. 교사 이름을 포함한 업무 데이터의 외부 저장 가능 여부도 학교 관리자와 확인하십시오.

## 1. 프로젝트 구조

```
.
├── netlify.toml                  # GitHub 연동 배포 (publish = site)
├── .gitignore                    # 엑셀/JSON 백업/비밀값 Git 등록 차단
├── .env.example                  # 환경변수 이름 참고만; 비밀값 금지
├── site/
│   ├── index.html
│   ├── _headers
│   ├── robots.txt
│   └── assets/
│       ├── app.js               # 기존 계산/학년도/리로스쿨 비교 로직
│       ├── bootstrap.js         # 빈 데이터. 원본 학교 데이터 포함 금지
│       ├── storage.js           # 브라우저 로컬 백업
│       ├── cloud.js             # 접속/조회/저장/버전 비교 화면
│       ├── cloud.css            # 동기화 화면 디자인
│       └── styles.css
├── netlify/functions/
│   └── sync.mjs                 # 서버 비밀 설정 URL allowlist + GAS 프록시
├── google-apps-script/
│   └── Code.gs                  # 구글 스프레드시트 저장/잠금/이력
├── scripts/generate-tokens.mjs  # A/B 장기 랜덤 토큰 생성
└── tests/                       # Node 단위 테스트 (npm test)
```

## 2. Google 스프레드시트 + Apps Script 최초 설정

1. 학교의 관리 가능한 Google 계정으로 **빈 Google 스프레드시트**를 새로 만듭니다. (개인 계정보다 학교 관리 계정 권장)
2. 그 문서의 주소 `https://docs.google.com/spreadsheets/d/XXXXXXX/edit`에서 `XXXXXXX`가 **SHEET_ID**입니다.
3. 스프레드시트 `확장 프로그램 → Apps Script`를 열고 `google-apps-script/Code.gs` 전체를 붙여넣고 저장합니다.
4. 개인 PC에서 Node.js가 설치되어 있으면 `npm run tokens`를 실행하여 **담당자 A/B용 서로 다른 랜덤 토큰**을 생성합니다. (비밀번호 관리 프로그램에 보관)
5. Apps Script 편집기 `프로젝트 설정(톱니바퀴) → 스크립트 속성`에서 다음 세 값을 만듭니다.
   - `SHEET_ID` : 스프레드시트 ID
   - `TOKEN_A` : 담당자 A의 랜덤 토큰
   - `TOKEN_B` : 담당자 B의 랜덤 토큰
6. `배포 → 새 배포 → 웹 앱`을 선택합니다. **다음 사용자 인증 정보로 실행 = 나(배포 소유자)**. 접속 권한은 기관의 정책에 맞춰 선택합니다. Google 계정 OAuth 없이 토큰만 쓰는 이 프록시 구조는 일반적으로 웹앱의 외부 호출 접근이 허용되어야 합니다. 기관에서 `모든 사용자(Anyone)`가 금지되면 이 설계로 진행하지 말고 Google Workspace OAuth 구조로 바꿔야 합니다.
7. Apps Script 최초 실행 권한을 승인하고, 생성된 `https://script.google.com/macros/s/.../exec` 주소를 따로 보관합니다. **이 주소는 토큰은 아니지만 타인에게 불필요하게 공개하지 마십시오.**
8. `CG_Head`, `CG_Payload`, `CG_History` 시트는 첫 호출 때 자동으로 생깁니다. 일반 사용자가 이 시트를 직접 수정하면 동기화가 깨질 수 있습니다.

**주의:** 토큰은 GitHub 코드·README·Netlify 배포 폴더에 작성하지 마세요. Apps Script의 스크립트 속성은 프로젝트 편집 권한을 가진 관리자가 볼 수 있습니다.

## 3. GitHub 저장소 만들기

1. [GitHub](https://github.com)에서 **Private 저장소** `clear-grid-school`을 생성합니다.
2. ZIP을 풀고 프로젝트 폴더의 **파일·하위 폴더 전체**를 GitHub Desktop 또는 Git으로 등록합니다. ZIP 자체를 커밋하는 것이 아니라 `netlify.toml`, `site/`, `netlify/functions/`, `google-apps-script/` 등이 실제 파일로 올라가야 합니다.
3. 가장 단순한 Git 명령 예시:

   ```bash
   git init
   git add .
   git commit -m "Initial Clear Grid 6.4"
   git branch -M main
   git remote add origin https://github.com/OWNER/clear-grid-school.git
   git push -u origin main
   ```

   여기서 `OWNER`는 직접 만든 GitHub 사용자/조직 이름입니다. GitHub 로그인 및 권한 설정은 본인이 진행해야 합니다.
4. `git status` 등으로 **실제 반편성 엑셀(.xlsx/.xls), 전체 백업(.json), 토큰이 커밋되지 않았는지** 확인합니다. `.gitignore`는 오등록 방지용이지 이미 커밋한 비밀을 삭제하지는 않습니다.

## 4. Netlify와 GitHub 연결

1. [Netlify 대시보드](https://app.netlify.com/)에 로그인합니다.
2. `Add new project` → `Import an existing project` → `GitHub`를 선택해 만든 저장소를 연결합니다. (표시 메뉴는 변경될 수 있습니다.)
3. 빌드 설정: **Base directory = 비움**, **Build command = 비움**, **Publish directory = `site`**, **Functions directory = `netlify/functions`**. `netlify.toml`에 미리 설정되어 있습니다.
4. Netlify의 **Environment variables** 설정에서 `GAS_WEBAPP_URL`에 앞에서 만든 Apps Script `/exec` URL을 입력합니다. **Functions 실행 범위**에 제공되어야 합니다. `netlify.toml`에 비밀 URL을 기록하지 마세요.
5. 배포를 실행하거나 재배포해 `https://<your-site>.netlify.app/`에 접속합니다.
6. 이후 GitHub의 `main` 브랜치에 코드를 업데이트하면 Netlify가 새 버전을 자동 배포합니다. **학년도별 데이터는 GitHub가 아니라 Google 시트에 있으므로 프로그램 업데이트와 분리**됩니다.

**Netlify Drop에 `site` 폴더만 끌어놓는 방식은 이 버전의 동기화 기능을 배포하지 않습니다.** 반드시 GitHub 저장소 전체를 연결해 **Netlify Functions가 포함된 배포**를 해야 합니다.

## 5. 실제 사용 순서 (두 명)

**최초 1회 (A 담당자):**

1. Netlify 웹사이트를 엽니다. `학년도 관리`에서 기존 6.3 `전체 학년도 JSON 백업`을 복원하거나, 교육과정/리로스쿨을 등록합니다.
2. 상단 `☁ Google 동기화` 버튼 클릭 → Apps Script `/exec` URL과 **담당자 A 토큰** 입력 → `서버 연결 확인`.
3. 서버 버전이 **0(최초 등록 전)**임을 확인하고 `현재 자료 첫 등록`으로 올립니다.
4. 재접속 시 `클라우드 최신 자료 불러오기`로 정상 복원이 되는지 검증합니다.

**B 담당자:**

1. 다른 PC에서 같은 Netlify 주소를 엽니다.
2. 상단 `☁ Google 동기화`에서 **같은 Apps Script URL + 담당자 B 개인 토큰** 입력.
3. 반드시 `클라우드 최신 자료 불러오기`를 먼저 눌러 A가 저장한 자료를 가져옵니다.
4. 수업시수배당표를 수정하고 `현재 작업 클라우드 저장`을 눌러 공유합니다.

**충돌 시:** B가 이전 버전을 연 상태에서 A가 먼저 저장했다면 B의 저장 요청은 `CONFLICT(409)`로 거절됩니다. B의 로컬 작업은 살아 있습니다. B는 먼저 **`전체 학년도 JSON 백업`을 내려받은 후**, A의 최신본을 불러와 필요한 수정을 다시 반영해야 합니다. 자동 병합·셀 단위 동시 편집은 이 버전에서 제공하지 않습니다.

## 6. 보안 및 인수인계

- **개인별 고유 토큰**을 사용하며 토큰은 브라우저 저장소에 보관하지 않습니다. 새로고침 또는 재접속하면 URL/토큰을 다시 입력합니다.
- Netlify의 `GAS_WEBAPP_URL`은 서버 환경변수로만 저장하며, 사용자가 입력한 주소와 정확히 일치할 때만 요청을 중계합니다. 임의 웹 주소로 보내는 프록시가 아닙니다.
- 학교 원본 리로스쿨 엑셀의 학생별 이름/학번은 서버에 전송하지 않습니다. **앱이 생성한 학년도별 과목·분반 집계 및 교사명단은 전송**됩니다. 저장 전 JSON 백업 파일의 내용이 학교 규정상 허용되는지 확인하십시오.
- Google 시트에는 gzip+base64 형태의 업무 자료가 저장됩니다. **압축은 암호화가 아닙니다.** 시트 편집 권한이 있는 사람은 자료를 복원할 수 있습니다.
- `CG_Payload`에 저장한 과거 버전 데이터가 계속 누적되므로 저장량·시트 용량을 정기 점검하고 학교 정한 보존 기간에 맞춰 정리해야 합니다.
- 확정본은 기존 화면에서 잠기지만 **두 담당자가 토큰을 가지고 있는 경우 서버에서도 원천적으로 복구 불가한 삭제를 방지하는 역할별 권한 구분은 제공하지 않습니다.**
- 토큰 유출 시 Apps Script 스크립트 속성의 해당 토큰을 새 값으로 교체합니다. 배포된 코드 변경은 필요하지 않습니다.
- 동기화 서버 오류가 나면 브라우저의 로컬 자료와 JSON 백업으로 업무를 이어갈 수 있습니다. 단, **로컬 저장만으로 다른 PC에 변경이 반영되지는 않습니다.**

## 7. 직접 확인할 체크리스트

- [ ] GitHub 저장소가 **Private**이며 학생별 엑셀/JSON/토큰이 없는지 확인
- [ ] GitHub main에 변경을 푸시하면 Netlify에서 새 배포가 이루어지는지 확인
- [ ] Netlify 배포 도메인이 HTTPS인지 확인
- [ ] A/B 토큰이 모두 통과하고 잘못된 토큰은 거절되는지 확인
- [ ] A가 클라우드 저장 → B가 최신 자료 불러오기 → 집계가 일치하는지 확인
- [ ] 같은 버전으로 A/B 연속 저장 시 두 번째 요청은 충돌 경고를 보이는지 확인
- [ ] JSON 전체 백업 다운로드 및 2027학년도 3학년 화학 실험 34명/1개 반이 맞는지 확인
- [ ] 원본 학생 명단이 Google 시트·GitHub·Netlify에 실수로 업로드되지 않았는지 검토
- [ ] 교사 이름을 Google에 보관하는 것에 대한 학교의 정보보호 승인 여부 확인

## 8. 개발 시 테스트

```bash
npm test
```

Node.js 기본 테스트로 인증/충돌/저장/읽기 및 Netlify 프록시 URL 검증을 점검합니다. 이 테스트들은 **모의 Google Apps Script 환경**이며 실제 인터넷 서비스 계정에 배포한 테스트가 아닙니다.

공식 문서:
- Netlify GitHub 연결: https://docs.netlify.com/build/git-workflows/repo-permissions-linking/
- Netlify Functions 환경변수: https://docs.netlify.com/build/functions/environment-variables/
- Google Apps Script 웹앱: https://developers.google.com/apps-script/guides/web
- Google Apps Script LockService: https://developers.google.com/apps-script/reference/lock/lock-service
