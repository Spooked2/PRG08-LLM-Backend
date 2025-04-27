# LLM Backend installation instructions

First, make sure you have node and NPM installed.

Copy the code from this repository into your own project as usual, and run the "npm install" command.

Create a new ".env" file, and fill it with the following fields:

>EXPRESS_PORT=
>
>AZURE_OPENAI_API_VERSION=
>
>AZURE_OPENAI_API_INSTANCE_NAME=
> 
>AZURE_OPENAI_API_KEY=
> 
>AZURE_OPENAI_API_DEPLOYMENT_NAME=
> 
>AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME=
 
Fill in these fields with your own names, keys and options.

Once done, simply run the command "npm run dev" and your server will run.

note: Sometimes the AI likes to suddenly generate a slew of nonsense tokens. I have no idea why this happens, ask OpenAI.