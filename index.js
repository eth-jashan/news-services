const express = require('express')
const nodeHtmlToImage = require("node-html-to-image");
const { create } = require("ipfs-http-client");
const font2base64 = require("node-font2base64");
const { getEnv } = require("./utils/env_helper");
var cors = require('cors')
const { default: axios } = require('axios');
const { INTERNAL_TOKEN } = require('./utils/dev_config');
const router = express.Router();



const telegraf = font2base64.encodeToDataUrlSync(
  "./fonts/PPTelegraf-Medium.otf"
);
const sfMono = font2base64.encodeToDataUrlSync("./fonts/SF-Mono-Medium.otf");


const app = express()
const port = 3001

const ipfsUploadTask = async(contribution_meta_array, ipfs, env) => {
  let options = {
    warpWithDirectory: false,
    progress: (prog) => console.log(`Saved :${prog}`),
  };

  contribution_meta_array.map(async(x, i)=>{
    try {
      const image = await nodeHtmlToImage({
        html: `
            <html>
            <style>
            body {
              width: 700px;
              height: 700px;
            }
            @font-face {
              font-family: 'SFMono';
              src: url(${sfMono}) format('opentype'); // don't forget the format!
            }
            @font-face {
              font-family: 'TelegrafMedium';
              src: url(${telegraf}) format('opentype'); // don't forget the format!
            }
          </style>
            <div style="width:700px;height:700px;background:black;display:flex;align-self:center;justify-content:center"><div style="height:540px;background:black;align-self:center;width:615px;position:relative"><div style="width:129px;height:134px;position:absolute;right:1rem;top:0rem;background:black;background-repeat:no-repeat;background-position:center;background-size:cover;background-image:url(&quot;${x.dao_logo_url}&quot;)"><div style="height:0;width:0;border-bottom:30px solid black;border-right:30px solid transparent;bottom:0;position:absolute"></div><div style="height:0;width:0;border-bottom:36px solid transparent;border-right:36px solid black;top:0;position:absolute;right:0"></div></div><img alt="pocp_bg" src="https://firebasestorage.googleapis.com/v0/b/eveels-c43bb.appspot.com/o/POCP_background.svg?alt=media&amp;token=629aa0c3-e949-4117-bdf1-4b3c0b53a756" style="position:absolute;width:100%;height:100%;top:0;right:0"/><div style="font-size:18px;color:white;font-family:SFMono;left:0;position:absolute;top:0.3rem">${x.date_of_approve}</div><div style="width:70%;position:absolute;background:red"><div style="font-size:52px;font-family:TelegrafMedium;left:30px;position:absolute;top:76px;font-weight:400;line-height:52px;color:#F5A60B;text-align:start">${x.dao_name}</div><div style="font-size:52px;font-family:TelegrafMedium;left:30px;position:absolute;top:128px;font-weight:400;line-height:52px;color:black;text-align:start">${x.contri_title}</div></div><div style="display:flex;flex-direction:row;position:absolute;top:256px;left:30px"><div><div style="font-weight:500;font-size:24px;color:black;font-family:SFMono;text-align:start">To</div><div style="font-weight:500;font-size:24px;color:black;font-family:SFMono">From</div></div><div><div style="font-weight:500;font-size:24px;color:black;font-family:SFMono">${x.claimer?.slice(0,5)}...${x?.claimer?.slice(-3)}</div><div style="font-weight:500;font-size:24px;color:black;font-family:SFMono">${x.signer?.slice(0,5)}...${x?.signer?.slice(-3)}</div></div></div><div style="display:flex;flex-direction:row;position:absolute;bottom:18px;left:160px;justify-content:space-between;right:56px;align-items:center"><div style="font-weight:500;font-size:18px;color:#767676;font-family:SFMono">DREP-${x.id}</div><div style="font-weight:500;font-size:18px;color:black;font-family:SFMono">PROOF OF CONTRIBUTION</div></div></div></div>
            </html>`,
      });
      let result = await ipfs.add(image, options);
      if(result.path){
        // { dao_name, contri_title, claimer, signer, date_of_approve, id, dao_logo_url, feedback }
        const metaData = {
          "description": x.contri_title, 
          image: `https://ipfs.infura.io/ipfs/${result.path}`, 
          name: x.dao_name,
          attributes: [
            {
              trait_type: "issue_date", 
              value: x.date_of_approve
            }, 
            {
              trait_type: "community_name", 
              value: x.dao_name
            }, 
            {
              trait_type: "issuer", 
              value: x.signer
            }, 
            {
              trait_type: "work_type", 
              value: x.work_type
            },
             {
              trait_type: "description_type", 
              value: x.contri_title
            },
            {
              trait_type: "feedback", 
              value: x.feedback
            },
          ], 
        }
        const results = await ipfs.add(JSON.stringify(metaData))
        if(result.path){
          const data = {ipfs_url:results.path,contribution_id:x.id}
          await axios.post('https://staging.api.drepute.xyz/contrib/update/ipfs',data,{headers:{
            "X-Authentication": '7cd59775-1eef-4e98-b9e5-ae224714b0af',
          }})
          console.log('response updates', data)
        }
        console.log('response updates', `https://ipfs.infura.io/ipfs/${results.path}`)
      }
    } catch (error) {
      console.log('error',error.toString(),env.internalToken,env.INFURA_SECRET)
    }
  })
}

router.post("/upload",cors(), async (req, res) => {
  const env = await  getEnv();
  const projectId = env.INFURA_TOKEN;
  const projectSecret = env.INFURA_SECRET;
  const auth =
    "Basic" + Buffer.from(projectId + ":" + projectSecret).toString("base64");
  const ipfs = await create({
    host: "ipfs.infura.io",
    port: 5001,
    protocol: "https",
    headers: {
      authorization: auth,
    },
  });
  const { contribution_meta_array } = req.body

  console.log(contribution_meta_array)

  contribution_meta_array.map((x, i)=>{
    
    if(
      x.dao_name === ''||!x.dao_name||x.dao_logo_url === ''||!x.dao_logo_url||x.contri_title === ''||!x.contri_title
      ||x.claimer === ''||!x.claimer||x.signer === ''||!x.signer||x.date_of_approve === ''||!x.date_of_approve
      ||!x.id||x.work_type === ''||!x.work_type
    ){
      res.status(400).send('Bad body type') 
    }else{
      try {
        ipfsUploadTask(contribution_meta_array, ipfs,env)
        res.status(200).send({task:`started`})
    
      } catch (error) {
        res.status(500).send(error.toString());
        console.log(error);
      }
    }
  })
});

app.use(express.json());
app.use(cors())

app.use('/',router)

app.listen(port, () => {
  console.log(`Ipfs Uploader listening on port ${port}`)
})