import { useEffect, useState } from 'react';

import { PublicMenuClientError } from '../api/public-menu-client';
import type { PublicMenu as PublicMenuData } from '../contracts/public-menu';
import { getPublicMenu } from '../data/get-public-menu';
import { CategorySection } from './CategorySection';
import { MenuState } from './MenuState';
import { readMenuQuery, type MenuQueryResult } from '../lib/menu-query';

type MenuLoadState =
  | { kind: 'loading' }
  | { kind: 'invalid-query'; reason: 'missing' | 'invalid' }
  | { kind: 'error'; code?: string }
  | { kind: 'ready'; menu: PublicMenuData };

const initialState: MenuLoadState = { kind: 'loading' };

function getQueryResult(): MenuQueryResult {
  return readMenuQuery(window.location.search);
}

function getErrorCode(error: unknown): string | undefined {
  return error instanceof PublicMenuClientError ? error.code : undefined;
}

export function PublicMenu() {
  const [loadState, setLoadState] = useState<MenuLoadState>(initialState);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const queryResult = getQueryResult();

    if (!queryResult.valid) {
      setLoadState({ kind: 'invalid-query', reason: queryResult.reason });
      return () => {
        cancelled = true;
      };
    }

    setLoadState({ kind: 'loading' });

    getPublicMenu(queryResult.value)
      .then((menu) => {
        if (!cancelled) {
          setLoadState({ kind: 'ready', menu });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadState({ kind: 'error', code: getErrorCode(error) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  if (loadState.kind === 'loading') {
    return <MenuState kind="loading" />;
  }

  if (loadState.kind === 'invalid-query') {
    return <MenuState kind="invalid-query" invalidQueryReason={loadState.reason} />;
  }

  if (loadState.kind === 'error') {
    return (
      <MenuState
        kind="error"
        errorCode={loadState.code}
        onRetry={() => setRetryCount((count) => count + 1)}
      />
    );
  }

  if (loadState.menu.categories.length === 0) {
    return <MenuState kind="empty" />;
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8 sm:pb-24 lg:px-12">
      <nav
        className="mb-4 flex flex-col gap-4 border-y border-[#12324a]/15 py-4 sm:flex-row sm:items-center sm:justify-between"
        aria-label="Categorías del menú"
      >
        <p className="shrink-0 text-xs font-bold uppercase tracking-[0.2em] text-[#12324a]/50">Explora la carta</p>
        <ul className="flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-sm font-semibold text-[#12324a]">
          {loadState.menu.categories.map((category) => (
            <li key={category.id}>
              <a
                className="underline decoration-[#e76832]/50 decoration-2 underline-offset-4 transition-colors hover:text-[#e76832] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/25"
                href={`#category-${category.id}`}
              >
                {category.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div>
        {loadState.menu.categories.map((category) => (
          <CategorySection key={category.id} category={category} />
        ))}
      </div>
    </main>
  );
}
