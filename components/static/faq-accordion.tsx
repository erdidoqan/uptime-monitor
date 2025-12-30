"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={index}
          className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
        >
          <button
            type="button"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
          >
            <span className="font-medium text-white pr-4">{item.question}</span>
            <ChevronDown
              className={`h-5 w-5 text-gray-400 shrink-0 transition-transform duration-200 ${
                openIndex === index ? "rotate-180" : ""
              }`}
            />
          </button>
          <div
            className={`overflow-hidden transition-all duration-200 ${
              openIndex === index ? "max-h-96" : "max-h-0"
            }`}
          >
            <div className="px-5 pb-5 text-gray-400 leading-relaxed">
              {item.answer}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}






















