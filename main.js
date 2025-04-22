import {AzureChatOpenAI, AzureOpenAIEmbeddings} from '@langchain/openai';
import { HumanMessage, AIMessage, ToolMessage, SystemMessage } from "@langchain/core/messages";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import express from 'express';
import cors from 'cors';

class History {

    //Properties
    messages = [];

    constructor(initialMessage, sentHistory = []) {

        this.addSystemMsg(initialMessage);
        this.addSystemMsg(`When talking about the weather, only use the following information: ${currentWeather}`);

        if (!sentHistory instanceof Array) {
            sentHistory = [];
        }

        for (const message of sentHistory) {

            switch(message[0]) {
                case 'human': this.addPrompt(message[1]); break;
                case 'ai': this.addAiMsg(message[1]); break;
                case 'tool': this.addToolMsg(message[1]); break;
            }

        }

    }

    //Methods
    get() {
        console.log(this.messages);
        return this.messages;
    }

    addPrompt(prompt) {

        this.messages.push(new HumanMessage(prompt));

    }

    addAiMsg(message) {

        this.messages.push(new AIMessage(message));

    }

    addSystemMsg(message) {

        this.messages.push(new SystemMessage(message));

    }

    addToolMsg(message) {

        this.messages.push(new ToolMessage(message));

    }

}

//Initiate the glorified auto-complete
const model = new AzureChatOpenAI({
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
    azureOpenAIApiEmbeddingsDeploymentName: process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME,
    temperature: 1.5
});

//Function for getting weather data for Rotterdam
async function getWeather() {

    const res = await fetch('https://wttr.in/Rotterdam?format=j1', {
        mode: "cors",
        method: 'GET'
    });

    const json = await res.json();

    const stringyJson = JSON.stringify(json);

    const history = [['system', `You are a weatherman giving a brief report on the current weather. Do not give an introduction. The current weather is this: ${stringyJson}.`]];

    const result = await model.invoke(history);

    return result.content;

}

let currentWeather = await getWeather();


const embeddingModel = new AzureOpenAIEmbeddings({
    temperature: 0,
    azureOpenAIApiEmbeddingsDeploymentName: process.env.AZURE_EMBEDDING_DEPLOYMENT_NAME
});

const vectorStore = await FaissStore.load('scp-914Vectors', embeddingModel);

const app = express();
app.use(cors());

//Make sure the webservice knows what it can receive
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.get("/", async (req, res) => {

    const systemMessage = "You are a stand-up comedian from 1970s New York. Tell a joke about the weather.";
    const history = new History(systemMessage);

    try {

        const reply = await model.invoke(history.get());

        res.status(200);
        res.json({funnyJoke: reply.content});

    } catch (error) {

        res.status(500);
        res.json({error: 'Something went wrong!', message: error.message});

    }

});

app.post("/", async (req, res) => {

    const systemMessage = "You are a fictional CEO who is known for being evil and firing people without notice. You're overly friendly and don't seem to care about your employees at all. The employee you're about to fire has just walked into your office. Keep your replies between one and five sentences. Only fire the employee after 2 messages. Mention something about the weather when the employee enters..";
    const history = new History(systemMessage, req.body.history ?? []);

    history.addPrompt(req.body.prompt);

    try {

        res.setHeader("Content-Type", "text/plain");

        const stream = await model.stream(history.get());

        for await (const chunk of stream) {
            res.write(chunk.content);
        }

        res.status(200);
        res.end();

    } catch (error) {

        res.status(500);
        res.json({error: 'Something went wrong!', message: error.message});

    }

});

app.post('/scp', async (req, res) => {

    const body = req.body;

    if (!body?.input || !body?.setting) {

        res.status(400);
        return res.json({error: 'Please send a body with an input and setting property'});
    }

    const prompt = `Produce a test log. The input is ${body.input}. The setting is ${body.setting}.`;
    const relevant = await vectorStore.similaritySearch(prompt);
    const context = relevant.map(doc => doc.pageContent).join("\n\n");

    const systemMessage = `You will produce test logs based on the human's input and the context. Everything after this sentence is the context. ${context}`;

    const history = new History(systemMessage, []);

    history.addPrompt(prompt);

    try {

        res.setHeader("Content-Type", "text/plain");

        const stream = await model.stream(history.get());

        for await (const chunk of stream) {
            res.write(chunk.content);
        }

        res.status(200);
        res.end();

    } catch (error) {

        res.status(500);
        res.json({error: 'Something went wrong!', message: error.message});

    }

});

//Update the weather every hour
setInterval(async () => {

    currentWeather = await getWeather();
    console.log('Updated the weather!');

}, 3600000);

app.listen(process.env.EXPRESS_PORT, () => {
    console.log(`Server listening on port ${process.env.EXPRESS_PORT}`);
});
