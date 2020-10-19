const express = require('express');
const mongoose = require('mongoose');
const Joi  = require("@hapi/joi")
const morgan = require('morgan');
var cors = require('cors')
let app = express();
const expressWs = require('express-ws')(app);
var aWss = expressWs.getWss();
var jwt = require('jsonwebtoken');
require('dotenv').config();
const Live = require('./models/live')
const Api = require('./models/api');
const { json } = require('body-parser');
const { string } = require('@hapi/joi');

/* 
    to do 
    - create room (live)
    - join romm (live)
*/

let channels = new Set()
const port = process.env.PORT || 3030;
const SECRET = process.env.SECRET;
const uri = process.env.LIVE_URI;
const publicRouter = express.Router()
const privateRouter = express.Router()
app.use(cors())
app.use(morgan('dev'));
app.use(express.json())

publicRouter.get("/",(req,res)=>{
    res.send("live api!!!")
})

publicRouter.post('/apiKey', async(req, res, next)=>{
    console.log("ahmed")
    const usr = req.body.user
    const {username, password} = usr

    const scheme = Joi.object({
        username : Joi.string().required(),
        password : Joi.string().required()
    })
    if(scheme.validate({username, password}).error)
        res.status(400).send("Bad request!!!")
    /* const api = new Api({
        user:{
            username:'ahmed008',
            password:"1233456789a-e"
        },
    }) */
    console.log("here",req.body)
    const user = await Api.findOne({"user.username":username, "user.password":password})
    if(user){
        token = jwt.sign({username:user.user.username,_id:user._id},SECRET);
        user.save().then((data)=>{
            res.json({apiKey : token});
        })
    }
    else res.status(400).send("Bad request!!!")
    

});
//autorisation midleware
const jwtMidleware =(async (req, res, next)=> {
    //autorisation using jwt
    console.log("autorisations")
    let token = req.body.token || req.query.token
    if(token){
       jwt.verify(token,SECRET,async (err, verifiedJwt) => {
            if(err){
                res.status(401).send()
            }else{
                decodedToken = jwt.decode(token, {
                    complete: true
                   })
                if (!decodedToken) {
                    res.status(401).send()
                }
                else{
                    let _id = decodedToken.payload._id
                    let username = decodedToken.payload.username
                    const api = await Api.find({_id:_id,"user.username":username})
                    if(api.length <= 0)
                        res.status(401).send()
                    else next()
                }
            }
          })
        
        
    }else res.status(401).send()
    
}); 

privateRouter.use(jwtMidleware)
privateRouter.post('/startLive', async (req, res, next)=>{
    //connect to db 
    //add live to db
    //add channel
    //return channel id
    const scheme = Joi.object({

        longitude:Joi.number().required(),
        latitude:Joi.number().required(),
        streamer_id : Joi.string().required(),
    })
    const {longitude,latitude,streamer_id} = req.body
    if(scheme.validate({longitude,latitude,streamer_id}).error)
        res.status(400 ).send("Bad Request!!")
    let timestamp = (new Date()).getTime()
    const newLive= new Live({
        streamer_id:streamer_id,
        start:timestamp,
        end:"",
        path :[
            {
                longitude ,
                latitude ,
                timestamp
            }
        ],
        viewers_count:0
    });
    
    if(Array.from(channels).length>0 && Array.from(channels).find(channel => channel.split("|")[1] === streamer_id))
    {
        res.status(400 ).send("stream is in proccecing!!")
        return ;
    }
    newLive.save().then( live =>{
        const id_channels = live._id+"|"+live.streamer_id


        channels.add(id_channels)
        res.json({
            channel_id:id_channels,
            streamer_id:streamer_id,
            start:timestamp,
            path :[
                {
                    longitude ,
                    latitude ,
                    timestamp
                }
            ],
            viewers_count:0
        
        });
    }).catch(err=>{
        console.log(err)
        res.status(404).json("live was not created!!!");
    });
    
});

privateRouter.get('/AllLives', function(req, res, next){
    
    //connect to db 
    //get all lives
    Live.find({},{currentPosition:0,createdAt:0,updatedAt:0,__v:0}).then(data=>{
        res.json(data)
    }).catch(err=>{
        console.log(err)
        res.status(404).json(err);
    });
});

privateRouter.get('/currentLives', function(req, res, next){
    
    //connect to db 
    //get current lives from channels 
    Live.find({_id:{$in:Array.from(channels).map(channel=>channel.split("|")[0])}},{createdAt:0,updatedAt:0,__v:0}).then(data=>{
        res.json(data)
    }) 
    //res.send(Array.from(channels))
});
privateRouter.post("/endLive" ,async(req,res)=>{
    //end live
    //remove from channels
    //update end time  
    const scheme = Joi.object({
        id_channel:Joi.string().required()
    })
    const {id_channel} = req.body
    if(scheme.validate({id_channel}).error)
        res.status(400).send("Bad Request!!")
    let live = await Live.findById(id_channel.split("|")[0])
    live.end = (new Date()).getTime()
    await live.save()
    channels.delete(id_channel)
    res.send(`steam ${id_channel} stoped!!`)
})
privateRouter.get('/stream',(req,res)=>{
    //connect to db 
    //get path
    const scheme = Joi.object({
        id_stream:Joi.string(),
        id_streamer:Joi.string(),
    })
    const {id_stream,id_streamer} = req.query

    let query = {}

    
    
    if(scheme.validate({id_stream,id_streamer} ).error)
        res.status(400).send("Bad Request!!")

    if(id_stream && id_stream !== "")
        query = {...query,_id : id_stream}
    if(id_streamer && id_streamer !== "")
        query = {...query,streamer_id : id_streamer}
    Live.find(query,{createdAt:0,updatedAt:0,__v:0}).then(live=>{
        res.json(live)
    }).catch(err=>{
        console.log(err)
        res.status(404).send("path not found!!!!")
    })
})

app.ws('/:id' ,function(ws, req) {
    
    console.log("connected")
    
    //test if channel exist 
    //if true broadcaost the data to all client in the same channel
    //add data to db
    const schema = Joi.object({
        longitude:Joi.number().required(),
        latitude:Joi.number().required()
    })
    const {id} = req.params
    
        ws.route = `/${req.params.id}`;  /* <- Your path */
        let Clients = Array.from(
                        aWss.clients
                    ).filter((sock)=>{
                        return sock.route === `/${req.params.id}`
                    }) 
                
        ws.on('message', async (msg)=> {
            console.log("message")
            let live = await Live.findById(id.split('|')[0])
            msg = JSON.parse(msg)
            const {longitude,latitude} = msg
            
            if(schema.validate(msg).error)
               return ;
            const viewers_count = Clients.length-1
            let timestamp = (new Date()).getTime()
            live.currentPosition = {latitude,longitude,timestamp}
            live.path =[...live.path,{latitude,longitude,timestamp}]
            live.viewers_count=viewers_count
            await live.save()
            Clients.forEach(function (client) {
                client.send(JSON.stringify({latitude,longitude,timestamp,viewers_count}));
            });
        });
    

    
    
  
});
/* connection to mongodb */
mongoose.connect(uri, { useNewUrlParser: true, useCreateIndex: true,useUnifiedTopology: true }
    );
mongoose.connection.once('open', () => {
    console.log("MongoDB database connection established successfully");
    
})
app.use(publicRouter,privateRouter)
app.listen(port);
