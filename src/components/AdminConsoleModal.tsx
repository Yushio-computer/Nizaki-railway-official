import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  AlertCircle,
  CheckCircle2,
  Copy,
  Trash2,
  RefreshCw,
  Database,
  Smartphone,
  Terminal,
  Lock,
  KeyRound,
  Check,
  ChevronRight,
  ChevronDown,
  Bug,
  Layers,
  Search,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Radio,
  FileCheck,
  Sliders,
  MessageSquare,
  Zap,
  Clock3,
  MapPin,
  Flame,
} from 'lucide-react';
import { systemLogger, SystemLogEntry, SystemMetrics, AuditResult } from '../utils/systemLogger';
import {
  disruptionManager,
  LineDisruption,
  DisruptionStatusType,
  DEFAULT_LINE_INFOS,
  COMMON_REASONS,
  COMMON_SECTIONS,
  generateDisruptionText,
} from '../utils/disruptionManager';

interface AdminConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshAppState?: () => void;
}

const DEFAULT_PIN = '1925'; // 神埼鉄道 創業年 (初期値)
const PIN_STORAGE_KEY = 'nizaki_admin_pin';
const EMERGENCY_ALERT_KEY = 'nizaki_emergency_alert_manual';

export const AdminConsoleModal: React.FC<AdminConsoleModalProps> = ({
  isOpen,
  onClose,
  onRefreshAppState,
}) => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [currentPin, setCurrentPin] = useState(DEFAULT_PIN);
  const [newPinInput, setNewPinInput] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);

  // Tabs: 'disruption' | 'metrics' | 'errors' | 'emergency' | 'storage' | 'settings'
  const [activeTab, setActiveTab] = useState<'disruption' | 'metrics' | 'errors' | 'emergency' | 'storage' | 'settings'>('disruption');

  // Disruption Dispatcher State
  const [selectedLineId, setSelectedLineId] = useState<string>('kanzaki');
  const [disruptionStatusType, setDisruptionStatusType] = useState<DisruptionStatusType>('delay');
  const [maxDelayMinutes, setMaxDelayMinutes] = useState<number>(15);
  const [durationUntil, setDurationUntil] = useState<string>('18:30頃まで');
  const [section, setSection] = useState<string>('全線');
  const [reason, setReason] = useState<string>('車両点検のため');
  const [useCustomMessage, setUseCustomMessage] = useState<boolean>(false);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [linkToSystem, setLinkToSystem] = useState<boolean>(true);
  const [activeDisruptionsMap, setActiveDisruptionsMap] = useState<Record<string, LineDisruption>>(() =>
    disruptionManager.getAllDisruptions()
  );

  // Load line-specific disruption config
  const loadLineConfig = (lineId: string) => {
    setSelectedLineId(lineId);
    const existing = disruptionManager.getLineDisruption(lineId);
    if (existing) {
      setDisruptionStatusType(existing.statusType);
      setMaxDelayMinutes(existing.maxDelayMinutes || 15);
      setDurationUntil(existing.durationUntil || '');
      setSection(existing.section || '全線');
      setReason(existing.reason || '車両点検のため');
      setUseCustomMessage(existing.useCustomMessage || false);
      setCustomMessage(existing.customMessage || '');
      setLinkToSystem(existing.linkToSystem ?? true);
    } else {
      setDisruptionStatusType('delay');
      setMaxDelayMinutes(15);
      setDurationUntil('18:30頃まで');
      setSection('全線');
      setReason('車両点検のため');
      setUseCustomMessage(false);
      setCustomMessage('');
      setLinkToSystem(true);
    }
  };

  // Dispatch disruption
  const handleDispatchDisruption = () => {
    const lineDef = DEFAULT_LINE_INFOS.find((l) => l.id === selectedLineId) || DEFAULT_LINE_INFOS[0];
    const generatedText = generateDisruptionText(
      lineDef.name,
      disruptionStatusType,
      maxDelayMinutes,
      section,
      reason,
      durationUntil
    );

    const disruptionData: LineDisruption = {
      lineId: selectedLineId,
      lineName: lineDef.name,
      code: lineDef.code,
      statusType: disruptionStatusType,
      maxDelayMinutes: Number(maxDelayMinutes) || 0,
      durationUntil: durationUntil.trim(),
      section: section.trim() || '全線',
      reason: reason.trim() || '安全確認のため',
      customMessage: customMessage.trim() || generatedText,
      useCustomMessage,
      linkToSystem,
      updatedAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    };

    disruptionManager.setLineDisruption(disruptionData);
    setActiveDisruptionsMap(disruptionManager.getAllDisruptions());
    systemLogger.info(
      `[運行指令発令] ${lineDef.name} (${lineDef.code}): ${
        disruptionStatusType === 'delay' ? `遅延(最大約${maxDelayMinutes}分)` : disruptionStatusType
      } / 連動=${linkToSystem}`,
      'DisruptionDispatcher'
    );
    setActionNotice(`【運行指令発令】${lineDef.name} の運行情報・遅延を更新・反映しました`);
    setTimeout(() => setActionNotice(null), 3500);
    if (onRefreshAppState) onRefreshAppState();
  };

  // Clear single line disruption
  const handleClearLineDisruption = (lineIdToClear?: string) => {
    const targetLineId = lineIdToClear || selectedLineId;
    const lineDef = DEFAULT_LINE_INFOS.find((l) => l.id === targetLineId) || DEFAULT_LINE_INFOS[0];
    disruptionManager.clearLineDisruption(targetLineId);
    setActiveDisruptionsMap(disruptionManager.getAllDisruptions());
    if (targetLineId === selectedLineId) {
      setDisruptionStatusType('normal');
      setUseCustomMessage(false);
      setCustomMessage('');
    }
    systemLogger.info(`[運行指令] ${lineDef.name} を平常運転に復帰しました`, 'DisruptionDispatcher');
    setActionNotice(`${lineDef.name} を平常運転に復帰しました`);
    setTimeout(() => setActionNotice(null), 3000);
    if (onRefreshAppState) onRefreshAppState();
  };

  // Clear all disruptions
  const handleClearAllDisruptions = () => {
    disruptionManager.clearAllDisruptions();
    setActiveDisruptionsMap({});
    setDisruptionStatusType('normal');
    setUseCustomMessage(false);
    setCustomMessage('');
    systemLogger.info('[運行指令] 全路線の運行情報を平常運転に一括復帰しました', 'DisruptionDispatcher');
    setActionNotice('全路線の運行情報を平常運転に一括復帰しました');
    setTimeout(() => setActionNotice(null), 3000);
    if (onRefreshAppState) onRefreshAppState();
  };

  // Logs & Metrics
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Emergency Audit State
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [emergencyAlertText, setEmergencyAlertText] = useState('');
  const [emergencyAlertActive, setEmergencyAlertActive] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Storage Confirmation Dialog State
  const [showClearStorageConfirm, setShowClearStorageConfirm] = useState(false);

  // Selected storage key for inspection
  const [selectedStorageKey, setSelectedStorageKey] = useState<string | null>(null);
  const [storageDataView, setStorageDataView] = useState<string | null>(null);

  // Handle modal close with auth reset
  const handleClose = () => {
    setIsAuthenticated(false);
    setPinInput('');
    setPinError(false);
    setShowClearStorageConfirm(false);
    onClose();
  };

  // Reset auth and load custom PIN & emergency alert state whenever modal opens/closes
  useEffect(() => {
    // Always require re-authentication on every open
    setIsAuthenticated(false);
    setPinInput('');
    setPinError(false);
    setShowClearStorageConfirm(false);
    setSelectedStorageKey(null);
    setStorageDataView(null);

    try {
      const savedPin = localStorage.getItem(PIN_STORAGE_KEY);
      if (savedPin && savedPin.length === 4) {
        setCurrentPin(savedPin);
      } else {
        setCurrentPin(DEFAULT_PIN);
      }

      const savedAlert = localStorage.getItem(EMERGENCY_ALERT_KEY);
      if (savedAlert) {
        setEmergencyAlertText(savedAlert);
        setEmergencyAlertActive(true);
      }
    } catch {
      // Ignore
    }
  }, [isOpen]);

  // Subscribe to logs and fetch metrics
  useEffect(() => {
    if (!isOpen) return;

    setMetrics(systemLogger.getMetrics());
    const unsubscribe = systemLogger.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });

    const interval = setInterval(() => {
      setMetrics(systemLogger.getMetrics());
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle PIN Keypad input
  const handleKeypadPress = (val: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + val;
      setPinInput(nextPin);
      setPinError(false);

      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setPinError(false);
  };

  const handleKeypadClear = () => {
    setPinInput('');
    setPinError(false);
  };

  // Strictly verify against current active PIN only (no backdoors, no old PIN bypass)
  const verifyPin = (inputToTest: string) => {
    if (inputToTest === currentPin) {
      setIsAuthenticated(true);
      setPinInput('');
      setPinError(false);
      systemLogger.info('管理者コンソールへのアクセスが認証されました', 'AdminAuth');
    } else {
      setPinError(true);
      setTimeout(() => {
        setPinInput('');
      }, 500);
      systemLogger.warn(`パスコード不一致の入力試行: [${inputToTest}]`, 'AdminAuth');
    }
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput.length === 4 && /^\d{4}$/.test(newPinInput)) {
      setCurrentPin(newPinInput);
      try {
        localStorage.setItem(PIN_STORAGE_KEY, newPinInput);
      } catch {
        // Ignore
      }
      setPinChangeSuccess(true);
      setNewPinInput('');
      setTimeout(() => setPinChangeSuccess(false), 2500);
      systemLogger.info('管理者パスコードが更新されました（旧PINは無効化されました）', 'AdminAuth');
    }
  };

  const handleResetPin = () => {
    setCurrentPin(DEFAULT_PIN);
    try {
      localStorage.removeItem(PIN_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setPinChangeSuccess(true);
    setTimeout(() => setPinChangeSuccess(false), 2500);
    systemLogger.info('管理者パスコードが初期値にリセットされました', 'AdminAuth');
  };

  // Emergency Actions
  const handleRunAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const result = systemLogger.runIntegrityAudit();
      setAuditResult(result);
      setIsAuditing(false);
      setActionNotice('全4路線およびシステム整合性監査が正常に完了しました');
      setTimeout(() => setActionNotice(null), 3000);
    }, 400);
  };

  const handleEmergencyResync = () => {
    if (confirm('緊急データ再同期を実行しますか？\n（ユーザー情報・ポイントを保持したまま、運行データおよび一時キャッシュを再構築します）')) {
      const ok = systemLogger.emergencyCacheResync();
      if (ok) {
        setMetrics(systemLogger.getMetrics());
        setActionNotice('一時キャッシュのパージと運行データの再同期が完了しました');
        if (onRefreshAppState) onRefreshAppState();
        setTimeout(() => setActionNotice(null), 3500);
      }
    }
  };

  const handleSetEmergencyAlert = () => {
    if (!emergencyAlertText.trim()) return;
    try {
      localStorage.setItem(EMERGENCY_ALERT_KEY, emergencyAlertText.trim());
      setEmergencyAlertActive(true);
      systemLogger.warn(`緊急運行速報が発令されました: [${emergencyAlertText.trim()}]`, 'EmergencyAlert');
      setActionNotice('緊急運行速報を発令しました');
      setTimeout(() => setActionNotice(null), 3000);
    } catch (e: any) {
      systemLogger.error(`速報発令エラー: ${e.message}`, 'EmergencyAlert');
    }
  };

  const handleClearEmergencyAlert = () => {
    try {
      localStorage.removeItem(EMERGENCY_ALERT_KEY);
      setEmergencyAlertActive(false);
      setEmergencyAlertText('');
      systemLogger.info('緊急運行速報が解除されました', 'EmergencyAlert');
      setActionNotice('緊急運行速報を解除しました');
      setTimeout(() => setActionNotice(null), 3000);
    } catch {
      // Ignore
    }
  };

  const handleClearLogs = () => {
    if (confirm('システムログをすべて消去しますか？')) {
      systemLogger.clearLogs();
    }
  };

  const handleCopyLogs = () => {
    const text = JSON.stringify(logs, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    });
  };

  // Storage Inspect
  const handleInspectKey = (key: string) => {
    setSelectedStorageKey(key);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        setStorageDataView('(空データ)');
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        setStorageDataView(JSON.stringify(parsed, null, 2));
      } catch {
        setStorageDataView(raw);
      }
    } catch {
      setStorageDataView('(読み込みエラー)');
    }
  };

  const handleDeleteStorageKey = (key: string) => {
    if (confirm(`LocalStorageキー [${key}] を削除しますか？`)) {
      try {
        localStorage.removeItem(key);
        setMetrics(systemLogger.getMetrics());
        setSelectedStorageKey(null);
        setStorageDataView(null);
        systemLogger.info(`ストレージキー [${key}] を削除しました`, 'StorageInspector');
      } catch (e: any) {
        systemLogger.error(`ストレージ削除失敗: ${e.message}`, 'StorageInspector');
      }
    }
  };

  // Execute full storage clear after explicit confirmation
  const executeClearAllStorage = () => {
    try {
      localStorage.clear();
      setMetrics(systemLogger.getMetrics());
      setSelectedStorageKey(null);
      setStorageDataView(null);
      systemLogger.warn('管理者によりLocalStorage全初期化が実行されました', 'StorageInspector');
      if (onRefreshAppState) onRefreshAppState();
      setActionNotice('LocalStorageの全データを初期化しました');
      setTimeout(() => setActionNotice(null), 3500);
    } catch (e: any) {
      systemLogger.error(`ストレージ初期化エラー: ${e.message}`, 'StorageInspector');
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (logFilter !== 'all' && log.level !== logFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.source.toLowerCase().includes(q) ||
        (log.details && log.details.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const errorCount = logs.filter((l) => l.level === 'error' || l.level === 'critical').length;
  const warnCount = logs.filter((l) => l.level === 'warn').length;

  return (
    <div
      id="admin-console-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity"
    >
      <div
        id="admin-console-modal-card"
        className="bg-[#1A1D24] border border-[#2D3342] rounded-2xl w-full max-w-xl h-[620px] max-h-[92vh] flex flex-col shadow-2xl text-slate-200 overflow-hidden relative"
      >
        {/* Header - Calm Slate Header */}
        <div className="px-4 py-3 bg-[#212631] border-b border-[#2D3342] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#31394B] flex items-center justify-center text-slate-300">
              {isAuthenticated ? <Terminal className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-slate-100">
                  システム管理・緊急対策コンソール
                </span>
                <span className="px-1.5 py-0.2 bg-[#2D3342] text-slate-300 text-[10px] font-mono rounded">
                  v3.8.1
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {isAuthenticated ? '神埼鉄道 運行指令・システム診断' : '認証が必要です'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isAuthenticated && (
              <button
                onClick={() => {
                  setIsAuthenticated(false);
                  setPinInput('');
                  setPinError(false);
                }}
                className="px-2 py-1 bg-[#2D3342] hover:bg-[#384052] text-slate-300 hover:text-white rounded text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                title="ログアウト"
              >
                <Lock className="w-3 h-3" />
                <span>ロック</span>
              </button>
            )}
            <button
              onClick={handleClose}
              className="w-6 h-6 rounded-md bg-[#2D3342] hover:bg-[#384052] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="閉じる"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Notice Bar */}
        {actionNotice && (
          <div className="px-3 py-1.5 bg-indigo-950/40 border-b border-indigo-800/40 text-indigo-200 text-[11px] flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Modal Body */}
        {!isAuthenticated ? (
          /* ========================================================
             1. Passcode Authentication Screen (Fixed-Height Zero-Jumping Layout)
             ======================================================== */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3.5 min-h-0 select-none">
            <div className="w-12 h-12 rounded-2xl bg-[#252B38] border border-[#333B4C] flex items-center justify-center text-indigo-400 shadow-inner">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-100">管理者パスコードを入力</h3>
              <p className="text-[11px] text-slate-400">
                運行システム診断・運行指令ツールを開きます
              </p>
            </div>

            {/* PIN Indicator Dots */}
            <div className="flex items-center justify-center gap-3 py-1">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                    pinInput.length > index
                      ? 'bg-amber-400 scale-110 shadow-xs shadow-amber-400/40'
                      : 'bg-[#2D3342] border border-[#3D4558]'
                  }`}
                />
              ))}
            </div>

            {/* Fixed Height Slot: Prevents layout stretching when wrong PIN is entered */}
            <div className="h-5 flex items-center justify-center">
              <p
                className={`text-[11px] text-rose-400 font-medium flex items-center gap-1 transition-opacity duration-150 ${
                  pinError ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>パスコードが正しくありません</span>
              </p>
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 w-56 max-w-full">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    if (k === 'C') handleKeypadClear();
                    else if (k === '⌫') handleKeypadBackspace();
                    else handleKeypadPress(k);
                  }}
                  className={`h-11 rounded-xl font-mono text-sm font-medium transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
                    k === 'C' || k === '⌫'
                      ? 'bg-[#212631] text-slate-400 hover:bg-[#2B3240] hover:text-slate-200 text-xs font-sans'
                      : 'bg-[#252B38] hover:bg-[#2F3647] text-slate-200 border border-[#333B4C] hover:border-slate-500 shadow-xs'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ========================================================
             2. Authenticated Admin Dashboard (Fixed Tab Frame)
             ======================================================== */
          <div className="flex flex-col flex-1 overflow-hidden min-h-0">
            {/* Sub Nav Tabs */}
            <div className="px-3 bg-[#212631] border-b border-[#2D3342] flex gap-1 overflow-x-auto shrink-0 scrollbar-none">
              <button
                onClick={() => setActiveTab('disruption')}
                className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 border-b-2 ${
                  activeTab === 'disruption'
                    ? 'text-slate-100 border-amber-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>運行指令・遅延</span>
                {Object.keys(activeDisruptionsMap).length > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9px] font-mono font-medium">
                    {Object.keys(activeDisruptionsMap).length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('metrics')}
                className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 border-b-2 ${
                  activeTab === 'metrics'
                    ? 'text-slate-100 border-indigo-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>概要・診断</span>
              </button>

              <button
                onClick={() => setActiveTab('emergency')}
                className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 border-b-2 ${
                  activeTab === 'emergency'
                    ? 'text-slate-100 border-indigo-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>緊急対策</span>
                {emergencyAlertActive && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('errors')}
                className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 border-b-2 ${
                  activeTab === 'errors'
                    ? 'text-slate-100 border-indigo-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                <Bug className="w-3.5 h-3.5" />
                <span>エラーログ</span>
                {errorCount > 0 ? (
                  <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded text-[9px] font-mono font-medium">
                    {errorCount}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-mono">
                    0
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('storage')}
                className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 border-b-2 ${
                  activeTab === 'storage'
                    ? 'text-slate-100 border-indigo-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>ストレージ</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 border-b-2 ${
                  activeTab === 'settings'
                    ? 'text-slate-100 border-indigo-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>PIN設定</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-3.5 overflow-y-auto flex-1 space-y-3 text-xs">
              {/* ========================================================
                  TAB 0: 運行指令・遅延設定 (Disruption Dispatcher)
                  ======================================================== */}
              {activeTab === 'disruption' && (() => {
                const currentLineDef = DEFAULT_LINE_INFOS.find((l) => l.id === selectedLineId) || DEFAULT_LINE_INFOS[0];
                const generatedPreview = generateDisruptionText(
                  currentLineDef.name,
                  disruptionStatusType,
                  maxDelayMinutes,
                  section,
                  reason,
                  durationUntil
                );
                const activeDisruptionCount = Object.keys(activeDisruptionsMap).length;

                return (
                  <div className="space-y-3">
                    {/* Disruption Header Banner */}
                    <div className="p-2.5 rounded-xl bg-[#212631] border border-[#2D3342] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          activeDisruptionCount > 0
                            ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        }`}>
                          <Radio className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                            <span>運行指令・遅延管理システム</span>
                            {activeDisruptionCount > 0 ? (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                                {activeDisruptionCount}路線で支障発令中
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">
                                全線 平常運転中
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            路線・遅延・区間・理由を設定し、ホーム運行カード・走行位置・発車標と即時連動
                          </p>
                        </div>
                      </div>

                      {activeDisruptionCount > 0 && (
                        <button
                          onClick={handleClearAllDisruptions}
                          className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                          title="すべての路線の運行支障を一括で解除します"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>全線平常復帰</span>
                        </button>
                      )}
                    </div>

                    {/* Step 1: Target Line Selection */}
                    <div className="p-3 bg-[#212631] rounded-xl border border-[#2D3342] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center font-bold">1</span>
                          <span>対象路線を選択</span>
                        </label>
                        {activeDisruptionsMap[selectedLineId] && (
                          <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span>発令中</span>
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {DEFAULT_LINE_INFOS.map((line) => {
                          const isSelected = selectedLineId === line.id;
                          const hasDisruption = !!activeDisruptionsMap[line.id];
                          return (
                            <button
                              key={line.id}
                              onClick={() => loadLineConfig(line.id)}
                              className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                                isSelected
                                  ? 'bg-[#2A303F] border-amber-400/80 text-white shadow-sm ring-1 ring-amber-400/40'
                                  : 'bg-[#1A1D24] border-[#2D3342] text-slate-300 hover:bg-[#232834]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className="w-5 h-5 rounded text-[10px] font-mono font-black text-white flex items-center justify-center shadow-2xs"
                                  style={{ backgroundColor: line.color }}
                                >
                                  {line.code}
                                </span>
                                {hasDisruption && (
                                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="支障発生中" />
                                )}
                              </div>
                              <div className="mt-1.5">
                                <span className="font-bold text-[11px] block truncate">{line.name}</span>
                                <span className="text-[9px] text-slate-400 block truncate">
                                  {hasDisruption ? '⚠️ 運行支障あり' : '平常運転'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step 2: Disruption Type & Max Delay */}
                    <div className="p-3 bg-[#212631] rounded-xl border border-[#2D3342] space-y-2.5">
                      <label className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center font-bold">2</span>
                        <span>運行状況・遅延規模の設定</span>
                      </label>

                      {/* Status Type Segmented Buttons */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {[
                          { type: 'delay', label: '列車遅延', desc: '1〜最大X分遅れ', color: 'border-amber-500 bg-amber-500/10 text-amber-300' },
                          { type: 'suspended', label: '運転見合わせ', desc: '全線で運転停止', color: 'border-rose-500 bg-rose-500/15 text-rose-300' },
                          { type: 'partially_suspended', label: '一部区間運休', desc: '特定区間運休', color: 'border-orange-500 bg-orange-500/15 text-orange-300' },
                          { type: 'normal', label: '平常運転', desc: '通常ダイヤ運行', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-300' },
                        ].map((item) => (
                          <button
                            key={item.type}
                            onClick={() => setDisruptionStatusType(item.type as DisruptionStatusType)}
                            className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                              disruptionStatusType === item.type
                                ? `${item.color} font-bold shadow-2xs`
                                : 'bg-[#1A1D24] border-[#2D3342] text-slate-400 hover:text-slate-200 hover:bg-[#232834]'
                            }`}
                          >
                            <div className="text-[11px] font-bold">{item.label}</div>
                            <div className="text-[9px] opacity-80">{item.desc}</div>
                          </button>
                        ))}
                      </div>

                      {/* Max Delay Minutes (When delay or partially suspended) */}
                      {(disruptionStatusType === 'delay' || disruptionStatusType === 'partially_suspended') && (
                        <div className="pt-2 border-t border-[#2D3342] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                              <Clock3 className="w-3.5 h-3.5 text-amber-400" />
                              <span>最大遅延時間:</span>
                              <strong className="text-amber-400 font-mono text-sm ml-1">
                                最大 約{maxDelayMinutes}分遅れ
                              </strong>
                            </span>
                            <span className="text-[10px] text-slate-400">
                              (各列車に 1〜{maxDelayMinutes}分の遅れを自動乱数配分)
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={1}
                              max={120}
                              step={1}
                              value={maxDelayMinutes}
                              onChange={(e) => setMaxDelayMinutes(Number(e.target.value))}
                              className="flex-1 accent-amber-400 cursor-pointer h-1.5 bg-[#1A1D24] rounded-lg"
                            />
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={1}
                                max={180}
                                value={maxDelayMinutes}
                                onChange={(e) => setMaxDelayMinutes(Math.max(1, Number(e.target.value) || 1))}
                                className="w-14 px-2 py-1 bg-[#1A1D24] border border-[#2D3342] rounded text-slate-100 font-mono text-center text-xs focus:outline-none focus:border-amber-400"
                              />
                              <span className="text-[11px] text-slate-400">分</span>
                            </div>
                          </div>

                          {/* Quick Presets */}
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-[10px] text-slate-500 mr-1">クイック設定:</span>
                            {[5, 10, 15, 20, 30, 45, 60].map((mins) => (
                              <button
                                key={mins}
                                onClick={() => setMaxDelayMinutes(mins)}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                                  maxDelayMinutes === mins
                                    ? 'bg-amber-500 text-slate-950 font-bold'
                                    : 'bg-[#1A1D24] text-slate-400 hover:text-slate-200 border border-[#2D3342]'
                                }`}
                              >
                                {mins}分
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Step 3: Section & Reason & Duration */}
                    {disruptionStatusType !== 'normal' && (
                      <div className="p-3 bg-[#212631] rounded-xl border border-[#2D3342] space-y-2.5">
                        <label className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center font-bold">3</span>
                          <span>影響区間・理由・いつまで（見込み時間）</span>
                        </label>

                        {/* Section Selection */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>影響区間 (何駅から何駅間)</span>
                          </span>
                          <input
                            type="text"
                            value={section}
                            onChange={(e) => setSection(e.target.value)}
                            placeholder="例: 全線、上り線のみ、大宮 〜 横浜 間"
                            className="w-full px-2.5 py-1.5 bg-[#1A1D24] border border-[#2D3342] rounded-lg text-slate-100 text-xs focus:outline-none focus:border-amber-400"
                          />
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {['全線', '上り線のみ', '下り線のみ', ...(COMMON_SECTIONS[selectedLineId] || [])].map((sec) => (
                              <button
                                key={sec}
                                onClick={() => setSection(sec)}
                                className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                                  section === sec
                                    ? 'bg-[#374151] text-amber-300 border border-amber-400/40 font-medium'
                                    : 'bg-[#1A1D24] text-slate-400 hover:text-slate-200 border border-[#2D3342]'
                                }`}
                              >
                                {sec}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Reason Selection */}
                        <div className="space-y-1 pt-1 border-t border-[#2D3342]">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-slate-400" />
                            <span>発生理由</span>
                          </span>
                          <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="例: 車両点検のため、人身事故のため"
                            className="w-full px-2.5 py-1.5 bg-[#1A1D24] border border-[#2D3342] rounded-lg text-slate-100 text-xs focus:outline-none focus:border-amber-400"
                          />
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {COMMON_REASONS.map((r) => (
                              <button
                                key={r}
                                onClick={() => setReason(r)}
                                className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                                  reason === r
                                    ? 'bg-[#374151] text-amber-300 border border-amber-400/40 font-medium'
                                    : 'bg-[#1A1D24] text-slate-400 hover:text-slate-200 border border-[#2D3342]'
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Duration / Until */}
                        <div className="space-y-1 pt-1 border-t border-[#2D3342]">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock3 className="w-3 h-3 text-slate-400" />
                            <span>いつまで（復旧見込み時間・時間設定）</span>
                          </span>
                          <input
                            type="text"
                            value={durationUntil}
                            onChange={(e) => setDurationUntil(e.target.value)}
                            placeholder="例: 18:30頃まで、1時間後、終日、復旧見込み立たず"
                            className="w-full px-2.5 py-1.5 bg-[#1A1D24] border border-[#2D3342] rounded-lg text-slate-100 text-xs focus:outline-none focus:border-amber-400"
                          />
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {['設定なし', '15分後', '30分後', '1時間後', '18:30頃まで', '終日', '復旧見込み立たず'].map((dur) => (
                              <button
                                key={dur}
                                onClick={() => setDurationUntil(dur === '設定なし' ? '' : dur)}
                                className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                                  (dur === '設定なし' && !durationUntil) || durationUntil === dur
                                    ? 'bg-[#374151] text-amber-300 border border-amber-400/40 font-medium'
                                    : 'bg-[#1A1D24] text-slate-400 hover:text-slate-200 border border-[#2D3342]'
                                }`}
                              >
                                {dur}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Official Announcement Text Output & Customization */}
                    {disruptionStatusType !== 'normal' && (
                      <div className="p-3 bg-[#212631] rounded-xl border border-[#2D3342] space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center font-bold">4</span>
                            <span>公式アナウンス文言（自動生成 & 自由編集）</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              if (!useCustomMessage) {
                                setCustomMessage(generatedPreview);
                              }
                              setUseCustomMessage(!useCustomMessage);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer border ${
                              useCustomMessage
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
                                : 'bg-[#1A1D24] text-slate-400 hover:text-slate-200 border-[#2D3342]'
                            }`}
                          >
                            {useCustomMessage ? '✏️ 自由入力モード中' : '🔄 自動生成モード中 (切替)'}
                          </button>
                        </div>

                        {useCustomMessage ? (
                          <div className="space-y-1">
                            <textarea
                              rows={3}
                              value={customMessage}
                              onChange={(e) => setCustomMessage(e.target.value)}
                              placeholder="独自の遅延・運休アナウンス文言を入力してください"
                              className="w-full p-2 bg-[#1A1D24] border border-[#2D3342] rounded-lg text-slate-100 text-xs focus:outline-none focus:border-amber-400 resize-none font-sans leading-relaxed"
                            />
                            <p className="text-[10px] text-indigo-300 flex items-center gap-1">
                              <span>💡 自分で考えた文言をそのまま運行情報カードに掲示します。</span>
                            </p>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-[#171922] rounded-lg border border-[#2B303C] space-y-1">
                            <span className="text-[10px] text-slate-400 block font-mono">
                              自動生成プレビュー:
                            </span>
                            <p className="text-slate-200 text-xs leading-relaxed font-sans select-all">
                              {generatedPreview}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 5: System Delay Linkage Switch */}
                    <div className="p-3 bg-[#212631] rounded-xl border border-[#2D3342] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center font-bold">5</span>
                          <span>システム連動設定（走行位置・発車案内）</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => setLinkToSystem(!linkToSystem)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                            linkToSystem ? 'bg-amber-500' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              linkToSystem ? 'translate-x-4.5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="p-2 bg-[#1A1D24] rounded-lg border border-[#2D3342] space-y-1 text-[11px] text-slate-300">
                        <div className="flex items-center gap-1.5 font-medium">
                          {linkToSystem ? (
                            <span className="text-amber-400 flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5" />
                              <span>システム完全連動: ON</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>文言表示のみ (システム遅延連動: OFF)</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          {linkToSystem
                            ? 'ホーム画面の運行情報カード、リアルタイム列車走行位置（1〜最大値の乱数遅延）、発車標に遅延/運休を即時連動します。'
                            : '運行情報カードへのアナウンス文言掲示のみ行い、走行位置の乱数遅延や発車標の遅延表記は行いません。'}
                        </p>
                      </div>
                    </div>

                    {/* Step 6: Dispatch & Reset Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      {disruptionStatusType === 'normal' ? (
                        <button
                          onClick={() => handleClearLineDisruption()}
                          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                        >
                          <Check className="w-4 h-4" />
                          <span>{currentLineDef.name} を平常運転に設定・反映</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleDispatchDisruption}
                          className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                        >
                          <Zap className="w-4 h-4 fill-slate-950" />
                          <span>【運行指令発令】{currentLineDef.name} に反映する</span>
                        </button>
                      )}

                      {activeDisruptionsMap[selectedLineId] && disruptionStatusType !== 'normal' && (
                        <button
                          onClick={() => handleClearLineDisruption()}
                          className="py-2.5 px-3 bg-[#2D3342] hover:bg-[#384052] text-slate-300 rounded-xl font-medium text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>この路線の支障を解除</span>
                        </button>
                      )}
                    </div>

                    {/* Active Disruptions Card List */}
                    <div className="pt-2 border-t border-[#2D3342] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-300">
                          現在発令中の運行支障一覧
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {activeDisruptionCount}件 発令中
                        </span>
                      </div>

                      {activeDisruptionCount === 0 ? (
                        <div className="p-3 bg-[#1A1D24] rounded-lg border border-[#2D3342] text-center text-slate-400 text-xs">
                          現在発令中の遅延・運休指令はありません（全線平常運行）
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {(Object.values(activeDisruptionsMap) as LineDisruption[]).map((dis: LineDisruption) => (
                            <div
                              key={dis.lineId}
                              className="p-2.5 bg-[#1F232E] rounded-lg border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-100 text-xs">
                                    {dis.lineName}
                                  </span>
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    dis.statusType === 'suspended'
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                      : dis.statusType === 'partially_suspended'
                                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  }`}>
                                    {dis.statusType === 'suspended'
                                      ? '運転見合わせ'
                                      : dis.statusType === 'partially_suspended'
                                      ? '一部運休'
                                      : `遅延(最大${dis.maxDelayMinutes}分)`}
                                  </span>
                                  {dis.linkToSystem && (
                                    <span className="px-1 py-0.2 bg-indigo-500/20 text-indigo-300 text-[9px] rounded font-mono">
                                      システム連動中
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    更新: {dis.updatedAt}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                                  {dis.customMessage || dis.reason}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => loadLineConfig(dis.lineId)}
                                  className="px-2 py-1 bg-[#2D3342] hover:bg-[#384052] text-slate-200 rounded text-[10px] transition-colors cursor-pointer"
                                >
                                  編集
                                </button>
                                <button
                                  onClick={() => handleClearLineDisruption(dis.lineId)}
                                  className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded text-[10px] transition-colors cursor-pointer"
                                >
                                  解除
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ========================================================
                  TAB 1: Metrics & System Health
                  ======================================================== */}
              {activeTab === 'metrics' && metrics && (
                <div className="space-y-3">
                  {/* Status Banner */}
                  <div className="p-2.5 rounded-xl bg-[#212631] border border-[#2D3342] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                          <span>運行管理システム正常稼働</span>
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        </div>
                        <p className="text-[10px] text-slate-400">
                          全4路線・発車標・停車駅・時刻表 同期完了
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setMetrics(systemLogger.getMetrics())}
                      className="px-2 py-1 bg-[#2D3342] hover:bg-[#384052] text-slate-300 rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>更新</span>
                    </button>
                  </div>

                  {/* Environment Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="p-2 bg-[#212631] rounded-lg border border-[#2D3342] space-y-0.5">
                      <span className="text-[10px] text-slate-400 block">バージョン</span>
                      <span className="font-mono text-slate-200 text-xs font-semibold">
                        {metrics.appVersion}
                      </span>
                    </div>

                    <div className="p-2 bg-[#212631] rounded-lg border border-[#2D3342] space-y-0.5">
                      <span className="text-[10px] text-slate-400 block">動作モード</span>
                      <span className="font-mono text-slate-200 text-xs">{metrics.environment}</span>
                    </div>

                    <div className="p-2 bg-[#212631] rounded-lg border border-[#2D3342] space-y-0.5">
                      <span className="text-[10px] text-slate-400 block">端末</span>
                      <span className="text-slate-200 text-xs flex items-center gap-1">
                        <span>{metrics.deviceType}</span>
                        {metrics.isStandalone && (
                          <span className="px-1 py-0.1 bg-indigo-500/20 text-indigo-300 text-[9px] rounded">
                            PWA
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="p-2 bg-[#212631] rounded-lg border border-[#2D3342] space-y-0.5">
                      <span className="text-[10px] text-slate-400 block">画面解像度</span>
                      <span className="font-mono text-slate-200 text-xs">
                        {metrics.screenWidth}×{metrics.screenHeight} ({metrics.pixelRatio}x)
                      </span>
                    </div>

                    <div className="p-2 bg-[#212631] rounded-lg border border-[#2D3342] space-y-0.5">
                      <span className="text-[10px] text-slate-400 block">接続状態</span>
                      <span
                        className={`text-xs font-medium ${
                          metrics.onlineStatus ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {metrics.onlineStatus ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    <div className="p-2 bg-[#212631] rounded-lg border border-[#2D3342] space-y-0.5">
                      <span className="text-[10px] text-slate-400 block">通知権限</span>
                      <span
                        className={`text-xs font-mono ${
                          metrics.notificationPermission === 'granted'
                            ? 'text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {metrics.notificationPermission}
                      </span>
                    </div>
                  </div>

                  {/* Route Status Summary */}
                  <div className="p-2.5 bg-[#212631] rounded-xl border border-[#2D3342] space-y-1.5">
                    <div className="font-semibold text-slate-200 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>路線停車駅・運行定義</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">整合性確認済</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <div className="p-1.5 bg-[#1A1D24] rounded border border-[#2D3342] flex justify-between items-center">
                        <span className="text-slate-400">神埼線 (Y)</span>
                        <span className="text-slate-200 font-mono">20駅</span>
                      </div>
                      <div className="p-1.5 bg-[#1A1D24] rounded border border-[#2D3342] flex justify-between items-center">
                        <span className="text-slate-400">神埼高速線 (NI)</span>
                        <span className="text-slate-200 font-mono">6駅</span>
                      </div>
                      <div className="p-1.5 bg-[#1A1D24] rounded border border-[#2D3342] flex justify-between items-center">
                        <span className="text-slate-400">埼千環状線 (SC)</span>
                        <span className="text-slate-200 font-mono">12駅</span>
                      </div>
                      <div className="p-1.5 bg-[#1A1D24] rounded border border-[#2D3342] flex justify-between items-center">
                        <span className="text-slate-400">土浦線 (TC)</span>
                        <span className="text-slate-200 font-mono">22駅 (大甕設定済)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================
                  TAB 2: Emergency Response & Recovery Tools
                  ======================================================== */}
              {activeTab === 'emergency' && (
                <div className="space-y-3">
                  {/* Emergency Quick Actions Card */}
                  <div className="p-3 bg-[#212631] rounded-xl border border-[#2D3342] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                        <span>全系統 整合性監査 (Integrity Audit)</span>
                      </div>
                      <button
                        onClick={handleRunAudit}
                        disabled={isAuditing}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isAuditing ? 'animate-spin' : ''}`} />
                        <span>{isAuditing ? '監査中...' : '監査を実行'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      全4路線の駅マスタ、停車駅パターン、土浦線大甕駅の停車フラグ、ストレージ整合性を一括自動監査します。
                    </p>

                    {auditResult && (
                      <div className="p-2 bg-[#1A1D24] border border-[#2D3342] rounded-lg space-y-1 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">監査判定:</span>
                          <span
                            className={`font-semibold font-mono ${
                              auditResult.status === 'passed' ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {auditResult.status === 'passed' ? '✓ 正常 (PASSED)' : '⚠ 警告あり'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">チェック駅数 / 路線:</span>
                          <span className="text-slate-200 font-mono">
                            {auditResult.totalStationsChecked}駅 / {auditResult.linesChecked}路線
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">監査時刻:</span>
                          <span className="text-slate-400 font-mono">{auditResult.timestamp}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cache & Recovery Card */}
                  <div className="p-3 bg-[#212631] rounded-xl border border-[#2D3342] space-y-2.5">
                    <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>緊急時データ再同期・一時キャッシュパージ</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      ダイヤ乱れや表示不整合が発生した際、ユーザーの会員情報やN-POINT残高を保持したまま、運行データ・時刻表キャッシュのみを安全に最新状態へ再構成します。
                    </p>
                    <button
                      onClick={handleEmergencyResync}
                      className="w-full py-2 bg-[#252B38] hover:bg-[#2F3647] border border-[#333B4C] text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>運行データ再同期を実行</span>
                    </button>
                  </div>

                  {/* Emergency Broadcast Banner Override */}
                  <div className="p-3 bg-[#212631] rounded-xl border border-[#2D3342] space-y-2.5">
                    <div className="font-semibold text-slate-200 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-rose-400" />
                        <span>緊急運行速報 手動発令 / 解除</span>
                      </span>
                      {emergencyAlertActive && (
                        <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded text-[9px] font-medium">
                          発令中
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      大雨・強風・人身事故等の緊急時に、アプリ全体に即時配信する緊急速報メッセージを設定します。
                    </p>

                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="例: 強風のため全線で運転を見合わせております"
                        value={emergencyAlertText}
                        onChange={(e) => setEmergencyAlertText(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#1A1D24] border border-[#2D3342] rounded-lg text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-slate-400"
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={handleSetEmergencyAlert}
                          disabled={!emergencyAlertText.trim()}
                          className="flex-1 py-1.5 bg-rose-600/80 hover:bg-rose-600 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>速報を発令</span>
                        </button>

                        {emergencyAlertActive && (
                          <button
                            onClick={handleClearEmergencyAlert}
                            className="px-3 py-1.5 bg-[#252B38] hover:bg-[#2F3647] border border-[#333B4C] text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
                          >
                            解除
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================
                  TAB 3: Error Logger & Live Event Stream
                  ======================================================== */}
              {activeTab === 'errors' && (
                <div className="space-y-2.5">
                  {/* Controls Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 bg-[#212631] rounded-lg border border-[#2D3342]">
                    {/* Filters */}
                    <div className="flex items-center gap-1">
                      {(['all', 'error', 'warn', 'info'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => setLogFilter(lvl)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                            logFilter === lvl
                              ? 'bg-slate-200 text-slate-900 font-semibold'
                              : 'bg-[#1A1D24] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {lvl === 'all'
                            ? `すべて (${logs.length})`
                            : lvl === 'error'
                            ? `エラー (${errorCount})`
                            : lvl === 'warn'
                            ? `警告 (${warnCount})`
                            : '情報'}
                        </button>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleCopyLogs}
                        className="px-2 py-0.5 bg-[#2D3342] hover:bg-slate-700 text-slate-300 rounded text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                        title="ログをコピー"
                      >
                        {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedText ? '完了' : 'コピー'}</span>
                      </button>

                      <button
                        onClick={handleClearLogs}
                        className="px-2 py-0.5 bg-[#2D3342] hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 rounded text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                        title="ログを消去"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>消去</span>
                      </button>
                    </div>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      placeholder="ログをキーワードで検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-[#212631] border border-[#2D3342] rounded-lg text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-slate-400"
                    />
                  </div>

                  {/* Logs List */}
                  <div className="space-y-1.5 max-h-80 overflow-y-auto pr-0.5">
                    {filteredLogs.length === 0 ? (
                      <div className="p-6 text-center bg-[#212631] rounded-xl border border-[#2D3342] space-y-1">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                        <p className="font-medium text-slate-200 text-xs">現在エラーログはありません</p>
                        <p className="text-[10px] text-slate-400">
                          エラーは検知されておらず、すべての運行・表示処理は正常に稼働しています。
                        </p>
                      </div>
                    ) : (
                      filteredLogs.map((log) => {
                        const isExpanded = expandedLogId === log.id;
                        const isError = log.level === 'error' || log.level === 'critical';
                        const isWarn = log.level === 'warn';

                        return (
                          <div
                            key={log.id}
                            className="p-2 rounded-lg bg-[#212631] border border-[#2D3342] transition-colors"
                          >
                            <div
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="flex items-start justify-between gap-2 cursor-pointer"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`px-1.5 py-0.1 rounded text-[9px] font-mono font-medium uppercase ${
                                      isError
                                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20'
                                        : isWarn
                                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                                        : 'bg-slate-700 text-slate-300'
                                    }`}
                                  >
                                    {log.level}
                                  </span>
                                  <span className="px-1 py-0.1 bg-[#1A1D24] text-slate-400 rounded text-[9px] font-mono">
                                    {log.source}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {log.timestamp}
                                  </span>
                                </div>
                                <p className="text-xs font-mono text-slate-200 break-all leading-relaxed">
                                  {log.message}
                                </p>
                              </div>

                              <button className="text-slate-500 hover:text-slate-300 p-0.5 shrink-0">
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                            </div>

                            {/* Expanded Details / Stack */}
                            {isExpanded && (log.details || log.stack) && (
                              <div className="mt-2 pt-1.5 border-t border-[#2D3342] space-y-1 text-[10px] font-mono bg-[#1A1D24] p-2 rounded">
                                {log.details && (
                                  <div>
                                    <span className="text-slate-500 block">詳細:</span>
                                    <pre className="text-slate-300 whitespace-pre-wrap break-all">{log.details}</pre>
                                  </div>
                                )}
                                {log.stack && (
                                  <div>
                                    <span className="text-slate-500 block">スタック:</span>
                                    <pre className="text-rose-300/80 whitespace-pre-wrap break-all max-h-36 overflow-y-auto">
                                      {log.stack}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================
                  TAB 4: Raw LocalStorage Inspector & Safe Clearing
                  ======================================================== */}
              {activeTab === 'storage' && metrics && (
                <div className="space-y-2.5">
                  <div className="p-2.5 bg-[#212631] rounded-xl border border-[#2D3342] flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200 text-xs">LocalStorage 使用状況</div>
                      <p className="text-[10px] text-slate-400">
                        合計 {metrics.storageKeysCount} キー / 約 {metrics.storageUsageKb} KB
                      </p>
                    </div>

                    <button
                      onClick={() => setShowClearStorageConfirm(true)}
                      className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>全初期化</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Keys List */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block font-medium">キー一覧</span>
                      <div className="space-y-1 h-72 overflow-y-auto pr-1">
                        {metrics.storageKeys.length === 0 ? (
                          <p className="text-slate-500 p-2 bg-[#212631] rounded text-[11px]">キーが存在しません</p>
                        ) : (
                          metrics.storageKeys.map((key) => (
                            <button
                              key={key}
                              onClick={() => handleInspectKey(key)}
                              className={`w-full p-2 text-left rounded-lg font-mono text-[11px] flex items-center justify-between transition-colors cursor-pointer border ${
                                selectedStorageKey === key
                                  ? 'bg-[#31394B] text-slate-100 font-medium border-slate-500 shadow-xs'
                                  : 'bg-[#212631] hover:bg-[#282F3E] text-slate-300 border-[#2D3342]'
                              }`}
                            >
                              <span className="truncate">{key}</span>
                              <ChevronRight className="w-3 h-3 shrink-0 text-slate-400" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Data Viewer */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {selectedStorageKey ? `内容: ${selectedStorageKey}` : 'キーを選択'}
                        </span>
                        {selectedStorageKey && (
                          <button
                            onClick={() => handleDeleteStorageKey(selectedStorageKey)}
                            className="text-rose-400 hover:text-rose-300 text-[10px] flex items-center gap-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>削除</span>
                          </button>
                        )}
                      </div>

                      <div className="p-2.5 bg-[#171922] border border-[#2D3342] rounded-lg h-72 overflow-y-auto font-mono text-[10px] text-emerald-400">
                        {storageDataView ? (
                          <pre className="whitespace-pre-wrap break-all">{storageDataView}</pre>
                        ) : (
                          <p className="text-slate-500">キーを選択すると内容が表示されます</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================
                  TAB 5: Admin Security Settings
                  ======================================================== */}
              {activeTab === 'settings' && (
                <div className="space-y-3">
                  <div className="p-3 bg-[#212631] rounded-xl border border-[#2D3342] space-y-2.5">
                    <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                      <span>管理者パスコード変更</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      4桁の数字で新しい管理者パスコードを設定できます。変更後は旧パスコードや初期パスコードでは解錠できなくなります。
                    </p>

                    <form onSubmit={handleChangePin} className="space-y-2 pt-0.5">
                      <div className="flex gap-2">
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="新PIN"
                          value={newPinInput}
                          onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                          className="w-28 px-2.5 py-1.5 bg-[#1A1D24] border border-[#2D3342] rounded-lg text-slate-100 font-mono text-center text-xs tracking-widest focus:outline-none focus:border-slate-400"
                        />
                        <button
                          type="submit"
                          disabled={newPinInput.length !== 4}
                          className="px-3 py-1.5 bg-[#31394B] hover:bg-[#3C465C] disabled:opacity-40 text-slate-100 text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          変更
                        </button>
                      </div>

                      {pinChangeSuccess && (
                        <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>パスコードを更新しました（旧PINは無効化されました）</span>
                        </p>
                      )}
                    </form>

                    <div className="pt-2 border-t border-[#2D3342] flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">パスコード初期化</span>
                      <button
                        onClick={handleResetPin}
                        className="px-2 py-1 bg-[#1A1D24] hover:bg-[#282F3E] text-slate-400 hover:text-slate-200 rounded text-[10px] transition-colors cursor-pointer"
                      >
                        初期値にリセット
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            3. Strict Storage Clear Confirmation Dialog
            ======================================================== */}
        {showClearStorageConfirm && (
          <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#1F232D] border border-rose-500/40 rounded-2xl max-w-sm w-full p-4 space-y-3 shadow-2xl text-slate-200">
              <div className="flex items-center gap-2.5 text-rose-400">
                <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-100">本当に全データを削除しますか？</h4>
                  <span className="text-[10px] text-rose-300 font-mono">警告: 復元不可</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-[#161820] p-2.5 rounded-lg border border-[#2D3342]">
                この操作を実行すると、<strong>N-POINT残高、会員ランク、乗車履歴、保存したお気に入り、カスタム設定</strong>を含むLocalStorage上のすべての端末データが完全に削除され、アプリが初期状態に戻ります。
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowClearStorageConfirm(false)}
                  className="flex-1 py-2 bg-[#2D3342] hover:bg-[#384052] text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => {
                    setShowClearStorageConfirm(false);
                    executeClearAllStorage();
                  }}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-md"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>完全に削除する</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
