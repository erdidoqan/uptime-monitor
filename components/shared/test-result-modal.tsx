'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Hash, FileText, AlertTriangle } from 'lucide-react';

export interface TestResult {
  success: boolean;
  status_code: number | null;
  duration_ms: number;
  response_body: string | null;
  error: string | null;
  keyword_found?: boolean;
}

interface TestResultModalProps {
  open: boolean;
  onClose: () => void;
  result: TestResult | null;
  onEditRequest?: () => void;
}

// Simple JSON syntax highlighter - same as cron-job-runs.tsx
function highlightJSON(jsonString: string): React.ReactNode {
  try {
    const parsed = JSON.parse(jsonString);
    const formatted = JSON.stringify(parsed, null, 2);
    
    // Split by lines and highlight each token
    const lines = formatted.split('\n');
    
    return lines.map((line, lineIndex) => {
      const tokens: React.ReactNode[] = [];
      let currentIndex = 0;
      
      // Improved regex patterns for better token matching
      const patterns = [
        { regex: /^(\s+)/, className: 'text-slate-500' }, // Indentation
        { regex: /^("(?:[^"\\]|\\.)*":\s*)/, className: 'text-blue-400' }, // Keys
        { regex: /^("(?:[^"\\]|\\.)*")/, className: 'text-emerald-400' }, // String values
        { regex: /^(\d+\.?\d*)/, className: 'text-amber-400' }, // Numbers
        { regex: /^(true|false|null)/, className: 'text-purple-400' }, // Booleans and null
        { regex: /^([{}\[\],:])/, className: 'text-slate-400' }, // Punctuation
      ];
      
      while (currentIndex < line.length) {
        let matched = false;
        
        for (const pattern of patterns) {
          const match = line.slice(currentIndex).match(pattern.regex);
          if (match) {
            const text = match[1];
            tokens.push(
              <span key={`${lineIndex}-${currentIndex}`} className={pattern.className}>
                {text}
              </span>
            );
            currentIndex += text.length;
            matched = true;
            break;
          }
        }
        
        if (!matched) {
          // Default text
          tokens.push(
            <span key={`${lineIndex}-${currentIndex}`} className="text-slate-100">
              {line[currentIndex]}
            </span>
          );
          currentIndex++;
        }
      }
      
      return (
        <React.Fragment key={lineIndex}>
          {tokens}
          {lineIndex < lines.length - 1 && '\n'}
        </React.Fragment>
      );
    });
  } catch {
    // If not valid JSON, return as plain text
    return <span className="text-slate-100">{jsonString}</span>;
  }
}

function formatResponseBody(body: string | null): { content: React.ReactNode; isJson: boolean } {
  if (!body) {
    return { content: null, isJson: false };
  }

  try {
    JSON.parse(body); // Just check if valid JSON
    return { content: highlightJSON(body), isJson: true };
  } catch {
    return { content: <span className="text-slate-300">{body}</span>, isJson: false };
  }
}

export function TestResultModal({ open, onClose, result, onEditRequest }: TestResultModalProps) {
  if (!result) return null;

  const { content, isJson } = formatResponseBody(result.response_body);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className={`pb-4 border-b ${result.success ? 'border-green-500/30' : 'border-red-500/30'}`}>
          <DialogTitle className="flex items-center gap-3">
            {result.success ? (
              <>
                <div className="p-2 rounded-full bg-green-500/20">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <span className="text-green-500">Test Passed</span>
                  <p className="text-sm font-normal text-muted-foreground mt-0.5">
                    The request was successful
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-2 rounded-full bg-red-500/20">
                  <XCircle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <span className="text-red-500">Test Failed</span>
                  <p className="text-sm font-normal text-muted-foreground mt-0.5">
                    {result.error || 'Unexpected status code'}
                  </p>
                </div>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Hash className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Status Code</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-lg">
                    {result.status_code ?? 'N/A'}
                  </span>
                  {result.status_code && (
                    <Badge 
                      variant={result.status_code >= 200 && result.status_code < 300 ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {result.status_code >= 200 && result.status_code < 300 ? 'OK' : 'Error'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <span className="font-mono font-semibold text-lg">
                  {result.duration_ms}ms
                </span>
              </div>
            </div>
          </div>

          {/* Keyword Check */}
          {result.keyword_found !== undefined && (
            <div className={`flex items-center gap-3 p-3 rounded-lg ${result.keyword_found ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              {result.keyword_found ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {result.keyword_found ? 'Keyword Found' : 'Keyword Not Found'}
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {result.error && !result.success && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-500">Error</p>
                <p className="text-sm text-red-400 mt-1">{result.error}</p>
              </div>
            </div>
          )}

          {/* Response Body */}
          {result.response_body && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Response Body</span>
                {isJson && <Badge variant="outline" className="text-xs">JSON</Badge>}
              </div>
              <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-[300px] border border-slate-800">
                <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                  {content}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {!result.success && onEditRequest && (
            <Button variant="outline" onClick={onEditRequest}>
              Edit Request
            </Button>
          )}
          <Button onClick={onClose}>
            {result.success ? 'Continue' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

