import React from 'react';
import { X, Award, CreditCard, Sparkles } from 'lucide-react';
import { PointHistoryItem } from '../types';

interface NPointModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  pointHistory?: PointHistoryItem[];
}

export const NPointModal: React.FC<NPointModalProps> = ({
  isOpen,
  onClose,
  balance,
  pointHistory = [],
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white text-[#221C35] w-full max-w-lg rounded-3xl border border-[#E6E2EE] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#F9F8FD] p-4 border-b border-[#E6E2EE] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#5B21B6] font-extrabold uppercase tracking-wider">神埼鉄道グループ</div>
              <h3 className="text-base font-black text-[#221C35]">N-POINT デジタル会員証</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#EFE8FA] text-[#6B6380] hover:text-[#221C35] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Card Visual - Matte Lavender Charcoal Premium Card */}
          <div className="bg-gradient-to-br from-[#272233] via-[#211C2B] to-[#181421] text-white rounded-2xl p-5 border border-white/10 shadow-lg relative overflow-hidden">
            {/* Header / Brand & Gold Member Tag */}
            <div className="flex justify-between items-center relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center border border-white/10">
                  <CreditCard className="w-3.5 h-3.5 text-[#E2D5B7]" />
                </div>
                <span className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                  NIIZAKI Card
                </span>
              </div>
              <span className="text-[10px] tracking-widest font-mono font-semibold text-[#E2D5B7] bg-[#E2D5B7]/10 px-2.5 py-0.5 rounded-full border border-[#E2D5B7]/25">
                GOLD MEMBER
              </span>
            </div>

            {/* Main Focus: Clean White Barcode Card Container */}
            <div className="my-5 text-center bg-white p-4 rounded-xl shadow-inner relative z-10">
              {/* Simulated Crisp Barcode */}
              <div className="h-14 w-full bg-white flex items-center justify-center gap-1 font-mono text-[10px] text-slate-900 tracking-widest select-none overflow-hidden p-1">
                <div className="w-1.5 h-12 bg-slate-950" />
                <div className="w-3 h-12 bg-slate-950" />
                <div className="w-1 h-12 bg-slate-950" />
                <div className="w-2 h-12 bg-slate-950" />
                <div className="w-1 h-12 bg-slate-950" />
                <div className="w-3.5 h-12 bg-slate-950" />
                <div className="w-1.5 h-12 bg-slate-950" />
                <div className="w-1 h-12 bg-slate-950" />
                <div className="w-3 h-12 bg-slate-950" />
                <div className="w-1.5 h-12 bg-slate-950" />
                <div className="w-2.5 h-12 bg-slate-950" />
                <div className="w-1 h-12 bg-slate-950" />
                <div className="w-3 h-12 bg-slate-950" />
                <div className="w-1.5 h-12 bg-slate-950" />
                <div className="w-2 h-12 bg-slate-950" />
                <div className="w-1 h-12 bg-slate-950" />
                <div className="w-3.5 h-12 bg-slate-950" />
                <div className="w-1.5 h-12 bg-slate-950" />
              </div>
              <div className="text-xs font-mono font-bold text-slate-800 mt-2 tracking-widest">
                9920 1250 8831 4092
              </div>
            </div>

            {/* Card Footer Info */}
            <div className="flex justify-between items-end text-xs relative z-10">
              <div>
                <div className="text-[10px] text-slate-400 font-medium">N-POINT 保有残高</div>
                <div className="text-xl font-mono font-bold text-[#F5F2EB] mt-0.5">
                  {balance.toLocaleString()} <span className="text-xs text-slate-300 font-sans font-normal">pt</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[9px] text-slate-400 font-mono">神埼ID 連携済</div>
                <div className="text-[9px] text-slate-400 font-mono mt-0.5">有効期限: 2027.12</div>
              </div>
            </div>
          </div>

          {/* Point History & Benefits */}
          <div className="bg-[#F9F8FD] p-4 rounded-2xl border border-[#E6E2EE] space-y-3">
            <div className="font-extrabold text-[#221C35] flex justify-between items-center text-xs">
              <span>直近のポイント獲得・利用履歴</span>
              <span className="text-[10px] text-[#5B21B6] font-bold bg-[#EFE8FA] px-2 py-0.5 rounded">
                {pointHistory.length > 0 ? `${pointHistory.length}件` : '履歴なし'}
              </span>
            </div>

            {pointHistory.length === 0 ? (
              <div className="p-4 rounded-xl bg-white border border-[#E6E2EE] text-center text-[#6B6380]">
                <Sparkles className="w-5 h-5 mx-auto mb-1.5 text-purple-300" />
                <p className="font-medium text-xs">直近のポイント獲得履歴はありません</p>
                <p className="text-[10px] text-gray-400 mt-0.5">特急予約やスタンプラリー達成でポイントが加算されます</p>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {pointHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-3 rounded-xl bg-white border border-[#E6E2EE]"
                  >
                    <div>
                      <div className="font-bold text-[#221C35]">{item.title}</div>
                      <div className="text-[10px] text-[#6B6380]">{item.date}</div>
                    </div>
                    <span className="font-mono font-black text-emerald-600 text-sm">
                      +{item.points.toLocaleString()} pt
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

