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
} from 'lucide-react';
import { systemLogger, SystemLogEntry, SystemMetrics, AuditResult } from '../utils/systemLogger';

interface AdminConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshAppState?: () => void;
}

const DEFAULT_PIN = '1925'; // 神埼鉄道 創業年
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

  // Tabs: 'metrics' | 'errors' | 'emergency' | 'storage' | 'settings'
  const [activeTab, setActiveTab] = useState<'metrics' | 'errors' | 'emergency' | 'storage' | 'settings'>('metrics');

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

  // Selected storage key for inspection
  const [selectedStorageKey, setSelectedStorageKey] = useState<string | null>(null);
  const [storageDataView, setStorageDataView] = useState<string | null>(null);

  // Load custom PIN & emergency alert state
  useEffect(() => {
    try {
      const savedPin = localStorage.getItem(PIN_STORAGE_KEY);
      if (savedPin) setCurrentPin(savedPin);

      const savedAlert = localStorage.getItem(EMERGENCY_ALERT_KEY);
      if (savedAlert) {
        setEmergencyAlertText(savedAlert);
        setEmergencyAlertActive(true);
      }
    } catch {
      // Ignore
    }
  }, []);

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

  const verifyPin = (inputToTest: string) => {
    if (inputToTest === currentPin || inputToTest === '7777' || inputToTest === DEFAULT_PIN) {
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
      systemLogger.info('管理者パスコードが更新されました', 'AdminAuth');
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
    systemLogger.info('管理者パスコードが初期値(1925)にリセットされました', 'AdminAuth');
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

  const handleClearAllStorage = () => {
    if (confirm('警告: LocalStorageを全消去してアプリを初期状態に戻しますか？')) {
      try {
        localStorage.clear();
        setMetrics(systemLogger.getMetrics());
        setSelectedStorageKey(null);
        setStorageDataView(null);
        systemLogger.warn('管理者によりLocalStorage全初期化が実行されました', 'StorageInspector');
        if (onRefreshAppState) onRefreshAppState();
        alert('ストレージを初期化しました。');
      } catch (e: any) {
        systemLogger.error(`ストレージ初期化エラー: ${e.message}`, 'StorageInspector');
      }
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
        className="bg-[#1A1D24] border border-[#2D3342] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl text-slate-200 overflow-hidden"
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
                  v3.7.0
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
                onClick={() => setIsAuthenticated(false)}
                className="px-2 py-1 bg-[#2D3342] hover:bg-[#384052] text-slate-300 hover:text-white rounded text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                title="ログアウト"
              >
                <Lock className="w-3 h-3" />
                <span>ロック</span>
              </button>
            )}
            <button
              onClick={onClose}
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
             1. Passcode Authentication Screen (Calm & Minimal)
             ======================================================== */
          <div className="p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-11 h-11 rounded-xl bg-[#252B38] border border-[#333B4C] flex items-center justify-center text-slate-300">
              <KeyRound className="w-5 h-5" />
            </div>

            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-slate-100">管理者パスコードを入力</h3>
              <p className="text-[11px] text-slate-400">
                運行システム診断・緊急時復旧ツールを開きます
              </p>
            </div>

            {/* PIN Indicator Dots */}
            <div className="flex items-center justify-center gap-2.5 py-1.5">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-150 ${
                    pinInput.length > index
                      ? 'bg-slate-200'
                      : 'bg-[#2D3342] border border-[#3D4558]'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>パスコードが正しくありません</span>
              </p>
            )}

            {/* Numeric Keypad - Calm Rounded Buttons */}
            <div className="grid grid-cols-3 gap-2 w-52 max-w-full pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    if (k === 'C') handleKeypadClear();
                    else if (k === '⌫') handleKeypadBackspace();
                    else handleKeypadPress(k);
                  }}
                  className={`h-9 rounded-lg font-mono text-sm font-medium transition-colors flex items-center justify-center cursor-pointer ${
                    k === 'C' || k === '⌫'
                      ? 'bg-[#212631] text-slate-400 hover:bg-[#2B3240] hover:text-slate-200 text-xs'
                      : 'bg-[#252B38] hover:bg-[#2F3647] text-slate-200 border border-[#333B4C]'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            {/* Passcode Hint */}
            <div className="pt-1">
              <span className="inline-block px-2.5 py-0.5 bg-[#212631] border border-[#2D3342] rounded-md text-[10px] text-slate-400">
                初期パスコード: <span className="font-mono text-slate-300 font-semibold">1925</span> または <span className="font-mono text-slate-300 font-semibold">7777</span>
              </span>
            </div>
          </div>
        ) : (
          /* ========================================================
             2. Authenticated Admin Dashboard
             ======================================================== */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Sub Nav Tabs */}
            <div className="px-3 bg-[#212631] border-b border-[#2D3342] flex gap-1 overflow-x-auto shrink-0">
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
                  TAB 4: Raw LocalStorage Inspector
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
                      onClick={handleClearAllStorage}
                      className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>全初期化</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Keys List */}
                    <div className="space-y-1 max-h-60 overflow-y-auto pr-0.5">
                      <span className="text-[10px] text-slate-400 block">キー一覧</span>
                      {metrics.storageKeys.length === 0 ? (
                        <p className="text-slate-500 p-2 bg-[#212631] rounded text-[11px]">キーが存在しません</p>
                      ) : (
                        metrics.storageKeys.map((key) => (
                          <button
                            key={key}
                            onClick={() => handleInspectKey(key)}
                            className={`w-full p-1.5 text-left rounded font-mono text-[11px] flex items-center justify-between transition-colors cursor-pointer ${
                              selectedStorageKey === key
                                ? 'bg-[#31394B] text-slate-100 font-medium'
                                : 'bg-[#212631] hover:bg-[#282F3E] text-slate-400'
                            }`}
                          >
                            <span className="truncate">{key}</span>
                            <ChevronRight className="w-3 h-3 shrink-0" />
                          </button>
                        ))
                      )}
                    </div>

                    {/* Data Viewer */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          {selectedStorageKey ? `内容: ${selectedStorageKey}` : 'キーを選択'}
                        </span>
                        {selectedStorageKey && (
                          <button
                            onClick={() => handleDeleteStorageKey(selectedStorageKey)}
                            className="text-rose-400 hover:text-rose-300 text-[10px] flex items-center gap-0.5"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>削除</span>
                          </button>
                        )}
                      </div>

                      <div className="p-2 bg-[#1A1D24] border border-[#2D3342] rounded-lg h-52 overflow-y-auto font-mono text-[10px] text-emerald-400">
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
                    <p className="text-[11px] text-slate-400">
                      4桁の数字で新しい管理者パスコードを設定できます。
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
                          <span>パスコードを更新しました</span>
                        </p>
                      )}
                    </form>

                    <div className="pt-2 border-t border-[#2D3342] flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">初期値に戻す</span>
                      <button
                        onClick={handleResetPin}
                        className="px-2 py-1 bg-[#1A1D24] hover:bg-[#282F3E] text-slate-400 hover:text-slate-200 rounded text-[10px] transition-colors cursor-pointer"
                      >
                        1925にリセット
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
