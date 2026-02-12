# Testing

## Unit & Integration Tests (Jest + React Testing Library)

```bash
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Test Structure

- **lib/__tests__/** — utils, instruments, constants, languages, API client
- **lib/hooks/__tests__/** — useAuth, useModalA11y
- **stores/__tests__/** — account.store, toast.store
- **components/__tests__/** — AppHeader
- **components/auth/__tests__/** — AuthGuard
- **components/chart/.../__tests__/** — SMA calculation
- **app/__tests__/** — error, global-error, loading
- **app/profile/__tests__/**, **app/terminal/__tests__/**, **app/trade/__tests__/** — page error boundaries

### Coverage

Coverage is collected from `app/`, `components/`, `lib/`, `stores/`. Thresholds are set to allow gradual improvement.

## E2E Tests (Playwright)

```bash
npm run test:e2e      # Run E2E (starts dev server automatically)
npx playwright install # First-time: install browsers
```

### E2E Structure

- **e2e/home.spec.ts** — Home page load, logo, navigation
- **e2e/auth.spec.ts** — Login/register pages, auth panel

### Configuration

- `playwright.config.ts` — baseURL localhost:3000, Chromium/Firefox/WebKit
- Dev server starts automatically unless `reuseExistingServer` is used
