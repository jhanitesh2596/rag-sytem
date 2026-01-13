import 'dotenv/config'

import { Pinecone } from "@pinecone-database/pinecone";

const pinacone = new Pinecone({
  apiKey: process.env.PINACONE_DB_LINK,
});

const index = pinacone.index(process.env.PINECONE_DB);
export default index