export interface User {
  id: string;
  email: string;
  password_hash?: string;
  name?: string;
  image?: string;
  created_at: number;
}

export interface Monitor {
  id: string;
  user_id: string | null;
  name: string | null;
  url: string;
  urls: string | null; // JSON array of URLs for multiple URL support
  method: string;
  interval_sec: number;
  timeout_ms: number;
  expected_min: number | null;
  expected_max: number | null;
  keyword: string | null;
  headers_json: string | null;
  body: string | null;
  is_active: number;
  next_run_at: number | null;
  locked_at: number | null;
  last_status: string | null;
  last_latency_ms: number | null;
  last_checked_at: number | null;
  created_at: number;
  recovery_period_sec: number | null;
  confirmation_period_sec: number | null;
}

export interface MonitorCheck {
  id: string;
  monitor_id: string;
  ts: number;
  status: string;
  http_status: number | null;
  latency_ms: number | null;
  error: string | null;
}

export interface CronJob {
  id: string;
  user_id: string | null;
  name: string | null;
  url: string;
  method: string;
  headers_json: string | null;
  body: string | null;
  cron_expr: string | null;
  interval_sec: number | null;
  timeout_ms: number;
  expected_min: number | null;
  expected_max: number | null;
  keyword: string | null;
  is_active: number;
  next_run_at: number | null;
  locked_at: number | null;
  last_status: string | null;
  last_run_at: number | null;
  fail_streak: number;
  created_at: number;
  guest_ip: string | null;
  expires_at: number | null;
}

export interface CronRun {
  id: string;
  cron_job_id: string;
  ts: number;
  status: string;
  http_status: number | null;
  duration_ms: number | null;
  error: string | null;
  response_body: string | null;
}

export interface Incident {
  id: string;
  type: 'monitor' | 'cron';
  source_id: string;
  user_id: string | null;
  cause: string | null; // 'timeout', 'http_error', 'keyword_missing'
  http_status: number | null;
  started_at: number;
  resolved_at: number | null;
  last_update_at: number;
  screenshot_url: string | null; // R2 public URL of the screenshot
  // Join ile gelen alanlar
  source_name?: string;
  source_url?: string;
}

export interface IncidentEvent {
  id: string;
  incident_id: string;
  user_id: string | null;
  event_type: 'comment' | 'started' | 'resolved' | 'auto_resolved';
  content: string | null;
  created_at: number;
  updated_at: number | null;
  // Join ile gelen
  user_name?: string;
  user_email?: string;
  user_image?: string;
}

export interface ApiToken {
  id: string;
  user_id: string;
  name: string | null;
  token_prefix: string;
  scopes: string[];
  last_used_at: number | null;
  expires_at: number | null;
  created_at: number;
  revoked_at: number | null;
}

export interface StatusPage {
  id: string;
  user_id: string;
  company_name: string;
  subdomain: string;
  custom_domain: string | null;
  logo_url: string | null;
  logo_link_url: string | null;
  contact_url: string | null;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface StatusPageSection {
  id: string;
  status_page_id: string;
  name: string | null;
  sort_order: number;
  created_at: number;
  // Join ile gelen
  resources?: StatusPageResource[];
}

export interface StatusPageResource {
  id: string;
  section_id: string;
  resource_type: 'monitor' | 'cron_job';
  resource_id: string;
  show_history: number;
  sort_order: number;
  // Join ile gelen
  resource_name?: string;
  resource_url?: string;
}

