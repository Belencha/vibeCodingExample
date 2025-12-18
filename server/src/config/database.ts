import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vibeCodingExample';

        await mongoose.connect(mongoURI);

        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        console.log('Server will continue without MongoDB connection');
        // Don't exit - allow server to run without MongoDB for development
    }
};

export default connectDB;

