import React, { useState } from 'react';
import { ShoppingBag, Calendar } from 'lucide-react';
import { PhoneContainer } from './components/PhoneContainer';
import { Header } from './components/Header';
import { StatusCard } from './components/StatusCard';
import { MyStationCard } from './components/MyStationCard';
import { MyStationRegisterCard, RegisterableStation } from './components/MyStationRegisterCard';
import { EDeliveryCard } from './components/EDeliveryCard';
import { FooterNav } from './components/FooterNav';
import { TrainLocationTab } from './components/TrainLocationTab';
import { ReservationTab } from './components/ReservationTab';
import { EquipTab } from './components/EquipTab';
import { EventsTab } from './components/EventsTab';
import { SettingsTab } from './components/SettingsTab';
import { EDeliveryModal } from './components/EDeliveryModal';
import { NPointModal } from './components/NPointModal';
import { RouteMapModal } from './components/RouteMapModal';
import { QRCodeModal } from './components/QRCodeModal';
import { StationTimetableModal } from './components/StationTimetableModal';
import { MOCK_LINES, MOCK_STATIONS, MOCK_EQUIP_ITEMS, MOCK_LIVE_TRAINS } from './data/mockData';
import { TabType, Station, ActiveOrder, DepartureInfo, EquipItem, PointHistoryItem } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [currentStation, setCurrentStation] = useState<Station>(MOCK_STATIONS[0]); // 松戸駅
  const [headerStationName, setHeaderStationName] = useState<string>('松戸');
  const [headerPlatform, setHeaderPlatform] = useState<1 | 2>(1);
  const [nPointBalance, setNPointBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('kanzaki_npoint_balance');
      if (saved !== null) {
        return parseInt(saved, 10);
      }
    } catch (e) {}
    return 0;
  });

  const [pointHistory, setPointHistory] = useState<PointHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('kanzaki_npoint_history');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return [];
  });

  // Sync points and history to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem('kanzaki_npoint_balance', nPointBalance.toString());
      localStorage.setItem('kanzaki_npoint_history', JSON.stringify(pointHistory));
    } catch (e) {}
  }, [nPointBalance, pointHistory]);

  const addPoints = (points: number, title?: string, type: 'reservation' | 'stamp' | 'coupon' | 'equip' = 'reservation') => {
    setNPointBalance((prev) => prev + points);
    const nowStr = new Date().toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const newHistoryItem: PointHistoryItem = {
      id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title || 'ポイント獲得',
      date: nowStr,
      points,
      type,
    };
    setPointHistory((prev) => [newHistoryItem, ...prev].slice(0, 30));
  };
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(() => {
    try {
      const saved = localStorage.getItem('kanzaki_active_order');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse saved active order:', e);
    }
    return {
      orderId: 'EQ-84920',
      trainName: '特急あやみ 101号',
      carNo: 4,
      seatNo: '12A',
      seatType: 'standard',
      boardingStation: '松戸駅',
      destinationStation: '日立駅',
      departureTime: '09:00',
      arrivalTime: '09:48',
      items: [],
      totalPrice: 1900,
      status: 'confirmed',
      estimatedDeliveryTime: '松戸駅発車後 5分頃',
      deliveryStation: '松戸駅',
    };
  });

  // Registered My Stations state (Max 3, Default: Tokyo)
  const [registeredStations, setRegisteredStations] = useState<RegisterableStation[]>([
    { id: 'kanzaki_Y01', name: '東京', code: 'Y01', lineName: '1. 神埼線' },
  ]);

  // Modals state
  const [isEDeliveryModalOpen, setIsEDeliveryModalOpen] = useState(false);
  const [isNPointModalOpen, setIsNPointModalOpen] = useState(false);
  const [isRouteMapModalOpen, setIsRouteMapModalOpen] = useState(false);
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false);
  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);
  const [timetableModalStation, setTimetableModalStation] = useState<string>('松戸');
  const [timetableModalDirection, setTimetableModalDirection] = useState<1 | 2>(1);
  const [selectedCart, setSelectedCart] = useState<{ [key: string]: number }>({});

  const handleOpenTimetable = (stationName?: string, direction?: 1 | 2) => {
    if (stationName) {
      setTimetableModalStation(stationName);
    }
    if (direction) {
      setTimetableModalDirection(direction);
    }
    setIsTimetableModalOpen(true);
  };

  // 予約状態が更新されたらローカルストレージとサーバー（/api/reservation）に同期
  React.useEffect(() => {
    if (activeOrder) {
      try {
        localStorage.setItem('kanzaki_active_order', JSON.stringify(activeOrder));
      } catch (e) {
        console.warn('localStorage save failed:', e);
      }

      fetch('/api/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: activeOrder }),
      }).catch((err) => console.error('Failed to sync reservation:', err));
    }
  }, [activeOrder]);

  const handleConfirmOrder = (order: ActiveOrder) => {
    let nextOrder: ActiveOrder = order;

    setActiveOrder((prevOrder) => {
      if (!prevOrder) {
        nextOrder = order;
        return order;
      }

      // 既存の購入済みアイテムと今回追加した注文アイテムを統合（マージ）
      const itemMap = new Map<string, { item: EquipItem; quantity: number }>();

      // 1. 既存アイテムをセット
      (prevOrder.items || []).forEach((ci) => {
        itemMap.set(ci.item.id, { item: ci.item, quantity: ci.quantity });
      });

      // 2. 新しいアイテムを加算
      (order.items || []).forEach((ci) => {
        const existing = itemMap.get(ci.item.id);
        if (existing) {
          itemMap.set(ci.item.id, { item: ci.item, quantity: existing.quantity + ci.quantity });
        } else {
          itemMap.set(ci.item.id, { item: ci.item, quantity: ci.quantity });
        }
      });

      const mergedItems = Array.from(itemMap.values());
      const mergedItemTotalPrice = mergedItems.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0);

      // 基本運賃・特急料金
      const baseTicketFee = prevOrder.totalPrice - (prevOrder.items || []).reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0);

      nextOrder = {
        ...prevOrder,
        orderId: order.orderId || prevOrder.orderId,
        items: mergedItems,
        totalPrice: baseTicketFee + mergedItemTotalPrice,
      };

      return nextOrder;
    });

    // サーバーへ即時送信
    fetch('/api/reservation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: nextOrder }),
    }).catch((err) => console.error('Immediate sync failed:', err));

    // 特急券・注文金額に応じた N-POINT 還元 (合計金額の3% 還元、最低50pt)
    const earnedPoints = Math.max(50, Math.floor((order.totalPrice || 2000) * 0.03));
    const trainTitle = order.trainName ? `${order.trainName} 乗車・デリバリー利用` : '特急列車予約・車内デリバリー利用';
    addPoints(earnedPoints, trainTitle, 'reservation');
    setSelectedCart({}); // 購入確定後にカートを空にする
  };

  const handleCancelOrder = () => {
    const cancelId = activeOrder?.orderId;
    setActiveOrder(null);
    try {
      localStorage.removeItem('kanzaki_active_order');
    } catch (e) {}

    if (cancelId) {
      fetch('/api/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelOrderId: cancelId }),
      }).catch((err) => console.error('Cancel sync failed:', err));
    }
  };

  const handleBookMeguriSeat = (departure: DepartureInfo) => {
    setIsEDeliveryModalOpen(true);
  };

  return (
    <PhoneContainer>
      {/* 1. Header */}
      <Header
        nPointBalance={nPointBalance}
        onOpenNPointModal={() => setIsNPointModalOpen(true)}
        onOpenRouteMapModal={() => setIsRouteMapModalOpen(true)}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        currentStationName={headerStationName}
        currentPlatform={headerPlatform}
      />

      {/* Main Responsive View Container */}
      <main className="flex-1 w-full bg-[#F4F3F8] text-[#221C35] overflow-y-auto">
        {activeTab === 'home' && (
          <div className="max-w-md mx-auto px-4 py-4 pb-24 space-y-3.5 animate-fadeIn">
            {/* 1. Top Operation Status Area (運行情報) */}
            <StatusCard
              lines={MOCK_LINES}
              onOpenRouteMap={() => setActiveTab('location')}
            />

            {/* 2. Main Departure Info Card (発車案内カード) */}
            <MyStationCard
              registeredStations={registeredStations}
              onUpdateRegisteredStations={setRegisteredStations}
              onActiveStationChange={(name, plat) => {
                setHeaderStationName(name);
                setHeaderPlatform(plat);
              }}
              onOpenTimetable={handleOpenTimetable}
            />

            {/* 3. Bottom Single Button: Brand Deep Purple Delivery Order Button */}
            <div className="pt-2">
              <button
                onClick={() => setIsEDeliveryModalOpen(true)}
                className="w-full py-3.5 px-6 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-white" />
                <span>デリバリー注文</span>
              </button>
            </div>

            {/* 4. マイ駅登録 (設置: デリバリー注文の下) */}
            <MyStationRegisterCard
              registeredStations={registeredStations}
              onUpdateRegisteredStations={setRegisteredStations}
            />
          </div>
        )}

        {/* Tab 2: 列車位置 */}
        {activeTab === 'location' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12">
            <TrainLocationTab onOpenTimetable={handleOpenTimetable} />
          </div>
        )}

        {/* Tab 3: 予約 */}
        {activeTab === 'reservation' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12">
            <ReservationTab
              activeOrder={activeOrder}
              onOpenEDeliveryModal={() => setIsEDeliveryModalOpen(true)}
              onConfirmOrder={handleConfirmOrder}
              onCancelOrder={handleCancelOrder}
            />
          </div>
        )}

        {/* Tab 4: エキップ (E-DELIVERY) */}
        {activeTab === 'equip' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12">
            <EquipTab
              items={MOCK_EQUIP_ITEMS}
              cart={selectedCart}
              onUpdateCart={setSelectedCart}
              activeOrder={activeOrder}
              onOpenBookingModal={(initialCart) => {
                if (initialCart) setSelectedCart(initialCart);
                setIsEDeliveryModalOpen(true);
              }}
            />
          </div>
        )}

        {/* Tab 5: イベント */}
        {activeTab === 'events' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12">
            {/* 準備中オーバーレイ（解除時はこのブロックを false にするか削除するだけです） */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#5B21B6] flex items-center justify-center">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="space-y-2 max-w-sm">
                <h3 className="text-xl font-black text-[#221C35]">イベント準備中</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  現在、新しいイベントを企画・準備しております。公開まで今しばらくお待ちください。
                </p>
              </div>
            </div>

            {/* 既存のEventsTabコードは触らずそのまま保持（非表示中） */}
            <div className="hidden">
              <EventsTab
                onAddNPoints={(points, title, type) => addPoints(points, title, type || 'stamp')}
              />
            </div>
          </div>
        )}

        {/* Tab 6: 設定 */}
        {activeTab === 'settings' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12">
            <SettingsTab
              nPointBalance={nPointBalance}
              registeredStations={registeredStations}
              onUpdateRegisteredStations={setRegisteredStations}
              onOpenNPointModal={() => setIsNPointModalOpen(true)}
              activeOrder={activeOrder}
            />
          </div>
        )}
      </main>

      {/* 5. フッターナビゲーション（タブバー: ホーム, 列車位置, 予約, エキップ, 設定） */}
      <FooterNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        hasActiveOrder={!!activeOrder}
      />

      {/* Interactive Modals */}
      <EDeliveryModal
        isOpen={isEDeliveryModalOpen}
        onClose={() => setIsEDeliveryModalOpen(false)}
        equipItems={MOCK_EQUIP_ITEMS}
        onConfirmOrder={handleConfirmOrder}
        initialCart={selectedCart}
        activeOrder={activeOrder}
      />

      <NPointModal
        isOpen={isNPointModalOpen}
        onClose={() => setIsNPointModalOpen(false)}
        balance={nPointBalance}
        pointHistory={pointHistory}
      />

      <RouteMapModal
        isOpen={isRouteMapModalOpen}
        onClose={() => setIsRouteMapModalOpen(false)}
      />

      <QRCodeModal
        isOpen={isQRCodeModalOpen}
        onClose={() => setIsQRCodeModalOpen(false)}
        activeOrder={activeOrder}
      />

      <StationTimetableModal
        isOpen={isTimetableModalOpen}
        onClose={() => setIsTimetableModalOpen(false)}
        initialStationName={timetableModalStation}
        initialDirection={timetableModalDirection}
      />
    </PhoneContainer>
  );
}
