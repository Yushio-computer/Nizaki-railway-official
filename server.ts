import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// CORSヘッダー設定（GASや外部サイト・アプリからのAPI取得を許可）
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// 擬似的なリアルタイム運行状態生成関数
function getLiveTrainStatus() {
  const now = new Date();
  const timeStr = now.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // 分数値に基づいて決定論的かつ時間によって変化する乱数遅延シミュレーション
  const currentMinute = now.getMinutes();
  
  // デフォルト路線データ
  const lines = [
    {
      id: "kanzaki",
      lineName: "神埼線",
      code: "Y",
      status: "平常運転",
      delayMinutes: 0,
      message: "現在、全線でほぼ平常通り運転しております。",
    },
    {
      id: "kanzaki_kosoku",
      lineName: "神埼高速線",
      code: "NI",
      status: "平常運転",
      delayMinutes: 0,
      message: "現在、全線でほぼ平常通り運転しております。",
    },
    {
      id: "saichi",
      lineName: "埼千環状線",
      code: "SC",
      status: "平常運転",
      delayMinutes: 0,
      message: "現在、全線でほぼ平常通り運転しております。",
    },
    {
      id: "tsuchiura",
      lineName: "土浦線",
      code: "TC",
      status: "平常運転",
      delayMinutes: 0,
      message: "現在、全線でほぼ平常通り運転しております。",
    },
  ];

  // シミュレーションルール:
  // - 10分〜20分の間: 埼千環状線で最大10分の遅延
  // - 35分〜45分の間: 神埼線で約5分の遅延
  // - それ以外: 全線平常運転
  let hasDelay = false;
  let summary = "現在、神埼鉄道グループ全線でほぼ平常通り運転しております。";

  if (currentMinute >= 10 && currentMinute < 20) {
    lines[2].status = "一部遅延";
    lines[2].delayMinutes = 10;
    lines[2].message = "強風の影響により、大宮〜池袋間で最大約10分の遅延が発生しております。";
    hasDelay = true;
    summary = "【遅延情報】埼千環状線で最大約10分の遅延が発生しております。";
  } else if (currentMinute >= 35 && currentMinute < 45) {
    lines[0].status = "一部遅延";
    lines[0].delayMinutes = 5;
    lines[0].message = "混雑および安全確認の影響により、北千住〜大宮間で最大約5分の遅延が発生しております。";
    hasDelay = true;
    summary = "【遅延情報】神埼線で最大約5分の遅延が発生しております。";
  }

  return {
    updatedAt: timeStr,
    hasDelay,
    summary,
    lines,
  };
}

// 予約データストレージ（メモリ内マップ + デフォルト予約）
const ordersMap: Record<string, any> = {
  "EQ-84920": {
    orderId: "EQ-84920",
    trainName: "特急あやみ 101号",
    carNo: 4,
    seatNo: "12A",
    seatType: "standard",
    boardingStation: "松戸駅",
    destinationStation: "日立駅",
    departureTime: "09:00",
    arrivalTime: "09:48",
    totalPrice: 1900,
    status: "confirmed",
  },
};
let latestOrderId = "EQ-84920";

// 1. 運行状態公開API (/api/status)
app.get("/api/status", (req, res) => {
  const status = getLiveTrainStatus();
  res.json(status);
});

// 2. 特急券予約情報API (/api/reservation)
app.get("/api/reservation", (req, res) => {
  const rawCode = (req.query.code as string || "").trim();
  const queryCode = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // コード指定がある場合は検索
  if (queryCode) {
    // 1. 完全一致・部分一致で探す
    const matchedKey = Object.keys(ordersMap).find((k) => {
      const cleanKey = k.toUpperCase().replace(/[^A-Z0-9]/g, "");
      return cleanKey === queryCode || cleanKey.includes(queryCode) || queryCode.includes(cleanKey);
    });

    if (matchedKey && ordersMap[matchedKey]) {
      return res.json({
        hasReservation: true,
        order: ordersMap[matchedKey],
      });
    }

    return res.json({
      hasReservation: false,
      message: `予約番号「${rawCode}」に該当する特急券は見つかりませんでした。`,
    });
  }

  // コード指定がない場合は最新の予約を返却
  const latestOrder = ordersMap[latestOrderId] || Object.values(ordersMap).slice(-1)[0] || null;
  if (latestOrder) {
    return res.json({
      hasReservation: true,
      order: latestOrder,
    });
  }

  res.json({
    hasReservation: false,
    message: "現在、有効な特急券の予約はありません。",
  });
});

app.post("/api/reservation", (req, res) => {
  const order = req.body?.order;
  if (order && order.orderId) {
    ordersMap[order.orderId] = order;
    latestOrderId = order.orderId;
    return res.json({ status: "ok", message: "Reservation saved", order });
  }

  // キャンセルリクエストの場合
  if (req.body?.cancelOrderId) {
    delete ordersMap[req.body.cancelOrderId];
    return res.json({ status: "ok", message: "Reservation cancelled" });
  }

  res.json({ status: "ignored", message: "No valid order provided" });
});

// ヘルスチェックAPI
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
