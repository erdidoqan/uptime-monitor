interface PageHeaderProps {
  title: string;
  description?: string;
  lastUpdated?: string;
}

export function PageHeader({ title, description, lastUpdated }: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden border-b border-white/10">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5" />
      
      <div className="relative mx-auto max-w-4xl px-6 lg:px-8 py-16 lg:py-20">
        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight text-left">
          {title}
        </h1>
        {description && (
          <p className="text-xl text-gray-400 max-w-2xl leading-relaxed text-left">
            {description}
          </p>
        )}
        {lastUpdated && (
          <div className="flex items-center gap-2 mt-6">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <p className="text-sm text-gray-500">
              Last updated: {lastUpdated}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

