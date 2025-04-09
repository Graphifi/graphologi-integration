# Setup steps
- Clone the repository
- Install node version 22.14.0 
- run `npm install`
- Create `.env` file in the root director and set below variable
```
PORT=8080
ENVIRONMENT_FILE=.env
LOG_DIRECTORY="./logs/"
LOG_CONSOLE=

#This is the public key which you can copy from Graphologi and paste
#To set a multiline value enclose the value in double quotes  
GRAPHOLOGI_PUBLIC_KEY=
DISABLE_AUTHENTICATION=

CONTENTFUL_ACCESS_TOKEN=
CONTENTFUL_ORGANIZATION_ID=
CONTENTFUL_SPACE_ID=
CONTENTFUL_ENVIRONMENT_ID=
CONTENTFUL_API_MAX_REQUESTS_IN_PARALLEL=2
```
- To start the application run `npm start` 