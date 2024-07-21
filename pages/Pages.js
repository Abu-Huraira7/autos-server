const express = require('express')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const router = express.Router();
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const crypto = require("crypto");
const stripe = require('stripe')('sk_test_51MhEx6AM71JH6IUZOwPEgMhLinzLJG5qvQVBzxWkcBA05EE8VuCvcUZ7NVqZ1q6AAN34Ol1x1FpSWUZgT51WVmCs00DpF3dKzS'); //Afaq
// Import required modules for WebSocket communication
const WebSocket = require('ws');
// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

const sender = 'hurairaprince889@gmail.com';

// Sam Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'hurairaprince889@gmail.com',
      pass: 'wmukvxsqwwxoozam',
    }
});

// Configure Cloudinary
// AFAQ Cloudinary config
cloudinary.config({
  cloud_name: 'def8v05xk',
  api_key: '167459688646891',
  api_secret: 'cRkeckeyHg2FkwApFJt25zNp8B0',
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

router.use(express.json());
// app.use(express.static('public'));
const UserModel = require('../Database/UserSchema');
const ArticleModel = require('../Database/ArticleSchema');
const EventsModel = require('../Database/EventsSchema');
const ProductModel = require('../Database/ProductSchema');
// const ArticleModel = require('../Database/ArticleSchema');
const Authentication = require('../pages/Authentication');
cron.schedule('* * * * *', async () => {
    try {
        const expiredAuctions = await ProductModel.find({
            endTime: { $lte: new Date().getTime() },
            category: 'auction',
            // category: { $ne: 'expired' },
        });
        // console.log(expiredAuctions.length);

        if (expiredAuctions.length > 0) {
            await ProductModel.updateMany(
                { _id: { $in: expiredAuctions.map((auction) => auction._id) } },
                { category: 'expired' }
            );
            console.log('Auctions updated to "expired".');
        }
    } catch (error) {
        console.error('Error updating auctions:', error);
    }
});
// Runs every day at midnight
router.get('/home', (req, res) => {
    try {
        console.log('HomePage started');
        res.send('success');
    } catch (error) {
        console.log(error);
    }
})
router.post('/postComment', async (req, res) => {
    try {
        const { product_Id, email, username, comment } = req.body;

        const result = await ProductModel.findByIdAndUpdate(
            product_Id,
            {
                $push: {
                    comments: {
                        $each: [
                            {
                                message: {
                                    sender: {
                                        name: username,
                                        email: email,
                                    },
                                    content: comment,
                                },
                            },
                        ],
                        $position: 0 // Insert at the beginning
                    }
                }
            },
            { new: true }
        );

        if (result) {
            res.send({ msg: 'success' });
        } else {
            res.send({ msg: 'failed' });
        }
    } catch (error) {
        console.log(error);
        res.send({ msg: 'error' });
    }
});
router.post('/deleteComment', async (req, res) => {
    try {
        const { product_Id, comment_Id } = req.body;
        const result = await ProductModel.findByIdAndUpdate(
            product_Id,
            {
                $pull: { comments: { _id: comment_Id } }
            },
            { new: true }
        );
        if (result) {
            res.send({ msg: 'success' });
        } else {
            res.send({ msg: 'failed' });
        }
    } catch (error) {
        console.log(error);
        res.send({ msg: 'error' });
    }
});
router.post('/postReply', async (req, res) => {
    try {
        const { product_Id, comment_Id, email, username, reply } = req.body;
        console.log(req.body);
        const result = await ProductModel.findByIdAndUpdate(
            product_Id,
            {
                $push: {
                    "comments.$[comment].reply": {
                        sender: {
                            name: username,
                            email: email,
                        },
                        content: reply,
                    },
                },
            },
            {
                arrayFilters: [{ "comment._id": comment_Id }],
                new: true,
            }
        );
        if (result) {
            res.send({ msg: 'success' });
        } else {
            res.send({ msg: 'failed' });
        }
    } catch (error) {
        console.log(error);
    }
})
router.post('/deleteReply', async (req, res) => {
    try {
        const { product_Id, comment_Id, reply_Id } = req.body;
        console.log(product_Id);
        console.log(comment_Id);
        console.log(reply_Id);
        const result = await ProductModel.updateOne(
            { _id: product_Id },
            {
                $pull: {
                    'comments.$[comment].reply': { _id: reply_Id }
                }
            },
            {
                arrayFilters: [{ 'comment._id': comment_Id }]
            },
        );
        if (result) {
            res.send({ msg: 'success' });
        } else {
            res.send({ msg: 'failed' });
        }
    } catch (error) {
        console.log(error);
        res.send({ msg: 'error' });
    }
});
router.post('/booking', (req, res) => {
    try {
        console.log('HomePage started');
        res.send('success');
    } catch (error) {
        console.log(error);
    }
})
router.post('/signup', async (req, res) => {
    try {
        console.log(req.body);
        const { firstName, lastName, email, username, password } = req.body;
        console.log(password);

        if (!firstName || !email || !password) {
            res.status(201).json({ msg: "Please Fill all Fields" })
        }
        const checkUser = await UserModel.findOne({ email: email });

        if (checkUser) {
            return res.json({ msg: 'User Already Registered' })
        } else {
            const newUser = UserModel({ firstName, lastName, email, username, password });
            const result = await newUser.save();
            if (result) {
                const token = await result.generateAuthToken();
                // res.cookie('jwttoken',token);
                // UserModel({isLoggedIn:true}).save();
                res.status(201).json({ msg: 'User Registered Successfuly.', user: result, authToken: token });
                // Sending email to auto-auctions to itself to inform someone registered
                const logoUrl = "https://res.cloudinary.com/def8v05xk/image/upload/v1692188819/site-logo_dcrv76.png";
                let htmlString = `            
                    <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; background-color: #f7f7f7; padding: 20px; ">
                        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 5px 5px 0 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 30px; position: relative; ">
                            <a href="http://localhost:3000" style="text-decoration: none;">
                                <img src="${logoUrl}" alt="auto-auctions.co" style="display: block; margin: 0 auto; max-width: 100%; height: 4.5rem;">
                            </a>
                            <h1 style="font-size: 18px; font-weight: bold; margin-top: 0; margin-bottom: 20px; color: #003949; text-align: center; font-family: system-ui;">Someone has been Registered..</h1>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Please find the details below:</p>                        
                            <p style="margin: 0 0 10px; color: #333; margin-bottom: 15px; font-size: 16px; font-weight: bold; ">User Information</p>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Name: ${firstName + " " + lastName} </p>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Email: ${email} </p>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Username: ${username} </p>
                            <br />
                            <p style="margin: 0 0 10px; color:#333;  font-size: 16px;">Best Regards,</p>
                            <p style="margin: 0 0 10px; color:#333; font-size: 16px;">Auto Auctions</p>
                        </div>
                        <div class="container" style="max-width: 660px; margin: 0 auto; border-radius: 0 0 5px 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); position: relative; ">                    
                            <div style="border-top: 1px solid #205260;  background-color: #003949; padding: 17px 0; border-radius: 0 0 5px 5px; text-align: center;">
                                <div style="font-weight: 500; font-size: 15px; line-height: 20px; color: #fff; margin: 0;">
                                    Autosauctions © copyright 2023
                                </div>
                                <div style="font-weight: 400; font-size: 11px; line-height: 20px; color: #d1d1d1; margin: 0;">
                                    You can <a href="http://localhost:3000" style=" color: #fff; cursor: pointer; text-decoration: none; " >unsbscribe</a> receiving emails
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                const mailOptions = {
                    from: sender,
                    // to: 'sami.mahfouz@live.co.uk',
                    to: sender,
                    subject: 'Someone has been Registered in auto-auctions.',
                    html: htmlString
                };
                transporter.sendMail(mailOptions, async function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent:');
                    }
                });
                // Thank you email to user
                let htmlString2 = `            
                    <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; background-color: #f7f7f7; padding: 20px; ">
                        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 5px 5px 0 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 30px; position: relative; ">
                            <a href="http://localhost:3000" style="text-decoration: none;">
                                <img src="${logoUrl}" alt="auto-auctions.co" style="display: block; margin: 0 auto; max-width: 100%; height: 4.5rem;">
                            </a>
                            <h1 style="font-size: 18px; font-weight: bold; margin-top: 0; margin-bottom: 20px; color: #003949; text-align: center; font-family: system-ui;">Congrats! You've been successfully registered with Auto Auctions.</h1>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Hi ${firstName + " " + lastName}, </p>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Thank you for registering with Auto Auctions! We’re excited to have you on board and look forward to providing you with the best possible experience. </p>
                            <br />
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px; font-weight: 600;"> Interested in Selling Your Car? </p>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;"> We invite you to fill out our selling enquiry form where you can submit some details about your car. Our team will review your submission and, if eligible, we will invite you to complete a consignment form. Start the process by filling out the form here: <a href="http://localhost:3000/sell-with-us" target="_blank" > Sell with us </a> </p>
                            <br />
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Welcome again, and we hope you enjoy using Auto Auctions. If you have any questions or need assistance, feel free to reach out to our support team at hurairaprince889@gmail.com. </p>
                            <br />
                            <p style="margin: 0 0 10px; color:#333;  font-size: 16px;">Best Regards,</p>
                            <p style="margin: 0 0 10px; color:#333; font-size: 16px;">Auto Auctions</p>
                        </div>
                        <div class="container" style="max-width: 660px; margin: 0 auto; border-radius: 0 0 5px 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); position: relative; ">                    
                            <div style="border-top: 1px solid #205260;  background-color: #003949; padding: 17px 0; border-radius: 0 0 5px 5px; text-align: center;">
                                <div style="font-weight: 500; font-size: 15px; line-height: 20px; color: #fff; margin: 0;">
                                    Autosauctions © copyright 2023
                                </div>
                                <div style="font-weight: 400; font-size: 11px; line-height: 20px; color: #d1d1d1; margin: 0;">
                                    You can <a href="http://localhost:3000" style=" color: #fff; cursor: pointer; text-decoration: none; " >unsbscribe</a> receiving emails
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                const mailOptions2 = {
                    from: sender,
                    // to: 'sami.mahfouz@live.co.uk',
                    to: email,
                    subject: 'Thank You for Registering with Auto Auctions.',
                    html: htmlString2
                };
                transporter.sendMail(mailOptions2, async function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent:');
                    }
                });
            } else {
                res.status(201).json({ msg: 'Failed to Register' });
            }
        }
    } catch (error) {
        console.log(error);
    }
})
router.post('/login', async (req, res) => {
    // console.log(req.body);
    try {
        const { email, password } = req.body;
        // console.log(password);
        if (!email || !password) {
            res.send({ msg: 'Invalid Credentials' });
        }
        const result = await UserModel.findOne({ email: email });
        if (!result) {
            res.send({ msg: 'Invalid Credentials' });
        } else {
            const checkPassword = await bcrypt.compare(password, result.password);
            if (checkPassword) {
                const token = await result.generateAuthToken();
                // res.cookie('jwttoken',token);
                res.send({ msg: 'success', user: result, authToken: token });
            } else {
                res.send({ msg: 'Invalid Credentials' });
            }
        }
    } catch (error) {
        console.log(error);
    }
})
router.get('/isloggedin', async (req, res) => {
    try {
        const token = req.header("authToken");
        if (token.length > 10) {
            const verifyToken = jwt.verify(token, "helloiamabuhurairastudentofuniversityofokara");
            const rootUser = await UserModel.findOne({ _id: verifyToken._id, "tokens.token": token });
            if (rootUser) {
                if (rootUser.email == 'huraira@gmail.com' || rootUser.email == 'admin@gmail.com') {
                    res.send({ msg: 'admin', data: rootUser })
                } else {
                    res.send({ msg: "loggedin", data: rootUser });
                }
            }
        } else {
            res.send({ msg: "notloggedin" });
        }
    } catch (error) {
        console.log(error);
    }
})
router.post('/myBidsData', async (req, res) => {
    try {
        const { myBids } = req.body;
        if (myBids) {
            const ProductIds = myBids.map(item => item.ProductId);
            const products = await ProductModel.find({ _id: { $in: ProductIds } });
            const AllProducts = await ProductModel.find();
            res.send({ msg: 'success', products, AllProducts });
        }
    } catch (error) {
        console.log(error);
    }
})
// Admin Seller Queries
router.get('/allSellerQueries', async (req, res) => {
    try {
        const token = req.header("authToken");
        if (token.length > 10) {
            const verifyToken = jwt.verify(token, "helloiamabuhurairastudentofuniversityofokara");
            const rootUser = await UserModel.findOne({ _id: verifyToken._id, "tokens.token": token });
            if (rootUser.email === 'admin@gmail.com' || 'huraira@gmail.com') {
                const result = await UserModel.aggregate([
                    {
                        $project: {
                            Enquiries: 1,
                            _id: 0
                        }
                    },
                    {
                        $unwind: "$Enquiries"
                    },
                    {
                        $sort: {
                            "Enquiries.date": -1
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            Enquiries: { $push: "$Enquiries" }
                        }
                    }
                ]);
                if (result) {
                    res.send({ msg: 'success', data: result })
                }
            }
        } else {
            res.send({ msg: "failed" });
        }
    } catch (error) {
        console.log(error);
    }
})
// User Submit Seller Query
router.post('/sellInquiry/:id', upload.array('images'), async (req, res) => {
    try {
        console.log(req.body);
        // console.log(req.params.id);
        // console.log(req.files);
        const { firstName, lastName, email, phone, category, carMake, carModel, notes, userlogged } = req.body;
        console.log(userlogged);
        const { files } = req;
        const urls = [];
        if (userlogged === 'false' || userlogged === false || userlogged === 'null' || userlogged === null) {
            console.log('console 1');
            res.send({ msg: 'success' });

            const logoUrl = "https://res.cloudinary.com/def8v05xk/image/upload/v1692188819/site-logo_dcrv76.png";
            let htmlString = `            
                        <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; background-color: #f7f7f7; padding: 20px; ">
                            <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 5px 5px 0 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 30px; position: relative; ">
                                <a href="http://localhost:3000" style="text-decoration: none;">
                                    <img src="${logoUrl}" alt="auto-auctions.co" style="display: block; margin: 0 auto; max-width: 100%; height: 4.5rem;">
                                </a>
                                <h1 style="font-size: 18px; font-weight: bold; margin-top: 0; margin-bottom: 20px; color: #003949; text-align: center; font-family: system-ui;">Inquiry submission alert.</h1>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">I hope this email finds you well. I wanted to inform you that we have received a new inquiry from a potential customer or user. Please find the details below:</p>                        
                                <p style="margin: 0 0 10px; color: #333; margin-bottom: 15px; font-size: 16px; font-weight: bold; ">User Information (User is not signed up with us)</p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Name: ${firstName + " " + lastName} </p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Email: ${email} </p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Phone: ${phone} </p>
                                <p style="margin: 0 0 10px; color: #333; margin-bottom: 15px; font-size: 16px; font-weight: bold; ">Vehicle Details</p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Car Make: ${carMake}</p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Car Model: ${carModel}</p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Notes: ${notes} </p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Please take the necessary steps to review and respond to this inquiry promptly. If you require any additional information or have specific instructions, please don't hesitate to contact our support team at <a href="mailto:hurairaprince889@gmail.com">hurairaprince889@gmail.com</a> We're here to help!.</p>
                                <br />
                                <p style="margin: 0 0 10px; color:#333;  font-size: 16px;">Best Regards,</p>
                                <p style="margin: 0 0 10px; color:#333; font-size: 16px;">Auto Auctions</p>
                            </div>
                            <div class="container" style="max-width: 660px; margin: 0 auto; border-radius: 0 0 5px 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); position: relative; ">                    
                                <div style="border-top: 1px solid #205260;  background-color: #003949; padding: 17px 0; border-radius: 0 0 5px 5px; text-align: center;">
                                    <div style="font-weight: 500; font-size: 15px; line-height: 20px; color: #fff; margin: 0;">
                                        Autosauctions © copyright 2023
                                    </div>
                                    <div style="font-weight: 400; font-size: 11px; line-height: 20px; color: #d1d1d1; margin: 0;">
                                        You can <a href="http://localhost:3000" style=" color: #fff; cursor: pointer; text-decoration: none; " >unsbscribe</a> receiving emails
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
            const mailOptions = {
                from: sender,
                to: sender,
                subject: 'Inquiry submission alert',
                html: htmlString
            };
            transporter.sendMail(mailOptions, async function (error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent:');
                }
            });
        } else {
            console.log('else entered')
            if (req.files) {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const result = await cloudinary.uploader.upload(file.path);
                    urls.push(result.secure_url);
                }
                // console.log(urls);
                const result2 = await UserModel.updateOne({ _id: req.params.id }, { $push: { Enquiries: { firstName, lastName, email, phone, category, carMake, carModel, notes, images: urls } } });
                if (result2) {
                    console.log('console 2');
                    res.send({ msg: 'success' });
                    const logoUrl = "https://res.cloudinary.com/def8v05xk/image/upload/v1692188819/site-logo_dcrv76.png";
                    let htmlString = `            
                        <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; background-color: #f7f7f7; padding: 20px; ">
                            <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 5px 5px 0 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 30px; position: relative; ">
                                <a href="http://localhost:3000" style="text-decoration: none;">
                                    <img src="${logoUrl}" alt="auto-auctions.co" style="display: block; margin: 0 auto; max-width: 100%; height: 4.5rem;">
                                </a>
                                <h1 style="font-size: 18px; font-weight: bold; margin-top: 0; margin-bottom: 20px; color: #003949; text-align: center; font-family: system-ui;">Inquiry submission alert.</h1>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">I hope this email finds you well. I wanted to inform you that we have received a new inquiry from a potential customer or user. Please find the details below:</p>                        
                                <p style="margin: 0 0 10px; color: #333; margin-bottom: 15px; font-size: 16px; font-weight: bold; ">User Information</p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Name: ${firstName + " " + lastName} </p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Email: ${email} </p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Phone: ${phone} </p>
                                <p style="margin: 0 0 10px; color: #333; margin-bottom: 15px; font-size: 16px; font-weight: bold; ">Vehicle Details</p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Car Make: ${carMake}</p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Car Model: ${carModel}</p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Notes: ${notes} </p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Please take the necessary steps to review and respond to this inquiry promptly. If you require any additional information or have specific instructions, please don't hesitate to contact our support team at <a href="mailto:hurairaprince889@gmail.com">hurairaprince889@gmail.com</a> We're here to help!</p>
                                <br />
                                <p style="margin: 0 0 10px; color:#333;  font-size: 16px;">Best Regards,</p>
                                <p style="margin: 0 0 10px; color:#333; font-size: 16px;">Auto Auctions</p>
                            </div>
                            <div class="container" style="max-width: 660px; margin: 0 auto; border-radius: 0 0 5px 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); position: relative; ">                    
                                <div style="border-top: 1px solid #205260;  background-color: #003949; padding: 17px 0; border-radius: 0 0 5px 5px; text-align: center;">
                                    <div style="font-weight: 500; font-size: 15px; line-height: 20px; color: #fff; margin: 0;">
                                        Autosauctions © copyright 2023
                                    </div>
                                    <div style="font-weight: 400; font-size: 11px; line-height: 20px; color: #d1d1d1; margin: 0;">
                                        You can <a href="http://localhost:3000" style=" color: #fff; cursor: pointer; text-decoration: none; " >unsbscribe</a> receiving emails
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    const mailOptions = {
                        from: sender,
                        // to: 'sami.mahfouz@live.co.uk',
                        to: sender,
                        subject: 'Inquiry submission alert',
                        html: htmlString
                    };
                    transporter.sendMail(mailOptions, async function (error, info) {
                        if (error) {
                            console.log(error);
                        } else {
                            console.log('Email sent:');
                        }
                    });
                } else {
                    res.send({ msg: 'failed' });
                    console.log('console 3');
                }
            } else {
                const result3 = await UserModel.updateOne({ _id: req.params.id }, { $push: { Enquiries: { firstName, lastName, email, phone, category, carMake, carModel, notes, images: [] } } });
                if (result3) {
                    res.send({ msg: 'success' });
                    console.log('console 4');
                    const logoUrl = "https://res.cloudinary.com/def8v05xk/image/upload/v1692188819/site-logo_dcrv76.png";
                    let htmlString = `            
                        <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; background-color: #f7f7f7; padding: 20px; ">
                            <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 5px 5px 0 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 30px; position: relative; ">
                                <a href="http://localhost:3000" style="text-decoration: none;">
                                    <img src="${logoUrl}" alt="auto-auctions.co" style="display: block; margin: 0 auto; max-width: 100%; height: 4.5rem;">
                                </a>
                                <h1 style="font-size: 18px; font-weight: bold; margin-top: 0; margin-bottom: 20px; color: #003949; text-align: center; font-family: system-ui;">Inquiry submission alert.</h1>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">I hope this email finds you well. I wanted to inform you that we have received a new inquiry from a potential customer or user. Please find the details below:</p>                        
                                <p style="margin: 0 0 10px; color: #333; margin-bottom: 15px; font-size: 16px; font-weight: bold; ">User Information</p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Name: ${firstName + " " + lastName} </p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Email: ${email} </p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Phone: ${phone} </p>
                                <p style="margin: 0 0 10px; color: #333; margin-bottom: 15px; font-size: 16px; font-weight: bold; ">Vehicle Details</p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Car Make: ${carMake}</p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Car Model: ${carModel}</p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Notes: ${notes} </p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Please take the necessary steps to review and respond to this inquiry promptly. If you require any additional information or have specific instructions, please don't hesitate to contact our support team at <a href="mailto:hurairaprince889@gmail.com">hurairaprince889@gmail.com</a> We're here to help!.</p>
                                <br />
                                <p style="margin: 0 0 10px; color:#333;  font-size: 16px;">Best Regards,</p>
                                <p style="margin: 0 0 10px; color:#333; font-size: 16px;">Auto Auctions</p>
                            </div>
                            <div class="container" style="max-width: 660px; margin: 0 auto; border-radius: 0 0 5px 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); position: relative; ">                    
                                <div style="border-top: 1px solid #205260;  background-color: #003949; padding: 17px 0; border-radius: 0 0 5px 5px; text-align: center;">
                                    <div style="font-weight: 500; font-size: 15px; line-height: 20px; color: #fff; margin: 0;">
                                        Autosauctions © copyright 2023
                                    </div>
                                    <div style="font-weight: 400; font-size: 11px; line-height: 20px; color: #d1d1d1; margin: 0;">
                                        You can <a href="http://localhost:3000" style=" color: #fff; cursor: pointer; text-decoration: none; " >unsbscribe</a> receiving emails
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    const mailOptions = {
                        from: sender,
                        to: 'sami.mahfouz@live.co.uk',
                        subject: 'Inquiry submission alert',
                        html: htmlString
                    };
                    transporter.sendMail(mailOptions, async function (error, info) {
                        if (error) {
                            console.log(error);
                        } else {
                            console.log('Email sent:');
                        }
                    });

                } else {
                    console.log('console 5');
                    res.send({ msg: 'failed' });
                }
            }
        }
    } catch (error) {
        console.log(error);
    }
})
router.get('/deleteInquiry/:id', async (req, res) => {
    try {
        console.log(req.params.id);
        const token = req.header("authToken");
        if (token.length > 10) {
            const verifyToken = jwt.verify(token, "helloiamabuhurairastudentofuniversityofokara");
            const rootUser = await UserModel.findOne({ _id: verifyToken._id, "tokens.token": token });
            if (rootUser.email === 'admin@gmail.com') {
                const result = await UserModel.updateMany(
                    { "Enquiries._id": req.params.id },
                    { $pull: { Enquiries: { _id: req.params.id } } }
                );
                if (result) {
                    res.send({ msg: 'success' });
                } else {
                    res.send({ msg: 'failed' });
                }
            } else {
                console.log("Not Accessed");
                // res.send({msg:'Unauthorized request'});
            }
        }
    } catch (error) {
        console.log(error);
    }
})
router.post('/mydetails/:id', async (req, res) => {
    try {
        console.log(req.body);
        var usernameChanged = '';
        var emailChanged = '';
        const newUsername = req.body.username;
        const newEmail = req.body.email;
        const user = await UserModel.findOne({ _id: req.params.id });
        if (user) {
            if (newUsername !== user.username) {
                console.log('Changing Username');
                const updateUsername = await UserModel.updateOne({ _id: req.params.id }, { $set: { username: req.body.username } })
                if (updateUsername) {
                    // res.send({msg:'successUsername'});
                    usernameChanged = 'usernameChanged';
                }
            }
            if (newEmail !== user.email) {
                console.log('Changing email');
                const updateEmail = await UserModel.updateOne({ _id: req.params.id }, { $set: { email: req.body.email } })
                if (updateEmail) {
                    // res.send({msg:'successEmail'});
                    emailChanged = 'emailChanged';
                }
            }
            res.send({ usernameChanged: usernameChanged, emailChanged: emailChanged });
        } else {
            res.send({ msg: 'noUser' })
        }
    } catch (error) {
        console.log(error);
    }
})
router.post('/checkUniqueName', async (req, res) => {
    try {
        console.log(req.body);
        // res.send({msg:'success'});
    } catch (error) {
        console.log(error);
    }
})
// Send email with verif button
router.get('/email-verify/:email', async (req, res) => {
    try {
        console.log("sending");
        console.log(req.params.email);
        const token = crypto.randomBytes(20).toString("hex");
        // let htmlString = `
        // <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; background-color: #f7f7f7; padding: 20px;">
        //     <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 30px;">
        //         <div style="font-size: 26px; font-weight: bold; margin-top: 0; margin-bottom: 10px; color: #EF9523; text-decoration: none; text-align: center;">auto-auctions.co</div>
        //         <h1 style="font-size: 22px; font-weight: bold; margin-top: 0; margin-bottom: 20px; color: #333; text-align: center;">Verify your Email</h1>
        //         <p style="margin: 0 0 10px; font-size: 16px;">Thank you for joining our auction platform and showing interest in bidding on exciting items. To ensure a secure and trustworthy bidding experience for all our users, we require email verification to activate your bidding privileges. By completing this process, you will gain full access to our auction listings and be able to participate in bidding.</p>
        //         <p style="margin: 0 0 10px; font-size: 16px;">Click the following button to verify your email</p>
        //         <a href="http://localhost:3000/verify-email/${token}" style="text-decoration: none; background-color: #EF9523; color: #fff; padding: 10px 20px; border: none; border-radius: 5px; font-size: 16px; margin-bottom: 6px;">Verify Email</a>
        //     </div>
        // </div>
        // `;
        const logoUrl = "https://res.cloudinary.com/def8v05xk/image/upload/v1692188819/site-logo_dcrv76.png";
        let htmlString = `            
            <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; background-color: #f7f7f7; padding: 20px; ">
                <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 5px 5px 0 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 30px; position: relative; ">
                    <a href="http://localhost:3000" style="text-decoration: none;">
                        <img src="${logoUrl}" alt="auto-auctions.co" style="display: block; margin: 0 auto; max-width: 100%; height: 4.5rem;">
                    </a>
                    <h1 style="font-size: 18px; font-weight: bold; margin-top: 0; margin-bottom: 20px; color: #003949; text-align: center; font-family: system-ui;">Please verify your email here</h1>
                    <p style="margin: 0 0 10px; font-size: 16px; color: black; ">Thank you for enrolling on our auction platform and expressing interest in participating in our auctions. In order to uphold a secure and credible bidding environment for all our esteemed users, we kindly request your cooperation in verifying your email address, a necessary step to activate your bidding privileges.</p>
                    <p style="margin: 0 0 10px; font-size: 16px;">Click the following button to verify your email.</p>                    
                    <a href="http://localhost:3000/verify-email/${token}" style="text-decoration: none; background-color: #003949; color: #fff; padding: 8px 14px; border: none; border-radius: 5px; font-size: 13px; margin-bottom: 6px;">VERIFY EMAIL</a>                                     
                </div>
                <div class="container" style="max-width: 660px; margin: 0 auto; border-radius: 0 0 5px 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); position: relative; ">                    
                    <div style="border-top: 1px solid #205260;  background-color: #003949; padding: 17px 0; border-radius: 0 0 5px 5px; text-align: center;">
                        <div style="font-weight: 500; font-size: 15px; line-height: 20px; color: #fff; margin: 0;">
                            Autosauctions © copyright 2023
                        </div>
                        <div style="font-weight: 400; font-size: 11px; line-height: 20px; color: #d1d1d1; margin: 0;">
                            You can <a href="http://localhost:3000" style=" color: #fff; cursor: pointer; text-decoration: none; " >unsbscribe</a> receiving emails
                        </div>
                    </div>
                </div>
            </div>
        `;
        const mailOptions = {
            from: sender,
            to: req.params.email,
            subject: 'Please verify your email',
            html: htmlString
        };
        transporter.sendMail(mailOptions, async function (error, info) {
            if (error) {
                console.log(error);
                res.send({ msg: 'failed' });
            } else {
                res.send({ msg: 'success' });
                console.log('Email sent:');
                await UserModel.findOneAndUpdate({ email: req.params.email }, { $push: { emailTokens: token } });
            }
        });
    } catch (error) {
        console.log(error);
    }

})
// verify email with params token
router.get('/email-verify-on-visit/:token', async (req, res) => {
    try {
        // console.log(req.params.token);
        const user = await UserModel.findOneAndUpdate(
            { emailTokens: { $in: [req.params.token] } },
            { emailVerified: true },
            { new: true }
        );
        console.log(user);
        if (user) {
            res.send({ msg: 'success' });
            user.emailTokens.pull(req.params.token);
            await user.save();
        } else {
            res.send({ msg: 'invalid' });
        }
    } catch (error) {
        console.log(error);
    }
})
router.post('/forgot-password', async (req, res) => {
    try {
        console.log(req.body);
        const email = req.body.email;
        const user = await UserModel.findOne({ email });
        // console.log(user);
        const now = Date.now();
        const expiresAt = user.resetPassAppliedDate ? user.resetPassAppliedDate.getTime() : 0;
        const thirtyMinutes = 10 * 60 * 1000;    //10 minutes      
        if (user) {
            if (now > (expiresAt + thirtyMinutes)) {
                const token = crypto.randomBytes(20).toString("hex");
                console.log(token);
                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
                user.resetPassAppliedDate = Date.now();
                const result = await user.save();
                if (result) {
                    // let htmlString = `
                    //     <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; background-color: #f7f7f7; padding: 20px;">
                    //         <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 30px;">
                    //             <div style="font-size: 26px; font-weight: bold; margin-top: 0; margin-bottom: 10px; color: #EF9523; text-align: center; text-decoration: none;">auto-auctions.co</div>
                    //             <h1 style="font-size: 22px; font-weight: bold; margin-top: 0; margin-bottom: 20px; color: #333; text-align: center;">Link for Resetting Password</h1>
                    //             <p style="margin: 0 0 10px; font-size: 16px;">Dear <span style="font-weight: 600; font-size: 16px;">${result.username},</span></p>
                    //             <p style="font-size: 16px;" >We are writing to inform you that we have received your request to reset your password. As requested, we are sending you a link to reset your password so that you can regain access to your account.</p>
                    //             <p style="margin-bottom: -10px; font-size: 16px;">Please click on the following link to reset your password:</p>
                    //             <a style="font-size: 14px;" href="http://localhost:3000/reset-password-link/${token}">http://localhost:3000/reset-password-link/${token}</a>
                    //             <p style="font-size: 14px;" >Please note that the link will expire in 24 hours. If you do not reset your password within this timeframe, you will need to request another password reset.</p>
                    //             <p style="font-size: 14px;" >If you did not request a password reset or if you believe your account has been compromised, please contact our support team immediately at <span style={{color: "#0a960a",fontWeight: "600"}}>hurairaprince889@gmail.com</span>.</p>
                    //             <p style="font-size: 14px;" >Thank you for using our services. We appreciate your business and are committed to providing you with the best possible user experience.</p>
                    //             <p style="margin-bottom:'0'; font-size: 14px;" >Sincerely,</p>
                    //             <p style="font-size: 14px; font-weight: 600;" >Auto Auction</p>
                    //         </div>
                    //     </div>
                    // `;
                    const logoUrl = "https://res.cloudinary.com/def8v05xk/image/upload/v1692188819/site-logo_dcrv76.png";
                    let htmlString = `            
                        <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; background-color: #f7f7f7; padding: 20px; ">
                            <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 5px 5px 0 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 30px; position: relative; ">
                                <a href="http://localhost:3000" style="text-decoration: none;">
                                    <img src="${logoUrl}" alt="auto-auctions.co" style="display: block; margin: 0 auto; max-width: 100%; height: 4.5rem;">
                                </a>
                                <h1 style="font-size: 18px; font-weight: bold; margin-top: 0; margin-bottom: 20px; color: #003949; text-align: center; font-family: system-ui;">Link for Resetting Password</h1>
                                <p style="margin: 0 0 10px; font-size: 16px;">Dear <span style="font-weight: 600; font-size: 16px;">${result.username},</span></p>
                                <p style="font-size: 16px;" >We are writing to inform you that we have received your request to reset your password. As requested, we are sending you a link to reset your password so that you can regain access to your account.</p>
                                <p style="margin: 0 0 10px; font-size: 16px;">Click the button to reset your password.</p>
                                <br />
                                <a href="http://localhost:3000/reset-password-link/${token}" style="text-decoration: none; background-color: #003949; color: #fff; padding: 8px 14px; border: none; border-radius: 5px; font-size: 13px; margin-bottom: 6px;">RESET PASSWORD</a>                  
                                <p style="font-size: 14px;" color: black; >Please note that the link will expire in 24 hours. If you do not reset your password within this timeframe, you will need to request another password reset.</p>
                                <p style="font-size: 14px;" color: black; >If you did not request a password reset or if you believe your account has been compromised, please contact our support team immediately at <span style={{color: "#0a960a",fontWeight: "600"}}>hurairaprince889@gmail.com</span>.</p>
                                <p style="font-size: 14px;" color: black; >Thank you for using our services. We appreciate your business and are committed to providing you with the best possible user experience.</p>
                                <p style="margin-bottom:'0'; font-size: 14px; color: black;" >Sincerely,</p>
                                <p style="font-size: 14px; font-weight: 600; color: black;" >Auto Auction</p>
                            </div>
                            <div class="container" style="max-width: 660px; margin: 0 auto; border-radius: 0 0 5px 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); position: relative; ">                    
                                <div style="border-top: 1px solid #205260;  background-color: #003949; padding: 17px 0; border-radius: 0 0 5px 5px; text-align: center;">
                                    <div style="font-weight: 500; font-size: 15px; line-height: 20px; color: #fff; margin: 0;">
                                        Autosauctions © copyright 2023
                                    </div>
                                    <div style="font-weight: 400; font-size: 11px; line-height: 20px; color: #d1d1d1; margin: 0;">
                                        You can <a href="http://localhost:3000" style=" color: #fff; cursor: pointer; text-decoration: none; " >unsbscribe</a> receiving emails
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    const mailOptions = {
                        from: sender,
                        to: result.email,
                        subject: `Reset Password Link Autoauction Account`,
                        html: htmlString
                    };
                    transporter.sendMail(mailOptions, function (error, info) {
                        if (error) {
                            console.log(error);
                        } else {
                            res.send({ msg: 'success' });
                            console.log('Email sent: ' + info.response);
                        }
                    });
                }
            } else {
                console.log("TIMEOUT");
                res.send({ msg: 'timeout' });
            }
        } else {
            res.send({ msg: 'no user' });
        }

    } catch (error) {
        console.log(error);
    }
})
router.post('/reset-password-link/:token', async (req, res) => {
    try {
        const { newPassword } = req.body;
        // console.log(newPassword);
        const token = req.params.token;
        const cryptedPassword = await bcrypt.hash(newPassword, 12);
        const tokenMatch = await UserModel.findOne({ resetPasswordToken: token });
        if (tokenMatch) {
            const updatePass = await UserModel.findOneAndUpdate(
                { resetPasswordToken: token },
                { $set: { password: cryptedPassword, resetPasswordToken: null, resetPasswordExpires: null } },
                { new: true }
            );
            if (updatePass) {
                res.send({ msg: "success" });
            } else {
                res.send({ msg: "failed" })
            }
        } else {
            res.send({ msg: "failed" })
        }
    } catch (error) {
        console.log(error);
    }
})
// Consignment form email
router.post('/consignmentForm', async (req, res) => {
    try {
        // console.log(req.body);
        const logoUrl = "https://res.cloudinary.com/def8v05xk/image/upload/v1692188819/site-logo_dcrv76.png";
        const token = crypto.randomBytes(20).toString("hex");
        const { to, subject, body, firstName, lastName, carMake, carModel, images, notes } = req.body;
        let htmlString = `            
            <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; background-color: #f7f7f7; padding: 20px; ">
                <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 5px 5px 0 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 30px; position: relative; ">
                    <a href="http://localhost:3000" style="text-decoration: none;">
                        <img src="${logoUrl}" alt="auto-auctions.co" style="display: block; margin: 0 auto; max-width: 100%; height: 4.5rem;">
                    </a>
                    <h1 style="font-size: 18px; font-weight: bold; margin-top: 0; margin-bottom: 20px; color: #003949; text-align: center; font-family: system-ui;">Invitation to submit consignment form</h1>
                    <p style="margin: 0 0 10px; font-size: 16px;">${body}</p>
                    <p style="margin: 0 0 10px; font-size: 16px;">Click the button or use link to submit consignment form.</p>
                    <a href="http://localhost:3000/consignment-form/${token}" style=" text-decoration: none; margin: 0 0 10px; font-size: 16px; color: #003949; font-weight: 600; ">http://localhost:3000/consignment-form/${token}</a>
                    <br /> <br />
                    <a href="http://localhost:3000/consignment-form/${token}" style="text-decoration: none; background-color: #003949; color: #fff; padding: 8px 14px; border: none; border-radius: 5px; font-size: 13px; margin-bottom: 6px;">SUBMIT FORM</a>
                    <p style="margin: 1rem 0 0 0; font-size: 16px;">Following is the refference information to navigate:</p>
                    <ul style="list-style: none; padding: 0; margin-top: 0.2rem; margin-left: 1rem; list-style: disc;">
                        <li style="font-size: 15px;"> Car make is ${carMake}</li>
                        <li style="font-size: 15px;"> Car model ${carModel}</li>
                        <li style="font-size: 15px;"> Requested by ${firstName + " " + lastName}</li>
                    </ul>                   
                </div>
                <div class="container" style="max-width: 660px; margin: 0 auto; border-radius: 0 0 5px 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); position: relative; ">                    
                    <div style="border-top: 1px solid #205260;  background-color: #003949; padding: 17px 0; border-radius: 0 0 5px 5px; text-align: center;">
                        <div style="font-weight: 500; font-size: 15px; line-height: 20px; color: #fff; margin: 0;">
                            Autosauctions © copyright 2023
                        </div>
                        <div style="font-weight: 400; font-size: 11px; line-height: 20px; color: #d1d1d1; margin: 0;">
                            You can <a href="http://localhost:3000" style=" color: #fff; cursor: pointer; text-decoration: none; " >unsbscribe</a> receiving emails
                        </div>
                    </div>
                </div>
            </div>
        `;
        const mailOptions = {
            from: sender,
            to: to,
            subject: subject,
            html: htmlString
        };
        transporter.sendMail(mailOptions, async function (error, info) {
            if (error) {
                console.log(error);
                res.send({ msg: 'failed' });
            } else {
                res.send({ msg: 'success' });
                console.log('Email sent:');
                await UserModel.findOneAndUpdate({ email: to }, { $push: { consignmentTokens: { token, firstName, lastName, carMake, carModel, images, notes, email: to } }, $inc: { consignmentPoints: 1 } });
            }
        });
    } catch (error) {
        console.log(error);
    }
})
// Consignment Form Submission UploadConsignment
router.post('/UploadConsignment/:token', upload.array('images'), async (req, res) => {
    try {
        console.log(req.params.token);
        // Converting ref images to an array
        const imageArray = req.body.ref_images.split(',');
        const user = await UserModel.findOne({ "consignmentTokens.token": req.params.token }, { email: 1, _id: 0 });
        console.log(user);
        if (!user) {
            res.send({ msg: 'notoken' });
            return;
        }
        const { files } = req;
        const image_urls = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const result = await cloudinary.uploader.upload(file.path);
            image_urls.push(result.secure_url);
        }
        const newConsignment = await UserModel.findOneAndUpdate(
            { "consignmentTokens.token": req.params.token },
            {
                $push: {
                    consignments: {
                        name: req.body.name,
                        email: req.body.email,
                        phone: req.body.phone,
                        price: req.body.price,
                        year: req.body.year,
                        make: req.body.make,
                        model: req.body.model,
                        located: req.body.located,
                        mileage: req.body.mileage,
                        owners: req.body.owners,
                        license: req.body.license,
                        chassis: req.body.chassis,
                        engineSize: req.body.engineSize,
                        engineType: req.body.engineType,
                        transmission: req.body.transmission,
                        speeds: req.body.speeds,
                        exteriorColor: req.body.exteriorColor,
                        interiorColor: req.body.interiorColor,
                        bodyworkDamage: req.body.bodyworkDamage,
                        paintworkDamage: req.body.paintworkDamage,
                        discolouration: req.body.discolouration,
                        faults: req.body.faults,
                        cambelt: req.body.cambelt,
                        conditionOfTyres: req.body.conditionOfTyres,
                        notOriginalParts: req.body.notOriginalParts,
                        customised: req.body.customised,
                        knownFaults: req.body.knownFaults,
                        p3q1: req.body.p3q1,
                        p3q2: req.body.p3q2,
                        p3q3: req.body.p3q3,
                        p3q4: req.body.p3q4,
                        p3q5: req.body.p3q5,
                        p3q6: req.body.p3q6,
                        p3q7: req.body.p3q7,
                        p3q8: req.body.p3q8,
                        p3q9: req.body.p3q9,
                        p3q10: req.body.p3q10,
                        p3q11: req.body.p3q11,
                        p3q12: req.body.p3q12,
                        p3q13: req.body.p3q13,
                        image_urls: image_urls,
                        reference: {
                            carMake: req.body.carMake,
                            carModel: req.body.carModel,
                            firstName: req.body.firstName,
                            lastName: req.body.lastName,
                            notes: req.body.notes,
                            date: req.body.date,
                            ref_token: req.body.ref_token,
                            ref_images: imageArray,
                        },
                    },
                },
                $inc: {
                    consignmentPoints: -1
                },
                $pull: {
                    consignmentTokens: {
                        token: req.params.token
                    }
                },
            },
            { new: true }
        );
        if (newConsignment) {
            res.send({ msg: 'success' });
            console.log('form submission');
            const logoUrl = "https://res.cloudinary.com/def8v05xk/image/upload/v1692188819/site-logo_dcrv76.png";
            let htmlString = `            
                        <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; background-color: #f7f7f7; padding: 20px; ">
                            <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 5px 5px 0 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 30px; position: relative; ">
                                <a href="http://localhost:3000" style="text-decoration: none;">
                                    <img src="${logoUrl}" alt="auto-auctions.co" style="display: block; margin: 0 auto; max-width: 100%; height: 4.5rem;">
                                </a>
                                <h1 style="font-size: 18px; font-weight: bold; margin-top: 0; margin-bottom: 20px; color: #003949; text-align: center; font-family: system-ui;">Someone Submitted Consignment Form.</h1>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">I hope this email finds you well. I wanted to inform you that we have received a new consignment from a potential customer or user. Please find the details below:</p>                        
                                <p style="margin: 0 0 10px; color: #333; margin-bottom: 15px; font-size: 16px; font-weight: bold; ">User Information</p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Name: ${req.body.firstName + " " + req.body.lastName} </p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Email: ${req.body.email} </p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Phone: ${req.body.phone} </p>
                                <p style="margin: 0 0 10px; color: #333; margin-bottom: 15px; font-size: 16px; font-weight: bold; ">Vehicle Details</p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Car Make: ${req.body.carMake}</p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Car Model: ${req.body.carModel}</p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Notes: ${req.body.notes} </p>
                                <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Please take the necessary steps to review and respond to this inquiry promptly. If you require any additional information or have specific instructions, please don't hesitate to contact our support team at <a href="mailto:hurairaprince889@gmail.com">hurairaprince889@gmail.com</a> We're here to help!.</p>
                                <br />
                                <p style="margin: 0 0 10px; color:#333;  font-size: 16px;">Best Regards,</p>
                                <p style="margin: 0 0 10px; color:#333; font-size: 16px;">Auto Auctions</p>
                            </div>
                            <div class="container" style="max-width: 660px; margin: 0 auto; border-radius: 0 0 5px 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); position: relative; ">                    
                                <div style="border-top: 1px solid #205260;  background-color: #003949; padding: 17px 0; border-radius: 0 0 5px 5px; text-align: center;">
                                    <div style="font-weight: 500; font-size: 15px; line-height: 20px; color: #fff; margin: 0;">
                                        Autosauctions © copyright 2023
                                    </div>
                                    <div style="font-weight: 400; font-size: 11px; line-height: 20px; color: #d1d1d1; margin: 0;">
                                        You can <a href="http://localhost:3000" style=" color: #fff; cursor: pointer; text-decoration: none; " >unsbscribe</a> receiving emails
                                    </div>
                                </div>
                            </div>
                        </div>
            `;
            const mailOptions = {
                from: sender,
                to: sender,
                subject: 'Consignment submission alert',
                html: htmlString
            };
            transporter.sendMail(mailOptions, async function (error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent:');
                }
            });
        } else {
            res.send({ msg: 'failed' });
        }
    } catch (error) {
        console.log(error);
    }
})
// Retrieve token reference for token generated to submit consignment
router.get('/RetrieveTokenReference/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const result = await UserModel.findOne({ "consignmentTokens.token": token }, { "consignmentTokens.$": 1 });
        console.log(token);
        console.log(result);
        if (result) {
            res.send({ msg: "success", data: result.consignmentTokens[0] });
        } else {
            res.send({ msg: "failed" });
        }
    } catch (error) {
        console.log(error);
    }
})
router.post('/SendEmail', async (req, res) => {
    try {
        // console.log(req.body);
        const { to, subject, body, firstName, lastName, carMake, carModel } = req.body;
        const logoUrl = "https://res.cloudinary.com/def8v05xk/image/upload/v1692188819/site-logo_dcrv76.png";
        let htmlString = `              
            <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; background-color: #f7f7f7; padding: 20px; ">
                <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 5px 5px 0 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 30px; position: relative; ">
                    <a href="http://localhost:3000" style="text-decoration: none;">
                        <img src="${logoUrl}" alt="auto-auctions.co" style="display: block; margin: 0 auto; max-width: 100%; height: 4.5rem;">
                    </a>
                    <h1 style="font-size: 18px; font-weight: bold; margin-top: 0; margin-bottom: 20px; color: #003949; text-align: center; font-family: system-ui;">More information required for consignment process</h1>
                    <p style="margin: 0 0 10px; font-size: 16px;">${body}</p>
                    <p style="margin: 1rem 0 0 0; font-size: 16px;">Following is the refference information to navigate:</p>
                    <ul style="list-style: none; padding: 0; margin-top: 0.2rem; margin-left: 1rem; list-style: disc;">
                        <li style="font-size: 15px;"> Car make is ${carMake}</li>
                        <li style="font-size: 15px;"> Car model ${carModel}</li>
                        <li style="font-size: 15px;"> Requested by ${firstName + " " + lastName}</li>
                    </ul>                   
                </div>
                <div class="container" style="max-width: 660px; margin: 0 auto; border-radius: 0 0 5px 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); position: relative; ">                    
                    <div style="border-top: 1px solid #205260;  background-color: #003949; padding: 17px 0; border-radius: 0 0 5px 5px; text-align: center;">
                        <div style="font-weight: 500; font-size: 15px; line-height: 20px; color: #fff; margin: 0;">
                            Autosauctions © copyright 2023
                        </div>
                        <div style="font-weight: 400; font-size: 11px; line-height: 20px; color: #d1d1d1; margin: 0;">
                            You can <a href="http://localhost:3000" style=" color: #fff; cursor: pointer; text-decoration: none; " >unsbscribe</a> receiving emails
                        </div>
                    </div>
                </div>
            </div>
        `;
        const mailOptions = {
            from: sender,
            to: to,
            subject: subject,
            html: htmlString
        };
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
                res.send({ msg: 'failed' });
            } else {
                res.send({ msg: 'success' });
                console.log('Email sent: ' + info.response);
            }
        });
    } catch (error) {
        console.log(error);
    }
})
// Article Api
router.post('/UploadArticle', upload.array('images'), async (req, res) => {
    try {

        const { by, title, metaTitle, metaDescription, metaKeywords, category, para1, para2, para3, para4 } = req.body;
        const { files } = req;
        const urls = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const result = await cloudinary.uploader.upload(file.path);
            urls.push(result.secure_url);
        }
        console.log(urls);

        const newArticle = await ArticleModel({ by, title, metaTitle, metaDescription, metaKeywords, category, para1, para2, para3, para4, images: urls });
        const result = await newArticle.save();

        if (result) {
            res.send({ msg: 'success' });
        } else {
            res.send({ msg: 'failed' });
        }
    } catch (error) {
        console.log(error);
    }
});
// Product Page Api
router.post('/UpdateProduct/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'images1', maxCount: 500 }, { name: 'images2', maxCount: 500 }, { name: 'images3', maxCount: 500 }, { name: 'images4', maxCount: 500 }]), async (req, res) => {
    try {
        // console.log("Heoo");
        const { title, originalTitle, VIN, carModel, userEmail, category, duration, startPrice, price, side, country, OdometerReading, unit, TransmissionType, color,
            EngineDisplacement, VIP, ModelNumber, lotNumber, saleType, summary, youtubeLink, thumbnail, metaTitle, metaDescription, metaKeywords } = req.body;
        const keyFactors = JSON.parse(req.body.keyFactors);
        const equipmenatAndFeatures = JSON.parse(req.body.equipmenatAndFeatures);
        const condition = JSON.parse(req.body.condition);
        const serviceHistory = JSON.parse(req.body.serviceHistory);
        
        const images1OldUrls = JSON.parse(req.body.images1Rem);
        const images1OldUrlsOpt = JSON.parse(req.body.images1RemOpt);
        const Images1ToBeDeleted = JSON.parse(req.body.Images1ToBeDeleted);

        const images2OldUrls = JSON.parse(req.body.images2Rem);
        const images2OldUrlsOpt = JSON.parse(req.body.images2RemOpt);
        const Images2ToBeDeleted = JSON.parse(req.body.Images2ToBeDeleted);
        console.log(req.body.images2Rem);
        console.log("optimized" + req.body.images2RemOpt);

        const images3OldUrls = JSON.parse(req.body.images3Rem);
        const images3OldUrlsOpt = JSON.parse(req.body.images3RemOpt);
        const Images3ToBeDeleted = JSON.parse(req.body.Images3ToBeDeleted);
        
        const images4OldUrls = JSON.parse(req.body.images4Rem);
        const images4OldUrlsOpt = JSON.parse(req.body.images4RemOpt);
        const Images4ToBeDeleted = JSON.parse(req.body.Images4ToBeDeleted);
        const uploadOptions = {
            transformation: [
                { width: 200, height: 150, crop: "fill", quality: "auto", format: "webp" }
            ]
        };

        let thumbnailLink = '';
        let imageToBeDeleted = '';
        if (req.body.thumbnailLink) {
            thumbnailLink = req.body.thumbnailLink;
        } else {
            const imageFile = req.files['image'] ? req.files['image'] : null;
            imageToBeDeleted = req.body.ImageToBeDeleted;
            const result = await cloudinary.uploader.upload(imageFile[0].path);
            if (result) {
                thumbnailLink = result.secure_url;
            }
        }
        // const images1OldUrls = JSON.parse(req.body.images1OldUrls);
        const images1 = req.files['images1']; // Array of files for images1 field
        const images2 = req.files['images2']; // Array of files for images2 field
        const images3 = req.files['images3']; // Array of files for images3 field
        const images4 = req.files['images4']; // Array of files for images4 field
        // upload and save secure_url in array
        if (images1) {
            for (let i = 0; i < images1.length; i++) {
                const file = images1[i];
                const result = await cloudinary.uploader.upload(file.path);
                images1OldUrls.push(result.secure_url);
                const result2 = await cloudinary.uploader.upload(file.path, uploadOptions);
                images1OldUrlsOpt.push(result2.secure_url);
                console.log(result2.secure_url)
            }
        }
        if (images2) {
            for (let i = 0; i < images2.length; i++) {
                const file = images2[i];
                const result = await cloudinary.uploader.upload(file.path);
                images2OldUrls.push(result.secure_url);
                const result2 = await cloudinary.uploader.upload(file.path, uploadOptions);
                images2OldUrlsOpt.push(result2.secure_url);
                console.log(result2.secure_url)
            }
        }
        if (images3) {
            for (let i = 0; i < images3.length; i++) {
                const file = images3[i];
                const result = await cloudinary.uploader.upload(file.path);
                images3OldUrls.push(result.secure_url);
                const result2 = await cloudinary.uploader.upload(file.path, uploadOptions);
                images3OldUrlsOpt.push(result2.secure_url);
                console.log(result2.secure_url)
            }
        }
        if (images4) {
            for (let i = 0; i < images4.length; i++) {
                const file = images4[i];
                const result = await cloudinary.uploader.upload(file.path);
                images4OldUrls.push(result.secure_url);
                const result2 = await cloudinary.uploader.upload(file.path, uploadOptions);
                images4OldUrlsOpt.push(result2.secure_url);
                console.log(result2.secure_url)
            }
        }
        const updatedProduct = await ProductModel.findOneAndUpdate(
            { _id: req.params.id },
            {
                title, originalTitle, VIN, carModel, userEmail, category, duration, startPrice, price, side, country, OdometerReading, unit, TransmissionType, color, EngineDisplacement,
                VIP, ModelNumber, lotNumber, saleType, summary, youtubeLink, keyFactors, equipmenatAndFeatures, condition, serviceHistory, metaTitle, metaDescription, metaKeywords,
                thumbnail: thumbnailLink, exteriorImages: images1OldUrls, interiorImages: images2OldUrls, mechanicalImages: images3OldUrls, documentsImages: images1OldUrls,
                exteriorImagesOptimized: images1OldUrlsOpt, 
                interiorImagesOptimized: images2OldUrlsOpt, 
                mechanicalImagesOptimized: images3OldUrlsOpt, 
                documentsImagesOptimized: images4OldUrlsOpt,
            },
            { new: true }
        );
        if (updatedProduct) {
            res.send({ msg: 'success' });
            if (imageToBeDeleted) {
                const publicId = cloudinary.url(imageToBeDeleted, { type: 'fetch' }).split('/').pop().split('.')[0];
                const res = await cloudinary.uploader.destroy(publicId);
            }
            if (Images1ToBeDeleted) {
                for (const imageUrl of Images1ToBeDeleted) {
                    const publicId = cloudinary.url(imageUrl, { type: 'fetch' }).split('/').pop().split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                }
            }
            if (Images2ToBeDeleted) {
                for (const imageUrl of Images2ToBeDeleted) {
                    const publicId = cloudinary.url(imageUrl, { type: 'fetch' }).split('/').pop().split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                }
            }
            if (Images3ToBeDeleted) {
                for (const imageUrl of Images3ToBeDeleted) {
                    const publicId = cloudinary.url(imageUrl, { type: 'fetch' }).split('/').pop().split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                }
            }
            if (Images4ToBeDeleted) {
                for (const imageUrl of Images4ToBeDeleted) {
                    const publicId = cloudinary.url(imageUrl, { type: 'fetch' }).split('/').pop().split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                }
            }
        } else {
            res.send({ msg: 'failed' });
        }
    } catch (error) {
        console.log(error);
    }
});
// router.get('/optimizeProductImages/:id', async (req, res) => {
//     const productId = req.params.id;
//     console.log(productId);

//     try {
//         // Find the product by ID
//         const product = await ProductModel.findById(productId);

//         if (!product) {
//             return res.send({ msg: 'Product not found' });
//         }

//         // Cloudinary upload options for optimization
//         const uploadOptions = {
//             transformation: [
//                 { width: 200, height: 150, crop: "fill", quality: "auto", format: "webp" }
//             ]
//         };

//         // Function to upload an image and get the optimized URL
//         const uploadAndOptimizeImage = async (imageUrl) => {
//             const result = await cloudinary.uploader.upload(imageUrl, uploadOptions);
//             console.log(result.secure_url);
//             return result.secure_url;
//         };

//         // Process and update the thumbnail
//         if (product.thumbnail) {
//             const optimizedThumbnail = await uploadAndOptimizeImage(product.thumbnail);
//             product.thumbnailOptimized = optimizedThumbnail;
//         }

//         // List of image categories to process
//         const imageCategories = [
//             { original: 'exteriorImages', optimized: 'exteriorImagesOptimized' },
//             { original: 'interiorImages', optimized: 'interiorImagesOptimized' },
//             { original: 'mechanicalImages', optimized: 'mechanicalImagesOptimized' },
//             { original: 'documentsImages', optimized: 'documentsImagesOptimized' }
//         ];

//         // Process each category of images
//         for (const { original, optimized } of imageCategories) {
//             if (product[original] && product[original].length > 0) {
//                 const optimizedImages = [];
//                 for (const imageUrl of product[original]) {
//                     const optimizedImageUrl = await uploadAndOptimizeImage(imageUrl);
//                     optimizedImages.push(optimizedImageUrl);
//                 }
//                 product[optimized] = optimizedImages;
//             }
//         }

//         // Save the updated product
//         await product.save();

//         res.send({ msg: 'Product updated successfully with optimized images', product });
//     } catch (error) {
//         console.error(error);
//         res.send({ msg: 'An error occurred while updating the product', error });
//     }
// });
// Product Page Api
router.post('/UploadProduct', upload.fields([{ name: 'image', maxCount: 1 }]), async (req, res) => {
    try {
        const { title, originalTitle, VIN, carModel, userEmail, category, duration, startPrice, price, side, country, OdometerReading, unit,
            TransmissionType, color, EngineDisplacement, VIP, ModelNumber, lotNumber, saleType, summary, youtubeLink, thumbnail,
            metaTitle, metaDescription, metaKeywords } = req.body;
        const keyFactors = JSON.parse(req.body.keyFactors);
        const equipmenatAndFeatures = JSON.parse(req.body.equipmenatAndFeatures);
        const condition = JSON.parse(req.body.condition);
        const serviceHistory = JSON.parse(req.body.serviceHistory);

        const imageFile = req.files['image'] ? req.files['image'][0] : null;  //Thumbnail
        const uploadOptions = {
            transformation: [
                { width: 200, height: 150, crop: "fill", quality: "auto", format: "webp" }
            ]
        };
        var imageurl = '';
        var imageurlOpt = '';
        const file = imageFile;
        // const result = await cloudinary.uploader.upload(file.path);
        // const result = await cloudinary.uploader.upload(file.path);
        const result = await cloudinary.uploader.upload(file.path);
        imageurl = result.secure_url;
        const result2 = await cloudinary.uploader.upload(file.path, uploadOptions);
        imageurlOpt = result2.secure_url;
        const soldDate = new Date();
        let soldStatus = false;
        if (category === 'sold') {
            soldStatus = true;
        }
        const endTime = new Date().getTime() + duration * 24 * 60 * 60 * 1000;
        // const endTime = new Date().getTime() + 10 * 60 * 1000;
        const newProduct = ProductModel({
            title, originalTitle, VIN, carModel, userEmail, category, duration, startPrice, price, side, country, OdometerReading, unit, TransmissionType, color, EngineDisplacement, VIP, ModelNumber, lotNumber, saleType, summary, youtubeLink, thumbnail: imageurl, thumbnailOptimized: imageurlOpt,
            keyFactors, equipmenatAndFeatures, condition, serviceHistory,
            bids: [
                {
                    email: "admin@gmail.com",
                    username: "admin",
                    country: "United Kingdom",
                    price: startPrice,
                    automatic: true
                }
            ],
            sold: {
                status: false,
                price: 0,
            },
            endTime, metaTitle, metaDescription, metaKeywords
        });
        const ProductUploaded = await newProduct.save();
        if (ProductUploaded) {
            res.send({ msg: 'success', data: ProductUploaded });
        } else {
            res.send({ msg: 'failed' });
        }
    } catch (error) {
        console.log(error);
    }
});
router.post('/UploadImageChunk', upload.fields([
    { name: 'images1' },
    { name: 'images2' },
    { name: 'images3' },
    { name: 'images4' }
]), async (req, res) => {
    try {
        const productId = req.body._id;
        console.log(productId);
        const product = await ProductModel.findById(productId);
        
        if (!product) {
            return res.status(404).send({ msg: 'Product not found' });
        }

        const uploadOptions = {
            transformation: [
                { width: 200, height: 150, crop: "fill", quality: "auto", format: "webp" }
            ]
        };

        const uploadImages = async (fieldName, files) => {
            if (!files || files.length === 0) return;

            const imageUrls = [];
            const imageUrlsOpt = [];

            for (let file of files) {
                const result = await cloudinary.uploader.upload(file.path);
                imageUrls.push(result.secure_url);
                console.log(result.secure_url);
                
                const resultOpt = await cloudinary.uploader.upload(file.path, uploadOptions);
                imageUrlsOpt.push(resultOpt.secure_url);
                console.log(resultOpt.secure_url);
            }

            return { imageUrls, imageUrlsOpt };
        };

        // Check and upload each type of image if present
        if (req.files['images1']) {
            const { imageUrls, imageUrlsOpt } = await uploadImages('images1', req.files['images1']);
            product.exteriorImages.push(...imageUrls);
            product.exteriorImagesOptimized.push(...imageUrlsOpt);
        }

        if (req.files['images2']) {
            const { imageUrls, imageUrlsOpt } = await uploadImages('images2', req.files['images2']);
            product.interiorImages.push(...imageUrls);
            product.interiorImagesOptimized.push(...imageUrlsOpt);
        }

        if (req.files['images3']) {
            const { imageUrls, imageUrlsOpt } = await uploadImages('images3', req.files['images3']);
            product.mechanicalImages.push(...imageUrls);
            product.mechanicalImagesOptimized.push(...imageUrlsOpt);
        }

        if (req.files['images4']) {
            const { imageUrls, imageUrlsOpt } = await uploadImages('images4', req.files['images4']);
            product.documentsImages.push(...imageUrls);
            product.documentsImagesOptimized.push(...imageUrlsOpt);
        }

        await product.save();
        res.send({ msg: 'success' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ msg: 'failed', error });
    }
});
// Admin fetch all procducts
router.get('/fetchAllProducts', async (req, res) => {
    try {
        const result = await ProductModel.find({}).sort({ endTime: 'asc' });
        // console.log(result);
        if (result) {
            res.send({ msg: "success", data: result });
        }
    } catch (error) {
        console.log(error);
    }
})
// User fetch all procducts
router.get('/allHomeProducts', async (req, res) => {
    try {
        const products = await ProductModel.find({}).sort({ endTime: 'asc' });
        const currentTime = new Date().getTime();
        const productsWithRemainingTime = products.filter((product) => {
            const endTime = new Date(product.endTime).getTime();
            return endTime > currentTime;
        });
        const sold = await ProductModel.find({category:'sold'}).sort({ 'sold.date': -1 });
        // const sold = products.filter((product) => product.category === 'sold');
        const comingsoon = products.filter((product) => product.category === 'comingsoon');
        // console.log(productsWithRemainingTime);
        res.send({ msg: 'success', data: productsWithRemainingTime, sold: sold, comingsoon: comingsoon });
    } catch (error) {
        console.log(error);
    }
})
router.get('/getProductByTitle/:title', async (req, res) => {
    try {
        const { title } = req.params;
        const product = await ProductModel.findOne({ title });
        // console.log(allImages);
        res.send({ msg: 'success', data: product });
        // console.log(product);
        const incre = await ProductModel.findOneAndUpdate(
            { _id: product._id },
            { $inc: { views: 1 } }, // increment the 'views' field by 1
            { new: true } // To return the updated document
        );
    } catch (error) {
        console.log(error);
    }
})
router.post('/markAsSoldById/:id', async (req, res) => {
    try {
        const soldDate = new Date();
        const result = await ProductModel.findOneAndUpdate(
            { _id: req.params.id },
            {
                sold: {
                    price: req.body.price,
                    status: true,
                    date: soldDate,
                },
                category: 'sold'
            },
            { new: true }
        );
        if (result) {
            res.send({ msg: 'success' });
        } else {
            res.send({ msg: 'failed' });
        }
    } catch (error) {
        console.log(error);
    }
})
router.post('/extendProductDays/:id', async (req, res) => {
    try {
        const duration = req.body.days;
        const endTime = new Date().getTime() + duration * 24 * 60 * 60 * 1000;
        const result = await ProductModel.findOneAndUpdate(
            { _id: req.params.id },
            {
                endTime
            },
            { new: true }
        );
        if (result) {
            res.send({ msg: 'success' });
        } else {
            res.send({ msg: 'failed' });
        }
    } catch (error) {
        console.log(error);
    }
})
router.get('/allArticles', async (req, res) => {
    try {
        const articles = await ArticleModel.find({}).sort({ date: 'desc' });
        res.send({ msg: 'success', data: articles });
    } catch (error) {
        console.log(error);
    }
})
router.get('/getArticleByTitle/:title', async (req, res) => {
    try {
        const { title } = req.params;
        const article = await ArticleModel.findOne({ title });
        res.send({ msg: 'success', data: article });
    } catch (error) {
        console.log(error);
    }
})
router.post('/UpdateArticle/:id', upload.fields([{ name: 'image', maxCount: 1 }]), async (req, res) => {
    try {
        const { by, title, metaTitle, metaDescription, metaKeywords, category, para1, para2, para3, para4 } = req.body;
        let thumbnailLink = '';
        let imageToBeDeleted = '';
        if (req.body.thumbnailLink) {
            thumbnailLink = req.body.thumbnailLink;
        } else {
            const imageFile = req.files['image'] ? req.files['image'] : null;
            imageToBeDeleted = req.body.ImageToBeDeleted;
            const result = await cloudinary.uploader.upload(imageFile[0].path);
            if (result) {
                thumbnailLink = result.secure_url;
            }
        }
        const updateArticle = await ArticleModel.findByIdAndUpdate(
            { _id: req.params.id },
            { by, title, metaTitle, metaDescription, metaKeywords, category, para1, para2, para3, para4, 'images.0': thumbnailLink },
            { new: true });
        if (updateArticle) {
            res.send({ msg: 'success' });
            if (imageToBeDeleted) {
                const publicId = cloudinary.url(imageToBeDeleted, { type: 'fetch' }).split('/').pop().split('.')[0];
                const res = await cloudinary.uploader.destroy(publicId);
            }
        } else {
            res.send({ msg: 'failed' });
        }
    } catch (error) {
        console.log(error);
    }
})
router.get('/deleteArticles/:id', async (req, res) => {
    try {
        const token = req.header("authToken");
        if (token.length > 10) {
            const verifyToken = jwt.verify(token, "helloiamabuhurairastudentofuniversityofokara");
            const rootUser = await UserModel.findOne({ _id: verifyToken._id, "tokens.token": token });
            if (rootUser.email === 'admin@gmail.com') {
                const deleteArticle = await ArticleModel.findByIdAndDelete(req.params.id);
                if (deleteArticle) {
                    res.send({ msg: 'success' });
                } else {
                    res.send({ msg: 'failed' });
                }
            }
        } else {
            res.send({ msg: "failed" });
        }
    } catch (error) {
        console.log(error);
    }
})
// Events Page
router.post('/UploadEvents', upload.array('images'), async (req, res) => {
    try {
        const { by, title, para1, para2, para3, para4 } = req.body;
        const { files } = req;
        const urls = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const result = await cloudinary.uploader.upload(file.path);
            urls.push(result.secure_url);
        }

        const newEvent = await EventsModel({ by, title, para1, para2, para3, para4, images: urls });
        const result = await newEvent.save();

        if (result) {
            res.send({ msg: 'success' });
        } else {
            res.send({ msg: 'failed' });
        }
    } catch (error) {
        console.log(error);
    }
});
router.get('/allEvents', async (req, res) => {
    try {
        const articles = await EventsModel.find({}).sort({ date: 'desc' });
        res.send({ msg: 'success', data: articles });
    } catch (error) {
        console.log(error);
    }
})
router.get('/getEventsByTitle/:title', async (req, res) => {
    try {
        const { title } = req.params;
        const event = await EventsModel.findOne({ title });
        const otherEvents = await EventsModel.find().sort({ date: 'desc' }).limit(4);
        res.send({ msg: 'success', data: event, otherEvents: otherEvents });
    } catch (error) {
        console.log(error);
    }
})
router.post('/UpdateEvents/:id', async (req, res) => {
    try {
        const { by, title, para1, para2, para3, para4 } = req.body;
        const token = req.header("authToken");
        console.log(req.params.id);
        if (token.length > 10) {
            console.log('Hello');
            const verifyToken = jwt.verify(token, "helloiamabuhurairastudentofuniversityofokara");
            const rootUser = await UserModel.findOne({ _id: verifyToken._id, "tokens.token": token });
            if (rootUser.email === 'admin@gmail.com') {
                const updateEvent = await EventsModel.findByIdAndUpdate({ _id: req.params.id }, { by, title, para1, para2, para3, para4 }, { new: true });
                if (updateEvent) {
                    res.send({ msg: 'success' });
                } else {
                    res.send({ msg: 'failed' });
                }
            }
        } else {
            res.send({ msg: "failed" });
        }
    } catch (error) {
        console.log(error);
    }
})
router.get('/deleteEvents/:id', async (req, res) => {
    try {
        const token = req.header("authToken");
        if (token.length > 10) {
            const verifyToken = jwt.verify(token, "helloiamabuhurairastudentofuniversityofokara");
            const rootUser = await UserModel.findOne({ _id: verifyToken._id, "tokens.token": token });
            if (rootUser.email === 'admin@gmail.com') {
                const deleteEvent = await EventsModel.findByIdAndDelete(req.params.id);
                if (deleteEvent) {
                    res.send({ msg: 'success' });
                } else {
                    res.send({ msg: 'failed' });
                }
            }
        } else {
            res.send({ msg: "failed" });
        }
    } catch (error) {
        console.log(error);
    }
})
// Admin Consignment Page
router.get('/getAllConsignments', async (req, res) => {
    try {
        const token = req.header("authToken");
        if (token.length > 10) {
            const verifyToken = jwt.verify(token, "helloiamabuhurairastudentofuniversityofokara");
            const rootUser = await UserModel.findOne({ _id: verifyToken._id, "tokens.token": token });
            if (rootUser.email === 'admin@gmail.com' || 'huraira@gmail.com') {
                const result = await UserModel.aggregate([
                    {
                        $project: {
                            consignments: 1,
                            _id: 0
                        }
                    },
                    {
                        $unwind: "$consignments"
                    },
                    {
                        $sort: {
                            "consignments.date": -1
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            consignments: { $push: "$consignments" }
                        }
                    }
                ]);
                // console.log(result);
                if (result) {
                    res.send({ msg: 'success', data: result })
                }
            }
        } else {
            res.send({ msg: "failed" });
        }
    } catch (error) {
        console.log(error);
    }
})
// Place Bids by user
// router.post('/placeBid', async (req,res)=>{
//     const { price,ProductId,email,username } = req.body;
//     const newBid = {
//         email: email,
//         username: username,
//         price: price,
//         automatic: false,
//     };
//     const result = await ProductModel.findByIdAndUpdate(
//         ProductId,
//         {
//           $push: { bids: { $each: [newBid], $position: 0 } },
//         },
//         { new: true }
//     );
//     if(result){
//         console.log('sucess');
//         res.send({msg:'success'});
//     }else{
//         console.log('failed');
//         res.send({msg:'failed'});
//     }
// })
router.post('/placeBid', async (req, res) => {
    try {
        const { price, ProductId, email, username } = req.body;
        const newBid = {
            email: email,
            username: username,
            price: price,
            automatic: false,
        };
        // Check if the new bid price is greater than all existing bids
        const product = await ProductModel.findById(ProductId);
        const highestBid = product.bids.length > 0 ? product.bids[0].price : 0;

        if (price > highestBid) {
            const result = await ProductModel.findByIdAndUpdate(
                ProductId,
                {
                    $push: { bids: { $each: [newBid], $position: 0 } },
                },
                { new: true }
            );
            if (result) {
                // console.log('success');
                res.send({ msg: 'success' });
                const mybids = await UserModel.findOneAndUpdate(
                    { email: email }, // Find user by email
                    { $push: { myBids: { $each: [{ ProductId }], $position: 0 } } }, // Add productId to the beginning of the myBids array
                    { new: true } // Return the updated user document
                );
                // console.log(mybids);
                // Broadcast the new bid to all connected clients
                // console.log(result);
                const timeLeft = new Date(result.endTime).getTime() - Date.now();
                // console.log(timeLeft);
                if (timeLeft <= 120000) {
                    const extendedExpiryTime = new Date(result.endTime).getTime() + 120000; // Extend by 2 minutes (120000 milliseconds)
                    const result2 = await ProductModel.findByIdAndUpdate(ProductId, { endTime: extendedExpiryTime });
                    if (result2) {
                        const newBidMessage = JSON.stringify({ type: 'new_bid', data: result2 });
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(newBidMessage);
                            }
                        });
                    }
                } else {
                    const newBidMessage = JSON.stringify({ type: 'new_bid', data: result });
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(newBidMessage);
                        }
                    });
                }
                //CHANGED
                // let htmlString = `
                // <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; background-color: #f7f7f7; padding: 20px;">
                //     <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 30px;">
                //         <div style="font-size: 26px; font-weight: bold; text-decoration: none; margin-top: 0; margin-bottom: 10px; color: #EF9523; text-align: center;">auto-auctions.co</div>
                //         <h1 style="font-size: 22px; font-weight: bold; margin-top: 0; margin-bottom: 20px; color: #333; text-align: center;">Congrats! Someone placed a Bid.</h1>
                //         <p style="margin: 0 0 10px; color: #333; font-size: 16px;">We are pleased to inform you that a new bid has been placed on the car you have listed for sale. Below are the details of the bid:</p>                        
                //         <p style="margin: 0 0 10px; color: #333; margin-bottom: 15px; font-size: 16px; font-weight: bold; ">Bidder Information</p>
                //         <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Name: ${username}</p>
                //         <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Bid Price: $${price}</p>
                //         <p style="margin: 0 0 10px; color: #333; margin-bottom: 15px; font-size: 16px; font-weight: bold; ">Vehicle Details</p>
                //         <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Title: ${result.title}</p>
                //         <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Model Number: ${result.ModelNumber}</p>
                //         <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Total Bids: ${result.bids.length}</p>
                //         <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Please take the necessary steps to review the bid and consider your next course of action. You can log in to your seller account on our platform to manage the bid and communicate with the interested buyer.</p>
                //         <p style="margin: 0 0 10px; color: #333; font-size: 16px;">If you have any questions or need further assistance, please don't hesitate to contact our support team at <a href="mailto:hurairaprince889@gmail.com">hurairaprince889@gmail.com</a> We're here to help!.</p>
                //         <br />
                //         <p style="margin: 0 0 10px; color:#333;  font-size: 16px;">Best Regards,</p>
                //         <p style="margin: 0 0 10px; color:#333; font-size: 16px;">Auto Auctions</p>
                //     </div>
                // </div>
                // `;
                const logoUrl = "https://res.cloudinary.com/def8v05xk/image/upload/v1692188819/site-logo_dcrv76.png";
                let htmlString = `            
                    <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; background-color: #f7f7f7; padding: 20px; ">
                        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 5px 5px 0 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 30px; position: relative; ">
                            <a href="http://localhost:3000" style="text-decoration: none;">
                                <img src="${logoUrl}" alt="auto-auctions.co" style="display: block; margin: 0 auto; max-width: 100%; height: 4.5rem;">
                            </a>
                            <h1 style="font-size: 18px; font-weight: bold; margin-top: 0; margin-bottom: 20px; color: #003949; text-align: center; font-family: system-ui;">Congrats! Someone placed a Bid.</h1>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">We are pleased to inform you that a new bid has been placed on the car you have listed for sale. Below are the details of the bid:</p>                        
                            <p style="margin: 0 0 10px; color: #333; margin-bottom: 15px; font-size: 16px; font-weight: bold; ">Bidder Information</p>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Name: ${username}</p>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Bid Price: $${price}</p>
                            <p style="margin: 0 0 10px; color: #333; margin-bottom: 15px; font-size: 16px; font-weight: bold; ">Vehicle Details</p>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Title: ${result.title}</p>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Model Number: ${result.ModelNumber}</p>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Total Bids: ${result.bids.length}</p>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Please take the necessary steps to review the bid and consider your next course of action. You can log in to your seller account on our platform to manage the bid and communicate with the interested buyer.</p>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">If you have any questions or need further assistance, please don't hesitate to contact our support team at <a href="mailto:hurairaprince889@gmail.com">hurairaprince889@gmail.com</a> We're here to help!.</p>
                            <br />
                            <p style="margin: 0 0 10px; color:#333;  font-size: 16px;">Best Regards,</p>
                            <p style="margin: 0 0 10px; color:#333; font-size: 16px;">Auto Auctions</p>
                        </div>
                        <div class="container" style="max-width: 660px; margin: 0 auto; border-radius: 0 0 5px 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); position: relative; ">                    
                            <div style="border-top: 1px solid #205260;  background-color: #003949; padding: 17px 0; border-radius: 0 0 5px 5px; text-align: center;">
                                <div style="font-weight: 500; font-size: 15px; line-height: 20px; color: #fff; margin: 0;">
                                    Autosauctions © copyright 2023
                                </div>
                                <div style="font-weight: 400; font-size: 11px; line-height: 20px; color: #d1d1d1; margin: 0;">
                                    You can <a href="http://localhost:3000" style=" color: #fff; cursor: pointer; text-decoration: none; " >unsbscribe</a> receiving emails
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                const mailOptions = {
                    from: sender,
                    to: result.userEmail,
                    subject: 'Congrats! Someone placed a Bid',
                    html: htmlString
                };
                transporter.sendMail(mailOptions, async function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent:');
                    }
                });
                //END CHANGED
            } else {
                console.log('failed');
                res.send({ msg: 'failed' });
            }
        } else {
            res.send({ msg: 'invalid' });
            console.log('invalid');
        }
    } catch (error) {
        console.log(error);
    }
});
router.post('/placeOffer', async (req, res) => {
    try {
        const { price, ProductId, email, username } = req.body;
        const newOffer = {
            email: email,
            username: username,
            price: price,
            automatic: false,
        };
        // const result = await ProductModel.findByIdAndUpdate(
        // ProductId,
        // {
        //   $push: { offers: { $each: [newOffer], $position: 0 } },
        // },
        // { new: true });
        const result = await ProductModel.findByIdAndUpdate(
            ProductId,
            {
                $push: {
                    offers: {
                        $each: [newOffer],
                        $sort: { price: -1 },
                    },
                },
            },
            { new: true }
        );
        if (result) {
            console.log('success');
            res.send({ msg: 'success' });
            // CHANGED
            // let htmlString = `
            // <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; background-color: #f7f7f7; padding: 20px;">
            //     <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 30px;">
            //         <div style="font-size: 26px; font-weight: bold; text-decoration: none; margin-top: 0; margin-bottom: 10px; color: #EF9523; text-align: center;">auto-auctions.co</div>
            //         <h1 style="font-size: 22px; font-weight: bold; margin-top: 0; margin-bottom: 20px; color: #333; text-align: center;">Congrats! Someone placed an offer.</h1>
            //         <p style="margin: 0 0 10px; color: #333; font-size: 16px;">We are pleased to inform you that a new offer has been placed on the car you have listed for sale. Below are the details of the offer:</p>                        
            //         <p style="margin: 0 0 10px; color: #333; margin-bottom: 15px; font-size: 16px; font-weight: bold; ">Buyer Information</p>
            //         <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Name: ${username}</p>
            //         <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Bid Price: $${price}</p>
            //         <p style="margin: 0 0 10px; color: #333; margin-bottom: 15px; font-size: 16px; font-weight: bold; ">Vehicle Details</p>
            //         <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Title: ${result.title}</p>
            //         <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Model Number: ${result.ModelNumber}</p>
            //         <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Total Offers: ${result.offers.length}</p>
            //         <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Please take the necessary steps to review the offer and consider your next course of action. You can log in to your seller account on our platform to manage the offer and communicate with the interested buyer.</p>
            //         <p style="margin: 0 0 10px; color: #333; font-size: 16px;">If you have any questions or need further assistance, please don't hesitate to contact our support team at <a href="mailto:hurairaprince889@gmail.com">hurairaprince889@gmail.com</a> We're here to help!.</p>
            //         <br />
            //         <p style="margin: 0 0 10px; color:#333;  font-size: 16px;">Best Regards,</p>
            //         <p style="margin: 0 0 10px; color:#333; font-size: 16px;">Auto Auctions</p>
            //     </div>
            // </div>
            // `;
            const logoUrl = "https://res.cloudinary.com/def8v05xk/image/upload/v1692188819/site-logo_dcrv76.png";
            let htmlString = `            
                    <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; background-color: #f7f7f7; padding: 20px; ">
                        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 5px 5px 0 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 30px; position: relative; ">
                            <a href="http://localhost:3000" style="text-decoration: none;">
                                <img src="${logoUrl}" alt="auto-auctions.co" style="display: block; margin: 0 auto; max-width: 100%; height: 4.5rem;">
                            </a>
                            <h1 style="font-size: 18px; font-weight: bold; margin-top: 0; margin-bottom: 20px; color: #003949; text-align: center; font-family: system-ui;">Congrats! Someone placed a Bid.</h1>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">We are pleased to inform you that a new bid has been placed on the car you have listed for sale. Below are the details of the bid:</p>                        
                            <p style="margin: 0 0 10px; color: #333; margin-bottom: 15px; font-size: 16px; font-weight: bold; ">Bidder Information</p>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Name: ${username}</p>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Offer Price: $${price}</p>
                            <p style="margin: 0 0 10px; color: #333; margin-bottom: 15px; font-size: 16px; font-weight: bold; ">Vehicle Details</p>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Title: ${result.title}</p>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Model Number: ${result.ModelNumber}</p>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Total Offers: ${result.offers.length}</p>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">Please take the necessary steps to review the offer and consider your next course of action. You can log in to your seller account on our platform to manage the bid and communicate with the interested buyer.</p>
                            <p style="margin: 0 0 10px; color: #333; font-size: 16px;">If you have any questions or need further assistance, please don't hesitate to contact our support team at <a href="mailto:hurairaprince889@gmail.com">hurairaprince889@gmail.com</a> We're here to help!.</p>
                            <br />
                            <p style="margin: 0 0 10px; color:#333;  font-size: 16px;">Best Regards,</p>
                            <p style="margin: 0 0 10px; color:#333; font-size: 16px;">Auto Auctions</p>
                            <p style="margin: 1rem 0 0 0; font-size: 16px;">Following is the refference information to navigate:</p>                                            
                        </div>
                        <div class="container" style="max-width: 660px; margin: 0 auto; border-radius: 0 0 5px 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); position: relative; ">                    
                            <div style="border-top: 1px solid #205260;  background-color: #003949; padding: 17px 0; border-radius: 0 0 5px 5px; text-align: center;">
                                <div style="font-weight: 500; font-size: 15px; line-height: 20px; color: #fff; margin: 0;">
                                    Autosauctions © copyright 2023
                                </div>
                                <div style="font-weight: 400; font-size: 11px; line-height: 20px; color: #d1d1d1; margin: 0;">
                                    You can <a href="http://localhost:3000" style=" color: #fff; cursor: pointer; text-decoration: none; " >unsbscribe</a> receiving emails
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            const mailOptions = {
                from: sender,
                to: result.userEmail,
                subject: 'Congrats! Someone placed an offer',
                html: htmlString
            };
            transporter.sendMail(mailOptions, async function (error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent:');
                }
            });

        } else {
            console.log('failed');
            res.send({ msg: 'failed' });
        }
        // if (price > highestOffer) {
        // } else {
        //   res.send({ msg:'invalid'});
        //   console.log('invalid');
        // }
    } catch (error) {
        console.log(error);
    }
});
router.post('/save-product/:id', async (req, res) => {
    try {
        // console.log(req.params.id);
        const { userId } = req.body;
        // console.log(userId);
        // const save = await UserModel.findOneAndUpdate({_id:userId},{$push:{saved:req.params.id}});
        const save = await UserModel.findOneAndUpdate({ _id: userId }, { $push: { saved: { $each: [req.params.id], $position: 0 } } });
        // console.log(save);
        if (save) {
            res.send({ msg: 'success' })
            const product = await ProductModel.findOneAndUpdate(
                { _id: req.params.id },
                { $inc: { saved: 1 } }, // Increment the 'value' field by 1
                { new: true } // To return the updated document
            );
        } else {
            res.send({ msg: 'failed' })
        }
    } catch (error) {
        console.log(error);
    }
});
router.post('/unsave-product/:id', async (req, res) => {
    try {
        // console.log(req.params.id);
        const { userId } = req.body;
        // console.log(userId);
        const save = await UserModel.findOneAndUpdate({ _id: userId }, { $pull: { saved: req.params.id } });
        // console.log(save);
        if (save) {
            res.send({ msg: 'success' })
            const product = await ProductModel.findOneAndUpdate(
                { _id: req.params.id },
                { $inc: { saved: -1 } }, // Decrement the 'saved' field by 1
                { new: true } // To return the updated document
            );
        } else {
            res.send({ msg: 'failed' })
        }
    } catch (error) {
        console.log(error);
    }
});
router.post('/save-card-info/:id', async (req, res) => {
    // req.params.id   ID of user
    try {
        const { paymentMethodId, cardBrand, cardLast4, billingDetails, phone, address1, address2, country, postCode, email } = req.body;
        // Creating a Customer
        const customer = await stripe.customers.create({
            email: email,
            payment_method: paymentMethodId,
        });
        if (customer) {
            const save = await UserModel.findOneAndUpdate(
                { _id: req.params.id },
                {
                    $set: {
                        'cardInfo.paymentMethodId': paymentMethodId,
                        'cardInfo.customerId': customer.id,
                        'cardInfo.cardBrand': cardBrand,
                        'cardInfo.cardLast4': cardLast4,
                        'cardInfo.billingDetails.address': {
                            line1: address1,
                            line2: address2,
                            country,
                            postCode,
                        },
                        'cardInfo.billingDetails.phone': phone,
                        stripeVerified: true,
                    },
                },
                { new: true }
            );
            // console.log(save);
            if (save) {
                res.send({ msg: 'success' })
            } else {
                res.send({ msg: 'failed' })
            }
        } else {
            res.send({ msg: 'failed' })
        }
    } catch (error) {
        console.log(error);
    }
});
router.post('/subscribe-emails', async (req, res) => {
    try {
        const { userId } = req.body;
        const subscribe = await UserModel.findOneAndUpdate({ _id: userId }, { $set: { receiveEmails: true } });
        if (subscribe) {
            res.send({ msg: 'success' });
        } else {
            res.send({ msg: 'failed' });
        }
    } catch (error) {
        console.log(error);
    }
});
router.post('/unsubscribe-emails', async (req, res) => {
    try {
        const { userId } = req.body;
        const unsubscribe = await UserModel.findOneAndUpdate({ _id: userId }, { $set: { receiveEmails: false } });
        if (unsubscribe) {
            res.send({ msg: 'success' });
        } else {
            res.send({ msg: 'failed' });
        }
    } catch (error) {
        console.log(error);
    }
});
// router.post('/charge-user', async (req, res)=>{
//     try {        
//         const { username, email, bidPrice, bidDate, productTitle } = req.body;
//         const user = await UserModel.findOne({email},{cardInfo:1});
//         if(user){
//             const paymentMethodId = user.cardInfo.paymentMethodId;
//             const amount = 1000;

//             const paymentIntent = await stripe.paymentIntents.create({
//                 amount,
//                 currency: 'gbp',
//                 payment_method: paymentMethodId,
//                 confirm: true,
//                 receipt_email: email,
//                 description: `Payment for winning Bid ${bidPrice} of ${productTitle}`,
//             });
//             if (paymentIntent.status === 'succeeded') {            
//                 console.log('Payment succeeded');
//                 // console.log(paymentIntent);
//                 res.send({msg:'success'});
//             } else {
//                 console.log('Payment failed');
//                 res.send({msg:'failed'});
//             }
//         }
//     } catch (error) {
//         console.log(error);
//     }
// })
router.post('/charge-user', async (req, res) => {
    try {
        const { username, email, bidPrice, bidDate, productTitle, ProductId, amount } = req.body;
        const user = await UserModel.findOne({ email }, { cardInfo: 1 });
        if (user) {
            const customerId = user.cardInfo.customerId;
            const paymentMethodId = user.cardInfo.paymentMethodId;
            // let percentage = (4.5*bidPrice)/100;
            // if(percentage<=550){
            //     amount = 660*100 //converting to cents
            // }else{
            //     amount = percentage*100; //converting to cents
            // }
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount * 100,
                currency: 'GBP',
                customer: customerId,
                payment_method: paymentMethodId,
                confirm: true,
                receipt_email: email,
                description: `Payment for winning Bid $${bidPrice}, Title "${productTitle}"`,
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never',
                },
            });
            if (paymentIntent.status === 'succeeded') {
                console.log('Payment succeeded');
                res.send({ msg: 'success', amount: amount });
                console.log(ProductId);
                const winner = await ProductModel.findOneAndUpdate(
                    { _id: ProductId },
                    { $set: { winner: email } },
                    { new: true }
                );
            } else {
                console.log('Payment failed');
                res.send({ msg: 'failed' });
            }
        }
    } catch (error) {
        console.log(error);
    }
});
router.post('/holdPaymentForPhotography', async (req, res) => {
    try {
        const { email, amount } = req.body;
        const customer = await UserModel.findOne({ email });
        // console.log(customer.cardInfo.cardBrand);
        if (customer) {
            if (customer.cardInfo.cardBrand) {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount * 100, // Set your desired amount in cents
                    currency: 'GBP', // Set your desired currency
                    payment_method_types: ['card'],
                    payment_method: customer.cardInfo.paymentMethodId, // Specify the Payment Method ID
                    customer: customer.cardInfo.customerId, // Include the Customer ID associated with the payment method
                    capture_method: 'manual',
                    metadata: {
                        hold_reason: 'Holding amount for photography',
                    },
                });
                const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntent.id);
                if (confirmedIntent) {
                    res.send({ msg: 'success' });
                } else {
                    res.send({ msg: 'failed' });
                }
            } else {
                // console.log("No card added");
                res.send({ msg: 'no card found' });
            }
        } else {
            // console.log("No user found");
            res.send({ msg: 'no user found' });
        }
    } catch (error) {
        console.log(error);
    }
})
router.post('/deleteBid', async (req, res) => {
    try {
        const { product_id, bid_id } = req.body;
        console.log(req.body);
        const result = await ProductModel.updateOne(
            { _id: product_id },
            { $pull: { bids: { _id: bid_id } } }
        );
        if (result.nModified === 0) {
            res.send({ msg: 'failed' })
        }
        res.send({ msg: 'success' })
    } catch (error) {
        console.log(error);
    }
})
router.get('/getSavedProductsByID/:id', async (req, res) => {
    try {
        console.log(req.params.id);
        const product = await ProductModel.findOne({ _id: req.params.id });
        // console.log(product);
        if (product) {
            res.send({ msg: 'success', data: product })
        } else {
            res.send({ msg: 'failed' })
        }
    } catch (error) {
        console.log(error);
    }
});
// params id is id of event
router.post('/eventRegistry/:id', upload.single('image'), async (req, res) => {
    try {
        // console.log(req.body);
        // console.log(req.params.id);
        // console.log(req.file);
        const { name, email, phone, vehicle, registration, instagram, notes } = req.body;
        const dublicate = await EventsModel.findOne({ _id: req.params.id, "participants.email": email });
        // console.log(dublicate);
        if (dublicate) {
            res.send({ msg: "dublicate" });
            return
        }
        if (req.file) {
            // console.log("File Included");
            const result = await cloudinary.uploader.upload(req.file.path);
            if (result) {
                const result2 = await EventsModel.updateOne(
                    { _id: req.params.id },
                    {
                        $push: {
                            participants: {
                                $each: [{ name, email, phone, vehicle, registration, instagram, notes, img_url: result.url }],
                                $position: 0
                            }
                        }
                    }
                );
                if (result2) {
                    res.send({ msg: 'success' });
                } else {
                    res.send({ msg: 'failed' });
                }
            }
        } else {
            // console.log("File not Included");
            const result3 = await EventsModel.updateOne(
                { _id: req.params.id },
                {
                    $push: {
                        participants: {
                            $each: [{ name, email, phone, vehicle, registration, instagram, notes, img_url: '' }],
                            $position: 0
                        }
                    }
                }
            );
            if (result3) {
                res.send({ msg: 'success' });
            } else {
                res.send({ msg: 'failed' });
            }
        }
        // res.send({msg:'success'});
    } catch (error) {
        console.log(error);
    }
});
router.get('/fetchAllUsers', async (req, res) => {
    try {
        const result = await UserModel.find({ email: { $ne: 'admin@gmail.com' } });
        // console.log(result);
        if (result) {
            res.send({ msg: "success", data: result });
        }
    } catch (error) {
        console.log(error);
    }
});
router.get('/logout', async (req, res) => {
    try {
        // const token = req.cookies.jwttoken;
        const token = req.header("authToken");
        const verifyToken = jwt.verify(token, "helloiamabuhurairastudentofuniversityofokara");
        const rootUser = await UserModel.findOne({ _id: verifyToken._id, "tokens.token": token });
        if (rootUser) {
            //res.clearCookie('jwttoken');
            res.send({ msg: "loggedOut" });
        }
    } catch (error) {
        console.log(error);
    }
});
router.post('/updatePassword', async (req, res) => {
    try {
        let { oldPassword, newPassword, confirmNewPassword } = req.body;
        if (!oldPassword || !newPassword || !confirmNewPassword) {
            res.send({ msg: "unfill" });
        } else if (newPassword != confirmNewPassword) {
            res.send({ msg: "NotMatching" });
        } else if (newPassword.length < 8) {
            res.send({ msg: "Password must contain 8 characters" });
        } else {
            const token = req.header("authToken");
            if (token.length > 10) {
                const verifyToken = jwt.verify(token, "helloiamabuhurairastudentofuniversityofokara");
                const rootUser = await UserModel.findOne({ _id: verifyToken._id, "tokens.token": token });
                const veriFyoldPassword = await bcrypt.compare(oldPassword, rootUser.password);
                if (veriFyoldPassword) {
                    newPassword = await bcrypt.hash(newPassword, 12);
                    const result = await UserModel.updateOne({ _id: rootUser._id }, { $set: { password: newPassword } })
                    if (result) {
                        res.send({ msg: "success" })
                    }
                } else {
                    res.send({ msg: "incorrect Password" });
                }
            }
        }
    } catch (error) {
        console.log(error);
    }
});
router.post('/updatePasswordOTP/:id', async (req, res) => {
    try {
        let { otp, newPassword, confirmNewPassword } = req.body;
        console.log(req.body);
        if (!otp || !newPassword || !confirmNewPassword) {
            res.send({ msg: "unfill" });
        } else if (newPassword != confirmNewPassword) {
            res.send({ msg: "NotMatching" });
        } else if (newPassword.length < 8) {
            res.send({ msg: "Password must contain 8 characters" });
        } else {
            console.log(req.params.id);
            const user = await UserModel.findOne({ email: req.params.id });
            if (user) {
                if (user.otp[0].code == otp) {
                    console.log("MATCHED")
                    newPassword = await bcrypt.hash(newPassword, 12);
                    const result = await UserModel.updateOne({ _id: user._id }, { $set: { password: newPassword, otp: [] } });
                    console.log(result)
                    if (result) {
                        res.send({ msg: "success" })
                    }
                } else {
                    //console.log("Not MATCHED")
                    res.send({ msg: "invalid" });
                }
            }
        }
    } catch (error) {
        console.log(error);
    }
});
router.post('/checkUser', async (req, res) => {
    try {
        //console.log(req.body);
        const checkUser = await UserModel.findOne({ email: req.body.email });
        if (checkUser) {
            let OTP = Math.floor(Math.random() * 900000) + 100000;
            // OTP = OTP.toString();
            // const saveOTP = await UserModel.updateOne({_id:checkUser._id},{$push:{otp:{code:OTP}}});
            const saveOTP = await UserModel.findOneAndUpdate(
                { _id: checkUser._id },
                { $push: { otp: { $each: [{ code: OTP }], $position: 0 } } },
                { new: true }
            );
            let htmlString = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>One-Time Password for Password Reset</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 16px;
                        line-height: 1.5;
                        color: #333333;
                        background-color: #f2f2f2;
                    }
                    h1, h2, h3, h4, h5, h6 {
                        margin: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #ffffff;
                        border-radius: 5px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .btn {
                        display: inline-block;
                        padding: 10px 20px;
                        background-color: #ef9523;
                        color: white;
                        text-decoration: none;
                        border-radius: 3px;
                        border: none;
                        cursor: pointer;
                        box-shadow: 0 2px 4px #ef9523;
                        transition: background-color 0.2s ease-in-out;
                    }                    
                </style>
            </head>
            <body>
                <div class="container">
                    <div style="font-size: 26px; font-weight: bold; margin-top: 0; color: #EF9523; text-align: center;">Multiplataforma-capital.com</div>
                    <h1 style="font-size: 22px;" >One-Time Password for Password Reset</h1>
                    <p style="font-size: 16px;" >Dear <span style="font-weight:600;" >${checkUser.name}</span> ,</p>
                    <p style="font-size: 16px;" >We have received a request to reset the password for your account associated with ${checkUser.email}. To proceed with the password reset, please use the following One-Time Password (OTP):</p>
                    <p style="font-size: 24px; font-weight: bold; color: #ef9523;">${OTP}</p>
                    <p style="font-size: 16px;" >Please note that this OTP is valid only for a limited period and should not be shared with anyone. To reset your password, please enter the OTP on the password reset page.</p>
                    <p style="font-size: 16px;" >If you did not request this password reset, please contact our support team immediately.</p>
                    <a style="color: white;" href="https://multiplataforma-capital.com/updatepassword" class="btn">Reset Password</a>
                    <p style="font-size: 16px;" >Thank you for using our service.</p>
                    <p style="font-size: 16px;" >Best regards,</p>
                    <p style="font-size: 16px;" >Multiplataforma-capital</p>
                </div>
            </body>
            </html>            
            `
            const mailOptions = {
                from: sender,
                to: checkUser.email,
                subject: `Password Reset with One-Time-Password (OTP)`,
                html: htmlString
            };
            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });
            res.send({ msg: 'valid' });
        } else {
            res.send({ msg: 'invalid' });
        }
    } catch (error) {
        console.log(error);
    }
})
router.get('/userData', async (req, res) => {
    try {
        // const token = req.cookies.jwttoken;
        const token = req.header("authToken");
        //console.log(token.length);
        if (token.length > 10) {
            //console.log("TOKEN RECEIVED");
            const verifyToken = jwt.verify(token, "helloiamabuhurairastudentofuniversityofokara");
            const rootUser = await UserModel.findOne({ _id: verifyToken._id, "tokens.token": token });
            if (rootUser) {
                res.send(rootUser);
            }
        } else {
            //console.log("TOKEN NOT RECEIVED");
        }
    } catch (error) {
        console.log(error);
    }
})
router.get('/userData/:id', async (req, res) => {
    try {
        // console.log(req.params.id);
        const result = await UserModel.findOne({ withdraws: { $elemMatch: { _id: req.params.id } } });
        // console.log(result);
        if (result) {
            res.send({ msg: result })
        }
    } catch (error) {
        console.log(error);
    }
})
router.post('/searchUser', async (req, res) => {
    try {
        const { email } = req.body;
        // console.log(email);
        const user = await UserModel.find({ email });
        if (user) {
            res.send({ msg: "success", userdata: user });
        } else {
            res.send({ msg: 'not found' });
        }
    } catch (error) {
        console.log(error)
    }
})

router.post('/contact-us', async (req, res) => {
    try {
        console.log(req.body);
        const logoUrl = "https://res.cloudinary.com/def8v05xk/image/upload/v1692188819/site-logo_dcrv76.png";
        const { userEmail, firstName, lastName, message } = req.body;
        let htmlString = `            
            <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; background-color: #f7f7f7; padding: 20px; ">
                <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 5px 5px 0 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 30px; position: relative; ">
                    <h1 style="font-size: 18px; font-weight: bold; margin-top: 0; margin-bottom: 20px; color: #003949; text-align: center; font-family: system-ui;">${firstName} contacted through Novassore form</h1>
                    <br />
                    <p style="margin: 0; font-size: 16px; font-weight: bold; color: #003949; font-family: system-ui;">Full Name:</p>
                    <p style="margin: 0; font-size: 16px;">${firstName + " " + lastName}</p>
                    <p style="margin: 0; font-size: 16px; font-weight: bold; color: #003949; font-family: system-ui;">Email:</p>
                    <p style="margin: 0; font-size: 16px; color: #333;">${userEmail}</p>
                    <p style="margin: 0; font-size: 16px; font-weight: bold; color: #003949; font-family: system-ui;">Message:</p>
                    <p style="margin: 0; color: #333; font-size: 16px;">Notes: ${message} </p>
                </div>
                <div class="container" style="max-width: 660px; margin: 0 auto; border-radius: 0 0 5px 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); position: relative; ">                    
                    <div style="border-top: 1px solid #205260;  background-color: #3f5454; padding: 17px 0; border-radius: 0 0 5px 5px; text-align: center;">
                        <div style="font-weight: 500; font-size: 15px; line-height: 20px; color: #fff; margin: 0;">
                            Novassor © copyright 2024
                        </div>
                    </div>
                </div>
            </div>
        `;
        const mailOptions = {
            from: sender,
            to: 'xyzafaq@gmail.com',
            subject: 'Someone contacted you through web',
            html: htmlString
        };
        transporter.sendMail(mailOptions, async function (error, info) {
            if (error) {
                console.log(error);
                res.send({ msg: 'failed' });
            } else {
                res.send({ msg: 'success' });
                console.log('Email sent:');
            }
        });
    } catch (error) {
        console.log(error);
    }
})
module.exports = router;