// Disruption Dispatcher & Train Delay Manager for 神埼鉄道 NIIZAKI App
// Version 3.8.0

export type DisruptionStatusType = 'normal' | 'delay' | 'suspended' | 'partially_suspended';

export interface LineDisruption {
  lineId: string; // 'kanzaki' | 'kanzaki_kosoku' | 'saichi' | 'tsuchiura'
  lineName: string; // '神埼線' | '神埼高速線' | '埼千環状線' | '土浦線'
  code: string; // 'Y' | 'NI' | 'SC' | 'TC'
  statusType: DisruptionStatusType;
  maxDelayMinutes: number; // e.g. 15 (1〜15分の乱数遅延)
  durationUntil: string; // e.g. '18:30頃まで', '終日', '復旧見込み立たず'
  section: string; // e.g. '全線', '大宮〜横浜間', '松戸〜土浦間'
  reason: string; // e.g. '車両点検のため', '人身事故のため', '強風のため'
  customMessage: string;
  useCustomMessage: boolean;
  linkToSystem: boolean; // システム（走行位置・発車案内・運行カード）へ実際に遅延・運休を連動させるか
  updatedAt: string;
}

export interface DisruptionSummaryResponse {
  updatedAt: string;
  hasDelay: boolean;
  summary: string;
  lines: {
    id: string;
    lineName: string;
    code: string;
    status: string;
    statusType: DisruptionStatusType;
    delayMinutes: number;
    maxDelayMinutes: number;
    message: string;
    linkToSystem: boolean;
    section: string;
    reason: string;
    durationUntil: string;
  }[];
}

const STORAGE_KEY = 'nizaki_admin_disruptions';

export const DEFAULT_LINE_INFOS: { id: string; name: string; code: string; color: string }[] = [
  { id: 'kanzaki', name: '神埼線', code: 'Y', color: '#8B5CF6' },
  { id: 'kanzaki_kosoku', name: '神埼高速線', code: 'NI', color: '#3B82F6' },
  { id: 'saichi', name: '埼千環状線', code: 'SC', color: '#EC4899' },
  { id: 'tsuchiura', name: '土浦線', code: 'TC', color: '#10B981' },
];

export const LINE_STATIONS: Record<string, string[]> = {
  kanzaki: [
    '東京', '浅草', '北千住', '足立', '草加', '越谷レイクタウン', '七光台', '北春日部',
    '地下鉄岩槻', '蓮田', '丸山', '大宮', '朝霞台', '新座', 'ひばりヶ丘', '田無',
    '武蔵境', '中三鷹', '調布', '生田', '溝の口', '新横浜', '横浜'
  ],
  kanzaki_kosoku: [
    '東京', '新橋', '品川', '大井町', '平和島', '地下鉄蒲田', '川崎', '鶴見', '横浜'
  ],
  saichi: [
    '東京', '南千住', '北千住', '綾瀬', '松戸', '柏', '七光台', '春日部', '岩槻',
    '大宮公園', '大宮', 'さいたま新都心', '南浦和', '西青木', '川口', '志村坂上',
    '上板橋', '小竹向原', '池袋', '新宿'
  ],
  tsuchiura: [
    '松戸', '新松戸', '松が丘', '柏', '守谷', '谷井田', '森の里', '荒川沖', '土浦',
    '高浜', '茨城空港', '鹿島旭', '大洗', '那珂湊', '平磯', 'ひたちなか海浜公園',
    '久慈川', '大甕（おおみか）', '東大沼', '多賀', '会瀬（おうせ）', '日立'
  ],
};

export const getStationsForLine = (lineId: string): string[] => {
  if (lineId === 'saichi_loop' || lineId === 'saichi') return LINE_STATIONS.saichi || [];
  return LINE_STATIONS[lineId] || LINE_STATIONS.kanzaki || [];
};

export const COMMON_REASONS = [
  '車両点検のため',
  '人身事故のため',
  '強風のため',
  '大雨のため',
  '信号確認のため',
  '線路内立ち入りのため',
  '急病人救護のため',
  '混雑および安全確認のため',
  '飛来物挟み込みのため',
  '変電所設備点検のため',
];

export const COMMON_SECTIONS: Record<string, string[]> = {
  kanzaki: ['全線', '東京 〜 大宮 間', '大宮 〜 横浜 間', '北千住 〜 草加 間', '調布 〜 新横浜 間'],
  kanzaki_kosoku: ['全線', '東京 〜 品川 間', '品川 〜 横浜 間', '大井町 〜 川崎 間'],
  saichi: ['全線', '大宮 〜 池袋 間', '新宿 〜 東京 間', '北千住 〜 松戸 間', '松戸 〜 柏 間'],
  tsuchiura: ['全線', '松戸 〜 土浦 間', '土浦 〜 日立 間', '守谷 〜 荒川沖 間', '茨城空港 〜 日立 間'],
};

/**
 * 鉄道公式アナウンス形式の自動文言生成関数
 */
export function generateDisruptionText(
  lineName: string,
  statusType: DisruptionStatusType,
  maxDelayMinutes: number,
  section: string,
  reason: string,
  durationUntil: string
): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const cleanSection = section.trim() || '全線';
  const cleanReason = reason.trim() || '安全確認のため';
  const cleanUntil = durationUntil.trim();

  if (statusType === 'normal') {
    return '現在、全線でほぼ平常通り運転しております。';
  }

  if (statusType === 'suspended') {
    let msg = `${timeStr}現在、${lineName}は、${cleanSection}での${cleanReason}の影響により、全線で運転を見合わせております。`;
    if (cleanUntil) {
      msg += `（${cleanUntil}の運転再開を見込んでおります）`;
    }
    return msg;
  }

  if (statusType === 'partially_suspended') {
    let msg = `${timeStr}現在、${lineName}は、${cleanReason}の影響により、${cleanSection}で一部列車の運転を取り止めております。`;
    if (cleanUntil) {
      msg += `（${cleanUntil}まで継続見込み）`;
    }
    return msg;
  }

  // statusType === 'delay'
  const delayStr = maxDelayMinutes > 0 ? `最大約${maxDelayMinutes}分` : '一部';
  let msg = `${timeStr}現在、${lineName}は、${cleanSection}での${cleanReason}の影響により、上下線で${delayStr}の遅れが発生しております。`;
  if (cleanUntil) {
    msg += `（${cleanUntil}の平常運行再開を見込んでおります）`;
  }
  return msg;
}

let listeners: (() => void)[] = [];

function notifyListeners() {
  listeners.forEach((l) => {
    try {
      l();
    } catch (e) {
      console.warn('Listener error in disruptionManager', e);
    }
  });
}

export const disruptionManager = {
  /**
   * 全路線の現在設定されている運行支障情報を取得
   */
  getAllDisruptions: (): Record<string, LineDisruption> => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to parse disruption storage:', e);
    }
    return {};
  },

  /**
   * 指定路線の運行支障情報を取得
   */
  getLineDisruption: (lineId: string): LineDisruption | null => {
    const all = disruptionManager.getAllDisruptions();
    // Also support 'saichi_loop' alias for 'saichi'
    if (lineId === 'saichi_loop' && all['saichi']) return all['saichi'];
    if (lineId === 'saichi' && all['saichi_loop']) return all['saichi_loop'];
    return all[lineId] || null;
  },

  /**
   * 指定路線の運行支障情報を設定・更新
   */
  setLineDisruption: (disruption: LineDisruption): void => {
    const all = disruptionManager.getAllDisruptions();
    all[disruption.lineId] = {
      ...disruption,
      updatedAt: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to save disruption to storage:', e);
    }

    // サーバーにも非同期で通知（可能なら）
    try {
      fetch('/api/disruptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disruptions: all }),
      }).catch(() => {
        // Ignore server error in local mode
      });
    } catch {
      // Ignore
    }

    notifyListeners();
  },

  /**
   * 指定路線の運行支障を解除（平常運転に復帰）
   */
  clearLineDisruption: (lineId: string): void => {
    const all = disruptionManager.getAllDisruptions();
    delete all[lineId];
    if (lineId === 'saichi') delete all['saichi_loop'];
    if (lineId === 'saichi_loop') delete all['saichi'];

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to clear disruption in storage:', e);
    }

    try {
      fetch('/api/disruptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disruptions: all }),
      }).catch(() => {});
    } catch {}

    notifyListeners();
  },

  /**
   * 全路線の運行支障を一括解除
   */
  clearAllDisruptions: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}

    try {
      fetch('/api/disruptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disruptions: {} }),
      }).catch(() => {});
    } catch {}

    notifyListeners();
  },

  /**
   * 運行状態サマリー（StatusCard・ホーム画面向け）の生成
   */
  getStatusSummary: (): DisruptionSummaryResponse => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    const disruptions = disruptionManager.getAllDisruptions();

    let hasDelay = false;
    const delayedLineNames: string[] = [];

    const lines = DEFAULT_LINE_INFOS.map((def) => {
      const d = disruptions[def.id] || (def.id === 'saichi' ? disruptions['saichi_loop'] : null);

      if (d && d.statusType !== 'normal') {
        hasDelay = true;
        const msg = d.useCustomMessage && d.customMessage.trim()
          ? d.customMessage.trim()
          : generateDisruptionText(def.name, d.statusType, d.maxDelayMinutes, d.section, d.reason, d.durationUntil);

        let statusText = '平常運転';
        let delayMinutes = 0;

        if (d.statusType === 'suspended') {
          statusText = '運転見合わせ';
          delayedLineNames.push(`${def.name}(見合わせ)`);
        } else if (d.statusType === 'partially_suspended') {
          statusText = '一部運休';
          delayedLineNames.push(`${def.name}(一部運休)`);
        } else if (d.statusType === 'delay') {
          statusText = d.maxDelayMinutes > 0 ? `遅延 (最大約${d.maxDelayMinutes}分)` : '一部遅延';
          delayMinutes = d.maxDelayMinutes;
          delayedLineNames.push(`${def.name}(遅延)`);
        }

        return {
          id: def.id,
          lineName: def.name,
          code: def.code,
          status: statusText,
          statusType: d.statusType,
          delayMinutes,
          maxDelayMinutes: d.maxDelayMinutes,
          message: msg,
          linkToSystem: d.linkToSystem ?? true,
          section: d.section || '全線',
          reason: d.reason || '',
          durationUntil: d.durationUntil || '',
        };
      }

      // 平常運転
      return {
        id: def.id,
        lineName: def.name,
        code: def.code,
        status: '平常運転',
        statusType: 'normal' as DisruptionStatusType,
        delayMinutes: 0,
        maxDelayMinutes: 0,
        message: '現在、全線でほぼ平常通り運転しております。',
        linkToSystem: true,
        section: '全線',
        reason: '',
        durationUntil: '',
      };
    });

    let summary = '現在、神埼鉄道グループ全線でほぼ平常通り運転しております。';
    if (hasDelay) {
      summary = `【運行支障情報】${delayedLineNames.join('、')}が発生しております。`;
    }

    return {
      updatedAt: `${now.toLocaleDateString('ja-JP')} ${timeStr}`,
      hasDelay,
      summary,
      lines,
    };
  },

  /**
   * 列車ごとの実効遅延分数（1〜maxDelayMinutesの乱数）を算出
   * @param lineId 路線ID ('kanzaki', 'kanzaki_kosoku', 'saichi'/'saichi_loop', 'tsuchiura')
   * @param trainSeed 列車IDまたはタイムスタンプ等のシード
   * @returns delayMinutes (0なら平常、>0なら遅れ、-1なら運休)
   */
  getEffectiveDelayForTrain: (lineId: string, trainSeed: string | number = 'train_default'): { delayMinutes: number; isSuspended: boolean } => {
    const d = disruptionManager.getLineDisruption(lineId);
    if (!d || d.statusType === 'normal' || !d.linkToSystem) {
      return { delayMinutes: 0, isSuspended: false };
    }

    if (d.statusType === 'suspended') {
      return { delayMinutes: 0, isSuspended: true };
    }

    if (d.statusType === 'partially_suspended') {
      // 3本に1本程度を運休、他は小遅延
      const seedNum = typeof trainSeed === 'number' ? trainSeed : stringToSeed(String(trainSeed));
      const isSusp = seedNum % 3 === 0;
      return {
        delayMinutes: isSusp ? 0 : Math.min(d.maxDelayMinutes || 5, (seedNum % 5) + 1),
        isSuspended: isSusp,
      };
    }

    // statusType === 'delay'
    const max = Math.max(1, d.maxDelayMinutes || 1);
    const seedNum = typeof trainSeed === 'number' ? trainSeed : stringToSeed(String(trainSeed));
    // 1〜max の範囲で乱数遅延を決定論的に生成
    const generatedDelay = (seedNum % max) + 1;

    return { delayMinutes: generatedDelay, isSuspended: false };
  },

  /**
   * 変更通知リスナーの登録
   */
  subscribe: (listener: () => void): (() => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
};

function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}
