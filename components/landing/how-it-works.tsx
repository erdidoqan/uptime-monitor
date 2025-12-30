const steps = [
  {
    number: "01",
    title: "Add Your Endpoint",
    description: "Enter the URL you want to monitor. We support any HTTP/HTTPS endpoint - APIs, webhooks, health checks, and more.",
    code: `// Your endpoint
https://api.example.com/health

// We'll send a GET request
fetch("https://api.example.com/health")`,
  },
  {
    number: "02",
    title: "Set Your Schedule",
    description: "Choose how often to check your endpoint. Use simple intervals like every 5 minutes, or complex cron expressions for custom schedules.",
    code: `// Simple intervals
Every 5 minutes
Every 15 minutes
Every hour

// Cron expressions
*/5 * * * *  → Every 5 min
0 9 * * 1   → Monday 9 AM
0 0 1 * *   → Monthly`,
  },
  {
    number: "03",
    title: "Stay Informed",
    description: "Get notified instantly when your endpoint fails or recovers. Track response times and view detailed run history.",
    code: `✓ Status: 200 OK
✓ Duration: 145ms
✓ Last checked: Just now
✓ Next check: in 5 minutes

// Failure alert
⚠ api.example.com is down
  Status: 503
  Duration: 30000ms (timeout)`,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 relative bg-[#0f0f10]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Get started in minutes. No complex configuration or infrastructure setup required.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-24">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`grid lg:grid-cols-2 gap-12 items-center ${
                index % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* Content */}
              <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-sm font-medium mb-4">
                  Step {step.number}
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">{step.title}</h3>
                <p className="text-lg text-gray-400 mb-6">{step.description}</p>
              </div>

              {/* Code Block */}
              <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                <div className="code-block p-5 shadow-xl">
                  {/* Window Controls */}
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                  </div>
                  <pre className="text-sm leading-relaxed overflow-x-auto">
                    <code className="text-gray-300">{step.code}</code>
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

