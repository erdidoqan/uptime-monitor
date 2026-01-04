interface StatusIndicatorProps {
  name: string;
  description?: string;
  status: "operational" | "degraded" | "outage" | "maintenance";
  uptime?: string;
}

const statusConfig = {
  operational: {
    color: "bg-green-500",
    text: "Operational",
    textColor: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
  degraded: {
    color: "bg-yellow-500",
    text: "Degraded",
    textColor: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
  },
  outage: {
    color: "bg-red-500",
    text: "Outage",
    textColor: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  },
  maintenance: {
    color: "bg-blue-500",
    text: "Maintenance",
    textColor: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
};

export function StatusIndicator({ name, description, status, uptime }: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-5`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${config.color}`} />
            {status === "operational" && (
              <div className={`absolute inset-0 w-3 h-3 rounded-full ${config.color} animate-ping opacity-75`} />
            )}
          </div>
          <h3 className="font-semibold text-white">{name}</h3>
        </div>
        <span className={`text-sm font-medium ${config.textColor}`}>
          {config.text}
        </span>
      </div>
      {description && (
        <p className="text-sm text-gray-400 ml-6">{description}</p>
      )}
      {uptime && (
        <p className="text-xs text-gray-500 ml-6 mt-1">
          Uptime: {uptime}
        </p>
      )}
    </div>
  );
}

interface UptimeBarProps {
  days: { date: string; status: "operational" | "degraded" | "outage" | "maintenance" }[];
}

export function UptimeBar({ days }: UptimeBarProps) {
  return (
    <div className="flex gap-0.5">
      {days.map((day, index) => (
        <div
          key={index}
          className={`flex-1 h-8 rounded-sm ${statusConfig[day.status].color} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
          title={`${day.date}: ${statusConfig[day.status].text}`}
        />
      ))}
    </div>
  );
}

























