import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Clock,
  Train,
  ArrowRight,
  Filter,
  Info,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Sparkles,
  Search,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  TSUCHIURA_STATION_TIMETABLES,
  TIMETABLE_AVAILABLE_STATIONS,
  TRAIN_TYPE_LEGEND,
  TrainTypeCode,
  StationTimetableConfig,
  TimetableEntry,
} from '../data/tsuchiuraStationTimetableData';

interface StationTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStationName?: string;
  initialDirection?: 1 | 2;
}

export const StationTimetableModal: React.FC<StationTimetableModalProps> = ({
  isOpen,
  onClose,
  initialStationName = '松戸',
  initialDirection = 1,
}) => {
  // 選択駅
  const [selectedStationName, setSelectedStationName] = useState<string>(() => {
    const match = TIMETABLE_AVAILABLE_STATIONS.find(
      (s) => initialStationName.includes(s.name) || s.name.includes(initialStationName)
    );
    return match ? match.name : '松戸';
  });

  // 選択方面 (1: 下り日立方面, 2: 上り松戸方面)
  const [selectedDirection, setSelectedDirection] = useState<1 | 2>(initialDirection);

  // 種別フィルター (null = すべて)
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<TrainTypeCode | 'ALL'>('ALL');

  // 選択された列車詳細モーダル/アコーディオン
  const [selectedTrainDetail, setSelectedTrainDetail] = useState<{
    entry: TimetableEntry;
    hour: number;
    stationName: string;
    directionLabel: string;
  } | null>(null);

  // 凡例パネルの展開状態
  const [showLegend, setShowLegend] = useState<boolean>(false);

  // 現在時刻の時間帯
  const [currentHour, setCurrentHour] = useState<number>(() => new Date().getHours());
  const [currentMinute, setCurrentMinute] = useState<number>(() => new Date().getMinutes());

  const currentHourRowRef = useRef<HTMLDivElement | null>(null);

  // 時間更新タイマー
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentHour(now.getHours());
      setCurrentMinute(now.getMinutes());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // initialStationName が変更された場合の同期
  useEffect(() => {
    if (initialStationName) {
      const match = TIMETABLE_AVAILABLE_STATIONS.find(
        (s) => initialStationName.includes(s.name) || s.name.includes(initialStationName)
      );
      if (match) {
        setSelectedStationName(match.name);
      }
    }
  }, [initialStationName]);

  // 駅データ取得
  const stationConfig: StationTimetableConfig =
    TSUCHIURA_STATION_TIMETABLES[selectedStationName] || TSUCHIURA_STATION_TIMETABLES['松戸'];

  // 利用可能な方面 (松戸は下りのみ、日立は上りのみ)
  const availableDirections = useMemo(() => {
    const dirs: { direction: 1 | 2; label: string; platformName: string }[] = [];
    if (stationConfig.down) {
      dirs.push({
        direction: 1,
        label: '下り（日立方面）',
        platformName: stationConfig.platforms[1]?.label || '1番線',
      });
    }
    if (stationConfig.up) {
      dirs.push({
        direction: 2,
        label: '上り（松戸方面）',
        platformName: stationConfig.platforms[2]?.label || '2番線',
      });
    }
    return dirs;
  }, [stationConfig]);

  // 選択中方面が現在の駅に存在しない場合は自動補正
  useEffect(() => {
    if (availableDirections.length > 0) {
      const hasCurrent = availableDirections.some((d) => d.direction === selectedDirection);
      if (!hasCurrent) {
        setSelectedDirection(availableDirections[0].direction);
      }
    }
  }, [availableDirections, selectedDirection]);

  // 現在の方面の時刻表データ
  const currentTimetable = useMemo(() => {
    return selectedDirection === 1 ? stationConfig.down : stationConfig.up;
  }, [stationConfig, selectedDirection]);

  // フィルタリング後の時間割
  const filteredHours = useMemo(() => {
    if (!currentTimetable) return [];
    return currentTimetable.hours.map((h) => {
      let trains = h.trains;
      if (selectedTypeFilter !== 'ALL') {
        trains = trains.filter((t) => t.typeCode === selectedTypeFilter);
      }
      return {
        hour: h.hour,
        trains,
        totalInHour: h.trains.length,
      };
    });
  }, [currentTimetable, selectedTypeFilter]);

  // 次に発車する直近3本の列車
  const nextTrains = useMemo(() => {
    if (!currentTimetable) return [];
    const upcoming: { hour: number; entry: TimetableEntry; diffMinutes: number }[] = [];
    const nowTotalMin = currentHour * 60 + currentMinute;

    for (const h of currentTimetable.hours) {
      for (const t of h.trains) {
        const trainTotalMin = h.hour * 60 + t.minute;
        if (trainTotalMin >= nowTotalMin) {
          upcoming.push({
            hour: h.hour,
            entry: t,
            diffMinutes: trainTotalMin - nowTotalMin,
          });
        }
      }
    }
    upcoming.sort((a, b) => a.diffMinutes - b.diffMinutes);
    return upcoming.slice(0, 3);
  }, [currentTimetable, currentHour, currentMinute]);

  // 現在時刻の時間帯へスムーズスクロール
  const scrollToCurrentHour = () => {
    if (currentHourRowRef.current) {
      currentHourRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 font-sans">
        {/* Header Bar */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#5B21B6] flex items-center justify-center text-white shadow-md shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-slate-100">
                  神埼鉄道 土浦線 駅時刻表
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                  公式平日・休日ダイヤ
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                松戸・柏・土浦・茨城空港・日立（標準5駅対応）
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Station Tabs Selector */}
        <div className="bg-slate-900/95 px-3 py-2 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {TIMETABLE_AVAILABLE_STATIONS.map((st) => {
              const isSelected = selectedStationName === st.name;
              return (
                <button
                  key={st.id}
                  onClick={() => {
                    setSelectedStationName(st.name);
                    setSelectedTrainDetail(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-[#5B21B6] text-white shadow-md'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700 border border-slate-700/60'
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-80">{st.code}</span>
                  <span>{st.name}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-normal ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {st.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Direction & Filter Sub-Bar */}
        <div className="bg-slate-950/60 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Direction Selector */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
            {availableDirections.map((dir) => {
              const isSelected = selectedDirection === dir.direction;
              return (
                <button
                  key={dir.direction}
                  onClick={() => {
                    setSelectedDirection(dir.direction);
                    setSelectedTrainDetail(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{dir.label}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({dir.platformName})</span>
                </button>
              );
            })}
          </div>

          {/* Quick Actions: Current Hour Jump & Legend Toggle */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={scrollToCurrentHour}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-medium transition-all border border-slate-700 flex items-center gap-1 cursor-pointer"
              title="現在の時間帯へスクロール"
            >
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>現在時刻 ({currentHour}時)</span>
            </button>
            <button
              onClick={() => setShowLegend(!showLegend)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all border flex items-center gap-1 cursor-pointer ${
                showLegend
                  ? 'bg-purple-900/40 border-purple-600 text-purple-200'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>凡例 {showLegend ? '▲' : '▼'}</span>
            </button>
          </div>
        </div>

        {/* Legend Explanations (Collapsible) */}
        {showLegend && (
          <div className="bg-slate-950 p-3.5 border-b border-slate-800 text-xs space-y-2.5 animate-fade-in shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 text-xs">列車種別・記号の凡例</span>
              <span className="text-[10px] text-slate-500">※数字のみの無印は「各停」です</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.values(TRAIN_TYPE_LEGEND).map((leg) => (
                <div
                  key={leg.code}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${leg.badgeBg} ${leg.badgeText} ${leg.badgeBorder}`}
                    >
                      {leg.code === 'LOCAL' ? '無印' : leg.code}
                    </span>
                    <span className="font-bold text-slate-200 text-xs">{leg.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {leg.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Type Filter Chips */}
        <div className="bg-slate-900/90 px-3 py-1.5 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-xs">
          <span className="text-[11px] text-slate-500 font-medium shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3" /> 種別絞込:
          </span>
          <button
            onClick={() => setSelectedTypeFilter('ALL')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
              selectedTypeFilter === 'ALL'
                ? 'bg-slate-200 text-slate-900'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            すべて
          </button>
          {Object.values(TRAIN_TYPE_LEGEND).map((leg) => {
            const isSelected = selectedTypeFilter === leg.code;
            return (
              <button
                key={leg.code}
                onClick={() => setSelectedTypeFilter(leg.code)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer shrink-0 border ${
                  isSelected
                    ? `${leg.badgeBg} ${leg.badgeText} ${leg.badgeBorder} ring-1 ring-white/20`
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {leg.name}
              </button>
            );
          })}
        </div>

        {/* Next Trains Banner */}
        {nextTrains.length > 0 && (
          <div className="bg-gradient-to-r from-[#5B21B6]/20 via-slate-900 to-slate-900 px-4 py-2 border-b border-purple-900/40 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-1.5 py-0.5 bg-purple-600 text-white font-mono text-[9px] font-bold rounded">
                NEXT
              </span>
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar text-xs">
                {nextTrains.map((item, idx) => {
                  const leg = TRAIN_TYPE_LEGEND[item.entry.typeCode];
                  return (
                    <button
                      key={idx}
                      onClick={() =>
                        setSelectedTrainDetail({
                          entry: item.entry,
                          hour: item.hour,
                          stationName: selectedStationName,
                          directionLabel: currentTimetable?.directionLabel || '',
                        })
                      }
                      className="flex items-center gap-1.5 hover:bg-white/10 px-1.5 py-0.5 rounded transition-all cursor-pointer shrink-0"
                    >
                      <span className="font-mono font-bold text-slate-200">
                        {String(item.hour).padStart(2, '0')}:{String(item.entry.minute).padStart(2, '0')}
                      </span>
                      <span
                        className={`text-[10px] px-1 py-0.2 rounded font-bold border ${leg.badgeBg} ${leg.badgeText} ${leg.badgeBorder}`}
                      >
                        {leg.shortLabel}
                      </span>
                      <span className="text-[11px] text-slate-300">
                        {item.entry.destination}行
                      </span>
                      <span className="text-[10px] text-purple-300 font-mono">
                        (あと{item.diffMinutes}分)
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-mono shrink-0 hidden sm:inline">
              1日 {currentTimetable?.totalDailyTrains}本運行
            </span>
          </div>
        )}

        {/* Selected Train Detail Modal Box (Tap on minute) */}
        {selectedTrainDetail && (
          <div className="bg-slate-950 p-3.5 border-b border-purple-800/80 animate-fade-in shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-base font-bold text-white">
                    {String(selectedTrainDetail.hour).padStart(2, '0')}:
                    {String(selectedTrainDetail.entry.minute).padStart(2, '0')} 発
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold border ${
                      TRAIN_TYPE_LEGEND[selectedTrainDetail.entry.typeCode].badgeBg
                    } ${TRAIN_TYPE_LEGEND[selectedTrainDetail.entry.typeCode].badgeText} ${
                      TRAIN_TYPE_LEGEND[selectedTrainDetail.entry.typeCode].badgeBorder
                    }`}
                  >
                    {selectedTrainDetail.entry.typeName}
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    {selectedTrainDetail.entry.destination} 行き
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {selectedTrainDetail.entry.carCount}両編成
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {TRAIN_TYPE_LEGEND[selectedTrainDetail.entry.typeCode].stopsDescription}
                </p>
              </div>
              <button
                onClick={() => setSelectedTrainDetail(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Timetable Table Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5 bg-slate-900/50">
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/80 shadow-inner">
            {filteredHours.map((h) => {
              const isCurrentHour = h.hour === currentHour;
              return (
                <div
                  key={h.hour}
                  ref={isCurrentHour ? currentHourRowRef : null}
                  className={`flex items-stretch border-b border-slate-800/80 last:border-b-0 transition-colors ${
                    isCurrentHour ? 'bg-purple-950/30' : 'hover:bg-slate-900/50'
                  }`}
                >
                  {/* Hour Column */}
                  <div
                    className={`w-14 sm:w-16 flex flex-col items-center justify-center p-2 border-r border-slate-800/80 shrink-0 select-none ${
                      isCurrentHour
                        ? 'bg-[#5B21B6]/30 text-purple-300 font-black'
                        : 'bg-slate-900/80 text-slate-300 font-bold'
                    }`}
                  >
                    <span className="font-mono text-base sm:text-lg">{h.hour}</span>
                    <span className="text-[9px] text-slate-500 font-normal">
                      {h.totalInHour}本
                    </span>
                    {isCurrentHour && (
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1 animate-pulse" />
                    )}
                  </div>

                  {/* Minutes Row */}
                  <div className="flex-1 p-2 sm:p-2.5 flex flex-wrap items-center gap-1.5 sm:gap-2 content-start">
                    {h.trains.length === 0 ? (
                      <span className="text-xs text-slate-600 italic">運行列車なし</span>
                    ) : (
                      h.trains.map((train, tIdx) => {
                        const leg = TRAIN_TYPE_LEGEND[train.typeCode];
                        const isPast =
                          isCurrentHour && train.minute < currentMinute;
                        const isNextImmediate =
                          isCurrentHour &&
                          train.minute >= currentMinute &&
                          h.trains.find((tr) => tr.minute >= currentMinute)?.minute === train.minute;

                        return (
                          <button
                            key={tIdx}
                            onClick={() =>
                              setSelectedTrainDetail({
                                entry: train,
                                hour: h.hour,
                                stationName: selectedStationName,
                                directionLabel: currentTimetable?.directionLabel || '',
                              })
                            }
                            className={`group relative px-1.5 py-1 rounded-lg transition-all text-left flex items-baseline gap-0.5 cursor-pointer border ${
                              isNextImmediate
                                ? 'bg-purple-900/60 border-purple-500 shadow-md ring-1 ring-purple-400'
                                : isPast
                                ? 'bg-slate-900/40 border-slate-800/60 opacity-40 hover:opacity-100'
                                : 'bg-slate-900/90 border-slate-800 hover:border-slate-600 hover:bg-slate-800'
                            }`}
                            title={`${h.hour}:${String(train.minute).padStart(2, '0')} ${train.typeName} ${train.destination}行`}
                          >
                            <span className="font-mono text-xs sm:text-sm font-bold text-slate-100">
                              {String(train.minute).padStart(2, '0')}
                            </span>
                            {train.typeCode !== 'LOCAL' && (
                              <span
                                className={`text-[9px] font-black px-1 rounded ${leg.badgeBg} ${leg.badgeText} border ${leg.badgeBorder} scale-90 -ml-0.5`}
                              >
                                {train.typeCode}
                              </span>
                            )}
                            {train.destination !== (selectedDirection === 1 ? '日立' : '松戸') && (
                              <span className="text-[8px] text-amber-300 font-normal">
                                {train.destination.slice(0, 2)}
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notes Bottom Card */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>時刻表ご利用にあたって</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-400">
              <li>M: 特急めぐり (全車指定席・特急券が必要) / T: 特別快速 / K: 快速 / S: 区間快速 / C: 通勤特快</li>
              <li>無印（記号なし）は各駅停車です。</li>
              <li>特別快速(T)および通勤特快(C)は茨城空港止まりです。</li>
              <li>運行トラブル等が発生した際は、リアルタイム運行情報・遅延情報をご確認ください。</li>
            </ul>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="bg-slate-950 px-4 py-2.5 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-400 text-[11px]">
            {stationConfig.stationName}駅（{stationConfig.stationCode}）
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
