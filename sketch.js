// ======================================================
// 國小五年級「倍數與公倍數」選擇題測驗
// 題庫直接讀取 Google Drive 公開 CSV，不使用本機 questions.csv
// ======================================================

// Google Drive 檔案必須設定為「知道連結的任何人可檢視」
const DRIVE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR82lEY46dLxmBNqTatNE5DGLTahYFVyNeC51mnEn4hMc94Jb9Cjsh0uCk6fqWky0UfvYAliKlUMJ6S/pub?gid=408810059&single=true&output=csv";
const TOTAL_QUESTIONS = 5;
const POINTS_PER_QUESTION = 20;

// 固定欄位：question、optionA、optionB、optionC、optionD、answer
const REQUIRED_COLUMNS = [
  "question",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "answer"
];

// 題庫與測驗狀態
let questionBank = [];
let quizQuestions = [];
let isLoading = true;
let loadFailed = false;
let questionIndex = 0;
let score = 0;
let selectedIndex = -1;
let answered = false;
let finished = false;
let lastClickTime = 0;
let particles = [];

// ======================================================
// p5.js 初始化
// ======================================================

function setup() {
  // 建立全螢幕畫布，題庫在背景載入時仍可顯示讀取提示
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  textFont("LXGW WenKai TC");

  // 使用 p5.js loadTable() 讀取 Google Drive 直接下載網址
  loadTable(
    DRIVE_CSV_URL,
    "csv",
    "header",
    handleTableLoaded,
    handleTableLoadFailed
  );
}

// ======================================================
// 題庫載入與解析
// ======================================================

function handleTableLoaded(tableData) {
  try {
    // 清除第一欄可能存在的 UTF-8 BOM，並建立欄位索引
    const columns = tableData.columns.map((columnName) =>
      String(columnName).replace(/^\uFEFF/, "").trim()
    );
    const columnIndex = {};

    columns.forEach((columnName, index) => {
      columnIndex[columnName] = index;
    });

    // 缺少固定欄位時視為無效題庫
    const hasAllColumns = REQUIRED_COLUMNS.every((columnName) =>
      Object.prototype.hasOwnProperty.call(columnIndex, columnName)
    );

    if (!hasAllColumns || tableData.getRowCount() < TOTAL_QUESTIONS) {
      throw new Error("CSV 欄位或題目數量不正確");
    }

    const answerMap = { A: 0, B: 1, C: 2, D: 3 };
    const parsedQuestions = [];

    // 逐列解析固定欄位，並將答案 A/B/C/D 轉成 0/1/2/3
    for (const row of tableData.getRows()) {
      const questionText = row.getString(columnIndex.question).trim();
      const options = [
        row.getString(columnIndex.optionA).trim(),
        row.getString(columnIndex.optionB).trim(),
        row.getString(columnIndex.optionC).trim(),
        row.getString(columnIndex.optionD).trim()
      ];
      const answerText = row
        .getString(columnIndex.answer)
        .trim()
        .toUpperCase();

      if (!questionText || options.some((optionText) => !optionText)) {
        throw new Error("CSV 含有空白題目或選項");
      }

      if (!Object.prototype.hasOwnProperty.call(answerMap, answerText)) {
        throw new Error("answer 必須是 A、B、C 或 D");
      }

      parsedQuestions.push({
        question: questionText,
        options,
        answer: answerMap[answerText]
      });
    }

    questionBank = parsedQuestions;
    isLoading = false;

    // 第一次載入成功後，隨機抽出五題開始測驗
    startQuiz();
  } catch (error) {
    handleTableLoadFailed(error);
  }
}

function handleTableLoadFailed() {
  isLoading = false;
  loadFailed = true;
}

// ======================================================
// p5.js 主繪圖函式
// ======================================================

function draw() {
  background("#fefae0");

  if (isLoading) {
    drawMessage("正在從 Google 試算表讀取題庫……");
    return;
  }

  if (loadFailed) {
    drawMessage(
      "題庫讀取失敗，請確認 Google Drive 檔案已設為知道連結的任何人可檢視，且檔案內容為有效 CSV。"
    );
    return;
  }

  if (finished) {
    drawResult();
  } else {
    drawQuiz();
  }
}

// ======================================================
// 每次測驗隨機抽出不重複的五題
// ======================================================

function startQuiz() {
  // p5.js shuffle 的 true 參數會複製陣列，不會改變原始題庫
  quizQuestions = shuffle(questionBank, true).slice(0, TOTAL_QUESTIONS);

  questionIndex = 0;
  score = 0;
  selectedIndex = -1;
  answered = false;
  finished = false;
  particles = [];
}

// ======================================================
// 響應式版面計算
// ======================================================

function getLayout() {
  const contentWidth = min(width * 0.9, 900);
  const questionBoxY = constrain(height * 0.13, 92, 135);
  const questionBoxHeight = constrain(height * 0.15, 92, 135);
  const optionHeight = constrain(height * 0.075, 44, 76);
  const optionGap = constrain(height * 0.014, 8, 18);
  const optionTop = questionBoxY + questionBoxHeight + constrain(height * 0.035, 18, 32);

  return {
    left: (width - contentWidth) / 2,
    width: contentWidth,
    questionBoxY,
    questionBoxHeight,
    optionHeight,
    optionGap,
    optionTop
  };
}

// ======================================================
// 測驗畫面
// ======================================================

function drawQuiz() {
  const currentQuestion = quizQuestions[questionIndex];
  const layout = getLayout();

  // 顯示標題與題數
  fill("#273043");
  textSize(constrain(width * 0.035, 22, 40));
  text("倍數與公倍數小測驗", width / 2, 42);

  fill("#606c76");
  textSize(constrain(width * 0.018, 15, 22));
  text(
    `第 ${questionIndex + 1} 題 / 共 ${TOTAL_QUESTIONS} 題`,
    width / 2,
    80
  );

  // 題目使用 #fb8500 方框，與選項清楚區隔
  fill("#fb8500");
  noStroke();
  rect(
    layout.left,
    layout.questionBoxY,
    layout.width,
    layout.questionBoxHeight,
    18
  );

  fill("#ffffff");
  textSize(constrain(width * 0.027, 18, 32));
  drawWrappedText(
    currentQuestion.question,
    width / 2,
    layout.questionBoxY + layout.questionBoxHeight / 2,
    layout.width * 0.88,
    constrain(width * 0.034, 24, 36)
  );

  // 繪製四個選項
  currentQuestion.options.forEach((optionText, optionIndex) => {
    drawOption(optionText, optionIndex, layout);
  });

  if (answered) {
    const feedbackY =
      layout.optionTop +
      4 * (layout.optionHeight + layout.optionGap) +
      24;

    fill("#273043");
    textSize(constrain(width * 0.02, 16, 23));
    text(
      selectedIndex === currentQuestion.answer
        ? "答對了！做得很好！"
        : `答錯了，正確答案是「${currentQuestion.options[currentQuestion.answer]}」`,
      width / 2,
      feedbackY
    );

    const buttonWidth = min(layout.width * 0.55, 330);
    const buttonHeight = 56;
    const buttonLeft = width / 2 - buttonWidth / 2;
    const buttonTop = min(feedbackY + 30, height - buttonHeight - 12);

    drawButton(
      buttonLeft,
      buttonTop,
      buttonWidth,
      buttonHeight,
      questionIndex === TOTAL_QUESTIONS - 1 ? "查看成績" : "下一題"
    );
  }
}

// ======================================================
// 選項：答對上下跳、答錯左右移、顯示正確答案
// ======================================================

function drawOption(optionText, optionIndex, layout) {
  const currentQuestion = quizQuestions[questionIndex];
  const baseTop =
    layout.optionTop +
    optionIndex * (layout.optionHeight + layout.optionGap);

  let offsetX = 0;
  let offsetY = 0;
  let optionColor = "#ffffff";

  // 答對選項使用 #b9fbc0 並上下跳動
  if (
    answered &&
    selectedIndex === currentQuestion.answer &&
    optionIndex === selectedIndex
  ) {
    offsetY = sin(frameCount * 0.18) * 10;
    optionColor = "#b9fbc0";
  }

  // 答錯選項使用 #ef5d60 並左右移動
  if (
    answered &&
    selectedIndex !== currentQuestion.answer &&
    optionIndex === selectedIndex
  ) {
    offsetX = sin(frameCount * 0.35) * 12;
    optionColor = "#ef5d60";
  }

  // 答錯時，正確答案使用 #06d6a0 並上下跳動
  if (
    answered &&
    selectedIndex !== currentQuestion.answer &&
    optionIndex === currentQuestion.answer
  ) {
    offsetY = sin(frameCount * 0.18) * 10;
    optionColor = "#06d6a0";
  }

  // 尚未作答時提供滑鼠移入提示色
  if (
    !answered &&
    isInside(mouseX, mouseY, layout.left, baseTop, layout.width, layout.optionHeight)
  ) {
    optionColor = "#dbeafe";
  }

  fill(optionColor);
  noStroke();
  rect(
    layout.left + offsetX,
    baseTop + offsetY,
    layout.width,
    layout.optionHeight,
    14
  );

  // 選項文字也支援自動換行
  fill("#273043");
  textSize(constrain(width * 0.022, 16, 25));
  drawWrappedText(
    `${String.fromCharCode(65 + optionIndex)}. ${optionText}`,
    width / 2 + offsetX,
    baseTop + offsetY + layout.optionHeight / 2,
    layout.width * 0.88,
    constrain(width * 0.026, 20, 30)
  );
}

// ======================================================
// 一般按鈕
// ======================================================

function drawButton(buttonLeft, buttonTop, buttonWidth, buttonHeight, label) {
  const isHovering = isInside(
    mouseX,
    mouseY,
    buttonLeft,
    buttonTop,
    buttonWidth,
    buttonHeight
  );

  fill(isHovering ? "#1d3557" : "#457b9d");
  noStroke();
  rect(buttonLeft, buttonTop, buttonWidth, buttonHeight, 14);

  fill("#ffffff");
  textSize(constrain(width * 0.022, 17, 25));
  text(label, width / 2, buttonTop + buttonHeight / 2);
}

// ======================================================
// 結果頁：每題 20 分，答對三題以上顯示煙火
// ======================================================

function drawResult() {
  const finalScore = score * POINTS_PER_QUESTION;

  // score >= 3 代表 60 分以上，否則顯示加油粒子
  drawEffect(score >= 3);

  fill("#273043");
  textSize(constrain(width * 0.06, 30, 64));
  text("測驗完成！", width / 2, height * 0.22);

  textSize(constrain(width * 0.04, 24, 42));
  text(`答對題數：${score} / ${TOTAL_QUESTIONS}`, width / 2, height * 0.35);

  fill("#e76f51");
  textSize(constrain(width * 0.055, 30, 60));
  text(`總成績：${finalScore} 分`, width / 2, height * 0.47);

  fill("#273043");
  textSize(constrain(width * 0.025, 18, 28));
  text(
    score >= 3
      ? "太棒了！已達到 60 分以上！"
      : "再接再厲，多練習一定會進步！",
    width / 2,
    height * 0.58
  );

  const buttonWidth = min(width * 0.6, 340);
  const buttonHeight = 60;
  const buttonLeft = width / 2 - buttonWidth / 2;
  const buttonTop = height * 0.73;
  drawButton(buttonLeft, buttonTop, buttonWidth, buttonHeight, "重新測驗");
}

// ======================================================
// 煙火與加油粒子特效
// ======================================================

function drawEffect(isGoodScore) {
  if (frameCount % 12 === 0 && particles.length < 180) {
    if (isGoodScore) {
      createFirework();
    } else {
      createEncouragement();
    }
  }

  for (let particleIndex = particles.length - 1; particleIndex >= 0; particleIndex--) {
    const particle = particles[particleIndex];

    particle.x += particle.velocityX;
    particle.y += particle.velocityY;
    particle.velocityY += particle.gravity;
    particle.life -= 2;

    push();
    translate(particle.x, particle.y);
    fill(particle.color);
    noStroke();

    if (particle.type === "firework") {
      ellipse(0, 0, particle.size);
    } else {
      textSize(particle.size);
      text(particle.symbol, 0, 0);
    }

    pop();

    if (particle.life <= 0) {
      particles.splice(particleIndex, 1);
    }
  }
}

function createFirework() {
  const centerX = random(width * 0.15, width * 0.85);
  const centerY = random(height * 0.14, height * 0.48);
  const colors = ["#ff006e", "#8338ec", "#3a86ff", "#ffbe0b", "#fb5607"];

  for (let particleIndex = 0; particleIndex < 28; particleIndex++) {
    const angle = random(TWO_PI);
    const speed = random(2, 6);

    particles.push({
      x: centerX,
      y: centerY,
      velocityX: cos(angle) * speed,
      velocityY: sin(angle) * speed,
      gravity: 0.06,
      life: 100,
      size: random(4, 8),
      color: random(colors),
      type: "firework"
    });
  }
}

function createEncouragement() {
  const symbols = ["★", "♥", "加油！"];

  particles.push({
    x: random(width * 0.12, width * 0.88),
    y: height + 20,
    velocityX: random(-0.8, 0.8),
    velocityY: random(-2.5, -1.2),
    gravity: -0.005,
    life: 180,
    size: random(18, 32),
    color: random(["#ff006e", "#8338ec", "#3a86ff", "#ff8500"]),
    symbol: random(symbols),
    type: "encouragement"
  });
}

// ======================================================
// 滑鼠與觸控輸入
// ======================================================

function mousePressed() {
  handleClick(mouseX, mouseY);
  return false;
}

function touchStarted() {
  if (touches.length > 0) {
    handleClick(touches[0].x, touches[0].y);
  }
  return false;
}

function handleClick(clickX, clickY) {
  // 防止同一次觸控同時觸發 touch 與 mouse 事件
  const now = millis();
  if (lastClickTime > 0 && now - lastClickTime < 300) {
    return;
  }
  lastClickTime = now;

  if (isLoading || loadFailed || quizQuestions.length < TOTAL_QUESTIONS) {
    return;
  }

  // 結果頁：重新抽取五題
  if (finished) {
    const buttonWidth = min(width * 0.6, 340);
    const buttonHeight = 60;
    const buttonLeft = width / 2 - buttonWidth / 2;
    const buttonTop = height * 0.73;

    if (
      isInside(
        clickX,
        clickY,
        buttonLeft,
        buttonTop,
        buttonWidth,
        buttonHeight
      )
    ) {
      startQuiz();
    }
    return;
  }

  const currentQuestion = quizQuestions[questionIndex];
  const layout = getLayout();

  // 尚未作答時，只允許選擇一次，避免重複計分
  if (!answered) {
    for (let optionIndex = 0; optionIndex < 4; optionIndex++) {
      const optionTop =
        layout.optionTop +
        optionIndex * (layout.optionHeight + layout.optionGap);

      if (
        isInside(
          clickX,
          clickY,
          layout.left,
          optionTop,
          layout.width,
          layout.optionHeight
        )
      ) {
        selectedIndex = optionIndex;
        answered = true;

        if (selectedIndex === currentQuestion.answer) {
          score++;
        }
        return;
      }
    }
  }

  // 已作答後，點擊下一題或查看成績
  if (answered) {
    const feedbackY =
      layout.optionTop +
      4 * (layout.optionHeight + layout.optionGap) +
      24;
    const buttonWidth = min(layout.width * 0.55, 330);
    const buttonHeight = 56;
    const buttonLeft = width / 2 - buttonWidth / 2;
    const buttonTop = min(feedbackY + 30, height - buttonHeight - 12);

    if (
      isInside(
        clickX,
        clickY,
        buttonLeft,
        buttonTop,
        buttonWidth,
        buttonHeight
      )
    ) {
      if (questionIndex === TOTAL_QUESTIONS - 1) {
        finished = true;
      } else {
        questionIndex++;
        selectedIndex = -1;
        answered = false;
      }
    }
  }
}

// ======================================================
// 共用工具
// ======================================================

function isInside(pointX, pointY, rectX, rectY, rectWidth, rectHeight) {
  return (
    pointX >= rectX &&
    pointX <= rectX + rectWidth &&
    pointY >= rectY &&
    pointY <= rectY + rectHeight
  );
}

function drawMessage(message) {
  fill("#273043");
  textSize(constrain(width * 0.035, 18, 30));
  drawWrappedText(message, width / 2, height / 2, width * 0.86, 38);
}

// 中文逐字換行，題目與選項過長時仍能完整顯示
function drawWrappedText(message, centerX, centerY, maxWidth, lineHeight) {
  const lines = [];
  let currentLine = "";

  for (const character of String(message)) {
    const testLine = currentLine + character;

    if (textWidth(testLine) > maxWidth && currentLine !== "") {
      lines.push(currentLine);
      currentLine = character;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine !== "") {
    lines.push(currentLine);
  }

  lines.forEach((line, lineIndex) => {
    text(
      line,
      centerX,
      centerY - ((lines.length - 1) * lineHeight) / 2 + lineIndex * lineHeight
    );
  });
}

// 視窗縮放時同步調整畫布
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
