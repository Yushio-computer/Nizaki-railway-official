import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { TrainLine } from '../types';

interface StatusCardProps {
  lines: TrainLine[];
  onOpenRouteMap?: () => void;
}

interface ApiLineStatus {
  id: string;
  lineName: string;
  code: string;
  status: string;
  delayMinutes: number;
  message: string;
}

interface ApiStatusResponse {
  updatedAt: string;
  hasDelay: boolean;
  summary: string;
  lines: ApiLineStatus[];
}

function getFallbackStatusData(linesList: TrainLine[]): ApiStatusResponse {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const currentMinute = now.getMinutes();

  const lines: ApiLineStatus[] = [
    {
      id: 'kanzaki',
      lineName: '神埼線',
      code: 'Y',
      status: '平常運転',
      delayMinutes: 0,
      message: '現在、全線でほぼ平常通り運転しております。',
    },
    {
      id: 'kanzaki_kosoku',
      lineName: '神埼高速線',
      code: 'NI',
      status: '平常運転',
      delayMinutes: 0,
      message: '現在、全線でほぼ平常通り運転しております。',
    },
    {
      id: 'saichi',
      lineName: '埼千環状線',
      code: 'SC',
      status: '平常運転',
      delayMinutes: 0,
      message: '現在、全線でほぼ平常通り運転しております。',
    },
    {
      id: 'tsuchiura',
      lineName: '土浦線',
      code: 'TC',
      status: '平常運転',
      delayMinutes: 0,
      message: '現在、全線でほぼ平常通り運転しております。',
    },
  ];

  let hasDelay = false;
  let summary = '現在、神埼鉄道グループ全線でほぼ平常通り運転しております。';

  if (currentMinute >= 10 && currentMinute < 20) {
    lines[2].status = '一部遅延';
    lines[2].delayMinutes = 10;
    lines[2].message = '強風の影響により、大宮〜池袋間で最大約10分の遅延が発生しております。';
    hasDelay = true;
    summary = '【遅延情報】埼千環状線で最大約10分の遅延が発生しております。';
  } else if (currentMinute >= 35 && currentMinute < 45) {
    lines[0].status = '一部遅延';
    lines[0].delayMinutes = 5;
    lines[0].message = '混雑および安全確認の影響により、北千住〜大宮間で最大約5分の遅延が発生しております。';
    hasDelay = true;
    summary = '【遅延情報】神埼線で最大約5分の遅延が発生しております。';
  }

  return {
    updatedAt: `${now.toLocaleDateString('ja-JP')} ${timeStr}`,
    hasDelay,
    summary,
    lines,
  };
}

export const StatusCard: React.FC<StatusCardProps> = ({ lines }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusData, setStatusData] = useState<ApiStatusResponse>(() => getFallbackStatusData(lines));

  const fetchStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data: ApiStatusResponse = await res.json();
        if (data && Array.isArray(data.lines)) {
          setStatusData(data);
          if (data.updatedAt) {
            const timeOnly = data.updatedAt.split(' ')[1] || data.updatedAt;
            setLastUpdated(timeOnly.slice(0, 5));
          }
          return;
        }
      }
      // Fallback if API returned non-ok
      const fallback = getFallbackStatusData(lines);
      setStatusData(fallback);
      setLastUpdated(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      // Graceful fallback to simulated data without throwing uncaught exceptions in console
      const fallback = getFallbackStatusData(lines);
      setStatusData(fallback);
      setLastUpdated(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // 30秒ごとに更新
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    fetchStatus();
  };

  const hasDelay = statusData?.hasDelay ?? false;

  return (
    <div className={`border rounded-xl p-3 text-[#221C35] transition-all shadow-xs ${
      hasDelay ? 'bg-amber-50 border-amber-200' : 'bg-[#EFE8FA] border-[#E2D8F3]'
    }`}>
      {/* Smart 1-Line Horizontal Status Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="cursor-pointer flex items-center justify-between gap-2 select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
            hasDelay ? 'bg-amber-100' : 'bg-emerald-100'
          }`}>
            {hasDelay ? (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div className="flex items-center gap-2 truncate text-xs font-bold text-[#221C35]">
            <span>{hasDelay ? '一部路線で遅延あり' : '全線平常運転'}</span>
            <span className="text-[11px] font-normal text-[#6B6380] hidden sm:inline truncate">
              {statusData ? statusData.summary : `（${lines.map((l) => l.name.replace(/^\d+\.\s*/, '').replace(/\s*\([A-Z0-9]+\)/i, '').trim()).join('・')}）`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {lastUpdated && (
            <span className="text-[10px] text-[#6B6380] font-mono hidden xs:inline">
              {lastUpdated} 更新
            </span>
          )}
          <button
            onClick={handleRefresh}
            className={`p-1 rounded-md hover:bg-white/50 text-[#6B6380] transition-all cursor-pointer ${
              isRefreshing ? 'animate-spin text-[#5B21B6]' : ''
            }`}
            title="最新情報に更新"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="p-1 rounded-md text-[#6B6380] hover:bg-white/50">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>

      {/* Expandable Line Details */}
      {isExpanded && (
        <div className="mt-2.5 pt-2.5 border-t border-[#DFD5F0] space-y-2 text-xs animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {(statusData?.lines || []).map((line) => {
              const originalLine = lines.find((l) => l.code === line.code);
              const isLineDelay = line.delayMinutes > 0;
              return (
                <div
                  key={line.id}
                  className={`flex flex-col gap-1 p-2 rounded-lg border text-xs ${
                    isLineDelay ? 'bg-amber-100/70 border-amber-300' : 'bg-white/80 border-[#E6E2EE]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: originalLine?.color || '#8B5CF6' }}
                      />
                      <span className="font-bold text-[#221C35]">{line.lineName}</span>
                    </div>
                    <span className={`text-[11px] font-bold ${isLineDelay ? 'text-amber-800' : 'text-emerald-700'}`}>
                      {line.status}
                    </span>
                  </div>
                  {line.message && (
                    <div className="text-[10px] text-[#6B6380]">
                      {line.message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

