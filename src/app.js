const express = require('express');
const cors = require('cors');
const app = express();
const dotenv = require('dotenv');
dotenv.config();


const authRoutes = require('./routes/authRoute');
const carRoutes = require('./routes/car-routes');
const userRoutes = require('./routes/userRoutes');
const requestRoutes = require('./routes/request.Routes');
const blogRouter =require('./routes/blogs')
app.use(cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Server is running on port 4000' });
});
app.use('/api/auth', authRoutes);

app.use('/api/admin/blogs',blogRouter )
app.use('/api/admin/cars', carRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/requests', requestRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

module.exports = app;