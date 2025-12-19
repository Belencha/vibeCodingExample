import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vibeCodingExample';

        // Set connection timeout to 2 seconds to avoid long delays
        const connectionOptions = {
            serverSelectionTimeoutMS: 2000, // 2 seconds timeout
            socketTimeoutMS: 2000,
        };

        await mongoose.connect(mongoURI, connectionOptions);

        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        console.log('Server will continue without MongoDB connection');
        // Don't exit - allow server to run without MongoDB for development
    }
};

export default connectDB;

