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
// CHUẨN HÓA TIẾNG VIỆT
// =========================
function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim();
}

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

    console.log(
      "TOTAL ROWS:",
      data.length
    );

    // =========================
    // TRA CỨU HS CODE CHÍNH XÁC
    // =========================
    const isHSCode =
      /^\d{6,12}$/.test(userMessage);

    if (isHSCode) {

      const exactHS =
        data.find(item => {

          const question =
            String(item.question || "")
              .trim();

          return question === userMessage;

        });

      if (exactHS) {

        console.log(
          "HS FOUND:",
          userMessage
        );

        return res.json({
          reply:
            buildReply(exactHS)
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
    // TÌM KIẾM CHÍNH XÁC CÂU HỎI
    // =========================
    const exactQuestion =
      data.find(item => {

        return (
          normalizeText(item.question) ===
          normalizeText(userMessage)
        );

      });

    if (exactQuestion) {

      return res.json({
        reply:
          buildReply(exactQuestion)
      });

    }

    // =========================
    // LOẠI BỎ HS CODE KHỎI FUSE
    // =========================
    const searchData =
      data.filter(item => {

        const question =
          String(item.question || "")
            .trim();

        return !/^\d{6,12}$/.test(question);

      });

    // =========================
    // CHUẨN HÓA DỮ LIỆU
    // =========================
    const preparedData =
      searchData.map(item => ({

        ...item,

        normalizedQuestion:
          normalizeText(
            item.question
          ),

        keywords:
          normalizeText(
            [
              item.question || "",
              item.node || "",
              item.answer || ""
            ].join(" ")
          )

      }));

    // =========================
    // FUSE SEARCH
    // =========================
    const fuse = new Fuse(
      preparedData,
      {
        keys: [
          {
            name:
              "normalizedQuestion",
            weight: 0.8
          },
          {
            name:
              "keywords",
            weight: 0.2
          }
        ],

        threshold: 0.45,
        ignoreLocation: true,
        includeScore: true,
        minMatchCharLength: 2
      }
    );

    const results =
      fuse.search(
        normalizeText(
          userMessage
        )
      );

    console.log(
      "FUSE RESULTS:",
      results.slice(0, 3)
    );

    if (
      results.length > 0 &&
      results[0].score < 0.5
    ) {

      return res.json({
        reply:
          buildReply(
            results[0].item
          )
      });

    }

    // =========================
    // GỢI Ý 3 CÂU HỎI GẦN NHẤT
    // =========================
    if (results.length > 0) {

      const suggestions =
        results
          .slice(0, 3)
          .map(
            r => `• ${r.item.question}`
          )
          .join("<br>");

      return res.json({
        reply:
          `Tôi chưa tìm thấy câu trả lời chính xác.<br><br><b>Có thể bạn muốn hỏi:</b><br>${suggestions}`
      });

    }

    // =========================
    // KHÔNG TÌM THẤY GÌ
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