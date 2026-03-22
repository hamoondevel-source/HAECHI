# HAECHI 공통 아키텍처 / MVC 리팩터링 룰

## 문서 목적

이 문서는 요청에서 말한 `MCV`를 일반적인 `MVC` 패턴으로 해석해 정리한다.

목표는 세 가지다.

- 프로젝트 전체에 공통으로 적용할 아키텍처 규칙을 정의한다.
- `backend`, `frontend`, `electron`의 책임 경계를 명확히 한다.
- 모든 기능이 같은 도메인 모델을 공유하도록 기준 모델과 네이밍 규칙을 통일한다.

## 현재 프로젝트에서의 MVC 해석

이 프로젝트는 전통적인 서버 렌더링 MVC가 아니라, 멀티 런타임 MVC로 해석하는 편이 맞다.

- `Model`
  backend의 도메인 데이터, 비즈니스 규칙, 권한 체크, draft/publish 상태, 영속화 로직

- `View`
  React UI 컴포넌트

- `Controller`
  프론트엔드 feature controller / service 계층과 backend route handler + domain service

- `Electron main / preload`
  MVC의 핵심 Model이 아니라 네이티브 인프라 어댑터

즉 이 프로젝트에서 Electron은 Model의 주인이 아니다. Electron은 창, 파일 선택, OS 연동을 담당하는 인프라 계층이다.

## 최상위 원칙

### 1. 단일 진실원본은 backend다

도메인 데이터의 canonical source는 backend여야 한다.

- 맵 draft/published
- 권한/세션
- 팀/계정
- publish 상태

Electron 로컬 파일은 import/export, cache, 임시 작업 디렉터리로만 사용한다.

### 2. 도메인 CRUD는 한 가지 transport만 쓴다

같은 도메인 작업을 REST와 IPC 두 군데로 동시에 제공하지 않는다.

- 도메인 CRUD: backend API
- 네이티브 기능: Electron IPC

예시:

- 맵 저장, Spot 수정, publish, 권한 검증: backend API
- 창 열기, 창 최소화/최대화, 파일 선택 dialog: Electron IPC

### 3. React 컴포넌트는 IO의 시작점이 되지 않는다

React 컴포넌트는 View 역할에 집중한다.

- 컴포넌트 안에서 `fetch()` 남발 금지
- 컴포넌트 안에서 `window.haechiDesktop` 직접 호출 남발 금지
- IO는 feature service / controller를 통해서만 수행

### 4. 프론트엔드 local state는 편집 중 임시 상태다

React state는 canonical data가 아니라 작업 중 draft buffer다.

- 사용자가 편집 중인 상태를 담는다.
- 저장 전까지는 서버 상태가 아니다.
- 저장 시 backend canonical model로 변환해 반영한다.

### 5. 권한과 actor 검증은 backend에서만 확정한다

`actorId`, 세션, 권한, publish 권한은 모두 backend에서 검증한다.

- Electron query string에 actorId를 실어도 신뢰하지 않는다.
- renderer state의 role도 신뢰하지 않는다.
- 최종 허용/거부는 backend만 결정한다.

## 런타임별 책임

| 런타임 | 역할 | 해도 되는 것 | 하면 안 되는 것 |
| --- | --- | --- | --- |
| `backend` | Model + domain controller | 영속화, validation, publish, auth, canonical DTO 반환 | UI 상태 직접 관리 |
| `frontend` | View + UI controller | 화면 렌더링, 편집 중 상태, 사용자 액션 조합 | canonical 데이터 저장소 역할 |
| `electron main` | infra adapter | 창 열기, dialog, 파일 선택, OS 연동 | 맵 CRUD의 단일 저장소 역할 |
| `preload` | safe bridge | 제한된 네이티브 API 노출 | 비즈니스 규칙 보유 |

## 공통 룰

### 룰 A. 이름을 도메인 기준으로 통일한다

도메인 명칭을 코드 전체에서 일관되게 쓴다.

- `Domain`
- `Deck`
- `Spot`
- `Waypoint`
- `WaypointGroup`
- `Edge`
- `Area`
- `NoGoZone`
- `Dock`
- `Portal`
- `MapDocument`

정리 대상:

- `project`라는 이름이 실제로 `deck`를 뜻하는 경우가 많다.
- `projectId`가 실제로 `deckId` 역할을 하는 곳은 점진적으로 교체한다.

### 룰 B. canonical DTO를 하나만 둔다

프론트엔드, 백엔드, Electron이 같은 형태의 데이터를 이해할 수 있도록 공통 모델을 문서화하고, 가능하면 `shared` 계층으로 분리한다.

권장 경로:

```text
shared/
  contracts/
    map.js
    session.js
  schemas/
    mapSchema.js
```

### 룰 C. 변환은 adapter에서만 수행한다

모델 변환은 adapter 또는 service에서만 수행한다.

- backend raw store -> response DTO
- file picker 결과 -> image upload request
- UI selection state -> save patch DTO

컴포넌트가 response shape를 임의로 재조합하지 않도록 한다.

### 룰 D. 저장 경로와 조회 경로는 같은 모델을 기준으로 한다

읽을 때는 `Model A`, 저장할 때는 `Model B`면 안 된다.

- load response shape
- local editing shape
- save request shape

이 세 가지의 차이는 최소화한다. 차이가 필요하면 adapter가 명시적으로 변환한다.

### 룰 E. publish lifecycle은 backend에만 둔다

`draft -> published`는 도메인 상태 전이이므로 backend가 책임진다.

- frontend는 publish 요청만 보낸다.
- Electron은 publish를 직접 수행하지 않는다.

### 룰 F. feature별 controller를 둔다

각 feature는 최소한 다음 구조를 가진다.

```text
frontend/src/features/<feature>/
  components/
  controllers/
  services/
  model/
```

역할:

- `components`: 화면
- `controllers`: 액션 orchestration
- `services`: API / IPC 호출
- `model`: normalize, selector, mapper

## 공통 모델 정의

아래 모델을 전체 프로젝트의 canonical 기준으로 사용한다.

```ts
type ImageAsset = {
  name: string
  fileName: string | null
  width: number
  height: number
  src?: string | null
  serverSrc?: string | null
  previewSrc?: string | null
}

type Calibration = {
  origin: { x: number; y: number }
  resolution: number
  rotation: number
  gridMeters: number
  gridColor: string
  gridOpacity: number
  gridCount: number
}

type WaypointGroup = {
  id: string
  name: string
  color?: string
  tagOpacity?: number
}

type Waypoint = {
  id: string
  name: string
  x: number
  y: number
  groupId?: string | null
  color?: string
}

type Edge = {
  id: string
  name: string
  from: string
  to: string
  direction: "unidirectional" | "bidirectional"
  groupId?: string | null
}

type Area = {
  id: string
  name: string
  kind: string
  x: number
  y: number
  width: number
  height: number
  color?: string
  opacity?: number
}

type SpotEditorState = {
  waypointGroups: WaypointGroup[]
  waypoints: Waypoint[]
  edges: Edge[]
  zones: Area[]
}

type Spot = {
  id: string
  name: string
  zoneKey: string
  x: number
  y: number
  width: number
  height: number
  image?: ImageAsset | null
  calibration?: Calibration | null
  editor?: SpotEditorState | null
}

type NoGoZone = {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
}

type Dock = {
  id: string
  name: string
  kind: "dock" | "vertical"
  x: number
  y: number
}

type Portal = {
  id: string
  name: string
  kind: "vertical"
  x: number
  y: number
  targetDeckId?: string | null
}

type Deck = {
  id: string
  label: string
  name: string
  elevation: number
  image?: ImageAsset | null
  calibration?: Calibration | null
  spots: Spot[]
  noGoZones: NoGoZone[]
  docks: Dock[]
  portals: Portal[]
}

type MapDocument = {
  id: string
  name: string
  status: "draft" | "published"
  version: string
  updatedAt: string
  activeDeckId: string
  decks: Deck[]
}
```

## 표준 응답 형태

가능하면 API와 service 결과를 아래처럼 통일한다.

```ts
type ApiSuccess<T> = {
  ok: true
  data: T
  message?: string
}

type ApiFailure = {
  ok: false
  message: string
  code?: string
}
```

현재 프로젝트는 plain JSON 응답도 많지만, 리팩터링 기준은 위 형태를 목표로 잡는 편이 낫다.

## Electron 공통 룰

Electron bridge는 아래 네이티브 API만 남기는 것을 기본 원칙으로 한다.

- `openWindow`
- `window:minimize`
- `window:maximize`
- `window:close`
- `dialog:pickFile`
- `dialog:pickDirectory`
- `shell:openPath`

맵 CRUD용 IPC는 제거 대상이다.

## 폴더 구조 권장안

```text
backend/
  src/
    domain/
      map/
      session/
    services/
    routes/
    repositories/

frontend/
  src/
    features/
      map-studio/
        components/
        controllers/
        services/
        model/
      spot-studio/
        components/
        controllers/
        services/
        model/

electron/
  src/
    windows/
    bridge/
    native/

shared/
  contracts/
  schemas/
  utils/
```

## 리팩터링 우선순위

### 1순위

- canonical map model을 backend 기준으로 고정
- Electron의 맵 CRUD 책임 제거
- frontend 컴포넌트에서 raw fetch / raw IPC 직접 호출 축소

### 2순위

- `project` 명칭을 `deck` 또는 `deckDocument`로 교체
- `projectId`/`deckId` 혼용 정리
- 공통 DTO와 schema 추가

### 3순위

- feature controller / service 계층 도입
- backend route와 domain service 분리
- Electron bridge 최소화

## 완료 조건

아래 조건을 만족하면 공통 아키텍처 정리가 끝난 것으로 본다.

- 맵 데이터 저장 경로가 backend 하나로 통일된다.
- Spot Studio 저장 결과가 publish 경로와 직접 이어진다.
- 동일 도메인에 대해 REST와 IPC가 동시에 CRUD를 제공하지 않는다.
- UI 컴포넌트는 service/controller를 통해서만 저장과 조회를 수행한다.
- `Domain`, `Deck`, `Spot` 모델 이름이 코드 전반에서 일관되게 사용된다.
