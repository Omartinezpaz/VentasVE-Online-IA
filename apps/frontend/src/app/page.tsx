export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">
          Catálogo público de VentasVE
        </h1>
        <p className="text-sm text-zinc-600">
          Abre directamente la URL del catálogo de tu negocio usando su slug, por ejemplo:
        </p>
        <code className="rounded bg-zinc-900 px-3 py-2 text-sm text-zinc-50">
          http://localhost:3000/mi-negocio
        </code>
      </main>
    </div>
  );
}
