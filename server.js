const express = require("express");
const axios = require("axios");
const cors = require("cors");
const Fuse = require("fuse.js");

const app = express();

app.use(cors());
app.use(express.json());

const SHEET_ID = "1Af13VPgO-vr_DOeJ-7nBJh9wDBb9PHY-ls9dez2piG4";
const SHEET_NAME = "Sheet1";

async function getData() {

  const url =
    `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME}`;

  const response = await axios.get(url);

  return response.data;
}

app.get("/", (req, res) => {

  res.send(`
    <html>
      <body>

        <h2>Chatbot AI</h2>

        <input id="msg" />
        <button onclick="send()">Gửi</button>

        <div id="chat"></div>

        <script>

          async function send() {

            const msg =
              document.getElementById("msg").value;

            const res = await fetch("/chat", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                message: msg
              })
            });

            const data = await res.json();

            document.getElementById("chat").innerHTML +=
              "<p><b>Bạn:</b> " + msg + "</p>" +
              "<p><b>Bot:</b> " + data.reply + "</p>";
          }

        </script>

      </body>
    </html>
  `);

});

app.post("/chat", async (req, res) => {

  try {

    const userMessage = req.body.message;

    const data = await getData();

    const fuse = new Fuse(data, {
      keys: ["question"],
      threshold: 0.4
    });

    const result = fuse.search(userMessage);

    if (result.length > 0) {

      res.json({
        reply: result[0].item.answer
      });

    } else {

      res.json({
        reply: "Xin lỗi, tôi chưa hiểu."
      });

    }

  } catch (error) {

    console.log(error);

    res.json({
      reply: "Lỗi server"
    });

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Bot đang chạy trên cổng ${PORT}`);
});