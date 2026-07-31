export const MENU_FIXTURE_SCENARIOS = ['populated', 'empty', 'error'] as const;

export type MenuFixtureScenario = (typeof MENU_FIXTURE_SCENARIOS)[number];

export interface PublicRuntimeConfig {
  apiBaseUrl: string;
  useMenuFixture: boolean;
  menuFixtureScenario: MenuFixtureScenario;
}

const DEFAULT_API_BASE_URL = 'http://localhost:3000';
const DEFAULT_FIXTURE_SCENARIO: MenuFixtureScenario = 'populated';

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
}

function parseFixtureScenario(value: string | undefined): MenuFixtureScenario {
  if (value && MENU_FIXTURE_SCENARIOS.includes(value as MenuFixtureScenario)) {
    return value as MenuFixtureScenario;
  }

  return DEFAULT_FIXTURE_SCENARIO;
}

function parseApiBaseUrl(value: string | undefined): string {
  const baseUrl = value?.trim() || DEFAULT_API_BASE_URL;

  try {
    return new URL(baseUrl).toString().replace(/\/$/, '');
  } catch {
    throw new Error(`PUBLIC_API_BASE_URL no es una URL válida: ${baseUrl}`);
  }
}

export const runtimeConfig: PublicRuntimeConfig = {
  apiBaseUrl: parseApiBaseUrl(import.meta.env.PUBLIC_API_BASE_URL),
  useMenuFixture: parseBoolean(import.meta.env.PUBLIC_USE_MENU_FIXTURE, false),
  menuFixtureScenario: parseFixtureScenario(import.meta.env.PUBLIC_MENU_FIXTURE_SCENARIO),
};
