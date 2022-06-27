import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
dotenv.config();
import joi from 'joi'
import dayjs from 'dayjs';

const participantsSchema = joi.object({
    name: joi.string().required()
});

const messagesSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.valid('message', 'private_message'),
    from: joi.string().required()
});

const mongoClient = new MongoClient(process.env.URL_CONNECT_MONGO);
let db;
mongoClient.connect().then(() => {
    db = mongoClient.db("Uol_data");
});

const app = express();

app.use(cors());
app.use(express.json());


app.post("/participants", async(req, res) => {
    const participant = req.body;
    const validation = participantsSchema.validate(participant, {abortEarly:true});

    if(validation.error){
        res.sendStatus(422)
        return;
    }
    
    const registered=await db.collection("participants").find({name : participant.name}).toArray();
    
    if(registered.length!==0){
        res.sendStatus(409)
        return;
    }

    try {
        db.collection('messages').insertOne({from: participant.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:mm:ss')})
        db.collection('participants').insertOne({...participant, lastStatus: Date.now()}).then(()=>{
            res.sendStatus(201)
        });
    } 
    catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.get("/participants", (req, res) => {
    db.collection("participants").find().toArray().then(participants =>{
        res.status(201).send(participants)
    })
});

app.post("/messages", async(req, res)=>{
    const {user} = req.headers
    const message= {...req.body, from: user};
    const validation = messagesSchema.validate(message, {abortEarly:true});

    if(validation.error){
        res.sendStatus(422)
        return;
    }

    const registered=await db.collection("participants").find({name : message.from}).toArray();
    if(registered.length===0){
        res.sendStatus(422)
        return;
    }
    
    try {
        db.collection('messages').insertOne({...message, time: dayjs().format('HH:mm:ss')}).then(()=>{
            res.sendStatus(201)
        });
    } 
    catch (error) {
        console.error(error);
        res.sendStatus(500);
    }

});

app.get("/messages", async(req, res)=>{
    const {user} = req.headers;
    const limit = parseInt(req.query.limit);
    const messages= await db.collection("messages").find().toArray();

    if(limit){
        let lastmessages=[];
        for(let i=messages.length-1; i>=0; i--){
            if(messages[i].to===user || messages[i].to==="Todos"){
                lastmessages.push(messages[i]);
            }
            if(lastmessages.length===limit){
                lastmessages.reverse();
                res.status(201).send(lastmessages);
                return;
            }
        }
        lastmessages.reverse();
        res.status(201).send(lastmessages);
    }
    else{
        res.status(201).send(messages.filter(message => message.to===user || message.to==="Todos"));
    }
});

app.post("/status", async(req, res)=>{
    const {user} = req.headers;
    const registered=await db.collection("participants").find({name : user}).toArray();

    if(registered.length===0){
        res.sendStatus(404)
        return;
    }

    try {
        db.collection('participants').updateOne({ "name" : user }, { $set: {"lastStatus": Date.now()}});
        res.sendStatus(200)
     } 
     catch (error) {
        console.log(error)
        res.sendStatus(500);
     }
});

app.listen(5000);