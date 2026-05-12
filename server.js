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

async function getData() {

  const url =
    `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME}`;

  const response = await axios.get(url);

  return response.data;
}

app.get("/", (req, res) => {

  res.send(`

<!DOCTYPE html>

<html lang="vi">

<head>

<meta charset="UTF-8">

<title>Chatbot AI</title>

<style>

body{
  font-family: Arial;
  background:#f4f4f4;
  display:flex;
  justify-content:center;
  align-items:center;
  height:100vh;
}

.chat-container{
  width:400px;
  background:white;
  border-radius:15px;
  overflow:hidden;
  box-shadow:0 0 10px rgba(0,0,0,0.2);
}

.header{
  background:#4a90e2;
  color:white;
  padding:15px;
  font-size:20px;
  text-align:center;
}

.chat-box{
  height:400px;
  overflow-y:auto;
  padding:10px;
  background:#fafafa;
}

.message{
  margin:10px 0;
  padding:10px;
  border-radius:10px;
  max-width:80%;
}

.user{
  background:#4a90e2;
  color:white;
  margin-left:auto;
}

.bot{
  background:#e5e5ea;
}

.input-area{
  display:flex;
  border-top:1px solid #ddd;
}

input{
  flex:1;
  padding:15px;
  border:none;
  outline:none;
  font-size:16px;
}

button{
  width:80px;
  border:none;
  background:#4a90e2;
  color:white;
  font-size:16px;
  cursor:pointer;
}

button:hover{
  background:#357bd8;
}

.time{
  font-size:11px;
  opacity:0.7;
  margin-top:5px;
}

</style>

</head>

<body>

<div class="chat-container">

<div class="header">
  Chatbot AI
</div>

<div class="chat-box" id="chat"></div>

<div class="input-area">

  <input
    type="text"
    id="msg"
    placeholder="Nhập tin nhắn..."
  >

  <button onclick="send()">
    Gửi
  </button>

</div>

</div>

<script>

const input =
  document.getElementById("msg");

const chat =
  document.getElementById("chat");

input.addEventListener("keypress", function(event){

  if(event.key === "Enter"){
    send();
  }

});

function getTime(){

  const now = new Date();

  return now.getHours() + ":" +
         String(now.getMinutes()).padStart(2,"0");
}

function addMessage(text, type){

  const div =
    document.createElement("div");

  div.className =
    "message " + type;

  div.innerHTML =
    text +
    '<div class="time">' +
    getTime() +
    '</div>';

  chat.appendChild(div);

  chat.scrollTop =
    chat.scrollHeight;
}

async function send(){

  const msg = input.value.trim();

  if(!msg) return;

  addMessage(msg, "user");

  input.value = "";

  addMessage("Đang trả lời...", "bot");

  const loading =
    chat.lastChild;

  try{

    const res =
      await fetch("/chat", {

        method:"POST",

        headers:{
          "Content-Type":"application/json"
        },

        body:JSON.stringify({
          message:msg
        })

      });

    const data =
      await res.json();

    loading.remove();

    addMessage(data.reply, "bot");

  }catch(error){

    loading.remove();

    addMessage(
      "Lỗi kết nối server",
      "bot"
    );

  }

}

</script>

</body>

</html>

  `);

});

app.post("/chat", async (req, res) => {

  try {

    const userMessage =
      req.body.message;

    const data =
      await getData();

    const fuse = new Fuse(data, {

      keys: ["question"],

      threshold: 0.6,

      ignoreLocation: true,

      minMatchCharLength: 2

    });

    const result =
      fuse.search(userMessage);

    if (result.length > 0) {

      res.json({
        reply: result[0].item.answer
      });

    } else {

      res.json({
        reply:
          "Xin lỗi, tôi chưa hiểu."
      });

    }

  } catch (error) {

    console.log(error);

    res.json({
      reply: "Lỗi server"
    });

  }

});

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    "Bot đang chạy trên cổng " + PORT
  );

});