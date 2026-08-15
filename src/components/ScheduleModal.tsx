import React, { useState } from 'react';
import { X, Clock, Moon, Zap, Calendar, ArrowRight } from 'lucide-react';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface LineScheduleInfo {
  code: string;
  name: string;
  fullName: string;
  color: string;
  badgeBg: string;
  firstTrain: string;
  firstTrainStation: string;
  lastTrain: string;
  lastTrainStation: string;
  frequency: string;
  lateNightNote: string;
  typeRatio: { type: string; ratio: string; style: string }[];
  features: string;
}

export const LINE_SCHEDULES: LineScheduleInfo[] = [
  {
    code: 'Y',
    name: '神埼線',
    fullName: '1. 神埼線 (Y) [大動脈・C字型]',
    color: '#8B5CF6',
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
    firstTrain: '4:30',
    firstTrainStation: '大宮',
    lastTrain: '0:15',
    lastTrainStation: '東京',
    frequency: '平均 4〜5分間隔 (毎時12〜15本)',
    lateNightNote: '終電は大宮止まり',
    typeRatio: [
      { type: '特急 (Nライナー)', ratio: '2本 (30分おき)', style: 'bg-amber-100 text-amber-900 border-amber-300' },
      { type: '急行', ratio: '4本 (15分おき)', style: 'bg-rose-100 text-rose-900 border-rose-300' },
      { type: '各停', ratio: '6〜9本 (約6〜10分おき)', style: 'bg-slate-100 text-slate-800 border-slate-300' },
    ],
    features: '東京、大宮、新横浜、横浜の4駅のみに絞った特急「Nライナー」が、過密な各停・急行の隙間を最優先で駆け抜けます。',
  },
  {
    code: 'NI',
    name: '神埼高速線',
    fullName: '2. 神埼高速線 (NI) [都市型バイパス]',
    color: '#3B82F6',
    badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
    firstTrain: '5:00',
    firstTrainStation: '東京',
    lastTrain: '0:30',
    lastTrainStation: '横浜',
    frequency: '平均 10分間隔 (毎時6本)',
    lateNightNote: '終電は東京・横浜止まり',
    typeRatio: [
      { type: '急行', ratio: '2本 (30分おき)', style: 'bg-rose-100 text-rose-900 border-rose-300' },
      { type: '快速', ratio: '2本 (30分おき)', style: 'bg-sky-100 text-sky-900 border-sky-300' },
      { type: '各停', ratio: '2本 (30分おき)', style: 'bg-slate-100 text-slate-800 border-slate-300' },
    ],
    features: '急行が新橋、大井町、平和島を通過するバイパス型高速ダイヤ。東京〜横浜間を最速で結びます。',
  },
  {
    code: 'SC',
    name: '埼千環状線',
    fullName: '3. 埼千環状線 (SC) [メガサークル]',
    color: '#EC4899',
    badgeBg: 'bg-pink-100 text-pink-900 border-pink-300',
    firstTrain: '4:50',
    firstTrainStation: '大宮',
    lastTrain: '0:10',
    lastTrainStation: '新宿',
    frequency: '平均 10分間隔 (毎時6本)',
    lateNightNote: '終電は大宮止まり',
    typeRatio: [
      { type: '特急', ratio: '1本 (60分おき)', style: 'bg-amber-100 text-amber-900 border-amber-300' },
      { type: '急行', ratio: '2本 (30分おき)', style: 'bg-rose-100 text-rose-900 border-rose-300' },
      { type: '各停', ratio: '3本 (20分おき)', style: 'bg-slate-100 text-slate-800 border-slate-300' },
    ],
    features: '10分ヘッドの等間隔運転。時刻表を見ずに乗れるリズムで通勤・通学アクセスを最適化。',
  },
  {
    code: 'TC',
    name: '土浦線',
    fullName: '4. 土浦線 (TC) [広域グランドライン]',
    color: '#10B981',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    firstTrain: '4:40',
    firstTrainStation: '日立',
    lastTrain: '0:00',
    lastTrainStation: '松戸',
    frequency: '平均 10〜12分間隔 (毎時5〜6本)',
    lateNightNote: '終点は鹿島旭止まり',
    typeRatio: [
      { type: '特急めぐり', ratio: '1本 (60分おき)', style: 'bg-purple-100 text-purple-900 border-purple-300' },
      { type: '特別快速 / 通勤特快', ratio: '1本 (60分おき)', style: 'bg-amber-100 text-amber-900 border-amber-300' },
      { type: '快速 / 区間快速', ratio: '2本 (30分おき)', style: 'bg-sky-100 text-sky-900 border-sky-300' },
      { type: '各停', ratio: '1〜2本', style: 'bg-slate-100 text-slate-800 border-slate-300' },
    ],
    features: '特急「めぐり」は松戸〜日立間を最速81分（表定速度100km/h）で走破。土浦駅等で鮮やかに追い抜きます。',
  },
];

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'detail'>('summary');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-[#E6E2EE] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#5B21B6] to-[#4C1D95] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Clock className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">神埼鉄道 予測ダイヤまとめ表</h3>
              <p className="text-xs text-purple-200 mt-0.5">全4路線 初電・終電＆運行頻度ガイド</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub Navigation */}
        <div className="flex border-b border-[#E6E2EE] bg-[#F9F8FD] shrink-0">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'summary'
                ? 'border-[#5B21B6] text-[#5B21B6] bg-white'
                : 'border-transparent text-[#6B6380] hover:text-[#221C35]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>初終電・深夜ダイヤ一覧</span>
          </button>
          <button
            onClick={() => setActiveTab('detail')}
            className={`flex-1 py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'detail'
                ? 'border-[#5B21B6] text-[#5B21B6] bg-white'
                : 'border-transparent text-[#6B6380] hover:text-[#221C35]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>路線別 1時間あたりの種別割合</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto space-y-4 text-[#221C35]">
          {activeTab === 'summary' ? (
            <div className="space-y-3">
              {/* Modern Table Component */}
              <div className="overflow-x-auto rounded-xl border border-[#E6E2EE] shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#EFE8FA] text-[#4C1D95] font-bold border-b border-[#DFD5F0]">
                      <th className="p-2.5 whitespace-nowrap">路線</th>
                      <th className="p-2.5 whitespace-nowrap">初電 (始発駅発)</th>
                      <th className="p-2.5 whitespace-nowrap">終電 (主要発)</th>
                      <th className="p-2.5">深夜の特殊運用</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EEF6] bg-white">
                    {LINE_SCHEDULES.map((line) => (
                      <tr key={line.code} className="hover:bg-[#F9F8FD]">
                        <td className="p-2.5 font-bold whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${line.badgeBg}`}>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: line.color }} />
                            {line.name} ({line.code})
                          </span>
                        </td>
                        <td className="p-2.5 font-mono whitespace-nowrap">
                          <span className="font-extrabold text-[#221C35]">{line.firstTrain}</span>
                          <span className="text-[10px] text-[#6B6380] ml-1">({line.firstTrainStation}発)</span>
                        </td>
                        <td className="p-2.5 font-mono whitespace-nowrap">
                          <span className="font-extrabold text-rose-700">{line.lastTrain}</span>
                          <span className="text-[10px] text-[#6B6380] ml-1">({line.lastTrainStation}発)</span>
                        </td>
                        <td className="p-2.5 text-[11px] text-[#475569] font-medium">
                          <div className="flex items-center gap-1">
                            <Moon className="w-3 h-3 text-purple-600 shrink-0" />
                            <span>{line.lateNightNote}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Line Detail Cards */}
              <div className="space-y-2.5 pt-1">
                <h4 className="text-xs font-bold text-[#6B6380] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#5B21B6]" />
                  路線別の高頻度運行・ダイヤ特徴
                </h4>
                {LINE_SCHEDULES.map((line) => (
                  <div key={line.code} className="p-3 rounded-xl bg-[#F9F8FD] border border-[#E6E2EE] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: line.color }} />
                        <span className="font-bold text-xs text-[#221C35]">{line.fullName}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-[#5B21B6] border border-purple-200 rounded-md font-mono">
                        {line.frequency}
                      </span>
                    </div>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      {line.features}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[#6B6380]">
                神埼鉄道グループ中央指令所は「2分間隔のダイヤをミリ単位で制御」し、都市部の高密度輸送を実現しています。
              </p>
              {LINE_SCHEDULES.map((line) => (
                <div key={line.code} className="p-3.5 rounded-xl bg-white border border-[#E6E2EE] shadow-2xs space-y-2">
                  <div className="flex items-center justify-between border-b border-[#F0EEF6] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: line.color }} />
                      <span className="font-bold text-sm text-[#221C35]">{line.name}</span>
                    </div>
                    <span className="text-xs font-bold text-[#5B21B6] bg-[#EFE8FA] px-2.5 py-0.5 rounded-md">
                      {line.frequency}
                    </span>
                  </div>

                  {/* Train Type ratio pills */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-[#857D99]">1時間あたりの種別構成</div>
                    <div className="flex flex-wrap gap-1.5">
                      {line.typeRatio.map((tr, idx) => (
                        <div key={idx} className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${tr.style}`}>
                          <span className="font-bold">{tr.type}</span>
                          <span className="text-[11px] opacity-80 font-mono">({tr.ratio})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#F4F3F8] border-t border-[#E6E2EE] flex items-center justify-between text-xs text-[#6B6380] shrink-0">
          <div className="flex items-center gap-1 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>神埼鉄道中央指令所 リアルタイムダイヤ管理中</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#5B21B6] text-white font-bold hover:bg-[#4C1D95] transition-colors cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
