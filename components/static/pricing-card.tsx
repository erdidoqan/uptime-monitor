"use client";

import { useState, useCallback, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { trackInitiateCheckout } from "@/lib/analytics";

interface PricingFeature {
  text: string;
  included: boolean;
}

interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: PricingFeature[];
  buttonText: string;
  buttonHref: string;
  highlighted?: boolean;
  badge?: string;
  polarCheckoutUrl?: string; // Full Polar checkout URL for embed
}

export function PricingCard({
  name,
  price,
  period,
  description,
  features,
  buttonText,
  buttonHref,
  highlighted = false,
  badge,
  polarCheckoutUrl,
}: PricingCardProps) {
  const [loading, setLoading] = useState(false);

  // Preload Polar checkout module
  useEffect(() => {
    if (polarCheckoutUrl) {
      import("@polar-sh/checkout/embed").catch(console.error);
    }
  }, [polarCheckoutUrl]);

  // Parse price value from string (e.g., "$5" -> 5)
  const priceValue = parseFloat(price.replace(/[^0-9.]/g, '')) || 0;

  // Open checkout modal
  const openCheckout = useCallback(async () => {
    if (!polarCheckoutUrl) return;
    
    // Track InitiateCheckout event for Facebook Pixel
    trackInitiateCheckout({
      planName: name,
      value: priceValue,
      currency: 'USD',
    });
    
    setLoading(true);
    try {
      const { PolarEmbedCheckout } = await import("@polar-sh/checkout/embed");
      await PolarEmbedCheckout.create(polarCheckoutUrl, { theme: "dark" });
    } catch {
      // Fallback: open in new tab
      window.open(polarCheckoutUrl, "_blank");
    } finally {
      setLoading(false);
    }
  }, [polarCheckoutUrl, name, priceValue]);

  const buttonClasses = `w-full ${
    highlighted
      ? "bg-purple-500 hover:bg-purple-600 text-white"
      : "bg-white/10 hover:bg-white/20 text-white"
  }`;

  return (
    <div
      className={`relative rounded-2xl border p-8 ${
        highlighted
          ? "border-purple-500/50 bg-gradient-to-b from-purple-500/10 to-transparent"
          : "border-white/10 bg-white/5"
      }`}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-purple-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
            {badge}
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">{name}</h3>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold text-white">{price}</span>
        {period && <span className="text-gray-400 ml-2">{period}</span>}
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <div
              className={`mt-0.5 p-0.5 rounded-full ${
                feature.included ? "bg-green-500/20" : "bg-gray-500/20"
              }`}
            >
              <Check
                className={`h-3 w-3 ${
                  feature.included ? "text-green-500" : "text-gray-500"
                }`}
              />
            </div>
            <span
              className={`text-sm ${
                feature.included ? "text-gray-300" : "text-gray-500"
              }`}
            >
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      {polarCheckoutUrl ? (
        <Button
          type="button"
          onClick={openCheckout}
          disabled={loading}
          className={buttonClasses}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Yükleniyor...
            </>
          ) : (
            buttonText
          )}
        </Button>
      ) : (
        <Link href={buttonHref}>
          <Button className={buttonClasses}>
            {buttonText}
          </Button>
        </Link>
      )}
    </div>
  );
}

























