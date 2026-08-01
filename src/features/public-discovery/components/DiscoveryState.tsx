import {
  Building2,
  CircleAlert,
  LoaderCircle,
  RefreshCw,
  Store,
} from 'lucide-react';

type DiscoveryStateKind = 'loading' | 'configuration' | 'empty' | 'error';

interface DiscoveryStateProps {
  kind: DiscoveryStateKind;
  errorCode?: string;
  onRetry?: () => void;
}

const stateCopy = {
  configuration: {
    eyebrow: 'Configuración pendiente',
    title: 'No podemos encontrar el restaurante todavía.',
    description:
      'El enlace público necesita una configuración válida para mostrar sus sucursales.',
  },
  empty: {
    eyebrow: 'Próximamente',
    title: 'No hay sucursales abiertas para mostrar.',
    description:
      'Vuelve pronto para descubrir dónde encontrarnos.',
  },
  error: {
    eyebrow: 'No pudimos cargar las sucursales',
    title: 'La carta está temporalmente fuera de alcance.',
    description:
      'Inténtalo nuevamente en unos segundos. Si el problema continúa, vuelve a abrir el enlace.',
  },
} as const;

export function DiscoveryState({ kind, errorCode, onRetry }: DiscoveryStateProps) {
  if (kind === 'loading') {
    return (
      <section
        id="main-content"
        className="mx-auto flex min-h-[24rem] max-w-xl flex-col items-center justify-center rounded-[2rem] border border-[#12324a]/10 bg-white/70 px-6 py-16 text-center shadow-[0_24px_70px_rgba(18,50,74,0.08)]"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle className="mb-5 animate-spin text-[#e76832]" size={28} aria-hidden="true" />
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[#e76832]">Un momento</p>
        <h1 className="font-heading text-3xl font-semibold tracking-[-0.04em] text-[#12324a]">
          Estamos buscando tu mesa.
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[#12324a]/65">
          Cargando las sucursales disponibles del restaurante.
        </p>
      </section>
    );
  }

  const copy = stateCopy[kind];
  const Icon = kind === 'empty' ? Store : kind === 'configuration' ? Building2 : CircleAlert;

  return (
    <section
      id="main-content"
      className="mx-auto flex min-h-[24rem] max-w-xl flex-col items-center justify-center rounded-[2rem] border border-[#12324a]/10 bg-white/70 px-6 py-16 text-center shadow-[0_24px_70px_rgba(18,50,74,0.08)]"
      role={kind === 'error' || kind === 'configuration' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <span className="mb-5 grid size-14 place-items-center rounded-full bg-[#dcecef] text-[#12324a]" aria-hidden="true">
        <Icon size={24} strokeWidth={1.8} />
      </span>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[#e76832]">{copy.eyebrow}</p>
      <h1 className="max-w-md font-heading text-3xl font-semibold tracking-[-0.04em] text-[#12324a]">
        {copy.title}
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-[#12324a]/65">{copy.description}</p>
      {kind === 'error' && errorCode === 'RESTAURANT_NOT_FOUND' ? (
        <p className="mt-3 text-xs font-medium text-[#12324a]/55">
          El restaurante configurado no está disponible.
        </p>
      ) : null}
      {kind === 'error' && onRetry ? (
        <button
          className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#12324a] px-5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-[#1d4b68] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e76832]/35"
          type="button"
          onClick={onRetry}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Intentar de nuevo
        </button>
      ) : null}
    </section>
  );
}
