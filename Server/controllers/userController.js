import User from "../models/user.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
    });
};

export const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try{
        const userExists = await User.findOne({email})

        if(userExists)
        {
            return res.status(400).json({ message: "User already exists" });
        }

        const user = await User.create({ name, email, password });

        const token = generateToken(user._id);

        res.json({success: true , token})
    }
    catch(error)
    {
        return res.json({success: false , message: error.message})
    }
};

export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try{
        const user = await User.findOne({email})

        if(user)
        {
            const isMatch = await bcrypt.compare(password, user.password)

            if(isMatch)
            {
                const token = generateToken(user._id);
                return res.json({success: true , token})
            }
        }

        return res.json({success: false , message: "Invalid email or password"})
    }
    catch(error)
    {
        return res.json({success: false , message: error.message})
    }
};

export const getUser = async (req, res) => {
    try{
        const userId = req.user.id;  // Move this line inside the function
        const user = await User.findById(userId).select('-password');
        res.json({success: true , user})
    }
    catch(error)
    {
        return res.json({success: false , message: error.message})
    }
};

export const getPublishedImages = async (req, res) => {
    try{
        const publishedImageMessages = await Chat.aggregate([
            { $unwind: "$messages" },
            { $match: { "messages.isImage": true, "messages.isPublic": true } },
            { $project: {
                    _id: 0,
                    imageUrl: "$messages.content",
                    userName: "$userName",
                }
            }
        ]);

        res.json({ success: true, images: publishedImageMessages.reverse() });
    }
    catch(error)
    {
        return res.json({success: false , message: error.message})
    }
};