import React, { useState, useEffect } from 'react';
import { 
  Flag, 
  MapPin, 
  Coins, 
  Sparkles, 
  ChevronRight, 
  X, 
  Award, 
  Check, 
  RotateCcw, 
  Radio, 
  Landmark, 
  Building2, 
  ShoppingBag, 
  Bike, 
  GitMerge, 
  Rocket, 
  Trees, 
  Cookie, 
  Waves,
  QrCode,
  ShieldAlert,
  Info,
  Layers,
  MessageCircle,
  ExternalLink,
  Copy,
  Train,
  Navigation,
  Compass,
  CheckCircle2,
  AlertCircle,
  Ticket,
  KeyRound,
  Gift,
  Send,
  CheckCheck,
  Smartphone,
  HelpCircle,
  ArrowRight,
  Code2,
  FileCode2,
  Terminal
} from 'lucide-react';
import { 
  STAMP_COURSES, 
  RallyDifficulty, 
  StampCourse, 
  StampStation,
  AppliedCouponRecord,
  findCourseByCouponCode
} from '../data/stampRallyData';

interface EventsTabProps {
  onAddNPoints?: (points: number, title?: string, type?: 'stamp' | 'coupon') => void;
}

// ユーザーのスタンプ取得状態
interface StampRecord {
  stationId: string;
  courseId: RallyDifficulty;
  stampedAt: string;
}

export const EventsTab: React.FC<EventsTabProps> = ({ onAddNPoints }) => {
  // 参加状態 (LocalStorage永続化)
  const [joinedCourseId, setJoinedCourseId] = useState<RallyDifficulty | null>(() => {
    try {
      const saved = localStorage.getItem('kanzaki_stamp_joined_course');
      if (saved && (saved === 'beginner' || saved === 'intermediate' || saved === 'advanced')) {
        return saved as RallyDifficulty;
      }
    } catch (e) {}
    return null;
  });

  // 取得済みスタンプ一覧
  const [stampedList, setStampedList] = useState<StampRecord[]>(() => {
    try {
      const saved = localStorage.getItem('kanzaki_stamp_records');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return [];
  });

  // 制覇済みコースID一覧
  const [completedCourses, setCompletedCourses] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kanzaki_completed_courses');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return [];
  });

  // アプリで適用済みのLINEクーポンコード一覧
  const [appliedCoupons, setAppliedCoupons] = useState<AppliedCouponRecord[]>(() => {
    try {
      const saved = localStorage.getItem('kanzaki_applied_coupons');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return [];
  });

  // クーポンコード入力状態
  const [couponInput, setCouponInput] = useState<string>('');

  // 閲覧中コースタブ (参加後は選択中コースが初期値)
  const [viewingCourseId, setViewingCourseId] = useState<RallyDifficulty>('beginner');
  
  // GPS位置情報状態
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [checkingStationId, setCheckingStationId] = useState<string | null>(null);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);
  
  // GPS判定モーダル（300m圏外・エラー時）
  const [gpsVerificationModal, setGpsVerificationModal] = useState<{
    station: StampStation;
    courseId: RallyDifficulty;
    status: 'out_of_range' | 'error' | 'permission_denied';
    distanceKm?: number;
    message: string;
  } | null>(null);

  // モーダル・ダイアログ
  const [selectedStationDetail, setSelectedStationDetail] = useState<StampStation | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState<StampCourse | null>(null);
  const [showQuitConfirmModal, setShowQuitConfirmModal] = useState<boolean>(false);
  const [showLineFlowModal, setShowLineFlowModal] = useState<StampCourse | null>(null);
  const [showGasCodeModal, setShowGasCodeModal] = useState<boolean>(false);
  const [copiedGasCode, setCopiedGasCode] = useState<boolean>(false);
  const [appliedSuccessInfo, setAppliedSuccessInfo] = useState<{
    course: StampCourse;
    record: AppliedCouponRecord;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 状態保存
  useEffect(() => {
    try {
      if (joinedCourseId) {
        localStorage.setItem('kanzaki_stamp_joined_course', joinedCourseId);
      } else {
        localStorage.removeItem('kanzaki_stamp_joined_course');
      }
      localStorage.setItem('kanzaki_stamp_records', JSON.stringify(stampedList));
      localStorage.setItem('kanzaki_completed_courses', JSON.stringify(completedCourses));
      localStorage.setItem('kanzaki_applied_coupons', JSON.stringify(appliedCoupons));
    } catch (e) {}
  }, [joinedCourseId, stampedList, completedCourses, appliedCoupons]);

  useEffect(() => {
    if (joinedCourseId) {
      setViewingCourseId(joinedCourseId);
    }
  }, [joinedCourseId]);

  // キーワードコピー
  const handleCopyKeyword = (keyword: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(keyword).then(() => {
        setCopiedKeyword(keyword);
        showToast(`「${keyword}」をコピーしました！LINE公式アカウントで送信してください。`);
        setTimeout(() => setCopiedKeyword(null), 2500);
      }).catch(() => {
        fallbackCopy(keyword);
      });
    } else {
      fallbackCopy(keyword);
    }
  };

  const fallbackCopy = (text: string) => {
    const input = document.createElement('textarea');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    setCopiedKeyword(text);
    showToast(`「${text}」をコピーしました！LINE公式アカウントで送信してください。`);
    setTimeout(() => setCopiedKeyword(null), 2500);
  };

  // LINE公式アカウントを開く
  const handleOpenLine = (keyword: string) => {
    const lineUrl = `https://line.me/R/oaMessage/@kanzaki_rail/?${encodeURIComponent(keyword)}`;
    try {
      window.open(lineUrl, '_blank', 'noopener,noreferrer');
      showToast(`LINE公式アカウントを開きます。「${keyword}」を送信するとクーポンが返信されます。`);
    } catch (e) {
      console.warn('Could not open LINE external URL:', e);
    }
  };

  // GPS現在地取得
  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsErrorMsg('お使いの端末はGPS位置情報に対応していません。');
      return;
    }

    setIsLocating(true);
    setGpsErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });
        showToast('現在地のGPS測位に成功しました！');
      },
      (error) => {
        setIsLocating(false);
        console.warn('GPS error:', error);
        setGpsErrorMsg('GPS測位がタイムアウトまたは許可されていません。シミュレーション押印をご利用いただけます。');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 2点間の距離計算 (Haversine formula: km単位)
  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // スタンプラリーに参加（専用タブ化）
  const handleJoinRally = (courseId: RallyDifficulty) => {
    setJoinedCourseId(courseId);
    setViewingCourseId(courseId);
    showToast(`「${STAMP_COURSES[courseId].title}」に参加しました！イベントタブが専用画面に切り替わりました。`);
  };

  // スタンプラリー解除（リタイア・他コース選択）
  const handleQuitRally = () => {
    setJoinedCourseId(null);
    setShowQuitConfirmModal(false);
    showToast('スタンプラリーの参加を解除しました。');
  };

  // スタンプ押印処理（内部共通）
  const handleStampStation = (station: StampStation, courseId: RallyDifficulty) => {
    const isAlreadyStamped = stampedList.some((s) => s.stationId === station.id);
    if (isAlreadyStamped) {
      showToast(`${station.name}のスタンプは既に獲得済みです！`);
      return;
    }

    const nowStr = new Date().toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newRecord: StampRecord = {
      stationId: station.id,
      courseId: courseId,
      stampedAt: nowStr,
    };

    const nextList = [...stampedList, newRecord];
    setStampedList(nextList);

    // コース達成判定
    const targetCourse = STAMP_COURSES[courseId];
    const courseStationIds = targetCourse.stations.map((st) => st.id);
    const collectedCount = nextList.filter((r) => courseStationIds.includes(r.stationId)).length;

    if (collectedCount === targetCourse.stations.length && !completedCourses.includes(courseId)) {
      // コース完全制覇！
      setCompletedCourses((prev) => [...prev, courseId]);
      if (onAddNPoints && targetCourse.rewardPoints) {
        onAddNPoints(targetCourse.rewardPoints, `スタンプラリー制覇特典（${targetCourse.title}）`, 'stamp');
      }
      setShowCompletionModal(targetCourse);
      showToast(`${targetCourse.title}完全制覇！LINEで「${targetCourse.lineKeyword}」と送信してクーポンを獲得できます！`);
    } else {
      showToast(`【GPSチェックイン成功】${station.name}のスタンプを獲得しました！（${collectedCount}/${targetCourse.stations.length}）`);
    }

    if (selectedStationDetail && selectedStationDetail.id === station.id) {
      setSelectedStationDetail(null);
    }
  };

  // クーポンコードの適用処理（LINE公式アカウントから届いたコードを入力）
  const handleApplyCouponCode = (rawCodeToApply?: string) => {
    const code = (rawCodeToApply || couponInput).trim();
    if (!code) {
      showToast('クーポンコードを入力してください。');
      return;
    }

    const matchedCourse = findCourseByCouponCode(code);
    if (!matchedCourse) {
      showToast('無効なクーポンコードです。LINE公式アカウントから届いたコード（例: KZ-EASY-200）をご確認ください。');
      return;
    }

    const isAlreadyApplied = appliedCoupons.some((c) => c.courseId === matchedCourse.id);
    if (isAlreadyApplied) {
      showToast(`このクーポンコード【${matchedCourse.lineCouponCode}】は既にアプリに適用済みです。`);
      return;
    }

    const nowStr = new Date().toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newRecord: AppliedCouponRecord = {
      courseId: matchedCourse.id,
      code: matchedCourse.lineCouponCode,
      appliedAt: nowStr,
      rewardTitle: matchedCourse.couponRewardTitle,
      rewardDetail: matchedCourse.couponRewardDetail,
      bonusPoints: matchedCourse.bonusPoints,
    };

    setAppliedCoupons((prev) => [...prev, newRecord]);
    setCouponInput('');

    if (onAddNPoints && matchedCourse.bonusPoints) {
      onAddNPoints(matchedCourse.bonusPoints, `LINE公式クーポン特典（${matchedCourse.lineCouponCode}）`, 'coupon');
    }

    setAppliedSuccessInfo({
      course: matchedCourse,
      record: newRecord,
    });

    showToast(`クーポンコード【${matchedCourse.lineCouponCode}】の適用に成功しました！`);
  };

  // ボタン押下時にGPSを即座に測位して「半径300m以内」かを厳密判定
  const handleCheckinWithGps = (
    station: StampStation,
    courseId: RallyDifficulty,
    bypassGpsCheck: boolean = false
  ) => {
    const isAlreadyStamped = stampedList.some((s) => s.stationId === station.id);
    if (isAlreadyStamped) {
      showToast(`${station.name}のスタンプは既に獲得済みです！`);
      return;
    }

    // テストバイパスまたはシミュレーション時
    if (bypassGpsCheck) {
      if (gpsVerificationModal) setGpsVerificationModal(null);
      handleStampStation(station, courseId);
      return;
    }

    if (!navigator.geolocation) {
      setGpsVerificationModal({
        station,
        courseId,
        status: 'error',
        message: 'お使いの端末またはブラウザはGPS位置情報に対応していません。',
      });
      return;
    }

    setCheckingStationId(station.id);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCheckingStationId(null);
        const { latitude, longitude } = position.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });

        const distKm = calculateDistanceKm(latitude, longitude, station.lat, station.lng);
        const MAX_RADIUS_KM = 0.300; // 半径300m = 0.3km

        if (distKm <= MAX_RADIUS_KM) {
          // 半径300m以内のためスタンプ押印成功！
          handleStampStation(station, courseId);
        } else {
          // 半径300mより離れているためチェックイン不可
          const distMeters = Math.round(distKm * 1000);
          const distStr = distMeters >= 1000 ? `${distKm.toFixed(1)} km` : `${distMeters} m`;
          
          setGpsVerificationModal({
            station,
            courseId,
            status: 'out_of_range',
            distanceKm: distKm,
            message: `現在地から「${station.name}」まで約 ${distStr} 離れています。スタンプを押印するには、駅の半径300m以内（改札・構内周辺）に近づいてから再度チェックインボタンを押してください。`,
          });
        }
      },
      (error) => {
        setCheckingStationId(null);
        let msg = 'GPSの測位がタイムアウトしたか、位置情報を取得できませんでした。';
        let status: 'permission_denied' | 'error' = 'error';

        if (error.code === error.PERMISSION_DENIED) {
          msg = '位置情報の利用が許可されていません。ブラウザまたは端末の位置情報許可設定をオンにして再度お試しください。';
          status = 'permission_denied';
        }

        setGpsVerificationModal({
          station,
          courseId,
          status,
          message: msg,
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // スタンプアイコンのレンダリング
  const renderStampIcon = (iconName: string) => {
    switch (iconName) {
      case 'Building2': return <Building2 className="w-5 h-5" />;
      case 'Landmark': return <Landmark className="w-5 h-5" />;
      case 'ShoppingBag': return <ShoppingBag className="w-5 h-5" />;
      case 'TrainTrack': return <Train className="w-5 h-5" />;
      case 'Bike': return <Bike className="w-5 h-5" />;
      case 'GitMerge': return <GitMerge className="w-5 h-5" />;
      case 'Rocket': return <Rocket className="w-5 h-5" />;
      case 'Trees': return <Trees className="w-5 h-5" />;
      case 'Cookie': return <Cookie className="w-5 h-5" />;
      case 'Waves': return <Waves className="w-5 h-5" />;
      default: return <Award className="w-5 h-5" />;
    }
  };

  const currentActiveCourse = joinedCourseId ? STAMP_COURSES[joinedCourseId] : null;
  const viewingCourse = STAMP_COURSES[viewingCourseId];

  // 現在表示中コースのスタンプ進捗計算
  const viewingStationIds = viewingCourse.stations.map((s) => s.id);
  const viewingStampedCount = stampedList.filter((s) => viewingStationIds.includes(s.stationId)).length;
  const isViewingCourseCompleted = viewingStampedCount === viewingCourse.stations.length;

  return (
    <div className="space-y-4 animate-fadeIn text-[#221C35] max-w-3xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#221C35] text-white px-4 py-2.5 rounded-2xl shadow-xl border border-purple-500/30 flex items-center gap-2 text-xs font-bold animate-fadeIn">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          MODE 1: 未参加状態（スタンプラリー紹介＆コース選択エントリー画面）
         ========================================================================= */}
      {!joinedCourseId ? (
        <div className="space-y-5">
          {/* Top Hero Banner */}
          <div className="bg-gradient-to-br from-[#4C1D95] via-[#6D28D9] to-[#8B5CF6] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute right-[-20px] top-[-20px] w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <span className="bg-amber-400 text-purple-950 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide flex items-center gap-1 shadow-xs">
                  <Radio className="w-3 h-3 animate-pulse text-purple-900" />
                  <span>GPS連動 デジタルイベント</span>
                </span>
                <span className="bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-full text-[10px] font-bold">
                  神埼線公式
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                神埼線 実在駅をめぐる<br />
                GPSデジタルスタンプラリー2026
              </h2>

              <p className="text-xs sm:text-sm text-purple-100 font-medium leading-relaxed">
                スマートフォンを片手に神埼線の実在駅を巡ろう！駅周辺でGPSチェックインすると、各駅限定のオリジナル鉄道スタンプと豪華N-POINTを獲得できます。全駅制覇すると<strong className="text-amber-300">LINE公式アカウントで使える限定クーポン</strong>が手に入ります！
              </p>
            </div>
          </div>

          {/* 3つのコース選択カード */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black text-[#221C35] flex items-center gap-1.5">
                <Flag className="w-4 h-4 text-[#5B21B6]" />
                <span>参加コースを選択してください（全3コース）</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {(Object.keys(STAMP_COURSES) as RallyDifficulty[]).map((courseKey) => {
                const c = STAMP_COURSES[courseKey];
                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-2xl border border-[#E6E2EE] p-5 shadow-2xs hover:shadow-md transition-all space-y-3.5"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2.5 py-0.5 rounded-md text-[10px] font-black text-white"
                            style={{ backgroundColor: c.color }}
                          >
                            {c.levelBadge}
                          </span>
                          <span className="text-xs font-bold text-[#6B6380]">
                            {c.targetVibe}
                          </span>
                        </div>
                        <h4 className="text-base font-black text-[#221C35]">
                          {c.title}（全{c.targetCount}駅）
                        </h4>
                      </div>

                      <div className="text-right shrink-0 bg-[#FAF8FF] border border-[#DDD6FE] px-2.5 py-1 rounded-xl">
                        <span className="text-[10px] text-[#6B6380] font-bold block">クリア特典</span>
                        <span className="text-xs font-black text-[#5B21B6] flex items-center gap-0.5 justify-end">
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                          <span>+{c.rewardPoints} pt</span>
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#6B6380] leading-relaxed">
                      {c.description}
                    </p>

                    {/* 巡る駅一覧タグ */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-[#221C35] block">
                        対象駅：
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {c.stations.map((st, sIdx) => (
                          <span
                            key={st.id}
                            className="bg-[#F4F3F8] border border-[#E6E2EE] text-[#221C35] px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1"
                          >
                            <span className="w-4 h-4 rounded-full bg-[#5B21B6] text-white text-[9px] font-bold flex items-center justify-center">
                              {sIdx + 1}
                            </span>
                            <span>{st.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* コース制覇特典枠（クリア前はキーワード・コードを完全に伏せる） */}
                    <div className="bg-[#06C755]/10 border border-[#06C755]/30 rounded-xl p-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#06C755] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <MessageCircle className="w-4 h-4 fill-current" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-[#059669] block">
                            全駅達成特典
                          </span>
                          <h5 className="text-xs font-bold text-[#221C35]">
                            {c.lineCouponText}
                          </h5>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-[#059669] bg-white px-2.5 py-1 rounded-md border border-[#06C755]/20 shrink-0">
                        全駅制覇で獲得
                      </span>
                    </div>

                    {/* エントリーボタン */}
                    <div className="pt-2 border-t border-[#F0EDF6] flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleJoinRally(c.id)}
                        className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Flag className="w-4 h-4" />
                        <span>このコースでスタンプラリーを開始する</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
            MODE 2: スタンプラリー専用ダッシュボード（タブ変貌後）
           ========================================================================= */
        <div className="space-y-4">
          {/* Active Banner (専用化モードインジケーター) */}
          <div className="bg-gradient-to-br from-[#221C35] via-[#352554] to-[#4C1D95] rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="bg-amber-400 text-purple-950 px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1">
                  <Radio className="w-3 h-3 text-purple-950 animate-pulse" />
                  <span>GPSスタンプラリー専用モード稼働中</span>
                </span>

                <button
                  type="button"
                  onClick={() => setShowQuitConfirmModal(true)}
                  className="text-gray-300 hover:text-white text-[11px] font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>コース変更・終了</span>
                </button>
              </div>

              <div>
                <span className="text-xs text-purple-200 font-bold block">
                  挑戦中：{currentActiveCourse?.difficultyLabel}
                </span>
                <h2 className="text-xl font-black tracking-tight mt-0.5">
                  {currentActiveCourse?.title}
                </h2>
              </div>

              {/* Progress Bar & Status */}
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-200">
                    スタンプ獲得状況
                  </span>
                  <span className="font-black text-amber-300 font-mono text-sm">
                    {viewingStampedCount} / {viewingCourse.targetCount} 駅 達成
                  </span>
                </div>

                <div className="w-full bg-black/30 rounded-full h-2.5 overflow-hidden p-0.5">
                  <div
                    className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(viewingStampedCount / viewingCourse.targetCount) * 100}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-300 pt-1">
                  <span>達成時リワード: +{viewingCourse.rewardPoints} N-POINT</span>
                  <span className="font-bold text-white">
                    {isViewingCourseCompleted ? 'コース制覇達成！' : `あと ${viewingCourse.targetCount - viewingStampedCount} 駅`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* GPS Quick Action Bar */}
          <div className="bg-white rounded-2xl border border-[#E6E2EE] p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-[#5B21B6] flex items-center justify-center shrink-0">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#221C35]">
                    GPS現在地連動チェックイン
                  </h4>
                  <p className="text-[10px] text-[#6B6380]">
                    駅の改札付近や構内でチェックインを押すとスタンプが押印されます
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchCurrentLocation}
                disabled={isLocating}
                className="py-1.5 px-3 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isLocating ? (
                  <Radio className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Compass className="w-3.5 h-3.5" />
                )}
                <span>{isLocating ? 'GPS測位中...' : '現在地を更新'}</span>
              </button>
            </div>

            {gpsErrorMsg && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-2.5 text-xs flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>{gpsErrorMsg}</span>
              </div>
            )}
          </div>

          {/* Course View Switcher Tabs (初級・中級・上級のスタンプ帳切り替え) */}
          <div className="bg-white p-1 rounded-2xl border border-[#E6E2EE] flex items-center shadow-2xs">
            {(Object.keys(STAMP_COURSES) as RallyDifficulty[]).map((courseKey) => {
              const c = STAMP_COURSES[courseKey];
              const isSelected = viewingCourseId === courseKey;
              const isMyActive = joinedCourseId === courseKey;

              const cStationIds = c.stations.map((s) => s.id);
              const cStamped = stampedList.filter((s) => cStationIds.includes(s.stationId)).length;
              const isAllDone = cStamped === c.stations.length;

              return (
                <button
                  key={courseKey}
                  type="button"
                  onClick={() => setViewingCourseId(courseKey)}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    isSelected
                      ? 'bg-[#5B21B6] text-white shadow-xs'
                      : 'text-[#6B6380] hover:text-[#221C35]'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>{c.difficultyLabel}</span>
                    {isMyActive && (
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-[#5B21B6]'}`} />
                    )}
                    {isAllDone && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    )}
                  </div>
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-purple-200' : 'text-gray-400'}`}>
                    {cStamped}/{c.targetCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Station Stamps Grid (スタンプ台帳) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-[#221C35] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#5B21B6]" />
                <span>{viewingCourse.title} スタンプ台帳</span>
              </h3>
              <span className="text-[11px] text-[#6B6380] font-bold">
                対象：{viewingCourse.targetVibe}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {viewingCourse.stations.map((st, idx) => {
                const stampedRecord = stampedList.find((r) => r.stationId === st.id);
                const isStamped = !!stampedRecord;

                // GPS距離計算
                let distanceText = '';
                let isNearby = false;
                if (currentCoords) {
                  const distKm = calculateDistanceKm(currentCoords.lat, currentCoords.lng, st.lat, st.lng);
                  if (distKm <= 0.3) {
                    distanceText = '駅半径300m以内（チェックイン可能！）';
                    isNearby = true;
                  } else if (distKm < 1) {
                    distanceText = `現在地から 約 ${(distKm * 1000).toFixed(0)} m (条件: 300m以内)`;
                  } else {
                    distanceText = `現在地から 約 ${distKm.toFixed(1)} km (条件: 300m以内)`;
                  }
                }

                const isCheckingThis = checkingStationId === st.id;

                return (
                  <div
                    key={st.id}
                    className={`bg-white rounded-2xl border transition-all p-4 flex flex-col justify-between gap-3 shadow-2xs relative overflow-hidden ${
                      isStamped
                        ? 'border-purple-300 bg-gradient-to-b from-purple-50/40 to-white'
                        : isNearby
                        ? 'border-emerald-400 ring-2 ring-emerald-300/40 bg-emerald-50/20'
                        : 'border-[#E6E2EE]'
                    }`}
                  >
                    {/* Top Station Info */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-white bg-[#5B21B6] px-2 py-0.5 rounded-md">
                          第{idx + 1}駅
                        </span>
                        <span className="text-[10px] font-mono text-[#6B6380] font-bold">
                          {st.code}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <div>
                          <h4 className="text-base font-black text-[#221C35]">
                            {st.name}
                          </h4>
                          <span className="text-[10px] text-[#6B6380] block">
                            {st.nameKana}（{st.line}）
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-[#6B6380] line-clamp-2 leading-relaxed">
                        {st.description}
                      </p>
                    </div>

                    {/* Stamp Impression Area (スタンプ印影) */}
                    <div className="py-2 flex items-center justify-center">
                      {isStamped ? (
                        /* 押印済み：リアル鉄道記念スタンプ */
                        <div
                          onClick={() => setSelectedStationDetail(st)}
                          className="w-28 h-28 rounded-full border-4 border-dashed p-1.5 flex flex-col items-center justify-center text-center shadow-xs rotate-[-6deg] animate-scaleUp cursor-pointer hover:scale-105 transition-transform"
                          style={{
                            borderColor: st.stampDesign.color,
                            backgroundColor: `${st.stampDesign.color}0D`,
                            color: st.stampDesign.color,
                          }}
                        >
                          <div className="border border-solid rounded-full w-full h-full p-1 flex flex-col items-center justify-between" style={{ borderColor: st.stampDesign.color }}>
                            <span className="text-[8px] font-black tracking-widest uppercase">
                              KANZAKI RALLY
                            </span>
                            <div className="flex flex-col items-center">
                              {renderStampIcon(st.stampDesign.iconName)}
                              <span className="text-xs font-black mt-0.5 tracking-tight">
                                {st.name}
                              </span>
                            </div>
                            <span className="text-[7px] font-mono font-bold">
                              {stampedRecord?.stampedAt.slice(0, 10)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* 未押印：プレースホルダー */
                        <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 gap-1 bg-[#FAF8FF]">
                          <Award className="w-6 h-6 stroke-[1.5]" />
                          <span className="text-[9px] font-bold">未獲得</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action / Distance */}
                    <div className="pt-2 border-t border-[#F0EDF6] space-y-2">
                      {distanceText && (
                        <div className={`text-[10px] font-bold text-center ${isNearby ? 'text-emerald-700 font-black' : 'text-[#6B6380]'}`}>
                          {distanceText}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedStationDetail(st)}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-[#F4F3F8] hover:bg-[#EBE9F3] text-[#221C35] text-[11px] font-bold transition-all border border-[#E6E2EE] cursor-pointer"
                        >
                          駅・スポット詳細
                        </button>

                        {!isStamped ? (
                          <button
                            type="button"
                            disabled={isCheckingThis}
                            onClick={() => handleCheckinWithGps(st, viewingCourse.id)}
                            className="py-1.5 px-3 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-[11px] font-black transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            {isCheckingThis ? (
                              <>
                                <Radio className="w-3.5 h-3.5 animate-spin" />
                                <span>GPS確認中</span>
                              </>
                            ) : (
                              <>
                                <QrCode className="w-3.5 h-3.5" />
                                <span>チェックイン</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="py-1.5 px-3 rounded-xl bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>押印済</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* LINE公式クーポン受取＆コード引き換え（シンプル・クリーン版） */}
            {isViewingCourseCompleted ? (
              <div className="bg-gradient-to-br from-emerald-50 via-white to-green-50/70 border-2 border-emerald-300 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#06C755] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Ticket className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-[#059669] block">
                        全駅制覇達成！LINE特典クーポン
                      </span>
                      <h4 className="text-xs sm:text-sm font-black text-[#221C35]">
                        {viewingCourse.lineCouponText}
                      </h4>
                    </div>
                  </div>

                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>制覇済み</span>
                  </span>
                </div>

                {/* キーワード送信エリア */}
                <div className="bg-white border border-emerald-200 rounded-2xl p-3 space-y-2">
                  <div className="text-[11px] text-gray-600">
                    LINE公式アカウントで以下の合言葉を送信すると、クーポンコードが届きます。
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex-1 bg-emerald-50 px-3 py-2 rounded-xl font-mono text-sm font-black text-[#059669] flex items-center justify-between border border-emerald-200">
                      <span>{viewingCourse.lineKeyword}</span>
                      <span className="text-[9px] text-emerald-600 font-bold bg-white px-1.5 py-0.5 rounded">合言葉</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyKeyword(viewingCourse.lineKeyword)}
                        className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-[#06C755] hover:bg-[#05B34C] text-white text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedKeyword === viewingCourse.lineKeyword ? 'コピー済' : 'コピー'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenLine(viewingCourse.lineKeyword)}
                        className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>LINEを開く</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* クーポンコード入力 */}
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder={`届いたクーポンコードを入力（例: ${viewingCourse.lineCouponCode}）`}
                      className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#06C755] uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCouponCode()}
                      className="py-2 px-4 rounded-xl bg-[#06C755] hover:bg-[#05B34C] text-white text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>適用</span>
                    </button>
                  </div>

                  {appliedCoupons.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {appliedCoupons.map((ac) => (
                        <div
                          key={ac.code}
                          className="bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[11px]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="bg-[#06C755] text-white text-[8px] font-black px-1 py-0.5 rounded">有効</span>
                            <span className="font-bold text-[#221C35]">{ac.rewardTitle}</span>
                          </div>
                          <span className="font-black text-[#059669]">+{ac.bonusPoints} pt</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#E6E2EE] rounded-2xl p-3.5 flex items-center justify-between text-xs text-[#6B6380]">
                <span>
                  全{viewingCourse.targetCount}駅制覇で達成特典クーポンが解放されます（現在 {viewingStampedCount}/{viewingCourse.targetCount} 駅）
                </span>
                <span className="font-bold text-[#5B21B6] bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200 shrink-0 ml-2">
                  全駅達成で解放
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: 駅・スポット詳細 ＆ 拡大スタンプモーダル
         ========================================================================= */}
      {selectedStationDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-[#DDD6FE] relative animate-scaleUp text-[#221C35]">
            <button
              onClick={() => setSelectedStationDetail(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-[#6B6380] hover:bg-[#F4F3F8] transition-all cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-black text-white bg-[#5B21B6] px-2 py-0.5 rounded-md">
                {selectedStationDetail.code}
              </span>
              <h3 className="text-lg font-black text-[#221C35]">
                {selectedStationDetail.name}
              </h3>
              <p className="text-xs text-[#6B6380]">
                {selectedStationDetail.line}
              </p>
            </div>

            {/* Stamp Big Preview */}
            <div className="bg-[#FAF8FF] border border-[#E0D7F3] rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2">
              <div
                className="w-32 h-32 rounded-full border-4 border-dashed p-2 flex flex-col items-center justify-between rotate-[-4deg] shadow-md"
                style={{
                  borderColor: selectedStationDetail.stampDesign.color,
                  backgroundColor: `${selectedStationDetail.stampDesign.color}10`,
                  color: selectedStationDetail.stampDesign.color,
                }}
              >
                <span className="text-[9px] font-black tracking-widest uppercase">
                  KANZAKI DIGITAL RALLY
                </span>
                <div className="flex flex-col items-center">
                  {renderStampIcon(selectedStationDetail.stampDesign.iconName)}
                  <span className="text-sm font-black mt-1">
                    {selectedStationDetail.name}
                  </span>
                  <span className="text-[9px] font-bold mt-0.5">
                    {selectedStationDetail.stampDesign.subText}
                  </span>
                </div>
                <span className="text-[8px] font-mono font-bold">
                  2026 KANZAKI LINE
                </span>
              </div>
            </div>

            {/* Spot Guide Box */}
            <div className="bg-white border border-[#E6E2EE] rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-[#5B21B6] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#6B6380] block text-[10px]">チェックイン・設置場所</span>
                  <span className="font-bold text-[#221C35]">{selectedStationDetail.spotGuide}</span>
                </div>
              </div>

              <div className="flex items-start gap-1.5 pt-1.5 border-t border-[#F0EDF6]">
                <Info className="w-4 h-4 text-[#5B21B6] shrink-0 mt-0.5" />
                <p className="text-[#6B6380] leading-relaxed">
                  {selectedStationDetail.description}
                </p>
              </div>
            </div>

            {/* Modal Bottom Checkin */}
            <div className="pt-2">
              {stampedList.some((s) => s.stationId === selectedStationDetail.id) ? (
                <div className="w-full py-2.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center gap-1">
                  <Check className="w-4 h-4" />
                  <span>この駅のスタンプは獲得済みです</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={checkingStationId === selectedStationDetail.id}
                  onClick={() => handleCheckinWithGps(selectedStationDetail, viewingCourseId)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {checkingStationId === selectedStationDetail.id ? (
                    <>
                      <Radio className="w-4 h-4 animate-spin" />
                      <span>GPS測位判定中（半径300m確認）...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>この駅でチェックイン（GPS半径300m判定）</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: コース完全制覇お祝いモーダル ＆ LINEクーポン発行
         ========================================================================= */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border border-amber-300 relative animate-scaleUp text-[#221C35] max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCompletionModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-purple-950 flex items-center justify-center mx-auto shadow-lg">
              <Award className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-black text-amber-600 tracking-wider uppercase">
                COURSE COMPLETED
              </span>
              <h3 className="text-xl font-black text-[#221C35]">
                {showCompletionModal.title}<br />完全制覇おめでとうございます！
              </h3>
              <p className="text-xs text-[#6B6380]">
                対象の全{showCompletionModal.targetCount}駅のスタンプをすべて集めました！
              </p>
            </div>

            {/* Reward Box */}
            <div className="bg-gradient-to-br from-purple-50 to-amber-50/60 border border-amber-200 rounded-2xl p-3.5 space-y-2">
              <span className="text-[11px] font-bold text-[#5B21B6] block">獲得した特典・リワード</span>
              <div className="text-2xl font-black text-[#5B21B6] flex items-center justify-center gap-1">
                <Coins className="w-6 h-6 text-amber-500" />
                <span>+{showCompletionModal.rewardPoints} N-POINT</span>
              </div>
              <div className="text-xs font-bold text-gray-700 bg-white/80 py-1 px-3 rounded-lg border border-amber-200/60">
                {showCompletionModal.rewardBadge} 付与
              </div>
            </div>

            {/* 5ステップ連携ガイド */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-100/60 border-2 border-[#06C755] rounded-2xl p-4 text-left space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="bg-[#06C755] text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <MessageCircle className="w-3 h-3 fill-current" />
                  <span>LINE公式特典クーポン</span>
                </span>
                <span className="text-xs font-black text-[#059669]">
                  LINE 連携クーポン受取
                </span>
              </div>

              <div>
                <h4 className="text-xs font-black text-[#221C35]">
                  {showCompletionModal.lineCouponText}
                </h4>
                <p className="text-[11px] text-emerald-800 font-bold mt-1">
                  「この文章を入力すると、クーポンが手に入ります」
                </p>
              </div>

              {/* キーワードボックス */}
              <div className="bg-white border border-emerald-300 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 font-bold">LINE送信キーワード：</span>
                  <span className="font-mono text-sm font-black text-[#059669] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {showCompletionModal.lineKeyword}
                  </span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopyKeyword(showCompletionModal.lineKeyword)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#06C755] hover:bg-[#05B34C] text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedKeyword === showCompletionModal.lineKeyword ? 'コピー完了！' : 'キーワードをコピー'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenLine(showCompletionModal.lineKeyword)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>公式LINEを開く</span>
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const c = showCompletionModal;
                    setShowCompletionModal(null);
                    setShowLineFlowModal(c);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-emerald-50 text-[#059669] border border-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>LINEでの受取〜コード適用の流れを画面で確認</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCompletionModal(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-xs font-black transition-all shadow-xs cursor-pointer"
            >
              スタンプ台帳・コード入力画面へ戻る
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2.5: LINE受取フロー＆メッセージシミュレーターモーダル
         ========================================================================= */}
      {showLineFlowModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#8C9DAE] rounded-3xl max-w-sm w-full shadow-2xl border border-gray-400 overflow-hidden relative animate-scaleUp text-[#221C35] max-h-[92vh] flex flex-col">
            {/* LINE Header */}
            <div className="bg-[#243548] text-white px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#06C755] flex items-center justify-center text-white font-black text-xs shadow-xs">
                  神埼
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-black text-white">神埼鉄道 公式アカウント</span>
                    <Check className="w-3 h-3 text-[#06C755] bg-white rounded-full p-0.5" />
                  </div>
                  <span className="text-[10px] text-gray-300">GAS連携システム連動中</span>
                </div>
              </div>
              <button
                onClick={() => setShowLineFlowModal(null)}
                className="p-1 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* LINE Chat Messages Area */}
            <div className="p-3.5 space-y-3 overflow-y-auto flex-1 text-xs">
              <div className="text-center">
                <span className="bg-black/20 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  今日
                </span>
              </div>

              {/* Bot Message 1: 個別案内メール */}
              <div className="flex items-start gap-2 max-w-[88%]">
                <div className="w-7 h-7 rounded-full bg-[#06C755] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                  神
                </div>
                <div className="bg-white rounded-2xl rounded-tl-xs p-3 shadow-xs text-gray-800 space-y-1.5 leading-relaxed">
                  <span className="text-[10px] font-bold text-[#059669] block">
                    【神埼鉄道】スタンプラリー全駅制覇！
                  </span>
                  <p className="text-[11px]">
                    {showLineFlowModal.title}の全駅達成おめでとうございます！
                  </p>
                  <p className="text-[11px]">
                    下記の文章をそのままこのトークに送信すると、限定クーポンが即時発行されます。
                  </p>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-1.5 text-center font-mono font-black text-[#059669] text-xs">
                    {showLineFlowModal.lineKeyword}
                  </div>
                </div>
              </div>

              {/* User Message: キーワード送信 */}
              <div className="flex justify-end">
                <div className="bg-[#85E249] text-[#1E3B06] font-mono font-black text-xs rounded-2xl rounded-tr-xs px-3.5 py-2 shadow-xs">
                  {showLineFlowModal.lineKeyword}
                </div>
              </div>

              {/* Bot Message 2: クーポン発行＆クーポンコード */}
              <div className="flex items-start gap-2 max-w-[92%]">
                <div className="w-7 h-7 rounded-full bg-[#06C755] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                  神
                </div>
                <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-xs text-gray-800 space-y-2 leading-relaxed border-2 border-[#06C755]">
                  <div className="flex items-center gap-1.5 text-[#059669] font-black text-xs">
                    <Gift className="w-4 h-4" />
                    <span>特典クーポンが発行されました！</span>
                  </div>

                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-2.5 border border-emerald-200 space-y-1">
                    <span className="text-[10px] font-bold text-gray-600 block">
                      {showLineFlowModal.couponRewardTitle}
                    </span>
                    <p className="text-[11px] font-black text-[#221C35]">
                      {showLineFlowModal.couponRewardDetail}
                    </p>
                    <div className="text-[10px] font-black text-[#059669]">
                      ボーナス: +{showLineFlowModal.bonusPoints} N-POINT
                    </div>
                  </div>

                  {/* Coupon Code Block */}
                  <div className="bg-gray-900 text-white rounded-xl p-2.5 text-center space-y-1">
                    <span className="text-[9px] text-gray-300 font-bold block">
                      【神埼アプリ引き換え用クーポンコード】
                    </span>
                    <span className="font-mono text-sm font-black tracking-widest text-amber-300 block select-all">
                      {showLineFlowModal.lineCouponCode}
                    </span>
                  </div>

                  <p className="text-[10px] text-gray-500 leading-tight">
                    ※神埼鉄道アプリ内の「クーポンコード引き換え」にこのコードを入力して特典を適用してください。
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="bg-white p-3.5 border-t border-gray-200 space-y-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const code = showLineFlowModal.lineCouponCode;
                  setShowLineFlowModal(null);
                  handleApplyCouponCode(code);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#06C755] hover:bg-[#05B34C] text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>このクーポンコード（{showLineFlowModal.lineCouponCode}）をアプリに適用</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenLine(showLineFlowModal.lineKeyword)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>実際の公式LINEを開く</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLineFlowModal(null)}
                  className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold transition-all cursor-pointer"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2.8: クーポンコード適用完了お祝いモーダル
         ========================================================================= */}
      {appliedSuccessInfo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border-2 border-emerald-400 relative animate-scaleUp text-[#221C35]">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#059669] flex items-center justify-center mx-auto shadow-sm">
              <Gift className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#059669] bg-emerald-50 px-2.5 py-0.5 rounded-md inline-block border border-emerald-200">
                COUPON REDEEMED
              </span>
              <h3 className="text-lg font-black text-[#221C35]">
                特典クーポンを適用しました！
              </h3>
              <p className="text-xs text-[#6B6380]">
                コード: <strong className="font-mono text-[#5B21B6]">{appliedSuccessInfo.code}</strong>
              </p>
            </div>

            {/* Reward Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 border border-emerald-300 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#221C35]">
                  {appliedSuccessInfo.rewardTitle}
                </span>
                <span className="bg-[#06C755] text-white text-[9px] font-black px-2 py-0.5 rounded">
                  有効中
                </span>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                {appliedSuccessInfo.rewardDetail}
              </p>
              <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-xs">
                <span className="font-bold text-gray-600">加算ポイント</span>
                <span className="font-black text-[#059669] flex items-center gap-1">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>+{appliedSuccessInfo.bonusPoints} N-POINT</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAppliedSuccessInfo(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-xs font-black transition-all shadow-xs cursor-pointer"
            >
              確認しました
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: 参加解除・コース変更確認モーダル
         ========================================================================= */}
      {showQuitConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-[#DDD6FE] relative animate-scaleUp text-[#221C35]">
            <div className="space-y-2">
              <h3 className="text-base font-black text-[#221C35]">
                スタンプラリーの参加を終了・変更しますか？
              </h3>
              <p className="text-xs text-[#6B6380] leading-relaxed">
                参加を解除すると、他のイベント選択画面に戻ります。（※これまでに獲得したスタンプとN-POINTは保持されます）
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowQuitConfirmModal(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-[#F4F3F8] hover:bg-[#EBE9F3] text-[#221C35] text-xs font-bold transition-all border border-[#E6E2EE] cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleQuitRally}
                className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                参加を解除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: GPS判定結果モーダル（300m圏外・位置情報未許可時）
         ========================================================================= */}
      {gpsVerificationModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 text-center space-y-4 shadow-2xl border border-[#DDD6FE] relative animate-scaleUp text-[#221C35]">
            <button
              onClick={() => setGpsVerificationModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-[#6B6380] hover:bg-[#F4F3F8] transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-sm ${
              gpsVerificationModal.status === 'out_of_range'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {gpsVerificationModal.status === 'out_of_range' ? (
                <Radio className="w-7 h-7" />
              ) : (
                <AlertCircle className="w-7 h-7" />
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-md inline-block border border-amber-200">
                GPS位置情報判定結果
              </span>
              <h3 className="text-lg font-black text-[#221C35]">
                {gpsVerificationModal.status === 'out_of_range' ? 'チェックイン範囲外です' : 'GPS測位エラー'}
              </h3>
              <p className="text-xs text-[#6B6380]">
                対象：<strong>{gpsVerificationModal.station.name}</strong>（{gpsVerificationModal.station.code}）
              </p>
            </div>

            {/* Detailed Info Card */}
            <div className="bg-[#FAF8FF] border border-[#DDD6FE] rounded-2xl p-3.5 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#6B6380] font-bold">チェックイン条件</span>
                <span className="font-black text-[#5B21B6] bg-purple-100 px-2 py-0.5 rounded-md">
                  駅の半径300m以内
                </span>
              </div>

              {gpsVerificationModal.distanceKm !== undefined && (
                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#EBE6F5]">
                  <span className="text-[#6B6380] font-bold">現在地との距離</span>
                  <span className="font-black text-amber-700 font-mono">
                    {gpsVerificationModal.distanceKm >= 1
                      ? `約 ${gpsVerificationModal.distanceKm.toFixed(2)} km`
                      : `約 ${Math.round(gpsVerificationModal.distanceKm * 1000)} m`}
                  </span>
                </div>
              )}

              <p className="text-[11px] text-[#4C4560] leading-relaxed pt-1 border-t border-[#EBE6F5]">
                {gpsVerificationModal.message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => setGpsVerificationModal(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-xs font-black transition-all shadow-xs cursor-pointer"
              >
                閉じる
              </button>

              {/* 検証用シミュレーションボタン */}
              <button
                type="button"
                onClick={() => handleCheckinWithGps(gpsVerificationModal.station, gpsVerificationModal.courseId, true)}
                className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>【動作検証用】現地到着としてテスト押印</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: GAS (Google Apps Script) ソースコード＆導入設定ガイド
         ========================================================================= */}
      {showGasCodeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#1E1E2E] rounded-3xl max-w-2xl w-full text-white shadow-2xl border border-purple-500/40 relative animate-scaleUp max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-[#2D2B42] px-5 py-4 flex items-center justify-between border-b border-purple-900/40 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-mono font-bold text-xs shadow-xs">
                  GAS
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>Google Apps Script (Code.gs) 連携コード</span>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold px-1.5 py-0.2 rounded">
                      v1.0
                    </span>
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    LINE Messaging API Webhook ＆ スプレッドシート自動ログ記録
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGasCodeModal(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Deploy Steps */}
              <div className="bg-[#26243A] rounded-2xl p-4 border border-purple-800/40 space-y-2.5">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>3分で完了！GASデプロイ＆LINE連携手順</span>
                </span>
                <ol className="list-decimal list-inside space-y-1.5 text-gray-300 text-[11px] leading-relaxed">
                  <li>
                    <strong>Googleスプレッドシート</strong>を新規作成し、メニューの「拡張機能」→「Apps Script」を開きます。
                  </li>
                  <li>
                    下の「コードを全選択コピー」を押し、GASの <code className="text-emerald-300 font-mono bg-black/40 px-1 py-0.5 rounded">Code.gs</code> にすべて貼り付けます。
                  </li>
                  <li>
                    コード12行目の <code className="text-amber-300 font-mono bg-black/40 px-1 py-0.5 rounded">LINE_CHANNEL_ACCESS_TOKEN = '★ここに貼り付け★'</code> にLINEで取得したトークンを貼り付けます。
                  </li>
                  <li>
                    GAS右上の「デプロイ」→「新しいデプロイ」→「ウェブアプリ」を選択（アクセスできるユーザー: <strong>全員</strong>）してデプロイします。
                  </li>
                  <li>
                    発行されたウェブアプリURLを、LINE Developersの「Webhook URL」に貼り付けて「Webhookの利用」を有効化します。
                  </li>
                </ol>
              </div>

              {/* Code Snippet Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-300 flex items-center gap-1">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>gas/Code.gs（初心者入力エリア付き）</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const codeText = `/**
 * =========================================================================
 * 神埼鉄道 統合型 LINE Bot & Webhook バックエンド (Google Apps Script)
 * =========================================================================
 * 
 * ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
 * 【★ 設定エリア ★】
 * ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
 */

const CHANNEL_ACCESS_TOKEN = '★ここにLINEのチャネルアクセストークンを貼り付け★';
const WEB_APP_STATUS_API_URL = 'https://ais-pre-ohfkihkjtj5aocgi5fefnb-251112274276.asia-east1.run.app/api/status';

const SHEET_RESERVATIONS = '予約台帳';
const SHEET_COUPON_LOGS = 'クーポン発行ログ';

const CONFIG = {
  ACCESS_TOKEN: (CHANNEL_ACCESS_TOKEN && !CHANNEL_ACCESS_TOKEN.includes('★'))
    ? CHANNEL_ACCESS_TOKEN
    : (PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || ''),
  LINE_REPLY_URL: 'https://api.line.me/v2/bot/message/reply',
  STAMP_KEYWORDS: {
    '初級クリア済み': { courseId: 'beginner', courseName: '【初級制覇】都市圏イージー', reward: 'デリバリー1品20%OFF' },
    '中級クリア済み': { courseId: 'intermediate', courseName: '【中級制覇】中都市ステップ', reward: '特急乗車料金10%OFF' },
    '上級クリア済み': { courseId: 'advanced', courseName: '【上級制覇】ディープ神埼線', reward: '1日フリー乗車券' }
  }
};

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return createJsonResponse({ status: 'error' });
    const json = JSON.parse(e.postData.contents);
    if (json.action === 'createReservation' || json.order) {
      return createJsonResponse({ status: 'success', saved: saveOrderToSheet(json.order || json) });
    }
    if (json.events && Array.isArray(json.events)) {
      for (let i = 0; i < json.events.length; i++) {
        const event = json.events[i];
        if (event.type === 'message' && event.message.type === 'text') {
          handleLineMessage(event);
        }
      }
      return createJsonResponse({ status: 'success' });
    }
    return createJsonResponse({ status: 'ignored' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function handleLineMessage(event) {
  const replyToken = event.replyToken;
  const userId = event.source?.userId || 'unknown';
  const text = event.message.text.trim();

  // スタンプラリー合言葉受信時はログ記録のみ（クーポン表示はLINE公式の応答メッセージ側で行う）
  const stampCourse = CONFIG.STAMP_KEYWORDS[text];
  if (stampCourse) {
    logCouponIssue(userId, stampCourse);
    return;
  }

  // 予約照会
  if (text.includes('予約') || text.includes('チケット') || text.includes('特急券') || text.toUpperCase().startsWith('NZ-')) {
    handleReservationInquiry(replyToken, userId, text);
    return;
  }

  // 運行情報
  if (text.includes('運行') || text.includes('遅延') || text.includes('ダイヤ')) {
    handleOperationStatus(replyToken);
    return;
  }
}

function handleReservationInquiry(replyToken, userId, text) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss ? ss.getSheetByName(SHEET_RESERVATIONS) : null;
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('予約番号');
    const userIndex = headers.indexOf('LINE_USER_ID');
    const trainIndex = headers.indexOf('列車名');
    const seatIndex = headers.indexOf('座席番号');
    const totalIndex = headers.indexOf('合計金額');

    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      if ((userId !== 'unknown' && String(row[userIndex]) === userId) || (idIndex !== -1 && text.toUpperCase().includes(String(row[idIndex])))) {
        const replyText = \`【ご予約確認】\\n予約番号: \${row[idIndex]}\\n列車名: \${row[trainIndex]}\\n座席: \${row[seatIndex]}\\nお支払額: \${row[totalIndex]}\`;
        replyToLine(replyToken, [{ type: 'text', text: replyText }]);
        return;
      }
    }
    replyToLine(replyToken, [{ type: 'text', text: '有効なご予約が見つかりませんでした。' }]);
  } catch (e) {}
}

function handleOperationStatus(replyToken) {
  replyToLine(replyToken, [{ type: 'text', text: '【運行情報】現在、全線で平常通り運行しております。' }]);
}

function replyToLine(replyToken, messages) {
  if (!CONFIG.ACCESS_TOKEN || CONFIG.ACCESS_TOKEN.includes('★')) return;
  UrlFetchApp.fetch(CONFIG.LINE_REPLY_URL, {
    method: 'post',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + CONFIG.ACCESS_TOKEN },
    payload: JSON.stringify({ replyToken: replyToken, messages: messages }),
    muteHttpExceptions: true
  });
}

function logCouponIssue(userId, course) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.create('神埼鉄道_業務データ');
    let sheet = ss.getSheetByName(SHEET_COUPON_LOGS) || ss.insertSheet(SHEET_COUPON_LOGS);
    const timestamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
    sheet.appendRow([timestamp, userId, course.courseId, course.courseName, course.reward, 'キーワード受信']);
  } catch (err) {}
}

function saveOrderToSheet(order) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.create('神埼鉄道_業務データ');
    let sheet = ss.getSheetByName(SHEET_RESERVATIONS) || ss.insertSheet(SHEET_RESERVATIONS);
    const timestamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
    sheet.appendRow([timestamp, order.orderId || 'NZ-1000', order.lineUserId || '', order.trainName || '', order.carNo || '', order.seatNo || '', order.seatType || '', order.departureStation || '', order.arrivalStation || '', order.totalPrice || 0, '予約確定']);
    return true;
  } catch (e) { return false; }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}`;
                      navigator.clipboard.writeText(codeText);
                      setCopiedGasCode(true);
                      setTimeout(() => setCopiedGasCode(false), 3000);
                      showToast('GASコード（Code.gs）をクリップボードにコピーしました！');
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedGasCode ? 'コピー完了！' : 'コードを全選択コピー'}</span>
                  </button>
                </div>

                <div className="bg-[#12111E] p-3.5 rounded-2xl border border-gray-800 font-mono text-[11px] text-gray-300 leading-relaxed overflow-x-auto max-h-60 select-all">
                  <pre className="text-emerald-400">// gas/Code.gs (Google Apps Script)</pre>
                  <pre className="text-purple-300">const CONFIG = &#123;</pre>
                  <pre className="text-gray-300">  LINE_ACCESS_TOKEN: PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN'),</pre>
                  <pre className="text-gray-300">  LINE_REPLY_URL: 'https://api.line.me/v2/bot/message/reply',</pre>
                  <pre className="text-gray-300">  LOG_SHEET_NAME: 'クーポン発行ログ',</pre>
                  <pre className="text-amber-300">  COURSES: &#123;</pre>
                  <pre className="text-gray-300">    '初級クリア済み': &#123; couponCode: 'KZ-EASY-200', bonus: 200 &#125;,</pre>
                  <pre className="text-gray-300">    '中級クリア済み': &#123; couponCode: 'KZ-STEP-500', bonus: 500 &#125;,</pre>
                  <pre className="text-gray-300">    '上級クリア済み': &#123; couponCode: 'KZ-DEEP-1000', bonus: 1000 &#125;</pre>
                  <pre className="text-amber-300">  &#125;</pre>
                  <pre className="text-purple-300">&#125;;</pre>
                  <pre className="text-blue-300">function doPost(e) &#123; ... &#125;</pre>
                  <pre className="text-blue-300">function handleTextMessage(replyToken, userId, text) &#123; ... &#125;</pre>
                  <pre className="text-blue-300">function createCouponFlexMessage(course) &#123; ... &#125;</pre>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#2D2B42] px-5 py-3.5 border-t border-purple-900/40 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-gray-400">
                プロジェクト内 <code className="text-emerald-300">/gas/Code.gs</code> にも保存済みです
              </span>
              <button
                type="button"
                onClick={() => setShowGasCodeModal(false)}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs transition-all cursor-pointer"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
