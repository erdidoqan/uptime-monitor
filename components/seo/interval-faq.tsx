'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
}

interface IntervalFAQProps {
  faq: FAQItem[];
  cronExpression: string;
  humanReadable: string;
}

export function IntervalFAQ({ faq, cronExpression, humanReadable }: IntervalFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (faq.length === 0) return null;

  // Generate Schema.org FAQPage structured data
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faq.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer,
      },
    })),
  };

  return (
    <section className="mt-16">
      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <h2 className="text-2xl font-bold text-white mb-6">
        Frequently Asked Questions
      </h2>
      
      <div className="space-y-3">
        {faq.map((item, index) => (
          <FAQAccordionItem
            key={index}
            question={item.question}
            answer={item.answer}
            isOpen={openIndex === index}
            onToggle={() => setOpenIndex(openIndex === index ? null : index)}
          />
        ))}
      </div>

      {/* Additional SEO content */}
      <div className="mt-8 p-6 rounded-xl bg-white/5 border border-white/10">
        <h3 className="font-semibold text-white mb-3">Quick Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 mb-1">Cron Expression:</p>
            <code className="text-purple-400 bg-purple-500/10 px-3 py-1 rounded font-mono">
              {cronExpression}
            </code>
          </div>
          <div>
            <p className="text-gray-400 mb-1">Human Readable:</p>
            <p className="text-white">{humanReadable}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQAccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-medium text-white pr-4">{question}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-gray-400 shrink-0 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="p-4 pt-0 text-gray-400 text-sm leading-relaxed">
            {answer}
          </div>
        </div>
      </div>
    </div>
  );
}

