const { readFile } = require("fs").promises;
const express = require("express");

const app = express();


app.get("/", async (request, response) => {
  try {
    const html = await readFile("./index.html", "utf8");
    response.send(html);
  } catch (err) {
    response.status(500).send("An error occurred on this server");
  }
});

app.get("/data/:id", async (request, response) => {
  try {
    const id = +request.params.id;

    const data = await readFile("./data.json");
    const jsonData = JSON.parse(data.toString());

    const item = jsonData.find(item => item.id === id);
    if (item) {
      response.send(JSON.stringify(item));
    } else {
      response.status(404).send("Item not found");
    }
  } catch (err) {
    response.status(500).send("An error occurred on this server");
    console.error(err)
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log("App running on http://localhost:3000")
);
