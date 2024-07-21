const mongoose = require('mongoose');
const ProductSchema = new mongoose.Schema({
    category: String,
    title: String,
    originalTitle: String,
    metaTitle: String,
    metaDescription: String,
    metaKeywords: String,
    userEmail: String,
    winner: String,
    userName: String,
    keyFactors: [{ text: String, split: Boolean }],
    equipmenatAndFeatures: [{ text: String, split: Boolean }],
    condition: [{ text: String, split: Boolean }],
    serviceHistory: [{ text: String, split: Boolean }],
    duration: Number,
    startPrice: Number,
    price: Number,
    side: String,
    country: String,
    OdometerReading: String,
    unit: String,
    VIN: String,
    TransmissionType: String,
    color: String,
    EngineDisplacement: String,
    saved: {
        type: Number,
        default: 0,
    },
    views: {
        type: Number,
        default: 0,
    },
    ModelNumber: String,
    carModel: String,
    lotNumber: String,
    saleType: String,
    summary: String,
    youtubeLink: String,
    thumbnail: String,
    thumbnailOptimized: String,
    endTime: Date,
    exteriorImages: [{ type: String }],
    interiorImages: [{ type: String }],
    mechanicalImages: [{ type: String }],
    documentsImages: [{ type: String }],
    exteriorImagesOptimized: [{ type: String }],
    interiorImagesOptimized: [{ type: String }],
    mechanicalImagesOptimized: [{ type: String }],
    documentsImagesOptimized: [{ type: String }],
    bids:[
        {
            email: String,
            username: String,
            country: String,
            price: Number,
            automatic: Boolean,
            date:{
                type: Date,
                default: Date.now,
            }
        }
    ],
    offers:[
        {
            email: String,
            username: String,
            country: String,
            price: Number,
            automatic: Boolean,
            date:{
                type: Date,
                default: Date.now,
            }
        }
    ],
    date:{
        type: Date,
        default: Date.now,
    },
    sold:{
        status: Boolean,
        price: Number,
        date:{
            type: Date,
            default: Date.now,
        }
    },
    comments:[
        {
            message: {
                sender: {
                    name: String,
                    email: String,
                },
                content: String,
                date:{
                    type: Date,
                    default: Date.now,
                }
            },
            reply: [
                {
                    sender: {
                        name: String,
                        email: String,
                    },
                    content: String,
                    date:{
                        type: Date,
                        default: Date.now,
                    }
                }
            ]
        }
    ]
})
const ProductModel = new mongoose.model('Product',ProductSchema);
module.exports = ProductModel