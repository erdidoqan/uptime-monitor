interface ProseContainerProps {
  children: React.ReactNode;
}

export function ProseContainer({ children }: ProseContainerProps) {
  return (
    <div className="mx-auto max-w-4xl px-6 lg:px-8 py-12 lg:py-16">
      <div className="static-prose">
        {children}
      </div>
    </div>
  );
}

