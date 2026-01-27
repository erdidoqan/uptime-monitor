export interface PlatformData {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  platform: string;
  description: string;
  setupSteps: { title: string; description: string; code?: string }[];
  limitations: string[];
  cronUptimeAdvantages: string[];
  faq: { question: string; answer: string }[];
}

export const platforms: PlatformData[] = [
  {
    slug: "cron-job-nodejs",
    title: "Cron Job in Node.js",
    metaTitle: "Cron Job in Node.js - Schedule Tasks with node-cron",
    metaDescription: "Learn how to schedule cron jobs in Node.js using node-cron and other packages. Compare with serverless alternatives for production workloads.",
    keywords: [
      "cron job in node js",
      "node cron",
      "node-cron",
      "nodejs cron job",
      "node js scheduler",
      "node schedule",
      "cron node js",
      "javascript cron job",
      "node cron job example",
      "cron expression node js",
    ],
    platform: "Node.js",
    description: "Node.js provides several libraries for scheduling cron jobs, with node-cron being the most popular. However, running cron jobs in your Node.js application requires keeping the process alive 24/7.",
    setupSteps: [
      {
        title: "Install node-cron",
        description: "Add the node-cron package to your project",
        code: "npm install node-cron",
      },
      {
        title: "Create a scheduled task",
        description: "Use cron expressions to schedule your tasks",
        code: `const cron = require('node-cron');

// Run every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('Running task every 5 minutes');
  // Your task logic here
});`,
      },
      {
        title: "Keep the process running",
        description: "Your Node.js process must stay alive for cron to work",
        code: `// Use PM2 or similar for production
// pm2 start app.js --name "cron-service"`,
      },
    ],
    limitations: [
      "Requires a constantly running Node.js process",
      "Server costs for 24/7 uptime",
      "Single point of failure if the process crashes",
      "No built-in monitoring or alerting",
      "Timezone handling can be tricky",
    ],
    cronUptimeAdvantages: [
      "No server required - we handle execution",
      "Built-in monitoring and failure alerts",
      "Runs on Cloudflare's global edge network",
      "Free tier available for small workloads",
      "Simple HTTP-based - works with any endpoint",
    ],
    faq: [
      {
        question: "What is node-cron?",
        answer: "node-cron is a popular Node.js package that allows you to schedule tasks using cron expressions. It's lightweight and easy to use, but requires your Node.js process to be running continuously.",
      },
      {
        question: "How do I run a cron job every 5 minutes in Node.js?",
        answer: "Use node-cron with the expression '*/5 * * * *'. Install with 'npm install node-cron', then use cron.schedule('*/5 * * * *', () => { /* your code */ }).",
      },
      {
        question: "What's the difference between node-cron and node-schedule?",
        answer: "node-cron uses traditional cron expressions while node-schedule offers more flexible scheduling options including date-based scheduling. node-cron is lighter and more commonly used for standard cron patterns.",
      },
    ],
  },
  {
    slug: "cron-job-python",
    title: "Cron Job in Python",
    metaTitle: "Cron Job in Python - Schedule Tasks with APScheduler & Celery",
    metaDescription: "Learn how to schedule cron jobs in Python using APScheduler, Celery, and schedule library. Compare with managed cron services.",
    keywords: [
      "cron job in python",
      "python cron",
      "python scheduler",
      "apscheduler",
      "celery cron",
      "python schedule",
      "python cron job example",
      "python periodic task",
      "schedule python script",
      "python task scheduler",
    ],
    platform: "Python",
    description: "Python offers multiple libraries for scheduling tasks, including APScheduler for in-process scheduling, Celery for distributed task queues, and the simple schedule library for basic needs.",
    setupSteps: [
      {
        title: "Install APScheduler",
        description: "APScheduler is the most versatile Python scheduler",
        code: "pip install apscheduler",
      },
      {
        title: "Create a cron-style schedule",
        description: "Use CronTrigger for cron expressions",
        code: `from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

def my_job():
    print("Running scheduled task")

scheduler = BlockingScheduler()
scheduler.add_job(
    my_job,
    CronTrigger.from_crontab('*/5 * * * *')  # Every 5 minutes
)
scheduler.start()`,
      },
      {
        title: "Alternative: Use schedule library",
        description: "For simpler interval-based scheduling",
        code: `import schedule
import time

def job():
    print("Running task...")

schedule.every(5).minutes.do(job)

while True:
    schedule.run_pending()
    time.sleep(1)`,
      },
    ],
    limitations: [
      "Requires a running Python process or Celery worker",
      "Celery needs Redis/RabbitMQ infrastructure",
      "APScheduler jobs are lost on restart (unless using job stores)",
      "No built-in HTTP endpoint monitoring",
      "Complex setup for distributed systems",
    ],
    cronUptimeAdvantages: [
      "No Python process to maintain",
      "Works with Flask, Django, FastAPI endpoints",
      "Automatic retries on failure",
      "Execution logs and history",
      "Zero infrastructure management",
    ],
    faq: [
      {
        question: "What is the best way to schedule cron jobs in Python?",
        answer: "For simple in-process scheduling, use APScheduler. For distributed systems, Celery with Celery Beat is recommended. For basic intervals, the schedule library works well.",
      },
      {
        question: "How do I run a Python script on a schedule?",
        answer: "You can use system crontab (crontab -e on Linux), APScheduler within your app, or a managed service like CronUptime that calls your Python web endpoint on schedule.",
      },
      {
        question: "What's the difference between APScheduler and Celery?",
        answer: "APScheduler runs tasks in the same process and is simpler to set up. Celery is a distributed task queue requiring Redis/RabbitMQ but scales better for heavy workloads.",
      },
    ],
  },
  {
    slug: "cron-job-list",
    title: "Cron Job List & Management",
    metaTitle: "Cron Job List - View, Manage & Monitor Scheduled Tasks",
    metaDescription: "Learn how to list, view, and manage cron jobs on Linux, macOS, and cloud platforms. Best practices for cron job management and monitoring.",
    keywords: [
      "cron job list",
      "list cron jobs",
      "crontab list",
      "crontab -l",
      "view cron jobs",
      "show cron jobs",
      "cron job management",
      "cron job monitor",
      "manage cron jobs",
      "cron job dashboard",
    ],
    platform: "Linux/Unix",
    description: "Managing cron jobs effectively requires knowing how to list, view, and monitor your scheduled tasks. Traditional crontab can be difficult to manage at scale.",
    setupSteps: [
      {
        title: "List current user's cron jobs",
        description: "View all cron jobs for the current user",
        code: "crontab -l",
      },
      {
        title: "List all users' cron jobs (root)",
        description: "As root, view cron jobs for all users",
        code: `# List all users' crontabs
for user in $(cut -f1 -d: /etc/passwd); do
  echo "=== $user ===" 
  crontab -u $user -l 2>/dev/null
done`,
      },
      {
        title: "Check system cron directories",
        description: "System-wide cron jobs are in these locations",
        code: `ls -la /etc/cron.d/
ls -la /etc/cron.daily/
ls -la /etc/cron.hourly/
ls -la /etc/cron.weekly/
ls -la /etc/cron.monthly/`,
      },
    ],
    limitations: [
      "No central dashboard for all cron jobs",
      "Difficult to track across multiple servers",
      "No execution history or logs by default",
      "No alerting on job failures",
      "Hard to manage permissions and access",
    ],
    cronUptimeAdvantages: [
      "Central dashboard for all scheduled tasks",
      "Execution history and detailed logs",
      "Email/webhook alerts on failures",
      "No server access required",
      "Team collaboration features",
    ],
    faq: [
      {
        question: "How do I list all cron jobs in Linux?",
        answer: "Use 'crontab -l' to list your cron jobs. For all users (as root), iterate through /var/spool/cron/ or use 'crontab -u username -l' for each user.",
      },
      {
        question: "Where are cron jobs stored in Linux?",
        answer: "User cron jobs are in /var/spool/cron/crontabs/ (Debian/Ubuntu) or /var/spool/cron/ (RHEL/CentOS). System cron jobs are in /etc/cron.d/ and /etc/crontab.",
      },
      {
        question: "How can I see if a cron job ran?",
        answer: "Check /var/log/syslog or /var/log/cron for cron execution logs. You can also redirect output in your crontab: */5 * * * * /script.sh >> /var/log/myjob.log 2>&1",
      },
    ],
  },
  {
    slug: "vercel-cron-jobs",
    title: "Vercel Cron Jobs",
    metaTitle: "Vercel Cron Jobs - Schedule Serverless Functions",
    metaDescription: "Learn how to set up cron jobs in Vercel using vercel.json. Understand limitations and alternatives for Vercel scheduled functions.",
    keywords: [
      "vercel cron jobs",
      "vercel cron",
      "vercel scheduled functions",
      "vercel.json cron",
      "vercel serverless cron",
      "next js vercel cron",
      "vercel cron job example",
      "vercel schedule function",
    ],
    platform: "Vercel",
    description: "Vercel offers built-in cron job support for Pro and Enterprise plans through vercel.json configuration. It triggers your serverless functions on a schedule.",
    setupSteps: [
      {
        title: "Create an API route",
        description: "Create the endpoint that will be called",
        code: `// app/api/cron/route.ts
export async function GET() {
  // Your scheduled task logic
  console.log('Cron job executed');
  
  return Response.json({ success: true });
}`,
      },
      {
        title: "Configure vercel.json",
        description: "Define your cron schedule in vercel.json",
        code: `{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "*/5 * * * *"
    }
  ]
}`,
      },
      {
        title: "Deploy to Vercel",
        description: "Cron jobs are activated on deployment",
        code: `vercel --prod
# Cron jobs only run in production`,
      },
    ],
    limitations: [
      "Only available on Pro ($20/mo) and Enterprise plans",
      "Maximum 10 second execution time on Hobby",
      "Limited to specific cron expressions",
      "No execution history in free tier",
      "Cron jobs only run in production environment",
    ],
    cronUptimeAdvantages: [
      "Works with Vercel Hobby (free) plan",
      "30 second timeout vs 10 second limit",
      "Detailed execution logs and history",
      "Works across any hosting platform",
      "Free tier with 5 cron jobs",
    ],
    faq: [
      {
        question: "Does Vercel support cron jobs on the free plan?",
        answer: "Vercel cron jobs are only available on Pro ($20/month) and Enterprise plans. Hobby (free) users can use external services like CronUptime to trigger their endpoints.",
      },
      {
        question: "How do I set up a cron job in Vercel?",
        answer: "Create an API route, then add a 'crons' array in vercel.json with the path and schedule. Deploy to production - cron jobs don't run in preview deployments.",
      },
      {
        question: "What's the maximum runtime for Vercel cron jobs?",
        answer: "Vercel cron jobs follow your plan's function timeout: 10 seconds for Hobby, 60 seconds for Pro, and 900 seconds for Enterprise.",
      },
    ],
  },
  {
    slug: "nextjs-cron-jobs",
    title: "Next.js Cron Jobs",
    metaTitle: "Next.js Cron Jobs - Schedule Tasks in Next.js Apps",
    metaDescription: "Learn how to implement cron jobs in Next.js applications. Use API routes with external schedulers or Vercel cron for production scheduling.",
    keywords: [
      "next cron jobs",
      "nextjs cron",
      "next.js scheduler",
      "next js cron job",
      "next js scheduled tasks",
      "next api cron",
      "cron job next js",
      "next js background jobs",
    ],
    platform: "Next.js",
    description: "Next.js doesn't have built-in cron functionality, but you can implement scheduled tasks using API routes combined with external schedulers or Vercel's cron feature.",
    setupSteps: [
      {
        title: "Create an API route",
        description: "Create an API endpoint for your scheduled task",
        code: `// app/api/scheduled-task/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Verify the request is from your cron service
  const authHeader = request.headers.get('authorization');
  if (authHeader !== \`Bearer \${process.env.CRON_SECRET}\`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Your task logic here
  await performScheduledTask();

  return NextResponse.json({ success: true });
}

async function performScheduledTask() {
  // Database cleanup, email sending, etc.
}`,
      },
      {
        title: "Secure your endpoint",
        description: "Add authentication to prevent unauthorized access",
        code: `// .env.local
CRON_SECRET=your-secret-token-here`,
      },
      {
        title: "Set up external scheduler",
        description: "Use CronUptime or similar to call your endpoint",
        code: `# Configure in CronUptime:
# URL: https://yourapp.vercel.app/api/scheduled-task
# Headers: { "Authorization": "Bearer your-secret-token" }
# Schedule: Every 5 minutes`,
      },
    ],
    limitations: [
      "No native cron support in Next.js",
      "Vercel cron requires Pro plan",
      "Serverless functions have timeout limits",
      "Need external service for free hosting",
      "Must handle authentication manually",
    ],
    cronUptimeAdvantages: [
      "Works with any Next.js deployment (Vercel, Netlify, self-hosted)",
      "Free tier available",
      "Built-in execution monitoring",
      "Supports custom headers for authentication",
      "Simple setup - just paste your URL",
    ],
    faq: [
      {
        question: "Does Next.js have built-in cron job support?",
        answer: "No, Next.js doesn't have native cron support. You can use Vercel's cron feature (Pro plan), an external scheduler service, or deploy to a server with system cron.",
      },
      {
        question: "How do I run background jobs in Next.js?",
        answer: "Create an API route for your task and use an external service to call it on schedule. For long-running jobs, consider using a queue service like Inngest or Trigger.dev.",
      },
      {
        question: "Can I use node-cron with Next.js?",
        answer: "node-cron doesn't work well with serverless Next.js deployments because the process doesn't stay alive. It only works for self-hosted Next.js with a persistent Node.js process.",
      },
    ],
  },
  {
    slug: "npm-cron-jobs",
    title: "NPM Cron Jobs Packages",
    metaTitle: "NPM Cron Jobs - Best Node.js Scheduler Packages",
    metaDescription: "Compare the best NPM packages for cron jobs: node-cron, cron, node-schedule, and Agenda. Find the right scheduler for your Node.js app.",
    keywords: [
      "npm cron jobs",
      "npm cron",
      "npm node-cron",
      "npm scheduler",
      "node cron npm",
      "cron npm package",
      "npm schedule",
      "best cron package npm",
    ],
    platform: "NPM/Node.js",
    description: "NPM offers several cron job packages for Node.js applications. Each has different features, from simple cron expressions to distributed job queues.",
    setupSteps: [
      {
        title: "node-cron (Most Popular)",
        description: "Simple and lightweight cron scheduler",
        code: `npm install node-cron

const cron = require('node-cron');

cron.schedule('*/5 * * * *', () => {
  console.log('Running every 5 minutes');
});`,
      },
      {
        title: "cron (Feature-rich)",
        description: "More features including timezone support",
        code: `npm install cron

const { CronJob } = require('cron');

const job = new CronJob(
  '*/5 * * * *',
  function() {
    console.log('Running every 5 minutes');
  },
  null,
  true,
  'America/New_York'
);`,
      },
      {
        title: "Agenda (MongoDB-backed)",
        description: "Persistent job scheduling with MongoDB",
        code: `npm install agenda

const Agenda = require('agenda');
const agenda = new Agenda({ db: { address: mongoConnectionString } });

agenda.define('send email', async job => {
  await sendEmail(job.attrs.data.to);
});

await agenda.every('5 minutes', 'send email', { to: 'user@example.com' });
await agenda.start();`,
      },
    ],
    limitations: [
      "All require a running Node.js process",
      "Jobs lost on restart (except Agenda)",
      "No built-in monitoring dashboard",
      "Agenda requires MongoDB infrastructure",
      "Scaling requires additional setup",
    ],
    cronUptimeAdvantages: [
      "No Node.js process required",
      "No NPM packages to manage",
      "Works with any HTTP endpoint",
      "Built-in monitoring and alerts",
      "Free tier available",
    ],
    faq: [
      {
        question: "What is the best NPM package for cron jobs?",
        answer: "node-cron is the most popular for simple scheduling. cron offers timezone support. Agenda is best for persistent jobs with MongoDB. Choose based on your needs.",
      },
      {
        question: "What's the difference between node-cron and cron packages?",
        answer: "node-cron is simpler and lighter. The 'cron' package offers more features like timezone support, onComplete callbacks, and better TypeScript support.",
      },
      {
        question: "How do I persist cron jobs across restarts?",
        answer: "Use Agenda with MongoDB, or Bull/BullMQ with Redis for persistent job storage. Alternatively, use an external service like CronUptime that doesn't depend on your app's uptime.",
      },
    ],
  },
  {
    slug: "docker-cron-jobs",
    title: "Docker Cron Jobs",
    metaTitle: "Docker Cron Jobs - Schedule Tasks in Containers",
    metaDescription: "Learn how to run cron jobs in Docker containers. Best practices for containerized scheduled tasks and alternatives.",
    keywords: [
      "docker cron jobs",
      "docker cron",
      "cron in docker",
      "docker container cron",
      "docker-compose cron",
      "dockerfile cron",
      "cron docker container",
      "run cron in docker",
    ],
    platform: "Docker",
    description: "Running cron jobs in Docker requires special consideration. You can run cron inside a container, use a sidecar container, or trigger containers externally.",
    setupSteps: [
      {
        title: "Option 1: Cron inside container",
        description: "Install and run cron daemon in your container",
        code: `# Dockerfile
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y cron

# Add crontab file
COPY crontab /etc/cron.d/my-cron
RUN chmod 0644 /etc/cron.d/my-cron
RUN crontab /etc/cron.d/my-cron

# Run cron in foreground
CMD ["cron", "-f"]`,
      },
      {
        title: "Option 2: Separate cron container",
        description: "Use docker-compose with a dedicated cron service",
        code: `# docker-compose.yml
services:
  app:
    build: .
    
  cron:
    build: .
    command: >
      sh -c "while true; do
        curl http://app:3000/api/cron
        sleep 300
      done"
    depends_on:
      - app`,
      },
      {
        title: "Option 3: Host cron triggers container",
        description: "Use host's cron to run docker commands",
        code: `# Host crontab
*/5 * * * * docker exec myapp php /app/artisan schedule:run
# or
*/5 * * * * docker run --rm myimage /app/task.sh`,
      },
    ],
    limitations: [
      "Cron daemon adds complexity to containers",
      "Logs can be difficult to capture",
      "Container restarts reset cron state",
      "Timezone configuration challenges",
      "Not cloud-native approach",
    ],
    cronUptimeAdvantages: [
      "No cron daemon needed in containers",
      "Works with any containerized HTTP service",
      "Centralized logging and monitoring",
      "Cloud-native approach",
      "Decoupled from container lifecycle",
    ],
    faq: [
      {
        question: "Should I run cron inside a Docker container?",
        answer: "It's generally better to trigger containers externally. Running cron inside containers adds complexity and goes against the single-process principle of containers.",
      },
      {
        question: "How do I schedule tasks in Docker Compose?",
        answer: "Options include: a sidecar container with a loop/curl, host crontab triggering docker commands, or external schedulers calling your container's HTTP endpoints.",
      },
      {
        question: "How do I see cron logs in Docker?",
        answer: "Cron logs aren't sent to stdout by default. Redirect cron output: * * * * * /script.sh >> /proc/1/fd/1 2>&1, or install and configure rsyslog.",
      },
    ],
  },
  {
    slug: "ansible-cron-jobs",
    title: "Ansible Cron Jobs",
    metaTitle: "Ansible Cron Jobs - Manage Cron with Ansible Playbooks",
    metaDescription: "Learn how to manage cron jobs with Ansible using the cron module. Automate cron job deployment across multiple servers.",
    keywords: [
      "ansible cron jobs",
      "ansible cron",
      "ansible cron module",
      "ansible crontab",
      "ansible schedule task",
      "ansible.builtin.cron",
      "ansible cron example",
      "manage cron with ansible",
    ],
    platform: "Ansible",
    description: "Ansible's cron module allows you to manage cron jobs across multiple servers declaratively. It's ideal for infrastructure-as-code approaches to scheduled tasks.",
    setupSteps: [
      {
        title: "Basic cron job with Ansible",
        description: "Create a cron job using the cron module",
        code: `# playbook.yml
- name: Configure cron jobs
  hosts: webservers
  tasks:
    - name: Run backup every day at 2am
      ansible.builtin.cron:
        name: "daily backup"
        minute: "0"
        hour: "2"
        job: "/opt/scripts/backup.sh"`,
      },
      {
        title: "Cron job with special time",
        description: "Use special_time for common schedules",
        code: `- name: Run cleanup weekly
  ansible.builtin.cron:
    name: "weekly cleanup"
    special_time: weekly
    job: "/opt/scripts/cleanup.sh"
    
# special_time options: 
# reboot, yearly, annually, monthly, 
# weekly, daily, hourly`,
      },
      {
        title: "Manage environment variables",
        description: "Set cron environment variables",
        code: `- name: Set cron environment
  ansible.builtin.cron:
    name: PATH
    env: yes
    value: "/usr/local/bin:/usr/bin"
    
- name: API sync with env vars
  ansible.builtin.cron:
    name: "api sync"
    minute: "*/5"
    job: "/opt/scripts/sync.sh"
    user: deploy`,
      },
    ],
    limitations: [
      "Still requires server maintenance",
      "Cron jobs tied to server uptime",
      "No centralized monitoring across servers",
      "Debugging failures requires SSH access",
      "Managing across many servers gets complex",
    ],
    cronUptimeAdvantages: [
      "No server infrastructure needed",
      "Central dashboard for all scheduled tasks",
      "Works with any HTTP endpoint",
      "Built-in failure notifications",
      "Reduces server management overhead",
    ],
    faq: [
      {
        question: "How do I create a cron job with Ansible?",
        answer: "Use the ansible.builtin.cron module with name, minute, hour, day, month, weekday, and job parameters. The name parameter makes the job idempotent.",
      },
      {
        question: "How do I remove a cron job with Ansible?",
        answer: "Set state: absent with the same name: ansible.builtin.cron: name: 'job name' state: absent. The name must match the original.",
      },
      {
        question: "Can Ansible manage cron jobs for different users?",
        answer: "Yes, use the 'user' parameter: ansible.builtin.cron: name: 'backup' job: '/backup.sh' user: postgres. Default is the Ansible connection user.",
      },
    ],
  },
  {
    slug: "n8n-cron-schedule",
    title: "n8n Cron Schedule",
    metaTitle: "n8n Cron Schedule - Automate Workflows with Cron Triggers",
    metaDescription: "Learn how to use cron expressions in n8n to schedule automated workflows. Master n8n's Schedule Trigger node for precise timing control.",
    keywords: [
      "n8n cron schedule",
      "n8n cron",
      "n8n schedule trigger",
      "n8n cron expression",
      "n8n scheduled workflow",
      "n8n automation schedule",
      "n8n cron job",
      "n8n timing",
      "n8n scheduler",
      "n8n workflow automation",
    ],
    platform: "n8n",
    description: "n8n is a powerful workflow automation tool that supports cron expressions through its Schedule Trigger node. You can create complex automated workflows that run on precise schedules.",
    setupSteps: [
      {
        title: "Add Schedule Trigger Node",
        description: "Start your workflow with the Schedule Trigger node",
        code: `// In n8n workflow editor:
// 1. Click '+' to add a new node
// 2. Search for "Schedule Trigger"
// 3. Add it as the first node in your workflow`,
      },
      {
        title: "Configure Cron Expression",
        description: "Set your schedule using cron syntax",
        code: `// Schedule Trigger Settings:
// Trigger Mode: "Cron"
// Cron Expression: "*/5 * * * *"  // Every 5 minutes

// Common n8n cron patterns:
// */5 * * * *     - Every 5 minutes
// 0 * * * *       - Every hour
// 0 9 * * *       - Every day at 9 AM
// 0 9 * * 1-5     - Weekdays at 9 AM
// 0 0 1 * *       - First day of month`,
      },
      {
        title: "Add Workflow Actions",
        description: "Connect nodes to perform your automated tasks",
        code: `// Example: Daily report workflow
// 
// [Schedule Trigger] → [HTTP Request] → [IF] → [Send Email]
//     (9 AM daily)      (Fetch data)   (Check)  (Send report)
//
// n8n supports 400+ integrations:
// - HTTP Request for API calls
// - Database queries (MySQL, PostgreSQL, MongoDB)
// - Email, Slack, Discord notifications
// - Google Sheets, Airtable, Notion
// - And many more...`,
      },
      {
        title: "Activate Your Workflow",
        description: "Enable the workflow to start running on schedule",
        code: `// Workflow Activation:
// 1. Click "Save" to save your workflow
// 2. Toggle the "Active" switch in the top right
// 3. Your workflow will now run on the defined schedule
//
// Note: Workflow must be Active for Schedule Trigger to work`,
      },
    ],
    limitations: [
      "Requires self-hosted n8n instance or paid cloud plan",
      "Self-hosted n8n needs server maintenance",
      "No built-in uptime monitoring for the n8n instance",
      "Cloud plan has execution limits",
      "Complex workflows can be hard to debug",
      "Timezone handling requires manual configuration",
    ],
    cronUptimeAdvantages: [
      "No n8n instance required for simple HTTP triggers",
      "Built-in monitoring and failure alerts",
      "Lighter alternative for simple scheduled HTTP calls",
      "Can trigger n8n webhook workflows reliably",
      "Free tier for basic scheduling needs",
      "Guaranteed execution with retry logic",
    ],
    faq: [
      {
        question: "How do I schedule a workflow in n8n?",
        answer: "Use the Schedule Trigger node as the first node in your workflow. Set the Trigger Mode to 'Cron' and enter your cron expression. Save and activate the workflow to start the schedule.",
      },
      {
        question: "What cron format does n8n use?",
        answer: "n8n uses standard 5-field cron format: minute (0-59), hour (0-23), day of month (1-31), month (1-12), day of week (0-7). You can also use special characters like */5 for intervals.",
      },
      {
        question: "Can I run n8n workflows every minute?",
        answer: "Yes, use the cron expression '* * * * *' to run every minute. However, consider your n8n plan limits and server resources. For high-frequency tasks, ensure your previous execution completes before the next one starts.",
      },
      {
        question: "How do I trigger n8n from an external service?",
        answer: "Use the Webhook node instead of Schedule Trigger. This creates a URL that external services like CronUptime can call. This is useful for reliable triggering with monitoring and retry logic.",
      },
      {
        question: "What's the difference between Schedule Trigger and Interval?",
        answer: "Schedule Trigger uses cron expressions for precise timing (e.g., 'every day at 9 AM'). Interval mode runs workflows at fixed intervals (e.g., 'every 5 minutes') but doesn't guarantee specific times.",
      },
    ],
  },
];

// Helper function to get platform by slug
export function getPlatformBySlug(slug: string): PlatformData | undefined {
  return platforms.find((platform) => platform.slug === slug);
}

// Get all platform slugs for sitemap
export function getAllPlatformSlugs(): string[] {
  return platforms.map((p) => p.slug);
}

// Get related platforms
export function getRelatedPlatforms(currentSlug: string): PlatformData[] {
  return platforms.filter((p) => p.slug !== currentSlug).slice(0, 4);
}

