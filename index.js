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
        db.collection('messeges').insertOne({from: participant.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:mm:ss')})
        db.collection('participants').insertOne({...participant, lastStatus: Date.now()}).then(()=>{
            res.sendStatus(201)
        });
    } 
    catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});


app.listen(5000);