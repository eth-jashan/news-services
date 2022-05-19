const express = require("express");

const { create } = require("ipfs-http-client");

const { getEnv } = require("./utils/env_helper");
var cors = require("cors");

const router = express.Router();

const app = express();
const port = 3000;

router.post("/meta-ipfs", cors(), async (req, res) => {
  const ipfs = await create({
    host: "ipfs.infura.io",
    port: 5001,
    protocol: "https",
  });
  const { headline, lead, date, author, content, conclusion } = req.body;

  const data = {
    headline,
    lead,
    date,
    author,
    content,
    conclusion,
  };

  try {
    const results = await ipfs.add(JSON.stringify(data));
    if (results.path) {
      res
        .status(200)
        .send({ url_link: `https://ipfs.infura.io/ipfs/${results.path}` });
    }
  } catch (error) {
    res.status(500).send(error.toString());
    console.log(error);
  }
});

app.use(express.json());
app.use(cors());

app.use("/", router);

app.listen(port, () => {
  console.log(`Ipfs Uploader listening on port ${port}`);
});
