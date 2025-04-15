import {AzureChatOpenAI} from '@langchain/openai';
import express from 'express';
import cors from 'cors';

class Context {

    //Properties
    messages = [];

    constructor(initialMessage, sentHistory = []) {

        this.messages.push(['system', initialMessage]);

        if (!sentHistory instanceof Array) {
            sentHistory = [];
        }

        for (const message of sentHistory) {

            //Prevent the client from inserting any prompts with the system role
            if (message[0] !== 'system') {
                this.messages.push(message);
            }

        }

    }

    //Methods
    getChatHistory() {
        return this.messages;
    }

    addPrompt(prompt) {

        this.messages.push(['human', prompt]);

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

const app = express();
app.use(cors());

//Make sure the webservice knows what it can receive
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.get("/", async (req, res) => {

    const systemMessage = "You are a stand-up comedian from 1970s New York. Tell a joke about the future";
    const context = new Context(systemMessage);

    try {

        const reply = await model.invoke(context.getChatHistory());

        res.status(200);
        res.json({funnyJoke: reply.content});

    } catch (error) {

        res.status(500);
        res.json({error: 'Something went wrong!', message: error.message});

    }

});

app.post("/", async (req, res) => {

    const systemMessage = "You are a fictional CEO who is known for being evil and firing people without notice. You're overly friendly and don't seem to care about your employees at all. The employee you're about to fire has just walked into your office. Keep your replies between one and five sentences.";
    const context = new Context(systemMessage, req.body.history ?? []);

    context.addPrompt(req.body.prompt);

    try {

        res.setHeader("Content-Type", "text/plain");

        const stream = await model.stream(context.getChatHistory());

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

app.listen(process.env.EXPRESS_PORT, () => {
    console.log(`Server listening on port ${process.env.EXPRESS_PORT}`);
});
