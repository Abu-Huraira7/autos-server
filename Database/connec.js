const mongoose = require("mongoose");
const DB = process.env.CLOUD_DATABASE;
mongoose.set('strictQuery', true);
// mongoose.connect("mongodb://localhost:27017/autoauction").then(()=>{console.log("Connection Successful")}).catch((error)=>{console.log(error)});
mongoose.connect("mongodb+srv://hurairaprince889:huraira889@autos.o9fyvij.mongodb.net/").then(()=>{console.log("Connection Successful")}).catch((error)=>{console.log(error)});