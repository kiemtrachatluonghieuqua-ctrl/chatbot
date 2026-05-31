
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const Fuse = require("fuse.js");

const app = express();

app.use(cors());
app.use(express.json());

const SHEET_ID =
  "1Af13VPgO-vr_DOeJ-7nBJh9wDBb9PHY-ls9dez2piG4";

const SHEET_NAME = "Sheet1";

// =========================
// LẤY DỮ LIỆU TỪ GOOGLE SHEET
// =========================
async function getData() {
  const url =
    `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME}`;

  const response = await axios.get(url);

  return response.data;
}

// =========================
// TẠO CÂU TRẢ LỜI
// =========================
function buildReply(item) {
  let reply = item.answer || "";

  if (item.related) {
    const related = item.related
      .split(";")
      .map(x => x.trim())
      .filter(Boolean);

    if (related.length > 0) {
      reply +=
        "<br><br><b>Có thể bạn muốn hỏi thêm:</b><br>";

      related.forEach(q => {
        reply += `• ${q}<br>`;
      });
    }
  }

  return reply;
}

// =========================
// TRANG CHỦ
// =========================
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// =========================
// CHAT API
// =========================
app.post("/chat", async (req, res) => {
  try {

    const userMessage =
      String(req.body.message || "").trim();

    console.log("USER INPUT:", userMessage);

    const data = await getData();

    // =========================
    // DEBUG LOG
    // =========================
    console.log("TOTAL ROWS:", data.length);

    // =========================
    // TRA CỨU HS CODE CHÍNH XÁC
    // =========================
    const isHSCode =
      /^\d{6,12}$/.test(userMessage);

    if (isHSCode) {

      const exactHS = data.find(item => {

        const question =
          String(item.question || "").trim();

        return question === userMessage;

      });

      if (exactHS) {

        console.log(
          "HS FOUND:",
          userMessage
        );

        return res.json({
          reply: buildReply(exactHS)
        });

      }

      console.log(
        "HS NOT FOUND:",
        userMessage
      );

      return res.json({
        reply:
          `HS code ${userMessage} không thuộc diện kiểm tra chất lượng.`
      });

    }

    // =========================
    // TÌM CÂU HỎI CHÍNH XÁC
    // =========================
    const exactQuestion =
      data.find(item =>
        String(item.question || "")
          .trim()
          .toLowerCase() ===
        userMessage.toLowerCase()
      );

    if (exactQuestion) {

      return res.json({
        reply: buildReply(exactQuestion)
      });

    }

    // =========================
    // LOẠI HS CODE KHỎI FUSE
    // =========================
    const searchData =
      data.filter(item => {

        const question =
          String(item.question || "").trim();

        return !/^\d{6,12}$/.test(question);

      });

    // =========================
    // CHUẨN BỊ KEYWORDS
    // =========================
    const preparedData =
      searchData.map(item => ({

        ...item,

        keywords: [
          item.question || "",
          item.node || ""
        ].join(" ")

      }));

    // =========================
    // FUSE SEARCH
    // =========================
    const fuse = new Fuse(
      preparedData,
      {
        keys: [
          {
            name: "question",
            weight: 0.7
          },
          {
            name: "keywords",
            weight: 0.3
          }
        ],

        threshold: 0.3,
        ignoreLocation: true,
        includeScore: true,
        minMatchCharLength: 2
      }
    );

    const results =
      fuse.search(userMessage);

    if (
      results.length > 0 &&
      results[0].score < 0.4
    ) {

      return res.json({
        reply:
          buildReply(results[0].item)
      });

    }

    // =========================
    // KHÔNG TÌM THẤY
    // =========================
    return res.json({
      reply:
        "Xin lỗi, tôi chưa tìm thấy thông tin phù hợp."
    });

  } catch (error) {

    console.error(error);

    return res.json({
      reply:
        "Lỗi server, vui lòng thử lại."
    });

  }
});

// =========================
// START SERVER
// =========================
const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `Server đang chạy tại cổng ${PORT}`
  );

});