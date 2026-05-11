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

    const url = `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME}`;

    const response = await axios.get(url);

    return response.data;
}

app.get("/", (req, res) => {
    res.send("Chatbot đang hoạt động!");
});

app.get("/chat", async (req, res) => {

    const userMessage = req.query.message;

    const data = await getData();

    const fuse = new Fuse(data, {
        keys: ["question"],
        threshold: 0.4
    });

    const result = fuse.search(userMessage);

    if(result.length > 0){

        res.json({
            reply: result[0].item.answer
        });

    }else{

        res.json({
            reply: "Xin lỗi, tôi chưa hiểu."
        });

    }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Bot đang chạy trên cổng ${PORT}`);
});