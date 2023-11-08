const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.x5y82lv.mongodb.net/?retryWrites=true&w=majority`;

// MongoDB connection
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Custom middlewares
const logger = async (req, res, next) => {
    console.log('called: ', req.hostname, req.originalUrl);
    console.log('log: info', req.method, req.url);
    next();
}

const verifyToken = async (req, res, next) => {
    const token = req?.cookies?.token;
    // console.log('Token in the middleware: ', token);

    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' });
        }

        req.user = decoded;
        next();
    })
}

async function run() {
    try {
        const blogCollection = client.db('blogDB').collection('blogs');
        const wishlistCollection = client.db('blogDB').collection('wishlist');

        // Auth related API
        try {
            app.post('/jwt', logger, async (req, res) => {
                const user = req.body;
                console.log('User: ', user);

                const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                    expiresIn: '1h'
                });

                res
                    .cookie('token', token, {
                        httpOnly: true,
                        secure: true,
                        sameSite: 'none',
                        maxAge: 24 * 60 * 60 * 1000   // 24 hours
                    })
                    .send({ success: true });
            })
        }
        catch (error) {
            console.log(error);
        }

        try {
            app.post('/logout', async (req, res) => {
                const user = req.body;
                console.log('Logging out', user);
                res.clearCookie('token', { maxAge: 0 }).send({ success: true });
            })
        }
        catch (error) {
            console.log(error);
        }

        // Blogs related APIs
        try {
            app.get('/all-blogs', async (req, res) => {
                const cursor = blogCollection.find();
                const result = await cursor.sort({ timestamp: -1 }).toArray();
                res.send(result);
            })
        }
        catch (error) {
            console.log(error);
        }

        try {
            app.get("/all-blogs/search", async (req, res) => {
                const filter = req.query;
                console.log(filter);
                const query = {
                    title: { $regex: filter.search, $options: 'i' }
                };

                const options = {
                    sort: {
                        title: filter.sort === 'asc' ? 1 : -1
                    }
                };

                const cursor = blogCollection.find(query, options);
                const result = await cursor.toArray();
                res.send(result);
            });
        }
        catch (error) {
            console.log(error);
        }

        try {
            app.get('/blog/:id', async (req, res) => {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await blogCollection.findOne(query);
                res.send(result);
            })
        }
        catch (error) {
            console.log(error);
        }

        try {
            app.post('/add-blog', logger, verifyToken, async (req, res) => {
                console.log(req.query.email);
                // console.log('Token', req.cookies.token);
                console.log('User of the valid token', req.user);

                if (req.query.email !== req.user.email) {
                    return res.status(403).send({ message: 'forbidden access' });
                }

                const newBlog = req.body;
                newBlog.timestamp = new Date();
                console.log(newBlog);
                const result = await blogCollection.insertOne(newBlog);
                res.send(result);
            })
        }
        catch (error) {
            console.log(error);
        }

        try {
            app.patch('/update-blog/:id', logger, verifyToken, async (req, res) => {
                console.log(req.query.email);
                // console.log('Token', req.cookies.token);
                console.log('User of the valid token', req.user);

                if (req.query.email !== req.user.email) {
                    return res.status(403).send({ message: 'forbidden access' });
                }

                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const updatedBlog = req.body;

                const blog = {
                    $set: {
                        title: updatedBlog.title,
                        image: updatedBlog.image,
                        category: updatedBlog.category,
                        shortDescription: updatedBlog.shortDescription,
                        longDescription: updatedBlog.longDescription
                    }
                }

                const result = await blogCollection.updateOne(filter, blog);
                res.send(result);
            })
        }
        catch (error) {
            console.log(error);
        }

        // Wishlist related APIs
        try {
            app.get('/wishlist', logger, verifyToken, async (req, res) => {
                console.log(req.query.email);
                // console.log('Token', req.cookies.token);
                console.log('User of the valid token', req.user);

                if (req.query.email !== req.user.email) {
                    return res.status(403).send({ message: 'forbidden access' });
                }

                // let query = {};
                // if (req.query?.email) {
                //     query = { email: req.query.email };
                // }
                let query = {};
                if (req.cookies?.email) {
                    query = { email: req.cookies.email };
                }
                const cursor = wishlistCollection.find(query);
                const result = await cursor.toArray();
                res.send(result);
            })
        }
        catch (error) {
            console.log(error);
        }

        try {
            app.get('/blog-from-wishlist/:id', async (req, res) => {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await wishlistCollection.findOne(query);
                res.send(result);
            })
        }
        catch (error) {
            console.log(error);
        }

        try {
            app.post('/add-to-wishlist', async (req, res) => {
                const wishlist = req.body;
                console.log(wishlist);
                const result = await wishlistCollection.insertOne(wishlist);
                res.send(result);
            })
        }
        catch (error) {
            console.log(error);
        }

        try {
            app.delete('/remove-from-wishlist/:id', logger, verifyToken, async (req, res) => {
                console.log(req.query.email);
                // console.log('Token', req.cookies.token);
                console.log('User of the valid token', req.user);

                if (req.query.email !== req.user.email) {
                    return res.status(403).send({ message: 'forbidden access' });
                }
                
                const id = req.params.id;
                const query = { _id: new ObjectId(id) }
                const result = await wishlistCollection.deleteOne(query);
                res.send(result);
            })
        }
        catch (error) {
            console.log(error);
        }

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Blog web app server is running');
})

app.listen(port, () => {
    console.log(`Blog web app server is running on port: ${port}`);
})