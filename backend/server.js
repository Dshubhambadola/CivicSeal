require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3001;
const { connectDB } = require('./config/database');

// Connect Database
connectDB();


app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.send('CivicSeal Backend is running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
