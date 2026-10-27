
const app=require('./src/app');
const connectMongo=require('../Backend/src/loaders/db')
const dotenv=require('dotenv')
dotenv.config();
PORT=process.env.PORT
const startServer=async ()=>{
await connectMongo();
app.listen(PORT, ()=>{console.log(`Server is running on  http://localhost:${PORT}`)});
}
startServer()