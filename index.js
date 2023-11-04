const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require('mongodb');
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

async function run() {
    try {
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