import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { AzureChatOpenAI, AzureOpenAIEmbeddings } from "@langchain/openai";
import { FaissStore } from "@langchain/community/vectorstores/faiss";

const model = new AzureChatOpenAI({temperature: 1});

const embeddings = new AzureOpenAIEmbeddings({
    temperature: 0,
    azureOpenAIApiEmbeddingsDeploymentName: process.env.AZURE_EMBEDDING_DEPLOYMENT_NAME
});

let vectorStore

async function createVectorstore() {
    const loader = new TextLoader("./scp-914.txt");
    const docs = await loader.load();
    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 350, chunkOverlap: 35 });
    const splitDocs = await textSplitter.splitDocuments(docs);
    console.log(`Document split into ${splitDocs.length} chunks. Now saving into vector store`);
    vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings);
    await vectorStore.save("scp-914Vectors");
}

await createVectorstore();

async function askQuestion(prompt) {

    const relevant = await vectorStore.similaritySearch(prompt);

    const context = relevant.map(doc => doc.pageContent).join("\n\n");

    const history = [
        ["system", `You will receive a context from the human. Please only use this context to answer their question.`],
        ["human", `The context is ${context}. The question is ${prompt}`]
    ];

    const response = await model.invoke(history);

    console.log(response.content);

}

await askQuestion('can you make a test log where the input is a block of copper?');