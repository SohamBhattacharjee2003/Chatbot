import express from 'express';
import { getPublishedImages, getUser, loginUser, registerUser } from '../controllers/userController.js';  // Add .js extension
import { protect } from '../middlewares/auth.js';  // Add .js extension

const userRouter = express.Router();

userRouter.post('/register' , registerUser)
userRouter.post('/login' , loginUser)
userRouter.get('/data' , protect , getUser)
userRouter.get('/published-images', getPublishedImages);

export default userRouter;