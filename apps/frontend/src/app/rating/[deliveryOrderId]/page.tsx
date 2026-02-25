'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { catalogApi } from '@/lib/api/catalog';

export default function DeliveryRatingPage() {
  const params = useParams();
  const deliveryOrderId = params.deliveryOrderId as string | undefined;

  const [rating, setRating] = useState<number | null>(null);
  const [punctuality, setPunctuality] = useState<number | null>(null);
  const [professionalism, setProfessionalism] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryOrderId || rating == null) {
      setError('Selecciona una calificación para enviar tu opinión.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await catalogApi.createDeliveryRating({
        deliveryOrderId,
        rating,
        comment: comment.trim() || undefined,
        punctuality: punctuality ?? undefined,
        professionalism: professionalism ?? undefined
      });
      setSubmitted(true);
    } catch (err) {
      const anyError = err as { response?: { data?: { error?: string } } };
      const rawMessage = anyError.response?.data?.error;
      const message =
        rawMessage === 'Esta entrega ya fue calificada'
          ? 'Esta entrega ya fue calificada. Gracias igualmente por tu interés.'
          : rawMessage || 'No se pudo guardar tu calificación. Intenta de nuevo.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (value: number, onChange: (value: number) => void, name: string) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={`${name}-${star}`}
            type="button"
            onClick={() => onChange(star)}
            className={`h-9 w-9 rounded-full border text-lg ${
              value >= star
                ? 'bg-amber-400/10 border-amber-400/60 text-amber-300'
                : 'bg-[var(--surface2)] border-[var(--border)] text-[var(--muted)]'
            }`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-light,#020817)] text-[var(--dark,#f9fafb)] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[24px] border border-[var(--border,#1f2937)] bg-[var(--surface,#020617)] px-6 py-7 shadow-2xl shadow-black/40">
        {submitted ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 text-2xl">
              ✓
            </div>
            <h1 className="text-lg font-bold text-[var(--foreground,#f9fafb)]">
              ¡Gracias por tu opinión!
            </h1>
            <p className="text-xs text-[var(--muted,#9ca3af)]">
              Tu calificación nos ayuda a mejorar la experiencia de entrega.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-lg font-bold text-[var(--foreground,#f9fafb)]">
                Califica tu entrega
              </h1>
              <p className="text-xs text-[var(--muted,#9ca3af)]">
                Cuéntanos cómo te fue con el repartidor. Solo te tomará unos segundos.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--foreground,#f9fafb)]">
                  Experiencia general
                </span>
                {rating != null && (
                  <span className="text-[11px] text-[var(--muted,#9ca3af)]">
                    {rating} de 5
                  </span>
                )}
              </div>
              {renderStars(rating ?? 0, value => setRating(value), 'overall')}
            </div>

            <div className="grid grid-cols-2 gap-4 text-[11px] text-[var(--muted,#9ca3af)]">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Puntualidad</span>
                  {punctuality != null && (
                    <span className="text-[10px]">{punctuality} de 5</span>
                  )}
                </div>
                {renderStars(punctuality ?? 0, value => setPunctuality(value), 'punctuality')}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Trato y servicio</span>
                  {professionalism != null && (
                    <span className="text-[10px]">{professionalism} de 5</span>
                  )}
                </div>
                {renderStars(
                  professionalism ?? 0,
                  value => setProfessionalism(value),
                  'professionalism'
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--foreground,#f9fafb)]">
                Comentarios adicionales
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full rounded-xl border border-[var(--border,#1f2937)] bg-[var(--background,#020617)] px-3 py-2 text-sm text-[var(--foreground,#f9fafb)] outline-none ring-0 transition focus:border-[var(--accent,#f4b41a)]"
                placeholder="¿Algo que debamos saber para mejorar?"
              />
              <div className="flex justify-between text-[10px] text-[var(--muted,#9ca3af)]">
                <span>Máx. 500 caracteres</span>
                <span>
                  {comment.length}
                  /500
                </span>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || rating == null}
              className="flex w-full items-center justify-center rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
            >
              {submitting ? 'Enviando...' : 'Enviar calificación'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
