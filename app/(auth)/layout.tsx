// Layout split-screen NEVO: lado oscuro (brand) + lado blanco (formulario)
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Lado izquierdo — brand / solo desktop */}
      <div
        className="hidden md:flex w-1/2 flex-col items-center justify-center px-12 relative overflow-hidden"
        style={{ background: '#0E0D1A' }}
      >
        {/* Degradado decorativo coral-purple muy sutil */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background:
              'radial-gradient(ellipse at 30% 60%, #FF6B6B 0%, transparent 55%), radial-gradient(ellipse at 70% 30%, #A259FF 0%, transparent 55%)',
          }}
        />
        <div className="relative z-10 text-center">
          <p className="font-display text-6xl font-semibold text-white tracking-tight">NEVO</p>
          <p className="mt-4 text-base leading-relaxed" style={{ color: '#6B6B8A' }}>
            AI-Powered Marketing.<br />Human-Level Results.
          </p>
          <div
            className="mt-8 w-12 h-1 mx-auto rounded-full"
            style={{ background: 'linear-gradient(to right, #FF6B6B, #A259FF)' }}
          />
        </div>
      </div>

      {/* Lado derecho — formulario */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12" style={{ background: '#FFFFFF' }}>
        {children}
      </div>
    </div>
  )
}
