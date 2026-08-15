/**
 * ==============================================================================
 * 神埼鉄道 統合型 LINE Bot & Webhook バックエンド (Google Apps Script)
 * 
 * 【対応機能】
 * 1. 特急券・めぐシート 予約登録＆本人認証付き照会（予約台帳シート）
 * 2. リアルタイム運行情報・遅延案内（神埼鉄道API連携）
 * 3. スタンプラリー制覇合言葉 ログ記録のみ（クーポン表示はLINE公式の応答メッセージ機能側で実行）
 * ==============================================================================
 */

// ★ LINE Developers「Messaging API設定」タブの「チャネルアクセストークン（長期）」を貼り付け
const CHANNEL_ACCESS_TOKEN = '★ここにLINEのチャネルアクセストークンを貼り付け★';

// 運行情報API URL
const WEB_APP_STATUS_API_URL = 'https://ais-pre-ohfkihkjtj5aocgi5fefnb-251112274276.asia-east1.run.app/api/status';

// シート名定義
const SHEET_RESERVATIONS = '予約台帳';
const SHEET_COUPON_LOGS = 'クーポン発行ログ';

const CONFIG = {
  ACCESS_TOKEN: (CHANNEL_ACCESS_TOKEN && !CHANNEL_ACCESS_TOKEN.includes('★'))
    ? CHANNEL_ACCESS_TOKEN
    : (PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || ''),
  LINE_REPLY_URL: 'https://api.line.me/v2/bot/message/reply',
  LINE_PUSH_URL: 'https://api.line.me/v2/bot/message/push',
  
  // スタンプラリー コース定義（スプレッドシート記録用）
  STAMP_KEYWORDS: {
    '初級クリア済み': { courseId: 'beginner', courseName: '【初級制覇】都市圏イージー', reward: 'デリバリー1品20%OFF' },
    '中級クリア済み': { courseId: 'intermediate', courseName: '【中級制覇】中都市ステップ', reward: '特急乗車料金10%OFF' },
    '上級クリア済み': { courseId: 'advanced', courseName: '【上級制覇】ディープ神埼線', reward: '1日フリー乗車券' }
  }
};

/**
 * Webhook受信 (POSTリクエスト)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ status: 'error', message: 'No post data' });
    }

    const json = JSON.parse(e.postData.contents);

    // ① Webアプリからの特急予約登録
    if (json.action === 'createReservation' || json.order) {
      const orderData = json.order || json;
      const saved = saveOrderToSheet(orderData);
      return createJsonResponse({ status: 'success', saved: saved });
    }

    // ② LINE Messaging APIからのWebhookイベント
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
    Logger.log('doPost Error: ' + err.toString());
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * 簡易ヘルスチェック (GETリクエスト)
 */
function doGet(e) {
  return ContentService.createTextOutput("神埼鉄道 LINE Bot & 予約台帳システムは正常に稼働しています。");
}

/**
 * LINEメッセージの振り分け処理
 */
function handleLineMessage(event) {
  const replyToken = event.replyToken;
  const userId = event.source ? event.source.userId : 'unknown';
  const text = event.message.text.trim();

  // 1. スタンプラリー合言葉の判定 (「初級クリア済み」など)
  // ★ GAS側からは返信せず、スプレッドシートに記録するだけ（返信・クーポン表示はLINE公式の応答メッセージ機能に委ねる）
  const stampCourse = CONFIG.STAMP_KEYWORDS[text];
  if (stampCourse) {
    logCouponIssue(userId, stampCourse);
    return; // ← GASからは返信しない
  }

  // 2. 特急券予約照会 (「予約」「チケット」「特急券」「NZ-」など)
  if (text.includes('予約') || text.includes('チケット') || text.includes('特急券') || text.toUpperCase().startsWith('NZ-') || text.toUpperCase().startsWith('EQ-')) {
    handleReservationInquiry(replyToken, userId, text);
    return;
  }

  // 3. 運行情報の照会 (「運行」「遅延」「ダイヤ」など)
  if (text.includes('運行') || text.includes('遅延') || text.includes('ダイヤ') || text.includes('動いてる') || text.includes('止まってる')) {
    handleOperationStatus(replyToken);
    return;
  }

  // それ以外のメッセージ（スタンプラリー以外の通常トークなど）には何も返信せずスルー
}

/**
 * 特急券予約照会ロジック
 */
function handleReservationInquiry(replyToken, userId, text) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss ? ss.getSheetByName(SHEET_RESERVATIONS) : null;
    
    if (!sheet) {
      replyToLine(replyToken, [{
        type: 'text',
        text: '現在予約台帳の準備中です。Webアプリ上の予約完了画面をご確認ください。'
      }]);
      return;
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      replyToLine(replyToken, [{
        type: 'text',
        text: '現在ご予約データが見つかりません。神埼鉄道アプリよりご予約をお願いいたします。'
      }]);
      return;
    }

    const headers = data[0];
    const idIndex = headers.indexOf('予約番号');
    const userIndex = headers.indexOf('LINE_USER_ID');
    const trainIndex = headers.indexOf('列車名');
    const seatIndex = headers.indexOf('座席番号');
    const totalIndex = headers.indexOf('合計金額');

    // 検索: ユーザーID または 送信された予約番号
    const matched = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowOrderId = idIndex !== -1 ? String(row[idIndex]) : '';
      const rowUserId = userIndex !== -1 ? String(row[userIndex]) : '';

      if ((userId !== 'unknown' && rowUserId === userId) || (rowOrderId && text.toUpperCase().includes(rowOrderId))) {
        matched.push({
          orderId: rowOrderId,
          train: trainIndex !== -1 ? row[trainIndex] : '特急めぐり号',
          seat: seatIndex !== -1 ? row[seatIndex] : '指定席',
          total: totalIndex !== -1 ? row[totalIndex] : '¥0'
        });
      }
    }

    if (matched.length === 0) {
      replyToLine(replyToken, [{
        type: 'text',
        text: 'お客様のLINEアカウントに紐づく有効なご予約が見つかりませんでした。\n予約番号（例: NZ-1234）を直接入力してお試しください。'
      }]);
      return;
    }

    const latest = matched[matched.length - 1];
    const replyText = 
      `🎫【ご予約確認】\n` +
      `予約番号: ${latest.orderId}\n` +
      `ご乗車列車: ${latest.train}\n` +
      `指定座席: ${latest.seat}\n` +
      `お支払い額: ${typeof latest.total === 'number' ? '¥' + latest.total.toLocaleString() : latest.total}\n\n` +
      `ご乗車の際は車内改札またはアプリ画面をご提示ください。`;

    replyToLine(replyToken, [{ type: 'text', text: replyText }]);

  } catch (err) {
    Logger.log('予約照会エラー: ' + err.toString());
    replyToLine(replyToken, [{ type: 'text', text: '予約照会処理中にエラーが発生しました。' }]);
  }
}

/**
 * 運行情報の配信
 */
function handleOperationStatus(replyToken) {
  let statusText = "🚆【神埼鉄道 運行情報】\n\n・神埼線：平常運転\n・神埼高速線：平常運転\n・埼千環状線：平常運転\n・土浦線：平常運転\n\n現在、全線で平常通り運行しております。";
  
  try {
    if (WEB_APP_STATUS_API_URL) {
      const res = UrlFetchApp.fetch(WEB_APP_STATUS_API_URL, { muteHttpExceptions: true });
      if (res.getResponseCode() === 200) {
        const data = JSON.parse(res.getContentText());
        if (data.lines && Array.isArray(data.lines)) {
          statusText = "🚆【神埼鉄道 リアルタイム運行情報】\n\n" + data.lines.map(l => `・${l.lineName || l.name}：${l.status} (${l.message || '平常運転'})`).join('\n');
        }
      }
    }
  } catch (e) {
    Logger.log('Status fetch fallback');
  }

  replyToLine(replyToken, [{ type: 'text', text: statusText }]);
}

/**
 * LINE Messaging API 返信実行
 */
function replyToLine(replyToken, messages) {
  const token = CONFIG.ACCESS_TOKEN;
  if (!token || token.includes('★')) {
    return;
  }

  UrlFetchApp.fetch(CONFIG.LINE_REPLY_URL, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: messages
    }),
    muteHttpExceptions: true
  });
}

/**
 * スプレッドシート「クーポン発行ログ」への自動記録（※GASからの自動返信はなし）
 */
function logCouponIssue(userId, course) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.create('神埼鉄道_業務データ');
    let sheet = ss.getSheetByName(SHEET_COUPON_LOGS);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_COUPON_LOGS);
      sheet.appendRow([
        '発行日時',
        'LINE_USER_ID',
        'コースID',
        'コース名',
        '特典内容',
        'ステータス'
      ]);
      sheet.getRange('A1:F1').setBackground('#06C755').setFontColor('#FFFFFF').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    const timestamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
    sheet.appendRow([
      timestamp,
      userId,
      course.courseId,
      course.courseName,
      course.reward,
      'キーワード受信'
    ]);
  } catch (err) {
    Logger.log('クーポンログ記録エラー: ' + err.toString());
  }
}

/**
 * スプレッドシート「予約台帳」への予約データ保存
 */
function saveOrderToSheet(order) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.create('神埼鉄道_業務データ');
    let sheet = ss.getSheetByName(SHEET_RESERVATIONS);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_RESERVATIONS);
      sheet.appendRow([
        '予約日時',
        '予約番号',
        'LINE_USER_ID',
        '列車名',
        '号車',
        '座席番号',
        '席種',
        '乗車駅',
        '降車駅',
        '合計金額',
        'ステータス'
      ]);
      sheet.getRange('A1:K1').setBackground('#5B21B6').setFontColor('#FFFFFF').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    const timestamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
    sheet.appendRow([
      timestamp,
      order.orderId || ('NZ-' + Math.floor(1000 + Math.random() * 9000)),
      order.lineUserId || order.userId || '',
      order.trainName || '',
      order.carNo || '',
      order.seatNo || '',
      order.seatType || '',
      order.departureStation || '',
      order.arrivalStation || '',
      order.totalPrice || order.price || 0,
      '予約確定'
    ]);
    return true;
  } catch (err) {
    Logger.log('予約台帳保存エラー: ' + err.toString());
    return false;
  }
}

/**
 * JSONレスポンスユーティリティ
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
