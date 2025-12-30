export interface IntervalData {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  intervalSec: number;
  cronExpression: string;
  humanReadable: string;
  isGuestAllowed: boolean;
  useCases: string[];
  description: string;
  faq: { question: string; answer: string }[];
}

export const intervals: IntervalData[] = [
  // ==================== MINUTES ====================
  {
    slug: "cron-every-minute",
    title: "Cron Job Every Minute",
    metaTitle: "Cron Job Every Minute - Schedule Tasks Every 60 Seconds",
    metaDescription: "Schedule cron jobs to run every minute using * * * * * expression. Free online cron scheduler for real-time monitoring and frequent task execution.",
    keywords: [
      "cron job every minute",
      "cron every 1 minute",
      "cron every one minute",
      "cron expression every minute",
      "crontab each minute",
      "run cron job every minute",
      "cron execute every minute",
      "linux cron every minute",
      "cron task every minute",
      "cron schedule every minute",
      "cron schedule for every minute",
      "cron expression every 1 minute",
      "crontab 1 minute",
      "every minute cron expression",
      "cron job to run every minute",
      "linux cron job every minute",
      "run every minute cron",
      "crontab every minute example",
      "crontab guru every minute",
      "cron tab every minute",
      "run a cron job every minute",
      "scheduled cron every minute",
    ],
    intervalSec: 60,
    cronExpression: "* * * * *",
    humanReadable: "every minute",
    isGuestAllowed: false,
    useCases: [
      "Real-time health monitoring",
      "Live dashboard updates",
      "Instant notification systems",
      "High-frequency data syncing",
      "Real-time stock price updates",
    ],
    description: "Running a cron job every minute is ideal for scenarios requiring near real-time updates. The cron expression `* * * * *` triggers execution at the start of every minute, providing 60 executions per hour.",
    faq: [
      {
        question: "What is the cron expression for every minute?",
        answer: "The cron expression for running a job every minute is * * * * *. Each asterisk represents: minute, hour, day of month, month, and day of week. When all fields are asterisks, the job runs every minute.",
      },
      {
        question: "How many times does a cron job run per day if set to every minute?",
        answer: "A cron job set to run every minute executes 1,440 times per day (60 minutes × 24 hours). This is suitable for real-time monitoring but should be used carefully to avoid server overload.",
      },
      {
        question: "Is running a cron every minute too frequent?",
        answer: "It depends on your use case. For health checks or real-time monitoring, every minute is appropriate. For data processing or API calls, consider longer intervals to reduce server load and API rate limits.",
      },
    ],
  },
  {
    slug: "cron-every-2-minutes",
    title: "Cron Job Every 2 Minutes",
    metaTitle: "Cron Job Every 2 Minutes - Schedule Tasks with */2 Expression",
    metaDescription: "Schedule cron jobs to run every 2 minutes using */2 * * * * expression. Perfect for frequent monitoring with reduced server load.",
    keywords: [
      "cron every 2 minutes",
      "cron every two minutes",
      "cron expression every 2 minutes",
      "cronjob every 2 minutes",
      "cron run every 2 minutes",
    ],
    intervalSec: 120,
    cronExpression: "*/2 * * * *",
    humanReadable: "every 2 minutes",
    isGuestAllowed: false,
    useCases: [
      "Near real-time monitoring",
      "Frequent cache updates",
      "Short-interval health checks",
      "Quick data synchronization",
      "Alert system polling",
    ],
    description: "A 2-minute cron interval provides frequent execution while cutting server load in half compared to every-minute schedules. Use `*/2 * * * *` to run tasks at 0, 2, 4, 6... minutes past each hour.",
    faq: [
      {
        question: "What does */2 mean in a cron expression?",
        answer: "The */2 in the minute field means 'every 2 minutes'. The slash (/) is a step value - it divides the range and runs at those intervals. So */2 in minutes runs at 0, 2, 4, 6, 8... 58 minutes.",
      },
      {
        question: "How is */2 * * * * different from 0,2,4... * * * *?",
        answer: "They produce the same result. */2 is shorthand for listing every even minute. Using */2 is cleaner and easier to maintain than listing all 30 values explicitly.",
      },
    ],
  },
  {
    slug: "cron-every-3-minutes",
    title: "Cron Job Every 3 Minutes",
    metaTitle: "Cron Job Every 3 Minutes - Schedule Tasks with */3 Expression",
    metaDescription: "Schedule cron jobs to run every 3 minutes using */3 * * * * expression. Balance between frequent updates and server efficiency.",
    keywords: [
      "cron every 3 minutes",
      "cron expression every 3 minutes",
      "cronjob every 3 minutes",
      "cron run every 3 minutes",
      "cron schedule every 3 minutes",
    ],
    intervalSec: 180,
    cronExpression: "*/3 * * * *",
    humanReadable: "every 3 minutes",
    isGuestAllowed: false,
    useCases: [
      "Moderate frequency monitoring",
      "Database sync tasks",
      "Log aggregation",
      "Queue processing",
      "Metric collection",
    ],
    description: "Running tasks every 3 minutes provides 20 executions per hour, offering a good balance between responsiveness and resource usage. The expression `*/3 * * * *` runs at minutes 0, 3, 6, 9, and so on.",
    faq: [
      {
        question: "When should I use a 3-minute cron interval?",
        answer: "A 3-minute interval is ideal when you need relatively frequent updates but every minute is overkill. Common use cases include log aggregation, moderate-priority health checks, and data synchronization tasks.",
      },
      {
        question: "How many times does */3 * * * * run per hour?",
        answer: "A cron job with */3 in the minute field runs 20 times per hour (60 ÷ 3 = 20). It executes at minutes 0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, and 57.",
      },
    ],
  },
  {
    slug: "cron-every-5-minutes",
    title: "Cron Job Every 5 Minutes",
    metaTitle: "Cron Job Every 5 Minutes - Free Online Cron Scheduler",
    metaDescription: "Schedule cron jobs to run every 5 minutes using */5 * * * * expression. Free cron scheduler with no signup required. Perfect for health checks and monitoring.",
    keywords: [
      "cron every 5 minutes",
      "cron each 5 minutes",
      "cron job every five minutes",
      "cron expression every 5 minutes",
      "cron schedule every 5 minutes",
      "cron 5 minutes",
      "linux cron every 5 minutes",
      "cron guru every 5 minutes",
      "kubernetes cronjob every 5 minutes",
      "crontab example every 5 minutes",
      "cron job expression for every 5 minutes",
      "cron job run every 5 minutes",
      "cron schedule for every 5 minutes",
      "schedule a cron job every 5 minutes",
      "cron job 5 minutes",
      "cron job linux every 5 minutes",
      "cron syntax every 5 minutes",
      "crontab format every 5 minutes",
      "cron job to run every 5 minutes",
      "run every 5 minutes cron",
      "cron job schedule every 5 minutes",
      "cron job schedule for every 5 minutes",
      "5 min cron schedule",
      "schedule cron job for every 5 minutes",
      "scheduled cron every 5 minutes",
      "cron expression to run every 5 minutes",
    ],
    intervalSec: 300,
    cronExpression: "*/5 * * * *",
    humanReadable: "every 5 minutes",
    isGuestAllowed: true,
    useCases: [
      "Website uptime monitoring",
      "API health checks",
      "Cache warming and invalidation",
      "Webhook delivery retries",
      "Data synchronization",
      "Keeping services alive (prevent cold starts)",
    ],
    description: "The 5-minute interval is one of the most popular cron schedules. It provides frequent monitoring (12 times per hour) while being gentle on resources. The expression `*/5 * * * *` runs at minutes 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, and 55.",
    faq: [
      {
        question: "What is the cron expression for every 5 minutes?",
        answer: "The cron expression for every 5 minutes is */5 * * * *. The */5 in the first field means 'every 5th minute'. This runs at minutes 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, and 55 of every hour.",
      },
      {
        question: "How do I run a cron job every 5 minutes in Linux?",
        answer: "Add this line to your crontab (edit with 'crontab -e'): */5 * * * * /path/to/your/script.sh. This will execute your script every 5 minutes. Make sure the script is executable (chmod +x script.sh).",
      },
      {
        question: "Can I run a cron job every 5 minutes without a server?",
        answer: "Yes! Services like CronUptime let you schedule HTTP requests every 5 minutes without managing your own server. Simply enter your URL and we'll call it on schedule.",
      },
      {
        question: "What's the difference between */5 and 0,5,10,15,20,25,30,35,40,45,50,55?",
        answer: "They produce identical results. */5 is a cleaner shorthand syntax that means 'every 5th value'. Both will run at the same minutes, but */5 is easier to read and maintain.",
      },
    ],
  },
  {
    slug: "cron-every-10-minutes",
    title: "Cron Job Every 10 Minutes",
    metaTitle: "Cron Job Every 10 Minutes - Schedule with */10 Expression",
    metaDescription: "Schedule cron jobs to run every 10 minutes using */10 * * * * expression. Free online scheduler for moderate-frequency monitoring and data updates.",
    keywords: [
      "cron every 10 minutes",
      "cron expression every 10 minutes",
      "cron run every 10 minutes",
      "cron schedule every 10 minutes",
      "cronjob every 10 minutes",
      "crontab every 10 minutes",
      "cron job every 10 minutes",
    ],
    intervalSec: 600,
    cronExpression: "*/10 * * * *",
    humanReadable: "every 10 minutes",
    isGuestAllowed: true,
    useCases: [
      "Standard uptime monitoring",
      "Report generation",
      "Email queue processing",
      "Social media posting",
      "Backup verification",
    ],
    description: "A 10-minute cron interval runs 6 times per hour, providing regular updates without excessive resource usage. The expression `*/10 * * * *` executes at minutes 0, 10, 20, 30, 40, and 50.",
    faq: [
      {
        question: "What is the cron expression for every 10 minutes?",
        answer: "The cron expression for every 10 minutes is */10 * * * *. This runs your task at minutes 0, 10, 20, 30, 40, and 50 of every hour - a total of 6 times per hour or 144 times per day.",
      },
      {
        question: "Is 10 minutes a good interval for uptime monitoring?",
        answer: "Yes, 10 minutes is a reasonable interval for most uptime monitoring needs. It catches outages within a reasonable timeframe while not overloading your endpoints with requests.",
      },
    ],
  },
  {
    slug: "cron-every-15-minutes",
    title: "Cron Job Every 15 Minutes",
    metaTitle: "Cron Job Every 15 Minutes - Quarter-Hour Scheduling",
    metaDescription: "Schedule cron jobs to run every 15 minutes using */15 * * * * expression. Perfect for regular monitoring, data sync, and scheduled tasks.",
    keywords: [
      "cron every 15 minutes",
      "every 15 minutes cron",
      "cron expression every 15 minutes",
      "cron run every 15 minutes",
      "cronjob every 15 minutes",
      "cron schedule every 15 minutes",
      "cron expression for every 15 minutes",
      "cron job for every 15 minutes",
      "cron job to run every 15 minutes",
      "crontab to run every 15 minutes",
      "cron schedule for every 15 minutes",
      "cron job schedule every 15 minutes",
    ],
    intervalSec: 900,
    cronExpression: "*/15 * * * *",
    humanReadable: "every 15 minutes",
    isGuestAllowed: true,
    useCases: [
      "Regular data imports",
      "Analytics collection",
      "Newsletter scheduling",
      "Inventory updates",
      "Price monitoring",
    ],
    description: "The 15-minute interval divides each hour into quarters, running at minutes 0, 15, 30, and 45. This provides 4 executions per hour (96 per day), making it ideal for regular but not excessive monitoring.",
    faq: [
      {
        question: "What is the cron expression for every 15 minutes?",
        answer: "The cron expression for every 15 minutes is */15 * * * *. This runs at the top of the hour (0), quarter past (15), half past (30), and quarter to (45) - four times per hour.",
      },
      {
        question: "How do I run a cron job at 15-minute intervals starting at a specific minute?",
        answer: "To start at a specific minute, list the minutes explicitly. For example, 5,20,35,50 * * * * runs every 15 minutes starting at minute 5. Or 7,22,37,52 * * * * starts at minute 7.",
      },
      {
        question: "What's the difference between */15 and 0,15,30,45 in cron?",
        answer: "They produce the same result. */15 means 'every 15th minute starting from 0'. 0,15,30,45 explicitly lists each minute. Both run 4 times per hour at the same times.",
      },
    ],
  },
  {
    slug: "cron-every-20-minutes",
    title: "Cron Job Every 20 Minutes",
    metaTitle: "Cron Job Every 20 Minutes - Schedule with */20 Expression",
    metaDescription: "Schedule cron jobs to run every 20 minutes using */20 * * * * expression. Ideal for moderate-frequency tasks with 3 executions per hour.",
    keywords: [
      "cron job every 20 minutes",
      "cron every 20 minutes",
      "cron expression every 20 minutes",
      "cron run every 20 minutes",
      "cron schedule every 20 minutes",
    ],
    intervalSec: 1200,
    cronExpression: "*/20 * * * *",
    humanReadable: "every 20 minutes",
    isGuestAllowed: false,
    useCases: [
      "Moderate frequency updates",
      "Batch processing",
      "External API polling",
      "Report aggregation",
      "Content refresh",
    ],
    description: "A 20-minute interval provides 3 executions per hour at minutes 0, 20, and 40. This is useful when 15 minutes is too frequent but 30 minutes is too sparse.",
    faq: [
      {
        question: "What is the cron expression for every 20 minutes?",
        answer: "The cron expression for every 20 minutes is */20 * * * *. This runs at minutes 0, 20, and 40 of every hour - three times per hour or 72 times per day.",
      },
      {
        question: "When should I use a 20-minute cron interval?",
        answer: "Use 20-minute intervals when you need regular updates but 15 minutes would create too much load, and 30 minutes would be too infrequent. It's a good middle ground for API polling with rate limits.",
      },
    ],
  },
  {
    slug: "cron-every-30-minutes",
    title: "Cron Job Every 30 Minutes",
    metaTitle: "Cron Job Every 30 Minutes - Half-Hour Scheduling",
    metaDescription: "Schedule cron jobs to run every 30 minutes using */30 * * * * expression. Perfect for regular monitoring and data updates twice per hour.",
    keywords: [
      "cron job every 30 minutes",
      "cron expression every 30 minutes",
      "every 30 min cron",
      "cron every half hour",
      "cronjob every 30 minutes",
      "crontab 30 minutes",
      "cron run every 30 minutes",
      "cron for every 30 minutes",
      "cron schedule every 30 minutes",
      "cron job schedule every 30 minutes",
    ],
    intervalSec: 1800,
    cronExpression: "*/30 * * * *",
    humanReadable: "every 30 minutes",
    isGuestAllowed: true,
    useCases: [
      "Bi-hourly reports",
      "Data warehouse updates",
      "Newsletter digests",
      "External service syncing",
      "Scheduled notifications",
    ],
    description: "The 30-minute interval runs twice per hour at minutes 0 and 30. This provides 48 daily executions, balancing regularity with resource efficiency. Use `*/30 * * * *` or `0,30 * * * *`.",
    faq: [
      {
        question: "What is the cron expression for every 30 minutes?",
        answer: "The cron expression for every 30 minutes is */30 * * * *. This runs at the top of the hour (minute 0) and half past (minute 30) - twice per hour, 48 times per day.",
      },
      {
        question: "How do I run a cron job every half hour?",
        answer: "Use the expression */30 * * * * or equivalently 0,30 * * * *. Both run at minutes 0 and 30 of every hour. Add your command after the expression in your crontab.",
      },
      {
        question: "What does */30 mean in crontab?",
        answer: "In crontab, */30 in the minute field means 'every 30th minute starting from 0'. Since there are only 60 minutes in an hour, this effectively means minute 0 and minute 30.",
      },
    ],
  },

  // ==================== HOURS ====================
  {
    slug: "cron-every-hour",
    title: "Cron Job Every Hour",
    metaTitle: "Cron Job Every Hour - Hourly Task Scheduling",
    metaDescription: "Schedule cron jobs to run every hour using 0 * * * * expression. Perfect for hourly reports, data updates, and regular maintenance tasks.",
    keywords: [
      "cron every hour",
      "cron every 1 hour",
      "cron task every hour",
      "crontab each hour",
      "cron expression every hour",
      "cron job run every hour",
      "cron guru every hour",
      "crontab guru every hour",
      "cron expression hourly",
      "crontab per hour",
      "cron job to run every hour",
      "crontab hour",
      "cron expression for every 1 hour",
      "cron expression every 1 hour",
      "cron schedule every hour",
      "cron schedule for every hour",
      "cron job every 1 hour",
      "crontab generator every hour",
      "schedule cron job every 1 hour",
      "cron job schedule every hour",
      "cron job schedule for every hour",
      "cron syntax every hour",
      "cron expression to run every hour",
    ],
    intervalSec: 3600,
    cronExpression: "0 * * * *",
    humanReadable: "every hour",
    isGuestAllowed: false,
    useCases: [
      "Hourly analytics reports",
      "Backup snapshots",
      "Data aggregation",
      "Cache cleanup",
      "Scheduled emails",
      "API rate limit reset checks",
    ],
    description: "Hourly cron jobs run once at the start of each hour (minute 0). With 24 executions per day, this is ideal for regular maintenance tasks that don't need minute-level frequency.",
    faq: [
      {
        question: "What is the cron expression for every hour?",
        answer: "The cron expression for every hour is 0 * * * *. The 0 in the minute field means it runs at minute 0 of every hour. The asterisks mean every hour, every day, every month, every day of week.",
      },
      {
        question: "How do I run a cron job at a specific minute every hour?",
        answer: "Change the first field to your desired minute. For example, 15 * * * * runs at minute 15 of every hour, and 45 * * * * runs at minute 45 of every hour.",
      },
      {
        question: "What's the difference between 0 * * * * and * * * * *?",
        answer: "0 * * * * runs once per hour at minute 0 (24 times/day). * * * * * runs every minute (1,440 times/day). The first field specifies which minute(s) to run.",
      },
      {
        question: "How do I run a cron every hour during business hours only?",
        answer: "Use 0 9-17 * * 1-5 to run at minute 0, hours 9-17 (9 AM to 5 PM), Monday through Friday. Adjust the hour range (9-17) and days (1-5 for Mon-Fri) as needed.",
      },
    ],
  },
  {
    slug: "cron-every-2-hours",
    title: "Cron Job Every 2 Hours",
    metaTitle: "Cron Job Every 2 Hours - Bi-Hourly Task Scheduling",
    metaDescription: "Schedule cron jobs to run every 2 hours using 0 */2 * * * expression. Ideal for regular data updates and maintenance with 12 daily executions.",
    keywords: [
      "cron every 2 hours",
      "cron every two hours",
      "cronjob every 2 hours",
      "cron expression every 2 hours",
      "cron run every 2 hours",
      "every two hours cron",
      "cron schedule every 2 hours",
      "cron job for every 2 hours",
    ],
    intervalSec: 7200,
    cronExpression: "0 */2 * * *",
    humanReadable: "every 2 hours",
    isGuestAllowed: false,
    useCases: [
      "Bi-hourly data sync",
      "Regular backup checks",
      "Resource usage reports",
      "Content refresh cycles",
      "External API updates",
    ],
    description: "A 2-hour cron interval runs 12 times per day at hours 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, and 22. Use `0 */2 * * *` to execute at the start of every second hour.",
    faq: [
      {
        question: "What is the cron expression for every 2 hours?",
        answer: "The cron expression for every 2 hours is 0 */2 * * *. The 0 means minute 0, and */2 in the hour field means every 2nd hour. This runs at 12:00 AM, 2:00 AM, 4:00 AM, etc.",
      },
      {
        question: "How do I run a cron every 2 hours starting at 1 AM?",
        answer: "Use 0 1,3,5,7,9,11,13,15,17,19,21,23 * * * to run at odd hours. Or use 0 1/2 * * * (1/2 means 'starting at 1, then every 2 hours') if your cron implementation supports it.",
      },
      {
        question: "What does */2 mean in the hour field?",
        answer: "In the hour field, */2 means 'every 2nd hour starting from 0'. So it runs at hours 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, and 22 - a total of 12 times per day.",
      },
    ],
  },
  {
    slug: "cron-every-3-hours",
    title: "Cron Job Every 3 Hours",
    metaTitle: "Cron Job Every 3 Hours - Schedule with */3 Expression",
    metaDescription: "Schedule cron jobs to run every 3 hours using 0 */3 * * * expression. Perfect for periodic updates with 8 daily executions.",
    keywords: [
      "cron every 3 hours",
      "cron expression every 3 hours",
      "cronjob every 3 hours",
      "cron run every 3 hours",
      "cron schedule every 3 hours",
    ],
    intervalSec: 10800,
    cronExpression: "0 */3 * * *",
    humanReadable: "every 3 hours",
    isGuestAllowed: false,
    useCases: [
      "Tri-daily reports",
      "Data warehouse loads",
      "Long-running job scheduling",
      "Periodic cleanup tasks",
      "Feed aggregation",
    ],
    description: "Running a cron every 3 hours provides 8 executions per day at hours 0, 3, 6, 9, 12, 15, 18, and 21. This is ideal for tasks that need regular attention but not hourly frequency.",
    faq: [
      {
        question: "What is the cron expression for every 3 hours?",
        answer: "The cron expression for every 3 hours is 0 */3 * * *. This runs at minute 0 of hours 0, 3, 6, 9, 12, 15, 18, and 21 - eight times per day.",
      },
      {
        question: "How often does 0 */3 * * * run?",
        answer: "It runs 8 times per day, once every 3 hours starting at midnight. The executions are at 12:00 AM, 3:00 AM, 6:00 AM, 9:00 AM, 12:00 PM, 3:00 PM, 6:00 PM, and 9:00 PM.",
      },
    ],
  },
  {
    slug: "cron-every-4-hours",
    title: "Cron Job Every 4 Hours",
    metaTitle: "Cron Job Every 4 Hours - Quarter-Day Scheduling",
    metaDescription: "Schedule cron jobs to run every 4 hours using 0 */4 * * * expression. Run tasks 6 times daily for efficient resource usage.",
    keywords: [
      "cron every 4 hours",
      "cron expression every 4 hours",
      "cronjob every 4 hours",
      "cron run every 4 hours",
      "cron schedule every 4 hours",
    ],
    intervalSec: 14400,
    cronExpression: "0 */4 * * *",
    humanReadable: "every 4 hours",
    isGuestAllowed: false,
    useCases: [
      "Quarter-day reports",
      "Social media scheduling",
      "Inventory checks",
      "Database optimization",
      "Content publication",
    ],
    description: "A 4-hour cron interval divides the day into 6 parts, running at hours 0, 4, 8, 12, 16, and 20. This schedule suits tasks that need multiple daily runs but aren't time-critical.",
    faq: [
      {
        question: "What is the cron expression for every 4 hours?",
        answer: "The cron expression for every 4 hours is 0 */4 * * *. This runs at the start of hours 0, 4, 8, 12, 16, and 20 - six times per day at 4-hour intervals.",
      },
      {
        question: "Can I run every 4 hours starting at a specific time?",
        answer: "Yes. For example, 0 2,6,10,14,18,22 * * * runs every 4 hours starting at 2 AM. Or use 0 1/4 * * * (starting at hour 1, then every 4 hours) if supported.",
      },
    ],
  },
  {
    slug: "cron-every-6-hours",
    title: "Cron Job Every 6 Hours",
    metaTitle: "Cron Job Every 6 Hours - Quarter-Day Task Scheduling",
    metaDescription: "Schedule cron jobs to run every 6 hours using 0 */6 * * * expression. Run tasks 4 times daily - perfect for regular maintenance.",
    keywords: [
      "cron every 6 hours",
      "cron expression every 6 hours",
      "every 6 hours cron",
      "cronjob every 6 hours",
      "cron run every 6 hours",
      "cron schedule every 6 hours",
    ],
    intervalSec: 21600,
    cronExpression: "0 */6 * * *",
    humanReadable: "every 6 hours",
    isGuestAllowed: false,
    useCases: [
      "Quarterly daily updates",
      "Digest emails",
      "Comprehensive health checks",
      "Data exports",
      "Backup rotations",
    ],
    description: "Running a cron every 6 hours provides 4 daily executions at midnight, 6 AM, noon, and 6 PM. This quarter-day schedule is efficient for tasks that need consistent daily coverage.",
    faq: [
      {
        question: "What is the cron expression for every 6 hours?",
        answer: "The cron expression for every 6 hours is 0 */6 * * *. This runs at hours 0, 6, 12, and 18 (midnight, 6 AM, noon, and 6 PM) - four times per day.",
      },
      {
        question: "How do I run a cron every 6 hours at specific times?",
        answer: "Specify the exact hours: 0 3,9,15,21 * * * runs at 3 AM, 9 AM, 3 PM, and 9 PM. Or 0 2,8,14,20 * * * for 2 AM, 8 AM, 2 PM, and 8 PM.",
      },
    ],
  },
  {
    slug: "cron-every-8-hours",
    title: "Cron Job Every 8 Hours",
    metaTitle: "Cron Job Every 8 Hours - Tri-Daily Task Scheduling",
    metaDescription: "Schedule cron jobs to run every 8 hours using 0 */8 * * * expression. Perfect for three-times-daily execution pattern.",
    keywords: [
      "cron every 8 hours",
      "cron expression every 8 hours",
      "cronjob every 8 hours",
      "cron run every 8 hours",
      "cron schedule every 8 hours",
    ],
    intervalSec: 28800,
    cronExpression: "0 */8 * * *",
    humanReadable: "every 8 hours",
    isGuestAllowed: false,
    useCases: [
      "Tri-daily summaries",
      "Shift-based reports",
      "Regular maintenance windows",
      "Data reconciliation",
      "Compliance checks",
    ],
    description: "An 8-hour cron runs 3 times per day at hours 0, 8, and 16 (midnight, 8 AM, and 4 PM). This aligns well with 8-hour work shifts or tri-daily update requirements.",
    faq: [
      {
        question: "What is the cron expression for every 8 hours?",
        answer: "The cron expression for every 8 hours is 0 */8 * * *. This runs at hours 0, 8, and 16 (midnight, 8 AM, and 4 PM) - three times per day.",
      },
      {
        question: "Why run a cron every 8 hours?",
        answer: "An 8-hour interval aligns with typical work shifts, making it useful for shift handoff reports, tri-daily status updates, or tasks that need coverage across the day without hourly frequency.",
      },
    ],
  },
  {
    slug: "cron-every-12-hours",
    title: "Cron Job Every 12 Hours",
    metaTitle: "Cron Job Every 12 Hours - Bi-Daily Task Scheduling",
    metaDescription: "Schedule cron jobs to run every 12 hours using 0 */12 * * * expression. Run tasks twice daily - morning and evening.",
    keywords: [
      "every 12 hours cron",
      "cron every 12 hours",
      "cron expression every 12 hours",
      "cronjob every 12 hours",
      "cron run every 12 hours",
      "cron every 12 hours starting at specific time",
    ],
    intervalSec: 43200,
    cronExpression: "0 */12 * * *",
    humanReadable: "every 12 hours",
    isGuestAllowed: false,
    useCases: [
      "Twice-daily reports",
      "Morning/evening syncs",
      "Bi-daily backups",
      "AM/PM digest emails",
      "Market open/close tasks",
    ],
    description: "A 12-hour cron runs twice daily at midnight and noon (0 */12 * * *). For different times like 6 AM and 6 PM, use 0 6,18 * * *.",
    faq: [
      {
        question: "What is the cron expression for every 12 hours?",
        answer: "The cron expression for every 12 hours is 0 */12 * * *. This runs at hours 0 and 12 (midnight and noon). For different times, specify them directly like 0 6,18 * * * for 6 AM and 6 PM.",
      },
      {
        question: "How do I schedule a cron for 8 AM and 8 PM?",
        answer: "Use 0 8,20 * * * to run at 8:00 AM and 8:00 PM daily. The hour values 8 and 20 represent 8 AM and 8 PM in 24-hour format.",
      },
    ],
  },

  // ==================== DAYS/WEEKS/MONTHS ====================
  {
    slug: "cron-every-day",
    title: "Cron Job Every Day",
    metaTitle: "Cron Job Every Day - Daily Task Scheduling",
    metaDescription: "Schedule cron jobs to run once every day using 0 0 * * * expression. Perfect for daily reports, backups, and maintenance tasks.",
    keywords: [
      "cron every day",
      "cron job once a day",
      "cron expression every day",
      "cron run every day",
      "cronjob every day",
      "crontab guru every day",
      "every day cron",
      "cron run once a day",
      "cron for every day",
      "cron schedule once a day",
      "crontab to run every day",
      "every day cron expression",
      "cron job run every day",
      "cron syntax every day",
      "cron job schedule every day",
      "schedule cron job for every day",
      "cron job to run every day",
      "cron job every day at 9am",
    ],
    intervalSec: 86400,
    cronExpression: "0 0 * * *",
    humanReadable: "every day at midnight",
    isGuestAllowed: false,
    useCases: [
      "Daily backup jobs",
      "End-of-day reports",
      "Database maintenance",
      "Log rotation",
      "Daily email digests",
      "Data cleanup tasks",
    ],
    description: "Daily cron jobs run once every 24 hours. The default expression `0 0 * * *` runs at midnight, but you can schedule any time like `0 9 * * *` for 9 AM daily.",
    faq: [
      {
        question: "What is the cron expression for every day?",
        answer: "The cron expression for every day at midnight is 0 0 * * *. For a specific time, change the first two fields: 0 9 * * * runs at 9:00 AM daily, 30 14 * * * runs at 2:30 PM daily.",
      },
      {
        question: "How do I run a cron job at 9 AM every day?",
        answer: "Use the expression 0 9 * * *. The 0 is the minute, 9 is the hour (in 24-hour format). This will run your command at exactly 9:00 AM every day.",
      },
      {
        question: "What's the difference between 0 0 * * * and @daily?",
        answer: "They're equivalent. @daily is a shorthand that some cron implementations support, meaning 'once a day at midnight'. Both run at 00:00 (midnight) every day.",
      },
      {
        question: "How do I run a daily cron job only on weekdays?",
        answer: "Add the day-of-week field: 0 9 * * 1-5 runs at 9 AM Monday through Friday. Days are 0-7 where 0 and 7 are Sunday, 1 is Monday, etc.",
      },
    ],
  },
  {
    slug: "cron-every-week",
    title: "Cron Job Every Week",
    metaTitle: "Cron Job Every Week - Weekly Task Scheduling",
    metaDescription: "Schedule cron jobs to run once every week using 0 0 * * 0 expression. Perfect for weekly reports, maintenance, and scheduled tasks.",
    keywords: [
      "cron every week",
      "cron job once a week",
      "cron once a week",
      "cron job every week",
      "cron job every 7 days",
      "cron every monday",
      "cron job every monday",
      "cron for every monday",
      "cron run every monday",
      "cron monday",
      "cron every sunday",
      "cron job every sunday",
      "crontab every saturday",
      "crontab every thursday",
    ],
    intervalSec: 604800,
    cronExpression: "0 0 * * 0",
    humanReadable: "every week (Sunday)",
    isGuestAllowed: false,
    useCases: [
      "Weekly reports",
      "Sunday maintenance windows",
      "Weekly data exports",
      "Scheduled newsletters",
      "Weekly backup verification",
    ],
    description: "Weekly cron jobs run once every 7 days. Use `0 0 * * 0` for Sundays, `0 0 * * 1` for Mondays, etc. The last field (0-7) specifies the day of week.",
    faq: [
      {
        question: "What is the cron expression for every week?",
        answer: "The cron expression for weekly jobs uses the day-of-week field (last field). 0 0 * * 0 runs every Sunday at midnight, 0 0 * * 1 runs every Monday at midnight.",
      },
      {
        question: "How do I run a cron job every Monday at 9 AM?",
        answer: "Use 0 9 * * 1. The 1 in the last field represents Monday. The expression reads: minute 0, hour 9, any day of month, any month, Monday.",
      },
      {
        question: "What do the day-of-week numbers mean in cron?",
        answer: "In cron, day-of-week is 0-7 where both 0 and 7 represent Sunday. 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday.",
      },
      {
        question: "How do I run a cron every 7 days from a specific date?",
        answer: "Standard cron doesn't support 'every N days from date X'. For true 7-day intervals, use weekly schedules (day-of-week) or implement date logic in your script.",
      },
    ],
  },
  {
    slug: "cron-every-month",
    title: "Cron Job Every Month",
    metaTitle: "Cron Job Every Month - Monthly Task Scheduling",
    metaDescription: "Schedule cron jobs to run once every month using 0 0 1 * * expression. Perfect for monthly reports, billing, and maintenance tasks.",
    keywords: [
      "cron job monthly",
      "cron every month",
      "cron job once a month",
      "cronjob every month",
      "every month cron",
      "cron job every month",
      "cron once a month",
    ],
    intervalSec: 2592000, // ~30 days
    cronExpression: "0 0 1 * *",
    humanReadable: "every month (1st day)",
    isGuestAllowed: false,
    useCases: [
      "Monthly billing processes",
      "End-of-month reports",
      "Monthly data archiving",
      "Subscription renewals",
      "Monthly newsletters",
    ],
    description: "Monthly cron jobs typically run on the 1st of each month using `0 0 1 * *`. You can change the day-of-month field to run on any specific day, like the 15th with `0 0 15 * *`.",
    faq: [
      {
        question: "What is the cron expression for every month?",
        answer: "The cron expression for monthly jobs on the 1st is 0 0 1 * *. This runs at midnight on the 1st day of every month. Change the 1 to run on a different day, like 0 0 15 * * for the 15th.",
      },
      {
        question: "How do I run a cron on the last day of every month?",
        answer: "There's no direct cron syntax for 'last day'. Common solutions: use 0 0 28-31 * * and check the date in your script, or use a tool that supports L for last day like some cloud schedulers.",
      },
      {
        question: "Can I run a cron job on the first Monday of each month?",
        answer: "Standard cron doesn't directly support this. Use 0 0 1-7 * 1 to run every Monday in the first week, then check if it's the first Monday in your script.",
      },
      {
        question: "What's the difference between @monthly and 0 0 1 * *?",
        answer: "They're equivalent. @monthly is a shorthand supported by some cron implementations, meaning 'once a month at midnight on the 1st'. Both run at 00:00 on the 1st of each month.",
      },
    ],
  },
];

// Helper function to get interval by slug
export function getIntervalBySlug(slug: string): IntervalData | undefined {
  return intervals.find((interval) => interval.slug === slug);
}

// Helper function to get related intervals (same category or adjacent)
export function getRelatedIntervals(currentSlug: string, limit: number = 6): IntervalData[] {
  const current = getIntervalBySlug(currentSlug);
  if (!current) return [];

  // Categorize intervals
  const minutes = intervals.filter((i) => i.intervalSec < 3600);
  const hours = intervals.filter((i) => i.intervalSec >= 3600 && i.intervalSec < 86400);
  const days = intervals.filter((i) => i.intervalSec >= 86400);

  let category: IntervalData[];
  if (current.intervalSec < 3600) {
    category = minutes;
  } else if (current.intervalSec < 86400) {
    category = hours;
  } else {
    category = days;
  }

  // Get intervals from same category, excluding current
  const sameCategory = category.filter((i) => i.slug !== currentSlug);

  // Get some from other categories for variety
  const otherCategories = intervals
    .filter((i) => i.slug !== currentSlug && !sameCategory.includes(i))
    .slice(0, 2);

  return [...sameCategory.slice(0, limit - 2), ...otherCategories].slice(0, limit);
}

// Get all interval slugs for sitemap
export function getAllIntervalSlugs(): string[] {
  return intervals.map((i) => i.slug);
}

